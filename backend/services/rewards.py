"""
Rewards & Achievements System — BlackVault
=============================================
Calculates XP, checks achievement unlock conditions, and manages
player rank progression.
"""

from __future__ import annotations

from typing import List, Dict, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from db.models import MissionAttempt, PlayerProgress, Achievement


ACHIEVEMENT_DEFS: List[Dict] = [
    {
        "id": "first_blood",
        "title": "First Blood",
        "description": "Successfully solve your first ML puzzle.",
        "icon": "🎯",
    },
    {
        "id": "data_janitor",
        "title": "Data Janitor",
        "description": "Complete Level 1 — Data Cleaning.",
        "icon": "🧹",
    },
    {
        "id": "prediction_machine",
        "title": "Prediction Machine",
        "description": "Complete Level 2 — Regression.",
        "icon": "📈",
    },
    {
        "id": "pattern_detector",
        "title": "Pattern Detector",
        "description": "Complete Level 3 — Classification.",
        "icon": "🔬",
    },
    {
        "id": "cluster_commander",
        "title": "Cluster Commander",
        "description": "Complete Level 4 — Clustering.",
        "icon": "🎯",
    },
    {
        "id": "anomaly_hunter",
        "title": "Anomaly Hunter",
        "description": "Complete Level 5 — Anomaly Detection.",
        "icon": "🕵️",
    },
    {
        "id": "boss_slayer",
        "title": "Boss Slayer",
        "description": "Defeat the Final Boss level.",
        "icon": "👑",
    },
    {
        "id": "escape_artist",
        "title": "Escape Artist",
        "description": "Complete all 6 levels and escape the facility.",
        "icon": "🏆",
    },
    {
        "id": "perfect_run",
        "title": "Perfect Run",
        "description": "Pass a puzzle on the first attempt.",
        "icon": "⭐",
    },
    {
        "id": "speed_demon",
        "title": "Speed Demon",
        "description": "Solve 3 puzzles successfully.",
        "icon": "⚡",
    },
    {
        "id": "model_master",
        "title": "Model Master",
        "description": "Use 5 different algorithms successfully.",
        "icon": "🧠",
    },
    {
        "id": "persistent",
        "title": "Persistent",
        "description": "Attempt 10 puzzles (pass or fail).",
        "icon": "💪",
    },
    {
        "id": "veteran",
        "title": "Veteran",
        "description": "Earn 1000 total XP.",
        "icon": "🎖️",
    },
    {
        "id": "legendary",
        "title": "Legendary Hacker",
        "description": "Earn 5000 total XP and achieve Legendary rank.",
        "icon": "🏅",
    },
]


DIFFICULTY_XP_MULTIPLIER = {
    "easy": 1.0,
    "medium": 1.5,
    "hard": 2.0,
    "boss": 3.0,
}

BASE_XP_PER_LEVEL = {
    "1": 100,
    "2": 150,
    "3": 200,
    "4": 250,
    "5": 300,
    "boss": 500,
}

RANK_THRESHOLDS = [
    (5000, "Legendary Hacker"),
    (3000, "Master Infiltrator"),
    (2000, "Senior Analyst"),
    (1000, "Data Operative"),
    (500, "Junior Agent"),
    (100, "Trainee"),
    (0, "Recruit"),
]


def calculate_xp(
    level: str,
    difficulty: str,
    passed: bool,
    attempt_number: int = 1,
) -> int:
    if not passed:
        return 10

    base_xp = BASE_XP_PER_LEVEL.get(str(level), 100)
    multiplier = DIFFICULTY_XP_MULTIPLIER.get(difficulty, 1.0)
    first_attempt_bonus = 1.5 if attempt_number <= 1 else 1.0

    return int(base_xp * multiplier * first_attempt_bonus)


def xp_to_rank(xp: int) -> str:
    for threshold, rank in RANK_THRESHOLDS:
        if xp >= threshold:
            return rank
    return "Recruit"


def check_and_unlock_achievements(
    db: Session,
    player_id: str = "local_player",
) -> List[Dict]:
    existing = {
        a.achievement_id
        for a in db.query(Achievement).filter_by(player_id=player_id).all()
    }

    progress = db.query(PlayerProgress).filter_by(player_id=player_id).first()
    if not progress:
        return []

    all_attempts = db.query(MissionAttempt).filter_by(player_id=player_id).all()
    passed_attempts = [a for a in all_attempts if a.passed]
    passed_levels = {a.level for a in passed_attempts}
    passed_algorithms = {a.algorithm for a in passed_attempts}

    dataset_attempts: Dict[str, List] = {}
    for a in all_attempts:
        dataset_attempts.setdefault(a.dataset_id, []).append(a)

    has_first_attempt_pass = any(
        attempts[0].passed
        for attempts in dataset_attempts.values()
        if attempts
    )

    newly_unlocked = []

    def _try_unlock(achievement_id: str, condition: bool):
        if condition and achievement_id not in existing:
            defn = next((d for d in ACHIEVEMENT_DEFS if d["id"] == achievement_id), None)
            if defn:
                ach = Achievement(
                    player_id=player_id,
                    achievement_id=achievement_id,
                    title=defn["title"],
                    description=defn["description"],
                )
                db.add(ach)
                newly_unlocked.append(defn)

    _try_unlock("first_blood", progress.total_passes >= 1)
    _try_unlock("data_janitor", "1" in passed_levels)
    _try_unlock("prediction_machine", "2" in passed_levels)
    _try_unlock("pattern_detector", "3" in passed_levels)
    _try_unlock("cluster_commander", "4" in passed_levels)
    _try_unlock("anomaly_hunter", "5" in passed_levels)
    _try_unlock("boss_slayer", "boss" in passed_levels)
    _try_unlock("escape_artist", passed_levels >= {"1", "2", "3", "4", "5", "boss"})
    _try_unlock("perfect_run", has_first_attempt_pass)
    _try_unlock("speed_demon", progress.total_passes >= 3)
    _try_unlock("model_master", len(passed_algorithms) >= 5)
    _try_unlock("persistent", progress.total_attempts >= 10)
    _try_unlock("veteran", progress.xp >= 1000)
    _try_unlock("legendary", progress.xp >= 5000)

    if newly_unlocked:
        db.commit()

    return newly_unlocked


def get_all_achievements(
    db: Session,
    player_id: str = "local_player",
) -> List[Dict]:
    earned = {
        a.achievement_id: str(a.unlocked_at)
        for a in db.query(Achievement).filter_by(player_id=player_id).all()
    }

    result = []
    for defn in ACHIEVEMENT_DEFS:
        result.append({
            **defn,
            "unlocked": defn["id"] in earned,
            "unlocked_at": earned.get(defn["id"]),
        })
    return result
