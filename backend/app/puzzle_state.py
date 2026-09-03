"""
In-memory active-puzzle registry.
Holds active puzzle state (dataframes, metadata, attempt counts)
keyed by puzzle_id while a player works on opening a security door.
"""

from typing import Dict, Any, Optional

_active_puzzles: Dict[str, Any] = {}


def store_puzzle(puzzle_id: str, puzzle_data: dict) -> None:
    """Store active puzzle instance."""
    _active_puzzles[puzzle_id] = puzzle_data


def get_puzzle(puzzle_id: str) -> Optional[dict]:
    """Retrieve an active puzzle by id."""
    return _active_puzzles.get(puzzle_id)


def remove_puzzle(puzzle_id: str) -> Optional[dict]:
    """Remove and return an active puzzle by id."""
    return _active_puzzles.pop(puzzle_id, None)


def clear_puzzles() -> None:
    """Clear all active puzzles."""
    _active_puzzles.clear()
