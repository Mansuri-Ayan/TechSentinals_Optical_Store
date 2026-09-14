# API: inventory/update.py
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from schemas.inventory import InventoryUpdate, InventoryRead
from services.inventory_service import get_inventory, update_inventory

router = APIRouter()


def _inventory_to_read(inv) -> InventoryRead:
    product = inv.product
    selling_price = getattr(inv, "selling_price", None)
    if selling_price is None and product:
        selling_price = product.selling_price
    cost_price = getattr(inv, "last_purchase_price", None)
    if cost_price is None and product:
        cost_price = product.cost_price

    return InventoryRead(
        **{c.key: getattr(inv, c.key) for c in inv.__table__.columns},
        product_name=product.name if product else None,
        product_sku=product.sku if product else None,
        sku=product.sku if product else None,
        cost_price=cost_price,
        selling_price=selling_price,
        price=selling_price,
        gst_percent=product.gst_percent if (product and product.gst_percent is not None) else Decimal("18.00"),
        sales_workflow_type=getattr(product, "sales_workflow_type", None) or "BOTH",
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
    current_user = Depends(require_permission("inventory", "update")),
) -> InventoryRead:
    inv = await get_inventory(db, inventory_id)
    if inv is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory record not found",
        )

    from core.deps import get_user_admin_id
    from models.inventory import OwnerType
    from models.store import Store
    from sqlalchemy import select

    admin_id = get_user_admin_id(current_user)

    # 1. Tenant security check
    if inv.owner_type == OwnerType.ADMIN:
        inv_admin_id = inv.owner_id
    else:
        store = await db.scalar(select(Store).where(Store.id == inv.owner_id))
        inv_admin_id = store.admin_id if store else None

    if inv_admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this inventory record",
        )

    # 2. Store scope check for store-scoped users
    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant
        from models.manager import Manager

        is_store_scoped = isinstance(current_user, (Worker, Optician, Manager)) or (isinstance(current_user, Accountant) and getattr(current_user, "store_id", None) is not None)
        if is_store_scoped:
            if inv.owner_type != OwnerType.STORE or inv.owner_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this inventory record",
                )

    updated = await update_inventory(db, inv, payload)
    return _inventory_to_read(updated)
