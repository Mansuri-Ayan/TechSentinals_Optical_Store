# Model: supplier_payment.py
"""
SupplierPayment — records each payment made to a supplier.
A single PurchaseOrder can have multiple partial payments.
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
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SupplierPaymentMethod(str, enum.Enum):
    CASH = "CASH"
    BANK_TRANSFER = "BANK_TRANSFER"
    UPI = "UPI"
    CHEQUE = "CHEQUE"
    CREDIT_NOTE = "CREDIT_NOTE"


class SupplierPayment(Base):
    __tablename__ = "supplier_payments"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    purchase_order_id = Column(
        BigInteger,
        ForeignKey("purchase_orders.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → purchase_orders.id — the PO this payment is against",
    )

    supplier_id = Column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → suppliers.id — denormalised for faster supplier ledger queries",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owning business",
    )

    payment_date = Column(
        Date,
        nullable=False,
        comment="Date the payment was made",
    )

    amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Amount paid in this transaction",
    )

    payment_method = Column(
        Enum(
            SupplierPaymentMethod,
            name="supplier_payment_method_enum",
            create_constraint=True,
        ),
        nullable=False,
        comment="How the payment was made",
    )

    reference_number = Column(
        String(100),
        nullable=True,
        comment="UTR / cheque number / UPI transaction ID",
    )

    remarks = Column(
        Text,
        nullable=True,
        comment="Optional notes about this payment",
    )

    created_by = Column(
        BigInteger,
        nullable=False,
        comment="User ID who recorded this payment",
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
        back_populates="payments",
    )
    supplier = relationship(
        "Supplier",
        lazy="selectin",
    )
    admin = relationship(
        "Admin",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<SupplierPayment(id={self.id!r}, po_id={self.purchase_order_id!r}, "
            f"amount={self.amount!r})>"
        )
