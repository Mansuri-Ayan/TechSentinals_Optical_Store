# API: expense/operations.py
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import require_permission, get_user_admin_id, get_current_admin, require_permission
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from models.worker import Worker
from models.optician import Optician
from models.expense import ExpenseOwnerType, ExpenseRecordedByType, ExpensePaymentMethod
from schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseApprove, ExpenseReject, ExpenseRead, PaginatedExpenseResponse
from services.expense_service import (
    create_expense,
    get_expense,
    list_expenses,
    update_expense,
    approve_expense,
    reject_expense,
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
    
    # Resolve approval name if approved
    if p.is_approved and p.approved_by:
        read_data.approved_by_name = await get_staff_name(db, "ADMIN", p.approved_by)
    
    # Resolve rejection name if rejected
    if p.is_rejected and p.rejected_by:
        read_data.rejected_by_name = await get_staff_name(db, "ADMIN", p.rejected_by)
        
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
    current_user=Depends(require_permission("expenses", "create")),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    rec_type, rec_id = _get_user_recorded_by(current_user)

    if not isinstance(current_user, Admin):
        if payload.owner_type == ExpenseOwnerType.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Non-admin staff members cannot record head-office/ADMIN expenses.",
            )
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
    response_model=PaginatedExpenseResponse,
    summary="List all expenses",
)
async def list_expenses_endpoint(
    store_id: str = Query(..., description="The store ID to filter by (or 'admin' for warehouse)"),
    category_id: int | None = Query(None),
    search: str | None = Query(None),
    is_approved: bool | None = Query(None),
    approval_status: str | None = Query(None, description="Approval status filter: PENDING | APPROVED"),
    payment_method: ExpensePaymentMethod | None = Query(None, description="Payment method filter"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("expenses", "read")),
):
    admin_id = _get_user_admin_id(current_user)

    store_id_int = None
    if store_id.lower() != "admin":
        try:
            store_id_int = int(store_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid store ID format",
            )

    if not isinstance(current_user, Admin):
        if store_id_int is None or store_id_int != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's expense records.",
            )

    result = await list_expenses(
        db,
        admin_id=admin_id,
        store_id=store_id,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        is_approved=is_approved,
        approval_status=approval_status,
        payment_method=payment_method,
        start_date=start_date,
        end_date=end_date,
    )

    items = result["items"]
    validated = [await _resolve_expense_names(db, item) for item in items]

    return {
        "items": validated,
        "total": result["total"],
        "page": result["page"],
        "page_size": result["page_size"],
        "pages": result["pages"],
    }


@router.get(
    "/{expense_id}",
    response_model=ExpenseRead,
    summary="Get single expense by ID",
)
async def get_expense_endpoint(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("expenses", "read")),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )

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
    current_user=Depends(require_permission("expenses", "update")),
) -> ExpenseRead:
    admin_id = _get_user_admin_id(current_user)
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )

    if not isinstance(current_user, Admin):
        if expense.owner_type != ExpenseOwnerType.STORE or expense.owner_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's expense records.",
            )
        if expense.is_approved:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot edit an expense that has already been approved.",
            )

    updated = await update_expense(db, expense, payload)
    return await _resolve_expense_names(db, updated)


@router.patch(
    "/{expense_id}/approve",
    response_model=ExpenseRead,
    summary="Approve an expense",
)
@router.put(
    "/{expense_id}/approve",
    response_model=ExpenseRead,
    include_in_schema=False,
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


@router.patch(
    "/{expense_id}/reject",
    response_model=ExpenseRead,
    summary="Reject an expense",
)
@router.put(
    "/{expense_id}/reject",
    response_model=ExpenseRead,
    include_in_schema=False,
)
async def reject_expense_endpoint(
    expense_id: int,
    payload: ExpenseReject,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ExpenseRead:
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )
    updated = await reject_expense(db, expense, current_admin.id, payload.reason)
    return await _resolve_expense_names(db, updated)


@router.delete(
    "/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete an expense",
)
async def delete_expense_endpoint(
    expense_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("expenses", "delete")),
) -> None:
    admin_id = _get_user_admin_id(current_user)
    expense = await get_expense(db, expense_id)
    if not expense or expense.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense record not found",
        )
    if not isinstance(current_user, Admin):
        if expense.owner_type != ExpenseOwnerType.STORE or expense.owner_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's expense records.",
            )
    await soft_delete_expense(db, expense)
