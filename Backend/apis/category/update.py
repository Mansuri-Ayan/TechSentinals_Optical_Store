# API: category/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.category import (
    CategoryUpdate, CategoryRead,
    SubcategoryUpdate, SubcategoryRead,
)
from services.category_service import (
    get_category, update_category,
    get_subcategory, update_subcategory,
)

router = APIRouter()


@router.put(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Update a category",
)
async def update_category_endpoint(
    category_id: int,
    payload: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> CategoryRead:
    category = await get_category(db, category_id)
    if category is None or category.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    updated = await update_category(db, category, payload)
    return CategoryRead(
        **{c.key: getattr(updated, c.key) for c in updated.__table__.columns},
        subcategories_count=len(updated.subcategories) if updated.subcategories else 0,
    )


@router.put(
    "/subcategories/{subcategory_id}",
    response_model=SubcategoryRead,
    summary="Update a subcategory",
)
async def update_subcategory_endpoint(
    subcategory_id: int,
    payload: SubcategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SubcategoryRead:
    subcategory = await get_subcategory(db, subcategory_id)
    if subcategory is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    # Verify ownership via parent category
    parent = await get_category(db, subcategory.category_id)
    if parent is None or parent.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subcategory not found",
        )
    updated = await update_subcategory(db, subcategory, payload)
    return SubcategoryRead.model_validate(updated)
