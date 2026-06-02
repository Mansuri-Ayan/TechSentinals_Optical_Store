# API: auth/logout.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import get_settings
from core.deps import get_current_user
from db.session import get_db
from schemas.token import TokenRefreshRequest
from services.auth_service import revoke_refresh_token

router = APIRouter()


@router.post(
    "/logout",
    summary="Logout (revoke refresh token & clear cookies)",
    description=(
        "Revoke the provided refresh token so it can no longer "
        "be used.  Also clears the access_token and refresh_token "
        "cookies.  Requires a valid access token."
    ),
)
async def logout(
    request: Request,
    response: Response,
    body: TokenRefreshRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    # Try body first, then cookie
    raw_refresh_token: str | None = None
    if body is not None and body.refresh_token:
        raw_refresh_token = body.refresh_token

    if raw_refresh_token is None:
        raw_refresh_token = request.cookies.get("refresh_token")

    if raw_refresh_token:
        await revoke_refresh_token(db, raw_refresh_token)

    # ── Clear cookies ──────────────────────────────────────────
    settings = get_settings()
    response.delete_cookie(
        key="access_token",
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.delete_cookie(
        key="refresh_token",
        domain=settings.COOKIE_DOMAIN,
        path="/auth",
    )

    return {"message": "Successfully logged out — cookies cleared"}
