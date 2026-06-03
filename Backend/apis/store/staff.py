# API: store/staff.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.staff import StaffRead
from schemas.pagination import PaginatedResponse
from services.store_service import get_store
from services.staff_service import get_staff_by_store

router = APIRouter()

@router.get(
    "/{store_id}/staff",
    response_model=PaginatedResponse[StaffRead],
    summary="List all staff in a store",
    description="List all staff members (managers, workers, opticians) in a store with pagination and filtering.",
)
async def list_store_staff(
    store_id: int,
    page: int = Query(default=1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size / limit"),
    search: str | None = Query(default=None, description="Search query matching staff name/email/phone/code"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
    role: str | None = Query(default=None, description="Filter by role: 'manager', 'worker', 'optician'"),
    paginate: bool = Query(default=True, description="Enable or disable pagination"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[StaffRead]:
    # Verify the store exists and belongs to the admin
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
        
    staff_items, total = await get_staff_by_store(
        db,
        store_id=store_id,
        page=page,
        limit=limit,
        search=search,
        is_active=is_active,
        role=role,
        paginate=paginate,
    )
    
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[StaffRead](
        items=[StaffRead.model_validate(item) for item in staff_items],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )
