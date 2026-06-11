# Schema: product.py
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# ── Type-specific detail schemas ───────────────────────────────
class FrameDetailsCreate(BaseModel):
    frame_type: str | None = Field(default=None, max_length=100, examples=["Full-Rim"])
    shape: str | None = Field(default=None, max_length=100, examples=["Rectangle"])
    material: str | None = Field(default=None, max_length=100, examples=["Acetate"])
    color: str | None = Field(default=None, max_length=100, examples=["Black"])
    lens_width: str | None = Field(default=None, max_length=100, examples=["52"])
    bridge_width: str | None = Field(default=None, max_length=100, examples=["18"])
    temple_length: str | None = Field(default=None, max_length=100, examples=["140"])
    gender: str | None = Field(default=None, max_length=100, examples=["Unisex"])
    age_group: str | None = Field(default=None, max_length=100, examples=["Adult"])


class FrameDetailsRead(FrameDetailsCreate):
    id: int
    product_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LensDetailsCreate(BaseModel):
    lens_type: str | None = Field(default=None, max_length=100, examples=["Single Vision"])
    material: str | None = Field(default=None, max_length=100, examples=["CR-39"])
    index_value: str | None = Field(default=None, max_length=100, examples=["1.56"])
    coating: str | None = Field(default=None, max_length=100, examples=["Anti-Reflective"])
    tint_color: str | None = Field(default=None, max_length=100, examples=["Clear"])
    uv_protection: str | None = Field(default=None, max_length=100, examples=["UV400"])
    blue_cut: str | None = Field(default=None, max_length=100, examples=["Yes"])
    photochromic: str | None = Field(default=None, max_length=100, examples=["No"])
    polarized: str | None = Field(default=None, max_length=100, examples=["No"])


class LensDetailsRead(LensDetailsCreate):
    id: int
    product_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AccessoryDetailsCreate(BaseModel):
    accessory_type: str | None = Field(default=None, max_length=100, examples=["Case"])
    material: str | None = Field(default=None, max_length=100, examples=["Leather"])
    color: str | None = Field(default=None, max_length=100, examples=["Brown"])
    size: str | None = Field(default=None, max_length=100, examples=["Medium"])


class AccessoryDetailsRead(AccessoryDetailsCreate):
    id: int
    product_id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ── Product ────────────────────────────────────────────────────
class ProductCreate(BaseModel):
    category_id: int = Field(
        ..., description="FK → categories.id",
    )
    subcategory_id: int | None = Field(
        default=None, description="FK → subcategories.id (optional)",
    )
    sku: str | None = Field(
        default=None, max_length=100, examples=["FRM-RB-001"],
        description="SKU — auto-generated if omitted",
    )
    barcode: str | None = Field(
        default=None, max_length=100,
        description="Optional barcode",
    )
    name: str = Field(
        ..., max_length=255, examples=["Ray-Ban Aviator Classic"],
        description="Product display name",
    )
    brand_id: int | None = Field(
        default=None, description="FK → brands.id",
    )
    cost_price: Decimal = Field(
        ..., ge=0, decimal_places=2, examples=[2500.00],
        description="Purchase / cost price",
    )
    selling_price: Decimal = Field(
        ..., ge=0, decimal_places=2, examples=[4999.00],
        description="Retail selling price",
    )
    discount_percent: Decimal = Field(
        default=Decimal("0.00"), ge=0, le=100, decimal_places=2,
        description="Default product discount percentage (0-100)",
    )
    warranty_months: int = Field(
        default=0, ge=0,
        description="Warranty duration in months (0 = no warranty)",
    )
    image_url: str | None = Field(
        default=None, description="Product image URL",
    )

    # Optional type-specific details — only one should be provided
    frame_details: FrameDetailsCreate | None = None
    lens_details: LensDetailsCreate | None = None
    accessory_details: AccessoryDetailsCreate | None = None


class ProductUpdate(BaseModel):
    category_id: int | None = Field(default=None)
    subcategory_id: int | None = Field(default=None)
    barcode: str | None = Field(default=None, max_length=100)
    name: str | None = Field(default=None, max_length=255)
    brand_id: int | None = Field(default=None)
    cost_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    selling_price: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    discount_percent: Decimal | None = Field(default=None, ge=0, le=100, decimal_places=2)
    warranty_months: int | None = Field(default=None, ge=0)
    image_url: str | None = Field(default=None)
    is_active: bool | None = Field(default=None)

    # Optional type-specific detail updates
    frame_details: FrameDetailsCreate | None = None
    lens_details: LensDetailsCreate | None = None
    accessory_details: AccessoryDetailsCreate | None = None


class ProductRead(BaseModel):
    id: int
    admin_id: int
    category_id: int
    subcategory_id: int | None = None
    sku: str
    barcode: str | None = None
    name: str
    brand_id: int | None = None
    cost_price: Decimal
    selling_price: Decimal
    discount_percent: Decimal = Decimal("0.00")
    warranty_months: int = 0
    image_url: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    # Nested type-specific details
    frame_product: FrameDetailsRead | None = None
    lens_product: LensDetailsRead | None = None
    accessory_product: AccessoryDetailsRead | None = None

    # Denormalized names for convenience
    category_name: str | None = None
    subcategory_name: str | None = None
    brand_name: str | None = None

    model_config = {"from_attributes": True}
