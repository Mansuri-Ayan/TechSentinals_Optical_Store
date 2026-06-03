# Service: inventory_service.py
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.inventory import Inventory, OwnerType
from schemas.inventory import InventoryCreate, InventoryUpdate


async def create_inventory(
    db: AsyncSession,
    payload: InventoryCreate,
) -> Inventory:
    """Create or get an inventory record for a specific owner + product."""
    # Check if inventory already exists
    existing = await get_inventory_by_owner_product(
        db,
        owner_type=payload.owner_type.value,
        owner_id=payload.owner_id,
        product_id=payload.product_id,
    )   
    if existing:
        return existing

    inventory = Inventory(
        owner_type=payload.owner_type.value,
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        available_quantity=payload.quantity,
        reorder_level=payload.reorder_level,
    )   
    db.add(inventory)
    await db.commit()
    await db.refresh(inventory)
    return inventory


async def get_inventory(db: AsyncSession, inventory_id: int) -> Inventory | None:
    """Fetch a single inventory record by ID."""
    stmt = select(Inventory).where(Inventory.id == inventory_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_inventory_by_owner_product(
    db: AsyncSession,
    owner_type: str,
    owner_id: int,
    product_id: int,
) -> Inventory | None:
    """Fetch inventory for a specific owner + product combination."""
    owner_type = owner_type.upper()
    stmt = select(Inventory).where(
        and_(
            Inventory.owner_type == owner_type,
            Inventory.owner_id == owner_id,
            Inventory.product_id == product_id,
        )
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_or_create_inventory(
    db: AsyncSession,
    owner_type: str,
    owner_id: int,
    product_id: int,
) -> Inventory:
    """Get existing inventory record or create a new one with zero quantities."""
    owner_type = owner_type.upper()
    existing = await get_inventory_by_owner_product(
        db, owner_type, owner_id, product_id,
    )
    if existing:
        return existing

    inventory = Inventory(
        owner_type=owner_type,
        owner_id=owner_id,
        product_id=product_id,
        quantity=0,
        available_quantity=0,
        reserved_quantity=0,
        reorder_level=0,
    )
    db.add(inventory)
    await db.flush()
    return inventory


async def get_inventories_by_owner(
    db: AsyncSession,
    owner_type: str,
    owner_id: int,
    active_only: bool = True,
    low_stock_only: bool = False,
    limit: int = 100,
    offset: int = 0,
) -> list[Inventory]:
    """List inventory records for a given owner."""
    owner_type = owner_type.upper()
    stmt = select(Inventory).where(
        Inventory.owner_type == owner_type,
        Inventory.owner_id == owner_id,
    )
    if active_only:
        stmt = stmt.where(Inventory.is_active.is_(True))
    if low_stock_only:
        stmt = stmt.where(Inventory.available_quantity <= Inventory.reorder_level)

    stmt = stmt.order_by(Inventory.product_id).limit(limit).offset(offset)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_low_stock_items(
    db: AsyncSession,
    admin_id: int,
) -> list[Inventory]:
    """
    Get all low-stock inventory items across admin warehouse and all stores.
    For admin, owner_type=ADMIN and owner_id=admin_id.
    Also includes store inventories where the store belongs to this admin.
    """
    from models.store import Store

    # Get admin's store IDs
    stmt_stores = select(Store.id).where(Store.admin_id == admin_id)
    result = await db.execute(stmt_stores)
    store_ids = [row[0] for row in result.fetchall()]

    # Build query for low-stock items
    stmt = select(Inventory).where(
        Inventory.is_active.is_(True),
        Inventory.available_quantity <= Inventory.reorder_level,
        Inventory.reorder_level > 0,  # only if reorder level is set
    )

    # Filter to this admin's inventory (admin warehouse + their stores)
    from sqlalchemy import or_
    conditions = [
        and_(Inventory.owner_type == OwnerType.ADMIN, Inventory.owner_id == admin_id),
    ]
    if store_ids:
        conditions.append(
            and_(Inventory.owner_type == OwnerType.STORE, Inventory.owner_id.in_(store_ids)),
        )
    stmt = stmt.where(or_(*conditions))
    stmt = stmt.order_by(Inventory.available_quantity)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_inventory(
    db: AsyncSession,
    inventory: Inventory,
    payload: InventoryUpdate,
) -> Inventory:
    """Apply partial updates to an inventory record."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(inventory, field, value)
    await db.commit()
    await db.refresh(inventory)
    return inventory
