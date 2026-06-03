# API: category/create.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.category import (
    CategoryCreate, CategoryRead,
    SubcategoryCreate, SubcategoryRead,
)
from services.category_service import (
    create_category, get_category, create_subcategory,
)

router = APIRouter()


@router.post(
    "/",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category",
    description="Create a new product category under the authenticated admin.",
)
async def create_category_endpoint(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> CategoryRead:
    category = await create_category(db, admin_id=current_admin.id, payload=payload)
    return CategoryRead(
        **{c.key: getattr(category, c.key) for c in category.__table__.columns},
        subcategories_count=len(category.subcategories) if category.subcategories else 0,
    )


@router.post(
    "/{category_id}/subcategories",
    response_model=SubcategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a subcategory",
    description="Create a subcategory under the given category.",
)
async def create_subcategory_endpoint(
    category_id: int,
    payload: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> SubcategoryRead:
    # Verify category belongs to admin
    category = await get_category(db, category_id)
    if category is None or category.admin_id != current_admin.id:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    subcategory = await create_subcategory(db, category_id=category_id, payload=payload)
    return SubcategoryRead.model_validate(subcategory)
