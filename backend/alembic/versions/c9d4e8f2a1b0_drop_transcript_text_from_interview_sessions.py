"""drop transcript_text from interview_sessions

Revision ID: c9d4e8f2a1b0
Revises: b2c9e4f1a6d7
Create Date: 2026-04-21 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "c9d4e8f2a1b0"
down_revision: Union[str, Sequence[str], None] = "b2c9e4f1a6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
          AND column_name='transcript_text'
    """))

    if result.fetchone():
        op.drop_column("interview_sessions", "transcript_text")


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
          AND column_name='transcript_text'
    """))

    if not result.fetchone():
        op.add_column("interview_sessions", sa.Column("transcript_text", sa.Text(), nullable=True))
