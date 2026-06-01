# Main module: user.py
import uuid
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base
class User(Base):
    __tablename__ = "users"
    user_id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
        comment="Auto-generated immutable UUID primary key",
    )
    store_id = Column(
        UUID(as_uuid=True),
        nullable=True,
        comment="FK to stores.store_id (constraint added later)",
    )
    full_name = Column(
        String(100),
        nullable=False,
        comment="Staff member's full name",
    )
    email = Column(
        String(150),
        nullable=False,
        unique=True,
        index=True,
        comment="Login identifier — must be unique across the system",
    )
    password_hash = Column(
        Text,
        nullable=False,
        comment="bcrypt hash (cost=12) of the user's password",
    )
    role = Column(
        String(30),
        nullable=False,
        comment="One of: admin, cashier, optometrist, manager",
    )
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default=text("true"),
        comment="Soft-disable flag — inactive users cannot log in",
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Row creation timestamp (set by DB)",
    )
    last_login_at = Column(
        DateTime(timezone=True),
        nullable=True,
        comment="Updated on every successful login",
    )
    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'cashier', 'optometrist', 'manager')",
            name="ck_users_role_valid",
        ),
    )
    tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    def __repr__(self) -> str:
        return (
            f"<User(user_id={self.user_id!r}, email={self.email!r}, "
            f"role={self.role!r})>"
        )
