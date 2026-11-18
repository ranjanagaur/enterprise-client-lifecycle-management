"""Add the onboarding workspace tables and account columns.

Revision ID: c4e8b1a92d10
Revises: b7c1a9e4d2f0
Create Date: 2026-11-18

"""

from typing import Sequence, Union

revision: str = "c4e8b1a92d10"
down_revision: Union[str, Sequence[str], None] = "b7c1a9e4d2f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    from backend.database import Base, engine
    from backend import models  # noqa: F401
    from backend.schema_updates import apply_schema_updates

    Base.metadata.create_all(bind=engine)
    apply_schema_updates()


def downgrade() -> None:
    pass
