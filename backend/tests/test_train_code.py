"""
Tests for POST /train/code endpoint across all level problem types (cleaning, regression, classification, clustering, anomaly_detection).
"""

import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


def test_train_code_level1_cleaning_success():
    """Verifies that Level 1 data cleaning code evaluating is_clean passes."""
    code = (
        "clean_df = df.drop_duplicates()\n"
        "clean_df = clean_df.fillna(clean_df.median(numeric_only=True))\n"
        "for col in clean_df.select_dtypes(include='object').columns:\n"
        "    clean_df[col] = clean_df[col].astype('category').cat.codes\n"
        "is_clean = int(clean_df.isnull().sum().sum() == 0 and clean_df.duplicated().sum() == 0)\n"
    )
    response = client.post(
        "/train/code",
        json={
            "mission_id": "L1_CLEANING_HOUSE",
            "level_id": "1",
            "dataset": "house_prices",
            "problem_type": "cleaning",
            "code": code,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["passed"] is True
    assert body["door_status"] == "UNLOCKED"
    assert body["target_metric"] == "is_clean"
    assert body["achieved"] == 1.0


def test_train_code_level1_cleaning_with_clean_df():
    """Verifies that Level 1 code setting clean_df passes."""
    code = (
        "clean_df = df.drop_duplicates()\n"
        "clean_df = clean_df.fillna(0)\n"
    )
    response = client.post(
        "/train/code",
        json={
            "mission_id": "L1_CLEANING_HOUSE",
            "level_id": "1",
            "dataset": "house_prices",
            "problem_type": "cleaning",
            "code": code,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["passed"] is True
    assert body["door_status"] == "UNLOCKED"


def test_train_code_classification_success():
    """Verifies classification code returning y_test and y_pred."""
    code = (
        "X = df[['age', 'sex', 'cp', 'trestbps', 'chol', 'thalach', 'exang']]\n"
        "y = df['target']\n"
        "X_train, y_test_arr, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)\n"
        "clf = RandomForestClassifier(random_state=42)\n"
        "clf.fit(X_train, y_train)\n"
        "y_pred = clf.predict(y_test_arr)\n"
    )
    response = client.post(
        "/train/code",
        json={
            "mission_id": "L3_CLASSIFY_HEART",
            "level_id": "3",
            "dataset": "heart_disease",
            "problem_type": "classification",
            "target_col": "target",
            "feature_cols": ["age", "sex", "cp", "trestbps", "chol", "thalach", "exang"],
            "target_metric": "accuracy",
            "target_metric_value": 0.70,
            "code": code,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert "achieved" in body
    assert body["target_metric"] == "accuracy"


def test_train_code_missing_output():
    """Verifies error response when mandatory output variable is missing."""
    code = "x = 42\n"
    response = client.post(
        "/train/code",
        json={
            "mission_id": "L1_CLEANING_HOUSE",
            "level_id": "1",
            "dataset": "house_prices",
            "problem_type": "cleaning",
            "code": code,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["passed"] is False
    assert "is_clean" in body["error"]
