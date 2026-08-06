"""
SQLAlchemy ORM models — mission history, player progress, boss missions.

NOT YET IMPORTED BY main.py. Four tables:
  - MissionAttempt: every /train call, pass or fail.
  - PlayerProgress: XP/level per player (Phase 6 reward system).
  - BossMission: stores the true_problem_type server-side per boss
    attempt (see generate_datasets.py's gen_boss_dataset()) so it's
    never exposed to Unity before the player submits.
  - Achievement: unlocked achievement records per player (used by
    services/rewards.py's unlock_achievement()).

--- To wire this in (main.py), add: ---
    from db.database import init_db, get_db
    from db import models
    from sqlalchemy.orm import Session
    from fastapi import Depends

    @app.on_event("startup")
    def on_startup():
        init_db()

Then in /train, add `db: Session = Depends(get_db)` to the signature
and, before the return statement:

    db.add(models.MissionAttempt(
        level=str(req.problem_type), dataset_id=req.dataset,
        algorithm=req.algorithm, problem_type=req.problem_type,
        metric_name=req.target_metric, metric_value=achieved,
        metric_target=req.target_metric_value, passed=passed,
    ))
    db.commit()
"""

from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func

from db.database import Base


class MissionAttempt(Base):
    __tablename__ = "mission_attempts"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, index=True, default="local_player")  # single-player for now
    level = Column(String, index=True)
    dataset_id = Column(String)
    algorithm = Column(String)
    problem_type = Column(String)
    metric_name = Column(String)
    metric_value = Column(Float)
    metric_target = Column(Float)
    passed = Column(Boolean)
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
    true_problem_type = Column(String)  # NEVER returned to Unity before submission
    time_limit_seconds = Column(Integer, default=180)
    resolved = Column(Boolean, default=False)
    passed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Achievement(Base):
    __tablename__ = "achievements"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(String, index=True, default="local_player")
    achievement_id = Column(String, index=True)  # e.g. "first_blood", "no_hints_used", "boss_slayer"
    name = Column(String)
    description = Column(String)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now())