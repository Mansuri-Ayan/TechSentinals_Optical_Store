# API: brand/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.brand import BrandCreate, BrandRead
from services.brand_service import create_brand

router = APIRouter()


@router.post(
    "/",
    response_model=BrandRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new brand",
)
async def create_brand_endpoint(
    payload: BrandCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> BrandRead:
    brand = await create_brand(db, admin_id=current_admin.id, payload=payload)
    return BrandRead.model_validate(brand)
