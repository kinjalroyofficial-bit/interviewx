"""add status and ended_at to interview sessions

Revision ID: a7d3e1f9c4b2
Revises: f1b6a3d4c8e2
Create Date: 2026-04-20 18:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a7d3e1f9c4b2"
down_revision: Union[str, Sequence[str], None] = "f1b6a3d4c8e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("status", sa.String(), nullable=False, server_default="active"))
    op.add_column("interview_sessions", sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_sessions", "ended_at")
    op.drop_column("interview_sessions", "status")
