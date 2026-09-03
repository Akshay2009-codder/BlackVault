"""
Pydantic request/response models for the level+door API.
"""

from typing import Optional, Any, Dict, List
from pydantic import BaseModel


class DoorPuzzleRequest(BaseModel):
    level: int
    door_type: str


class DoorPuzzleResponse(BaseModel):
    puzzle_id: str
    level: int
    door_type: str
    dataset_preview: Any
    time_limit_seconds: int
    max_attempts: int
    max_attempts_remaining: int
    hints_enabled: bool


class SubmitAttemptRequest(BaseModel):
    puzzle_id: str
    pipeline_choice: Dict[str, Any]
    time_remaining_seconds: int


class SubmitAttemptResponse(BaseModel):
    passed: bool
    score: float
    target: float
    higher_is_better: bool = True
    attempts_used: int
    attempts_remaining: int
    door_type: str
    stars: Optional[int] = None


class LevelProgressResponse(BaseModel):
    level: int
    doors_cleared: List[str]
    stars_by_door: Dict[str, int]
    level_complete: bool
