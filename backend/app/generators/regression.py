"""
Regression puzzle dataset generator.
Generates continuous prediction datasets (e.g. power grid output or voltage).
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.datasets import make_regression

from ..corruption import corrupt


def generate(rows: int, noise_level: float, target_metric: float, seed: int = 42) -> Dict[str, Any]:
    n_features = 5

    X, y = make_regression(
        n_samples=rows,
        n_features=n_features,
        n_informative=4,
        noise=noise_level * 15.0,
        random_state=seed,
    )

    cols = ["voltage_in", "core_temp", "coolant_flow", "flux_rate", "pressure_kpa"]
    df = pd.DataFrame(X, columns=cols)
    # Scale target to realistic numbers (e.g. power output 500-5000)
    df["target"] = np.round(y * 10 + 2500, 2)

    df, report = corrupt(df, noise_level, cols, seed=seed)

    preview_df = df.head(15).copy()
    preview_rows = preview_df.where(pd.notnull(preview_df), None).to_dict(orient="records")

    missing_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    duplicate_count = int(df.duplicated().sum())

    hint = "Impute missing values, drop duplicate rows, standardize features, and apply Linear Regression or Random Forest."

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
        "type": "regression",
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "r2",
        "threshold": 0.70 if target_metric > 100 else target_metric,  # R2 target around 0.70-0.85
        "higher_is_better": True,
        "dataset_preview": dataset_preview,
    }
