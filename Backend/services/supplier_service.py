# Service: supplier_service.py
"""
Business logic for Supplier, SupplierStoreLink, and SupplierProduct CRUD.
"""
from datetime import datetime, timezone
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.supplier import Supplier, SupplierStatus
from models.supplier_store_link import SupplierStoreLink
from models.supplier_product import SupplierProduct
from schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierStoreLinkCreate,
    SupplierProductCreate,
    SupplierProductUpdate,
)


# ── Supplier CRUD ──────────────────────────────────────────────

async def create_supplier(
    db: AsyncSession,
    admin_id: int,
    payload: SupplierCreate,
) -> Supplier:
    """Create a new supplier owned by the given admin."""
    supplier = Supplier(
        admin_id=admin_id,
        **payload.model_dump(),
    )
    db.add(supplier)
    await db.commit()
    await db.refresh(supplier)
    return supplier


async def get_supplier(
    db: AsyncSession,
    supplier_id: int,
) -> Supplier | None:
    """Fetch a single supplier by ID."""
    stmt = select(Supplier).where(
        Supplier.id == supplier_id,
        Supplier.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_suppliers(
    db: AsyncSession,
    admin_id: int,
    store_id: int | None = None,
    status_filter: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[Supplier], int]:
    """List suppliers belonging to an admin with optional filters."""
    filters = [
        Supplier.admin_id == admin_id,
        Supplier.deleted_at.is_(None),
    ]
    if store_id is not None:
        linked_supplier_ids = (
            select(SupplierStoreLink.supplier_id)
            .where(
                SupplierStoreLink.store_id == store_id,
                SupplierStoreLink.is_active.is_(True),
            )
        )
        filters.append(Supplier.id.in_(linked_supplier_ids))
    if status_filter:
        filters.append(Supplier.status == status_filter.upper())
    if search:
        pattern = f"%{search}%"
        filters.append(
            or_(
                Supplier.company_name.ilike(pattern),
                Supplier.contact_person.ilike(pattern),
                Supplier.email.ilike(pattern),
                Supplier.phone.ilike(pattern),
                Supplier.city.ilike(pattern),
                Supplier.state.ilike(pattern),
            )
        )

    count_stmt = select(func.count()).select_from(Supplier).where(*filters)
    total_result = await db.execute(count_stmt)
    total = int(total_result.scalar_one() or 0)

    stmt = (
        select(Supplier)
        .where(*filters)
        .order_by(Supplier.company_name)
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def update_supplier(
    db: AsyncSession,
    supplier: Supplier,
    payload: SupplierUpdate,
) -> Supplier:
    """Apply partial updates to a supplier."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    await db.commit()
    await db.refresh(supplier)
    return supplier


async def soft_delete_supplier(
    db: AsyncSession,
    supplier: Supplier,
) -> None:
    """Soft-delete a supplier."""
    supplier.deleted_at = datetime.now(timezone.utc)
    supplier.status = SupplierStatus.INACTIVE
    await db.commit()


# ── SupplierStoreLink ─────────────────────────────────────────

async def link_supplier_to_store(
    db: AsyncSession,
    supplier_id: int,
    payload: SupplierStoreLinkCreate,
) -> SupplierStoreLink:
    """Link a supplier to a store."""
    # Check for existing link
    stmt = select(SupplierStoreLink).where(
        SupplierStoreLink.supplier_id == supplier_id,
        SupplierStoreLink.store_id == payload.store_id,
    )
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()
    if existing:
        # Re-activate if it was deactivated
        existing.is_active = True
        existing.is_primary = payload.is_primary
        await db.commit()
        await db.refresh(existing)
        return existing

    link = SupplierStoreLink(
        supplier_id=supplier_id,
        store_id=payload.store_id,
        is_primary=payload.is_primary,
    )
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


async def unlink_supplier_from_store(
    db: AsyncSession,
    link: SupplierStoreLink,
) -> None:
    """Deactivate a supplier-store link."""
    link.is_active = False
    await db.commit()


async def get_supplier_store_link(
    db: AsyncSession,
    link_id: int,
) -> SupplierStoreLink | None:
    """Fetch a single supplier-store link."""
    stmt = select(SupplierStoreLink).where(SupplierStoreLink.id == link_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def list_store_suppliers(
    db: AsyncSession,
    supplier_id: int,
    active_only: bool = True,
) -> list[SupplierStoreLink]:
    """List all store links for a supplier."""
    stmt = select(SupplierStoreLink).where(
        SupplierStoreLink.supplier_id == supplier_id,
    )
    if active_only:
        stmt = stmt.where(SupplierStoreLink.is_active.is_(True))
    stmt = stmt.order_by(SupplierStoreLink.store_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── SupplierProduct ───────────────────────────────────────────

async def add_supplier_product(
    db: AsyncSession,
    supplier_id: int,
    payload: SupplierProductCreate,
) -> SupplierProduct:
    """Add a product to a supplier's catalogue."""
    sp = SupplierProduct(
        supplier_id=supplier_id,
        **payload.model_dump(),
    )
    db.add(sp)
    await db.commit()
    await db.refresh(sp)
    return sp


async def get_supplier_product(
    db: AsyncSession,
    sp_id: int,
) -> SupplierProduct | None:
    """Fetch a single supplier product by ID."""
    stmt = select(SupplierProduct).where(SupplierProduct.id == sp_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_supplier_product(
    db: AsyncSession,
    sp: SupplierProduct,
    payload: SupplierProductUpdate,
) -> SupplierProduct:
    """Update a supplier product entry."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sp, field, value)
    await db.commit()
    await db.refresh(sp)
    return sp


async def list_supplier_products(
    db: AsyncSession,
    supplier_id: int,
    active_only: bool = True,
) -> list[SupplierProduct]:
    """List all products in a supplier's catalogue."""
    stmt = select(SupplierProduct).where(
        SupplierProduct.supplier_id == supplier_id,
    )
    if active_only:
        stmt = stmt.where(SupplierProduct.is_active.is_(True))
    stmt = stmt.order_by(SupplierProduct.product_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())
