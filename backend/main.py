"""
main.py  —  BlackVault FastAPI Backend
========================================

Endpoints
---------
GET  /health                    -> alive check
GET  /ping                      -> game-flavored greeting (Phase 0)
GET  /mission/generate          -> returns a randomised mission config
POST /preprocess                -> applies player's preprocessing choices to a dataset
POST /train                     -> trains the chosen algorithm, returns pass/fail + metrics
GET  /player/progress           -> returns player XP, level, stats
GET  /player/history            -> returns recent mission attempts
POST /corrupt                   -> applies a corruption event to a dataset
GET  /events/random             -> returns a random event config for Unity
GET  /player/achievements       -> returns achievement list and status
GET  /mission/challenge         -> procedurally generated challenge mission
GET  /mission/daily             -> daily challenge puzzle

Run with:
    uvicorn main:app --reload --port 8000

Unity talks to this via UnityWebRequest.
"""

from __future__ import annotations

import os
import random
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Internal imports
from models.preprocess_models import PreprocessRequest
from models.train_models import TrainRequest
from services.preprocessing import apply_preprocessing
from services.training import train_and_evaluate
from services.corruption_engine import (
    inject_missing_values,
    inject_duplicates,
    inject_outliers,
    inject_label_noise,
    inject_correlated_features,
    modify_class_balance,
    apply_composite_corruption,
)
from services.events import get_random_event, get_event_probability
from services.rewards import check_and_unlock_achievements, get_all_achievements
from services.mission_generator import generate_challenge_mission, generate_daily_challenge
from db.database import Base, engine, get_db
from db.models import MissionAttempt, PlayerProgress, BossMission, Achievement
from generate_datasets import gen_boss_dataset

# ---------------------------------------------------------------------------
# Helpers — dataset loading
# ---------------------------------------------------------------------------

import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


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
# Initialize DB
# ---------------------------------------------------------------------------

Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BlackVault ML Backend",
    description="Python backend that runs real ML for the BlackVault escape game.",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Unity build or editor on any port
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        "algorithms_allowed": ["linear_regression", "decision_tree", "random_forest", "xgboost"],
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
        "algorithms_allowed": ["logistic_regression", "decision_tree", "random_forest", "svm", "xgboost"],
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
        "algorithms_allowed": ["kmeans", "dbscan", "hierarchical"],
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
# XP / Reward helpers
# ---------------------------------------------------------------------------

DIFFICULTY_XP_MULTIPLIER = {
    "easy": 1.0,
    "medium": 1.5,
    "hard": 2.0,
    "boss": 3.0,
}

BASE_XP_PER_LEVEL = {
    "1": 100,
    "2": 150,
    "3": 200,
    "4": 250,
    "5": 300,
    "boss": 500,
}


def _calculate_xp(
    level: str,
    difficulty: str,
    passed: bool,
    attempt_number: int = 1,
) -> int:
    if not passed:
        return 10

    base_xp = BASE_XP_PER_LEVEL.get(str(level), 100)
    multiplier = DIFFICULTY_XP_MULTIPLIER.get(difficulty, 1.0)
    first_attempt_bonus = 1.5 if attempt_number == 1 else 1.0

    xp = int(base_xp * multiplier * first_attempt_bonus)
    return xp


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "service": "BlackVault ML Backend"}


@app.get("/ping")
def ping():
    return {
        "status": "online",
        "message": "BlackVault security system is active. Infiltration detected.",
        "version": "0.2.0",
    }


@app.get("/mission/generate")
def generate_mission(
    level: Optional[str] = None,
    difficulty: Optional[str] = None,
    db: Session = Depends(get_db),
):
    if level == "boss" or level == "6":
        df, true_type = gen_boss_dataset()
        boss_mission = BossMission(
            dataset_filename="",
            true_problem_type=true_type,
            time_limit_seconds=180,
        )
        db.add(boss_mission)
        db.commit()
        db.refresh(boss_mission)

        filename_base = f"boss_unknown_{boss_mission.id}"
        csv_path = os.path.join(DATA_DIR, f"{filename_base}.csv")
        df.to_csv(csv_path, index=False)

        boss_mission.dataset_filename = filename_base
        db.commit()

        return {
            "mission_id": f"L6_BOSS_{boss_mission.id}",
            "level": "boss",
            "title": "Master Terminal — Unknown System Anomaly",
            "description": (
                "An unidentified stream is swarming the terminal. Diagnose the true problem "
                "type and train an optimal model to bypass the lock."
            ),
            "problem_type": "unknown",
            "dataset": filename_base,
            "algorithms_allowed": [
                "linear_regression", "decision_tree", "random_forest", "xgboost",
                "logistic_regression", "svm",
                "kmeans", "dbscan", "hierarchical",
                "isolation_forest", "one_class_svm",
            ],
            "difficulty": "boss",
            "time_limit_seconds": 180,
            "hints_available": False,
        }

    pool = MISSION_POOL[:]
    if level is not None:
        try:
            level_num = int(level)
            pool = [m for m in pool if m["level"] == level_num]
        except ValueError:
            pool = [m for m in pool if str(m["level"]) == str(level)]
    if difficulty is not None:
        pool = [m for m in pool if m["difficulty"] == difficulty]
    if not pool:
        raise HTTPException(404, "No missions match the given filters.")
    return random.choice(pool)


@app.post("/preprocess")
def preprocess(req: PreprocessRequest):
    df_raw = _load_dataset(req.dataset)
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
def train(req: TrainRequest, db: Session = Depends(get_db)):
    df = _load_dataset(req.dataset)

    is_boss = req.dataset.startswith("boss_unknown_")
    difficulty = "boss" if is_boss else _get_difficulty_for_dataset(req.dataset)

    if is_boss:
        boss_record = db.query(BossMission).filter_by(dataset_filename=req.dataset).first()
        if boss_record:
            if req.problem_type != boss_record.true_problem_type:
                attempt_count = _get_attempt_count(db, req.dataset) + 1
                xp = _calculate_xp("boss", "boss", False, attempt_count)

                res = {
                    "metrics": {},
                    "target_metric": "problem_type_match",
                    "target_value": 1.0,
                    "achieved": 0.0,
                    "passed": False,
                    "door_status": "LOCKED",
                    "true_problem_type": boss_record.true_problem_type,
                    "detail": (
                        f"Incorrect problem type diagnosis. "
                        f"Target was actually '{boss_record.true_problem_type}'."
                    ),
                    "xp_earned": xp,
                }
                _record_attempt(db, req, res, level="boss", xp_earned=xp)
                return res

    df = apply_preprocessing(
        df,
        req.missing_strategy,
        req.remove_duplicates,
        req.outlier_strategy,
        "label",
        req.scaling,
    )

    try:
        res = train_and_evaluate(
            df=df,
            problem_type=req.problem_type,
            algorithm=req.algorithm,
            target_col=req.target_col,
            feature_cols=req.feature_cols,
            target_metric=req.target_metric,
            target_metric_value=req.target_metric_value,
            metric_direction=req.metric_direction,
            k=req.k,
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    level_str = "boss" if is_boss else _get_level_for_dataset(req.dataset)
    attempt_count = _get_attempt_count(db, req.dataset) + 1
    xp = _calculate_xp(level_str, difficulty, res["passed"], attempt_count)
    res["xp_earned"] = xp

    _record_attempt(db, req, res, level=level_str, xp_earned=xp)

    newly_unlocked = check_and_unlock_achievements(db)
    if newly_unlocked:
        res["achievements_unlocked"] = newly_unlocked

    return res


@app.get("/player/progress")
def player_progress(db: Session = Depends(get_db)):
    progress = db.query(PlayerProgress).filter_by(player_id="local_player").first()
    if not progress:
        return {
            "player_id": "local_player",
            "xp": 0,
            "level_reached": 1,
            "total_attempts": 0,
            "total_passes": 0,
            "rank": "Recruit",
        }

    return {
        "player_id": progress.player_id,
        "xp": progress.xp,
        "level_reached": progress.level_reached,
        "total_attempts": progress.total_attempts,
        "total_passes": progress.total_passes,
        "rank": _xp_to_rank(progress.xp),
    }


@app.get("/player/history")
def player_history(limit: int = 20, db: Session = Depends(get_db)):
    attempts = (
        db.query(MissionAttempt)
        .filter_by(player_id="local_player")
        .order_by(MissionAttempt.created_at.desc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": a.id,
            "level": a.level,
            "dataset_id": a.dataset_id,
            "algorithm": a.algorithm,
            "problem_type": a.problem_type,
            "metric_name": a.metric_name,
            "metric_value": a.metric_value,
            "metric_target": a.metric_target,
            "passed": a.passed,
            "xp_earned": a.xp_earned,
            "created_at": str(a.created_at) if a.created_at else None,
        }
        for a in attempts
    ]


def _get_difficulty_for_dataset(dataset: str) -> str:
    for m in MISSION_POOL:
        if m["dataset"] == dataset:
            return m["difficulty"]
    return "medium"


def _get_level_for_dataset(dataset: str) -> str:
    for m in MISSION_POOL:
        if m["dataset"] == dataset:
            return str(m["level"])
    return "1"


def _get_attempt_count(db: Session, dataset_id: str) -> int:
    return (
        db.query(MissionAttempt)
        .filter_by(player_id="local_player", dataset_id=dataset_id)
        .count()
    )


def _xp_to_rank(xp: int) -> str:
    if xp >= 5000:
        return "Legendary Hacker"
    elif xp >= 3000:
        return "Master Infiltrator"
    elif xp >= 2000:
        return "Senior Analyst"
    elif xp >= 1000:
        return "Data Operative"
    elif xp >= 500:
        return "Junior Agent"
    elif xp >= 100:
        return "Trainee"
    return "Recruit"


def _record_attempt(
    db: Session,
    req: TrainRequest,
    res: dict,
    level: str = "standard",
    xp_earned: int = 0,
):
    try:
        attempt = MissionAttempt(
            player_id="local_player",
            level=level,
            dataset_id=req.dataset,
            algorithm=req.algorithm,
            problem_type=req.problem_type,
            metric_name=res.get("target_metric"),
            metric_value=float(res.get("achieved")) if res.get("achieved") is not None else 0.0,
            metric_target=float(res.get("target_value")) if res.get("target_value") is not None else 0.0,
            passed=bool(res.get("passed", False)),
            xp_earned=xp_earned,
        )
        db.add(attempt)

        progress = db.query(PlayerProgress).filter_by(player_id="local_player").first()
        if not progress:
            progress = PlayerProgress(
                player_id="local_player",
                xp=0,
                level_reached=1,
                total_attempts=0,
                total_passes=0,
            )
            db.add(progress)

        progress.total_attempts += 1
        progress.xp += xp_earned
        if res.get("passed"):
            progress.total_passes += 1
            try:
                current_level = int(level) if level != "boss" else 6
                if current_level > progress.level_reached:
                    progress.level_reached = current_level
            except (ValueError, TypeError):
                pass

        db.commit()
    except Exception:
        db.rollback()


class CorruptRequest(BaseModel):
    dataset: str
    event_type: str
    target_col: Optional[str] = None
    params: dict = {}


@app.post("/corrupt")
def corrupt_dataset(req: CorruptRequest):
    df = _load_dataset(req.dataset)

    corruption_map = {
        "inject_missing": lambda: inject_missing_values(
            df, missing_rate=req.params.get("missing_rate", 0.08)
        ),
        "inject_duplicates": lambda: inject_duplicates(
            df, dup_rate=req.params.get("dup_rate", 0.05)
        ),
        "inject_outliers": lambda: inject_outliers(
            df,
            outlier_count=req.params.get("outlier_count", 5),
            multiplier_range=tuple(req.params.get("multiplier_range", [4.0, 8.0])),
        ),
        "inject_label_noise": lambda: inject_label_noise(
            df,
            target_col=req.target_col or "target",
            noise_rate=req.params.get("noise_rate", 0.1),
        ),
        "inject_correlated_features": lambda: inject_correlated_features(df),
        "modify_class_balance": lambda: modify_class_balance(
            df,
            target_col=req.target_col or "target",
            minority_ratio=req.params.get("minority_ratio", 0.1),
        ),
    }

    if req.event_type not in corruption_map:
        raise HTTPException(
            400,
            f"Unknown event_type '{req.event_type}'. "
            f"Allowed: {list(corruption_map.keys())}",
        )

    df_corrupted = corruption_map[req.event_type]()

    csv_path = os.path.join(DATA_DIR, f"{req.dataset}.csv")
    df_corrupted.to_csv(csv_path, index=False)

    return {
        "dataset": req.dataset,
        "event_type": req.event_type,
        "rows_before": len(df),
        "rows_after": len(df_corrupted),
        "missing_after": int(df_corrupted.isnull().sum().sum()),
        "status": "corrupted",
    }


@app.get("/events/random")
def random_event(
    difficulty: str = "medium",
    problem_type: Optional[str] = None,
):
    event = get_random_event(difficulty, problem_type)
    probability = get_event_probability(difficulty)

    return {
        "event": event.model_dump(),
        "trigger_probability": probability,
        "should_trigger": random.random() < probability,
    }


@app.get("/player/achievements")
def player_achievements(db: Session = Depends(get_db)):
    return get_all_achievements(db)


@app.get("/mission/challenge")
def challenge_mission(db: Session = Depends(get_db)):
    progress = db.query(PlayerProgress).filter_by(player_id="local_player").first()
    player_xp = progress.xp if progress else 0
    return generate_challenge_mission(player_xp=player_xp)


@app.get("/mission/daily")
def daily_mission():
    return generate_daily_challenge()
