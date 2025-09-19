"""add greening fields to history_data

Revision ID: 80f54a220182
Revises: c45d5863eace
Create Date: 2025-09-19 12:40:31.694593

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = '80f54a220182'
down_revision = 'c45d5863eace'
branch_labels = None
depends_on = None


def upgrade():
    # 僅新增 history_data 的兩個欄位，避免動到現有索引/外鍵
    with op.batch_alter_table('history_data', schema=None) as batch_op:
        batch_op.add_column(sa.Column('Greening_Area_Ping', sa.Float(), nullable=True))
        batch_op.add_column(sa.Column('Greening_Area_m2', sa.Float(), nullable=True))


def downgrade():
    # 僅移除 history_data 新增的欄位
    with op.batch_alter_table('history_data', schema=None) as batch_op:
        batch_op.drop_column('Greening_Area_m2')
        batch_op.drop_column('Greening_Area_Ping')
