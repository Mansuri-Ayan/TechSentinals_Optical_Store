from fastapi import APIRouter, Depends, HTTPException, status, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from core.deps import get_db, get_current_admin, get_current_manager
from models.admin import Admin
from models.manager import Manager
from models.customer import Customer, CustomerMembershipTier
from models.loyalty_transaction import LoyaltyTransaction, LoyaltyTransactionType
from models.loyalty_config import LoyaltyConfig
from schemas.loyalty import LoyaltyStatsRead, LoyaltyTrendData, LoyaltyTierDistribution
from typing import List
from datetime import datetime, timedelta, timezone

router = APIRouter()

async def _get_loyalty_stats(db: AsyncSession, store_id: int | None, admin_id: int) -> LoyaltyStatsRead:
    # Validate store ownership
    from sqlalchemy.orm import joinedload
    from models.store import Store

    if store_id is not None:
        # Verify store belongs to this admin directly
        store_ownership_stmt = select(Store).where(
            Store.id == store_id,
            Store.admin_id == admin_id
        )
        store_ownership_result = await db.execute(store_ownership_stmt)
        owned_store = store_ownership_result.scalar_one_or_none()

        if not owned_store:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Total customers and active customers
        total_customers_stmt = select(func.count(Customer.id)).where(Customer.store_id == store_id)
        total_customers = (await db.execute(total_customers_stmt)).scalar_one()

        # Assuming 'active' customers are those with current_points > 0 or have transactions
        # For simplicity, let's say customers with points > 0 are active
        active_customers_stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.current_points > 0
        )
        total_active_customers = (await db.execute(active_customers_stmt)).scalar_one()

        # Total points awarded
        total_awarded_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id == store_id,
            LoyaltyTransaction.type.in_([LoyaltyTransactionType.EARNED_CATEGORY, LoyaltyTransactionType.EARNED_PRICE, LoyaltyTransactionType.EARNED_CUSTOM, LoyaltyTransactionType.ADJUSTED]),
            LoyaltyTransaction.points > 0
        )
        total_points_awarded = (await db.execute(total_awarded_stmt)).scalar_one()

        # Total points redeemed
        total_redeemed_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id == store_id,
            LoyaltyTransaction.type == LoyaltyTransactionType.REDEEMED,
            LoyaltyTransaction.points < 0 # Redeemed points are negative
        )
        total_points_redeemed = -(await db.execute(total_redeemed_stmt)).scalar_one() # Convert to positive

        # Current total points (sum of all customer.current_points)
        current_total_points_stmt = select(func.coalesce(func.sum(Customer.current_points), 0)).where(Customer.store_id == store_id)
        current_total_points = (await db.execute(current_total_points_stmt)).scalar_one()

        # Tier counts
        silver_count_stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.membership_tier == CustomerMembershipTier.SILVER
        )
        silver_count = (await db.execute(silver_count_stmt)).scalar_one()

        gold_count_stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.membership_tier == CustomerMembershipTier.GOLD
        )
        gold_count = (await db.execute(gold_count_stmt)).scalar_one()

        platinum_count_stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.membership_tier == CustomerMembershipTier.PLATINUM
        )
        platinum_count = (await db.execute(platinum_count_stmt)).scalar_one()
    else:
        # Aggregated stats for all stores under the admin
        total_customers_stmt = select(func.count(Customer.id)).where(Customer.admin_id == admin_id)
        total_customers = (await db.execute(total_customers_stmt)).scalar_one()

        active_customers_stmt = select(func.count(Customer.id)).where(
            Customer.admin_id == admin_id,
            Customer.current_points > 0
        )
        total_active_customers = (await db.execute(active_customers_stmt)).scalar_one()

        # Fetch store IDs for this admin
        store_ids_stmt = select(Store.id).where(Store.admin_id == admin_id)
        store_ids = (await db.execute(store_ids_stmt)).scalars().all()

        if not store_ids:
            return LoyaltyStatsRead(
                total_customers=0,
                total_active_customers=0,
                total_points_awarded=0,
                total_points_redeemed=0,
                current_total_points=0,
                silver_count=0,
                gold_count=0,
                platinum_count=0
            )

        # Total points awarded
        total_awarded_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id.in_(store_ids),
            LoyaltyTransaction.type.in_([LoyaltyTransactionType.EARNED_CATEGORY, LoyaltyTransactionType.EARNED_PRICE, LoyaltyTransactionType.EARNED_CUSTOM, LoyaltyTransactionType.ADJUSTED]),
            LoyaltyTransaction.points > 0
        )
        total_points_awarded = (await db.execute(total_awarded_stmt)).scalar_one()

        # Total points redeemed
        total_redeemed_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id.in_(store_ids),
            LoyaltyTransaction.type == LoyaltyTransactionType.REDEEMED,
            LoyaltyTransaction.points < 0
        )
        total_points_redeemed = -(await db.execute(total_redeemed_stmt)).scalar_one()

        # Current total points
        current_total_points_stmt = select(func.coalesce(func.sum(Customer.current_points), 0)).where(Customer.admin_id == admin_id)
        current_total_points = (await db.execute(current_total_points_stmt)).scalar_one()

        # Tier counts
        silver_count_stmt = select(func.count(Customer.id)).where(
            Customer.admin_id == admin_id,
            Customer.membership_tier == CustomerMembershipTier.SILVER
        )
        silver_count = (await db.execute(silver_count_stmt)).scalar_one()

        gold_count_stmt = select(func.count(Customer.id)).where(
            Customer.admin_id == admin_id,
            Customer.membership_tier == CustomerMembershipTier.GOLD
        )
        gold_count = (await db.execute(gold_count_stmt)).scalar_one()

        platinum_count_stmt = select(func.count(Customer.id)).where(
            Customer.admin_id == admin_id,
            Customer.membership_tier == CustomerMembershipTier.PLATINUM
        )
        platinum_count = (await db.execute(platinum_count_stmt)).scalar_one()

    return LoyaltyStatsRead(
        total_customers=total_customers,
        total_active_customers=total_active_customers,
        total_points_awarded=total_points_awarded,
        total_points_redeemed=total_points_redeemed,
        current_total_points=current_total_points,
        silver_count=silver_count,
        gold_count=gold_count,
        platinum_count=platinum_count
    )


async def _get_loyalty_trends(db: AsyncSession, store_id: int | None, admin_id: int) -> List[LoyaltyTrendData]:
    # Validate store ownership
    from sqlalchemy.orm import joinedload
    from models.store import Store

    if store_id is not None:
        # Verify store belongs to this admin directly
        store_ownership_stmt = select(Store).where(
            Store.id == store_id,
            Store.admin_id == admin_id
        )
        store_ownership_result = await db.execute(store_ownership_stmt)
        owned_store = store_ownership_result.scalar_one_or_none()

        if not owned_store:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
            
        store_ids = [store_id]
    else:
        # Fetch store IDs for this admin
        store_ids_stmt = select(Store.id).where(Store.admin_id == admin_id)
        store_ids = (await db.execute(store_ids_stmt)).scalars().all()
        
        if not store_ids:
            return []

    trends = []
    now = datetime.now(timezone.utc)

    for i in range(6, -1, -1): # Last 7 months including current
        target_month_start = (now.replace(day=1) - timedelta(days=i*30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month_start = (target_month_start + timedelta(days=32)).replace(day=1)

        month_label = target_month_start.strftime("%b %Y")

        earned_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id.in_(store_ids),
            LoyaltyTransaction.created_at >= target_month_start,
            LoyaltyTransaction.created_at < next_month_start,
            LoyaltyTransaction.points > 0 # only positive points are earned
        )
        earned_points = (await db.execute(earned_stmt)).scalar_one()

        redeemed_stmt = select(func.coalesce(func.sum(LoyaltyTransaction.points), 0)).where(
            LoyaltyTransaction.store_id.in_(store_ids),
            LoyaltyTransaction.created_at >= target_month_start,
            LoyaltyTransaction.created_at < next_month_start,
            LoyaltyTransaction.points < 0 # only negative points are redeemed/adjusted downwards
        )
        redeemed_points = -(await db.execute(redeemed_stmt)).scalar_one() # Convert to positive

        trends.append(LoyaltyTrendData(month=month_label, earned_points=earned_points, redeemed_points=redeemed_points))
    
    return trends


async def _get_loyalty_tier_distribution(db: AsyncSession, store_id: int | None, admin_id: int) -> List[LoyaltyTierDistribution]:
    # Validate store ownership
    from sqlalchemy.orm import joinedload
    from models.store import Store

    if store_id is not None:
        # Verify store belongs to this admin directly
        store_ownership_stmt = select(Store).where(
            Store.id == store_id,
            Store.admin_id == admin_id
        )
        store_ownership_result = await db.execute(store_ownership_stmt)
        owned_store = store_ownership_result.scalar_one_or_none()

        if not owned_store:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Count only customers with a tier (not NONE) for distribution
        loyalty_members_stmt = select(func.count(Customer.id)).where(
            Customer.store_id == store_id,
            Customer.membership_tier != CustomerMembershipTier.NONE
        )
        loyalty_members_total = (await db.execute(loyalty_members_stmt)).scalar_one()

        tier_distribution = []
        for tier_enum in [CustomerMembershipTier.SILVER, CustomerMembershipTier.GOLD, CustomerMembershipTier.PLATINUM]:
            tier_count_stmt = select(func.count(Customer.id)).where(
                Customer.store_id == store_id,
                Customer.membership_tier == tier_enum
            )
            count = (await db.execute(tier_count_stmt)).scalar_one()
            percentage = (count / loyalty_members_total * 100) if loyalty_members_total > 0 else 0.0
            tier_distribution.append(LoyaltyTierDistribution(
                tier=tier_enum.value,
                count=count,
                percentage=round(percentage, 2)
            ))
    else:
        # Count only customers with a tier (not NONE) for distribution
        loyalty_members_stmt = select(func.count(Customer.id)).where(
            Customer.admin_id == admin_id,
            Customer.membership_tier != CustomerMembershipTier.NONE
        )
        loyalty_members_total = (await db.execute(loyalty_members_stmt)).scalar_one()

        tier_distribution = []
        for tier_enum in [CustomerMembershipTier.SILVER, CustomerMembershipTier.GOLD, CustomerMembershipTier.PLATINUM]:
            tier_count_stmt = select(func.count(Customer.id)).where(
                Customer.admin_id == admin_id,
                Customer.membership_tier == tier_enum
            )
            count = (await db.execute(tier_count_stmt)).scalar_one()
            percentage = (count / loyalty_members_total * 100) if loyalty_members_total > 0 else 0.0
            tier_distribution.append(LoyaltyTierDistribution(
                tier=tier_enum.value,
                count=count,
                percentage=round(percentage, 2)
            ))
    
    return tier_distribution


# --- Admin Endpoints ---

@router.get(
    "/admin/loyalty/stats",
    response_model=LoyaltyStatsRead,
    summary="Get loyalty statistics for all stores (Admin)",
)
async def get_loyalty_stats_all_admin(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> LoyaltyStatsRead:
    return await _get_loyalty_stats(db, None, current_admin.id)


@router.get(
    "/admin/loyalty/trends",
    response_model=List[LoyaltyTrendData],
    summary="Get loyalty trends for all stores (Admin)",
)
async def get_loyalty_trends_all_admin(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> List[LoyaltyTrendData]:
    return await _get_loyalty_trends(db, None, current_admin.id)


@router.get(
    "/admin/loyalty/tier-distribution",
    response_model=List[LoyaltyTierDistribution],
    summary="Get loyalty tier distribution for all stores (Admin)",
)
async def get_loyalty_tier_distribution_all_admin(
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> List[LoyaltyTierDistribution]:
    return await _get_loyalty_tier_distribution(db, None, current_admin.id)


@router.get(
    "/admin/store/{store_id}/loyalty/stats",
    response_model=LoyaltyStatsRead,
    summary="Get loyalty statistics for a specific store (Admin)",
)
async def get_loyalty_stats_admin(
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> LoyaltyStatsRead:
    return await _get_loyalty_stats(db, store_id, current_admin.id)


@router.get(
    "/admin/store/{store_id}/loyalty/trends",
    response_model=List[LoyaltyTrendData],
    summary="Get loyalty trends for a specific store (Admin)",
)
async def get_loyalty_trends_admin(
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> List[LoyaltyTrendData]:
    return await _get_loyalty_trends(db, store_id, current_admin.id)


@router.get(
    "/admin/store/{store_id}/loyalty/tier-distribution",
    response_model=List[LoyaltyTierDistribution],
    summary="Get loyalty tier distribution for a specific store (Admin)",
)
async def get_loyalty_tier_distribution_admin(
    store_id: int = Path(..., description="The ID of the store"),
    db: AsyncSession = Depends(get_db),
    current_admin: Admin = Depends(get_current_admin),
) -> List[LoyaltyTierDistribution]:
    return await _get_loyalty_tier_distribution(db, store_id, current_admin.id)


# --- Shopkeeper Endpoints ---

@router.get(
    "/shopkeeper/loyalty/stats",
    response_model=LoyaltyStatsRead,
    summary="Get loyalty statistics for the manager's store (Shopkeeper)",
)
async def get_loyalty_stats_shopkeeper(
    db: AsyncSession = Depends(get_db),
    current_manager: Manager = Depends(get_current_manager),
) -> LoyaltyStatsRead:
    return await _get_loyalty_stats(db, current_manager.store_id, current_manager.store.admin_id)


@router.get(
    "/shopkeeper/loyalty/trends",
    response_model=List[LoyaltyTrendData],
    summary="Get loyalty trends for the manager's store (Shopkeeper)",
)
async def get_loyalty_trends_shopkeeper(
    db: AsyncSession = Depends(get_db),
    current_manager: Manager = Depends(get_current_manager),
) -> List[LoyaltyTrendData]:
    return await _get_loyalty_trends(db, current_manager.store_id, current_manager.store.admin_id)


@router.get(
    "/shopkeeper/loyalty/tier-distribution",
    response_model=List[LoyaltyTierDistribution],
    summary="Get loyalty tier distribution for the manager's store (Shopkeeper)",
)
async def get_loyalty_tier_distribution_shopkeeper(
    db: AsyncSession = Depends(get_db),
    current_manager: Manager = Depends(get_current_manager),
) -> List[LoyaltyTierDistribution]:
    return await _get_loyalty_tier_distribution(db, current_manager.store_id, current_manager.store.admin_id)
