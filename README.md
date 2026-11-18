# Enterprise Client Lifecycle Management (CLM)

An independent portfolio project demonstrating a digital corporate client onboarding and lifecycle management platform.

## 1. Project Overview

Enterprise CLM is a web-based application designed to demonstrate how corporate clients can register their businesses, submit onboarding information, and monitor application progress, while internal employees can review and manage client applications through a central dashboard.

The project uses synthetic demonstration data and is developed independently for learning and portfolio purposes. It is not a live banking service or an implementation of any financial institution's internal systems.

## 2. Business Problem

Corporate onboarding can involve multiple steps, including:
- Collecting company and contact information.
- Capturing business registration details.
- Gathering KYC documentation.
- Reviewing client applications.
- Monitoring onboarding progress.

This project demonstrates how a centralised digital platform could organise these activities and improve visibility across the onboarding process.

## 3. Key Features

### Customer Portal
- Corporate client registration interface.
- Business information collection.
- Guided onboarding experience.
- Application tracking concept.

### Employee Portal
- Centralised employee dashboard.
- Client application overview.
- Live client records retrieved from the backend API.
- Client directory with search functionality.
- Risk assessment interface demonstration.

### Backend
- REST API developed using FastAPI.
- Client registration endpoint.
- Client listing endpoint.
- PostgreSQL database integration.
- SQLAlchemy ORM for database operations.
- Input validation using Pydantic schemas.

## 4. Technology Stack

| Layer | Technology |
|---|---|
| Customer Portal | React, TypeScript |
| Employee Portal | React, TypeScript |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| API Documentation | Swagger UI / OpenAPI |
| Development Environment | Visual Studio Code |
| Version Control | Git and GitHub |

## 5. System Architecture

The application follows a client-server architecture.

```text
Customer Portal (React + TypeScript)
                 |
                 |
             FastAPI
                 |
                 |
          PostgreSQL
                 |
                 |
        Employee Portal
       (React + TypeScript)
```

Both portals communicate with a shared backend API. The backend manages client records and interacts with the PostgreSQL database.

## 6. Project Structure

```text
enterprise-client-lifecycle-management/
│
├── backend/
│   ├── database.py
│   ├── init_db.py
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── test_db.py
│
├── customer-portal/
│   └── src/
│
├── frontend/
│   └── src/
│
├── .gitignore
└── README.md
```

## 7. Local Setup

### Prerequisites
- Python 3.11
- Node.js and npm
- PostgreSQL
- Git

### Backend Setup

Create and activate a Python virtual environment, then install the required packages.

Configure the database connection through environment variables in a local `.env` file.

Apply the database migration from the project root. This creates `users`, `organisations`, and `onboarding_applications`, and copies each existing client into an organisation and an application. The `clients` table is left in place.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m alembic -c backend/alembic.ini upgrade head
```

Start the FastAPI server:

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

Run that command from the project root. The API imports the `backend` package, so it needs to be started from this folder.

Open API documentation:

http://localhost:8000/docs

### Customer Portal

```powershell
cd customer-portal
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

Open:

http://localhost:5174

The customer portal calls the hosted API unless `customer-portal/.env` sets `VITE_API_URL`. Use `http://127.0.0.1:8000` when you want registration to hit the local API. Copy `customer-portal/.env.example` to `customer-portal/.env` and change that value. Restart the dev server after changing it.

### Employee Portal

```powershell
cd frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

http://localhost:5173

The employee portal calls `http://127.0.0.1:8000` unless `frontend/.env` sets `VITE_API_URL`. Copy `frontend/.env.example` when you need a different API address, then restart the dev server.

## 8. Security Considerations

- Database credentials are stored in a local environment file.
- Environment files are excluded through `.gitignore`.
- Demonstration data is synthetic.
- Authentication and production-grade authorisation are not yet implemented.
- The current application is intended for local demonstration and learning, not production banking use.

## 9. Future Enhancements

- Secure employee and customer authentication.
- Role-based access control.
- KYC document upload and management.
- Beneficial ownership information.
- Approval workflows.
- Client risk scoring and due diligence.
- Application status notifications.
- Audit logs and activity history.
- Deployment to a cloud environment.
- Exploration of Microsoft Dynamics 365 and Power Platform alignment.

## 10. Project Status

**Current milestone:** Registration and the client list remain in place. Each client also has an organisation profile and an onboarding application reference (`APP-00001`). Login is not implemented yet. `GET /applications` is open in the same way as `GET /clients`.

**Project type:** Independent software development portfolio project.

**Data:** Synthetic demonstration data only.

## 11. Repository

GitHub: https://github.com/ranjanagaur/enterprise-client-lifecycle-management
