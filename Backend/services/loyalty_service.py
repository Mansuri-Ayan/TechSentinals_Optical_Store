from decimal import Decimal
from math import floor
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.loyalty_config import LoyaltyConfig
from models.store_category_loyalty import StoreCategoryLoyalty
from models.customer import Customer, CustomerMembershipTier # Import CustomerMembershipTier
from models.category import Category # Import Category if needed for relationships


async def calculate_points_for_sale(
    sale_total: Decimal,  # final amount after all discounts
    sale_items: List[Dict],  # [{"category_id": int, "quantity": int}]
    config: LoyaltyConfig,
    category_loyalties: List[StoreCategoryLoyalty],
    category_points_override: bool,  # from checkout checkbox
    price_points_override: bool,  # from checkout checkbox
    custom_points: int = 0,
    enabled_category_ids: Optional[List[int]] = None
) -> Dict:
    """Calculates points earned for a sale based on loyalty configuration."""
    category_points = 0
    price_points = 0
    total_points = 0

    if config.category_points_enabled and category_points_override:
        for item in sale_items:
            # Skip if this specific category is not in the enabled list (if provided)
            if enabled_category_ids is not None and item["category_id"] not in enabled_category_ids:
                continue
            # Find matching StoreCategoryLoyalty for the item's category
            matched_loyalty = next(
                (scl for scl in category_loyalties if scl.category_id == item["category_id"] and scl.is_enabled),
                None
            )
            if matched_loyalty:
                category_points += item["quantity"] * matched_loyalty.points_per_unit

    if config.price_points_enabled and price_points_override:
        price_points = floor(sale_total / config.price_interval) * config.price_points

    total_points = category_points + price_points + custom_points

    return {
        "category_points": category_points,
        "price_points": price_points,
        "custom_points": custom_points,
        "total_points": total_points
    }


async def validate_redemption(
    customer_current_points: int,
    points_to_redeem: int,
    sale_total: Decimal,
    config: LoyaltyConfig
) -> Dict:
    """Validates loyalty points redemption and calculates rupee discount."""
    if points_to_redeem == 0:
        return {
            "valid": True,
            "points_redeemed": 0,
            "rupee_discount": Decimal("0.00"),
            "error": None
        }

    error = None
    if customer_current_points < config.min_redemption_points:
        error = f"Customer does not have minimum required points for redemption ({config.min_redemption_points})"
    elif points_to_redeem < config.min_redemption_points:
        error = f"Points to redeem must be at least {config.min_redemption_points}"
    elif points_to_redeem > customer_current_points:
        error = "Points to redeem cannot exceed customer's current points"

    if error:
        return {
            "valid": False,
            "points_redeemed": 0,
            "rupee_discount": Decimal("0.00"),
            "error": error
        }

    rupee_discount = Decimal(str(floor(points_to_redeem / config.points_per_rupee)))
    
    # Cap rupee discount at the max allowed percentage of sale total
    max_discount_pct = getattr(config, "max_redemption_percentage", 100)
    max_discount = (sale_total * Decimal(str(max_discount_pct)) / Decimal("100")).quantize(Decimal("0.01"))
    
    if rupee_discount > max_discount:
        rupee_discount = max_discount
        # Recalculate points_to_redeem based on capped rupee_discount
        points_to_redeem = int(rupee_discount * config.points_per_rupee)

    return {
        "valid": True,
        "points_redeemed": points_to_redeem,
        "rupee_discount": rupee_discount,
        "error": None
    }


def get_tier(points: int, config: LoyaltyConfig) -> str:
    """Determines the customer's loyalty tier based on points."""
    if points <= 0:
        return CustomerMembershipTier.NONE.value
    if points <= config.silver_max:
        return CustomerMembershipTier.SILVER.value
    if points <= config.gold_max:
        return CustomerMembershipTier.GOLD.value
    return CustomerMembershipTier.PLATINUM.value


async def update_customer_points(
    session: AsyncSession,
    customer_id: int,
    points_delta: int,  # positive = add, negative = subtract
    config: LoyaltyConfig
) -> str:  # returns new tier: "NONE"/"SILVER"/"GOLD"/"PLATINUM"
    """
    Atomically updates customer's current points and recalculates their tier.
    Returns the new membership tier.
    """
    customer_stmt = select(Customer).where(Customer.id == customer_id)
    result = await session.execute(customer_stmt)
    customer = result.scalar_one_or_none()

    if not customer:
        # This case should ideally be handled before calling this function,
        # but as a safeguard, return a default tier if customer not found.
        # Or raise an exception, depending on desired error handling.
        return CustomerMembershipTier.NONE.value

    customer.current_points += points_delta

    # Recalculate tier
    new_tier = get_tier(customer.current_points, config)
    customer.membership_tier = new_tier

    session.add(customer)
    # No commit here, as this function is expected to be part of a larger transaction.
    # The caller will commit.

    return new_tier
