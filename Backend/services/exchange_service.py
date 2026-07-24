# Service: exchange_service.py
from datetime import datetime, timezone, date
from decimal import Decimal
from sqlalchemy import select, and_, or_, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from models.exchange import Exchange, ExchangeStatus
from models.sale import Sale, SaleStatus, StaffType
from models.sale_item import SaleItem
from models.sale_payment import SalePayment, SalePaymentMethod
from models.product import Product
from models.inventory import Inventory
from models.inventory_transaction import InventoryTransaction, TransactionType
from services.inventory_service import get_or_create_inventory
from services.snapshot_service import capture_product_snapshot
from services.bill_service import update_bill_for_sale
from services.product_unit_service import restore_units_from_sale_item, assign_units_to_sale_item
from models.inventory import OwnerType
from schemas.exchange import ExchangeCreate


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _compute_line_total(
    qty: int,
    unit_price: Decimal,
    tax_pct: Decimal,
    discount_pct: Decimal,
) -> Decimal:
    """(unit_price × qty) × (1 - discount/100) × (1 + tax/100)"""
    base = unit_price * qty
    after_discount = base * (Decimal("1") - discount_pct / Decimal("100"))
    with_tax = after_discount * (Decimal("1") + tax_pct / Decimal("100"))
    return with_tax.quantize(Decimal("0.01"))


async def _generate_exchange_number(db: AsyncSession, admin_id: int) -> str:
    """Auto-generate a sequential exchange number like EXC-2026-00001."""
    year = datetime.now(timezone.utc).year
    prefix = f"EXC-{year}-"
    stmt = (
        select(sa_func.count())
        .select_from(Exchange)
        .where(
            Exchange.admin_id == admin_id,
            Exchange.exchange_number.like(f"{prefix}%"),
        )
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return f"{prefix}{count + 1:05d}"


async def _generate_invoice_number(db: AsyncSession, admin_id: int) -> str:
    """Auto-generate a sequential invoice number like INV-2026-00001."""
    year = datetime.now(timezone.utc).year
    prefix = f"INV-{year}-"
    stmt = (
        select(sa_func.count())
        .select_from(Sale)
        .where(
            Sale.admin_id == admin_id,
            Sale.invoice_number.like(f"{prefix}%"),
        )
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return f"{prefix}{count + 1:05d}"


async def create_exchange(
    db: AsyncSession,
    admin_id: int,
    payload: ExchangeCreate,
) -> Exchange:
    """
    Atomically process an inventory exchange:
    1. Validates original sale & item.
    2. Enforces replacement items total >= exchange credit.
    3. Restores returned item back to inventory (EXCHANGE_IN).
    4. Creates a new completed Sale for replacement items using exchange credit as discount.
    5. Deducts inventory for new items (EXCHANGE_OUT).
    6. Stores Exchange mapping.
    """
    # ── 1. Validate Original Sale ──
    sale_stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.id == payload.original_sale_id, Sale.admin_id == admin_id)
    )
    sale_res = await db.execute(sale_stmt)
    original_sale = sale_res.scalar_one_or_none()
    if not original_sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original sale not found.",
        )
    if original_sale.status in (SaleStatus.CANCELLED, SaleStatus.REFUNDED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot exchange from a {original_sale.status.value.lower()} sale.",
        )

    # ── 2. Validate Original Sale Item(s) ──
    item_ids = []
    if payload.original_sale_item_ids:
        item_ids = list(payload.original_sale_item_ids)
    elif payload.original_sale_item_id:
        item_ids = [payload.original_sale_item_id]

    if not item_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No original sale items selected for exchange.",
        )

    original_items = []
    for target_id in item_ids:
        found_item = None
        for item in original_sale.items:
            if item.id == target_id:
                found_item = item
                break
        if not found_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Item {target_id} not found in the original sale.",
            )

        # Check if item was already exchanged
        existing_exc_stmt = select(Exchange).where(
            Exchange.original_sale_item_id == found_item.id,
            Exchange.status == ExchangeStatus.COMPLETED,
        )
        existing_exc_res = await db.execute(existing_exc_stmt)
        if existing_exc_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item '{found_item.product.name if found_item.product else found_item.id}' has already been exchanged.",
            )
        original_items.append(found_item)

    # ── 3. Financial calculations ──
    exchange_credit = sum(item.line_total for item in original_items)
    
    # Replacement items
    new_subtotal = Decimal("0")
    new_total_discount = Decimal("0")
    new_total_tax = Decimal("0")
    new_items_total = Decimal("0")
    sale_items_to_create = []

    for new_item in payload.new_items:
        prod_stmt = select(Product).where(Product.id == new_item.product_id)
        prod_res = await db.execute(prod_stmt)
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Replacement product {new_item.product_id} not found.",
            )

        line_total = _compute_line_total(
            new_item.quantity,
            new_item.unit_price,
            new_item.tax_percent,
            new_item.discount_percent,
        )
        base = new_item.unit_price * new_item.quantity
        disc_amt = base * new_item.discount_percent / Decimal("100")
        after_disc = base - disc_amt
        tax_amt = after_disc * new_item.tax_percent / Decimal("100")

        new_subtotal += base
        new_total_discount += disc_amt
        new_total_tax += tax_amt
        new_items_total += line_total

        # Product Snapshot
        snapshot = await capture_product_snapshot(db, product)

        sale_item = SaleItem(
            product_id=new_item.product_id,
            product_snapshot_id=snapshot.id,
            inventory_id=new_item.inventory_id,
            quantity=new_item.quantity,
            unit_price=new_item.unit_price,
            unit_cost=product.cost_price,
            discount_percent=new_item.discount_percent,
            tax_percent=new_item.tax_percent,
            line_total=line_total,
            notes=new_item.notes,
        )
        sale_items_to_create.append((sale_item, product, snapshot))

    # Enforce minimum rule: new_items_total >= exchange_credit
    if new_items_total < exchange_credit:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Exchange rejected: Replacement items total value (₹{new_items_total:.2f}) "
                f"must be greater than or equal to the exchanged item value (₹{exchange_credit:.2f})."
            ),
        )

    additional_payment = new_items_total - exchange_credit

    # Validate additional payment coverage
    payment_sum = sum(p.amount for p in payload.payments)
    if payment_sum < additional_payment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Additional payment of ₹{additional_payment:.2f} is required, "
                f"but only ₹{payment_sum:.2f} was provided."
            ),
        )

    # ── 4. Restore original items to inventory (EXCHANGE_IN) ──
    for original_item in original_items:
        orig_inv_id = original_item.inventory_id
        if not orig_inv_id:
            orig_inventory = await get_or_create_inventory(
                db, "STORE", payload.store_id, original_item.product_id
            )
        else:
            orig_inventory = await db.scalar(
                select(Inventory).where(Inventory.id == orig_inv_id)
            )

        if orig_inventory:
            orig_inventory.quantity += original_item.quantity
            orig_inventory.available_quantity += original_item.quantity
            orig_inventory.last_stock_in_at = _now()

            # Capture snapshot for transaction tracking
            orig_product = await db.scalar(
                select(Product).where(Product.id == original_item.product_id)
            )
            orig_snapshot = await capture_product_snapshot(db, orig_product)

            exc_in_txn = InventoryTransaction(
                inventory_id=orig_inventory.id,
                product_id=original_item.product_id,
                product_snapshot_id=orig_snapshot.id,
                unit_price=original_item.unit_price,
                total_value=original_item.line_total,
                transaction_type=TransactionType.EXCHANGE_IN,
                quantity=original_item.quantity,
                reference_id=original_sale.id,
                remarks=f"Returned via Exchange",
                created_by=payload.processed_by_id,
            )
            db.add(exc_in_txn)
            await db.flush()

            # Restore original units
            await restore_units_from_sale_item(db=db, sale_item_id=original_item.id)

    # ── 5. Create new Sale for replacement items ──
    new_invoice = await _generate_invoice_number(db, admin_id)
    
    # Store-level discount amount includes the exchange credit
    sale_discount_amount = exchange_credit
    sale_total_amount = max(new_items_total - exchange_credit, Decimal("0"))
    
    new_payments = []
    for pay_data in payload.payments:
        payment = SalePayment(
            amount=pay_data.amount,
            payment_method=pay_data.payment_method,
            reference_number=pay_data.reference_number,
            remarks=pay_data.remarks,
        )
        new_payments.append(payment)

    sale_items_unpacked = [si for si, _p, _s in sale_items_to_create]

    new_sale = Sale(
        invoice_number=new_invoice,
        admin_id=admin_id,
        store_id=payload.store_id,
        customer_id=payload.customer_id,
        sold_by_type=payload.processed_by_type,
        sold_by_id=payload.processed_by_id,
        sale_date=payload.exchange_date,
        status=SaleStatus.COMPLETED,
        subtotal=new_subtotal.quantize(Decimal("0.01")),
        discount_amount=sale_discount_amount.quantize(Decimal("0.01")),
        tax_amount=new_total_tax.quantize(Decimal("0.01")),
        total_amount=sale_total_amount.quantize(Decimal("0.01")),
        paid_amount=payment_sum.quantize(Decimal("0.01")),
        due_amount=Decimal("0.00"),
        notes=payload.notes or "Created via Exchange",
        items=sale_items_unpacked,
        payments=new_payments,
        lab_status="Confirmed",
    )
    db.add(new_sale)
    await db.flush()  # Assign new_sale.id

    # Deduct inventory for new items
    for sale_item, product, snapshot in sale_items_to_create:
        if sale_item.inventory_id:
            inventory = await db.scalar(
                select(Inventory).where(Inventory.id == sale_item.inventory_id)
            )
        else:
            inventory = await get_or_create_inventory(
                db, "STORE", payload.store_id, sale_item.product_id
            )
            sale_item.inventory_id = inventory.id

        if not inventory or inventory.available_quantity < sale_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for replacement product {sale_item.product_id}.",
            )

        inventory.quantity -= sale_item.quantity
        inventory.available_quantity -= sale_item.quantity
        inventory.last_stock_out_at = _now()

        exc_out_txn = InventoryTransaction(
            inventory_id=inventory.id,
            product_id=sale_item.product_id,
            product_snapshot_id=snapshot.id,
            unit_price=sale_item.unit_price,
            total_value=sale_item.line_total,
            transaction_type=TransactionType.EXCHANGE_OUT,
            quantity=sale_item.quantity,
            reference_id=new_sale.id,
            remarks=f"Issued via Exchange",
            created_by=payload.processed_by_id,
        )
        db.add(exc_out_txn)
        await db.flush()

        # Phase 1 fallback FIFO logic for new units
        await assign_units_to_sale_item(
            db=db,
            product_id=sale_item.product_id,
            owner_type=OwnerType.STORE,
            owner_id=payload.store_id,
            quantity=sale_item.quantity,
            sale_item_id=sale_item.id,
            specific_unit_skus=None
        )

    # ── 6. Create Exchange mapping records ──
    first_exchange = None
    for idx, original_item in enumerate(original_items):
        exchange_number = await _generate_exchange_number(db, admin_id)
        
        # Proportional values: assign new items total and additional payments to the first exchange record
        item_credit = original_item.line_total
        item_new_total = new_items_total if idx == 0 else Decimal("0.00")
        item_additional = additional_payment if idx == 0 else Decimal("0.00")
        
        exchange = Exchange(
            exchange_number=exchange_number,
            admin_id=admin_id,
            store_id=payload.store_id,
            customer_id=payload.customer_id,
            original_sale_id=payload.original_sale_id,
            original_sale_item_id=original_item.id,
            new_sale_id=new_sale.id,
            original_item_value=original_item.line_total,
            new_items_total=item_new_total,
            exchange_credit=item_credit,
            additional_payment=item_additional,
            processed_by_type=payload.processed_by_type,
            processed_by_id=payload.processed_by_id,
            exchange_date=payload.exchange_date,
            status=ExchangeStatus.COMPLETED,
            reason=payload.reason,
            notes=payload.notes,
        )
        db.add(exchange)
        await db.flush()
        if idx == 0:
            first_exchange = exchange

    original_sale.is_exchanged = True

    # Create/update bill HTML for the new sale
    await update_bill_for_sale(db, new_sale.id)

    # Commit all changes atomically
    await db.commit()
    await db.refresh(first_exchange)
    return first_exchange


async def get_exchange(db: AsyncSession, exchange_id: int) -> Exchange | None:
    """Fetch an exchange by ID with related entities loaded."""
    stmt = (
        select(Exchange)
        .options(
            selectinload(Exchange.customer),
            selectinload(Exchange.store),
            selectinload(Exchange.original_sale),
            selectinload(Exchange.original_sale_item),
            selectinload(Exchange.new_sale).selectinload(Sale.items),
            selectinload(Exchange.new_sale).selectinload(Sale.payments),
        )
        .where(Exchange.id == exchange_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_exchanges(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    customer_id: int | None = None,
    status_filter: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[Exchange], int]:
    """List exchanges with filters, pagination, and search."""
    from models.customer import Customer

    conditions = [Exchange.admin_id == admin_id]
    if store_id:
        conditions.append(Exchange.store_id == store_id)
    if customer_id:
        conditions.append(Exchange.customer_id == customer_id)
    if status_filter:
        conditions.append(Exchange.status == status_filter.upper())
    if date_from:
        conditions.append(Exchange.exchange_date >= date_from)
    if date_to:
        conditions.append(Exchange.exchange_date <= date_to)

    if search:
        search_term = f"%{search.strip()}%"
        # Search by exchange number, original sale invoice, or customer phone/name
        customer_cond = exists = (
            select(Customer.id)
            .where(
                Customer.id == Exchange.customer_id,
                or_(
                    Customer.first_name.ilike(search_term),
                    Customer.last_name.ilike(search_term),
                    Customer.phone.ilike(search_term),
                ),
            )
            .exists()
        )
        conditions.append(
            or_(
                Exchange.exchange_number.ilike(search_term),
                customer_cond,
            )
        )

    # Count query
    count_stmt = select(sa_func.count(Exchange.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Data query
    stmt = (
        select(Exchange)
        .options(
            selectinload(Exchange.customer),
            selectinload(Exchange.store),
            selectinload(Exchange.original_sale),
            selectinload(Exchange.original_sale_item),
            selectinload(Exchange.new_sale),
        )
        .where(*conditions)
        .order_by(Exchange.created_at.desc())
    )

    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    exchanges = list(result.scalars().all())
    return exchanges, total


async def cancel_exchange(
    db: AsyncSession,
    exchange: Exchange,
    cancelled_by: int,
) -> Exchange:
    """
    Cancel an exchange and reverse inventory effects:
    1. Re-deduct original item from inventory (re-enter returned item outflow).
    2. Cancel new sale (restores stock of new replacement items).
    3. Mark exchange status as CANCELLED.
    """
    if exchange.status == ExchangeStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exchange is already cancelled.",
        )

    # 1. Reverse original item stock restoration
    orig_item = exchange.original_sale_item
    if orig_item and orig_item.inventory_id:
        orig_inventory = await db.scalar(
            select(Inventory).where(Inventory.id == orig_item.inventory_id)
        )
        if orig_inventory:
            orig_inventory.quantity -= orig_item.quantity
            orig_inventory.available_quantity -= orig_item.quantity
            orig_inventory.last_stock_out_at = _now()

            # Record inventory subtraction transaction (reverse EXCHANGE_IN)
            orig_product = await db.scalar(
                select(Product).where(Product.id == orig_item.product_id)
            )
            orig_snapshot = await capture_product_snapshot(db, orig_product)

            exc_in_rev = InventoryTransaction(
                inventory_id=orig_inventory.id,
                product_id=orig_item.product_id,
                product_snapshot_id=orig_snapshot.id,
                unit_price=orig_item.unit_price,
                total_value=orig_item.line_total,
                transaction_type=TransactionType.RETURN,
                quantity=orig_item.quantity,
                reference_id=exchange.original_sale_id,
                remarks=f"Reverse Exchange In (Cancel EXC {exchange.exchange_number})",
                created_by=cancelled_by,
            )
            db.add(exc_in_rev)

    # 2. Cancel the new Sale (this auto-restores inventory for the replacement items)
    if exchange.new_sale_id:
        new_sale = await db.scalar(
            select(Sale)
            .options(selectinload(Sale.items))
            .where(Sale.id == exchange.new_sale_id)
        )
        if new_sale and new_sale.status != SaleStatus.CANCELLED:
            # Revert inventory for each item of the new sale
            for item in new_sale.items:
                if item.inventory_id:
                    inventory = await db.scalar(
                        select(Inventory).where(Inventory.id == item.inventory_id)
                    )
                    if inventory:
                        inventory.quantity += item.quantity
                        inventory.available_quantity += item.quantity
                        inventory.last_stock_in_at = _now()

                        exc_out_rev = InventoryTransaction(
                            inventory_id=inventory.id,
                            product_id=item.product_id,
                            product_snapshot_id=item.product_snapshot_id,
                            unit_price=item.unit_price,
                            total_value=item.line_total,
                            transaction_type=TransactionType.RETURN,
                            quantity=item.quantity,
                            reference_id=new_sale.id,
                            remarks=f"Reverse Exchange Out (Cancel EXC {exchange.exchange_number})",
                            created_by=cancelled_by,
                        )
                        db.add(exc_out_rev)

            new_sale.status = SaleStatus.CANCELLED
            await update_bill_for_sale(db, new_sale.id)

    # Check if there are other active completed exchanges for this original sale
    other_excs_count = await db.scalar(
        select(sa_func.count(Exchange.id)).where(
            Exchange.original_sale_id == exchange.original_sale_id,
            Exchange.status == ExchangeStatus.COMPLETED,
            Exchange.id != exchange.id
        )
    )
    if not other_excs_count:
        original_sale = await db.scalar(
            select(Sale).where(Sale.id == exchange.original_sale_id)
        )
        if original_sale:
            original_sale.is_exchanged = False

    exchange.status = ExchangeStatus.CANCELLED
    await db.commit()
    await db.refresh(exchange)
    return exchange
