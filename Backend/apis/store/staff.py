# API: store/staff.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
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
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=10, ge=1, le=100, alias="limit", description="Page size"),
    search: str | None = Query(default=None, description="Search query matching staff name/email/phone/code"),
    status: str | None = Query(default=None, description="Filter by status: ACTIVE/INACTIVE"),
    role: str | None = Query(default=None, description="Filter by role: MANAGER/WORKER/OPTICIAN"),
    paginate: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> PaginatedResponse[StaffRead]:
    # Check permissions
    if isinstance(current_user, Admin):
        store = await get_store(db, store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's staff directory",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
        
    is_active = None
    if status:
        is_active = status.upper() == "ACTIVE"
        
    staff_items, total = await get_staff_by_store(
        db,
        store_id=store_id,
        page=page,
        limit=page_size,
        search=search,
        is_active=is_active,
        role=role.upper() if role and role.lower() != "all" else None,
        paginate=paginate,
    )
    
    pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PaginatedResponse[StaffRead](
        items=[StaffRead.model_validate(item) for item in staff_items],
        total=total,
        page=page,
        pages=pages,
        limit=page_size,
    )
