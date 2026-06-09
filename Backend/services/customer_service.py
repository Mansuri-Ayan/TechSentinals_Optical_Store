# Service: customer_service.py
"""
Business logic for Customer CRUD.
Prescription management has been moved to prescription_service.py.
"""
from datetime import datetime, timezone
from sqlalchemy import select, or_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.customer import Customer
from models.sale import Sale
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
    """Fetch a single customer by ID (excluding soft-deleted) with aggregated purchase/sales metrics."""
    sales_subq = (
        select(
            Sale.customer_id,
            func.count(Sale.id).label("total_orders"),
            func.coalesce(func.sum(Sale.total_amount), 0.0).label("total_amount"),
            func.coalesce(func.sum(Sale.due_amount), 0.0).label("outstanding_balance"),
            func.max(Sale.sale_date).label("last_visit"),
        )
        .group_by(Sale.customer_id)
        .subquery()
    )

    stmt = (
        select(
            Customer,
            func.coalesce(sales_subq.c.total_orders, 0).label("total_orders"),
            func.coalesce(sales_subq.c.total_amount, 0.0).label("total_amount"),
            func.coalesce(sales_subq.c.outstanding_balance, 0.0).label("outstanding_balance"),
            sales_subq.c.last_visit.label("last_visit"),
        )
        .outerjoin(sales_subq, Customer.id == sales_subq.c.customer_id)
        .where(
            Customer.id == customer_id,
            Customer.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return None
    
    customer = row[0]
    customer.total_orders = int(row.total_orders)
    customer.total_amount = float(row.total_amount)
    customer.outstanding_balance = float(row.outstanding_balance)
    customer.last_visit = row.last_visit

    # Compute status
    if not customer.is_active:
        customer.status = "Inactive"
    elif customer.total_amount >= 50000 or customer.total_orders >= 5:
        customer.status = "VIP"
    else:
        customer.status = "Active"

    return customer


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
    List customers for an admin with aggregated sales metrics.
    Optionally filter by store_id.
    Search matches against first_name, last_name, phone, email, or city.
    """
    sales_subq = (
        select(
            Sale.customer_id,
            func.count(Sale.id).label("total_orders"),
            func.coalesce(func.sum(Sale.total_amount), 0.0).label("total_amount"),
            func.coalesce(func.sum(Sale.due_amount), 0.0).label("outstanding_balance"),
            func.max(Sale.sale_date).label("last_visit"),
        )
        .group_by(Sale.customer_id)
        .subquery()
    )

    stmt = (
        select(
            Customer,
            func.coalesce(sales_subq.c.total_orders, 0).label("total_orders"),
            func.coalesce(sales_subq.c.total_amount, 0.0).label("total_amount"),
            func.coalesce(sales_subq.c.outstanding_balance, 0.0).label("outstanding_balance"),
            sales_subq.c.last_visit.label("last_visit"),
        )
        .outerjoin(sales_subq, Customer.id == sales_subq.c.customer_id)
        .where(
            Customer.admin_id == admin_id,
            Customer.deleted_at.is_(None),
        )
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
                Customer.city.ilike(pattern),
            )
        )
    stmt = stmt.order_by(Customer.first_name).limit(limit).offset(offset)
    result = await db.execute(stmt)
    rows = result.all()

    customers = []
    for row in rows:
        customer = row[0]
        customer.total_orders = int(row.total_orders)
        customer.total_amount = float(row.total_amount)
        customer.outstanding_balance = float(row.outstanding_balance)
        customer.last_visit = row.last_visit

        # Compute status
        if not customer.is_active:
            customer.status = "Inactive"
        elif customer.total_amount >= 50000 or customer.total_orders >= 5:
            customer.status = "VIP"
        else:
            customer.status = "Active"
        customers.append(customer)

    return customers


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
