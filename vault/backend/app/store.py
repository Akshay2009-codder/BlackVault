"""In-memory puzzle store: puzzle_id -> full puzzle state (dataframe,
thresholds, etc.). Never sent to the client as-is — routes.py picks out
only the fields that are safe to reveal.
"""

PUZZLES: dict = {}


def save(puzzle_id: str, puzzle: dict) -> None:
    PUZZLES[puzzle_id] = puzzle


def get(puzzle_id: str):
    return PUZZLES.get(puzzle_id)


def is_active(puzzle_id: str) -> bool:
    """Return True while the puzzle is still live (not yet submitted/expired)."""
    return puzzle_id in PUZZLES


def remove(puzzle_id: str) -> None:
    """Remove a puzzle from the store, e.g. after submission."""
    PUZZLES.pop(puzzle_id, None)


def count() -> int:
    return len(PUZZLES)
