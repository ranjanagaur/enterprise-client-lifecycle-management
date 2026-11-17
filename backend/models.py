
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func

from backend.database import Base


class Client(Base):
    __tablename__ = "clients"

    # Unique ID for every client
    id = Column(Integer, primary_key=True, index=True)

    # Company information
    company_name = Column(String(200), nullable=False, index=True)
    registration_number = Column(String(100), unique=True, nullable=True)
    country = Column(String(100), nullable=False)

    # Primary contact information
    contact_name = Column(String(150), nullable=False)
    business_email = Column(String(255), unique=True, nullable=False)
    contact_number = Column(String(30), nullable=False)

    # Onboarding information
    onboarding_status = Column(
        String(50),
        nullable=False,
        default="Pending"
    )

    # Automatically records when the client is created
    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )
