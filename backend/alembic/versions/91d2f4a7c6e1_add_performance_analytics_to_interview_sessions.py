"""add performance_analytics_json to interview_sessions

Revision ID: 91d2f4a7c6e1
Revises: 740b1d0408fe, c9d4e8f2a1b0
Create Date: 2026-04-22 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "91d2f4a7c6e1"
down_revision: Union[str, Sequence[str], None] = ("740b1d0408fe", "c9d4e8f2a1b0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='performance_analytics_json'
    """))

    if not result.fetchone():
        op.add_column(
            "interview_sessions",
            sa.Column("performance_analytics_json", sa.Text(), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
        AND column_name='performance_analytics_json'
    """))

    if result.fetchone():
        op.drop_column("interview_sessions", "performance_analytics_json")
