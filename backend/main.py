"""
BlackVault Backend — FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.database import init_db
from app.routers import levels, challenges, progress

app = FastAPI(title="BlackVault ML Lab", version="1.0.0")

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(levels.router, prefix="/api/levels", tags=["levels"])
app.include_router(challenges.router, prefix="/api/challenges", tags=["challenges"])
app.include_router(progress.router, prefix="/api/progress", tags=["progress"])


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health")
async def health():
    return {"status": "ok", "game": "BlackVault ML Lab"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
