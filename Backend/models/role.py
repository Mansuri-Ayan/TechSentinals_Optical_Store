# Model: role.py
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    String,
)
from sqlalchemy.sql import func
from db.session import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    role = Column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
        comment="Role name — e.g., admin, manager, worker, optician",
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

    def __repr__(self) -> str:
        return f"<Role(id={self.id!r}, role={self.role!r})>"
