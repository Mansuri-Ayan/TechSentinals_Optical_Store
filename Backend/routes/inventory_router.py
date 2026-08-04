# Routes: inventory_router.py
from fastapi import APIRouter
from apis.inventory.create import router as create_router
from apis.inventory.read import router as read_router
from apis.inventory.update import router as update_router
from apis.inventory.product_units import router as product_units_router
from apis.inventory.barcode_download import router as barcode_download_router

inventory_router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"],
)

inventory_router.include_router(create_router)
inventory_router.include_router(read_router)
inventory_router.include_router(update_router)
inventory_router.include_router(product_units_router, prefix="/product-units")
inventory_router.include_router(barcode_download_router, prefix="/product-units")
