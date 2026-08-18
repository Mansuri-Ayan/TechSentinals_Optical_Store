# Schema: supplier.py
"""
Pydantic schemas for Supplier, SupplierStoreLink, and SupplierProduct.
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────

class SupplierStatusEnum(str, Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    BLACKLISTED = "BLACKLISTED"


# ── Supplier ───────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    store_id: int | None = Field(default=None, description="Optional store to link this supplier to")
    company_name: str = Field(..., max_length=255, description="Supplier company name")
    contact_person: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=10)
    alternate_phone: str | None = Field(default=None, max_length=10)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    gst_number: str | None = Field(default=None, max_length=15)
    pan_number: str | None = Field(default=None, max_length=10)
    bank_account_number: str | None = Field(default=None, max_length=20)
    bank_ifsc: str | None = Field(default=None, max_length=11)
    bank_name: str | None = Field(default=None, max_length=100)
    credit_days: int = Field(default=0, ge=0, description="Default credit period in days")
    status: SupplierStatusEnum = Field(default=SupplierStatusEnum.ACTIVE)
    notes: str | None = None


class SupplierUpdate(BaseModel):
    company_name: str | None = Field(default=None, max_length=255)
    contact_person: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=10)
    alternate_phone: str | None = Field(default=None, max_length=10)
    address: str | None = None
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    pincode: str | None = Field(default=None, max_length=6)
    gst_number: str | None = Field(default=None, max_length=15)
    pan_number: str | None = Field(default=None, max_length=10)
    bank_account_number: str | None = Field(default=None, max_length=20)
    bank_ifsc: str | None = Field(default=None, max_length=11)
    bank_name: str | None = Field(default=None, max_length=100)
    credit_days: int | None = Field(default=None, ge=0)
    status: SupplierStatusEnum | None = None
    notes: str | None = None


class SupplierRead(BaseModel):
    id: int
    admin_id: int
    company_name: str
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    alternate_phone: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    pincode: str | None = None
    gst_number: str | None = None
    pan_number: str | None = None
    bank_account_number: str | None = None
    bank_ifsc: str | None = None
    bank_name: str | None = None
    credit_days: int
    status: SupplierStatusEnum
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


# ── SupplierStoreLink ─────────────────────────────────────────

class SupplierStoreLinkCreate(BaseModel):
    store_id: int = Field(..., description="FK → stores.id")
    is_primary: bool = Field(default=False, description="Preferred supplier flag")


class SupplierStoreLinkRead(BaseModel):
    id: int
    supplier_id: int
    store_id: int
    is_primary: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Denormalized
    store_name: str | None = None
    supplier_name: str | None = None

    model_config = {"from_attributes": True}


# ── SupplierProduct ───────────────────────────────────────────

class SupplierProductCreate(BaseModel):
    product_id: int = Field(..., description="FK → products.id")
    supplier_sku: str | None = Field(default=None, max_length=100)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    minimum_order_quantity: int = Field(default=1, ge=1)
    lead_time_days: int | None = Field(default=None, ge=0)


class SupplierProductUpdate(BaseModel):
    supplier_sku: str | None = Field(default=None, max_length=100)
    unit_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    minimum_order_quantity: int | None = Field(default=None, ge=1)
    lead_time_days: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


class SupplierProductRead(BaseModel):
    id: int
    supplier_id: int
    product_id: int
    supplier_sku: str | None = None
    unit_price: Decimal
    minimum_order_quantity: int
    lead_time_days: int | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Denormalized
    product_name: str | None = None
    product_sku: str | None = None
    category_name: str | None = None
    brand_name: str | None = None

    model_config = {"from_attributes": True}
