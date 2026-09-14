"""add_processing_type_to_sale_items

Revision ID: d52f7d9b46ac
Revises: i1j2k3l4m5n6
Create Date: 2026-09-13 19:13:15.284520

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd52f7d9b46ac'
down_revision: Union[str, Sequence[str], None] = 'i1j2k3l4m5n6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'sale_items',
        sa.Column(
            'processing_type',
            sa.String(length=20),
            server_default='ORDER',
            nullable=False,
            comment='DIRECT or ORDER — resolved at sale creation from product.sales_workflow_type'
        )
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('sale_items', 'processing_type')

