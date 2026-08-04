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
    
    if product_id:
        stmt = stmt.where(ProductUnit.product_id == product_id)
    if inventory_batch_id:
        stmt = stmt.where(
            or_(
                ProductUnit.inventory_batch_id == inventory_batch_id,
                ProductUnit.original_batch_id == inventory_batch_id
            )
        )
    # Handle status and transferred filtering
    is_transferred_filter = False
    cleaned_statuses = []
    if status_filter:
        for s in status_filter:
            if s.upper() == 'TRANSFERRED':
                is_transferred_filter = True
            else:
                cleaned_statuses.append(s)

    context_owner_type = owner_type if owner_type else OwnerType.ADMIN
    context_owner_id = admin_id if context_owner_type == OwnerType.ADMIN else owner_id

    # Base conditions for ownership
    is_owned_by_context = and_(
        ProductUnit.owner_type == context_owner_type,
        ProductUnit.owner_id == context_owner_id
    )

    if inventory_batch_id:
        # We are querying a specific batch: support showing transferred units too!
        if status_filter:
            conditions = []
            if cleaned_statuses:
                conditions.append(
                    and_(
                        ProductUnit.status.in_(cleaned_statuses),
                        is_owned_by_context
                    )
                )
            if is_transferred_filter:
                conditions.append(
                    or_(
                        ProductUnit.owner_type != context_owner_type,
                        ProductUnit.owner_id != context_owner_id
                    )
                )
            
            if conditions:
                stmt = stmt.where(or_(*conditions))
    else:
        # Standard query without specific batch (e.g. searching globally or by owner)
        if status_filter:
            conditions = []
            if cleaned_statuses:
                if owner_type or owner_id:
                    conditions.append(
                        and_(
                            ProductUnit.status.in_(cleaned_statuses),
                            is_owned_by_context
                        )
                    )
                else:
                    conditions.append(ProductUnit.status.in_(cleaned_statuses))
            if is_transferred_filter:
                conditions.append(
                    or_(
                        ProductUnit.owner_type != context_owner_type,
                        ProductUnit.owner_id != context_owner_id
                    )
                )
            if conditions:
                stmt = stmt.where(or_(*conditions))
        else:
            if owner_type or owner_id:
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
            "transferred_to_store_name": store_map.get(unit.owner_id) if unit.owner_type == OwnerType.STORE else None
        }
        
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
