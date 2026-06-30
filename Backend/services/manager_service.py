from datetime import datetime, timezone
from sqlalchemy import desc, select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.manager import Manager
from models.role import Role
from schemas.manager import ManagerCreate, ManagerUpdate


async def _generate_manager_code(db: AsyncSession) -> str:
    stmt = select(Manager.id).order_by(desc(Manager.id)).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none() or 0
    return f"MGR-{last_id + 1}"


async def create_manager(
    db: AsyncSession,
    store_id: int,
    payload: ManagerCreate,
) -> Manager:
    """Create a new manager assigned to the given store."""
    role_stmt = select(Role).where(Role.role == "manager")
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one()

    employee_code = payload.employee_code or await _generate_manager_code(db)

    new_manager = Manager(
        store_id=store_id,
        role_id=role.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        employee_code=employee_code,
        pf_number=payload.pf_number,
        joining_date=payload.joining_date,
    )
    db.add(new_manager)
    await db.commit()
    await db.refresh(new_manager)
    return new_manager


async def get_manager(db: AsyncSession, manager_id: int) -> Manager | None:
    """Fetch a single manager by ID (excluding soft-deleted)."""
    stmt = (
        select(Manager)
        .options(joinedload(Manager.store), joinedload(Manager.role))
        .where(Manager.id == manager_id, Manager.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_managers_by_store(
    db: AsyncSession,
    store_id: int,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    paginate: bool = True,
) -> tuple[list[Manager], int]:
    """List all non-deleted managers for a given store with pagination and filtering."""
    stmt = (
        select(Manager)
        .options(joinedload(Manager.store), joinedload(Manager.role))
        .where(Manager.store_id == store_id, Manager.deleted_at.is_(None))
    )
    count_stmt = select(func.count()).select_from(Manager).where(Manager.store_id == store_id, Manager.deleted_at.is_(None))

    if is_active is not None:
        stmt = stmt.where(Manager.is_active == is_active)
        count_stmt = count_stmt.where(Manager.is_active == is_active)
    if search:
        search_filter = (
            Manager.first_name.ilike(f"%{search}%") |
            Manager.last_name.ilike(f"%{search}%") |
            Manager.email.ilike(f"%{search}%") |
            Manager.phone.ilike(f"%{search}%") |
            Manager.employee_code.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(Manager.created_at.desc())
    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


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
