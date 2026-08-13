"""
models/code_models.py
Pydantic models for the /train/code endpoint. See CODE_EDITOR_CONTRACT.md
for the full contract this implements.
"""
from pydantic import BaseModel
from typing import Optional, Literal


class CodeSubmissionRequest(BaseModel):
    mission_id: int
    level_id: str  # classification | regression | clustering | anomaly_detection
    code: str


class CodeExecutionSuccess(BaseModel):
    success: Literal[True] = True
    metrics: dict
    target_metric: str
    target_value: float
    achieved: float
    passed: bool
    stdout: str = ""


class CodeExecutionFailure(BaseModel):
    success: Literal[False] = False
    error_type: str  # syntax_error | runtime_error | missing_output | timeout | blocked_operation
    message: str
    stdout: str = ""