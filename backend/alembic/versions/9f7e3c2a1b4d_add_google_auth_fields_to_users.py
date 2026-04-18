"""add google auth fields to users

Revision ID: 9f7e3c2a1b4d
Revises: 4b7f6a9e2c11
Create Date: 2026-04-18 10:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9f7e3c2a1b4d"
down_revision: Union[str, Sequence[str], None] = "4b7f6a9e2c11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email", sa.String(), nullable=True))
    op.add_column("users", sa.Column("google_id", sa.String(), nullable=True))
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(), nullable=False, server_default="local"),
    )
    op.alter_column("users", "password", existing_type=sa.String(), nullable=True)

    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_google_id"), "users", ["google_id"], unique=True)

    op.execute("UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL")
    op.alter_column("users", "auth_provider", server_default=None)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_google_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")

    op.alter_column("users", "password", existing_type=sa.String(), nullable=False)
    op.drop_column("users", "auth_provider")
    op.drop_column("users", "google_id")
    op.drop_column("users", "email")
