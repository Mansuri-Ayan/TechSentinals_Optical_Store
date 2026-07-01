# Model: superadmin.py
import enum
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SuperAdminStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    SUSPENDED = "SUSPENDED"


class SuperAdmin(Base):
    __tablename__ = "super_admins"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
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

    status = Column(
        Enum(SuperAdminStatus, name="superadmin_status_enum", create_constraint=True),
        nullable=False,
        default=SuperAdminStatus.ACTIVE,
        server_default="ACTIVE",
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
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="superadmin",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<SuperAdmin(id={self.id!r}, email={self.email!r})>"
        )
