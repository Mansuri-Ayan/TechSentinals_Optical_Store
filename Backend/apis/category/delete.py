# API: category/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
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
    current_admin: Admin = Depends(get_current_admin),
) -> CategoryRead:
    category = await get_category(db, category_id)
    if category is None or category.admin_id != current_admin.id:
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
    current_admin: Admin = Depends(get_current_admin),
) -> SubcategoryRead:
    subcategory = await get_subcategory(db, subcategory_id)
    if subcategory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    parent = await get_category(db, subcategory.category_id)
    if parent is None or parent.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    deleted = await delete_subcategory(db, subcategory)
    return SubcategoryRead.model_validate(deleted)
