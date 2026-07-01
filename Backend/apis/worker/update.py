# API: worker/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
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
    current_user = Depends(require_permission("workers", "update")),
) -> WorkerRead:
    worker = await get_worker(db, worker_id)
    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found",
        )
    if isinstance(current_user, Admin):
        store = await get_store(db, worker.store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != worker.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this worker's details",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    updated = await update_worker(db, worker, payload)
    return WorkerRead.model_validate(updated)
