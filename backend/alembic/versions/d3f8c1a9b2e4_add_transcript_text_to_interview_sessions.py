"""add transcript_text to interview_sessions

Revision ID: d3f8c1a9b2e4
Revises: e4a7d2c9f1b3
Create Date: 2026-04-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "d3f8c1a9b2e4"
down_revision = "e4a7d2c9f1b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("transcript_text", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("interview_sessions", "transcript_text")
