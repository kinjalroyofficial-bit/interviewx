from typing import Any

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


class UserPreferencesUpdateRequest(BaseModel):
    username: str
    preferences: dict[str, Any] = Field(default_factory=dict)


class UserPreferencesResponse(BaseModel):
    username: str
    preferences: dict[str, Any] = Field(default_factory=dict)


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
    input_type: str | None = "text"
    selected_topics: list[TopicDifficultyInput] = Field(default_factory=list)


class StartInterviewResponse(BaseModel):
    interview_id: str
    first_question: str
    response_id: str | None = None


class StartVoiceInterviewSessionRequest(BaseModel):
    username: str
    selected_mode: str | None = None
    selected_topics: list[TopicDifficultyInput] = Field(default_factory=list)


class StartVoiceInterviewSessionResponse(BaseModel):
    interview_id: str
    model: str
    client_secret: str
    expires_at: int | None = None
    session_id: str | None = None


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
    input_type: str | None = None
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


class PaymentCustomerDetails(BaseModel):
    username: str | None = None
    userId: str | None = None
    userID: str | None = None


class PaymentPurchaseSummary(BaseModel):
    base_price: int | None = None
    price: int | None = None
    quantity: int | None = None
    name: str | None = None
    coupon: str | None = None


class CreatePaymentRequest(BaseModel):
    customerDetails: PaymentCustomerDetails
    purchaseSummary: PaymentPurchaseSummary | list[PaymentPurchaseSummary]
    couponCode: str | None = None


class CreatePaymentResponse(BaseModel):
    status: str
    url: str
    mtid: str


class PaymentConfirmationResponse(BaseModel):
    status: str
    payment_state: str
    credits_added: int = 0
    credits_balance: int | None = None


class QuantumQuestQuestion(BaseModel):
    question_id: int
    question_text: str
    options: list[str] = Field(default_factory=list)
    question_topic: str | None = None
    difficulty: str | None = None


class QuantumQuestQuestionsResponse(BaseModel):
    questions: list[QuantumQuestQuestion] = Field(default_factory=list)
    available_topics: list[str] = Field(default_factory=list)
    available_difficulties: list[str] = Field(default_factory=list)


class QuantumQuestSubmitRequest(BaseModel):
    username: str
    question_ids: list[int] = Field(default_factory=list)
    selected_answers: list[int] = Field(default_factory=list)
    topic: str | None = None
    difficulty: str | None = None


class QuantumQuestResultItem(BaseModel):
    question_id: int
    selected_answer: int
    correct_answer: int
    is_correct: bool
    explanation: str | None = None


class QuantumQuestSubmitResponse(BaseModel):
    attempt_id: int
    total_questions: int
    correct_answers: int
    score_percentage: int
    results: list[QuantumQuestResultItem] = Field(default_factory=list)


class QuantumQuestPerformanceItem(BaseModel):
    attempt_id: int
    topic: str | None = None
    difficulty: str | None = None
    total_questions: int
    correct_answers: int
    score_percentage: int
    created_at: str | None = None


class QuantumQuestPerformanceResponse(BaseModel):
    attempts: list[QuantumQuestPerformanceItem] = Field(default_factory=list)
