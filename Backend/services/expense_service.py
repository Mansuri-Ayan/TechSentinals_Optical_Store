# Service: expense_service.py
from datetime import date, datetime, timezone
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin import Admin
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.expense import Expense, ExpenseOwnerType, ExpenseRecordedByType
from models.expense_category import ExpenseCategory
from schemas.expense import ExpenseCreate, ExpenseUpdate
from schemas.expense_category import ExpenseCategoryCreate, ExpenseCategoryUpdate


# ── Staff Name Resolution Helper ─────────────────────────────

async def get_staff_name(db: AsyncSession, staff_type: str, staff_id: int) -> str | None:
    """Helper to resolve a polymorphic staff name (Admin, Manager, Worker, Optician)."""
    if staff_type == "ADMIN":
        stmt = select(Admin).where(Admin.id == staff_id)
        res = await db.execute(stmt)
        admin = res.scalar_one_or_none()
        return f"{admin.owner_first_name} {admin.owner_last_name}".strip() if admin else None
    elif staff_type == "MANAGER":
        stmt = select(Manager).where(Manager.id == staff_id)
        res = await db.execute(stmt)
        mgr = res.scalar_one_or_none()
        return f"{mgr.first_name} {mgr.last_name}".strip() if mgr else None
    elif staff_type == "WORKER":
        stmt = select(Worker).where(Worker.id == staff_id)
        res = await db.execute(stmt)
        wrk = res.scalar_one_or_none()
        return f"{wrk.first_name} {wrk.last_name}".strip() if wrk else None
    elif staff_type == "OPTICIAN":
        stmt = select(Optician).where(Optician.id == staff_id)
        res = await db.execute(stmt)
        opt = res.scalar_one_or_none()
        return f"{opt.first_name} {opt.last_name}".strip() if opt else None
    return None


async def get_owner_name(db: AsyncSession, owner_type: str, owner_id: int) -> str | None:
    """Helper to resolve polymorphic owner name (Admin Business Name or Store Code/Name)."""
    if owner_type == "ADMIN":
        stmt = select(Admin).where(Admin.id == owner_id)
        res = await db.execute(stmt)
        admin = res.scalar_one_or_none()
        return admin.business_name if admin else None
    elif owner_type == "STORE":
        stmt = select(Store).where(Store.id == owner_id)
        res = await db.execute(stmt)
        store = res.scalar_one_or_none()
        return f"{store.store_name} ({store.store_code})" if store else None
    return None


# ── Expense Category Services ─────────────────────────────────

async def create_expense_category(
    db: AsyncSession, admin_id: int, payload: ExpenseCategoryCreate
) -> ExpenseCategory:
    category = ExpenseCategory(admin_id=admin_id, **payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


async def get_expense_category(db: AsyncSession, category_id: int) -> ExpenseCategory | None:
    stmt = select(ExpenseCategory).where(ExpenseCategory.id == category_id)
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def list_expense_categories(
    db: AsyncSession, admin_id: int, search: str | None = None, active_only: bool = False
) -> list[ExpenseCategory]:
    stmt = select(ExpenseCategory).where(ExpenseCategory.admin_id == admin_id)
    if active_only:
        stmt = stmt.where(ExpenseCategory.is_active.is_(True))
    if search:
        stmt = stmt.where(ExpenseCategory.name.ilike(f"%{search}%"))
    stmt = stmt.order_by(ExpenseCategory.name)
    res = await db.execute(stmt)
    return list(res.scalars().all())


async def update_expense_category(
    db: AsyncSession, category: ExpenseCategory, payload: ExpenseCategoryUpdate
) -> ExpenseCategory:
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(category, field, val)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_expense_category(db: AsyncSession, category: ExpenseCategory) -> bool:
    """
    Tries to delete an expense category.
    Returns True if deleted, or False if restricted (used by expenses).
    """
    # Check if category is used by any expense (ignoring soft deleted or not)
    stmt = select(func.count(Expense.id)).where(Expense.category_id == category.id)
    res = await db.execute(stmt)
    count = res.scalar()
    if count > 0:
        return False
    await db.delete(category)
    await db.commit()
    return True


# ── Expense Operations Services ───────────────────────────────

async def create_expense(
    db: AsyncSession,
    admin_id: int,
    recorded_by_type: ExpenseRecordedByType,
    recorded_by_id: int,
    payload: ExpenseCreate,
) -> Expense:
    expense = Expense(
        admin_id=admin_id,
        recorded_by_type=recorded_by_type,
        recorded_by_id=recorded_by_id,
        is_approved=False,  # pending by default
        **payload.model_dump(),
    )
    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    return expense


async def get_expense(db: AsyncSession, expense_id: int) -> Expense | None:
    stmt = select(Expense).where(
        Expense.id == expense_id,
        Expense.deleted_at.is_(None),
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def list_expenses(
    db: AsyncSession,
    admin_id: int,
    owner_type: ExpenseOwnerType | None = None,
    owner_id: int | None = None,
    category_id: int | None = None,
    search: str | None = None,
    is_approved: bool | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Expense], int]:
    """List expenses with filter options, returning items and total count."""
    stmt = select(Expense).where(
        Expense.admin_id == admin_id,
        Expense.deleted_at.is_(None),
    )

    if owner_type is not None:
        stmt = stmt.where(Expense.owner_type == owner_type)
    if owner_id is not None:
        stmt = stmt.where(Expense.owner_id == owner_id)
    if category_id is not None:
        stmt = stmt.where(Expense.category_id == category_id)
    if is_approved is not None:
        stmt = stmt.where(Expense.is_approved == is_approved)
    if start_date is not None:
        stmt = stmt.where(Expense.expense_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(Expense.expense_date <= end_date)
    if search:
        stmt = stmt.where(
            or_(
                Expense.title.ilike(f"%{search}%"),
                Expense.description.ilike(f"%{search}%"),
            )
        )

    # Count total
    count_stmt = select(func.count(Expense.id)).select_from(stmt.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # Paginate
    stmt = stmt.order_by(Expense.expense_date.desc()).limit(limit).offset(offset)
    items_res = await db.execute(stmt)
    items = list(items_res.scalars().all())

    return items, total


async def update_expense(db: AsyncSession, expense: Expense, payload: ExpenseUpdate) -> Expense:
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(expense, field, val)
    await db.commit()
    await db.refresh(expense)
    return expense


async def approve_expense(
    db: AsyncSession, expense: Expense, approved_by_admin_id: int, is_approved: bool
) -> Expense:
    expense.is_approved = is_approved
    if is_approved:
        expense.approved_by = approved_by_admin_id
        expense.approved_at = datetime.now(timezone.utc)
    else:
        expense.approved_by = None
        expense.approved_at = None
    await db.commit()
    await db.refresh(expense)
    return expense


async def soft_delete_expense(db: AsyncSession, expense: Expense) -> None:
    expense.deleted_at = datetime.now(timezone.utc)
    await db.commit()
