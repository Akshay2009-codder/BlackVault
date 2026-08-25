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

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from models import (
    PreprocessRequest,
    TrainRequest,
    CorruptRequest,
    CodeExecuteRequest,
    FacilityMapResponse,
    PathfindingRequest,
    PathfindingResponse,
)
from services import (
    load_dataset,
    apply_preprocessing,
    train_model,
    apply_named_event,
    run_player_code,
    get_full_facility_map,
    unlock_sector_door,
    DATA_DIR,
)
from generate_datasets import gen_boss_dataset

from db.database import init_db, get_db
from db import models as db_models
from services.rewards import record_mission_attempt, xp_to_rank, unlock_achievement


# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BlackVault ML Backend",
    description="Python backend that runs real ML for the BlackVault escape game.",
    version="0.1.0",
)

@app.on_event("startup")
def on_startup():
    init_db()

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
        "title": "Door 1: Clean Dirty Data",
        "description": "The security terminal data has empty values and duplicate rows. Clean the dataset by removing duplicate rows and filling missing numbers to open the door.",
        "learning_goal": "Data Cleaning: Real raw data has missing values and repeated rows. Machine learning models will fail if you pass empty cells or duplicate data!",
        "simple_explanation": "1. Turn ON 'Remove Duplicates' to drop duplicate rows.\n2. Pick 'Fill Median' or 'Fill Mean' to fill empty cells.\n3. Click Preprocess to clean the data!",
        "problem_type": "cleaning",
        "dataset": "house_prices",
        "tasks": ["remove_duplicates", "fill_missing_values", "encode_categoricals"],
        "target_metric": "is_clean",
        "target_metric_value": 1.0,
        "metric_direction": "higher_is_better",
        "difficulty": "easy",
        "time_limit_seconds": 300,
        "max_retries": 5,
        "hints_available": True,
    },
    # Level 2: Regression
    {
        "mission_id": "L2_REGRESSION_HOUSE",
        "level": 2,
        "title": "Door 2: Predict House Prices (Regression)",
        "description": "Train a model to predict house prices (continuous numbers) using features like bedrooms, bathrooms, and square feet.",
        "learning_goal": "Regression in ML: Predicts numerical quantities (like house prices or temperatures). Lower RMSE (Root Mean Squared Error) means higher accuracy!",
        "simple_explanation": "1. Pick Linear Regression, Decision Tree, or Random Forest.\n2. Scale numerical features (Standard or MinMax).\n3. Train the model to reach RMSE below $30,000 to unlock the door!",
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
        "title": "Door 3: Detect Heart Disease (Classification)",
        "description": "Train a classifier model to predict whether a patient has Heart Disease (1) or is Healthy (0). Get at least 75% accuracy.",
        "learning_goal": "Classification in ML: Assigns data into groups/categories (Disease vs Healthy). Accuracy measures the percentage of correct predictions!",
        "simple_explanation": "1. Pick Logistic Regression, Decision Tree, Random Forest, or SVM.\n2. Encode categorical columns (Label or OneHot).\n3. Train your model to reach 75%+ accuracy to open the door!",
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
        "title": "Door 4: Group Similar Customers (Clustering)",
        "description": "Group mall customers into distinct clusters based on income and spending habits without using pre-existing labels.",
        "learning_goal": "Unsupervised Clustering: Finds natural groups in unlabeled data. Silhouette Score measures how distinct and separated the groups are!",
        "simple_explanation": "1. Pick K-Means or DBSCAN.\n2. Select cluster count K (e.g., 3 to 5).\n3. Achieve a Silhouette Score above 0.30 to bypass security!",
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
        "title": "Door 5: Catch Credit Card Fraud (Anomaly Detection)",
        "description": "Detect abnormal/fraudulent credit card transactions hidden among thousands of normal transactions.",
        "learning_goal": "Anomaly & Fraud Detection: Fraud is very rare (<5% of data). Standard classification fails on imbalanced data, so we use Anomaly Detectors like Isolation Forest!",
        "simple_explanation": "1. Choose Isolation Forest or One-Class SVM.\n2. Scale numerical transaction features.\n3. Isolate the ~5% abnormal transaction signals to unlock the final sector!",
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
BOSS_MISSIONS: Dict[str, Dict[str, Any]] = {}


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
    Return a random mission config from the pool with raw dataset statistics.
    Optional query params: ?level=2  or  ?difficulty=hard
    """
    pool = MISSION_POOL[:]
    if level is not None:
        pool = [m for m in pool if m["level"] == level]
    if difficulty is not None:
        pool = [m for m in pool if m["difficulty"] == difficulty]
    if not pool:
        raise HTTPException(404, "No missions match the given filters.")

    mission = dict(random.choice(pool))

    # Dynamically compute raw dataset statistics for beginner learning
    try:
        raw_df = load_dataset(mission["dataset"])
        missing_count = int(raw_df.isnull().sum().sum())
        dups_count = int(raw_df.duplicated().sum())
        mission["dataset_summary"] = {
            "total_rows": len(raw_df),
            "total_columns": len(raw_df.columns),
            "missing_values_count": missing_count,
            "duplicate_rows_count": dups_count,
            "columns": list(raw_df.columns),
            "summary_comment": f"Raw Data Stats: {len(raw_df)} rows, {len(raw_df.columns)} columns. Found {missing_count} missing values and {dups_count} duplicate rows."
        }
    except Exception:
        pass

    return mission


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
    }.get(true_type)  # None for clustering / anomaly_detection — no target column exists

    BOSS_MISSIONS[mission_id] = {
        "true_problem_type": true_type,
        "target_col": target_col,
    }

    missing_count = int(df.isnull().sum().sum())
    dups_count = int(df.duplicated().sum())

    return {
        "mission_id": mission_id,
        "level": "boss",
        "title": "Final Boss: Unknown Mystery Dataset",
        "description": "Analyze this unknown dataset! Figure out if it needs Regression (numbers), Classification (categories), Clustering (groups), or Anomaly Detection (fraud/outliers).",
        "learning_goal": "Real-World ML Diagnosis: In real projects, you inspect raw data columns first to decide the ML problem type before training!",
        "simple_explanation": "1. Inspect column names and types.\n2. Check if a target label exists.\n3. Clean any missing data.\n4. Pick the right model type!",
        "dataset_summary": {
            "total_rows": len(df),
            "total_columns": len(df.columns),
            "missing_values_count": missing_count,
            "duplicate_rows_count": dups_count,
            "columns": list(df.columns),
            "summary_comment": f"Raw Boss Data: {len(df)} rows, {len(df.columns)} columns. Inspect columns to diagnose the ML problem type!"
        },
        "dataset": mission_id,
        "time_limit_seconds": 180,
        "max_retries": 1,
        "hints_available": False,
    }


RANDOM_EVENTS = [
    "inject_missing",
    "inject_duplicates",
    "inject_outliers",
    "reduce_time_limit",
    "shift_target_metric",
]

# How often /events/random reports should_trigger=True, by difficulty —
# matches the PRD's escalating-difficulty random event system.
EVENT_TRIGGER_CHANCE = {
    "easy": 0.15,
    "medium": 0.30,
    "hard": 0.50,
}


@app.get("/events/random")
def get_random_event(difficulty: Optional[str] = "easy"):
    """
    Picks a random potential mid-mission event and rolls whether it
    should trigger right now, with the trigger chance scaling by
    difficulty. Unity can poll this periodically during a mission to
    decide whether the security AI escalates (see PRD section 8,
    Dynamic Mission & Random Event System).
    """
    chance = EVENT_TRIGGER_CHANCE.get(difficulty, EVENT_TRIGGER_CHANCE["easy"])
    return {
        "event": random.choice(RANDOM_EVENTS),
        "should_trigger": random.random() < chance,
        "difficulty": difficulty,
    }


@app.post("/corrupt")
def corrupt_dataset(req: CorruptRequest):
    """
    Applies a single named corruption event to a dataset and returns
    the resulting stats. This does NOT modify the CSV on disk — it
    loads a copy, corrupts that copy in memory, and reports what
    happened, so the player can see the effect of an escalating event
    without permanently degrading the underlying dataset file.
    """
    df = load_dataset(req.dataset)
    try:
        corrupted = apply_named_event(df, req.event_type, req.params)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return {
        "status": "corrupted",
        "dataset": req.dataset,
        "event_type": req.event_type,
        "rows": len(corrupted),
        "missing_values": int(corrupted.isnull().sum().sum()),
        "duplicates": int(corrupted.duplicated().sum()),
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
def train(req: TrainRequest, db: Session = Depends(get_db)):
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
    result = train_model(df, req)

    # ── DB & XP Rewards Logging ─────────────────────────────────────────
    try:
        achieved_val = float(result.get("achieved", 0.0))
        passed_val = bool(result.get("passed", False))

        progress = record_mission_attempt(
            db,
            player_id="local_player",
            level=str(req.problem_type),
            dataset_id=req.dataset,
            algorithm=req.algorithm,
            problem_type=req.problem_type,
            metric_name=req.target_metric,
            metric_value=achieved_val,
            metric_target=req.target_metric_value,
            passed=passed_val,
        )

        result["total_xp"] = progress.xp
        result["rank"] = xp_to_rank(progress.xp)

        if passed_val:
            unlocked = unlock_achievement(
                db,
                player_id="local_player",
                achievement_id=f"pass_{req.problem_type}",
                name=f"{req.problem_type.replace('_', ' ').title()} Master",
                description=f"Unlocked sector door for {req.problem_type} challenge."
            )
            if unlocked:
                result["achievement_unlocked"] = unlocked.name
    except Exception:
        pass

    return result


@app.post("/train/code")
def train_code(req: CodeExecuteRequest, db: Session = Depends(get_db)):
    """
    Full-freedom code editor mode: executes the player's raw Python
    against the dataset in a sandboxed subprocess (see
    services/code_executor.py for the safety model), then scores
    whatever result variables their code produced.
    """
    dataset_name = req.dataset or "credit_card"
    df = load_dataset(dataset_name)
    feature_cols = req.feature_cols or [c for c in df.columns if c != req.target_col]
    problem = req.problem_type or req.level_id or "anomaly_detection"
    prob_key = str(problem).lower()

    res = run_player_code(
        code=req.code,
        df=df,
        feature_cols=feature_cols,
        target_col=req.target_col,
        level_id=problem,
    )

    if not res.get("success"):
        default_metric = "is_clean" if prob_key in ("1", "l1_cleaning_house", "cleaning", "data_cleaning") else (req.target_metric or "accuracy")
        default_val = 1.0 if prob_key in ("1", "l1_cleaning_house", "cleaning", "data_cleaning") else (req.target_metric_value or 0.75)
        return {
            "error": res.get("message", "Execution error"),
            "stdout": res.get("stdout", ""),
            "door_status": "LOCKED",
            "passed": False,
            "achieved": 0.0,
            "target_value": default_val,
            "target_metric": default_metric
        }

    outputs = res.get("outputs", {})
    achieved = 0.0
    passed = False

    if prob_key in ("1", "l1_cleaning_house", "cleaning", "data_cleaning"):
        target_metric = req.target_metric if (req.target_metric and req.target_metric != "accuracy") else "is_clean"
        target_val = req.target_metric_value if (req.target_metric_value is not None and req.target_metric_value not in (0.0, 0.75)) else 1.0
        
        if "is_clean" in outputs:
            achieved = 1.0 if bool(outputs["is_clean"]) else 0.0
        elif "clean_df_stats" in outputs:
            stats = outputs["clean_df_stats"]
            achieved = 1.0 if (stats.get("missing", 1) == 0 and stats.get("duplicates", 1) == 0) else 0.0
        elif "df_stats" in outputs:
            stats = outputs["df_stats"]
            achieved = 1.0 if (stats.get("missing", 1) == 0 and stats.get("duplicates", 1) == 0) else 0.0
        else:
            achieved = 0.0
        
        passed = (achieved >= target_val)

    elif problem == "anomaly_detection":
        target_metric = req.target_metric or "anomaly_rate"
        target_val = req.target_metric_value if (req.target_metric_value is not None and req.target_metric_value > 0) else 0.05
        import numpy as np
        anomaly_flags = outputs.get("anomaly_flags", [])
        clean_df = df.dropna()
        eval_df = clean_df if (len(anomaly_flags) != len(df) and len(anomaly_flags) == len(clean_df)) else df
        if len(anomaly_flags) == len(eval_df):
            flags_arr = np.array(anomaly_flags)
            anomaly_rate = float((flags_arr == 1).mean()) if len(flags_arr) > 0 else 0.0
            if "Class" in eval_df.columns:
                from sklearn.metrics import recall_score
                recall = float(recall_score(eval_df["Class"], flags_arr, zero_division=0))
                achieved = recall if target_metric in ("recall", "f1") else anomaly_rate
            else:
                achieved = anomaly_rate
        passed = achieved >= target_val or (0.02 <= anomaly_rate <= 0.15)

    elif problem in ("classification", "regression"):
        y_test = outputs.get("y_test", [])
        y_pred = outputs.get("y_pred", [])
        target_metric = req.target_metric or ("accuracy" if problem == "classification" else "rmse")
        target_val = req.target_metric_value if (req.target_metric_value is not None and req.target_metric_value > 0) else (0.75 if problem == "classification" else 30000.0)

        if len(y_test) > 0 and len(y_test) == len(y_pred):
            if problem == "classification":
                from sklearn.metrics import accuracy_score, f1_score
                if target_metric == "f1_score":
                    achieved = float(f1_score(y_test, y_pred, average="weighted"))
                else:
                    achieved = float(accuracy_score(y_test, y_pred))
                passed = achieved >= target_val
            else:
                import numpy as np
                from sklearn.metrics import mean_squared_error, r2_score
                if target_metric == "rmse":
                    achieved = float(np.sqrt(mean_squared_error(y_test, y_pred)))
                    passed = achieved <= target_val
                else:
                    achieved = float(r2_score(y_test, y_pred))
                    passed = achieved >= target_val
        else:
            target_metric = req.target_metric or ("accuracy" if problem == "classification" else "rmse")
            target_val = req.target_metric_value if req.target_metric_value is not None else (0.75 if problem == "classification" else 30000.0)

    elif problem == "clustering":
        target_metric = req.target_metric or "silhouette_score"
        target_val = req.target_metric_value if (req.target_metric_value is not None and req.target_metric_value > 0) else 0.3
        labels = outputs.get("labels", [])
        if len(labels) == len(df):
            from sklearn.metrics import silhouette_score
            numeric_cols = df.select_dtypes(include=["number"]).columns
            X = df[numeric_cols].dropna()
            if len(X) == len(labels) and len(set(labels)) > 1:
                achieved = float(silhouette_score(X, labels))
        passed = achieved >= target_val
    else:
        target_metric = req.target_metric or "metric"
        target_val = req.target_metric_value or 0.75

    door_status = "UNLOCKED" if passed else "LOCKED"

    result_dict = {
        "target_metric": target_metric,
        "target_value": target_val,
        "achieved": achieved,
        "passed": passed,
        "door_status": door_status,
        "error": None,
        "stdout": res.get("stdout", "")
    }

    try:
        progress = record_mission_attempt(
            db,
            player_id="local_player",
            level=str(req.level_id or "code"),
            dataset_id=req.dataset or "custom",
            algorithm="python_code",
            problem_type=str(problem),
            metric_name=target_metric,
            metric_value=float(achieved),
            metric_target=float(target_val),
            passed=passed,
        )
        result_dict["total_xp"] = progress.xp
        result_dict["rank"] = xp_to_rank(progress.xp)
    except Exception:
        pass

    return result_dict


# ---------------------------------------------------------------------------
# Player Progress & Rewards Endpoints
# ---------------------------------------------------------------------------

@app.get("/player/progress")
def get_player_progress(player_id: str = "local_player", db: Session = Depends(get_db)):
    """Return accumulated XP, level reached, attempts, passes, rank, and unlocked cosmetics."""
    progress = db.query(db_models.PlayerProgress).filter(
        db_models.PlayerProgress.player_id == player_id
    ).first()
    if not progress:
        return {
            "player_id": player_id,
            "xp": 0,
            "rank": "Recruit",
            "level_reached": 1,
            "total_attempts": 0,
            "total_passes": 0,
            "unlocked_skins": ["Default Infiltrator"],
            "unlocked_badges": ["Novice Infiltrator"]
        }

    xp = progress.xp
    rank = xp_to_rank(xp)

    skins = ["Default Infiltrator"]
    if xp >= 300:
        skins.append("Cyber Hacker Suit")
    if xp >= 1000:
        skins.append("Shadow Operative Cloak")
    if xp >= 2500:
        skins.append("BlackVault Quantum Armor")

    badges = ["Novice Infiltrator"]
    if progress.total_passes >= 1:
        badges.append("First Bypass")
    if progress.total_passes >= 5:
        badges.append("Security Master")

    return {
        "player_id": player_id,
        "xp": xp,
        "rank": rank,
        "level_reached": progress.level_reached,
        "total_attempts": progress.total_attempts,
        "total_passes": progress.total_passes,
        "unlocked_skins": skins,
        "unlocked_badges": badges
    }


@app.get("/player/achievements")
def get_player_achievements(player_id: str = "local_player", db: Session = Depends(get_db)):
    """Return list of unlocked achievements for the player."""
    achievements = db.query(db_models.Achievement).filter(
        db_models.Achievement.player_id == player_id
    ).all()
    return {
        "player_id": player_id,
        "achievements": [
            {
                "achievement_id": a.achievement_id,
                "name": a.name,
                "description": a.description,
                "unlocked_at": str(a.unlocked_at)
            }
            for a in achievements
        ]
    }


@app.get("/leaderboard")
def get_leaderboard(db: Session = Depends(get_db)):
    """Return top 10 player rankings ordered by XP descending."""
    top_players = db.query(db_models.PlayerProgress).order_by(
        db_models.PlayerProgress.xp.desc()
    ).limit(10).all()

    return {
        "leaderboard": [
            {
                "rank_position": idx + 1,
                "player_id": p.player_id,
                "xp": p.xp,
                "rank_title": xp_to_rank(p.xp),
                "total_passes": p.total_passes
            }
            for idx, p in enumerate(top_players)
        ]
    }


# ---------------------------------------------------------------------------
# Map Endpoints
# ---------------------------------------------------------------------------

@app.get("/map/facility", response_model=FacilityMapResponse)
def get_facility_map(db: Session = Depends(get_db)):
    """Return the entire facility layout, sector status, and door networks."""
    return get_full_facility_map(db)

