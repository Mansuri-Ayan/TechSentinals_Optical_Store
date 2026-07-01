"""add_lab_tracking_to_sales

Revision ID: 8a8b8c8d8e8f
Revises: f3a1b2c4d5e6
Create Date: 2026-06-26 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8a8b8c8d8e8f'
down_revision: Union[str, Sequence[str], None] = '33d677afc8b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('sales')]
    
    if 'prescription_id' not in columns:
        op.add_column('sales', sa.Column('prescription_id', sa.BigInteger(), nullable=True))
        op.create_foreign_key('fk_sales_prescription_id_prescriptions', 'sales', 'prescriptions', ['prescription_id'], ['id'], ondelete='SET NULL')
    if 'lab_status' not in columns:
        op.add_column('sales', sa.Column('lab_status', sa.String(length=50), nullable=True))
    if 'lab_name' not in columns:
        op.add_column('sales', sa.Column('lab_name', sa.String(length=100), nullable=True))
    if 'sent_to_lab_date' not in columns:
        op.add_column('sales', sa.Column('sent_to_lab_date', sa.Date(), nullable=True))
    if 'expected_delivery_date' not in columns:
        op.add_column('sales', sa.Column('expected_delivery_date', sa.Date(), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = [col['name'] for col in inspector.get_columns('sales')]
    
    if 'prescription_id' in columns:
        op.drop_constraint('fk_sales_prescription_id_prescriptions', 'sales', type_='foreignkey')
        op.drop_column('sales', 'prescription_id')
    if 'expected_delivery_date' in columns:
        op.drop_column('sales', 'expected_delivery_date')
    if 'sent_to_lab_date' in columns:
        op.drop_column('sales', 'sent_to_lab_date')
    if 'lab_name' in columns:
        op.drop_column('sales', 'lab_name')
    if 'lab_status' in columns:
        op.drop_column('sales', 'lab_status')
