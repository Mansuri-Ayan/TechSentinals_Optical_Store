"""create_otp_verifications_table

Revision ID: g0a1b2c3d4e5
Revises: f3a1b2c4d5e6
Create Date: 2026-09-03 10:30:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'g0a1b2c3d4e5'
down_revision = 'b9efad8eb625'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'otp_verifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('otp_hash', sa.String(length=255), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('resend_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('last_sent_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_invalidated', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_otp_verifications_email'), 'otp_verifications', ['email'], unique=False)
    op.create_index(op.f('ix_otp_verifications_id'), 'otp_verifications', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_otp_verifications_id'), table_name='otp_verifications')
    op.drop_index(op.f('ix_otp_verifications_email'), table_name='otp_verifications')
    op.drop_table('otp_verifications')
