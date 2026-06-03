# Routes: brand_router.py
from fastapi import APIRouter
from apis.brand.create import router as create_router
from apis.brand.read import router as read_router
from apis.brand.update import router as update_router
from apis.brand.delete import router as delete_router

brand_router = APIRouter(
    prefix="/brands",
    tags=["Brands"],
)

brand_router.include_router(create_router)
brand_router.include_router(read_router)
brand_router.include_router(update_router)
brand_router.include_router(delete_router)
