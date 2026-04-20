"""add user profile fields and logs

Revision ID: 1a2b3c4d5e6f
Revises: 9f7e3c2a1b4d
Create Date: 2026-04-20 13:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1a2b3c4d5e6f"
down_revision: Union[str, Sequence[str], None] = "9f7e3c2a1b4d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("full_name", sa.String(), nullable=True))
    op.add_column("users", sa.Column("years_of_experience", sa.String(), nullable=True))
    op.add_column("users", sa.Column("technologies_worked_on", sa.String(), nullable=True))

    op.create_table(
        "user_profile_update_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=True),
        sa.Column("years_of_experience", sa.String(), nullable=True),
        sa.Column("technologies_worked_on", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_user_profile_update_logs_id"), "user_profile_update_logs", ["id"], unique=False)
    op.create_index(op.f("ix_user_profile_update_logs_user_id"), "user_profile_update_logs", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_profile_update_logs_user_id"), table_name="user_profile_update_logs")
    op.drop_index(op.f("ix_user_profile_update_logs_id"), table_name="user_profile_update_logs")
    op.drop_table("user_profile_update_logs")

    op.drop_column("users", "technologies_worked_on")
    op.drop_column("users", "years_of_experience")
    op.drop_column("users", "full_name")
