# API: auth/login.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.config import get_settings
from core.rate_limit import limiter
from db.session import get_db
from schemas.token import TokenPair
from schemas.user import UserLogin
from services.auth_service import authenticate_user_by_role, create_tokens

router = APIRouter()


@router.post(
    "/login/{role}",
    response_model=TokenPair,
    summary="Role-based staff login",
    description=(
        "Authenticate with email and password for a specific role (admin, manager, worker, optician).  "
        "Returns a JWT access token (30 min) and a refresh token (7 days).  "
        "Tokens are also set as HttpOnly cookies."
    ),
)
@limiter.limit("10/minute")
async def login(
    request: Request,
    role: str,
    credentials: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    role_norm = role.lower().strip()
    if role_norm not in ["admin", "manager", "worker", "optician", "superadmin", "accountant"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid login role: {role}",
        )

    res = await authenticate_user_by_role(db, credentials.email, credentials.password, role_norm)
    if res is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user, role_name = res
    token_pair = await create_tokens(db, user, role_name)

    # ── Set cookies ────────────────────────────────────────────
    settings = get_settings()
    response.set_cookie(
        key="access_token",
        value=token_pair.access_token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=token_pair.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        httponly=settings.COOKIE_HTTPONLY,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        path="/auth",
    )

    return token_pair
