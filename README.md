# InterviewX Monorepo Setup

This repository contains:

- `frontend/` - React app powered by Vite
- `backend/` - FastAPI application

## Prerequisites

- Node.js 18+
- Python 3.10+

## Backend (FastAPI)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
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
