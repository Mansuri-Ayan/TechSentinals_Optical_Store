"""merge multiple heads

Revision ID: 5f55d3dfb54a
Revises: 85e7588a5867, b2c3d4e5f6a7
Create Date: 2026-07-18 13:36:14.276552

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5f55d3dfb54a'
down_revision: Union[str, Sequence[str], None] = ('85e7588a5867', 'b2c3d4e5f6a7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
