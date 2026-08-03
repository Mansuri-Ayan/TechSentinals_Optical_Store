# Service: deadstock_service.py
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, and_, or_, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from models.deadstock_item import DeadstockItem, DeadstockStatus
from models.exchange import Exchange
from models.sale_item import SaleItem
from models.product import Product
from models.inventory import Inventory, OwnerType
from models.inventory_transaction import InventoryTransaction, TransactionType
from services.inventory_service import get_or_create_inventory
from services.snapshot_service import capture_product_snapshot


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def create_deadstock_from_exchange(
    db: AsyncSession,
    exchange: Exchange,
    original_item: SaleItem,
    exchange_qty: int,
    admin_id: int,
    store_id: int,
) -> list[DeadstockItem]:
    """
    Create DeadstockItem record(s) for exchanged product line.
    Creates 1 record per unit (quantity=1 each) for individual unit tracking.
    """
    product = await db.scalar(select(Product).where(Product.id == original_item.product_id))
    if not product:
        category_name = "Other"
        sku = "UNKNOWN"
        unit_price = Decimal("0.00")
    else:
        category_name = product.category.name if product.category else "Other"
        sku = product.sku
        unit_price = (original_item.line_total / Decimal(original_item.quantity)).quantize(Decimal("0.01")) if original_item.quantity else product.selling_price

    created_items = []
    for _ in range(exchange_qty):
        ds_item = DeadstockItem(
            admin_id=admin_id,
            store_id=store_id,
            product_id=original_item.product_id,
            inventory_id=original_item.inventory_id,
            exchange_id=exchange.id,
            original_sale_item_id=original_item.id,
            sku=sku,
            category_name=category_name,
            quantity=1,
            original_price=unit_price,
            status=DeadstockStatus.AVAILABLE,
            is_exchanged=True,
            notes=f"Exchanged from invoice {exchange.original_sale.invoice_number if exchange.original_sale else 'N/A'} (EXC: {exchange.exchange_number})",
        )
        db.add(ds_item)
        created_items.append(ds_item)

    await db.flush()
    return created_items


async def get_deadstock_item(db: AsyncSession, item_id: int) -> DeadstockItem | None:
    stmt = (
        select(DeadstockItem)
        .options(
            selectinload(DeadstockItem.product).selectinload(Product.category),
            selectinload(DeadstockItem.product).selectinload(Product.brand),
            selectinload(DeadstockItem.exchange),
            selectinload(DeadstockItem.store),
            selectinload(DeadstockItem.original_sale_item),
        )
        .where(DeadstockItem.id == item_id)
    )
    res = await db.execute(stmt)
    return res.scalar_one_or_none()


async def list_deadstock(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    category: str | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[DeadstockItem], int, dict]:
    """
    List deadstock items with filters, search, pagination, and category counts.
    """
    base_conditions = [DeadstockItem.admin_id == admin_id]
    if store_id:
        base_conditions.append(DeadstockItem.store_id == store_id)

    # Calculate category counts across all deadstock items in scope
    count_stmt = (
        select(
            DeadstockItem.category_name,
            sa_func.count(DeadstockItem.id)
        )
        .where(*base_conditions)
        .group_by(DeadstockItem.category_name)
    )
    cat_res = await db.execute(count_stmt)
    cat_counts = {row[0].lower(): row[1] for row in cat_res.all()}

    total_all = sum(cat_counts.values())
    counts_dict = {
        "frames_count": cat_counts.get("frames", 0),
        "lenses_count": cat_counts.get("lenses", 0),
        "accessories_count": cat_counts.get("accessories", 0),
        "other_count": total_all - (cat_counts.get("frames", 0) + cat_counts.get("lenses", 0) + cat_counts.get("accessories", 0)),
        "total_count": total_all,
    }

    # Applied query conditions
    query_conditions = list(base_conditions)
    if category and category.lower() != "all":
        query_conditions.append(sa_func.lower(DeadstockItem.category_name) == category.lower())

    if status_filter and status_filter.lower() != "all":
        query_conditions.append(DeadstockItem.status == status_filter.upper())

    if search:
        s = f"%{search.strip()}%"
        # Search by SKU, category, notes, or product name
        prod_exists = select(Product.id).where(
            Product.id == DeadstockItem.product_id,
            Product.name.ilike(s)
        ).exists()

        query_conditions.append(
            or_(
                DeadstockItem.sku.ilike(s),
                DeadstockItem.category_name.ilike(s),
                DeadstockItem.notes.ilike(s),
                prod_exists
            )
        )

    # Total matching query count
    total_stmt = select(sa_func.count(DeadstockItem.id)).where(*query_conditions)
    total_matching = (await db.execute(total_stmt)).scalar() or 0

    # Data query
    stmt = (
        select(DeadstockItem)
        .options(
            selectinload(DeadstockItem.product).selectinload(Product.category),
            selectinload(DeadstockItem.product).selectinload(Product.brand),
            selectinload(DeadstockItem.exchange),
            selectinload(DeadstockItem.store),
            selectinload(DeadstockItem.original_sale_item),
        )
        .where(*query_conditions)
        .order_by(DeadstockItem.created_at.desc())
    )

    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    res = await db.execute(stmt)
    items = list(res.scalars().all())

    # Enrich item objects with denormalized fields
    for item in items:
        if item.product:
            item.product_name = item.product.name
            item.brand_name = item.product.brand.name if item.product.brand else "Generic"
        if item.store:
            item.store_name = item.store.store_name
        if item.exchange:
            item.exchange_number = item.exchange.exchange_number
            if item.exchange.original_sale:
                item.original_invoice_number = item.exchange.original_sale.invoice_number

    return items, total_matching, counts_dict


async def reuse_deadstock(
    db: AsyncSession,
    item_id: int,
    admin_id: int,
    user_id: int | None = None,
) -> tuple[DeadstockItem, Inventory]:
    """
    Reuse a deadstock item (frames/accessories):
    1. Validates status is AVAILABLE.
    2. Moves 1 unit back into regular store/admin inventory (adds to quantity & available_quantity).
    3. Creates an InventoryTransaction(PURCHASE/RETURN).
    4. Sets deadstock item status to REUSED, is_exchanged to False, and updates reused_at.
    """
    ds_item = await get_deadstock_item(db, item_id)
    if not ds_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deadstock item not found.",
        )

    if ds_item.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this deadstock item.",
        )

    if ds_item.status != DeadstockStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Deadstock item cannot be reused because it is currently {ds_item.status.value}.",
        )

    # Restore 1 unit to store inventory
    inventory = await get_or_create_inventory(
        db, "STORE", ds_item.store_id, ds_item.product_id
    )

    inventory.quantity += ds_item.quantity
    inventory.available_quantity += ds_item.quantity
    inventory.last_stock_in_at = _now()
    inventory.is_active = True

    # Capture snapshot
    product = await db.scalar(select(Product).where(Product.id == ds_item.product_id))
    snapshot = await capture_product_snapshot(db, product)

    # Record inventory transaction
    txn = InventoryTransaction(
        inventory_id=inventory.id,
        product_id=ds_item.product_id,
        product_snapshot_id=snapshot.id,
        unit_price=ds_item.original_price,
        total_value=ds_item.original_price * ds_item.quantity,
        transaction_type=TransactionType.PURCHASE,
        quantity=ds_item.quantity,
        reference_id=ds_item.id,
        remarks=f"Reused from Deadstock (SKU: {ds_item.sku})",
        created_by=user_id or admin_id,
    )
    db.add(txn)

    # Update deadstock status
    ds_item.status = DeadstockStatus.REUSED
    ds_item.is_exchanged = False
    ds_item.reused_at = _now()

    await db.commit()
    await db.refresh(ds_item)
    return ds_item, inventory


async def list_deadstock_for_pos(
    db: AsyncSession,
    admin_id: int,
    store_id: int,
    category: str | None = None,
) -> list[DeadstockItem]:
    """
    List AVAILABLE deadstock items for POS product selection step.
    """
    conditions = [
        DeadstockItem.admin_id == admin_id,
        DeadstockItem.store_id == store_id,
        DeadstockItem.status == DeadstockStatus.AVAILABLE,
    ]

    if category and category.lower() != "all":
        conditions.append(sa_func.lower(DeadstockItem.category_name) == category.lower())

    stmt = (
        select(DeadstockItem)
        .options(
            selectinload(DeadstockItem.product).selectinload(Product.category),
            selectinload(DeadstockItem.product).selectinload(Product.brand),
            selectinload(DeadstockItem.exchange),
        )
        .where(*conditions)
        .order_by(DeadstockItem.created_at.desc())
    )

    res = await db.execute(stmt)
    items = list(res.scalars().all())

    for item in items:
        if item.product:
            item.product_name = item.product.name
            item.brand_name = item.product.brand.name if item.product.brand else "Generic"
        if item.exchange:
            item.exchange_number = item.exchange.exchange_number

    return items


async def mark_deadstock_sold(
    db: AsyncSession,
    item_id: int,
    sale_id: int,
) -> DeadstockItem:
    """
    Mark a deadstock item as SOLD when selected and paid for in POS.
    """
    ds_item = await db.scalar(select(DeadstockItem).where(DeadstockItem.id == item_id))
    if not ds_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Deadstock item {item_id} not found.",
        )

    ds_item.status = DeadstockStatus.SOLD
    ds_item.is_exchanged = False
    ds_item.sold_in_sale_id = sale_id
    await db.flush()
    return ds_item


async def cancel_deadstock_for_exchange(
    db: AsyncSession,
    exchange_id: int,
) -> None:
    """
    Remove or invalidate deadstock items created by an exchange if the exchange is cancelled.
    """
    stmt = select(DeadstockItem).where(DeadstockItem.exchange_id == exchange_id)
    res = await db.execute(stmt)
    items = res.scalars().all()
    for item in items:
        await db.delete(item)
    await db.flush()
