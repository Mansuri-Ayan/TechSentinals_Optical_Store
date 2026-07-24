# Schema: customer.py
"""
Pydantic schemas for Customer (without prescription — now in separate table).
"""
from datetime import date, datetime
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────

class CustomerGenderEnum(str, Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    NOT_SPECIFIED = "NOT_SPECIFIED"


# ── Customer ──────────────────────────────────────────────────

class CustomerCreate(BaseModel):
    first_name: str = Field(..., max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str = Field(..., max_length=10, description="Primary identifier")
    date_of_birth: date | None = None
    gender: CustomerGenderEnum = Field(default=CustomerGenderEnum.NOT_SPECIFIED)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    store_id: int | None = Field(
        default=None, description="FK → stores.id — store this customer is mapped to",
    )
    first_visit_store_id: int | None = Field(
        default=None, description="FK → stores.id — store of first visit",
    )
    remark: str | None = None


class CustomerUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=100)
    last_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=10)
    date_of_birth: date | None = None
    gender: CustomerGenderEnum | None = None
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    store_id: int | None = None
    is_active: bool | None = None
    remark: str | None = None


class CustomerRead(BaseModel):
    id: int
    admin_id: int
    store_id: int | None = None
    first_visit_store_id: int | None = None
    first_name: str
    last_name: str | None = None
    email: str | None = None
    phone: str
    date_of_birth: date | None = None
    gender: CustomerGenderEnum
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    remark: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    # Denormalized
    store_name: str | None = None
    first_visit_store_name: str | None = None

    # Loyalty
    loyalty_points_earned: int = 0
    loyalty_points_redeemed: int = 0
    current_points: int = 0
    membership_tier: str = "NONE"

    # Aggregates
    total_orders: int = 0
    total_amount: float = 0.0
    outstanding_balance: float = 0.0
    last_visit: date | None = None
    status: str = "Active"

    model_config = {"from_attributes": True}


class CustomerLinkCreate(BaseModel):
    customer_id_2: int | None = None
    new_customer: CustomerCreate | None = None


class CustomerListRead(BaseModel):
    """Lighter schema for list views."""
    id: int
    admin_id: int
    store_id: int | None = None
    first_name: str
    last_name: str | None = None
    email: str | None = None
    phone: str
    gender: CustomerGenderEnum
    city: str | None = None
    is_active: bool
    created_at: datetime

    # Denormalized
    store_name: str | None = None

    # Loyalty
    current_points: int = 0
    membership_tier: str = "NONE"

    # Aggregates
    total_orders: int = 0
    total_amount: float = 0.0
    outstanding_balance: float = 0.0
    last_visit: date | None = None
    status: str = "Active"

    model_config = {"from_attributes": True}


class CustomerDetailRead(CustomerRead):
    """Detailed customer schema including orders, active prescription, prescription history, and compiled activity history."""
    orders: list[dict] = []
    prescription: dict | None = None
    prescription_history: list[dict] = []
    history: list[dict] = []
