"""
BLACKVAULT — ML Escape Game backend
Generates real, randomized ML puzzles (dirty datasets) and validates
the player's chosen pipeline by actually training a model server-side.

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import random
import uuid
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.datasets import make_classification, make_regression, make_blobs
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.metrics import f1_score, r2_score, silhouette_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

app = FastAPI(title="BlackVault ML Puzzle Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory puzzle store: puzzle_id -> full state (never sent to client)
PUZZLES: dict = {}

FEATURE_NAMES_POOL = [
    "signal_strength", "access_frequency", "session_length", "badge_score",
    "thermal_reading", "network_latency", "device_age", "clearance_level",
    "login_hour", "packet_variance",
]

# ---------------------------------------------------------------------------
# Puzzle generation
# ---------------------------------------------------------------------------

def _inject_corruption(df: pd.DataFrame, rng: random.Random) -> dict:
    """Mutates df in place with realistic data problems, returns a report."""
    report = {"missing": 0, "duplicates": 0}
    n = len(df)
    feature_cols = [c for c in df.columns if c != "target"]

    # Missing values scattered across random feature cells
    n_missing = int(n * rng.uniform(0.04, 0.12))
    for _ in range(n_missing):
        r = rng.randrange(n)
        c = rng.choice(feature_cols)
        df.loc[r, c] = np.nan
    report["missing"] = n_missing

    # Duplicate a handful of rows
    n_dupes = rng.randint(2, 6)
    dupe_rows = df.sample(n=min(n_dupes, n), random_state=rng.randint(0, 10**6))
    df_out = pd.concat([df, dupe_rows], ignore_index=True)
    report["duplicates"] = len(dupe_rows)

    return report, df_out


def generate_classification_puzzle(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(4, 4 + difficulty)
    n_samples = rng.randint(300, 500)
    class_weight = rng.uniform(0.5, 0.8)
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        n_redundant=0,
        n_classes=2,
        weights=[class_weight, 1 - class_weight],
        flip_y=0.005 + 0.006 * difficulty,
        class_sep=1.3,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    report, df = _inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.68, 0.8) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "classification",
        "title": rng.choice([
            "Perimeter Intrusion Classifier", "Badge Fraud Detector",
            "Access Anomaly Gate",
        ]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "f1",
        "threshold": metric_threshold,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }


def generate_regression_puzzle(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(3, 3 + difficulty)
    n_samples = rng.randint(300, 500)
    X, y = make_regression(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        noise=8 + 4 * difficulty,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y

    report, df = _inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.75, 0.9) - 0.03 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "regression",
        "title": rng.choice([
            "Reactor Load Forecaster", "Facility Power Draw Predictor",
        ]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "r2",
        "threshold": metric_threshold,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }


def generate_clustering_puzzle(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(2, 3)
    n_samples = rng.randint(280, 450)
    true_k = rng.randint(3, 5)
    X, _ = make_blobs(
        n_samples=n_samples,
        n_features=n_features,
        centers=true_k,
        cluster_std=rng.uniform(0.8, 1.6 + 0.15 * difficulty),
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    # clustering is unsupervised — no target column is exposed or used
    report, df = _inject_corruption_no_target(df, rng)

    metric_threshold = round(rng.uniform(0.45, 0.6) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "clustering",
        "title": rng.choice(["Customer Cluster Grid", "Personnel Movement Grouping"]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": None,
        "metric": "silhouette",
        "threshold": metric_threshold,
        "suggested_k": true_k,
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }


def generate_anomaly_puzzle(difficulty: int, rng: random.Random) -> dict:
    n_features = rng.randint(4, 4 + difficulty)
    n_samples = rng.randint(700, 950)
    contamination = rng.uniform(0.06, 0.09)
    X, y = make_classification(
        n_samples=n_samples,
        n_features=n_features,
        n_informative=max(2, n_features - 1),
        n_redundant=0,
        n_classes=2,
        weights=[1 - contamination, contamination],
        flip_y=0.0,
        class_sep=3.4 - 0.1 * difficulty,
        random_state=rng.randint(0, 10**6),
    )
    cols = rng.sample(FEATURE_NAMES_POOL, n_features)
    df = pd.DataFrame(X, columns=cols)
    df["target"] = y  # 1 = fraudulent / anomalous, hidden from the player

    report, df = _inject_corruption(df, rng)

    metric_threshold = round(rng.uniform(0.35, 0.45) - 0.02 * difficulty, 2)
    time_limit = max(180, 480 - difficulty * 60)

    return {
        "type": "anomaly",
        "title": rng.choice(["Fraud Transaction Scanner", "Reactor Sensor Anomaly Gate"]),
        "dataframe": df,
        "feature_cols": cols,
        "target_col": "target",
        "metric": "recall",
        "threshold": metric_threshold,
        "contamination": round(contamination, 3),
        "time_limit_seconds": time_limit,
        "corruption_report": report,
    }


def _inject_corruption_no_target(df: pd.DataFrame, rng: random.Random) -> dict:
    """Same corruption as _inject_corruption but for frames with no target column."""
    df = df.copy()
    df["target"] = 0  # placeholder so shared helper logic can reuse feature-col detection
    report, df = _inject_corruption(df, rng)
    df = df.drop(columns=["target"])
    return report, df


GENERATORS = {
    "classification": generate_classification_puzzle,
    "regression": generate_regression_puzzle,
    "clustering": generate_clustering_puzzle,
    "anomaly": generate_anomaly_puzzle,
}


# ---------------------------------------------------------------------------
# API models
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    puzzle_type: str  # "classification" | "regression"
    difficulty: int = 1  # 1..5, roughly maps to room depth


class SubmitRequest(BaseModel):
    puzzle_id: str
    missing_strategy: str  # "drop_rows" | "mean_impute" | "median_impute"
    drop_duplicates: bool
    scale_features: bool
    model: str  # classification: logistic_regression|random_forest|knn
                # regression: linear_regression|random_forest
                # clustering: kmeans|dbscan|hierarchical
                # anomaly: isolation_forest|one_class_svm
    n_clusters: Optional[int] = None    # clustering only
    contamination: Optional[float] = None  # anomaly only


@app.post("/api/puzzle/generate")
def generate_puzzle(req: GenerateRequest):
    if req.puzzle_type not in GENERATORS:
        raise HTTPException(400, "unknown puzzle_type")

    rng = random.Random()
    puzzle = GENERATORS[req.puzzle_type](req.difficulty, rng)
    puzzle_id = str(uuid.uuid4())
    PUZZLES[puzzle_id] = puzzle

    df = puzzle["dataframe"]
    # Anomaly detection is unsupervised from the player's side — the true
    # fraud/anomaly label must never be shown, only used server-side to score.
    is_hidden_target = puzzle["type"] == "anomaly"
    preview_cols = puzzle["feature_cols"] if is_hidden_target else list(df.columns)
    preview = df[preview_cols].head(12).replace({np.nan: None}).to_dict(orient="records")

    return {
        "puzzle_id": puzzle_id,
        "type": puzzle["type"],
        "title": puzzle["title"],
        "feature_cols": puzzle["feature_cols"],
        "target_col": None if is_hidden_target else puzzle["target_col"],
        "metric": puzzle["metric"],
        "threshold": puzzle["threshold"],
        "suggested_k": puzzle.get("suggested_k"),
        "contamination": puzzle.get("contamination"),
        "time_limit_seconds": puzzle["time_limit_seconds"],
        "row_count": len(df),
        "missing_cell_count": int(df[puzzle["feature_cols"]].isna().sum().sum()),
        "duplicate_row_count": int(df.duplicated().sum()),
        "preview_rows": preview,
    }


@app.post("/api/puzzle/submit")
def submit_puzzle(req: SubmitRequest):
    puzzle = PUZZLES.get(req.puzzle_id)
    if puzzle is None:
        raise HTTPException(404, "puzzle not found or expired")

    df = puzzle["dataframe"].copy(deep=True)
    feature_cols = puzzle["feature_cols"]
    target_col = puzzle["target_col"]

    if req.drop_duplicates:
        df = df.drop_duplicates()

    if req.missing_strategy == "drop_rows":
        df = df.dropna(subset=feature_cols)
    elif req.missing_strategy in ("mean_impute", "median_impute"):
        strategy = "mean" if req.missing_strategy == "mean_impute" else "median"
        imputer = SimpleImputer(strategy=strategy)
        df[feature_cols] = imputer.fit_transform(df[feature_cols])
    else:
        raise HTTPException(400, "unknown missing_strategy")

    if df[feature_cols].isna().any().any():
        # still has missing values (e.g. bad strategy choice) -> fail fast
        return {"access_granted": False, "score": None,
                "reason": "Dataset still contains missing values."}

    threshold = puzzle["threshold"]
    ptype = puzzle["type"]

    # -- Clustering: unsupervised, evaluated with silhouette score on full set --
    if ptype == "clustering":
        X = df[feature_cols].values
        if req.scale_features:
            X = StandardScaler().fit_transform(X)

        k = req.n_clusters or 3
        models = {
            "kmeans": KMeans(n_clusters=k, n_init=10, random_state=42),
            "hierarchical": AgglomerativeClustering(n_clusters=k),
            "dbscan": DBSCAN(eps=0.9),
        }
        if req.model not in models:
            raise HTTPException(400, "unknown model for clustering")
        labels = models[req.model].fit_predict(X)

        if len(set(labels)) < 2 or len(set(labels)) >= len(X):
            score = -1.0
        else:
            score = silhouette_score(X, labels)

        granted = score >= threshold
        return {
            "access_granted": bool(granted),
            "score": round(float(score), 4),
            "threshold": threshold,
            "metric": puzzle["metric"],
        }

    # -- Supervised types (classification / regression / anomaly) --
    X = df[feature_cols].values
    y = df[target_col].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42,
        stratify=y if ptype in ("classification", "anomaly") else None,
    )

    if req.scale_features:
        scaler = StandardScaler()
        X_train = scaler.fit_transform(X_train)
        X_test = scaler.transform(X_test)

    if ptype == "classification":
        models = {
            "logistic_regression": LogisticRegression(max_iter=1000),
            "random_forest": RandomForestClassifier(n_estimators=200, random_state=42),
            "knn": KNeighborsClassifier(n_neighbors=7),
        }
        if req.model not in models:
            raise HTTPException(400, "unknown model for classification")
        clf = models[req.model]
        clf.fit(X_train, y_train)
        preds = clf.predict(X_test)
        score = f1_score(y_test, preds)

    elif ptype == "anomaly":
        contamination = req.contamination or puzzle.get("contamination", 0.05)
        # train only on the (mostly normal) training split, unsupervised
        models = {
            "isolation_forest": IsolationForest(contamination=contamination, random_state=42, n_estimators=300),
            "one_class_svm": OneClassSVM(nu=contamination),
        }
        if req.model not in models:
            raise HTTPException(400, "unknown model for anomaly detection")
        det = models[req.model]
        det.fit(X_train)
        raw_preds = det.predict(X_test)          # 1 = normal, -1 = anomaly
        preds = np.where(raw_preds == -1, 1, 0)  # convert to 1 = anomaly, matching target
        score = recall_score(y_test, preds, zero_division=0)

    else:  # regression
        models = {
            "linear_regression": LinearRegression(),
            "random_forest": RandomForestRegressor(n_estimators=200, random_state=42),
        }
        if req.model not in models:
            raise HTTPException(400, "unknown model for regression")
        reg = models[req.model]
        reg.fit(X_train, y_train)
        preds = reg.predict(X_test)
        score = r2_score(y_test, preds)

    granted = score >= threshold
    return {
        "access_granted": bool(granted),
        "score": round(float(score), 4),
        "threshold": threshold,
        "metric": puzzle["metric"],
    }


@app.get("/api/health")
def health():
    return {"status": "online", "active_puzzles": len(PUZZLES)}
