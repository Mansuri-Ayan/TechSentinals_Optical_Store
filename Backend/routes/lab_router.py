# Routes: lab_router.py
from fastapi import APIRouter
from apis.lab.create import router as create_router
from apis.lab.read import router as read_router
from apis.lab.update import router as update_router
from apis.lab.delete import router as delete_router

lab_router = APIRouter(
    prefix="/labs",
    tags=["Labs"],
)

lab_router.include_router(create_router)
lab_router.include_router(read_router)
lab_router.include_router(update_router)
lab_router.include_router(delete_router)
