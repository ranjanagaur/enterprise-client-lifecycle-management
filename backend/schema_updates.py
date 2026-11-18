"""Add columns that create_all cannot add to tables that already exist."""

from sqlalchemy import inspect, text

from backend.database import engine


def apply_schema_updates() -> None:
    inspector = inspect(engine)
    statements: list[str] = []

    if inspector.has_table("users"):
        user_columns = {column["name"] for column in inspector.get_columns("users")}
        if "designation" not in user_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN designation VARCHAR(150)"
            )
        if "portal_role" not in user_columns:
            statements.append(
                "ALTER TABLE users ADD COLUMN portal_role VARCHAR(30) NOT NULL DEFAULT 'customer'"
            )

    if inspector.has_table("onboarding_applications"):
        application_columns = {
            column["name"]
            for column in inspector.get_columns("onboarding_applications")
        }
        if "assigned_employee_id" not in application_columns:
            statements.append(
                "ALTER TABLE onboarding_applications "
                "ADD COLUMN assigned_employee_id INTEGER REFERENCES users(id)"
            )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
