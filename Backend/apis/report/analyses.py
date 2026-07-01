# API: report/analyses.py
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.report import AnalysesReport
from services.report_service import get_analyses_report

router = APIRouter()


@router.get(
    "/analyses",
    response_model=AnalysesReport,
    summary="Get central analyses report metrics",
    description="Fetch key performance indicators, sales trends, category sales, inventory breakdowns, branch performance comparison, supplier volumes, payment analytics, and brand revenue details.",
)
async def get_analyses_report_endpoint(
    store_id: str | None = Query(None, description="Optional store ID to filter the report"),
    date_range: str | None = Query(None, description="Optional date range (e.g. Last 30 Days, This Month, This Quarter, This Year)"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('reports', 'read')),
) -> AnalysesReport:
    admin_id = get_user_admin_id(current_user)
    numeric_store_id = None
    if store_id and store_id.lower() != "admin":
        try:
            numeric_store_id = int(store_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid store_id format")

    return await get_analyses_report(
        db=db,
        admin_id=admin_id,
        store_id=numeric_store_id,
        date_range=date_range
    )
