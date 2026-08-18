# Model: store_subcategory_override.py
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


class StoreSubcategoryOverride(Base):
    __tablename__ = "store_subcategory_overrides"
    __table_args__ = (
        UniqueConstraint(
            "store_id", "subcategory_id",
            name="uq_store_subcategory_override",
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

    subcategory_id = Column(
        BigInteger,
        ForeignKey("subcategories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → subcategories.id — the subcategory this override is for",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this subcategory is active for this store",
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
    subcategory = relationship("Subcategory")

    def __repr__(self) -> str:
        return f"<StoreSubcategoryOverride(id={self.id!r}, store_id={self.store_id!r}, subcategory_id={self.subcategory_id!r}, is_active={self.is_active!r})>"
