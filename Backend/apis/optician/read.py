# API: optician/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.optician import OpticianRead
from schemas.pagination import PaginatedResponse
from services.store_service import get_store
from services.optician_service import get_optician, get_opticians_by_store

router = APIRouter()


@router.get(
    "/{store_id}/opticians",
    response_model=PaginatedResponse[OpticianRead],
    summary="List opticians in a store",
    description="List all active opticians for the specified store with pagination and filtering.",
)
async def list_opticians(
    store_id: int,
    page: int = Query(default=1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size / limit"),
    search: str | None = Query(default=None, description="Search query matching optician name/email/phone/code"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
    paginate: bool = Query(default=True, description="Enable or disable pagination"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[OpticianRead]:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    opticians, total = await get_opticians_by_store(
        db,
        store_id=store_id,
        page=page,
        limit=limit,
        search=search,
        is_active=is_active,
        paginate=paginate,
    )
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[OpticianRead](
        items=[OpticianRead.model_validate(o) for o in opticians],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


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
