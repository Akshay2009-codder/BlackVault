"""
Preprocessing Logic Service Module — BlackVault
===============================================

Transforms RAW dirty datasets into CLEAN machine-learning-ready DataFrames.

Preprocessing Steps Explained:
-------------------------------
1. Duplicate Removal: Drops duplicate rows to prevent artificial over-weighting.
2. Missing Value Imputation:
   - drop_rows: Removes any row with a NaN (good if missing data is rare).
   - fill_mean: Fills NaN with the column average (good for normally distributed data).
   - fill_median: Fills NaN with the column middle value (robust against outliers).
   - fill_mode: Fills NaN with the most frequent value.
3. Categorical Encoding:
   - label: Converts text categories ("urban", "suburban") into numbers (0, 1, 2).
   - onehot: Converts text categories into separate binary indicator columns (0 or 1).
4. Outlier Handling (IQR Method):
   - IQR = 75th percentile - 25th percentile.
   - clip_iqr: Clamps extreme numbers to [Q1 - 1.5*IQR, Q3 + 1.5*IQR].
   - remove_iqr: Deletes rows with numbers outside the IQR bounds.
5. Feature Scaling:
   - standard: Centers values around mean=0 with std=1 (z-score standardization).
   - minmax: Scales values to a 0.0 to 1.0 range (min-max normalization).
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
    """Loads a RAW CSV dataset from backend/data/.

    Args:
        name: Name of dataset without extension (e.g., 'house_prices').

    Returns:
        pd.DataFrame containing the raw dataset content.
    """
    safe_name = os.path.basename(name)
    if safe_name != name:
        raise HTTPException(
            status_code=400,
            detail="Invalid dataset name. Directory traversal is prohibited."
        )

    path = os.path.join(DATA_DIR, f"{safe_name}.csv")
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
        df: Input RAW DataFrame to clean.
        missing_strategy: How to handle missing empty cells ('drop_rows', 'fill_mean', 'fill_median', 'fill_mode').
        remove_duplicates: Whether to drop identical duplicate rows (True/False).
        outlier_strategy: How to handle extreme outlier values ('clip_iqr', 'remove_iqr', 'none').
        encoding: How to convert text labels to numbers ('label', 'onehot', 'none').
        scaling: How to scale numbers ('standard', 'minmax', 'none').

    Returns:
        pd.DataFrame: Cleaned and transformed DataFrame ready for ML training.
    """
    df = df.copy()

    # Step 1: Remove repeated identical rows
    if remove_duplicates:
        df = df.drop_duplicates().reset_index(drop=True)

    # Step 2: Handle missing (NaN) values in numeric columns
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

    # Step 3: Encode text/categorical columns into numeric representations
    cat_cols = df.select_dtypes(include="object").columns.tolist()
    if encoding == "label":
        le = LabelEncoder()
        for c in cat_cols:
            df[c] = le.fit_transform(df[c].astype(str))
    elif encoding == "onehot":
        df = pd.get_dummies(df, columns=cat_cols, drop_first=True)

    # Step 4: Handle numerical outliers using the Interquartile Range (IQR) method
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

    # Step 5: Scale numeric features to standard normal distribution or [0, 1] range
    if scaling != "none":
        scaler = StandardScaler() if scaling == "standard" else MinMaxScaler()
        df[num_cols] = scaler.fit_transform(df[num_cols])

    return df