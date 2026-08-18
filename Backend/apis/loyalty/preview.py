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
    if hasattr(current_user, "store_id"):
        store_id = current_user.store_id
    else:
        from models.store import Store
        store = await db.scalar(select(Store).where(Store.admin_id == current_user.id))
        if not store:
            raise HTTPException(status_code=400, detail="Admin has no stores")
        store_id = store.id

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
    
    # Block self-redemption: cannot redeem from the same customer who is buying
    if (payload.loyalty_redeem_other_customer_id and
            payload.loyalty_redeem_other_customer_id == payload.customer_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot redeem points from the same customer who is buying. "
                   "Use the standard redemption field instead."
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

    # Retrieve other customer (Person B) if present
    other_customer_current_points = 0
    other_customer_id = payload.loyalty_redeem_other_customer_id
    if other_customer_id:
        other_customer_stmt = select(Customer).where(Customer.id == other_customer_id)
        other_customer_res = await db.execute(other_customer_stmt)
        other_customer = other_res = other_customer_res.scalar_one_or_none()
        if other_customer:
            other_customer_current_points = other_customer.current_points

    # Validate redemptions
    redemption_self = await validate_redemption(
        customer_current_points=customer_current_points,
        points_to_redeem=payload.points_to_redeem_self,
        sale_total=payload.final_amount,
        config=loyalty_config
    )
    redemption_other = await validate_redemption(
        customer_current_points=other_customer_current_points,
        points_to_redeem=payload.points_to_redeem_other,
        sale_total=payload.final_amount,
        config=loyalty_config
    )

    rupee_discount_self = redemption_self["rupee_discount"]
    rupee_discount_other = redemption_other["rupee_discount"]
    points_redeemed_self = redemption_self["points_redeemed"]
    points_redeemed_other = redemption_other["points_redeemed"]

    # Combined capping
    max_discount_pct = getattr(loyalty_config, "max_redemption_percentage", 100)
    max_total_discount = (payload.final_amount * Decimal(str(max_discount_pct)) / Decimal("100")).quantize(Decimal("0.01"))
    
    total_requested_discount = rupee_discount_self + rupee_discount_other
    if total_requested_discount > max_total_discount:
        if rupee_discount_self >= max_total_discount:
            rupee_discount_self = max_total_discount
            points_redeemed_self = int(rupee_discount_self * loyalty_config.points_per_rupee)
            rupee_discount_other = Decimal("0.00")
            points_redeemed_other = 0
        else:
            rupee_discount_other = max_total_discount - rupee_discount_self
            points_redeemed_other = int(rupee_discount_other * loyalty_config.points_per_rupee)

    total_rupee_discount = rupee_discount_self + rupee_discount_other
    redemption_valid = (redemption_self["valid"] if payload.points_to_redeem_self > 0 else True) and \
                       (redemption_other["valid"] if payload.points_to_redeem_other > 0 else True)
    redemption_error = redemption_self["error"] or redemption_other["error"]

    # Calculate points to earn (based on sale total after discount)
    sale_total_after_discount = max(Decimal("0.00"), payload.final_amount - total_rupee_discount)
    earned_points_calc = await calculate_points_for_sale(
        sale_total=sale_total_after_discount,
        sale_items=payload.sale_items,
        config=loyalty_config,
        category_loyalties=category_loyalties,
        category_points_override=payload.category_points_override,
        price_points_override=payload.price_points_override,
        custom_points=payload.custom_points,
        enabled_category_ids=payload.enabled_category_ids
    )

    total_points_to_earn = earned_points_calc["total_points"]

    # Validate earning using award customer
    earn_customer_id = payload.loyalty_awarded_to_customer_id or payload.customer_id
    if earn_customer_id != customer.id:
        earn_customer_stmt = select(Customer).where(Customer.id == earn_customer_id)
        earn_customer_result = await db.execute(earn_customer_stmt)
        earn_customer = earn_customer_result.scalar_one_or_none()
        if not earn_customer:
            raise HTTPException(status_code=404, detail="Award customer not found")
        earn_customer_current_points = earn_customer.current_points
    else:
        earn_customer_current_points = customer_current_points

    # Calculate points after transaction (for the earning customer)
    # Deduct self redemption if earning customer is the main customer
    start_points = earn_customer_current_points
    if earn_customer_id == customer.id:
        start_points -= points_redeemed_self
    if other_customer_id and earn_customer_id == other_customer_id:
        start_points -= points_redeemed_other

    points_after_transaction = start_points + total_points_to_earn
    tier_after_transaction = get_tier(points_after_transaction, loyalty_config)

    return LoyaltyCalculatePreviewResponse(
        customer_current_points=customer_current_points,
        customer_current_points_self=customer_current_points,
        customer_current_points_other=other_customer_current_points,
        category_points=earned_points_calc["category_points"],
        price_points=earned_points_calc["price_points"],
        custom_points=earned_points_calc["custom_points"],
        total_points_to_earn=total_points_to_earn,
        redemption_valid=redemption_valid,
        rupee_discount=total_rupee_discount,
        rupee_discount_self=rupee_discount_self,
        rupee_discount_other=rupee_discount_other,
        points_after_transaction=points_after_transaction,
        tier_after_transaction=tier_after_transaction,
        error=redemption_error,
        error_self=redemption_self["error"],
        error_other=redemption_other["error"]
    )