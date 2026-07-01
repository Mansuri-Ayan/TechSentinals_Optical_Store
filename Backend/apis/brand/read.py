# API: brand/read.py
import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandRead
from services.brand_service import get_brand, get_brands_by_admin

router = APIRouter()


@router.get(
    "/",
    summary="List all brands",
)
async def list_brands(
    active_status: str | None = Query(None, description="active, inactive, or None/all"),
    search: str | None = Query(None),
    store_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    paginate: bool = Query(True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'read')),
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

    items, total, active_cnt, inactive_cnt = await get_brands_by_admin(
        db,
        admin_id=admin_id,
        active_status=active_status,
        search=search,
        store_id=numeric_store_id,
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


@router.get(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Get a single brand",
)
async def get_brand_endpoint(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('brands', 'read')),
) -> BrandRead:
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = current_user.store.admin_id

    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    return BrandRead.model_validate(brand)
