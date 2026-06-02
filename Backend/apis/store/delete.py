# API: store/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from services.store_service import delete_store, get_store

router = APIRouter()


@router.delete(
    "/{store_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a store",
    description="Soft-delete a store owned by the current admin.",
)
async def delete_store_endpoint(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    await delete_store(db, store)
    return {"message": f"Store '{store.store_name}' has been deleted"}
