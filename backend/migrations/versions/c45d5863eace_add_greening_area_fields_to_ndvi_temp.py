"""add greening area fields to NDVI_Temp

Revision ID: c45d5863eace
Revises: 
Create Date: 2025-09-17 12:55:23.496716

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'c45d5863eace'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """Safe/idempotent upgrade: 只新增需要的欄位，避免刪除外鍵所需的索引。"""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # 如無 user 表則建立（若已存在則跳過）
    tables = set(inspector.get_table_names())
    if 'user' not in tables:
        op.create_table(
            'user',
            sa.Column('id', sa.Integer(), primary_key=True, nullable=False),
            sa.Column('username', sa.String(length=64)),
            sa.Column('email', sa.String(length=120)),
            sa.Column('password_hash', sa.String(length=128)),
        )
        with op.batch_alter_table('user', schema=None) as batch_op:
            batch_op.create_index('ix_user_email', ['email'], unique=True)
            batch_op.create_index('ix_user_username', ['username'], unique=True)

    # 僅對 NDVI_Temp 新增兩個欄位（若不存在）
    if 'NDVI_Temp' in tables:
        existing_cols = {c['name'] for c in inspector.get_columns('NDVI_Temp')}
        if 'Greening_Area_Ping' not in existing_cols:
            op.add_column('NDVI_Temp', sa.Column('Greening_Area_Ping', sa.Float(), nullable=True))
        if 'Greening_Area_m2' not in existing_cols:
            op.add_column('NDVI_Temp', sa.Column('Greening_Area_m2', sa.Float(), nullable=True))

    # 不更動索引/外鍵/型別，避免影響既有相依。


def downgrade():
    """Safe downgrade: 僅移除本次新增的欄位，並在 user 表是本遷移建立時才刪除。"""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())

    if 'NDVI_Temp' in tables:
        existing_cols = {c['name'] for c in inspector.get_columns('NDVI_Temp')}
        if 'Greening_Area_m2' in existing_cols:
            op.drop_column('NDVI_Temp', 'Greening_Area_m2')
        if 'Greening_Area_Ping' in existing_cols:
            op.drop_column('NDVI_Temp', 'Greening_Area_Ping')

    # 僅在 user 表存在且確定是此遷移建立時才移除（保守起見，不自動刪除）。
    # 如需移除，請手動處理或另開遷移腳本。
