"""add settings snapshot to interview sessions

Revision ID: e4a7d2c9f1b3
Revises: c2f4d8a1b7e9
Create Date: 2026-04-20 16:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e4a7d2c9f1b3"
down_revision: Union[str, Sequence[str], None] = "c2f4d8a1b7e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("selected_mode", sa.String(), nullable=True))
    op.add_column("interview_sessions", sa.Column("selected_topics", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_sessions", "selected_topics")
    op.drop_column("interview_sessions", "selected_mode")
