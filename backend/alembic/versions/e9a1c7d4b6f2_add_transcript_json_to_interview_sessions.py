"""add transcript_json to interview_sessions

Revision ID: e9a1c7d4b6f2
Revises: d3f8c1a9b2e4
Create Date: 2026-04-21 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision = "e9a1c7d4b6f2"
down_revision = "d3f8c1a9b2e4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='transcript_json'
    """))

    if not result.fetchone():
        op.add_column(
            "interview_sessions",
            sa.Column("transcript_json", sa.Text(), nullable=True)
        )


def downgrade() -> None:
    conn = op.get_bind()

    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='transcript_json'
    """))

    if result.fetchone():
        op.drop_column("interview_sessions", "transcript_json")