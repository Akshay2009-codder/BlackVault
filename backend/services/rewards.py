"""
Rewards and achievements logic.

calculate_xp() and xp_to_rank() are pure functions (no DB access) so
they're easy to unit test in isolation — see tests/test_rewards.py.
record_mission_attempt() and unlock_achievement() are the DB-writing
helpers that use them; call these from main.py once db/ is wired in
(see db/models.py's wiring notes).
"""

from typing import Optional

from db.models import MissionAttempt, PlayerProgress, Achievement

# ---------------------------------------------------------------------------
# XP calculation
# ---------------------------------------------------------------------------

BASE_XP = 100
FAILED_ATTEMPT_XP = 10  # flat consolation XP so failing still feels like progress, not punishment

DIFFICULTY_MULTIPLIERS = {
    "easy": 1.0,
    "medium": 1.5,
    "hard": 2.0,
}

FIRST_ATTEMPT_BONUS = 1.5  # rewards solving it right the first time


def calculate_xp(level: str, difficulty: str = "easy", passed: bool = True,
                  attempt_number: int = 1) -> int:
    """Calculates XP earned for a completed or failed mission attempt.

    Args:
        level: Level identifier string.
        difficulty: Mission difficulty rating (easy, medium, hard).
        passed: Whether the player achieved the target metric value.
        attempt_number: 1-indexed count of player attempts.

    Returns:
        Integer experience points (XP) awarded.
    """
    if not passed:
        return FAILED_ATTEMPT_XP

    multiplier = DIFFICULTY_MULTIPLIERS.get(difficulty, 1.0)
    bonus = FIRST_ATTEMPT_BONUS if attempt_number == 1 else 1.0
    return round(BASE_XP * multiplier * bonus)


def xp_to_rank(xp: int) -> str:
    """Maps total accumulated experience points to player rank tier.

    Args:
        xp: Total experience points earned (non-negative).

    Returns:
        Rank title string (e.g. Recruit, Operative, Elite Hacker).
    """
    xp = max(0, xp)
    rank = RANK_THRESHOLDS[0][1]
    for threshold, name in RANK_THRESHOLDS:
        if xp >= threshold:
            rank = name
        else:
            break
    return rank


# ---------------------------------------------------------------------------
# DB-writing helpers (require a SQLAlchemy session — not yet called by
# main.py; wire these in alongside db/database.py's init_db() per the
# notes in db/models.py)
# ---------------------------------------------------------------------------

def record_mission_attempt(db, *, player_id: str, level: str, dataset_id: str,
                            algorithm: str, problem_type: str, metric_name: str,
                            metric_value: float, metric_target: float,
                            passed: bool, difficulty: str = "easy",
                            attempt_number: int = 1) -> PlayerProgress:
    """
    Logs one MissionAttempt row, then updates (or creates) the player's
    PlayerProgress row with the earned XP and attempt/pass counters.
    Returns the updated PlayerProgress so the caller can build a response.
    """
    db.add(MissionAttempt(
        player_id=player_id, level=level, dataset_id=dataset_id,
        algorithm=algorithm, problem_type=problem_type, metric_name=metric_name,
        metric_value=metric_value, metric_target=metric_target, passed=passed,
    ))

    progress = db.query(PlayerProgress).filter(
        PlayerProgress.player_id == player_id
    ).first()
    if progress is None:
        progress = PlayerProgress(player_id=player_id)
        db.add(progress)

    earned = calculate_xp(level=level, difficulty=difficulty, passed=passed,
                           attempt_number=attempt_number)
    progress.xp = (progress.xp or 0) + earned
    progress.total_attempts = (progress.total_attempts or 0) + 1
    if passed:
        progress.total_passes = (progress.total_passes or 0) + 1

    db.commit()
    db.refresh(progress)
    return progress


def unlock_achievement(db, *, player_id: str, achievement_id: str,
                        name: str, description: str = "") -> Optional[Achievement]:
    """
    Unlocks an achievement for a player if they don't already have it.
    Returns the new Achievement row, or None if they already had it
    (so callers can tell "newly unlocked" from "already had this").
    """
    existing = db.query(Achievement).filter(
        Achievement.player_id == player_id,
        Achievement.achievement_id == achievement_id,
    ).first()
    if existing is not None:
        return None

    achievement = Achievement(
        player_id=player_id, achievement_id=achievement_id,
        name=name, description=description,
    )
    db.add(achievement)
    db.commit()
    db.refresh(achievement)
    return achievement