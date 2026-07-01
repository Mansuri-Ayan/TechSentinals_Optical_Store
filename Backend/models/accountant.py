# Model: accountant.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Accountant(Base):
    __tablename__ = "accountants"

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
        comment="FK → admins.id — the business this accountant belongs to",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="NULL = business-level accountant",
    )

    first_name = Column(
        String(100),
        nullable=False,
    )
    last_name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )
    phone = Column(
        String(10),
        nullable=False,
        unique=True,
        index=True,
    )

    password_hash = Column(
        Text,
        nullable=False,
    )

    profile_image = Column(
        Text,
        nullable=True,
    )

    employee_code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )

    joining_date = Column(
        Date,
        nullable=False,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # ── Relationships ──────────────────────────────────────────
    admin = relationship(
        "Admin",
        back_populates="accountants",
        lazy="selectin",
    )
    store = relationship(
        "Store",
        lazy="selectin",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="accountant",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Accountant(id={self.id!r}, name={self.first_name!r} "
            f"{self.last_name!r}, code={self.employee_code!r})>"
        )
