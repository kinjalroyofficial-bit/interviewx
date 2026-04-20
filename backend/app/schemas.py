from pydantic import BaseModel


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


class UserProfileResponse(BaseModel):
    username: str
    name: str | None = None
    years_of_experience: str | None = None
    technologies_worked_on: str | None = None
