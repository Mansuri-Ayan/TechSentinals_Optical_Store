# API: expense/categories.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_admin, get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.expense_category import (
    ExpenseCategoryCreate,
    ExpenseCategoryUpdate,
    ExpenseCategoryRead,
)
from services.expense_service import (
    create_expense_category,
    get_expense_category,
    list_expense_categories,
    update_expense_category,
    delete_expense_category,
)

router = APIRouter()


# Helper to convert user model to admin_id
def _get_user_admin_id(user) -> int:
    # Admin has .id directly
    if isinstance(user, Admin):
        return user.id
    # Other staff (Manager, Worker, Optician) have .store, and store has .admin_id
    if hasattr(user, "store") and user.store:
        return user.store.admin_id
    # Fallback to model fields
    if hasattr(user, "admin_id"):
        return user.admin_id
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not determine admin scoping for user",
    )


@router.post(
    "/",
    response_model=ExpenseCategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new expense category",
)
async def create_category_endpoint(
    payload: ExpenseCategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ExpenseCategoryRead:
    category = await create_expense_category(db, admin_id=current_admin.id, payload=payload)
    return ExpenseCategoryRead.model_validate(category)


@router.get(
    "/",
    response_model=list[ExpenseCategoryRead],
    summary="List all expense categories",
)
async def list_categories_endpoint(
    store_id: str | None = Query(None, description="Filter categories by store"),
    search: str | None = Query(None),
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> list[ExpenseCategoryRead]:
    admin_id = _get_user_admin_id(current_user)
    
    store_id_int = None
    if store_id and store_id.lower() != "admin":
        try:
            store_id_int = int(store_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid store ID format",
            )
            
    # Optional: verify store_id belongs to admin_id if provided
    # For now, we just pass it to the service which uses admin_id for scoping
    categories = await list_expense_categories(
        db, admin_id=admin_id, store_id=store_id_int, search=search, active_only=active_only
    )
    return [ExpenseCategoryRead.model_validate(c) for c in categories]


@router.get(
    "/{category_id}",
    response_model=ExpenseCategoryRead,
    summary="Get single expense category by ID",
)
async def get_category_endpoint(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
) -> ExpenseCategoryRead:
    admin_id = _get_user_admin_id(current_user)
    category = await get_expense_category(db, category_id)
    if not category or category.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found",
        )
    return ExpenseCategoryRead.model_validate(category)


@router.put(
    "/{category_id}",
    response_model=ExpenseCategoryRead,
    summary="Update an expense category",
)
async def update_category_endpoint(
    category_id: int,
    payload: ExpenseCategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ExpenseCategoryRead:
    category = await get_expense_category(db, category_id)
    if not category or category.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found",
        )
    updated = await update_expense_category(db, category, payload)
    return ExpenseCategoryRead.model_validate(updated)


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense category",
)
async def delete_category_endpoint(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> None:
    category = await get_expense_category(db, category_id)
    if not category or category.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found",
        )
    success = await delete_expense_category(db, category)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category: it is currently linked to one or more expense records.",
        )
