"""add report confirmations

Revision ID: 5d1e4c0f6a2c
Revises: b3f831c361ba
Create Date: 2026-04-01 14:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "5d1e4c0f6a2c"
down_revision: Union[str, Sequence[str], None] = "b3f831c361ba"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "report_confirmations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("report_id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.ForeignKeyConstraint(["report_id"], ["crime_reports.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("report_id", "user_id", name="uq_report_confirmation_report_user"),
    )
    op.create_index("ix_report_confirmations_report_id", "report_confirmations", ["report_id"], unique=False)
    op.create_index("ix_report_confirmations_user_id", "report_confirmations", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_report_confirmations_user_id", table_name="report_confirmations")
    op.drop_index("ix_report_confirmations_report_id", table_name="report_confirmations")
    op.drop_table("report_confirmations")
