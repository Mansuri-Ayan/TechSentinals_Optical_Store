# API: store/read.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.store import StoreRead
from services.store_service import get_store, get_stores_by_admin

router = APIRouter()


@router.get(
    "/",
    response_model=list[StoreRead],
    summary="List all stores",
    description="List all stores owned by the currently authenticated admin.",
)
async def list_stores(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[StoreRead]:
    stores = await get_stores_by_admin(db, admin_id=current_admin.id)
    return [StoreRead.model_validate(s) for s in stores]


@router.get(
    "/{store_id}",
    response_model=StoreRead,
    summary="Get a single store",
    description="Fetch a single store by its ID (must belong to the admin).",
)
async def get_store_endpoint(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StoreRead:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    return StoreRead.model_validate(store)
