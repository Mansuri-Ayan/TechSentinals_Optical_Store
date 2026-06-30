# Service: lab_service.py
from sqlalchemy import select, func as sa_func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from models.lab import Lab
from schemas.lab import LabCreate, LabUpdate


async def create_lab(
    db: AsyncSession,
    admin_id: int,
    payload: LabCreate,
) -> Lab:
    """Create a new lab partner owned by the given admin."""
    lab = Lab(
        admin_id=admin_id,
        name=payload.name,
        contact_number=payload.contact_number,
        email=payload.email,
    )
    db.add(lab)
    await db.commit()
    await db.refresh(lab)
    return lab


async def get_lab(db: AsyncSession, lab_id: int) -> Lab | None:
    """Fetch a single lab by ID."""
    stmt = select(Lab).where(Lab.id == lab_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_labs_by_admin(
    db: AsyncSession,
    admin_id: int,
    active_status: str | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 10,
    paginate: bool = True,
) -> tuple[list[Lab], int, int, int]:
    """List lab partners for a given admin with pagination, search, and status filtering.
    Returns (items, total_count, active_count, inactive_count).
    """
    # ── Base conditions ──
    conditions = [Lab.admin_id == admin_id]
    
    if active_status == "active":
        conditions.append(Lab.is_active.is_(True))
    elif active_status == "inactive":
        conditions.append(Lab.is_active.is_(False))
        
    if search:
        search_term = f"%{search.strip()}%"
        conditions.append(
            or_(
                Lab.name.ilike(search_term),
                Lab.email.ilike(search_term),
                Lab.contact_number.ilike(search_term),
            )
        )

    # ── Total count query ──
    count_stmt = select(sa_func.count(Lab.id)).where(*conditions)
    total = (await db.execute(count_stmt)).scalar() or 0

    # ── Global count statistics ──
    count_conditions = [Lab.admin_id == admin_id]
    active_stmt = select(sa_func.count(Lab.id)).where(*count_conditions, Lab.is_active.is_(True))
    inactive_stmt = select(sa_func.count(Lab.id)).where(*count_conditions, Lab.is_active.is_(False))
    
    active_cnt = (await db.execute(active_stmt)).scalar() or 0
    inactive_cnt = (await db.execute(inactive_stmt)).scalar() or 0

    # ── Data query ──
    data_stmt = select(Lab).where(*conditions).order_by(Lab.created_at.desc())
    
    if paginate:
        offset = (page - 1) * limit
        data_stmt = data_stmt.offset(offset).limit(limit)
        
    result = await db.execute(data_stmt)
    items = list(result.scalars().all())

    return items, total, active_cnt, inactive_cnt


async def update_lab(
    db: AsyncSession,
    lab_id: int,
    payload: LabUpdate,
) -> Lab | None:
    """Update an existing lab record."""
    lab = await get_lab(db, lab_id)
    if not lab:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lab, field, value)

    await db.commit()
    await db.refresh(lab)
    return lab


async def delete_lab(db: AsyncSession, lab_id: int) -> bool:
    """Delete a lab partner record (soft delete / deactivate)."""
    lab = await get_lab(db, lab_id)
    if not lab:
        return False
        
    # Standard deactivation action
    lab.is_active = False
    await db.commit()
    return True
