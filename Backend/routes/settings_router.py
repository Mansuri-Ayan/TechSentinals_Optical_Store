# Routes: settings_router.py
from fastapi import APIRouter
from apis.settings.warehouse import router as warehouse_settings_router

settings_router = APIRouter(
    prefix="/settings",
    tags=["Settings"],
)

settings_router.include_router(warehouse_settings_router)
