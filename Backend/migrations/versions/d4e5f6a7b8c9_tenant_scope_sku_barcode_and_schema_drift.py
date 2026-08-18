"""tenant-scope product/unit SKU+barcode uniqueness; reconcile schema drift

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-08-12

Two independent fixes bundled together since both were found during the
same bug-audit pass (see docs/BUG_AUDIT.md, findings H1 and H6):

1. H1 — `products.sku`/`barcode` and `product_units.unit_sku` were globally
   unique instead of scoped per tenant, so two unrelated businesses could
   not both use a common SKU convention. Rescoped to per-admin (products)
   and per-product (product_units, since a unit's SKU only needs to be
   unique among units of the same product, and product already ties back
   to a tenant).

2. H6 — `inventories.selling_price` and `staff_type_enum`'s `'ADMIN'` value
   were only ever applied via raw SQL in `main.py`'s startup hook, never
   captured as a real migration — meaning a fresh DB built purely from
   `alembic upgrade head` would be missing both. Captured here as the
   real migration, using IF NOT EXISTS guards since any DB that already
   booted the old app code will already have them applied.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d4e5f6a7b8c9"
down_revision = "c1d2e3f4a5b6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── H6: schema drift reconciliation (idempotent — may already exist) ──
    op.execute(
        "ALTER TABLE inventories ADD COLUMN IF NOT EXISTS selling_price NUMERIC(10, 2) DEFAULT NULL"
    )
    op.execute("ALTER TYPE staff_type_enum ADD VALUE IF NOT EXISTS 'ADMIN'")

    # ── H1: products.sku / products.barcode → tenant-scoped ──
    op.drop_index("ix_products_sku", table_name="products")
    op.drop_constraint("products_barcode_key", "products", type_="unique")
    op.create_index("ix_products_sku", "products", ["sku"], unique=False)
    op.create_index("ix_products_barcode", "products", ["barcode"], unique=False)
    op.create_unique_constraint(
        "uq_products_admin_sku", "products", ["admin_id", "sku"]
    )
    op.create_unique_constraint(
        "uq_products_admin_barcode", "products", ["admin_id", "barcode"]
    )

    # ── H1: product_units.unit_sku → scoped per product ──
    op.drop_index("ix_product_units_unit_sku", table_name="product_units")
    op.create_index(
        "ix_product_units_unit_sku", "product_units", ["unit_sku"], unique=False
    )
    op.create_unique_constraint(
        "uq_product_units_product_unit_sku",
        "product_units",
        ["product_id", "unit_sku"],
    )

    # ── Store Scoped Overrides ──
    op.create_table(
        "store_category_overrides",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("store_id", sa.BigInteger(), nullable=False),
        sa.Column("category_id", sa.BigInteger(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "category_id", name="uq_store_category_override")
    )
    op.create_table(
        "store_brand_overrides",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("store_id", sa.BigInteger(), nullable=False),
        sa.Column("brand_id", sa.BigInteger(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["brand_id"], ["brands.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "brand_id", name="uq_store_brand_override")
    )
    op.create_table(
        "store_subcategory_overrides",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("store_id", sa.BigInteger(), nullable=False),
        sa.Column("subcategory_id", sa.BigInteger(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["subcategory_id"], ["subcategories.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["store_id"], ["stores.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("store_id", "subcategory_id", name="uq_store_subcategory_override")
    )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS store_subcategory_overrides")
    op.execute("DROP TABLE IF EXISTS store_brand_overrides")
    op.execute("DROP TABLE IF EXISTS store_category_overrides")

    op.drop_constraint(
        "uq_product_units_product_unit_sku", "product_units", type_="unique"
    )
    op.drop_index("ix_product_units_unit_sku", table_name="product_units")
    op.create_index(
        "ix_product_units_unit_sku", "product_units", ["unit_sku"], unique=True
    )

    op.drop_constraint("uq_products_admin_barcode", "products", type_="unique")
    op.drop_constraint("uq_products_admin_sku", "products", type_="unique")
    op.drop_index("ix_products_barcode", table_name="products")
    op.drop_index("ix_products_sku", table_name="products")
    op.create_unique_constraint("products_barcode_key", "products", ["barcode"])
    op.create_index("ix_products_sku", "products", ["sku"], unique=True)

    # Note: schema-drift columns/enum values (selling_price, staff_type_enum
    # 'ADMIN') are intentionally not reverted — removing a live enum value or
    # a column other code depends on is not a safe downgrade operation.
