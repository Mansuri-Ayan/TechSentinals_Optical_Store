# API: manager/read.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.manager import ManagerRead
from services.store_service import get_store
from services.manager_service import get_manager, get_managers_by_store

router = APIRouter()


@router.get(
    "/{store_id}/managers",
    response_model=list[ManagerRead],
    summary="List managers in a store",
    description="List all active managers for the specified store.",
)
async def list_managers(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[ManagerRead]:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    managers = await get_managers_by_store(db, store_id=store_id)
    return [ManagerRead.model_validate(m) for m in managers]


@router.get(
    "/managers/{manager_id}",
    response_model=ManagerRead,
    summary="Get a single manager",
    description="Fetch a single manager by ID.",
)
async def get_manager_endpoint(
    manager_id: int,
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
    return ManagerRead.model_validate(manager)
