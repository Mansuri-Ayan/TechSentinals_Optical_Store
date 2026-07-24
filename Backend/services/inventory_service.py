# Service: inventory_service.py
from sqlalchemy import select, and_, or_, func as sa_func
from sqlalchemy.ext.asyncio import AsyncSession
from models.inventory import Inventory, OwnerType
from schemas.inventory import InventoryCreate, InventoryUpdate
from services.product_unit_service import create_units_for_batch
from models.product_unit import UnitSourceType


async def create_inventory(
    db: AsyncSession,
    payload: InventoryCreate,
) -> Inventory:
    """Create or get an inventory record for a specific owner + product."""
    # Check if inventory already exists only if quantity is 0
    if payload.quantity == 0:
        existing = await get_inventory_by_owner_product(
            db,
            owner_type=payload.owner_type.value,
            owner_id=payload.owner_id,
            product_id=payload.product_id,
        )   
        if existing:
            return existing

    from models.product import Product
    from models.supplier_product import SupplierProduct
    from datetime import datetime, timezone

    stmt = select(Product).where(Product.id == payload.product_id)
    prod_res = await db.execute(stmt)
    prod = prod_res.scalar_one_or_none()
    cost_price = prod.cost_price if prod else 0.00

    supplier_id = None
    if prod:
        stmt_sp = select(SupplierProduct.supplier_id).where(
            SupplierProduct.product_id == prod.id,
            SupplierProduct.is_active.is_(True)
        ).limit(1)
        sp_res = await db.execute(stmt_sp)
        supplier_id = sp_res.scalar()

    selling_price = payload.selling_price if payload.selling_price is not None else (prod.selling_price if prod else 0.00)

    inventory = Inventory(
        owner_type=payload.owner_type.value,
        owner_id=payload.owner_id,
        product_id=payload.product_id,
        quantity=payload.quantity,
        available_quantity=payload.quantity,
        reorder_level=payload.reorder_level,
        initial_quantity=payload.quantity,
        purchase_cost=cost_price,
        selling_price=selling_price,
        supplier_id=supplier_id,
        purchase_date=datetime.now(timezone.utc),
    )   
    db.add(inventory)
    await db.flush()

    if payload.quantity > 0 and prod:
        await create_units_for_batch(
            db=db,
            product_id=payload.product_id,
            product_sku=prod.sku,
            inventory_batch_id=inventory.id,
            count=payload.quantity,
            owner_type=payload.owner_type.value,
            owner_id=payload.owner_id,
            source_type=UnitSourceType.MANUAL_ADD,
        )

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

    from models.product import Product
    from models.supplier_product import SupplierProduct
    from datetime import datetime, timezone

    stmt = select(Product).where(Product.id == product_id)
    prod_res = await db.execute(stmt)
    prod = prod_res.scalar_one_or_none()
    cost_price = prod.cost_price if prod else 0.00

    supplier_id = None
    if prod:
        stmt_sp = select(SupplierProduct.supplier_id).where(
            SupplierProduct.product_id == prod.id,
            SupplierProduct.is_active.is_(True)
        ).limit(1)
        sp_res = await db.execute(stmt_sp)
        supplier_id = sp_res.scalar()

    inventory = Inventory(
        owner_type=owner_type,
        owner_id=owner_id,
        product_id=product_id,
        quantity=0,
        available_quantity=0,
        reserved_quantity=0,
        reorder_level=0,
        initial_quantity=0,
        purchase_cost=cost_price,
        supplier_id=supplier_id,
        purchase_date=datetime.now(timezone.utc),
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
    # Aggregated stock status filtering is applied at the group_by/having level rather than pre-aggregation WHERE clause.

    from decimal import Decimal

    # ── Stats queries (based on base owner filters, not current search/stock filters) ──
    stats_subq = (
        select(
            Inventory.product_id,
            sa_func.sum(Inventory.quantity).label("total_qty"),
            sa_func.sum(Inventory.available_quantity).label("total_avail"),
            sa_func.max(Inventory.reorder_level).label("max_reorder")
        )
        .where(*base_conditions)
        .group_by(Inventory.product_id)
        .subquery()
    )
    
    total_products_stmt = select(sa_func.count(stats_subq.c.product_id))
    low_stock_stmt = select(sa_func.count(stats_subq.c.product_id)).where(
        stats_subq.c.total_avail > 0,
        or_(
            and_(stats_subq.c.max_reorder > 0, stats_subq.c.total_avail <= stats_subq.c.max_reorder),
            and_(stats_subq.c.max_reorder == 0, stats_subq.c.total_avail <= 10),
        )
    )
    out_of_stock_stmt = select(sa_func.count(stats_subq.c.product_id)).where(
        stats_subq.c.total_avail == 0
    )
    valuation_stmt = (
        select(sa_func.coalesce(sa_func.sum(stats_subq.c.total_qty * Product.selling_price), 0))
        .select_from(stats_subq)
        .join(Product, Product.id == stats_subq.c.product_id)
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
    data_subq = (
        select(
            Inventory.product_id,
            sa_func.sum(Inventory.available_quantity).label("total_avail"),
            sa_func.max(Inventory.reorder_level).label("max_reorder")
        )
        .join(Product, Inventory.product_id == Product.id)
        .where(*filter_conditions)
        .group_by(Inventory.product_id)
    )
    
    having_conditions = []
    if stock_status:
        if stock_status == "out_of_stock":
            having_conditions.append(sa_func.sum(Inventory.available_quantity) == 0)
        elif stock_status == "low_stock":
            having_conditions.append(
                and_(
                    sa_func.sum(Inventory.available_quantity) > 0,
                    or_(
                        and_(sa_func.max(Inventory.reorder_level) > 0, sa_func.sum(Inventory.available_quantity) <= sa_func.max(Inventory.reorder_level)),
                        and_(sa_func.max(Inventory.reorder_level) == 0, sa_func.sum(Inventory.available_quantity) <= 10)
                    )
                )
            )
        elif stock_status == "in_stock":
            having_conditions.append(
                or_(
                    and_(sa_func.max(Inventory.reorder_level) > 0, sa_func.sum(Inventory.available_quantity) > sa_func.max(Inventory.reorder_level)),
                    and_(sa_func.max(Inventory.reorder_level) == 0, sa_func.sum(Inventory.available_quantity) > 10)
                )
            )
            
    if having_conditions:
        data_subq = data_subq.having(*having_conditions)
        
    count_stmt = select(sa_func.count()).select_from(data_subq.subquery())
    count_result = await db.execute(count_stmt)
    total_filtered = count_result.scalar() or 0

    # ── Data query ──
    data_stmt = (
        select(
            Inventory.product_id,
            sa_func.sum(Inventory.quantity).label("total_quantity"),
            sa_func.sum(Inventory.available_quantity).label("total_available_quantity"),
            sa_func.sum(Inventory.reserved_quantity).label("total_reserved_quantity"),
            sa_func.max(Inventory.reorder_level).label("max_reorder_level"),
            sa_func.min(Inventory.id).label("oldest_id"),
            sa_func.min(Inventory.created_at).label("oldest_created_at"),
            sa_func.max(Inventory.updated_at).label("newest_updated_at")
        )
        .join(Product, Inventory.product_id == Product.id)
        .where(*filter_conditions)
        .group_by(Inventory.product_id)
    )
    if having_conditions:
        data_stmt = data_stmt.having(*having_conditions)
        
    data_stmt = data_stmt.order_by(sa_func.min(Inventory.id).desc())

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    db_res = await db.execute(data_stmt)
    rows = db_res.all()
    
    items = []
    if rows:
        product_ids = [r.product_id for r in rows]
        
        from models.supplier_product import SupplierProduct
        prod_stmt = (
            select(Product)
            .where(Product.id.in_(product_ids))
            .options(
                selectinload(Product.category),
                selectinload(Product.subcategory),
                selectinload(Product.brand),
                selectinload(Product.supplier_products).selectinload(SupplierProduct.supplier),
            )
        )
        prod_res = await db.execute(prod_stmt)
        products_list = prod_res.scalars().all()
        product_map = {p.id: p for p in products_list}
        
        base_conditions_no_prod = list(base_conditions)
            
        oldest_stmt = (
            select(Inventory)
            .where(
                Inventory.product_id.in_(product_ids),
                Inventory.available_quantity > 0,
                *base_conditions_no_prod
            )
            .distinct(Inventory.product_id)
            .order_by(Inventory.product_id, Inventory.id.asc())
            .options(selectinload(Inventory.supplier))
        )
        oldest_res = await db.execute(oldest_stmt)
        oldest_rows = oldest_res.scalars().all()
        oldest_cost_map = {r.product_id: r.purchase_cost for r in oldest_rows}
        oldest_selling_price_map = {r.product_id: r.selling_price for r in oldest_rows}
        oldest_supplier_id_map = {r.product_id: r.supplier_id for r in oldest_rows}
        oldest_supplier_name_map = {r.product_id: r.supplier.company_name if r.supplier else None for r in oldest_rows}
        
        for r in rows:
            prod = product_map.get(r.product_id)
            current_batch_cost = oldest_cost_map.get(r.product_id, prod.cost_price if prod else Decimal("0.00"))
            
            from datetime import datetime
            from sqlalchemy.orm.attributes import set_committed_value
            
            mock_inv = Inventory(
                id=r.oldest_id or r.product_id,
                product_id=r.product_id,
                owner_type=OwnerType.STORE if owner_type == "STORE" else OwnerType.ADMIN,
                owner_id=owner_id,
                quantity=r.total_quantity,
                available_quantity=r.total_available_quantity,
                reserved_quantity=r.total_reserved_quantity,
                reorder_level=r.max_reorder_level,
                last_purchase_price=current_batch_cost,
                selling_price=oldest_selling_price_map.get(r.product_id),
                supplier_id=oldest_supplier_id_map.get(r.product_id),
                is_active=True,
                created_at=r.oldest_created_at or datetime.utcnow(),
                updated_at=r.newest_updated_at or datetime.utcnow(),
            )
            set_committed_value(mock_inv, "product", prod)
            mock_inv.supplier_name = oldest_supplier_name_map.get(r.product_id)
            items.append(mock_inv)

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
