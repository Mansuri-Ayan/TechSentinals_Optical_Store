from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.session import get_db
from models.bill_settings import BillSettings
from schemas.bill_settings import BillSettingsUpdate, BillSettingsResponse
from core.deps import get_current_user, get_current_admin, require_permission

router = APIRouter()

# --- ADMIN ROUTES ---
@router.get("/admin/store/{store_id}", response_model=BillSettingsResponse)
async def get_bill_settings_admin(
    store_id: int = Path(...),
    current_user = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BillSettings).where(BillSettings.store_id == store_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=404, detail="Bill settings not found for this store")
    return settings

@router.put("/admin/store/{store_id}", response_model=BillSettingsResponse)
async def update_bill_settings_admin(
    payload: BillSettingsUpdate,
    store_id: int = Path(...),
    current_user = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(BillSettings).where(BillSettings.store_id == store_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = BillSettings(store_id=store_id)
        db.add(settings)
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    return settings

# --- SHOPKEEPER ROUTES ---
@router.get("/shopkeeper", response_model=BillSettingsResponse)
async def get_bill_settings_shopkeeper(
    current_user = Depends(require_permission("stores:read", "sales:read", "sales:create", "sales:update")),
    db: AsyncSession = Depends(get_db)
):
    store_id = current_user.store_id if hasattr(current_user, "store_id") else None
    if not store_id:
        raise HTTPException(status_code=400, detail="Store ID not found for current user")
    stmt = select(BillSettings).where(BillSettings.store_id == store_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        raise HTTPException(status_code=404, detail="Bill settings not found for this store")
    return settings

@router.put("/shopkeeper", response_model=BillSettingsResponse)
async def update_bill_settings_shopkeeper(
    payload: BillSettingsUpdate,
    current_user = Depends(require_permission("stores:update")),
    db: AsyncSession = Depends(get_db)
):
    store_id = current_user.store_id if hasattr(current_user, "store_id") else None
    if not store_id:
        raise HTTPException(status_code=400, detail="Store ID not found for current user")
    stmt = select(BillSettings).where(BillSettings.store_id == store_id)
    result = await db.execute(stmt)
    settings = result.scalar_one_or_none()
    if not settings:
        settings = BillSettings(store_id=store_id)
        db.add(settings)
    
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    return settings
