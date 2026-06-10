# API: category/read.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.category import CategoryRead, SubcategoryRead
from services.category_service import (
    get_category, get_categories_by_admin, get_subcategories_by_category,
)

router = APIRouter()


@router.get(
    "/",
    summary="List all categories",
    description="List all categories for the authenticated admin.",
)
async def list_categories(
    active_only: bool = Query(False, description="Only return active categories"),
    search: str | None = Query(None),
    store_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        store_id = current_user.store_id

    items, total = await get_categories_by_admin(
        db,
        admin_id=admin_id,
        active_only=active_only,
        search=search,
        store_id=store_id,
        page=page,
        limit=limit,
        paginate=paginate,
    )

    validated = [CategoryRead.model_validate(item) for item in items]

    if not paginate:
        return validated

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
    }


@router.get(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Get a single category",
    description="Fetch a category by ID with subcategory count.",
)
async def get_category_endpoint(
    category_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> CategoryRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

    category = await get_category(db, category_id)
    if category is None or category.admin_id != admin_id:
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
    summary="List subcategories",
    description="List all subcategories under a category.",
)
async def list_subcategories(
    category_id: int,
    active_only: bool = Query(False),
    search: str | None = Query(None),
    store_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
        store_id = current_user.store_id

    # Verify ownership
    category = await get_category(db, category_id)
    if category is None or category.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found",
        )

    items, total = await get_subcategories_by_category(
        db,
        category_id=category_id,
        active_only=active_only,
        search=search,
        store_id=store_id,
        page=page,
        limit=limit,
        paginate=paginate,
    )

    validated = [SubcategoryRead.model_validate(item) for item in items]

    if not paginate:
        return validated

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
    }
