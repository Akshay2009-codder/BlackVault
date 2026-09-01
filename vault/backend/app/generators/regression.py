import random

import pandas as pd
from sklearn.datasets import make_regression

from ..config import FEATURE_NAMES_POOL
from ..corruption import inject_corruption


def generate(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(3, 3 + difficulty)
    n_samples = rng.randint(300, 500)
    X, y = make_regression(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        noise=8 + 4 * difficulty,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    report, df = inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.75, 0.9) - 0.03 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "regression",
        "difficulty": difficulty,
        "title": rng.choice([
            "Reactor Load Forecaster", "Facility Power Draw Predictor",
        ]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "r2",
        "threshold": metric_threshold,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }