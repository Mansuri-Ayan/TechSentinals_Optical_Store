from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.product_unit import UnitStatus, UnitSourceType
from models.inventory import OwnerType

class ProductUnitRead(BaseModel):
    id: int
    unit_sku: str
    product_id: int
    inventory_batch_id: int
    original_batch_id: Optional[int] = None
    status: UnitStatus
    owner_type: OwnerType
    owner_id: int
    source_type: UnitSourceType
    manufacturer_serial: Optional[str] = None
    sale_item_id: Optional[int] = None
    repair_id: Optional[int] = None
    sold_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductUnitDetailRead(ProductUnitRead):
    invoice_number: Optional[str] = None
    sale_id: Optional[int] = None
    batch_purchase_date: Optional[datetime] = None
    batch_supplier_name: Optional[str] = None
    batch_cost_price: Optional[float] = None
    transferred_to_store_name: Optional[str] = None
