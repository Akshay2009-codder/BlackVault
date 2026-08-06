"""
Services package for BlackVault backend — the actual ML/data logic,
split out of main.py so the FastAPI endpoints stay thin route handlers.
"""

from services.preprocessing import load_dataset, apply_preprocessing, DATA_DIR
from services.training import train_model
from services.corruption_engine import inject_boss_level_issues, apply_named_event
from services.rewards import calculate_xp, xp_to_rank

__all__ = [
    "load_dataset",
    "apply_preprocessing",
    "DATA_DIR",
    "train_model",
    "inject_boss_level_issues",
    "apply_named_event",
    "calculate_xp",
    "xp_to_rank",
]