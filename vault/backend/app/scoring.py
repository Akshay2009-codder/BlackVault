"""Actually re-applies the player's chosen cleaning pipeline and trains the
model they picked, server-side, so ACCESS GRANTED/DENIED reflects a real
ML result rather than a scripted outcome.
"""

import numpy as np
from fastapi import HTTPException
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import f1_score, r2_score, recall_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM

from .schemas import SubmitRequest


def evaluate_submission(puzzle: dict, req: SubmitRequest) -> dict:
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

        return _result(score, threshold, puzzle["metric"])

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

    return _result(score, threshold, puzzle["metric"])


def _result(score: float, threshold: float, metric: str) -> dict:
    granted = score >= threshold
    return {
        "access_granted": bool(granted),
        "score": round(float(score), 4),
        "threshold": threshold,
        "metric": metric,
    }
