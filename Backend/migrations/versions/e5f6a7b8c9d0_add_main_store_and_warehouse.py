"""Add Main Store & Warehouse feature

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-15 18:25:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd52f7d9b46ac'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add warehouse_enabled to admins
    op.add_column('admins', sa.Column('warehouse_enabled', sa.Boolean(), server_default='true', nullable=False, comment='Whether the separate warehouse feature is enabled. When False, Main Store acts as warehouse.'))
    
    # 2. Add is_main_store to stores
    op.add_column('stores', sa.Column('is_main_store', sa.Boolean(), server_default='false', nullable=False, comment="Whether this is the Admin's designated Main Store. Only one store per Admin can be True."))

    # 3. Backfill: set is_main_store = true for oldest active store per admin
    # We use a subquery/CTE to find the oldest active store for each admin
    update_sql = """
    UPDATE stores SET is_main_store = true
    WHERE id IN (
        SELECT DISTINCT ON (admin_id) id
        FROM stores
        WHERE deleted_at IS NULL
        ORDER BY admin_id, created_at ASC
    )
    """
    op.execute(update_sql)


def downgrade() -> None:
    op.drop_column('stores', 'is_main_store')
    op.drop_column('admins', 'warehouse_enabled')
