"""
Database model helpers — thin wrappers around raw SQL for the SQLite tables.
"""
from app.database import get_db


def get_player(player_id: int = 1):
    """Get player by ID."""
    conn = get_db()
    row = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return None


def update_player_level(player_id: int, level: int):
    """Update the player's current level."""
    conn = get_db()
    conn.execute(
        "UPDATE players SET current_level = ? WHERE id = ?",
        (level, player_id)
    )
    conn.commit()
    conn.close()


def get_level_progress(player_id: int, level_number: int):
    """Get all door completions for a specific level."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM level_progress WHERE player_id = ? AND level_number = ?",
        (player_id, level_number)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_progress(player_id: int):
    """Get all level progress for a player."""
    conn = get_db()
    rows = conn.execute(
        "SELECT * FROM level_progress WHERE player_id = ? ORDER BY level_number, door_type",
        (player_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def save_door_completion(player_id: int, level_number: int, door_type: str,
                         stars: int, score: float, time_taken: float):
    """Save or update door completion (keeps best stars)."""
    conn = get_db()

    # Check existing
    existing = conn.execute(
        "SELECT * FROM level_progress WHERE player_id = ? AND level_number = ? AND door_type = ?",
        (player_id, level_number, door_type)
    ).fetchone()

    if existing:
        # Only update if new stars are better
        if stars > existing["stars"]:
            conn.execute(
                """UPDATE level_progress SET stars = ?, best_score = ?, best_time = ?,
                   completed_at = CURRENT_TIMESTAMP
                   WHERE player_id = ? AND level_number = ? AND door_type = ?""",
                (stars, score, time_taken, player_id, level_number, door_type)
            )
    else:
        conn.execute(
            """INSERT INTO level_progress (player_id, level_number, door_type, stars, best_score, best_time)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (player_id, level_number, door_type, stars, score, time_taken)
        )

    # Update total stars
    total = conn.execute(
        "SELECT COALESCE(SUM(stars), 0) as total FROM level_progress WHERE player_id = ?",
        (player_id,)
    ).fetchone()["total"]
    conn.execute("UPDATE players SET total_stars = ? WHERE id = ?", (total, player_id))

    conn.commit()
    conn.close()


def save_attempt(player_id: int, level_number: int, door_type: str,
                 score: float, time_taken: float, stars: int, actions: str):
    """Log a challenge attempt."""
    conn = get_db()
    conn.execute(
        """INSERT INTO attempts (player_id, level_number, door_type, score, time_taken, stars_earned, actions_taken)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (player_id, level_number, door_type, score, time_taken, stars, actions)
    )
    conn.commit()
    conn.close()
