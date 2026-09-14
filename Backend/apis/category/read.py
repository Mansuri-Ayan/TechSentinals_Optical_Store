# API: category/read.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
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
    store_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('categories', 'read')),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        numeric_store_id = None
        if store_id and store_id.lower() != "admin":
            try:
                numeric_store_id = int(store_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid store_id format")
    else:
        admin_id = current_user.store.admin_id
        numeric_store_id = current_user.store_id

    items, total = await get_categories_by_admin(
        db,
        admin_id=admin_id,
        active_only=active_only,
        search=search,
        store_id=numeric_store_id,
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
    current_user = Depends(require_permission('categories', 'read')),
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
    
    from sqlalchemy import select, func, or_, and_
    from models.subcategory import Subcategory
    from models.store_subcategory_override import StoreSubcategoryOverride
    
    sub_stmt = select(func.count(Subcategory.id)).where(
        Subcategory.category_id == category_id
    )
    if not isinstance(current_user, Admin):
        sub_stmt = sub_stmt.outerjoin(
            StoreSubcategoryOverride,
            and_(
                StoreSubcategoryOverride.subcategory_id == Subcategory.id,
                StoreSubcategoryOverride.store_id == current_user.store_id
            )
        ).where(
            or_(Subcategory.store_id == current_user.store_id, Subcategory.store_id.is_(None)),
            func.coalesce(StoreSubcategoryOverride.is_active, Subcategory.is_active).is_(True)
        )
    else:
        sub_stmt = sub_stmt.where(
            Subcategory.is_active.is_(True)
        )
    subcategories_count = (await db.execute(sub_stmt)).scalar() or 0

    return CategoryRead(
        **{c.key: getattr(category, c.key) for c in category.__table__.columns},
        subcategories_count=subcategories_count,
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
    store_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('categories', 'read')),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        numeric_store_id = None
        if store_id and store_id.lower() != "admin":
            try:
                numeric_store_id = int(store_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid store_id format")
    else:
        admin_id = current_user.store.admin_id
        numeric_store_id = current_user.store_id

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
        store_id=numeric_store_id,
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
