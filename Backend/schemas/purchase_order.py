# Schema: purchase_order.py
"""
Pydantic schemas for PurchaseOrder, PurchaseOrderItem, GoodsReceipt,
and SupplierPayment.
"""
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────────────

class POStatusEnum(str, Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class SupplierPaymentMethodEnum(str, Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    CREDIT_NOTE = "CREDIT_NOTE"


# ── PurchaseOrderItem ─────────────────────────────────────────

class PurchaseOrderItemCreate(BaseModel):
    product_id: int = Field(..., description="FK → products.id")
    inventory_id: int | None = Field(
        default=None,
        description="FK → inventories.id — target inventory to update on receipt",
    )
    quantity_ordered: int = Field(..., ge=1, description="Units to order")
    unit_price: Decimal = Field(..., ge=0, decimal_places=2)
    tax_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    discount_percent: Decimal = Field(default=Decimal("0"), ge=0, decimal_places=2)
    notes: str | None = None


class PurchaseOrderItemRead(BaseModel):
    id: int
    purchase_order_id: int
    product_id: int
    inventory_id: int | None = None
    quantity_ordered: int
    quantity_received: int
    unit_price: Decimal
    tax_percent: Decimal
    discount_percent: Decimal
    line_total: Decimal
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    # Denormalized
    product_name: str | None = None
    product_sku: str | None = None

    model_config = {"from_attributes": True}


# ── PurchaseOrder ─────────────────────────────────────────────

class PurchaseOrderCreate(BaseModel):
    supplier_id: int = Field(..., description="FK → suppliers.id")
    store_id: int | None = Field(
        default=None,
        description="FK → stores.id — NULL for admin/warehouse-level",
    )
    order_date: date = Field(..., description="Date the PO is raised")
    expected_delivery_date: date | None = None
    notes: str | None = None
    items: list[PurchaseOrderItemCreate] = Field(
        ..., min_length=1, description="At least one line item",
    )


class PurchaseOrderUpdate(BaseModel):
    status: POStatusEnum | None = None
    expected_delivery_date: date | None = None
    received_date: date | None = None
    invoice_number: str | None = Field(default=None, max_length=100)
    notes: str | None = None


class PurchaseOrderRead(BaseModel):
    id: int
    po_number: str
    admin_id: int
    store_id: int | None = None
    supplier_id: int
    status: POStatusEnum
    order_date: date
    expected_delivery_date: date | None = None
    received_date: date | None = None
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    due_amount: Decimal
    due_date: date | None = None
    invoice_number: str | None = None
    notes: str | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    # Nested
    items: list[PurchaseOrderItemRead] = []
    payments: list["SupplierPaymentRead"] = []

    # Denormalized
    supplier_name: str | None = None
    store_name: str | None = None

    model_config = {"from_attributes": True}


# ── Goods Receipt ─────────────────────────────────────────────

class GoodsReceiptItem(BaseModel):
    """One line of a goods-receipt note (GRN)."""
    purchase_order_item_id: int = Field(
        ..., description="ID of the PO item being received",
    )
    quantity_received: int = Field(
        ..., ge=1, description="Units received in this batch",
    )


class GoodsReceiptCreate(BaseModel):
    items: list[GoodsReceiptItem] = Field(
        ..., min_length=1, description="Items being received",
    )


# ── SupplierPayment ───────────────────────────────────────────

class SupplierPaymentCreate(BaseModel):
    payment_date: date = Field(..., description="Date payment was made")
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    payment_method: SupplierPaymentMethodEnum
    reference_number: str | None = Field(default=None, max_length=100)
    remarks: str | None = None


class SupplierPaymentRead(BaseModel):
    id: int
    purchase_order_id: int
    supplier_id: int
    admin_id: int
    payment_date: date
    amount: Decimal
    payment_method: SupplierPaymentMethodEnum
    reference_number: str | None = None
    remarks: str | None = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Resolve forward reference
PurchaseOrderRead.model_rebuild()
