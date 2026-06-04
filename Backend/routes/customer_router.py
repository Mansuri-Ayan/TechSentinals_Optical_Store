# Routes: customer_router.py
from fastapi import APIRouter
from apis.customer.create import router as create_router
from apis.customer.read import router as read_router
from apis.customer.update import router as update_router

customer_router = APIRouter(
    prefix="/customers",
    tags=["Customers"],
)

customer_router.include_router(create_router)
customer_router.include_router(read_router)
customer_router.include_router(update_router)
