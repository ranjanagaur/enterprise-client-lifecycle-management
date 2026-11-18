"""Create organisation and application rows for client registrations.

The clients table remains the registration record. These rows give each
client a stable application reference without changing the register API.
"""

from sqlalchemy.orm import Session

from backend import models


def attach_foundation_records(
    db: Session,
    client: models.Client,
) -> None:
    organisation = (
        db.query(models.Organisation)
        .filter(models.Organisation.client_id == client.id)
        .one_or_none()
    )

    if organisation is None:
        organisation = models.Organisation(
            client_id=client.id,
            legal_name=client.company_name,
            registration_number=client.registration_number,
            country_of_incorporation=client.country,
        )
        db.add(organisation)
        db.flush()

    has_application = (
        db.query(models.OnboardingApplication)
        .filter(models.OnboardingApplication.organisation_id == organisation.id)
        .first()
    )

    if has_application is None:
        db.add(
            models.OnboardingApplication(
                reference=f"APP-{client.id:05d}",
                organisation_id=organisation.id,
                status=client.onboarding_status,
            )
        )


def ensure_foundation_records(db: Session) -> int:
    """Backfill organisations and applications for clients that do not have them."""

    created = 0
    clients = db.query(models.Client).order_by(models.Client.id).all()

    for client in clients:
        organisation = (
            db.query(models.Organisation)
            .filter(models.Organisation.client_id == client.id)
            .one_or_none()
        )
        if organisation is None:
            created += 1

        attach_foundation_records(db, client)

    db.commit()
    return created
