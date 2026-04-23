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
import math
import random
import re
import httpx
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import text as sql_text
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import InterviewSession, User, UserProfileUpdateLog
from app.schemas import (
    AuthRequest,
    AuthResponse,
    EndInterviewRequest,
    EndInterviewResponse,
    GoogleAuthRequest,
    StartInterviewRequest,
    StartInterviewResponse,
    StartVoiceInterviewSessionRequest,
    StartVoiceInterviewSessionResponse,
    PromptPreviewRequest,
    PromptPreviewResponse,
    UserProfileResponse,
    UserProfileUpdateRequest,
    InterviewTurnRequest,
    InterviewTurnResponse,
    InterviewHistoryItem,
    InterviewHistoryResponse,
    InterviewHistoryRequest,
    InterviewEvaluationRequest,
    InterviewEvaluationResponse,
    AnswerQualityRequest,
    AnswerQualityResponse,
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
app = FastAPI(title="InterviewX API", version="0.1.0")
logger = logging.getLogger("interviewx.auth")
SIGNUP_CREDIT_BONUS = 1000
TEXT_CREDIT_RATE_PER_SECOND = float(os.getenv("TEXT_CREDIT_RATE_PER_SECOND", "0.5"))
VOICE_CREDIT_RATE_PER_SECOND = float(os.getenv("VOICE_CREDIT_RATE_PER_SECOND", "1.5"))
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
INTERVIEW_EVALUATION_PROMPT_TEMPLATE = """You are an expert interview evaluator.

Your task is to evaluate a completed interview using:
1. Candidate profile data
2. Interview transcript (fetched from database)

Input:
- Candidate Profile:
{profile_data}

- Interview Transcript (source: database transcript_text):
{transcript}

Instructions:
- Evaluate responses based on clarity, technical depth, relevance, and communication.
- Keep analysis concise and evidence-based.
- Do NOT hallucinate missing information.
- Output is intended for a structured Response Analytics dashboard.
- Return valid JSON only.
- Do not include any explanation outside JSON.
- Follow the required JSON structure exactly; do not add or remove keys.

Required JSON structure:
{{
  "overall_score": 0,
  "technical_competency": {{
    "score": 0,
    "summary": ""
  }},
  "communication": {{
    "score": 0,
    "summary": ""
  }},
  "areas_of_improvement": [
    ""
  ]
}}

Scoring Rules:
- Scores must be between 0 and 100.
- Summaries should be short and precise.
- Base evaluation strictly on provided transcript and profile.
"""
ANSWER_QUALITY_PROMPT_TEMPLATE = """
You are an interview communication evaluator.

Your task is to analyze the candidate's answer based on:

1. Grammar correctness
2. Clarity and positioning of the answer (how well the answer is structured and expressed)

Guidelines:

* Be concise and practical
* If the answer is already good, DO NOT criticize unnecessarily
* Only suggest improvements if they are meaningful
* Avoid over-analysis

Return output in the following JSON format:

{{
"status": "good" | "needs_improvement",
"feedback": "Short actionable feedback (1-3 lines max)"
}}

Candidate answer:
{answer}
"""

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
        db.execute(sql_text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS transcript_json TEXT"))
        db.execute(sql_text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS performance_analytics_json TEXT"))
        db.execute(sql_text("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS input_type VARCHAR"))
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

    
@app.get("/user/credits")
@app.get("/api/user/credits")
def get_user_credits(username: str, db: Session = Depends(get_db)):
    clean_username = username.strip()
    user = db.query(User).filter(User.username == clean_username).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"credits": user.credits}


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


def extract_realtime_client_secret(response_payload: dict) -> str:
    if not isinstance(response_payload, dict):
        return ""

    nested_client_secret = response_payload.get("client_secret")
    if isinstance(nested_client_secret, str) and nested_client_secret.strip():
        return nested_client_secret.strip()
    if isinstance(nested_client_secret, dict):
        for key in ("value", "secret", "token", "client_secret"):
            candidate = nested_client_secret.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

    for key in ("client_secret_value", "value", "secret", "token"):
        candidate = response_payload.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

    return ""


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


def normalize_interviewer_question_text(question_text: str) -> str:
    normalized = (question_text or "").strip()
    if not normalized:
        return ""

    # Remove markdown emphasis around common prefixed labels.
    normalized = re.sub(
        r"^\s*\*{0,2}\s*(question|q)\s*\d+\s*(\((main|follow[- ]?up|seed)\))?\s*[:\-–]\s*\*{0,2}\s*",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(
        r"^\s*\*{0,2}\s*(main|follow[- ]?up|seed)\s*(question)?\s*[:\-–]\s*\*{0,2}\s*",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = re.sub(r"^\s*\*{1,2}(.*?)\*{1,2}\s*$", r"\1", normalized)
    return normalized.strip()


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
    transcript_turns: list[dict] | None = None,
) -> None:
    finalize_start = perf_counter()
    print_interview_trace(
        "finalize_interview.started",
        interview_id=session.id,
        turns_count=len(transcript_turns or []),
    )
    normalized_turns = transcript_turns if isinstance(transcript_turns, list) else []

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


def calculate_credit_deduction_for_session(session: InterviewSession) -> int:
    if not session.created_at or not session.ended_at:
        return 0

    duration_seconds = max(
        0.0,
        (session.ended_at - session.created_at).total_seconds(),
    )
    input_type = (session.input_type or "text").strip().lower()
    rate_per_second = VOICE_CREDIT_RATE_PER_SECOND if input_type == "voice" else TEXT_CREDIT_RATE_PER_SECOND
    raw_deduction = duration_seconds * rate_per_second
    return max(0, int(math.floor(raw_deduction)))


def load_session_transcript_turns(session: InterviewSession) -> list[dict]:
    if not session.transcript_json:
        return []
    try:
        parsed_turns = json.loads(session.transcript_json)
        if isinstance(parsed_turns, list):
            return parsed_turns
    except json.JSONDecodeError:
        return []
    return []


def append_turn_to_session_transcript(
    session: InterviewSession,
    role: str,
    content: str,
    timestamp_iso: str | None = None,
) -> list[dict]:
    turns = load_session_transcript_turns(session)
    turns.append(
        {
            "role": role,
            "content": content,
            "timestamp": timestamp_iso or datetime.now(timezone.utc).isoformat(),
        }
    )
    session.transcript_json = json.dumps(turns)
    session.updated_at = datetime.now(timezone.utc)
    return turns


def build_profile_payload(user: User) -> dict[str, str]:
    return {
        "username": user.username or "",
        "name": user.full_name or "",
        "years_of_experience": user.years_of_experience or "",
        "technologies_worked_on": user.technologies_worked_on or "",
        "project_details": user.project_details or "",
    }


def clamp_score(value) -> int:
    try:
        score = int(value)
    except (TypeError, ValueError):
        return 0
    return max(0, min(score, 100))


def normalize_evaluation_payload(evaluation_json: dict | None) -> InterviewEvaluationResponse:
    evaluation_data = evaluation_json if isinstance(evaluation_json, dict) else {}
    technical = evaluation_data.get("technical_competency") if isinstance(evaluation_data, dict) else {}
    communication = evaluation_data.get("communication") if isinstance(evaluation_data, dict) else {}
    improvement_areas = evaluation_data.get("areas_of_improvement") if isinstance(evaluation_data, dict) else []
    return InterviewEvaluationResponse(
        overall_score=clamp_score(evaluation_data.get("overall_score") if isinstance(evaluation_data, dict) else 0),
        technical_competency={
            "score": clamp_score(technical.get("score") if isinstance(technical, dict) else 0),
            "summary": str(technical.get("summary") if isinstance(technical, dict) else ""),
        },
        communication={
            "score": clamp_score(communication.get("score") if isinstance(communication, dict) else 0),
            "summary": str(communication.get("summary") if isinstance(communication, dict) else ""),
        },
        areas_of_improvement=[
            str(item)
            for item in (improvement_areas if isinstance(improvement_areas, list) else [])
            if str(item).strip()
        ],
    )


def evaluate_and_store_interview_performance(interview_id: str) -> None:
    clean_interview_id = (interview_id or "").strip()
    if not clean_interview_id:
        return
    db = SessionLocal()
    try:
        session = db.query(InterviewSession).filter(InterviewSession.id == clean_interview_id).first()
        if not session or not session.user_id or not session.transcript_json:
            return
        if session.performance_analytics_json:
            return

        transcript_turns = load_session_transcript_turns(session)
        if not transcript_turns:
            return

        user = db.query(User).filter(User.id == session.user_id).first()
        if not user:
            return

        profile_data = build_profile_payload(user)
        transcript_payload = json.dumps(transcript_turns, ensure_ascii=False)
        eval_prompt = INTERVIEW_EVALUATION_PROMPT_TEMPLATE.format(
            profile_data=json.dumps(profile_data, ensure_ascii=False, indent=2),
            transcript=transcript_payload,
        )
        eval_model = os.getenv("INTERVIEW_EVAL_MODEL", "gpt-5")
        response = client.responses.create(
            model=eval_model,
            input=eval_prompt,
        )
        response_text = extract_response_text(response)
        if not response_text:
            return
        evaluation_json = json.loads(response_text)
        normalized = normalize_evaluation_payload(evaluation_json)
        session.performance_analytics_json = json.dumps(normalized.model_dump(), ensure_ascii=False)
        session.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("Failed to persist interview performance for interview_id=%s error=%s", clean_interview_id, str(exc))
    finally:
        db.close()


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
Curated Question Seeds:
{seed_questions_section}

Instructions (Domain-Focused Interview - Topic-Oriented):
1) Use curated seeds questions as base references.
2) Ask exactly one question per turn. Never ask two questions in the same message.
3) Do not label questions as "Question 1", "Follow-up", "Seed question", "Main question", or similar metadata.
4) Maintain this strict internal structure without skipping:
   - Seed Question A
   - Follow-up A1
   - Follow-up A2
   - Seed Question B
   - Follow-up B1
   - Follow-up B2
6) Ensure both Seed Question A and Seed Question B are explicitly asked; do not skip Seed Question B.
7) Do not end the interview before at least 6 total interviewer questions have been asked.
8) Ask the interview-end signal only after rule #7 is satisfied.
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
- Output only the plain question text (no numbering, no labels, no prefixes).
- Keep it concise and mode-aligned.
- If and only if all interview goals are fully completed, return this exact keyword: {INTERVIEW_END_KEYWORD}
"""

def build_voice_realtime_instructions(user: User, selected_mode: str, selected_topics: list) -> str:
    mode_type = detect_mode_type(selected_mode)
    profile_name = user.full_name or user.username
    years = user.years_of_experience or "Not specified"
    technologies = user.technologies_worked_on or "Not specified"
    project_details = user.project_details or "Not specified"
    selected_topics_text = (
        "\n".join(
            f"- Topic: {topic_entry.topic} | Difficulty: {topic_entry.difficulty}"
            for topic_entry in selected_topics
        )
        if selected_topics
        else "- No topics selected"
    )

    common_context = f"""You are InterviewX AI interviewer for a realtime voice interview.

Candidate Profile:
- Username: {user.username}
- Name: {profile_name}
- Years of Experience: {years}
- Technologies Worked On: {technologies}
- Project Details: {project_details}

Interview Setup:
- Selected Mode: {selected_mode}
- Topic/Difficulty Selections:
{selected_topics_text}

Global Instructions:
1) Ask only one question at a time.
2) Keep responses concise and voice-friendly.
3) Maintain a professional, encouraging tone.
4) If coding mode is selected, follow topic-oriented behavior strictly.
5) Start the interview immediately with the first question.
"""

    if mode_type == "conversational":
        return f"""{common_context}

Mode-specific Instructions (Free-Flowing / Conversational):
1) Do not rely on fixed seed questions.
2) Adapt questions dynamically from candidate profile and prior answers.
3) Keep the flow natural with progressive depth.
"""

    return f"""{common_context}

Mode-specific Instructions (Topic-Oriented + Coding):
1) Keep questions constrained to the selected topics and difficulty levels.
2) Ask follow-up depth questions only after candidate answers.
3) Treat coding mode with the same topic-oriented framing.
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
        credits=SIGNUP_CREDIT_BONUS,
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
            credits=SIGNUP_CREDIT_BONUS,
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
            input_type=payload.input_type,
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
        first_question = normalize_interviewer_question_text(first_question)
        if not first_question:
            raise HTTPException(status_code=500, detail="Model response did not contain a valid interview question")
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
            input_type=payload.input_type,
            selected_topics=json.dumps(
                [
                    {"topic": topic.topic, "difficulty": topic.difficulty}
                    for topic in payload.selected_topics
                ]
            ),
            status="active",
        )
        db.add(session)
        append_turn_to_session_transcript(
            session=session,
            role="assistant",
            content=first_question,
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


@app.post("/api/interview/voice/session", response_model=StartInterviewResponse)
def start_voice_interview_session_compat(
    payload: StartInterviewRequest,
    db: Session = Depends(get_db),
) -> StartInterviewResponse:
    print_interview_trace(
        "start_voice_session_compat.received",
        username=payload.username.strip(),
        selected_mode=payload.selected_mode,
        selected_topics_count=len(payload.selected_topics or []),
    )
    voice_payload = StartInterviewRequest(
        username=payload.username,
        selected_mode=payload.selected_mode,
        input_type="voice",
        selected_topics=payload.selected_topics,
    )
    return start_interview(voice_payload, db)


@app.post("/interview/voice/session", response_model=StartVoiceInterviewSessionResponse)
def start_voice_interview_session(
    payload: StartVoiceInterviewSessionRequest,
    db: Session = Depends(get_db),
) -> StartVoiceInterviewSessionResponse:
    clean_username = payload.username.strip()
    print_interview_trace(
        "start_voice_session.received",
        username=clean_username,
        selected_mode=payload.selected_mode,
        selected_topics_count=len(payload.selected_topics or []),
    )
    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        print_interview_trace("start_voice_session.user_not_found", username=clean_username)
        raise HTTPException(status_code=404, detail="User not found")

    realtime_model = os.getenv("OPENAI_REALTIME_MODEL", "gpt-realtime")
    instructions = build_voice_realtime_instructions(
        user=user,
        selected_mode=payload.selected_mode or "Free-Flowing - Conversational",
        selected_topics=payload.selected_topics or [],
    )
    request_payload = {
        "session": {
            "type": "realtime",
            "model": realtime_model,
            "instructions": instructions,
            "audio": {
                "input": {
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.75,
                        "prefix_padding_ms": 50,
                        "silence_duration_ms": 500,
                        "create_response": True,
                    }
                },
                "output": {"voice": "shimmer"},
            },
        }
    }
    print_interview_trace(
        "start_voice_session.request_openai",
        username=clean_username,
        model=realtime_model,
    )
    try:
        with httpx.Client(timeout=15.0) as http_client:
            response = http_client.post(
                "https://api.openai.com/v1/realtime/client_secrets",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "Content-Type": "application/json",
                },
                json=request_payload,
            )
            response.raise_for_status()
            data = response.json()
    except Exception as exc:
        logger.error("Failed to create voice realtime client secret: %s", str(exc))
        print_interview_trace(
            "start_voice_session.openai_failed",
            username=clean_username,
            model=realtime_model,
            error=str(exc),
            error_type=type(exc).__name__,
        )
        raise HTTPException(status_code=500, detail="Failed to initialize voice interview session")

    client_secret = extract_realtime_client_secret(data)
    session_id = data.get("id")
    expires_at = data.get("expires_at")
    if not client_secret:
        print_interview_trace(
            "start_voice_session.empty_client_secret.primary",
            username=clean_username,
            response_keys=list(data.keys()) if isinstance(data, dict) else [],
        )
        legacy_payload = request_payload.get("session", {})
        try:
            with httpx.Client(timeout=15.0) as http_client:
                legacy_response = http_client.post(
                    "https://api.openai.com/v1/realtime/sessions",
                    headers={
                        "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                        "Content-Type": "application/json",
                    },
                    json=legacy_payload,
                )
                legacy_response.raise_for_status()
                legacy_data = legacy_response.json()
                client_secret = extract_realtime_client_secret(legacy_data)
                session_id = session_id or legacy_data.get("id")
                expires_at = expires_at or legacy_data.get("expires_at")
                if not client_secret:
                    print_interview_trace(
                        "start_voice_session.empty_client_secret.legacy",
                        username=clean_username,
                        response_keys=list(legacy_data.keys()) if isinstance(legacy_data, dict) else [],
                    )
        except Exception as legacy_exc:
            print_interview_trace(
                "start_voice_session.legacy_fallback_failed",
                username=clean_username,
                error=str(legacy_exc),
                error_type=type(legacy_exc).__name__,
            )

    if not client_secret:
        raise HTTPException(status_code=500, detail="OpenAI did not return a client secret")

    interview_id = f"voice_{secrets.token_hex(8)}"
    voice_session = InterviewSession(
        id=interview_id,
        user_id=user.id,
        selected_mode=payload.selected_mode,
        input_type="voice",
        selected_topics=json.dumps(
            [
                {"topic": topic.topic, "difficulty": topic.difficulty}
                for topic in payload.selected_topics
            ]
        ),
        status="active",
    )
    db.add(voice_session)
    db.commit()
    print_interview_trace(
        "start_voice_session.completed",
        username=clean_username,
        interview_id=interview_id,
        model=realtime_model,
    )
    return StartVoiceInterviewSessionResponse(
        interview_id=interview_id,
        model=realtime_model,
        client_secret=client_secret,
        expires_at=expires_at,
        session_id=session_id,
    )


@app.post("/interview/next-question", response_model=InterviewTurnResponse)
def get_next_question(
    payload: InterviewTurnRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
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
        next_question = normalize_interviewer_question_text(next_question)
        if not next_question:
            raise HTTPException(status_code=500, detail="Model response did not contain a valid interview question")
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
        append_turn_to_session_transcript(
            session=session,
            role="user",
            content=answer,
        )
        transcript_turns = append_turn_to_session_transcript(
            session=session,
            role="assistant",
            content=next_question,
        )
        transcript_file_path = None
        if interview_ended:
            finalize_interview(
                session,
                transcript_turns=transcript_turns,
            )
        db.commit()
        if interview_ended:
            background_tasks.add_task(evaluate_and_store_interview_performance, interview_id)
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
def end_interview(
    payload: EndInterviewRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> EndInterviewResponse:
    endpoint_start = perf_counter()
    interview_id = payload.interview_id.strip()
    if not interview_id:
        raise HTTPException(status_code=400, detail="interview_id is required")
    print_interview_trace(
        "end_interview.received",
        interview_id=interview_id,
        transcript_turns_count=len(payload.transcript_turns or []),
    )

    session = db.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if payload.transcript_turns:
        transcript_turns = [turn.model_dump() for turn in payload.transcript_turns]
    else:
        transcript_turns = load_session_transcript_turns(session)

    finalize_interview(
        session,
        transcript_turns=transcript_turns,
    )
    if session.user_id:
        user = db.query(User).filter(User.id == session.user_id).first()
        if user:
            deduction = calculate_credit_deduction_for_session(session)
            current_credits = user.credits or 0
            updated_credits = max(0, current_credits - deduction)
            user.credits = updated_credits
            print_interview_trace(
                "end_interview.credit_deduction_applied",
                interview_id=interview_id,
                user_id=session.user_id,
                input_type=session.input_type,
                duration_seconds=(
                    max(0.0, (session.ended_at - session.created_at).total_seconds())
                    if session.created_at and session.ended_at
                    else 0.0
                ),
                deduction=deduction,
                previous_credits=current_credits,
                updated_credits=updated_credits,
            )
    commit_start = perf_counter()
    db.commit()
    print_interview_trace(
        "end_interview.db_commit_completed",
        interview_id=interview_id,
        duration_ms=round((perf_counter() - commit_start) * 1000, 2),
    )
    background_tasks.add_task(evaluate_and_store_interview_performance, interview_id)
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


@app.post("/interview/evaluate", response_model=InterviewEvaluationResponse)
def evaluate_interview(payload: InterviewEvaluationRequest, db: Session = Depends(get_db)) -> InterviewEvaluationResponse:
    interview_id = (payload.interview_id or "").strip()
    if not interview_id:
        raise HTTPException(status_code=400, detail="interview_id is required")

    session = db.query(InterviewSession).filter(InterviewSession.id == interview_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    if not session.performance_analytics_json:
        raise HTTPException(status_code=409, detail="Interview analytics is being generated. Please wait...")
    try:
        stored_payload = json.loads(session.performance_analytics_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"Stored analytics is invalid JSON: {exc}") from exc
    return normalize_evaluation_payload(stored_payload)


@app.post("/interview/answer-quality", response_model=AnswerQualityResponse)
def evaluate_answer_quality(payload: AnswerQualityRequest) -> AnswerQualityResponse:
    endpoint_start = perf_counter()
    answer = (payload.answer or "").strip()
    if not answer:
        raise HTTPException(status_code=400, detail="answer is required")
    print_interview_trace(
        "answer_quality.received",
        interview_id=(payload.interview_id or "").strip() or None,
        answer_chars=len(answer),
    )

    try:
        prompt = ANSWER_QUALITY_PROMPT_TEMPLATE.format(answer=answer)
        quality_model = os.getenv("ANSWER_QUALITY_MODEL", "gpt-5.4-nano")
        response = client.responses.create(
            model=quality_model,
            input=prompt,
        )
        response_text = extract_response_text(response)
        if not response_text:
            result = AnswerQualityResponse(
                status="good",
                feedback="Answer is clear overall. Keep this concise structure.",
            )
            print_interview_trace(
                "answer_quality.completed",
                interview_id=(payload.interview_id or "").strip() or None,
                status=result.status,
                duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
            )
            return result
        try:
            quality_json = json.loads(response_text)
        except json.JSONDecodeError:
            result = AnswerQualityResponse(
                status="needs_improvement",
                feedback="Improve sentence clarity and structure. Use direct, concise points.",
            )
            print_interview_trace(
                "answer_quality.non_json_fallback",
                interview_id=(payload.interview_id or "").strip() or None,
                duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
            )
            return result

        status = str(quality_json.get("status", "needs_improvement")).strip().lower()
        if status not in {"good", "needs_improvement"}:
            status = "needs_improvement"
        feedback = str(quality_json.get("feedback", "")).strip() or "Improve sentence clarity and structure."
        result = AnswerQualityResponse(status=status, feedback=feedback)
        print_interview_trace(
            "answer_quality.completed",
            interview_id=(payload.interview_id or "").strip() or None,
            status=result.status,
            duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )
        return result
    except Exception as exc:
        print_interview_trace(
            "answer_quality.failed",
            interview_id=(payload.interview_id or "").strip() or None,
            error=str(exc),
            error_type=type(exc).__name__,
            duration_ms=round((perf_counter() - endpoint_start) * 1000, 2),
        )
        logger.error("answer_quality failed interview_id=%s error=%s", (payload.interview_id or "").strip() or None, str(exc))
        return AnswerQualityResponse(
            status="needs_improvement",
            feedback="Unable to evaluate this answer right now. Continue with concise, structured responses.",
        )


def build_interview_history_response(username: str, db: Session) -> InterviewHistoryResponse:
    clean_username = (username or "").strip()
    if not clean_username:
        raise HTTPException(status_code=400, detail="username is required")

    user = db.query(User).filter(User.username == clean_username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = (
        db.query(InterviewSession)
        .filter(
            InterviewSession.user_id == user.id,
            InterviewSession.status == "ended",
            InterviewSession.transcript_json.isnot(None),
            InterviewSession.transcript_json != "",
            InterviewSession.transcript_json != "[]",
        )
        .order_by(InterviewSession.created_at.desc())
        .all()
    )

    interviews: list[InterviewHistoryItem] = []
    for session in sessions:
        transcript_turns: list[dict] = []
        performance_analytics = None
        if session.transcript_json:
            try:
                parsed_turns = json.loads(session.transcript_json)
                if isinstance(parsed_turns, list):
                    transcript_turns = parsed_turns
            except json.JSONDecodeError:
                transcript_turns = []
        if session.performance_analytics_json:
            try:
                parsed_performance = json.loads(session.performance_analytics_json)
                performance_analytics = normalize_evaluation_payload(parsed_performance)
            except json.JSONDecodeError:
                performance_analytics = None

        interviews.append(
            InterviewHistoryItem(
                interview_id=session.id,
                status=session.status,
                selected_mode=session.selected_mode,
                input_type=session.input_type,
                created_at=session.created_at.isoformat() if session.created_at else None,
                ended_at=session.ended_at.isoformat() if session.ended_at else None,
                transcript_turns=transcript_turns,
                performance_analytics=performance_analytics,
            )
        )

    return InterviewHistoryResponse(interviews=interviews)


@app.get("/api/interview/history", response_model=InterviewHistoryResponse)
@app.get("/api/interview/history/", response_model=InterviewHistoryResponse)
@app.get("/interview/history", response_model=InterviewHistoryResponse)
@app.get("/interview/history/", response_model=InterviewHistoryResponse)
@app.get("/api/users/interview-history", response_model=InterviewHistoryResponse)
@app.get("/users/interview-history", response_model=InterviewHistoryResponse)
def get_interview_history(username: str, db: Session = Depends(get_db)) -> InterviewHistoryResponse:
    return build_interview_history_response(username=username, db=db)


@app.post("/api/interview/history", response_model=InterviewHistoryResponse)
@app.post("/interview/history", response_model=InterviewHistoryResponse)
def get_interview_history_post(payload: InterviewHistoryRequest, db: Session = Depends(get_db)) -> InterviewHistoryResponse:
    return build_interview_history_response(username=payload.username, db=db)
