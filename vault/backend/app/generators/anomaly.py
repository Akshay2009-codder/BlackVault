import random

import pandas as pd
from sklearn.datasets import make_classification

from ..config import FEATURE_NAMES_POOL
from ..corruption import inject_corruption


def generate(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(4, 4 + difficulty)
    n_samples = rng.randint(700, 950)
    contamination = rng.uniform(0.06, 0.09)
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        n_redundant=0,
        n_classes=2,
        weights=[1 - contamination, contamination],
        flip_y=0.0,
        class_sep=3.4 - 0.1 * difficulty,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y  # 1 = fraudulent / anomalous, hidden from the player

    report, df = inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.35, 0.45) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "anomaly",
        "difficulty": difficulty,
        "title": rng.choice(["Fraud Transaction Scanner", "Reactor Sensor Anomaly Gate"]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "recall",
        "threshold": metric_threshold,
        "contamination": round(contamination, 3),
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }