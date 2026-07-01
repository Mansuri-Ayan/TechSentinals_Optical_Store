from fastapi import APIRouter, Depends, HTTPException, status, Path
from core.deps import require_permission, get_user_admin_id
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from models.store import Store
from typing import List
from core.deps import get_db, get_current_user, get_current_manager
from models.admin import Admin
from models.manager import Manager
from models.loyalty_config import LoyaltyConfig
from schemas.loyalty import LoyaltyConfigRead, LoyaltyConfigUpdate

router = APIRouter()


# --- Admin Endpoints ---

@router.get(
    "/admin/loyalty/configs",
    response_model=List[dict],
    summary="Get loyalty configurations for all stores (Admin)",
)
async def get_loyalty_configs_all_admin(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> List[dict]:
    admin_id = get_user_admin_id(current_user)
    # Query all stores and join their loyalty configs
    stmt = select(Store).options(joinedload(Store.loyalty_config)).where(Store.admin_id == admin_id)
    result = await db.execute(stmt)
    stores = result.scalars().all()
    
    configs = []
    for store in stores:
        cfg = store.loyalty_config
        configs.append({
            "store_id": store.id,
            "store_name": store.store_name,
            "is_enabled": cfg.is_enabled if cfg else False,
            "price_interval": cfg.price_interval if cfg else 200,
            "price_points": cfg.price_points if cfg else 50,
            "points_per_rupee": cfg.points_per_rupee if cfg else 50,
            "min_redemption_points": cfg.min_redemption_points if cfg else 50,
            "max_redemption_percentage": cfg.max_redemption_percentage if cfg else 100,
            "silver_max": cfg.silver_max if cfg else 5000,
            "gold_max": cfg.gold_max if cfg else 15000,
        })
    return configs


@router.get(
    "/admin/store/{store_id}/loyalty/config",
    response_model=LoyaltyConfigRead,
    summary="Get loyalty configuration for a specific store (Admin)",
)
async def get_loyalty_config_admin(
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> LoyaltyConfigRead:
    admin_id = get_user_admin_id(current_user)
    config_stmt = select(LoyaltyConfig).where(
        LoyaltyConfig.store_id == store_id
    )
    result = await db.execute(config_stmt)
    loyalty_config = result.scalar_one_or_none()

    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for this store"
        )
    
    # Ensure the admin owns the store
    if loyalty_config.store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's loyalty configuration"
        )

    return LoyaltyConfigRead.model_validate(loyalty_config)


@router.put(
    "/admin/store/{store_id}/loyalty/config",
    response_model=LoyaltyConfigRead,
    summary="Update loyalty configuration for a specific store (Admin)",
)
async def update_loyalty_config_admin(
    payload: LoyaltyConfigUpdate,
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> LoyaltyConfigRead:
    admin_id = get_user_admin_id(current_user)
    config_stmt = select(LoyaltyConfig).where(
        LoyaltyConfig.store_id == store_id
    )
    result = await db.execute(config_stmt)
    loyalty_config = result.scalar_one_or_none()

    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for this store"
        )

    # Ensure the admin owns the store
    if loyalty_config.store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's loyalty configuration"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(loyalty_config, field, value)
    
    db.add(loyalty_config)
    await db.commit()
    await db.refresh(loyalty_config)

    return LoyaltyConfigRead.model_validate(loyalty_config)


# --- Shopkeeper Endpoints ---

@router.get(
    "/shopkeeper/loyalty/config",
    response_model=LoyaltyConfigRead,
    summary="Get loyalty configuration for the current user's store (Shopkeeper)",
)
async def get_loyalty_config_shopkeeper(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> LoyaltyConfigRead:
    store_id = current_user.store_id
    config_stmt = select(LoyaltyConfig).where(
        LoyaltyConfig.store_id == store_id
    )
    result = await db.execute(config_stmt)
    loyalty_config = result.scalar_one_or_none()

    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for your store"
        )

    return LoyaltyConfigRead.model_validate(loyalty_config)


@router.put(
    "/shopkeeper/loyalty/config",
    response_model=LoyaltyConfigRead,
    summary="Update loyalty configuration for the current user's store (Shopkeeper)",
)
async def update_loyalty_config_shopkeeper(
    payload: LoyaltyConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'configure')),
) -> LoyaltyConfigRead:
    store_id = current_user.store_id
    config_stmt = select(LoyaltyConfig).where(
        LoyaltyConfig.store_id == store_id
    )
    result = await db.execute(config_stmt)
    loyalty_config = result.scalar_one_or_none()

    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for your store"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(loyalty_config, field, value)
    
    db.add(loyalty_config)
    await db.commit()
    await db.refresh(loyalty_config)

    return LoyaltyConfigRead.model_validate(loyalty_config)
