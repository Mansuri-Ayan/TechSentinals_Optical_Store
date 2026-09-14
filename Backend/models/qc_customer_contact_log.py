# Model: qc_customer_contact_log.py
"""
QCCustomerContactLog — logs manual (Phone, WhatsApp) and automated (Email) customer communication
regarding item delays, stock unavailability, or choices (wait vs. change item).
"""
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class QCCustomerContactLog(Base):
    __tablename__ = "qc_customer_contact_logs"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → sale_items.id — order line item discussed",
    )

    logged_by_id = Column(
        BigInteger,
        nullable=False,
        comment="User ID who logged this contact event",
    )

    logged_by_name = Column(
        String(150),
        nullable=True,
        comment="Cached display name of staff member",
    )

    contact_channel = Column(
        String(50),
        nullable=False,
        comment="PHONE, WHATSAPP, or EMAIL_SYSTEM",
    )

    summary_notes = Column(
        Text,
        nullable=False,
        comment="Summary of discussion, agreement, or customer feedback",
    )

    customer_choice = Column(
        String(50),
        nullable=True,
        comment="WAIT_FOR_STOCK, CHOOSE_DIFFERENT_ITEM, REFUND_ITEM, or NULL",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp of contact log entry",
    )

    # ── Relationships ──────────────────────────────────────────
    sale_item = relationship(
        "SaleItem",
        back_populates="contact_logs",
    )

    def __repr__(self) -> str:
        return (
            f"<QCCustomerContactLog(id={self.id!r}, channel={self.contact_channel!r}, "
            f"choice={self.customer_choice!r})>"
        )
