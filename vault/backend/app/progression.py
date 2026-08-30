"""Lightweight XP / rank / badge progression, backed by SQLite.

Single local player for now — there's no login system yet, so everything
is tracked under one DEFAULT_PLAYER_ID. That's a deliberate scope cut, not
an oversight: swapping in real accounts later only means passing a real
player_id into award_xp()/get_progress() instead of the default, the
schema and rank/badge logic don't change.
"""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "blackvault.db"
DEFAULT_PLAYER_ID = "local_player"

# (xp_threshold, name) — must stay sorted ascending by threshold.
RANKS = [
    (0, "Recruit"),
    (150, "Operative"),
    (400, "Specialist"),
    (800, "Ghost"),
    (1500, "Phantom"),
]

# (xp_threshold, badge_name) — a player holds every badge at or below their XP.
BADGES = [
    (150, "First Breach"),
    (400, "Data Whisperer"),
    (800, "Silent Extraction"),
    (1500, "Vault Legend"),
]


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS player_progress (
            player_id TEXT PRIMARY KEY,
            xp INTEGER NOT NULL DEFAULT 0,
            doors_cleared INTEGER NOT NULL DEFAULT 0
        )
        """
    )
    return conn


def _rank_for(xp: int) -> str:
    rank = RANKS[0][1]
    for threshold, name in RANKS:
        if xp >= threshold:
            rank = name
    return rank


def _badges_for(xp: int) -> list:
    return [name for threshold, name in BADGES if xp >= threshold]


def _next_rank(xp: int):
    for threshold, name in RANKS:
        if xp < threshold:
            return {"name": name, "xp_needed": threshold - xp}
    return None  # already at the top rank


def _read(conn: sqlite3.Connection, player_id: str):
    row = conn.execute(
        "SELECT xp, doors_cleared FROM player_progress WHERE player_id = ?",
        (player_id,),
    ).fetchone()
    return row if row else (0, 0)


def _summary(xp: int, doors_cleared: int) -> dict:
    return {
        "total_xp": xp,
        "rank": _rank_for(xp),
        "badges": _badges_for(xp),
        "next_rank": _next_rank(xp),
        "doors_cleared": doors_cleared,
    }


def award_xp(difficulty: int, score_margin: float, player_id: str = DEFAULT_PLAYER_ID) -> dict:
    """Called after a door unlocks. score_margin = how far above the
    required threshold the player's score was, so mastering a puzzle (not
    just barely passing it) earns more XP.
    """
    gain = 50 + difficulty * 25 + round(max(0.0, score_margin) * 100)

    conn = _connect()
    xp, doors_cleared = _read(conn, player_id)
    xp += gain
    doors_cleared += 1
    conn.execute(
        """
        INSERT INTO player_progress (player_id, xp, doors_cleared)
        VALUES (?, ?, ?)
        ON CONFLICT(player_id) DO UPDATE
            SET xp = excluded.xp, doors_cleared = excluded.doors_cleared
        """,
        (player_id, xp, doors_cleared),
    )
    conn.commit()
    conn.close()

    result = _summary(xp, doors_cleared)
    result["xp_gained"] = gain
    return result


def get_progress(player_id: str = DEFAULT_PLAYER_ID) -> dict:
    conn = _connect()
    xp, doors_cleared = _read(conn, player_id)
    conn.close()
    return _summary(xp, doors_cleared)
