# API: worker/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.worker import WorkerRead, WorkerUpdate
from services.store_service import get_store
from services.worker_service import get_worker, update_worker

router = APIRouter()


@router.put(
    "/workers/{worker_id}",
    response_model=WorkerRead,
    summary="Update a worker",
    description="Update fields on a worker.",
)
async def update_worker_endpoint(
    worker_id: int,
    payload: WorkerUpdate,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> WorkerRead:
    worker = await get_worker(db, worker_id)
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    store = await get_store(db, worker.store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    updated = await update_worker(db, worker, payload)
    return WorkerRead.model_validate(updated)
