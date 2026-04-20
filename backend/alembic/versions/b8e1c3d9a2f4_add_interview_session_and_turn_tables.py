"""add interview session and turn tables

Revision ID: b8e1c3d9a2f4
Revises: 7d4f2a9c8b11
Create Date: 2026-04-20 15:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b8e1c3d9a2f4"
down_revision: Union[str, Sequence[str], None] = "7d4f2a9c8b11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "interview_sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interview_sessions_id"), "interview_sessions", ["id"], unique=False)

    op.create_table(
        "interview_turns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(), nullable=False),
        sa.Column("role", sa.String(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["interview_sessions.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_interview_turns_id"), "interview_turns", ["id"], unique=False)
    op.create_index(op.f("ix_interview_turns_session_id"), "interview_turns", ["session_id"], unique=False)
    op.create_index(op.f("ix_interview_turns_timestamp"), "interview_turns", ["timestamp"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_interview_turns_timestamp"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_session_id"), table_name="interview_turns")
    op.drop_index(op.f("ix_interview_turns_id"), table_name="interview_turns")
    op.drop_table("interview_turns")

    op.drop_index(op.f("ix_interview_sessions_id"), table_name="interview_sessions")
    op.drop_table("interview_sessions")
