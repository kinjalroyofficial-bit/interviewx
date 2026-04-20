"""add response_id to interview turns

Revision ID: f1b6a3d4c8e2
Revises: e4a7d2c9f1b3
Create Date: 2026-04-20 17:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1b6a3d4c8e2"
down_revision: Union[str, Sequence[str], None] = "e4a7d2c9f1b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("interview_turns", sa.Column("response_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_interview_turns_response_id"), "interview_turns", ["response_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_interview_turns_response_id"), table_name="interview_turns")
    op.drop_column("interview_turns", "response_id")
