# Model: inventory.py
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
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class OwnerType(str, enum.Enum):
    ADMIN = "ADMIN"
    STORE = "STORE"


class Inventory(Base):
    __tablename__ = "inventories"
    __table_args__ = (
        UniqueConstraint(
            "owner_type", "owner_id", "product_id",
            name="uq_inventory_owner_product",
        ),
    )

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    owner_type = Column(
        Enum(OwnerType, name="owner_type_enum", create_constraint=True),
        nullable=False,
        comment="Owner type: ADMIN (warehouse) or STORE",
    )

    owner_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment="Polymorphic FK — admins.id when ADMIN, stores.id when STORE",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → products.id — the product being tracked",
    )

    quantity = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Total physical quantity on hand",
    )

    reserved_quantity = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Quantity reserved for pending orders",
    )

    available_quantity = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="quantity - reserved_quantity = available for sale",
    )

    reorder_level = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Threshold below which restocking is needed",
    )

    last_purchase_price = Column(
        Numeric(10, 2),
        nullable=True,
        comment="Price paid in the most recent purchase",
    )

    last_stock_in_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of the last stock inflow",
    )

    last_stock_out_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of the last stock outflow",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this inventory record is active",
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
    product = relationship(
        "Product",
        back_populates="inventories",
        lazy="selectin",
    )
    transactions = relationship(
        "InventoryTransaction",
        back_populates="inventory",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Inventory(id={self.id!r}, owner={self.owner_type!r}:{self.owner_id!r}, "
            f"product_id={self.product_id!r}, qty={self.quantity!r})>"
        )
