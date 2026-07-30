from fastapi import APIRouter, Depends, HTTPException, status, Path
from core.deps import require_permission, get_user_admin_id
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from core.deps import get_db, get_current_user, get_current_manager
from models.admin import Admin
from models.manager import Manager
from models.store_category_loyalty import StoreCategoryLoyalty
from schemas.loyalty import StoreCategoryLoyaltyRead, StoreCategoryLoyaltyUpdate
from typing import List

from models.category import Category
from models.store import Store
from typing import List

router = APIRouter()


async def ensure_store_category_loyalties(db: AsyncSession, store_id: int, admin_id: int):
    """Ensure all active categories owned by admin have a StoreCategoryLoyalty entry for store_id."""
    cats_stmt = select(Category.id).where(Category.admin_id == admin_id, Category.is_active.is_(True))
    cat_ids = (await db.execute(cats_stmt)).scalars().all()
    if not cat_ids:
        return

    existing_stmt = select(StoreCategoryLoyalty.category_id).where(StoreCategoryLoyalty.store_id == store_id)
    existing_cat_ids = set((await db.execute(existing_stmt)).scalars().all())

    new_added = False
    for cat_id in cat_ids:
        if cat_id not in existing_cat_ids:
            scl = StoreCategoryLoyalty(
                store_id=store_id,
                category_id=cat_id,
                points_per_unit=50,
                is_enabled=True,
            )
            db.add(scl)
            new_added = True
    if new_added:
        await db.commit()


# --- Admin Endpoints ---

@router.get(
    "/admin/store/{store_id}/loyalty/categories",
    response_model=List[StoreCategoryLoyaltyRead],
    summary="Get loyalty category configurations for a specific store (Admin)",
)
async def get_loyalty_categories_admin(
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> List[StoreCategoryLoyaltyRead]:
    admin_id = get_user_admin_id(current_user)

    # Verify store belongs to admin
    store_stmt = select(Store).where(Store.id == store_id)
    store = (await db.execute(store_stmt)).scalar_one_or_none()
    if not store or store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found or access denied"
        )

    # Auto-seed missing entries with 50 points
    await ensure_store_category_loyalties(db, store_id, admin_id)

    scl_stmt = select(StoreCategoryLoyalty).options(
        joinedload(StoreCategoryLoyalty.store),
        joinedload(StoreCategoryLoyalty.category)
    ).where(StoreCategoryLoyalty.store_id == store_id)
    result = await db.execute(scl_stmt)
    category_loyalties = result.scalars().all()

    if not category_loyalties:
        # If no entries found, return empty list
        return []

    # Verify admin ownership for any returned category loyalty config
    if category_loyalties[0].store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's loyalty categories"
        )
    
    return [
        StoreCategoryLoyaltyRead.model_validate(scl) for scl in category_loyalties
    ]


@router.put(
    "/admin/store/{store_id}/loyalty/categories/{category_id}",
    response_model=StoreCategoryLoyaltyRead,
    summary="Update loyalty category configuration for a specific store (Admin)",
)
async def update_loyalty_category_admin(
    payload: StoreCategoryLoyaltyUpdate,
    store_id: int = Path(..., description="The ID of the store"),
    category_id: int = Path(..., description="The ID of the category"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> StoreCategoryLoyaltyRead:
    admin_id = get_user_admin_id(current_user)
    scl_stmt = select(StoreCategoryLoyalty).options(
        joinedload(StoreCategoryLoyalty.store),
        joinedload(StoreCategoryLoyalty.category)
    ).where(
        StoreCategoryLoyalty.store_id == store_id,
        StoreCategoryLoyalty.category_id == category_id
    )
    result = await db.execute(scl_stmt)
    category_loyalty = result.scalar_one_or_none()

    if not category_loyalty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty category configuration not found"
        )

    if category_loyalty.store.admin_id != admin_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this store's loyalty category configuration"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category_loyalty, field, value)
    
    db.add(category_loyalty)
    await db.commit()
    await db.refresh(category_loyalty)

    return StoreCategoryLoyaltyRead.model_validate(category_loyalty)


# --- Shopkeeper Endpoints ---

@router.get(
    "/shopkeeper/loyalty/categories",
    response_model=List[StoreCategoryLoyaltyRead],
    summary="Get loyalty category configurations for the manager's store (Shopkeeper)",
)
async def get_loyalty_categories_shopkeeper(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> List[StoreCategoryLoyaltyRead]:
    admin_id = get_user_admin_id(current_user)
    if hasattr(current_user, "store_id"):
        store_id = current_user.store_id
    else:
        store = await db.scalar(select(Store).where(Store.admin_id == admin_id))
        if not store:
            raise HTTPException(status_code=400, detail="Admin has no stores")
        store_id = store.id

    await ensure_store_category_loyalties(db, store_id, admin_id)

    scl_stmt = select(StoreCategoryLoyalty).options(
        joinedload(StoreCategoryLoyalty.category)
    ).where(StoreCategoryLoyalty.store_id == store_id)
    result = await db.execute(scl_stmt)
    category_loyalties = result.scalars().all()

    return [
        StoreCategoryLoyaltyRead.model_validate(scl) for scl in category_loyalties
    ]


@router.put(
    "/shopkeeper/loyalty/categories/{category_id}",
    response_model=StoreCategoryLoyaltyRead,
    summary="Update loyalty category configuration for the manager's store (Shopkeeper)",
)
async def update_loyalty_category_shopkeeper(
    payload: StoreCategoryLoyaltyUpdate,
    category_id: int = Path(..., description="The ID of the category"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'manage')),
) -> StoreCategoryLoyaltyRead:
    if hasattr(current_user, "store_id"):
        store_id = current_user.store_id
    else:
        from models.store import Store
        store = await db.scalar(select(Store).where(Store.admin_id == current_user.id))
        if not store:
            raise HTTPException(status_code=400, detail="Admin has no stores")
        store_id = store.id
    scl_stmt = select(StoreCategoryLoyalty).options(
        joinedload(StoreCategoryLoyalty.category)
    ).where(
        StoreCategoryLoyalty.store_id == store_id,
        StoreCategoryLoyalty.category_id == category_id
    )
    result = await db.execute(scl_stmt)
    category_loyalty = result.scalar_one_or_none()

    if not category_loyalty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty category configuration not found"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category_loyalty, field, value)
    
    db.add(category_loyalty)
    await db.commit()
    await db.refresh(category_loyalty)

    return StoreCategoryLoyaltyRead.model_validate(category_loyalty)