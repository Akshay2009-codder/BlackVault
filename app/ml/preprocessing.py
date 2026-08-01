"""
preprocessing.py
Applies the player's chosen preprocessing steps to a dataset.

This is deliberately built around a small, fixed set of "moves" the player
picks from in the puzzle UI (structured-choice design, not free-form code) —
easy to present as dropdowns/toggles in Unity, easy to validate server-side.
"""
import pandas as pd
import numpy as np


SUPPORTED_MISSING_STRATEGIES = ["drop_rows", "fill_mean", "fill_median", "fill_mode"]
SUPPORTED_SCALING = ["none", "standard", "minmax"]
SUPPORTED_OUTLIER_STRATEGIES = ["none", "clip_iqr", "remove_iqr"]


def handle_missing(df: pd.DataFrame, strategy: str) -> pd.DataFrame:
    df = df.copy()
    if strategy == "drop_rows":
        return df.dropna()
    numeric_cols = df.select_dtypes(include=np.number).columns
    if strategy == "fill_mean":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())
    elif strategy == "fill_median":
        df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].median())
    elif strategy == "fill_mode":
        for c in numeric_cols:
            df[c] = df[c].fillna(df[c].mode().iloc[0] if not df[c].mode().empty else 0)
    else:
        raise ValueError(f"Unknown missing-value strategy: {strategy}")
    return df


def handle_duplicates(df: pd.DataFrame, remove: bool) -> pd.DataFrame:
    return df.drop_duplicates().reset_index(drop=True) if remove else df


def handle_outliers(df: pd.DataFrame, cols, strategy: str) -> pd.DataFrame:
    df = df.copy()
    if strategy == "none":
        return df
    for c in cols:
        q1, q3 = df[c].quantile(0.25), df[c].quantile(0.75)
        iqr = q3 - q1
        low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
        if strategy == "clip_iqr":
            df[c] = df[c].clip(low, high)
        elif strategy == "remove_iqr":
            df = df[(df[c] >= low) & (df[c] <= high)]
    return df.reset_index(drop=True)


def scale_features(df: pd.DataFrame, cols, strategy: str):
    from sklearn.preprocessing import StandardScaler, MinMaxScaler
    df = df.copy()
    if strategy == "none":
        return df
    scaler = StandardScaler() if strategy == "standard" else MinMaxScaler()
    df[cols] = scaler.fit_transform(df[cols])
    return df


def apply_pipeline(df: pd.DataFrame, choices: dict, feature_cols, outlier_cols=None):
    """
    choices example:
    {
      "missing_strategy": "fill_median",
      "remove_duplicates": true,
      "outlier_strategy": "clip_iqr",
      "scaling": "standard"
    }
    """
    outlier_cols = outlier_cols or feature_cols

    df = handle_missing(df, choices.get("missing_strategy", "drop_rows"))
    df = handle_duplicates(df, choices.get("remove_duplicates", False))
    df = handle_outliers(df, outlier_cols, choices.get("outlier_strategy", "none"))
    df = scale_features(df, feature_cols, choices.get("scaling", "none"))
    return df
