# Schema: product_snapshot.py
"""
Pydantic read schema for ProductSnapshot — the frozen copy of a product's
full details (name, price, specs) captured at the time of a transaction.

Used inside SaleItemRead, PurchaseOrderItemRead, and TransactionRead so
that every invoice/history response shows the price/name as it was when
the transaction occurred, regardless of subsequent product edits.
"""
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class ProductSnapshotRead(BaseModel):
    id: int
    product_id: int | None = None
    snapshotted_at: datetime

    # Product type
    product_type: str

    # Base product info (frozen at transaction time)
    sku: str
    barcode: str | None = None
    name: str

    # Brand / Category (frozen as plain strings — deletion-safe)
    brand_id: int | None = None
    brand_name: str | None = None
    category_id: int | None = None
    category_name: str | None = None
    subcategory_id: int | None = None
    subcategory_name: str | None = None

    # Prices (the core reason for this model)
    cost_price: Decimal
    selling_price: Decimal
    discount_percent: Decimal
    warranty_months: int
    image_url: str | None = None

    # Frame specs
    frame_type: str | None = None
    frame_shape: str | None = None
    frame_material: str | None = None
    frame_color: str | None = None
    lens_width: str | None = None
    bridge_width: str | None = None
    temple_length: str | None = None
    gender: str | None = None
    age_group: str | None = None

    # Lens specs
    lens_type: str | None = None
    lens_material: str | None = None
    index_value: str | None = None
    coating: str | None = None
    tint_color: str | None = None
    uv_protection: str | None = None
    blue_cut: str | None = None
    photochromic: str | None = None
    polarized: str | None = None

    # Accessory specs
    accessory_type: str | None = None
    accessory_material: str | None = None
    accessory_color: str | None = None
    accessory_size: str | None = None

    model_config = {"from_attributes": True}
