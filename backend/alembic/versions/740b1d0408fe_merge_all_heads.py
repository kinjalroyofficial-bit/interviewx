"""merge all heads

Revision ID: 740b1d0408fe
Revises: a7d3e1f9c4b2, b2c9e4f1a6d7, e9a1c7d4b6f2
Create Date: 2026-04-21 15:42:14.157585

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '740b1d0408fe'
down_revision: Union[str, Sequence[str], None] = ('a7d3e1f9c4b2', 'b2c9e4f1a6d7', 'e9a1c7d4b6f2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
