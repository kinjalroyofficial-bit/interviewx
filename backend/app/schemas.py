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


class InterviewTurnRequest(BaseModel):
    interview_id: str
    answer: str

class InterviewTurnResponse(BaseModel):
    next_question: str
