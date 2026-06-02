# Service: manager_service.py
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.manager import Manager
from models.role import Role
from schemas.manager import ManagerCreate, ManagerUpdate

async def create_manager(
    db: AsyncSession,
    store_id: int,
    payload: ManagerCreate,
) -> Manager:
    """Create a new manager assigned to the given store."""
    role_stmt = select(Role).where(Role.role == "manager")
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one()

    new_manager = Manager(
        store_id=store_id,
        role_id=role.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        employee_code=payload.employee_code,
        joining_date=payload.joining_date,
    )
    db.add(new_manager)
    await db.commit()
    await db.refresh(new_manager)
    return new_manager


async def get_manager(db: AsyncSession, manager_id: int) -> Manager | None:
    """Fetch a single manager by ID (excluding soft-deleted)."""
    stmt = select(Manager).where(
        Manager.id == manager_id, Manager.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_managers_by_store(
    db: AsyncSession, store_id: int
) -> list[Manager]:
    """List all non-deleted managers for a given store."""
    stmt = (
        select(Manager)
        .where(Manager.store_id == store_id, Manager.deleted_at.is_(None))
        .order_by(Manager.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def update_manager(
    db: AsyncSession,
    manager: Manager,
    payload: ManagerUpdate,
) -> Manager:
    """Apply partial updates to a manager."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(manager, field, value)
    await db.commit()
    await db.refresh(manager)
    return manager


async def delete_manager(db: AsyncSession, manager: Manager) -> Manager:
    """Soft-delete a manager by setting deleted_at."""
    manager.deleted_at = datetime.now(timezone.utc)
    manager.is_active = False
    await db.commit()
    await db.refresh(manager)
    return manager
