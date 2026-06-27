# Model: product_snapshot.py
"""
ProductSnapshot — a frozen, write-once copy of a product's full details
(base info + frame/lens/accessory specs) captured at the time of a
transaction (sale, purchase order, or inventory movement).

WHY THIS EXISTS
───────────────
The live `products`, `frame_products`, `lens_products`, and
`accessory_products` tables are the *current* catalogue.  Any admin can
update a product's name, price, material, etc. at any time.  If
`SaleItem` or `PurchaseOrderItem` only stored a FK → products.id, a price
update would silently change every historical invoice — corrupting
financial records and customer-facing receipts.

The snapshot pattern solves this:
  1. When a sale / PO / inventory-transaction is created, we INSERT one
     row into this table copying every relevant field from the live
     product tables.
  2. The transaction record (SaleItem, PurchaseOrderItem,
     InventoryTransaction) stores `product_snapshot_id` pointing here.
  3. This table is NEVER updated after insert — it is append-only.
  4. Even if the live product is renamed, repriced, or deleted, every
     historical record reads the correct data from its snapshot.

DESIGN NOTES
────────────
• All frame / lens / accessory fields are nullable — only the columns
  relevant to the product_type will be filled.
• Category, subcategory, and brand names are stored as plain strings
  (denormalised) so that deleting a brand or category does not break
  historical records.
• `product_id` uses SET NULL on delete — if the live product is hard-
  deleted the snapshot is still intact; we just lose the backlink.
"""
import enum

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from db.session import Base


class ProductType(str, enum.Enum):
    FRAME = "FRAME"
    LENS = "LENS"
    ACCESSORY = "ACCESSORY"
    OTHER = "OTHER"


class ProductSnapshot(Base):
    __tablename__ = "product_snapshots"

    # ── Primary key ───────────────────────────────────────────────
    id = Column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
        comment="Auto-generated BIGINT primary key",
    )

    # ── Back-reference to the live product (nullable — SET NULL on delete) ──
    product_id = Column(
        BigInteger,
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        comment=(
            "FK → products.id — soft reference; SET NULL if the live product "
            "is deleted.  The snapshot remains intact regardless."
        ),
    )

    # ── Snapshot timestamp ────────────────────────────────────────
    snapshotted_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        comment="Timestamp when this snapshot was captured",
    )

    # ── Base product fields (copied from products) ────────────────
    product_type = Column(
        Enum(ProductType, name="product_type_enum", create_constraint=True),
        nullable=False,
        comment="Product category type at time of snapshot",
    )

    sku = Column(
        String(100),
        nullable=False,
        comment="SKU copied from products.sku at time of snapshot",
    )

    barcode = Column(
        String(100),
        nullable=True,
        comment="Barcode copied from products.barcode",
    )

    name = Column(
        String(255),
        nullable=False,
        comment="Product name copied from products.name at time of snapshot",
    )

    # Brand — stored as plain string so brand deletion doesn't break history
    brand_id = Column(
        BigInteger,
        nullable=True,
        comment="Original brands.id (informational only — no FK constraint)",
    )
    brand_name = Column(
        String(255),
        nullable=True,
        comment="Brand name copied at time of snapshot",
    )

    # Category — stored as plain string
    category_id = Column(
        BigInteger,
        nullable=True,
        comment="Original categories.id (informational only)",
    )
    category_name = Column(
        String(255),
        nullable=True,
        comment="Category name copied at time of snapshot",
    )

    subcategory_id = Column(
        BigInteger,
        nullable=True,
        comment="Original subcategories.id (informational only)",
    )
    subcategory_name = Column(
        String(255),
        nullable=True,
        comment="Subcategory name copied at time of snapshot",
    )

    # Prices — the core reason for this table
    cost_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Cost price copied from products.cost_price at snapshot time",
    )

    selling_price = Column(
        Numeric(10, 2),
        nullable=False,
        comment="Selling price copied from products.selling_price at snapshot time",
    )

    discount_percent = Column(
        Numeric(5, 2),
        nullable=False,
        default=0,
        server_default="0",
        comment="Default discount % copied from products.discount_percent",
    )

    warranty_months = Column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
        comment="Warranty duration copied from products.warranty_months",
    )

    image_url = Column(
        Text,
        nullable=True,
        comment="Product image URL at time of snapshot",
    )

    # ── Frame-specific fields (filled when product_type = FRAME) ──
    frame_type = Column(
        String(100),
        nullable=True,
        comment="Frame type e.g. Full-Rim, Half-Rim, Rimless",
    )
    frame_shape = Column(
        String(100),
        nullable=True,
        comment="Frame shape e.g. Rectangle, Round, Aviator",
    )
    frame_material = Column(
        String(100),
        nullable=True,
        comment="Frame material e.g. Acetate, Metal, TR-90",
    )
    frame_color = Column(
        String(100),
        nullable=True,
        comment="Frame color",
    )
    lens_width = Column(
        String(100),
        nullable=True,
        comment="Lens width in mm",
    )
    bridge_width = Column(
        String(100),
        nullable=True,
        comment="Bridge width in mm",
    )
    temple_length = Column(
        String(100),
        nullable=True,
        comment="Temple length in mm",
    )
    gender = Column(
        String(100),
        nullable=True,
        comment="Target gender e.g. Male, Female, Unisex",
    )
    age_group = Column(
        String(100),
        nullable=True,
        comment="Target age group e.g. Adult, Kids",
    )

    # ── Lens-specific fields (filled when product_type = LENS) ────
    lens_type = Column(
        String(100),
        nullable=True,
        comment="Lens type e.g. Single Vision, Bifocal, Progressive",
    )
    lens_material = Column(
        String(100),
        nullable=True,
        comment="Lens material e.g. CR-39, Polycarbonate",
    )
    index_value = Column(
        String(100),
        nullable=True,
        comment="Refractive index e.g. 1.50, 1.60, 1.74",
    )
    coating = Column(
        String(100),
        nullable=True,
        comment="Coating e.g. Anti-Reflective, HMC",
    )
    tint_color = Column(
        String(100),
        nullable=True,
        comment="Tint color if applicable",
    )
    uv_protection = Column(
        String(100),
        nullable=True,
        comment="UV protection level e.g. UV400",
    )
    blue_cut = Column(
        String(100),
        nullable=True,
        comment="Blue-light filtering",
    )
    photochromic = Column(
        String(100),
        nullable=True,
        comment="Photochromic / transition capability",
    )
    polarized = Column(
        String(100),
        nullable=True,
        comment="Polarization",
    )

    # ── Accessory-specific fields (filled when product_type = ACCESSORY) ──
    accessory_type = Column(
        String(100),
        nullable=True,
        comment="Accessory type e.g. Case, Cloth, Chain, Solution",
    )
    accessory_material = Column(
        String(100),
        nullable=True,
        comment="Accessory material",
    )
    accessory_color = Column(
        String(100),
        nullable=True,
        comment="Accessory color",
    )
    accessory_size = Column(
        String(100),
        nullable=True,
        comment="Accessory size / dimensions",
    )

    # ── Relationships ──────────────────────────────────────────────
    # Read-only soft-link back to the live product (may be None if deleted)
    product = relationship(
        "Product",
        lazy="noload",
    )

    def __repr__(self) -> str:
        return (
            f"<ProductSnapshot(id={self.id!r}, product_id={self.product_id!r}, "
            f"sku={self.sku!r}, name={self.name!r}, type={self.product_type!r})>"
        )
