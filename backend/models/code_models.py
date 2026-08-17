"""
models/code_models.py
Pydantic models for the /train/code endpoint. See CODE_EDITOR_CONTRACT.md
for the full contract this implements.

Note: class is named CodeExecuteRequest (not CodeSubmissionRequest) to
match the existing import in models/__init__.py:
    from models.code_models import CodeExecuteRequest
"""
from pydantic import BaseModel, Field
from typing import Optional, Literal


class CodeExecuteRequest(BaseModel):
    """Payload model for executing raw Python code against dataset."""
    mission_id: str = Field(..., description="Unique mission identifier")
    level_id: str = Field(..., description="Problem category (classification, regression, clustering, anomaly_detection)")
    code: str = Field(..., description="Python source code snippet submitted by player")


class CodeExecutionSuccess(BaseModel):
    """Response model returned when code execution and metric calculation succeed."""
    success: Literal[True] = True
    metrics: dict = Field(..., description="Dictionary of computed evaluation metrics")
    target_metric: str = Field(..., description="Primary metric required for mission success")
    target_value: float = Field(..., description="Target threshold required to pass")
    achieved: float = Field(..., description="Metric score achieved by player code")
    passed: bool = Field(..., description="Whether achieved score satisfies target threshold")
    stdout: str = Field("", description="Captured standard output stream")


class CodeExecutionFailure(BaseModel):
    """Response model returned when code execution encounters an error or fails validation."""
    success: Literal[False] = False
    error_type: str = Field(..., description="Category of error (syntax_error, runtime_error, missing_output, timeout)")
    message: str = Field(..., description="Human-readable error description")
    stdout: str = Field("", description="Captured standard output stream before failure")