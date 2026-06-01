# Main module: auth_service.py
import hashlib
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from models.refresh_token import RefreshToken
from models.user import User
from schemas.token import TokenPair

def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
async def authenticate_user(
    db: AsyncSession,
    email: str,
    password: str,
) -> User | None:
    stmt = select(User).where(User.email == email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user
async def create_tokens(
    db: AsyncSession,
    user: User,
    device_fingerprint: str | None = None,
) -> TokenPair:
    jwt_payload = {
        "sub": str(user.user_id),                          
        "role": user.role,                                  
    }
    access_token = create_access_token(jwt_payload)
    refresh_token = create_refresh_token(jwt_payload)
    refresh_payload = decode_token(refresh_token)
    expires_at = datetime.fromtimestamp(
        refresh_payload["exp"], tz=timezone.utc
    )
    token_record = RefreshToken(
        user_id=user.user_id,
        token_hash=_hash_token(refresh_token),
        expires_at=expires_at,
        device_fingerprint=device_fingerprint,
    )
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
    payload = decode_token(raw_refresh_token)
    if payload is None or payload.get("type") != "refresh":
        return None                                    
    token_hash = _hash_token(raw_refresh_token)
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    result = await db.execute(stmt)
    token_record = result.scalar_one_or_none()
    if token_record is None:
        return None                                       
    if token_record.revoked_at is not None:
        return None                                          
    token_record.revoked_at = datetime.now(timezone.utc)
    user_id = UUID(payload["sub"])
    stmt = select(User).where(User.user_id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        await db.commit()                         
        return None
    new_pair = await create_tokens(db, user, device_fingerprint)
    return new_pair
async def revoke_refresh_token(
    db: AsyncSession,
    raw_refresh_token: str,
) -> bool:
    token_hash = _hash_token(raw_refresh_token)
    stmt = select(RefreshToken).where(
        RefreshToken.token_hash == token_hash
    )
    result = await db.execute(stmt)
    token_record = result.scalar_one_or_none()
    if token_record is None:
        return False                                
    if token_record.revoked_at is not None:
        return False                                             
    token_record.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return True
