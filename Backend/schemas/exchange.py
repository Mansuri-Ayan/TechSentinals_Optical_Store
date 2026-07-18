# Schema: exchange.py
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field
from schemas.sale import SaleCreate, SaleRead, SalePaymentCreate, StaffTypeEnum, SaleItemCreate


class ExchangeItemCreate(BaseModel):
    product_id: int = Field(..., description="FK → products.id")
    inventory_id: int | None = Field(
        default=None,
        description="FK → inventories.id — inventory to decrement",
    )
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, le=100, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str | None = None


class ExchangeCreate(BaseModel):
    store_id: int = Field(..., description="FK → stores.id")
    customer_id: int | None = Field(default=None, description="FK → customers.id")
    original_sale_id: int = Field(..., description="FK → sales.id (exchanged from)")
    original_sale_item_id: int | None = Field(default=None, description="FK → sale_items.id (returned item)")
    original_sale_item_ids: list[int] | None = Field(default=None, description="List of FK → sale_items.id (returned items)")
    
    # Replacement items
    new_items: list[ExchangeItemCreate] = Field(..., min_length=1, description="Replacement items")
    
    # Additional payment split details
    payments: list[SalePaymentCreate] = Field(
        default=[],
        description="Payment split details if new total is higher than exchange credit",
    )
    
    processed_by_type: StaffTypeEnum = Field(..., description="MANAGER / WORKER / OPTICIAN")
    processed_by_id: int = Field(..., description="ID of staff processing the exchange")
    exchange_date: date = Field(..., description="Date of exchange")
    reason: str | None = Field(default=None, description="Reason for return/exchange")
    notes: str | None = Field(default=None, description="Internal remarks")


class ExchangeRead(BaseModel):
    id: int
    exchange_number: str
    admin_id: int
    store_id: int
    customer_id: int | None = None
    original_sale_id: int
    original_sale_item_id: int
    new_sale_id: int | None = None
    original_item_value: Decimal
    new_items_total: Decimal
    exchange_credit: Decimal
    additional_payment: Decimal
    processed_by_type: StaffTypeEnum
    processed_by_id: int
    exchange_date: date
    status: str
    reason: str | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalized / nested fields for UI display
    customer_name: str | None = None
    customer_phone: str | None = None
    store_name: str | None = None
    original_invoice_number: str | None = None
    new_invoice_number: str | None = None
    original_product_name: str | None = None
    original_product_sku: str | None = None
    new_sale: SaleRead | None = None

    model_config = {"from_attributes": True}
