# Schema: inventory.py
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field

from schemas.product import FrameDetailsRead, LensDetailsRead, AccessoryDetailsRead


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
    category_id: int | None = None
    category_name: str | None = None
    subcategory_id: int | None = None
    subcategory_name: str | None = None
    brand_id: int | None = None
    brand_name: str | None = None
    cost_price: Decimal | None = None
    selling_price: Decimal | None = None
    price: Decimal | None = None  # Alias for selling_price
    image_url: str | None = None
    discount_percent: Decimal = Decimal("0.00")
    warranty_months: int = 0

    # Nested type-specific details
    frame_product: FrameDetailsRead | None = None
    lens_product: LensDetailsRead | None = None
    accessory_product: AccessoryDetailsRead | None = None

    model_config = {"from_attributes": True}


class InventoryResponse(BaseModel):
    items: list[InventoryRead]
    total: int
    page: int
    limit: int
    pages: int
    total_products: int
    low_stock_count: int
    out_of_stock_count: int
    total_valuation: float
