"""add lab fields to repairs

Revision ID: b0c1d2e3f4a5
Revises: a0b1c2d3e4f5
Create Date: 2026-06-27 15:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b0c1d2e3f4a5'
down_revision: Union[str, Sequence[str], None] = 'a0b1c2d3e4f5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add lab tracking columns to repairs table
    op.add_column('repairs', sa.Column('lab_id', sa.BigInteger(), nullable=True))
    op.add_column('repairs', sa.Column('lab_name', sa.String(length=255), nullable=True))
    op.add_column('repairs', sa.Column('lab_status', sa.String(length=50), nullable=True))
    op.add_column('repairs', sa.Column('sent_to_lab_date', sa.Date(), nullable=True))
    op.add_column('repairs', sa.Column('expected_delivery_date', sa.Date(), nullable=True))

    # Add foreign key constraint and index
    op.create_foreign_key('fk_repairs_lab_id_labs', 'repairs', 'labs', ['lab_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_repairs_lab_id', 'repairs', ['lab_id'])


def downgrade() -> None:
    # Drop foreign key and index
    op.drop_constraint('fk_repairs_lab_id_labs', 'repairs', type_='foreignkey')
    op.drop_index('ix_repairs_lab_id', table_name='repairs')

    # Drop columns
    op.drop_column('repairs', 'expected_delivery_date')
    op.drop_column('repairs', 'sent_to_lab_date')
    op.drop_column('repairs', 'lab_status')
    op.drop_column('repairs', 'lab_name')
    op.drop_column('repairs', 'lab_id')
