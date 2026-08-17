"""Training request/response models."""

from typing import Optional, List
from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    """Payload model for model training requests."""
    dataset: str = Field(..., description="Target dataset name")
    problem_type: str = Field(..., description="Task category: regression, classification, clustering, anomaly_detection")
    algorithm: str = Field(..., description="Algorithm name (e.g. random_forest, kmeans, isolation_forest)")
    target_col: Optional[str] = Field(None, description="Name of target label column")
    feature_cols: Optional[List[str]] = Field(None, description="List of feature columns to evaluate")
    target_metric: str = Field("accuracy", description="Primary performance metric to score")
    target_metric_value: float = Field(0.75, description="Target score required to pass mission")
    metric_direction: str = Field("higher_is_better", description="Evaluation direction (higher_is_better or lower_is_better)")
    k: Optional[int] = Field(5, description="Number of clusters for clustering models")
    missing_strategy: str = Field("fill_median", description="Missing value handling strategy")
    remove_duplicates: bool = Field(True, description="Whether to strip duplicate rows before training")
    outlier_strategy: str = Field("clip_iqr", description="Numerical outlier handling method")
    scaling: str = Field("standard", description="Feature scaling strategy")

class TrainResponse(BaseModel):
    """Response payload detailing training metric outcomes and unlock state."""
    metrics: dict = Field(..., description="Dictionary of computed evaluation metrics")
    target_metric: str = Field(..., description="Evaluated primary metric name")
    target_value: float = Field(..., description="Required threshold score")
    achieved: float = Field(..., description="Achieved score")
    passed: bool = Field(..., description="Pass/fail status")
    door_status: str = Field(..., description="Lock status indicator (UNLOCKED or LOCKED)")
    detail: Optional[str] = Field(None, description="Additional status details or hints")
    true_problem_type: Optional[str] = Field(None, description="Actual underlying problem type")
    xp_earned: int = Field(0, description="Experience points awarded for this training run")