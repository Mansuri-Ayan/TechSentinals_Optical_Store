# API: brand/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandUpdate, BrandRead
from services.brand_service import get_brand, update_brand

router = APIRouter()


@router.put(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Update a brand",
)
async def update_brand_endpoint(
    brand_id: int,
    payload: BrandUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> BrandRead:
    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    updated = await update_brand(db, brand, payload)
    return BrandRead.model_validate(updated)
