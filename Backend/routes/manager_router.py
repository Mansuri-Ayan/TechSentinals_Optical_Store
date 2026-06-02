# Routes: manager_router.py
from fastapi import APIRouter
from apis.manager.create import router as create_router
from apis.manager.read import router as read_router
from apis.manager.update import router as update_router
from apis.manager.delete import router as delete_router

manager_router = APIRouter(
    prefix="/stores",
    tags=["Managers"],
)

manager_router.include_router(create_router)
manager_router.include_router(read_router)
manager_router.include_router(update_router)
manager_router.include_router(delete_router)