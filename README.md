# InterviewX Monorepo Setup

This repository contains:

- `frontend/` - React app powered by Vite
- `backend/` - FastAPI application

## Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL database running and accessible

## Backend (FastAPI + SQLAlchemy + Alembic)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Frontend (React)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and reads API URL from `VITE_API_BASE_URL`.

## Auth flow implemented

- Sign up: `POST /auth/signup`
- Login: `POST /auth/login`
- Welcome screen rendered in frontend after successful authentication
- Logout handled in frontend and returns user to login/signup view
