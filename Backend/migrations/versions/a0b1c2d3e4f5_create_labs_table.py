"""create_labs_table

Revision ID: a0b1c2d3e4f5
Revises: 8a8b8c8d8e8f
Create Date: 2026-06-27 12:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a0b1c2d3e4f5'
down_revision: Union[str, Sequence[str], None] = '8a8b8c8d8e8f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create labs table
    op.create_table(
        'labs',
        sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column('admin_id', sa.BigInteger(), sa.ForeignKey('admins.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('contact_number', sa.String(length=50), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_labs_admin_id', 'labs', ['admin_id'])

    # 2. Add lab_id to sales table
    op.add_column('sales', sa.Column('lab_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('fk_sales_lab_id_labs', 'sales', 'labs', ['lab_id'], ['id'], ondelete='SET NULL')
    op.create_index('ix_sales_lab_id', 'sales', ['lab_id'])


def downgrade() -> None:
    # 1. Drop foreign key and column from sales table
    op.drop_constraint('fk_sales_lab_id_labs', 'sales', type_='foreignkey')
    op.drop_index('ix_sales_lab_id', 'sales')
    op.drop_column('sales', 'lab_id')

    # 2. Drop labs table
    op.drop_index('ix_labs_admin_id', 'labs')
    op.drop_table('labs')
