# API: manager/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.manager import ManagerRead, ManagerUpdate
from services.store_service import get_store
from services.manager_service import get_manager, update_manager

router = APIRouter()


@router.put(
    "/managers/{manager_id}",
    response_model=ManagerRead,
    summary="Update a manager",
    description="Update fields on a manager.",
)
async def update_manager_endpoint(
    manager_id: int,
    payload: ManagerUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ManagerRead:
    manager = await get_manager(db, manager_id)
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )
    store = await get_store(db, manager.store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )
    updated = await update_manager(db, manager, payload)
    return ManagerRead.model_validate(updated)
