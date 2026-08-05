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

Unity talks to this via UnityWebRequest (see frontend/Assets/Scripts/Phase0/ApiTester.cs).
"""

from __future__ import annotations

import os
import random
import uuid
from typing import Optional, List, Dict, Any

# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware

from models import PreprocessRequest, TrainRequest
from services import load_dataset, apply_preprocessing, train_model, DATA_DIR
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

# DATA_DIR is imported from services.preprocessing — both resolve to backend/data.

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

# In-memory registry for boss missions: dataset filename -> ground truth.
# NOT a database — resets on server restart, which is fine for a
# single-session game. The true_problem_type/target_col here are what
# make the boss fight honest: this data is never sent to Unity in
# /mission/generate/boss's response, only used server-side in /train
# to know which column to evaluate against.
BOSS_MISSIONS: Dict[str, Dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
#
# PreprocessRequest and TrainRequest are imported from models/ (see the
# import block at the top of this file). load_dataset() and
# apply_preprocessing() are imported from services/preprocessing.py.

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


@app.get("/mission/generate/boss")
def generate_boss_mission():
    """
    Generates a fresh, unknown dataset with a randomly chosen problem
    type (regression / classification / clustering / anomaly_detection).

    The true problem type and its target column are stored server-side
    in BOSS_MISSIONS and are deliberately NOT included in this response
    — the player must diagnose the problem type themselves before
    calling /train. /train looks up the true answer from BOSS_MISSIONS
    using the returned `dataset` filename to score correctly.
    """
    df, true_type = gen_boss_dataset()

    mission_id = f"boss_{uuid.uuid4().hex[:8]}"
    df.to_csv(os.path.join(DATA_DIR, f"{mission_id}.csv"), index=False)

    target_col = {
        "regression": "target",
        "classification": "label",
    }.get(true_type)  # None for clustering / anomaly_detection — no target column exists

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
    }


@app.post("/preprocess")
def preprocess(req: PreprocessRequest):
    """
    Apply the player's preprocessing choices to a dataset.
    Returns summary stats so Unity can display them in the terminal UI.
    The player uses this to explore data quality before committing to training.
    """
    df_raw = load_dataset(req.dataset)
    missing_before = int(df_raw.isnull().sum().sum())
    dupes_before = int(df_raw.duplicated().sum())

    df_clean = apply_preprocessing(
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
    df = load_dataset(req.dataset)
    df = apply_preprocessing(
        df,
        req.missing_strategy,
        req.remove_duplicates,
        req.outlier_strategy,
        "label",       # always label-encode for training
        req.scaling,
    )

    problem = req.problem_type

    # ── Boss mission handling ────────────────────────────────────────────
    # If this dataset is a boss mission, the player's guessed problem_type
    # decides which target column THEY expect — but the actual column only
    # exists if they guessed correctly. We override target_col with the
    # server-known value (which may be None), then check it exists before
    # any branch that needs it. A missing/wrong column means "wrong
    # diagnosis" — a normal failed attempt, not a server error.
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
                "diagnosis_error": (
                    f"No valid target column for problem_type='{problem}'. "
                    "This doesn't look like that kind of problem — try a different diagnosis."
                ),
            }

    # Dispatches to train_regression/train_classification/train_clustering/
    # train_anomaly_detection in services/training.py based on req.problem_type.
    # Raises HTTPException(400) for an unknown algorithm or problem_type,
    # same as the original inline version.
    return train_model(df, req)