# API: inventory/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryRead
from services.inventory_service import (
    get_inventory,
    get_inventories_by_owner,
    get_low_stock_items,
)

router = APIRouter()


def _inventory_to_read(inv) -> InventoryRead:
    return InventoryRead(
        **{c.key: getattr(inv, c.key) for c in inv.__table__.columns},
        product_name=inv.product.name if inv.product else None,
        product_sku=inv.product.sku if inv.product else None,
    )


@router.get(
    "/",
    response_model=list[InventoryRead],
    summary="List inventories",
    description="List inventory records filtered by owner type and ID.",
)
async def list_inventories(
    owner_type: str = Query(..., description="ADMIN or STORE"),
    owner_id: int = Query(..., description="Admin ID or Store ID"),
    active_only: bool = Query(True),
    low_stock_only: bool = Query(False),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[InventoryRead]:
    inventories = await get_inventories_by_owner(
        db,
        owner_type=owner_type,
        owner_id=owner_id,
        active_only=active_only,
        low_stock_only=low_stock_only,
        limit=limit,
        offset=offset,
    )
    return [_inventory_to_read(inv) for inv in inventories]


@router.get(
    "/low-stock",
    response_model=list[InventoryRead],
    summary="Get low-stock items",
    description="Get all items where available quantity is at or below the reorder level.",
)
async def low_stock_items(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[InventoryRead]:
    items = await get_low_stock_items(db, admin_id=current_admin.id)
    return [_inventory_to_read(inv) for inv in items]


@router.get(
    "/{inventory_id}",
    response_model=InventoryRead,
    summary="Get single inventory record",
)
async def get_inventory_endpoint(
    inventory_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> InventoryRead:
    inv = await get_inventory(db, inventory_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )
    return _inventory_to_read(inv)
