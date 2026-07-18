from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict, model_validator
from decimal import Decimal
from datetime import datetime
from models.loyalty_transaction import LoyaltyTransactionType # Import from models


# LoyaltyConfig schemas
class LoyaltyConfigBase(BaseModel):
    is_enabled: bool
    category_points_enabled: bool
    price_points_enabled: bool
    price_interval: int
    price_points: int
    points_per_rupee: int
    min_redemption_points: int
    max_redemption_percentage: int
    silver_max: int
    gold_max: int

class LoyaltyConfigCreate(LoyaltyConfigBase):
    pass

class LoyaltyConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    category_points_enabled: Optional[bool] = None
    price_points_enabled: Optional[bool] = None
    price_interval: Optional[int] = None
    price_points: Optional[int] = None
    points_per_rupee: Optional[int] = None
    min_redemption_points: Optional[int] = None
    max_redemption_percentage: Optional[int] = None
    silver_max: Optional[int] = None
    gold_max: Optional[int] = None

class LoyaltyConfigRead(LoyaltyConfigBase):
    id: int
    store_id: int

    model_config = ConfigDict(from_attributes=True)

# StoreCategoryLoyalty schemas
class StoreCategoryLoyaltyBase(BaseModel):
    category_id: int
    points_per_unit: int
    is_enabled: bool

class StoreCategoryLoyaltyCreate(StoreCategoryLoyaltyBase):
    pass

class StoreCategoryLoyaltyUpdate(BaseModel):
    points_per_unit: Optional[int] = None
    is_enabled: Optional[bool] = None

class StoreCategoryLoyaltyRead(BaseModel):
    id: int
    store_id: int
    category_id: int
    points_per_unit: int
    is_enabled: bool
    category_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def extract_category_name(cls, values):
        # values is the ORM object when from_attributes=True
        if hasattr(values, 'category') and values.category is not None:
            # Inject category_name from the relationship
            object.__setattr__(values, '_category_name_injected', values.category.name)
            return values
        return values

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        if hasattr(obj, 'category') and obj.category is not None:
            instance.category_name = obj.category.name
        return instance

# LoyaltyTransaction schemas
class LoyaltyTransactionCreate(BaseModel):
    customer_id: int
    store_id: int
    sale_id: Optional[int] = None
    type: LoyaltyTransactionType
    points: int
    category_id: Optional[int] = None
    rupee_value: Optional[Decimal] = None
    given_by_type: Optional[str] = None
    given_by_id: Optional[int] = None
    note: Optional[str] = None

class LoyaltyTransactionRead(LoyaltyTransactionCreate):
    id: int
    created_at: datetime

    # Relationships, if loaded
    customer_name: Optional[str] = None
    store_name: Optional[str] = None
    category_name: Optional[str] = None
    redeemed_by_id: Optional[int] = None
    redeemed_by_name: Optional[str] = None
    points_owner_id: Optional[int] = None
    points_owner_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='before')
    @classmethod
    def extract_redeemed_by(cls, values):
        if hasattr(values, 'sale') and values.sale is not None and values.type == LoyaltyTransactionType.REDEEMED:
            if hasattr(values.sale, 'customer') and values.sale.customer is not None:
                if values.sale.customer_id != values.customer_id:
                    object.__setattr__(values, '_redeemed_by_id_injected', values.sale.customer_id)
                    object.__setattr__(values, '_redeemed_by_name_injected', f"{values.sale.customer.first_name} {values.sale.customer.last_name or ''}".strip())
        return values

    @classmethod
    def model_validate(cls, obj, **kwargs):
        instance = super().model_validate(obj, **kwargs)
        if hasattr(obj, 'sale') and obj.sale is not None and obj.type == LoyaltyTransactionType.REDEEMED:
            if hasattr(obj.sale, 'customer') and obj.sale.customer is not None:
                if obj.sale.customer_id != obj.customer_id:
                    instance.redeemed_by_id = obj.sale.customer_id
                    instance.redeemed_by_name = f"{obj.sale.customer.first_name} {obj.sale.customer.last_name or ''}".strip()
                    if hasattr(obj, 'customer') and obj.customer is not None:
                        instance.points_owner_id = obj.customer_id
                        instance.points_owner_name = f"{obj.customer.first_name} {obj.customer.last_name or ''}".strip()
        return instance

# Loyalty Customer Stats
class LoyaltyCustomerStats(BaseModel):
    customer_id: int
    customer_name: str
    customer_phone: str
    current_points: int
    membership_tier: str
    lifetime_earned_points: int
    lifetime_redeemed_points: int
    last_transaction_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class LoyaltyCustomerDetailRead(LoyaltyCustomerStats):
    customer_email: Optional[str] = None
    join_date: Optional[str] = None
    lifetime_orders: int = 0
    lifetime_spend: Decimal = Decimal('0.0')
    transactions: List[LoyaltyTransactionRead] = []


# Loyalty Stats
class LoyaltyStatsRead(BaseModel):
    total_customers: int
    total_active_customers: int
    total_points_awarded: int
    total_points_redeemed: int
    current_total_points: int
    silver_count: int
    gold_count: int
    platinum_count: int

# Loyalty Trend data
class LoyaltyTrendData(BaseModel):
    month: str
    earned_points: int
    redeemed_points: int

# Loyalty Tier Distribution
class LoyaltyTierDistribution(BaseModel):
    tier: str
    count: int
    percentage: float


class LoyaltyCalculatePreviewRequest(BaseModel):
    customer_id: int
    loyalty_redeem_customer_id: Optional[int] = None
    loyalty_awarded_to_customer_id: Optional[int] = None
    sale_items: List[Dict]
    final_amount: Decimal
    points_to_redeem: int
    custom_points: int
    category_points_override: bool
    price_points_override: bool
    enabled_category_ids: Optional[List[int]] = None

class LoyaltyCalculatePreviewResponse(BaseModel):
    customer_current_points: int
    category_points: int
    price_points: int
    custom_points: int
    total_points_to_earn: int
    redemption_valid: bool
    rupee_discount: Decimal
    points_after_transaction: int
    tier_after_transaction: str
    error: Optional[str] = None


class LoyaltyAdjustRequest(BaseModel):
    customer_id: int
    points: int # Positive for adding, negative for subtracting
    note: Optional[str] = None