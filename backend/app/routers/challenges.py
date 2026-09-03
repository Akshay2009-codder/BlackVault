"""
Challenge start and submission endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ChallengeStartRequest, ChallengeSubmitRequest,
    ChallengeResponse, SubmitResponse, DOOR_TYPES
)
from app.models.db_models import get_player, save_door_completion, save_attempt
from app.routers.levels import get_level_config
from app.ml.datasets import generate_dataset
from app.ml.scoring import compute_score, score_to_stars
import json

router = APIRouter()

# In-memory store for active challenges (simple for Phase 1)
active_challenges = {}


@router.post("/start", response_model=ChallengeResponse)
async def start_challenge(req: ChallengeStartRequest):
    """Start a new challenge for a door."""
    player = get_player(req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if req.door_type not in DOOR_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid door type. Must be one of: {DOOR_TYPES}")

    if req.level > player["current_level"]:
        raise HTTPException(status_code=403, detail="Level not unlocked yet")

    config = get_level_config(req.level)

    # Generate the dataset and challenge params
    challenge_data = generate_dataset(req.door_type, req.level, config)

    # Store active challenge
    challenge_key = f"{req.player_id}_{req.level}_{req.door_type}"
    active_challenges[challenge_key] = {
        "dataset": challenge_data["dataset"],
        "clean_dataset": challenge_data.get("clean_dataset"),
        "answer": challenge_data.get("answer"),
        "issue_breakdown": challenge_data.get("issue_breakdown"),
        "config": config,
    }

    return ChallengeResponse(
        door_type=req.door_type,
        level=req.level,
        dataset=challenge_data["dataset"],
        target_metric=challenge_data["target_metric"],
        target_value=challenge_data["target_value"],
        time_limit=config["time_limit"],
        available_actions=challenge_data["available_actions"],
        hints=challenge_data.get("hints", []),
        issue_breakdown=challenge_data.get("issue_breakdown"),
        cell_issues=challenge_data.get("cell_issues"),
        action_details=challenge_data.get("action_details"),
    )


@router.post("/submit", response_model=SubmitResponse)
async def submit_challenge(req: ChallengeSubmitRequest):
    """Submit a solution for a challenge."""
    player = get_player(req.player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    challenge_key = f"{req.player_id}_{req.level}_{req.door_type}"
    challenge = active_challenges.get(challenge_key)

    if not challenge:
        raise HTTPException(status_code=404, detail="No active challenge found. Start one first.")

    config = challenge["config"]

    # If code submitted (from code editor), parse it into actions
    effective_actions = req.actions or []
    if req.code and not effective_actions:
        from app.ml.scoring import code_to_actions
        effective_actions = code_to_actions(req.code)

    # Compute score based on actions taken
    result = compute_score(
        door_type=req.door_type,
        level=req.level,
        actions=effective_actions,
        challenge_data=challenge,
        time_taken=req.time_taken,
        config=config,
    )

    stars = score_to_stars(result["score"], result["target"], req.time_taken, config["time_limit"])

    # Save results
    if stars > 0:
        save_door_completion(
            req.player_id, req.level, req.door_type,
            stars, result["score"], req.time_taken
        )

    save_attempt(
        req.player_id, req.level, req.door_type,
        result["score"], req.time_taken, stars,
        json.dumps(req.actions)
    )

    # Check if all doors completed for this level
    _check_level_unlock(req.player_id, req.level)

    # Clean up active challenge
    del active_challenges[challenge_key]

    return SubmitResponse(
        success=stars > 0,
        score=result["score"],
        target=result["target"],
        stars=stars,
        message=result["message"],
        metric_name=result["metric_name"],
        details=result.get("details", {}),
        feedback=result.get("feedback"),
    )


def _check_level_unlock(player_id: int, level: int):
    """If all 5 doors are completed, unlock next level."""
    from app.models.db_models import get_level_progress, update_player_level, get_player

    progress = get_level_progress(player_id, level)
    completed_doors = {p["door_type"] for p in progress if p["stars"] > 0}

    if len(completed_doors) == len(DOOR_TYPES):
        player = get_player(player_id)
        if player["current_level"] == level:
            update_player_level(player_id, level + 1)
