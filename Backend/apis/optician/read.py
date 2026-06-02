# API: optician/read.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.optician import OpticianRead
from services.store_service import get_store
from services.optician_service import get_optician, get_opticians_by_store

router = APIRouter()


@router.get(
    "/{store_id}/opticians",
    response_model=list[OpticianRead],
    summary="List opticians in a store",
    description="List all active opticians for the specified store.",
)
async def list_opticians(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[OpticianRead]:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    opticians = await get_opticians_by_store(db, store_id=store_id)
    return [OpticianRead.model_validate(o) for o in opticians]


@router.get(
    "/opticians/{optician_id}",
    response_model=OpticianRead,
    summary="Get a single optician",
    description="Fetch a single optician by ID.",
)
async def get_optician_endpoint(
    optician_id: int,
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
    return OpticianRead.model_validate(optician)
