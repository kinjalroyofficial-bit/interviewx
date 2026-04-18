import os
import secrets
import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.schemas import AuthRequest, AuthResponse, GoogleAuthRequest

app = FastAPI(title="InterviewX API", version="0.1.0")
logger = logging.getLogger("interviewx.auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_IDS = [
    value.strip()
    for value in os.getenv("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_ID_PLACEHOLDER").split(",")
    if value.strip()
]


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "InterviewX FastAPI backend is running"}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/signup", response_model=AuthResponse)
def signup(payload: AuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    clean_username = payload.username.strip()
    existing_user = db.query(User).filter(User.username == clean_username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    user_email = clean_username if "@" in clean_username else None
    if user_email:
        email_in_use = db.query(User).filter(User.email == user_email).first()
        if email_in_use:
            raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        username=clean_username,
        password=payload.password,
        email=user_email,
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(message="Signup successful", username=user.username)


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: AuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    clean_username = payload.username.strip()
    user = (
        db.query(User)
        .filter(User.username == clean_username, User.password == payload.password)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return AuthResponse(message="Login successful", username=user.username)


@app.post("/auth/google", response_model=AuthResponse)
def google_login(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not GOOGLE_CLIENT_IDS or GOOGLE_CLIENT_IDS == ["GOOGLE_CLIENT_ID_PLACEHOLDER"]:
        logger.error("Google OAuth attempted but GOOGLE_CLIENT_ID is not configured on backend.")
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on backend")

    try:
        logger.info("Verifying Google ID token on backend.")
        token_info = google_id_token.verify_oauth2_token(
            payload.id_token,
            google_requests.Request(),
            None,
        )
    except ValueError as error:
        logger.exception("Google token verification failed: %s", error)
        raise HTTPException(status_code=401, detail=f"Invalid Google ID token: {error}") from error

    email = token_info.get("email")
    google_subject = token_info.get("sub")
    token_audience = token_info.get("aud")
    token_issuer = token_info.get("iss")

    if token_audience not in GOOGLE_CLIENT_IDS:
        logger.error(
            "Google token audience mismatch. Token aud=%s configured=%s",
            token_audience,
            GOOGLE_CLIENT_IDS,
        )
        raise HTTPException(
            status_code=401,
            detail=f"Google token audience mismatch (aud={token_audience}).",
        )

    if token_issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        logger.error("Unexpected Google token issuer: %s", token_issuer)
        raise HTTPException(status_code=401, detail=f"Invalid token issuer ({token_issuer}).")

    if not email or not google_subject:
        raise HTTPException(status_code=400, detail="Google token missing required user details")

    user = db.query(User).filter(User.google_id == google_subject).first()
    if not user:
        user = (
            db.query(User)
            .filter((User.email == email) | (User.username == email))
            .first()
        )

    if user:
        if user.google_id and user.google_id != google_subject:
            raise HTTPException(status_code=400, detail="Google account conflict for this user")
        user.google_id = google_subject
        user.email = user.email or email
        user.auth_provider = "google" if user.auth_provider != "local" else "local+google"
    else:
        user = User(
            username=email,
            email=email,
            google_id=google_subject,
            password=secrets.token_urlsafe(24),
            auth_provider="google",
        )
        db.add(user)

    db.commit()
    db.refresh(user)
    logger.info("Google login successful for email=%s", email)

    return AuthResponse(message="Google login successful", username=user.username)
