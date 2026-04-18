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

Create `backend/.env` (or export environment variables) with:

```bash
DATABASE_URL=postgresql://interviewx_user:StrongPassword123@localhost:5432/interviewx
GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID_PLACEHOLDER
GOOGLE_CLIENT_SECRET=GOOGLE_CLIENT_SECRET_PLACEHOLDER
```

## Frontend (React)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and reads API URL from `VITE_API_BASE_URL`.
Set Google OAuth client ID in `frontend/.env`:

```bash
VITE_GOOGLE_CLIENT_ID=GOOGLE_CLIENT_ID_PLACEHOLDER
```

## Auth flow implemented

- Sign up: `POST /auth/signup`
- Login: `POST /auth/login`
- Google login: `POST /auth/google`
- Redirect to `/dashboard` after successful authentication

## Google Cloud Console setup checklist

1. Open **Google Cloud Console** → **APIs & Services** → **OAuth consent screen** and configure app name, support email, and test users.
2. Go to **Credentials** → **Create Credentials** → **OAuth client ID**.
3. Choose **Web application**.
4. Add Authorized JavaScript origins:
   - `http://localhost:5173` (frontend dev)
5. Add Authorized redirect URIs (recommended for future code flow support):
   - `http://localhost:5173`
   - `http://localhost:5173/auth/callback` (optional dedicated callback route)
6. Copy generated Client ID and Client Secret:
   - Frontend `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`
   - Backend `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env` / environment
7. Restart backend and frontend after env updates.

### Google sign-in troubleshooting

- If clicking **Continue with Google** does nothing, check the in-popup **Google Debug Logs** panel and browser console logs with prefix `GoogleAuthDebug`.
- Common reasons:
  - `unregistered_origin`: your current frontend origin is missing in Google Authorized JavaScript origins.
  - `invalid_client`: `VITE_GOOGLE_CLIENT_ID` is wrong or app was not restarted after `.env` change.
  - backend audience mismatch: backend `GOOGLE_CLIENT_ID` does not match token `aud` from frontend Google client.
  - script load failure: outbound access to `https://accounts.google.com/gsi/client` is blocked.
