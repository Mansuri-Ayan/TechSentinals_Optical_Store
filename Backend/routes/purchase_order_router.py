# Routes: purchase_order_router.py
from fastapi import APIRouter
from apis.purchase_order.create import router as create_router
from apis.purchase_order.read import router as read_router
from apis.purchase_order.update import router as update_router
from apis.purchase_order.receive import router as receive_router
from apis.purchase_order.payments import router as payments_router

purchase_order_router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)

purchase_order_router.include_router(create_router)
purchase_order_router.include_router(read_router)
purchase_order_router.include_router(update_router)
purchase_order_router.include_router(receive_router)
purchase_order_router.include_router(payments_router)
