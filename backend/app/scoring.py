"""
Scoring engine -- executes chosen data cleaning, preprocessing, and ML models
against active puzzle datasets using scikit-learn.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import f1_score, r2_score, recall_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

from .stars import StarInput, compute_stars


def evaluate_submission(puzzle: dict, pipeline_choice: dict, time_remaining: int) -> Dict[str, Any]:
    """Execute pipeline_choice against puzzle dataframe and compute metric + stars."""
    df = puzzle["dataframe"].copy(deep=True)
    feature_cols = list(puzzle["feature_cols"])
    target_col = puzzle.get("target_col")

    # 1. Deduplication
    if pipeline_choice.get("drop_duplicates"):
        df = df.drop_duplicates()

    # 2. Missing value handling
    fill_missing = pipeline_choice.get("fill_missing")
    if fill_missing == "drop_rows":
        df = df.dropna(subset=feature_cols)
    elif fill_missing in ("mean", "median"):
        strategy = "mean" if fill_missing == "mean" else "median"
        num_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
        if num_cols:
            imputer = SimpleImputer(strategy=strategy)
            df[num_cols] = imputer.fit_transform(df[num_cols])

    # Check for remaining missing values
    if df[feature_cols].isna().any().any():
        return {
            "passed": False,
            "score": 0.0,
            "target": puzzle["threshold"],
            "higher_is_better": puzzle.get("higher_is_better", True),
            "stars": None,
            "reason": "Dataset still contains missing values. Select a valid imputation strategy or drop rows.",
        }

    if len(df) < 10:
        return {
            "passed": False,
            "score": 0.0,
            "target": puzzle["threshold"],
            "higher_is_better": puzzle.get("higher_is_better", True),
            "stars": None,
            "reason": "Too few rows remaining after filtering. Adjust cleaning choices.",
        }

    # 3. Categorical encoding
    if pipeline_choice.get("encode_categorical"):
        cat_cols = [c for c in feature_cols if not pd.api.types.is_numeric_dtype(df[c])]
        if cat_cols:
            df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
            feature_cols = [c for c in df.columns if c != target_col]

    # 4. Feature scaling
    scale_features = bool(pipeline_choice.get("scale_features", False))
    algo = pipeline_choice.get("algorithm", "").lower()
    params = pipeline_choice.get("params", {}) or {}

    ptype = puzzle.get("real_type") or puzzle.get("type", "classification")
    threshold = float(puzzle["threshold"])
    higher_is_better = puzzle.get("higher_is_better", True)

    score = 0.0

    # ── CLUSTERING ──
    if ptype == "clustering":
        X = df[feature_cols].values
        if scale_features:
            X = StandardScaler().fit_transform(X)

        k = int(params.get("n_clusters") or 3)
        if algo == "kmeans" or not algo:
            model = KMeans(n_clusters=max(2, k), n_init=10, random_state=42)
        elif algo == "hierarchical":
            model = AgglomerativeClustering(n_clusters=max(2, k))
        elif algo == "dbscan":
            eps = float(params.get("eps") or 0.9)
            model = DBSCAN(eps=eps)
        else:
            model = KMeans(n_clusters=max(2, k), n_init=10, random_state=42)

        labels = model.fit_predict(X)
        n_labels = len(set(labels) - {-1})
        if n_labels < 2 or n_labels >= len(X):
            score = -0.5
        else:
            score = float(silhouette_score(X, labels))

    # ── SUPERVISED: CLASSIFICATION / REGRESSION / ANOMALY ──
    else:
        X = df[feature_cols].values
        y = df[target_col].values

        stratify = y if ptype in ("classification", "anomaly") and len(np.unique(y)) > 1 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=stratify
        )

        if scale_features:
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X_train)
            X_test = scaler.transform(X_test)

        if ptype == "classification":
            if algo == "logistic_regression" or not algo:
                clf = LogisticRegression(max_iter=1000)
            elif algo == "random_forest":
                n_est = int(params.get("n_estimators") or 100)
                clf = RandomForestClassifier(n_estimators=n_est, random_state=42)
            elif algo == "knn":
                k = int(params.get("n_neighbors") or 5)
                clf = KNeighborsClassifier(n_neighbors=k)
            else:
                clf = LogisticRegression(max_iter=1000)

            clf.fit(X_train, y_train)
            preds = clf.predict(X_test)
            score = float(f1_score(y_test, preds, average="weighted", zero_division=0))

        elif ptype == "regression":
            if algo == "linear_regression" or not algo:
                reg = LinearRegression()
            elif algo == "random_forest":
                n_est = int(params.get("n_estimators") or 100)
                reg = RandomForestRegressor(n_estimators=n_est, random_state=42)
            elif algo == "ridge":
                alpha = float(params.get("alpha") or 1.0)
                reg = Ridge(alpha=alpha)
            else:
                reg = LinearRegression()

            reg.fit(X_train, y_train)
            preds = reg.predict(X_test)
            score = float(r2_score(y_test, preds))

        elif ptype == "anomaly":
            contamination = float(params.get("contamination") or puzzle.get("contamination", 0.05))
            contamination = min(0.4, max(0.01, contamination))

            if algo == "isolation_forest" or not algo:
                det = IsolationForest(contamination=contamination, random_state=42)
            elif algo == "one_class_svm":
                det = IsolationForest(contamination=contamination, random_state=42)
            else:
                det = IsolationForest(contamination=contamination, random_state=42)

            det.fit(X_train)
            raw_preds = det.predict(X_test)  # 1 = normal, -1 = anomaly
            preds = np.where(raw_preds == -1, 1, 0)
            score = float(recall_score(y_test, preds, zero_division=0))

    score = round(float(score), 4)
    passed = bool(score >= threshold if higher_is_better else score <= threshold)

    stars = None
    if passed:
        star_in = StarInput(
            score=score,
            target=threshold,
            higher_is_better=higher_is_better,
            attempts_used=puzzle.get("attempts_used", 1),
            max_attempts=puzzle.get("max_attempts", 5),
            time_remaining_seconds=max(0, time_remaining),
            time_limit_seconds=puzzle.get("time_limit_seconds", 300),
        )
        stars = compute_stars(star_in)

    return {
        "passed": passed,
        "score": score,
        "target": threshold,
        "higher_is_better": higher_is_better,
        "stars": stars,
    }
