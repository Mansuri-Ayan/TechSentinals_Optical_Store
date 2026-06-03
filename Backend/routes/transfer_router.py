# Routes: transfer_router.py
from fastapi import APIRouter
from apis.transfer.operations import router as operations_router
from apis.transfer.history import router as history_router

transfer_router = APIRouter(
    prefix="/transfers",
    tags=["Transfers"],
)

transfer_router.include_router(operations_router)
transfer_router.include_router(history_router)
