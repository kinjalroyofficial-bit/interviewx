"""add credits to users

Revision ID: d494537e7ceb
Revises: a370342dad5d
Create Date: 2026-04-22 14:13:04.878916

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd494537e7ceb'
down_revision: Union[str, Sequence[str], None] = 'a370342dad5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('credits', sa.Integer(), nullable=True)
    )

    op.execute("UPDATE users SET credits = 0 WHERE credits IS NULL")

    op.alter_column('users', 'credits', nullable=False)

def downgrade() -> None:
    op.drop_column('users', 'credits')
