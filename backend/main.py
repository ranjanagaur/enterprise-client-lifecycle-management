
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from backend.database import SessionLocal
from backend import models, schemas

app = FastAPI(
    title="Enterprise Client Lifecycle Management API",
    description="Shared backend for customer and employee portals",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5173"
],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database session management
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def home():
    return {
        "message": "Enterprise CLM Backend is running successfully!",
        "status": "active"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Register a new client
@app.post("/clients/register", response_model=schemas.ClientResponse)
def register_client(
    client: schemas.ClientCreate,
    db: Session = Depends(get_db)
):
    new_client = models.Client(**client.model_dump())

    db.add(new_client)

    try:
        db.commit()
        db.refresh(new_client)
        return new_client

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This business email or registration number is already registered."
        )

# Retrieve all registered clients
@app.get("/clients", response_model=list[schemas.ClientResponse])
def get_clients(db: Session = Depends(get_db)):
    clients = db.query(models.Client).order_by(
        models.Client.id.asc()
    ).all()

    return clients
