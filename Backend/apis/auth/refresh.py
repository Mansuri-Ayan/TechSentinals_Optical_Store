# API: auth/refresh.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import get_settings
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
        "token pair.  Reads from cookie or request body.  "
        "The old refresh token is revoked (single-use)."
    ),
)
async def refresh(
    request: Request,
    response: Response,
    body: TokenRefreshRequest | None = None,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    # Try body first, then cookie
    raw_refresh_token: str | None = None
    device_fingerprint: str | None = None

    if body is not None and body.refresh_token:
        raw_refresh_token = body.refresh_token
        device_fingerprint = body.device_fingerprint

    if raw_refresh_token is None:
        raw_refresh_token = request.cookies.get("refresh_token")

    if raw_refresh_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token provided (body or cookie)",
            headers={"WWW-Authenticate": "Bearer"},
        )

    new_pair = await refresh_access_token(
        db,
        raw_refresh_token=raw_refresh_token,
        device_fingerprint=device_fingerprint,
    )
    if new_pair is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid, expired, or already used",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Update cookies ─────────────────────────────────────────
    settings = get_settings()
    response.set_cookie(
        key="access_token",
        value=new_pair.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_pair.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/auth",
    )

    return new_pair
