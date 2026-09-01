import random

import pandas as pd
from sklearn.datasets import make_classification

from ..config import FEATURE_NAMES_POOL
from ..corruption import inject_corruption


def generate(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(4, 4 + difficulty)
    n_samples = rng.randint(300, 500)
    class_weight = rng.uniform(0.5, 0.8)
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        n_redundant=0,
        n_classes=2,
        weights=[class_weight, 1 - class_weight],
        flip_y=0.005 + 0.006 * difficulty,
        class_sep=1.3,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    report, df = inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.68, 0.8) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "classification",
        "difficulty": difficulty,
        "title": rng.choice([
            "Perimeter Intrusion Classifier", "Badge Fraud Detector",
            "Access Anomaly Gate",
        ]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "f1",
        "threshold": metric_threshold,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }