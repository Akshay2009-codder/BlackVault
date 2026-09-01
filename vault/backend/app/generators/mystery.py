"""The Core Security Vault — the final "unknown dataset" challenge.

Silently reuses one of the four real generators, but reports its type as
"mystery" to the API layer and stashes the true type in `real_type` for
scoring.py to use internally. The player has to work out what kind of
problem they're looking at with no label telling them, matching the
brief's final-room requirement: "no hints are provided... the player must
identify the problem type, clean the data, select the best algorithm,
train it, and evaluate it."
"""

import random

from . import anomaly, classification, clustering, regression

REAL_GENERATORS = {
    "classification": classification.generate,
    "regression": regression.generate,
    "clustering": clustering.generate,
    "anomaly": anomaly.generate,
}


def generate(difficulty: int, rng: random.Random) -> dict:
    real_type = rng.choice(list(REAL_GENERATORS.keys()))
    # the final room is always at least as hard as a difficulty-3 room of
    # its (hidden) type, regardless of what difficulty was requested
    puzzle = REAL_GENERATORS[real_type](max(difficulty, 3), rng)
    puzzle["real_type"] = real_type
    puzzle["type"] = "mystery"
    puzzle["title"] = "Core Security Vault \u2014 Unknown Signature"
    return puzzle