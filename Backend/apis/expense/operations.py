# API: expense/operations.py
import math
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_admin, get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.expense import ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseApprove, ExpenseRead
from services.expense_service import (
    create_expense,
    get_expense,
    list_expenses,
    update_expense,
    approve_expense,
    soft_delete_expense,
    get_staff_name,
    get_owner_name,
)

router = APIRouter()


def _get_user_admin_id(user) -> int:
    if isinstance(user, Admin):
        return user.id
    if hasattr(user, "store") and user.store:
        return user.store.admin_id
    if hasattr(user, "admin_id"):
        return user.admin_id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not determine admin scoping for user",
    )


def _get_user_recorded_by(user) -> tuple[ExpenseRecordedByType, int]:
    if isinstance(user, Admin):
        return ExpenseRecordedByType.ADMIN, user.id
    if isinstance(user, Manager):
        return ExpenseRecordedByType.MANAGER, user.id
    if isinstance(user, Worker):
        return ExpenseRecordedByType.WORKER, user.id
    if isinstance(user, Optician):
        return ExpenseRecordedByType.OPTICIAN, user.id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid user type for logging expense",
    )


async def _resolve_expense_names(db: AsyncSession, p) -> ExpenseRead:
    read_data = ExpenseRead.model_validate(p)
    read_data.category_name = p.category.name if p.category else None
    read_data.owner_name = await get_owner_name(db, p.owner_type.value, p.owner_id)
    read_data.recorded_by_name = await get_staff_name(db, p.recorded_by_type.value, p.recorded_by_id)
    if p.incurred_by_type and p.incurred_by_id:
        read_data.incurred_by_name = await get_staff_name(db, p.incurred_by_type.value, p.incurred_by_id)
    return read_data


@router.post(
    "/",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense",
)
async def create_expense_endpoint(
    payload: ExpenseCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    rec_type, rec_id = _get_user_recorded_by(current_user)

    # If user is not Admin and wants to record a STORE expense, enforce it is their own store
    if not isinstance(current_user, Admin):
        if payload.owner_type == ExpenseOwnerType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non-admin staff members cannot record head-office/ADMIN expenses.",
            )
        # Store verification
        user_store_id = current_user.store_id
        if payload.owner_id != user_store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only record expenses for your own assigned store.",
            )

    expense = await create_expense(
        db,
        admin_id=admin_id,
        recorded_by_type=rec_type,
        recorded_by_id=rec_id,
        payload=payload,
    )
    return await _resolve_expense_names(db, expense)


@router.get(
    "/",
    summary="List all expenses",
)
async def list_expenses_endpoint(
    owner_type: ExpenseOwnerType | None = Query(None),
    owner_id: int | None = Query(None),
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    is_approved: bool | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    admin_id = _get_user_admin_id(current_user)

    # Scoping: if user is not Admin, restrict queries to their store
    if not isinstance(current_user, Admin):
        owner_type = ExpenseOwnerType.STORE
        owner_id = current_user.store_id

    offset = (page - 1) * limit
    items, total = await list_expenses(
        db,
        admin_id=admin_id,
        owner_type=owner_type,
        owner_id=owner_id,
        category_id=category_id,
        search=search,
        is_approved=is_approved,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )

    validated = [await _resolve_expense_names(db, item) for item in items]

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
    }


@router.get(
    "/{expense_id}",
    response_model=ExpenseRead,
    summary="Get single expense by ID",
)
async def get_expense_endpoint(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )

    # Scoping: non-admin can only see their own store's expenses
    if not isinstance(current_user, Admin):
        if expense.owner_type != ExpenseOwnerType.STORE or expense.owner_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's expense records.",
            )

    return await _resolve_expense_names(db, expense)


@router.put(
    "/{expense_id}",
    response_model=ExpenseRead,
    summary="Update an expense",
)
async def update_expense_endpoint(
    expense_id: int,
    payload: ExpenseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )

    # Non-admin scoping
    if not isinstance(current_user, Admin):
        if expense.owner_type != ExpenseOwnerType.STORE or expense.owner_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's expense records.",
            )
        # Block updates if expense is already approved (unless Admin)
        if expense.is_approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit an expense that has already been approved.",
            )

    updated = await update_expense(db, expense, payload)
    return await _resolve_expense_names(db, updated)


@router.put(
    "/{expense_id}/approve",
    response_model=ExpenseRead,
    summary="Approve or reject an expense",
)
async def approve_expense_endpoint(
    expense_id: int,
    payload: ExpenseApprove,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ExpenseRead:
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )
    updated = await approve_expense(db, expense, current_admin.id, payload.is_approved)
    return await _resolve_expense_names(db, updated)


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete an expense",
)
async def delete_expense_endpoint(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )
    await soft_delete_expense(db, expense)
