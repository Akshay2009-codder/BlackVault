"""
generate_datasets.py
Creates base datasets + variants for the 3 missions.

NOTE: These are synthetic stand-ins with the same column structure as the
real Kaggle datasets. Once you download the real CSVs, drop them in
app/data/ with the same filenames and column names — nothing else in the
project needs to change.

Real datasets to eventually swap in:
  - Heart Disease UCI (Kaggle): "heart_disease.csv"
  - House Prices (Kaggle "House Prices - Advanced Regression"): "house_prices.csv"
  - Mall Customer Segmentation (Kaggle): "mall_customers.csv"
"""
import numpy as np
import pandas as pd
import os

np.random.seed(42)
OUT = os.path.join(os.path.dirname(__file__), "data")
VAR = os.path.join(OUT, "variants")
os.makedirs(VAR, exist_ok=True)


# ---------------------------------------------------------------------
# 1. Heart Disease (Classification)
# ---------------------------------------------------------------------
def make_heart_disease(n=400):
    age = np.random.randint(29, 80, n)
    sex = np.random.randint(0, 2, n)
    chol = np.random.normal(240, 45, n).round(1)
    trestbps = np.random.normal(130, 17, n).round(1)  # resting blood pressure
    thalach = np.random.normal(150, 22, n).round(1)   # max heart rate
    cp = np.random.randint(0, 4, n)                    # chest pain type
    exang = np.random.randint(0, 2, n)                 # exercise-induced angina

    # target correlated with risk factors, plus noise
    risk = (
        0.03 * age + 0.015 * chol + 0.02 * trestbps
        - 0.02 * thalach + 1.2 * exang + 0.6 * cp
        + np.random.normal(0, 3, n)
    )
    target = (risk > np.median(risk)).astype(int)

    return pd.DataFrame({
        "age": age, "sex": sex, "cp": cp, "trestbps": trestbps,
        "chol": chol, "thalach": thalach, "exang": exang, "target": target
    })


# ---------------------------------------------------------------------
# 2. House Prices (Regression)
# ---------------------------------------------------------------------
def make_house_prices(n=400):
    area = np.random.normal(1800, 500, n).clip(400, 5000).round(0)
    bedrooms = np.random.randint(1, 6, n)
    bathrooms = np.random.randint(1, 4, n)
    age = np.random.randint(0, 50, n)
    location_score = np.random.uniform(1, 10, n).round(1)

    price = (
        area * 120 + bedrooms * 8000 + bathrooms * 6000
        - age * 400 + location_score * 5000
        + np.random.normal(0, 15000, n)
    ).round(0)

    return pd.DataFrame({
        "area_sqft": area, "bedrooms": bedrooms, "bathrooms": bathrooms,
        "house_age": age, "location_score": location_score, "price": price
    })


# ---------------------------------------------------------------------
# 3. Mall Customers (Clustering)
# ---------------------------------------------------------------------
def make_mall_customers(n=300):
    age = np.random.randint(18, 70, n)
    annual_income = np.random.normal(60, 25, n).clip(15, 140).round(1)  # in $1000s
    spending_score = np.random.uniform(1, 100, n).round(1)
    return pd.DataFrame({
        "age": age, "annual_income_k": annual_income, "spending_score": spending_score
    })


# ---------------------------------------------------------------------
# Variant injectors — used to create "missions" from a clean base dataset
# ---------------------------------------------------------------------
def inject_missing(df, cols, frac=0.08, seed=0):
    rng = np.random.default_rng(seed)
    df = df.copy()
    for c in cols:
        idx = rng.choice(df.index, size=int(len(df) * frac), replace=False)
        df.loc[idx, c] = np.nan
    return df


def inject_outliers(df, cols, frac=0.05, scale=4, seed=0):
    rng = np.random.default_rng(seed)
    df = df.copy()
    for c in cols:
        idx = rng.choice(df.index, size=int(len(df) * frac), replace=False)
        df.loc[idx, c] = df[c].mean() + scale * df[c].std() * rng.choice([-1, 1], size=len(idx))
    return df


def inject_duplicates(df, frac=0.05, seed=0):
    rng = np.random.default_rng(seed)
    dupes = df.sample(int(len(df) * frac), random_state=seed)
    return pd.concat([df, dupes], ignore_index=True)


def save_variants(df, name, numeric_cols):
    # variant A: clean
    df.to_csv(f"{VAR}/{name}_clean.csv", index=False)
    # variant B: missing values
    inject_missing(df, numeric_cols, frac=0.08, seed=1).to_csv(f"{VAR}/{name}_missing.csv", index=False)
    # variant C: outliers
    inject_outliers(df, numeric_cols, frac=0.05, seed=2).to_csv(f"{VAR}/{name}_outliers.csv", index=False)
    # variant D: missing + duplicates (harder combo)
    hard = inject_missing(df, numeric_cols, frac=0.06, seed=3)
    hard = inject_duplicates(hard, frac=0.05, seed=3)
    hard.to_csv(f"{VAR}/{name}_hard.csv", index=False)


if __name__ == "__main__":
    heart = make_heart_disease()
    house = make_house_prices()
    mall = make_mall_customers()

    heart.to_csv(f"{OUT}/heart_disease.csv", index=False)
    house.to_csv(f"{OUT}/house_prices.csv", index=False)
    mall.to_csv(f"{OUT}/mall_customers.csv", index=False)

    save_variants(heart, "heart_disease", ["chol", "trestbps", "thalach"])
    save_variants(house, "house_prices", ["area_sqft", "location_score"])
    save_variants(mall, "mall_customers", ["annual_income_k", "spending_score"])

    print("Base datasets + variants generated in app/data/")
