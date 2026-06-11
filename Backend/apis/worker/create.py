# API: worker/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from schemas.worker import WorkerCreate, WorkerRead
from services.store_service import get_store
from services.worker_service import create_worker

router = APIRouter()


@router.post(
    "/{store_id}/workers",
    response_model=WorkerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a worker to a store",
    description="Create a new worker assigned to the specified store.",
)
async def create_worker_endpoint(
    store_id: int,
    payload: WorkerCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> WorkerRead:
    if isinstance(current_user, Admin):
        store = await get_store(db, store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this store's staff creation",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    try:
        worker = await create_worker(db, store_id=store_id, payload=payload)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Worker with this email, phone, or employee_code already exists",
            )
        raise
    return WorkerRead.model_validate(worker)
