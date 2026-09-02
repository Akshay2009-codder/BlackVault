"""
SQLite database setup and helpers.
"""
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "blackvault.db")


def get_db():
    """Get a database connection."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = get_db()
    cursor = conn.cursor()

    # Player progress table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL DEFAULT 'Agent',
            current_level INTEGER NOT NULL DEFAULT 1,
            total_stars INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Level completion tracking
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS level_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            level_number INTEGER NOT NULL,
            door_type TEXT NOT NULL,
            stars INTEGER NOT NULL DEFAULT 0,
            best_score REAL DEFAULT 0,
            best_time REAL DEFAULT 0,
            completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id),
            UNIQUE(player_id, level_number, door_type)
        )
    """)

    # Challenge attempts log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_id INTEGER NOT NULL,
            level_number INTEGER NOT NULL,
            door_type TEXT NOT NULL,
            score REAL NOT NULL,
            time_taken REAL NOT NULL,
            stars_earned INTEGER NOT NULL,
            actions_taken TEXT,
            attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (player_id) REFERENCES players(id)
        )
    """)

    # Insert default player if none exists
    cursor.execute("SELECT COUNT(*) FROM players")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO players (name) VALUES ('Agent')")

    conn.commit()
    conn.close()
