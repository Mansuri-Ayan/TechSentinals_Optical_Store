# API: brand/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandRead
from services.brand_service import get_brand, delete_brand

router = APIRouter()


@router.delete(
    "/{brand_id}",
    response_model=BrandRead,
    summary="Delete a brand",
    description="Soft-delete a brand by deactivating it.",
)
async def delete_brand_endpoint(
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
    deleted = await delete_brand(db, brand)
    return BrandRead.model_validate(deleted)
