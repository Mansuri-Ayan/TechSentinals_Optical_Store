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
        inventory = await get_or_create_inventory(
            db,
            owner_type=ot,
            owner_id=oid,
            product_id=product_id,
        )

        await _increase_stock(inventory, quantity)
        inventory.last_purchase_price = purchase_price

        # If purchasing into a store, set receive_store_id for display
        receive_store = oid if ot == OwnerType.STORE else None

        txn = InventoryTransaction(
            inventory_id=inventory.id,
            product_id=product_id,
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
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.ADMIN_TO_BRANCH,
            is_request=False,
        )
        db.add(txn_out)
        await db.flush()  # get txn_out.id

        # Transaction: IN to store
        txn_in = InventoryTransaction(
            inventory_id=store_inv.id,
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
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_ADMIN,
            is_request=False,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=admin_inv.id,
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
            status=TransactionStatus.COMPLETED,
            transfer_direction=TransferDirection.BRANCH_TO_BRANCH,
            is_request=False,
        )
        db.add(txn_out)
        await db.flush()

        txn_in = InventoryTransaction(
            inventory_id=to_inv.id,
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
        
        # Fallback if roles relation is simple string (check core/deps.py style)
        from models.admin import Admin
        from models.manager import Manager
        
        is_admin = isinstance(user, Admin)
        is_manager = isinstance(user, Manager)
        
        if is_admin:
            approver_store_id = None
        elif is_manager:
            # Rule 4 & 5: Store -> Store transfers
            if txn.transfer_direction != TransferDirection.BRANCH_TO_BRANCH:
                raise HTTPException(status_code=403, detail="Manager can only approve store-to-store transfers")
            
            # Authorization check based on sender (Rule 4) or receiver (Rule 5)
            if txn.is_request:
                # Rule 4 (Manager requests from another store's manager) -> sender store manager must approve
                if txn.send_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to approve this request (must be the sending store manager)")
            else:
                # Rule 5 (Manager pushes stock without request) -> receiving store manager must approve
                if txn.receive_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to approve this push (must be the receiving store manager)")
            approver_store_id = user.store_id
        else:
            raise HTTPException(status_code=403, detail="Role not authorized to approve transactions")

        # Load names for notifications
        product_name = txn.product.name if txn.product else "Product"
        send_store_name = txn.send_store.store_name if txn.send_store else "Admin Warehouse"
        receive_store_name = txn.receive_store.store_name if txn.receive_store else "Admin Warehouse"
        admin_id = txn.product.admin_id if txn.product else user.id

        # Stock validation and mutation
        # SENDER is Admin (Rule 3)
        if txn.send_store_id is None:
            admin_inv = await get_or_create_inventory(db, OwnerType.ADMIN, admin_id, txn.product_id)
            await _decrease_stock(admin_inv, txn.quantity, label="admin warehouse")
            
            store_inv = await get_or_create_inventory(db, OwnerType.STORE, txn.receive_store_id, txn.product_id)
            await _increase_stock(store_inv, txn.quantity)
        else:
            # SENDER is a Store (Rule 4 and 5)
            send_store_inv = await get_or_create_inventory(db, OwnerType.STORE, txn.send_store_id, txn.product_id)
            await _decrease_stock(send_store_inv, txn.quantity, label=f"store {send_store_name}")
            
            if txn.receive_store_id is None:
                # Stock returning to admin (not typical for pending, but handled just in case)
                admin_inv = await get_or_create_inventory(db, OwnerType.ADMIN, admin_id, txn.product_id)
                await _increase_stock(admin_inv, txn.quantity)
            else:
                receive_store_inv = await get_or_create_inventory(db, OwnerType.STORE, txn.receive_store_id, txn.product_id)
                await _increase_stock(receive_store_inv, txn.quantity)

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

        # Determine user role and authorize
        from models.admin import Admin
        from models.manager import Manager
        
        is_admin = isinstance(user, Admin)
        is_manager = isinstance(user, Manager)
        
        if is_admin:
            pass
        elif is_manager:
            if txn.transfer_direction != TransferDirection.BRANCH_TO_BRANCH:
                raise HTTPException(status_code=403, detail="Manager can only reject store-to-store transfers")
            
            if txn.is_request:
                if txn.send_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to reject this request")
            else:
                if txn.receive_store_id != user.store_id:
                    raise HTTPException(status_code=403, detail="You are not authorized to reject this push")
        else:
            raise HTTPException(status_code=403, detail="Role not authorized to reject transactions")

        product_name = txn.product.name if txn.product else "Product"
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
            status=TransactionStatus.COMPLETED,
        )
        db.add(txn)

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
        admin_inv_stmt = select(Inventory.id).where(
            Inventory.owner_type == OwnerType.ADMIN,
            Inventory.owner_id == admin_id
        )
        admin_inv_result = await db.execute(admin_inv_stmt)
        admin_inv_ids = [row[0] for row in admin_inv_result.fetchall()]

        filters.append(
            or_(
                InventoryTransaction.inventory_id.in_(admin_inv_ids),
                and_(
                    InventoryTransaction.transaction_type.in_([
                        TransactionType.ADMIN_TRANSFER_OUT,
                        TransactionType.ADMIN_TRANSFER_IN,
                        TransactionType.STORE_TRANSFER_OUT,
                        TransactionType.STORE_TRANSFER_IN,
                    ]),
                    or_(
                        InventoryTransaction.send_store_id == None,
                        InventoryTransaction.receive_store_id == None,
                    )
                )
            )
        )
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
