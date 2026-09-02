"""
Pydantic schemas for API request/response models.
"""
from pydantic import BaseModel
from typing import Optional, List


# ---------- Door Types ----------
DOOR_TYPES = ["cleaning", "regression", "classification", "clustering", "anomaly"]

DOOR_CONFIG = {
    "cleaning": {"name": "Data Cleaning", "color": "#00ff88", "icon": "🧹", "index": 0},
    "regression": {"name": "Regression", "color": "#4488ff", "icon": "📈", "index": 1},
    "classification": {"name": "Classification", "color": "#aa44ff", "icon": "🏷️", "index": 2},
    "clustering": {"name": "Clustering", "color": "#ff8800", "icon": "🔮", "index": 3},
    "anomaly": {"name": "Anomaly Detection", "color": "#ff4444", "icon": "🔍", "index": 4},
}


# ---------- Request Models ----------
class ChallengeStartRequest(BaseModel):
    player_id: int = 1
    level: int
    door_type: str


class ChallengeSubmitRequest(BaseModel):
    player_id: int = 1
    level: int
    door_type: str
    actions: List[str]
    time_taken: float


# ---------- Response Models ----------
class PlayerResponse(BaseModel):
    id: int
    name: str
    current_level: int
    total_stars: int


class DoorInfo(BaseModel):
    door_type: str
    name: str
    color: str
    icon: str
    stars: int = 0
    completed: bool = False


class LevelResponse(BaseModel):
    level_number: int
    doors: List[DoorInfo]
    unlocked: bool
    all_completed: bool
    total_stars: int


class ChallengeResponse(BaseModel):
    door_type: str
    level: int
    dataset: dict
    target_metric: str
    target_value: float
    time_limit: float
    available_actions: List[str]
    hints: List[str]


class SubmitResponse(BaseModel):
    success: bool
    score: float
    target: float
    stars: int
    message: str
    metric_name: str
    details: dict = {}


class ProgressResponse(BaseModel):
    player: PlayerResponse
    levels: List[LevelResponse]
    total_stars: int
    max_level_unlocked: int
