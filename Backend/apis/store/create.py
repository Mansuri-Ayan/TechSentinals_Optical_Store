# API: store/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.store import StoreCreate, StoreRead
from services.store_service import create_store

router = APIRouter()


@router.post(
    "/",
    response_model=StoreRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new store",
    description="Create a new store under the currently authenticated admin.",
)
async def create_store_endpoint(
    payload: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('stores', 'create')),
) -> StoreRead:
    admin_id = get_user_admin_id(current_user)
    try:
        store = await create_store(db, admin_id=admin_id, payload=payload)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A store with this store_code already exists",
            )
        raise
    return StoreRead.model_validate(store)
