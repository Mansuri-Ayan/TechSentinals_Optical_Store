# API Endpoint: deadstock/read.py
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.deadstock import (
    DeadstockItemRead,
    DeadstockListResponse,
    DeadstockCategoryCounts,
)
from services.deadstock_service import (
    list_deadstock,
    get_deadstock_item,
    list_deadstock_for_pos,
)

router = APIRouter()


def _parse_store_id(store_id_param: Optional[str], current_user) -> tuple[int, Optional[int]]:
    """
    Returns (admin_id, numeric_store_id).
    Accepts string store_id like 'admin' or '1'.
    """
    if isinstance(current_user, Admin):
        admin_id = current_user.id
        numeric_store_id = None
        if store_id_param and str(store_id_param).lower() != "admin":
            try:
                numeric_store_id = int(store_id_param)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid store_id format",
                )
    else:
        admin_id = current_user.store.admin_id
        numeric_store_id = current_user.store_id
        if store_id_param and str(store_id_param).lower() != "admin":
            try:
                numeric_store_id = int(store_id_param)
            except ValueError:
                pass

    return admin_id, numeric_store_id


@router.get(
    "/",
    response_model=DeadstockListResponse,
    summary="List deadstock items with filters, search and category counts",
)
async def list_deadstock_endpoint(
    category: Optional[str] = Query(None, description="Category filter (Frames, Lenses, Accessories, All)"),
    status: Optional[str] = Query(None, description="Status filter (AVAILABLE, REUSED, SOLD, All)"),
    search: Optional[str] = Query(None, description="Search term for SKU, product name, or notes"),
    store_id: Optional[str] = Query(None, description="Filter by store ID ('admin' or integer string)"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("deadstock", "read")),
):
    admin_id, numeric_store_id = _parse_store_id(store_id, current_user)

    items, total, counts_dict = await list_deadstock(
        db=db,
        admin_id=admin_id,
        store_id=numeric_store_id,
        category=category,
        status_filter=status,
        search=search,
        page=page,
        limit=limit,
    )

    counts = DeadstockCategoryCounts(**counts_dict)
    item_reads = [DeadstockItemRead.model_validate(item) for item in items]

    return DeadstockListResponse(
        items=item_reads,
        total=total,
        page=page,
        limit=limit,
        counts=counts,
    )


@router.get(
    "/pos-available",
    response_model=list[DeadstockItemRead],
    summary="List AVAILABLE deadstock items for POS product selection",
)
async def list_pos_available_deadstock_endpoint(
    store_id: Optional[str] = Query(None, description="Store ID ('admin' or integer string)"),
    category: Optional[str] = Query(None, description="Category filter"),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("sales", "create")),
):
    admin_id, numeric_store_id = _parse_store_id(store_id, current_user)

    items = await list_deadstock_for_pos(
        db=db,
        admin_id=admin_id,
        store_id=numeric_store_id,
        category=category,
    )

    return [DeadstockItemRead.model_validate(item) for item in items]


@router.get(
    "/{item_id}",
    response_model=DeadstockItemRead,
    summary="Get single deadstock item by ID",
)
async def get_deadstock_item_endpoint(
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_permission("deadstock", "read")),
):
    item = await get_deadstock_item(db, item_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deadstock item not found.",
        )
    return DeadstockItemRead.model_validate(item)
