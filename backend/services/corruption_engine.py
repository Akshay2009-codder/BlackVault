"""
Corruption engine service module.

Injects realistic data-quality issues (missing values, duplicates,
outliers) into a clean DataFrame. Used by generate_datasets.py's
gen_boss_dataset() so the boss mission's corruption pattern lives here
instead of being buried inline in the dataset generator — this is also
where you'd add new corruption types (label noise, correlated features,
class imbalance shifts) described in the PRD's "Random Events" system.
"""

import numpy as np
import pandas as pd


def inject_boss_level_issues(df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """
    Harder than the fixed levels 1-5 datasets: higher missing rate, more
    duplicates, and a few injected outliers on a RANDOM numeric column,
    so even the corruption pattern isn't fully predictable from having
    played the earlier levels.
    """
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    # 8-12% missing values scattered across numeric columns
    missing_rate = rng.uniform(0.08, 0.12)
    for col in numeric_cols:
        mask = rng.random(len(df)) < missing_rate
        df.loc[mask, col] = np.nan

    # 3-5% duplicate rows
    dup_count = max(1, int(len(df) * rng.uniform(0.03, 0.05)))
    dup_rows = df.sample(n=dup_count, random_state=int(rng.integers(0, 1_000_000)))
    df = pd.concat([df, dup_rows], ignore_index=True)

    # A handful of outliers on one random numeric column
    if numeric_cols:
        target_col = rng.choice(numeric_cols)
        outlier_count = int(rng.integers(3, 8))
        outlier_indices = rng.choice(df.index, size=outlier_count, replace=False)
        col_std = df[target_col].std()
        df.loc[outlier_indices, target_col] += rng.choice([-1, 1]) * col_std * rng.uniform(5, 8)

    return df.sample(frac=1, random_state=int(rng.integers(0, 1_000_000))).reset_index(drop=True)


def inject_standard_issues(df: pd.DataFrame, rng: np.random.Generator,
                            missing_rate: float = 0.05,
                            duplicate_count: int = 8) -> pd.DataFrame:
    """
    Lighter-weight corruption for the fixed levels 1-5 datasets — smaller
    missing rate, fewer duplicates, no outlier injection. Not currently
    called by generate_datasets.py (each gen_*() function there injects
    its own hand-tuned issues per dataset), but available here if you
    want to standardize that logic later instead of repeating it per
    dataset generator.
    """
    df = df.copy()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()

    for col in numeric_cols:
        mask = rng.random(len(df)) < missing_rate
        df.loc[mask, col] = np.nan

    if duplicate_count > 0 and len(df) >= duplicate_count:
        dup_rows = df.sample(n=duplicate_count, random_state=int(rng.integers(0, 1_000_000)))
        df = pd.concat([df, dup_rows], ignore_index=True)

    return df


def apply_named_event(df: pd.DataFrame, event_type: str, params: dict = None) -> pd.DataFrame:
    """Applies a named corruption event to a dataset copy.

    Args:
        df: Input Pandas DataFrame.
        event_type: Type of corruption event (e.g. inject_missing, inject_duplicates, inject_outliers).
        params: Event specific options dictionary.

    Returns:
        Corrupted DataFrame.

    Raises:
        ValueError: If event_type is unsupported.
    """
    params = params or {}
    df = df.copy()
    rng = np.random.default_rng()

    if event_type == "inject_missing":
        rate = float(params.get("missing_rate", 0.05))
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        for col in numeric_cols:
            mask = rng.random(len(df)) < rate
            df.loc[mask, col] = np.nan

    elif event_type == "inject_duplicates":
        count = min(int(params.get("count", 5)), len(df))
        if count > 0:
            dup_rows = df.sample(n=count, random_state=int(rng.integers(0, 1_000_000)))
            df = pd.concat([df, dup_rows], ignore_index=True)

    elif event_type == "inject_outliers":
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if numeric_cols:
            col = rng.choice(numeric_cols)
            count = min(int(params.get("count", 3)), len(df))
            idx = rng.choice(df.index, size=count, replace=False)
            std = df[col].std()
            df.loc[idx, col] += rng.choice([-1, 1]) * std * rng.uniform(5, 8)

    else:
        raise ValueError(
            f"Unknown event_type '{event_type}'. "
            "Allowed: inject_missing, inject_duplicates, inject_outliers"
        )

    return df