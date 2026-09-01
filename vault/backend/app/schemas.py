from typing import Optional

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    puzzle_type: str  # "classification" | "regression" | "clustering" | "anomaly"
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
    n_clusters: Optional[int] = None       # clustering only
    contamination: Optional[float] = None  # anomaly only


class TickRequest(BaseModel):
    puzzle_id: str
    elapsed_seconds: int  # seconds since the terminal was opened, sent ~once/sec