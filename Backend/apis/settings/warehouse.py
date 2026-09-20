# API: settings/warehouse.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from core.deps import get_current_user, get_current_admin, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from models.inventory import Inventory, OwnerType
from schemas.admin import AdminWarehouseToggle, DisableWarehouseRequest, WarehouseInfo
from services.store_service import get_store, get_main_store
from services.transfer_service import admin_to_store_transfer
from services.warehouse_resolver import resolve_warehouse

router = APIRouter()


@router.get(
    "/warehouse-info",
    response_model=WarehouseInfo,
    summary="Get current warehouse configuration and resolved identity",
    description="Returns whether warehouse is enabled and whether the warehouse is dedicated or Main Store.",
)
async def get_warehouse_info(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> WarehouseInfo:
    admin_id = get_user_admin_id(current_user)
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine admin scoping for user",
        )
    admin = await db.get(Admin, admin_id)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin account not found",
        )
    wh = await resolve_warehouse(db, admin_id)
    return WarehouseInfo(
        warehouse_enabled=admin.warehouse_enabled,
        owner_type=wh["owner_type"],
        owner_id=wh["owner_id"],
        store_id=wh["store_id"],
        label=wh["label"],
        is_dedicated_warehouse=wh["is_dedicated_warehouse"],
    )


@router.get(
    "/warehouse-stock-check",
    summary="Check if dedicated warehouse has any stock before disabling",
    description="Returns whether the dedicated warehouse has active items and the total quantity.",
)
async def check_warehouse_stock(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> dict:
    admin_id = current_admin.id
    stmt = select(
        func.count(Inventory.id).label("batch_count"),
        func.coalesce(func.sum(Inventory.quantity), 0).label("total_quantity"),
        func.coalesce(func.sum(Inventory.available_quantity), 0).label("total_available"),
    ).where(
        Inventory.owner_type == OwnerType.ADMIN,
        Inventory.owner_id == admin_id,
        Inventory.is_active.is_(True),
        Inventory.quantity > 0,
    )
    result = await db.execute(stmt)
    row = result.first()
    total_quantity = int(row.total_quantity) if row else 0
    total_available = int(row.total_available) if row else 0
    batch_count = int(row.batch_count) if row else 0

    return {
        "has_stock": total_quantity > 0,
        "total_quantity": total_quantity,
        "total_available": total_available,
        "batch_count": batch_count,
    }


@router.post(
    "/disable-warehouse",
    summary="Transfer all warehouse stock to a target store and disable the warehouse",
    description="Transfers all available inventory from Admin warehouse to target store via FIFO, then sets warehouse_enabled = False.",
)
async def disable_warehouse(
    payload: DisableWarehouseRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> dict:
    admin_id = current_admin.id
    target_store_id = payload.target_store_id

    target_store = await get_store(db, target_store_id)
    if not target_store or target_store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target store not found",
        )
    if not target_store.is_active or target_store.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer stock to an inactive or deleted store",
        )

    # Find distinct products with available warehouse stock
    stmt = (
        select(
            Inventory.product_id,
            func.sum(Inventory.available_quantity).label("total_avail"),
        )
        .where(
            Inventory.owner_type == OwnerType.ADMIN,
            Inventory.owner_id == admin_id,
            Inventory.is_active.is_(True),
            Inventory.available_quantity > 0,
        )
        .group_by(Inventory.product_id)
    )
    result = await db.execute(stmt)
    products_to_transfer = result.all()

    total_transferred = 0
    for row in products_to_transfer:
        qty = int(row.total_avail)
        if qty > 0:
            await admin_to_store_transfer(
                db=db,
                admin_id=admin_id,
                store_id=target_store_id,
                product_id=row.product_id,
                quantity=qty,
                created_by=admin_id,
                remarks=f"Auto-transfer: Warehouse disabled — stock moved to {target_store.store_name}",
            )
            total_transferred += qty

    current_admin.warehouse_enabled = False

    # Ensure a main store is designated
    main_store = await get_main_store(db, admin_id)
    if not main_store:
        target_store.is_main_store = True

    await db.commit()

    return {
        "warehouse_enabled": False,
        "transferred_quantity": total_transferred,
        "target_store": target_store.store_name,
        "message": f"All warehouse stock transferred to {target_store.store_name}. Warehouse disabled.",
    }


@router.patch(
    "/warehouse",
    summary="Enable the dedicated warehouse",
    description="Sets warehouse_enabled = True. Disabling must be done via /settings/disable-warehouse.",
)
async def toggle_warehouse(
    payload: AdminWarehouseToggle,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> dict:
    if not payload.warehouse_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To disable the warehouse, use the /settings/disable-warehouse endpoint to transfer stock first.",
        )

    current_admin.warehouse_enabled = True
    await db.commit()

    return {
        "warehouse_enabled": True,
        "message": "Dedicated warehouse enabled successfully.",
    }
