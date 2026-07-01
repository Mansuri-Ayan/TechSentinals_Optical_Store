# API: repair/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.repair import RepairRead
from services.repair_service import get_repair, delete_repair, _build_repair_read_dict

router = APIRouter()


@router.delete(
    "/{repair_id}",
    response_model=RepairRead,
    summary="Cancel a repair/service job",
    description="Cancels (soft-deletes) a repair job by setting its status to CANCELLED.",
)
async def delete_repair_endpoint(
    repair_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("repairs", "delete")),
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

    repair = await delete_repair(db, repair=repair)
    extra = _build_repair_read_dict(repair)
    return RepairRead(
        **{c.key: getattr(repair, c.key) for c in repair.__table__.columns},
        **extra,
    )
