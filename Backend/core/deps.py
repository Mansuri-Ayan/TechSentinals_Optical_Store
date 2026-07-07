# Core module: deps.py
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import decode_token
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.superadmin import SuperAdmin
from models.accountant import Accountant
from services.permission_service import has_permission

# Optional bearer — won't error if no header (we fall back to cookies)
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> SuperAdmin | Admin | Accountant | Manager | Worker | Optician:
    """
    Extract the current user of any role from:
      1. Authorization: Bearer <token>  (header)
      2. access_token cookie             (fallback)
    """
    token: str | None = None

    # Priority 1: Bearer header
    if credentials is not None:
        token = credentials.credentials

    # Priority 2: Cookie
    if token is None:
        token = request.cookies.get("access_token")

    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated — provide a Bearer token or cookie",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected an access token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is malformed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    role_name = payload.get("role")
    user = None

    # Dynamically fetch the correct model class from the database using selectin role loading
    if role_name == "admin":
        stmt = select(Admin).where(Admin.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or user.status != "ACTIVE" or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Admin account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif role_name == "manager":
        from sqlalchemy.orm import joinedload
        stmt = select(Manager).options(joinedload(Manager.store)).where(Manager.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Manager account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif role_name == "worker":
        from sqlalchemy.orm import joinedload
        stmt = select(Worker).options(joinedload(Worker.store)).where(Worker.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Worker account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif role_name == "optician":
        from sqlalchemy.orm import joinedload
        stmt = select(Optician).options(joinedload(Optician.store)).where(Optician.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Optician account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif role_name == "superadmin":
        stmt = select(SuperAdmin).where(SuperAdmin.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or user.status != "ACTIVE" or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SuperAdmin account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    elif role_name == "accountant":
        stmt = select(Accountant).where(Accountant.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Accountant account is deactivated or suspended",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token role payload is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Attach computed fields for permission system
    user.token_role = role_name
    if role_name == "superadmin":
        user.computed_admin_id = None
    elif role_name == "admin":
        user.computed_admin_id = user.id
    elif role_name == "accountant":
        user.computed_admin_id = getattr(user, "admin_id", None)
    else:
        if hasattr(user, "store") and user.store:
            user.computed_admin_id = user.store.admin_id
        else:
            user.computed_admin_id = getattr(user, "admin_id", None)

    return user


async def get_current_admin(
    current_user: Admin | Manager | Worker | Optician = Depends(get_current_user),
) -> Admin:
    """
    Dependency to enforce that the authenticated user has the 'admin' role.
    Raises 403 Forbidden if the authenticated user is not an Admin.
    """
    is_admin = False
    if isinstance(current_user, Admin):
        is_admin = True
    elif hasattr(current_user, "role") and current_user.role and current_user.role.role == "admin":
        is_admin = True

    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Admin role required",
        )
    return current_user


async def get_current_manager(
    current_user: Admin | Manager | Worker | Optician = Depends(get_current_user),
) -> Manager:
    """
    Dependency to enforce that the authenticated user has the 'manager' role.
    Raises 403 Forbidden if the authenticated user is not a Manager.
    """
    if not isinstance(current_user, Manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden — Manager role required",
        )
    return current_user


def get_user_admin_id(user) -> int | None:
    if isinstance(user, SuperAdmin):
        return None
    if isinstance(user, Admin):
        return user.id
    if hasattr(user, "store") and user.store:
        return user.store.admin_id
    if hasattr(user, "admin_id"):
        return user.admin_id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not determine admin scoping for user",
    )


def require_permission(*permissions: str):
    """
    Dependency factory to enforce specific permissions.
    Resolves the current actor's (type, id, admin_id) and checks the hierarchical permission chain.
    If multiple permissions are provided, the user is granted access if they have AT LEAST ONE.
    Legacy signature: require_permission('customers', 'create') -> 'customers:create'
    New signature: require_permission('customers:create', 'sales:create')
    """
    if len(permissions) == 2 and ":" not in permissions[0] and ":" not in permissions[1]:
        perms_to_check = [f"{permissions[0]}:{permissions[1]}"]
    else:
        perms_to_check = list(permissions)

    async def _permission_dependency(
        request: Request,
        current_user = Depends(get_current_user),
        db: AsyncSession = Depends(get_db)
    ):
        actor_type = None
        if isinstance(current_user, SuperAdmin):
            actor_type = "SUPER_ADMIN"
        elif isinstance(current_user, Admin):
            actor_type = "ADMIN"
        elif isinstance(current_user, Manager):
            actor_type = "MANAGER"
        elif isinstance(current_user, Worker):
            actor_type = "WORKER"
        elif isinstance(current_user, Optician):
            actor_type = "OPTICIAN"
        elif isinstance(current_user, Accountant):
            actor_type = "ACCOUNTANT"

        if not actor_type:
            raise HTTPException(status_code=403, detail="Unrecognized actor type")

        actor_admin_id = get_user_admin_id(current_user)

        if actor_type in ("SUPER_ADMIN", "ADMIN", "ACCOUNTANT"):
            return current_user

        has_any = False
        for perm in perms_to_check:
            granted = await has_permission(db, actor_type, current_user.id, actor_admin_id, perm)
            if granted:
                has_any = True
                break
                
        if not has_any:
            raise HTTPException(
                status_code=403,
                detail=f"Missing permission. Required one of: {', '.join(perms_to_check)}"
            )
        
        return current_user

    return _permission_dependency
