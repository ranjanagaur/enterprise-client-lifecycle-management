
import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL
from sqlalchemy.orm import sessionmaker, declarative_base

# Load database settings from the .env file
load_dotenv()

# Read database settings
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")

# Check that all settings are available
required_settings = {
    "DB_USER": DB_USER,
    "DB_PASSWORD": DB_PASSWORD,
    "DB_HOST": DB_HOST,
    "DB_PORT": DB_PORT,
    "DB_NAME": DB_NAME,
}

missing_settings = [
    key for key, value in required_settings.items() if not value
]

if missing_settings:
    raise RuntimeError(
        f"Missing database settings in .env: {', '.join(missing_settings)}"
    )

# Build the PostgreSQL connection URL safely
database_url = URL.create(
    drivername="postgresql+psycopg",
    username=DB_USER,
    password=DB_PASSWORD,
    host=DB_HOST,
    port=int(DB_PORT),
    database=DB_NAME,
)

# Create the database engine
engine = create_engine(
    database_url,
    pool_pre_ping=True
)

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for database models
Base = declarative_base()
