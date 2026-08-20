"""
Mission config models.

MISSION_POOL in main.py stores missions as plain dicts (not instances of
this model) since the pool entries have different optional fields per
problem type (e.g. cleaning-only levels have no target_metric). This
model documents the expected shape and can be used to validate a mission
dict if you want stricter guarantees later:

    Mission.model_validate(MISSION_POOL[0])

BossMissionResponse mirrors exactly what GET /mission/generate/boss
returns to Unity — deliberately excludes true_problem_type/target_col,
which stay server-side in main.py's BOSS_MISSIONS registry.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class MissionConfig(BaseModel):
    """Configuration schema for game missions and challenges."""
    mission_id: str = Field(..., description="Unique mission identifier")
    level: int = Field(..., description="Level numeric index")
    title: str = Field(..., description="Player-facing mission title")
    description: str = Field(..., description="Mission brief and narrative description")
    problem_type: str = Field(..., description="Machine learning problem type")
    dataset: str = Field(..., description="Dataset name associated with mission")
    target_col: Optional[str] = Field(None, description="Name of target label column")
    feature_cols: Optional[List[str]] = Field(None, description="List of allowed feature column names")
    algorithms_allowed: Optional[List[str]] = Field(None, description="List of algorithm choices available")
    target_metric: Optional[str] = Field(None, description="Primary performance metric to pass level")
    target_metric_value: Optional[float] = Field(None, description="Target performance score threshold")
    metric_direction: Optional[str] = Field(None, description="Direction of target metric (higher_is_better/lower_is_better)")
    k_range: Optional[List[int]] = Field(None, description="Range of k values for clustering missions")
    difficulty: str = Field(..., description="Difficulty rating (easy, medium, hard, boss)")
    time_limit_seconds: int = Field(..., description="Time limit allocated to complete mission")
    max_retries: int = Field(..., description="Maximum allowed attempts before lockout")
    hints_available: bool = Field(..., description="Whether hint system is unlocked for this level")


class BossMissionResponse(BaseModel):
    """Response payload for procedural boss level creation."""
    mission_id: str = Field(..., description="Boss mission unique ID")
    level: str = Field("boss", description="Level type constant")
    title: str = Field(..., description="Boss level title")
    description: str = Field(..., description="Boss level narrative brief")
    dataset: str = Field(..., description="Corrupted boss dataset name")
    time_limit_seconds: int = Field(..., description="Time limit allocated for boss level")
    max_retries: int = Field(..., description="Maximum attempts allowed")
    hints_available: bool = Field(..., description="Hint availability flag")


class RandomEventConfig(BaseModel):
    """Configuration model for random data corruption events."""
    event_id: Optional[str] = Field(None, description="Unique event identifier")
    event_type: str = Field(..., description="Category of corruption event")
    title: Optional[str] = Field(None, description="Player facing alert title")
    description: str = Field(..., description="Narrative description of data anomaly")
    affected_column: Optional[str] = Field(None, description="Target column affected by event")
    severity: str = Field(..., description="Severity tier (low, medium, high)")
    affects_dataset: bool = Field(True, description="Whether event mutates dataset contents")
    params: Dict[str, Any] = Field(default_factory=dict, description="Event configuration parameters")