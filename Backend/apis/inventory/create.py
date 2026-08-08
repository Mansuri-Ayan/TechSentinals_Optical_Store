# API: inventory/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_user_admin_id, require_permission
from db.session import get_db
from models.accountant import Accountant
from models.admin import Admin
from models.inventory import OwnerType
from models.manager import Manager
from models.optician import Optician
from models.store import Store
from models.worker import Worker
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
    """
    Create an inventory record.

    - Admin users may specify any owner_type/owner_id belonging to their tenant.
    - Store-scoped users (Manager/Worker/Optician/Accountant) are restricted to
      their assigned store.
    """
    admin_id = get_user_admin_id(current_user)

    # 1. Tenant security check
    if payload.owner_type == OwnerType.ADMIN or payload.owner_type == "ADMIN":
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
        is_store_scoped = (
            isinstance(current_user, (Manager, Worker, Optician))
            or (isinstance(current_user, Accountant) and getattr(current_user, "store_id", None) is not None)
        )
        if is_store_scoped:
            user_store_id = getattr(current_user, "store_id", None)
            if user_store_id is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Your account is not linked to any store. Contact your administrator.",
                )

            owner_type_is_store = (
                payload.owner_type == OwnerType.STORE
                or getattr(payload.owner_type, "value", str(payload.owner_type)) == "STORE"
            )

            if not owner_type_is_store:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Shopkeepers can only add inventory to a store, not the admin warehouse.",
                )

            if int(payload.owner_id) != int(user_store_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"You are not authorised to add inventory to store #{payload.owner_id}. "
                           f"You can only add inventory to your own store (#{user_store_id}).",
                )

    inventory = await create_inventory(db, payload=payload)
    return _inventory_to_read(inventory)
