from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from core.deps import get_db, require_permission, get_user_admin_id
from models.manager import Manager
from models.loyalty_config import LoyaltyConfig
from models.store_category_loyalty import StoreCategoryLoyalty
from models.customer import Customer
from schemas.loyalty import LoyaltyCalculatePreviewRequest, LoyaltyCalculatePreviewResponse
from services.loyalty_service import calculate_points_for_sale, validate_redemption, get_tier

router = APIRouter()

@router.post(
    "/shopkeeper/loyalty/calculate-preview",
    response_model=LoyaltyCalculatePreviewResponse,
    summary="Preview loyalty points earning and redemption for a sale (Shopkeeper)",
)
async def calculate_loyalty_preview(
    payload: LoyaltyCalculatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_permission('loyalty', 'read')),
) -> LoyaltyCalculatePreviewResponse:
    store_id = current_user.store_id

    # Fetch LoyaltyConfig
    config_stmt = select(LoyaltyConfig).where(LoyaltyConfig.store_id == store_id)
    config_result = await db.execute(config_stmt)
    loyalty_config = config_result.scalar_one_or_none()
    if not loyalty_config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loyalty configuration not found for this store"
        )

    # Fetch StoreCategoryLoyalty
    scl_stmt = select(StoreCategoryLoyalty).where(StoreCategoryLoyalty.store_id == store_id)
    scl_result = await db.execute(scl_stmt)
    category_loyalties = scl_result.scalars().all()

    # Fetch Customer
    customer_stmt = select(Customer).where(Customer.id == payload.customer_id)
    customer_result = await db.execute(customer_stmt)
    customer = customer_result.scalar_one_or_none()
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    if customer.store_id != store_id and customer.admin_id != get_user_admin_id(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer does not belong to this store's admin"
        )
    
    if not getattr(loyalty_config, "is_enabled", True):
        return LoyaltyCalculatePreviewResponse(
            customer_current_points=customer.current_points,
            category_points=0,
            price_points=0,
            custom_points=0,
            total_points_to_earn=0,
            redemption_valid=False,
            rupee_discount=Decimal("0.00"),
            points_after_transaction=customer.current_points,
            tier_after_transaction=getattr(customer, "membership_tier", "NONE"),
            error="Loyalty program is currently disabled for this store"
        )

    customer_current_points = customer.current_points

    # Calculate points to earn
    earned_points_calc = await calculate_points_for_sale(
        sale_total=payload.final_amount,
        sale_items=payload.sale_items,
        config=loyalty_config,
        category_loyalties=category_loyalties,
        category_points_override=payload.category_points_override,
        price_points_override=payload.price_points_override,
        custom_points=payload.custom_points,
        enabled_category_ids=payload.enabled_category_ids
    )

    total_points_to_earn = earned_points_calc["total_points"]

    # Validate redemption using redeem customer
    redeem_customer_id = payload.loyalty_redeem_customer_id or payload.customer_id
    if redeem_customer_id != customer.id:
        redeem_customer_stmt = select(Customer).where(Customer.id == redeem_customer_id)
        redeem_customer_result = await db.execute(redeem_customer_stmt)
        redeem_customer = redeem_customer_result.scalar_one_or_none()
        if not redeem_customer:
            raise HTTPException(status_code=404, detail="Redeem customer not found")
        redeem_customer_current_points = redeem_customer.current_points
    else:
        redeem_customer_current_points = customer_current_points

    redemption_calc = await validate_redemption(
        customer_current_points=redeem_customer_current_points,
        points_to_redeem=payload.points_to_redeem,
        sale_total=payload.final_amount,
        config=loyalty_config
    )
    
    redemption_valid = redemption_calc["valid"]
    points_redeemed = redemption_calc["points_redeemed"]
    rupee_discount = redemption_calc["rupee_discount"]
    redemption_error = redemption_calc["error"]

    # Calculate points after transaction (for the earning customer)
    points_after_transaction = customer_current_points + total_points_to_earn
    tier_after_transaction = get_tier(points_after_transaction, loyalty_config)

    return LoyaltyCalculatePreviewResponse(
        customer_current_points=redeem_customer_current_points, # Show redeem customer's points available
        category_points=earned_points_calc["category_points"],
        price_points=earned_points_calc["price_points"],
        custom_points=earned_points_calc["custom_points"],
        total_points_to_earn=total_points_to_earn,
        redemption_valid=redemption_valid,
        rupee_discount=rupee_discount,
        points_after_transaction=points_after_transaction,
        tier_after_transaction=tier_after_transaction,
        error=redemption_error
    )