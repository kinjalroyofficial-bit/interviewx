from pydantic import BaseModel


class AuthRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    message: str
    username: str
