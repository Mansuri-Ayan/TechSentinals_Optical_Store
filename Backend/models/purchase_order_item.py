# Model: purchase_order_item.py
"""
PurchaseOrderItem — individual line items inside a PurchaseOrder.
Each item maps to a Product. On receipt, the quantity_received is updated
and an InventoryTransaction (PURCHASE) is auto-created by the service layer.
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class PurchaseOrderItem(Base):
    __tablename__ = "purchase_order_items"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    purchase_order_id = Column(
        BigInteger,
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → purchase_orders.id",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → products.id — product being ordered (live catalogue reference)",
    )

    product_snapshot_id = Column(
        BigInteger,
        ForeignKey("product_snapshots.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment=(
            "FK → product_snapshots.id — frozen copy of the product as it was "
            "at the time this purchase order was created.  Use this for PO "
            "reports and cost tracking; never join products directly for price/name."
        ),
    )

    # Links to inventory record that will be updated on receipt
    inventory_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → inventories.id — target inventory record to update on receipt",
    )

    quantity_ordered = Column(
        Integer,
        nullable=False,
        comment="Number of units ordered",
    )

    quantity_received = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Number of units actually received (updated on GRN)",
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Agreed unit price from supplier at time of order",
    )

    tax_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="GST % applied to this line item",
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Line-item discount percentage",
    )

    line_total = Column(
        Numeric(12, 2),
        nullable=False,
        comment="(unit_price × qty_ordered × (1 - discount/100)) + tax",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Notes for this specific line item",
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
    purchase_order = relationship(
        "PurchaseOrder",
        back_populates="items",
    )
    product = relationship(  # Live product fallback — prefer product_snapshot for historical accuracy
        "Product",
        lazy="selectin",
    )
    product_snapshot = relationship(
        "ProductSnapshot",
        lazy="selectin",
        foreign_keys="[PurchaseOrderItem.product_snapshot_id]",
    )
    inventory = relationship(
        "Inventory",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<PurchaseOrderItem(po_id={self.purchase_order_id!r}, "
            f"product_id={self.product_id!r}, qty={self.quantity_ordered!r})>"
        )
