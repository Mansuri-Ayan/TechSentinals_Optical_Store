# Routes: deadstock_router.py
from fastapi import APIRouter
from apis.deadstock.read import router as read_router
from apis.deadstock.update import router as update_router

deadstock_router = APIRouter(
    prefix="/deadstock",
    tags=["Deadstock"],
)

deadstock_router.include_router(read_router)
deadstock_router.include_router(update_router)
