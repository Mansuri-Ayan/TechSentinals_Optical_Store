# Core module: deps.py
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import decode_token
from db.session import get_db
from models.admin import Admin

# Optional bearer — won't error if no header (we fall back to cookies)
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_admin(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> Admin:
    """
    Extract the current admin from:
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
        admin_id = int(payload["sub"])
    except (KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is malformed",
            headers={"WWW-Authenticate": "Bearer"},
        )

    stmt = select(Admin).where(Admin.id == admin_id)
    result = await db.execute(stmt)
    admin = result.scalar_one_or_none()

    if admin is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if admin.status != "ACTIVE" or admin.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin account is deactivated or suspended",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return admin
