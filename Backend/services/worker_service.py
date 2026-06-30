from datetime import datetime, timezone
from sqlalchemy import desc, select, func
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.worker import Worker
from models.role import Role
from schemas.worker import WorkerCreate, WorkerUpdate


async def _generate_worker_code(db: AsyncSession) -> str:
    stmt = select(Worker.id).order_by(desc(Worker.id)).limit(1)
    result = await db.execute(stmt)
    last_id = result.scalar_one_or_none() or 0
    return f"WRK-{last_id + 1}"


async def create_worker(
    db: AsyncSession,
    store_id: int,
    payload: WorkerCreate,
) -> Worker:
    """Create a new worker assigned to the given store."""
    role_stmt = select(Role).where(Role.role == "worker")
    role_res = await db.execute(role_stmt)
    role = role_res.scalar_one()

    employee_code = payload.employee_code or await _generate_worker_code(db)

    new_worker = Worker(
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
    db.add(new_worker)
    await db.commit()
    await db.refresh(new_worker)
    return new_worker


async def get_worker(db: AsyncSession, worker_id: int) -> Worker | None:
    """Fetch a single worker by ID (excluding soft-deleted)."""
    stmt = (
        select(Worker)
        .options(joinedload(Worker.store), joinedload(Worker.role))
        .where(Worker.id == worker_id, Worker.deleted_at.is_(None))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_workers_by_store(
    db: AsyncSession,
    store_id: int,
    page: int = 1,
    limit: int = 20,
    search: str | None = None,
    is_active: bool | None = None,
    paginate: bool = True,
) -> tuple[list[Worker], int]:
    """List all non-deleted workers for a given store with pagination and filtering."""
    stmt = (
        select(Worker)
        .options(joinedload(Worker.store), joinedload(Worker.role))
        .where(Worker.store_id == store_id, Worker.deleted_at.is_(None))
    )
    count_stmt = select(func.count()).select_from(Worker).where(Worker.store_id == store_id, Worker.deleted_at.is_(None))

    if is_active is not None:
        stmt = stmt.where(Worker.is_active == is_active)
        count_stmt = count_stmt.where(Worker.is_active == is_active)
    if search:
        search_filter = (
            Worker.first_name.ilike(f"%{search}%") |
            Worker.last_name.ilike(f"%{search}%") |
            Worker.email.ilike(f"%{search}%") |
            Worker.phone.ilike(f"%{search}%") |
            Worker.employee_code.ilike(f"%{search}%")
        )
        stmt = stmt.where(search_filter)
        count_stmt = count_stmt.where(search_filter)

    count_result = await db.execute(count_stmt)
    total = count_result.scalar_one()

    stmt = stmt.order_by(Worker.created_at.desc())
    if paginate:
        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

    result = await db.execute(stmt)
    return list(result.scalars().all()), total


async def update_worker(
    db: AsyncSession,
    worker: Worker,
    payload: WorkerUpdate,
) -> Worker:
    """Apply partial updates to a worker."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(worker, field, value)
    await db.commit()
    await db.refresh(worker)
    return worker


async def delete_worker(db: AsyncSession, worker: Worker) -> Worker:
    """Soft-delete a worker by setting deleted_at."""
    worker.deleted_at = datetime.now(timezone.utc)
    worker.is_active = False
    await db.commit()
    await db.refresh(worker)
    return worker
