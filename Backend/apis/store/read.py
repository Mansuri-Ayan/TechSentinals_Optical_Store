# API: store/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.store import StoreRead
from schemas.pagination import PaginatedResponse
from services.store_service import get_store, get_stores_by_admin

router = APIRouter()


@router.get(
    "/",
    response_model=PaginatedResponse[StoreRead],
    summary="List all stores",
    description="List all stores owned by the currently authenticated admin with pagination and filtering.",
)
async def list_stores(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=10, ge=1, le=100, alias="limit", description="Page size"),
    search: str | None = Query(default=None, description="Search query matching store name/code/city"),
    status: str | None = Query(default=None, description="Filter by status: ACTIVE/INACTIVE"),
    state: str | None = Query(default=None, description="Filter by state name"),
    paginate: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> PaginatedResponse[StoreRead]:
    is_active = None
    if status:
        is_active = status.upper() == "ACTIVE"
        
    stores, total = await get_stores_by_admin(
        db,
        admin_id=current_admin.id,
        page=page,
        limit=page_size,
        search=search,
        state=state,
        is_active=is_active,
        paginate=paginate,
    )
    pages = (total + page_size - 1) // page_size if page_size > 0 else 1
    return PaginatedResponse[StoreRead](
        items=[StoreRead.model_validate(s) for s in stores],
        total=total,
        page=page,
        pages=pages,
        limit=page_size,
    )


@router.get(
    "/{store_id}",
    response_model=StoreRead,
    summary="Get a single store",
    description="Fetch a single store by its ID (must belong to the admin).",
)
async def get_store_endpoint(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StoreRead:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    return StoreRead.model_validate(store)
