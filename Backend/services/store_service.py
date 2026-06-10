# Service: store_service.py
from datetime import datetime, timezone, timedelta
from sqlalchemy import desc, select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.store import Store
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.sale import Sale
from models.sale_item import SaleItem
from models.product import Product
from models.category import Category
from models.expense import Expense, ExpenseOwnerType
from models.customer import Customer
from schemas.store import StoreCreate, StoreUpdate


async def _generate_store_code(db: AsyncSession) -> str:
    stmt = select(Store.id).order_by(desc(Store.id)).limit(1)
    result = await db.execute(stmt)
    last_store_id = result.scalar_one_or_none() or 0
    return f"STR-{last_store_id + 1}"


async def create_store(
    db: AsyncSession,
    admin_id: int,
    payload: StoreCreate,
) -> Store:
    """Create a new store owned by the given admin."""
    store_code = payload.store_code or await _generate_store_code(db)
    new_store = Store(
        admin_id=admin_id,
        store_name=payload.store_name,
        store_code=store_code,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        gst_number=payload.gst_number,
        is_active=payload.is_active,
    )
    db.add(new_store)
    await db.commit()
    await db.refresh(new_store)
    return new_store


def _get_metrics_subqueries(store_id_col):
    """Generate subqueries for store metrics."""
    # Staff count: managers + workers + opticians
    mgr_subq = select(func.count(Manager.id)).where(Manager.store_id == store_id_col, Manager.deleted_at.is_(None)).scalar_subquery()
    wrk_subq = select(func.count(Worker.id)).where(Worker.store_id == store_id_col, Worker.deleted_at.is_(None)).scalar_subquery()
    opt_subq = select(func.count(Optician.id)).where(Optician.store_id == store_id_col, Optician.deleted_at.is_(None)).scalar_subquery()
    staff_count = mgr_subq + wrk_subq + opt_subq
    
    # Revenue generated: sum(Sale.total_amount)
    revenue = select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.store_id == store_id_col).scalar_subquery()
    
    # Total orders: count(Sale.id)
    orders = select(func.count(Sale.id)).where(Sale.store_id == store_id_col).scalar_subquery()
    
    return staff_count, revenue, orders


async def get_store(db: AsyncSession, store_id: int) -> Store | None:
    """Fetch a single store by ID (excluding soft-deleted) with metrics."""
    staff_count, revenue, orders = _get_metrics_subqueries(Store.id)
    
    stmt = (
        select(
            Store,
            staff_count.label("staff_count"),
            revenue.label("revenue_generated"),
            orders.label("total_orders")
        )
        .where(Store.id == store_id, Store.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        return None
    
    store = row.Store
    store.staff_count = row.staff_count
    store.revenue_generated = float(row.revenue_generated)
    store.total_orders = row.total_orders
    return store


async def get_stores_by_admin(
    db: AsyncSession,
    admin_id: int,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    city: str | None = None,
    state: str | None = None,
    is_active: bool | None = None,
    paginate: bool = True,
) -> tuple[list[Store], int]:
    """List all non-deleted stores for a given admin with pagination, filtering, and metrics."""
    staff_count, revenue, orders = _get_metrics_subqueries(Store.id)
    
    # Base queries
    stmt = (
        select(
            Store,
            staff_count.label("staff_count"),
            revenue.label("revenue_generated"),
            orders.label("total_orders")
        )
        .where(Store.admin_id == admin_id, Store.deleted_at.is_(None))
    )
    count_stmt = select(func.count()).select_from(Store).where(Store.admin_id == admin_id, Store.deleted_at.is_(None))

    # Apply search filter
    if search:
        search_filter = (
            Store.store_name.ilike(f"%{search}%") |
            Store.store_code.ilike(f"%{search}%") |
            Store.city.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    # Apply other filters
    if city:
        stmt = stmt.where(Store.city.ilike(city))
        count_stmt = count_stmt.where(Store.city.ilike(city))
    if state:
        stmt = stmt.where(Store.state.ilike(state))
        count_stmt = count_stmt.where(Store.state.ilike(state))
    if is_active is not None:
        stmt = stmt.where(Store.is_active == is_active)
        count_stmt = count_stmt.where(Store.is_active == is_active)

    # Calculate total count
    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    # Apply pagination and sorting
    stmt = stmt.order_by(Store.created_at.desc())
    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    rows = result.all()
    
    items = []
    for row in rows:
        store = row.Store
        store.staff_count = row.staff_count
        store.revenue_generated = float(row.revenue_generated)
        store.total_orders = row.total_orders
        items.append(store)

    return items, total


async def get_store_overview(db: AsyncSession, store_id: int) -> dict:
    """Calculate store overview stats for charts."""
    # Weekly revenue for the current month
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    weekly_revenue = []
    for i in range(4):
        start = month_start + timedelta(days=i*7)
        end = start + timedelta(days=7)
        stmt = select(func.coalesce(func.sum(Sale.total_amount), 0)).where(
            Sale.store_id == store_id,
            Sale.sale_date >= start.date(),
            Sale.sale_date < end.date()
        )
        res = await db.execute(stmt)
        amount = float(res.scalar_one())
        weekly_revenue.append({"week": f"Wk {i+1}", "amount": amount})
        
    # Sales by category
    stmt = (
        select(Category.name, func.coalesce(func.sum(SaleItem.line_total), 0))
        .select_from(SaleItem)
        .join(Sale, SaleItem.sale_id == Sale.id)
        .join(Product, SaleItem.product_id == Product.id)
        .join(Category, Product.category_id == Category.id)
        .where(Sale.store_id == store_id)
        .group_by(Category.name)
    )
    res = await db.execute(stmt)
    sales_by_category = [{"category": row[0], "amount": float(row[1])} for row in res.all()]
    
    # Expense breakdown vs Revenue
    # Get revenue
    stmt = select(func.coalesce(func.sum(Sale.total_amount), 0)).where(Sale.store_id == store_id)
    res = await db.execute(stmt)
    revenue_val = float(res.scalar_one())
    
    # Get expenses by category
    from models.expense_category import ExpenseCategory
    stmt = (
        select(ExpenseCategory.name, func.coalesce(func.sum(Expense.amount), 0))
        .select_from(Expense)
        .join(ExpenseCategory, Expense.category_id == ExpenseCategory.id)
        .where(Expense.owner_type == ExpenseOwnerType.STORE, Expense.owner_id == store_id)
        .group_by(ExpenseCategory.name)
    )
    res = await db.execute(stmt)
    expense_breakdown = [{"label": "Revenue", "amount": revenue_val}]
    for row in res.all():
        expense_breakdown.append({"label": row[0], "amount": float(row[1])})
        
    # Monthly customer acquisition (last 6 months)
    monthly_customers = []
    for i in range(5, -1, -1):
        target_month = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1)
        next_month = (target_month + timedelta(days=32)).replace(day=1)
        stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.created_at >= target_month,
            Customer.created_at < next_month
        )
        res = await db.execute(stmt)
        count = res.scalar_one()
        monthly_customers.append({"month": target_month.strftime("%b"), "count": count})
        
    return {
        "weekly_revenue": weekly_revenue,
        "sales_by_category": sales_by_category,
        "expense_breakdown": expense_breakdown,
        "monthly_customers": monthly_customers
    }


async def update_store(
    db: AsyncSession,
    store: Store,
    payload: StoreUpdate,
) -> Store:
    """Apply partial updates to a store."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)
    await db.commit()
    await db.refresh(store)
    return store


async def delete_store(db: AsyncSession, store: Store) -> Store:
    """Soft-delete a store by setting deleted_at."""
    store.deleted_at = datetime.now(timezone.utc)
    store.is_active = False
    await db.commit()
    await db.refresh(store)
    return store
