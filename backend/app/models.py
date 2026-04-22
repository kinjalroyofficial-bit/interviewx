from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class HealthCheck(Base):
    __tablename__ = "health_check"

    id = Column(Integer, primary_key=True, index=True)
    status = Column(String, default="ok")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=True)
    email = Column(String, unique=True, nullable=True, index=True)
    google_id = Column(String, unique=True, nullable=True, index=True)
    auth_provider = Column(String, nullable=False, default="local")
    full_name = Column(String, nullable=True)
    years_of_experience = Column(String, nullable=True)
    technologies_worked_on = Column(String, nullable=True)
    project_details = Column(Text, nullable=True)


class UserProfileUpdateLog(Base):
    __tablename__ = "user_profile_update_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    full_name = Column(String, nullable=True)
    years_of_experience = Column(String, nullable=True)
    technologies_worked_on = Column(String, nullable=True)
    project_details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    selected_mode = Column(String, nullable=True)
    input_type = Column(String, nullable=True)
    selected_topics = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="active")
    transcript_json = Column(Text, nullable=True)
    performance_analytics_json = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
