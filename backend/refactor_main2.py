import os

main_py_path = r"c:\Users\hp\OneDrive\Documents\BlackVault\backend\main.py"

with open(main_py_path, "w", encoding="utf-8") as f:
    f.write('''"""
main.py  —  BlackVault FastAPI Backend
"""

from __future__ import annotations

import os
import random
import uuid
from typing import Optional, Dict, Any, List

import pandas as pd
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from models import (
    PreprocessRequest,
    PreprocessResponse,
    TrainRequest,
    TrainResponse,
    MissionConfig,
    CorruptRequest,
)
from services.preprocessing import apply_preprocessing
from services.training import train_and_evaluate
from services.corruption_engine import (
    inject_missing_values,
    inject_duplicates,
    inject_outliers,
    inject_label_noise,
    inject_correlated_features,
    modify_class_balance,
)
from services.events import get_random_event, get_event_probability
from services.rewards import check_and_unlock_achievements, get_all_achievements, calculate_xp, xp_to_rank
from services.mission_generator import generate_challenge_mission, generate_daily_challenge
from db.database import init_db, get_db
from db import models as db_models
from generate_datasets import gen_boss_dataset

app = FastAPI(
    title="BlackVault ML Backend",
    description="Python backend that runs real ML for the BlackVault escape game.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

@app.on_event("startup")
def on_startup():
    init_db()

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

MISSION_POOL = [
    # Level 1: Data Cleaning
    {
        "mission_id": "L1_CLEANING_HOUSE",
        "level": 1,
        "title": "Security Bypass — Sector 1",
        "description": "Clean the dataset to restore the door's authentication sequence.",
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
        "description": "Train a regressor to unlock it.",
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
        "description": "Achieve the target accuracy to disable the lockdown.",
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
        "description": "Segment customers into distinct clusters.",
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
        "description": "Train an anomaly detector with high recall to stop them.",
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

def _get_level_for_dataset(dataset: str) -> str:
    for m in MISSION_POOL:
        if m["dataset"] == dataset:
            return str(m["level"])
    return "1"

def _get_difficulty_for_dataset(dataset: str) -> str:
    for m in MISSION_POOL:
        if m["dataset"] == dataset:
            return m["difficulty"]
    return "medium"


@app.get("/health")
def health():
    return {"status": "ok", "service": "BlackVault ML Backend"}

@app.get("/ping")
def ping():
    return {
        "status": "online",
        "message": "BlackVault security system is active. Infiltration detected.",
        "version": "0.1.0",
    }

@app.get("/mission/generate")
def generate_mission(level: Optional[int] = None, difficulty: Optional[str] = None):
    pool = MISSION_POOL[:]
    if level is not None:
        pool = [m for m in pool if m["level"] == level]
    if difficulty is not None:
        pool = [m for m in pool if m["difficulty"] == difficulty]
    if not pool:
        raise HTTPException(404, "No missions match the given filters.")
    return random.choice(pool)

@app.get("/mission/generate/boss")
def generate_boss_mission(db: Session = Depends(get_db)):
    df, true_type = gen_boss_dataset()

    mission_id = f"boss_{uuid.uuid4().hex[:8]}"
    df.to_csv(os.path.join(DATA_DIR, f"{mission_id}.csv"), index=False)

    target_col = {
        "regression": "target",
        "classification": "label",
    }.get(true_type)

    boss_mission = db_models.BossMission(
        dataset_filename=mission_id,
        true_problem_type=true_type,
        time_limit_seconds=180,
    )
    db.add(boss_mission)
    db.commit()

    BOSS_MISSIONS[mission_id] = {
        "true_problem_type": true_type,
        "target_col": target_col,
    }

    return {
        "mission_id": mission_id,
        "level": "boss",
        "title": "Core Security Room",
        "description": "Unknown signal detected.",
        "dataset": mission_id,
        "time_limit_seconds": 180,
        "max_retries": 1,
        "hints_available": False,
        "problem_type": "unknown"
    }

@app.post("/preprocess", response_model=PreprocessResponse)
def preprocess(req: PreprocessRequest):
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
def train(req: TrainRequest, db: Session = Depends(get_db)):
    df = _load_dataset(req.dataset)
    df = apply_preprocessing(
        df,
        missing_strategy=req.missing_strategy,
        remove_duplicates=req.remove_duplicates,
        outlier_strategy=req.outlier_strategy,
        encoding="label",
        scaling=req.scaling,
    )

    algo = req.algorithm
    problem = req.problem_type
    is_boss = req.dataset.startswith("boss_")

    boss_info = BOSS_MISSIONS.get(req.dataset)
    if boss_info is not None:
        req.target_col = boss_info["target_col"]
        if problem != boss_info["true_problem_type"]:
             res = {
                "metrics": {},
                "target_metric": "problem_type_match",
                "target_value": 1.0,
                "achieved": 0.0,
                "passed": False,
                "door_status": "LOCKED",
                "detail": f"Wrong problem_type. Try again.",
                "true_problem_type": boss_info["true_problem_type"],
                "xp_earned": 0,
            }
             _record_attempt(db, req, res, level="boss", xp_earned=0)
             return res

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
        
    level_str = "boss" if is_boss else _get_level_for_dataset(req.dataset)
    difficulty = "boss" if is_boss else _get_difficulty_for_dataset(req.dataset)
    attempt_count = db.query(db_models.MissionAttempt).filter_by(player_id="local_player", dataset_id=req.dataset).count() + 1
    
    xp = calculate_xp(level_str, difficulty, res["passed"], attempt_count)
    res["xp_earned"] = xp
    
    _record_attempt(db, req, res, level=level_str, xp_earned=xp)
    
    newly_unlocked = check_and_unlock_achievements(db)
    if newly_unlocked:
        res["detail"] = "New achievements unlocked!"
        
    return res

def _record_attempt(db: Session, req: TrainRequest, res: dict, level: str, xp_earned: int):
    attempt = db_models.MissionAttempt(
        player_id="local_player",
        level=level,
        dataset_id=req.dataset,
        algorithm=req.algorithm,
        problem_type=req.problem_type,
        metric_name=res.get("target_metric", ""),
        metric_value=float(res.get("achieved", 0.0)),
        metric_target=float(res.get("target_value", 0.0)),
        passed=bool(res.get("passed", False)),
    )
    db.add(attempt)
    
    progress = db.query(db_models.PlayerProgress).filter_by(player_id="local_player").first()
    if not progress:
        progress = db_models.PlayerProgress(player_id="local_player", xp=0, level_reached=1, total_attempts=0, total_passes=0)
        db.add(progress)
        
    progress.total_attempts += 1
    progress.xp += xp_earned
    if res.get("passed"):
        progress.total_passes += 1
        try:
            current_level = int(level) if level != "boss" else 6
            if current_level > progress.level_reached:
                progress.level_reached = current_level
        except Exception:
            pass
            
    db.commit()

@app.get("/player/progress")
def player_progress(db: Session = Depends(get_db)):
    progress = db.query(db_models.PlayerProgress).filter_by(player_id="local_player").first()
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
        "rank": xp_to_rank(progress.xp),
    }

@app.get("/player/history")
def player_history(limit: int = 20, db: Session = Depends(get_db)):
    attempts = db.query(db_models.MissionAttempt).filter_by(player_id="local_player").order_by(db_models.MissionAttempt.created_at.desc()).limit(limit).all()
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
            "created_at": str(a.created_at) if a.created_at else None,
        }
        for a in attempts
    ]

@app.post("/corrupt")
def corrupt_dataset(req: CorruptRequest):
    df = _load_dataset(req.dataset)
    
    cmap = {
        "inject_missing": lambda: inject_missing_values(df, missing_rate=req.params.get("missing_rate", 0.08)),
        "inject_duplicates": lambda: inject_duplicates(df, dup_rate=req.params.get("dup_rate", 0.05)),
        "inject_outliers": lambda: inject_outliers(df, outlier_count=req.params.get("outlier_count", 5), multiplier_range=tuple(req.params.get("multiplier_range", [4.0, 8.0]))),
        "inject_label_noise": lambda: inject_label_noise(df, target_col=req.target_col or "target", noise_rate=req.params.get("noise_rate", 0.1)),
        "inject_correlated_features": lambda: inject_correlated_features(df),
        "modify_class_balance": lambda: modify_class_balance(df, target_col=req.target_col or "target", minority_ratio=req.params.get("minority_ratio", 0.1)),
    }
    
    if req.event_type not in cmap:
        raise HTTPException(400, f"Unknown event_type '{req.event_type}'.")
        
    df_corrupted = cmap[req.event_type]()
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
def random_event(difficulty: str = "medium", problem_type: Optional[str] = None):
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
    progress = db.query(db_models.PlayerProgress).filter_by(player_id="local_player").first()
    player_xp = progress.xp if progress else 0
    return generate_challenge_mission(player_xp=player_xp)

@app.get("/mission/daily")
def daily_mission():
    return generate_daily_challenge()
''')

print("main.py updated!")
