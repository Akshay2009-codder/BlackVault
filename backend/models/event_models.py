"""Random-event / corruption request models."""

from typing import Optional, Dict, Any

from pydantic import BaseModel


class CorruptRequest(BaseModel):
    dataset: str
    event_type: str  # inject_missing | inject_duplicates | inject_outliers
    params: Optional[Dict[str, Any]] = None