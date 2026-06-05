# Service: customer_service.py
"""
Business logic for Customer CRUD.
Prescription management has been moved to prescription_service.py.
"""
from datetime import datetime, timezone
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from models.customer import Customer
from schemas.customer import CustomerCreate, CustomerUpdate


# ── Create ─────────────────────────────────────────────────────

async def create_customer(
    db: AsyncSession,
    admin_id: int,
    payload: CustomerCreate,
) -> Customer:
    """Create a new customer scoped to an admin's business."""
    customer = Customer(
        admin_id=admin_id,
        **payload.model_dump(),
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)
    return customer


# ── Read ───────────────────────────────────────────────────────

async def get_customer(
    db: AsyncSession,
    customer_id: int,
) -> Customer | None:
    """Fetch a single customer by ID (excluding soft-deleted)."""
    stmt = select(Customer).where(
        Customer.id == customer_id,
        Customer.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_customer_by_phone(
    db: AsyncSession,
    admin_id: int,
    phone: str,
) -> Customer | None:
    """Look up a customer by phone within an admin's business."""
    stmt = select(Customer).where(
        Customer.admin_id == admin_id,
        Customer.phone == phone,
        Customer.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_customers(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    search: str | None = None,
    active_only: bool = True,
    limit: int = 100,
    offset: int = 0,
) -> list[Customer]:
    """
    List customers for an admin.
    Optionally filter by store_id.
    Search matches against first_name, last_name, phone, or email.
    """
    stmt = select(Customer).where(
        Customer.admin_id == admin_id,
        Customer.deleted_at.is_(None),
    )
    if active_only:
        stmt = stmt.where(Customer.is_active.is_(True))
    if store_id is not None:
        stmt = stmt.where(Customer.store_id == store_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Customer.first_name.ilike(pattern),
                Customer.last_name.ilike(pattern),
                Customer.phone.ilike(pattern),
                Customer.email.ilike(pattern),
            )
        )
    stmt = stmt.order_by(Customer.first_name).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Update ─────────────────────────────────────────────────────

async def update_customer(
    db: AsyncSession,
    customer: Customer,
    payload: CustomerUpdate,
) -> Customer:
    """Apply partial updates to a customer."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    await db.commit()
    await db.refresh(customer)
    return customer


# ── Delete ─────────────────────────────────────────────────────

async def soft_delete_customer(
    db: AsyncSession,
    customer: Customer,
) -> None:
    """Soft-delete a customer."""
    customer.deleted_at = datetime.now(timezone.utc)
    customer.is_active = False
    await db.commit()
