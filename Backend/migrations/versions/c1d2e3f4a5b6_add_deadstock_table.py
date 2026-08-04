"""add_deadstock_table

Revision ID: c1d2e3f4a5b6
Revises: 5f55d3dfb54a
Create Date: 2026-07-31 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = '5f55d3dfb54a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Disable transaction block so we can run ALTER TYPE ADD VALUE in Postgres
disable_ddl_transaction = True


def upgrade() -> None:
    """Upgrade schema."""
    # Add new values to custom unitstatus type in Postgres
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE unitstatus ADD VALUE IF NOT EXISTS 'DEADSTOCK'")
        op.execute("ALTER TYPE unitstatus ADD VALUE IF NOT EXISTS 'EXCHANGED'")

    op.create_table(
        'deadstock_items',
        sa.Column('id', sa.BigInteger(), autoincrement=True, nullable=False, comment='Auto-generated BIGINT primary key'),
        sa.Column('admin_id', sa.BigInteger(), nullable=False, comment='FK → admins.id — multi-tenant scope'),
        sa.Column('store_id', sa.BigInteger(), nullable=False, comment='FK → stores.id — store where exchange occurred'),
        sa.Column('product_id', sa.BigInteger(), nullable=False, comment='FK → products.id — returned product'),
        sa.Column('inventory_id', sa.BigInteger(), nullable=True, comment='FK → inventories.id — inventory record linked to return'),
        sa.Column('exchange_id', sa.BigInteger(), nullable=False, comment='FK → exchanges.id — exchange record that created this deadstock'),
        sa.Column('original_sale_item_id', sa.BigInteger(), nullable=True, comment='FK → sale_items.id — original line item returned'),
        sa.Column('product_unit_id', sa.BigInteger(), nullable=True, comment='FK → product_units.id — product unit associated with this deadstock item'),
        sa.Column('sku', sa.String(length=100), nullable=False, comment='SKU of returned product'),
        sa.Column('category_name', sa.String(length=255), nullable=False, comment='Cached category name (Frames, Lenses, Accessories)'),
        sa.Column('quantity', sa.Integer(), server_default='1', nullable=False, comment='Quantity in deadstock (always 1 per unit record)'),
        sa.Column('original_price', sa.Numeric(precision=12, scale=2), server_default='0.00', nullable=False, comment='Original selling price or item value at exchange'),
        sa.Column('status', sa.Enum('AVAILABLE', 'REUSED', 'SOLD', name='deadstock_status_enum', create_constraint=True), server_default='AVAILABLE', nullable=False, comment='Lifecycle status: AVAILABLE, REUSED, SOLD'),
        sa.Column('is_exchanged', sa.Boolean(), server_default='true', nullable=False, comment='Marks item as currently exchanged / in deadstock'),
        sa.Column('reused_at', sa.DateTime(timezone=True), nullable=True, comment='Timestamp when item was moved back to active inventory'),
        sa.Column('sold_in_sale_id', sa.BigInteger(), nullable=True, comment='FK → sales.id — sale ID if sold via POS deadstock checkout'),
        sa.Column('notes', sa.Text(), nullable=True, comment='Optional internal remarks'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Row creation timestamp'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Row last-update timestamp'),
        sa.ForeignKeyConstraint(['admin_id'], ['admins.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['store_id'], ['stores.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inventory_id'], ['inventories.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['exchange_id'], ['exchanges.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['original_sale_item_id'], ['sale_items.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['product_unit_id'], ['product_units.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['sold_in_sale_id'], ['sales.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_index(op.f('ix_deadstock_items_admin_id'), 'deadstock_items', ['admin_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_store_id'), 'deadstock_items', ['store_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_product_id'), 'deadstock_items', ['product_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_inventory_id'), 'deadstock_items', ['inventory_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_exchange_id'), 'deadstock_items', ['exchange_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_original_sale_item_id'), 'deadstock_items', ['original_sale_item_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_product_unit_id'), 'deadstock_items', ['product_unit_id'], unique=False)
    op.create_index(op.f('ix_deadstock_items_sku'), 'deadstock_items', ['sku'], unique=False)
    op.create_index(op.f('ix_deadstock_items_sold_in_sale_id'), 'deadstock_items', ['sold_in_sale_id'], unique=False)

    # Add deadstock_item_id to sale_items
    op.add_column('sale_items', sa.Column('deadstock_item_id', sa.BigInteger(), nullable=True, comment='FK → deadstock_items.id — deadstock item consumed by this sale'))
    op.create_index(op.f('ix_sale_items_deadstock_item_id'), 'sale_items', ['deadstock_item_id'], unique=False)
    op.create_foreign_key(None, 'sale_items', 'deadstock_items', ['deadstock_item_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(None, 'sale_items', type_='foreignkey')
    op.drop_index(op.f('ix_sale_items_deadstock_item_id'), table_name='sale_items')
    op.drop_column('sale_items', 'deadstock_item_id')

    op.drop_index(op.f('ix_deadstock_items_sold_in_sale_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_sku'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_product_unit_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_original_sale_item_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_exchange_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_inventory_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_product_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_store_id'), table_name='deadstock_items')
    op.drop_index(op.f('ix_deadstock_items_admin_id'), table_name='deadstock_items')
    op.drop_table('deadstock_items')
