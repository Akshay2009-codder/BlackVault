"""chaos.py — mid-puzzle chaos event generator.

Called by the SSE endpoint in routes.py to produce a single random disturbance
that is sent to the client while a puzzle is in progress.

Event types
-----------
metric_shift    Raises or lowers the success threshold mid-puzzle.
data_inject     Pushes a batch of new (corrupted) rows into the preview table.
timer_jolt      Subtracts (or rarely adds) seconds from the countdown.
lockdown_pulse  Pure cosmetic – triggers a camera shake + red vignette on the
                client; no data payload beyond the intensity.
"""

import random

import numpy as np


# Weights: lockdown_pulse is rarer / more dramatic.
_TYPE_WEIGHTS = {
    "classification": [("metric_shift", 3), ("data_inject", 3), ("timer_jolt", 2), ("lockdown_pulse", 1)],
    "regression":     [("metric_shift", 3), ("data_inject", 2), ("timer_jolt", 3), ("lockdown_pulse", 1)],
    "clustering":     [("data_inject", 4), ("timer_jolt", 3), ("lockdown_pulse", 2)],
    "anomaly":        [("data_inject", 4), ("timer_jolt", 3), ("metric_shift", 2), ("lockdown_pulse", 1)],
}


def _pick_type(puzzle_type: str, rng: random.Random) -> str:
    pool = _TYPE_WEIGHTS.get(puzzle_type, _TYPE_WEIGHTS["classification"])
    choices, weights = zip(*pool)
    return rng.choices(choices, weights=weights, k=1)[0]


def _metric_shift(puzzle: dict, rng: random.Random) -> dict:
    """Nudge the threshold by ±5–15 % of its original value."""
    original = puzzle.get("threshold", 0.75)
    delta = rng.uniform(0.05, 0.15) * original * rng.choice([-1, 1])
    new_threshold = round(max(0.05, min(0.99, original + delta)), 3)
    # Mutate the live puzzle state so scoring uses the updated threshold.
    puzzle["threshold"] = new_threshold
    return {
        "type": "metric_shift",
        "new_threshold": new_threshold,
        "delta": round(delta, 3),
        "metric": puzzle.get("metric", "score"),
    }


def _data_inject(puzzle: dict, rng: random.Random) -> dict:
    """Generate 3–8 new corrupted rows from the existing feature column pool."""
    feature_cols = puzzle.get("feature_cols", [])
    is_anomaly = puzzle.get("type") == "anomaly"
    count = rng.randint(3, 8)
    rows = []
    for _ in range(count):
        row: dict = {}
        for col in feature_cols:
            if rng.random() < 0.15:          # 15 % chance of a missing cell
                row[col] = None
            else:
                row[col] = round(rng.gauss(0, 2), 4)
        # anomaly type: never reveal the label column
        if not is_anomaly and puzzle.get("target_col"):
            target_col = puzzle["target_col"]
            row[target_col] = rng.choice([0, 1]) if "class" in str(target_col).lower() else round(rng.gauss(50, 15), 2)
        rows.append(row)
    return {"type": "data_inject", "rows": rows, "count": count}


def _timer_jolt(puzzle: dict, rng: random.Random) -> dict:  # noqa: ARG001
    """Subtract 10–30 s from the timer, or (10 % chance) add 5–15 s."""
    if rng.random() < 0.10:
        delta = rng.randint(5, 15)
    else:
        delta = -rng.randint(10, 30)
    return {"type": "timer_jolt", "delta_seconds": delta}


def _lockdown_pulse(puzzle: dict, rng: random.Random) -> dict:  # noqa: ARG001
    """Cosmetic shake + vignette — no data change."""
    intensity = round(rng.uniform(0.4, 1.0), 2)
    return {"type": "lockdown_pulse", "intensity": intensity}


_GENERATORS = {
    "metric_shift":   _metric_shift,
    "data_inject":    _data_inject,
    "timer_jolt":     _timer_jolt,
    "lockdown_pulse": _lockdown_pulse,
}


def generate_chaos_event(puzzle: dict, rng: random.Random | None = None) -> dict:
    """Return a single chaos event payload dict appropriate to *puzzle*.

    Parameters
    ----------
    puzzle:
        The live puzzle state dict from ``store.get()``.
    rng:
        Optional seeded ``random.Random`` instance.  A fresh one is created if
        omitted.
    """
    if rng is None:
        rng = random.Random()
    event_type = _pick_type(puzzle.get("type", "classification"), rng)
    return _GENERATORS[event_type](puzzle, rng)
