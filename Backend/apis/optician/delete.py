# API: optician/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from services.store_service import get_store
from services.optician_service import delete_optician, get_optician

router = APIRouter()


@router.delete(
    "/opticians/{optician_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete an optician",
    description="Soft-delete an optician.",
)
async def delete_optician_endpoint(
    optician_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
):
    optician = await get_optician(db, optician_id)
    if optician is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optician not found",
        )
    store = await get_store(db, optician.store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Optician not found",
        )
    await delete_optician(db, optician)
    return {"message": f"Optician '{optician.first_name} {optician.last_name}' has been deleted"}
