# Model: product.py
from decimal import Decimal
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from db.session import Base


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        # SKU/barcode only need to be unique within a tenant, not globally —
        # two unrelated businesses must be able to reuse the same SKU.
        UniqueConstraint("admin_id", "sku", name="uq_products_admin_sku"),
        UniqueConstraint("admin_id", "barcode", name="uq_products_admin_barcode"),
    )

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
        index=True,
        comment="Stock Keeping Unit — unique per tenant (see uq_products_admin_sku)",
    )

    barcode = Column(
        String(100),
        nullable=True,
        index=True,
        comment="Optional barcode (EAN / UPC) — unique per tenant (see uq_products_admin_barcode)",
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

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Default product-level discount percentage (0-100)",
    )

    warranty_months = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Warranty duration in months (0 = no warranty)",
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

    low_stock_threshold = Column(
        Integer,
        nullable=True,
        comment="Low stock threshold for this product",
    )

    gst_percent = Column(
        Numeric(5, 2),
        nullable=True,
        default=None,
        comment="Custom GST rate percentage override for this product (NULL to inherit default)",
    )

    @property
    def selling_price_before_gst(self) -> Decimal:
        return Decimal(str(self.selling_price)) if self.selling_price is not None else Decimal("0.00")

    @property
    def gst_amount(self) -> Decimal:
        if self.selling_price is None:
            return Decimal("0.00")
        rate = Decimal(str(self.gst_percent)) if self.gst_percent is not None else Decimal("18.00")
        return (Decimal(str(self.selling_price)) * rate / Decimal("100")).quantize(Decimal("0.01"))

    @property
    def selling_price_with_gst(self) -> Decimal:
        if self.selling_price is None:
            return Decimal("0.00")
        return (self.selling_price_before_gst + self.gst_amount).quantize(Decimal("0.01"))

    sales_workflow_type = Column(
        String(50),
        nullable=False,
        default="BOTH",
        server_default="BOTH",
        comment="Workflow eligibility: DIRECT_ONLY, ORDER_ONLY, or BOTH",
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

    # Sale items
    sale_items = relationship(
        "SaleItem",
        back_populates="product",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<Product(id={self.id!r}, sku={self.sku!r}, "
            f"name={self.name!r})>"
        )

    @validates("sku")
    def validate_sku(self, key, value):
        if value:
            return "".join(c for c in value if c.isalnum()).upper()
        return value
