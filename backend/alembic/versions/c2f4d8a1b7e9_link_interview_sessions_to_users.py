"""link interview sessions to users

Revision ID: c2f4d8a1b7e9
Revises: b8e1c3d9a2f4
Create Date: 2026-04-20 15:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c2f4d8a1b7e9"
down_revision: Union[str, Sequence[str], None] = "b8e1c3d9a2f4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interview_sessions", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_index(op.f("ix_interview_sessions_user_id"), "interview_sessions", ["user_id"], unique=False)
    op.create_foreign_key(
        "fk_interview_sessions_user_id_users",
        "interview_sessions",
        "users",
        ["user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_interview_sessions_user_id_users", "interview_sessions", type_="foreignkey")
    op.drop_index(op.f("ix_interview_sessions_user_id"), table_name="interview_sessions")
    op.drop_column("interview_sessions", "user_id")
