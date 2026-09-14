# Schemas: qc.py
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class PreLabQCRequest(BaseModel):
    passed: bool = Field(..., description="True if item passed pre-lab inspection, False if failed/damaged")
    notes: str | None = Field(default=None, description="Inspector observation notes")


class PostLabQCRequest(BaseModel):
    outcome: str = Field(
        ...,
        description="Inspection outcome: 'PASSED', 'FITTING_FAILURE', 'LAB_DAMAGE', or 'STOCK_DAMAGE'"
    )
    notes: str | None = Field(default=None, description="Inspector observation notes or fitting specifications")


class QCCustomerContactRequest(BaseModel):
    contact_channel: str = Field(..., description="'PHONE', 'WHATSAPP', or 'EMAIL_SYSTEM'")
    summary_notes: str = Field(..., description="Summary of customer conversation or automated email payload")
    customer_choice: str | None = Field(
        default=None,
        description="Recorded customer decision: 'WAIT_FOR_STOCK', 'CHOOSE_DIFFERENT_ITEM', 'REFUND_ITEM'"
    )


class QCDamageCompensationRequest(BaseModel):
    compensation_type: str = Field(
        ...,
        description="'REPLACEMENT_ITEM', 'EQUIVALENT_ITEM', 'CASH_REFUND', or 'CREDIT_NOTE'"
    )
    amount: Decimal | None = Field(default=None, description="Compensation / Credit note monetary value")
    po_id: int | None = Field(default=None, description="Associated Purchase Order ID for credit note ledger entry")
    resolution_notes: str | None = Field(default=None, description="Notes on claim settlement")


class SupplierResolutionRequest(BaseModel):
    resolution_type: str = Field(
        ...,
        description="'REPLACEMENT', 'FULL_COMPENSATION', 'PARTIAL_COMPENSATION', 'NO_COMPENSATION', 'MARK_AS_LOSS' (or legacy 'REPLACEMENT_ITEM', 'EQUIVALENT_ITEM', 'CASH_REFUND', 'CREDIT_NOTE')"
    )
    compensation_type: str | None = Field(
        default=None,
        description="'CREDIT_NOTE', 'CASH_REFUND', 'REPLACEMENT_ITEM', 'EQUIVALENT_ITEM', or 'NONE'"
    )
    compensation_amount: Decimal | None = Field(default=None, description="Monetary compensation / credit note amount")
    loss_reason: str | None = Field(default=None, description="Write-off reason if marked as loss or partially/uncompensated")
    loss_amount: Decimal | None = Field(default=None, description="Monetary value written off as loss")
    new_product_id: int | None = Field(default=None, description="Replacement product ID if alternative product chosen")
    po_id: int | None = Field(default=None, description="Associated Purchase Order ID for credit note ledger entry")
    resolution_notes: str | None = Field(default=None, description="Notes on supplier claim settlement")
    is_promise: bool = Field(default=False, description="True if resolution is promised/pending rather than immediately verified")
    expected_date: str | None = Field(default=None, description="Expected date of fulfillment (YYYY-MM-DD)")


class LabResolutionRequest(BaseModel):
    resolution_type: str = Field(
        default="FULL_COMPENSATION",
        description="'FULL_COMPENSATION', 'PARTIAL_COMPENSATION', 'NO_COMPENSATION', 'MARK_AS_LOSS', or 'REPLACEMENT'"
    )
    compensation_amount: Decimal | None = Field(default=None, description="Monetary compensation claimed from lab")
    loss_reason: str | None = Field(default=None, description="Write-off reason if marked as loss or uncompensated")
    loss_amount: Decimal | None = Field(default=None, description="Monetary value written off as loss")
    resolution_notes: str | None = Field(default=None, description="Notes on lab claim settlement")
    is_promise: bool = Field(default=False, description="True if resolution is promised/pending rather than immediately verified")
    expected_date: str | None = Field(default=None, description="Expected date of fulfillment (YYYY-MM-DD)")


class MarkAsLossRequest(BaseModel):
    loss_reason: str = Field(..., description="Categorized write-off reason (e.g. Broken in Store, Vendor Refused Warranty, Lab Disputed, Policy)")
    loss_amount: Decimal | None = Field(default=None, description="Loss value written off (defaults to product cost)")
    resolution_notes: str | None = Field(default=None, description="Additional audit remarks on write-off")


class SaleItemQCHistoryRead(BaseModel):
    id: int
    sale_item_id: int
    sale_id: int
    inspector_id: int
    inspector_type: str
    inspector_name: str | None = None
    previous_status: str | None = None
    new_status: str
    damage_type: str | None = None
    rework_cycle: int
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class QCCustomerContactLogRead(BaseModel):
    id: int
    sale_item_id: int
    logged_by_id: int
    logged_by_name: str | None = None
    contact_channel: str
    summary_notes: str
    customer_choice: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class SisterStoreStock(BaseModel):
    store_id: int
    store_name: str
    available_quantity: int


class ProductSupplierSummary(BaseModel):
    id: int
    company_name: str
    phone: str | None = None
    email: str | None = None


class ItemReplacementOptionsResponse(BaseModel):
    sale_item_id: int
    product_id: int
    product_name: str
    product_sku: str | None = None
    unit_price: Decimal
    current_store_id: int
    current_store_stock: int
    sister_stores: list[SisterStoreStock]
    supplier: ProductSupplierSummary | None = None
    warranty_months: int = 0
    can_replace_locally: bool
    has_sister_store_stock: bool
    qc_status: str
    damage_type: str | None = None
    resolution_status: str
    customer_decision: str | None = None


class ResolveDamageRequest(BaseModel):
    action: str = Field(
        ...,
        description="'REPLACE_LOCAL', 'REQUEST_TRANSFER', 'SUPPLIER_PURCHASE', or 'CUSTOMER_DECISION'"
    )
    from_store_id: int | None = Field(default=None, description="Sister store ID for REQUEST_TRANSFER")
    customer_choice: str | None = Field(
        default=None,
        description="For CUSTOMER_DECISION: 'WAIT_FOR_STOCK', 'CHOOSE_DIFFERENT_ITEM', or 'CANCEL_ITEM'"
    )
    new_product_id: int | None = Field(default=None, description="New product ID if customer chose different item")
    contact_channel: str | None = Field(default="PHONE", description="'PHONE', 'WHATSAPP', or 'EMAIL_SYSTEM'")
    notes: str | None = Field(default=None, description="Notes or rationale for resolution")


class VerifyResolutionRequest(BaseModel):
    verified_notes: str | None = Field(default=None, description="Notes or verification remarks upon completing promised resolution")
    received_quantity: int | None = Field(default=1, description="Quantity of replacement items received and restocked")


class ReopenDamagedItemRequest(BaseModel):
    reason: str = Field(..., description="Mandatory reason for reopening the damage record")
    notes: str | None = Field(default=None, description="Additional context or remarks")


class ChangeResolutionRequest(BaseModel):
    new_resolution_type: str = Field(
        ...,
        description="'REPLACEMENT', 'FULL_COMPENSATION', 'PARTIAL_COMPENSATION', 'NO_COMPENSATION', 'MARK_AS_LOSS'"
    )
    compensation_type: str | None = Field(
        default=None,
        description="'CREDIT_NOTE', 'CASH_REFUND', 'REPLACEMENT_ITEM', 'EQUIVALENT_ITEM', or 'NONE'"
    )
    compensation_amount: Decimal | None = Field(default=None, description="Updated monetary compensation")
    loss_reason: str | None = Field(default=None, description="Updated loss reason if applicable")
    loss_amount: Decimal | None = Field(default=None, description="Updated loss amount if applicable")
    is_promise: bool = Field(default=False, description="True if new resolution is a pending promise")
    expected_date: str | None = Field(default=None, description="Expected fulfillment date (YYYY-MM-DD)")
    change_reason: str = Field(..., description="Mandatory reason why resolution is being changed")
    notes: str | None = Field(default=None, description="Additional remarks or evidence")


class MarkFailedRequest(BaseModel):
    failure_reason: str = Field(..., description="Reason why the promise/resolution failed")
    notes: str | None = Field(default=None, description="Additional context or notes")


class QCDamagedItemHistoryRead(BaseModel):
    id: int
    damaged_item_id: int
    changed_by_id: int | None = None
    changed_by_type: str | None = None
    changed_by_name: str | None = None
    action: str
    previous_status: str | None = None
    new_status: str
    previous_resolution_type: str | None = None
    new_resolution_type: str | None = None
    previous_compensation_amount: Decimal | None = None
    new_compensation_amount: Decimal | None = None
    reason: str | None = None
    notes: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class QCDamagedItemRead(BaseModel):
    id: int
    admin_id: int
    store_id: int
    sale_item_id: int
    product_id: int
    product_name: str | None = None
    product_sku: str | None = None
    product_cost: Decimal | None = None
    product_price: Decimal | None = None
    category_name: str | None = None
    brand_name: str | None = None
    warranty_months: int | None = None
    store_name: str | None = None
    invoice_number: str | None = None
    supplier_id: int | None = None
    supplier_name: str | None = None
    supplier_phone: str | None = None
    supplier_email: str | None = None
    lab_id: int | None = None
    lab_name: str | None = None
    lab_phone: str | None = None
    lab_email: str | None = None
    damage_type: str
    stage: str
    warranty_status: str
    compensation_type: str
    compensation_amount: Decimal | None = None
    supplier_payment_id: int | None = None
    status: str
    resolution_notes: str | None = None
    loss_reason: str | None = None
    loss_amount: Decimal | None = None
    rework_count: int = 0
    is_promise_pending: bool = False
    expected_resolution_date: date | None = None
    reopen_count: int = 0
    last_reopened_at: datetime | None = None
    last_reopened_reason: str | None = None
    history: list[QCDamagedItemHistoryRead] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

