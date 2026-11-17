
from pydantic import BaseModel, EmailStr, Field


class ClientCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=200)
    registration_number: str | None = None
    country: str = Field(min_length=2, max_length=100)

    contact_name: str = Field(min_length=2, max_length=150)
    business_email: EmailStr
    contact_number: str = Field(min_length=7, max_length=30)


class ClientResponse(BaseModel):
    id: int
    company_name: str
    registration_number: str | None
    country: str
    contact_name: str
    business_email: EmailStr
    contact_number: str
    onboarding_status: str

    class Config:
        from_attributes = True
