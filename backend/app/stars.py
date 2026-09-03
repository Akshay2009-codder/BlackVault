"""
Star rating (1-3) for a completed door, based on:
  - metric margin (how far past the required threshold the player's score is)
  - attempts used (fewer is better)
  - time remaining when they passed (more is better)

This module only computes stars for an already-PASSED attempt. A failed
attempt (score below target) never reaches star calculation -- the door
stays locked.

Weights and bands below are placeholders. Phase 4 calibrates these per
puzzle type by running each generator many times and checking the
resulting star distribution feels fair (not always 3, not never 3).
"""

from dataclasses import dataclass


@dataclass
class StarInput:
    score: float
    target: float
    higher_is_better: bool   # True for accuracy/F1/silhouette/recall, False for RMSE-style
    attempts_used: int
    max_attempts: int
    time_remaining_seconds: int
    time_limit_seconds: int


def _margin_score(inp: StarInput) -> float:
    """0.0-1.0: how far past the threshold the player scored."""
    if inp.higher_is_better:
        span = max(1e-9, 1.0 - inp.target)
        return max(0.0, min(1.0, (inp.score - inp.target) / span))
    else:
        # lower_is_better (e.g. RMSE): margin is how far *below* target
        span = max(1e-9, inp.target)
        return max(0.0, min(1.0, (inp.target - inp.score) / span))


def _attempts_score(inp: StarInput) -> float:
    if inp.max_attempts <= 1:
        return 1.0
    used_fraction = (inp.attempts_used - 1) / (inp.max_attempts - 1)
    return max(0.0, 1.0 - used_fraction)


def _time_score(inp: StarInput) -> float:
    if inp.time_limit_seconds <= 0:
        return 0.0
    return max(0.0, min(1.0, inp.time_remaining_seconds / inp.time_limit_seconds))


def compute_stars(inp: StarInput) -> int:
    """Weighted composite -> 1, 2, or 3 stars. Only called for a passing score."""
    composite = (
        0.5 * _margin_score(inp)
        + 0.25 * _attempts_score(inp)
        + 0.25 * _time_score(inp)
    )
    if composite >= 0.75:
        return 3
    if composite >= 0.40:
        return 2
    return 1
