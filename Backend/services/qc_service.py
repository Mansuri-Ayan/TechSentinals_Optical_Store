# Service: qc_service.py
"""
Quality Control (QC) Service Layer — handles pre-lab/post-lab inspections,
rework loop management, replacement inventory allocation, sister-store transfer initiation,
supplier/lab damage compensation recording, and customer contact logging.
"""
from datetime import date, datetime, timezone
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from sqlalchemy.orm import selectinload

from models.sale import Sale, SaleStatus
from models.sale_item import SaleItem
from models.sale_item_qc_history import SaleItemQCHistory
from models.qc_damaged_item import QCDamagedItem
from models.qc_damaged_item_history import QCDamagedItemHistory
from models.qc_customer_contact_log import QCCustomerContactLog
from models.inventory import Inventory, OwnerType
from models.inventory_transaction import InventoryTransaction, TransactionType, TransactionStatus
from models.product import Product
from models.supplier_payment import SupplierPayment, SupplierPaymentMethod
from models.purchase_order import PurchaseOrder
from models.store import Store
from services.transfer_service import create_pending_request_service, _consume_stock_fifo


def _get_user_display_name(user) -> str:
    """Helper to extract inspector/staff display name."""
    if hasattr(user, "full_name") and user.full_name:
        return user.full_name
    if hasattr(user, "name") and user.name:
        return user.name
    if hasattr(user, "first_name") and user.first_name:
        last = getattr(user, "last_name", "") or ""
        return f"{user.first_name} {last}".strip()
    return f"Staff #{getattr(user, 'id', '0')}"


def _add_damage_item_history_entry(
    db: AsyncSession,
    user,
    damage_record: QCDamagedItem,
    action: str,
    previous_status: str | None,
    new_status: str,
    previous_resolution_type: str | None = None,
    new_resolution_type: str | None = None,
    previous_compensation_amount: Decimal | None = None,
    new_compensation_amount: Decimal | None = None,
    reason: str | None = None,
    notes: str | None = None,
):
    """Append a chronological audit record in QCDamagedItemHistory."""
    user_name = _get_user_display_name(user)
    user_role = getattr(user, "role", "ADMIN")
    if hasattr(user_role, "value"):
        user_role = str(user_role.value).upper()
    elif isinstance(user_role, str):
        user_role = user_role.upper()
    else:
        user_role = str(type(user).__name__).upper()

    user_id = getattr(user, "id", 0)

    history_entry = QCDamagedItemHistory(
        damaged_item_id=damage_record.id,
        changed_by_id=user_id,
        changed_by_type=user_role,
        changed_by_name=user_name,
        action=action,
        previous_status=previous_status,
        new_status=new_status,
        previous_resolution_type=previous_resolution_type,
        new_resolution_type=new_resolution_type,
        previous_compensation_amount=previous_compensation_amount,
        new_compensation_amount=new_compensation_amount,
        reason=reason,
        notes=notes,
    )
    db.add(history_entry)


async def mark_qc_damage_on_product_units(
    db: AsyncSession,
    sale_item_id: int,
    product_id: int,
    store_id: int,
    quantity: int = 1,
) -> list:
    """
    Mark ProductUnit(s) associated with a failed QC sale item as DAMAGED.
    If no ProductUnit is currently assigned to the sale_item_id, assign unit(s)
    from available store inventory or create unit(s) and set status = UnitStatus.DAMAGED.
    """
    from models.product_unit import ProductUnit, UnitStatus, UnitSourceType
    from services.product_unit_service import generate_unit_skus

    # 1. Check if units are already linked to this sale_item_id
    units = (
        await db.execute(
            select(ProductUnit).where(ProductUnit.sale_item_id == sale_item_id)
        )
    ).scalars().all()

    if units:
        for u in units:
            u.status = UnitStatus.DAMAGED
        return list(units)

    # 2. If no units linked to sale_item_id, find available or sold units for this product in store
    avail_units = (
        await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.product_id == product_id,
                ProductUnit.owner_type == OwnerType.STORE,
                ProductUnit.owner_id == store_id,
                ProductUnit.status.in_([UnitStatus.AVAILABLE, UnitStatus.SOLD]),
            )
            .order_by(ProductUnit.id.asc())
            .limit(quantity)
        )
    ).scalars().all()

    if avail_units:
        for u in avail_units:
            u.status = UnitStatus.DAMAGED
            u.sale_item_id = sale_item_id
        return list(avail_units)

    # 3. If no units found, check if an inventory batch exists
    batch = await db.scalar(
        select(Inventory)
        .where(
            Inventory.product_id == product_id,
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == store_id,
        )
        .order_by(Inventory.id.desc())
    )

    batch_id = batch.id if batch else None

    # Fetch product SKU
    prod = await db.scalar(select(Product).where(Product.id == product_id))
    prod_sku = prod.sku if prod else f"PROD{product_id}"

    # Generate new unit(s) marked as DAMAGED
    skus = await generate_unit_skus(db, product_id, prod_sku, quantity)
    new_units = []
    for sku in skus:
        pu = ProductUnit(
            unit_sku=sku,
            product_id=product_id,
            inventory_batch_id=batch_id,
            original_batch_id=batch_id,
            status=UnitStatus.DAMAGED,
            owner_type=OwnerType.STORE,
            owner_id=store_id,
            source_type=UnitSourceType.MANUAL_ADD,
            sale_item_id=sale_item_id,
        )
        db.add(pu)
        new_units.append(pu)

    return new_units


async def _ensure_item_is_unit_level(db: AsyncSession, item: SaleItem) -> SaleItem:
    """If a SaleItem has quantity > 1, split it into 1-unit items so QC is strictly item-level."""
    if item.quantity <= 1:
        return item
    orig_qty = item.quantity
    orig_total = item.line_total
    unit_total = (orig_total / Decimal(str(orig_qty))).quantize(Decimal("0.01"))

    item.quantity = 1
    item.line_total = orig_total - (unit_total * Decimal(str(orig_qty - 1)))
    db.add(item)

    for _ in range(orig_qty - 1):
        new_item = SaleItem(
            sale_id=item.sale_id,
            product_id=item.product_id,
            product_snapshot_id=item.product_snapshot_id,
            inventory_id=item.inventory_id,
            deadstock_item_id=item.deadstock_item_id,
            quantity=1,
            unit_price=item.unit_price,
            unit_cost=item.unit_cost,
            discount_percent=item.discount_percent,
            tax_percent=item.tax_percent,
            line_total=unit_total,
            notes=item.notes,
            qc_status="PENDING_QC_PRE_LAB",
            resolution_status="UNRESOLVED",
        )
        db.add(new_item)
    await db.commit()
    await db.refresh(item)
    return item


async def get_sale_item_with_context(db: AsyncSession, sale_item_id: int) -> SaleItem:
    """Fetch SaleItem with sale, product, and existing QC associations."""
    stmt = (
        select(SaleItem)
        .where(SaleItem.id == sale_item_id)
        .options(
            selectinload(SaleItem.sale).selectinload(Sale.items),
            selectinload(SaleItem.product),
            selectinload(SaleItem.qc_history),
            selectinload(SaleItem.qc_damaged_records),
            selectinload(SaleItem.contact_logs),
        )

    )
    item = (await db.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"SaleItem #{sale_item_id} not found",
        )
    if item.quantity > 1:
        item = await _ensure_item_is_unit_level(db, item)
    return item


async def _resolve_replacement_stock(
    db: AsyncSession,
    user,
    sale_item: SaleItem,
    damaged_record: QCDamagedItem,
) -> str:
    """
    Attempts replacement resolution for a damaged item:
    1. Local store inventory check -> consume 1 unit.
    2. Sister store inventory check (same admin_id) -> initiate Transfer Request.
    3. Not available in scope -> flag for Customer Decision / Supplier Claim.
    """
    store_id = sale_item.sale.store_id
    admin_id = sale_item.sale.admin_id
    product_id = sale_item.product_id

    # 1. Local Store Check
    local_inv_stmt = select(Inventory).where(
        Inventory.owner_type == OwnerType.STORE,
        Inventory.owner_id == store_id,
        Inventory.product_id == product_id,
        Inventory.is_active.is_(True),
        Inventory.available_quantity > 0,
    ).order_by(Inventory.id.asc())
    local_inv = (await db.execute(local_inv_stmt)).scalars().first()

    if local_inv:
        # Consume 1 unit from local stock
        await _consume_stock_fifo(db, OwnerType.STORE, store_id, product_id, 1)
        
        # Log replacement inventory transaction
        tx = InventoryTransaction(
            inventory_id=local_inv.id,
            product_id=product_id,
            transaction_type=TransactionType.SALE,
            quantity=1,
            send_store_id=store_id,
            reference_id=sale_item.sale_id,
            remarks=f"QC Replacement item issued for SaleItem #{sale_item.id}",
            created_by=user.id,
            status=TransactionStatus.COMPLETED,
        )
        db.add(tx)
        sale_item.resolution_status = "REPLACED_FROM_STOCK"
        damaged_record.status = "RESOLVED"
        damaged_record.resolution_notes = "Replaced with good unit from store stock."
        return "REPLACED_FROM_STOCK"

    # 2. Search sister stores within authorized Admin scope
    sister_stores_stmt = select(Store.id).where(
        Store.admin_id == admin_id,
        Store.id != store_id,
        Store.is_active.is_(True),
        Store.deleted_at.is_(None),
    )
    sister_store_ids = (await db.execute(sister_stores_stmt)).scalars().all()

    found_sister_store_id = None
    if sister_store_ids:
        sister_inv_stmt = select(Inventory.owner_id).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id.in_(sister_store_ids),
            Inventory.product_id == product_id,
            Inventory.is_active.is_(True),
            Inventory.available_quantity > 0,
        )
        found_sister_store_id = (await db.execute(sister_inv_stmt)).scalars().first()

    if found_sister_store_id:
        # Create transfer pull request via existing transfer_service
        try:
            req_payload = type(
                "ManagerRequestPayloadMock",
                (),
                {
                    "product_id": product_id,
                    "quantity": 1,
                    "from_owner_type": "STORE",
                    "from_owner_id": found_sister_store_id,
                    "remarks": f"QC Replacement Stock Request for SaleItem #{sale_item.id} (Invoice: {sale_item.sale.invoice_number})",
                },
            )()
            await create_pending_request_service(
                db=db,
                store_id=store_id,
                user_id=user.id,
                payload=req_payload,
            )
            sale_item.resolution_status = "TRANSFER_REQUESTED"
            damaged_record.status = "CLAIM_FILED"
            damaged_record.resolution_notes = f"Replacement stock requested from Sister Store #{found_sister_store_id} via Transfer Request."
            return "TRANSFER_REQUESTED"
        except Exception as e:
            # Fallback if request creation fails
            pass

    # 3. Not available anywhere in scope
    sale_item.resolution_status = "CUSTOMER_DECISION_PENDING"
    damaged_record.status = "OPEN"
    damaged_record.resolution_notes = "Item unavailable in store network. Customer notification required."
    return "CUSTOMER_DECISION_PENDING"


async def perform_pre_lab_qc(
    db: AsyncSession,
    user,
    sale_item_id: int,
    passed: bool,
    notes: str | None = None,
) -> SaleItem:
    """Perform Pre-Lab Quality Control Inspection on an individual SaleItem."""
    item = await get_sale_item_with_context(db, sale_item_id)
    prev_status = item.qc_status

    user_role = getattr(user, "token_role", None) or getattr(user, "role", "STAFF")
    user_name = _get_user_display_name(user)

    if passed:
        if getattr(item, "processing_type", "ORDER") == "DIRECT":
            new_status = "DELIVERED"
            item.qc_status = new_status
            item.damage_type = None
            item.resolution_status = "RESOLVED"
            qc_notes = notes or "Direct-sale item passed quality inspection. Cleared for handover."
        else:
            new_status = "QC_PASSED_PRE_LAB"
            # If order has lab assignment or custom specs, advance to SENT_TO_LAB
            if item.sale.lab_id or item.sale.lab_name or item.sale.lab_status:
                new_status = "SENT_TO_LAB"

            item.qc_status = new_status
            item.damage_type = None
            item.resolution_status = "RESOLVED" if new_status == "QC_PASSED_PRE_LAB" else "UNRESOLVED"
            qc_notes = notes or "Item passed pre-lab inspection cleanly."

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=new_status,
            rework_cycle=item.rework_count,
            notes=qc_notes,
        )
        db.add(history_entry)

    else:
        # Pre-Lab QC Failed -> Classified as STOCK_DAMAGE
        new_status = "QC_FAILED_PRE_LAB"
        item.qc_status = new_status
        item.damage_type = "STOCK_DAMAGE"
        item.resolution_status = "UNRESOLVED"

        # Create or update QCDamagedItem record (remains OPEN awaiting user resolution)
        damaged_record = item.qc_damaged_record
        if not damaged_record:
            damaged_record = QCDamagedItem(
                admin_id=item.sale.admin_id,
                store_id=item.sale.store_id,
                sale_item_id=item.id,
                product_id=item.product_id,
                supplier_id=getattr(item.product, "supplier_id", None),
                damage_type="STOCK_DAMAGE",
                stage="PRE_LAB",
                status="OPEN",
            )
            db.add(damaged_record)
            await db.flush()
            _add_damage_item_history_entry(
                db=db,
                user=user,
                damage_record=damaged_record,
                action="CREATED",
                previous_status=None,
                new_status="OPEN",
                notes="Initial QC damage record logged during Pre-Lab inspection",
            )

        await mark_qc_damage_on_product_units(
            db,
            sale_item_id=item.id,
            product_id=item.product_id,
            store_id=item.sale.store_id,
            quantity=item.quantity or 1,
        )

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=new_status,
            damage_type="STOCK_DAMAGE",
            rework_cycle=item.rework_count,
            notes=notes or "Pre-lab inspection flagged issue/damage. Awaiting resolution choice.",
        )
        db.add(history_entry)

    await db.commit()
    await db.refresh(item)
    return item


async def get_item_replacement_options(db: AsyncSession, sale_item_id: int) -> dict:
    """
    Look up stock availability in local store and sister stores under same admin,
    plus supplier information for an issue/damage SaleItem.
    """
    item = await get_sale_item_with_context(db, sale_item_id)
    store_id = item.sale.store_id
    admin_id = item.sale.admin_id
    product_id = item.product_id
    product = item.product

    # Local store stock
    local_qty_stmt = select(func.coalesce(func.sum(Inventory.available_quantity), 0)).where(
        Inventory.owner_type == OwnerType.STORE,
        Inventory.owner_id == store_id,
        Inventory.product_id == product_id,
        Inventory.is_active.is_(True),
    )
    local_stock = (await db.execute(local_qty_stmt)).scalar() or 0

    # Sister stores under same admin
    sister_stores_stmt = (
        select(Store)
        .where(
            Store.admin_id == admin_id,
            Store.id != store_id,
            Store.is_active.is_(True),
            Store.deleted_at.is_(None),
        )
        .order_by(Store.store_name.asc())
    )
    sister_stores_list = (await db.execute(sister_stores_stmt)).scalars().all()

    sister_stock_data = []
    for s_store in sister_stores_list:
        qty_stmt = select(func.coalesce(func.sum(Inventory.available_quantity), 0)).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == s_store.id,
            Inventory.product_id == product_id,
            Inventory.is_active.is_(True),
        )
        s_qty = (await db.execute(qty_stmt)).scalar() or 0
        if s_qty > 0:
            sister_stock_data.append({
                "store_id": s_store.id,
                "store_name": s_store.store_name,
                "available_quantity": int(s_qty),
            })

    # Supplier info
    supplier_info = None
    if product and getattr(product, "supplier", None):
        sup = product.supplier
        supplier_info = {
            "id": sup.id,
            "company_name": sup.company_name,
            "phone": getattr(sup, "phone", None),
            "email": getattr(sup, "email", None),
        }
    elif product and getattr(product, "supplier_id", None):
        from models.supplier import Supplier
        sup = await db.get(Supplier, product.supplier_id)
        if sup:
            supplier_info = {
                "id": sup.id,
                "company_name": sup.company_name,
                "phone": getattr(sup, "phone", None),
                "email": getattr(sup, "email", None),
            }

    return {
        "sale_item_id": item.id,
        "product_id": item.product_id,
        "product_name": product.name if product else f"Product #{item.product_id}",
        "product_sku": product.sku if product else None,
        "unit_price": item.unit_price,
        "current_store_id": store_id,
        "current_store_stock": int(local_stock),
        "sister_stores": sister_stock_data,
        "supplier": supplier_info,
        "warranty_months": getattr(product, "warranty_months", 0) if product else 0,
        "can_replace_locally": local_stock > 0,
        "has_sister_store_stock": len(sister_stock_data) > 0,
        "qc_status": item.qc_status,
        "damage_type": item.damage_type,
        "resolution_status": item.resolution_status,
        "customer_decision": item.customer_decision,
    }


async def resolve_sale_item_damage(
    db: AsyncSession,
    user,
    sale_item_id: int,
    action: str,
    from_store_id: int | None = None,
    customer_choice: str | None = None,
    new_product_id: int | None = None,
    contact_channel: str | None = "PHONE",
    notes: str | None = None,
) -> SaleItem:
    """
    User-driven resolution for a damaged SaleItem:
    1. 'REPLACE_LOCAL': Consumes 1 unit from store stock -> marks QC_PASSED_PRE_LAB.
    2. 'REQUEST_TRANSFER': Fires transfer request to sister store -> marks TRANSFER_REQUESTED.
    3. 'SUPPLIER_PURCHASE': Marks SUPPLIER_CLAIM_PENDING.
    4. 'CUSTOMER_DECISION':
       - 'WAIT_FOR_STOCK': Records ETA/notes -> marks CUSTOMER_DECISION_PENDING.
       - 'CHOOSE_DIFFERENT_ITEM': Swaps product, calculates price diff, adjusts order totals -> marks QC_PASSED_PRE_LAB.
       - 'CANCEL_ITEM': Cancels line item, recalculates order totals -> marks CANCELLED.
    """
    item = await get_sale_item_with_context(db, sale_item_id)
    store_id = item.sale.store_id
    admin_id = item.sale.admin_id
    product_id = item.product_id
    prev_status = item.qc_status
    user_role = getattr(user, "token_role", None) or getattr(user, "role", "STAFF")
    user_name = _get_user_display_name(user)

    damaged_record = item.qc_damaged_record

    if action == "REPLACE_LOCAL":
        # 1. Local Store Replacement
        local_qty_stmt = select(func.coalesce(func.sum(Inventory.available_quantity), 0)).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == store_id,
            Inventory.product_id == product_id,
            Inventory.is_active.is_(True),
        )
        local_stock = (await db.execute(local_qty_stmt)).scalar() or 0
        if local_stock < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot replace from store stock: 0 units available in store #{store_id}.",
            )

        await _consume_stock_fifo(db, OwnerType.STORE, store_id, product_id, 1, label="current store")

        inv_stmt = select(Inventory).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == store_id,
            Inventory.product_id == product_id,
        ).order_by(Inventory.id.asc())
        inv = (await db.execute(inv_stmt)).scalars().first()

        tx = InventoryTransaction(
            inventory_id=inv.id if inv else None,
            product_id=product_id,
            transaction_type=TransactionType.SALE,
            quantity=1,
            send_store_id=store_id,
            reference_id=item.sale_id,
            remarks=f"QC Replacement unit issued for SaleItem #{item.id} (Invoice: {item.sale.invoice_number})",
            created_by=user.id,
            status=TransactionStatus.COMPLETED,
        )
        db.add(tx)

        item.resolution_status = "REPLACED_FROM_STOCK"
        resolved_qc = "DELIVERED" if getattr(item, "processing_type", "ORDER") == "DIRECT" else "QC_PASSED_PRE_LAB"
        item.qc_status = resolved_qc
        if damaged_record:
            damaged_record.status = "OPEN"
            damaged_record.resolution_notes = notes or "Replaced with good unit from store inventory."

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=resolved_qc,
            rework_cycle=item.rework_count,
            notes=notes or "Replaced damaged item with good unit from local store inventory.",
        )
        db.add(history_entry)

    elif action == "REQUEST_TRANSFER":
        if not from_store_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="from_store_id is required for sister store transfer request.",
            )
        sister_store = await db.get(Store, from_store_id)
        if not sister_store or sister_store.admin_id != admin_id or sister_store.deleted_at is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid sister store selected (must be active and belong to same admin organization).",
            )

        await create_pending_request_service(
            db=db,
            manager_user_id=user.id,
            manager_store_id=store_id,
            product_id=product_id,
            quantity=1,
            from_owner_type="STORE",
            from_owner_id=from_store_id,
            remarks=f"QC Replacement Stock Request for SaleItem #{item.id} (Invoice: {item.sale.invoice_number})",
        )

        item.resolution_status = "TRANSFER_REQUESTED"
        if damaged_record:
            damaged_record.resolution_notes = f"Transfer requested from {sister_store.store_name} (#{from_store_id})."

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=item.qc_status,
            rework_cycle=item.rework_count,
            notes=notes or f"Requested stock transfer from sister store '{sister_store.store_name}'.",
        )
        db.add(history_entry)

    elif action == "SUPPLIER_PURCHASE":
        item.resolution_status = "SUPPLIER_CLAIM_PENDING"
        if damaged_record:
            damaged_record.resolution_notes = notes or "Requested replacement unit purchase from supplier."

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=item.qc_status,
            rework_cycle=item.rework_count,
            notes=notes or "Flagged to purchase replacement unit from supplier.",
        )
        db.add(history_entry)

    elif action == "CUSTOMER_DECISION":
        valid_choices = ("WAIT_FOR_STOCK", "CHOOSE_DIFFERENT_ITEM", "CANCEL_ITEM")
        if customer_choice not in valid_choices:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid customer choice '{customer_choice}'. Must be one of {valid_choices}",
            )

        log_contact = QCCustomerContactLog(
            sale_item_id=item.id,
            logged_by_id=user.id,
            logged_by_name=user_name,
            contact_channel=contact_channel or "PHONE",
            summary_notes=notes or f"Customer decided: {customer_choice}",
            customer_choice=customer_choice,
        )
        db.add(log_contact)
        item.customer_notified = True
        item.customer_decision = customer_choice

        if customer_choice == "WAIT_FOR_STOCK":
            item.resolution_status = "CUSTOMER_DECISION_PENDING"
            history_entry = SaleItemQCHistory(
                sale_item_id=item.id,
                sale_id=item.sale_id,
                inspector_id=user.id,
                inspector_type=str(user_role),
                inspector_name=user_name,
                previous_status=prev_status,
                new_status=item.qc_status,
                rework_cycle=item.rework_count,
                notes=notes or "Customer contacted: agreed to wait for incoming stock.",
            )
            db.add(history_entry)

        elif customer_choice == "CHOOSE_DIFFERENT_ITEM":
            if not new_product_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="new_product_id is required when customer chooses a different item.",
                )
            new_prod = await db.get(Product, new_product_id)
            if not new_prod or new_prod.admin_id != admin_id or new_prod.deleted_at is not None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Replacement product not found in active catalog.",
                )

            # Consume 1 unit from store stock for the new product
            await _consume_stock_fifo(db, OwnerType.STORE, store_id, new_product_id, 1, label="new product")

            old_price = item.unit_price
            new_price = new_prod.selling_price
            price_diff = new_price - old_price

            item.product_id = new_prod.id
            item.unit_price = new_price
            disc_mult = Decimal("1.00") - (Decimal(str(item.discount_percent or 0)) / Decimal("100"))
            tax_mult = Decimal("1.00") + (Decimal(str(item.tax_percent or 0)) / Decimal("100"))
            item.line_total = round(Decimal(str(new_price)) * Decimal(str(item.quantity)) * disc_mult * tax_mult, 2)

            await db.flush()
            sale = item.sale
            stmt_all_items = select(SaleItem).where(SaleItem.sale_id == item.sale_id)
            all_sale_items = (await db.execute(stmt_all_items)).scalars().all()
            total_sum = sum(
                it.line_total for it in all_sale_items
                if it.qc_status != "CANCELLED"
            )
            sale.total_amount = total_sum
            sale.due_amount = max(Decimal("0.00"), total_sum - (sale.paid_amount or Decimal("0.00")))

            # Update item processing_type if new product has specific workflow type
            new_wf = getattr(new_prod, "sales_workflow_type", "BOTH")
            if new_wf == "DIRECT_ONLY":
                item.processing_type = "DIRECT"
            elif new_wf == "ORDER_ONLY":
                item.processing_type = "ORDER"

            resolved_qc = "DELIVERED" if getattr(item, "processing_type", "ORDER") == "DIRECT" else "QC_PASSED_PRE_LAB"
            item.resolution_status = "RESOLVED"
            item.qc_status = resolved_qc

            diff_str = f"+₹{price_diff:.2f} due" if price_diff > 0 else f"-₹{abs(price_diff):.2f} refund" if price_diff < 0 else "₹0.00 difference"
            desc_text = f"Customer selected alternative product '{new_prod.name}' (SKU: {new_prod.sku}). Price adjustment: {diff_str}."
            if notes:
                desc_text += f" Notes: {notes}"

            history_entry = SaleItemQCHistory(
                sale_item_id=item.id,
                sale_id=item.sale_id,
                inspector_id=user.id,
                inspector_type=str(user_role),
                inspector_name=user_name,
                previous_status=prev_status,
                new_status=resolved_qc,
                rework_cycle=item.rework_count,
                notes=desc_text,
            )
            db.add(history_entry)

        elif customer_choice == "CANCEL_ITEM":
            item.qc_status = "CANCELLED"
            item.resolution_status = "CANCELLED"

            await db.flush()
            sale = item.sale
            stmt_all_items = select(SaleItem).where(SaleItem.sale_id == item.sale_id)
            all_sale_items = (await db.execute(stmt_all_items)).scalars().all()
            active_items = [it for it in all_sale_items if it.id != item.id and it.qc_status != "CANCELLED"]
            total_sum = sum(it.line_total for it in active_items) if active_items else Decimal("0.00")
            sale.total_amount = total_sum
            sale.due_amount = max(Decimal("0.00"), total_sum - (sale.paid_amount or Decimal("0.00")))


            history_entry = SaleItemQCHistory(
                sale_item_id=item.id,
                sale_id=item.sale_id,
                inspector_id=user.id,
                inspector_type=str(user_role),
                inspector_name=user_name,
                previous_status=prev_status,
                new_status="CANCELLED",
                rework_cycle=item.rework_count,
                notes=notes or "Customer cancelled this line item. Order totals adjusted; remaining items continue.",
            )
            db.add(history_entry)

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown resolution action '{action}'.",
        )

    await db.commit()
    await db.refresh(item)
    return item


async def perform_post_lab_qc(
    db: AsyncSession,
    user,
    sale_item_id: int,
    outcome: str,
    notes: str | None = None,
) -> SaleItem:
    """
    Perform Post-Lab Quality Control Inspection on an individual SaleItem.
    Outcome options:
    - 'PASSED': Item passed inspection, ready for delivery.
    - 'FITTING_FAILURE': Wrong fit/rx -> rework loop back to lab (increments rework_count, returns to SENT_TO_LAB).
    - 'LAB_DAMAGE': Physical damage caused by lab -> routes to Damaged Stock tab.
    - 'STOCK_DAMAGE': Pre-existing stock damage discovered post-lab.
    """
    valid_outcomes = ("PASSED", "FITTING_FAILURE", "LAB_DAMAGE", "STOCK_DAMAGE")
    if outcome not in valid_outcomes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid outcome '{outcome}'. Must be one of {valid_outcomes}",
        )

    item = await get_sale_item_with_context(db, sale_item_id)
    if getattr(item, "processing_type", "ORDER") == "DIRECT":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This product is an Instant Direct Sale item and bypasses lab processing. Post-lab QC is not applicable.",
        )
    prev_status = item.qc_status
    user_role = getattr(user, "token_role", None) or getattr(user, "role", "STAFF")
    user_name = _get_user_display_name(user)

    if outcome == "PASSED":
        new_status = "QC_PASSED_POST_LAB"
        item.qc_status = new_status
        item.damage_type = None
        item.resolution_status = "RESOLVED"

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=new_status,
            rework_cycle=item.rework_count,
            notes=notes or "Item passed post-lab inspection cleanly. Ready for delivery.",
        )
        db.add(history_entry)

    elif outcome == "FITTING_FAILURE":
        new_status = "SENT_TO_LAB"
        item.qc_status = new_status
        item.damage_type = "FITTING_FAILURE"
        item.rework_count += 1
        item.resolution_status = "REWORK_IN_PROGRESS"
        item.sale.lab_status = "Sent To Lab"

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=new_status,
            damage_type="FITTING_FAILURE",
            rework_cycle=item.rework_count,
            notes=notes or f"Fitting failure flagged. Initiated Rework Cycle #{item.rework_count}.",
        )
        db.add(history_entry)

    elif outcome in ("LAB_DAMAGE", "STOCK_DAMAGE"):
        new_status = "QC_FAILED_POST_LAB"
        item.qc_status = new_status
        item.damage_type = outcome
        item.resolution_status = "UNRESOLVED"

        damaged_record = item.qc_damaged_record
        if not damaged_record:
            damaged_record = QCDamagedItem(
                admin_id=item.sale.admin_id,
                store_id=item.sale.store_id,
                sale_item_id=item.id,
                product_id=item.product_id,
                supplier_id=getattr(item.product, "supplier_id", None) if outcome == "STOCK_DAMAGE" else None,
                lab_id=item.sale.lab_id if outcome == "LAB_DAMAGE" else None,
                damage_type=outcome,
                stage="POST_LAB",
                status="OPEN",
            )
            db.add(damaged_record)
            await db.flush()
            _add_damage_item_history_entry(
                db=db,
                user=user,
                damage_record=damaged_record,
                action="CREATED",
                previous_status=None,
                new_status="OPEN",
                notes=f"Initial QC damage record logged during Post-Lab inspection ({outcome})",
            )

        await mark_qc_damage_on_product_units(
            db,
            sale_item_id=item.id,
            product_id=item.product_id,
            store_id=item.sale.store_id,
            quantity=item.quantity or 1,
        )

        history_entry = SaleItemQCHistory(
            sale_item_id=item.id,
            sale_id=item.sale_id,
            inspector_id=user.id,
            inspector_type=str(user_role),
            inspector_name=user_name,
            previous_status=prev_status,
            new_status=new_status,
            damage_type=outcome,
            rework_cycle=item.rework_count,
            notes=notes or f"Post-lab inspection failed ({outcome}). Logged in Damaged Stock & QC Claims.",
        )
        db.add(history_entry)

    await db.commit()
    await db.refresh(item)
    return item



async def record_supplier_compensation(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    compensation_type: str,
    amount: Decimal | None = None,
    po_id: int | None = None,
    notes: str | None = None,
) -> QCDamagedItem:
    """Record supplier or lab compensation (Credit Note, Cash Refund, Replacement) against damaged item."""
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    damage_record.compensation_type = compensation_type
    damage_record.compensation_amount = amount
    damage_record.resolution_notes = notes
    damage_record.status = "RESOLVED"

    # If compensation is CREDIT_NOTE and associated with a Purchase Order, flow through SupplierPayment
    if compensation_type == "CREDIT_NOTE" and amount and po_id and damage_record.supplier_id:
        po = await db.get(PurchaseOrder, po_id)
        if po:
            payment = SupplierPayment(
                purchase_order_id=po.id,
                supplier_id=damage_record.supplier_id,
                admin_id=damage_record.admin_id,
                payment_date=datetime.now(timezone.utc).date(),
                amount=amount,
                payment_method=SupplierPaymentMethod.CREDIT_NOTE,
                reference_number=f"QC-CLAIM-{damage_record.id}",
                remarks=f"QC Supplier Damage Claim for Item #{damage_record.sale_item_id}. Notes: {notes or ''}",
                created_by=user.id,
            )
            db.add(payment)
            await db.flush()

            # Adjust Purchase Order balance
            po.paid_amount = (po.paid_amount or Decimal("0.00")) + amount
            po.due_amount = max(Decimal("0.00"), (po.due_amount or Decimal("0.00")) - amount)
            damage_record.supplier_payment_id = payment.id

    # Update linked SaleItem resolution status
    if damage_record.sale_item:
        damage_record.sale_item.resolution_status = "RESOLVED"

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def log_customer_contact(
    db: AsyncSession,
    user,
    sale_item_id: int,
    contact_channel: str,
    summary_notes: str,
    customer_choice: str | None = None,
) -> QCCustomerContactLog:
    """Log manual or system contact with customer regarding order item issues."""
    item = await get_sale_item_with_context(db, sale_item_id)
    user_name = _get_user_display_name(user)

    log_entry = QCCustomerContactLog(
        sale_item_id=item.id,
        logged_by_id=user.id,
        logged_by_name=user_name,
        contact_channel=contact_channel,
        summary_notes=summary_notes,
        customer_choice=customer_choice,
    )
    db.add(log_entry)

    item.customer_notified = True
    if customer_choice:
        item.customer_decision = customer_choice

    await db.commit()
    await db.refresh(log_entry)
    return log_entry


async def _mark_damaged_item_units_lost(db: AsyncSession, sale_item_id: int):
    """Mark all ProductUnits associated with this damaged sale item as LOST."""
    from models.product_unit import ProductUnit, UnitStatus
    pu_stmt = select(ProductUnit).where(ProductUnit.sale_item_id == sale_item_id)
    units = (await db.execute(pu_stmt)).scalars().all()
    for u in units:
        u.status = UnitStatus.LOST


async def _record_loss_inventory_transaction(
    db: AsyncSession,
    user_id: int,
    store_id: int,
    product_id: int,
    loss_amount: Decimal,
    remarks: str,
):
    """Record a LOSS transaction in inventory_transactions for audit and valuation."""
    inv_stmt = (
        select(Inventory)
        .where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == store_id,
            Inventory.product_id == product_id,
        )
        .order_by(Inventory.id.asc())
    )
    inv = (await db.execute(inv_stmt)).scalars().first()
    if not inv:
        # Fallback: search for any inventory for this product
        inv = (await db.execute(
            select(Inventory).where(Inventory.product_id == product_id).order_by(Inventory.id.asc())
        )).scalars().first()

    if not inv:
        # Create store inventory record with 0 qty to preserve FK relationship
        inv = Inventory(
            owner_type=OwnerType.STORE,
            owner_id=store_id,
            product_id=product_id,
            quantity=0,
            reserved_quantity=0,
            available_quantity=0,
            is_active=True,
        )
        db.add(inv)
        await db.flush()

    if inv:
        tx = InventoryTransaction(
            inventory_id=inv.id,
            product_id=product_id,
            transaction_type=TransactionType.LOSS,
            quantity=1,
            unit_price=loss_amount,
            total_value=loss_amount,
            receive_store_id=store_id,
            remarks=remarks,
            created_by=user_id,
            status=TransactionStatus.COMPLETED,
        )
        db.add(tx)


def _add_qc_history_entry(
    db: AsyncSession,
    user,
    damage_record: QCDamagedItem,
    new_status: str,
    notes: str,
):
    """Append a full audit entry in SaleItemQCHistory."""
    if not damage_record.sale_item:
        return
    user_name = _get_user_display_name(user)
    user_role = getattr(user, "role", "ADMIN")
    prev_status = damage_record.sale_item.qc_status or "QC_FAILED"
    damage_record.sale_item.qc_status = new_status
    history_entry = SaleItemQCHistory(
        sale_item_id=damage_record.sale_item_id,
        sale_id=damage_record.sale_item.sale_id,
        inspector_id=user.id,
        inspector_type=str(user_role),
        inspector_name=user_name,
        previous_status=prev_status,
        new_status=new_status,
        damage_type=damage_record.damage_type,
        rework_cycle=damage_record.sale_item.rework_count or 0,
        notes=notes,
    )
    db.add(history_entry)


async def resolve_supplier_damage(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    resolution_type: str,
    compensation_type: str | None = None,
    amount: Decimal | None = None,
    loss_reason: str | None = None,
    loss_amount: Decimal | None = None,
    new_product_id: int | None = None,
    po_id: int | None = None,
    notes: str | None = None,
    is_promise: bool = False,
    expected_date: str | None = None,
) -> QCDamagedItem:
    """
    Resolve supplier damage claim via:
    1. 'REPLACEMENT' (or 'REPLACEMENT_ITEM' / 'EQUIVALENT_ITEM'): Supplier provides direct or equivalent replacement unit.
    2. 'FULL_COMPENSATION' (or 'CASH_REFUND' / 'CREDIT_NOTE'): Supplier provides full monetary compensation.
    3. 'PARTIAL_COMPENSATION': Supplier pays partial amount; remainder is recorded as loss.
    4. 'NO_COMPENSATION': Supplier rejected claim/warranty; full item cost is recorded as loss.
    5. 'MARK_AS_LOSS': Item is explicitly written off as a loss without compensation.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    res_type_norm = resolution_type.upper().strip()
    valid_types = (
        "REPLACEMENT",
        "REPLACEMENT_ITEM",
        "EQUIVALENT_ITEM",
        "FULL_COMPENSATION",
        "CASH_REFUND",
        "CREDIT_NOTE",
        "PARTIAL_COMPENSATION",
        "NO_COMPENSATION",
        "MARK_AS_LOSS",
    )
    if res_type_norm not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid resolution type '{resolution_type}'. Must be one of {valid_types}",
        )

    parsed_exp_date = None
    if expected_date:
        if isinstance(expected_date, str):
            try:
                parsed_exp_date = datetime.strptime(expected_date, "%Y-%m-%d").date()
            except ValueError:
                parsed_exp_date = None
        elif hasattr(expected_date, "year"):
            parsed_exp_date = expected_date

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    # PROMISE PATHWAY (Resolution promised by vendor, pending physical delivery or settlement)
    if is_promise and res_type_norm not in ("NO_COMPENSATION", "MARK_AS_LOSS"):
        damage_record.is_promise_pending = True
        damage_record.status = "PROMISED"
        damage_record.expected_resolution_date = parsed_exp_date
        target_comp = (
            compensation_type or 
            ("REPLACEMENT_ITEM" if res_type_norm in ("REPLACEMENT", "REPLACEMENT_ITEM") 
             else ("EQUIVALENT_ITEM" if res_type_norm == "EQUIVALENT_ITEM" 
             else ("CREDIT_NOTE" if res_type_norm == "CREDIT_NOTE" 
             else res_type_norm)))
        )
        damage_record.compensation_type = target_comp
        damage_record.compensation_amount = amount
        damage_record.loss_reason = loss_reason
        damage_record.loss_amount = loss_amount
        damage_record.resolution_notes = notes or f"Supplier resolution promised (Expected: {expected_date or 'TBD'})."
        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "PROMISED"

        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="PROMISED",
            previous_status=prev_status,
            new_status="PROMISED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=target_comp,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=amount,
            reason=loss_reason,
            notes=f"Supplier promised resolution: {res_type_norm}. Target: {expected_date or 'N/A'}. {notes or ''}".strip(),
        )
        _add_qc_history_entry(
            db, user, damage_record, "PROMISED",
            f"Supplier resolution promised ({res_type_norm}). Expected: {expected_date or 'N/A'}. {notes or ''}".strip()
        )
        await db.commit()
        await db.refresh(damage_record)
        return damage_record

    # Immediate fulfillment pathway
    damage_record.is_promise_pending = False
    damage_record.expected_resolution_date = parsed_exp_date

    product_cost = Decimal("0.00")
    if damage_record.product:
        product_cost = damage_record.product.cost_price or damage_record.product.selling_price or Decimal("0.00")

    # 1. REPLACEMENT PATHWAY
    if res_type_norm in ("REPLACEMENT", "REPLACEMENT_ITEM", "EQUIVALENT_ITEM"):
        if new_product_id or res_type_norm == "EQUIVALENT_ITEM":
            target_prod_id = new_product_id or damage_record.product_id
            inv_stmt = select(Inventory).where(
                Inventory.owner_type == OwnerType.STORE,
                Inventory.owner_id == damage_record.store_id,
                Inventory.product_id == target_prod_id,
                Inventory.is_active.is_(True),
            ).order_by(Inventory.id.asc())
            inv = (await db.execute(inv_stmt)).scalars().first()
            if inv:
                inv.quantity += 1
                inv.available_quantity += 1
                tx = InventoryTransaction(
                    inventory_id=inv.id,
                    product_id=target_prod_id,
                    transaction_type=TransactionType.PURCHASE,
                    quantity=1,
                    receive_store_id=damage_record.store_id,
                    remarks=f"Supplier equivalent replacement item (Product #{target_prod_id}) for QC Damaged Item #{damage_record.id}",
                    created_by=user.id,
                    status=TransactionStatus.COMPLETED,
                )
                db.add(tx)
            damage_record.compensation_type = "EQUIVALENT_ITEM"
            damage_record.resolution_notes = notes or f"Supplier provided alternative item #{target_prod_id} of equal value."
        else:
            inv_stmt = select(Inventory).where(
                Inventory.owner_type == OwnerType.STORE,
                Inventory.owner_id == damage_record.store_id,
                Inventory.product_id == damage_record.product_id,
                Inventory.is_active.is_(True),
            ).order_by(Inventory.id.asc())
            inv = (await db.execute(inv_stmt)).scalars().first()
            if inv:
                inv.quantity += 1
                inv.available_quantity += 1
                tx = InventoryTransaction(
                    inventory_id=inv.id,
                    product_id=damage_record.product_id,
                    transaction_type=TransactionType.PURCHASE,
                    quantity=1,
                    receive_store_id=damage_record.store_id,
                    remarks=f"Supplier direct replacement unit for QC Damaged Item #{damage_record.id}",
                    created_by=user.id,
                    status=TransactionStatus.COMPLETED,
                )
                db.add(tx)
            damage_record.compensation_type = "REPLACEMENT_ITEM"
            damage_record.resolution_notes = notes or "Supplier provided direct replacement unit of the same item."

        damage_record.status = "RESOLVED"
        damage_record.loss_reason = None
        damage_record.loss_amount = None
        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=damage_record.compensation_amount,
            notes=damage_record.resolution_notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_REPLACED",
            f"Supplier damage resolved via replacement. {damage_record.resolution_notes}"
        )

    # 2. FULL COMPENSATION PATHWAY
    elif res_type_norm in ("FULL_COMPENSATION", "CASH_REFUND", "CREDIT_NOTE"):
        settle_mode = compensation_type or ("CREDIT_NOTE" if res_type_norm == "CREDIT_NOTE" else "CASH_REFUND")
        settle_amt = amount if amount is not None else product_cost
        damage_record.compensation_type = settle_mode
        damage_record.compensation_amount = settle_amt
        damage_record.loss_reason = None
        damage_record.loss_amount = None
        damage_record.status = "RESOLVED"
        damage_record.resolution_notes = notes or f"Supplier provided full financial compensation of {settle_amt} via {settle_mode}."

        if po_id and damage_record.supplier_id:
            po = await db.get(PurchaseOrder, po_id)
            if po:
                payment = SupplierPayment(
                    purchase_order_id=po.id,
                    supplier_id=damage_record.supplier_id,
                    admin_id=damage_record.admin_id,
                    payment_date=datetime.now(timezone.utc).date(),
                    amount=settle_amt,
                    payment_method=SupplierPaymentMethod.CREDIT_NOTE if settle_mode == "CREDIT_NOTE" else SupplierPaymentMethod.CASH,
                    reference_number=f"QC-CLAIM-{damage_record.id}",
                    remarks=f"QC Supplier Full Settlement for Damaged Item #{damage_record.id}. {notes or ''}",
                    created_by=user.id,
                )
                db.add(payment)
                await db.flush()
                po.paid_amount = (po.paid_amount or Decimal("0.00")) + settle_amt
                po.due_amount = max(Decimal("0.00"), (po.due_amount or Decimal("0.00")) - settle_amt)
                damage_record.supplier_payment_id = payment.id

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=settle_amt,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_COMPENSATED",
            f"Supplier damage resolved via full compensation ({settle_mode}: {settle_amt}). {notes or ''}"
        )

    # 3. PARTIAL COMPENSATION PATHWAY
    elif res_type_norm == "PARTIAL_COMPENSATION":
        settle_amt = amount or Decimal("0.00")
        uncomp_loss = loss_amount if loss_amount is not None else max(Decimal("0.00"), product_cost - settle_amt)
        reason = loss_reason or "Partial supplier warranty settlement; uncompensated balance written off as loss"
        settle_mode = compensation_type or "CREDIT_NOTE"

        damage_record.compensation_type = "PARTIAL_COMPENSATION"
        damage_record.compensation_amount = settle_amt
        damage_record.loss_amount = uncomp_loss
        damage_record.loss_reason = reason
        damage_record.status = "RESOLVED"
        damage_record.resolution_notes = notes or f"Supplier settled {settle_amt} via {settle_mode}. Remaining {uncomp_loss} written off: {reason}"

        if po_id and damage_record.supplier_id and settle_amt > 0:
            po = await db.get(PurchaseOrder, po_id)
            if po:
                payment = SupplierPayment(
                    purchase_order_id=po.id,
                    supplier_id=damage_record.supplier_id,
                    admin_id=damage_record.admin_id,
                    payment_date=datetime.now(timezone.utc).date(),
                    amount=settle_amt,
                    payment_method=SupplierPaymentMethod.CREDIT_NOTE if settle_mode == "CREDIT_NOTE" else SupplierPaymentMethod.CASH,
                    reference_number=f"QC-CLAIM-{damage_record.id}",
                    remarks=f"QC Supplier Partial Settlement for Damaged Item #{damage_record.id}. {notes or ''}",
                    created_by=user.id,
                )
                db.add(payment)
                await db.flush()
                po.paid_amount = (po.paid_amount or Decimal("0.00")) + settle_amt
                po.due_amount = max(Decimal("0.00"), (po.due_amount or Decimal("0.00")) - settle_amt)
                damage_record.supplier_payment_id = payment.id

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=uncomp_loss,
            remarks=f"Supplier partial compensation write-off for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=settle_amt,
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_PARTIAL_COMPENSATION",
            f"Supplier damage partially compensated ({settle_amt}). Loss of {uncomp_loss} recorded. Reason: {reason}. {notes or ''}"
        )

    # 4. NO COMPENSATION PATHWAY
    elif res_type_norm == "NO_COMPENSATION":
        loss_val = loss_amount if loss_amount is not None else product_cost
        reason = loss_reason or "Supplier rejected warranty/damage claim; written off as loss"

        damage_record.compensation_type = "NONE"
        damage_record.compensation_amount = Decimal("0.00")
        damage_record.loss_amount = loss_val
        damage_record.loss_reason = reason
        damage_record.status = "WRITTEN_OFF"
        damage_record.resolution_notes = notes or f"No supplier compensation provided. Written off as loss: {reason}"

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=loss_val,
            remarks=f"No supplier compensation for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "WRITTEN_OFF"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="MARKED_AS_LOSS",
            previous_status=prev_status,
            new_status="WRITTEN_OFF",
            previous_resolution_type=prev_res_type,
            new_resolution_type="NONE",
            previous_compensation_amount=prev_amt,
            new_compensation_amount=Decimal("0.00"),
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "WRITTEN_OFF",
            f"No supplier compensation. Item written off as loss ({loss_val}). Reason: {reason}. {notes or ''}"
        )

    # 5. MARK AS LOSS PATHWAY (Direct write-off)
    elif res_type_norm == "MARK_AS_LOSS":
        loss_val = loss_amount if loss_amount is not None else product_cost
        reason = loss_reason or "Supplier stock item written off as loss"

        damage_record.compensation_type = "NONE"
        damage_record.compensation_amount = Decimal("0.00")
        damage_record.loss_amount = loss_val
        damage_record.loss_reason = reason
        damage_record.status = "WRITTEN_OFF"
        damage_record.resolution_notes = notes or f"Written off as loss: {reason}"

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=loss_val,
            remarks=f"Supplier stock item written off as loss for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "WRITTEN_OFF"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="MARKED_AS_LOSS",
            previous_status=prev_status,
            new_status="WRITTEN_OFF",
            previous_resolution_type=prev_res_type,
            new_resolution_type="NONE",
            previous_compensation_amount=prev_amt,
            new_compensation_amount=Decimal("0.00"),
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "WRITTEN_OFF",
            f"Marked as loss (Supplier stock origin). Loss: {loss_val}. Reason: {reason}. {notes or ''}"
        )

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def resolve_lab_damage(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    resolution_type: str = "FULL_COMPENSATION",
    amount: Decimal | None = None,
    loss_reason: str | None = None,
    loss_amount: Decimal | None = None,
    notes: str | None = None,
    is_promise: bool = False,
    expected_date: str | None = None,
) -> QCDamagedItem:
    """
    Resolve lab damage claim via:
    1. 'REPLACEMENT': Lab provides replacement item/frame/lens.
    2. 'FULL_COMPENSATION' (or 'LAB_COMPENSATION'): Lab compensates full claimed amount.
    3. 'PARTIAL_COMPENSATION': Lab pays partial compensation; remainder written off as loss.
    4. 'NO_COMPENSATION': Lab rejected liability; full item cost written off as loss.
    5. 'MARK_AS_LOSS': Item written off as lab loss without claiming compensation.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    res_type_norm = (resolution_type or "FULL_COMPENSATION").upper().strip()
    valid_types = (
        "REPLACEMENT",
        "FULL_COMPENSATION",
        "LAB_COMPENSATION",
        "PARTIAL_COMPENSATION",
        "NO_COMPENSATION",
        "MARK_AS_LOSS",
    )
    if res_type_norm not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid lab resolution type '{resolution_type}'. Must be one of {valid_types}",
        )

    parsed_exp_date = None
    if expected_date:
        if isinstance(expected_date, str):
            try:
                parsed_exp_date = datetime.strptime(expected_date, "%Y-%m-%d").date()
            except ValueError:
                parsed_exp_date = None
        elif hasattr(expected_date, "year"):
            parsed_exp_date = expected_date

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    # PROMISE PATHWAY (Resolution promised by lab, pending physical delivery or settlement)
    if is_promise and res_type_norm not in ("NO_COMPENSATION", "MARK_AS_LOSS"):
        damage_record.is_promise_pending = True
        damage_record.status = "PROMISED"
        damage_record.expected_resolution_date = parsed_exp_date
        target_comp = (
            "REPLACEMENT_ITEM" if res_type_norm == "REPLACEMENT"
            else ("LAB_COMPENSATION" if res_type_norm in ("FULL_COMPENSATION", "LAB_COMPENSATION")
            else res_type_norm)
        )
        damage_record.compensation_type = target_comp
        damage_record.compensation_amount = amount
        damage_record.loss_reason = loss_reason
        damage_record.loss_amount = loss_amount
        damage_record.resolution_notes = notes or f"Lab resolution promised (Expected: {expected_date or 'TBD'})."
        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "PROMISED"

        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="PROMISED",
            previous_status=prev_status,
            new_status="PROMISED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=target_comp,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=amount,
            reason=loss_reason,
            notes=f"Lab promised resolution: {res_type_norm}. Target: {expected_date or 'N/A'}. {notes or ''}".strip(),
        )
        _add_qc_history_entry(
            db, user, damage_record, "PROMISED",
            f"Lab resolution promised ({res_type_norm}). Expected: {expected_date or 'N/A'}. {notes or ''}".strip()
        )
        await db.commit()
        await db.refresh(damage_record)
        return damage_record

    # Immediate fulfillment pathway
    damage_record.is_promise_pending = False
    damage_record.expected_resolution_date = parsed_exp_date

    product_cost = Decimal("0.00")
    if damage_record.product:
        product_cost = damage_record.product.cost_price or damage_record.product.selling_price or Decimal("0.00")

    # 1. REPLACEMENT PATHWAY
    if res_type_norm == "REPLACEMENT":
        inv_stmt = select(Inventory).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == damage_record.store_id,
            Inventory.product_id == damage_record.product_id,
            Inventory.is_active.is_(True),
        ).order_by(Inventory.id.asc())
        inv = (await db.execute(inv_stmt)).scalars().first()
        if inv:
            inv.quantity += 1
            inv.available_quantity += 1
            tx = InventoryTransaction(
                inventory_id=inv.id,
                product_id=damage_record.product_id,
                transaction_type=TransactionType.PURCHASE,
                quantity=1,
                receive_store_id=damage_record.store_id,
                remarks=f"Lab replacement unit for QC Damaged Item #{damage_record.id}",
                created_by=user.id,
                status=TransactionStatus.COMPLETED,
            )
            db.add(tx)
        damage_record.compensation_type = "REPLACEMENT_ITEM"
        damage_record.status = "RESOLVED"
        damage_record.loss_reason = None
        damage_record.loss_amount = None
        damage_record.resolution_notes = notes or "Lab provided replacement unit/lenses for damaged item."
        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=damage_record.compensation_amount,
            notes=damage_record.resolution_notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_REPLACED",
            f"Lab damage resolved via replacement. {damage_record.resolution_notes}"
        )

    # 2. FULL COMPENSATION PATHWAY
    elif res_type_norm in ("FULL_COMPENSATION", "LAB_COMPENSATION"):
        settle_amt = amount if amount is not None else product_cost
        damage_record.compensation_type = "LAB_COMPENSATION"
        damage_record.compensation_amount = settle_amt
        damage_record.loss_reason = None
        damage_record.loss_amount = None
        damage_record.status = "RESOLVED"
        damage_record.resolution_notes = notes or f"Claimed full compensation of {settle_amt} from lab for damage."
        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=settle_amt,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_COMPENSATED",
            f"Lab damage resolved via full compensation ({settle_amt}). {notes or ''}"
        )

    # 3. PARTIAL COMPENSATION PATHWAY
    elif res_type_norm == "PARTIAL_COMPENSATION":
        settle_amt = amount or Decimal("0.00")
        uncomp_loss = loss_amount if loss_amount is not None else max(Decimal("0.00"), product_cost - settle_amt)
        reason = loss_reason or "Partial lab liability settlement; uncompensated balance written off as loss"

        damage_record.compensation_type = "PARTIAL_COMPENSATION"
        damage_record.compensation_amount = settle_amt
        damage_record.loss_amount = uncomp_loss
        damage_record.loss_reason = reason
        damage_record.status = "RESOLVED"
        damage_record.resolution_notes = notes or f"Lab settled {settle_amt}. Remaining {uncomp_loss} written off: {reason}"

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=uncomp_loss,
            remarks=f"Lab partial compensation write-off for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "RESOLVED"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="VERIFIED_COMPLETED",
            previous_status=prev_status,
            new_status="RESOLVED",
            previous_resolution_type=prev_res_type,
            new_resolution_type=damage_record.compensation_type,
            previous_compensation_amount=prev_amt,
            new_compensation_amount=settle_amt,
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "RESOLVED_PARTIAL_COMPENSATION",
            f"Lab damage partially compensated ({settle_amt}). Loss of {uncomp_loss} recorded. Reason: {reason}. {notes or ''}"
        )

    # 4. NO COMPENSATION PATHWAY
    elif res_type_norm == "NO_COMPENSATION":
        loss_val = loss_amount if loss_amount is not None else product_cost
        reason = loss_reason or "Lab rejected liability / disputed damage; written off as loss"

        damage_record.compensation_type = "NONE"
        damage_record.compensation_amount = Decimal("0.00")
        damage_record.loss_amount = loss_val
        damage_record.loss_reason = reason
        damage_record.status = "WRITTEN_OFF"
        damage_record.resolution_notes = notes or f"No lab compensation provided. Written off as loss: {reason}"

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=loss_val,
            remarks=f"No lab compensation for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "WRITTEN_OFF"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="MARKED_AS_LOSS",
            previous_status=prev_status,
            new_status="WRITTEN_OFF",
            previous_resolution_type=prev_res_type,
            new_resolution_type="NONE",
            previous_compensation_amount=prev_amt,
            new_compensation_amount=Decimal("0.00"),
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "WRITTEN_OFF",
            f"No lab compensation. Item written off as loss ({loss_val}). Reason: {reason}. {notes or ''}"
        )

    # 5. MARK AS LOSS PATHWAY
    elif res_type_norm == "MARK_AS_LOSS":
        loss_val = loss_amount if loss_amount is not None else product_cost
        reason = loss_reason or "Lab damaged item written off as loss"

        damage_record.compensation_type = "NONE"
        damage_record.compensation_amount = Decimal("0.00")
        damage_record.loss_amount = loss_val
        damage_record.loss_reason = reason
        damage_record.status = "WRITTEN_OFF"
        damage_record.resolution_notes = notes or f"Written off as loss: {reason}"

        await _record_loss_inventory_transaction(
            db=db,
            user_id=user.id,
            store_id=damage_record.store_id,
            product_id=damage_record.product_id,
            loss_amount=loss_val,
            remarks=f"Lab damaged item written off as loss for Damaged Item #{damage_record.id}. Reason: {reason}. {notes or ''}",
        )
        await _mark_damaged_item_units_lost(db, damage_record.sale_item_id)

        if damage_record.sale_item:
            damage_record.sale_item.resolution_status = "WRITTEN_OFF"
        _add_damage_item_history_entry(
            db=db,
            user=user,
            damage_record=damage_record,
            action="MARKED_AS_LOSS",
            previous_status=prev_status,
            new_status="WRITTEN_OFF",
            previous_resolution_type=prev_res_type,
            new_resolution_type="NONE",
            previous_compensation_amount=prev_amt,
            new_compensation_amount=Decimal("0.00"),
            reason=reason,
            notes=notes,
        )
        _add_qc_history_entry(
            db, user, damage_record, "WRITTEN_OFF",
            f"Marked as loss (Lab liability origin). Loss: {loss_val}. Reason: {reason}. {notes or ''}"
        )

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def mark_damaged_item_as_loss(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    loss_reason: str,
    loss_amount: Decimal | None = None,
    notes: str | None = None,
) -> QCDamagedItem:
    """Directly mark any QC damaged item (supplier or lab) as a written-off loss."""
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    if damage_record.stage == "POST_LAB" or damage_record.damage_type == "LAB_DAMAGE":
        return await resolve_lab_damage(
            db=db,
            user=user,
            damaged_item_id=damaged_item_id,
            resolution_type="MARK_AS_LOSS",
            amount=Decimal("0.00"),
            loss_reason=loss_reason,
            loss_amount=loss_amount,
            notes=notes,
        )
    else:
        return await resolve_supplier_damage(
            db=db,
            user=user,
            damaged_item_id=damaged_item_id,
            resolution_type="MARK_AS_LOSS",
            compensation_type="NONE",
            amount=Decimal("0.00"),
            loss_reason=loss_reason,
            loss_amount=loss_amount,
            notes=notes,
        )


async def verify_and_complete_damage_resolution(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    verified_notes: str | None = None,
    received_quantity: int = 1,
) -> QCDamagedItem:
    """
    Verify and fulfill a previously promised damage resolution.
    For physical replacement promises, increments store inventory.
    Transitions status to 'RESOLVED' and logs VERIFIED_COMPLETED audit history.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    # If the promised resolution was a physical replacement (direct or equivalent)
    if damage_record.compensation_type in ("REPLACEMENT_ITEM", "EQUIVALENT_ITEM", "REPLACEMENT"):
        inv_stmt = select(Inventory).where(
            Inventory.owner_type == OwnerType.STORE,
            Inventory.owner_id == damage_record.store_id,
            Inventory.product_id == damage_record.product_id,
            Inventory.is_active.is_(True),
        ).order_by(Inventory.id.asc())
        inv = (await db.execute(inv_stmt)).scalars().first()
        qty = received_quantity or 1
        if inv:
            inv.quantity += qty
            inv.available_quantity += qty
            tx = InventoryTransaction(
                inventory_id=inv.id,
                product_id=damage_record.product_id,
                transaction_type=TransactionType.PURCHASE,
                quantity=qty,
                receive_store_id=damage_record.store_id,
                remarks=f"Verified replacement delivery for QC Damaged Item #{damage_record.id}. {verified_notes or ''}".strip(),
                created_by=user.id,
                status=TransactionStatus.COMPLETED,
            )
            db.add(tx)

    damage_record.is_promise_pending = False
    damage_record.status = "RESOLVED"
    if verified_notes:
        damage_record.resolution_notes = f"{damage_record.resolution_notes or ''} | Verified: {verified_notes}".strip(" |")

    if damage_record.sale_item:
        damage_record.sale_item.resolution_status = "RESOLVED"

    _add_damage_item_history_entry(
        db=db,
        user=user,
        damage_record=damage_record,
        action="VERIFIED_COMPLETED",
        previous_status=prev_status,
        new_status="RESOLVED",
        previous_resolution_type=prev_res_type,
        new_resolution_type=damage_record.compensation_type,
        previous_compensation_amount=prev_amt,
        new_compensation_amount=damage_record.compensation_amount,
        notes=verified_notes or "Promised resolution verified and completed.",
    )
    _add_qc_history_entry(
        db, user, damage_record, "RESOLVED",
        f"Promised resolution verified & fulfilled. {verified_notes or ''}".strip()
    )

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def mark_damage_resolution_failed(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    failure_reason: str,
    notes: str | None = None,
) -> QCDamagedItem:
    """
    Mark a promised or in-progress resolution as FAILED when vendor/lab fails to fulfill.
    Allows user to subsequently choose another resolution or mark as loss.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    damage_record.status = "FAILED"
    damage_record.is_promise_pending = False
    damage_record.resolution_notes = f"Resolution failed: {failure_reason}. {notes or ''}".strip()
    if damage_record.sale_item:
        damage_record.sale_item.resolution_status = "FAILED"

    _add_damage_item_history_entry(
        db=db,
        user=user,
        damage_record=damage_record,
        action="FAILED",
        previous_status=prev_status,
        new_status="FAILED",
        previous_resolution_type=prev_res_type,
        new_resolution_type=damage_record.compensation_type,
        previous_compensation_amount=prev_amt,
        new_compensation_amount=damage_record.compensation_amount,
        reason=failure_reason,
        notes=notes,
    )
    _add_qc_history_entry(
        db, user, damage_record, "FAILED",
        f"Promised resolution failed: {failure_reason}. {notes or ''}".strip()
    )

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def reopen_damaged_item(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    reason: str,
    notes: str | None = None,
) -> QCDamagedItem:
    """
    Reopen a previously resolved or written-off damage record.
    Tracks reopen count, timestamp, mandatory reason, and audit trail.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    damage_record.status = "REOPENED"
    damage_record.is_promise_pending = False
    damage_record.reopen_count = (damage_record.reopen_count or 0) + 1
    damage_record.last_reopened_at = datetime.now(timezone.utc)
    damage_record.last_reopened_reason = reason
    if damage_record.sale_item:
        damage_record.sale_item.resolution_status = "REOPENED"

    _add_damage_item_history_entry(
        db=db,
        user=user,
        damage_record=damage_record,
        action="REOPENED",
        previous_status=prev_status,
        new_status="REOPENED",
        previous_resolution_type=prev_res_type,
        new_resolution_type=damage_record.compensation_type,
        previous_compensation_amount=prev_amt,
        new_compensation_amount=damage_record.compensation_amount,
        reason=reason,
        notes=notes,
    )
    _add_qc_history_entry(
        db, user, damage_record, "REOPENED",
        f"Damage record reopened. Reason: {reason}. {notes or ''}".strip()
    )

    await db.commit()
    await db.refresh(damage_record)
    return damage_record


async def change_damaged_item_resolution(
    db: AsyncSession,
    user,
    damaged_item_id: int,
    new_resolution_type: str,
    compensation_type: str | None = None,
    amount: Decimal | None = None,
    loss_reason: str | None = None,
    loss_amount: Decimal | None = None,
    is_promise: bool = False,
    expected_date: str | None = None,
    change_reason: str = "",
    notes: str | None = None,
) -> QCDamagedItem:
    """
    Change resolution of a damage record (from Loss to Compensation, or change vendor resolution).
    Requires a mandatory change reason and logs a RESOLUTION_CHANGED audit record.
    """
    stmt = (
        select(QCDamagedItem)
        .where(QCDamagedItem.id == damaged_item_id)
        .options(
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.product),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
    )
    damage_record = (await db.execute(stmt)).scalar_one_or_none()
    if not damage_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Damaged Item Record #{damaged_item_id} not found",
        )

    prev_status = damage_record.status
    prev_res_type = damage_record.compensation_type
    prev_amt = damage_record.compensation_amount

    # Route based on stage / liability origin
    if damage_record.stage == "POST_LAB" or damage_record.damage_type == "LAB_DAMAGE":
        res = await resolve_lab_damage(
            db=db,
            user=user,
            damaged_item_id=damaged_item_id,
            resolution_type=new_resolution_type,
            amount=amount,
            loss_reason=loss_reason or change_reason,
            loss_amount=loss_amount,
            notes=f"Changed resolution: {change_reason}. {notes or ''}".strip(),
            is_promise=is_promise,
            expected_date=expected_date,
        )
    else:
        res = await resolve_supplier_damage(
            db=db,
            user=user,
            damaged_item_id=damaged_item_id,
            resolution_type=new_resolution_type,
            compensation_type=compensation_type,
            amount=amount,
            loss_reason=loss_reason or change_reason,
            loss_amount=loss_amount,
            notes=f"Changed resolution: {change_reason}. {notes or ''}".strip(),
            is_promise=is_promise,
            expected_date=expected_date,
        )

    _add_damage_item_history_entry(
        db=db,
        user=user,
        damage_record=res,
        action="RESOLUTION_CHANGED",
        previous_status=prev_status,
        new_status=res.status,
        previous_resolution_type=prev_res_type,
        new_resolution_type=new_resolution_type,
        previous_compensation_amount=prev_amt,
        new_compensation_amount=amount,
        reason=change_reason,
        notes=notes,
    )
    await db.commit()
    await db.refresh(res)
    return res


async def get_damaged_item_history(
    db: AsyncSession,
    damaged_item_id: int,
) -> list[QCDamagedItemHistory]:
    """Retrieve full chronological audit trail of resolutions, promises, and status changes."""
    stmt = (
        select(QCDamagedItemHistory)
        .where(QCDamagedItemHistory.damaged_item_id == damaged_item_id)
        .order_by(QCDamagedItemHistory.created_at.desc())
    )
    return (await db.execute(stmt)).scalars().all()


async def list_damaged_items(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    damage_type: str | None = None,
    stage: str | None = None,
    status: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    """List all QC damaged/issue items for the Deadstock & QC portal."""
    filters = [QCDamagedItem.admin_id == admin_id]
    if store_id:
        filters.append(QCDamagedItem.store_id == store_id)
    if damage_type and damage_type != "All":
        filters.append(QCDamagedItem.damage_type == damage_type)
    if stage and stage != "All":
        filters.append(QCDamagedItem.stage == stage)
    if status and status != "All":
        filters.append(QCDamagedItem.status == status)

    query = (
        select(QCDamagedItem)
        .where(*filters)
        .options(
            selectinload(QCDamagedItem.product).selectinload(Product.category),
            selectinload(QCDamagedItem.product).selectinload(Product.brand),
            selectinload(QCDamagedItem.store),
            selectinload(QCDamagedItem.sale_item).selectinload(SaleItem.sale),
            selectinload(QCDamagedItem.supplier),
            selectinload(QCDamagedItem.lab),
        )
        .order_by(QCDamagedItem.id.desc())
    )

    total_stmt = select(func.count()).select_from(query.subquery())
    total = (await db.execute(total_stmt)).scalar() or 0

    items_result = await db.execute(query.offset((page - 1) * limit).limit(limit))
    records = items_result.scalars().all()

    # Formatted response items
    formatted_items = []
    for r in records:
        prod = r.product
        product_name = prod.name if prod else None
        product_sku = prod.sku if prod else None
        product_cost = prod.cost_price if prod else None
        product_price = prod.selling_price if prod else None
        category_name = prod.category.name if prod and getattr(prod, "category", None) else None
        brand_name = prod.brand.name if prod and getattr(prod, "brand", None) else None
        warranty_m = getattr(prod, "warranty_months", 0) if prod else 0

        store_name = r.store.store_name if r.store else None
        invoice = r.sale_item.sale.invoice_number if r.sale_item and r.sale_item.sale else None
        supplier_name = r.supplier.company_name if r.supplier else None
        supplier_phone = getattr(r.supplier, "phone", None) if r.supplier else None
        supplier_email = getattr(r.supplier, "email", None) if r.supplier else None

        lab_name = r.lab.name if r.lab else None
        lab_phone = getattr(r.lab, "contact_number", None) if r.lab else None
        lab_email = getattr(r.lab, "email", None) if r.lab else None
        rework_cnt = r.sale_item.rework_count if r.sale_item else 0

        # Warranty status calculation
        warranty_status = r.warranty_status
        if warranty_status == "UNKNOWN" and warranty_m > 0:
            warranty_status = f"IN_WARRANTY ({warranty_m}M)"

        formatted_items.append({
            "id": r.id,
            "admin_id": r.admin_id,
            "store_id": r.store_id,
            "sale_item_id": r.sale_item_id,
            "product_id": r.product_id,
            "product_name": product_name,
            "product_sku": product_sku,
            "product_cost": product_cost,
            "product_price": product_price,
            "category_name": category_name,
            "brand_name": brand_name,
            "warranty_months": warranty_m,
            "store_name": store_name,
            "invoice_number": invoice,
            "supplier_id": r.supplier_id,
            "supplier_name": supplier_name,
            "supplier_phone": supplier_phone,
            "supplier_email": supplier_email,
            "lab_id": r.lab_id,
            "lab_name": lab_name,
            "lab_phone": lab_phone,
            "lab_email": lab_email,
            "damage_type": r.damage_type,
            "stage": r.stage,
            "warranty_status": warranty_status,
            "compensation_type": r.compensation_type,
            "compensation_amount": r.compensation_amount,
            "supplier_payment_id": r.supplier_payment_id,
            "status": r.status,
            "resolution_notes": r.resolution_notes,
            "loss_reason": r.loss_reason,
            "loss_amount": r.loss_amount,
            "rework_count": rework_cnt,
            "is_promise_pending": bool(r.is_promise_pending),
            "expected_resolution_date": r.expected_resolution_date,
            "reopen_count": r.reopen_count or 0,
            "last_reopened_at": r.last_reopened_at,
            "last_reopened_reason": r.last_reopened_reason,
            "created_at": r.created_at,
            "updated_at": r.updated_at,
        })

    return {
        "items": formatted_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
    }


async def get_item_qc_history(db: AsyncSession, sale_item_id: int) -> list[SaleItemQCHistory]:
    """Retrieve full chronological inspection audit history for a SaleItem."""
    stmt = (
        select(SaleItemQCHistory)
        .where(SaleItemQCHistory.sale_item_id == sale_item_id)
        .order_by(SaleItemQCHistory.created_at.asc())
    )
    return (await db.execute(stmt)).scalars().all()
