# Service: store_service.py
from datetime import datetime, timezone
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from models.store import Store
from schemas.store import StoreCreate, StoreUpdate


async def _generate_store_code(db: AsyncSession) -> str:
    stmt = select(Store.id).order_by(desc(Store.id)).limit(1)
    result = await db.execute(stmt)
    last_store_id = result.scalar_one_or_none() or 0
    return f"STR-{last_store_id + 1:06d}"


async def create_store(
    db: AsyncSession,
    admin_id: int,
    payload: StoreCreate,
) -> Store:
    """Create a new store owned by the given admin."""
    store_code = payload.store_code or await _generate_store_code(db)
    new_store = Store(
        admin_id=admin_id,
        store_name=payload.store_name,
        store_code=store_code,
        email=payload.email,
        phone=payload.phone,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        pincode=payload.pincode,
        gst_number=payload.gst_number,
        is_active=payload.is_active,
    )
    db.add(new_store)
    await db.commit()
    await db.refresh(new_store)
    return new_store


async def get_store(db: AsyncSession, store_id: int) -> Store | None:
    """Fetch a single store by ID (excluding soft-deleted)."""
    stmt = select(Store).where(Store.id == store_id, Store.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_stores_by_admin(db: AsyncSession, admin_id: int) -> list[Store]:
    """List all non-deleted stores for a given admin."""
    stmt = (
        select(Store)
        .where(Store.admin_id == admin_id, Store.deleted_at.is_(None))
        .order_by(Store.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_store(
    db: AsyncSession,
    store: Store,
    payload: StoreUpdate,
) -> Store:
    """Apply partial updates to a store."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(store, field, value)
    await db.commit()
    await db.refresh(store)
    return store


async def delete_store(db: AsyncSession, store: Store) -> Store:
    """Soft-delete a store by setting deleted_at."""
    store.deleted_at = datetime.now(timezone.utc)
    store.is_active = False
    await db.commit()
    await db.refresh(store)
    return store
