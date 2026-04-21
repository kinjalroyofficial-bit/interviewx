from pydantic import BaseModel, Field


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    message: str
    username: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class UserProfileUpdateRequest(BaseModel):
    username: str
    name: str | None = None
    years_of_experience: str | None = None
    technologies_worked_on: str | None = None
    project_details: str | None = None


class UserProfileResponse(BaseModel):
    username: str
    name: str | None = None
    years_of_experience: str | None = None
    technologies_worked_on: str | None = None
    project_details: str | None = None


class TopicDifficultyInput(BaseModel):
    topic: str
    difficulty: str


class PromptPreviewRequest(BaseModel):
    username: str
    selected_mode: str | None = None
    selected_topics: list[TopicDifficultyInput] = Field(default_factory=list)


class PromptPreviewResponse(BaseModel):
    prompt: str
    prompt_file_path: str


class StartInterviewRequest(BaseModel):
    username: str
    selected_mode: str | None = None
    selected_topics: list[TopicDifficultyInput] = Field(default_factory=list)


class StartInterviewResponse(BaseModel):
    interview_id: str
    first_question: str
    response_id: str | None = None


class InterviewTurnRequest(BaseModel):
    interview_id: str
    answer: str
    previous_response_id: str | None = None

class InterviewTurnResponse(BaseModel):
    next_question: str
    interview_ended: bool = False
    transcript_file_path: str | None = None
    response_id: str | None = None


class InterviewTranscriptTurn(BaseModel):
    role: str
    content: str
    timestamp: str | None = None


class EndInterviewRequest(BaseModel):
    interview_id: str
    transcript_text: str | None = None
    transcript_turns: list[InterviewTranscriptTurn] = Field(default_factory=list)


class EndInterviewResponse(BaseModel):
    interview_id: str
    interview_ended: bool
    transcript_file_path: str | None = None
