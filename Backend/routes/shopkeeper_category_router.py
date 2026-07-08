# Routes: shopkeeper_category_router.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from schemas.category import (
    CategoryCreate, CategoryUpdate, CategoryRead,
    SubcategoryCreate, SubcategoryUpdate, SubcategoryRead,
)
from services.category_service import (
    get_category, get_categories_by_admin, create_category, update_category, delete_category,
    get_subcategory, get_subcategories_by_category, create_subcategory, update_subcategory, delete_subcategory,
)

shopkeeper_category_router = APIRouter(
    prefix="/shopkeeper/categories",
    tags=["Shopkeeper Categories"],
)

@shopkeeper_category_router.get(
    "/",
    summary="List all categories for shopkeeper",
)
async def list_categories(
    active_only: bool = Query(False, description="Only return active categories"),
    search: str | None = Query(None),
    all_tenant: bool = Query(False, description="If true, bypasses store-specific inventory filtering"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        store_id = None
    else:
        admin_id = current_user.store.admin_id
        store_id = None if all_tenant else current_user.store_id

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

@shopkeeper_category_router.get(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Get a single category",
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

@shopkeeper_category_router.post(
    "/",
    response_model=CategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new category",
)
async def create_category_endpoint(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> CategoryRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id
    category = await create_category(db, admin_id=admin_id, payload=payload)
    return CategoryRead(
        **{c.key: getattr(category, c.key) for c in category.__table__.columns},
        subcategories_count=len(category.subcategories) if category.subcategories else 0,
    )

@shopkeeper_category_router.put(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Update a category",
)
async def update_category_endpoint(
    category_id: int,
    payload: CategoryUpdate,
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
    updated = await update_category(db, category, payload)
    return CategoryRead(
        **{c.key: getattr(updated, c.key) for c in updated.__table__.columns},
        subcategories_count=len(updated.subcategories) if updated.subcategories else 0,
    )

@shopkeeper_category_router.delete(
    "/{category_id}",
    response_model=CategoryRead,
    summary="Delete a category",
)
async def delete_category_endpoint(
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
    deleted = await delete_category(db, category)
    return CategoryRead(
        **{c.key: getattr(deleted, c.key) for c in deleted.__table__.columns},
        subcategories_count=len(deleted.subcategories) if deleted.subcategories else 0,
    )

@shopkeeper_category_router.get(
    "/{category_id}/subcategories",
    summary="List subcategories",
)
async def list_subcategories(
    category_id: int,
    active_only: bool = Query(False),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        store_id = None
    else:
        admin_id = current_user.store.admin_id
        store_id = current_user.store_id

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

@shopkeeper_category_router.post(
    "/{category_id}/subcategories",
    response_model=SubcategoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a subcategory",
)
async def create_subcategory_endpoint(
    category_id: int,
    payload: SubcategoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> SubcategoryRead:
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
    subcategory = await create_subcategory(db, category_id=category_id, payload=payload)
    return SubcategoryRead.model_validate(subcategory)

@shopkeeper_category_router.put(
    "/subcategories/{subcategory_id}",
    response_model=SubcategoryRead,
    summary="Update a subcategory",
)
async def update_subcategory_endpoint(
    subcategory_id: int,
    payload: SubcategoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> SubcategoryRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

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
    updated = await update_subcategory(db, subcategory, payload)
    return SubcategoryRead.model_validate(updated)

@shopkeeper_category_router.delete(
    "/subcategories/{subcategory_id}",
    response_model=SubcategoryRead,
    summary="Delete a subcategory",
)
async def delete_subcategory_endpoint(
    subcategory_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> SubcategoryRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

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
