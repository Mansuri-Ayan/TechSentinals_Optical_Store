# API: worker/read.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.worker import WorkerRead
from services.store_service import get_store
from services.worker_service import get_worker, get_workers_by_store

router = APIRouter()


@router.get(
    "/{store_id}/workers",
    response_model=list[WorkerRead],
    summary="List workers in a store",
    description="List all active workers for the specified store.",
)
async def list_workers(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> list[WorkerRead]:
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
    workers = await get_workers_by_store(db, store_id=store_id)
    return [WorkerRead.model_validate(w) for w in workers]


@router.get(
    "/workers/{worker_id}",
    response_model=WorkerRead,
    summary="Get a single worker",
    description="Fetch a single worker by ID.",
)
async def get_worker_endpoint(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> WorkerRead:
    worker = await get_worker(db, worker_id)
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    # Verify the worker's store belongs to this admin
    store = await get_store(db, worker.store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    return WorkerRead.model_validate(worker)
