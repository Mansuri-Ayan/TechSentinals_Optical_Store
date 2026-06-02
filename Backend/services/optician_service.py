# Service: optician_service.py
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.optician import Optician
from models.role import Role
from schemas.optician import OpticianCreate, OpticianUpdate


async def create_optician(
    db: AsyncSession,
    store_id: int,
    payload: OpticianCreate,
) -> Optician:
    """Create a new optician assigned to the given store."""
    role_stmt = select(Role).where(Role.role == "optician")
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one()

    new_optician = Optician(
        store_id=store_id,
        role_id=role.id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        employee_code=payload.employee_code,
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
    db: AsyncSession, store_id: int
) -> list[Optician]:
    """List all non-deleted opticians for a given store."""
    stmt = (
        select(Optician)
        .where(Optician.store_id == store_id, Optician.deleted_at.is_(None))
        .order_by(Optician.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


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
