"""migrate_to_fifo_inventory

Revision ID: b2c3d4e5f6a7
Revises: b0c1d2e3f4a5
Create Date: 2026-07-03 16:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'b0c1d2e3f4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Drop unique constraint from inventories
    op.drop_constraint('uq_inventory_owner_product', 'inventories', type_='unique')
    
    # 2. Add columns to inventories
    op.add_column('inventories', sa.Column('purchase_order_id', sa.BigInteger(), sa.ForeignKey('purchase_orders.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inventories', sa.Column('purchase_order_item_id', sa.BigInteger(), sa.ForeignKey('purchase_order_items.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inventories', sa.Column('supplier_id', sa.BigInteger(), sa.ForeignKey('suppliers.id', ondelete='SET NULL'), nullable=True))
    op.add_column('inventories', sa.Column('purchase_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('inventories', sa.Column('initial_quantity', sa.Integer(), nullable=True))
    op.add_column('inventories', sa.Column('purchase_cost', sa.Numeric(precision=10, scale=2), nullable=True))
    
    # 3. Add columns to sale_items
    op.add_column('sale_items', sa.Column('total_purchase_cost', sa.Numeric(precision=12, scale=2), nullable=True))
    op.add_column('sale_items', sa.Column('consumed_batches', sa.JSON(), nullable=True))
    
    # 4. Add columns to inventory_transactions
    op.add_column('inventory_transactions', sa.Column('consumed_batches', sa.JSON(), nullable=True))
    
    # 5. Data migration: seed initial values for existing inventories
    bind = op.get_bind()
    bind.execute(sa.text("""
        UPDATE inventories 
        SET initial_quantity = quantity,
            purchase_cost = COALESCE(last_purchase_price, (SELECT cost_price FROM products WHERE products.id = inventories.product_id), 0.00),
            purchase_date = COALESCE(last_stock_in_at, created_at, NOW())
    """))
    
    # 6. Alter columns to nullable=False for inventories
    op.alter_column('inventories', 'initial_quantity', nullable=False)
    op.alter_column('inventories', 'purchase_cost', nullable=False)
    op.alter_column('inventories', 'purchase_date', nullable=False, server_default=sa.func.now())


def downgrade() -> None:
    # 1. Drop columns from inventory_transactions
    op.drop_column('inventory_transactions', 'consumed_batches')
    
    # 2. Drop columns from sale_items
    op.drop_column('sale_items', 'consumed_batches')
    op.drop_column('sale_items', 'total_purchase_cost')
    
    # 3. Drop columns from inventories
    op.drop_column('inventories', 'purchase_cost')
    op.drop_column('inventories', 'initial_quantity')
    op.drop_column('inventories', 'purchase_date')
    op.drop_column('inventories', 'supplier_id')
    op.drop_column('inventories', 'purchase_order_item_id')
    op.drop_column('inventories', 'purchase_order_id')
    
    # 4. Re-create unique constraint
    op.create_unique_constraint('uq_inventory_owner_product', 'inventories', ['owner_type', 'owner_id', 'product_id'])
