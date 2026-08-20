"""
Tests for API endpoints in BlackVault backend.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///./test_blackvault.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_ping():
    """Verifies that the /ping endpoint responds with HTTP 200 and online status."""
    response = client.get("/ping")
    assert response.status_code == 200
    assert response.json()["status"] == "online"


def test_health():
    """Verifies that the /health endpoint responds with HTTP 200 and ok status."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_player_progress():
    """Verifies that /player/progress returns player XP, rank, and cosmetic unlocks."""
    response = client.get("/player/progress")
    assert response.status_code == 200
    body = response.json()
    assert "xp" in body
    assert "rank" in body
    assert "unlocked_skins" in body
    assert "unlocked_badges" in body


def test_achievements():
    """Verifies that /player/achievements returns the player's achievement list."""
    response = client.get("/player/achievements")
    assert response.status_code == 200
    body = response.json()
    assert "achievements" in body
    assert isinstance(body["achievements"], list)


def test_leaderboard():
    """Verifies that /leaderboard returns top player rankings."""
    response = client.get("/leaderboard")
    assert response.status_code == 200
    body = response.json()
    assert "leaderboard" in body
    assert isinstance(body["leaderboard"], list)


