"""add_verification_token_to_otp_verifications

Revision ID: h1a2b3c4d5e6
Revises: g0a1b2c3d4e5
Create Date: 2026-09-03 11:25:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'h1a2b3c4d5e6'
down_revision = 'g0a1b2c3d4e5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('otp_verifications', sa.Column('verification_token', sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column('otp_verifications', 'verification_token')
