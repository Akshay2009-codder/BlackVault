import random

import pandas as pd
from sklearn.datasets import make_blobs

from ..config import FEATURE_NAMES_POOL
from ..corruption import inject_corruption_no_target


def generate(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(2, 3)
    n_samples = rng.randint(280, 450)
    true_k = rng.randint(3, 5)
    X, _ = make_blobs(
        n_samples=n_samples,
        n_features=n_features,
        centers=true_k,
        cluster_std=rng.uniform(0.8, 1.6 + 0.15 * difficulty),
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    # clustering is unsupervised — no target column is exposed or used
    report, df = inject_corruption_no_target(df, rng)

    metric_threshold = round(rng.uniform(0.45, 0.6) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "clustering",
        "difficulty": difficulty,
        "title": rng.choice(["Customer Cluster Grid", "Personnel Movement Grouping"]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": None,
        "metric": "silhouette",
        "threshold": metric_threshold,
        "suggested_k": true_k,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }
