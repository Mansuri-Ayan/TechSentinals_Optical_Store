# API: brand/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandRead
from services.brand_service import get_brand, get_brands_by_admin

router = APIRouter()


@router.get(
    "/",
    response_model=list[BrandRead],
    summary="List all brands",
)
async def list_brands(
    active_only: bool = Query(False),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[BrandRead]:
    brands = await get_brands_by_admin(
        db, admin_id=current_admin.id, active_only=active_only,
    )
    return [BrandRead.model_validate(b) for b in brands]


@router.get(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Get a single brand",
)
async def get_brand_endpoint(
    brand_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> BrandRead:
    brand = await get_brand(db, brand_id)
    if brand is None or brand.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found",
        )
    return BrandRead.model_validate(brand)
