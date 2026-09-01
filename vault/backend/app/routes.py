"""API routes: generate a puzzle, submit a solution, health check."""

import asyncio
import json
import random
import uuid

import numpy as np
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from . import progression, store
from .chaos import generate_chaos_event
from .generators import GENERATORS
from .schemas import GenerateRequest, SubmitRequest
from .scoring import evaluate_submission

router = APIRouter()


@router.post("/api/puzzle/generate")
def generate_puzzle(req: GenerateRequest):
    if req.puzzle_type not in GENERATORS:
        raise HTTPException(400, "unknown puzzle_type")

    rng = random.Random()
    puzzle = GENERATORS[req.puzzle_type](req.difficulty, rng)
    puzzle_id = str(uuid.uuid4())
    store.save(puzzle_id, puzzle)

    df = puzzle["dataframe"]
    # Anomaly detection is unsupervised from the player's side — the true
    # fraud/anomaly label must never be shown, only used server-side to score.
    is_hidden_target = puzzle["type"] == "anomaly"
    preview_cols = puzzle["feature_cols"] if is_hidden_target else list(df.columns)
    preview = df[preview_cols].head(12).replace({np.nan: None}).to_dict(orient="records")

    return {
        "puzzle_id": puzzle_id,
        "type": puzzle["type"],
        "title": puzzle["title"],
        "feature_cols": puzzle["feature_cols"],
        "target_col": None if is_hidden_target else puzzle["target_col"],
        "metric": puzzle["metric"],
        "threshold": puzzle["threshold"],
        "suggested_k": puzzle.get("suggested_k"),
        "contamination": puzzle.get("contamination"),
        "time_limit_seconds": puzzle["time_limit_seconds"],
        "row_count": len(df),
        "missing_cell_count": int(df[puzzle["feature_cols"]].isna().sum().sum()),
        "duplicate_row_count": int(df.duplicated().sum()),
        "preview_rows": preview,
    }


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

    # Remove from store — the SSE stream checks is_active() and will close.
    store.remove(req.puzzle_id)
    return result


@router.get("/api/puzzle/events/{puzzle_id}")
async def puzzle_events(puzzle_id: str):
    """SSE endpoint: streams chaos events at random intervals while the
    puzzle is still active. The stream ends when the puzzle is submitted
    (store.remove removes it) or after a max of 8 events.
    """
    puzzle = store.get(puzzle_id)
    if puzzle is None:
        raise HTTPException(404, "puzzle not found or expired")

    rng = random.Random()

    async def event_generator():
        # Send an initial "connected" heartbeat comment so the browser
        # EventSource registers the stream immediately.
        yield ": connected\n\n"
        events_sent = 0
        max_events = rng.randint(3, 8)
        while store.is_active(puzzle_id) and events_sent < max_events:
            # Wait a random interval between chaos bursts (8 – 18 s).
            delay = rng.uniform(8, 18)
            await asyncio.sleep(delay)
            if not store.is_active(puzzle_id):
                break
            payload = generate_chaos_event(store.get(puzzle_id), rng)
            yield f"data: {json.dumps(payload)}\n\n"
            events_sent += 1
        # Final sentinel so the client can clean up.
        yield "data: {\"type\": \"stream_end\"}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering if used
        },
    )


@router.get("/api/progress")
def get_progress():
    return progression.get_progress()


@router.get("/api/health")
def health():
    return {"status": "online", "active_puzzles": store.count()}
