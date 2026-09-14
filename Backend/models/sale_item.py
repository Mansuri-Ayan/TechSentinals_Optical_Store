# Model: sale_item.py
"""
SaleItem — individual product lines within a Sale.
Each SaleItem triggers an InventoryTransaction (SALE) via the service layer,
decrementing the store's inventory for that product.
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    sale_id = Column(    
        BigInteger,
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sales.id",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False, 
        index=True,
        comment="FK → products.id — product sold (live catalogue reference)",
    )

    product_snapshot_id = Column(
        BigInteger,
        ForeignKey("product_snapshots.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment=(
            "FK → product_snapshots.id — frozen copy of the product as it was "
            "at the moment of this sale.  Use this for invoices and reports; "
            "never join products directly for price/name data."
        ),
    )

    inventory_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → inventories.id — inventory record decremented by this sale",
    )

    deadstock_item_id = Column(
        BigInteger,
        ForeignKey("deadstock_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → deadstock_items.id — deadstock item consumed by this sale",
    )
    
    quantity = Column(
        Integer,
        nullable=False,
        comment="Number of units sold",
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Selling price per unit at time of sale",
    )

    unit_cost = Column(
        Numeric(10, 2),
        nullable=True,
        comment="Cost price per unit at time of sale (for margin reporting)",
    )

    total_purchase_cost = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Total purchase cost of the batches consumed by this line item",
    )

    consumed_batches = Column(
        JSON,
        nullable=True,
        comment="JSON metadata of consumed batches: [{'inventory_id': int, 'quantity': int, 'purchase_cost': float}]",
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Discount percentage on this line item",
    )

    tax_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="GST / tax percentage on this line item",
    )

    line_total = Column(
        Numeric(12, 2),
        nullable=False,
        comment="(unit_price × qty × (1 - discount/100)) + tax",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional notes for this line item (e.g. custom lens specs)",
    )

    # ── Quality Control (QC) & Workflow Columns ──────────────────
    processing_type = Column(
        String(20),
        nullable=False,
        default="ORDER",
        server_default="ORDER",
        comment="DIRECT or ORDER — resolved at sale creation from product.sales_workflow_type",
    )

    qc_status = Column(
        String(50),
        nullable=False,
        default="PENDING_QC_PRE_LAB",
        server_default="PENDING_QC_PRE_LAB",
        comment="Current per-item QC status (e.g. PENDING_QC_PRE_LAB, QC_PASSED_PRE_LAB, QC_FAILED_PRE_LAB, SENT_TO_LAB, LAB_IN_PROGRESS, RETURNED_FROM_LAB, PENDING_QC_POST_LAB, QC_PASSED_POST_LAB, QC_FAILED_POST_LAB, DELIVERED)",
    )

    damage_type = Column(
        String(50),
        nullable=True,
        comment="Categorization if QC failed: STOCK_DAMAGE, LAB_DAMAGE, or FITTING_FAILURE",
    )

    rework_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Number of rework cycles completed for fitting failures",
    )

    resolution_status = Column(
        String(50),
        nullable=False,
        default="UNRESOLVED",
        server_default="UNRESOLVED",
        comment="Resolution tracking: UNRESOLVED, REPLACED_FROM_STOCK, TRANSFER_REQUESTED, REWORK_IN_PROGRESS, SUPPLIER_CLAIM_PENDING, LAB_CLAIM_PENDING, CUSTOMER_DECISION_PENDING, RESOLVED",
    )

    customer_notified = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="True if customer has been notified regarding item issues or choices",
    )

    customer_decision = Column(
        String(50),
        nullable=True,
        comment="Customer choice: WAIT_FOR_STOCK, CHOOSE_DIFFERENT_ITEM, REFUND_ITEM",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp",
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last-update timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    sale = relationship(
        "Sale",
        back_populates="items",
    )
    product = relationship(  # Live product fallback — prefer product_snapshot for historical accuracy
        "Product",
        lazy="selectin",
    )
    product_snapshot = relationship(
        "ProductSnapshot",
        lazy="selectin",
        foreign_keys="[SaleItem.product_snapshot_id]",
    )
    inventory = relationship(
        "Inventory",
        lazy="selectin",
    )
    deadstock_item = relationship(
        "DeadstockItem",
        lazy="selectin",
        foreign_keys="[SaleItem.deadstock_item_id]",
    )
    qc_history = relationship(
        "SaleItemQCHistory",
        back_populates="sale_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    qc_damaged_records = relationship(
        "QCDamagedItem",
        back_populates="sale_item",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="desc(QCDamagedItem.id)",
    )

    @property
    def qc_damaged_record(self):
        records = getattr(self, "qc_damaged_records", None)
        if records:
            return records[0]
        return None
    contact_logs = relationship(
        "QCCustomerContactLog",
        back_populates="sale_item",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


    @property
    def unit_skus(self) -> list[str]:
        if "assigned_units" in self.__dict__ and self.assigned_units:
            return [u.unit_sku for u in self.assigned_units]
        return []

    def __repr__(self) -> str:
        return (
            f"<SaleItem(sale_id={self.sale_id!r}, product_id={self.product_id!r}, "
            f"qty={self.quantity!r}, total={self.line_total!r})>"
        )
