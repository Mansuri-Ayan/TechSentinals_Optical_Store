# Schema: sale.py
"""
Pydantic schemas for Sale, SaleItem, and SalePayment.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from models.customer import CustomerGender
from schemas.product_snapshot import ProductSnapshotRead


# ── Enums ──────────────────────────────────────────────────────

class SaleStatusEnum(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class StaffTypeEnum(str, Enum):
    ADMIN = "ADMIN"
    MANAGER = "MANAGER"
    WORKER = "WORKER"
    OPTICIAN = "OPTICIAN"


class SalePaymentMethodEnum(str, Enum):
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"
    LOYALTY_POINTS = "LOYALTY_POINTS"
    CREDIT = "CREDIT"
    CHEQUE = "CHEQUE"


# ── SaleItem ──────────────────────────────────────────────────

class SaleItemCreate(BaseModel):
    product_id: int = Field(..., description="FK → products.id")
    inventory_id: int | None = Field(
        default=None,
        description="FK → inventories.id — inventory to decrement",
    )
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str | None = None
    unit_skus: List[str] | None = Field(default=None, description="Optional list of specific unit SKUs assigned")
    deadstock_item_id: int | None = Field(default=None, description="FK → deadstock_items.id if item is from deadstock")



class SaleItemReturnRequest(BaseModel):
    sale_item_id: int
    quantity: int = Field(..., ge=1)
    unit_skus: List[str] | None = Field(default=None, description="Specific unit SKUs being returned (if tracked)")


class SalePartialReturnRequest(BaseModel):
    items: List[SaleItemReturnRequest]
    reason: str | None = None


class SaleItemRead(BaseModel):
    id: int
    sale_id: int
    product_id: int
    product_snapshot_id: int | None = None
    inventory_id: int | None = None
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal | None = None
    discount_percent: Decimal
    tax_percent: Decimal
    line_total: Decimal
    notes: str | None = None
    unit_skus: List[str] | None = None
    deadstock_item_id: int | None = None
    created_at: datetime

    updated_at: datetime

    # Embedded snapshot — all frozen product data at time of sale
    product_snapshot: ProductSnapshotRead | None = None

    # Backward-compatible denormalized fields
    # Auto-populated from product_snapshot via model_validator
    product_name: str | None = None
    product_sku: str | None = None
    product_brand: str | None = None
    product_category: str | None = None
    product_subcategory: str | None = None

    @model_validator(mode="after")
    def _fill_from_snapshot(self) -> "SaleItemRead":
        """Populate denormalized fields from snapshot when not set explicitly."""
        if self.product_snapshot:
            if self.product_name is None:
                self.product_name = self.product_snapshot.name
            if self.product_sku is None:
                self.product_sku = self.product_snapshot.sku
        return self

    model_config = {"from_attributes": True}


# ── SalePayment ───────────────────────────────────────────────

class SalePaymentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: SalePaymentMethodEnum
    reference_number: str | None = Field(default=None, max_length=100)
    remarks: str | None = None


class SalePaymentRead(BaseModel):
    id: int
    sale_id: int
    amount: Decimal
    payment_method: SalePaymentMethodEnum
    reference_number: str | None = None
    remarks: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── NewCustomerDetails (Nested Schema) ──────────────────────────

class NewCustomerDetails(BaseModel):
    first_name: str
    last_name: Optional[str] = None
    phone: str
    email: Optional[str] = None
    gender: Optional[CustomerGender] = None
    date_of_birth: Optional[date] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    remark: Optional[str] = None


# ── Sale ──────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    store_id: int = Field(..., description="FK → stores.id")
    customer_id: int | None = Field(
        default=None,
        description="FK → customers.id — NULL if new customer or walk-in",
    )
    billing_account_customer_id: int | None = Field(
        default=None,
        description="FK → customers.id — The customer who should be billed (defaults to customer_id if NULL)",
    )
    loyalty_awarded_to_customer_id: int | None = Field(
        default=None,
        description="FK → customers.id — The customer who receives loyalty points (defaults to customer_id if NULL)",
    )
    loyalty_redeem_customer_id: int | None = Field(
        default=None,
        description="FK → customers.id — The customer from whom points are redeemed (defaults to customer_id if NULL)",
    )
    new_customer_details: Optional[NewCustomerDetails] = Field(
        default=None,
        description="Details for creating a new customer during the sale if customer_id is NULL"
    )
    sold_by_type: StaffTypeEnum = Field(
        ..., description="MANAGER / WORKER / OPTICIAN",
    )
    sold_by_id: int = Field(
        ..., description="ID of the staff member who handled the sale",
    )
    sale_date: date = Field(..., description="Date of sale")
    notes: str | None = None
    prescription_id: int | None = None
    discount_amount: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    deadstock_deduction: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2, description="Deduction applied for deadstock items")
    items: list[SaleItemCreate] = Field(

        ..., min_length=1, description="At least one item",
    )
    payments: list[SalePaymentCreate] = Field(
        default=[], description="Payment splits (can be empty for credit sales)",
    )
    points_to_redeem: int = Field(
        default=0, ge=0, description="Loyalty points to redeem for discount (legacy/total)",
    )
    points_to_redeem_self: int = Field(
        default=0, ge=0, description="Loyalty points to redeem from main customer",
    )
    points_to_redeem_other: int = Field(
        default=0, ge=0, description="Loyalty points to redeem from other customer",
    )
    loyalty_redeem_other_customer_id: int | None = Field(
        default=None, description="FK → customers.id of other customer being redeemed",
    )
    custom_points: int = Field(
        default=0, ge=0, description="Custom bonus loyalty points to award",
    )
    category_points_enabled_override: bool = Field(
        default=True, description="Override: Enable category-based points for this sale",
    )
    price_points_enabled_override: bool = Field(
        default=True, description="Override: Enable price-based points for this sale",
    )
    enabled_category_points_ids: list[int] | None = Field(
        default=None, description="Category IDs for which category-based points are enabled",
    )


class SaleUpdate(BaseModel):
    status: SaleStatusEnum | None = None
    notes: str | None = None
    lab_status: str | None = None
    lab_id: int | None = None
    lab_name: str | None = None
    sent_to_lab_date: date | None = None
    expected_delivery_date: date | None = None


class SaleRead(BaseModel):
    id: int
    invoice_number: str
    admin_id: int
    store_id: int
    customer_id: int | None = None
    billing_account_customer_id: int | None = None
    loyalty_awarded_to_customer_id: int | None = None
    loyalty_redeemed_from_customer_id: int | None = None
    loyalty_redeemed_other_customer_id: int | None = None
    loyalty_points_redeemed_self: int = 0
    loyalty_points_redeemed_other: int = 0
    sold_by_type: StaffTypeEnum
    sold_by_id: int
    sale_date: date
    status: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    loyalty_points_earned: int
    loyalty_points_redeemed: int
    notes: str | None = None
    prescription_id: int | None = None
    lab_status: str | None = None
    lab_id: int | None = None
    lab_name: str | None = None
    sent_to_lab_date: date | None = None
    expected_delivery_date: date | None = None
    is_exchanged: bool = False
    is_exchange_sale: bool = False
    created_at: datetime
    updated_at: datetime

    # Nested
    items: list[SaleItemRead] = []
    payments: list[SalePaymentRead] = []

    # Denormalized
    store_name: str | None = None
    customer_name: str | None = None
    customer_phone: str | None = None
    customer_address: str | None = None
    staff_name: str | None = None
    staff_code: str | None = None
    staff_role: str | None = None
    prescriptionDetails: dict | None = None
    lensDetails: dict | None = None
    
    # Contextual multi-person info
    billed_on_account_of: dict | None = None
    bought_by: dict | None = None
    loyalty_awarded_to: dict | None = None
    loyalty_redeemed_from: dict | None = None

    # Product summary fields
    product_name: str | None = None
    product_category: str | None = None
    product_subcategory: str | None = None
    product_quantity: int = 0
    product_price: Decimal = Decimal("0")

    model_config = {"from_attributes": True}
