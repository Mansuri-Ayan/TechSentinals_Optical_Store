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

# Optional bearer — won't error if no header (we fall back to cookies)
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Admin | Manager | Worker | Optician:
    """
    Extract the current user of any role (Admin, Manager, Worker, Optician) from:
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
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token role payload is invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )

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


def get_user_admin_id(user) -> int:
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
