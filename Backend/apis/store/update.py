# API: store/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.store import StoreRead, StoreUpdate
from services.store_service import get_store, update_store

router = APIRouter()


@router.put(
    "/{store_id}",
    response_model=StoreRead,
    summary="Update a store",
    description="Update fields on a store owned by the current admin.",
)
async def update_store_endpoint(
    store_id: int,
    payload: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('stores', 'update')),
) -> StoreRead:
    admin_id = get_user_admin_id(current_user)
    store = await get_store(db, store_id)
    if store is None or store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    updated = await update_store(db, store, payload)
    return StoreRead.model_validate(updated)
