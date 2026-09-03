"""
Mystery puzzle dataset generator (Boss room / Core Security Vault).
Presents an unlabelled challenge type where the player must inspect the dataset
to determine whether it is classification, regression, clustering, or anomaly detection.
"""

from typing import Dict, Any
import random

from . import classification, regression, clustering, anomaly


def generate(rows: int, noise_level: float, target_metric: float, seed: int = 42) -> Dict[str, Any]:
    rng = random.Random(seed)
    chosen_type = rng.choice(["classification", "regression", "clustering", "anomaly"])

    if chosen_type == "classification":
        res = classification.generate(rows, noise_level, target_metric, seed)
    elif chosen_type == "regression":
        res = regression.generate(rows, noise_level, target_metric, seed)
    elif chosen_type == "clustering":
        res = clustering.generate(rows, noise_level, target_metric, seed)
    else:
        res = anomaly.generate(rows, noise_level, target_metric, seed)

    res["real_type"] = chosen_type
    res["type"] = "mystery"
    res["dataset_preview"]["hint"] = "CORE PROTOCOL: Analyze column names and values to deduce the problem type."
    return res
