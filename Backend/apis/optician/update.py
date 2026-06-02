# API: optician/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.optician import OpticianRead, OpticianUpdate
from services.store_service import get_store
from services.optician_service import get_optician, update_optician

router = APIRouter()


@router.put(
    "/opticians/{optician_id}",
    response_model=OpticianRead,
    summary="Update an optician",
    description="Update fields on an optician.",
)
async def update_optician_endpoint(
    optician_id: int,
    payload: OpticianUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> OpticianRead:
    optician = await get_optician(db, optician_id)
    if optician is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optician not found",
        )
    store = await get_store(db, optician.store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optician not found",
        )
    updated = await update_optician(db, optician, payload)
    return OpticianRead.model_validate(updated)
