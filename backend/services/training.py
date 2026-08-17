"""
Training logic service module.

Moved out of main.py unchanged — same behavior, same branch logic, just
split into one function per problem type plus a dispatcher so main.py's
/train endpoint can call train_model(df, req) instead of containing the
whole if/elif chain inline.
"""

import numpy as np
from fastapi import HTTPException
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


def train_regression(df, req) -> dict:
    """Trains a regression model and evaluates Root Mean Squared Error (RMSE).

    Args:
        df: Pandas DataFrame containing feature and target columns.
        req: TrainRequest model containing hyperparameter specifications.

    Returns:
        Dict containing model evaluation metrics and UNLOCKED/LOCKED status.
    """
    REGRESSORS = {
        "linear_regression": LinearRegression(),
        "decision_tree": DecisionTreeRegressor(random_state=42),
        "random_forest": RandomForestRegressor(n_estimators=100, random_state=42),
    }
    algo = req.algorithm
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


def train_classification(df, req):
    CLASSIFIERS = {
        "logistic_regression": LogisticRegression(max_iter=1000, random_state=42),
        "decision_tree": DecisionTreeClassifier(random_state=42),
        "random_forest": RandomForestClassifier(n_estimators=100, random_state=42),
        "svm": SVC(random_state=42),
    }
    algo = req.algorithm
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


def train_clustering(df, req):
    CLUSTERERS = {
        "kmeans": lambda k: KMeans(n_clusters=k, random_state=42, n_init=10),
        "dbscan": lambda k: DBSCAN(eps=0.5, min_samples=5),
    }
    algo = req.algorithm
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


def train_anomaly_detection(df, req):
    algo = req.algorithm
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


def train_model(df, req) -> dict:
    """Dispatches dataset training request to the matching problem type pipeline.

    Args:
        df: Pandas DataFrame containing dataset.
        req: TrainRequest containing algorithm and hyperparameter options.

    Returns:
        Dict with metrics, target_metric, achieved score, passed flag, and door_status.

    Raises:
        HTTPException(400): If problem_type or algorithm is unsupported.
    """
    problem = req.problem_type

    if problem == "regression":
        return train_regression(df, req)
    elif problem == "classification":
        return train_classification(df, req)
    elif problem == "clustering":
        return train_clustering(df, req)
    elif problem == "anomaly_detection":
        return train_anomaly_detection(df, req)

    raise HTTPException(
        status_code=400,
        detail=f"Unknown problem type '{problem}'. Allowed: regression, classification, clustering, anomaly_detection",
    )