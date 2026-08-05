"""
Preprocess models module for BlackVault backend.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class PreprocessRequest(BaseModel):
    """Player's preprocessing choices sent from Unity."""

    dataset: str = Field(..., description="Dataset identifier (e.g. 'house_prices')")
    missing_strategy: str = Field(
        "fill_median"
        description="How to handle missing values: drop_rows | fill_mean | fill_median | fill_mode | none",
    )
    remove_duplicates: bool = Field(True, description="Whether to remove duplicate rows")
    outlier_strategy: str = Field(
        "clip_iqr",
        description="Outlier handling: none | clip_iqr | remove_iqr",
    )
    encoding: str = Field(
        "label",
        description="Categorical encoding: label | onehot | none",
    )
    scaling: str = Field(
        "standard",
        description="Feature scaling: none | standard | minmax",
    )


class PreprocessResponse(BaseModel):
    """Stats returned to Unity after preprocessing."""

    dataset: str
    rows_before: int
    rows_after: int
    cols: List[str]
    missing_before: int
    missing_after: int
    duplicates_removed: int
    dtypes: Dict[str, str]
    preview: List[Dict[str, Any]]
