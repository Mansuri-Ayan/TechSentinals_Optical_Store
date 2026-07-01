# API: lab/read.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user, require_permission
from db.session import get_db
from models.admin import Admin
from schemas.lab import LabRead
from services.lab_service import get_lab, get_labs_by_admin

router = APIRouter()


@router.get(
    "/",
    summary="List all lab partners",
)
async def list_labs(
    active_status: str | None = Query(None, description="active, inactive, or None/all"),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("sales:read", "sales:create", "sales:update", "inventory:create", "inventory:update")),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

    items, total, active_cnt, inactive_cnt = await get_labs_by_admin(
        db,
        admin_id=admin_id,
        active_status=active_status,
        search=search,
        page=page,
        limit=limit,
        paginate=paginate,
    )

    validated = [LabRead.model_validate(item) for item in items]

    if not paginate:
        return validated

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
        "active_count": active_cnt,
        "inactive_count": inactive_cnt,
    }


@router.get(
    "/{lab_id}",
    response_model=LabRead,
    summary="Get a single lab partner",
)
async def get_lab_endpoint(
    lab_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("sales:read", "sales:create", "sales:update")),
) -> LabRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

    lab = await get_lab(db, lab_id)
    if lab is None or lab.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab partner not found",
        )
    return LabRead.model_validate(lab)


from schemas.lab import LabOrdersResponse
from apis.sale.read import _sale_to_read
from models.sale import Sale, StaffType
from models.customer import Customer
from models.sale_item import SaleItem
from models.product import Product
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from sqlalchemy import select, func as sa_func, or_, exists
from sqlalchemy.orm import selectinload

@router.get(
    "/{lab_id}/orders",
    response_model=LabOrdersResponse,
    summary="Get orders assigned to a lab",
)
async def get_lab_orders_endpoint(
    lab_id: int,
    search: str | None = Query(None),
    lab_status: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("sales:read", "sales:create", "sales:update")),
) -> LabOrdersResponse:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

    # Fetch the lab
    lab = await get_lab(db, lab_id)
    if lab is None or lab.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab partner not found",
        )

    # Statuses considered "In Lab"
    IN_LAB_STATUSES = ["In Lab", "Sent To Lab", "In Production", "Quality Check"]

    # Base: only orders that have been sent to this lab (In Lab or Delivered)
    # Excludes Confirmed (not yet sent) and Ready For Pickup
    conditions = [
        Sale.lab_id == lab_id,
        Sale.admin_id == admin_id,
        Sale.lab_status.in_(IN_LAB_STATUSES + ["Delivered"]),
    ]

    # Tab filter: "In Lab" tab shows only active lab statuses; "Delivered" shows delivered
    if lab_status and lab_status != "All":
        if lab_status == "In Lab":
            conditions.append(Sale.lab_status.in_(IN_LAB_STATUSES))
        else:
            conditions.append(Sale.lab_status == lab_status)

    if search:
        search_term = f"%{search.strip()}%"
        invoice_cond = Sale.invoice_number.ilike(search_term)
        
        customer_exists = exists().where(
            Customer.id == Sale.customer_id,
            or_(
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.phone.ilike(search_term)
            )
        )
        
        product_exists = exists().where(
            SaleItem.sale_id == Sale.id,
            exists().where(
                Product.id == SaleItem.product_id,
                Product.name.ilike(search_term)
            )
        )
        
        conditions.append(or_(invoice_cond, customer_exists, product_exists))

    # Total Count query
    count_stmt = select(sa_func.count(Sale.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Data query
    data_stmt = select(Sale).where(*conditions).order_by(Sale.created_at.desc())
    data_stmt = data_stmt.options(
        selectinload(Sale.customer),
        selectinload(Sale.store),
        selectinload(Sale.payments),
        selectinload(Sale.items).selectinload(SaleItem.product)
    )

    offset = (page - 1) * limit
    data_stmt = data_stmt.offset(offset).limit(limit)
    
    result = await db.execute(data_stmt)
    sales = list(result.scalars().all())

    # Batch resolve staff info for _sale_to_read
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

    validated_orders = [_sale_to_read(s, include_nested=True, staff_map=staff_map) for s in sales]

    import math
    pages_count = math.ceil(total / limit) if limit else 1

    return LabOrdersResponse(
        lab=LabRead.model_validate(lab),
        orders=validated_orders,
        total=total,
        page=page,
        limit=limit,
        pages=pages_count,
    )
