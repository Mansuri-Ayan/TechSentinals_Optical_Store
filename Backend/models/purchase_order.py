# Model: purchase_order.py
"""
PurchaseOrder — a purchase order (PO) sent to a supplier.
A PO can be placed at the Admin (warehouse) level or at a Store level.
Uses owner_type / owner_id polymorphism consistent with inventories.
"""
import enum
from sqlalchemy import (
    BigInteger,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class POStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    SENT = "SENT"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    po_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Human-readable PO reference number (e.g. PO-2024-00001)",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owner of the PO",
    )

    # The PO may be raised by a store or directly by the admin (warehouse)
    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — NULL means admin/warehouse-level order",
    )

    supplier_id = Column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → suppliers.id — which supplier this PO is sent to",
    )

    status = Column(
        Enum(POStatus, name="po_status_enum", create_constraint=True),
        nullable=False,
        default=POStatus.DRAFT,
        server_default="DRAFT",
        comment="PO lifecycle status",
    )

    order_date = Column(
        Date,
        nullable=False,
        comment="Date the PO was raised",
    )

    expected_delivery_date = Column(
        Date,
        nullable=True,
        comment="Expected date of goods receipt",
    )

    received_date = Column(
        Date,
        nullable=True,
        comment="Actual date goods were received (fully)",
    )

    subtotal = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Sum of all line item totals before tax",
    )

    tax_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total GST / tax charged by the supplier",
    )

    discount_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total discount given by the supplier",
    )

    total_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="subtotal + tax_amount - discount_amount",
    )

    paid_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Total amount paid to the supplier so far",
    )

    due_amount = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="total_amount - paid_amount (outstanding balance)",
    )

    due_date = Column(
        Date,
        nullable=True,
        comment="Payment due date based on credit terms",
    )

    invoice_number = Column(
        String(100),
        nullable=True,
        comment="Supplier's invoice number (filled on receipt)",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes about this purchase order",
    )

    created_by = Column(
        BigInteger,
        nullable=False,
        comment="User ID (admin / manager) who created this PO",
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
    admin = relationship(
        "Admin",
        back_populates="purchase_orders",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        back_populates="purchase_orders",
        lazy="selectin",
    )
    supplier = relationship(
        "Supplier",
        back_populates="purchase_orders",
        lazy="selectin",
    )
    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    payments = relationship(
        "SupplierPayment",
        back_populates="purchase_order",
        cascade="all, delete-orphan",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<PurchaseOrder(id={self.id!r}, po_number={self.po_number!r}, "
            f"status={self.status!r}, total={self.total_amount!r})>"
        )
