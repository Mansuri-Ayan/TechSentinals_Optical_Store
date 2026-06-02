# API: manager/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.manager import ManagerCreate, ManagerRead
from services.store_service import get_store
from services.manager_service import create_manager

router = APIRouter()


@router.post(
    "/{store_id}/managers",
    response_model=ManagerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a manager to a store",
    description="Create a new manager assigned to the specified store.",
)
async def create_manager_endpoint(
    store_id: int,
    payload: ManagerCreate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> ManagerRead:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    try:
        manager = await create_manager(db, store_id=store_id, payload=payload)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Manager with this email, phone, or employee_code already exists",
            )
        raise
    return ManagerRead.model_validate(manager)
