"""default_warehouse_enabled_false

Revision ID: a05c010ecf66
Revises: e5f6a7b8c9d0
Create Date: 2026-09-20 21:16:44.591210

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a05c010ecf66'
down_revision: Union[str, Sequence[str], None] = 'e5f6a7b8c9d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema: default warehouse_enabled to false, update existing admins, and backfill main stores."""
    # 1. Change server_default on admins.warehouse_enabled to false
    op.alter_column('admins', 'warehouse_enabled', server_default=sa.text('false'))

    # 2. Update existing admins to false
    op.execute("UPDATE admins SET warehouse_enabled = false;")

    # 3. Ensure every admin with active stores has a designated main store
    backfill_sql = """
    UPDATE stores SET is_main_store = true
    WHERE id IN (
        SELECT DISTINCT ON (admin_id) id
        FROM stores
        WHERE deleted_at IS NULL AND is_active = true
        ORDER BY admin_id, created_at ASC
    )
    AND admin_id NOT IN (
        SELECT DISTINCT admin_id
        FROM stores
        WHERE is_main_store = true
          AND deleted_at IS NULL
    );
    """
    op.execute(backfill_sql)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('admins', 'warehouse_enabled', server_default=sa.text('true'))
