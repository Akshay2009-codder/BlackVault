"""
Door type -> generator dispatch.
"""

from typing import Dict, Any, Optional
from ..levels import DoorConfig
from . import classification, regression, clustering, anomaly, mystery

GENERATORS = {
    "classification": classification.generate,
    "regression": regression.generate,
    "clustering": clustering.generate,
    "anomaly": anomaly.generate,
    "mystery": mystery.generate,
}


def generate_puzzle(door_type: str, level: int, door_cfg: DoorConfig, seed: Optional[int] = None) -> Dict[str, Any]:
    gen_func = GENERATORS.get(door_type)
    if not gen_func:
        raise ValueError(f"No generator available for door type '{door_type}'")

    if seed is None:
        seed = level * 1000 + hash(door_type) % 999

    puzzle = gen_func(
        rows=door_cfg.dataset_rows,
        noise_level=door_cfg.noise_level,
        target_metric=door_cfg.target_metric,
        seed=seed,
    )
    puzzle["level"] = level
    puzzle["door_type"] = door_type
    puzzle["time_limit_seconds"] = door_cfg.time_limit_seconds
    puzzle["max_attempts"] = door_cfg.max_attempts
    puzzle["hints_enabled"] = door_cfg.hints_enabled
    puzzle["attempts_used"] = 0
    return puzzle
