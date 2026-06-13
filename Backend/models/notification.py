# Model: notification.py
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class NotificationType(str, enum.Enum):
    TRANSFER_REQUEST_RECEIVED = "TRANSFER_REQUEST_RECEIVED"
    TRANSFER_REQUEST_APPROVED = "TRANSFER_REQUEST_APPROVED"
    TRANSFER_REQUEST_REJECTED = "TRANSFER_REQUEST_REJECTED"
    TRANSFER_PUSH_RECEIVED = "TRANSFER_PUSH_RECEIVED"
    ADMIN_TRANSFER_COMPLETED = "ADMIN_TRANSFER_COMPLETED"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    recipient_user_id = Column(
        BigInteger,
        nullable=False,
        index=True,
        comment="ID of the user who should receive the notification (polymorphic)",
    )

    recipient_store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="Optional store context for the recipient",
    )

    type = Column(
        Enum(NotificationType, name="notification_type_enum", create_constraint=True),
        nullable=False,
        comment="Type of notification",
    )

    title = Column(
        String(255),
        nullable=False,
        comment="Subject or title of notification",
    )

    message = Column(
        Text,
        nullable=False,
        comment="Detailed notification message content",
    )

    is_read = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Read/unread state",
    )

    related_transaction_id = Column(
        BigInteger,
        ForeignKey("inventory_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → inventory_transactions.id — related transaction context",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Notification timestamp",
    )

    # ── Relationships ──────────────────────────────────────────
    recipient_store = relationship(
        "Store",
        lazy="selectin",
    )
    related_transaction = relationship(
        "InventoryTransaction",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Notification(id={self.id!r}, type={self.type!r}, is_read={self.is_read!r})>"
