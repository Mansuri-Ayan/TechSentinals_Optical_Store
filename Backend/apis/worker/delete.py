# API: worker/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
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
    current_admin: Admin = Depends(get_current_admin),
):
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
    await delete_worker(db, worker)
    return {"message": f"Worker '{worker.first_name} {worker.last_name}' has been deleted"}
