"""
main.py
FastAPI app exposing the endpoints Unity calls.

Run locally with:
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /get-mission/{level_id}       -> random mission config
    POST /submit-mission                -> preprocess + train + evaluate
    GET  /health                        -> sanity check
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import os

from db import init_db, get_random_mission, log_attempt
from ml.preprocessing import apply_pipeline
from ml.train import run_classification, run_regression, run_clustering

app = FastAPI(title="Nexus Protocol ML Backend")

# Allow Unity (running as a separate process/build) to call this API freely.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data", "variants")

LEVEL_CONFIG = {
    "classification": {
        "feature_cols": ["age", "sex", "cp", "trestbps", "chol", "thalach", "exang"],
        "target_col": "target",
        "outlier_cols": ["chol", "trestbps", "thalach"],
    },
    "regression": {
        "feature_cols": ["area_sqft", "bedrooms", "bathrooms", "house_age", "location_score"],
        "target_col": "price",
        "outlier_cols": ["area_sqft", "location_score"],
    },
    "clustering": {
        "feature_cols": ["annual_income_k", "spending_score"],
        "target_col": None,
        "outlier_cols": ["annual_income_k", "spending_score"],
    },
}


@app.on_event("startup")
def startup():
    init_db()


class PreprocessingChoices(BaseModel):
    missing_strategy: str = "drop_rows"      # drop_rows | fill_mean | fill_median | fill_mode
    remove_duplicates: bool = False
    outlier_strategy: str = "none"           # none | clip_iqr | remove_iqr
    scaling: str = "none"                    # none | standard | minmax


class SubmitMissionRequest(BaseModel):
    mission_id: int
    level_id: str                            # classification | regression | clustering
    algorithm: str                           # e.g. random_forest, kmeans, linear_regression
    preprocessing: PreprocessingChoices
    k: int | None = None                     # only used for clustering


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/get-mission/{level_id}")
def get_mission(level_id: str):
    if level_id not in LEVEL_CONFIG:
        raise HTTPException(400, f"Unknown level_id '{level_id}'")
    mission = get_random_mission(level_id)
    if not mission:
        raise HTTPException(404, "No missions seeded for this level. Run db.py to seed.")
    return mission


@app.post("/submit-mission")
def submit_mission(req: SubmitMissionRequest):
    if req.level_id not in LEVEL_CONFIG:
        raise HTTPException(400, f"Unknown level_id '{req.level_id}'")

    # Re-fetch mission by id to get authoritative target metric/variant
    # (never trust the client for the pass/fail threshold)
    from db import get_conn
    conn = get_conn()
    mission = conn.execute("SELECT * FROM missions WHERE id = ?", (req.mission_id,)).fetchone()
    conn.close()
    if not mission:
        raise HTTPException(404, "Mission not found")
    mission = dict(mission)

    csv_path = os.path.join(DATA_DIR, f"{mission['dataset_variant']}.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(500, f"Dataset variant file missing: {csv_path}")
    df = pd.read_csv(csv_path)

    cfg = LEVEL_CONFIG[req.level_id]
    processed = apply_pipeline(
        df, req.preprocessing.dict(), cfg["feature_cols"], cfg["outlier_cols"]
    )

    if req.level_id == "classification":
        # target column must survive preprocessing (don't scale/drop it)
        if cfg["target_col"] not in processed.columns:
            raise HTTPException(500, "Target column missing after preprocessing")
        result = run_classification(
            processed, cfg["feature_cols"], cfg["target_col"], req.algorithm,
            mission["target_metric_name"], mission["target_metric_value"]
        )
    elif req.level_id == "regression":
        result = run_regression(
            processed, cfg["feature_cols"], cfg["target_col"], req.algorithm,
            mission["target_metric_name"], mission["target_metric_value"]
        )
    else:  # clustering
        result = run_clustering(
            processed, cfg["feature_cols"], req.algorithm, req.k or 5,
            mission["target_metric_name"], mission["target_metric_value"]
        )

    if "error" in result:
        raise HTTPException(400, result["error"])

    log_attempt(req.mission_id, req.algorithm, result["passed"], result.get("achieved"))
    return result
