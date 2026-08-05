from typing import Optional, List
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from models.product_unit import ProductUnit, UnitStatus, UnitSourceType
from models.inventory import OwnerType

async def generate_unit_skus(db: AsyncSession, product_id: int, product_sku: str, count: int) -> List[str]:
    """Generate globally unique unit SKUs for a product."""
    cleaned_product_sku = "".join(c for c in product_sku if c.isalnum()).upper()
    
    result = await db.execute(select(func.count(ProductUnit.id)).where(ProductUnit.product_id == product_id))
    db_count = result.scalar_one_or_none() or 0

    session_count = sum(
        1 for obj in db.new
        if isinstance(obj, ProductUnit) and obj.product_id == product_id
    )
    current_count = db_count + session_count

    skus = []
    for i in range(1, count + 1):
        seq = current_count + i
        skus.append(f"{cleaned_product_sku}U{seq:04d}")
    return skus

async def create_units_for_batch(
    db: AsyncSession,
    product_id: int,
    product_sku: str,
    inventory_batch_id: int,
    count: int,
    owner_type: OwnerType,
    owner_id: int,
    source_type: UnitSourceType,
) -> None:
    """Create new product units when inventory enters the system."""
    if count <= 0:
        return
    skus = await generate_unit_skus(db, product_id, product_sku, count)
    units = [
        ProductUnit(
            unit_sku=sku,
            product_id=product_id,
            inventory_batch_id=inventory_batch_id,
            original_batch_id=inventory_batch_id,
            status=UnitStatus.AVAILABLE,
            owner_type=owner_type,
            owner_id=owner_id,
            source_type=source_type,
        )
        for sku in skus
    ]
    db.add_all(units)

async def _check_units_exist(db: AsyncSession, product_id: Optional[int] = None, sale_item_id: Optional[int] = None) -> bool:
    """Safety Rule 1 check: Return True if any units exist for this product/sale item."""
    if sale_item_id:
        result = await db.execute(select(func.count(ProductUnit.id)).where(ProductUnit.sale_item_id == sale_item_id))
    elif product_id:
        result = await db.execute(select(func.count(ProductUnit.id)).where(ProductUnit.product_id == product_id))
    else:
        return False
    count = result.scalar_one_or_none() or 0
    return count > 0

async def assign_units_to_sale_item(
    db: AsyncSession,
    product_id: int,
    owner_type: OwnerType,
    owner_id: int,
    quantity: int,
    sale_item_id: int,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    """Assign units to a sale item, marking them as SOLD."""
    if quantity <= 0:
        return
    if not await _check_units_exist(db, product_id=product_id):
        return  # Safety Rule 1

    units_to_assign = []
    if specific_unit_skus:
        result = await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.unit_sku.in_(specific_unit_skus),
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == owner_type,
                ProductUnit.owner_id == owner_id,
            )
        )
        units_to_assign = list(result.scalars().all())
        if len(units_to_assign) != len(specific_unit_skus):
            # We don't raise error due to safety rule, but we fallback to FIFO for remaining
            pass
    
    remaining_qty = quantity - len(units_to_assign)
    if remaining_qty > 0:
        result = await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.product_id == product_id,
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == owner_type,
                ProductUnit.owner_id == owner_id,
                ProductUnit.id.notin_([u.id for u in units_to_assign]) if units_to_assign else True
            )
            .order_by(ProductUnit.id.asc())
            .limit(remaining_qty)
        )
        fifo_units = list(result.scalars().all())
        units_to_assign.extend(fifo_units)

    for unit in units_to_assign:
        unit.status = UnitStatus.SOLD
        unit.sale_item_id = sale_item_id
        unit.sold_at = func.now()

async def restore_units_from_sale_item(
    db: AsyncSession,
    sale_item_id: int,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    """Restore specific (or all) units from a sale item back to AVAILABLE."""
    if not await _check_units_exist(db, sale_item_id=sale_item_id):
        return  # Safety Rule 1

    query = select(ProductUnit).where(ProductUnit.sale_item_id == sale_item_id)
    if specific_unit_skus:
        query = query.where(ProductUnit.unit_sku.in_(specific_unit_skus))

    result = await db.execute(query)
    units = list(result.scalars().all())
    for unit in units:
        unit.status = UnitStatus.AVAILABLE
        unit.sale_item_id = None
        unit.sold_at = None

async def transfer_units(
    db: AsyncSession,
    product_id: int,
    from_owner_type: OwnerType,
    from_owner_id: int,
    to_owner_type: OwnerType,
    to_owner_id: int,
    quantity: int,
    new_batch_id: int,
    specific_unit_skus: Optional[List[str]] = None,
    from_batch_id: Optional[int] = None,
) -> None:
    """Transfer units between stores/admin, updating owner and batch."""
    if quantity <= 0:
        return
    if not await _check_units_exist(db, product_id=product_id):
        return  # Safety Rule 1

    units_to_transfer = []
    if specific_unit_skus:
        result = await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.product_id == product_id,
                ProductUnit.unit_sku.in_(specific_unit_skus),
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == from_owner_type,
                ProductUnit.owner_id == from_owner_id,
            )
        )
        units_to_transfer = list(result.scalars().all())
    
    remaining_qty = quantity - len(units_to_transfer)
    if remaining_qty > 0:
        stmt = (
            select(ProductUnit)
            .where(
                ProductUnit.product_id == product_id,
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == from_owner_type,
                ProductUnit.owner_id == from_owner_id,
            )
        )
        if from_batch_id is not None:
            stmt = stmt.where(ProductUnit.inventory_batch_id == from_batch_id)
        if units_to_transfer:
            stmt = stmt.where(ProductUnit.id.notin_([u.id for u in units_to_transfer]))
        
        stmt = stmt.order_by(ProductUnit.id.asc()).limit(remaining_qty)
        result = await db.execute(stmt)
        fifo_units = list(result.scalars().all())
        units_to_transfer.extend(fifo_units)

    for unit in units_to_transfer:
        if unit.original_batch_id is None:
            unit.original_batch_id = unit.inventory_batch_id
        unit.owner_type = to_owner_type
        unit.owner_id = to_owner_id
        unit.inventory_batch_id = new_batch_id

async def mark_units_damaged(
    db: AsyncSession,
    product_id: int,
    owner_type: OwnerType,
    owner_id: int,
    quantity: int,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    """Mark units as DAMAGED."""
    if quantity <= 0:
        return
    if not await _check_units_exist(db, product_id=product_id):
        return  # Safety Rule 1
    
    await _mark_units_status(db, product_id, owner_type, owner_id, quantity, UnitStatus.DAMAGED, specific_unit_skus)

async def mark_units_lost(
    db: AsyncSession,
    product_id: int,
    owner_type: OwnerType,
    owner_id: int,
    quantity: int,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    """Mark units as LOST."""
    if quantity <= 0:
        return
    if not await _check_units_exist(db, product_id=product_id):
        return  # Safety Rule 1
    
    await _mark_units_status(db, product_id, owner_type, owner_id, quantity, UnitStatus.LOST, specific_unit_skus)

async def mark_units_sold(
    db: AsyncSession,
    product_id: int,
    owner_type: OwnerType,
    owner_id: int,
    quantity: int,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    """Mark units as SOLD."""
    if quantity <= 0:
        return
    if not await _check_units_exist(db, product_id=product_id):
        return  # Safety Rule 1
    
    await _mark_units_status(db, product_id, owner_type, owner_id, quantity, UnitStatus.SOLD, specific_unit_skus)

async def _mark_units_status(
    db: AsyncSession,
    product_id: int,
    owner_type: OwnerType,
    owner_id: int,
    quantity: int,
    new_status: UnitStatus,
    specific_unit_skus: Optional[List[str]] = None,
) -> None:
    units_to_mark = []
    if specific_unit_skus:
        result = await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.unit_sku.in_(specific_unit_skus),
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == owner_type,
                ProductUnit.owner_id == owner_id,
            )
        )
        units_to_mark = list(result.scalars().all())
    
    remaining_qty = quantity - len(units_to_mark)
    if remaining_qty > 0:
        result = await db.execute(
            select(ProductUnit)
            .where(
                ProductUnit.product_id == product_id,
                ProductUnit.status == UnitStatus.AVAILABLE,
                ProductUnit.owner_type == owner_type,
                ProductUnit.owner_id == owner_id,
                ProductUnit.id.notin_([u.id for u in units_to_mark]) if units_to_mark else True
            )
            .order_by(ProductUnit.id.asc())
            .limit(remaining_qty)
        )
        fifo_units = list(result.scalars().all())
        units_to_mark.extend(fifo_units)

    for unit in units_to_mark:
        unit.status = new_status

async def link_unit_to_repair(db: AsyncSession, unit_sku: str, repair_id: int) -> None:
    """Link a unit to a repair and set status to IN_REPAIR."""
    result = await db.execute(select(ProductUnit).where(ProductUnit.unit_sku == unit_sku))
    unit = result.scalar_one_or_none()
    if unit:
        unit.repair_id = repair_id
        unit.status = UnitStatus.IN_REPAIR

async def unlink_unit_from_repair(db: AsyncSession, repair_id: int) -> None:
    """Unlink units from a repair and set status to AVAILABLE."""
    result = await db.execute(select(ProductUnit).where(ProductUnit.repair_id == repair_id))
    units = list(result.scalars().all())
    for unit in units:
        unit.repair_id = None
        unit.status = UnitStatus.AVAILABLE

async def lookup_unit(db: AsyncSession, unit_sku: str) -> Optional[ProductUnit]:
    """Fetch a single unit by SKU."""
    result = await db.execute(select(ProductUnit).where(ProductUnit.unit_sku == unit_sku))
    return result.scalar_one_or_none()
