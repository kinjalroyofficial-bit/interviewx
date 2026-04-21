"""add transcript_text to interview_sessions

Revision ID: d3f8c1a9b2e4
Revises: e4a7d2c9f1b3
Create Date: 2026-04-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "d3f8c1a9b2e4"
down_revision = "e4a7d2c9f1b3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='transcript_text'
    """))

    if not result.fetchone():
        op.add_column(
            "interview_sessions",
            sa.Column("transcript_text", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='transcript_text'
    """))

    if result.fetchone():
        op.drop_column("interview_sessions", "transcript_text")