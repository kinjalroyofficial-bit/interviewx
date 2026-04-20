"""add project details to user profile

Revision ID: 7d4f2a9c8b11
Revises: 1a2b3c4d5e6f
Create Date: 2026-04-20 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "7d4f2a9c8b11"
down_revision: Union[str, Sequence[str], None] = "1a2b3c4d5e6f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("project_details", sa.Text(), nullable=True))
    op.add_column("user_profile_update_logs", sa.Column("project_details", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("user_profile_update_logs", "project_details")
    op.drop_column("users", "project_details")
