"""
Level management endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import DOOR_TYPES, DOOR_CONFIG, LevelResponse, DoorInfo
from app.models.db_models import get_player, get_level_progress, get_all_progress

router = APIRouter()

# Difficulty scaling per level
LEVEL_CONFIG = {
    1: {"time_limit": 120, "corruption_rate": 0.05, "threshold_modifier": 0.7},
    2: {"time_limit": 110, "corruption_rate": 0.10, "threshold_modifier": 0.75},
    3: {"time_limit": 100, "corruption_rate": 0.15, "threshold_modifier": 0.80},
    4: {"time_limit": 90,  "corruption_rate": 0.20, "threshold_modifier": 0.82},
    5: {"time_limit": 80,  "corruption_rate": 0.25, "threshold_modifier": 0.85},
    6: {"time_limit": 70,  "corruption_rate": 0.30, "threshold_modifier": 0.87},
    7: {"time_limit": 65,  "corruption_rate": 0.35, "threshold_modifier": 0.88},
    8: {"time_limit": 60,  "corruption_rate": 0.40, "threshold_modifier": 0.90},
    9: {"time_limit": 55,  "corruption_rate": 0.45, "threshold_modifier": 0.92},
    10: {"time_limit": 50, "corruption_rate": 0.50, "threshold_modifier": 0.95},
}


def get_level_config(level: int) -> dict:
    """Get difficulty config for a level, extrapolating beyond level 10."""
    if level in LEVEL_CONFIG:
        return LEVEL_CONFIG[level]
    # Extrapolate for levels beyond 10
    base = LEVEL_CONFIG[10]
    extra = level - 10
    return {
        "time_limit": max(30, base["time_limit"] - extra * 3),
        "corruption_rate": min(0.8, base["corruption_rate"] + extra * 0.03),
        "threshold_modifier": min(0.99, base["threshold_modifier"] + extra * 0.01),
    }


@router.get("")
async def list_levels(player_id: int = 1):
    """Get all levels with door completion status."""
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    all_progress = get_all_progress(player_id)
    progress_map = {}
    for p in all_progress:
        key = (p["level_number"], p["door_type"])
        progress_map[key] = p

    levels = []
    max_level = player["current_level"]

    for lvl in range(1, max_level + 1):
        doors = []
        level_stars = 0
        all_done = True

        for dt in DOOR_TYPES:
            cfg = DOOR_CONFIG[dt]
            prog = progress_map.get((lvl, dt))
            stars = prog["stars"] if prog else 0
            completed = stars > 0
            if not completed:
                all_done = False
            level_stars += stars
            doors.append(DoorInfo(
                door_type=dt,
                name=cfg["name"],
                color=cfg["color"],
                icon=cfg["icon"],
                stars=stars,
                completed=completed,
            ))

        levels.append(LevelResponse(
            level_number=lvl,
            doors=doors,
            unlocked=True,
            all_completed=all_done,
            total_stars=level_stars,
        ))

    return {"levels": levels, "current_level": max_level}


@router.get("/{level_number}")
async def get_level(level_number: int, player_id: int = 1):
    """Get a specific level's details and door statuses."""
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    if level_number > player["current_level"]:
        raise HTTPException(status_code=403, detail="Level not unlocked yet")

    progress = get_level_progress(player_id, level_number)
    progress_map = {p["door_type"]: p for p in progress}
    config = get_level_config(level_number)

    doors = []
    for dt in DOOR_TYPES:
        cfg = DOOR_CONFIG[dt]
        prog = progress_map.get(dt)
        doors.append(DoorInfo(
            door_type=dt,
            name=cfg["name"],
            color=cfg["color"],
            icon=cfg["icon"],
            stars=prog["stars"] if prog else 0,
            completed=bool(prog),
        ))

    total_stars = sum(d.stars for d in doors)
    all_done = all(d.completed for d in doors)

    return {
        "level": LevelResponse(
            level_number=level_number,
            doors=doors,
            unlocked=True,
            all_completed=all_done,
            total_stars=total_stars,
        ),
        "config": config,
    }


@router.get("/config/{level_number}")
async def get_level_difficulty(level_number: int):
    """Get the difficulty configuration for a level."""
    return get_level_config(level_number)
