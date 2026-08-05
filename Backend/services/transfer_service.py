# Service: transfer_service.py
"""
Core business logic for all inventory movements:
  - Purchase (stock enters admin warehouse)
  - Admin ↔ Store transfers (Rule 1, Rule 2, Rule 6)
  - Store ↔ Store transfers (Rule 4, Rule 5)
  - Damage / Loss / Sale / Return
  - Transaction history queries and filtering
"""
from datetime import datetime, timezone
from sqlalchemy import select, and_, desc, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from models.inventory import Inventory, OwnerType
from models.inventory_transaction import (
    InventoryTransaction,
    TransactionType,
    TransactionStatus,
    TransferDirection,
)
from models.notification import Notification, NotificationType
from models.manager import Manager
from models.store import Store
from models.product import Product
from services.inventory_service import get_or_create_inventory
from services.snapshot_service import capture_product_snapshot
from decimal import Decimal


# ── FIFO Stock Helpers ──────────────────────────────────────────

async def _consume_stock_fifo(
    db: AsyncSession,
    owner_type: str,
    owner_id: int,
    product_id: int,
    quantity: int,
    label: str = "inventory",
) -> tuple[Decimal, list[dict]]:
    """
    Consume stock from the oldest active rows (FIFO).
    Decrements quantity and available_quantity in place.
    Returns (total_purchase_cost, consumed_batches_list).
    """
    if quantity <= 0:
        return Decimal("0.00"), []

    # Get active inventory rows sorted by id
    stmt = (
        select(Inventory)
        .where(
            Inventory.product_id == product_id,
            Inventory.owner_type == owner_type,
            Inventory.owner_id == owner_id,
            Inventory.available_quantity > 0,
            Inventory.is_active.is_(True)
        )
        .order_by(Inventory.id.asc())
    )
    res = await db.execute(stmt)
    batches = list(res.scalars().all())

    total_avail = sum(b.available_quantity for b in batches)
    if total_avail < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Insufficient stock in {label}: "
                f"available={total_avail}, requested={quantity}"
            ),
        )

    qty_to_consume = quantity
    consumed_list = []
    tot_cost = Decimal("0.00")

    for batch in batches:
        if qty_to_consume <= 0:
            break
        taken = min(batch.available_quantity, qty_to_consume)
        batch.quantity -= taken
        batch.available_quantity -= taken
        batch.last_stock_out_at = datetime.now(timezone.utc)
        if batch.available_quantity == 0:
            batch.is_active = False

        # Build metadata copy
        consumed_list.append({
            "inventory_id": batch.id,
            "quantity": taken,
            "purchase_cost": float(batch.purchase_cost),
            "selling_price": float(batch.selling_price) if batch.selling_price is not None else None,
            "purchase_date": batch.purchase_date.isoformat() if batch.purchase_date else None,
            "supplier_id": batch.supplier_id,
            "purchase_order_id": batch.purchase_order_id,
            "purchase_order_item_id": batch.purchase_order_item_id,
        })
        tot_cost += Decimal(taken) * batch.purchase_cost
        qty_to_consume -= taken

    return tot_cost, consumed_list


async def ensure_category_and_brand_copied(
    db: AsyncSession,
    product_id: int,
    owner_type: str,
    owner_id: int,
) -> None:
    """Ensure that the Category and Brand of the product are copied to the destination store if they don't exist."""
    if owner_type.upper() != "STORE":
        return

    from models.category import Category
    from models.brand import Brand
    from models.store_category_loyalty import StoreCategoryLoyalty

    # Fetch product
    prod_stmt = select(Product).where(Product.id == product_id)
    prod_res = await db.execute(prod_stmt)
    product = prod_res.scalar_one_or_none()
    if not product:
        return

    # 1. Handle Category copying
    if product.category_id is not None:
        cat_stmt = select(Category).where(Category.id == product.category_id)
        cat_res = await db.execute(cat_stmt)
        orig_cat = cat_res.scalar_one_or_none()
        if orig_cat:
            # Check if a category with same name exists for this store
            store_cat_stmt = select(Category).where(
                Category.store_id == owner_id,
                Category.name == orig_cat.name
            )
            store_cat_res = await db.execute(store_cat_stmt)
            store_cat = store_cat_res.scalar_one_or_none()
            if not store_cat:
                # Create category for this store
                new_cat = Category(
                    admin_id=orig_cat.admin_id,
                    store_id=owner_id,
                    name=orig_cat.name,
                    description=orig_cat.description,
                    is_active=True
                )
                db.add(new_cat)
                await db.flush()

                # Create loyalty category record for the new category
                scl = StoreCategoryLoyalty(
                    store_id=owner_id,
                    category_id=new_cat.id,
                    points_per_unit=50,
                    is_enabled=True,
                )
                db.add(scl)
                await db.flush()

    # 2. Handle Brand copying
    if product.brand_id is not None:
        brand_stmt = select(Brand).where(Brand.id == product.brand_id)
        brand_res = await db.execute(brand_stmt)
        orig_brand = brand_res.scalar_one_or_none()
        if orig_brand:
            # Check if a brand with same name exists for this store
            store_brand_stmt = select(Brand).where(
                Brand.store_id == owner_id,
                Brand.name == orig_brand.name
            )
            store_brand_res = await db.execute(store_brand_stmt)
            store_brand = store_brand_res.scalar_one_or_none()
            if not store_brand:
                # Create brand for this store
                new_brand = Brand(
                    admin_id=orig_brand.admin_id,
                    store_id=owner_id,
                    name=orig_brand.name,
                    is_active=True
                )
                db.add(new_brand)
                await db.flush()


async def _receive_stock_batches(
    db: AsyncSession,
    owner_type: str,
    owner_id: int,
    product_id: int,
    consumed_batches: list[dict],
) -> int:
    """
    Create corresponding batch rows at the destination store,
    inheriting batch attributes from the source consumed batches.
    Returns the inventory_id of the first batch created.
    """
    await ensure_category_and_brand_copied(db, product_id, owner_type, owner_id)

    if not consumed_batches:
        return 0

    # Fetch existing reorder level if any
    existing_reorder_level = 0
    stmt_reorder = select(Inventory.reorder_level).where(
        Inventory.product_id == product_id,
        Inventory.owner_type == owner_type,
        Inventory.owner_id == owner_id
    ).limit(1)
    reorder_res = await db.execute(stmt_reorder)
    row_reorder = reorder_res.scalar()
    if row_reorder is not None:
        existing_reorder_level = row_reorder

    first_inv_id = None

    for batch_meta in consumed_batches:
        qty = batch_meta["quantity"]
        p_cost = Decimal(str(batch_meta["purchase_cost"]))
        p_date_str = batch_meta.get("purchase_date")
        if p_date_str:
            p_date = datetime.fromisoformat(p_date_str)
        else:
            p_date = datetime.now(timezone.utc)

        # Create new batch row at destination
        new_inv = Inventory(
            owner_type=owner_type,
            owner_id=owner_id,
            product_id=product_id,
            quantity=qty,
            available_quantity=qty,
            reserved_quantity=0,
            reorder_level=existing_reorder_level,
            last_purchase_price=p_cost,
            last_stock_in_at=datetime.now(timezone.utc),
            purchase_date=datetime.now(timezone.utc),
            initial_quantity=qty,
            purchase_cost=p_cost,
            selling_price=batch_meta.get("selling_price"),
            supplier_id=batch_meta.get("supplier_id"),
            purchase_order_id=batch_meta.get("purchase_order_id"),
            purchase_order_item_id=batch_meta.get("purchase_order_item_id"),
        )
        db.add(new_inv)
        await db.flush()

        # Phase 1: Transfer ProductUnit to destination owner and batch
        src_inv_stmt = select(Inventory).where(Inventory.id == batch_meta["inventory_id"])
        src_inv = (await db.execute(src_inv_stmt)).scalar_one_or_none()
        
        if src_inv:
            from services.product_unit_service import transfer_units
            await transfer_units(
                db=db,
                product_id=product_id,
                from_owner_type=OwnerType(src_inv.owner_type) if isinstance(src_inv.owner_type, str) else src_inv.owner_type,
                from_owner_id=src_inv.owner_id,
                to_owner_type=OwnerType(owner_type) if isinstance(owner_type, str) else owner_type,
                to_owner_id=owner_id,
                quantity=qty,
                new_batch_id=new_inv.id,
                from_batch_id=src_inv.id,
            )

        if first_inv_id is None:
            first_inv_id = new_inv.id


    return first_inv_id


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
    if inventory.available_quantity == 0:
        inventory.is_active = False


async def _increase_stock(inventory: Inventory, quantity: int) -> None:
    """Increase stock quantities."""
    inventory.quantity += quantity
    inventory.available_quantity += quantity
    inventory.last_stock_in_at = _now()
    if inventory.available_quantity > 0:
        inventory.is_active = True


# ── Notifications Helpers ─────────────────────────────────────

async def create_notification(
    db: AsyncSession,
    recipient_user_id: int,
    recipient_store_id: int | None,
    type: NotificationType,
    title: str,
    message: str,
    related_transaction_id: int | None = None,
) -> Notification:
    """Helper to write a notification record inside the transaction."""
    notif = Notification(
        recipient_user_id=recipient_user_id,
        recipient_store_id=recipient_store_id,
        type=type,
        title=title,
        message=message,
        related_transaction_id=related_transaction_id,
    )
    db.add(notif)
    return notif


async def notify_admin(
    db: AsyncSession,
    admin_id: int,
    type: NotificationType,
    title: str,
    message: str,
    txn_id: int | None = None,
) -> None:
    """Notify the admin."""
    await create_notification(
        db,
        recipient_user_id=admin_id,
        recipient_store_id=None,
        type=type,
        title=title,
        message=message,
        related_transaction_id=txn_id,
    )


async def notify_store_manager(
    db: AsyncSession,
    store_id: int,
    type: NotificationType,
    title: str,
    message: str,
    txn_id: int | None = None,
) -> None:
    """Notify the active manager of a store if they exist."""
    stmt = select(Manager).where(Manager.store_id == store_id, Manager.is_active.is_(True))
    result = await db.execute(stmt)
    managers = result.scalars().all()
    for manager in managers:
        await create_notification(
            db,
            recipient_user_id=manager.id,
            recipient_store_id=store_id,
            type=type,
            title=title,
            message=message,
            related_transaction_id=txn_id,
        )


# ── Purchase ───────────────────────────────────────────────────

async def purchase_stock(
    db: AsyncSession,
    admin_id: int,
    product_id: int,
    quantity: int,
    purchase_price: float,
    created_by: int,
    owner_type: str = "ADMIN",
    owner_id: int | None = None,
    remarks: str | None = None,
) -> InventoryTransaction:
    """
    Record a stock purchase into the admin warehouse or a specific store.
    Creates/updates inventory and logs a PURCHASE transaction.
    """
    # Resolve owner
    ot = owner_type.upper() if owner_type else "ADMIN"
    oid = owner_id if owner_id else admin_id

    async with db.begin_nested():
        # Fetch existing reorder level for this product and owner if any
        existing_reorder_level = 0
        stmt_reorder = select(Inventory.reorder_level).where(
            Inventory.product_id == product_id,
            Inventory.owner_type == ot,
            Inventory.owner_id == oid
        ).limit(1)
        reorder_res = await db.execute(stmt_reorder)
        row_reorder = reorder_res.scalar()
        if row_reorder is not None:
            existing_reorder_level = row_reorder

        # Get primary supplier for the product if available
        from models.supplier_product import SupplierProduct
        stmt_sp = select(SupplierProduct.supplier_id).where(
            SupplierProduct.product_id == product_id,
            SupplierProduct.is_active.is_(True)
        ).limit(1)
        sp_res = await db.execute(stmt_sp)
        supplier_id = sp_res.scalar()

        # Capture snapshot of product at purchase time
        prod = await db.scalar(select(Product).where(Product.id == product_id))
        selling_price = prod.selling_price if prod else 0.00

        # Ensure category and brand exist in the target store/warehouse
        await ensure_category_and_brand_copied(db, product_id, ot, oid)

        # Create a new inventory row (batch) for this purchase
        inventory = Inventory(
            owner_type=ot,
            owner_id=oid,
            product_id=product_id,
            quantity=quantity,
            available_quantity=quantity,
            reserved_quantity=0,
            reorder_level=existing_reorder_level,
            last_purchase_price=purchase_price,
            last_stock_in_at=datetime.now(timezone.utc),
            purchase_date=datetime.now(timezone.utc),
            initial_quantity=quantity,
            purchase_cost=purchase_price,
            selling_price=selling_price,
            supplier_id=supplier_id,
        )
        db.add(inventory)
        await db.flush()
        
        receive_store = oid if ot == OwnerType.STORE else None
        snapshot = await capture_product_snapshot(db, prod) if prod else None

        txn = InventoryTransaction(
            inventory_id=inventory.id,
            product_id=product_id,
            product_snapshot_id=snapshot.id if snapshot else None,
            unit_price=purchase_price,
            total_value=purchase_price * quantity if purchase_price else None,
            transaction_type=TransactionType.PURCHASE,
            quantity=quantity,
            receive_store_id=receive_store,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
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
    Transfer stock from admin warehouse to a store (Rule 1).
    Creates two linked transactions: ADMIN_TRANSFER_OUT + ADMIN_TRANSFER_IN.
    """
    # Load product name for notifications
    prod_stmt = select(Product.name).where(Product.id == product_id)
    product_name = (await db.execute(prod_stmt)).scalar() or "Product"

    store_stmt = select(Store.store_name).where(Store.id == store_id)
    store_name = (await db.execute(store_stmt)).scalar() or "Store"

    async with db.begin_nested():
        # Source: admin warehouse (FIFO consume)
        _, consumed_batches = await _consume_stock_fifo(
            db, OwnerType.ADMIN, admin_id, product_id, quantity, label="admin warehouse"
        )

        # Destination: store (batch rows creation)
        dest_inv_id = await _receive_stock_batches(
            db, OwnerType.STORE, store_id, product_id, consumed_batches
        )

        # Transaction: OUT from admin
        txn_out = InventoryTransaction(
            inventory_id=consumed_batches[0]["inventory_id"],
            product_id=product_id,
            transaction_type=TransactionType.ADMIN_TRANSFER_OUT,
            quantity=quantity,
            receive_store_id=store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.ADMIN_TO_BRANCH,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_out)
        await db.flush()  # get txn_out.id

        # Transaction: IN to store
        txn_in = InventoryTransaction(
            inventory_id=dest_inv_id,
            product_id=product_id,
            transaction_type=TransactionType.ADMIN_TRANSFER_IN,
            quantity=quantity,
            receive_store_id=store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.ADMIN_TO_BRANCH,
            reference_id=txn_out.id,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_in)
        await db.flush()

        txn_out.reference_id = txn_in.id

        # Notifications: Notify receiving manager + admin
        await notify_store_manager(
            db,
            store_id=store_id,
            type=NotificationType.TRANSFER_PUSH_RECEIVED,
            title=f"Stock Received (TXN-{txn_out.id:06d})",
            message=f"Admin warehouse pushed {quantity} units of {product_name} to your store.",
            txn_id=txn_out.id,
        )
        await notify_admin(
            db,
            admin_id=admin_id,
            type=NotificationType.ADMIN_TRANSFER_COMPLETED,
            title=f"Transfer Completed (TXN-{txn_out.id:06d})",
            message=f"Pushed {quantity} units of {product_name} to {store_name}.",
            txn_id=txn_out.id,
        )

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
    is_admin_pull: bool = True,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Transfer stock from a store back to admin warehouse (Rule 2 or Rule 6).
    """
    prod_stmt = select(Product.name).where(Product.id == product_id)
    product_name = (await db.execute(prod_stmt)).scalar() or "Product"

    store_stmt = select(Store.store_name).where(Store.id == store_id)
    store_name = (await db.execute(store_stmt)).scalar() or "Store"

    async with db.begin_nested():
        # Source: store (FIFO consume)
        _, consumed_batches = await _consume_stock_fifo(
            db, OwnerType.STORE, store_id, product_id, quantity, label="store"
        )

        # Destination: admin warehouse (batch rows creation)
        dest_inv_id = await _receive_stock_batches(
            db, OwnerType.ADMIN, admin_id, product_id, consumed_batches
        )

        txn_out = InventoryTransaction(
            inventory_id=consumed_batches[0]["inventory_id"],
            product_id=product_id,
            transaction_type=TransactionType.STORE_TRANSFER_OUT,
            quantity=quantity,
            send_store_id=store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_ADMIN,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=dest_inv_id,
            product_id=product_id,
            transaction_type=TransactionType.ADMIN_TRANSFER_IN,
            quantity=quantity,
            send_store_id=store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_ADMIN,
            reference_id=txn_out.id,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_in)
        await db.flush()

        txn_out.reference_id = txn_in.id

        if is_admin_pull:
            # Rule 2: Admin pulls stock
            await notify_store_manager(
                db,
                store_id=store_id,
                type=NotificationType.TRANSFER_PUSH_RECEIVED,
                title=f"Stock Pulled by Admin (TXN-{txn_out.id:06d})",
                message=f"Admin warehouse pulled {quantity} units of {product_name} from your store.",
                txn_id=txn_out.id,
            )
            await notify_admin(
                db,
                admin_id=admin_id,
                type=NotificationType.ADMIN_TRANSFER_COMPLETED,
                title=f"Stock Pulled (TXN-{txn_out.id:06d})",
                message=f"Pulled {quantity} units of {product_name} from {store_name}.",
                txn_id=txn_out.id,
            )
        else:
            # Rule 6: Manager returns stock to admin
            await notify_admin(
                db,
                admin_id=admin_id,
                type=NotificationType.ADMIN_TRANSFER_COMPLETED,
                title=f"Stock Returned (TXN-{txn_out.id:06d})",
                message=f"{store_name} manager returned {quantity} units of {product_name} to Admin warehouse.",
                txn_id=txn_out.id,
            )

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
    Direct store-to-store transfer (immediate, Rule 5 / Admin initiated).
    """
    prod_stmt = select(Product.name).where(Product.id == product_id)
    product_name = (await db.execute(prod_stmt)).scalar() or "Product"

    store_from_stmt = select(Store.store_name).where(Store.id == from_store_id)
    store_from_name = (await db.execute(store_from_stmt)).scalar() or "Source Store"

    store_to_stmt = select(Store.store_name).where(Store.id == to_store_id)
    store_to_name = (await db.execute(store_to_stmt)).scalar() or "Destination Store"

    store_from_obj = (await db.execute(select(Store).where(Store.id == from_store_id))).scalar_one()
    admin_id = store_from_obj.admin_id

    async with db.begin_nested():
        # Source store (FIFO consume)
        _, consumed_batches = await _consume_stock_fifo(
            db, OwnerType.STORE, from_store_id, product_id, quantity, label="source store"
        )

        # Destination store (batch rows creation)
        dest_inv_id = await _receive_stock_batches(
            db, OwnerType.STORE, to_store_id, product_id, consumed_batches
        )

        txn_out = InventoryTransaction(
            inventory_id=consumed_batches[0]["inventory_id"],
            product_id=product_id,
            transaction_type=TransactionType.STORE_TRANSFER_OUT,
            quantity=quantity,
            send_store_id=from_store_id,
            receive_store_id=to_store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=dest_inv_id,
            product_id=product_id,
            transaction_type=TransactionType.STORE_TRANSFER_IN,
            quantity=quantity,
            send_store_id=from_store_id,
            receive_store_id=to_store_id,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
            reference_id=txn_out.id,
            is_request=False,
            consumed_batches=consumed_batches,
        )
        db.add(txn_in)
        await db.flush()

        txn_out.reference_id = txn_in.id

        # Notifications: send to both managers + admin
        await notify_store_manager(
            db,
            store_id=from_store_id,
            type=NotificationType.TRANSFER_REQUEST_APPROVED,
            title=f"Stock Sent (TXN-{txn_out.id:06d})",
            message=f"Sent {quantity} units of {product_name} to {store_to_name}.",
            txn_id=txn_out.id,
        )
        await notify_store_manager(
            db,
            store_id=to_store_id,
            type=NotificationType.TRANSFER_PUSH_RECEIVED,
            title=f"Stock Received (TXN-{txn_out.id:06d})",
            message=f"Received {quantity} units of {product_name} from {store_from_name}.",
            txn_id=txn_out.id,
        )
        await notify_admin(
            db,
            admin_id=admin_id,
            type=NotificationType.ADMIN_TRANSFER_COMPLETED,
            title=f"Branch Transfer Completed (TXN-{txn_out.id:06d})",
            message=f"Stock transfer from {store_from_name} to {store_to_name} completed.",
            txn_id=txn_out.id,
        )

    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


# ── Pending Transfers (Rule 3, 4, 5) ──────────────────────────

async def create_pending_request_service(
    db: AsyncSession,
    manager_user_id: int,
    manager_store_id: int,
    product_id: int,
    quantity: int,
    from_owner_type: str,
    from_owner_id: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Manager requests stock (pull request) from Admin (Rule 3) or another Store (Rule 4).
    Creates PENDING transactions without stock mutation.
    """
    prod_stmt = select(Product.name).where(Product.id == product_id)
    product_name = (await db.execute(prod_stmt)).scalar() or "Product"

    store_stmt = select(Store).where(Store.id == manager_store_id)
    store = (await db.execute(store_stmt)).scalar_one()
    store_name = store.store_name
    admin_id = store.admin_id

    from_owner_type = from_owner_type.upper()

    async with db.begin_nested():
        if from_owner_type == "ADMIN":
            # Rule 3: Manager requests stock from Admin
            from_owner_id = admin_id
            admin_inv = await get_or_create_inventory(db, OwnerType.ADMIN, from_owner_id, product_id)
            store_inv = await get_or_create_inventory(db, OwnerType.STORE, manager_store_id, product_id)

            txn_out = InventoryTransaction(
                inventory_id=admin_inv.id,
                product_id=product_id,
                transaction_type=TransactionType.ADMIN_TRANSFER_OUT,
                quantity=quantity,
                receive_store_id=manager_store_id,
                remarks=remarks,
                created_by=manager_user_id,
                status=TransactionStatus.PENDING,
                transfer_direction=TransferDirection.BRANCH_TO_ADMIN,
                requested_by_store_id=manager_store_id,
                is_request=True,
            )
            db.add(txn_out)
            await db.flush()

            txn_in = InventoryTransaction(
                inventory_id=store_inv.id,
                product_id=product_id,
                transaction_type=TransactionType.ADMIN_TRANSFER_IN,
                quantity=quantity,
                receive_store_id=manager_store_id,
                remarks=remarks,
                created_by=manager_user_id,
                status=TransactionStatus.PENDING,
                transfer_direction=TransferDirection.BRANCH_TO_ADMIN,
                requested_by_store_id=manager_store_id,
                reference_id=txn_out.id,
                is_request=True,
            )
            db.add(txn_in)
            await db.flush()

            txn_out.reference_id = txn_in.id

            # Notify Admin only
            await notify_admin(
                db,
                admin_id=admin_id,
                type=NotificationType.TRANSFER_REQUEST_RECEIVED,
                title=f"Transfer Request Received (TXN-{txn_out.id:06d})",
                message=f"{store_name} manager requested {quantity} units of {product_name}.",
                txn_id=txn_out.id,
            )

        elif from_owner_type == "STORE":
            # Rule 4: Manager requests stock from another store
            from_store_stmt = select(Store.store_name).where(Store.id == from_owner_id)
            from_store_name = (await db.execute(from_store_stmt)).scalar() or "Other Store"

            from_inv = await get_or_create_inventory(db, OwnerType.STORE, from_owner_id, product_id)
            to_inv = await get_or_create_inventory(db, OwnerType.STORE, manager_store_id, product_id)

            txn_out = InventoryTransaction(
                inventory_id=from_inv.id,
                product_id=product_id,
                transaction_type=TransactionType.STORE_TRANSFER_OUT,
                quantity=quantity,
                send_store_id=from_owner_id,
                receive_store_id=manager_store_id,
                remarks=remarks,
                created_by=manager_user_id,
                status=TransactionStatus.PENDING,
                transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
                requested_by_store_id=manager_store_id,
                is_request=True,
            )
            db.add(txn_out)
            await db.flush()

            txn_in = InventoryTransaction(
                inventory_id=to_inv.id,
                product_id=product_id,
                transaction_type=TransactionType.STORE_TRANSFER_IN,
                quantity=quantity,
                send_store_id=from_owner_id,
                receive_store_id=manager_store_id,
                remarks=remarks,
                created_by=manager_user_id,
                status=TransactionStatus.PENDING,
                transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
                requested_by_store_id=manager_store_id,
                reference_id=txn_out.id,
                is_request=True,
            )
            db.add(txn_in)
            await db.flush()

            txn_out.reference_id = txn_in.id

            # Notify receiving manager + admin
            await notify_store_manager(
                db,
                store_id=from_owner_id,
                type=NotificationType.TRANSFER_REQUEST_RECEIVED,
                title=f"Transfer Request Received (TXN-{txn_out.id:06d})",
                message=f"{store_name} manager requested {quantity} units of {product_name} from your store.",
                txn_id=txn_out.id,
            )
            await notify_admin(
                db,
                admin_id=admin_id,
                type=NotificationType.TRANSFER_REQUEST_RECEIVED,
                title=f"Transfer Request Received (TXN-{txn_out.id:06d})",
                message=f"{store_name} manager requested {quantity} units of {product_name} from {from_store_name}.",
                txn_id=txn_out.id,
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid source type")

    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


async def create_pending_push_service(
    db: AsyncSession,
    manager_user_id: int,
    manager_store_id: int,
    to_store_id: int,
    product_id: int,
    quantity: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Manager pushes stock to another store (Rule 5).
    Creates PENDING transactions without stock mutation.
    """
    prod_stmt = select(Product.name).where(Product.id == product_id)
    product_name = (await db.execute(prod_stmt)).scalar() or "Product"

    store_stmt = select(Store).where(Store.id == manager_store_id)
    store = (await db.execute(store_stmt)).scalar_one()
    store_name = store.store_name
    admin_id = store.admin_id

    to_store_stmt = select(Store.store_name).where(Store.id == to_store_id)
    to_store_name = (await db.execute(to_store_stmt)).scalar() or "Other Store"

    async with db.begin_nested():
        from_inv = await get_or_create_inventory(db, OwnerType.STORE, manager_store_id, product_id)
        to_inv = await get_or_create_inventory(db, OwnerType.STORE, to_store_id, product_id)

        txn_out = InventoryTransaction(
            inventory_id=from_inv.id,
            product_id=product_id,
            transaction_type=TransactionType.STORE_TRANSFER_OUT,
            quantity=quantity,
            send_store_id=manager_store_id,
            receive_store_id=to_store_id,
            remarks=remarks,
            created_by=manager_user_id,
            status=TransactionStatus.PENDING,
            transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
            requested_by_store_id=manager_store_id,
            is_request=False,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=to_inv.id,
            product_id=product_id,
            transaction_type=TransactionType.STORE_TRANSFER_IN,
            quantity=quantity,
            send_store_id=manager_store_id,
            receive_store_id=to_store_id,
            remarks=remarks,
            created_by=manager_user_id,
            status=TransactionStatus.PENDING,
            transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
            requested_by_store_id=manager_store_id,
            reference_id=txn_out.id,
            is_request=False,
        )
        db.add(txn_in)
        await db.flush()

        txn_out.reference_id = txn_in.id

        # Notify receiving manager + admin
        await notify_store_manager(
            db,
            store_id=to_store_id,
            type=NotificationType.TRANSFER_PUSH_RECEIVED,
            title=f"Stock Push Received (TXN-{txn_out.id:06d})",
            message=f"{store_name} manager wants to send {quantity} units of {product_name} to your store.",
            txn_id=txn_out.id,
        )
        await notify_admin(
            db,
            admin_id=admin_id,
            type=NotificationType.TRANSFER_REQUEST_RECEIVED,
            title=f"Stock Push Sent (TXN-{txn_out.id:06d})",
            message=f"{store_name} manager wants to send {quantity} units of {product_name} to {to_store_name}.",
            txn_id=txn_out.id,
        )

    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


async def create_pending_return_service(
    db: AsyncSession,
    manager_user_id: int,
    manager_store_id: int,
    product_id: int,
    quantity: int,
    to_owner_type: str,
    to_owner_id: int,
    remarks: str | None = None,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Manager returns stock (creates pending Return transaction showing on both sides, requiring approval).
    """
    to_owner_type = to_owner_type.upper()
    
    async with db.begin_nested():
        from_inv = await get_or_create_inventory(db, OwnerType.STORE, manager_store_id, product_id)
        to_inv = await get_or_create_inventory(db, to_owner_type, to_owner_id, product_id)

        txn_out = InventoryTransaction(
            inventory_id=from_inv.id,
            product_id=product_id,
            transaction_type=TransactionType.RETURN,
            quantity=quantity,
            send_store_id=manager_store_id,
            receive_store_id=to_owner_id if to_owner_type == "STORE" else None,
            remarks=remarks,
            created_by=manager_user_id,
            status=TransactionStatus.PENDING,
            transfer_direction=TransferDirection.BRANCH_TO_ADMIN if to_owner_type == "ADMIN" else TransferDirection.BRANCH_TO_BRANCH,
            requested_by_store_id=manager_store_id,
            is_request=True,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=to_inv.id,
            product_id=product_id,
            transaction_type=TransactionType.RETURN,
            quantity=quantity,
            send_store_id=manager_store_id,
            receive_store_id=to_owner_id if to_owner_type == "STORE" else None,
            remarks=remarks,
            created_by=manager_user_id,
            status=TransactionStatus.PENDING,
            transfer_direction=TransferDirection.BRANCH_TO_ADMIN if to_owner_type == "ADMIN" else TransferDirection.BRANCH_TO_BRANCH,
            requested_by_store_id=manager_store_id,
            reference_id=txn_out.id,
            is_request=True,
        )
        db.add(txn_in)
        await db.flush()

        txn_out.reference_id = txn_in.id

    await db.commit()
    await db.refresh(txn_out)
    await db.refresh(txn_in)
    return txn_out, txn_in


# ── Approval/Rejection Flow ───────────────────────────────────

async def approve_transaction_service(
    db: AsyncSession,
    txn_id: int,
    user,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Approve a pending transaction.
    Performs security checks, stock availability check, stock mutation, and notifications.
    """
    async with db.begin_nested():
        # Fetch the transaction
        stmt = (
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.send_store),
                selectinload(InventoryTransaction.receive_store),
            )
            .where(InventoryTransaction.id == txn_id)
        )
        txn = (await db.execute(stmt)).scalar_one_or_none()

        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status != TransactionStatus.PENDING:
            raise HTTPException(status_code=400, detail="Transaction is not pending")

        # Fetch sibling
        sibling = None
        if txn.reference_id:
            sib_stmt = select(InventoryTransaction).where(InventoryTransaction.id == txn.reference_id)
            sibling = (await db.execute(sib_stmt)).scalar_one_or_none()

        # Determine user role and authorize
        user_role = getattr(user, "role", None)
        role_name = getattr(user_role, "role", None) if user_role else None
        
        from models.admin import Admin
        
        is_admin = isinstance(user, Admin)
        
        if is_admin:
            approver_store_id = None
        else:
            # Store staff (Manager, Optician, Worker, etc.)
            # Rule 4 & 5: Store -> Store transfers
            if txn.transfer_direction != TransferDirection.BRANCH_TO_BRANCH:
                raise HTTPException(status_code=403, detail="Store staff can only approve store-to-store transfers")
            
            # Authorization check based on sender (Rule 4) or receiver (Rule 5)
            if txn.is_request:
                # Rule 4 (Store requests from another store) -> sender store staff must approve
                if txn.send_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to approve this request (must be the sending store staff)")
            else:
                # Rule 5 (Store pushes stock without request) -> receiving store staff must approve
                if txn.receive_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to approve this push (must be the receiving store staff)")
            approver_store_id = user.store_id

        # Load names for notifications
        snap = txn.product_snapshot
        product_name = snap.name if snap else (txn.product.name if txn.product else "Product")
        send_store_name = txn.send_store.store_name if txn.send_store else "Admin Warehouse"
        receive_store_name = txn.receive_store.store_name if txn.receive_store else "Admin Warehouse"
        admin_id = txn.product.admin_id if txn.product else user.id

        # Stock validation and mutation using FIFO
        # SENDER is Admin (Rule 3)
        if txn.send_store_id is None:
            _, consumed_batches = await _consume_stock_fifo(db, OwnerType.ADMIN, admin_id, txn.product_id, txn.quantity, label="admin warehouse")
            dest_inv_id = await _receive_stock_batches(db, OwnerType.STORE, txn.receive_store_id, txn.product_id, consumed_batches)
            
            # Update txn inventory links and metadata
            txn.inventory_id = consumed_batches[0]["inventory_id"]
            txn.consumed_batches = consumed_batches
            if sibling:
                sibling.inventory_id = dest_inv_id
                sibling.consumed_batches = consumed_batches
        else:
            # SENDER is a Store (Rule 4 and 5)
            _, consumed_batches = await _consume_stock_fifo(db, OwnerType.STORE, txn.send_store_id, txn.product_id, txn.quantity, label=f"store {send_store_name}")
            
            if txn.receive_store_id is None:
                # Stock returning to admin
                dest_inv_id = await _receive_stock_batches(db, OwnerType.ADMIN, admin_id, txn.product_id, consumed_batches)
            else:
                dest_inv_id = await _receive_stock_batches(db, OwnerType.STORE, txn.receive_store_id, txn.product_id, consumed_batches)

            # Update txn inventory links and metadata
            txn.inventory_id = consumed_batches[0]["inventory_id"]
            txn.consumed_batches = consumed_batches
            if sibling:
                sibling.inventory_id = dest_inv_id
                sibling.consumed_batches = consumed_batches

        # Update statuses
        now_ts = _now()
        for t in [txn, sibling]:
            if t:
                t.status = TransactionStatus.COMPLETED
                t.approved_by_store_id = approver_store_id
                t.approved_by_user_id = user.id
                t.approved_at = now_ts

        # Notifications
        if is_admin:
            if txn.transfer_direction == TransferDirection.BRANCH_TO_ADMIN:
                await notify_store_manager(
                    db,
                    store_id=txn.receive_store_id,
                    type=NotificationType.TRANSFER_REQUEST_APPROVED,
                    title="Request Approved",
                    message=f"Admin approved your request for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.ADMIN_TRANSFER_COMPLETED,
                    title="Request Approved",
                    message=f"Approved request from {receive_store_name} for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
            else:
                if txn.send_store_id:
                    await notify_store_manager(
                        db,
                        store_id=txn.send_store_id,
                        type=NotificationType.TRANSFER_REQUEST_APPROVED,
                        title="Transfer Approved",
                        message=f"Admin approved transfer of {txn.quantity} units of {product_name} to {receive_store_name}.",
                        txn_id=txn.id,
                    )
                if txn.receive_store_id:
                    await notify_store_manager(
                        db,
                        store_id=txn.receive_store_id,
                        type=NotificationType.TRANSFER_REQUEST_APPROVED,
                        title="Transfer Approved",
                        message=f"Admin approved transfer of {txn.quantity} units of {product_name} from {send_store_name}.",
                        txn_id=txn.id,
                    )
        else:
            if txn.is_request:
                # Rule 4 approved
                await notify_store_manager(
                    db,
                    store_id=txn.receive_store_id,
                    type=NotificationType.TRANSFER_REQUEST_APPROVED,
                    title="Request Approved",
                    message=f"{send_store_name} manager approved your request for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.ADMIN_TRANSFER_COMPLETED,
                    title="Transfer Approved",
                    message=f"{send_store_name} manager approved request from {receive_store_name} for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
            else:
                # Rule 5 approved
                await notify_store_manager(
                    db,
                    store_id=txn.send_store_id,
                    type=NotificationType.TRANSFER_REQUEST_APPROVED,
                    title="Transfer Approved",
                    message=f"{receive_store_name} manager approved your transfer of {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.ADMIN_TRANSFER_COMPLETED,
                    title="Transfer Approved",
                    message=f"{receive_store_name} manager approved transfer of {txn.quantity} units of {product_name} from {send_store_name}.",
                    txn_id=txn.id,
                )

    await db.commit()

    # Re-fetch with all relationships loaded (db.refresh doesn't reload selectin relationships)
    reload_stmt = (
        select(InventoryTransaction)
        .options(
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.send_store),
            selectinload(InventoryTransaction.receive_store),
            selectinload(InventoryTransaction.requested_by_store),
            selectinload(InventoryTransaction.approved_by_store),
        )
        .where(InventoryTransaction.id == txn.id)
    )
    txn = (await db.execute(reload_stmt)).scalar_one()

    if sibling:
        sib_reload = (
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.send_store),
                selectinload(InventoryTransaction.receive_store),
                selectinload(InventoryTransaction.requested_by_store),
                selectinload(InventoryTransaction.approved_by_store),
            )
            .where(InventoryTransaction.id == sibling.id)
        )
        sibling = (await db.execute(sib_reload)).scalar_one()

    return txn, sibling


async def reject_transaction_service(
    db: AsyncSession,
    txn_id: int,
    user,
    reason: str,
) -> tuple[InventoryTransaction, InventoryTransaction]:
    """
    Reject a pending transaction with a reason.
    No stock mutations occur.
    """
    async with db.begin_nested():
        stmt = (
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.send_store),
                selectinload(InventoryTransaction.receive_store),
            )
            .where(InventoryTransaction.id == txn_id)
        )
        txn = (await db.execute(stmt)).scalar_one_or_none()

        if not txn:
            raise HTTPException(status_code=404, detail="Transaction not found")
        if txn.status != TransactionStatus.PENDING:
            raise HTTPException(status_code=400, detail="Transaction is not pending")

        # Fetch sibling
        sibling = None
        if txn.reference_id:
            sib_stmt = select(InventoryTransaction).where(InventoryTransaction.id == txn.reference_id)
            sibling = (await db.execute(sib_stmt)).scalar_one_or_none()

        from models.admin import Admin
        
        is_admin = isinstance(user, Admin)
        
        if is_admin:
            pass
        else:
            if txn.transfer_direction != TransferDirection.BRANCH_TO_BRANCH:
                raise HTTPException(status_code=403, detail="Store staff can only reject store-to-store transfers")
            
            if txn.is_request:
                if txn.send_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to reject this request")
            else:
                if txn.receive_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to reject this push")

        snap = txn.product_snapshot
        product_name = snap.name if snap else (txn.product.name if txn.product else "Product")
        send_store_name = txn.send_store.store_name if txn.send_store else "Admin Warehouse"
        receive_store_name = txn.receive_store.store_name if txn.receive_store else "Admin Warehouse"
        admin_id = txn.product.admin_id if txn.product else user.id

        # Update statuses to REJECTED
        for t in [txn, sibling]:
            if t:
                t.status = TransactionStatus.REJECTED
                t.rejection_reason = reason

        # Notifications
        if is_admin:
            if txn.transfer_direction == TransferDirection.BRANCH_TO_ADMIN:
                await notify_store_manager(
                    db,
                    store_id=txn.receive_store_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Request Rejected",
                    message=f"Admin rejected your request for {txn.quantity} units of {product_name}. Reason: {reason}",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Request Rejected",
                    message=f"Rejected request from {receive_store_name} for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
            else:
                if txn.send_store_id:
                    await notify_store_manager(
                        db,
                        store_id=txn.send_store_id,
                        type=NotificationType.TRANSFER_REQUEST_REJECTED,
                        title="Transfer Rejected",
                        message=f"Admin rejected transfer of {txn.quantity} units of {product_name} to {receive_store_name}. Reason: {reason}",
                        txn_id=txn.id,
                    )
                if txn.receive_store_id:
                    await notify_store_manager(
                        db,
                        store_id=txn.receive_store_id,
                        type=NotificationType.TRANSFER_REQUEST_REJECTED,
                        title="Transfer Rejected",
                        message=f"Admin rejected transfer of {txn.quantity} units of {product_name} from {send_store_name}. Reason: {reason}",
                        txn_id=txn.id,
                    )
        else:
            if txn.is_request:
                # Rule 4 rejected
                await notify_store_manager(
                    db,
                    store_id=txn.receive_store_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Request Rejected",
                    message=f"{send_store_name} manager rejected your request for {txn.quantity} units of {product_name}. Reason: {reason}",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Transfer Rejected",
                    message=f"{send_store_name} manager rejected request from {receive_store_name} for {txn.quantity} units of {product_name}.",
                    txn_id=txn.id,
                )
            else:
                # Rule 5 rejected
                await notify_store_manager(
                    db,
                    store_id=txn.send_store_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Transfer Rejected",
                    message=f"{receive_store_name} manager rejected your transfer of {txn.quantity} units of {product_name}. Reason: {reason}",
                    txn_id=txn.id,
                )
                await notify_admin(
                    db,
                    admin_id=admin_id,
                    type=NotificationType.TRANSFER_REQUEST_REJECTED,
                    title="Transfer Rejected",
                    message=f"{receive_store_name} manager rejected transfer of {txn.quantity} units of {product_name} from {send_store_name}.",
                    txn_id=txn.id,
                )

    await db.commit()

    # Re-fetch with all relationships loaded (db.refresh doesn't reload selectin relationships)
    reload_stmt = (
        select(InventoryTransaction)
        .options(
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.send_store),
            selectinload(InventoryTransaction.receive_store),
            selectinload(InventoryTransaction.requested_by_store),
            selectinload(InventoryTransaction.approved_by_store),
        )
        .where(InventoryTransaction.id == txn.id)
    )
    txn = (await db.execute(reload_stmt)).scalar_one()

    if sibling:
        sib_reload = (
            select(InventoryTransaction)
            .options(
                selectinload(InventoryTransaction.product),
                selectinload(InventoryTransaction.send_store),
                selectinload(InventoryTransaction.receive_store),
                selectinload(InventoryTransaction.requested_by_store),
                selectinload(InventoryTransaction.approved_by_store),
            )
            .where(InventoryTransaction.id == sibling.id)
        )
        sibling = (await db.execute(sib_reload)).scalar_one()

    return txn, sibling


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
    async with db.begin_nested():
        owner_type = owner_type.upper()
        prod = await db.scalar(select(Product).where(Product.id == product_id))
        snapshot = await capture_product_snapshot(db, prod) if prod else None
        unit_price_val = float(prod.selling_price) if prod else None
        store_id = owner_id if owner_type == OwnerType.STORE else None

        if action in (TransactionType.DAMAGE, TransactionType.LOSS, TransactionType.SALE):
            _, consumed_batches = await _consume_stock_fifo(
                db, owner_type, owner_id, product_id, quantity, label=f"{owner_type}:{owner_id}"
            )
            inv_id = consumed_batches[0]["inventory_id"]
        elif action == TransactionType.RETURN:
            # Fetch existing reorder level if any
            existing_reorder_level = 0
            stmt_reorder = select(Inventory.reorder_level).where(
                Inventory.product_id == product_id,
                Inventory.owner_type == owner_type,
                Inventory.owner_id == owner_id
            ).limit(1)
            reorder_res = await db.execute(stmt_reorder)
            row_reorder = reorder_res.scalar()
            if row_reorder is not None:
                existing_reorder_level = row_reorder

            cost = prod.cost_price if prod else Decimal("0.00")
            
            # Get primary supplier for the product if available
            from models.supplier_product import SupplierProduct
            stmt_sp = select(SupplierProduct.supplier_id).where(
                SupplierProduct.product_id == product_id,
                SupplierProduct.is_active.is_(True)
            ).limit(1)
            sp_res = await db.execute(stmt_sp)
            supplier_id = sp_res.scalar()
            
            # Create a new inventory batch for returned stock
            inventory = Inventory(
                owner_type=owner_type,
                owner_id=owner_id,
                product_id=product_id,
                quantity=quantity,
                available_quantity=quantity,
                reserved_quantity=0,
                reorder_level=existing_reorder_level,
                last_purchase_price=cost,
                last_stock_in_at=datetime.now(timezone.utc),
                purchase_date=datetime.now(timezone.utc),
                initial_quantity=quantity,
                purchase_cost=cost,
                supplier_id=supplier_id,
            )
            db.add(inventory)
            await db.flush()
            inv_id = inventory.id
            consumed_batches = None
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported stock action: {action}",
            )

        txn = InventoryTransaction(
            inventory_id=inv_id,
            product_id=product_id,
            product_snapshot_id=snapshot.id if snapshot else None,
            unit_price=unit_price_val,
            total_value=unit_price_val * quantity if unit_price_val else None,
            transaction_type=action,
            quantity=quantity,
            send_store_id=store_id if action != TransactionType.RETURN else None,
            receive_store_id=store_id if action == TransactionType.RETURN else None,
            remarks=remarks,
            created_by=created_by,
            status=TransactionStatus.COMPLETED,
            consumed_batches=consumed_batches,
        )
        db.add(txn)
        await db.flush()

        from services.product_unit_service import mark_units_damaged, mark_units_lost, mark_units_sold, create_units_for_batch
        from models.product_unit import UnitSourceType
        
        owner_type_enum = OwnerType(owner_type) if isinstance(owner_type, str) else owner_type
        if action == TransactionType.DAMAGE:
            await mark_units_damaged(db, product_id, owner_type_enum, owner_id, quantity)
        elif action == TransactionType.LOSS:
            await mark_units_lost(db, product_id, owner_type_enum, owner_id, quantity)
        elif action == TransactionType.SALE:
            await mark_units_sold(db, product_id, owner_type_enum, owner_id, quantity)
        elif action == TransactionType.RETURN:
            await create_units_for_batch(
                db=db,
                product_id=product_id,
                product_sku=prod.sku if prod else "SKU",
                inventory_batch_id=inv_id,
                count=quantity,
                owner_type=owner_type_enum,
                owner_id=owner_id,
                source_type=UnitSourceType.RETURN,
            )

    await db.commit()
    await db.refresh(txn)
    return txn


# ── Transaction History & Filtered Queries ─────────────────────

async def get_transaction_history(
    db: AsyncSession,
    admin_id: int,
    product_id: int | None = None,
    inventory_id: int | None = None,
    transaction_type: str | None = None,
    store_id: int | str | None = None,
    limit: int = 50,
    offset: int = 0,
    search: str | None = None,
) -> tuple[list[InventoryTransaction], int]:
    """Fallback legacy query method, maps to get_transactions_filtered."""
    return await get_transactions_filtered(
        db=db,
        admin_id=admin_id,
        status=None,
        transfer_direction=None,
        is_request=None,
        store_id=store_id,
        product_id=product_id,
        transaction_type=transaction_type,
        search=search,
        limit=limit,
        offset=offset,
    )


async def get_transactions_filtered(
    db: AsyncSession,
    admin_id: int,
    status: str | None = None,
    transfer_direction: str | None = None,
    is_request: bool | None = None,
    store_id: int | str | None = None,
    product_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    transaction_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[InventoryTransaction], int]:
    """
    Fetch transaction history with advanced query filters.
    Scoped to the admin's inventory records and stores.
    """
    is_admin_warehouse = False
    numeric_store_id = None
    if store_id is not None:
        if str(store_id).lower() == "admin":
            is_admin_warehouse = True
        else:
            try:
                numeric_store_id = int(store_id)
            except ValueError:
                pass

    # Get valid store IDs for this admin
    store_ids_stmt = select(Store.id).where(Store.admin_id == admin_id)
    store_result = await db.execute(store_ids_stmt)
    store_ids = [row[0] for row in store_result.fetchall()]

    inv_stmt = select(Inventory.id).where(
        or_(
            and_(Inventory.owner_type == OwnerType.ADMIN, Inventory.owner_id == admin_id),
            and_(Inventory.owner_type == OwnerType.STORE, Inventory.owner_id.in_(store_ids)) if store_ids else False,
        )
    )
    inv_result = await db.execute(inv_stmt)
    valid_inv_ids = [row[0] for row in inv_result.fetchall()]

    if not valid_inv_ids:
        return [], 0

    filters = [
        InventoryTransaction.inventory_id.in_(valid_inv_ids),
        InventoryTransaction.transaction_type.not_in([
            TransactionType.ADMIN_TRANSFER_IN,
            TransactionType.STORE_TRANSFER_IN,
        ])
    ]

    if status:
        filters.append(InventoryTransaction.status == status.upper())
    if transfer_direction:
        td_upper = transfer_direction.upper()
        if td_upper == "INCOMING":
            if is_admin_warehouse:
                filters.append(InventoryTransaction.receive_store_id == None)
            elif numeric_store_id is not None:
                filters.append(InventoryTransaction.receive_store_id == numeric_store_id)
        elif td_upper == "OUTGOING":
            if is_admin_warehouse:
                filters.append(InventoryTransaction.send_store_id == None)
            elif numeric_store_id is not None:
                filters.append(InventoryTransaction.send_store_id == numeric_store_id)
        else:
            filters.append(InventoryTransaction.transfer_direction == td_upper)
    if is_request is not None:
        filters.append(InventoryTransaction.is_request == is_request)
    if product_id is not None:
        filters.append(InventoryTransaction.product_id == product_id)
    if transaction_type:
        t_type = transaction_type.upper()
        if t_type == "INVENTORY TRANSFER" or t_type == "TRANSFER":
            filters.append(
                InventoryTransaction.transaction_type.in_([
                    TransactionType.ADMIN_TRANSFER_OUT,
                    TransactionType.ADMIN_TRANSFER_IN,
                    TransactionType.STORE_TRANSFER_OUT,
                    TransactionType.STORE_TRANSFER_IN,
                ])
            )
        else:
            filters.append(InventoryTransaction.transaction_type == t_type)
    if date_from:
        filters.append(InventoryTransaction.created_at >= date_from)
    if date_to:
        filters.append(InventoryTransaction.created_at <= date_to)

    if is_admin_warehouse:
        # Aggregated view: do not narrow transactions to only the admin warehouse.
        # Shows all transactions across all branches owned by this admin.
        pass
    elif numeric_store_id is not None:
        filters.append(
            or_(
                InventoryTransaction.send_store_id == numeric_store_id,
                InventoryTransaction.receive_store_id == numeric_store_id,
                InventoryTransaction.requested_by_store_id == numeric_store_id,
                InventoryTransaction.approved_by_store_id == numeric_store_id,
            )
        )

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        search_filters = [
            Product.name.ilike(search_term),
            Product.sku.ilike(search_term),
            InventoryTransaction.remarks.ilike(search_term),
        ]
        # Try to parse as numeric ID (supports plain numbers and TXN-XXXXXX format)
        raw = search.strip()
        numeric_str = raw
        if raw.upper().startswith("TXN-"):
            numeric_str = raw[4:]  # strip "TXN-" prefix
        try:
            val = int(numeric_str)
            # Check if this transaction exists and is an excluded TRANSFER_IN type
            # (which means its sibling TRANSFER_OUT is the one actually displayed)
            check_stmt = select(
                InventoryTransaction.transaction_type,
                InventoryTransaction.reference_id
            ).where(InventoryTransaction.id == val)
            check_res = await db.execute(check_stmt)
            row = check_res.first()
            if row:
                txn_type, ref_id = row
                if txn_type in (TransactionType.ADMIN_TRANSFER_IN, TransactionType.STORE_TRANSFER_IN) and ref_id:
                    # Map to the TRANSFER_OUT transaction
                    search_filters.append(InventoryTransaction.id == ref_id)
                else:
                    search_filters.append(InventoryTransaction.id == val)
            else:
                search_filters.append(InventoryTransaction.id == val)
        except ValueError:
            pass

        # Subquery to search matching store names
        store_search_stmt = select(Store.id).where(Store.store_name.ilike(search_term))
        matched_stores = [row[0] for row in (await db.execute(store_search_stmt)).fetchall()]
        if matched_stores:
            search_filters.append(
                or_(
                    InventoryTransaction.send_store_id.in_(matched_stores),
                    InventoryTransaction.receive_store_id.in_(matched_stores),
                )
            )

        filters.append(or_(*search_filters))

    # Perform queries joining Product for search capabilities
    count_stmt = (
        select(func.count())
        .select_from(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .where(*filters)
    )
    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one() or 0)

    stmt = (
        select(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .options(
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.send_store),
            selectinload(InventoryTransaction.receive_store),
            selectinload(InventoryTransaction.requested_by_store),
            selectinload(InventoryTransaction.approved_by_store),
        )
        .where(*filters)
        .order_by(desc(InventoryTransaction.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def get_warehouse_transactions(
    db: AsyncSession,
    admin_id: int,
    status: str | None = None,
    product_id: int | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    transaction_type: str | None = None,
    search: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[InventoryTransaction], int]:
    """
    Fetch transaction history for the admin warehouse.
    Only returns transactions that mutated or occurred on the warehouse inventory.
    """
    # 1. Get warehouse inventory IDs
    warehouse_inv_stmt = select(Inventory.id).where(
        Inventory.owner_type == OwnerType.ADMIN,
        Inventory.owner_id == admin_id
    )
    warehouse_inv_res = await db.execute(warehouse_inv_stmt)
    warehouse_inv_ids = [row[0] for row in warehouse_inv_res.fetchall()]

    if not warehouse_inv_ids:
        return [], 0

    filters = [
        InventoryTransaction.inventory_id.in_(warehouse_inv_ids),
        InventoryTransaction.transaction_type.not_in([
            TransactionType.ADMIN_TRANSFER_IN,
            TransactionType.STORE_TRANSFER_IN,
        ])
    ]

    if status:
        filters.append(InventoryTransaction.status == status.upper())
    if product_id is not None:
        filters.append(InventoryTransaction.product_id == product_id)
    if transaction_type:
        t_type = transaction_type.upper()
        if t_type == "INVENTORY TRANSFER" or t_type == "TRANSFER":
            filters.append(
                InventoryTransaction.transaction_type.in_([
                    TransactionType.ADMIN_TRANSFER_OUT,
                    TransactionType.ADMIN_TRANSFER_IN,
                    TransactionType.STORE_TRANSFER_OUT,
                    TransactionType.STORE_TRANSFER_IN,
                ])
            )
        else:
            filters.append(InventoryTransaction.transaction_type == t_type)
    if date_from:
        filters.append(InventoryTransaction.created_at >= date_from)
    if date_to:
        filters.append(InventoryTransaction.created_at <= date_to)

    if search and search.strip():
        search_term = f"%{search.strip()}%"
        search_filters = [
            Product.name.ilike(search_term),
            Product.sku.ilike(search_term),
            InventoryTransaction.remarks.ilike(search_term),
        ]
        raw = search.strip()
        numeric_str = raw
        if raw.upper().startswith("TXN-"):
            numeric_str = raw[4:]
        try:
            val = int(numeric_str)
            check_stmt = select(
                InventoryTransaction.transaction_type,
                InventoryTransaction.reference_id
            ).where(InventoryTransaction.id == val)
            check_res = await db.execute(check_stmt)
            row = check_res.first()
            if row:
                txn_type, ref_id = row
                if txn_type in (TransactionType.ADMIN_TRANSFER_IN, TransactionType.STORE_TRANSFER_IN) and ref_id:
                    search_filters.append(InventoryTransaction.id == ref_id)
                else:
                    search_filters.append(InventoryTransaction.id == val)
            else:
                search_filters.append(InventoryTransaction.id == val)
        except ValueError:
            pass

        # Subquery to search matching store names
        store_search_stmt = select(Store.id).where(Store.store_name.ilike(search_term))
        matched_stores = [row[0] for row in (await db.execute(store_search_stmt)).fetchall()]
        if matched_stores:
            search_filters.append(
                or_(
                    InventoryTransaction.send_store_id.in_(matched_stores),
                    InventoryTransaction.receive_store_id.in_(matched_stores),
                )
            )

        filters.append(or_(*search_filters))

    count_stmt = (
        select(func.count())
        .select_from(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .where(*filters)
    )
    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one() or 0)

    stmt = (
        select(InventoryTransaction)
        .join(Product, Product.id == InventoryTransaction.product_id)
        .options(
            selectinload(InventoryTransaction.product),
            selectinload(InventoryTransaction.send_store),
            selectinload(InventoryTransaction.receive_store),
            selectinload(InventoryTransaction.requested_by_store),
            selectinload(InventoryTransaction.approved_by_store),
        )
        .where(*filters)
        .order_by(desc(InventoryTransaction.created_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all()), total
