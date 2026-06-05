# Routes: prescription_router.py
from fastapi import APIRouter
from apis.prescription.create import router as create_router
from apis.prescription.read import router as read_router
from apis.prescription.update import router as update_router
prescription_router = APIRouter(
    prefix="/prescriptions",
    tags=["Prescriptions"],
)
prescription_router.include_router(create_router)
prescription_router.include_router(read_router)
prescription_router.include_router(update_router)
