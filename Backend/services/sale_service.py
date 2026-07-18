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
from models.customer import Customer, CustomerMembershipTier # Import CustomerMembershipTier
from models.loyalty_config import LoyaltyConfig # Import LoyaltyConfig
from models.store_category_loyalty import StoreCategoryLoyalty # Import StoreCategoryLoyalty
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType # Import LoyaltyTransaction and Type
from services.inventory_service import get_or_create_inventory
from services import loyalty_service # Import loyalty_service
from services.snapshot_service import capture_product_snapshot
from models.prescription import Prescription

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
    has_lenses = False

    for item_data in payload.items:
        # Fetch product for cost_price snapshot
        prod_stmt = select(Product).options(selectinload(Product.category)).where(Product.id == item_data.product_id)
        prod_result = await db.execute(prod_stmt)
        product = prod_result.scalar_one_or_none()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {item_data.product_id} not found",
            )

        if product.category and product.category.name.lower() == "lenses":
            has_lenses = True

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

        # Capture an immutable snapshot of the product at sale time
        snapshot = await capture_product_snapshot(db, product)

        sale_item = SaleItem(
            product_id=item_data.product_id,
            product_snapshot_id=snapshot.id,
            inventory_id=item_data.inventory_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            unit_cost=product.cost_price,  # snapshot at sale time
            discount_percent=item_data.discount_percent,
            tax_percent=item_data.tax_percent,
            line_total=line_total,
            notes=item_data.notes,
        )
        sale_items.append((sale_item, product, snapshot))

    # Validate manual discount amount
    if payload.discount_amount > subtotal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount cannot exceed the total selling price (subtotal)",
        )

    if payload.discount_amount:
        total_discount += payload.discount_amount

    total_amount = (subtotal - total_discount + total_tax).quantize(Decimal("0.01"))

    # Unpack items tuple — service builds (SaleItem, Product, ProductSnapshot) triples
    sale_items_unpacked = [si for si, _p, _s in sale_items]

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

    customer_id_for_sale = payload.customer_id

    if customer_id_for_sale is None:
        if payload.new_customer_details:
            # Create a new customer
            new_customer_data = payload.new_customer_details
            new_customer = Customer(
                admin_id=admin_id,
                store_id=payload.store_id, # New customer is associated with the store where sale happens
                first_visit_store_id=payload.store_id,
                first_name=new_customer_data.first_name,
                last_name=new_customer_data.last_name,
                phone=new_customer_data.phone,
                email=new_customer_data.email,
                gender=new_customer_data.gender,
                date_of_birth=new_customer_data.date_of_birth,
                address=new_customer_data.address,
                city=new_customer_data.city,
                state=new_customer_data.state,
                pincode=new_customer_data.pincode,
                remark=new_customer_data.remark,
                is_active=True,
            )
            db.add(new_customer)
            await db.flush() # Get the ID for the new customer
            customer_id_for_sale = new_customer.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either an existing customer_id or new_customer_details must be provided for the sale."
            )
    else:
        # Validate existing customer_id
        existing_customer = await db.scalar(
            select(Customer).where(Customer.id == customer_id_for_sale, Customer.admin_id == admin_id)
        )
        if not existing_customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Customer with ID {customer_id_for_sale} not found or does not belong to this admin."
            )
        # If customer_id is provided and valid, ensure new_customer_details is not also provided
        if payload.new_customer_details:
             raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot provide both an existing customer_id and new_customer_details."
            )
    
    # Resolve prescription and initial lab status
    prescription_id = payload.prescription_id
    if not prescription_id and customer_id_for_sale:
        pres_stmt = (
            select(Prescription)
            .where(
                Prescription.customer_id == customer_id_for_sale,
                Prescription.is_active == True
            )
            .order_by(Prescription.created_at.desc())
            .limit(1)
        )
        active_pres = (await db.execute(pres_stmt)).scalar_one_or_none()
        if active_pres:
            prescription_id = active_pres.id

    initial_lab_status = "Confirmed"

    sale = Sale(
        invoice_number=invoice_number,
        admin_id=admin_id,
        store_id=payload.store_id,
        customer_id=customer_id_for_sale, # Use the determined customer_id
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
        loyalty_points_earned=0,
        loyalty_points_redeemed=0,
        notes=payload.notes,
        items=sale_items_unpacked,
        payments=sale_payments,
        prescription_id=prescription_id,
        lab_status=initial_lab_status,
    )
    db.add(sale)
    await db.flush()  # Get sale.id before loyalty operations

    # --- LOYALTY INTEGRATION ---
    if customer_id_for_sale:
        customer = await db.scalar(select(Customer).where(Customer.id == customer_id_for_sale))
        config = await db.scalar(select(LoyaltyConfig).where(LoyaltyConfig.store_id == payload.store_id))
        category_loyalties = (await db.execute(select(StoreCategoryLoyalty).where(StoreCategoryLoyalty.store_id == payload.store_id))).scalars().all()

        if not customer or not config:
            raise HTTPException(status_code=500, detail="Loyalty config or customer missing")

        # Skip all loyalty operations if program is disabled
        if getattr(config, "is_enabled", True):
            # Step 1: Redemption
            rupee_discount = Decimal("0.00")
            if payload.points_to_redeem > 0:
                redeem_customer_id = payload.loyalty_redeem_customer_id or customer_id_for_sale
                if redeem_customer_id != customer.id:
                    redeem_customer = await db.scalar(select(Customer).where(Customer.id == redeem_customer_id))
                    if not redeem_customer:
                        raise HTTPException(status_code=404, detail="Loyalty redeem customer not found")
                else:
                    redeem_customer = customer

                redemption_res = await loyalty_service.validate_redemption(
                    customer_current_points=redeem_customer.current_points,
                    points_to_redeem=payload.points_to_redeem,
                    sale_total=total_amount,
                    config=config
                )
                if not redemption_res["valid"]:
                    raise HTTPException(status_code=400, detail=redemption_res["error"])
                
                points_redeemed = redemption_res["points_redeemed"]
                rupee_discount = redemption_res["rupee_discount"]

                txn = LoyaltyTransaction(
                    customer_id=redeem_customer.id,
                    store_id=payload.store_id,
                    sale_id=sale.id,
                    type=LoyaltyTransactionType.REDEEMED,
                    points=-points_redeemed,
                    rupee_value=rupee_discount
                )
                db.add(txn)
                
                redeem_customer.current_points -= points_redeemed
                redeem_customer.loyalty_points_redeemed += points_redeemed
                if redeem_customer_id != customer.id:
                    db.add(redeem_customer)

                sale.loyalty_points_redeemed = points_redeemed

                # Adjust sale totals for redemption discount
                sale.total_amount -= rupee_discount
                sale.due_amount = max(Decimal("0"), sale.total_amount - sale.paid_amount)
                if sale.due_amount <= 0:
                    sale.status = SaleStatus.COMPLETED

            # Step 2: Earning
            sale_items_dict = [{"category_id": item.product_id, "quantity": item.quantity} for item, _p, _s in sale_items]
            # Reuse already-fetched products instead of re-querying
            product_map = {p.id: p for _si, p, _s in sale_items}
            for item_dict in sale_items_dict:
                prod = product_map.get(item_dict["category_id"])
                item_dict["category_id"] = prod.category_id if prod else item_dict["category_id"]

            # Use updated total_amount for price points calculation
            earn_res = await loyalty_service.calculate_points_for_sale(
                sale_total=sale.total_amount,
                sale_items=sale_items_dict,
                config=config,
                category_loyalties=category_loyalties,
                custom_points=payload.custom_points,
                category_points_override=payload.category_points_enabled_override,
                price_points_override=payload.price_points_enabled_override,
                enabled_category_ids=payload.enabled_category_points_ids
            )

            if earn_res["category_points"] > 0:
                db.add(LoyaltyTransaction(
                    customer_id=customer.id,
                    store_id=payload.store_id,
                    sale_id=sale.id,
                    type=LoyaltyTransactionType.EARNED_CATEGORY,
                    points=earn_res["category_points"]
                ))
            if earn_res["price_points"] > 0:
                db.add(LoyaltyTransaction(
                    customer_id=customer.id,
                    store_id=payload.store_id,
                    sale_id=sale.id,
                    type=LoyaltyTransactionType.EARNED_PRICE,
                    points=earn_res["price_points"]
                ))
            if earn_res["custom_points"] > 0:
                db.add(LoyaltyTransaction(
                    customer_id=customer.id,
                    store_id=payload.store_id,
                    sale_id=sale.id,
                    type=LoyaltyTransactionType.EARNED_CUSTOM,
                    points=earn_res["custom_points"],
                    given_by_type=payload.sold_by_type.value,
                    given_by_id=payload.sold_by_id
                ))

            total_earned = earn_res["total_points"]
            customer.current_points += total_earned
            customer.loyalty_points_earned += total_earned
            sale.loyalty_points_earned = total_earned
            
            customer.membership_tier = loyalty_service.get_tier(customer.current_points, config)
            db.add(customer)

    # Decrement inventory for each item using FIFO
    for sale_item, product, snapshot in sale_items:
        owner_type = "STORE"
        owner_id = payload.store_id
        
        # Query active inventory rows sorted by id
        inv_stmt = select(Inventory).where(
            Inventory.product_id == sale_item.product_id,
            Inventory.owner_type == owner_type,
            Inventory.owner_id == owner_id,
            Inventory.available_quantity > 0,
            Inventory.is_active.is_(True)
        ).order_by(Inventory.id.asc())
        
        inv_result = await db.execute(inv_stmt)
        batches = list(inv_result.scalars().all())
        
        total_available = sum(b.available_quantity for b in batches)
        if total_available < sale_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for product {sale_item.product_id}: "
                    f"available={total_available}, "
                    f"requested={sale_item.quantity}"
                ),
            )
            
        qty_to_consume = sale_item.quantity
        consumed_list = []
        tot_purchase_cost = Decimal("0.00")
        
        for batch in batches:
            if qty_to_consume <= 0:
                break
            taken = min(batch.available_quantity, qty_to_consume)
            batch.quantity -= taken
            batch.available_quantity -= taken
            batch.last_stock_out_at = _now()
            if batch.available_quantity == 0:
                batch.is_active = False
            
            consumed_list.append({
                "inventory_id": batch.id,
                "quantity": taken,
                "purchase_cost": float(batch.purchase_cost)
            })
            tot_purchase_cost += Decimal(taken) * batch.purchase_cost
            qty_to_consume -= taken
            
        sale_item.inventory_id = consumed_list[0]["inventory_id"]
        sale_item.unit_cost = Decimal(consumed_list[0]["purchase_cost"])
        sale_item.total_purchase_cost = tot_purchase_cost
        sale_item.consumed_batches = consumed_list
        
        # Add inventory transaction
        txn = InventoryTransaction(
            inventory_id=sale_item.inventory_id,
            product_id=sale_item.product_id,
            product_snapshot_id=snapshot.id,
            unit_price=sale_item.unit_price,
            total_value=sale_item.line_total,
            transaction_type=TransactionType.SALE,
            quantity=sale_item.quantity,
            reference_id=sale.id,
            remarks=f"Sale {invoice_number}",
            created_by=payload.sold_by_id,
            consumed_batches=consumed_list,
        )
        db.add(txn)

    await db.commit()
    from services.bill_service import update_bill_for_sale
    await update_bill_for_sale(db, sale.id)
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
    has_due: bool | None = None,
    is_lab_order: bool | None = None,
    tab: str | None = None,
    lab_status_filter: str | None = None,
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

    if is_lab_order:
        # A sale is a lab order if it has an associated lab_status
        conditions.append(Sale.lab_status.is_not(None))
        conditions.append(Sale.lab_status != "Delivered")
        
        if not search:
            if tab == "queue":
                conditions.append(Sale.lab_status.in_(["Confirmed", "Advance Paid", "Waiting For Lab", "Processing"]))
            elif tab == "pending":
                conditions.append(Sale.lab_status.in_(["In Lab", "Sent To Lab", "In Production", "Quality Check"]))
            elif tab == "ready":
                conditions.append(Sale.lab_status.in_(["Ready For Pickup", "Customer Notified"]))
        
        if lab_status_filter and lab_status_filter != "All":
            conditions.append(Sale.lab_status == lab_status_filter)
    else:
        # For regular sales history: direct sales OR delivered lab orders
        conditions.append(or_(
            Sale.lab_status.is_(None),
            Sale.lab_status == "Delivered"
        ))

        if status_filter:
            sf = status_filter.upper().replace(" ", "_")
            if sf == "LAB_PENDING":
                conditions.append(Sale.status.in_([SaleStatus.PENDING, SaleStatus.PARTIALLY_PAID]))
            elif sf == "RETURNED":
                conditions.append(Sale.status == SaleStatus.REFUNDED)
            elif sf == "UNPAID":
                conditions.append(Sale.status == SaleStatus.PENDING)
            else:
                conditions.append(Sale.status == sf)
    if date_from:
        conditions.append(Sale.sale_date >= date_from)
    if date_to:
        conditions.append(Sale.sale_date <= date_to)
    if has_due is not None:
        if has_due:
            conditions.append(Sale.due_amount > 0)
        else:
            conditions.append(Sale.due_amount == 0)

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
    """Update sale header (status, notes, lab details)."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sale, field, value)
        
    if "lab_status" in update_data and update_data["lab_status"] == "Delivered":
        if sale.due_amount <= 0:
            sale.status = SaleStatus.COMPLETED

    await db.commit()
    await db.refresh(sale)
    from services.bill_service import update_bill_for_sale
    await update_bill_for_sale(db, sale.id)
    await check_and_update_sales_loss(db, sale.id)
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

    # Reverse inventory for each item using batch metadata
    for item in sale.items:
        if item.consumed_batches:
            for batch_meta in item.consumed_batches:
                batch_id = batch_meta["inventory_id"]
                qty_to_restore = batch_meta["quantity"]
                
                inv_stmt = select(Inventory).where(Inventory.id == batch_id)
                inv_result = await db.execute(inv_stmt)
                inventory = inv_result.scalar_one_or_none()
                if inventory:
                    inventory.quantity += qty_to_restore
                    inventory.available_quantity += qty_to_restore
                    inventory.last_stock_in_at = _now()
                    inventory.is_active = True

                    txn = InventoryTransaction(
                        inventory_id=inventory.id,
                        product_id=item.product_id,
                        product_snapshot_id=item.product_snapshot_id,
                        unit_price=item.unit_price,
                        total_value=item.unit_price * qty_to_restore,
                        transaction_type=TransactionType.RETURN,
                        quantity=qty_to_restore,
                        reference_id=sale.id,
                        remarks=f"Cancellation of sale {sale.invoice_number} (batch restore)",
                        created_by=cancelled_by,
                        consumed_batches=[batch_meta]
                    )
                    db.add(txn)
        elif item.inventory_id:
            # Fallback for legacy sales without batch metadata
            inv_stmt = select(Inventory).where(Inventory.id == item.inventory_id)
            inv_result = await db.execute(inv_stmt)
            inventory = inv_result.scalar_one_or_none()
            if inventory:
                inventory.quantity += item.quantity
                inventory.available_quantity += item.quantity
                inventory.last_stock_in_at = _now()
                inventory.is_active = True

                txn = InventoryTransaction(
                    inventory_id=inventory.id,
                    product_id=item.product_id,
                    product_snapshot_id=item.product_snapshot_id,
                    unit_price=item.unit_price,
                    total_value=item.line_total,
                    transaction_type=TransactionType.RETURN,
                    quantity=item.quantity,
                    reference_id=sale.id,
                    remarks=f"Cancellation of sale {sale.invoice_number} (fallback restore)",
                    created_by=cancelled_by,
                )
                db.add(txn)

    sale.status = SaleStatus.CANCELLED
    await db.commit()
    await db.refresh(sale)
    from services.bill_service import update_bill_for_sale
    await update_bill_for_sale(db, sale.id)
    await check_and_update_sales_loss(db, sale.id)
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
    from services.bill_service import update_bill_for_sale
    await update_bill_for_sale(db, sale.id)
    await check_and_update_sales_loss(db, sale.id)
    return payment


# ── check_and_update_sales_loss ──────────────────────────────────────

async def check_and_update_sales_loss(db: AsyncSession, sale_id: int):
    from models.sale import Sale, SaleStatus
    from models.sale_item import SaleItem
    from models.product import Product
    from models.expense import Expense, ExpenseOwnerType, ExpensePaymentMethod, ExpenseRecordedByType
    from models.expense_category import ExpenseCategory
    from sqlalchemy.orm import selectinload
    
    # 1. Fetch sale with products loaded
    stmt = (
        select(Sale)
        .options(
            selectinload(Sale.items).selectinload(SaleItem.product),
            selectinload(Sale.store)
        )
        .where(Sale.id == sale_id)
    )
    res = await db.execute(stmt)
    sale = res.scalar_one_or_none()
    if not sale:
        return

    # 2. Check if it should have an expense
    should_have_expense = (
        (sale.status == SaleStatus.COMPLETED or sale.lab_status == "Delivered")
        and sale.status not in (SaleStatus.CANCELLED, SaleStatus.REFUNDED)
    )

    # 3. Check for existing expense
    ref_num = f"SALE-{sale.id}"
    exp_stmt = select(Expense).where(Expense.reference_number == ref_num, Expense.deleted_at.is_(None))
    exp_res = await db.execute(exp_stmt)
    existing_expense = exp_res.scalar_one_or_none()

    if not should_have_expense:
        if existing_expense:
            await db.delete(existing_expense)
            await db.commit()
        return

    # 4. Calculate total loss
    total_loss = Decimal("0.00")
    loss_details = []
    
    for item in sale.items:
        unit_cost = item.unit_cost or Decimal("0.00")
        unit_price = item.unit_price or Decimal("0.00")
        quantity = item.quantity or 0
        if quantity <= 0:
            continue
            
        # Calculate proportionate manual discount
        item_base_total = unit_price * quantity
        proportionate_manual_discount = Decimal("0.00")
        if sale.subtotal > 0 and sale.discount_amount > 0:
            proportionate_manual_discount = sale.discount_amount * (item_base_total / sale.subtotal)
            
        item_line_discount = item_base_total * (item.discount_percent or Decimal("0.00")) / Decimal("100")
        total_item_discount = item_line_discount + proportionate_manual_discount
        
        # Final unit selling price after all discounts
        final_selling_price = unit_price - (total_item_discount / quantity)
        
        # Determine total cost for this item
        total_cost = item.total_purchase_cost if item.total_purchase_cost is not None else (unit_cost * quantity)
        
        # Loss formula: Total Cost Price - Final Selling Price Total
        item_loss = total_cost - (final_selling_price * quantity)
        
        if item_loss > 0:
            total_loss += item_loss
            prod_name = item.product.name if item.product else f"Product #{item.product_id}"
            sku = item.product.sku if item.product else "N/A"
            loss_details.append(
                f"- {prod_name} (SKU: {sku}): Qty={quantity}, Total Cost=₹{total_cost:.2f}, "
                f"Selling (after disc)=₹{(final_selling_price * quantity):.2f}, Loss=₹{item_loss:.2f}"
            )

    # 5. Handle creation or deletion based on loss amount
    if total_loss <= 0:
        if existing_expense:
            await db.delete(existing_expense)
            await db.commit()
        return

    # Resolve "Sales Loss" category
    cat_stmt = select(ExpenseCategory).where(
        ExpenseCategory.admin_id == sale.admin_id,
        ExpenseCategory.name == "Sales Loss"
    )
    cat_res = await db.execute(cat_stmt)
    loss_category = cat_res.scalar_one_or_none()
    
    if not loss_category:
        loss_category = ExpenseCategory(
            admin_id=sale.admin_id,
            name="Sales Loss",
            description="Automatically generated category for tracking sales losses",
            is_active=True
        )
        db.add(loss_category)
        await db.flush()

    title = f"Sales Loss - Invoice #{sale.invoice_number}"
    description = (
        f"Automatic loss calculation for Invoice #{sale.invoice_number}.\n"
        f"Store: {sale.store.store_name if sale.store else f'Store #{sale.store_id}'}\n\n"
        "Loss details by item:\n" + "\n".join(loss_details)
    )

    if existing_expense:
        existing_expense.category_id = loss_category.id
        existing_expense.title = title
        existing_expense.description = description
        existing_expense.amount = total_loss.quantize(Decimal("0.01"))
        existing_expense.expense_date = sale.sale_date
        existing_expense.is_approved = True
    else:
        new_expense = Expense(
            admin_id=sale.admin_id,
            owner_type=ExpenseOwnerType.STORE,
            owner_id=sale.store_id,
            category_id=loss_category.id,
            title=title,
            description=description,
            amount=total_loss.quantize(Decimal("0.01")),
            expense_date=sale.sale_date,
            payment_method=ExpensePaymentMethod.CASH,
            is_approved=True,
            recorded_by_type=ExpenseRecordedByType(sale.sold_by_type.value),
            recorded_by_id=sale.sold_by_id,
            reference_number=ref_num
        )
        db.add(new_expense)

    await db.commit()
