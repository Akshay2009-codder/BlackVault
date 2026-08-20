"""Random-event / corruption request models."""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class CorruptRequest(BaseModel):
    """Payload model for applying dynamic data corruption events."""
    dataset: str = Field(..., description="Target dataset name")
    event_type: str = Field(..., description="Corruption type: inject_missing, inject_duplicates, inject_outliers")
    params: Optional[Dict[str, Any]] = Field(None, description="Optional parameters dictionary for corruption event")