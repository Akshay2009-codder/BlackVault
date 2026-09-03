"""
Anomaly detection puzzle dataset generator.
Generates predominantly normal operational metrics with injected anomalous intrusions.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd

from ..corruption import corrupt


def generate(rows: int, noise_level: float, target_metric: float, seed: int = 42) -> Dict[str, Any]:
    rng = np.random.RandomState(seed)
    n_features = 4

    # 95% normal Gaussian points
    contamination = 0.06 + noise_level * 0.04
    n_anomalies = max(4, int(rows * contamination))
    n_normal = rows - n_anomalies

    normal_data = rng.normal(loc=0.0, scale=1.0, size=(n_normal, n_features))
    anomaly_data = rng.uniform(low=-4.5, high=4.5, size=(n_anomalies, n_features))
    # Push anomalies outwards
    anomaly_data += np.sign(anomaly_data) * rng.uniform(2.0, 4.0, size=(n_anomalies, n_features))

    X = np.vstack([normal_data, anomaly_data])
    y = np.hstack([np.zeros(n_normal, dtype=int), np.ones(n_anomalies, dtype=int)])

    # Shuffle
    indices = np.arange(len(X))
    rng.shuffle(indices)
    X = X[indices]
    y = y[indices]

    cols = ["packet_ratio", "auth_fails", "port_scans", "payload_entropy"]
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    df, report = corrupt(df, noise_level, cols, seed=seed)

    preview_df = df.head(15).copy()
    preview_rows = preview_df.where(pd.notnull(preview_df), None).to_dict(orient="records")

    missing_counts = {col: int(df[col].isna().sum()) for col in df.columns}
    duplicate_count = int(df.duplicated().sum())

    hint = "Unsupervised anomaly detection: clean data, scale features, and run Isolation Forest with matching contamination."

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
        "type": "anomaly",
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "recall",
        "threshold": target_metric,
        "higher_is_better": True,
        "contamination": round(contamination, 3),
        "dataset_preview": dataset_preview,
    }
