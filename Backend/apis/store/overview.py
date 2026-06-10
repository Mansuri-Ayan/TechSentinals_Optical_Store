# API: store/overview.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from core.deps import get_current_admin
from db.session import get_db
from models.admin import Admin
from schemas.store import StoreOverview
from services.store_service import get_store, get_store_overview

router = APIRouter()

@router.get(
    "/{store_id}/overview",
    response_model=StoreOverview,
    summary="Get store overview stats",
    description="Fetch aggregated statistics for store charts (revenue trend, sales by category, etc.).",
)
async def get_store_overview_endpoint(
    store_id: int,
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> StoreOverview:
    # Verify the store exists and belongs to the admin
    store = await get_store(db, store_id)
    if store is None or store.admin_id != current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found",
        )
        
    overview_data = await get_store_overview(db, store_id)
    return StoreOverview(**overview_data)
