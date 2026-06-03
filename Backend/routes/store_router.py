# Routes: store_router.py
from fastapi import APIRouter
from apis.store.create import router as create_router
from apis.store.read import router as read_router
from apis.store.update import router as update_router
from apis.store.delete import router as delete_router
from apis.store.staff import router as staff_router

store_router = APIRouter(
    prefix="/stores",
    tags=["Stores"],
)

store_router.include_router(create_router)
store_router.include_router(read_router)
store_router.include_router(update_router)
store_router.include_router(delete_router)
store_router.include_router(staff_router)
