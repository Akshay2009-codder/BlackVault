"""
Shared helper to inject realistic data-quality problems into an otherwise
clean generated dataset, scaled by noise_level (0.0-1.0). Used by every
generator in app/generators/ so corruption behaves consistently across
puzzle types.
"""

import random
from typing import List, Tuple
import numpy as np
import pandas as pd


def corrupt(df: pd.DataFrame, noise_level: float, feature_cols: List[str], seed: int = 42) -> Tuple[pd.DataFrame, dict]:
    """Return a corrupted copy of df and report dictionary. Never corrupts the target column."""
    rng = np.random.RandomState(seed)
    out = df.copy()
    n = len(out)

    report = {"missing": 0, "duplicates": 0, "outliers": 0}

    if noise_level <= 0 or n == 0:
        return out, report

    # 1. Missing values: randomly null out cells in feature columns.
    missing_frac = noise_level * 0.15
    missing_count = 0
    for col in feature_cols:
        mask = rng.rand(n) < missing_frac
        out.loc[mask, col] = np.nan
        missing_count += int(mask.sum())
    report["missing"] = missing_count

    # 2. Duplicate rows: append copies of random existing rows.
    dup_count = int(n * noise_level * 0.08)
    if dup_count > 0:
        dup_rows = out.sample(n=dup_count, random_state=seed, replace=True)
        out = pd.concat([out, dup_rows], ignore_index=True)
        report["duplicates"] = dup_count

    # 3. Outliers: scale up a few numeric feature values drastically.
    numeric_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(out[c])]
    outlier_count = int(len(out) * noise_level * 0.05)
    if outlier_count > 0 and numeric_cols:
        idx = rng.choice(out.index, size=outlier_count, replace=False)
        for i in idx:
            col = rng.choice(numeric_cols)
            std = out[col].std()
            if pd.isna(std) or std == 0:
                std = 1.0
            out.loc[i, col] = out[col].mean() + std * rng.uniform(8, 15)
        report["outliers"] = outlier_count

    return out.reset_index(drop=True), report


def add_categorical_column(df: pd.DataFrame, name: str, categories: List[str], seed: int = 42) -> pd.DataFrame:
    """Add a categorical column so the player must handle encoding."""
    rng = np.random.RandomState(seed)
    out = df.copy()
    out[name] = rng.choice(categories, size=len(out))
    return out


def inject_corruption(df: pd.DataFrame, rng: random.Random) -> Tuple[dict, pd.DataFrame]:
    """Mutates df with realistic data problems, returns (report, df)."""
    report = {"missing": 0, "duplicates": 0}
    n = len(df)
    feature_cols = [c for c in df.columns if c != "target"]

    n_missing = int(n * rng.uniform(0.04, 0.12))
    for _ in range(n_missing):
        r = rng.randrange(n)
        c = rng.choice(feature_cols)
        df.loc[r, c] = np.nan
    report["missing"] = n_missing

    n_dupes = rng.randint(2, 6)
    dupe_rows = df.sample(n=min(n_dupes, n), random_state=rng.randint(0, 10**6))
    df_out = pd.concat([df, dupe_rows], ignore_index=True)
    report["duplicates"] = len(dupe_rows)

    return report, df_out


def inject_corruption_no_target(df: pd.DataFrame, rng: random.Random) -> Tuple[dict, pd.DataFrame]:
    """Corruption for datasets without a target column (unsupervised)."""
    df = df.copy()
    df["target"] = 0
    report, df = inject_corruption(df, rng)
    df = df.drop(columns=["target"])
    return report, df
