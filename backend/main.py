
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import SessionLocal, engine, Base
from backend.foundation import attach_foundation_records, ensure_foundation_records
from backend.portal import create_customer_account, router as portal_router
from backend.schema_updates import apply_schema_updates
from backend.security import get_employee
from backend.seed import seed_catalogue, seed_demo_accounts
from backend import models, schemas


# --------------------------------------------------
# DATABASE INITIALISATION
# --------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables, then backfill organisation and application rows.
    Base.metadata.create_all(bind=engine)
    apply_schema_updates()

    db = SessionLocal()
    try:
        created = ensure_foundation_records(db)
        seed_catalogue(db)
        seed_demo_accounts(db)
        print("Database tables created successfully!")
        print(f"Foundation records created for existing clients: {created}")
    finally:
        db.close()

    yield


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="Enterprise Client Lifecycle Management API",
    description="Shared backend for customer and employee portals",
    version="1.0.0",
    lifespan=lifespan
)

app.include_router(portal_router)


# --------------------------------------------------
# CORS CONFIGURATION
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local Customer Portal
        "http://localhost:5174",
        "http://127.0.0.1:5174",

        # Local Employee Portal
        "http://localhost:5173",
        "http://127.0.0.1:5173",

        # Deployed Customer Portal on Vercel
        "https://enterprise-clm-customer-portal-n3o3cb6vx.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# DATABASE SESSION
# --------------------------------------------------

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# HOME ENDPOINT
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Enterprise CLM Backend is running successfully!",
        "status": "active"
    }


# --------------------------------------------------
# HEALTH CHECK ENDPOINT
# --------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "Enterprise CLM API is operational"
    }


# --------------------------------------------------
# REGISTER NEW CLIENT
# --------------------------------------------------

@app.post("/clients/register", response_model=schemas.ClientResponse)
def register_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db)
):
    new_client = models.Client(
        company_name=client.company_name,
        registration_number=client.registration_number,
        country=client.country,
        contact_name=client.contact_name,
        business_email=client.business_email,
        contact_number=client.contact_number,
        onboarding_status="Pending"
    )

    try:
        db.add(new_client)
        db.flush()
        attach_foundation_records(db, new_client)
        create_customer_account(
            db,
            new_client,
            client.password,
            client.designation,
            client.trading_name,
        )
        db.commit()
        db.refresh(new_client)

        return new_client

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="This email or registration number is already registered."
        )


# --------------------------------------------------
# GET ALL REGISTERED CLIENTS
# --------------------------------------------------

@app.get("/clients", response_model=list[schemas.ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    employee: models.User = Depends(get_employee),
):
    clients = db.query(models.Client).all()

    return clients


# --------------------------------------------------
# LIST ONBOARDING APPLICATIONS
# --------------------------------------------------

@app.get("/applications", response_model=list[schemas.ApplicationResponse])
def get_applications(
    db: Session = Depends(get_db),
    employee: models.User = Depends(get_employee),
):
    """Read-only list used to verify the new application records.

    This endpoint is open, like GET /clients, until authentication is added.
    """

    rows = (
        db.query(models.OnboardingApplication, models.Organisation)
        .join(
            models.Organisation,
            models.OnboardingApplication.organisation_id == models.Organisation.id,
        )
        .order_by(models.OnboardingApplication.id.desc())
        .all()
    )

    return [
        schemas.ApplicationResponse(
            id=application.id,
            reference=application.reference,
            status=application.status,
            organisation_id=organisation.id,
            client_id=organisation.client_id,
            legal_name=organisation.legal_name,
            country_of_incorporation=organisation.country_of_incorporation,
            created_at=application.created_at,
        )
        for application, organisation in rows
    ]
