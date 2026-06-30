# API: report/staff.py
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.report import StaffReportDetails, StaffDetailResponse
from services.report_service import get_staff_report, get_staff_detailed_report

router = APIRouter()


@router.get(
    "/staff/{staff_type}/{staff_id}",
    response_model=StaffReportDetails,
    summary="Get staff-wise performance report",
    description="Fetch sales metrics, discounts given, unique customers, and top products sold by a staff member.",
)
async def get_staff_report_endpoint(
    staff_type: str,
    staff_id: int,
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
) -> StaffReportDetails:
    # Validate staff type
    stype_upper = staff_type.upper()
    if stype_upper not in ["MANAGER", "WORKER", "OPTICIAN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid staff_type. Must be MANAGER, WORKER, or OPTICIAN"
        )

    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    try:
        report = await get_staff_report(
            db=db,
            admin_id=current_admin.id,
            staff_type=stype_upper,
            staff_id=staff_id,
            start_date=start_date,
            end_date=end_date
        )
        return report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get(
    "/staff/{staff_type}/{staff_id}/details",
    response_model=StaffDetailResponse,
    summary="Get staff detailed profile and historical metrics",
    description="Fetch staff profile info, total sales/expenses, sales list, expenses list, and monthly sales trend.",
)
async def get_staff_detailed_report_endpoint(
    staff_type: str,
    staff_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StaffDetailResponse:
    # Validate staff type
    stype_upper = staff_type.upper()
    if stype_upper not in ["MANAGER", "WORKER", "OPTICIAN"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid staff_type. Must be MANAGER, WORKER, or OPTICIAN"
        )

    try:
        report = await get_staff_detailed_report(
            db=db,
            admin_id=current_admin.id,
            staff_type=stype_upper,
            staff_id=staff_id,
        )
        return report
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
