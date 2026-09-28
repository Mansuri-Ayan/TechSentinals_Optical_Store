# API: superadmin/stores.py
import math
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case, distinct

from db.session import get_db
from core.deps import get_current_superadmin
from models.superadmin import SuperAdmin
from models.admin import Admin
from models.store import Store
from models.sale import Sale, SaleStatus

router = APIRouter(prefix="/stores", tags=["SuperAdmin - Stores"])


@router.get("")
async def list_all_stores(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None),
    state_filter: Optional[str] = Query(None),
    admin_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    Returns cross-tenant paginated list of retail branches with business names and metrics.
    """
    filters = [Store.deleted_at.is_(None)]

    if admin_id:
        filters.append(Store.admin_id == admin_id)

    if status_filter and status_filter.upper() != "ALL":
        is_active_val = status_filter.upper() == "ACTIVE"
        filters.append(Store.is_active.is_(is_active_val))

    if state_filter:
        filters.append(Store.state.ilike(f"%{state_filter.strip()}%"))

    if search:
        term = f"%{search.strip()}%"
        filters.append(
            or_(
                Store.store_name.ilike(term),
                Store.store_code.ilike(term),
                Store.city.ilike(term),
                Store.state.ilike(term),
                Admin.business_name.ilike(term),
            )
        )

    # Count total
    count_stmt = (
        select(func.count(distinct(Store.id)))
        .join(Admin, Store.admin_id == Admin.id)
        .where(*filters)
    )
    total = (await db.execute(count_stmt)).scalar() or 0

    # Query items with joined Admin and metrics
    stmt = (
        select(
            Store,
            Admin.business_name,
            func.coalesce(func.sum(case((Sale.status == SaleStatus.COMPLETED, Sale.total_amount), else_=0)), 0).label("revenue"),
            func.count(distinct(case((Sale.status == SaleStatus.COMPLETED, Sale.id)))).label("orders_count"),
        )
        .join(Admin, Store.admin_id == Admin.id)
        .outerjoin(Sale, Store.id == Sale.store_id)
        .where(*filters)
        .group_by(Store.id, Admin.business_name)
        .order_by(Store.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    res = await db.execute(stmt)
    rows = res.all()

    items = []
    for store, business_name, rev, orders in rows:
        items.append({
            "id": store.id,
            "admin_id": store.admin_id,
            "business_name": business_name,
            "store_name": store.store_name,
            "store_code": store.store_code,
            "address": store.address,
            "city": store.city,
            "state": store.state,
            "pincode": store.pincode,
            "phone": store.phone,
            "email": store.email,
            "is_active": store.is_active,
            "is_main_store": store.is_main_store,
            "revenue": float(rev or 0),
            "orders_count": int(orders or 0),
            "created_at": store.created_at.isoformat() if store.created_at else None,
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
    }


@router.patch("/{store_id}/status")
async def toggle_store_status(
    store_id: int,
    payload: dict,
    db: AsyncSession = Depends(get_db),
    current_superadmin: SuperAdmin = Depends(get_current_superadmin),
):
    """
    SuperAdmin override to toggle a store active/inactive.
    """
    store = await db.get(Store, store_id)
    if not store or store.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Store not found")

    is_active = payload.get("is_active")
    if is_active is None:
        raise HTTPException(status_code=400, detail="'is_active' boolean field required")

    store.is_active = bool(is_active)
    await db.commit()
    await db.refresh(store)

    return {
        "success": True,
        "message": f"Store '{store.store_name}' status updated to {'Active' if store.is_active else 'Inactive'}",
        "is_active": store.is_active,
    }
