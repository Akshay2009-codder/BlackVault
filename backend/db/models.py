"""
SQLAlchemy ORM models — mission history, player progress, boss missions, achievements.
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func

from db.database import Base


class MissionAttempt(Base):
    __tablename__ = "mission_attempts"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, index=True, default="local_player")
    level = Column(String, index=True)
    dataset_id = Column(String)
    algorithm = Column(String)
    problem_type = Column(String)
    metric_name = Column(String)
    metric_value = Column(Float)
    metric_target = Column(Float)
    passed = Column(Boolean)
    xp_earned = Column(Integer, default=0)
    attempt_number = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PlayerProgress(Base):
    __tablename__ = "player_progress"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, unique=True, index=True, default="local_player")
    xp = Column(Integer, default=0)
    level_reached = Column(Integer, default=1)
    total_attempts = Column(Integer, default=0)
    total_passes = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class BossMission(Base):
    __tablename__ = "boss_missions"

    id = Column(Integer, primary_key=True, index=True)
    dataset_filename = Column(String)
    true_problem_type = Column(String)
    time_limit_seconds = Column(Integer, default=180)
    resolved = Column(Boolean, default=False)
    passed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, index=True, default="local_player")
    achievement_id = Column(String, index=True)
    title = Column(String)
    description = Column(String)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())
