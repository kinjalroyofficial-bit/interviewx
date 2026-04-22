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
    transcript_turns: list[InterviewTranscriptTurn] = Field(default_factory=list)


class EndInterviewResponse(BaseModel):
    interview_id: str
    interview_ended: bool
    transcript_file_path: str | None = None


class InterviewHistoryItem(BaseModel):
    interview_id: str
    status: str
    selected_mode: str | None = None
    created_at: str | None = None
    ended_at: str | None = None
    transcript_turns: list[InterviewTranscriptTurn] = Field(default_factory=list)
    performance_analytics: "InterviewEvaluationResponse | None" = None


class InterviewHistoryResponse(BaseModel):
    interviews: list[InterviewHistoryItem] = Field(default_factory=list)


class InterviewHistoryRequest(BaseModel):
    username: str


class InterviewEvaluationRequest(BaseModel):
    interview_id: str


class InterviewEvaluationMetric(BaseModel):
    score: int
    summary: str


class InterviewEvaluationResponse(BaseModel):
    overall_score: int
    technical_competency: InterviewEvaluationMetric
    communication: InterviewEvaluationMetric
    areas_of_improvement: list[str] = Field(default_factory=list)


class AnswerQualityRequest(BaseModel):
    answer: str
    interview_id: str | None = None


class AnswerQualityResponse(BaseModel):
    status: str
    feedback: str
