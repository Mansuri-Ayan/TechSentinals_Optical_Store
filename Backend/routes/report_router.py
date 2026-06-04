# Routes: report_router.py
from fastapi import APIRouter
from apis.report.store import router as store_router
from apis.report.staff import router as staff_router

report_router = APIRouter(
    prefix="/reports",
    tags=["Reports & Analysis"],
)

report_router.include_router(store_router)
report_router.include_router(staff_router)
