# BlackVault: A Gamified Machine Learning Escape Simulator

> A story-driven 3D educational game that teaches real Machine Learning concepts through gameplay.

---

## Project Structure

```
BlackVault/
├── backend/                    ← FastAPI Python backend (the ML brain)
│   ├── main.py                 ← All API endpoints (/ping /preprocess /train /mission/generate)
│   ├── generate_datasets.py    ← Creates synthetic CSV datasets in ./data/ (+ gen_boss_dataset())
│   ├── requirements.txt        ← Python dependencies
│   ├── models/                 ← (stub) reserved for splitting Pydantic models out of main.py later
│   ├── services/                ← (stub) reserved for splitting training/preprocessing logic later
│   ├── db/                      ← SQLite persistence (mission history, player progress) — written,
│   │                              not yet imported by main.py; see wiring notes in db/models.py
│   ├── tests/                   ← pytest suite for /preprocess, /train, /mission/generate
│   └── data/                    ← Auto-generated CSVs (run generate_datasets.py) — gitignored
│
├── frontend/                    ← Unity project (3D game)
│   └── Assets/
│       ├── Scripts/
│       │   ├── Phase0/ApiTester.cs             ← connectivity smoke test
│       │   ├── Player/PlayerController.cs      ← movement + first/third-person toggle
│       │   ├── Interaction/TerminalInteractable.cs, DoorController.cs
│       │   └── UI/MLPuzzleUI.cs, BossPuzzleUI.cs
│       ├── Editor/LevelBuilder.cs               ← auto-builds Level 1-5 scene hierarchies
│       ├── Scenes/                              ← 00_ApiTest .. 06_BossRoom (empty, not yet built)
│       └── Prefabs/
│
└── docs/
    ├── BlackVault_PRD.md
    └── instruction.md
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game Engine | Unity (C#) |
| Backend | Python 3.11+ · FastAPI · Uvicorn |
| ML | scikit-learn · pandas · numpy · XGBoost |
| Database | SQLite (future: player progress & leaderboard) |

---

## Quick Start

### 1 — Set up the Python backend

```powershell
cd backend

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Generate sample datasets
python generate_datasets.py

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be live at **http://localhost:8000**

Interactive docs: **http://localhost:8000/docs**

---

### 2 — Phase 0: Verify the connection from Unity

1. Open the `frontend` folder as a Unity project.
2. Create an empty scene.
3. Create an empty GameObject (e.g. `ApiTester`).
4. Attach `Assets/Scripts/Phase0/ApiTester.cs` to it.
5. Press **Play**.
6. Open the **Console** window and look for `[BlackVault][PASS]` messages.

```
[BlackVault][INFO] BlackVault Phase 0 – API Connectivity Test
[BlackVault][INFO] Target: http://localhost:8000
[BlackVault][PASS] GET /ping — server is online.
[BlackVault][PASS] GET /mission/generate — received valid mission JSON.
[BlackVault][PASS] POST /preprocess — dataset cleaned successfully.
[BlackVault][PASS] POST /train — ML pipeline round-trip complete.
```

---

## API Reference

### `GET /ping`
Health check. Returns a game-flavored greeting.

```json
{
  "status": "online",
  "message": "BlackVault security system is active. Infiltration detected.",
  "version": "0.1.0"
}
```

### `GET /mission/generate?level=2&difficulty=easy`
Returns a random mission config for a security terminal.

### `POST /preprocess`
Apply preprocessing choices to a dataset. Returns stats for the terminal UI.

```json
{
  "dataset": "house_prices",
  "missing_strategy": "fill_median",
  "remove_duplicates": true,
  "outlier_strategy": "clip_iqr",
  "encoding": "label",
  "scaling": "standard"
}
```

### `POST /train`
Train an ML model. Returns `passed` (bool) and `door_status` (UNLOCKED/LOCKED).

```json
{
  "dataset": "heart_disease",
  "problem_type": "classification",
  "algorithm": "random_forest",
  "target_col": "target",
  "target_metric": "accuracy",
  "target_metric_value": 0.75
}
```

### `POST /train/code`
Full-freedom code editor mode. Runs player Python code in a sandboxed process.

```json
{
  "mission_id": "LVL_3",
  "level_id": "classification",
  "code": "model = RandomForestClassifier().fit(X_train, y_train)"
}
```

---

## Levels Overview

| Level | Concept | Dataset | Algorithm Pool |
|-------|---------|---------|----------------|
| 1 | Data Cleaning | House Prices | — (preprocessing only) |
| 2 | Regression | House Prices | Linear, Decision Tree, Random Forest |
| 3 | Classification | Heart Disease | Logistic, Decision Tree, RF, SVM |
| 4 | Clustering | Mall Customers | K-Means, DBSCAN |
| 5 | Anomaly Detection | Credit Card | Isolation Forest, One-Class SVM |
| Final | Full Pipeline | Unknown | All |

---

## Running Tests

```bash
cd backend
python generate_datasets.py   # tests need the CSVs to exist first
pytest
```

---

## 🗺️ Tactical Facility Map System

BlackVault features a unified, multi-sector facility map connecting all game levels through interactive airlocks, holographic map terminals, and real-time navigation paths.

### Map API Endpoints
- `GET /map/facility`: Returns whole facility hierarchy, sector unlock statuses, door links, and player location.
- `GET /map/sector/{sector_id}`: Returns detailed sector metadata, hazards, and terminal nodes.
- `POST /map/pathfinding`: Solves shortest navigation route across facility sectors given operative security clearance.
- `POST /map/unlock`: Unlocks a security door and propagates clearance to adjacent sectors.

### Interactive Web & Unity Interfaces
- **Web CRT Interactive Map**: Open `frontend/facility_map.html` for real-time SVG vector grid map, radar sweep animations, sector filtering, and fast-travel controls.
- **Unity 3D Engine Systems**:
  - `MapManager`: Central singleton managing sector transitions and backend map synchronization.
  - `MinimapRadar`: HUD radar component tracking player position.
  - `MapUIOverlay`: Full-screen holographic facility map overlay.
  - `WaypointPathRenderer`: In-game floor laser guide rendering glowing path to objective target.
  - `FacilityMapBuilder`: Automated Unity Editor tool (`BlackVault > Build Whole Facility Master Map Scene`) generating full 3D sector layouts.

---

*Built as a final-year college project. Designed for expansion into a commercial educational platform.*

