# Service: worker_service.py
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import hash_password
from models.worker import Worker
from schemas.worker import WorkerCreate, WorkerUpdate


async def create_worker(
    db: AsyncSession,
    store_id: int,
    payload: WorkerCreate,
) -> Worker:
    """Create a new worker assigned to the given store."""
    new_worker = Worker(
        store_id=store_id,
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        employee_code=payload.employee_code,
        joining_date=payload.joining_date,
    )
    db.add(new_worker)
    await db.commit()
    await db.refresh(new_worker)
    return new_worker


async def get_worker(db: AsyncSession, worker_id: int) -> Worker | None:
    """Fetch a single worker by ID (excluding soft-deleted)."""
    stmt = select(Worker).where(Worker.id == worker_id, Worker.deleted_at.is_(None))
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_workers_by_store(db: AsyncSession, store_id: int) -> list[Worker]:
    """List all non-deleted workers for a given store."""
    stmt = (
        select(Worker)
        .where(Worker.store_id == store_id, Worker.deleted_at.is_(None))
        .order_by(Worker.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


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
