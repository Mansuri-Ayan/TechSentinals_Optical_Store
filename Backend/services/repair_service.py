# Service: repair_service.py
"""
Repair Service — business logic for Repair & Service job operations.
"""
from datetime import date
from decimal import Decimal
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.repair import Repair, RepairStatus
from models.customer import Customer
from models.sale import Sale
from models.store import Store
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from schemas.repair import RepairCreate, RepairUpdate, RepairStatusUpdate


async def _generate_repair_number(db: AsyncSession) -> str:
    """Auto-generate a unique repair number like REP-2026-00001."""
    stmt = select(Repair.id).order_by(Repair.id.desc()).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none() or 0
    year = date.today().year
    return f"REP-{year}-{last_id + 1:05d}"


async def _get_staff_name(db: AsyncSession, staff_type: str | None, staff_id: int | None) -> str | None:
    """Resolve polymorphic staff name."""
    if not staff_type or not staff_id:
        return None
    if staff_type == "MANAGER":
        res = await db.execute(select(Manager).where(Manager.id == staff_id))
        s = res.scalar_one_or_none()
    elif staff_type == "WORKER":
        res = await db.execute(select(Worker).where(Worker.id == staff_id))
        s = res.scalar_one_or_none()
    elif staff_type == "OPTICIAN":
        res = await db.execute(select(Optician).where(Optician.id == staff_id))
        s = res.scalar_one_or_none()
    else:
        return None
    return f"{s.first_name} {s.last_name}" if s else None


def _build_repair_read_dict(repair: Repair) -> dict:
    """Build dict with denormalized fields for RepairRead/RepairListItem."""
    customer_full_name = None
    if repair.customer:
        customer_full_name = f"{repair.customer.first_name} {repair.customer.last_name or ''}".strip()
    elif repair.customer_name:
        customer_full_name = repair.customer_name

    store_name = repair.store.store_name if repair.store else None
    sale_invoice_number = repair.sale.invoice_number if repair.sale else None

    return {
        "customer_full_name": customer_full_name,
        "store_name": store_name,
        "sale_invoice_number": sale_invoice_number,
    }


async def create_repair(
    db: AsyncSession,
    admin_id: int,
    payload: RepairCreate,
) -> Repair:
    """Create a new repair/service record."""
    repair_number = await _generate_repair_number(db)

    repair = Repair(
        repair_number=repair_number,
        admin_id=admin_id,
        store_id=payload.store_id,
        customer_id=payload.customer_id,
        sale_id=payload.sale_id,
        customer_name=payload.customer_name,
        repair_type=payload.repair_type,
        status=RepairStatus.RECEIVED,
        is_warranty=payload.is_warranty,
        description=payload.description,
        estimated_cost=payload.estimated_cost if not payload.is_warranty else Decimal("0.00"),
        advance_paid=payload.advance_paid,
        received_date=payload.received_date,
        estimated_completion_date=payload.estimated_completion_date,
        handled_by_type=payload.handled_by_type,
        handled_by_id=payload.handled_by_id,
        notes=payload.notes,
    )
    db.add(repair)
    await db.commit()
    await db.refresh(repair)
    return repair


async def get_repair(
    db: AsyncSession,
    repair_id: int,
    admin_id: int,
) -> Repair | None:
    """Fetch a single repair by ID (admin-scoped)."""
    stmt = select(Repair).where(
        Repair.id == repair_id,
        Repair.admin_id == admin_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_repairs(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    customer_id: int | None = None,
    status: str | None = None,
    repair_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Repair], int]:
    """
    List repairs with optional filters.
    Returns (repairs, total_count).
    """
    base_where = [Repair.admin_id == admin_id]

    if store_id:
        base_where.append(Repair.store_id == store_id)
    if customer_id:
        base_where.append(Repair.customer_id == customer_id)
    if status:
        base_where.append(Repair.status == status)
    if repair_type:
        base_where.append(Repair.repair_type == repair_type)
    if search:
        search_term = f"%{search}%"
        base_where.append(
            or_(
                Repair.repair_number.ilike(search_term),
                Repair.customer_name.ilike(search_term),
                Repair.description.ilike(search_term),
            )
        )

    # Count total
    count_stmt = select(func.count(Repair.id)).where(*base_where)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Fetch page
    stmt = (
        select(Repair)
        .where(*base_where)
        .order_by(Repair.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    repairs = list(result.scalars().all())
    return repairs, total


async def update_repair(
    db: AsyncSession,
    repair: Repair,
    payload: RepairUpdate,
) -> Repair:
    """Apply partial updates to a repair record."""
    update_data = payload.model_dump(exclude_unset=True)
    # If is_warranty is being set to True, force cost to 0
    if update_data.get("is_warranty") is True:
        update_data.setdefault("estimated_cost", Decimal("0.00"))
        update_data.setdefault("final_cost", Decimal("0.00"))

    for field, value in update_data.items():
        setattr(repair, field, value)

    await db.commit()
    await db.refresh(repair)
    return repair


async def update_repair_status(
    db: AsyncSession,
    repair: Repair,
    payload: RepairStatusUpdate,
) -> Repair:
    """Update only the status field of a repair."""
    from datetime import date as date_type
    repair.status = payload.status
    if payload.status == "COMPLETED" and not repair.completed_date:
        repair.completed_date = date_type.today()
    await db.commit()
    await db.refresh(repair)
    return repair


async def delete_repair(
    db: AsyncSession,
    repair: Repair,
) -> Repair:
    """Cancel a repair by setting status to CANCELLED."""
    repair.status = RepairStatus.CANCELLED
    await db.commit()
    await db.refresh(repair)
    return repair
