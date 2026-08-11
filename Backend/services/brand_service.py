# Service: brand_service.py
from sqlalchemy import select, func as sa_func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.brand import Brand
from models.product import Product
from models.inventory import Inventory
from schemas.brand import BrandCreate, BrandUpdate


async def create_brand(
    db: AsyncSession,
    admin_id: int,
    payload: BrandCreate,
) -> Brand:
    """Create a new brand owned by the given admin."""
    brand = Brand(
        admin_id=admin_id,
        store_id=payload.store_id,
        name=payload.name,
    )
    db.add(brand)
    await db.commit()
    await db.refresh(brand)
    return brand


async def get_brand(db: AsyncSession, brand_id: int) -> Brand | None:
    """Fetch a single brand by ID."""
    stmt = select(Brand).where(Brand.id == brand_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_brands_by_admin(
    db: AsyncSession,
    admin_id: int,
    active_status: str | None = None,
    search: str | None = None,
    store_id: int | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[dict], int, int, int]:
    """List brands for a given admin with optional pagination, search, and
    store-specific product counts.  Returns (items, total_count, active_count, inactive_count).

    Each item is a dict with the Brand columns plus a `products_count` int.
    Uses a LEFT JOIN + subquery aggregate to avoid N+1 queries.
    """

    # ── Product-count subquery scoped to a store (via Inventory) ──
    if store_id is not None:
        count_sq = (
            select(Product.brand_id, sa_func.count(Product.id).label("cnt"))
            .join(Inventory, Inventory.product_id == Product.id)
            .where(
                Inventory.owner_type == "STORE",
                Inventory.owner_id == store_id,
                Inventory.is_active.is_(True),
            )
            .group_by(Product.brand_id)
            .subquery()
        )
    else:
        count_sq = (
            select(Product.brand_id, sa_func.count(Product.id).label("cnt"))
            .where(Product.admin_id == admin_id)
            .group_by(Product.brand_id)
            .subquery()
        )

    # ── Base conditions ──
    conditions = [Brand.admin_id == admin_id]
    if store_id is not None:
        conditions.append(or_(Brand.store_id == store_id, Brand.store_id.is_(None)))
    if active_status == "active":
        conditions.append(Brand.is_active.is_(True))
    elif active_status == "inactive":
        conditions.append(Brand.is_active.is_(False))
    if search:
        conditions.append(Brand.name.ilike(f"%{search.strip()}%"))

    # ── Total count of matching records ──
    count_stmt = select(sa_func.count(Brand.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # ── Global count statistics ──
    count_conditions = [Brand.admin_id == admin_id]
    if store_id is not None:
        count_conditions.append(or_(Brand.store_id == store_id, Brand.store_id.is_(None)))
    active_stmt = select(sa_func.count(Brand.id)).where(*count_conditions, Brand.is_active.is_(True))
    inactive_stmt = select(sa_func.count(Brand.id)).where(*count_conditions, Brand.is_active.is_(False))
    active_cnt = (await db.execute(active_stmt)).scalar() or 0
    inactive_cnt = (await db.execute(inactive_stmt)).scalar() or 0

    # ── Data query with product count ──
    data_stmt = (
        select(Brand, sa_func.coalesce(count_sq.c.cnt, 0).label("products_count"))
        .outerjoin(count_sq, Brand.id == count_sq.c.brand_id)
        .where(*conditions)
        .order_by(Brand.name)
    )

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    rows = (await db.execute(data_stmt)).all()

    items = []
    for brand, cnt in rows:
        items.append({
            "id": brand.id,
            "admin_id": brand.admin_id,
            "name": brand.name,
            "is_active": brand.is_active,
            "created_at": brand.created_at,
            "updated_at": brand.updated_at,
            "products_count": cnt,
            "store_id": brand.store_id,
        })

    # Deduplicate by name when admin fetches all (no store_id filter).
    # Prefer global brands (store_id IS NULL) and keep highest product count.
    if store_id is None and items:
        seen = {}
        for item in items:
            name_key = item["name"].strip().lower()
            if name_key not in seen:
                seen[name_key] = item
            else:
                existing = seen[name_key]
                if existing.get("store_id") is not None and item.get("store_id") is None:
                    item["products_count"] = max(item["products_count"], existing["products_count"])
                    seen[name_key] = item
                else:
                    existing["products_count"] = max(existing["products_count"], item["products_count"])
        items = list(seen.values())
        total = len(items)

    # Remove internal store_id key before returning
    for item in items:
        item.pop("store_id", None)

    return items, total, active_cnt, inactive_cnt


async def update_brand(
    db: AsyncSession,
    brand: Brand,
    payload: BrandUpdate,
) -> Brand:
    """Apply partial updates to a brand."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(brand, field, value)
    await db.commit()
    await db.refresh(brand)
    return brand


async def delete_brand(db: AsyncSession, brand: Brand) -> Brand:
    """Soft-delete a brand by deactivating it."""
    brand.is_active = False
    await db.commit()
    await db.refresh(brand)
    return brand
