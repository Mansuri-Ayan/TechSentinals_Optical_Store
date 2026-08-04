# API: repair/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.repair import RepairUpdate, RepairStatusUpdate, RepairRead
from services.repair_service import get_repair, update_repair, update_repair_status, _build_repair_read_dict

router = APIRouter()


def _repair_to_read(repair) -> RepairRead:
    extra = _build_repair_read_dict(repair)
    return RepairRead(
        **{c.key: getattr(repair, c.key) for c in repair.__table__.columns},
        **extra,
    )


@router.patch(
    "/{repair_id}",
    response_model=RepairRead,
    summary="Update a repair/service job",
    description="Partially update a repair job (description, costs, dates, notes, etc.).",
)
async def update_repair_endpoint(
    repair_id: int,
    payload: RepairUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("repairs", "update")),
) -> RepairRead:
    admin_id = get_user_admin_id(current_user)
    repair = await get_repair(db, repair_id=repair_id, admin_id=admin_id)
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )
    
    # Scoping
    if not isinstance(current_user, Admin) and repair.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's repair record.",
        )

    try:
        repair = await update_repair(db, repair=repair, payload=payload)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    return _repair_to_read(repair)


@router.patch(
    "/{repair_id}/status",
    response_model=RepairRead,
    summary="Update repair status only",
    description="Quickly update the status of a repair job (RECEIVED → IN_PROGRESS → COMPLETED → DELIVERED).",
)
async def update_repair_status_endpoint(
    repair_id: int,
    payload: RepairStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("repairs", "update")),
) -> RepairRead:
    admin_id = get_user_admin_id(current_user)
    repair = await get_repair(db, repair_id=repair_id, admin_id=admin_id)
    if not repair:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Repair not found",
        )

    # Scoping
    if not isinstance(current_user, Admin) and repair.store_id != current_user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's repair record.",
        )

    repair = await update_repair_status(db, repair=repair, payload=payload)
    return _repair_to_read(repair)
