"""add input_type to interview_sessions

Revision ID: f4d2a1c9b8e7
Revises: 740b1d0408fe
Create Date: 2026-04-22 11:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = "f4d2a1c9b8e7"
down_revision: Union[str, Sequence[str], None] = "740b1d0408fe"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
          AND column_name='input_type'
    """))

    if not result.fetchone():
        op.add_column("interview_sessions", sa.Column("input_type", sa.String(), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    result = conn.execute(text("""
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name='interview_sessions'
          AND column_name='input_type'
    """))

    if result.fetchone():
        op.drop_column("interview_sessions", "input_type")
