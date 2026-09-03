"""
SQLite persistence -- per-player, per-level, per-door best result (stars,
score, attempts). Also tracks overall XP/badges (ported from the old
mission-based progression system in Phase 6).
"""

import sqlite3
import os
from .config import DB_PATH


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS door_results (
            level INTEGER NOT NULL,
            door_type TEXT NOT NULL,
            best_stars INTEGER NOT NULL DEFAULT 0,
            best_score REAL,
            attempts_used INTEGER,
            PRIMARY KEY (level, door_type)
        )
    """)
    conn.commit()
    return conn


def init_db() -> None:
    conn = get_connection()
    conn.close()


def save_door_result(level: int, door_type: str, stars: int, score: float, attempts_used: int) -> None:
    conn = get_connection()
    conn.execute("""
        INSERT INTO door_results (level, door_type, best_stars, best_score, attempts_used)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(level, door_type) DO UPDATE SET
            best_stars = MAX(best_stars, excluded.best_stars),
            best_score = excluded.best_score,
            attempts_used = excluded.attempts_used
        WHERE excluded.best_stars >= door_results.best_stars
    """, (level, door_type, stars, score, attempts_used))
    conn.commit()
    conn.close()


def get_level_progress(level: int) -> list:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM door_results WHERE level = ?", (level,)
    ).fetchall()
    conn.close()
    return rows
