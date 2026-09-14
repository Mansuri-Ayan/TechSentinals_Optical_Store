# Route registration: qc_router.py
from fastapi import APIRouter
from apis.qc.inspection import router as inspection_router
from apis.qc.damaged_items import router as damaged_items_router

qc_router = APIRouter(prefix="/qc", tags=["Quality Control (QC)"])
qc_router.include_router(inspection_router)
qc_router.include_router(damaged_items_router)
