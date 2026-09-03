"""
Level -> per-door difficulty configuration.

Each level defines settings for the 5 hub doors: classification, regression,
clustering, anomaly, and (from Level N_FINAL onward) the mystery boss door.

This is intentionally data-only (no logic) so Phase 3 can tune numbers without
touching generator/scoring code. Generators (Phase 2+) should read these values
instead of hardcoding difficulty.
"""

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class DoorConfig:
    dataset_rows: int
    noise_level: float          # 0.0-1.0, fraction of dirty/corrupted cells
    target_metric: float        # required score to pass (meaning depends on puzzle type)
    time_limit_seconds: int
    max_attempts: int
    hints_enabled: bool


@dataclass
class LevelConfig:
    level: int
    doors: Dict[str, DoorConfig] = field(default_factory=dict)


# Placeholder values -- to be empirically tuned in Phase 4 (star calibration).
LEVELS: Dict[int, LevelConfig] = {
    1: LevelConfig(
        level=1,
        doors={
            "classification": DoorConfig(200, 0.10, 0.75, 300, 5, True),
            "regression": DoorConfig(200, 0.10, 5000.0, 300, 5, True),   # target = max RMSE
            "clustering": DoorConfig(200, 0.10, 0.50, 300, 5, True),      # target = min silhouette
            "anomaly": DoorConfig(200, 0.10, 0.70, 300, 5, True),         # target = min recall
        },
    ),
    2: LevelConfig(
        level=2,
        doors={
            "classification": DoorConfig(400, 0.20, 0.80, 240, 4, True),
            "regression": DoorConfig(400, 0.20, 4000.0, 240, 4, True),
            "clustering": DoorConfig(400, 0.20, 0.55, 240, 4, True),
            "anomaly": DoorConfig(400, 0.20, 0.75, 240, 4, True),
        },
    ),
    3: LevelConfig(
        level=3,
        doors={
            "classification": DoorConfig(600, 0.30, 0.85, 200, 3, False),
            "regression": DoorConfig(600, 0.30, 3000.0, 200, 3, False),
            "clustering": DoorConfig(600, 0.30, 0.60, 200, 3, False),
            "anomaly": DoorConfig(600, 0.30, 0.80, 200, 3, False),
        },
    ),
    # Add more levels here as difficulty is tuned in Phase 3/4.
    # The final level should additionally include a "mystery" door config,
    # or the boss room can be handled as a separate hub state after the
    # last numeric level -- decide in Phase 6.
}


def get_level_config(level: int) -> LevelConfig:
    """Return the config for a level, clamping to the highest defined level
    once the player has progressed past all tuned levels (endless-mode fallback)."""
    if level in LEVELS:
        return LEVELS[level]
    highest = max(LEVELS.keys())
    return LEVELS[highest]
