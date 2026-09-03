"""
Clustering puzzle dataset generator.
Generates unlabeled multi-cluster spatial data for customer or sensor grouping.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.datasets import make_blobs

from ..corruption import corrupt


def generate(rows: int, noise_level: float, target_metric: float, seed: int = 42) -> Dict[str, Any]:
    n_features = 4
    n_clusters = 3

    X, _ = make_blobs(
        n_samples=rows,
        n_features=n_features,
        centers=n_clusters,
        cluster_std=1.0 + noise_level * 0.8,
        random_state=seed,
    )

    cols = ["energy_draw", "rf_signature", "spectral_flux", "phase_offset"]
    df = pd.DataFrame(X, columns=cols)

    df, report = corrupt(df, noise_level, cols, seed=seed)

    preview_df = df.head(15).copy()
    preview_rows = preview_df.where(pd.notnull(preview_df), None).to_dict(orient="records")

    missing_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    duplicate_count = int(df.duplicated().sum())

    hint = "Unsupervised data: clean nulls, scale features, and configure KMeans with k=3."

    dataset_preview = {
        "columns": list(df.columns),
        "rows": preview_rows,
        "target_col": None,
        "missing_counts": missing_counts,
        "duplicate_row_count": duplicate_count,
        "total_rows": len(df),
        "hint": hint,
    }

    return {
        "type": "clustering",
        "dataframe": df,
        "feature_cols": cols,
        "target_col": None,
        "metric": "silhouette",
        "threshold": target_metric,
        "higher_is_better": True,
        "dataset_preview": dataset_preview,
    }
