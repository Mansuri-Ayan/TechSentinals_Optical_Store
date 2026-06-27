"""add_product_snapshots_table

Revision ID: b1c2d3e4f5a6
Revises: f3a1b2c4d5e6
Create Date: 2026-06-27 12:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f5a6'
down_revision: Union[str, Sequence[str], None] = 'f3a1b2c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Create the product_snapshots table ──────────────────
    op.create_table(
        'product_snapshots',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False,
                  comment='Auto-generated BIGINT primary key'),
        sa.Column('product_id', sa.BigInteger(), nullable=True,
                  comment='FK → products.id — soft reference; SET NULL if the live product is deleted'),
        sa.Column('snapshotted_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'),
                  nullable=False, comment='Timestamp when this snapshot was captured'),
        # Product type
        sa.Column('product_type', sa.Enum('FRAME', 'LENS', 'ACCESSORY', 'OTHER',
                  name='product_type_enum', create_constraint=True),
                  nullable=False, comment='Product category type at time of snapshot'),
        # Base product fields
        sa.Column('sku', sa.String(100), nullable=False, comment='SKU copied from products.sku'),
        sa.Column('barcode', sa.String(100), nullable=True, comment='Barcode copied from products.barcode'),
        sa.Column('name', sa.String(255), nullable=False, comment='Product name at time of snapshot'),
        sa.Column('brand_id', sa.BigInteger(), nullable=True, comment='Original brands.id (informational)'),
        sa.Column('brand_name', sa.String(255), nullable=True, comment='Brand name at snapshot time'),
        sa.Column('category_id', sa.BigInteger(), nullable=True, comment='Original categories.id (informational)'),
        sa.Column('category_name', sa.String(255), nullable=True, comment='Category name at snapshot time'),
        sa.Column('subcategory_id', sa.BigInteger(), nullable=True, comment='Original subcategories.id (informational)'),
        sa.Column('subcategory_name', sa.String(255), nullable=True, comment='Subcategory name at snapshot time'),
        # Prices
        sa.Column('cost_price', sa.Numeric(10, 2), nullable=False, comment='Cost price at snapshot time'),
        sa.Column('selling_price', sa.Numeric(10, 2), nullable=False, comment='Selling price at snapshot time'),
        sa.Column('discount_percent', sa.Numeric(5, 2), nullable=False, server_default='0',
                  comment='Default discount % at snapshot time'),
        sa.Column('warranty_months', sa.Integer(), nullable=False, server_default='0',
                  comment='Warranty duration at snapshot time'),
        sa.Column('image_url', sa.Text(), nullable=True, comment='Product image URL at snapshot time'),
        # Frame-specific fields
        sa.Column('frame_type', sa.String(100), nullable=True, comment='Frame type'),
        sa.Column('frame_shape', sa.String(100), nullable=True, comment='Frame shape'),
        sa.Column('frame_material', sa.String(100), nullable=True, comment='Frame material'),
        sa.Column('frame_color', sa.String(100), nullable=True, comment='Frame color'),
        sa.Column('lens_width', sa.String(100), nullable=True, comment='Lens width in mm'),
        sa.Column('bridge_width', sa.String(100), nullable=True, comment='Bridge width in mm'),
        sa.Column('temple_length', sa.String(100), nullable=True, comment='Temple length in mm'),
        sa.Column('gender', sa.String(100), nullable=True, comment='Target gender'),
        sa.Column('age_group', sa.String(100), nullable=True, comment='Target age group'),
        # Lens-specific fields
        sa.Column('lens_type', sa.String(100), nullable=True, comment='Lens type'),
        sa.Column('lens_material', sa.String(100), nullable=True, comment='Lens material'),
        sa.Column('index_value', sa.String(100), nullable=True, comment='Refractive index'),
        sa.Column('coating', sa.String(100), nullable=True, comment='Coating type'),
        sa.Column('tint_color', sa.String(100), nullable=True, comment='Tint color'),
        sa.Column('uv_protection', sa.String(100), nullable=True, comment='UV protection level'),
        sa.Column('blue_cut', sa.String(100), nullable=True, comment='Blue-light filtering'),
        sa.Column('photochromic', sa.String(100), nullable=True, comment='Photochromic capability'),
        sa.Column('polarized', sa.String(100), nullable=True, comment='Polarization'),
        # Accessory-specific fields
        sa.Column('accessory_type', sa.String(100), nullable=True, comment='Accessory type'),
        sa.Column('accessory_material', sa.String(100), nullable=True, comment='Accessory material'),
        sa.Column('accessory_color', sa.String(100), nullable=True, comment='Accessory color'),
        sa.Column('accessory_size', sa.String(100), nullable=True, comment='Accessory size'),
        # PK + FK constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_product_snapshots_product_id', 'product_snapshots', ['product_id'])

    # ── 2. Add product_snapshot_id to sale_items ───────────────
    op.add_column('sale_items', sa.Column(
        'product_snapshot_id', sa.BigInteger(), nullable=True,
        comment='FK → product_snapshots.id — frozen product copy at sale time',
    ))
    op.create_foreign_key(
        'fk_sale_items_product_snapshot_id',
        'sale_items', 'product_snapshots',
        ['product_snapshot_id'], ['id'],
        ondelete='RESTRICT',
    )
    op.create_index('ix_sale_items_product_snapshot_id', 'sale_items', ['product_snapshot_id'])

    # ── 3. Add product_snapshot_id to purchase_order_items ─────
    op.add_column('purchase_order_items', sa.Column(
        'product_snapshot_id', sa.BigInteger(), nullable=True,
        comment='FK → product_snapshots.id — frozen product copy at PO creation time',
    ))
    op.create_foreign_key(
        'fk_purchase_order_items_product_snapshot_id',
        'purchase_order_items', 'product_snapshots',
        ['product_snapshot_id'], ['id'],
        ondelete='RESTRICT',
    )
    op.create_index('ix_purchase_order_items_product_snapshot_id', 'purchase_order_items', ['product_snapshot_id'])

    # ── 4. Add product_snapshot_id, unit_price, total_value to inventory_transactions ──
    op.add_column('inventory_transactions', sa.Column(
        'product_snapshot_id', sa.BigInteger(), nullable=True,
        comment='FK → product_snapshots.id — frozen product copy at transaction time',
    ))
    op.add_column('inventory_transactions', sa.Column(
        'unit_price', sa.Numeric(10, 2), nullable=True,
        comment='Per-unit value at time of this movement',
    ))
    op.add_column('inventory_transactions', sa.Column(
        'total_value', sa.Numeric(12, 2), nullable=True,
        comment='unit_price × quantity — total monetary value of this movement',
    ))
    op.create_foreign_key(
        'fk_inventory_transactions_product_snapshot_id',
        'inventory_transactions', 'product_snapshots',
        ['product_snapshot_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_index('ix_inventory_transactions_product_snapshot_id', 'inventory_transactions', ['product_snapshot_id'])


def downgrade() -> None:
    # ── Reverse: inventory_transactions ────────────────────────
    op.drop_index('ix_inventory_transactions_product_snapshot_id', 'inventory_transactions')
    op.drop_constraint('fk_inventory_transactions_product_snapshot_id', 'inventory_transactions', type_='foreignkey')
    op.drop_column('inventory_transactions', 'total_value')
    op.drop_column('inventory_transactions', 'unit_price')
    op.drop_column('inventory_transactions', 'product_snapshot_id')

    # ── Reverse: purchase_order_items ──────────────────────────
    op.drop_index('ix_purchase_order_items_product_snapshot_id', 'purchase_order_items')
    op.drop_constraint('fk_purchase_order_items_product_snapshot_id', 'purchase_order_items', type_='foreignkey')
    op.drop_column('purchase_order_items', 'product_snapshot_id')

    # ── Reverse: sale_items ────────────────────────────────────
    op.drop_index('ix_sale_items_product_snapshot_id', 'sale_items')
    op.drop_constraint('fk_sale_items_product_snapshot_id', 'sale_items', type_='foreignkey')
    op.drop_column('sale_items', 'product_snapshot_id')

    # ── Reverse: product_snapshots table ───────────────────────
    op.drop_index('ix_product_snapshots_product_id', 'product_snapshots')
    op.drop_table('product_snapshots')
