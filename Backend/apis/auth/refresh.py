# Main module: refresh.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from schemas.token import TokenPair, TokenRefreshRequest
from services.auth_service import refresh_access_token
router = APIRouter()
@router.post(
    "/refresh",
    response_model=TokenPair,
    summary="Refresh access token",
    description=(
        "Exchange a valid refresh token for a new access + refresh "
        "token pair.  The old refresh token is revoked (single-use)."
    ),
)
async def refresh(
    body: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    new_pair = await refresh_access_token(
        db,
        raw_refresh_token=body.refresh_token,
        device_fingerprint=body.device_fingerprint,
    )
    if new_pair is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, expired, or already used",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return new_pair
