"""
Dynamic Mission Generator — BlackVault
=========================================
Creates procedurally generated challenge missions with randomized
parameters for replayability beyond the 5 story levels.
"""

from __future__ import annotations

import hashlib
import random
from datetime import date
from typing import Optional, Dict, Any


CHALLENGE_DATASETS = [
    {
        "name": "house_prices",
        "problem_types": ["regression", "cleaning"],
        "target_col": "price",
        "feature_cols": ["area_sqft", "bedrooms", "bathrooms", "house_age", "location_score"],
    },
    {
        "name": "heart_disease",
        "problem_types": ["classification"],
        "target_col": "target",
        "feature_cols": ["age", "sex", "cp", "trestbps", "chol", "thalach", "exang"],
    },
    {
        "name": "mall_customers",
        "problem_types": ["clustering"],
        "target_col": None,
        "feature_cols": ["annual_income_k", "spending_score"],
    },
    {
        "name": "credit_card",
        "problem_types": ["anomaly_detection", "classification"],
        "target_col": "is_fraud",
        "feature_cols": ["amount", "hour", "v1", "v2"],
    },
]

METRIC_CONFIGS = {
    "regression": {
        "easy": {"metric": "rmse", "value": 40000, "direction": "lower_is_better"},
        "medium": {"metric": "rmse", "value": 25000, "direction": "lower_is_better"},
        "hard": {"metric": "rmse", "value": 15000, "direction": "lower_is_better"},
    },
    "classification": {
        "easy": {"metric": "accuracy", "value": 0.65, "direction": "higher_is_better"},
        "medium": {"metric": "accuracy", "value": 0.78, "direction": "higher_is_better"},
        "hard": {"metric": "f1_score", "value": 0.80, "direction": "higher_is_better"},
    },
    "clustering": {
        "easy": {"metric": "silhouette_score", "value": 0.25, "direction": "higher_is_better"},
        "medium": {"metric": "silhouette_score", "value": 0.35, "direction": "higher_is_better"},
        "hard": {"metric": "silhouette_score", "value": 0.50, "direction": "higher_is_better"},
    },
    "anomaly_detection": {
        "easy": {"metric": "anomaly_rate", "value": 0.05, "direction": "range_2_to_15_percent"},
        "medium": {"metric": "anomaly_rate", "value": 0.05, "direction": "range_2_to_15_percent"},
        "hard": {"metric": "anomaly_rate", "value": 0.05, "direction": "range_2_to_15_percent"},
    },
}

TIME_LIMITS = {
    "easy": 300,
    "medium": 200,
    "hard": 150,
}

ALGORITHM_POOLS = {
    "regression": ["linear_regression", "decision_tree", "random_forest", "xgboost"],
    "classification": ["logistic_regression", "decision_tree", "random_forest", "svm", "xgboost"],
    "clustering": ["kmeans", "dbscan", "hierarchical"],
    "anomaly_detection": ["isolation_forest", "one_class_svm"],
    "cleaning": [],
}

SECTOR_NAMES = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon",
    "Zeta", "Eta", "Theta", "Iota", "Kappa",
    "Lambda", "Mu", "Nu", "Xi", "Omicron",
]

CHALLENGE_DESCRIPTIONS = {
    "regression": "A locked door requires a prediction model. Train a regressor to meet the target RMSE.",
    "classification": "The biometric scanner is active. Classify the data to override the security lock.",
    "clustering": "Segment the data into meaningful clusters to bypass the pattern-lock firewall.",
    "anomaly_detection": "Suspicious signals detected. Identify anomalies to neutralize the threat.",
    "cleaning": "Corrupted data blocks the terminal. Clean and preprocess the dataset to restore access.",
}

CORRUPTION_PRESETS = {
    "easy": {"missing_rate": 0.03, "dup_rate": 0.02, "outlier_count": 2},
    "medium": {"missing_rate": 0.06, "dup_rate": 0.04, "outlier_count": 5},
    "hard": {"missing_rate": 0.10, "dup_rate": 0.06, "outlier_count": 8},
}


def generate_challenge_mission(
    player_xp: int = 0,
    seed: Optional[int] = None,
) -> Dict[str, Any]:
    """Generates a procedural challenge mission tailored to player XP.

    Args:
        player_xp: Accumulated experience points used to set difficulty.
        seed: Optional integer seed for deterministic mission parameters.

    Returns:
        Dictionary payload containing complete mission metadata and constraints.
    """
    rng = random.Random(seed)
    difficulty = _xp_to_difficulty(player_xp)
    dataset_config = rng.choice(CHALLENGE_DATASETS)
    problem_type = rng.choice(dataset_config["problem_types"])
    metric_config = METRIC_CONFIGS.get(problem_type, {}).get(difficulty, {})
    algorithms = ALGORITHM_POOLS.get(problem_type, [])
    corruption = CORRUPTION_PRESETS.get(difficulty, CORRUPTION_PRESETS["medium"])
    sector = rng.choice(SECTOR_NAMES)
    mission_id = f"CHG_{problem_type.upper()}_{sector}_{rng.randint(1000, 9999)}"

    return {
        "mission_id": mission_id,
        "level": "challenge",
        "title": f"Challenge — Sector {sector}",
        "description": CHALLENGE_DESCRIPTIONS.get(problem_type, "Complete the challenge."),
        "problem_type": problem_type,
        "dataset": dataset_config["name"],
        "target_col": dataset_config["target_col"],
        "feature_cols": dataset_config["feature_cols"],
        "algorithms_allowed": algorithms,
        "target_metric": metric_config.get("metric", "accuracy"),
        "target_metric_value": metric_config.get("value", 0.75),
        "metric_direction": metric_config.get("direction", "higher_is_better"),
        "k_range": [2, 8] if problem_type == "clustering" else None,
        "difficulty": difficulty,
        "time_limit_seconds": TIME_LIMITS.get(difficulty, 200),
        "max_retries": 3 if difficulty == "easy" else (2 if difficulty == "medium" else 1),
        "hints_available": difficulty == "easy",
        "corruption_preset": corruption,
    }


def generate_daily_challenge() -> Dict[str, Any]:
    """Generates the global daily challenge mission based on UTC calendar date.

    Returns:
        Dictionary payload containing daily mission specification.
    """
    today = date.today().isoformat()
    seed = int(hashlib.sha256(today.encode()).hexdigest()[:8], 16)

    mission = generate_challenge_mission(player_xp=1000, seed=seed)
    mission["mission_id"] = f"DAILY_{today}"
    mission["title"] = f"Daily Challenge — {today}"
    mission["description"] = (
        "Today's facility-wide challenge. "
        "All operatives receive the same puzzle. Compare your results! "
        + mission["description"]
    )
    mission["difficulty"] = "medium"
    mission["time_limit_seconds"] = 240
    mission["max_retries"] = 2

    return mission


def _xp_to_difficulty(xp: int) -> str:
    """Maps player XP to difficulty level string (easy, medium, hard)."""
    if xp >= 2000:
        return "hard"
    elif xp >= 500:
        return "medium"
    return "easy"
