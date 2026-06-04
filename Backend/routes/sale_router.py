# Routes: sale_router.py
from fastapi import APIRouter
from apis.sale.create import router as create_router
from apis.sale.read import router as read_router
from apis.sale.update import router as update_router
from apis.sale.payments import router as payments_router

sale_router = APIRouter(
    prefix="/sales",
    tags=["Sales"],
)

sale_router.include_router(create_router)
sale_router.include_router(read_router)
sale_router.include_router(update_router)
sale_router.include_router(payments_router)
