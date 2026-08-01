"""
train.py
Trains the player's chosen algorithm and evaluates it against the mission's
required metric. This is the "did the door unlock" logic.
"""
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import (
    accuracy_score, f1_score, mean_squared_error, silhouette_score
)
import numpy as np

CLASSIFIERS = {
    "logistic_regression": LogisticRegression(max_iter=1000),
    "decision_tree": DecisionTreeClassifier(random_state=42),
    "random_forest": RandomForestClassifier(random_state=42),
    "svm": SVC(),
}

REGRESSORS = {
    "linear_regression": LinearRegression(),
    "decision_tree": DecisionTreeRegressor(random_state=42),
    "random_forest": RandomForestRegressor(random_state=42),
}

CLUSTERERS = {
    "kmeans": lambda k: KMeans(n_clusters=k, random_state=42, n_init=10),
    "dbscan": lambda k: DBSCAN(),  # k unused, kept for uniform call signature
}


def run_classification(df, feature_cols, target_col, algorithm, target_metric_name, target_metric_value):
    if algorithm not in CLASSIFIERS:
        return {"error": f"Unknown algorithm '{algorithm}'"}

    X, y = df[feature_cols], df[target_col]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    model = CLASSIFIERS[algorithm]
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    metrics = {
        "accuracy": round(accuracy_score(y_test, preds), 4),
        "f1_score": round(f1_score(y_test, preds, average="weighted"), 4),
    }
    achieved = metrics.get(target_metric_name)
    passed = achieved is not None and achieved >= target_metric_value
    return {"metrics": metrics, "target_metric": target_metric_name,
            "target_value": target_metric_value, "achieved": achieved, "passed": passed}


def run_regression(df, feature_cols, target_col, algorithm, target_metric_name, target_metric_value):
    if algorithm not in REGRESSORS:
        return {"error": f"Unknown algorithm '{algorithm}'"}

    X, y = df[feature_cols], df[target_col]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

    model = REGRESSORS[algorithm]
    model.fit(X_train, y_train)
    preds = model.predict(X_test)

    rmse = round(float(np.sqrt(mean_squared_error(y_test, preds))), 2)
    metrics = {"rmse": rmse}
    achieved = metrics.get(target_metric_name)
    # for RMSE, lower is better -> "passed" means achieved <= target
    passed = achieved is not None and achieved <= target_metric_value
    return {"metrics": metrics, "target_metric": target_metric_name,
            "target_value": target_metric_value, "achieved": achieved, "passed": passed}


def run_clustering(df, feature_cols, algorithm, k, target_metric_name, target_metric_value):
    if algorithm not in CLUSTERERS:
        return {"error": f"Unknown algorithm '{algorithm}'"}

    X = df[feature_cols]
    model = CLUSTERERS[algorithm](k)
    labels = model.fit_predict(X)

    if len(set(labels)) < 2:
        metrics = {"silhouette_score": -1.0}
    else:
        metrics = {"silhouette_score": round(float(silhouette_score(X, labels)), 4)}

    achieved = metrics.get(target_metric_name)
    passed = achieved is not None and achieved >= target_metric_value
    return {"metrics": metrics, "target_metric": target_metric_name,
            "target_value": target_metric_value, "achieved": achieved, "passed": passed}
