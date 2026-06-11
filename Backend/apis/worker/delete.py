# API: worker/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from services.store_service import get_store
from services.worker_service import delete_worker, get_worker

router = APIRouter()


@router.delete(
    "/workers/{worker_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a worker",
    description="Soft-delete a worker.",
)
async def delete_worker_endpoint(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
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
    await delete_worker(db, worker)
    return {"message": f"Worker '{worker.first_name} {worker.last_name}' has been deleted"}
