# Main module: c06205ffd776_create_users_and_refresh_tokens_tables.py
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
revision: str = 'c06205ffd776'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None
def upgrade() -> None:
    op.create_table('users',
    sa.Column('user_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False, comment='Auto-generated immutable UUID primary key'),
    sa.Column('store_id', sa.UUID(), nullable=True, comment='FK to stores.store_id (constraint added later)'),
    sa.Column('full_name', sa.String(length=100), nullable=False, comment="Staff member's full name"),
    sa.Column('email', sa.String(length=150), nullable=False, comment='Login identifier — must be unique across the system'),
    sa.Column('password_hash', sa.Text(), nullable=False, comment="bcrypt hash (cost=12) of the user's password"),
    sa.Column('role', sa.String(length=30), nullable=False, comment='One of: admin, cashier, optometrist, manager'),
    sa.Column('is_active', sa.Boolean(), server_default=sa.text('true'), nullable=False, comment='Soft-disable flag — inactive users cannot log in'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Row creation timestamp (set by DB)'),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True, comment='Updated on every successful login'),
    sa.CheckConstraint("role IN ('admin', 'cashier', 'optometrist', 'manager')", name='ck_users_role_valid'),
    sa.PrimaryKeyConstraint('user_id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_table('refresh_tokens',
    sa.Column('token_id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False, comment='Auto-generated UUID primary key'),
    sa.Column('user_id', sa.UUID(), nullable=False, comment='FK → users.user_id — owner of this token'),
    sa.Column('token_hash', sa.Text(), nullable=False, comment='SHA-256 hash of the raw JWT refresh token'),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, comment='When this refresh token expires (UTC)'),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True, comment='NULL = still valid; timestamp = revoked at that time'),
    sa.Column('device_fingerprint', sa.String(length=64), nullable=True, comment='Optional browser/device identifier for audit'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False, comment='Row creation timestamp (set by DB)'),
    sa.ForeignKeyConstraint(['user_id'], ['users.user_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('token_id'),
    sa.UniqueConstraint('token_hash')
    )
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
def downgrade() -> None:
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
