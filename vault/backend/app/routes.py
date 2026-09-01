"""API routes: generate a puzzle, submit a solution, health check."""

import random
import uuid

import numpy as np
from fastapi import APIRouter, HTTPException

from . import chaos, progression, store
from .generators import GENERATORS
from .schemas import GenerateRequest, SubmitRequest, TickRequest
from .scoring import evaluate_submission

router = APIRouter()


@router.post("/api/puzzle/generate")
def generate_puzzle(req: GenerateRequest):
    if req.puzzle_type not in GENERATORS:
        raise HTTPException(400, "unknown puzzle_type")

    rng = random.Random()
    puzzle = GENERATORS[req.puzzle_type](req.difficulty, rng)
    chaos.schedule_events(puzzle, rng)
    puzzle_id = str(uuid.uuid4())
    store.save(puzzle_id, puzzle)

    df = puzzle["dataframe"]
    # Anomaly detection is unsupervised from the player's side, and the
    # final "mystery" room must not leak its identity via a labeled target
    # column either — in both cases the true label stays server-side only.
    is_hidden_target = puzzle["type"] in ("anomaly", "mystery")
    preview_cols = puzzle["feature_cols"] if is_hidden_target else list(df.columns)
    preview = df[preview_cols].head(12).replace({np.nan: None}).to_dict(orient="records")

    is_mystery = puzzle["type"] == "mystery"

    return {
        "puzzle_id": puzzle_id,
        "type": puzzle["type"],
        "title": puzzle["title"],
        "feature_cols": puzzle["feature_cols"],
        "target_col": None if is_hidden_target else puzzle["target_col"],
        "metric": puzzle["metric"],
        "threshold": puzzle["threshold"],
        # suggested_k/contamination would each give the type away on their
        # own (only clustering has a suggested_k, only anomaly has a
        # contamination rate) — omit both for the mystery room.
        "suggested_k": None if is_mystery else puzzle.get("suggested_k"),
        "contamination": None if is_mystery else puzzle.get("contamination"),
        "time_limit_seconds": puzzle["time_limit_seconds"],
        "row_count": len(df),
        "missing_cell_count": int(df[puzzle["feature_cols"]].isna().sum().sum()),
        "duplicate_row_count": int(df.duplicated().sum()),
        "preview_rows": preview,
        # lets the frontend show a subtle "adaptive" indicator without
        # revealing what or when — the surprise is the point.
        "has_chaos_event": bool(puzzle["chaos_events"]),
    }


@router.post("/api/puzzle/tick")
def puzzle_tick(req: TickRequest):
    puzzle = store.get(req.puzzle_id)
    if puzzle is None:
        raise HTTPException(404, "puzzle not found or expired")
    fired = chaos.check_and_apply(puzzle, req.elapsed_seconds)
    return {"events": fired}


@router.post("/api/puzzle/submit")
def submit_puzzle(req: SubmitRequest):
    puzzle = store.get(req.puzzle_id)
    if puzzle is None:
        raise HTTPException(404, "puzzle not found or expired")
    result = evaluate_submission(puzzle, req)

    if result.get("access_granted"):
        score = result.get("score") or 0
        threshold = result.get("threshold") or 0
        margin = score - threshold
        result["progress"] = progression.award_xp(puzzle.get("difficulty", 1), margin)

    return result


@router.get("/api/progress")
def get_progress():
    return progression.get_progress()


@router.get("/api/health")
def health():
    return {"status": "online", "active_puzzles": store.count()}