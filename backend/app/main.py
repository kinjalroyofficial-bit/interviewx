from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

import os
print("ENV PATH:", env_path)
print("GOOGLE_CLIENT_ID:", os.getenv("GOOGLE_CLIENT_ID"))

import os
import secrets
import logging
import json
import random
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import User, UserProfileUpdateLog
from app.schemas import (
    AuthRequest,
    AuthResponse,
    GoogleAuthRequest,
    PromptPreviewRequest,
    PromptPreviewResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
)

app = FastAPI(title="InterviewX API", version="0.1.0")
logger = logging.getLogger("interviewx.auth")
QUESTION_REPOSITORY_PATH = Path(__file__).resolve().parent / "knowledge_repository" / "tech_questions.json"

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


def normalize_profile_value(value: str | None) -> str | None:
    if value is None:
        return None
    clean_value = value.strip()
    return clean_value or None


def build_interview_prompt(user: User, payload: PromptPreviewRequest) -> str:
    profile_name = user.full_name or user.username
    years = user.years_of_experience or "Not specified"
    technologies = user.technologies_worked_on or "Not specified"
    project_details = user.project_details or "Not specified"
    selected_mode = payload.selected_mode or "Not specified"
    selected_topics = (
        "\n".join(
            f"- Topic: {topic_entry.topic} | Difficulty: {topic_entry.difficulty}"
            for topic_entry in payload.selected_topics
        )
        if payload.selected_topics
        else "- No topics selected"
    )
    mode_type = detect_mode_type(selected_mode)
    selected_seed_questions = select_seed_questions(payload.selected_topics, mode_type)
    seed_questions_section = (
        "\n".join(
            f"- Topic: {seed_question['topic']} | Difficulty: {seed_question['difficulty']} | Question: {seed_question['question']}"
            for seed_question in selected_seed_questions
        )
        if selected_seed_questions
        else "- No seed questions found for the selected topic/difficulty pairs."
    )

    common_context = f"""You are InterviewX AI Interviewer.

Use the following candidate profile and interview setup as context before generating any interview questions.

Candidate Profile:
- Username: {user.username}
- Name: {profile_name}
- Years of Experience: {years}
- Technologies Worked On: {technologies}
- Project Details: {project_details}

Current Interview Setup (from active current panel only):
- Selected Mode: {selected_mode}
- Topic/Difficulty Selections:
{selected_topics}
"""

    if mode_type == "conversational":
        return f"""{common_context}
Instructions (Conversational Interview - Free-Flowing):
1) Do NOT use curated seed questions.
2) Generate questions dynamically using the candidate profile, projects, technologies, and prior answers as context.
3) Keep the interview adaptive, natural, and progressive.
4) Ask one question at a time and tailor follow-ups based on the candidate's previous response.
5) Keep tone professional and encouraging.
"""

    if mode_type == "full_stack":
        return f"""{common_context}
Curated Question Seeds (from knowledge repository):
{seed_questions_section}

Instructions (Full-Stack Interview - Pro Mode):
1) Follow strict phase order and do not mix phases:
   - Phase 1: Project Deep Dive (ask 4-5 project-based questions on implementation, decisions, and challenges).
   - Phase 2: Seeded Technical Questions (use topic+difficulty seeds; for each main seed, ask 2 follow-ups based on response and seed context).
   - Phase 3: Behavioral / Organizational Fit (ask 2-3 HR/behavioral questions grounded in profile, experience, and projects).
2) Ask one question at a time while preserving phase boundaries.
3) Keep the interview coherent and mode-specific.
"""

    if mode_type == "live_coding":
        return f"""{common_context}
Curated Coding Question Seeds (from knowledge repository):
{seed_questions_section}

Instructions (Live Coding Interview - Exclusive Coding):
1) Use coding-only questions from coding-specific topic nodes (topic + " coding").
2) Ask only coding problems; do NOT include theoretical or conceptual-only questions.
3) For each coding problem, ask the main problem and then exactly 2 follow-ups:
   - One based on the candidate's proposed solution/approach.
   - One exploring optimization, edge cases, or alternative approaches.
4) Keep all questioning strictly in coding context.
"""

    if mode_type == "domain_focused":
        return f"""{common_context}
Curated Question Seeds (from knowledge repository):
{seed_questions_section}

Instructions (Domain-Focused Interview - Topic-Oriented):
1) Use curated seeds selected from chosen topics and difficulties as base references.
2) Keep questioning strictly focused on selected topic domains.
3) For each seed question, ask the main question and then exactly 2 follow-ups:
   - One based on the candidate's response.
   - One grounded in the original question context.
4) Ask one question at a time and maintain topic discipline.
"""

    # Differential mode remains aligned with the current baseline implementation.
    return f"""{common_context}
Curated Question Seeds (from knowledge repository):
{seed_questions_section}

Instructions:
1) Tailor interview questions to the candidate's profile and selected topics only.
2) Use the curated seed questions as base references and enrich/rephrase them according to candidate profile context.
3) Keep the flow progressive: start with warm-up, then technical depth, then applied problem-solving.
4) Match difficulty to each topic's selected level.
5) Ask one question at a time.
6) Ask concise follow-up questions when answers are vague or shallow.
7) Maintain professional but encouraging tone.
8) At the end, prepare the conversation for downstream performance analysis.
"""


def detect_mode_type(selected_mode: str) -> str:
    mode_normalized = (selected_mode or "").strip().lower()
    if "free-flowing" in mode_normalized or "conversational" in mode_normalized:
        return "conversational"
    if "topic oriented" in mode_normalized or "domain-focused" in mode_normalized:
        return "domain_focused"
    if "exclusively coding" in mode_normalized or "live coding" in mode_normalized:
        return "live_coding"
    if "pro-mode" in mode_normalized or "full-stack" in mode_normalized:
        return "full_stack"
    if "differential" in mode_normalized:
        return "differential"
    return "differential"


def load_question_repository() -> dict:
    if not QUESTION_REPOSITORY_PATH.exists():
        logger.warning("Question repository file not found at %s", QUESTION_REPOSITORY_PATH)
        return {}

    try:
        with QUESTION_REPOSITORY_PATH.open("r", encoding="utf-8") as repository_file:
            data = json.load(repository_file)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError) as error:
        logger.exception("Unable to read question repository: %s", error)
        return {}


def find_case_insensitive_key(mapping: dict, target: str) -> str | None:
    if target in mapping:
        return target
    target_lower = target.lower()
    for key in mapping.keys():
        if key.lower() == target_lower:
            return key
    return None


def select_seed_questions(selected_topics: list, mode_type: str = "differential") -> list[dict[str, str]]:
    repository = load_question_repository()
    if not repository:
        return []

    selected_questions: list[dict[str, str]] = []
    for topic_entry in selected_topics:
        requested_topic = topic_entry.topic.strip()
        lookup_topic = requested_topic
        if mode_type == "live_coding":
            lookup_topic = f"{requested_topic} coding"

        topic_key = find_case_insensitive_key(repository, lookup_topic)
        if not topic_key:
            continue

        difficulty_map = repository.get(topic_key, {})
        if not isinstance(difficulty_map, dict):
            continue

        difficulty_key = find_case_insensitive_key(difficulty_map, topic_entry.difficulty.strip())
        if not difficulty_key:
            continue

        questions = difficulty_map.get(difficulty_key, [])
        if not isinstance(questions, list):
            continue

        clean_questions = [question for question in questions if isinstance(question, str) and question.strip()]
        if not clean_questions:
            continue

        picked_questions = random.sample(clean_questions, k=min(2, len(clean_questions)))
        selected_questions.extend(
            {
                "topic": topic_key,
                "difficulty": difficulty_key,
                "question": question,
            }
            for question in picked_questions
        )

    return selected_questions


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
    GOOGLE_CLIENT_IDS = [
        value.strip()
        for value in os.getenv("GOOGLE_CLIENT_ID", "").split(",")
        if value.strip()
    ]
    if not GOOGLE_CLIENT_IDS:
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


@app.get("/users/profile", response_model=UserProfileResponse)
def get_user_profile(username: str, db: Session = Depends(get_db)) -> UserProfileResponse:
    clean_username = username.strip()
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserProfileResponse(
        username=user.username,
        name=user.full_name,
        years_of_experience=user.years_of_experience,
        technologies_worked_on=user.technologies_worked_on,
        project_details=user.project_details,
    )


@app.put("/users/profile", response_model=UserProfileResponse)
def update_user_profile(payload: UserProfileUpdateRequest, db: Session = Depends(get_db)) -> UserProfileResponse:
    clean_username = payload.username.strip()
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.full_name = normalize_profile_value(payload.name)
    user.years_of_experience = normalize_profile_value(payload.years_of_experience)
    user.technologies_worked_on = normalize_profile_value(payload.technologies_worked_on)
    user.project_details = normalize_profile_value(payload.project_details)

    profile_update_log = UserProfileUpdateLog(
        user_id=user.id,
        full_name=user.full_name,
        years_of_experience=user.years_of_experience,
        technologies_worked_on=user.technologies_worked_on,
        project_details=user.project_details,
    )
    db.add(profile_update_log)
    db.commit()
    db.refresh(user)

    return UserProfileResponse(
        username=user.username,
        name=user.full_name,
        years_of_experience=user.years_of_experience,
        technologies_worked_on=user.technologies_worked_on,
        project_details=user.project_details,
    )


@app.post("/interview/prompt/preview", response_model=PromptPreviewResponse)
def preview_interview_prompt(payload: PromptPreviewRequest, db: Session = Depends(get_db)) -> PromptPreviewResponse:
    clean_username = payload.username.strip()
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    prompt = build_interview_prompt(user, payload)

    prompt_dir = Path(__file__).resolve().parent.parent / "tmp"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    prompt_file = prompt_dir / "interview_prompt_preview.txt"
    timestamp = datetime.now(timezone.utc).isoformat()
    prompt_file.write_text(f"[Generated at {timestamp}]\n\n{prompt}\n", encoding="utf-8")

    return PromptPreviewResponse(prompt=prompt, prompt_file_path=str(prompt_file))
