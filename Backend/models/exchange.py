# Model: exchange.py
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
from models.sale import StaffType


class ExchangeStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Exchange(Base):
    __tablename__ = "exchanges"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    exchange_number = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique exchange number (e.g. EXC-2026-00001)",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → stores.id",
    )

    customer_id = Column(
        BigInteger,
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → customers.id",
    )

    original_sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → sales.id (exchanged from)",
    )

    original_sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → sale_items.id (returned item)",
    )

    new_sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="FK → sales.id (new replacement sale)",
    )

    original_item_value = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Value of the returned item",
    )

    new_items_total = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Total value of replacement items",
    )

    exchange_credit = Column(
        Numeric(12, 2),
        nullable=False,
        comment="Credit amount applied from original item",
    )

    additional_payment = Column(
        Numeric(12, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Extra amount paid (new_items_total - exchange_credit)",
    )

    processed_by_type = Column(
        Enum(StaffType, name="staff_type_enum", create_constraint=False),
        nullable=False,
        comment="Type of staff processing the exchange",
    )

    processed_by_id = Column(
        BigInteger,
        nullable=False,
        comment="ID of staff processing the exchange",
    )

    exchange_date = Column(
        Date,
        nullable=False,
        comment="Date of the exchange",
    )

    status = Column(
        Enum(ExchangeStatus, name="exchange_status_enum", create_constraint=True),
        nullable=False,
        default=ExchangeStatus.COMPLETED,
        server_default="COMPLETED",
        comment="Lifecycle status of exchange",
    )

    reason = Column(
        Text,
        nullable=True,
        comment="Customer reason for exchange",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Internal notes / remarks",
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

    # Relationships
    admin = relationship("Admin", lazy="selectin")
    store = relationship("Store", lazy="selectin")
    customer = relationship("Customer", lazy="selectin")
    original_sale = relationship("Sale", foreign_keys=[original_sale_id], lazy="selectin")
    original_sale_item = relationship("SaleItem", foreign_keys=[original_sale_item_id], lazy="selectin")
    new_sale = relationship("Sale", foreign_keys=[new_sale_id], lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<Exchange(id={self.id!r}, exchange_number={self.exchange_number!r}, "
            f"credit={self.exchange_credit!r}, status={self.status!r})>"
        )
