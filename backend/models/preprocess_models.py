"""Preprocessing request/response models."""

from pydantic import BaseModel
from typing import List, Dict

class PreprocessRequest(BaseModel):
    dataset: str
    missing_strategy: str = "fill_median"
    remove_duplicates: bool = True
    outlier_strategy: str = "clip_iqr"
    encoding: str = "label"
    scaling: str = "standard"

class PreprocessResponse(BaseModel):
    dataset: str
    rows_before: int
    rows_after: int
    cols: List[str]
    missing_before: int
    missing_after: int
    duplicates_removed: int
    dtypes: Dict[str, str]
    preview: List[dict]