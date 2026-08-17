"""
Database setup module — SQLite via SQLAlchemy.

NOT YET IMPORTED BY main.py. This is scaffolding for the mission-history /
player-progress persistence layer described in docs/BlackVault_PRD.md
(Phase 6 — rewards/save system). Wire it in when you're ready to log
/train attempts or serve a /progress endpoint; see the usage note at the
bottom of db/models.py for the two lines that go in main.py.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./blackvault.db"

# check_same_thread=False is required for SQLite when used with FastAPI,
# since FastAPI can handle requests on different threads and SQLite's
# default driver assumes single-threaded access otherwise.
engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding an isolated SQLAlchemy database session.

    Yields:
        Session: Database session instance.

    Ensures session is properly closed after request execution finishes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Initializes database tables defined in db.models schema if missing.

    Safe to run repeatedly during application startup.
    """
    import db.models  # noqa: F401 — ensures models are registered on Base before create_all
    Base.metadata.create_all(bind=engine)