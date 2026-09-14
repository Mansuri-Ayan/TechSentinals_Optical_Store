# Schema: inventory.py
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, model_validator

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
    selling_price: Decimal | None = Field(
        default=None, description="Selling price per unit for this batch",
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


class StoreStockRead(BaseModel):
    store_id: int
    store_name: str
    owner_type: str
    quantity: int
    available_quantity: int


class InventoryRead(BaseModel):
    id: int
    owner_type: OwnerTypeEnum
    owner_id: int
    owner_name: str | None = None
    product_id: int
    quantity: int
    reserved_quantity: int
    available_quantity: int
    reorder_level: int
    last_purchase_price: Decimal | None = None
    last_stock_in_at: datetime | None = None
    last_stock_out_at: datetime | None = None
    is_active: bool
    aging_stage: str | None = "NORMAL"
    aging_discount_percent: Decimal | None = Decimal("0.00")
    aging_stage_changed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalized product info
    product_name: str | None = None
    product_sku: str | None = None
    sku: str | None = None  # Alias for product_sku
    category_id: int | None = None
    category_name: str | None = None
    category: str | None = None  # Alias for category_name
    subcategory_id: int | None = None
    subcategory_name: str | None = None
    subcategory: str | None = None  # Alias for subcategory_name
    brand_id: int | None = None
    brand_name: str | None = None
    brand: str | None = None  # Alias for brand_name
    cost_price: Decimal | None = None
    selling_price: Decimal | None = None
    selling_price_before_gst: Decimal | None = None
    price: Decimal | None = None  # Alias for selling_price
    gst_percent: Decimal | None = None
    gst_amount: Decimal | None = None
    selling_price_with_gst: Decimal | None = None
    image_url: str | None = None
    discount_percent: Decimal = Decimal("0.00")
    warranty_months: int = 0
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier: str | None = None  # Alias for supplier_name
    sales_workflow_type: str | None = "BOTH"

    # Nested type-specific details
    frame_product: FrameDetailsRead | None = None
    lens_product: LensDetailsRead | None = None
    accessory_product: AccessoryDetailsRead | None = None

    other_stocks: list[StoreStockRead] = []

    @model_validator(mode="after")
    def _compute_gst_fields(self) -> "InventoryRead":
        sp = self.selling_price if self.selling_price is not None else self.price
        if self.selling_price_before_gst is None and sp is not None:
            self.selling_price_before_gst = sp
        if sp is not None:
            rate = self.gst_percent if self.gst_percent is not None else Decimal("18.00")
            if self.gst_percent is None:
                self.gst_percent = rate
            if self.gst_amount is None or (rate > 0 and self.gst_amount == Decimal("0.00")):
                self.gst_amount = (sp * rate / Decimal("100")).quantize(Decimal("0.01"))
            if self.selling_price_with_gst is None or (rate > 0 and self.selling_price_with_gst <= sp):
                self.selling_price_with_gst = (sp + self.gst_amount).quantize(Decimal("0.01"))
        return self

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


class UniversalInventoryRead(BaseModel):
    id: int | None = None
    product_id: int
    product_name: str
    product_sku: str
    category_id: int | None = None
    category_name: str | None = None
    subcategory_id: int | None = None
    subcategory_name: str | None = None
    brand_id: int | None = None
    brand_name: str | None = None
    cost_price: Decimal | None = None
    selling_price: Decimal | None = None
    selling_price_before_gst: Decimal | None = None
    price: Decimal | None = None
    gst_percent: Decimal | None = None
    gst_amount: Decimal | None = None
    selling_price_with_gst: Decimal | None = None
    image_url: str | None = None
    discount_percent: Decimal = Decimal("0.00")
    warranty_months: int = 0
    supplier_id: int | None = None
    supplier_name: str | None = None
    sales_workflow_type: str | None = "BOTH"

    quantity: int = 0
    available_quantity: int = 0
    reorder_level: int = 0
    low_stock_threshold: int | None = None
    is_active: bool = True
    aging_stage: str | None = "NORMAL"
    aging_discount_percent: Decimal | None = Decimal("0.00")
    aging_stage_changed_at: datetime | None = None
    owner_type: str | None = None
    owner_id: int | None = None
    owner_name: str | None = None

    other_stocks: list[StoreStockRead] = []

    frame_product: FrameDetailsRead | None = None
    lens_product: LensDetailsRead | None = None
    accessory_product: AccessoryDetailsRead | None = None

    @model_validator(mode="after")
    def _compute_gst_fields(self) -> "UniversalInventoryRead":
        sp = self.selling_price if self.selling_price is not None else self.price
        if self.selling_price_before_gst is None and sp is not None:
            self.selling_price_before_gst = sp
        if sp is not None:
            rate = self.gst_percent if self.gst_percent is not None else Decimal("18.00")
            if self.gst_percent is None:
                self.gst_percent = rate
            if self.gst_amount is None or (rate > 0 and self.gst_amount == Decimal("0.00")):
                self.gst_amount = (sp * rate / Decimal("100")).quantize(Decimal("0.01"))
            if self.selling_price_with_gst is None or (rate > 0 and self.selling_price_with_gst <= sp):
                self.selling_price_with_gst = (sp + self.gst_amount).quantize(Decimal("0.01"))
        return self

    model_config = {"from_attributes": True}


class UniversalInventoryResponse(BaseModel):
    items: list[UniversalInventoryRead]
    total: int
    page: int
    limit: int
    pages: int

