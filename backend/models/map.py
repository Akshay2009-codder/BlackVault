"""
map.py — Facility Map Pydantic Data Models for BlackVault API
============================================================
Defines schemas for facility map sectors, nodes, door connections,
and pathfinding navigation requests.
"""

from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class MapPosition(BaseModel):
    x: float
    y: float
    z: float = 0.0


class DoorConnection(BaseModel):
    door_id: str
    target_sector_id: str
    target_node_id: str
    status: str = "SEALED"  # "SEALED" | "UNLOCKED" | "BREACHED"
    clearance_required: int = 1


class TerminalNode(BaseModel):
    node_id: str
    name: str
    level_number: int
    terminal_id: str
    dataset: str
    problem_type: str
    status: str = "ACTIVE"  # "LOCKED" | "ACTIVE" | "COMPLETED"
    position: MapPosition


class SectorDetail(BaseModel):
    sector_id: str
    name: str
    level_number: int
    clearance_level: int
    unlocked: bool = False
    active_hazard: Optional[str] = None
    position: MapPosition
    terminals: List[TerminalNode] = []
    doors: List[DoorConnection] = []
    connected_sectors: List[str] = []


class PathfindingRequest(BaseModel):
    start_sector_id: str
    target_sector_id: str
    operative_clearance: int = 1


class PathfindingStep(BaseModel):
    step_number: int
    sector_id: str
    sector_name: str
    door_id: Optional[str] = None
    unlocked: bool
    position: MapPosition


class PathfindingResponse(BaseModel):
    found: bool
    total_steps: int
    path: List[PathfindingStep]
    estimated_seconds: float


class FacilityMapResponse(BaseModel):
    facility_id: str = "BLACKVAULT_ALPHA"
    total_sectors: int
    unlocked_sectors_count: int
    current_player_sector: str
    sectors: List[SectorDetail]
