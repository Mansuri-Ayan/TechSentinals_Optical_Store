# Schema: inventory_transaction.py
from datetime import datetime
from decimal import Decimal
from enum import Enum
from pydantic import BaseModel, Field, model_validator
from schemas.product_snapshot import ProductSnapshotRead


from models.inventory_transaction import TransactionType as TransactionTypeEnum


class PurchaseRequest(BaseModel):
    """Record a stock purchase into the admin warehouse or a specific store."""
    product_id: int = Field(..., description="Product being purchased")
    quantity: int = Field(..., gt=0, description="Quantity purchased")
    purchase_price: float = Field(..., gt=0, description="Price per unit")
    owner_type: str = Field(default="ADMIN", description="ADMIN or STORE — where to add the stock")
    owner_id: int | None = Field(default=None, description="Owner ID (defaults to admin_id for ADMIN)")
    remarks: str | None = Field(default=None)


class TransferRequest(BaseModel):
    """Transfer stock between admin↔store or store↔store."""
    product_id: int = Field(..., description="Product being transferred")
    quantity: int = Field(..., gt=0, description="Quantity to transfer")
    from_owner_type: str = Field(..., description="ADMIN or STORE")
    from_owner_id: int = Field(..., description="Source owner ID")
    to_owner_type: str = Field(..., description="ADMIN or STORE")
    to_owner_id: int = Field(..., description="Destination owner ID")
    remarks: str | None = Field(default=None)


class StockActionRequest(BaseModel):
    """Record damage, loss, sale, or return against a specific inventory."""
    product_id: int = Field(..., description="Product affected")
    owner_type: str = Field(..., description="ADMIN or STORE")
    owner_id: int = Field(..., description="Owner ID")
    quantity: int = Field(..., gt=0, description="Quantity affected")
    remarks: str | None = Field(default=None)


class TransactionRead(BaseModel):
    id: int
    inventory_id: int
    product_id: int
    product_snapshot_id: int | None = None
    transaction_type: TransactionTypeEnum
    quantity: int
    # Monetary value at time of transaction
    unit_price: Decimal | None = None
    total_value: Decimal | None = None
    send_store_id: int | None = None
    receive_store_id: int | None = None
    reference_id: int | None = None
    remarks: str | None = None
    created_by: int
    created_at: datetime

    # Approval workflow fields
    status: str
    transfer_direction: str | None = None
    requested_by_store_id: int | None = None
    approved_by_store_id: int | None = None
    approved_by_user_id: int | None = None
    approved_at: datetime | None = None
    rejection_reason: str | None = None
    is_request: bool = False

    # Embedded snapshot — all frozen product data at time of transaction
    product_snapshot: ProductSnapshotRead | None = None

    # Backward-compatible denormalized fields
    # Auto-populated from product_snapshot via model_validator
    product_name: str | None = None
    product_sku: str | None = None
    send_store_name: str | None = None
    receive_store_name: str | None = None
    requested_by_store_name: str | None = None
    approved_by_store_name: str | None = None

    @model_validator(mode="after")
    def _fill_from_snapshot(self) -> "TransactionRead":
        """Populate denormalized fields from snapshot when not set explicitly."""
        if self.product_snapshot:
            if self.product_name is None:
                self.product_name = self.product_snapshot.name
            if self.product_sku is None:
                self.product_sku = self.product_snapshot.sku
        return self

    model_config = {"from_attributes": True}
