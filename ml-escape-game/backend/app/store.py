"""In-memory puzzle store: puzzle_id -> full puzzle state (dataframe,
thresholds, etc.). Never sent to the client as-is — routes.py picks out
only the fields that are safe to reveal.
"""

PUZZLES: dict = {}


def save(puzzle_id: str, puzzle: dict) -> None:
    PUZZLES[puzzle_id] = puzzle


def get(puzzle_id: str):
    return PUZZLES.get(puzzle_id)


def count() -> int:
    return len(PUZZLES)
