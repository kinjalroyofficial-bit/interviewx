"""drop interview_turns table

Revision ID: b2c9e4f1a6d7
Revises: f1b6a3d4c8e2
Create Date: 2026-04-21 14:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b2c9e4f1a6d7"
down_revision: Union[str, Sequence[str], None] = "f1b6a3d4c8e2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f("ix_interview_turns_response_id"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_timestamp"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_session_id"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_id"), table_name="interview_turns")
    op.drop_table("interview_turns")


def downgrade() -> None:
    op.create_table(
        "interview_turns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("response_id", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interview_turns_id"), "interview_turns", ["id"], unique=False)
    op.create_index(op.f("ix_interview_turns_session_id"), "interview_turns", ["session_id"], unique=False)
    op.create_index(op.f("ix_interview_turns_timestamp"), "interview_turns", ["timestamp"], unique=False)
    op.create_index(op.f("ix_interview_turns_response_id"), "interview_turns", ["response_id"], unique=False)
