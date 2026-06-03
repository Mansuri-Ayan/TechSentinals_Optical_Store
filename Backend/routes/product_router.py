# Routes: product_router.py
from fastapi import APIRouter
from apis.product.create import router as create_router
from apis.product.read import router as read_router
from apis.product.update import router as update_router
from apis.product.delete import router as delete_router

product_router = APIRouter(
    prefix="/products",
    tags=["Products"],
)

product_router.include_router(create_router)
product_router.include_router(read_router)
product_router.include_router(update_router)
product_router.include_router(delete_router)
