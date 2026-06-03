# Service: optician_service.py
from datetime import datetime, timezone
from sqlalchemy import desc, select, func
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.optician import Optician
from models.role import Role
from schemas.optician import OpticianCreate, OpticianUpdate


async def _generate_optician_code(db: AsyncSession) -> str:
    stmt = select(Optician.id).order_by(desc(Optician.id)).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none() or 0
    return f"OPT-{last_id + 1}"


async def create_optician(
    db: AsyncSession,
    store_id: int,
    payload: OpticianCreate,
) -> Optician:
    """Create a new optician assigned to the given store."""
    role_stmt = select(Role).where(Role.role == "optician")
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one()

    employee_code = payload.employee_code or await _generate_optician_code(db)

    new_optician = Optician(
        store_id=store_id,
        role_id=role.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        employee_code=employee_code,
        qualification=payload.qualification,
        joining_date=payload.joining_date,
    )
    db.add(new_optician)
    await db.commit()
    await db.refresh(new_optician)
    return new_optician


async def get_optician(db: AsyncSession, optician_id: int) -> Optician | None:
    """Fetch a single optician by ID (excluding soft-deleted)."""
    stmt = select(Optician).where(
        Optician.id == optician_id, Optician.deleted_at.is_(None)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_opticians_by_store(
    db: AsyncSession,
    store_id: int,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    paginate: bool = True,
) -> tuple[list[Optician], int]:
    """List all non-deleted opticians for a given store with pagination and filtering."""
    stmt = select(Optician).where(Optician.store_id == store_id, Optician.deleted_at.is_(None))
    count_stmt = select(func.count()).select_from(Optician).where(Optician.store_id == store_id, Optician.deleted_at.is_(None))

    if is_active is not None:
        stmt = stmt.where(Optician.is_active == is_active)
        count_stmt = count_stmt.where(Optician.is_active == is_active)
    if search:
        search_filter = (
            Optician.first_name.ilike(f"%{search}%") |
            Optician.last_name.ilike(f"%{search}%") |
            Optician.email.ilike(f"%{search}%") |
            Optician.phone.ilike(f"%{search}%") |
            Optician.employee_code.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(Optician.created_at.desc())
    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def update_optician(
    db: AsyncSession,
    optician: Optician,
    payload: OpticianUpdate,
) -> Optician:
    """Apply partial updates to an optician."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(optician, field, value)
    await db.commit()
    await db.refresh(optician)
    return optician


async def delete_optician(db: AsyncSession, optician: Optician) -> Optician:
    """Soft-delete an optician by setting deleted_at."""
    optician.deleted_at = datetime.now(timezone.utc)
    optician.is_active = False
    await db.commit()
    await db.refresh(optician)
    return optician
