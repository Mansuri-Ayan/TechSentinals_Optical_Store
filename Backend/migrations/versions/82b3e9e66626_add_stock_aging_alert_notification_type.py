"""add_stock_aging_alert_notification_type

Revision ID: 82b3e9e66626
Revises: 8cd2afd01a97
Create Date: 2026-08-31 09:58:14.997025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_stock_aging_alert_notification_type

Revision ID: 82b3e9e66626
Revises: 8cd2afd01a97
Create Date: 2026-08-31 09:58:14.997025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '82b3e9e66626'
down_revision: Union[str, Sequence[str], None] = '8cd2afd01a97'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Check if value exists first
    bind = op.get_bind()
    result = bind.execute(sa.text(
        "SELECT 1 FROM pg_type t "
        "JOIN pg_enum e ON t.oid = e.enumtypid "
        "WHERE t.typname = 'notification_type_enum' AND e.enumlabel = 'STOCK_AGING_ALERT'"
    ))
    exists = result.scalar()
    if not exists:
        op.execute("COMMIT")
        op.execute("ALTER TYPE notification_type_enum ADD VALUE 'STOCK_AGING_ALERT'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
