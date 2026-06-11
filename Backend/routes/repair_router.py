# Routes: repair_router.py
from fastapi import APIRouter
from apis.repair.create import router as create_router
from apis.repair.read import router as read_router
from apis.repair.update import router as update_router
from apis.repair.delete import router as delete_router

repair_router = APIRouter(
    prefix="/repairs",
    tags=["Repairs & Services"],
)

repair_router.include_router(create_router)
repair_router.include_router(read_router)
repair_router.include_router(update_router)
repair_router.include_router(delete_router)
