# API: report/dashboard.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.report import DashboardReport
from services.report_service import get_dashboard_report

router = APIRouter()


@router.get(
    "/dashboard",
    response_model=DashboardReport,
    summary="Get central dashboard metrics",
    description="Fetch key performance indicators, sales trends, status breakdowns, branch comparisons, inventory statuses, and recent lists.",
)
async def get_dashboard_report_endpoint(
    store_id: str | None = Query(None, description="Optional store ID to filter the report"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> DashboardReport:
    numeric_store_id = None
    if store_id and store_id.lower() != "admin":
        try:
            numeric_store_id = int(store_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid store_id format")

    return await get_dashboard_report(
        db=db,
        admin_id=current_admin.id,
        store_id=numeric_store_id
    )
