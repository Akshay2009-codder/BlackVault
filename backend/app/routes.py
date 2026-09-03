"""
API routes for the level+door contract.
Connects generators, in-memory puzzle state, scikit-learn scoring, guard AI, and SQLite store.
"""

import uuid
from fastapi import APIRouter, HTTPException

from .schemas import (
    DoorPuzzleRequest, DoorPuzzleResponse,
    SubmitAttemptRequest, SubmitAttemptResponse,
    LevelProgressResponse,
)
from .levels import get_level_config
from .guard import get_guard_line
from .generators import generate_puzzle
from . import puzzle_state, scoring, store

router = APIRouter()


@router.post("/api/door/open", response_model=DoorPuzzleResponse)
def open_door(req: DoorPuzzleRequest):
    level_cfg = get_level_config(req.level)
    door_cfg = level_cfg.doors.get(req.door_type)
    if door_cfg is None:
        raise HTTPException(400, f"Unknown door type '{req.door_type}' for level {req.level}")

    puzzle_id = f"L{req.level}-{req.door_type}-{uuid.uuid4().hex[:6]}"
    puzzle = generate_puzzle(req.door_type, req.level, door_cfg)
    puzzle["puzzle_id"] = puzzle_id

    puzzle_state.store_puzzle(puzzle_id, puzzle)

    return DoorPuzzleResponse(
        puzzle_id=puzzle_id,
        level=req.level,
        door_type=req.door_type,
        dataset_preview=puzzle["dataset_preview"],
        time_limit_seconds=door_cfg.time_limit_seconds,
        max_attempts=door_cfg.max_attempts,
        max_attempts_remaining=door_cfg.max_attempts,
        hints_enabled=door_cfg.hints_enabled,
    )


@router.post("/api/door/submit", response_model=SubmitAttemptResponse)
def submit_attempt(req: SubmitAttemptRequest):
    puzzle = puzzle_state.get_puzzle(req.puzzle_id)
    if not puzzle:
        raise HTTPException(404, "Active puzzle not found or expired. Please re-open the door.")

    puzzle["attempts_used"] = puzzle.get("attempts_used", 0) + 1
    max_attempts = puzzle.get("max_attempts", 5)
    attempts_remaining = max(0, max_attempts - puzzle["attempts_used"])

    res = scoring.evaluate_submission(
        puzzle=puzzle,
        pipeline_choice=req.pipeline_choice,
        time_remaining=req.time_remaining_seconds,
    )

    door_type = puzzle.get("door_type", "")
    level = puzzle.get("level", 1)

    if res["passed"] and res["stars"]:
        store.save_door_result(
            level=level,
            door_type=door_type,
            stars=res["stars"],
            score=res["score"],
            attempts_used=puzzle["attempts_used"],
        )

    return SubmitAttemptResponse(
        passed=res["passed"],
        score=res["score"],
        target=res["target"],
        higher_is_better=res.get("higher_is_better", True),
        attempts_used=puzzle["attempts_used"],
        attempts_remaining=attempts_remaining,
        door_type=door_type,
        stars=res.get("stars"),
    )


@router.get("/api/guard/line/{event}")
def guard_line(event: str):
    try:
        return {"line": get_guard_line(event)}
    except KeyError:
        raise HTTPException(404, f"Unknown guard event '{event}'")


@router.get("/api/level/{level}/progress", response_model=LevelProgressResponse)
def level_progress(level: int):
    rows = store.get_level_progress(level)
    stars_by_door = {r["door_type"]: r["best_stars"] for r in rows}
    doors_cleared = [d for d, s in stars_by_door.items() if s > 0]
    level_cfg = get_level_config(level)
    level_complete = set(doors_cleared) >= set(level_cfg.doors.keys())
    return LevelProgressResponse(
        level=level,
        doors_cleared=doors_cleared,
        stars_by_door=stars_by_door,
        level_complete=level_complete,
    )
