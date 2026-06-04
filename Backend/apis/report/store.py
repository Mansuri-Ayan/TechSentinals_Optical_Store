# API: report/store.py
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.report import StoreReportDetails
from services.report_service import get_store_report

router = APIRouter()


@router.get(
    "/stores/{store_id}",
    response_model=StoreReportDetails,
    summary="Get store-wise report details",
    description="Fetch comprehensive metrics for a store including revenue, sales, profit, top products, and reorder alerts.",
)
async def get_store_report_endpoint(
    store_id: int,
    start_date: date = Query(
        default=None,
        description="Start date of report period (default: 30 days ago)"
    ),
    end_date: date = Query(
        default=None,
        description="End date of report period (default: today)"
    ),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StoreReportDetails:
    # Set default dates
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    try:
        report = await get_store_report(
            db=db,
            admin_id=current_admin.id,
            store_id=store_id,
            start_date=start_date,
            end_date=end_date
        )
        return report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
