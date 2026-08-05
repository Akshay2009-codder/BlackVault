"""
Tests for POST /train and GET /mission/generate.

Requires the sample datasets to exist first:
    python generate_datasets.py
(run from the backend/ directory before running pytest)
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_mission_generate_returns_a_mission():
    response = client.get("/mission/generate?level=2")
    assert response.status_code == 200
    body = response.json()
    assert body["level"] == 2
    assert "dataset" in body


def test_mission_generate_unknown_level_returns_404():
    response = client.get("/mission/generate?level=99")
    assert response.status_code == 404


def test_train_regression_returns_door_status():
    response = client.post(
        "/train",
        json={
            "dataset": "house_prices",
            "problem_type": "regression",
            "algorithm": "random_forest",
            "target_col": "price",
            "target_metric": "rmse",
            "target_metric_value": 30000,
            "metric_direction": "lower_is_better",
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["door_status"] in ("UNLOCKED", "LOCKED")
    assert "achieved" in body


def test_train_classification_returns_accuracy_metric():
    response = client.post(
        "/train",
        json={
            "dataset": "heart_disease",
            "problem_type": "classification",
            "algorithm": "random_forest",
            "target_col": "target",
            "target_metric": "accuracy",
            "target_metric_value": 0.75,
        },
    )
    assert response.status_code == 200
    assert response.json()["target_metric"] == "accuracy"


def test_train_unknown_algorithm_returns_400():
    response = client.post(
        "/train",
        json={
            "dataset": "house_prices",
            "problem_type": "regression",
            "algorithm": "not_a_real_algorithm",
            "target_col": "price",
        },
    )
    assert response.status_code == 400
