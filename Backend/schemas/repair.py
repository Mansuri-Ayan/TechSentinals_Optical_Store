# Schema: repair.py
from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, Field


# ── Repair Create ───────────────────────────────────────────────
class RepairCreate(BaseModel):
    store_id: int = Field(..., description="FK → stores.id")
    customer_id: int | None = Field(default=None, description="FK → customers.id (None for walk-in)")
    sale_id: int | None = Field(default=None, description="FK → sales.id (for warranty reference)")
    customer_name: str | None = Field(default=None, max_length=255, description="Walk-in customer name when customer_id is None")
    repair_type: str = Field(default="FRAME_REPAIR", description="Type of repair (FRAME_REPAIR, LENS_REPLACEMENT, ACCESSORY_REPAIR, WARRANTY_SERVICE, OTHER)")
    is_warranty: bool = Field(default=False, description="Whether covered under warranty")
    description: str | None = Field(default=None, description="Description of the repair issue")
    estimated_cost: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2, description="Estimated repair cost")
    advance_paid: Decimal = Field(default=Decimal("0.00"), ge=0, decimal_places=2, description="Advance payment collected")
    received_date: date = Field(..., description="Date the item was received")
    estimated_completion_date: date | None = Field(default=None, description="Expected completion date")
    handled_by_type: str | None = Field(default=None, description="Staff type: MANAGER/WORKER/OPTICIAN")
    handled_by_id: int | None = Field(default=None, description="Staff member ID")
    notes: str | None = Field(default=None, description="Internal notes")
    product_unit_id: int | None = Field(default=None, description="FK -> product_units.id")
    unit_sku: str | None = Field(default=None, description="SKU of the physical unit being repaired")


# ── Repair Update ───────────────────────────────────────────────
class RepairUpdate(BaseModel):
    repair_type: str | None = Field(default=None)
    status: str | None = Field(default=None)
    is_warranty: bool | None = Field(default=None)
    description: str | None = Field(default=None)
    estimated_cost: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    final_cost: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    advance_paid: Decimal | None = Field(default=None, ge=0, decimal_places=2)
    estimated_completion_date: date | None = Field(default=None)
    completed_date: date | None = Field(default=None)
    handled_by_type: str | None = Field(default=None)
    handled_by_id: int | None = Field(default=None)
    notes: str | None = Field(default=None)
    product_unit_id: int | None = Field(default=None)
    unit_sku: str | None = Field(default=None)


# ── Repair Status Update ─────────────────────────────────────────
class RepairStatusUpdate(BaseModel):
    status: str = Field(..., description="New status: RECEIVED, IN_PROGRESS, COMPLETED, DELIVERED, CANCELLED")


# ── Repair Read ─────────────────────────────────────────────────
class RepairRead(BaseModel):
    id: int
    repair_number: str
    admin_id: int
    store_id: int
    customer_id: int | None = None
    sale_id: int | None = None
    customer_name: str | None = None
    repair_type: str
    status: str
    is_warranty: bool
    description: str | None = None
    estimated_cost: Decimal
    final_cost: Decimal | None = None
    advance_paid: Decimal
    received_date: date
    estimated_completion_date: date | None = None
    completed_date: date | None = None
    handled_by_type: str | None = None
    handled_by_id: int | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    product_unit_id: int | None = None
    unit_sku: str | None = None

    # Denormalized fields
    customer_full_name: str | None = None
    store_name: str | None = None
    sale_invoice_number: str | None = None
    handled_by_name: str | None = None

    model_config = {"from_attributes": True}


# ── Repair List Item (lightweight) ──────────────────────────────
class RepairListItem(BaseModel):
    id: int
    repair_number: str
    customer_full_name: str | None = None
    customer_name: str | None = None
    store_name: str | None = None
    sale_invoice_number: str | None = None
    repair_type: str
    status: str
    is_warranty: bool
    estimated_cost: Decimal
    final_cost: Decimal | None = None
    advance_paid: Decimal
    received_date: date
    estimated_completion_date: date | None = None
    completed_date: date | None = None
    notes: str | None = None
    description: str | None = None
    created_at: datetime
    product_unit_id: int | None = None
    unit_sku: str | None = None

    model_config = {"from_attributes": True}


# ── Paginated Response ──────────────────────────────────────────
class RepairListResponse(BaseModel):
    items: list[RepairListItem]
    total: int
    limit: int
    offset: int
