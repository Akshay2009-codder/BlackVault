"""
Mission config models for BlackVault backend.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class MissionConfig(BaseModel):
    """Full mission specification returned by /mission/generate."""

    mission_id: str
    level: int | str
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
    tasks: Optional[List[str]] = None
    difficulty: str
    time_limit_seconds: int
    max_retries: Optional[int] = None
    hints_available: bool = True


class RandomEventConfig(BaseModel):
    """A random event that the lab AI triggers mid-puzzle."""

    event_id: str
    event_type: str
    title: str
    description: str
    severity: str = "medium"
    affects_dataset: bool = True
    params: dict = {}


class CorruptRequest(BaseModel):
    """Player's corruption request sent from Unity."""
    dataset: str
    event_type: str
    target_col: Optional[str] = None
    params: dict = {}
