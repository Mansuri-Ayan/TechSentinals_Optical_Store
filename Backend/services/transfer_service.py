# Service: transfer_service.py
"""
Core business logic for all inventory movements:
  - Purchase (stock enters admin warehouse)
  - Admin ↔ Store transfers
  - Store ↔ Store transfers
  - Damage / Loss / Sale / Return
  - Transaction history queries
"""
from datetime import datetime, timezone
from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from models.inventory import Inventory, OwnerType
from models.inventory_transaction import InventoryTransaction, TransactionType
from services.inventory_service import get_or_create_inventory


# ── Helpers ────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _decrease_stock(
    inventory: Inventory,
    quantity: int,
    label: str = "source",
) -> None:
    """Decrease stock and validate sufficiency."""
    if inventory.available_quantity < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock at {label}: "
                f"available={inventory.available_quantity}, requested={quantity}"
            ),
        )
    inventory.quantity -= quantity
    inventory.available_quantity -= quantity
    inventory.last_stock_out_at = _now()


async def _increase_stock(inventory: Inventory, quantity: int) -> None:
    """Increase stock quantities."""
    inventory.quantity += quantity
    inventory.available_quantity += quantity
    inventory.last_stock_in_at = _now()


# ── Purchase ───────────────────────────────────────────────────

async def purchase_stock(
    db: AsyncSession,
    admin_id: int,
    product_id: int,
    quantity: int,
    purchase_price: float,
    created_by: int,
    remarks: str | None = None,
) -> InventoryTransaction:
    """
    Record a stock purchase into the admin warehouse.
    Creates/updates admin inventory and logs a PURCHASE transaction.
    """
    inventory = await get_or_create_inventory(
        db,
        owner_type=OwnerType.ADMIN,
        owner_id=admin_id,
        product_id=product_id,
    )

    await _increase_stock(inventory, quantity)
    inventory.last_purchase_price = purchase_price

    txn = InventoryTransaction(
        inventory_id=inventory.id,
        product_id=product_id,
        transaction_type=TransactionType.PURCHASE,
        quantity=quantity,
        remarks=remarks,
        created_by=created_by,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


# ── Admin ↔ Store Transfers ────────────────────────────────────

async def admin_to_store_transfer(
    db: AsyncSession,
    admin_id: int,
    store_id: int,
    product_id: int,
    quantity: int,
    created_by: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Transfer stock from admin warehouse to a store.
    Creates two linked transactions: ADMIN_TRANSFER_OUT + ADMIN_TRANSFER_IN.
    """
    # Source: admin warehouse
    admin_inv = await get_or_create_inventory(
        db, OwnerType.ADMIN, admin_id, product_id,
    )
    await _decrease_stock(admin_inv, quantity, label="admin warehouse")

    # Destination: store
    store_inv = await get_or_create_inventory(
        db, OwnerType.STORE, store_id, product_id,
    )
    await _increase_stock(store_inv, quantity)

    # Transaction: OUT from admin
    txn_out = InventoryTransaction(
        inventory_id=admin_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.ADMIN_TRANSFER_OUT,
        quantity=quantity,
        receive_store_id=store_id,
        remarks=remarks,
        created_by=created_by,
    )
    # Transaction: IN to store
    txn_in = InventoryTransaction(
        inventory_id=store_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.ADMIN_TRANSFER_IN,
        quantity=quantity,
        receive_store_id=store_id,
        remarks=remarks,
        created_by=created_by,
    )
    db.add_all([txn_out, txn_in])
    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


async def store_to_admin_transfer(
    db: AsyncSession,
    admin_id: int,
    store_id: int,
    product_id: int,
    quantity: int,
    created_by: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Transfer stock from a store back to admin warehouse.
    """
    # Source: store
    store_inv = await get_or_create_inventory(
        db, OwnerType.STORE, store_id, product_id,
    )
    await _decrease_stock(store_inv, quantity, label="store")

    # Destination: admin warehouse
    admin_inv = await get_or_create_inventory(
        db, OwnerType.ADMIN, admin_id, product_id,
    )
    await _increase_stock(admin_inv, quantity)

    txn_out = InventoryTransaction(
        inventory_id=store_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.STORE_TRANSFER_OUT,
        quantity=quantity,
        send_store_id=store_id,
        remarks=remarks,
        created_by=created_by,
    )
    txn_in = InventoryTransaction(
        inventory_id=admin_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.ADMIN_TRANSFER_IN,
        quantity=quantity,
        send_store_id=store_id,
        remarks=remarks,
        created_by=created_by,
    )
    db.add_all([txn_out, txn_in])
    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


# ── Store ↔ Store Transfers ────────────────────────────────────

async def store_to_store_transfer(
    db: AsyncSession,
    from_store_id: int,
    to_store_id: int,
    product_id: int,
    quantity: int,
    created_by: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Direct store-to-store transfer.
    """
    # Source store
    from_inv = await get_or_create_inventory(
        db, OwnerType.STORE, from_store_id, product_id,
    )
    await _decrease_stock(from_inv, quantity, label="source store")

    # Destination store
    to_inv = await get_or_create_inventory(
        db, OwnerType.STORE, to_store_id, product_id,
    )
    await _increase_stock(to_inv, quantity)

    txn_out = InventoryTransaction(
        inventory_id=from_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.STORE_TRANSFER_OUT,
        quantity=quantity,
        send_store_id=from_store_id,
        receive_store_id=to_store_id,
        remarks=remarks,
        created_by=created_by,
    )
    txn_in = InventoryTransaction(
        inventory_id=to_inv.id,
        product_id=product_id,
        transaction_type=TransactionType.STORE_TRANSFER_IN,
        quantity=quantity,
        send_store_id=from_store_id,
        receive_store_id=to_store_id,
        remarks=remarks,
        created_by=created_by,
    )
    db.add_all([txn_out, txn_in])
    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


# ── Damage / Loss / Sale / Return ──────────────────────────────

async def record_stock_action(
    db: AsyncSession,
    action: TransactionType,
    owner_type: str,
    owner_id: int,
    product_id: int,
    quantity: int,
    created_by: int,
    remarks: str | None = None,
) -> InventoryTransaction:
    """
    Generic handler for DAMAGE, LOSS, SALE (decrease) and RETURN (increase).
    """
    owner_type = owner_type.upper()
    inventory = await get_or_create_inventory(
        db, owner_type, owner_id, product_id,
    )

    if action in (TransactionType.DAMAGE, TransactionType.LOSS, TransactionType.SALE):
        await _decrease_stock(inventory, quantity, label=f"{owner_type}:{owner_id}")
    elif action == TransactionType.RETURN:
        await _increase_stock(inventory, quantity)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported stock action: {action}",
        )

    store_id = owner_id if owner_type == OwnerType.STORE else None

    txn = InventoryTransaction(
        inventory_id=inventory.id,
        product_id=product_id,
        transaction_type=action,
        quantity=quantity,
        send_store_id=store_id if action != TransactionType.RETURN else None,
        receive_store_id=store_id if action == TransactionType.RETURN else None,
        remarks=remarks,
        created_by=created_by,
    )
    db.add(txn)
    await db.commit()
    await db.refresh(txn)
    return txn


# ── Transaction History ────────────────────────────────────────

async def get_transaction_history(
    db: AsyncSession,
    admin_id: int,
    product_id: int | None = None,
    inventory_id: int | None = None,
    transaction_type: str | None = None,
    store_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[InventoryTransaction]:
    """
    Fetch transaction history with optional filters.
    Scoped to the admin's inventory records.
    """
    if transaction_type is not None:
        transaction_type = transaction_type.upper()
    from models.store import Store

    # Get valid inventory IDs for this admin
    store_ids_stmt = select(Store.id).where(Store.admin_id == admin_id)
    store_result = await db.execute(store_ids_stmt)
    store_ids = [row[0] for row in store_result.fetchall()]

    from sqlalchemy import or_
    inv_stmt = select(Inventory.id).where(
        or_(
            and_(Inventory.owner_type == OwnerType.ADMIN, Inventory.owner_id == admin_id),
            and_(Inventory.owner_type == OwnerType.STORE, Inventory.owner_id.in_(store_ids)) if store_ids else False,
        )
    )
    inv_result = await db.execute(inv_stmt)
    valid_inv_ids = [row[0] for row in inv_result.fetchall()]

    if not valid_inv_ids:
        return []

    stmt = select(InventoryTransaction).where(
        InventoryTransaction.inventory_id.in_(valid_inv_ids)
    )

    if product_id is not None:
        stmt = stmt.where(InventoryTransaction.product_id == product_id)
    if inventory_id is not None:
        stmt = stmt.where(InventoryTransaction.inventory_id == inventory_id)
    if transaction_type is not None:
        stmt = stmt.where(InventoryTransaction.transaction_type == transaction_type)
    if store_id is not None:
        from sqlalchemy import or_ as or_clause
        stmt = stmt.where(
            or_clause(
                InventoryTransaction.send_store_id == store_id,
                InventoryTransaction.receive_store_id == store_id,
            )
        )

    stmt = stmt.order_by(desc(InventoryTransaction.created_at)).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())
