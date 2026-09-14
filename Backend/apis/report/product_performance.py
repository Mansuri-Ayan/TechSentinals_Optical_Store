from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.report import ProductPerformanceReportResponse, ProductPerformanceKPIs
from services.report_service import get_product_performance_report

router = APIRouter()


@router.get(
    "/product-performance",
    response_model=ProductPerformanceReportResponse,
    summary="Get cross-store product performance analytics",
    description="Analyze product sales performance, stock levels, and transfer opportunities across stores.",
)
async def get_product_performance_endpoint(
    search: str | None = Query(None, description="Search query matching product name/SKU"),
    category_id: int | None = Query(None, description="Filter by category ID"),
    brand_id: int | None = Query(None, description="Filter by brand ID"),
    store_id: int | None = Query(None, description="Filter by store ID"),
    date_from: datetime | None = Query(None, description="Filter sales starting from date"),
    date_to: datetime | None = Query(None, description="Filter sales ending at date"),
    sort_by: str | None = Query(None, description="Sort order: revenue_desc, sales_desc, margin_desc, sales_asc, stock_desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('reports', 'read')),
) -> ProductPerformanceReportResponse:
    admin_id = get_user_admin_id(current_user)
    
    # If the user is store staff (Manager or Worker), determine their store_id to customize insights
    is_admin = isinstance(current_user, Admin)
    effective_store_id = store_id if is_admin and store_id else (getattr(current_user, "store_id", None) if not is_admin else None)

    items, total, summary_kpis = await get_product_performance_report(
        db=db,
        admin_id=admin_id,
        current_user_store_id=effective_store_id,
        search=search,
        category_id=category_id,
        brand_id=brand_id,
        filter_store_id=store_id if is_admin else None,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        page=page,
        limit=limit,
    )
    
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return ProductPerformanceReportResponse(
        items=items,
        total=total,
        page=page,
        pages=pages,
        limit=limit,
        summary_kpis=summary_kpis,
    )
