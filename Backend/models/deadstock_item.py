# Model: deadstock_item.py
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class DeadstockStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    REUSED = "REUSED"
    SOLD = "SOLD"


class DeadstockItem(Base):
    __tablename__ = "deadstock_items"

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
        comment="FK → admins.id — multi-tenant scope",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → stores.id — store where exchange occurred",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → products.id — returned product",
    )

    inventory_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → inventories.id — inventory record linked to return",
    )

    exchange_id = Column(
        BigInteger,
        ForeignKey("exchanges.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → exchanges.id — exchange record that created this deadstock",
    )

    original_sale_item_id = Column(
        BigInteger,
        ForeignKey("sale_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → sale_items.id — original line item returned",
    )

    sku = Column(
        String(100),
        nullable=False,
        index=True,
        comment="SKU of returned product",
    )

    category_name = Column(
        String(255),
        nullable=False,
        comment="Cached category name (Frames, Lenses, Accessories)",
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
        comment="Quantity in deadstock (always 1 per unit record)",
    )

    original_price = Column(
        Numeric(12, 2),
        nullable=False,
        default=0.00,
        server_default="0.00",
        comment="Original selling price or item value at exchange",
    )

    status = Column(
        Enum(DeadstockStatus, name="deadstock_status_enum", create_constraint=True),
        nullable=False,
        default=DeadstockStatus.AVAILABLE,
        server_default="AVAILABLE",
        comment="Lifecycle status: AVAILABLE, REUSED, SOLD",
    )

    is_exchanged = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Marks item as currently exchanged / in deadstock",
    )

    reused_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when item was moved back to active inventory",
    )

    sold_in_sale_id = Column(
        BigInteger,
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → sales.id — sale ID if sold via POS deadstock checkout",
    )

    notes = Column(
        Text,
        nullable=True,
        comment="Optional internal remarks",
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
    product = relationship("Product", lazy="selectin")
    exchange = relationship("Exchange", lazy="selectin")
    store = relationship("Store", lazy="selectin")
    original_sale_item = relationship("SaleItem", foreign_keys=[original_sale_item_id], lazy="selectin")
    sold_in_sale = relationship("Sale", foreign_keys=[sold_in_sale_id], lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<DeadstockItem(id={self.id!r}, sku={self.sku!r}, "
            f"category={self.category_name!r}, status={self.status!r})>"
        )
