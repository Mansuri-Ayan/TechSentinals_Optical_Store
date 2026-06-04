# Model: supplier_store_link.py
"""
SupplierStoreLink — links a Supplier to a specific Store.
A supplier at the Admin level can also be designated as a direct supplier
for one or more stores. This allows store-level purchase tracking.
"""
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


class SupplierStoreLink(Base):
    __tablename__ = "supplier_store_links"
    __table_args__ = (
        UniqueConstraint(
            "supplier_id", "store_id",
            name="uq_supplier_store",
        ),
    )

    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    supplier_id = Column(
        BigInteger,
        ForeignKey("suppliers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → suppliers.id",
    )

    store_id = Column(
        BigInteger,
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → stores.id — the store this supplier is linked to",
    )

    is_primary = Column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
        comment="Whether this is the store's primary/preferred supplier",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this supplier-store relationship is active",
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
    supplier = relationship(
        "Supplier",
        back_populates="store_links",
    )
    store = relationship(
        "Store",
        back_populates="supplier_links",
    )

    def __repr__(self) -> str:
        return (
            f"<SupplierStoreLink(supplier_id={self.supplier_id!r}, "
            f"store_id={self.store_id!r})>"
        )
