import os

main_py_path = r"c:\Users\hp\OneDrive\Documents\BlackVault\backend\main.py"

with open(main_py_path, "r", encoding="utf-8") as f:
    content = f.read()

# We will just write the new content directly since we know exactly what it should be.

new_content = '''"""
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

Unity talks to this via UnityWebRequest (see frontend/Assets/Scripts/Phase0/ApiTester.cs).
"""

from __future__ import annotations

import os
import random
import uuid
from typing import Optional, Dict, Any

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models import (
    PreprocessRequest,
    PreprocessResponse,
    TrainRequest,
    TrainResponse,
    MissionConfig,
)
from services.preprocessing import apply_preprocessing
from services.training import train_and_evaluate
from generate_datasets import gen_boss_dataset

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
        "target_metric_value": 30000.0,
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

BOSS_MISSIONS: Dict[str, Dict[str, Any]] = {}

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


@app.get("/mission/generate", response_model=MissionConfig)
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


@app.get("/mission/generate/boss")
def generate_boss_mission():
    """
    Generates a fresh, unknown dataset with a randomly chosen problem
    type (regression / classification / clustering / anomaly_detection).
    """
    df, true_type = gen_boss_dataset()

    mission_id = f"boss_{uuid.uuid4().hex[:8]}"
    df.to_csv(os.path.join(DATA_DIR, f"{mission_id}.csv"), index=False)

    target_col = {
        "regression": "target",
        "classification": "label",
    }.get(true_type)

    BOSS_MISSIONS[mission_id] = {
        "true_problem_type": true_type,
        "target_col": target_col,
    }

    return {
        "mission_id": mission_id,
        "level": "boss",
        "title": "Core Security Room",
        "description": (
            "Unknown signal detected. No hints available. Diagnose the "
            "problem type, clean the data, and beat the target metric "
            "before the countdown reaches zero."
        ),
        "dataset": mission_id,
        "time_limit_seconds": 180,
        "max_retries": 1,
        "hints_available": False,
        "problem_type": "unknown"
    }


@app.post("/preprocess", response_model=PreprocessResponse)
def preprocess(req: PreprocessRequest):
    """
    Apply the player's preprocessing choices to a dataset.
    Returns summary stats so Unity can display them in the terminal UI.
    """
    df_raw = _load_dataset(req.dataset)
    missing_before = int(df_raw.isnull().sum().sum())
    dupes_before = int(df_raw.duplicated().sum())

    df_clean = apply_preprocessing(
        df_raw,
        missing_strategy=req.missing_strategy,
        remove_duplicates=req.remove_duplicates,
        outlier_strategy=req.outlier_strategy,
        encoding=req.encoding,
        scaling=req.scaling,
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


@app.post("/train", response_model=TrainResponse)
def train(req: TrainRequest):
    """
    Full ML pipeline: load -> preprocess -> train -> evaluate -> return pass/fail.
    """
    df = _load_dataset(req.dataset)
    df = apply_preprocessing(
        df,
        missing_strategy=req.missing_strategy,
        remove_duplicates=req.remove_duplicates,
        outlier_strategy=req.outlier_strategy,
        encoding="label",       # always label-encode for training
        scaling=req.scaling,
    )

    algo = req.algorithm
    problem = req.problem_type

    boss_info = BOSS_MISSIONS.get(req.dataset)
    if boss_info is not None:
        req.target_col = boss_info["target_col"]

        needs_target_col = problem in ("regression", "classification")
        if needs_target_col and (req.target_col is None or req.target_col not in df.columns):
            return {
                "metrics": {},
                "target_metric": req.target_metric,
                "target_value": req.target_metric_value,
                "achieved": 0.0,
                "passed": False,
                "door_status": "LOCKED",
                "detail": (
                    f"No valid target column for problem_type='{problem}'. "
                    "This doesn't look like that kind of problem — try a different diagnosis."
                ),
            }

    try:
        res = train_and_evaluate(
            df=df,
            problem_type=problem,
            algorithm=algo,
            target_col=req.target_col,
            feature_cols=req.feature_cols,
            target_metric=req.target_metric,
            target_metric_value=req.target_metric_value,
            metric_direction=req.metric_direction,
            k=req.k,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
        
    return res
'''

with open(main_py_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Refactored main.py successfully!")
