"""
Database package for BlackVault backend — SQLite persistence via
SQLAlchemy. NOT YET IMPORTED BY main.py — see the wiring notes in
db/models.py for the two lines that connect this to /train and a new
/progress endpoint when you're ready to add mission-history logging.
"""

from db.database import Base, engine, SessionLocal, get_db, init_db
from db.models import MissionAttempt, PlayerProgress, BossMission

__all__ = [
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    "init_db",
    "MissionAttempt",
    "PlayerProgress",
    "BossMission",
]