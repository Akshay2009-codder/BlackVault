"""Code-editor execution request model — the "write real Python" puzzle mode."""

from typing import Optional, List

from pydantic import BaseModel


class CodeExecuteRequest(BaseModel):
    dataset: str
    problem_type: str  # regression | classification | clustering | anomaly_detection
    code: str
    target_col: Optional[str] = None
    feature_cols: Optional[List[str]] = None
    target_metric: str = "accuracy"
    target_metric_value: float = 0.75
    metric_direction: str = "higher_is_better"