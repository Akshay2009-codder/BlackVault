"""
Tests for corruption engine and event system.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_random_event_generator():
    """Tests random event selection endpoint and status payload structure."""
    response = client.get("/events/random?difficulty=easy")
    assert response.status_code == 200
    body = response.json()
    assert "event" in body
    assert "should_trigger" in body


def test_corrupt_endpoint():
    """Tests dynamic corruption endpoint for dataset modification."""
    response = client.post(
        "/corrupt",
        json={"dataset": "house_prices", "event_type": "inject_missing", "params": {"missing_rate": 0.05}},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "corrupted"
