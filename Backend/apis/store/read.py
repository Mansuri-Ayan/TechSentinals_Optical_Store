# API: store/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id, get_current_user
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
    description="List all stores owned by the currently authenticated admin/user with pagination and filtering.",
)
async def list_stores(
    page: int = Query(default=1, ge=1, description="Page number"),
    page_size: int = Query(default=10, ge=1, le=100, alias="limit", description="Page size"),
    search: str | None = Query(default=None, description="Search query matching store name/code/city"),
    status: str | None = Query(default=None, description="Filter by status: ACTIVE/INACTIVE"),
    state: str | None = Query(default=None, description="Filter by state name"),
    paginate: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> PaginatedResponse[StoreRead]:
    from services.permission_service import has_permission
    
    is_active = None
    if status:
        is_active = status.upper() == "ACTIVE"
        
    admin_id = get_user_admin_id(current_user)
    
    # Check permissions
    has_read_all = False
    actor_type = getattr(current_user, "token_role", "").upper()
    if actor_type in ("SUPERADMIN", "ADMIN"):
        has_read_all = True
    elif actor_type:
        has_read_all = await has_permission(db, actor_type, current_user.id, admin_id, "stores:read")

    # If they don't have global read, they can only see their own store
    own_store_id = getattr(current_user, "store_id", None)
    if not has_read_all and not own_store_id:
        raise HTTPException(
            status_code=403,
            detail="Missing permission: stores:read"
        )
        
    stores, total = await get_stores_by_admin(
        db,
        admin_id=admin_id,
        page=page,
        limit=page_size,
        search=search,
        state=state,
        is_active=is_active,
        paginate=paginate,
    )
    
    # No longer filtering stores if they don't have has_read_all, 
    # to allow managers to see other stores for stock transfers.
        
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
    current_user = Depends(get_current_user),
) -> StoreRead:
    from services.permission_service import has_permission
    admin_id = get_user_admin_id(current_user)
    
    # Check permissions
    has_read_all = False
    actor_type = getattr(current_user, "token_role", "").upper()
    if actor_type in ("SUPERADMIN", "ADMIN"):
        has_read_all = True
    elif actor_type:
        has_read_all = await has_permission(db, actor_type, current_user.id, admin_id, "stores:read")
        
    own_store_id = getattr(current_user, "store_id", None)
    if not has_read_all and own_store_id != store_id:
        raise HTTPException(
            status_code=403,
            detail="Missing permission: stores:read or not your store"
        )
        
    store = await get_store(db, store_id)
    if store is None or store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    return StoreRead.model_validate(store)
