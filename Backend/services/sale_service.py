# Service: sale_service.py
"""
Business logic for Sales: atomic creation with inventory sync,
split payments, cancellation with inventory reversal.
"""
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import select, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from models.sale import Sale, SaleStatus, StaffType
from models.sale_item import SaleItem
from models.sale_payment import SalePayment, SalePaymentMethod
from models.product import Product
from models.inventory import Inventory
from models.inventory_transaction import InventoryTransaction, TransactionType
from services.inventory_service import get_or_create_inventory
from schemas.sale import (
    SaleCreate,
    SaleUpdate,
    SalePaymentCreate,
)


# ── Helpers ────────────────────────────────────────────────────

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


async def _generate_invoice_number(db: AsyncSession, admin_id: int) -> str:
    """Auto-generate a sequential invoice number like INV-2024-00001."""
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


# ── Create Sale ───────────────────────────────────────────────

async def create_sale(
    db: AsyncSession,
    admin_id: int,
    payload: SaleCreate,
) -> Sale:
    """
    Create a sale atomically: sale record + items + payments.
    For each item:
      - Stores unit_cost from product.cost_price at sale time
      - Creates InventoryTransaction(SALE) and decrements inventory
    Auto-computes totals and determines payment status.
    """
    invoice_number = await _generate_invoice_number(db, admin_id)

    # Build sale items
    subtotal = Decimal("0")
    total_discount = Decimal("0")
    total_tax = Decimal("0")
    sale_items: list[SaleItem] = []

    for item_data in payload.items:
        # Fetch product for cost_price snapshot
        prod_stmt = select(Product).where(Product.id == item_data.product_id)
        prod_result = await db.execute(prod_stmt)
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found",
            )

        line_total = _compute_line_total(
            item_data.quantity,
            item_data.unit_price,
            item_data.tax_percent,
            item_data.discount_percent,
        )
        base = item_data.unit_price * item_data.quantity
        discount_amt = base * item_data.discount_percent / Decimal("100")
        after_discount = base - discount_amt
        tax_amt = after_discount * item_data.tax_percent / Decimal("100")

        subtotal += base
        total_discount += discount_amt
        total_tax += tax_amt

        sale_item = SaleItem(
            product_id=item_data.product_id,
            inventory_id=item_data.inventory_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            unit_cost=product.cost_price,  # snapshot at sale time
            discount_percent=item_data.discount_percent,
            tax_percent=item_data.tax_percent,
            line_total=line_total,
            notes=item_data.notes,
        )
        sale_items.append(sale_item)

    total_amount = (subtotal - total_discount + total_tax).quantize(Decimal("0.01"))

    # Build payments
    sale_payments: list[SalePayment] = []
    paid_amount = Decimal("0")
    loyalty_points_redeemed = 0

    for pay_data in payload.payments:
        if pay_data.payment_method == SalePaymentMethod.LOYALTY_POINTS:
            loyalty_points_redeemed += int(pay_data.amount)

        sale_payment = SalePayment(
            amount=pay_data.amount,
            payment_method=pay_data.payment_method,
            reference_number=pay_data.reference_number,
            remarks=pay_data.remarks,
        )
        sale_payments.append(sale_payment)
        paid_amount += pay_data.amount

    due_amount = (total_amount - paid_amount).quantize(Decimal("0.01"))

    # Determine status
    if due_amount <= 0:
        sale_status = SaleStatus.COMPLETED
    elif paid_amount > 0:
        sale_status = SaleStatus.PARTIALLY_PAID
    else:
        sale_status = SaleStatus.PENDING

    # Compute loyalty earned (1 point per ₹100 spent)
    loyalty_points_earned = int(total_amount // Decimal("100"))

    sale = Sale(
        invoice_number=invoice_number,
        admin_id=admin_id,
        store_id=payload.store_id,
        customer_id=payload.customer_id,
        sold_by_type=payload.sold_by_type,
        sold_by_id=payload.sold_by_id,
        sale_date=payload.sale_date,
        status=sale_status,
        subtotal=subtotal.quantize(Decimal("0.01")),
        discount_amount=total_discount.quantize(Decimal("0.01")),
        tax_amount=total_tax.quantize(Decimal("0.01")),
        total_amount=total_amount,
        paid_amount=paid_amount.quantize(Decimal("0.01")),
        due_amount=max(due_amount, Decimal("0")),
        loyalty_points_earned=loyalty_points_earned,
        loyalty_points_redeemed=loyalty_points_redeemed,
        notes=payload.notes,
        items=sale_items,
        payments=sale_payments,
    )
    db.add(sale)
    await db.flush()  # Get IDs before inventory operations

    # Decrement inventory for each item
    for sale_item in sale_items:
        if sale_item.inventory_id:
            inv_stmt = select(Inventory).where(Inventory.id == sale_item.inventory_id)
            inv_result = await db.execute(inv_stmt)
            inventory = inv_result.scalar_one_or_none()
        else:
            # Default to store inventory
            inventory = await get_or_create_inventory(
                db, "STORE", payload.store_id, sale_item.product_id,
            )
            sale_item.inventory_id = inventory.id

        if inventory is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory not found for product {sale_item.product_id}",
            )

        if inventory.available_quantity < sale_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for product {sale_item.product_id}: "
                    f"available={inventory.available_quantity}, "
                    f"requested={sale_item.quantity}"
                ),
            )

        inventory.quantity -= sale_item.quantity
        inventory.available_quantity -= sale_item.quantity
        inventory.last_stock_out_at = _now()

        txn = InventoryTransaction(
            inventory_id=inventory.id,
            product_id=sale_item.product_id,
            transaction_type=TransactionType.SALE,
            quantity=sale_item.quantity,
            reference_id=sale.id,
            remarks=f"Sale {invoice_number}",
            created_by=payload.sold_by_id,
        )
        db.add(txn)

    await db.commit()
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
            selectinload(Sale.store),
            selectinload(Sale.customer),
        )
        .where(Sale.id == sale.id)
    )
    result = await db.execute(stmt)
    return result.scalar_one()


# ── Read Sales ────────────────────────────────────────────────

async def get_sale(
    db: AsyncSession,
    sale_id: int,
) -> Sale | None:
    """Fetch a sale by ID with items and payments eagerly loaded."""
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
        )
        .where(Sale.id == sale_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_sales(
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
) -> tuple[list[Sale], int]:
    """List sales for an admin with optional filters, search, and pagination."""
    from models.customer import Customer
    from models.sale_item import SaleItem
    from models.product import Product
    from sqlalchemy import exists, or_

    conditions = [Sale.admin_id == admin_id]
    if store_id:
        conditions.append(Sale.store_id == store_id)
    if customer_id:
        conditions.append(Sale.customer_id == customer_id)
    if status_filter:
        sf = status_filter.upper().replace(" ", "_")
        if sf == "LAB_PENDING":
            conditions.append(Sale.status.in_([SaleStatus.PENDING, SaleStatus.PARTIALLY_PAID]))
        elif sf == "RETURNED":
            conditions.append(Sale.status == SaleStatus.REFUNDED)
        else:
            conditions.append(Sale.status == sf)
    if date_from:
        conditions.append(Sale.sale_date >= date_from)
    if date_to:
        conditions.append(Sale.sale_date <= date_to)

    if search:
        search_term = f"%{search.strip()}%"
        invoice_cond = Sale.invoice_number.ilike(search_term)
        
        customer_exists = exists().where(
            Customer.id == Sale.customer_id,
            or_(
                Customer.first_name.ilike(search_term),
                Customer.last_name.ilike(search_term),
                Customer.phone.ilike(search_term)
            )
        )
        
        product_exists = exists().where(
            SaleItem.sale_id == Sale.id,
            Product.id == SaleItem.product_id,
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term)
            )
        )
        conditions.append(or_(invoice_cond, customer_exists, product_exists))

    # Count query
    count_stmt = select(sa_func.count(Sale.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # Data query
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items),
            selectinload(Sale.payments),
            selectinload(Sale.customer),
            selectinload(Sale.store),
        )
        .where(*conditions)
        .order_by(Sale.created_at.desc())
    )

    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    sales = list(result.scalars().all())
    return sales, total



# ── Update Sale ───────────────────────────────────────────────

async def update_sale(
    db: AsyncSession,
    sale: Sale,
    payload: SaleUpdate,
) -> Sale:
    """Update sale header (status, notes)."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sale, field, value)
    await db.commit()
    await db.refresh(sale)
    return sale


async def cancel_sale(
    db: AsyncSession,
    sale: Sale,
    cancelled_by: int,
) -> Sale:
    """
    Cancel a sale and reverse all inventory movements.
    Creates RETURN transactions for each item.
    """
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sale is already cancelled",
        )

    # Load items if not already loaded
    if not sale.items:
        sale_with_items = await get_sale(db, sale.id)
        if sale_with_items:
            sale = sale_with_items

    # Reverse inventory for each item
    for item in sale.items:
        if item.inventory_id:
            inv_stmt = select(Inventory).where(Inventory.id == item.inventory_id)
            inv_result = await db.execute(inv_stmt)
            inventory = inv_result.scalar_one_or_none()
            if inventory:
                inventory.quantity += item.quantity
                inventory.available_quantity += item.quantity
                inventory.last_stock_in_at = _now()

                txn = InventoryTransaction(
                    inventory_id=inventory.id,
                    product_id=item.product_id,
                    transaction_type=TransactionType.RETURN,
                    quantity=item.quantity,
                    reference_id=sale.id,
                    remarks=f"Cancellation of sale {sale.invoice_number}",
                    created_by=cancelled_by,
                )
                db.add(txn)

    sale.status = SaleStatus.CANCELLED
    await db.commit()
    await db.refresh(sale)
    return sale


# ── Add Payment ───────────────────────────────────────────────

async def add_sale_payment(
    db: AsyncSession,
    sale: Sale,
    payload: SalePaymentCreate,
) -> SalePayment:
    """Add a payment to an existing sale (split payments / instalments)."""
    if sale.status == SaleStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add payment to a cancelled sale",
        )

    payment = SalePayment(
        sale_id=sale.id,
        amount=payload.amount,
        payment_method=payload.payment_method,
        reference_number=payload.reference_number,
        remarks=payload.remarks,
    )
    db.add(payment)

    sale.paid_amount += payload.amount
    sale.due_amount = max(sale.total_amount - sale.paid_amount, Decimal("0"))

    # Update status if now fully paid
    if sale.due_amount <= 0:
        sale.status = SaleStatus.COMPLETED
    elif sale.paid_amount > 0 and sale.status == SaleStatus.PENDING:
        sale.status = SaleStatus.PARTIALLY_PAID

    if payload.payment_method == SalePaymentMethod.LOYALTY_POINTS:
        sale.loyalty_points_redeemed += int(payload.amount)

    await db.commit()
    await db.refresh(payment)
    return payment
