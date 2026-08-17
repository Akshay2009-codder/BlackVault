"""
Preprocessing logic service module.

Moved out of main.py unchanged — same behavior, same function bodies,
just relocated so main.py's endpoints can stay thin. DATA_DIR is computed
relative to this file (backend/services/preprocessing.py -> backend/data),
so it resolves correctly regardless of where uvicorn is launched from.
"""

import os

import numpy as np
import pandas as pd
from fastapi import HTTPException
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data"
)


def load_dataset(name: str) -> pd.DataFrame:
    """Loads a CSV dataset from the backend data directory.

    Args:
        name: Name of the dataset file (without .csv extension).

    Returns:
        pd.DataFrame containing the dataset content.

    Raises:
        HTTPException(404): If the requested CSV dataset does not exist.
    """
    path = os.path.join(DATA_DIR, f"{name}.csv")
    if not os.path.exists(path):
        raise HTTPException(
            status_code=404,
            detail=(
                f"Dataset '{name}' not found at '{path}'. "
                "Run 'python generate_datasets.py' to create sample CSVs."
            ),
        )
    return pd.read_csv(path)


def apply_preprocessing(df: pd.DataFrame, missing_strategy: str,
                         remove_duplicates: bool, outlier_strategy: str,
                         encoding: str, scaling: str) -> pd.DataFrame:
    """Applies specified data cleaning, encoding, and scaling transformations.

    Args:
        df: Input DataFrame to preprocess.
        missing_strategy: Handling method for missing values (drop_rows, fill_mean, fill_median, fill_mode).
        remove_duplicates: Boolean flag indicating whether to drop duplicate rows.
        outlier_strategy: Method for handling numerical outliers (clip_iqr, remove_iqr, or none).
        encoding: Categorical encoding strategy (label, onehot, or none).
        scaling: Feature scaling technique (standard, minmax, or none).

    Returns:
        Preprocessed DataFrame copy.
    """
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

    if scaling != "none":
        scaler = StandardScaler() if scaling == "standard" else MinMaxScaler()
        df[num_cols] = scaler.fit_transform(df[num_cols])

    return df