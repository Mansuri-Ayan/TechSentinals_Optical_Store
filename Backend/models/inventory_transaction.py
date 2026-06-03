# Model: inventory_transaction.py
import enum
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class TransactionType(str, enum.Enum):
    PURCHASE = "PURCHASE"
    SALE = "SALE"
    ADMIN_TRANSFER_OUT = "ADMIN_TRANSFER_OUT"
    ADMIN_TRANSFER_IN = "ADMIN_TRANSFER_IN"
    STORE_TRANSFER_OUT = "STORE_TRANSFER_OUT"
    STORE_TRANSFER_IN = "STORE_TRANSFER_IN"
    DAMAGE = "DAMAGE"
    LOSS = "LOSS"
    AUDIT_ADJUSTMENT = "AUDIT_ADJUSTMENT"
    RETURN = "RETURN"


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    inventory_id = Column(
        BigInteger,
        ForeignKey("inventories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → inventories.id — the inventory record affected",
    )

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → products.id — denormalised for faster queries",
    )

    transaction_type = Column(
        Enum(TransactionType, name="transaction_type_enum", create_constraint=True),
        nullable=False,
        comment="Type of inventory movement",
    )

    quantity = Column(
        Integer,
        nullable=False,
        comment="Number of units moved (always positive)",
    )

    send_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — source store for transfers",
    )

    receive_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — destination store for transfers",
    )

    reference_id = Column(
        BigInteger,
        nullable=True,
        comment="Optional reference to related entity (e.g. order_id, purchase_order_id)",
    )

    remarks = Column(
        Text,
        nullable=True,
        comment="Optional notes / reason for the transaction",
    )

    created_by = Column(
        BigInteger,
        nullable=False,
        comment="User ID who initiated this transaction",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Transaction timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    inventory = relationship(
        "Inventory",
        back_populates="transactions",
    )
    product = relationship(
        "Product",
        lazy="selectin",
    )
    send_store = relationship(
        "Store",
        foreign_keys=[send_store_id],
        lazy="selectin",
    )
    receive_store = relationship(
        "Store",
        foreign_keys=[receive_store_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<InventoryTransaction(id={self.id!r}, type={self.transaction_type!r}, "
            f"qty={self.quantity!r})>"
        )
