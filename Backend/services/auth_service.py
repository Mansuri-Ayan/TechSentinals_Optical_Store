# Service: auth_service.py
import hashlib
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from models.admin import Admin
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.superadmin import SuperAdmin
from models.accountant import Accountant
from models.refresh_token import RefreshToken
from schemas.token import TokenPair


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def authenticate_user_by_role(
    db: AsyncSession,
    email: str,
    password: str,
    role: str,
) -> tuple[SuperAdmin | Admin | Accountant | Manager | Worker | Optician, str] | None:
    """
    Validate credentials by querying the specific table matching the role parameter.
    Returns a tuple of (user, role_string) or None if validation fails.
    """
    if role == "admin":
        stmt = select(Admin).where(Admin.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.status == "ACTIVE" and user.deleted_at is None:
            return user, "admin"

    elif role == "manager":
        stmt = select(Manager).where(Manager.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.is_active and user.deleted_at is None:
            return user, "manager"

    elif role == "worker":
        stmt = select(Worker).where(Worker.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.is_active and user.deleted_at is None:
            return user, "worker"

    elif role == "optician":
        stmt = select(Optician).where(Optician.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.is_active and user.deleted_at is None:
            return user, "optician"
            
    elif role == "superadmin":
        stmt = select(SuperAdmin).where(SuperAdmin.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.status == "ACTIVE" and user.deleted_at is None:
            return user, "superadmin"

    elif role == "accountant":
        stmt = select(Accountant).where(Accountant.email == email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user and verify_password(password, user.password_hash) and user.is_active and user.deleted_at is None:
            return user, "accountant"

    return None


async def create_tokens(
    db: AsyncSession,
    user: SuperAdmin | Admin | Accountant | Manager | Worker | Optician,
    role_name: str,
    device_fingerprint: str | None = None,
) -> TokenPair:
    """Issue a new access + refresh token pair for any user role."""
    jwt_payload = {
        "sub": str(user.id),
        "role": role_name,
    }

    access_token = create_access_token(jwt_payload)
    refresh_token = create_refresh_token(jwt_payload)

    refresh_payload = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(
        refresh_payload["exp"], tz=timezone.utc
    )

    token_record = RefreshToken(
        token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
        device_fingerprint=device_fingerprint,
    )
    
    # Assign the correct polymorphic foreign key based on the user's role
    if role_name == "admin":
        token_record.admin_id = user.id
    elif role_name == "manager":
        token_record.manager_id = user.id
    elif role_name == "worker":
        token_record.worker_id = user.id
    elif role_name == "optician":
        token_record.optician_id = user.id
    elif role_name == "superadmin":
        token_record.superadmin_id = user.id
    elif role_name == "accountant":
        token_record.accountant_id = user.id

    db.add(token_record)

    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
    )


async def refresh_access_token(
    db: AsyncSession,
    raw_refresh_token: str,
    device_fingerprint: str | None = None,
) -> TokenPair | None:
    """Rotate refresh token: revoke old one, issue new pair."""
    payload = decode_token(raw_refresh_token)
    if payload is None or payload.get("type") != "refresh":
        return None

    token_hash = _hash_token(raw_refresh_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await db.execute(stmt)
    token_record = result.scalar_one_or_none()

    if token_record is None:
        return None
    if token_record.revoked_at is not None:
        return None

    # Revoke old token
    token_record.revoked_at = datetime.now(timezone.utc)

    user_id = int(payload["sub"])
    role_name = payload.get("role")

    # Dynamic lookup based on role
    user = None
    if role_name == "admin":
        stmt = select(Admin).where(Admin.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user is None or user.status != "ACTIVE" or user.deleted_at is not None:
            await db.commit()
            return None
    elif role_name == "manager":
        stmt = select(Manager).where(Manager.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            await db.commit()
            return None
    elif role_name == "worker":
        stmt = select(Worker).where(Worker.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            await db.commit()
            return None
    elif role_name == "optician":
        stmt = select(Optician).where(Optician.id == user_id)
        res = await db.execute(stmt)
        user = res.scalar_one_or_none()
        if user is None or not user.is_active or user.deleted_at is not None:
            await db.commit()
            return None

    if user is None:
        await db.commit()
        return None

    new_pair = await create_tokens(db, user, role_name, device_fingerprint)
    return new_pair


async def revoke_refresh_token(
    db: AsyncSession,
    raw_refresh_token: str,
) -> bool:
    """Revoke a single refresh token (for logout)."""
    token_hash = _hash_token(raw_refresh_token)
    stmt = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    result = await db.execute(stmt)
    token_record = result.scalar_one_or_none()

    if token_record is None:
        return False
    if token_record.revoked_at is not None:
        return False

    token_record.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return True
