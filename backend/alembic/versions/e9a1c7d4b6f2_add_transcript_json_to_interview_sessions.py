"""add transcript_json to interview_sessions

Revision ID: e9a1c7d4b6f2
Revises: d3f8c1a9b2e4
Create Date: 2026-04-21 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "e9a1c7d4b6f2"
down_revision = "d3f8c1a9b2e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("transcript_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_sessions", "transcript_json")
