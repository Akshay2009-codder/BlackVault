"""Injects realistic data-quality problems into a generated dataset so every
puzzle ships with something to actually clean, not just a raw sklearn toy
dataset.
"""

import random

import numpy as np
import pandas as pd


def inject_corruption(df: pd.DataFrame, rng: random.Random):
    """Mutates df in place with realistic data problems, returns (report, df)."""
    report = {"missing": 0, "duplicates": 0}
    n = len(df)
    feature_cols = [c for c in df.columns if c != "target"]

    # Missing values scattered across random feature cells
    n_missing = int(n * rng.uniform(0.04, 0.12))
    for _ in range(n_missing):
        r = rng.randrange(n)
        c = rng.choice(feature_cols)
        df.loc[r, c] = np.nan
    report["missing"] = n_missing

    # Duplicate a handful of rows
    n_dupes = rng.randint(2, 6)
    dupe_rows = df.sample(n=min(n_dupes, n), random_state=rng.randint(0, 10**6))
    df_out = pd.concat([df, dupe_rows], ignore_index=True)
    report["duplicates"] = len(dupe_rows)

    return report, df_out


def inject_corruption_no_target(df: pd.DataFrame, rng: random.Random):
    """Same corruption as inject_corruption but for frames with no target
    column (e.g. clustering, which is unsupervised).
    """
    df = df.copy()
    df["target"] = 0  # placeholder so shared helper logic can reuse feature-col detection
    report, df = inject_corruption(df, rng)
    df = df.drop(columns=["target"])
    return report, df
