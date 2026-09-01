"""Randomized mid-puzzle 'chaos events' — the facility's security AI
actively pushes back while the player is mid-pipeline, so no two
playthroughs feel the same and later rooms genuinely get harder in a way
that isn't just "bigger dataset."

Events are scheduled once at puzzle-generation time (see schedule_events)
and applied lazily whenever the frontend's per-second timer tick catches
up to a scheduled trigger time (see check_and_apply, called from the
/api/puzzle/tick route). Only difficulty >= 2 puzzles get a chance at one,
and it's never guaranteed — that keeps early rooms predictable so the
player can learn the pipeline before anything starts moving under them,
matching the brief's "early levels are forgiving, later levels adapt"
difficulty curve.
"""

import random

import numpy as np
import pandas as pd

EVENT_TYPES = ["new_missing", "new_duplicates", "new_outliers", "metric_shift", "time_cut"]

EVENT_MESSAGES = {
    "new_missing": "SENSOR DROPOUT DETECTED \u2014 additional missing values injected into the feed.",
    "new_duplicates": "LOG REPLAY DETECTED \u2014 duplicate records appended to the dataset.",
    "new_outliers": "SIGNAL SPIKE \u2014 corrupted readings introduced into several rows.",
    "metric_shift": "SECURITY AI ADAPTING \u2014 required performance threshold raised.",
    "time_cut": "COUNTERMEASURE ENGAGED \u2014 remaining time reduced.",
}


def schedule_events(puzzle: dict, rng: random.Random) -> None:
    """Mutates `puzzle` in place, adding a `chaos_events` list. At most one
    event, firing roughly a third to two-thirds of the way through the
    time limit — never right at the start (no time to react) and never
    right at the end (no time to matter).
    """
    puzzle["chaos_events"] = []
    if puzzle.get("difficulty", 1) < 2:
        return
    if rng.random() > 0.7:  # not every eligible puzzle gets one — keeps it a surprise
        return
    time_limit = puzzle["time_limit_seconds"]
    trigger_at = rng.randint(int(time_limit * 0.3), int(time_limit * 0.65))
    event_type = rng.choice(EVENT_TYPES)
    puzzle["chaos_events"].append({"type": event_type, "trigger_at": trigger_at, "applied": False})


def check_and_apply(puzzle: dict, elapsed_seconds: int) -> list:
    """Applies any scheduled events whose trigger time has passed and that
    haven't fired yet. Returns a list of small dicts describing what just
    happened (message + updated stats) for the frontend to show as an
    alert and refresh its display from.
    """
    rng = random.Random()
    fired = []
    for event in puzzle.get("chaos_events", []):
        if event["applied"] or elapsed_seconds < event["trigger_at"]:
            continue
        event["applied"] = True
        fired.append(_apply_event(puzzle, event["type"], rng))
    return fired


def _apply_event(puzzle: dict, event_type: str, rng: random.Random) -> dict:
    df = puzzle["dataframe"]
    feature_cols = puzzle["feature_cols"]

    if event_type == "new_missing":
        n = max(3, int(len(df) * 0.05))
        for _ in range(n):
            r = rng.randrange(len(df))
            c = rng.choice(feature_cols)
            df.loc[r, c] = np.nan

    elif event_type == "new_duplicates":
        n = rng.randint(2, 4)
        dupes = df.sample(n=min(n, len(df)), random_state=rng.randint(0, 10**6))
        df = pd.concat([df, dupes], ignore_index=True)
        puzzle["dataframe"] = df

    elif event_type == "new_outliers":
        n = rng.randint(3, 6)
        for _ in range(n):
            r = rng.randrange(len(df))
            c = rng.choice(feature_cols)
            col_mean = df[c].mean()
            col_std = df[c].std() or 1.0
            df.loc[r, c] = col_mean + col_std * rng.uniform(6, 10)

    elif event_type == "metric_shift":
        bump = rng.uniform(0.03, 0.07)
        puzzle["threshold"] = round(puzzle["threshold"] + bump, 2)

    elif event_type == "time_cut":
        cut = rng.randint(20, 45)
        puzzle["time_limit_seconds"] = max(30, puzzle["time_limit_seconds"] - cut)

    return {
        "type": event_type,
        "message": EVENT_MESSAGES[event_type],
        "missing_cell_count": int(df[feature_cols].isna().sum().sum()),
        "duplicate_row_count": int(df.duplicated().sum()),
        "row_count": len(df),
        "threshold": puzzle["threshold"],
        "time_limit_seconds": puzzle["time_limit_seconds"],
    }