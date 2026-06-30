# Model: worker.py
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


class Worker(Base):
    __tablename__ = "workers"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → stores.id — the store this worker belongs to",
    )

    role_id = Column(
        BigInteger,
        ForeignKey("roles.id", ondelete="RESTRICT"),
        nullable=False,
        comment="FK → roles.id — the role of this worker",
    )

    first_name = Column(
        String(100),
        nullable=False,
        comment="Worker's first name",
    )
    last_name = Column(
        String(100),
        nullable=False,
        comment="Worker's last name",
    )

    email = Column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
        comment="Worker's email (optional but unique if provided)",
    )
    phone = Column(
        String(10),
        nullable=False,
        unique=True,
        index=True,
        comment="10-digit phone number",
    )

    password_hash = Column(
        Text,
        nullable=False,
        comment="bcrypt hash (cost=12) of the worker's password",
    )

    profile_image = Column(
        Text,
        nullable=True,
        comment="URL or path to profile image",
    )

    employee_code = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Unique employee identifier code",
    )

    pf_number = Column(
        String(50),
        nullable=True,
        comment="Provident Fund number (optional)",
    )

    joining_date = Column(
        Date,
        nullable=False,
        comment="Date the worker joined",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the worker is currently active",
    )

    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Updated on every successful login",
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
    deleted_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        comment="Soft-delete timestamp — NULL means active",
    )

    # ── Relationships ──────────────────────────────────────────
    store = relationship(
        "Store",
        back_populates="workers",
    )
    role = relationship(
        "Role",
        lazy="selectin",
    )
    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="worker",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<Worker(id={self.id!r}, name={self.first_name!r} "
            f"{self.last_name!r}, code={self.employee_code!r})>"
        )
