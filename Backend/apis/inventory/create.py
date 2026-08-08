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
    from core.deps import get_user_admin_id
    from models.inventory import OwnerType
    from models.store import Store
    from sqlalchemy import select

    admin_id = get_user_admin_id(current_user)

    # 1. Tenant security check
    if payload.owner_type == OwnerType.ADMIN:
        payload_admin_id = payload.owner_id
    else:
        store = await db.scalar(select(Store).where(Store.id == payload.owner_id))
        if not store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found",
            )
        payload_admin_id = store.admin_id
        
    if payload_admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to create inventory for another tenant",
        )

    # 2. Store scope check for store-scoped users
    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant

        is_store_scoped = isinstance(current_user, (Worker, Optician)) or (isinstance(current_user, Accountant) and current_user.store_id is not None)
        if is_store_scoped:
            if payload.owner_type != OwnerType.STORE or payload.owner_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied. You can only create inventory for your own store.",
                )

    inventory = await create_inventory(db, payload=payload)
    return _inventory_to_read(inventory)
