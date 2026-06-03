# Schema: inventory.py
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


class OwnerTypeEnum(str, Enum):
    ADMIN = "ADMIN"
    STORE = "STORE"


class InventoryCreate(BaseModel):
    owner_type: OwnerTypeEnum = Field(
        ..., description="ADMIN (warehouse) or STORE",
    )
    owner_id: int = Field(
        ..., description="admins.id or stores.id depending on owner_type",
    )
    product_id: int = Field(
        ..., description="FK → products.id",
    )
    quantity: int = Field(
        default=0, ge=0, description="Initial quantity",
    )
    reorder_level: int = Field(
        default=0, ge=0, description="Low-stock threshold",
    )


class InventoryUpdate(BaseModel):
    reorder_level: int | None = Field(default=None, ge=0)
    is_active: bool | None = Field(default=None)


class InventoryAdjustment(BaseModel):
    """For manual stock adjustments (audit corrections)."""
    quantity: int = Field(
        ..., description="New absolute quantity (positive)",
        ge=0,
    )
    remarks: str | None = Field(
        default=None, description="Reason for adjustment",
    )


class InventoryRead(BaseModel):
    id: int
    owner_type: OwnerTypeEnum
    owner_id: int
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    reorder_level: int
    last_purchase_price: Decimal | None = None
    last_stock_in_at: datetime | None = None
    last_stock_out_at: datetime | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Denormalized product info
    product_name: str | None = None
    product_sku: str | None = None

    model_config = {"from_attributes": True}
