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
from models.refresh_token import RefreshToken
from schemas.token import TokenPair


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


async def authenticate_admin(
    db: AsyncSession,
    email: str,
    password: str,
) -> Admin | None:
    """Validate admin credentials. Returns the Admin or None."""
    stmt = select(Admin).where(Admin.email == email)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if admin is None:
        return None
    if admin.status != "ACTIVE":
        return None
    if admin.deleted_at is not None:
        return None
    if not verify_password(password, admin.password_hash):
        return None
    return admin


async def create_tokens(
    db: AsyncSession,
    admin: Admin,
    device_fingerprint: str | None = None,
) -> TokenPair:
    """Issue a new access + refresh token pair for the admin."""
    jwt_payload = {
        "sub": str(admin.id),
        "role": "admin",
    }

    access_token = create_access_token(jwt_payload)
    refresh_token = create_refresh_token(jwt_payload)

    refresh_payload = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(
        refresh_payload["exp"], tz=timezone.utc
    )

    token_record = RefreshToken(
        admin_id=admin.id,
        token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
        device_fingerprint=device_fingerprint,
    )
    db.add(token_record)

    admin.last_login_at = datetime.now(timezone.utc)
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

    admin_id = int(payload["sub"])
    stmt = select(Admin).where(Admin.id == admin_id)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if admin is None or admin.status != "ACTIVE":
        await db.commit()
        return None

    new_pair = await create_tokens(db, admin, device_fingerprint)
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
