# Model: store_brand_override.py
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


class StoreBrandOverride(Base):
    __tablename__ = "store_brand_overrides"
    __table_args__ = (
        UniqueConstraint(
            "store_id", "brand_id",
            name="uq_store_brand_override",
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

    brand_id = Column(
        BigInteger,
        ForeignKey("brands.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → brands.id — the brand this override is for",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this brand is active for this store",
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
    brand = relationship("Brand")

    def __repr__(self) -> str:
        return f"<StoreBrandOverride(id={self.id!r}, store_id={self.store_id!r}, brand_id={self.brand_id!r}, is_active={self.is_active!r})>"
