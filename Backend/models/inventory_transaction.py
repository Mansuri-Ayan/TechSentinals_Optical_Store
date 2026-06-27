# Model: inventory_transaction.py
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


class TransactionStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class TransferDirection(str, enum.Enum):
    ADMIN_TO_BRANCH = "ADMIN_TO_BRANCH"
    BRANCH_TO_BRANCH = "BRANCH_TO_BRANCH"
    BRANCH_TO_ADMIN = "BRANCH_TO_ADMIN"


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

    product_snapshot_id = Column(
        BigInteger,
        ForeignKey("product_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment=(
            "FK → product_snapshots.id — frozen copy of the product at time of "
            "this movement.  Use for damage/loss/return value reporting."
        ),
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=True,
        comment=(
            "Per-unit value at time of this movement — snapshotted so that "
            "later price changes do not alter historical valuations."
        ),
    )

    total_value = Column(
        Numeric(12, 2),
        nullable=True,
        comment="unit_price × quantity — total monetary value of this movement",
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

    status = Column(
        Enum(TransactionStatus, name="transaction_status_enum", create_constraint=True),
        nullable=False,
        default=TransactionStatus.COMPLETED,
        server_default="COMPLETED",
        comment="Approval workflow status",
    )

    transfer_direction = Column(
        Enum(TransferDirection, name="transfer_direction_enum", create_constraint=True),
        nullable=True,
        comment="Categorization of branch transfers",
    )

    requested_by_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — store that initiated the pull request",
    )

    approved_by_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → stores.id — store that approved the transfer",
    )

    approved_by_user_id = Column(
        BigInteger,
        nullable=True,
        comment="User ID who approved the transaction",
    )

    approved_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp of approval",
    )

    rejection_reason = Column(
        Text,
        nullable=True,
        comment="Reason if transaction is rejected",
    )

    is_request = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="True if this transaction is a pending request",
    )

    # ── Relationships ──────────────────────────────────────────
    inventory = relationship(
        "Inventory",
        back_populates="transactions",
    )
    product = relationship(  # Live product fallback — prefer product_snapshot for historical accuracy
        "Product",
        lazy="selectin",
    )
    product_snapshot = relationship(
        "ProductSnapshot",
        lazy="selectin",
        foreign_keys="[InventoryTransaction.product_snapshot_id]",
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
    requested_by_store = relationship(
        "Store",
        foreign_keys=[requested_by_store_id],
        lazy="selectin",
    )
    approved_by_store = relationship(
        "Store",
        foreign_keys=[approved_by_store_id],
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<InventoryTransaction(id={self.id!r}, type={self.transaction_type!r}, "
            f"qty={self.quantity!r}, status={self.status!r})>"
        )

