# API: inventory/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryUpdate, InventoryRead
from services.inventory_service import get_inventory, update_inventory

router = APIRouter()


def _inventory_to_read(inv) -> InventoryRead:
    return InventoryRead(
        **{c.key: getattr(inv, c.key) for c in inv.__table__.columns},
        product_name=inv.product.name if inv.product else None,
        product_sku=inv.product.sku if inv.product else None,
    )


@router.put(
    "/{inventory_id}",
    response_model=InventoryRead,
    summary="Update inventory settings",
    description="Update reorder level or active status of an inventory record.",
)
async def update_inventory_endpoint(
    inventory_id: int,
    payload: InventoryUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> InventoryRead:
    inv = await get_inventory(db, inventory_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )
    updated = await update_inventory(db, inv, payload)
    return _inventory_to_read(updated)
