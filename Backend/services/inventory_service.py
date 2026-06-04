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
    search: str | None = None,
    category_id: int | None = None,
    subcategory_id: int | None = None,
    brand_id: int | None = None,
    stock_status: str | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[Inventory], int]:
    """List inventory records for a given owner with pagination and filtering.
    
    Returns a tuple of (items, total_count).
    Uses explicit joins + selectinload to avoid N+1 queries.
    """
    from sqlalchemy.orm import selectinload, joinedload
    from sqlalchemy import func as sa_func, or_
    from models.product import Product

    owner_type = owner_type.upper()

    # ── Base filter conditions ──
    base_conditions = [
        Inventory.owner_type == owner_type,
        Inventory.owner_id == owner_id,
    ]
    if active_only:
        base_conditions.append(Inventory.is_active.is_(True))

    # ── Join-dependent filter conditions ──
    join_conditions = []
    needs_product_join = False

    if search:
        needs_product_join = True
        search_term = f"%{search.strip()}%"
        join_conditions.append(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
            )
        )

    if category_id is not None:
        needs_product_join = True
        join_conditions.append(Product.category_id == category_id)

    if subcategory_id is not None:
        needs_product_join = True
        join_conditions.append(Product.subcategory_id == subcategory_id)

    if brand_id is not None:
        needs_product_join = True
        join_conditions.append(Product.brand_id == brand_id)

    # ── Count query ──
    count_stmt = select(sa_func.count(Inventory.id)).where(*base_conditions)
    if needs_product_join:
        count_stmt = count_stmt.join(Product, Inventory.product_id == Product.id)
        if join_conditions:
            count_stmt = count_stmt.where(*join_conditions)

    # stock_status filter is post-join but pre-count
    if stock_status:
        if stock_status == "out_of_stock":
            count_stmt = count_stmt.where(Inventory.available_quantity == 0)
        elif stock_status == "low_stock":
            count_stmt = count_stmt.where(
                Inventory.available_quantity > 0,
                Inventory.available_quantity <= Inventory.reorder_level,
            )
        elif stock_status == "in_stock":
            count_stmt = count_stmt.where(
                Inventory.available_quantity > Inventory.reorder_level,
            )

    count_result = await db.execute(count_stmt)
    total = count_result.scalar() or 0

    # ── Data query with eager loading ──
    data_stmt = (
        select(Inventory)
        .where(*base_conditions)
        .options(
            selectinload(Inventory.product)
            .selectinload(Product.category),
            selectinload(Inventory.product)
            .selectinload(Product.subcategory),
            selectinload(Inventory.product)
            .selectinload(Product.brand),
        )
    )

    if needs_product_join:
        # Use outerjoin so we can filter but still get Inventory rows
        data_stmt = data_stmt.join(Product, Inventory.product_id == Product.id)
        if join_conditions:
            data_stmt = data_stmt.where(*join_conditions)

    if stock_status:
        if stock_status == "out_of_stock":
            data_stmt = data_stmt.where(Inventory.available_quantity == 0)
        elif stock_status == "low_stock":
            data_stmt = data_stmt.where(
                Inventory.available_quantity > 0,
                Inventory.available_quantity <= Inventory.reorder_level,
            )
        elif stock_status == "in_stock":
            data_stmt = data_stmt.where(
                Inventory.available_quantity > Inventory.reorder_level,
            )

    data_stmt = data_stmt.order_by(Inventory.id.desc())

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    result = await db.execute(data_stmt)
    items = list(result.scalars().unique().all())

    return items, total


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
