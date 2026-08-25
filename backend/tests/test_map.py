"""
test_map.py — Automated Unit Tests for BlackVault Facility Map API
===================================================================
Tests facility map layout retrieval, sector detail queries, pathfinding,
and door unlocking mechanics using FastAPI TestClient.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_get_facility_map():
    response = client.get("/map/facility")
    assert response.status_code == 200
    data = response.json()
    assert data["facility_id"] == "BLACKVAULT_ALPHA"
    assert data["total_sectors"] >= 7
    assert "sectors" in data
    assert len(data["sectors"]) >= 7


def test_get_sector_detail_valid():
    response = client.get("/map/sector/SEC_01")
    assert response.status_code == 200
    data = response.json()
    assert data["sector_id"] == "SEC_01"
    assert "Data Core" in data["name"]
    assert len(data["terminals"]) >= 1


def test_get_sector_detail_invalid():
    response = client.get("/map/sector/SEC_INVALID")
    assert response.status_code == 404


def test_pathfinding_route():
    payload = {
        "start_sector_id": "SEC_00",
        "target_sector_id": "SEC_02",
        "operative_clearance": 2,
    }
    response = client.post("/map/pathfinding", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["total_steps"] >= 2
    assert len(data["path"]) >= 2


def test_unlock_door_endpoint():
    response = client.post("/map/unlock?door_id=DOOR_SEC_01")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UNLOCKED"
    assert data["door_id"] == "DOOR_SEC_01"

    # Verify sector 2 is now unlocked
    sec2 = client.get("/map/sector/SEC_02").json()
    assert sec2["unlocked"] is True
