"""
Player progress and stats endpoints.
"""
from fastapi import APIRouter, HTTPException
from app.models.schemas import PlayerResponse, ProgressResponse, LevelResponse, DoorInfo, DOOR_TYPES, DOOR_CONFIG
from app.models.db_models import get_player, get_all_progress

router = APIRouter()


@router.get("")
async def get_progress(player_id: int = 1):
    """Get full player progress — all levels, all stars."""
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    all_progress = get_all_progress(player_id)
    progress_map = {}
    for p in all_progress:
        key = (p["level_number"], p["door_type"])
        progress_map[key] = p

    levels = []
    for lvl in range(1, player["current_level"] + 1):
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

    return ProgressResponse(
        player=PlayerResponse(**{
            "id": player["id"],
            "name": player["name"],
            "current_level": player["current_level"],
            "total_stars": player["total_stars"],
        }),
        levels=levels,
        total_stars=player["total_stars"],
        max_level_unlocked=player["current_level"],
    )


@router.get("/player")
async def get_player_info(player_id: int = 1):
    """Get basic player info."""
    player = get_player(player_id)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    return PlayerResponse(
        id=player["id"],
        name=player["name"],
        current_level=player["current_level"],
        total_stars=player["total_stars"],
    )
