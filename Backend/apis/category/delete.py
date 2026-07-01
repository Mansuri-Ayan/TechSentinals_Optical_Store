# API: category/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.category import CategoryRead, SubcategoryRead
from services.category_service import (
    get_category, delete_category,
    get_subcategory, delete_subcategory,
)

router = APIRouter()


@router.delete(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Delete a category",
    description="Soft-delete a category by deactivating it.",
)
async def delete_category_endpoint(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('categories', 'delete')),
) -> CategoryRead:
    admin_id = get_user_admin_id(current_user)
    category = await get_category(db, category_id)
    if category is None or category.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    deleted = await delete_category(db, category)
    return CategoryRead(
        **{c.key: getattr(deleted, c.key) for c in deleted.__table__.columns},
        subcategories_count=len(deleted.subcategories) if deleted.subcategories else 0,
    )


@router.delete(
    "/subcategories/{subcategory_id}",
    response_model=SubcategoryRead,
    summary="Delete a subcategory",
    description="Soft-delete a subcategory by deactivating it.",
)
async def delete_subcategory_endpoint(
    subcategory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('categories', 'delete')),
) -> SubcategoryRead:
    admin_id = get_user_admin_id(current_user)
    subcategory = await get_subcategory(db, subcategory_id)
    if subcategory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    parent = await get_category(db, subcategory.category_id)
    if parent is None or parent.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    deleted = await delete_subcategory(db, subcategory)
    return SubcategoryRead.model_validate(deleted)
