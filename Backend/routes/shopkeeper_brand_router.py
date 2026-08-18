# Routes: shopkeeper_brand_router.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user, require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandCreate, BrandUpdate, BrandRead
from services.brand_service import get_brand, get_brands_by_admin, create_brand, update_brand, delete_brand

shopkeeper_brand_router = APIRouter(
    prefix="/shopkeeper/brands",
    tags=["Shopkeeper Brands"],
)

@shopkeeper_brand_router.get(
    "/",
    summary="List all brands for shopkeeper",
)
async def list_brands(
    active_status: str | None = Query(None, description="active, inactive, or None/all"),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'read')),
):
    admin_id = get_user_admin_id(current_user)
    store_id = None if isinstance(current_user, Admin) else getattr(current_user, "store_id", None)

    items, total, active_cnt, inactive_cnt = await get_brands_by_admin(
        db,
        admin_id=admin_id,
        active_status=active_status,
        search=search,
        store_id=store_id,
        page=page,
        limit=limit,
        paginate=paginate,
    )

    validated = [BrandRead.model_validate(item) for item in items]

    if not paginate:
        return validated

    return {
        "items": validated,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total / limit) if limit else 1,
        "active_count": active_cnt,
        "inactive_count": inactive_cnt,
    }

@shopkeeper_brand_router.get(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Get a single brand",
)
async def get_brand_endpoint(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'read')),
) -> BrandRead:
    admin_id = get_user_admin_id(current_user)

    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    return BrandRead.model_validate(brand)

@shopkeeper_brand_router.post(
    "/",
    response_model=BrandRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new brand",
)
async def create_brand_endpoint(
    payload: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'create')),
) -> BrandRead:
    admin_id = get_user_admin_id(current_user)
    if not isinstance(current_user, Admin):
        payload.store_id = current_user.store_id
    brand = await create_brand(db, admin_id=admin_id, payload=payload)
    return BrandRead.model_validate(brand)

@shopkeeper_brand_router.put(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Update a brand",
)
async def update_brand_endpoint(
    brand_id: int,
    payload: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'update')),
) -> BrandRead:
    admin_id = get_user_admin_id(current_user)

    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    store_id = None if isinstance(current_user, Admin) else getattr(current_user, "store_id", None)
    updated = await update_brand(db, brand, payload, store_id=store_id)
    return BrandRead.model_validate(updated)

@shopkeeper_brand_router.delete(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Delete a brand",
)
async def delete_brand_endpoint(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'delete')),
) -> BrandRead:
    admin_id = get_user_admin_id(current_user)

    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    store_id = None if isinstance(current_user, Admin) else getattr(current_user, "store_id", None)
    deleted = await delete_brand(db, brand, store_id=store_id)
    return BrandRead.model_validate(deleted)
