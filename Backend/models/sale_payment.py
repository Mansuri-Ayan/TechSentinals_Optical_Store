# Model: sale_payment.py
"""
SalePayment — individual payment transactions recorded against a Sale.
A sale can have multiple payment records (e.g. split payment, instalments).
"""
import enum
from sqlalchemy import (
    BigInteger,
    Column,
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


class SalePaymentMethod(str, enum.Enum):
    CASH = "CASH"
    CARD = "CARD"
    UPI = "UPI"
    BANK_TRANSFER = "BANK_TRANSFER"
    LOYALTY_POINTS = "LOYALTY_POINTS"
    CREDIT = "CREDIT"           # Customer credit / outstanding
    CHEQUE = "CHEQUE"


class SalePayment(Base):
    __tablename__ = "sale_payments"

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

    amount = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Amount paid in this transaction",
    )

    payment_method = Column(
        Enum(
            SalePaymentMethod,
            name="sale_payment_method_enum",
            create_constraint=True,
        ),
        nullable=False,
        comment="Payment method used",
    )

    reference_number = Column(
        String(100),
        nullable=True,
        comment="Transaction reference / UPI ID / card last-4",
    )

    remarks = Column(
        Text,
        nullable=True,
        comment="Optional remarks",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    sale = relationship(
        "Sale",
        back_populates="payments",
    )

    def __repr__(self) -> str:
        return (
            f"<SalePayment(sale_id={self.sale_id!r}, amount={self.amount!r}, "
            f"method={self.payment_method!r})>"
        )
