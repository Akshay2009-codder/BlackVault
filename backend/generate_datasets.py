"""
generate_datasets.py  —  BlackVault backend helper
===================================================
Creates realistic (but synthetic) CSV datasets in ./data/
so the backend can run without downloading anything from the internet.

Usage:
    python generate_datasets.py

Generates (offline, deterministic):
    data/house_prices.csv     (regression)
    data/heart_disease.csv    (classification)
    data/mall_customers.csv   (clustering)
    data/credit_card.csv      (anomaly detection)

Boss dataset (called at runtime, non-deterministic):
    gen_boss_dataset(seed)  — returns (DataFrame, true_problem_type)
    Used by /mission/generate when level == 'boss'. The true problem
    type must stay server-side and must NOT be sent to Unity until
    after the player submits their answer via /train.
"""

import os
import numpy as np
import pandas as pd

from services.corruption_engine import inject_boss_level_issues

rng = np.random.default_rng(42)
OUT = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------------------
# 1. House Prices  (regression)
# ---------------------------------------------------------------------------
def gen_house_prices(n: int = 500) -> None:
    """Generates synthetic house prices CSV dataset with realistic nulls and outliers.

    Args:
        n: Number of base rows to generate before duplicates.
    """
    area = rng.integers(500, 4000, n).astype(float)
    bedrooms = rng.integers(1, 6, n).astype(float)
    bathrooms = rng.integers(1, 4, n).astype(float)
    house_age = rng.integers(0, 40, n).astype(float)
    location_score = rng.uniform(1, 10, n).round(1)
    location_type = rng.choice(["urban", "suburban", "rural"], n)

    price = (
        area * 120
        + bedrooms * 15000
        + bathrooms * 10000
        - house_age * 800
        + location_score * 5000
        + rng.normal(0, 8000, n)
    ).astype(float)

    df = pd.DataFrame({
        "area_sqft": area,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "house_age": house_age,
        "location_score": location_score,
        "location_type": location_type,
        "price": np.maximum(price, 20000).round(2),
    })

    # Inject realistic data-quality issues
    mask = rng.random(n) < 0.06
    df.loc[mask, "bedrooms"] = np.nan
    mask2 = rng.random(n) < 0.04
    df.loc[mask2, "house_age"] = np.nan
    # Duplicate a few rows
    dupes = df.sample(10, random_state=1)
    df = pd.concat([df, dupes], ignore_index=True)
    # A few outliers
    df.loc[:4, "price"] = 9_500_000

    df.to_csv(os.path.join(OUT, "house_prices.csv"), index=False)
    print(f"  house_prices.csv   — {len(df)} rows")


# ---------------------------------------------------------------------------
# 2. Heart Disease  (binary classification)
# ---------------------------------------------------------------------------
def gen_heart_disease(n=400):
    age = rng.integers(30, 75, n).astype(float)
    sex = rng.integers(0, 2, n).astype(float)
    cp  = rng.integers(0, 4, n).astype(float)
    trestbps = rng.integers(90, 180, n).astype(float)
    chol = rng.integers(150, 400, n).astype(float)
    thalach = rng.integers(70, 200, n).astype(float)
    exang = rng.integers(0, 2, n).astype(float)

    logit = (
        -5
        + 0.03 * age
        - 0.5 * sex
        + 0.4 * cp
        + 0.01 * trestbps
        + 0.003 * chol
        - 0.02 * thalach
        + 0.6 * exang
        + rng.normal(0, 0.3, n)
    )
    target = (1 / (1 + np.exp(-logit)) > 0.5).astype(int)

    df = pd.DataFrame({
        "age": age, "sex": sex, "cp": cp, "trestbps": trestbps,
        "chol": chol, "thalach": thalach, "exang": exang, "target": target,
    })

    # Data quality issues
    mask = rng.random(n) < 0.07
    df.loc[mask, "chol"] = np.nan
    mask2 = rng.random(n) < 0.05
    df.loc[mask2, "trestbps"] = np.nan
    dupes = df.sample(8, random_state=2)
    df = pd.concat([df, dupes], ignore_index=True)
    df.loc[:2, "chol"] = 800   # outliers

    df.to_csv(os.path.join(OUT, "heart_disease.csv"), index=False)
    print(f"  heart_disease.csv  — {len(df)} rows")


# ---------------------------------------------------------------------------
# 3. Mall Customers  (clustering)
# ---------------------------------------------------------------------------
def gen_mall_customers(n=300):
    # 5 natural clusters
    centers = [(20, 80), (60, 20), (40, 50), (80, 85), (25, 25)]
    rows = []
    for cx, cy in centers:
        k = n // len(centers)
        inc = rng.normal(cx, 8, k).clip(10, 120)
        score = rng.normal(cy, 10, k).clip(1, 100)
        age = rng.integers(18, 70, k).astype(float)
        gender = rng.choice(["Male", "Female"], k)
        rows.append(pd.DataFrame({
            "customer_id": range(len(rows) * k, len(rows) * k + k),
            "age": age,
            "gender": gender,
            "annual_income_k": inc.round(1),
            "spending_score": score.round(1),
        }))
    df = pd.concat(rows, ignore_index=True)

    mask = rng.random(len(df)) < 0.05
    df.loc[mask, "annual_income_k"] = np.nan
    dupes = df.sample(5, random_state=3)
    df = pd.concat([df, dupes], ignore_index=True)

    df.to_csv(os.path.join(OUT, "mall_customers.csv"), index=False)
    print(f"  mall_customers.csv — {len(df)} rows")


# ---------------------------------------------------------------------------
# 4. Credit Card Transactions  (anomaly detection)
# ---------------------------------------------------------------------------
def gen_credit_card(n=1000):
    # ~95% normal transactions, ~5% fraud
    n_fraud = int(n * 0.05)
    n_normal = n - n_fraud

    amount_normal = rng.exponential(50, n_normal).round(2)
    hour_normal   = rng.integers(6, 23, n_normal).astype(float)
    v1_normal     = rng.normal(0, 1, n_normal).round(4)
    v2_normal     = rng.normal(0, 1, n_normal).round(4)
    label_normal  = np.zeros(n_normal, dtype=int)

    amount_fraud  = rng.exponential(500, n_fraud).round(2)
    hour_fraud    = rng.integers(0, 5, n_fraud).astype(float)
    v1_fraud      = rng.normal(-3, 2, n_fraud).round(4)
    v2_fraud      = rng.normal(3, 2, n_fraud).round(4)
    label_fraud   = np.ones(n_fraud, dtype=int)

    df = pd.DataFrame({
        "amount":  np.concatenate([amount_normal, amount_fraud]),
        "hour":    np.concatenate([hour_normal, hour_fraud]),
        "v1":      np.concatenate([v1_normal, v1_fraud]),
        "v2":      np.concatenate([v2_normal, v2_fraud]),
        "is_fraud": np.concatenate([label_normal, label_fraud]),
    })
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    mask = rng.random(len(df)) < 0.03
    df.loc[mask, "amount"] = np.nan

    df.to_csv(os.path.join(OUT, "credit_card.csv"), index=False)
    print(f"  credit_card.csv    — {len(df)} rows  ({n_fraud} fraud)")


# ---------------------------------------------------------------------------
# 5. Boss Dataset  (non-deterministic — call at runtime, not build time)
# ---------------------------------------------------------------------------

def gen_boss_dataset(seed: int = None) -> tuple[pd.DataFrame, str]:
    """
    Returns (dataframe, true_problem_type).

    true_problem_type is returned so YOUR BACKEND can evaluate the
    player's chosen algorithm against the right metric — but this value
    must never be sent to Unity/the player before they submit their
    answer, or you've defeated the point of the boss fight.

    Call this from your /mission/generate endpoint when level == "boss",
    store the true_problem_type server-side (e.g. in the mission record
    in SQLite), and only reveal it in the /train response after the
    player submits.
    """
    rng = np.random.default_rng(seed)
    problem_type = rng.choice(
        ["regression", "classification", "clustering", "anomaly_detection"]
    )

    if problem_type == "regression":
        df = _gen_regression_shape(rng)
    elif problem_type == "classification":
        df = _gen_classification_shape(rng)
    elif problem_type == "clustering":
        df = _gen_clustering_shape(rng)
    else:
        df = _gen_anomaly_shape(rng)

    df = inject_boss_level_issues(df, rng)
    return df, problem_type


def _gen_regression_shape(rng) -> pd.DataFrame:
    n = 400
    x1 = rng.normal(50, 15, n)
    x2 = rng.normal(30, 10, n)
    x3 = rng.choice(["A", "B", "C"], n)
    category_effect = pd.Series(x3).map({"A": 0, "B": 15, "C": -10}).values
    noise = rng.normal(0, 8, n)
    target = 2.5 * x1 + 1.8 * x2 + category_effect + noise + 20

    return pd.DataFrame({
        "feature_1": x1,
        "feature_2": x2,
        "category": x3,
        "target": target,
    })


def _gen_classification_shape(rng) -> pd.DataFrame:
    n = 400
    x1 = rng.normal(0, 1, n)
    x2 = rng.normal(0, 1, n)
    x3 = rng.normal(0, 1, n)
    # Decision boundary combining features nonlinearly, roughly balanced classes
    score = 1.5 * x1 - 2 * x2 + 0.8 * x3 * x1 + rng.normal(0, 0.5, n)
    label = (score > np.median(score)).astype(int)

    return pd.DataFrame({
        "feature_1": x1,
        "feature_2": x2,
        "feature_3": x3,
        "label": label,
    })


def _gen_clustering_shape(rng) -> pd.DataFrame:
    n_per_cluster = 100
    centers = [(-5, -5), (5, 5), (-5, 5), (5, -5)]
    rows = []
    for cx, cy in centers:
        xs = rng.normal(cx, 1.2, n_per_cluster)
        ys = rng.normal(cy, 1.2, n_per_cluster)
        rows.append(pd.DataFrame({"feature_1": xs, "feature_2": ys}))
    return pd.concat(rows, ignore_index=True)


def _gen_anomaly_shape(rng) -> pd.DataFrame:
    n_normal = 380
    n_anomaly = 20  # ~5% anomaly rate, no explicit "fraud" framing this time
    normal = pd.DataFrame({
        "feature_1": rng.normal(0, 1, n_normal),
        "feature_2": rng.normal(0, 1, n_normal),
        "feature_3": rng.normal(0, 1, n_normal),
    })
    anomalies = pd.DataFrame({
        "feature_1": rng.normal(6, 1, n_anomaly),
        "feature_2": rng.normal(6, 1, n_anomaly),
        "feature_3": rng.normal(-6, 1, n_anomaly),
    })
    df = pd.concat([normal, anomalies], ignore_index=True)
    return df.sample(frac=1, random_state=int(rng.integers(0, 1_000_000))).reset_index(drop=True)


# _inject_boss_level_issues() moved to services/corruption_engine.py as
# inject_boss_level_issues() — imported at the top of this file.


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Generating BlackVault sample datasets in ./data/ ...")
    gen_house_prices()
    gen_heart_disease()
    gen_mall_customers()
    gen_credit_card()
    print("\nDone. Start the server with: uvicorn main:app --reload --port 8000")
    print("\nNote: gen_boss_dataset() is called at runtime by /mission/generate,")
    print("      not here — it must be non-deterministic per game session.")