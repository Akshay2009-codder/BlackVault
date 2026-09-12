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
    problem_statement: str
    starter_code: str
    current_step: int = 1
    total_steps: int = 3
    step_instructions: Optional[str] = None


class SubmitAttemptRequest(BaseModel):
    puzzle_id: str
    pipeline_choice: Dict[str, Any]
    time_remaining_seconds: int


class SubmitCodeRequest(BaseModel):
    puzzle_id: str
    code: str
    time_remaining_seconds: int
    step: Optional[int] = 1


class SubmitAttemptResponse(BaseModel):
    passed: bool
    score: float
    target: float
    higher_is_better: bool = True
    attempts_used: int
    attempts_remaining: int
    door_type: str
    stars: Optional[int] = None
    error_message: Optional[str] = None
    step: Optional[int] = 1
    next_step: Optional[int] = None
    step_passed: Optional[bool] = None
    next_starter_code: Optional[str] = None
    next_instructions: Optional[str] = None


class LevelProgressResponse(BaseModel):
    level: int
    doors_cleared: List[str]
    stars_by_door: Dict[str, int]
    level_complete: bool


class CodeSubmitRequest(BaseModel):
    door_type: str
    level: int
    submitted_code: str
    time_remaining_seconds: Optional[int] = 300
    attempts_used: Optional[int] = 1


class CodeSubmitResponse(BaseModel):
    passed: bool
    output: Optional[str] = None
    error: Optional[str] = None
    score: Optional[float] = 0.0
    stars: Optional[int] = 3
    door_type: str
    level: int
