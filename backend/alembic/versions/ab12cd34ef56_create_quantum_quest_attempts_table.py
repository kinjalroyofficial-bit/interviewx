"""create quantum quest attempts table

Revision ID: ab12cd34ef56
Revises: d494537e7ceb
Create Date: 2026-04-24 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab12cd34ef56'
down_revision: Union[str, Sequence[str], None] = 'd494537e7ceb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'quantum_quest_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('topic', sa.String(), nullable=True),
        sa.Column('difficulty', sa.String(), nullable=True),
        sa.Column('total_questions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('correct_answers', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('score_percentage', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('answers_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_quantum_quest_attempts_id'), 'quantum_quest_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_quantum_quest_attempts_user_id'), 'quantum_quest_attempts', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_quantum_quest_attempts_user_id'), table_name='quantum_quest_attempts')
    op.drop_index(op.f('ix_quantum_quest_attempts_id'), table_name='quantum_quest_attempts')
    op.drop_table('quantum_quest_attempts')
