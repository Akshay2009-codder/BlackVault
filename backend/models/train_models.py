"""
Train models module for BlackVault backend.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class TrainRequest(BaseModel):
    """Player's training configuration sent from Unity."""

    dataset: str = Field(..., description="Dataset identifier")
    problem_type: str = Field(
        ...,
        description="ML problem type: regression | classification | clustering | anomaly_detection",
    )
    algorithm: str = Field(..., description="Algorithm key (e.g. 'random_forest')")
    target_col: Optional[str] = Field(None, description="Target/label column name")
    feature_cols: Optional[List[str]] = Field(
        None, description="Feature column names (None = use all except target_col)"
    )
    target_metric: str = Field("accuracy", description="Metric to evaluate against")
    target_metric_value: float = Field(0.75, description="Threshold to pass")
    metric_direction: str = Field(
        "higher_is_better",
        description="Pass direction: higher_is_better | lower_is_better | range_2_to_15_percent",
    )
    k: Optional[int] = Field(5, description="Number of clusters (clustering only)")

    # Preprocessing fields — Unity sends these alongside the training request
    missing_strategy: str = Field("fill_median")
    remove_duplicates: bool = Field(True)
    outlier_strategy: str = Field("clip_iqr")
    scaling: str = Field("standard")


class TrainResponse(BaseModel):
    """Result returned to Unity after training + evaluation."""

    metrics: Dict[str, Any]
    target_metric: str
    target_value: float
    achieved: float
    passed: bool
    door_status: str  # "UNLOCKED" | "LOCKED"
    detail: Optional[str] = None  # Optional extra info
    true_problem_type: Optional[str] = None  # Boss only
    xp_earned: int = 0  # XP awarded for this attempt
