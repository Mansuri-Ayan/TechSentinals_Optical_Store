# API: lab/update.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import require_permission, get_user_admin_id
from db.session import get_db
from models.admin import Admin
from schemas.lab import LabUpdate, LabRead
from services.lab_service import get_lab, update_lab

router = APIRouter()


@router.put(
    "/{lab_id}",
    response_model=LabRead,
    summary="Update a lab partner",
)
async def update_lab_endpoint(
    lab_id: int,
    payload: LabUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission("labs", "update")),
) -> LabRead:
    admin_id = get_user_admin_id(current_user)
    lab = await get_lab(db, lab_id)
    if lab is None or lab.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab partner not found",
        )
    
    updated_lab = await update_lab(db, lab_id=lab_id, payload=payload)
    return LabRead.model_validate(updated_lab)
