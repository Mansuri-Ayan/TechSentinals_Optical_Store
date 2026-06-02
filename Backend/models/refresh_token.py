# Model: refresh_token.py
import uuid
from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    token_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        comment="Auto-generated UUID primary key",
    )

    admin_id = Column(
        BigInteger,
        ForeignKey("admins.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → admins.id — owner of this token",
    )

    token_hash = Column(
        Text,
        nullable=False,
        unique=True,
        comment="SHA-256 hash of the raw JWT refresh token",
    )

    expires_at = Column(
        DateTime(timezone=True),
        nullable=False,
        comment="When this refresh token expires (UTC)",
    )

    revoked_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="NULL = still valid; timestamp = revoked at that time",
    )

    device_fingerprint = Column(
        String(64),
        nullable=True,
        comment="Optional browser/device identifier for audit",
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp (set by DB)",
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship(
        "Admin",
        back_populates="refresh_tokens",
    )

    def __repr__(self) -> str:
        return (
            f"<RefreshToken(token_id={self.token_id!r}, "
            f"admin_id={self.admin_id!r}, "
            f"revoked={'yes' if self.revoked_at else 'no'})>"
        )
