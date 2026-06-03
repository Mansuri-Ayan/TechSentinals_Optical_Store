# Model: subcategory.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Subcategory(Base):
    __tablename__ = "subcategories"

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    category_id = Column(
        BigInteger,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → categories.id — parent category",
    )

    name = Column(
        String(255),
        nullable=False,
        comment="Subcategory display name",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Optional description of the subcategory",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the subcategory is currently active",
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
    category = relationship(
        "Category",
        back_populates="subcategories",
    )
    products = relationship(
        "Product",
        back_populates="subcategory",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Subcategory(id={self.id!r}, name={self.name!r}, "
            f"category_id={self.category_id!r})>"
        )
