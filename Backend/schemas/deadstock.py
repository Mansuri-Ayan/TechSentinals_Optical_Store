# Schema: deadstock.py
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from schemas.product import ProductRead


class DeadstockItemRead(BaseModel):
    id: int
    admin_id: int
    store_id: int
    product_id: int
    inventory_id: Optional[int] = None
    exchange_id: int
    original_sale_item_id: Optional[int] = None
    sku: str
    category_name: str
    quantity: int
    original_price: Decimal
    status: str
    is_exchanged: bool
    reused_at: Optional[datetime] = None
    product_unit_id: Optional[int] = None
    unit_sku: Optional[str] = None
    sold_in_sale_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Nested & Denormalized fields for UI
    product_name: Optional[str] = None
    brand_name: Optional[str] = None
    store_name: Optional[str] = None
    exchange_number: Optional[str] = None
    original_invoice_number: Optional[str] = None
    product: Optional[ProductRead] = None


    model_config = {"from_attributes": True}


class DeadstockCategoryCounts(BaseModel):
    frames_count: int = 0
    lenses_count: int = 0
    accessories_count: int = 0
    other_count: int = 0
    total_count: int = 0


class DeadstockListResponse(BaseModel):
    items: List[DeadstockItemRead]
    total: int
    page: int
    limit: int
    counts: DeadstockCategoryCounts


class DeadstockReuseResponse(BaseModel):
    message: str
    deadstock_item_id: int
    inventory_id: int
    status: str
