from sqlalchemy import Column, Integer, String
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
    password = Column(String, nullable=False)
