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
    snap = item.product_snapshot
    p = item.product
    brand_name = snap.brand_name if snap else (p.brand.name if (p and p.brand) else "—")
    cat_name = snap.category_name if snap else (p.category.name if (p and p.category) else "—")
    subcat_name = snap.subcategory_name if snap else (p.subcategory.name if (p and p.subcategory) else "—")
    
    return SaleItemRead(
        **{c.key: getattr(item, c.key) for c in item.__table__.columns},
        product_snapshot=snap,
        product_name=snap.name if snap else (p.name if p else None),
        product_sku=snap.sku if snap else (p.sku if p else None),
        product_brand=brand_name,
        product_category=cat_name,
        product_subcategory=subcat_name,
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
    if sale.lab_status and sale.lab_status != "Delivered":
        if sale.status == SaleStatus.CANCELLED:
            status_display = "Cancelled"
        elif sale.status == SaleStatus.REFUNDED:
            status_display = "Returned"
        else:
            status_display = "Lab Pending"
    else:
        status_map = {
            SaleStatus.COMPLETED: "Completed",
            SaleStatus.CANCELLED: "Cancelled",
            SaleStatus.REFUNDED: "Returned",
            SaleStatus.PENDING: "Unpaid",
            SaleStatus.PARTIALLY_PAID: "Partially Paid",
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
        snap = first_item.product_snapshot
        if snap:
            product_name = snap.name
            product_category = snap.category_name
            product_subcategory = snap.subcategory_name
        elif first_item.product:
            product_name = first_item.product.name
            if first_item.product.category:
                product_category = first_item.product.category.name
            if first_item.product.subcategory:
                product_subcategory = first_item.product.subcategory.name
        if len(sale.items) > 1:
            product_name = f"{product_name} (+{len(sale.items) - 1} more)" if product_name else None
        
        product_quantity = sum(item.quantity for item in sale.items)
        product_price = first_item.unit_price

    items = [_item_to_read(i) for i in (sale.items or [])] if include_nested else []
    payments = [_payment_to_read(p) for p in (sale.payments or [])] if include_nested else []

    prescription_details = None
    lens_details = None
    if getattr(sale, "prescription", None):
        p = sale.prescription
        prescription_details = {
            "sphRight": p.sph_right or "",
            "cylRight": p.cyl_right or "",
            "axisRight": p.axis_right or "",
            "sphLeft": p.sph_left or "",
            "cylLeft": p.cyl_left or "",
            "axisLeft": p.axis_left or "",
            "addition": p.addition or "",
            "pd": p.pupillary_distance or ""
        }
        lens_details = {
            "type": p.lens_type or "",
            "material": p.lens_material or "",
            "coating": p.lens_coating or ""
        }

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
        prescriptionDetails=prescription_details,
        lensDetails=lens_details,
    )


@router.get(
    "/",
    summary="List sales",
    description="List sales with optional filters (store, customer, status, date range, search).",
)
async def list_sales_endpoint(
    store_id: str | None = Query(default=None),
    customer_id: int | None = Query(default=None),
    status_filter: str | None = Query(default=None, alias="status"),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    search: str | None = Query(default=None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=10000),
    paginate: bool = Query(True),
    has_due: bool | None = Query(default=None),
    is_lab_order: bool | None = Query(default=None),
    tab: str | None = Query(default=None),
    lab_status: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        numeric_store_id = None
        if store_id and store_id.lower() != "admin":
            try:
                numeric_store_id = int(store_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid store_id format")
    else:
        admin_id = current_user.store.admin_id
        numeric_store_id = current_user.store_id

    sales, total = await list_sales(
        db,
        admin_id=admin_id,
        store_id=numeric_store_id,
        customer_id=customer_id,
        status_filter=status_filter,
        date_from=date_from,
        date_to=date_to,
        search=search,
        page=page,
        limit=limit,
        paginate=paginate,
        has_due=has_due,
        is_lab_order=is_lab_order,
        tab=tab,
        lab_status_filter=lab_status,
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
    
    if is_lab_order:
        lab_kpi_conds = [Sale.admin_id == admin_id, Sale.lab_status.is_not(None), Sale.lab_status != "Delivered"]
        if numeric_store_id:
            lab_kpi_conds.append(Sale.store_id == numeric_store_id)
        if date_from:
            lab_kpi_conds.append(Sale.sale_date >= date_from)
        if date_to:
            lab_kpi_conds.append(Sale.sale_date <= date_to)

        # Tab conditions
        sales_tab_conds = []
        if tab == "queue":
            sales_tab_conds.append(Sale.lab_status.in_(["Confirmed", "Advance Paid", "Waiting For Lab", "Processing"]))
        elif tab == "pending":
            sales_tab_conds.append(Sale.lab_status.in_(["In Lab", "Sent To Lab", "In Production", "Quality Check"]))
        elif tab == "ready":
            sales_tab_conds.append(Sale.lab_status.in_(["Ready For Pickup", "Customer Notified"]))

        # Counts
        cnt_sales_stmt = select(sa_func.count(Sale.id)).where(*lab_kpi_conds, *sales_tab_conds)
        total_count = (await db.execute(cnt_sales_stmt)).scalar() or 0

        in_production = (await db.execute(select(sa_func.count(Sale.id)).where(*lab_kpi_conds, Sale.lab_status.in_(["In Lab", "Sent To Lab", "In Production", "Quality Check"])))).scalar() or 0
        ready_pickup = (await db.execute(select(sa_func.count(Sale.id)).where(*lab_kpi_conds, Sale.lab_status.in_(["Ready For Pickup", "Customer Notified"])))).scalar() or 0

        # Valuations
        val_sales = (await db.execute(select(sa_func.coalesce(sa_func.sum(Sale.total_amount), 0)).where(*lab_kpi_conds, *sales_tab_conds))).scalar() or 0
        total_val = float(val_sales)

        # Tab counts
        queue_count = (await db.execute(select(sa_func.count(Sale.id)).where(*lab_kpi_conds, Sale.lab_status.in_(["Confirmed", "Advance Paid", "Waiting For Lab", "Processing"])))).scalar() or 0
        pending_count = (await db.execute(select(sa_func.count(Sale.id)).where(*lab_kpi_conds, Sale.lab_status.in_(["In Lab", "Sent To Lab", "In Production", "Quality Check"])))).scalar() or 0
        ready_count = (await db.execute(select(sa_func.count(Sale.id)).where(*lab_kpi_conds, Sale.lab_status.in_(["Ready For Pickup", "Customer Notified"])))).scalar() or 0

        kpis = {
            "totalCount": total_count,
            "inProduction": in_production,
            "readyForPickup": ready_pickup,
            "totalValuation": float(total_val),
            "queueCount": queue_count,
            "pendingCount": pending_count,
            "readyCount": ready_count,
        }
    else:
        kpi_conditions = [Sale.admin_id == admin_id]
        if numeric_store_id:
            kpi_conditions.append(Sale.store_id == numeric_store_id)
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
