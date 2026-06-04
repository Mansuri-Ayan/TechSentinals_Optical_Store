# Model: product.py
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base


class Product(Base):
    __tablename__ = "products"

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
        comment="FK → admins.id — owner of this product (multi-tenant)",
    )

    category_id = Column(
        BigInteger,
        ForeignKey("categories.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
        comment="FK → categories.id — top-level category",
    )

    subcategory_id = Column(
        BigInteger,
        ForeignKey("subcategories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → subcategories.id — optional finer classification",
    )

    sku = Column(
        String(100),
        nullable=False,
        unique=True,
        index=True,
        comment="Stock Keeping Unit — unique product identifier",
    )

    barcode = Column(
        String(100),
        nullable=True,
        unique=True,
        comment="Optional barcode (EAN / UPC)",
    )

    name = Column(
        String(255),
        nullable=False,
        comment="Product display name",
    )

    brand_id = Column(
        BigInteger,
        ForeignKey("brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment="FK → brands.id — manufacturer / brand",
    )

    cost_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Purchase / cost price",
    )

    selling_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Retail selling price",
    )

    image_url = Column(
        Text,
        nullable=True,
        comment="URL or path to the product image",
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
        comment="Whether the product is currently active",
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
        back_populates="products",
    )
    category = relationship(
        "Category",
        back_populates="products",
        lazy="selectin",
    )
    subcategory = relationship(
        "Subcategory",
        back_populates="products",
        lazy="selectin",
    )
    brand = relationship(
        "Brand",
        back_populates="products",
        lazy="selectin",
    )

    # 1:1 product-type extensions
    frame_product = relationship(
        "FrameProduct",
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    lens_product = relationship(
        "LensProduct",
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    accessory_product = relationship(
        "AccessoryProduct",
        back_populates="product",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Inventory
    inventories = relationship(
        "Inventory",
        back_populates="product",
        lazy="noload",
    )

    # Supplier catalogue
    supplier_products = relationship(
        "SupplierProduct",
        back_populates="product",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Product(id={self.id!r}, sku={self.sku!r}, "
            f"name={self.name!r})>"
        )
