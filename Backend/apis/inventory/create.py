# API: inventory/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryCreate, InventoryRead
from services.inventory_service import create_inventory

router = APIRouter()


def _inventory_to_read(inv) -> InventoryRead:
    return InventoryRead(
        **{c.key: getattr(inv, c.key) for c in inv.__table__.columns},
        product_name=inv.product.name if inv.product else None,
        product_sku=inv.product.sku if inv.product else None,
    )


@router.post(
    "/",
    response_model=InventoryRead,
    status_code=status.HTTP_201_CREATED,
    summary="Initialize inventory",
    description="Create an inventory record for a product at a specific owner (admin warehouse or store).",
)
async def create_inventory_endpoint(
    payload: InventoryCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("inventory", "create")),
) -> InventoryRead:
    inventory = await create_inventory(db, payload=payload)
    return _inventory_to_read(inventory)
