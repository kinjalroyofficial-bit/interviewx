"""drop user profile update logs table

Revision ID: c7f3b2a9d114
Revises: bc91a4f7e201
Create Date: 2026-04-27 00:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7f3b2a9d114'
down_revision: Union[str, Sequence[str], None] = 'bc91a4f7e201'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index(op.f('ix_user_profile_update_logs_user_id'), table_name='user_profile_update_logs')
    op.drop_index(op.f('ix_user_profile_update_logs_id'), table_name='user_profile_update_logs')
    op.drop_table('user_profile_update_logs')


def downgrade() -> None:
    op.create_table(
        'user_profile_update_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('full_name', sa.String(), nullable=True),
        sa.Column('years_of_experience', sa.String(), nullable=True),
        sa.Column('technologies_worked_on', sa.String(), nullable=True),
        sa.Column('project_details', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_profile_update_logs_id'), 'user_profile_update_logs', ['id'], unique=False)
    op.create_index(op.f('ix_user_profile_update_logs_user_id'), 'user_profile_update_logs', ['user_id'], unique=False)
