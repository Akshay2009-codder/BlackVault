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

from typing import Optional, List

from pydantic import BaseModel


class MissionConfig(BaseModel):
    mission_id: str
    level: int
    title: str
    description: str
    problem_type: str
    dataset: str
    target_col: Optional[str] = None
    feature_cols: Optional[List[str]] = None
    algorithms_allowed: Optional[List[str]] = None
    target_metric: Optional[str] = None
    target_metric_value: Optional[float] = None
    metric_direction: Optional[str] = None
    k_range: Optional[List[int]] = None
    difficulty: str
    time_limit_seconds: int
    max_retries: int
    hints_available: bool


class BossMissionResponse(BaseModel):
    mission_id: str
    level: str = "boss"
    title: str
    description: str
    dataset: str
    time_limit_seconds: int
    max_retries: int
    hints_available: bool

class CorruptRequest(BaseModel):
    dataset: str
    event_type: str
    target_col: Optional[str] = None
    params: dict = {}

class RandomEventConfig(BaseModel):
    event_type: str
    description: str
    affected_column: Optional[str] = None
    severity: str
    duration_seconds: int