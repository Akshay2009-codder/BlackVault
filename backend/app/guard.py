"""
Security Guard AI ("WARDEN") -- reacts to player events with a line picked
from an event-keyed pool. The frontend speaks the returned text via
speechSynthesis (see frontend/src/guardVoice.js); this module only decides
WHAT to say, never how it's spoken.

No generative AI is used -- lines are hand-authored pools, selected
server-side so the guard's "awareness" can factor in real game state later
(e.g. picking a harsher line if the player has failed the same door twice).
"""

import random
from typing import Optional

# Event keys the frontend can query. Expand this as new triggers are added
# in Phase 5 (e.g. "guard_low_time", "guard_level_clear").
LINE_POOLS: dict[str, list[str]] = {
    "door_opened": [
        "Another intruder. How predictable.",
        "Terminal active. Let's see what you're made of.",
        "Access attempt logged. Proceed if you dare.",
    ],
    "attempt_failed": [
        "Insufficient. The system remains sealed.",
        "Try again -- if you have the nerve.",
        "That model won't save you.",
    ],
    "attempt_passed_1star": [
        "Acceptable. Barely.",
        "You passed. Don't get comfortable.",
    ],
    "attempt_passed_2star": [
        "Competent work. Unexpected.",
        "You're learning. That's concerning.",
    ],
    "attempt_passed_3star": [
        "Impressive. I'll be watching you closely now.",
        "Flawless execution. A rare thing here.",
    ],
    "level_cleared": [
        "You've cleared this sector. Deeper access unlocked.",
        "The vault grows more hostile from here.",
    ],
    "boss_room_entered": [
        "This is the core. No hints. No mercy.",
        "Every system I have is watching this room now.",
    ],
}


def get_guard_line(event: str, seed: Optional[int] = None) -> str:
    """Return a line for the given event key. Raises KeyError on unknown event."""
    pool = LINE_POOLS[event]
    rng = random.Random(seed) if seed is not None else random
    return rng.choice(pool)
