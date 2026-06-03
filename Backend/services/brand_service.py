# Service: brand_service.py
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from models.brand import Brand
from schemas.brand import BrandCreate, BrandUpdate


async def create_brand(
    db: AsyncSession,
    admin_id: int,
    payload: BrandCreate,
) -> Brand:
    """Create a new brand owned by the given admin."""
    brand = Brand(
        admin_id=admin_id,
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
    active_only: bool = False,
) -> list[Brand]:
    """List all brands for a given admin."""
    stmt = select(Brand).where(Brand.admin_id == admin_id)
    if active_only:
        stmt = stmt.where(Brand.is_active.is_(True))
    stmt = stmt.order_by(Brand.name)
    result = await db.execute(stmt)
    return list(result.scalars().all())


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
