"""
main.py  —  BlackVault FastAPI Backend
========================================

Endpoints
---------
GET  /health                    -> alive check (Phase 0 ping target)
GET  /ping                      -> alias for /health, returns game-flavored JSON
GET  /mission/generate          -> returns a randomised mission config
POST /preprocess                -> applies player's preprocessing choices to a dataset,
                                   returns cleaned dataset stats
POST /train                     -> trains the chosen algorithm, returns pass/fail + metrics

Run with:
    uvicorn main:app --reload --port 8000

Unity talks to this via UnityWebRequest (see BlackVault-Unity/Assets/Scripts/Phase0/ApiTester.cs).
"""

from __future__ import annotations

import os
import random
from typing import Optional, List, Dict, Any

import numpy as np
import pandas as pd
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    IsolationForest,
)
from sklearn.svm import SVC, OneClassSVM
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    mean_squared_error,
    silhouette_score,
)
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BlackVault ML Backend",
    description="Python backend that runs real ML for the BlackVault escape game.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Unity build or editor on any port
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

# ---------------------------------------------------------------------------
# Mission catalogue  (drives /mission/generate)
# ---------------------------------------------------------------------------

MISSION_POOL = [
    # Level 1: Data Cleaning
    {
        "mission_id": "L1_CLEANING_HOUSE",
        "level": 1,
        "title": "Security Bypass — Sector 1",
        "description": (
            "The access terminal is corrupted. Clean the dataset to restore the "
            "door's authentication sequence."
        ),
        "problem_type": "cleaning",
        "dataset": "house_prices",
        "tasks": ["remove_duplicates", "fill_missing_values", "encode_categoricals"],
        "difficulty": "easy",
        "time_limit_seconds": 300,
        "max_retries": 5,
        "hints_available": True,
    },
    # Level 2: Regression
    {
        "mission_id": "L2_REGRESSION_HOUSE",
        "level": 2,
        "title": "Price Prediction Lock — Sector 2",
        "description": (
            "The vault door requires a price-prediction model with RMSE below the "
            "target threshold. Train a regressor to unlock it."
        ),
        "problem_type": "regression",
        "dataset": "house_prices",
        "target_col": "price",
        "feature_cols": ["area_sqft", "bedrooms", "bathrooms", "house_age", "location_score"],
        "algorithms_allowed": ["linear_regression", "decision_tree", "random_forest"],
        "target_metric": "rmse",
        "target_metric_value": 30000,
        "metric_direction": "lower_is_better",
        "difficulty": "easy",
        "time_limit_seconds": 240,
        "max_retries": 3,
        "hints_available": True,
    },
    # Level 3: Classification
    {
        "mission_id": "L3_CLASSIFY_HEART",
        "level": 3,
        "title": "Bio-Threat Scanner — Sector 3",
        "description": (
            "The biometric scanner requires a classifier trained on patient data. "
            "Achieve the target accuracy to disable the lockdown."
        ),
        "problem_type": "classification",
        "dataset": "heart_disease",
        "target_col": "target",
        "feature_cols": ["age", "sex", "cp", "trestbps", "chol", "thalach", "exang"],
        "algorithms_allowed": ["logistic_regression", "decision_tree", "random_forest", "svm"],
        "target_metric": "accuracy",
        "target_metric_value": 0.75,
        "metric_direction": "higher_is_better",
        "difficulty": "medium",
        "time_limit_seconds": 240,
        "max_retries": 3,
        "hints_available": True,
    },
    # Level 4: Clustering
    {
        "mission_id": "L4_CLUSTER_MALL",
        "level": 4,
        "title": "Customer Segmentation Core — Sector 4",
        "description": (
            "The AI requires you to segment customers into distinct clusters. "
            "Achieve a silhouette score above the threshold."
        ),
        "problem_type": "clustering",
        "dataset": "mall_customers",
        "feature_cols": ["annual_income_k", "spending_score"],
        "algorithms_allowed": ["kmeans", "dbscan"],
        "target_metric": "silhouette_score",
        "target_metric_value": 0.3,
        "metric_direction": "higher_is_better",
        "k_range": [2, 8],
        "difficulty": "medium",
        "time_limit_seconds": 200,
        "max_retries": 3,
        "hints_available": False,
    },
    # Level 5: Anomaly Detection
    {
        "mission_id": "L5_ANOMALY_FRAUD",
        "level": 5,
        "title": "Fraud Isolation Firewall — Sector 5",
        "description": (
            "Fraudulent signals are overwhelming the network. Train an anomaly "
            "detector with high recall to stop them."
        ),
        "problem_type": "anomaly_detection",
        "dataset": "credit_card",
        "algorithms_allowed": ["isolation_forest", "one_class_svm"],
        "target_metric": "anomaly_rate",
        "target_metric_value": 0.05,
        "metric_direction": "range_2_to_15_percent",
        "difficulty": "hard",
        "time_limit_seconds": 180,
        "max_retries": 2,
        "hints_available": False,
    },
]


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class PreprocessRequest(BaseModel):
    dataset: str
    missing_strategy: str = "fill_median"   # drop_rows | fill_mean | fill_median | fill_mode
    remove_duplicates: bool = True
    outlier_strategy: str = "clip_iqr"      # none | clip_iqr | remove_iqr
    encoding: str = "label"                 # label | onehot | none
    scaling: str = "standard"              # none | standard | minmax


class TrainRequest(BaseModel):
    dataset: str
    problem_type: str                        # regression | classification | clustering | anomaly_detection
    algorithm: str
    target_col: Optional[str] = None
    feature_cols: Optional[List[str]] = None
    target_metric: str = "accuracy"
    target_metric_value: float = 0.75
    metric_direction: str = "higher_is_better"
    k: Optional[int] = 5
    # Preprocessing fields (same names as PreprocessRequest for simplicity)
    missing_strategy: str = "fill_median"
    remove_duplicates: bool = True
    outlier_strategy: str = "clip_iqr"
    scaling: str = "standard"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _load_dataset(name: str) -> pd.DataFrame:
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


def _apply_preprocessing(df: pd.DataFrame, missing_strategy: str,
                          remove_duplicates: bool, outlier_strategy: str,
                          encoding: str, scaling: str) -> pd.DataFrame:
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


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Standard liveness probe."""
    return {"status": "ok", "service": "BlackVault ML Backend"}


@app.get("/ping")
def ping():
    """
    Phase 0 — used by ApiTester.cs in Unity to prove HTTP connectivity.
    Returns a game-flavoured greeting.
    """
    return {
        "status": "online",
        "message": "BlackVault security system is active. Infiltration detected.",
        "version": "0.1.0",
    }


@app.get("/mission/generate")
def generate_mission(level: Optional[int] = None, difficulty: Optional[str] = None):
    """
    Return a random mission config from the pool.
    Optional query params: ?level=2  or  ?difficulty=hard
    Unity calls this when the player interacts with a security terminal.
    """
    pool = MISSION_POOL[:]
    if level is not None:
        pool = [m for m in pool if m["level"] == level]
    if difficulty is not None:
        pool = [m for m in pool if m["difficulty"] == difficulty]
    if not pool:
        raise HTTPException(404, "No missions match the given filters.")
    return random.choice(pool)


@app.post("/preprocess")
def preprocess(req: PreprocessRequest):
    """
    Apply the player's preprocessing choices to a dataset.
    Returns summary stats so Unity can display them in the terminal UI.
    The player uses this to explore data quality before committing to training.
    """
    df_raw = _load_dataset(req.dataset)
    missing_before = int(df_raw.isnull().sum().sum())
    dupes_before = int(df_raw.duplicated().sum())

    df_clean = _apply_preprocessing(
        df_raw,
        req.missing_strategy,
        req.remove_duplicates,
        req.outlier_strategy,
        req.encoding,
        req.scaling,
    )

    return {
        "dataset": req.dataset,
        "rows_before": len(df_raw),
        "rows_after": len(df_clean),
        "cols": list(df_clean.columns),
        "missing_before": missing_before,
        "missing_after": int(df_clean.isnull().sum().sum()),
        "duplicates_removed": dupes_before if req.remove_duplicates else 0,
        "dtypes": {c: str(t) for c, t in df_clean.dtypes.items()},
        "preview": df_clean.head(5).to_dict(orient="records"),
    }


@app.post("/train")
def train(req: TrainRequest):
    """
    Full ML pipeline: load -> preprocess -> train -> evaluate -> return pass/fail.
    Unity uses the 'passed' field to decide whether to unlock the security door.
    """
    df = _load_dataset(req.dataset)
    df = _apply_preprocessing(
        df,
        req.missing_strategy,
        req.remove_duplicates,
        req.outlier_strategy,
        "label",       # always label-encode for training
        req.scaling,
    )

    algo = req.algorithm
    problem = req.problem_type

    # ── Regression ─────────────────────────────────────────────────────────
    if problem == "regression":
        REGRESSORS = {
            "linear_regression": LinearRegression(),
            "decision_tree": DecisionTreeRegressor(random_state=42),
            "random_forest": RandomForestRegressor(n_estimators=100, random_state=42),
        }
        if algo not in REGRESSORS:
            raise HTTPException(400, f"Unknown regressor '{algo}'. Allowed: {list(REGRESSORS)}")
        feat = req.feature_cols or [c for c in df.columns if c != req.target_col]
        X, y = df[feat], df[req.target_col]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)
        REGRESSORS[algo].fit(Xtr, ytr)
        preds = REGRESSORS[algo].predict(Xte)
        achieved = round(float(np.sqrt(mean_squared_error(yte, preds))), 2)
        passed = achieved <= req.target_metric_value
        return {
            "metrics": {"rmse": achieved},
            "target_metric": "rmse",
            "target_value": req.target_metric_value,
            "achieved": achieved,
            "passed": passed,
            "door_status": "UNLOCKED" if passed else "LOCKED",
        }

    # ── Classification ──────────────────────────────────────────────────────
    elif problem == "classification":
        CLASSIFIERS = {
            "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
            "decision_tree": DecisionTreeClassifier(random_state=42),
            "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
            "svm": SVC(random_state=42),
        }
        if algo not in CLASSIFIERS:
            raise HTTPException(400, f"Unknown classifier '{algo}'. Allowed: {list(CLASSIFIERS)}")
        feat = req.feature_cols or [c for c in df.columns if c != req.target_col]
        X, y = df[feat], df[req.target_col]
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)
        CLASSIFIERS[algo].fit(Xtr, ytr)
        preds = CLASSIFIERS[algo].predict(Xte)
        metrics = {
            "accuracy": round(float(accuracy_score(yte, preds)), 4),
            "f1_score": round(float(f1_score(yte, preds, average="weighted")), 4),
        }
        achieved = metrics.get(req.target_metric, metrics["accuracy"])
        passed = achieved >= req.target_metric_value
        return {
            "metrics": metrics,
            "target_metric": req.target_metric,
            "target_value": req.target_metric_value,
            "achieved": achieved,
            "passed": passed,
            "door_status": "UNLOCKED" if passed else "LOCKED",
        }

    # ── Clustering ──────────────────────────────────────────────────────────
    elif problem == "clustering":
        CLUSTERERS: dict = {
            "kmeans": lambda k: KMeans(n_clusters=k, random_state=42, n_init=10),
            "dbscan": lambda k: DBSCAN(eps=0.5, min_samples=5),
        }
        if algo not in CLUSTERERS:
            raise HTTPException(400, f"Unknown clusterer '{algo}'. Allowed: {list(CLUSTERERS)}")
        feat = req.feature_cols or df.select_dtypes(include=np.number).columns.tolist()
        X = df[feat]
        model = CLUSTERERS[algo](req.k or 5)
        labels = model.fit_predict(X)
        n_clusters = len(set(labels) - {-1})
        sil = round(float(silhouette_score(X, labels)), 4) if n_clusters >= 2 else -1.0
        passed = sil >= req.target_metric_value
        return {
            "metrics": {"silhouette_score": sil, "n_clusters_found": n_clusters},
            "target_metric": "silhouette_score",
            "target_value": req.target_metric_value,
            "achieved": sil,
            "passed": passed,
            "door_status": "UNLOCKED" if passed else "LOCKED",
        }

    # ── Anomaly Detection ───────────────────────────────────────────────────
    elif problem == "anomaly_detection":
        feat = req.feature_cols or df.select_dtypes(include=np.number).columns.tolist()
        X = df[feat]
        if algo == "isolation_forest":
            model = IsolationForest(contamination=0.05, random_state=42)
        elif algo == "one_class_svm":
            model = OneClassSVM(nu=0.05)
        else:
            raise HTTPException(400, f"Unknown anomaly detector '{algo}'. "
                                     "Allowed: isolation_forest, one_class_svm")
        raw_preds = model.fit_predict(X)
        anomaly_flags = (raw_preds == -1).astype(int)
        n_anomalies = int(anomaly_flags.sum())
        anomaly_rate = round(float(n_anomalies / max(len(anomaly_flags), 1)), 4)
        passed = 0.02 <= anomaly_rate <= 0.15
        return {
            "metrics": {
                "anomaly_rate": anomaly_rate,
                "n_anomalies_detected": n_anomalies,
                "total_samples": len(anomaly_flags),
            },
            "target_metric": "anomaly_rate",
            "target_value": 0.05,
            "achieved": anomaly_rate,
            "passed": passed,
            "door_status": "UNLOCKED" if passed else "LOCKED",
        }

    else:
        raise HTTPException(
            400,
            f"Unknown problem_type '{problem}'. "
            "Use: regression | classification | clustering | anomaly_detection",
        )
