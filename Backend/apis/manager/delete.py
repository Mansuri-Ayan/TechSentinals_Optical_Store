# API: manager/delete.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_user
from db.session import get_db
from models.admin import Admin
from models.manager import Manager
from services.store_service import get_store
from services.manager_service import delete_manager, get_manager

router = APIRouter()


@router.delete(
    "/managers/{manager_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a manager",
    description="Soft-delete a manager.",
)
async def delete_manager_endpoint(
    manager_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    manager = await get_manager(db, manager_id)
    if manager is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manager not found",
        )
    if isinstance(current_user, Admin):
        store = await get_store(db, manager.store_id)
        if store is None or store.admin_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Manager not found",
            )
    elif isinstance(current_user, Manager):
        if current_user.store_id != manager.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this manager's details",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )
    await delete_manager(db, manager)
    return {"message": f"Manager '{manager.first_name} {manager.last_name}' has been deleted"}
