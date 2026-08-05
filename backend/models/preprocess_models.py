"""Preprocessing request/response models."""

from pydantic import BaseModel


class PreprocessRequest(BaseModel):
    dataset: str
    missing_strategy: str = "fill_median"   # drop_rows | fill_mean | fill_median | fill_mode
    remove_duplicates: bool = True
    outlier_strategy: str = "clip_iqr"      # none | clip_iqr | remove_iqr
    encoding: str = "label"                 # label | onehot | none
    scaling: str = "standard"               # none | standard | minmax