# Routes: optician_router.py
from fastapi import APIRouter
from apis.optician.create import router as create_router
from apis.optician.read import router as read_router
from apis.optician.update import router as update_router
from apis.optician.delete import router as delete_router

optician_router = APIRouter(
    prefix="/stores",
    tags=["Opticians"],
)

# POST /stores/{store_id}/opticians  &  GET /stores/{store_id}/opticians
optician_router.include_router(create_router)
optician_router.include_router(read_router)
optician_router.include_router(update_router)
optician_router.include_router(delete_router)
