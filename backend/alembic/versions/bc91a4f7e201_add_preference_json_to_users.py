"""add preference json to users

Revision ID: bc91a4f7e201
Revises: ab12cd34ef56
Create Date: 2026-04-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bc91a4f7e201'
down_revision: Union[str, Sequence[str], None] = 'ab12cd34ef56'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('preference_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'preference_json')
