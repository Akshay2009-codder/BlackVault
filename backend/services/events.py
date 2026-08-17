"""
Random Events System — BlackVault
====================================
Defines the pool of random events that the lab AI can trigger during gameplay.
"""

from __future__ import annotations

import random
from typing import Optional, List

from models.mission_models import RandomEventConfig


EVENT_POOL: List[dict] = [
    {
        "event_id": "EVT_MISSING_VALUES",
        "event_type": "inject_missing",
        "title": "⚠ DATA CORRUPTION DETECTED",
        "description": (
            "The security AI has injected null values into your dataset. "
            "Several feature columns now contain missing data. "
            "Re-evaluate your preprocessing strategy."
        ),
        "severity": "medium",
        "affects_dataset": True,
        "params": {"missing_rate": 0.08},
        "min_difficulty": "easy",
    },
    {
        "event_id": "EVT_DUPLICATES",
        "event_type": "inject_duplicates",
        "title": "⚠ REDUNDANT DATA INJECTION",
        "description": (
            "Warning: The AI has cloned multiple data entries. "
            "Duplicate rows detected in the active dataset. "
            "Your model may overfit if you don't remove them."
        ),
        "severity": "low",
        "affects_dataset": True,
        "params": {"dup_rate": 0.08},
        "min_difficulty": "easy",
    },
    {
        "event_id": "EVT_OUTLIERS",
        "event_type": "inject_outliers",
        "title": "⚠ ANOMALOUS SIGNAL SPIKE",
        "description": (
            "The facility's sensors are malfunctioning. "
            "Extreme outlier values have been introduced into the dataset. "
            "These could severely damage your model's predictions."
        ),
        "severity": "medium",
        "affects_dataset": True,
        "params": {"outlier_count": 8, "multiplier_range": [5.0, 10.0]},
        "min_difficulty": "medium",
    },
    {
        "event_id": "EVT_LABEL_NOISE",
        "event_type": "inject_label_noise",
        "title": "⚠ LABEL CORRUPTION PROTOCOL",
        "description": (
            "The AI has tampered with target labels. "
            "Some classification targets have been deliberately mislabeled. "
            "Your model's accuracy will suffer unless you detect and handle this."
        ),
        "severity": "high",
        "affects_dataset": True,
        "params": {"noise_rate": 0.12},
        "min_difficulty": "medium",
    },
    {
        "event_id": "EVT_CORRELATED_FEATURE",
        "event_type": "inject_correlated_features",
        "title": "⚠ FEATURE LEAKAGE DETECTED",
        "description": (
            "A highly correlated feature has appeared in your dataset. "
            "This could be a trap — the AI may be testing whether you "
            "recognize and remove redundant features."
        ),
        "severity": "medium",
        "affects_dataset": True,
        "params": {},
        "min_difficulty": "medium",
    },
    {
        "event_id": "EVT_CLASS_IMBALANCE",
        "event_type": "modify_class_balance",
        "title": "⚠ CLASS DISTRIBUTION SHIFT",
        "description": (
            "The security system has resampled your training data. "
            "One class now heavily dominates. Accuracy alone is no longer "
            "a reliable metric — consider using F1 or Recall."
        ),
        "severity": "high",
        "affects_dataset": True,
        "params": {"minority_ratio": 0.1},
        "min_difficulty": "hard",
    },
    {
        "event_id": "EVT_TIME_PRESSURE",
        "event_type": "reduce_time",
        "title": "⚠ ACCELERATED LOCKDOWN",
        "description": (
            "The AI has detected your progress and is accelerating the "
            "lockdown sequence. Your remaining time has been reduced!"
        ),
        "severity": "high",
        "affects_dataset": False,
        "params": {"reduction_percent": 0.25},
        "min_difficulty": "hard",
    },
    {
        "event_id": "EVT_METRIC_CHANGE",
        "event_type": "change_metric",
        "title": "⚠ EVALUATION CRITERIA CHANGED",
        "description": (
            "The security terminal has switched its evaluation metric. "
            "Your model must now satisfy a different performance threshold. "
            "Adapt your approach accordingly."
        ),
        "severity": "medium",
        "affects_dataset": False,
        "params": {},
        "min_difficulty": "medium",
    },
]

DIFFICULTY_ORDER = {"easy": 0, "medium": 1, "hard": 2, "boss": 3}


def get_random_event(
    difficulty: str = "medium",
    problem_type: Optional[str] = None,
    seed: Optional[int] = None,
) -> RandomEventConfig:
    """Selects an eligible random corruption event based on mission difficulty.

    Args:
        difficulty: Mission difficulty tier (easy, medium, hard, boss).
        problem_type: Machine learning task type (classification, regression, etc).
        seed: Optional integer seed for pseudo-random event sampling.

    Returns:
        Configured RandomEventConfig object.
    """
    if seed is not None:
        random.seed(seed)

    current_diff_level = DIFFICULTY_ORDER.get(difficulty, 1)

    eligible = [
        e for e in EVENT_POOL
        if DIFFICULTY_ORDER.get(e["min_difficulty"], 0) <= current_diff_level
    ]

    if problem_type and problem_type != "classification":
        eligible = [e for e in eligible if e["event_type"] != "inject_label_noise"]

    if problem_type and problem_type not in ("classification", "anomaly_detection"):
        eligible = [e for e in eligible if e["event_type"] != "modify_class_balance"]

    if not eligible:
        eligible = EVENT_POOL[:2]

    chosen = random.choice(eligible)

    return RandomEventConfig(
        event_id=chosen["event_id"],
        event_type=chosen["event_type"],
        title=chosen["title"],
        description=chosen["description"],
        severity=chosen["severity"],
        affects_dataset=chosen["affects_dataset"],
        params=chosen["params"],
    )


def get_event_probability(difficulty: str) -> float:
    """Returns the trigger probability of random events for a given difficulty tier.

    Args:
        difficulty: Mission difficulty string.

    Returns:
        Float probability between 0.0 and 1.0.
    """
    probabilities = {
        "easy": 0.1,
        "medium": 0.25,
        "hard": 0.4,
        "boss": 0.6,
    }
    return probabilities.get(difficulty, 0.2)


def get_event_by_id(event_id: str) -> Optional[dict]:
    """Retrieves an event dictionary from the event pool by event ID.

    Args:
        event_id: Unique event identifier string (e.g. EVT_MISSING_VALUES).

    Returns:
        Event definition dictionary or None if not found.
    """
    for event in EVENT_POOL:
        if event["event_id"] == event_id:
            return event
    return None
