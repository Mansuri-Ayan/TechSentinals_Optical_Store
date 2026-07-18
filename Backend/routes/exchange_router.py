# Routes: exchange_router.py
from fastapi import APIRouter
from apis.exchange.create import router as create_router
from apis.exchange.read import router as read_router
from apis.exchange.update import router as update_router

exchange_router = APIRouter(
    prefix="/exchanges",
    tags=["Exchanges"],
)

exchange_router.include_router(create_router)
exchange_router.include_router(read_router)
exchange_router.include_router(update_router)
