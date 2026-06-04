# Schema: sale.py
"""
Pydantic schemas for Sale, SaleItem, and SalePayment.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────

class SaleStatusEnum(str, Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    PARTIALLY_PAID = "PARTIALLY_PAID"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class StaffTypeEnum(str, Enum):
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
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str | None = None


class SaleItemRead(BaseModel):
    id: int
    sale_id: int
    product_id: int
    inventory_id: int | None = None
    quantity: int
    unit_price: Decimal
    unit_cost: Decimal | None = None
    discount_percent: Decimal
    tax_percent: Decimal
    line_total: Decimal
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalized
    product_name: str | None = None
    product_sku: str | None = None

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


# ── Sale ──────────────────────────────────────────────────────

class SaleCreate(BaseModel):
    store_id: int = Field(..., description="FK → stores.id")
    customer_id: int | None = Field(
        default=None,
        description="FK → customers.id — NULL for walk-in",
    )
    sold_by_type: StaffTypeEnum = Field(
        ..., description="MANAGER / WORKER / OPTICIAN",
    )
    sold_by_id: int = Field(
        ..., description="ID of the staff member who handled the sale",
    )
    sale_date: date = Field(..., description="Date of sale")
    notes: str | None = None
    items: list[SaleItemCreate] = Field(
        ..., min_length=1, description="At least one item",
    )
    payments: list[SalePaymentCreate] = Field(
        default=[], description="Payment splits (can be empty for credit sales)",
    )


class SaleUpdate(BaseModel):
    status: SaleStatusEnum | None = None
    notes: str | None = None


class SaleRead(BaseModel):
    id: int
    invoice_number: str
    admin_id: int
    store_id: int
    customer_id: int | None = None
    sold_by_type: StaffTypeEnum
    sold_by_id: int
    sale_date: date
    status: SaleStatusEnum
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    loyalty_points_earned: int
    loyalty_points_redeemed: int
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Nested
    items: list[SaleItemRead] = []
    payments: list[SalePaymentRead] = []

    # Denormalized
    store_name: str | None = None
    customer_name: str | None = None

    model_config = {"from_attributes": True}
