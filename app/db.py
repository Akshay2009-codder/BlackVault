"""
db.py
SQLite storage for mission configs and player attempt history.

This implements the "no two missions the same" system: each row in the
`missions` table is one possible combination of dataset variant + target
metric + time limit + retry count for a given level. /get-mission picks a
random row for that level on each request.
"""
import sqlite3
import random
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "nexus.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS missions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level_id TEXT NOT NULL,             -- 'classification' | 'regression' | 'clustering'
        dataset_variant TEXT NOT NULL,      -- e.g. 'heart_disease_missing'
        target_metric_name TEXT NOT NULL,   -- 'accuracy' | 'rmse' | 'silhouette_score'
        target_metric_value REAL NOT NULL,
        time_limit_seconds INTEGER NOT NULL,
        max_retries INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        mission_id INTEGER NOT NULL,
        algorithm TEXT NOT NULL,
        passed INTEGER NOT NULL,
        achieved_value REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(mission_id) REFERENCES missions(id)
    );
    """)
    conn.commit()
    conn.close()


def seed_missions():
    """Populate the missions table with the variant/parameter combinations
    described in the design doc. Run once (or re-run after clearing)."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM missions")  # re-seed cleanly for dev

    classification_variants = ["heart_disease_clean", "heart_disease_missing",
                                "heart_disease_outliers", "heart_disease_hard"]
    regression_variants = ["house_prices_clean", "house_prices_missing",
                            "house_prices_outliers", "house_prices_hard"]
    clustering_variants = ["mall_customers_clean", "mall_customers_missing",
                            "mall_customers_outliers", "mall_customers_hard"]

    rows = []
    for v in classification_variants:
        for target in [0.55, 0.60, 0.65]:
            rows.append(("classification", v, "accuracy", target,
                         random.choice([180, 240, 300]), random.choice([2, 3])))

    for v in regression_variants:
        for target in [35000, 28000, 22000]:
            rows.append(("regression", v, "rmse", target,
                         random.choice([180, 240, 300]), random.choice([2, 3])))

    for v in clustering_variants:
        for target in [0.25, 0.30, 0.35]:
            rows.append(("clustering", v, "silhouette_score", target,
                         random.choice([180, 240, 300]), random.choice([2, 3])))

    cur.executemany(
        "INSERT INTO missions (level_id, dataset_variant, target_metric_name, "
        "target_metric_value, time_limit_seconds, max_retries) VALUES (?,?,?,?,?,?)",
        rows
    )
    conn.commit()
    conn.close()
    print(f"Seeded {len(rows)} mission combinations.")


def get_random_mission(level_id: str):
    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM missions WHERE level_id = ? ORDER BY RANDOM() LIMIT 1",
        (level_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def log_attempt(mission_id, algorithm, passed, achieved_value):
    conn = get_conn()
    conn.execute(
        "INSERT INTO attempts (mission_id, algorithm, passed, achieved_value) VALUES (?,?,?,?)",
        (mission_id, algorithm, int(passed), achieved_value)
    )
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    seed_missions()
