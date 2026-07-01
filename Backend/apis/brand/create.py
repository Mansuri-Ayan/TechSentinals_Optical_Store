# API: brand/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
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
    current_user = Depends(require_permission('brands', 'create')),
) -> BrandRead:
    admin_id = get_user_admin_id(current_user)
    brand = await create_brand(db, admin_id=admin_id, payload=payload)
    return BrandRead.model_validate(brand)
