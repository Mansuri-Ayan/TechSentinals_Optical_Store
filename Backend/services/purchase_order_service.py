# Service: purchase_order_service.py
"""
Business logic for Purchase Orders: creation, goods receipt (with inventory
sync), supplier payments, and PO lifecycle management.
"""
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy import select, and_, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from models.purchase_order import PurchaseOrder, POStatus
from models.purchase_order_item import PurchaseOrderItem
from models.supplier import Supplier
from models.supplier_payment import SupplierPayment
from models.inventory import Inventory
from models.inventory_transaction import InventoryTransaction, TransactionType
from services.inventory_service import get_or_create_inventory
from schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    GoodsReceiptCreate,
    SupplierPaymentCreate,
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
    """Compute line total: (unit_price × qty) × (1 - discount/100) × (1 + tax/100)."""
    base = unit_price * qty
    after_discount = base * (Decimal("1") - discount_pct / Decimal("100"))
    with_tax = after_discount * (Decimal("1") + tax_pct / Decimal("100"))
    return with_tax.quantize(Decimal("0.01"))


async def _generate_po_number(db: AsyncSession, admin_id: int) -> str:
    """Auto-generate a sequential PO number like PO-2024-00001."""
    year = datetime.now(timezone.utc).year
    prefix = f"PO-{year}-"
    stmt = (
        select(sa_func.count())
        .select_from(PurchaseOrder)
        .where(
            PurchaseOrder.admin_id == admin_id,
            PurchaseOrder.po_number.like(f"{prefix}%"),
        )
    )
    result = await db.execute(stmt)
    count = result.scalar() or 0
    return f"{prefix}{count + 1:05d}"


# ── Create PO ─────────────────────────────────────────────────

async def create_purchase_order(
    db: AsyncSession,
    admin_id: int,
    created_by: int,
    payload: PurchaseOrderCreate,
) -> PurchaseOrder:
    """
    Create a PO with all line items atomically.
    Auto-computes subtotal, tax, discount, total, and due_date.
    """
    # Fetch supplier for credit terms
    stmt = select(Supplier).where(Supplier.id == payload.supplier_id)
    result = await db.execute(stmt)
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Supplier {payload.supplier_id} not found",
        )

    po_number = await _generate_po_number(db, admin_id)

    # Create line items and compute totals
    subtotal = Decimal("0")
    total_tax = Decimal("0")
    total_discount = Decimal("0")
    items = []

    for item_data in payload.items:
        line_total = _compute_line_total(
            item_data.quantity_ordered,
            item_data.unit_price,
            item_data.tax_percent,
            item_data.discount_percent,
        )
        base = item_data.unit_price * item_data.quantity_ordered
        discount_amt = base * item_data.discount_percent / Decimal("100")
        after_discount = base - discount_amt
        tax_amt = after_discount * item_data.tax_percent / Decimal("100")

        subtotal += base
        total_discount += discount_amt
        total_tax += tax_amt

        po_item = PurchaseOrderItem(
            product_id=item_data.product_id,
            inventory_id=item_data.inventory_id,
            quantity_ordered=item_data.quantity_ordered,
            unit_price=item_data.unit_price,
            tax_percent=item_data.tax_percent,
            discount_percent=item_data.discount_percent,
            line_total=line_total,
            notes=item_data.notes,
        )
        items.append(po_item)

    total_amount = (subtotal - total_discount + total_tax).quantize(Decimal("0.01"))
    due_date = payload.order_date + timedelta(days=supplier.credit_days or 0)

    po = PurchaseOrder(
        po_number=po_number,
        admin_id=admin_id,
        store_id=payload.store_id,
        supplier_id=payload.supplier_id,
        status=POStatus.DRAFT,
        order_date=payload.order_date,
        expected_delivery_date=payload.expected_delivery_date,
        subtotal=subtotal.quantize(Decimal("0.01")),
        tax_amount=total_tax.quantize(Decimal("0.01")),
        discount_amount=total_discount.quantize(Decimal("0.01")),
        total_amount=total_amount,
        paid_amount=Decimal("0"),
        due_amount=total_amount,
        due_date=due_date,
        notes=payload.notes,
        created_by=created_by,
        items=items,
    )
    db.add(po)
    await db.commit()
    await db.refresh(po)
    return po


# ── Read POs ──────────────────────────────────────────────────

async def get_purchase_order(
    db: AsyncSession,
    po_id: int,
) -> PurchaseOrder | None:
    """Fetch a PO by ID with items, payments, supplier, store, and item products eagerly loaded."""
    from models.purchase_order_item import PurchaseOrderItem
    from models.product import Product
    stmt = (
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.brand),
            selectinload(PurchaseOrder.payments),
            selectinload(PurchaseOrder.supplier),
            selectinload(PurchaseOrder.store),
        )
        .where(PurchaseOrder.id == po_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_purchase_orders(
    db: AsyncSession,
    admin_id: int,
    supplier_id: int | None = None,
    store_id: int | None = None,
    status_filter: str | None = None,
    limit: int = 100,
    offset: int = 0,
    include_nested: bool = False,
) -> list[PurchaseOrder]:
    """List POs for an admin with optional filters."""
    from models.purchase_order_item import PurchaseOrderItem
    from models.product import Product
    stmt = select(PurchaseOrder).where(PurchaseOrder.admin_id == admin_id)
    
    # supplier and store are always needed by _po_to_read
    stmt = stmt.options(
        selectinload(PurchaseOrder.supplier),
        selectinload(PurchaseOrder.store),
    )
    
    if include_nested:
        stmt = stmt.options(
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.category),
            selectinload(PurchaseOrder.items).selectinload(PurchaseOrderItem.product).selectinload(Product.brand),
            selectinload(PurchaseOrder.payments),
        )
    if supplier_id:
        stmt = stmt.where(PurchaseOrder.supplier_id == supplier_id)
    if store_id:
        stmt = stmt.where(PurchaseOrder.store_id == store_id)
    if status_filter:
        stmt = stmt.where(PurchaseOrder.status == status_filter.upper())
    stmt = stmt.order_by(PurchaseOrder.created_at.desc()).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── Update PO ─────────────────────────────────────────────────

async def update_purchase_order(
    db: AsyncSession,
    po: PurchaseOrder,
    payload: PurchaseOrderUpdate,
) -> PurchaseOrder:
    """Update PO header fields."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(po, field, value)
    await db.commit()
    await db.refresh(po)
    return po


async def cancel_purchase_order(
    db: AsyncSession,
    po: PurchaseOrder,
) -> PurchaseOrder:
    """Cancel a PO (only if not yet received)."""
    if po.status in (POStatus.RECEIVED,):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel a fully received PO",
        )
    po.status = POStatus.CANCELLED
    await db.commit()
    await db.refresh(po)
    return po


# ── Goods Receipt ─────────────────────────────────────────────

async def receive_goods(
    db: AsyncSession,
    po: PurchaseOrder,
    payload: GoodsReceiptCreate,
    created_by: int,
) -> PurchaseOrder:
    """
    Record goods receipt: updates PO item quantities, creates inventory
    transactions, and auto-transitions PO status.
    """
    if po.status == POStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot receive goods on a cancelled PO",
        )

    # Build a lookup of PO items by ID
    item_map = {item.id: item for item in po.items}

    for grn_item in payload.items:
        po_item = item_map.get(grn_item.purchase_order_item_id)
        if not po_item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"PO item {grn_item.purchase_order_item_id} not found in PO {po.id}",
            )

        new_received = po_item.quantity_received + grn_item.quantity_received
        if new_received > po_item.quantity_ordered:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Over-receipt on item {po_item.id}: "
                    f"ordered={po_item.quantity_ordered}, "
                    f"already_received={po_item.quantity_received}, "
                    f"this_batch={grn_item.quantity_received}"
                ),
            )

        po_item.quantity_received = new_received

        # Determine target inventory (store or admin warehouse)
        if po_item.inventory_id:
            inv_stmt = select(Inventory).where(Inventory.id == po_item.inventory_id)
            inv_result = await db.execute(inv_stmt)
            inventory = inv_result.scalar_one_or_none()
            if not inventory:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Inventory {po_item.inventory_id} not found",
                )
        else:
            # Default to admin warehouse inventory
            owner_type = "STORE" if po.store_id else "ADMIN"
            owner_id = po.store_id if po.store_id else po.admin_id
            inventory = await get_or_create_inventory(
                db, owner_type, owner_id, po_item.product_id,
            )
            po_item.inventory_id = inventory.id

        # Update inventory quantities
        inventory.quantity += grn_item.quantity_received
        inventory.available_quantity += grn_item.quantity_received
        inventory.last_purchase_price = po_item.unit_price
        inventory.last_stock_in_at = _now()

        # Create inventory transaction
        txn = InventoryTransaction(
            inventory_id=inventory.id,
            product_id=po_item.product_id,
            transaction_type=TransactionType.PURCHASE,
            quantity=grn_item.quantity_received,
            reference_id=po.id,
            remarks=f"Goods receipt for PO {po.po_number}",
            created_by=created_by,
        )
        db.add(txn)

    # Auto-transition PO status
    total_ordered = sum(i.quantity_ordered for i in po.items)
    total_received = sum(i.quantity_received for i in po.items)

    if total_received >= total_ordered:
        po.status = POStatus.RECEIVED
        po.received_date = date.today()
    elif total_received > 0:
        po.status = POStatus.PARTIALLY_RECEIVED

    await db.commit()
    await db.refresh(po)
    return po


# ── Supplier Payments ─────────────────────────────────────────

async def record_supplier_payment(
    db: AsyncSession,
    admin_id: int,
    po: PurchaseOrder,
    created_by: int,
    payload: SupplierPaymentCreate,
) -> SupplierPayment:
    """
    Record a payment to a supplier against a PO.
    Updates PO paid_amount and due_amount.
    """
    if payload.amount > po.due_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Payment amount {payload.amount} exceeds "
                f"outstanding due {po.due_amount}"
            ),
        )

    payment = SupplierPayment(
        purchase_order_id=po.id,
        supplier_id=po.supplier_id,
        admin_id=admin_id,
        payment_date=payload.payment_date,
        amount=payload.amount,
        payment_method=payload.payment_method,
        reference_number=payload.reference_number,
        remarks=payload.remarks,
        created_by=created_by,
    )
    db.add(payment)

    po.paid_amount += payload.amount
    po.due_amount -= payload.amount

    await db.commit()
    await db.refresh(payment)
    return payment


async def list_supplier_payments(
    db: AsyncSession,
    po_id: int,
) -> list[SupplierPayment]:
    """List all payments for a PO."""
    stmt = (
        select(SupplierPayment)
        .where(SupplierPayment.purchase_order_id == po_id)
        .order_by(SupplierPayment.payment_date)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
