# API: sale/read.py
import math
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.sale import StaffType, SaleStatus, Sale
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from schemas.sale import SaleRead, SaleItemRead, SalePaymentRead
from services.sale_service import get_sale, list_sales

router = APIRouter()


def _item_to_read(item) -> SaleItemRead:
    return SaleItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_name=item.product.name if item.product else None,
        product_sku=item.product.sku if item.product else None,
    )


def _payment_to_read(p) -> SalePaymentRead:
    return SalePaymentRead(
        **{c.key: getattr(p, c.key) for c in p.__table__.columns},
    )


def _sale_to_read(sale, include_nested: bool = True, staff_map: dict = None) -> SaleRead:
    customer_name = "Walk-in Customer"
    customer_phone = "—"
    customer_address = "—"
    if sale.customer:
        customer_name = f"{sale.customer.first_name} {sale.customer.last_name or ''}".strip()
        customer_phone = sale.customer.phone or "—"
        customer_address = sale.customer.address or "—"

    staff_name = None
    staff_code = None
    staff_role = None
    if staff_map:
        key = (sale.sold_by_type, sale.sold_by_id)
        if key in staff_map:
            staff = staff_map[key]
            staff_name = f"{staff.first_name} {staff.last_name or ''}".strip()
            staff_code = getattr(staff, "employee_code", None)
            role_str = staff.role.role if (getattr(staff, "role", None) and getattr(staff.role, "role", None)) else sale.sold_by_type.value
            staff_role = role_str.title()

    # Map status to user-friendly strings for frontend
    status_map = {
        SaleStatus.COMPLETED: "Completed",
        SaleStatus.CANCELLED: "Cancelled",
        SaleStatus.REFUNDED: "Returned",
        SaleStatus.PENDING: "Lab Pending",
        SaleStatus.PARTIALLY_PAID: "Lab Pending",
    }
    status_display = status_map.get(sale.status, "Completed")

    # Product summary fields based on the first item
    product_name = None
    product_category = None
    product_subcategory = None
    product_quantity = 0
    product_price = Decimal("0")

    if sale.items:
        first_item = sale.items[0]
        product_name = first_item.product.name if first_item.product else None
        if len(sale.items) > 1:
            product_name = f"{product_name} (+{len(sale.items) - 1} more)"
        
        if first_item.product:
            if first_item.product.category:
                product_category = first_item.product.category.name
            if first_item.product.subcategory:
                product_subcategory = first_item.product.subcategory.name
        
        product_quantity = sum(item.quantity for item in sale.items)
        product_price = first_item.unit_price

    items = [_item_to_read(i) for i in (sale.items or [])] if include_nested else []
    payments = [_payment_to_read(p) for p in (sale.payments or [])] if include_nested else []

    sale_data = {c.key: getattr(sale, c.key) for c in sale.__table__.columns}
    sale_data["status"] = status_display

    return SaleRead(
        **sale_data,
        items=items,
        payments=payments,
        store_name=sale.store.store_name if sale.store else None,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_address=customer_address,
        staff_name=staff_name,
        staff_code=staff_code,
        staff_role=staff_role,
        product_name=product_name,
        product_category=product_category,
        product_subcategory=product_subcategory,
        product_quantity=product_quantity,
        product_price=product_price,
    )


@router.get(
    "/",
    summary="List sales",
    description="List sales with optional filters (store, customer, status, date range, search).",
)
async def list_sales_endpoint(
    store_id: int | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        store_id = current_user.store_id

    sales, total = await list_sales(
        db,
        admin_id=admin_id,
        store_id=store_id,
        customer_id=customer_id,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
        paginate=paginate,
    )

    # Batch resolve staff info to avoid N+1 queries
    manager_ids = {s.sold_by_id for s in sales if s.sold_by_type == StaffType.MANAGER}
    worker_ids = {s.sold_by_id for s in sales if s.sold_by_type == StaffType.WORKER}
    optician_ids = {s.sold_by_id for s in sales if s.sold_by_type == StaffType.OPTICIAN}

    staff_map = {}
    if manager_ids:
        m_res = await db.execute(select(Manager).where(Manager.id.in_(manager_ids)))
        for m in m_res.scalars().all():
            staff_map[(StaffType.MANAGER, m.id)] = m
    if worker_ids:
        w_res = await db.execute(select(Worker).where(Worker.id.in_(worker_ids)))
        for w in w_res.scalars().all():
            staff_map[(StaffType.WORKER, w.id)] = w
    if optician_ids:
        o_res = await db.execute(select(Optician).where(Optician.id.in_(optician_ids)))
        for o in o_res.scalars().all():
            staff_map[(StaffType.OPTICIAN, o.id)] = o

    validated = [_sale_to_read(s, include_nested=True, staff_map=staff_map) for s in sales]

    # Calculate KPIs dynamically under the same store / date filters
    from sqlalchemy import func as sa_func
    kpi_conditions = [Sale.admin_id == admin_id]
    if store_id:
        kpi_conditions.append(Sale.store_id == store_id)
    if date_from:
        kpi_conditions.append(Sale.sale_date >= date_from)
    if date_to:
        kpi_conditions.append(Sale.sale_date <= date_to)

    # 1. Total revenue
    rev_stmt = select(sa_func.coalesce(sa_func.sum(Sale.total_amount), 0)).where(
        *kpi_conditions, Sale.status != SaleStatus.CANCELLED
    )
    revenue = (await db.execute(rev_stmt)).scalar() or 0

    # 2. Total orders
    orders_stmt = select(sa_func.count(Sale.id)).where(*kpi_conditions)
    total_orders = (await db.execute(orders_stmt)).scalar() or 0

    # 3. Completed orders
    completed_stmt = select(sa_func.count(Sale.id)).where(
        *kpi_conditions, Sale.status == SaleStatus.COMPLETED
    )
    completed = (await db.execute(completed_stmt)).scalar() or 0

    # 4. Active (Pending / Partially Paid)
    active_stmt = select(sa_func.count(Sale.id)).where(
        *kpi_conditions,
        Sale.status.in_([SaleStatus.PENDING, SaleStatus.PARTIALLY_PAID])
    )
    active = (await db.execute(active_stmt)).scalar() or 0

    kpis = {
        "revenue": float(revenue),
        "totalOrders": total_orders,
        "completed": completed,
        "active": active,
    }

    if not paginate:
        return validated

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
        "kpis": kpis,
    }


@router.get(
    "/{sale_id}",
    response_model=SaleRead,
    summary="Get sale",
    description="Get a single sale with items and payments.",
)
async def get_sale_endpoint(
    sale_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> SaleRead:
    sale = await get_sale(db, sale_id)
    
    if isinstance(current_user, Admin):
        allowed = sale and sale.admin_id == current_user.id
    else:
        allowed = sale and sale.store_id == current_user.store_id
        
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )

    # Resolve staff
    staff_map = {}
    if sale.sold_by_type == StaffType.MANAGER:
        m = await db.get(Manager, sale.sold_by_id)
        if m:
            staff_map[(StaffType.MANAGER, sale.sold_by_id)] = m
    elif sale.sold_by_type == StaffType.WORKER:
        w = await db.get(Worker, sale.sold_by_id)
        if w:
            staff_map[(StaffType.WORKER, sale.sold_by_id)] = w
    elif sale.sold_by_type == StaffType.OPTICIAN:
        o = await db.get(Optician, sale.sold_by_id)
        if o:
            staff_map[(StaffType.OPTICIAN, sale.sold_by_id)] = o

    return _sale_to_read(sale, include_nested=True, staff_map=staff_map)
