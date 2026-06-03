# API: category/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.category import CategoryRead, SubcategoryRead
from services.category_service import (
    get_category, get_categories_by_admin, get_subcategories_by_category,
)

router = APIRouter()


@router.get(
    "/",
    response_model=list[CategoryRead],
    summary="List all categories",
    description="List all categories for the authenticated admin.",
)
async def list_categories(
    active_only: bool = Query(False, description="Only return active categories"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[CategoryRead]:
    categories = await get_categories_by_admin(
        db, admin_id=current_admin.id, active_only=active_only,
    )
    return [
        CategoryRead(
            **{c.key: getattr(cat, c.key) for c in cat.__table__.columns},
            subcategories_count=len(cat.subcategories) if cat.subcategories else 0,
        )
        for cat in categories
    ]


@router.get(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Get a single category",
    description="Fetch a category by ID with subcategory count.",
)
async def get_category_endpoint(
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
    return CategoryRead(
        **{c.key: getattr(category, c.key) for c in category.__table__.columns},
        subcategories_count=len(category.subcategories) if category.subcategories else 0,
    )


@router.get(
    "/{category_id}/subcategories",
    response_model=list[SubcategoryRead],
    summary="List subcategories",
    description="List all subcategories under a category.",
)
async def list_subcategories(
    category_id: int,
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[SubcategoryRead]:
    # Verify ownership
    category = await get_category(db, category_id)
    if category is None or category.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )
    subs = await get_subcategories_by_category(
        db, category_id=category_id, active_only=active_only,
    )
    return [SubcategoryRead.model_validate(s) for s in subs]
