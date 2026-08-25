"""
map_service.py — Facility Map Management & Pathfinding Service
===============================================================
Seeds facility layout into DB, queries map state, computes optimal
navigation paths, and manages sector door unlock transitions.
"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from db.map_models import DBSector, DBTerminalNode, DBDoorConnection
from models.map import (
    MapPosition,
    DoorConnection,
    TerminalNode,
    SectorDetail,
    FacilityMapResponse,
    PathfindingStep,
    PathfindingResponse,
)

# In-memory default facility layout configuration
DEFAULT_SECTORS = [
    {
        "sector_id": "SEC_00",
        "name": "Surface Command & Mission Hub",
        "level_number": 0,
        "clearance_level": 0,
        "unlocked": True,
        "active_hazard": None,
        "pos_x": 0.0,
        "pos_y": 0.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_HUB_01",
                "name": "Main Map Holo-Table",
                "level_number": 0,
                "terminal_id": "TERM_HUB_01",
                "dataset": "hub_overview",
                "problem_type": "info",
                "status": "ACTIVE",
                "pos_x": 0.0,
                "pos_y": 0.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_HUB_01",
                "target_sector_id": "SEC_01",
                "target_node_id": "NODE_L1_01",
                "status": "UNLOCKED",
                "clearance_required": 1,
            }
        ],
    },
    {
        "sector_id": "SEC_01",
        "name": "Data Core (Cleaning Vault)",
        "level_number": 1,
        "clearance_level": 1,
        "unlocked": True,
        "active_hazard": "Sparks & Corrupt Data Stream",
        "pos_x": 0.0,
        "pos_y": 50.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_L1_01",
                "name": "Terminal L1 - Data Cleaning",
                "level_number": 1,
                "terminal_id": "TERM_L1_PREPROCESS",
                "dataset": "house_prices",
                "problem_type": "cleaning",
                "status": "ACTIVE",
                "pos_x": 0.0,
                "pos_y": 50.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_SEC_01",
                "target_sector_id": "SEC_02",
                "target_node_id": "NODE_L2_01",
                "status": "SEALED",
                "clearance_required": 1,
            }
        ],
    },
    {
        "sector_id": "SEC_02",
        "name": "Processing Vault (Regression)",
        "level_number": 2,
        "clearance_level": 2,
        "unlocked": False,
        "active_hazard": "Overheating Server Racks",
        "pos_x": 100.0,
        "pos_y": 50.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_L2_01",
                "name": "Terminal L2 - Price Predictor",
                "level_number": 2,
                "terminal_id": "TERM_L2_REGRESSION",
                "dataset": "house_prices",
                "problem_type": "regression",
                "status": "LOCKED",
                "pos_x": 100.0,
                "pos_y": 50.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_SEC_02",
                "target_sector_id": "SEC_03",
                "target_node_id": "NODE_L3_01",
                "status": "SEALED",
                "clearance_required": 2,
            }
        ],
    },
    {
        "sector_id": "SEC_03",
        "name": "Neural Lab (Classification)",
        "level_number": 3,
        "clearance_level": 3,
        "unlocked": False,
        "active_hazard": "Cryo-Leak Vapors",
        "pos_x": 100.0,
        "pos_y": 120.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_L3_01",
                "name": "Terminal L3 - Bio Classifier",
                "level_number": 3,
                "terminal_id": "TERM_L3_CLASSIFY",
                "dataset": "heart_disease",
                "problem_type": "classification",
                "status": "LOCKED",
                "pos_x": 100.0,
                "pos_y": 120.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_SEC_03",
                "target_sector_id": "SEC_04",
                "target_node_id": "NODE_L4_01",
                "status": "SEALED",
                "clearance_required": 3,
            }
        ],
    },
    {
        "sector_id": "SEC_04",
        "name": "Cluster Node (Unsupervised)",
        "level_number": 4,
        "clearance_level": 4,
        "unlocked": False,
        "active_hazard": "Laser Spatial Sensors",
        "pos_x": 0.0,
        "pos_y": 120.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_L4_01",
                "name": "Terminal L4 - Pattern Cluster",
                "level_number": 4,
                "terminal_id": "TERM_L4_CLUSTER",
                "dataset": "mall_customers",
                "problem_type": "clustering",
                "status": "LOCKED",
                "pos_x": 0.0,
                "pos_y": 120.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_SEC_04",
                "target_sector_id": "SEC_05",
                "target_node_id": "NODE_L5_01",
                "status": "SEALED",
                "clearance_required": 4,
            }
        ],
    },
    {
        "sector_id": "SEC_05",
        "name": "Anomaly Containment Vault",
        "level_number": 5,
        "clearance_level": 5,
        "unlocked": False,
        "active_hazard": "Security Turret Sweeps",
        "pos_x": -100.0,
        "pos_y": 120.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_L5_01",
                "name": "Terminal L5 - Fraud Sentinel",
                "level_number": 5,
                "terminal_id": "TERM_L5_ANOMALY",
                "dataset": "credit_card",
                "problem_type": "anomaly",
                "status": "LOCKED",
                "pos_x": -100.0,
                "pos_y": 120.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [
            {
                "door_id": "DOOR_SEC_05",
                "target_sector_id": "SEC_06",
                "target_node_id": "NODE_BOSS_01",
                "status": "SEALED",
                "clearance_required": 5,
            }
        ],
    },
    {
        "sector_id": "SEC_06",
        "name": "Central AI Core (Boss Room)",
        "level_number": 6,
        "clearance_level": 6,
        "unlocked": False,
        "active_hazard": "Neural Overload Lock",
        "pos_x": 0.0,
        "pos_y": 200.0,
        "pos_z": 0.0,
        "terminals": [
            {
                "node_id": "NODE_BOSS_01",
                "name": "Master AI Core Terminal",
                "level_number": 6,
                "terminal_id": "TERM_BOSS_SANDBOX",
                "dataset": "boss_dataset",
                "problem_type": "code",
                "status": "LOCKED",
                "pos_x": 0.0,
                "pos_y": 200.0,
                "pos_z": 0.0,
            }
        ],
        "doors": [],
    },
]


def seed_facility_map_db(db: Session):
    """Populates the database with initial facility sectors if empty."""
    if db.query(DBSector).count() > 0:
        return

    for sec in DEFAULT_SECTORS:
        db_sec = DBSector(
            sector_id=sec["sector_id"],
            name=sec["name"],
            level_number=sec["level_number"],
            clearance_level=sec["clearance_level"],
            unlocked=sec["unlocked"],
            active_hazard=sec.get("active_hazard"),
            pos_x=sec["pos_x"],
            pos_y=sec["pos_y"],
            pos_z=sec["pos_z"],
        )
        db.add(db_sec)
        db.flush()

        for term in sec["terminals"]:
            db_term = DBTerminalNode(
                node_id=term["node_id"],
                sector_id=sec["sector_id"],
                name=term["name"],
                level_number=term["level_number"],
                terminal_id=term["terminal_id"],
                dataset=term["dataset"],
                problem_type=term["problem_type"],
                status=term["status"],
                pos_x=term["pos_x"],
                pos_y=term["pos_y"],
                pos_z=term["pos_z"],
            )
            db.add(db_term)

        for door in sec["doors"]:
            db_door = DBDoorConnection(
                door_id=door["door_id"],
                source_sector_id=sec["sector_id"],
                target_sector_id=door["target_sector_id"],
                target_node_id=door["target_node_id"],
                status=door["status"],
                clearance_required=door["clearance_required"],
            )
            db.add(db_door)

    db.commit()


def get_full_facility_map(db: Session) -> FacilityMapResponse:
    """Returns the complete facility map hierarchy from DB or fallback."""
    seed_facility_map_db(db)
    sectors = db.query(DBSector).order_by(DBSector.level_number).all()

    sector_details: List[SectorDetail] = []
    unlocked_count = 0

    for s in sectors:
        if s.unlocked:
            unlocked_count += 1

        terminals = [
            TerminalNode(
                node_id=t.node_id,
                name=t.name,
                level_number=t.level_number,
                terminal_id=t.terminal_id,
                dataset=t.dataset,
                problem_type=t.problem_type,
                status=t.status,
                position=MapPosition(x=t.pos_x, y=t.pos_y, z=t.pos_z),
            )
            for t in s.terminals
        ]

        doors = [
            DoorConnection(
                door_id=d.door_id,
                target_sector_id=d.target_sector_id,
                target_node_id=d.target_node_id,
                status=d.status,
                clearance_required=d.clearance_required,
            )
            for d in s.doors
        ]

        connected = [d.target_sector_id for d in s.doors]

        sector_details.append(
            SectorDetail(
                sector_id=s.sector_id,
                name=s.name,
                level_number=s.level_number,
                clearance_level=s.clearance_level,
                unlocked=s.unlocked,
                active_hazard=s.active_hazard,
                position=MapPosition(x=s.pos_x, y=s.pos_y, z=s.pos_z),
                terminals=terminals,
                doors=doors,
                connected_sectors=connected,
            )
        )

    return FacilityMapResponse(
        total_sectors=len(sector_details),
        unlocked_sectors_count=unlocked_count,
        current_player_sector="SEC_01",
        sectors=sector_details,
    )


def unlock_sector_door(db: Session, door_id: str) -> Optional[SectorDetail]:
    """Unlocks a door and its connected target sector."""
    door = db.query(DBDoorConnection).filter_by(door_id=door_id).first()
    if not door:
        return None

    door.status = "UNLOCKED"
    target_sector = db.query(DBSector).filter_by(sector_id=door.target_sector_id).first()
    if target_sector:
        target_sector.unlocked = True
        for t in target_sector.terminals:
            t.status = "ACTIVE"

    db.commit()
    return get_full_facility_map(db).sectors[0]


def solve_facility_path(
    db: Session, start_sector_id: str, target_sector_id: str, operative_clearance: int = 1
) -> PathfindingResponse:
    """Computes shortest navigation route across facility sectors using BFS."""
    fac = get_full_facility_map(db)
    sector_map = {s.sector_id: s for s in fac.sectors}

    if start_sector_id not in sector_map or target_sector_id not in sector_map:
        return PathfindingResponse(
            found=False, total_steps=0, path=[], estimated_seconds=0.0
        )

    # Queue contains tuples of (current_sector_id, path_so_far)
    queue = [(start_sector_id, [(start_sector_id, None)])]
    visited = set([start_sector_id])

    while queue:
        curr_id, path_nodes = queue.pop(0)

        if curr_id == target_sector_id:
            steps: List[PathfindingStep] = []
            for idx, (sec_id, door_used) in enumerate(path_nodes):
                sec = sector_map[sec_id]
                steps.append(
                    PathfindingStep(
                        step_number=idx + 1,
                        sector_id=sec.sector_id,
                        sector_name=sec.name,
                        door_id=door_used,
                        unlocked=sec.unlocked,
                        position=sec.position,
                    )
                )
            return PathfindingResponse(
                found=True,
                total_steps=len(steps),
                path=steps,
                estimated_seconds=len(steps) * 15.0,
            )

        curr_sec = sector_map[curr_id]
        for door in curr_sec.doors:
            next_id = door.target_sector_id
            if next_id not in visited:
                target_sec = sector_map.get(next_id)
                # Check clearance requirement
                if target_sec and (target_sec.clearance_level <= operative_clearance or door.status == "UNLOCKED"):
                    visited.add(next_id)
                    queue.append((next_id, path_nodes + [(next_id, door.door_id)]))

    return PathfindingResponse(
        found=False, total_steps=0, path=[], estimated_seconds=0.0
    )

