# API: lab/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from services.lab_service import get_lab, delete_lab

router = APIRouter()


@router.delete(
    "/{lab_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Deactivate/Delete a lab partner",
)
async def delete_lab_endpoint(
    lab_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    lab = await get_lab(db, lab_id)
    if lab is None or lab.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lab partner not found",
        )
    
    success = await delete_lab(db, lab_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete lab partner",
        )
