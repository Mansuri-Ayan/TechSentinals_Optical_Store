# Model: category.py
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


class Category(Base):
    __tablename__ = "categories"

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
        comment="FK → admins.id — owner of this category",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
        comment="FK → stores.id — owner store of this category (null for admin/warehouse)",
    )

    name = Column(
        String(255),
        nullable=False,
        comment="Category display name (e.g. Frames, Lenses, Accessories)",
    )

    description = Column(
        Text,
        nullable=True,
        comment="Optional description of the category",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the category is currently active",
    )

    sales_workflow_type = Column(
        String(50),
        nullable=False,
        default="BOTH",
        server_default="BOTH",
        comment="Default workflow eligibility for products in this category: DIRECT_ONLY, ORDER_ONLY, or BOTH",
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
    admin = relationship(
        "Admin",
        back_populates="categories",
    )
    store = relationship(
        "Store",
    )
    subcategories = relationship(
        "Subcategory",
        back_populates="category",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    products = relationship(
        "Product",
        back_populates="category",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id!r}, name={self.name!r})>"
