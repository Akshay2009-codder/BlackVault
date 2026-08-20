"""Preprocessing request/response models."""

from pydantic import BaseModel, Field
from typing import List, Dict

class PreprocessRequest(BaseModel):
    """Payload model for dataset preprocessing request."""
    dataset: str = Field(..., description="Name of the dataset file to preprocess")
    missing_strategy: str = Field("fill_median", description="Strategy for missing values: drop_rows, fill_mean, fill_median, fill_mode")
    remove_duplicates: bool = Field(True, description="Whether to remove duplicate rows")
    outlier_strategy: str = Field("clip_iqr", description="Strategy for handling numerical outliers: clip_iqr, remove_iqr, or none")
    encoding: str = Field("label", description="Categorical encoding method: label, onehot, or none")
    scaling: str = Field("standard", description="Feature scaling method: standard, minmax, or none")

class PreprocessResponse(BaseModel):
    """Response payload detailing preprocessing summary statistics."""
    dataset: str = Field(..., description="Name of preprocessed dataset")
    rows_before: int = Field(..., description="Row count before preprocessing")
    rows_after: int = Field(..., description="Row count after preprocessing")
    cols: List[str] = Field(..., description="List of column names in preprocessed dataset")
    missing_before: int = Field(..., description="Count of null values before preprocessing")
    missing_after: int = Field(..., description="Count of null values after preprocessing")
    duplicates_removed: int = Field(..., description="Number of duplicate rows removed")
    dtypes: Dict[str, str] = Field(..., description="Column data types mapping")
    preview: List[dict] = Field(..., description="Sample row preview of preprocessed data")