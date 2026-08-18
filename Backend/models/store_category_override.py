# Model: store_category_override.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class StoreCategoryOverride(Base):
    __tablename__ = "store_category_overrides"
    __table_args__ = (
        UniqueConstraint(
            "store_id", "category_id",
            name="uq_store_category_override",
        ),
    )

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
        comment="FK → stores.id — the store this override belongs to",
    )

    category_id = Column(
        BigInteger,
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → categories.id — the category this override is for",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this category is active for this store",
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

    # Relationships
    store = relationship("Store")
    category = relationship("Category")

    def __repr__(self) -> str:
        return f"<StoreCategoryOverride(id={self.id!r}, store_id={self.store_id!r}, category_id={self.category_id!r}, is_active={self.is_active!r})>"
