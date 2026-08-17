"""
Tests for POST /preprocess.

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


def test_preprocess_house_prices_returns_200():
    """Tests standard preprocessing endpoint call for house_prices dataset."""
    response = client.post("/preprocess", json={"dataset": "house_prices"})
    assert response.status_code == 200


def test_preprocess_removes_duplicates_when_requested():
    """Tests duplicate row removal flag logic."""
    without = client.post(
        "/preprocess", json={"dataset": "house_prices", "remove_duplicates": False}
    ).json()
    with_dedup = client.post(
        "/preprocess", json={"dataset": "house_prices", "remove_duplicates": True}
    ).json()
    assert with_dedup["rows_after"] <= without["rows_after"]


def test_preprocess_fill_median_leaves_no_missing_values():
    """Tests that fill_median strategy removes all null values."""
    response = client.post(
        "/preprocess",
        json={"dataset": "house_prices", "missing_strategy": "fill_median"},
    ).json()
    assert response["missing_after"] == 0


def test_preprocess_unknown_dataset_returns_404():
    """Tests that non-existent dataset request returns 404 Not Found."""
    response = client.post("/preprocess", json={"dataset": "does_not_exist"})
    assert response.status_code == 404


def test_preprocess_invalid_path_returns_400():
    """Tests that directory traversal names return 400 Bad Request."""
    response = client.post("/preprocess", json={"dataset": "../secret"})
    assert response.status_code == 400
