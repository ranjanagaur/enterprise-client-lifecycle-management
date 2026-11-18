"""Add users, organisations, and onboarding applications.

Revision ID: b7c1a9e4d2f0
Revises:
Create Date: 2026-11-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c1a9e4d2f0"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("password_hash", sa.String(length=255), nullable=False),
            sa.Column("full_name", sa.String(length=150), nullable=False),
            sa.Column(
                "preferred_language",
                sa.String(length=10),
                nullable=False,
                server_default="en",
            ),
            sa.Column(
                "is_active",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_users_id", "users", ["id"])
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not inspector.has_table("organisations"):
        op.create_table(
            "organisations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("client_id", sa.Integer(), nullable=False),
            sa.Column("legal_name", sa.String(length=200), nullable=False),
            sa.Column("trading_name", sa.String(length=200), nullable=True),
            sa.Column("registration_number", sa.String(length=100), nullable=True),
            sa.Column("country_of_incorporation", sa.String(length=100), nullable=False),
            sa.Column("registered_address", sa.String(length=500), nullable=True),
            sa.Column(
                "principal_place_of_business",
                sa.String(length=500),
                nullable=True,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
            sa.UniqueConstraint("client_id"),
        )
        op.create_index("ix_organisations_id", "organisations", ["id"])
        op.create_index("ix_organisations_client_id", "organisations", ["client_id"])
        op.create_index("ix_organisations_legal_name", "organisations", ["legal_name"])
        op.create_index(
            "ix_organisations_registration_number",
            "organisations",
            ["registration_number"],
        )

    if not inspector.has_table("onboarding_applications"):
        op.create_table(
            "onboarding_applications",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("reference", sa.String(length=30), nullable=False),
            sa.Column("organisation_id", sa.Integer(), nullable=False),
            sa.Column(
                "status",
                sa.String(length=50),
                nullable=False,
                server_default="Pending",
            ),
            sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["organisation_id"], ["organisations.id"]),
            sa.UniqueConstraint("reference"),
        )
        op.create_index(
            "ix_onboarding_applications_id",
            "onboarding_applications",
            ["id"],
        )
        op.create_index(
            "ix_onboarding_applications_reference",
            "onboarding_applications",
            ["reference"],
            unique=True,
        )
        op.create_index(
            "ix_onboarding_applications_organisation_id",
            "onboarding_applications",
            ["organisation_id"],
        )
        op.create_index(
            "ix_onboarding_applications_status",
            "onboarding_applications",
            ["status"],
        )

    if inspector.has_table("clients"):
        op.execute(
            """
            INSERT INTO organisations (
                client_id,
                legal_name,
                registration_number,
                country_of_incorporation,
                created_at
            )
            SELECT
                clients.id,
                clients.company_name,
                clients.registration_number,
                clients.country,
                clients.created_at
            FROM clients
            WHERE NOT EXISTS (
                SELECT 1
                FROM organisations
                WHERE organisations.client_id = clients.id
            )
            """
        )
        op.execute(
            """
            INSERT INTO onboarding_applications (
                reference,
                organisation_id,
                status,
                created_at,
                updated_at
            )
            SELECT
                'APP-' || LPAD(clients.id::text, 5, '0'),
                organisations.id,
                clients.onboarding_status,
                clients.created_at,
                clients.created_at
            FROM clients
            JOIN organisations ON organisations.client_id = clients.id
            WHERE NOT EXISTS (
                SELECT 1
                FROM onboarding_applications
                WHERE onboarding_applications.organisation_id = organisations.id
            )
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if inspector.has_table("onboarding_applications"):
        op.drop_table("onboarding_applications")
    if inspector.has_table("organisations"):
        op.drop_table("organisations")
    if inspector.has_table("users"):
        op.drop_table("users")
