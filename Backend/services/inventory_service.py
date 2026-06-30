# Service: inventory_service.py
from sqlalchemy import select, and_, or_, func as sa_func
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
    warehouse_only: bool = False,
) -> dict:
    """List inventory records for a given owner with pagination, filtering, and stats.
    
    Returns a dict with: items, total, page, limit, pages, and stats (low_stock_count, etc).
    """
    from sqlalchemy.orm import selectinload
    from models.product import Product
    import math

    owner_type = owner_type.upper()

    # ── Base filter conditions ──
    if owner_type == "ADMIN" and not warehouse_only:
        # Warehouse view: show ALL inventory for this admin's stores + warehouse
        from sqlalchemy import or_ as _or
        from models.store import Store
        store_ids_stmt = select(Store.id).where(Store.admin_id == owner_id)
        store_ids_result = await db.execute(store_ids_stmt)
        store_ids = [row[0] for row in store_ids_result.fetchall()]

        ownership_conditions = [
            and_(Inventory.owner_type == "ADMIN", Inventory.owner_id == owner_id),
        ]
        if store_ids:
            ownership_conditions.append(
                and_(Inventory.owner_type == "STORE", Inventory.owner_id.in_(store_ids)),
            )
        base_conditions = [_or(*ownership_conditions)]
    else:
        base_conditions = [
            Inventory.owner_type == owner_type,
            Inventory.owner_id == owner_id,
        ]
    if active_only:
        base_conditions.append(Inventory.is_active.is_(True))

    # ── Join conditions for filtering ──
    filter_conditions = list(base_conditions)
    if search:
        search_term = f"%{search.strip()}%"
        filter_conditions.append(
            or_(
                Product.name.ilike(search_term),
                Product.sku.ilike(search_term),
            )
        )
    if category_id is not None:
        filter_conditions.append(Product.category_id == category_id)
    if subcategory_id is not None:
        filter_conditions.append(Product.subcategory_id == subcategory_id)
    if brand_id is not None:
        filter_conditions.append(Product.brand_id == brand_id)

    # ── Stock status conditions ──
    if stock_status:
        if stock_status == "out_of_stock":
            filter_conditions.append(Inventory.available_quantity == 0)
        elif stock_status == "low_stock":
            filter_conditions.append(
                and_(
                    Inventory.available_quantity > 0,
                    or_(
                        and_(
                            Inventory.reorder_level > 0,
                            Inventory.available_quantity <= Inventory.reorder_level,
                        ),
                        and_(
                            Inventory.reorder_level == 0,
                            Inventory.available_quantity <= 10,
                        ),
                    )
                )
            )
        elif stock_status == "in_stock":
            filter_conditions.append(
                or_(
                    and_(
                        Inventory.reorder_level > 0,
                        Inventory.available_quantity > Inventory.reorder_level,
                    ),
                    and_(
                        Inventory.reorder_level == 0,
                        Inventory.available_quantity > 10,
                    ),
                )
            )

    # ── Stats queries (based on base owner filters, not current search/stock filters) ──
    # Total distinct products for this owner
    total_products_stmt = select(sa_func.count(Inventory.id)).where(*base_conditions)
    low_stock_stmt = select(sa_func.count(Inventory.id)).where(
        *base_conditions,
        Inventory.available_quantity > 0,
        or_(
            and_(
                Inventory.reorder_level > 0,
                Inventory.available_quantity <= Inventory.reorder_level,
            ),
            and_(
                Inventory.reorder_level == 0,
                Inventory.available_quantity <= 10,
            ),
        )
    )
    out_of_stock_stmt = select(sa_func.count(Inventory.id)).where(
        *base_conditions,
        Inventory.available_quantity == 0
    )
    valuation_stmt = (
        select(sa_func.coalesce(sa_func.sum(Inventory.quantity * Product.selling_price), 0))
        .join(Product, Inventory.product_id == Product.id)
        .where(*base_conditions)
    )

    t_res = await db.execute(total_products_stmt)
    l_res = await db.execute(low_stock_stmt)
    o_res = await db.execute(out_of_stock_stmt)
    v_res = await db.execute(valuation_stmt)

    stats = {
        "total_products": t_res.scalar() or 0,
        "low_stock_count": l_res.scalar() or 0,
        "out_of_stock_count": o_res.scalar() or 0,
        "total_valuation": float(v_res.scalar() or 0),
    }

    # ── Main Filtered Count ──
    count_stmt = select(sa_func.count(Inventory.id)).join(Product, Inventory.product_id == Product.id).where(*filter_conditions)
    count_result = await db.execute(count_stmt)
    total_filtered = count_result.scalar() or 0

    # ── Data query ──
    from models.supplier_product import SupplierProduct
    data_stmt = (
        select(Inventory)
        .join(Product, Inventory.product_id == Product.id)
        .where(*filter_conditions)
        .options(
            selectinload(Inventory.product).selectinload(Product.category),
            selectinload(Inventory.product).selectinload(Product.subcategory),
            selectinload(Inventory.product).selectinload(Product.brand),
            selectinload(Inventory.product).selectinload(Product.supplier_products).selectinload(SupplierProduct.supplier),
        )
        .order_by(Inventory.id.desc())
    )

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    result = await db.execute(data_stmt)
    items = list(result.scalars().unique().all())

    return {
        "items": items,
        "total": total_filtered,
        "page": page,
        "limit": limit,
        "pages": math.ceil(total_filtered / limit) if total_filtered > 0 else 1,
        **stats
    }


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
