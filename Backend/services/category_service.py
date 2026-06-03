# Service: category_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.category import Category
from models.subcategory import Subcategory
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
    """Create a new category owned by the given admin."""
    category = Category(
        admin_id=admin_id,
        name=payload.name,
        description=payload.description,
    )
    db.add(category)
    await db.commit()
    await db.refresh(category)
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
) -> list[Category]:
    """List all categories for a given admin."""
    stmt = select(Category).where(Category.admin_id == admin_id)
    if active_only:
        stmt = stmt.where(Category.is_active.is_(True))
    stmt = stmt.order_by(Category.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_category(
    db: AsyncSession,
    category: Category,
    payload: CategoryUpdate,
) -> Category:
    """Apply partial updates to a category."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    await db.commit()
    await db.refresh(category)
    return category


async def delete_category(db: AsyncSession, category: Category) -> Category:
    """Soft-delete a category by deactivating it."""
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
) -> list[Subcategory]:
    """List all subcategories for a given category."""
    stmt = select(Subcategory).where(Subcategory.category_id == category_id)
    if active_only:
        stmt = stmt.where(Subcategory.is_active.is_(True))
    stmt = stmt.order_by(Subcategory.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_subcategory(
    db: AsyncSession,
    subcategory: Subcategory,
    payload: SubcategoryUpdate,
) -> Subcategory:
    """Apply partial updates to a subcategory."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(subcategory, field, value)
    await db.commit()
    await db.refresh(subcategory)
    return subcategory


async def delete_subcategory(db: AsyncSession, subcategory: Subcategory) -> Subcategory:
    """Soft-delete a subcategory by deactivating it."""
    subcategory.is_active = False
    await db.commit()
    await db.refresh(subcategory)
    return subcategory
