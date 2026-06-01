# Main module: authrouter.py
from fastapi import APIRouter
from apis.auth.login import router as login_router
from apis.auth.logout import router as logout_router
from apis.auth.me import router as me_router
from apis.auth.refresh import router as refresh_router

auth_router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)

auth_router.include_router(login_router)
auth_router.include_router(refresh_router)
auth_router.include_router(logout_router)
auth_router.include_router(me_router)
