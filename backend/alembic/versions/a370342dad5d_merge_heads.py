"""merge heads

Revision ID: a370342dad5d
Revises: 91d2f4a7c6e1, f4d2a1c9b8e7
Create Date: 2026-04-22 12:07:39.899076

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a370342dad5d'
down_revision: Union[str, Sequence[str], None] = ('91d2f4a7c6e1', 'f4d2a1c9b8e7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
