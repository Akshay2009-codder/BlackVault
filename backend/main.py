"""
BlackVault backend entrypoint.

Run with: uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGINS
from app.routes import router
from app import store

app = FastAPI(title="BlackVault API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def startup():
    store.init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}
