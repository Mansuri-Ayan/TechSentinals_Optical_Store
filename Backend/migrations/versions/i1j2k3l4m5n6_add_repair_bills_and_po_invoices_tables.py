"""add_repair_bills_and_po_invoices_tables

Revision ID: i1j2k3l4m5n6
Revises: h1a2b3c4d5e6
Create Date: 2026-09-05
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'i1j2k3l4m5n6'
down_revision = 'b224edc31216'


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'repair_bills' not in tables:
        op.create_table(
            'repair_bills',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('repair_id', sa.BigInteger(), sa.ForeignKey('repairs.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('bill_number', sa.String(length=50), nullable=False, unique=True),
            sa.Column('html_content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_repair_bills_repair_id'), 'repair_bills', ['repair_id'], unique=True)
        op.create_index(op.f('ix_repair_bills_bill_number'), 'repair_bills', ['bill_number'], unique=True)

    if 'purchase_order_invoices' not in tables:
        op.create_table(
            'purchase_order_invoices',
            sa.Column('id', sa.BigInteger(), primary_key=True, autoincrement=True),
            sa.Column('purchase_order_id', sa.BigInteger(), sa.ForeignKey('purchase_orders.id', ondelete='CASCADE'), nullable=False, unique=True),
            sa.Column('invoice_number', sa.String(length=100), nullable=False, unique=True),
            sa.Column('is_final', sa.Boolean(), nullable=False, server_default='false'),
            sa.Column('html_content', sa.Text(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        )
        op.create_index(op.f('ix_purchase_order_invoices_purchase_order_id'), 'purchase_order_invoices', ['purchase_order_id'], unique=True)
        op.create_index(op.f('ix_purchase_order_invoices_invoice_number'), 'purchase_order_invoices', ['invoice_number'], unique=True)


def downgrade() -> None:
    op.drop_table('purchase_order_invoices')
    op.drop_table('repair_bills')
