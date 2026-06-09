# Service: expense_service.py
import math
from datetime import date, datetime, timezone
from sqlalchemy import select, or_, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models.admin import Admin
from models.store import Store
from models.worker import Worker
from models.optician import Optician
from models.manager import Manager
from models.expense import Expense, ExpenseOwnerType, ExpenseRecordedByType, ExpensePaymentMethod
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
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    search: str | None = None,
    active_only: bool = False
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
        is_approved=False,
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
    store_id: int,
    page: int = 1,
    page_size: int = 10,
    search: str | None = None,
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    is_approved: bool | None = None,
    payment_method: ExpensePaymentMethod | None = None,
    approval_status: str | None = None,
) -> dict:
    """List expenses with filter options, returning items and pagination metadata."""
    # Build base query with store filter first
    query = select(Expense).where(
        Expense.admin_id == admin_id,
        Expense.owner_type == ExpenseOwnerType.STORE,
        Expense.owner_id == store_id,
        Expense.deleted_at.is_(None),
    )

    # Apply all other filters to the SAME query object
    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    
    # Handle approval status filters
    if approval_status == 'PENDING':
        query = query.where(and_(Expense.is_approved == False, Expense.is_rejected == False))
    elif approval_status == 'APPROVED':
        query = query.where(Expense.is_approved == True)
    elif approval_status == 'REJECTED':
        query = query.where(Expense.is_rejected == True)
    elif is_approved is not None:
        query = query.where(Expense.is_approved == is_approved)

    if start_date is not None:
        query = query.where(Expense.expense_date >= start_date)
    if end_date is not None:
        query = query.where(Expense.expense_date <= end_date)
    
    if payment_method is not None:
        query = query.where(Expense.payment_method == payment_method)

    if search:
        query = query.where(
            or_(
                Expense.title.ilike(f"%{search}%"),
                Expense.description.ilike(f"%{search}%"),
            )
        )

    # COUNT uses the filtered query - FIXED to use subquery correctly
    count_stmt = select(func.count()).select_from(query.subquery())
    count_res = await db.execute(count_stmt)
    total = count_res.scalar() or 0

    # PAGINATE uses the same filtered query
    offset = (page - 1) * page_size
    items_stmt = query.order_by(Expense.expense_date.desc()).limit(page_size).offset(offset)
    items_res = await db.execute(items_stmt)
    items = list(items_res.scalars().all())

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": math.ceil(total / page_size) if total > 0 else 1,
    }


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
        expense.is_rejected = False
        expense.rejected_by = None
        expense.rejected_at = None
        expense.rejection_reason = None
    else:
        expense.approved_by = None
        expense.approved_at = None
    await db.commit()
    await db.refresh(expense)
    return expense


async def reject_expense(
    db: AsyncSession, expense: Expense, rejected_by_admin_id: int, reason: str | None = None
) -> Expense:
    expense.is_rejected = True
    expense.rejected_by = rejected_by_admin_id
    expense.rejected_at = datetime.now(timezone.utc)
    expense.rejection_reason = reason
    expense.is_approved = False
    expense.approved_by = None
    expense.approved_at = None
    await db.commit()
    await db.refresh(expense)
    return expense


async def soft_delete_expense(db: AsyncSession, expense: Expense) -> None:
    expense.deleted_at = datetime.now(timezone.utc)
    await db.commit()
