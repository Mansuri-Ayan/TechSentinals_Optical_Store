# Model: qc_damaged_item.py
"""
QCDamagedItem — tracks items that failed QC pre-lab (STOCK_DAMAGE) or post-lab (LAB_DAMAGE),
managing warranty claims, supplier/lab resolutions, and compensation ledger links.
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class QCDamagedItem(Base):
    __tablename__ = "qc_damaged_items"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — tenant business scope",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → stores.id — store where damage occurred/inspected",
    )

    sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sale_items.id — order line item flagged as damaged",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → products.id — product damaged",
    )

    supplier_id = Column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → suppliers.id — supplier liable for STOCK_DAMAGE",
    )

    lab_id = Column(
        BigInteger,
        ForeignKey("labs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → labs.id — lab liable for LAB_DAMAGE",
    )

    damage_type = Column(
        String(50),
        nullable=False,
        comment="STOCK_DAMAGE (damaged before lab) or LAB_DAMAGE (damaged during lab processing)",
    )

    stage = Column(
        String(50),
        nullable=False,
        comment="PRE_LAB or POST_LAB",
    )

    warranty_status = Column(
        String(50),
        nullable=False,
        default="UNKNOWN",
        server_default="UNKNOWN",
        comment="IN_WARRANTY, OUT_OF_WARRANTY, or UNKNOWN",
    )

    compensation_type = Column(
        String(50),
        nullable=False,
        default="PENDING",
        server_default="PENDING",
        comment="REPLACEMENT_ITEM, EQUIVALENT_ITEM, CASH_REFUND, CREDIT_NOTE, or PENDING",
    )

    compensation_amount = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Monetary value of credit note/refund compensation",
    )

    supplier_payment_id = Column(
        BigInteger,
        ForeignKey("supplier_payments.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → supplier_payments.id — ledger entry recording credit note/compensation",
    )

    status = Column(
        String(50),
        nullable=False,
        default="OPEN",
        server_default="OPEN",
        comment="Lifecycle status: OPEN, CLAIM_FILED, RESOLVED, WRITTEN_OFF",
    )

    resolution_notes = Column(
        Text,
        nullable=True,
        comment="Detailed log of supplier claim, credit note details, or lab settlement",
    )

    loss_reason = Column(
        String(255),
        nullable=True,
        comment="Categorized write-off rationale if marked as loss or uncompensated",
    )

    loss_amount = Column(
        Numeric(12, 2),
        nullable=True,
        comment="Monetary loss value written off (cost minus any compensation)",
    )

    is_promise_pending = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="True if a supplier or lab resolution was promised but not yet verified received",
    )

    expected_resolution_date = Column(
        Date,
        nullable=True,
        comment="Expected fulfillment date for promised replacement, compensation, or repair",
    )

    reopen_count = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Number of times this damage record was reopened",
    )

    last_reopened_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when this record was last reopened",
    )

    last_reopened_reason = Column(
        Text,
        nullable=True,
        comment="Reason provided when this record was last reopened",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp when damage record was created",
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Timestamp when damage record was last updated",
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship("Admin", lazy="selectin")
    store = relationship("Store", lazy="selectin")
    sale_item = relationship("SaleItem", back_populates="qc_damaged_records")
    product = relationship("Product", lazy="selectin")
    supplier = relationship("Supplier", lazy="selectin")
    lab = relationship("Lab", lazy="selectin")
    supplier_payment = relationship("SupplierPayment", lazy="selectin")
    history = relationship(
        "QCDamagedItemHistory",
        back_populates="damaged_item",
        order_by="QCDamagedItemHistory.created_at.desc()",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<QCDamagedItem(id={self.id!r}, damage_type={self.damage_type!r}, "
            f"stage={self.stage!r}, status={self.status!r})>"
        )
