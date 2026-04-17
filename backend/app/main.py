from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User
from app.schemas import AuthRequest, AuthResponse

app = FastAPI(title="InterviewX API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    user = User(username=payload.username.strip(), password=payload.password)
    db.add(user)
    db.commit()
    db.refresh(user)

    return AuthResponse(message="Signup successful", username=user.username)


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: AuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = (
        db.query(User)
        .filter(User.username == payload.username.strip(), User.password == payload.password)
        .first()
    )
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    return AuthResponse(message="Login successful", username=user.username)
