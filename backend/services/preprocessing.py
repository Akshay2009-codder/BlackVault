"""Preprocessing logic service module."""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder


def apply_preprocessing(
    df: pd.DataFrame,
    missing_strategy: str = "fill_median",
    remove_duplicates: bool = True,
    outlier_strategy: str = "clip_iqr",
    encoding: str = "label",
    scaling: str = "standard",
) -> pd.DataFrame:
    """Applies preprocessing steps to a pandas DataFrame."""
    df = df.copy()

    if remove_duplicates:
        df = df.drop_duplicates().reset_index(drop=True)

    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    if missing_strategy == "drop_rows":
        df = df.dropna().reset_index(drop=True)
    elif missing_strategy == "fill_mean":
        df[num_cols] = df[num_cols].fillna(df[num_cols].mean())
    elif missing_strategy == "fill_median":
        df[num_cols] = df[num_cols].fillna(df[num_cols].median())
    elif missing_strategy == "fill_mode":
        for c in num_cols:
            mode = df[c].mode()
            df[c] = df[c].fillna(mode.iloc[0] if not mode.empty else 0)

    cat_cols = df.select_dtypes(include="object").columns.tolist()
    if encoding == "label":
        le = LabelEncoder()
        for c in cat_cols:
            df[c] = le.fit_transform(df[c].astype(str))
    elif encoding == "onehot":
        df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

    num_cols = df.select_dtypes(include=np.number).columns.tolist()
    if outlier_strategy in ("clip_iqr", "remove_iqr"):
        for c in num_cols:
            q1, q3 = df[c].quantile(0.25), df[c].quantile(0.75)
            iqr = q3 - q1
            lo, hi = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            if outlier_strategy == "clip_iqr":
                df[c] = df[c].clip(lo, hi)
            else:
                df = df[(df[c] >= lo) & (df[c] <= hi)]
        df = df.reset_index(drop=True)

    if scaling != "none" and num_cols:
        scaler = StandardScaler() if scaling == "standard" else MinMaxScaler()
        df[num_cols] = scaler.fit_transform(df[num_cols])

    return df
