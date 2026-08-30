"""
BLACKVAULT — ML Escape Game backend
Generates real, randomized ML puzzles (dirty datasets) and validates the
player's chosen pipeline by actually training a model server-side.

Run:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

See app/ for the actual implementation:
    app/config.py       shared constants (feature name pool)
    app/corruption.py   injects missing values / duplicates into datasets
    app/generators/      one module per puzzle type (classification,
                          regression, clustering, anomaly)
    app/schemas.py       request/response models
    app/scoring.py       re-runs the player's chosen pipeline and scores it
    app/store.py         in-memory puzzle state
    app/routes.py        the three API endpoints
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import router

app = FastAPI(title="BlackVault ML Puzzle Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
