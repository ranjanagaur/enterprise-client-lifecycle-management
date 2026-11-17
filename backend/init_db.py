
from backend.database import engine, Base
from backend import models

# Create all tables defined in our models
Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")

