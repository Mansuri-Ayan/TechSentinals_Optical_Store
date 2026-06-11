# API: repair/create.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.repair import RepairCreate, RepairRead
from services.repair_service import create_repair, _build_repair_read_dict

router = APIRouter()


@router.post(
    "/",
    response_model=RepairRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new repair/service job",
    description="Book a new repair or service job. Supports walk-in customers (customer_name) or registered customers (customer_id). Optionally link to a sale for warranty tracking.",
)
async def create_repair_endpoint(
    payload: RepairCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
) -> RepairRead:
    admin_id = get_user_admin_id(current_user)

    # Scoping: if not admin, force store_id to their store
    if not isinstance(current_user, Admin):
        payload.store_id = current_user.store_id

    # Validate that either customer_id or customer_name is provided
    if not payload.customer_id and not payload.customer_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either customer_id (registered) or customer_name (walk-in) must be provided.",
        )
    repair = await create_repair(db, admin_id=admin_id, payload=payload)
    extra = _build_repair_read_dict(repair)
    return RepairRead(
        **{c.key: getattr(repair, c.key) for c in repair.__table__.columns},
        **extra,
    )
