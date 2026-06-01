# Main module: login.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from db.session import get_db
from schemas.token import TokenPair
from schemas.user import UserLogin
from services.auth_service import authenticate_user, create_tokens
router = APIRouter()

@router.post(
    "/login",
    response_model=TokenPair,
    summary="Staff login",
    description=(
        "Authenticate with email and password.  Returns a JWT "
        "access token (30 min) and a refresh token (7 days)."
    ),
) 

async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenPair:
    user = await authenticate_user(db, credentials.email, credentials.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_pair = await create_tokens(db, user)
    return token_pair
