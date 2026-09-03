"""
Classification puzzle dataset generator.
Generates binary/multiclass classification data with realistic feature noise.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.datasets import make_classification

from ..corruption import corrupt


def generate(rows: int, noise_level: float, target_metric: float, seed: int = 42) -> Dict[str, Any]:
    rng = np.random.RandomState(seed)
    n_features = 6

    X, y = make_classification(
        n_samples=rows,
        n_features=n_features,
        n_informative=4,
        n_redundant=1,
        n_classes=2,
        weights=[0.6, 0.4],
        flip_y=min(0.1, noise_level * 0.1),
        class_sep=1.2,
        random_state=seed,
    )

    cols = ["signal_freq", "packet_size", "latency_ms", "jitter", "error_rate", "entropy"]
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    # Inject corruption (missing values, duplicates, outliers in features)
    df, report = corrupt(df, noise_level, cols, seed=seed)

    # Prepare frontend preview
    preview_df = df.head(15).copy()
    preview_rows = preview_df.where(pd.notnull(preview_df), None).to_dict(orient="records")

    missing_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    duplicate_count = int(df.duplicated().sum())

    hint = "Clean missing and duplicate rows, scale features, and test Logistic Regression or Random Forest."

    dataset_preview = {
        "columns": list(df.columns),
        "rows": preview_rows,
        "target_col": "target",
        "missing_counts": missing_counts,
        "duplicate_row_count": duplicate_count,
        "total_rows": len(df),
        "hint": hint,
    }

    return {
        "type": "classification",
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "f1",
        "threshold": target_metric,
        "higher_is_better": True,
        "dataset_preview": dataset_preview,
    }
