"""
Corruption Engine — BlackVault
================================
Injects data quality problems into datasets dynamically during gameplay.
"""

from __future__ import annotations

from typing import Optional
import numpy as np
import pandas as pd


def inject_missing_values(
    df: pd.DataFrame,
    missing_rate: float = 0.08,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Randomly set numeric cell values to NaN."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in numeric_cols:
        mask = rng.random(len(df)) < missing_rate
        df.loc[mask, col] = np.nan
    return df


def inject_duplicates(
    df: pd.DataFrame,
    dup_rate: float = 0.05,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Duplicate a fraction of rows."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    dup_count = max(1, int(len(df) * dup_rate))
    dup_rows = df.sample(n=dup_count, random_state=int(rng.integers(0, 1_000_000)))
    return pd.concat([df, dup_rows], ignore_index=True)


def inject_outliers(
    df: pd.DataFrame,
    outlier_count: int = 5,
    multiplier_range: tuple = (4.0, 8.0),
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Inject extreme outlier values into a random numeric column."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        return df

    target_col = rng.choice(numeric_cols)
    outlier_indices = rng.choice(
        df.index, size=min(outlier_count, len(df)), replace=False
    )
    col_std = df[target_col].std() or 1.0
    direction = rng.choice([-1, 1])
    multiplier = rng.uniform(*multiplier_range)
    df.loc[outlier_indices, target_col] += direction * col_std * multiplier
    return df


def inject_label_noise(
    df: pd.DataFrame,
    target_col: str,
    noise_rate: float = 0.1,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Randomly flip classification labels to simulate wrong labels."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    if target_col not in df.columns:
        return df

    unique_labels = df[target_col].unique()
    if len(unique_labels) < 2:
        return df

    mask = rng.random(len(df)) < noise_rate
    for idx in df.index[mask]:
        current = df.loc[idx, target_col]
        other_labels = [l for l in unique_labels if l != current]
        if other_labels:
            df.loc[idx, target_col] = rng.choice(other_labels)
    return df


def inject_correlated_features(
    df: pd.DataFrame,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Add a new highly correlated feature column (feature leakage simulation)."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if not numeric_cols:
        return df

    source_col = rng.choice(numeric_cols)
    noise = rng.normal(0, 0.01, len(df))
    df["correlated_feature"] = df[source_col] * 0.99 + noise
    return df


def modify_class_balance(
    df: pd.DataFrame,
    target_col: str,
    minority_ratio: float = 0.1,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    """Resample to create severe class imbalance."""
    rng = np.random.default_rng(seed)
    df = df.copy()
    if target_col not in df.columns:
        return df

    unique_labels = df[target_col].unique()
    if len(unique_labels) < 2:
        return df

    majority_label = df[target_col].value_counts().idxmax()
    majority_rows = df[df[target_col] == majority_label]
    minority_rows = df[df[target_col] != majority_label]

    target_minority_size = max(5, int(len(majority_rows) * minority_ratio))
    if len(minority_rows) > target_minority_size:
        minority_rows = minority_rows.sample(
            n=target_minority_size,
            random_state=int(rng.integers(0, 1_000_000)),
        )

    result = pd.concat([majority_rows, minority_rows], ignore_index=True)
    return result.sample(
        frac=1, random_state=int(rng.integers(0, 1_000_000))
    ).reset_index(drop=True)


def reduce_time_limit(current_limit: int, reduction_percent: float = 0.2) -> int:
    return max(30, int(current_limit * (1 - reduction_percent)))


def apply_composite_corruption(
    df: pd.DataFrame,
    missing_rate: float = 0.05,
    dup_rate: float = 0.03,
    outlier_count: int = 5,
    seed: Optional[int] = None,
) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    df = df.copy()

    if missing_rate > 0:
        df = inject_missing_values(df, missing_rate, int(rng.integers(0, 1_000_000)))

    if dup_rate > 0:
        df = inject_duplicates(df, dup_rate, int(rng.integers(0, 1_000_000)))

    if outlier_count > 0:
        df = inject_outliers(df, outlier_count, seed=int(rng.integers(0, 1_000_000)))

    return df
