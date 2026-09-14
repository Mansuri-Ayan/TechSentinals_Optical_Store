# Model: purchase_order_invoice.py
from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class PurchaseOrderInvoice(Base):
    __tablename__ = "purchase_order_invoices"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key"
    )

    purchase_order_id = Column(
        BigInteger,
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="FK -> purchase_orders.id"
    )

    invoice_number = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
        comment="Invoice/PO reference number"
    )

    is_final = Column(
        Boolean,
        nullable=False,
        default=False,
        comment="True if fully paid (Final Invoice), False if outstanding balance remains (Temporary Invoice)"
    )

    html_content = Column(
        Text,
        nullable=False,
        comment="Generated HTML content of the purchase invoice"
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp"
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
        comment="Row last-update timestamp"
    )

    # Relationship back to PurchaseOrder
    purchase_order = relationship("PurchaseOrder", back_populates="invoice", lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<PurchaseOrderInvoice(id={self.id!r}, invoice_number={self.invoice_number!r}, "
            f"is_final={self.is_final!r}, po_id={self.purchase_order_id!r})>"
        )
