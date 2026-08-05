"""
Training service module — BlackVault
======================================
Single source of truth for all ML training & evaluation logic.
"""

from __future__ import annotations

from typing import Dict, Any, Optional, List

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import (
    RandomForestClassifier,
    RandomForestRegressor,
    IsolationForest,
)
from sklearn.svm import SVC, OneClassSVM
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    recall_score,
    precision_score,
    mean_squared_error,
    mean_absolute_error,
    r2_score,
    silhouette_score,
)

try:
    from xgboost import XGBClassifier, XGBRegressor

    _HAS_XGBOOST = True
except ImportError:
    _HAS_XGBOOST = False


def _get_regressors() -> Dict[str, Any]:
    regressors = {
        "linear_regression": LinearRegression(),
        "decision_tree": DecisionTreeRegressor(random_state=42),
        "random_forest": RandomForestRegressor(n_estimators=100, random_state=42),
    }
    if _HAS_XGBOOST:
        regressors["xgboost"] = XGBRegressor(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbosity=0,
        )
    return regressors


def _get_classifiers() -> Dict[str, Any]:
    classifiers = {
        "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
        "decision_tree": DecisionTreeClassifier(random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "svm": SVC(random_state=42),
    }
    if _HAS_XGBOOST:
        classifiers["xgboost"] = XGBClassifier(
            n_estimators=100,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            verbosity=0,
            use_label_encoder=False,
            eval_metric="logloss",
        )
    return classifiers


def _get_clusterers() -> Dict[str, Any]:
    return {
        "kmeans": lambda k: KMeans(n_clusters=k, random_state=42, n_init=10),
        "dbscan": lambda k: DBSCAN(eps=0.5, min_samples=5),
        "hierarchical": lambda k: AgglomerativeClustering(n_clusters=k),
    }


def train_and_evaluate(
    df: pd.DataFrame,
    problem_type: str,
    algorithm: str,
    target_col: Optional[str] = None,
    feature_cols: Optional[List[str]] = None,
    target_metric: str = "accuracy",
    target_metric_value: float = 0.75,
    metric_direction: str = "higher_is_better",
    k: Optional[int] = 5,
) -> Dict[str, Any]:
    if problem_type == "regression":
        return _train_regression(
            df, algorithm, target_col, feature_cols,
            target_metric, target_metric_value,
        )
    elif problem_type == "classification":
        return _train_classification(
            df, algorithm, target_col, feature_cols,
            target_metric, target_metric_value,
        )
    elif problem_type == "clustering":
        return _train_clustering(
            df, algorithm, feature_cols,
            target_metric, target_metric_value, k,
        )
    elif problem_type == "anomaly_detection":
        return _train_anomaly(
            df, algorithm, feature_cols,
            target_metric, target_metric_value,
        )
    else:
        raise ValueError(
            f"Unknown problem_type '{problem_type}'. "
            "Use: regression | classification | clustering | anomaly_detection"
        )


def _train_regression(
    df: pd.DataFrame,
    algorithm: str,
    target_col: Optional[str],
    feature_cols: Optional[List[str]],
    target_metric: str,
    target_metric_value: float,
) -> Dict[str, Any]:
    regressors = _get_regressors()
    if algorithm not in regressors:
        raise ValueError(
            f"Unknown regressor '{algorithm}'. Allowed: {list(regressors)}"
        )

    feat = feature_cols or [c for c in df.columns if c != target_col]
    X, y = df[feat], df[target_col]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)

    model = regressors[algorithm]
    model.fit(Xtr, ytr)
    preds = model.predict(Xte)

    rmse = round(float(np.sqrt(mean_squared_error(yte, preds))), 2)
    mae = round(float(mean_absolute_error(yte, preds)), 2)
    r2 = round(float(r2_score(yte, preds)), 4)

    metrics = {"rmse": rmse, "mae": mae, "r2_score": r2}

    achieved = metrics.get(target_metric, rmse)
    if target_metric in ("rmse", "mae"):
        passed = achieved <= target_metric_value
    else:
        passed = achieved >= target_metric_value

    return {
        "metrics": metrics,
        "target_metric": target_metric,
        "target_value": target_metric_value,
        "achieved": achieved,
        "passed": passed,
        "door_status": "UNLOCKED" if passed else "LOCKED",
    }


def _train_classification(
    df: pd.DataFrame,
    algorithm: str,
    target_col: Optional[str],
    feature_cols: Optional[List[str]],
    target_metric: str,
    target_metric_value: float,
) -> Dict[str, Any]:
    classifiers = _get_classifiers()
    if algorithm not in classifiers:
        raise ValueError(
            f"Unknown classifier '{algorithm}'. Allowed: {list(classifiers)}"
        )

    feat = feature_cols or [c for c in df.columns if c != target_col]
    X, y = df[feat], df[target_col]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42)

    model = classifiers[algorithm]
    model.fit(Xtr, ytr)
    preds = model.predict(Xte)

    metrics = {
        "accuracy": round(float(accuracy_score(yte, preds)), 4),
        "f1_score": round(float(f1_score(yte, preds, average="weighted", zero_division=0)), 4),
        "recall": round(float(recall_score(yte, preds, average="weighted", zero_division=0)), 4),
        "precision": round(float(precision_score(yte, preds, average="weighted", zero_division=0)), 4),
    }

    achieved = metrics.get(target_metric, metrics["accuracy"])
    passed = achieved >= target_metric_value

    return {
        "metrics": metrics,
        "target_metric": target_metric,
        "target_value": target_metric_value,
        "achieved": achieved,
        "passed": passed,
        "door_status": "UNLOCKED" if passed else "LOCKED",
    }


def _train_clustering(
    df: pd.DataFrame,
    algorithm: str,
    feature_cols: Optional[List[str]],
    target_metric: str,
    target_metric_value: float,
    k: Optional[int],
) -> Dict[str, Any]:
    clusterers = _get_clusterers()
    if algorithm not in clusterers:
        raise ValueError(
            f"Unknown clusterer '{algorithm}'. Allowed: {list(clusterers)}"
        )

    feat = feature_cols or df.select_dtypes(include=np.number).columns.tolist()
    X = df[feat]

    model = clusterers[algorithm](k or 5)
    labels = model.fit_predict(X) if hasattr(model, "fit_predict") else model.fit(X).labels_

    n_clusters = len(set(labels) - {-1})
    sil = (
        round(float(silhouette_score(X, labels)), 4)
        if n_clusters >= 2
        else -1.0
    )
    passed = sil >= target_metric_value

    return {
        "metrics": {"silhouette_score": sil, "n_clusters_found": n_clusters},
        "target_metric": "silhouette_score",
        "target_value": target_metric_value,
        "achieved": sil,
        "passed": passed,
        "door_status": "UNLOCKED" if passed else "LOCKED",
    }


def _train_anomaly(
    df: pd.DataFrame,
    algorithm: str,
    feature_cols: Optional[List[str]],
    target_metric: str,
    target_metric_value: float,
) -> Dict[str, Any]:
    feat = feature_cols or df.select_dtypes(include=np.number).columns.tolist()
    X = df[feat]

    if algorithm == "isolation_forest":
        model = IsolationForest(contamination=0.05, random_state=42)
    elif algorithm == "one_class_svm":
        model = OneClassSVM(nu=0.05)
    else:
        raise ValueError(
            f"Unknown anomaly detector '{algorithm}'. "
            "Allowed: isolation_forest, one_class_svm"
        )

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
        "target_value": target_metric_value,
        "achieved": anomaly_rate,
        "passed": passed,
        "door_status": "UNLOCKED" if passed else "LOCKED",
    }
