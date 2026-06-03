# Routes: category_router.py
from fastapi import APIRouter
from apis.category.create import router as create_router
from apis.category.read import router as read_router
from apis.category.update import router as update_router
from apis.category.delete import router as delete_router

category_router = APIRouter(
    prefix="/categories",
    tags=["Categories"],
)

category_router.include_router(create_router)
category_router.include_router(read_router)
category_router.include_router(update_router)
category_router.include_router(delete_router)
