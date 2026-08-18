# Routes: supplier_router.py
from fastapi import APIRouter
from apis.supplier.create import router as create_router
from apis.supplier.read import router as read_router
from apis.supplier.update import router as update_router
from apis.supplier.store_links import router as store_links_router
from apis.supplier.products import router as products_router
from apis.supplier.status_toggle import router as status_toggle_router

supplier_router = APIRouter(
    prefix="/suppliers",
    tags=["Suppliers"],
)

supplier_router.include_router(create_router)
supplier_router.include_router(read_router)
supplier_router.include_router(update_router)
supplier_router.include_router(store_links_router)
supplier_router.include_router(products_router)
supplier_router.include_router(status_toggle_router)
