# Routes: inventory_config_router.py
from fastapi import APIRouter
from apis.inventory_config.read import router as read_router
from apis.inventory_config.update import router as update_router

inventory_config_router = APIRouter(
    prefix="/inventory-config",
    tags=["Inventory Configuration"],
)

inventory_config_router.include_router(read_router)
inventory_config_router.include_router(update_router)
