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
    response = client.post("/preprocess", json={"dataset": "house_prices"})
    assert response.status_code == 200


def test_preprocess_removes_duplicates_when_requested():
    without = client.post(
        "/preprocess", json={"dataset": "house_prices", "remove_duplicates": False}
    ).json()
    with_dedup = client.post(
        "/preprocess", json={"dataset": "house_prices", "remove_duplicates": True}
    ).json()
    assert with_dedup["rows_after"] <= without["rows_after"]


def test_preprocess_fill_median_leaves_no_missing_values():
    response = client.post(
        "/preprocess",
        json={"dataset": "house_prices", "missing_strategy": "fill_median"},
    ).json()
    assert response["missing_after"] == 0


def test_preprocess_unknown_dataset_returns_404():
    response = client.post("/preprocess", json={"dataset": "does_not_exist"})
    assert response.status_code == 404
