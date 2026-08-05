"""Training request/response models."""

from typing import Optional, List

from pydantic import BaseModel


class TrainRequest(BaseModel):
    dataset: str
    problem_type: str                        # regression | classification | clustering | anomaly_detection
    algorithm: str
    target_col: Optional[str] = None
    feature_cols: Optional[List[str]] = None
    target_metric: str = "accuracy"
    target_metric_value: float = 0.75
    metric_direction: str = "higher_is_better"
    k: Optional[int] = 5
    # Preprocessing fields (same names as PreprocessRequest for simplicity)
    missing_strategy: str = "fill_median"
    remove_duplicates: bool = True
    outlier_strategy: str = "clip_iqr"
    scaling: str = "standard"

class TrainResponse(BaseModel):
    metrics: dict
    target_metric: str
    target_value: float
    achieved: float
    passed: bool
    door_status: str
    detail: Optional[str] = None
    true_problem_type: Optional[str] = None
    xp_earned: int = 0