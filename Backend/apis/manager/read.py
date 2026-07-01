# API: manager/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from schemas.manager import ManagerRead
from schemas.pagination import PaginatedResponse
from services.store_service import get_store
from services.manager_service import get_manager, get_managers_by_store

router = APIRouter()


@router.get(
    "/{store_id}/managers",
    response_model=PaginatedResponse[ManagerRead],
    summary="List managers in a store",
    description="List all active managers for the specified store with pagination and filtering.",
)
async def list_managers(
    store_id: int,
    page: int = Query(default=1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size / limit"),
    search: str | None = Query(default=None, description="Search query matching manager name/email/phone/code"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
    paginate: bool = Query(default=True, description="Enable or disable pagination"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("managers", "read")),
) -> PaginatedResponse[ManagerRead]:
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
                detail="Access denied to this store's managers",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    managers, total = await get_managers_by_store(
        db,
        store_id=store_id,
        page=page,
        limit=limit,
        search=search,
        is_active=is_active,
        paginate=paginate,
    )
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[ManagerRead](
        items=[ManagerRead.model_validate(m) for m in managers],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get(
    "/managers/{manager_id}",
    response_model=ManagerRead,
    summary="Get a single manager",
    description="Fetch a single manager by ID.",
)
async def get_manager_endpoint(
    manager_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("managers", "read")),
) -> ManagerRead:
    manager = await get_manager(db, manager_id)
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )
    if isinstance(current_user, Admin):
        store = await get_store(db, manager.store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != manager.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this manager's details",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    return ManagerRead.model_validate(manager)
