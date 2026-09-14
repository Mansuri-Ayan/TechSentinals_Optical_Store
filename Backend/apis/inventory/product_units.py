from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload
from typing import List, Optional
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from models.product_unit import ProductUnit, UnitStatus
from models.inventory import OwnerType, Inventory
from models.product import Product
from models.sale_item import SaleItem
from models.store import Store
from schemas.product_unit import ProductUnitRead, ProductUnitDetailRead

router = APIRouter()

@router.get("/", response_model=List[ProductUnitDetailRead])
async def list_product_units(
    response: Response,
    product_id: Optional[int] = None,
    inventory_batch_id: Optional[int] = None,
    status_filter: Optional[List[str]] = Query(None, alias="status"),
    owner_type: Optional[OwnerType] = None,
    owner_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
):
    """List product units, filtered by various criteria."""
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)
    
    stmt = select(ProductUnit).join(Product, ProductUnit.product_id == Product.id)
    
    # Enforce tenant security
    stmt = stmt.where(Product.admin_id == admin_id)
    
    from models.worker import Worker
    from models.optician import Optician
    from models.accountant import Accountant
    from models.manager import Manager

    is_store_scoped = isinstance(current_user, (Worker, Optician, Manager)) or (isinstance(current_user, Accountant) and getattr(current_user, "store_id", None) is not None)

    if is_store_scoped:
        context_owner_type = OwnerType.STORE
        context_owner_id = current_user.store_id
        is_owner_filtered = True
    elif owner_type is not None and owner_id is not None:
        context_owner_type = owner_type
        context_owner_id = owner_id
        is_owner_filtered = True
    else:
        context_owner_type = None
        context_owner_id = None
        is_owner_filtered = False

    # Auto-backfill missing ProductUnit records for requested batch or product
    from services.product_unit_service import ensure_units_for_batch, ensure_units_for_product
    if inventory_batch_id:
        await ensure_units_for_batch(db, inventory_batch_id)
    elif product_id:
        await ensure_units_for_product(db, product_id)

    if product_id:
        stmt = stmt.where(ProductUnit.product_id == product_id)

    # Handle status and transferred filtering
    is_transferred_filter = False
    cleaned_statuses = []
    if status_filter:
        for s in status_filter:
            if s.upper() == 'TRANSFERRED':
                is_transferred_filter = True
            else:
                cleaned_statuses.append(s)

    if inventory_batch_id:
        batch = await db.get(Inventory, inventory_batch_id)
        if not batch:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Batch not found",
            )
        if is_store_scoped:
            if batch.owner_type != OwnerType.STORE or batch.owner_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this inventory batch",
                )

        stmt = stmt.where(
            or_(
                ProductUnit.inventory_batch_id == inventory_batch_id,
                ProductUnit.original_batch_id == inventory_batch_id,
            )
        )

        batch_owner_type = batch.owner_type
        batch_owner_id = batch.owner_id

        # A unit is transferred relative to this batch if it now belongs to a different batch or owner
        is_transferred_condition = or_(
            ProductUnit.inventory_batch_id != inventory_batch_id,
            ProductUnit.owner_type != batch_owner_type,
            ProductUnit.owner_id != batch_owner_id,
        )

        if status_filter:
            conditions = []
            if cleaned_statuses:
                # If AVAILABLE is requested, for this batch it means units currently in this batch with status AVAILABLE
                if 'AVAILABLE' in [s.upper() for s in cleaned_statuses]:
                    other_statuses = [s for s in cleaned_statuses if s.upper() != 'AVAILABLE']
                    avail_cond = and_(
                        ProductUnit.status == UnitStatus.AVAILABLE,
                        ProductUnit.inventory_batch_id == inventory_batch_id,
                    )
                    if other_statuses:
                        conditions.append(or_(avail_cond, ProductUnit.status.in_(other_statuses)))
                    else:
                        conditions.append(avail_cond)
                else:
                    conditions.append(ProductUnit.status.in_(cleaned_statuses))

            if is_transferred_filter:
                conditions.append(is_transferred_condition)

            if conditions:
                stmt = stmt.where(or_(*conditions))

    else:
        # Querying without a specific batch (e.g. "All Batches" mode)
        is_owned_by_context = (
            and_(
                ProductUnit.owner_type == context_owner_type,
                ProductUnit.owner_id == context_owner_id,
            )
            if is_owner_filtered
            else None
        )

        if status_filter:
            conditions = []
            if cleaned_statuses:
                if is_owner_filtered:
                    conditions.append(
                        and_(
                            ProductUnit.status.in_(cleaned_statuses),
                            is_owned_by_context,
                        )
                    )
                else:
                    conditions.append(ProductUnit.status.in_(cleaned_statuses))

            if is_transferred_filter:
                if is_owner_filtered:
                    # In store/owner context, transferred means units that came from another original batch
                    conditions.append(
                        and_(
                            is_owned_by_context,
                            ProductUnit.original_batch_id.isnot(None),
                            ProductUnit.original_batch_id != ProductUnit.inventory_batch_id,
                        )
                    )
                else:
                    conditions.append(
                        and_(
                            ProductUnit.original_batch_id.isnot(None),
                            ProductUnit.original_batch_id != ProductUnit.inventory_batch_id,
                        )
                    )

            if conditions:
                stmt = stmt.where(or_(*conditions))
        else:
            if is_owner_filtered:
                stmt = stmt.where(is_owned_by_context)
            
    if search:
        cleaned_search = "".join(c for c in search if c.isalnum()).upper()
        stmt = stmt.where(ProductUnit.unit_sku.ilike(f"%{cleaned_search}%"))
        
    # Get total count
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total_count = await db.scalar(count_stmt)
    response.headers["X-Total-Count"] = str(total_count)

    stmt = stmt.options(
        selectinload(ProductUnit.inventory_batch).selectinload(Inventory.supplier),
        selectinload(ProductUnit.sale_item).selectinload(SaleItem.sale)
    )

    stmt = stmt.order_by(ProductUnit.id.asc()).offset(skip).limit(limit)
    result = await db.execute(stmt)
    units = result.scalars().all()
    
    # Load store names for transfers
    stores_stmt = select(Store.id, Store.store_name).where(Store.admin_id == admin_id)
    stores_res = await db.execute(stores_stmt)
    store_map = {row[0]: row[1] for row in stores_res.fetchall()}

    res_list = []
    for unit in units:
        unit_dict = {
            "id": unit.id,
            "unit_sku": unit.unit_sku,
            "product_id": unit.product_id,
            "inventory_batch_id": unit.inventory_batch_id,
            "original_batch_id": unit.original_batch_id,
            "status": unit.status,
            "owner_type": unit.owner_type,
            "owner_id": unit.owner_id,
            "source_type": unit.source_type,
            "manufacturer_serial": unit.manufacturer_serial,
            "sale_item_id": unit.sale_item_id,
            "repair_id": unit.repair_id,
            "sold_at": unit.sold_at,
            "created_at": unit.created_at,
            "updated_at": unit.updated_at,
        }

        is_transferred_away = False
        if inventory_batch_id and batch:
            is_transferred_away = (
                unit.inventory_batch_id != inventory_batch_id or
                unit.owner_type != batch.owner_type or
                unit.owner_id != batch.owner_id
            )
        elif unit.original_batch_id and unit.original_batch_id != unit.inventory_batch_id:
            is_transferred_away = True

        transferred_name = None
        if is_transferred_away:
            transferred_name = store_map.get(unit.owner_id) if unit.owner_type == OwnerType.STORE else "Admin Warehouse"

        unit_dict["transferred_to_store_name"] = transferred_name
        
        if unit.inventory_batch:
            unit_dict["batch_purchase_date"] = unit.inventory_batch.purchase_date
            unit_dict["batch_cost_price"] = unit.inventory_batch.purchase_cost
            if unit.inventory_batch.supplier:
                unit_dict["batch_supplier_name"] = unit.inventory_batch.supplier.company_name
                
        if unit.sale_item and unit.sale_item.sale:
            unit_dict["invoice_number"] = unit.sale_item.sale.invoice_number
            unit_dict["sale_id"] = unit.sale_item.sale.id
            
        res_list.append(unit_dict)
        
    return res_list


@router.get("/lookup/{unit_sku}", response_model=ProductUnitDetailRead)
async def lookup_product_unit(
    unit_sku: str,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('inventory', 'read')),
):
    """Lookup a specific product unit by its SKU."""
    if isinstance(current_user, Admin):
        admin_id = current_user.id
    else:
        admin_id = get_user_admin_id(current_user)
    
    stmt = (
        select(ProductUnit)
        .join(Product, ProductUnit.product_id == Product.id)
        .where(Product.admin_id == admin_id)
        .where(ProductUnit.unit_sku == unit_sku)
        .options(
            selectinload(ProductUnit.inventory_batch).selectinload(Inventory.supplier),
            selectinload(ProductUnit.sale_item).selectinload(SaleItem.sale)
        )
    )
    result = await db.execute(stmt)
    unit = result.scalar_one_or_none()
    
    if not unit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product unit not found"
        )

    if not isinstance(current_user, Admin):
        from models.worker import Worker
        from models.optician import Optician
        from models.accountant import Accountant
        from models.manager import Manager

        is_store_scoped = isinstance(current_user, (Worker, Optician, Manager)) or (isinstance(current_user, Accountant) and getattr(current_user, "store_id", None) is not None)
        if is_store_scoped:
            if unit.owner_type != OwnerType.STORE or unit.owner_id != current_user.store_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this product unit",
                )
        
    unit_dict = {
        "id": unit.id,
        "unit_sku": unit.unit_sku,
        "product_id": unit.product_id,
        "inventory_batch_id": unit.inventory_batch_id,
        "status": unit.status,
        "owner_type": unit.owner_type,
        "owner_id": unit.owner_id,
        "source_type": unit.source_type,
        "manufacturer_serial": unit.manufacturer_serial,
        "sale_item_id": unit.sale_item_id,
        "repair_id": unit.repair_id,
        "sold_at": unit.sold_at,
        "created_at": unit.created_at,
        "updated_at": unit.updated_at,
    }
    
    if unit.inventory_batch:
        unit_dict["batch_purchase_date"] = unit.inventory_batch.purchase_date
        unit_dict["batch_cost_price"] = unit.inventory_batch.purchase_cost
        if unit.inventory_batch.supplier:
            unit_dict["batch_supplier_name"] = unit.inventory_batch.supplier.company_name
            
    if unit.sale_item and unit.sale_item.sale:
        unit_dict["invoice_number"] = unit.sale_item.sale.invoice_number
        unit_dict["sale_id"] = unit.sale_item.sale.id
        
    return unit_dict
