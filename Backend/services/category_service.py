# Service: category_service.py
from sqlalchemy import select, func as sa_func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from models.category import Category
from models.subcategory import Subcategory
from models.product import Product
from models.inventory import Inventory
from models.store import Store
from models.store_category_loyalty import StoreCategoryLoyalty
from models.store_category_override import StoreCategoryOverride
from models.store_subcategory_override import StoreSubcategoryOverride
from schemas.category import (
    CategoryCreate, CategoryUpdate,
    SubcategoryCreate, SubcategoryUpdate,
)


# ── Category ───────────────────────────────────────────────────

async def create_category(
    db: AsyncSession,
    admin_id: int,
    payload: CategoryCreate,
) -> Category:
    """Create a new category owned by the given admin and create default loyalty records for stores."""
    category = Category(
        admin_id=admin_id,
        store_id=payload.store_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)

    # Auto-create default 50 points StoreCategoryLoyalty and StoreCategoryOverride for target stores
    if category.store_id is not None:
        scl = StoreCategoryLoyalty(
            store_id=category.store_id,
            category_id=category.id,
            points_per_unit=50,
            is_enabled=True,
        )
        db.add(scl)
        
        sco = StoreCategoryOverride(
            store_id=category.store_id,
            category_id=category.id,
            is_active=True,
        )
        db.add(sco)
        await db.commit()
    else:
        stores_stmt = select(Store.id).where(Store.admin_id == admin_id)
        store_ids = (await db.execute(stores_stmt)).scalars().all()
        for s_id in store_ids:
            scl = StoreCategoryLoyalty(
                store_id=s_id,
                category_id=category.id,
                points_per_unit=50,
                is_enabled=True,
            )
            db.add(scl)
            
            sco = StoreCategoryOverride(
                store_id=s_id,
                category_id=category.id,
                is_active=True,
            )
            db.add(sco)
        if store_ids:
            await db.commit()

    return category


async def get_category(db: AsyncSession, category_id: int) -> Category | None:
    """Fetch a single category by ID."""
    stmt = select(Category).where(Category.id == category_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_categories_by_admin(
    db: AsyncSession,
    admin_id: int,
    active_only: bool = False,
    search: str | None = None,
    store_id: int | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[dict], int]:
    """List categories for a given admin with optional pagination, search, and
    store-specific product counts.  Returns (items, total_count).

    Each item is a dict with the Category columns plus `subcategories_count`
    and `products_count` ints.  Uses subquery aggregates to avoid N+1.
    """

    # ── Product-count subquery scoped to a store (via Inventory) ──
    if store_id is not None:
        prod_sq = (
            select(Product.category_id, sa_func.count(Product.id).label("cnt"))
            .join(Inventory, Inventory.product_id == Product.id)
            .where(
                Inventory.owner_type == "STORE",
                Inventory.owner_id == store_id,
                Inventory.is_active.is_(True),
            )
            .group_by(Product.category_id)
            .subquery()
        )
    else:
        prod_sq = (
            select(Product.category_id, sa_func.count(Product.id).label("cnt"))
            .where(Product.admin_id == admin_id)
            .group_by(Product.category_id)
            .subquery()
        )

    # ── Subcategories-count subquery ──
    sub_sq = (
        select(
            Subcategory.category_id,
            sa_func.count(Subcategory.id).label("sub_cnt"),
        )
        .group_by(Subcategory.category_id)
        .subquery()
    )

    # ── Base conditions ──
    conditions = [Category.admin_id == admin_id]
    if store_id is not None:
        conditions.append(or_(Category.store_id == store_id, Category.store_id.is_(None)))
        if active_only:
            conditions.append(sa_func.coalesce(StoreCategoryOverride.is_active, Category.is_active).is_(True))
    else:
        if active_only:
            conditions.append(Category.is_active.is_(True))
    if search:
        conditions.append(Category.name.ilike(f"%{search.strip()}%"))

    # ── Total count ──
    if store_id is not None:
        count_stmt = (
            select(sa_func.count(Category.id))
            .outerjoin(
                StoreCategoryOverride,
                and_(StoreCategoryOverride.category_id == Category.id, StoreCategoryOverride.store_id == store_id)
            )
            .where(*conditions)
        )
    else:
        count_stmt = select(sa_func.count(Category.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # ── Data query ──
    if store_id is not None:
        data_stmt = (
            select(
                Category,
                sa_func.coalesce(StoreCategoryOverride.is_active, Category.is_active).label("resolved_is_active"),
                sa_func.coalesce(sub_sq.c.sub_cnt, 0).label("subcategories_count"),
                sa_func.coalesce(prod_sq.c.cnt, 0).label("products_count"),
            )
            .outerjoin(
                StoreCategoryOverride,
                and_(StoreCategoryOverride.category_id == Category.id, StoreCategoryOverride.store_id == store_id)
            )
            .outerjoin(sub_sq, Category.id == sub_sq.c.category_id)
            .outerjoin(prod_sq, Category.id == prod_sq.c.category_id)
            .where(*conditions)
            .order_by(Category.name)
        )
    else:
        data_stmt = (
            select(
                Category,
                Category.is_active.label("resolved_is_active"),
                sa_func.coalesce(sub_sq.c.sub_cnt, 0).label("subcategories_count"),
                sa_func.coalesce(prod_sq.c.cnt, 0).label("products_count"),
            )
            .outerjoin(sub_sq, Category.id == sub_sq.c.category_id)
            .outerjoin(prod_sq, Category.id == prod_sq.c.category_id)
            .where(*conditions)
            .order_by(Category.name)
        )

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    rows = (await db.execute(data_stmt)).all()

    items = []
    for cat, resolved_is_active, sub_cnt, prod_cnt in rows:
        items.append({
            "id": cat.id,
            "admin_id": cat.admin_id,
            "name": cat.name,
            "description": cat.description,
            "is_active": resolved_is_active,
            "created_at": cat.created_at,
            "updated_at": cat.updated_at,
            "subcategories_count": sub_cnt,
            "products_count": prod_cnt,
            "store_id": cat.store_id,
        })

    # Deduplicate by name when admin fetches all (no store_id filter).
    # Prefer global categories (store_id IS NULL) and aggregate product counts.
    if store_id is None and items:
        seen = {}
        for item in items:
            name_key = item["name"].strip().lower()
            if name_key not in seen:
                seen[name_key] = item
            else:
                existing = seen[name_key]
                # Prefer global (store_id=None) entry
                if existing.get("store_id") is not None and item.get("store_id") is None:
                    item["products_count"] = max(item["products_count"], existing["products_count"])
                    item["subcategories_count"] = max(item["subcategories_count"], existing["subcategories_count"])
                    seen[name_key] = item
                else:
                    existing["products_count"] = max(existing["products_count"], item["products_count"])
                    existing["subcategories_count"] = max(existing["subcategories_count"], item["subcategories_count"])
        items = list(seen.values())
        total = len(items)

    # Remove internal store_id key before returning
    for item in items:
        item.pop("store_id", None)

    return items, total


async def update_category(
    db: AsyncSession,
    category: Category,
    payload: CategoryUpdate,
    store_id: int | None = None,
) -> Category:
    """Apply partial updates to a category. If store_id is provided, is_active is updated in the override."""
    update_data = payload.model_dump(exclude_unset=True)
    
    # Handle is_active override
    if "is_active" in update_data and store_id is not None:
        is_active_val = update_data.pop("is_active")
        # Upsert in StoreCategoryOverride
        stmt = select(StoreCategoryOverride).where(
            StoreCategoryOverride.store_id == store_id,
            StoreCategoryOverride.category_id == category.id,
        )
        override = (await db.execute(stmt)).scalar_one_or_none()
        if override:
            override.is_active = is_active_val
        else:
            override = StoreCategoryOverride(
                store_id=store_id,
                category_id=category.id,
                is_active=is_active_val,
            )
            db.add(override)
        await db.commit()
        # Set transient attribute for response serialization
        category.is_active = is_active_val
        
    for field, value in update_data.items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(
    db: AsyncSession,
    category: Category,
    store_id: int | None = None,
) -> Category:
    """Soft-delete a category by deactivating it. If store_id is provided, deactivates in override."""
    if store_id is not None:
        stmt = select(StoreCategoryOverride).where(
            StoreCategoryOverride.store_id == store_id,
            StoreCategoryOverride.category_id == category.id,
        )
        override = (await db.execute(stmt)).scalar_one_or_none()
        if override:
            override.is_active = False
        else:
            override = StoreCategoryOverride(
                store_id=store_id,
                category_id=category.id,
                is_active=False,
            )
            db.add(override)
        await db.commit()
        category.is_active = False
    else:
        category.is_active = False
        await db.commit()
        await db.refresh(category)
    return category


# ── Subcategory ────────────────────────────────────────────────

async def create_subcategory(
    db: AsyncSession,
    category_id: int,
    payload: SubcategoryCreate,
) -> Subcategory:
    """Create a subcategory under the given category."""
    subcategory = Subcategory(
        category_id=category_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(subcategory)
    await db.commit()
    await db.refresh(subcategory)

    # Auto-provision StoreSubcategoryOverride entries based on parent category store scoping
    parent_stmt = select(Category).where(Category.id == category_id)
    parent = (await db.execute(parent_stmt)).scalar_one_or_none()
    if parent:
        if parent.store_id is not None:
            sso = StoreSubcategoryOverride(
                store_id=parent.store_id,
                subcategory_id=subcategory.id,
                is_active=True,
            )
            db.add(sso)
            await db.commit()
        else:
            stores_stmt = select(Store.id).where(Store.admin_id == parent.admin_id)
            store_ids = (await db.execute(stores_stmt)).scalars().all()
            for s_id in store_ids:
                sso = StoreSubcategoryOverride(
                    store_id=s_id,
                    subcategory_id=subcategory.id,
                    is_active=True,
                )
                db.add(sso)
            if store_ids:
                await db.commit()

    return subcategory


async def get_subcategory(db: AsyncSession, subcategory_id: int) -> Subcategory | None:
    """Fetch a single subcategory by ID."""
    stmt = select(Subcategory).where(Subcategory.id == subcategory_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_subcategories_by_category(
    db: AsyncSession,
    category_id: int,
    active_only: bool = False,
    search: str | None = None,
    store_id: int | None = None,
    page: int = 1,
    limit: int = 20,
    paginate: bool = True,
) -> tuple[list[dict], int]:
    """List subcategories for a given category with optional pagination, search,
    and store-specific product counts.  Returns (items, total_count).
    """

    # ── Product-count subquery scoped to a store (via Inventory) ──
    if store_id is not None:
        prod_sq = (
            select(Product.subcategory_id, sa_func.count(Product.id).label("cnt"))
            .join(Inventory, Inventory.product_id == Product.id)
            .where(
                Inventory.owner_type == "STORE",
                Inventory.owner_id == store_id,
                Inventory.is_active.is_(True),
            )
            .group_by(Product.subcategory_id)
            .subquery()
        )
    else:
        prod_sq = (
            select(Product.subcategory_id, sa_func.count(Product.id).label("cnt"))
            .group_by(Product.subcategory_id)
            .subquery()
        )

    # ── Base conditions ──
    conditions = [Subcategory.category_id == category_id]
    if store_id is not None:
        if active_only:
            conditions.append(sa_func.coalesce(StoreSubcategoryOverride.is_active, Subcategory.is_active).is_(True))
    else:
        if active_only:
            conditions.append(Subcategory.is_active.is_(True))
    if search:
        conditions.append(Subcategory.name.ilike(f"%{search.strip()}%"))

    # ── Total count ──
    if store_id is not None:
        count_stmt = (
            select(sa_func.count(Subcategory.id))
            .outerjoin(
                StoreSubcategoryOverride,
                and_(StoreSubcategoryOverride.subcategory_id == Subcategory.id, StoreSubcategoryOverride.store_id == store_id)
            )
            .where(*conditions)
        )
    else:
        count_stmt = select(sa_func.count(Subcategory.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # ── Data query ──
    if store_id is not None:
        data_stmt = (
            select(
                Subcategory,
                sa_func.coalesce(StoreSubcategoryOverride.is_active, Subcategory.is_active).label("resolved_is_active"),
                sa_func.coalesce(prod_sq.c.cnt, 0).label("products_count"),
            )
            .outerjoin(
                StoreSubcategoryOverride,
                and_(StoreSubcategoryOverride.subcategory_id == Subcategory.id, StoreSubcategoryOverride.store_id == store_id)
            )
            .outerjoin(prod_sq, Subcategory.id == prod_sq.c.subcategory_id)
            .where(*conditions)
            .order_by(Subcategory.name)
        )
    else:
        data_stmt = (
            select(
                Subcategory,
                Subcategory.is_active.label("resolved_is_active"),
                sa_func.coalesce(prod_sq.c.cnt, 0).label("products_count"),
            )
            .outerjoin(prod_sq, Subcategory.id == prod_sq.c.subcategory_id)
            .where(*conditions)
            .order_by(Subcategory.name)
        )

    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)

    rows = (await db.execute(data_stmt)).all()

    items = []
    for sub, resolved_is_active, prod_cnt in rows:
        items.append({
            "id": sub.id,
            "category_id": sub.category_id,
            "name": sub.name,
            "description": sub.description,
            "is_active": resolved_is_active,
            "created_at": sub.created_at,
            "updated_at": sub.updated_at,
            "products_count": prod_cnt,
        })

    return items, total


async def update_subcategory(
    db: AsyncSession,
    subcategory: Subcategory,
    payload: SubcategoryUpdate,
    store_id: int | None = None,
) -> Subcategory:
    """Apply partial updates to a subcategory. If store_id is provided, is_active is updated in the override."""
    update_data = payload.model_dump(exclude_unset=True)
    
    # Handle is_active override
    if "is_active" in update_data and store_id is not None:
        is_active_val = update_data.pop("is_active")
        # Upsert in StoreSubcategoryOverride
        stmt = select(StoreSubcategoryOverride).where(
            StoreSubcategoryOverride.store_id == store_id,
            StoreSubcategoryOverride.subcategory_id == subcategory.id,
        )
        override = (await db.execute(stmt)).scalar_one_or_none()
        if override:
            override.is_active = is_active_val
        else:
            override = StoreSubcategoryOverride(
                store_id=store_id,
                subcategory_id=subcategory.id,
                is_active=is_active_val,
            )
            db.add(override)
        await db.commit()
        # Set transient attribute for response serialization
        subcategory.is_active = is_active_val
        
    for field, value in update_data.items():
        setattr(subcategory, field, value)
    await db.commit()
    await db.refresh(subcategory)
    return subcategory


async def delete_subcategory(
    db: AsyncSession,
    subcategory: Subcategory,
    store_id: int | None = None,
) -> Subcategory:
    """Soft-delete a subcategory by deactivating it. If store_id is provided, deactivates in override."""
    if store_id is not None:
        stmt = select(StoreSubcategoryOverride).where(
            StoreSubcategoryOverride.store_id == store_id,
            StoreSubcategoryOverride.subcategory_id == subcategory.id,
        )
        override = (await db.execute(stmt)).scalar_one_or_none()
        if override:
            override.is_active = False
        else:
            override = StoreSubcategoryOverride(
                store_id=store_id,
                subcategory_id=subcategory.id,
                is_active=False,
            )
            db.add(override)
        await db.commit()
        subcategory.is_active = False
    else:
        subcategory.is_active = False
        await db.commit()
        await db.refresh(subcategory)
    return subcategory
