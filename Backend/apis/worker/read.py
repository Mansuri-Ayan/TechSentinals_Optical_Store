# API: worker/read.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from schemas.worker import WorkerRead
from schemas.pagination import PaginatedResponse
from services.store_service import get_store
from services.worker_service import get_worker, get_workers_by_store

router = APIRouter()


@router.get(
    "/{store_id}/workers",
    response_model=PaginatedResponse[WorkerRead],
    summary="List workers in a store",
    description="List all active workers for the specified store with pagination and filtering.",
)
async def list_workers(
    store_id: int,
    page: int = Query(default=1, ge=1, description="Page number (starting from 1)"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size / limit"),
    search: str | None = Query(default=None, description="Search query matching worker name/email/phone/code"),
    is_active: bool | None = Query(default=None, description="Filter by active status"),
    paginate: bool = Query(default=True, description="Enable or disable pagination"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> PaginatedResponse[WorkerRead]:
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
                detail="Access denied to this store's workers",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    workers, total = await get_workers_by_store(
        db,
        store_id=store_id,
        page=page,
        limit=limit,
        search=search,
        is_active=is_active,
        paginate=paginate,
    )
    pages = (total + limit - 1) // limit if limit > 0 else 1
    return PaginatedResponse[WorkerRead](
        items=[WorkerRead.model_validate(w) for w in workers],
        total=total,
        page=page,
        pages=pages,
        limit=limit,
    )


@router.get(
    "/workers/{worker_id}",
    response_model=WorkerRead,
    summary="Get a single worker",
    description="Fetch a single worker by ID.",
)
async def get_worker_endpoint(
    worker_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
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
    return WorkerRead.model_validate(worker)
