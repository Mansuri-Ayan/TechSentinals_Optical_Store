# Main module: logout.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.user import User
from schemas.token import TokenRefreshRequest
from services.auth_service import revoke_refresh_token
router = APIRouter()
@router.post(
    "/logout",
    summary="Logout (revoke refresh token)",
    description=(
        "Revoke the provided refresh token so it can no longer "
        "be used to obtain new access tokens.  Requires a valid "
        "access token in the Authorization header."
    ),
)
async def logout(
    body: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),                     
):
    success = await revoke_refresh_token(db, body.refresh_token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token not found or already revoked",
        )
    return {"message": "Successfully logged out — refresh token revoked"}
