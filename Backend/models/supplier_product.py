# Model: supplier_product.py
"""
SupplierProduct — maps which products a supplier provides and at what price.
This is the catalogue of products you can order from a given supplier.
Links Supplier → Product, with the supplier's unit price and lead time.
"""
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class SupplierProduct(Base):
    __tablename__ = "supplier_products"
    __table_args__ = (
        UniqueConstraint(
            "supplier_id", "product_id",
            name="uq_supplier_product",
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

    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="FK → products.id — the product this supplier can provide",
    )

    supplier_sku = Column(
        String(100),
        nullable=True,
        comment="Supplier's own SKU / part number for this product",
    )

    unit_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Supplier's quoted unit price (purchase price from supplier)",
    )

    minimum_order_quantity = Column(
        BigInteger,
        nullable=False,
        default=1,
        server_default="1",
        comment="Minimum units the supplier will sell in one order",
    )

    lead_time_days = Column(
        BigInteger,
        nullable=True,
        comment="Expected lead time in days from order to delivery",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether this supplier still provides this product",
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
        back_populates="supplier_products",
    )
    product = relationship(
        "Product",
        back_populates="supplier_products",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<SupplierProduct(supplier_id={self.supplier_id!r}, "
            f"product_id={self.product_id!r}, price={self.unit_price!r})>"
        )
