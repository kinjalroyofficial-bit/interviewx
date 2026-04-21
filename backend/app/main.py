from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

import os



import logging

logging.basicConfig(level=logging.INFO)

logging.info(f"OPENAI_MODEL = {os.getenv('OPENAI_MODEL')}")
logging.info(f"GOOGLE_CLIENT_ID = {os.getenv('GOOGLE_CLIENT_ID')}")


from openai import OpenAI

import os
import secrets

import json
import random
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import InterviewSession, InterviewTurn, User, UserProfileUpdateLog
from app.schemas import (
    AuthRequest,
    AuthResponse,
    EndInterviewRequest,
    EndInterviewResponse,
    GoogleAuthRequest,
    StartInterviewRequest,
    StartInterviewResponse,
    PromptPreviewRequest,
    PromptPreviewResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    InterviewTurnRequest,
    InterviewTurnResponse,
    InterviewHistoryItem,
    InterviewHistoryResponse,
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI(title="InterviewX API", version="0.1.0")
logger = logging.getLogger("interviewx.auth")
QUESTION_REPOSITORY_PATH = Path(__file__).resolve().parent / "knowledge_repository" / "tech_questions.json"
LAST_OPENAI_PAYLOAD: dict = {}
LAST_OPENAI_RESPONSE: dict = {}
INTERVIEW_DEBUG_EVENTS: list[dict] = []
INTERVIEW_END_KEYWORD = "[INTERVIEW_ENDED]"
INTERVIEW_END_FALLBACK_PHRASES = (
    "interview ended",
    "the interview has ended",
    "this interview has ended",
    "end of interview",
)

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


def ensure_interview_session_transcript_columns() -> None:
    db = SessionLocal()
    try:
        print_interview_trace("db_schema.ensure_columns.started", table="interview_sessions")
        db.execute(sql_text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS transcript_text TEXT"))
        db.execute(sql_text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS transcript_json TEXT"))
        db.commit()
        print_interview_trace("db_schema.ensure_columns.completed", table="interview_sessions")
    except Exception as exc:
        db.rollback()
        print_interview_trace(
            "db_schema.ensure_columns.failed",
            table="interview_sessions",
            error=str(exc),
            error_type=type(exc).__name__,
        )
        raise
    finally:
        db.close()


@app.on_event("startup")
def startup_schema_sync() -> None:
    ensure_interview_session_transcript_columns()


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


def set_last_openai_payload(payload: dict) -> None:
    global LAST_OPENAI_PAYLOAD
    LAST_OPENAI_PAYLOAD = payload


def set_last_openai_response(response_data: dict) -> None:
    global LAST_OPENAI_RESPONSE
    LAST_OPENAI_RESPONSE = response_data


def record_interview_debug_event(event_data: dict) -> None:
    global INTERVIEW_DEBUG_EVENTS
    INTERVIEW_DEBUG_EVENTS.append(event_data)
    max_events = int(os.getenv("INTERVIEW_DEBUG_EVENTS_MAX", "200"))
    if len(INTERVIEW_DEBUG_EVENTS) > max_events:
        INTERVIEW_DEBUG_EVENTS = INTERVIEW_DEBUG_EVENTS[-max_events:]


def print_interview_trace(event: str, **details) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    serialized = json.dumps(details, default=str, ensure_ascii=False)
    print(f"[InterviewTrace][{timestamp}] {event} | {serialized}", flush=True)


def is_interview_end_signal(response_text: str) -> bool:
    normalized_text = (response_text or "").strip().lower()
    if not normalized_text:
        return False
    if INTERVIEW_END_KEYWORD.lower() in normalized_text:
        return True
    return any(phrase in normalized_text for phrase in INTERVIEW_END_FALLBACK_PHRASES)


def serialize_openai_response(response) -> dict:
    model_dump = getattr(response, "model_dump", None)
    if callable(model_dump):
        dumped = model_dump()
        if isinstance(dumped, dict):
            return dumped
    return {"repr": repr(response)}


def extract_response_text(response) -> str:
    text = getattr(response, "output_text", None)
    if isinstance(text, str) and text.strip():
        return text.strip()
    if isinstance(text, list):
        joined_output_text = "\n".join(
            item.strip() for item in text if isinstance(item, str) and item.strip()
        ).strip()
        if joined_output_text:
            return joined_output_text

    output_items = getattr(response, "output", None)
    if isinstance(output_items, dict):
        output_items = [output_items]
    if not isinstance(output_items, list):
        model_dump = getattr(response, "model_dump", None)
        if callable(model_dump):
            dumped_response = model_dump()
            output_text = dumped_response.get("output_text")
            if isinstance(output_text, str) and output_text.strip():
                return output_text.strip()
            if isinstance(output_text, list):
                joined_output_text = "\n".join(
                    item.strip() for item in output_text if isinstance(item, str) and item.strip()
                ).strip()
                if joined_output_text:
                    return joined_output_text
            output_items = dumped_response.get("output")
            if isinstance(output_items, dict):
                output_items = [output_items]
        if not isinstance(output_items, list):
            return ""

    extracted_chunks: list[str] = []
    for item in output_items:
        content_items = getattr(item, "content", None)
        if content_items is None and isinstance(item, dict):
            content_items = item.get("content")
        if isinstance(content_items, dict):
            content_items = [content_items]
        if not isinstance(content_items, list):
            continue
        for content in content_items:
            content_text = getattr(content, "text", None)
            if content_text is None and isinstance(content, dict):
                content_text = content.get("text")
                if isinstance(content_text, dict):
                    content_text = content_text.get("value")
            if isinstance(content_text, str) and content_text.strip():
                extracted_chunks.append(content_text.strip())

    return "\n".join(extracted_chunks).strip()


def build_response_diagnostics(raw_response: dict) -> dict:
    usage = raw_response.get("usage") if isinstance(raw_response, dict) else {}
    incomplete_details = raw_response.get("incomplete_details") if isinstance(raw_response, dict) else {}
    return {
        "response_status": raw_response.get("status") if isinstance(raw_response, dict) else None,
        "incomplete_reason": (
            incomplete_details.get("reason")
            if isinstance(incomplete_details, dict)
            else None
        ),
        "output_types": [
            item.get("type")
            for item in raw_response.get("output", [])
            if isinstance(item, dict)
        ] if isinstance(raw_response, dict) else [],
        "usage": {
            "input_tokens": usage.get("input_tokens") if isinstance(usage, dict) else None,
            "output_tokens": usage.get("output_tokens") if isinstance(usage, dict) else None,
            "total_tokens": usage.get("total_tokens") if isinstance(usage, dict) else None,
            "reasoning_tokens": (
                usage.get("output_tokens_details", {}).get("reasoning_tokens")
                if isinstance(usage, dict) and isinstance(usage.get("output_tokens_details"), dict)
                else None
            ),
        },
    }


def finalize_interview(
    session: InterviewSession,
    transcript_text: str,
    transcript_turns: list[dict] | None = None,
) -> None:
    finalize_start = perf_counter()
    print_interview_trace(
        "finalize_interview.started",
        interview_id=session.id,
        transcript_chars=len(transcript_text or ""),
        turns_count=len(transcript_turns or []),
    )
    normalized_turns = transcript_turns if isinstance(transcript_turns, list) else []

    session.transcript_text = transcript_text
    session.transcript_json = json.dumps(normalized_turns)
    session.status = "ended"
    session.ended_at = datetime.now(timezone.utc)
    session.updated_at = datetime.now(timezone.utc)
    print_interview_trace(
        "finalize_interview.completed",
        interview_id=session.id,
        duration_ms=round((perf_counter() - finalize_start) * 1000, 2),
    )
    return None


def record_interview_turn(
    db: Session,
    interview_id: str,
    role: str,
    content: str,
    response_id: str | None = None,
) -> None:
    db.add(
        InterviewTurn(
            session_id=interview_id,
            role=role,
            content=content,
            response_id=response_id,
            timestamp=datetime.now(timezone.utc),
        )
    )


def build_session_transcript_from_db(db: Session, interview_id: str) -> tuple[str, list[dict]]:
    turns = (
        db.query(InterviewTurn)
        .filter(InterviewTurn.session_id == interview_id)
        .order_by(InterviewTurn.timestamp.asc(), InterviewTurn.id.asc())
        .all()
    )
    transcript_turns = [
        {
            "role": turn.role,
            "content": turn.content,
            "timestamp": turn.timestamp.isoformat() if turn.timestamp else None,
        }
        for turn in turns
    ]
    transcript_text = "\n".join(
        f"[{turn['timestamp'] or ''}] {str(turn['role'] or '').upper()}: {turn['content'] or ''}"
        for turn in transcript_turns
    ).strip() or "Interview ended."
    return transcript_text, transcript_turns


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
    selected_topics_setup_section = (
        f"- Topic/Difficulty Selections:\n{selected_topics}"
        if mode_type != "conversational"
        else ""
    )
    selected_seed_questions = select_seed_questions(payload.selected_topics, mode_type)
    seed_questions_section = (
        "\n".join(f"- {seed_question['question']}" for seed_question in selected_seed_questions)
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
{selected_topics_setup_section}
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


def build_start_interview_prompt(user: User, selected_mode: str, selected_topics: list) -> str:
    interview_prompt = build_interview_prompt(
        user,
        PromptPreviewRequest(
            username=user.username,
            selected_mode=selected_mode,
            selected_topics=selected_topics,
        ),
    )
    return f"""{interview_prompt}

Interview start instruction:
- Ask the first interview question now.
- Ask ONLY one question.
- Keep it concise and mode-aligned.
- If and only if all interview goals are fully completed, return this exact keyword: {INTERVIEW_END_KEYWORD}
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

    prompt = build_start_interview_prompt(user, payload.selected_mode, payload.selected_topics)

    prompt_dir = Path(__file__).resolve().parent.parent / "tmp"
    prompt_dir.mkdir(parents=True, exist_ok=True)
    prompt_file = prompt_dir / "interview_prompt_preview.txt"
    timestamp = datetime.now(timezone.utc).isoformat()
    prompt_file.write_text(f"[Generated at {timestamp}]\n\n{prompt}\n", encoding="utf-8")

    return PromptPreviewResponse(prompt=prompt, prompt_file_path=str(prompt_file))


@app.post("/interview/start", response_model=StartInterviewResponse)
def start_interview(payload: StartInterviewRequest, db: Session = Depends(get_db)) -> StartInterviewResponse:
    endpoint_start = perf_counter()
    try:
        clean_username = payload.username.strip()
        print_interview_trace(
            "start_interview.received",
            username=clean_username,
            selected_mode=payload.selected_mode,
            selected_topics_count=len(payload.selected_topics or []),
        )
        user = db.query(User).filter(User.username == clean_username).first()
        if not user:
            print_interview_trace("start_interview.user_not_found", username=clean_username)
            raise HTTPException(status_code=404, detail="User not found")

        interview_id = f"intv_{secrets.token_hex(8)}"
        starter_prompt = build_start_interview_prompt(
            user,
            payload.selected_mode,
            payload.selected_topics,
        )
        openai_start = perf_counter()
        response = client.responses.create(
            model=os.getenv("OPENAI_MODEL"),
            input=starter_prompt,
        )
        print_interview_trace(
            "start_interview.openai_completed",
            interview_id=interview_id,
            model=os.getenv("OPENAI_MODEL"),
            duration_ms=round((perf_counter() - openai_start) * 1000, 2),
            response_id=getattr(response, "id", None),
        )
        set_last_openai_payload(
            {
                "endpoint": "/interview/start",
                "interview_id": interview_id,
                "model": os.getenv("OPENAI_MODEL"),
                "input": starter_prompt,
                "previous_response_id": None,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        first_question = extract_response_text(response)
        if not first_question:
            raw_response = serialize_openai_response(response)
            set_last_openai_response(
                {
                    "endpoint": "/interview/start",
                    "interview_id": interview_id,
                    "response_id": getattr(response, "id", None),
                    "text": "",
                    "raw_response": raw_response,
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            record_interview_debug_event(
                {
                    "event": "empty_response_text",
                    "endpoint": "/interview/start",
                    "interview_id": interview_id,
                    "response_id": getattr(response, "id", None),
                    "diagnostics": build_response_diagnostics(raw_response),
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            raise HTTPException(status_code=500, detail="Empty response from model")
        set_last_openai_response(
            {
                "endpoint": "/interview/start",
                "interview_id": interview_id,
                "response_id": getattr(response, "id", None),
                "text": first_question,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        session = InterviewSession(
            id=interview_id,
            user_id=user.id,
            selected_mode=payload.selected_mode,
            selected_topics=json.dumps(
                [
                    {"topic": topic.topic, "difficulty": topic.difficulty}
                    for topic in payload.selected_topics
                ]
            ),
            status="active",
        )
        db.add(session)
        record_interview_turn(
            db=db,
            interview_id=interview_id,
            role="assistant",
            content=first_question,
            response_id=getattr(response, "id", None),
        )
        commit_start = perf_counter()
        db.commit()
        print_interview_trace(
            "start_interview.db_commit_completed",
            interview_id=interview_id,
            duration_ms=round((perf_counter() - commit_start) * 1000, 2),
        )
        print_interview_trace(
            "start_interview.completed",
            interview_id=interview_id,
            total_duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )
        return StartInterviewResponse(
            interview_id=interview_id,
            first_question=first_question,
            response_id=getattr(response, "id", None),
        )
    except Exception as e:
        db.rollback()
        logger.error(f"INTERVIEW START ERROR = {str(e)}")
        print_interview_trace(
            "start_interview.failed",
            error=str(e),
            error_type=type(e).__name__,
            total_duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )
        record_interview_debug_event(
            {
                "event": "interview_start_error",
                "endpoint": "/interview/start",
                "error": str(e),
                "error_type": type(e).__name__,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to start interview")


@app.post("/interview/next-question", response_model=InterviewTurnResponse)
def get_next_question(payload: InterviewTurnRequest, db: Session = Depends(get_db)):
    endpoint_start = perf_counter()
    try:
        interview_id = payload.interview_id.strip()
        if not interview_id:
            raise HTTPException(status_code=400, detail="interview_id is required")
        session = db.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Interview session not found")

        answer = payload.answer.strip()
        if not answer:
            raise HTTPException(status_code=400, detail="answer is required")
        print_interview_trace(
            "next_question.received",
            interview_id=interview_id,
            answer_chars=len(answer),
            has_previous_response_id=bool(payload.previous_response_id),
        )

        previous_response_id = payload.previous_response_id

        request_payload = {
            "model": os.getenv("OPENAI_MODEL"),
            "input": answer,
        }
        if previous_response_id:
            request_payload["previous_response_id"] = previous_response_id

        openai_start = perf_counter()
        response = client.responses.create(**request_payload)
        print_interview_trace(
            "next_question.openai_completed",
            interview_id=interview_id,
            model=request_payload.get("model"),
            duration_ms=round((perf_counter() - openai_start) * 1000, 2),
            response_id=getattr(response, "id", None),
        )
        set_last_openai_payload(
            {
                "endpoint": "/interview/next-question",
                "interview_id": interview_id,
                "request_payload": request_payload,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        next_question = extract_response_text(response)
        if not next_question:
            raw_response = serialize_openai_response(response)
            set_last_openai_response(
                {
                    "endpoint": "/interview/next-question",
                    "interview_id": interview_id,
                    "response_id": getattr(response, "id", None),
                    "text": "",
                    "raw_response": raw_response,
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            record_interview_debug_event(
                {
                    "event": "empty_response_text",
                    "endpoint": "/interview/next-question",
                    "interview_id": interview_id,
                    "response_id": getattr(response, "id", None),
                    "diagnostics": build_response_diagnostics(raw_response),
                    "captured_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            raise HTTPException(status_code=500, detail="Empty response from model")
        set_last_openai_response(
            {
                "endpoint": "/interview/next-question",
                "interview_id": interview_id,
                "response_id": getattr(response, "id", None),
                "text": next_question,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )

        interview_ended = is_interview_end_signal(next_question)
        if interview_ended:
            next_question = next_question.replace(INTERVIEW_END_KEYWORD, "").strip()
            if not next_question:
                next_question = "Interview ended."
        record_interview_turn(
            db=db,
            interview_id=interview_id,
            role="user",
            content=answer,
            response_id=previous_response_id,
        )
        record_interview_turn(
            db=db,
            interview_id=interview_id,
            role="assistant",
            content=next_question,
            response_id=getattr(response, "id", None),
        )
        transcript_file_path = None
        if interview_ended:
            transcript_text, transcript_turns = build_session_transcript_from_db(db, interview_id)
            finalize_interview(
                session,
                transcript_text=transcript_text,
                transcript_turns=transcript_turns,
            )
        db.commit()
        print_interview_trace(
            "next_question.completed",
            interview_id=interview_id,
            interview_ended=interview_ended,
            question_chars=len(next_question),
            total_duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )

        return InterviewTurnResponse(
            next_question=next_question,
            interview_ended=interview_ended,
            transcript_file_path=transcript_file_path,
            response_id=getattr(response, "id", None),
        )

    except Exception as e:
        db.rollback()
        logger.error(f"INTERVIEW ERROR = {str(e)}")
        print_interview_trace(
            "next_question.failed",
            interview_id=payload.interview_id if payload else None,
            error=str(e),
            error_type=type(e).__name__,
            total_duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )
        record_interview_debug_event(
            {
                "event": "interview_next_question_error",
                "endpoint": "/interview/next-question",
                "interview_id": payload.interview_id if payload else None,
                "error": str(e),
                "error_type": type(e).__name__,
                "captured_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Failed to generate question")


@app.get("/interview/debug/last-openai-payload")
def get_last_openai_payload() -> dict:
    if not LAST_OPENAI_PAYLOAD:
        return {"message": "No OpenAI request captured yet."}
    return LAST_OPENAI_PAYLOAD


@app.get("/interview/debug/last-openai-response")
def get_last_openai_response() -> dict:
    if not LAST_OPENAI_RESPONSE:
        return {"message": "No OpenAI response captured yet."}
    return LAST_OPENAI_RESPONSE


@app.get("/interview/debug/error-events")
def get_interview_debug_events(limit: int = 20) -> dict:
    safe_limit = max(1, min(limit, 200))
    return {
        "count": len(INTERVIEW_DEBUG_EVENTS),
        "events": INTERVIEW_DEBUG_EVENTS[-safe_limit:],
    }


@app.post("/interview/end", response_model=EndInterviewResponse)
def end_interview(payload: EndInterviewRequest, db: Session = Depends(get_db)) -> EndInterviewResponse:
    endpoint_start = perf_counter()
    interview_id = payload.interview_id.strip()
    if not interview_id:
        raise HTTPException(status_code=400, detail="interview_id is required")
    print_interview_trace(
        "end_interview.received",
        interview_id=interview_id,
        transcript_turns_count=len(payload.transcript_turns or []),
        transcript_text_chars=len(payload.transcript_text or ""),
    )

    session = db.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")

    existing_turn_count = (
        db.query(InterviewTurn).filter(InterviewTurn.session_id == interview_id).count()
    )
    if payload.transcript_turns and existing_turn_count == 0:
        for turn in payload.transcript_turns:
            content = (turn.content or "").strip()
            role = (turn.role or "").strip()
            if not content or not role:
                continue
            record_interview_turn(
                db=db,
                interview_id=interview_id,
                role=role,
                content=content,
                response_id=None,
            )

    if payload.transcript_text and payload.transcript_text.strip():
        transcript_text = payload.transcript_text.strip()
        transcript_turns = [turn.model_dump() for turn in payload.transcript_turns]
    else:
        transcript_text, transcript_turns = build_session_transcript_from_db(db, interview_id)

    finalize_interview(
        session,
        transcript_text=transcript_text,
        transcript_turns=transcript_turns,
    )
    commit_start = perf_counter()
    db.commit()
    print_interview_trace(
        "end_interview.db_commit_completed",
        interview_id=interview_id,
        duration_ms=round((perf_counter() - commit_start) * 1000, 2),
    )
    print_interview_trace(
        "end_interview.completed",
        interview_id=interview_id,
        total_duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
    )

    return EndInterviewResponse(
        interview_id=interview_id,
        interview_ended=True,
        transcript_file_path=None,
    )


@app.get("/interview/history", response_model=InterviewHistoryResponse)
def get_interview_history(username: str, db: Session = Depends(get_db)) -> InterviewHistoryResponse:
    clean_username = (username or "").strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="username is required")

    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    interviews: list[InterviewHistoryItem] = []
    for session in sessions:
        transcript_turns: list[dict] = []
        if session.transcript_json:
            try:
                parsed_turns = json.loads(session.transcript_json)
                if isinstance(parsed_turns, list):
                    transcript_turns = parsed_turns
            except json.JSONDecodeError:
                transcript_turns = []
        if not transcript_turns:
            _, transcript_turns = build_session_transcript_from_db(db, session.id)

        interviews.append(
            InterviewHistoryItem(
                interview_id=session.id,
                status=session.status,
                selected_mode=session.selected_mode,
                created_at=session.created_at.isoformat() if session.created_at else None,
                ended_at=session.ended_at.isoformat() if session.ended_at else None,
                transcript_turns=transcript_turns,
            )
        )

    return InterviewHistoryResponse(interviews=interviews)
