# Routes: worker_router.py
from fastapi import APIRouter
from apis.worker.create import router as create_router
from apis.worker.read import router as read_router
from apis.worker.update import router as update_router
from apis.worker.delete import router as delete_router

worker_router = APIRouter(
    prefix="/stores",
    tags=["Workers"],
)

# POST /stores/{store_id}/workers  &  GET /stores/{store_id}/workers
worker_router.include_router(create_router)
worker_router.include_router(read_router)
worker_router.include_router(update_router)
worker_router.include_router(delete_router)
