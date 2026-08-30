# BLACKVAULT — ML Escape Game (Phase 1 prototype)

A browser-based, story-driven 3D escape game where the locks on doors are
real, randomly-generated Machine Learning problems solved with a real
scikit-learn backend — **no game engine** (no Unity/Unreal/Godot). The 3D
layer is plain **Three.js** (a graphics *library*, not an engine with an
editor/physics/asset pipeline), and it can be shipped either as a website
or wrapped later in Electron/Tauri for a installable desktop app.

## What's in this build

- Home room → walk to the phone → **E** to answer → 3-line mystery-call
  cutscene → map reveal → **TRAVEL TO SITE**.
- **Mission briefing**: Reyes (team lead) and Nomad (infil) walk you through
  target, entry point, the facility's ML-driven security, and the escape
  route — a real story beat, not a loading screen.
- You enter the facility **with your team visibly walking beside you**
  (placeholder capsule figures, drop-in ready — see below). Deeper into the
  corridor, the alarm auto-triggers: a lockdown cutscene plays, your
  teammates visibly flee and vanish, and comms confirms you're on your own
  and have to beat the security systems from the inside. This delivers the
  "team separated, player trapped alone" beat from the brief before the
  puzzle-door gameplay begins.
- One long facility corridor gated by **four sequential locked doors**,
  each a different ML problem type, each harder than the last:
  1. **Badge Fraud Detector** — classification (F1)
  2. **Customer Cluster Grid** — clustering (silhouette score, unsupervised)
  3. **Facility Power Draw Predictor** — regression (R²)
  4. **Fraud Transaction Scanner** — anomaly detection (recall on hidden
     fraud labels — the model never sees the answer, matching real
     anomaly-detection practice)
  You physically cannot walk past a door until it's unlocked — the
  corridor bound is gated on the nearest still-locked door.
- **E** at a door opens a real security terminal for that door's puzzle
  type: a corrupted, randomly-generated dataset (missing values +
  duplicate rows baked in), a live preview table, and controls for
  missing-value strategy, duplicate handling, feature scaling, model
  choice, and (where relevant) cluster count / expected anomaly rate.
- "RUN PIPELINE" sends your choices to the FastAPI backend, which
  actually re-applies your cleaning steps, trains the model you picked,
  scores it on a held-out set (or the full set for clustering), and
  returns ACCESS GRANTED/DENIED against a random threshold. Every puzzle
  type is empirically calibrated: a competent pipeline reliably clears
  the bar, weak choices measurably fail — verified with real test runs,
  not just designed on paper.
- A countdown timer enforces the "solve it under pressure" requirement.
- On ACCESS GRANTED, that door unlocks (color change + slides open) and
  you can walk through; clearing the fourth door triggers a "Sector
  Clear" ending beat.
- **Real progression, persisted server-side.** Every unlocked door awards
  XP (more for higher difficulty *and* for beating the threshold by a
  wider margin — mastery is rewarded, not just a bare pass). A corner HUD
  shows current rank (Recruit → Operative → Specialist → Ghost → Phantom)
  with an XP bar and unlocked badges. Progress lives in a local SQLite
  file (`backend/blackvault.db`, created automatically) and survives a
  page refresh.
- **3D assets are drop-in ready.** The scene uses procedural placeholder
  geometry (boxes/rooms/capsule figures) by default, but if you drop
  matching `.glb` files into `frontend/assets/models/` (see the README
  there for exact filenames and conventions), the game swaps to your
  models automatically — no code changes needed.

This is the vertical slice: the full loop (call → briefing → infiltration →
betrayal-by-alarm → solo escape → real ML puzzle → progression) working end
to end across four ML problem types with persistent rewards, so the rest
of the game is now mostly *content* (more rooms, more story beats, your 3D
assets), not new plumbing.

## File structure

```
ml-escape-game/
├── README.md                        this file
├── backend/                         FastAPI + scikit-learn puzzle engine
│   ├── main.py                      entry point — creates the app, run with uvicorn
│   ├── requirements.txt
│   ├── blackvault.db                created automatically on first run (SQLite, gitignore this)
│   └── app/
│       ├── __init__.py
│       ├── config.py                shared constants (feature name pool)
│       ├── corruption.py            injects missing values / duplicate rows
│       ├── schemas.py               request/response models (pydantic)
│       ├── store.py                 in-memory puzzle state (puzzle_id -> data)
│       ├── scoring.py               re-runs the player's pipeline, trains + scores it
│       ├── progression.py           SQLite-backed XP / rank / badge system
│       ├── routes.py                the API endpoints (generate/submit/progress/health)
│       └── generators/              one module per ML puzzle type
│           ├── __init__.py          GENERATORS registry
│           ├── classification.py    Badge Fraud Detector (F1)
│           ├── regression.py        Facility Power Draw Predictor (R²)
│           ├── clustering.py        Customer Cluster Grid (silhouette)
│           └── anomaly.py           Fraud Transaction Scanner (recall)
└── frontend/                        Three.js game client (static site, no build step)
    ├── index.html                   page shell + all UI overlay markup
    ├── style.css                    security-facility visual theme
    ├── main.js                      entry point — wires modules together, render loop
    ├── assets/
    │   └── models/
    │       └── README.md            conventions for dropping in your own .glb models
    └── src/
        ├── config.js                API base URL + 3D model file paths
        ├── modelLoader.js           GLTF loading with placeholder fallback
        ├── sceneSetup.js            renderer/scene/camera/controls + geometry factories
        ├── world.js                 builds the home room, facility corridor, doors, team
        ├── player.js                WASD movement + room/door bounds
        ├── narrative.js             cutscene sequences: call, briefing, alarm, ending
        ├── puzzleTerminal.js        the ML security-terminal UI + backend calls
        ├── hud.js                   corner HUD: rank, XP bar, unlocked badges
        └── interactions.js          nearest-target prompt + E-to-interact
```

Dependency direction in `frontend/src/` is one-way (no circular imports):
`config`/`modelLoader` → `sceneSetup` → `world` → `narrative` → `player` /
`puzzleTerminal`/`hud` → `interactions` → `main.js`. Every file has a
single job, so e.g. changing the dialogue only touches `narrative.js`,
changing rank thresholds only touches `backend/app/progression.py`, and
changing a puzzle's scoring only touches `backend/app/scoring.py` or the
relevant file in `backend/app/generators/`.

## Start the game

**1. Backend** (in one terminal):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Leave this running — it's what actually trains the ML models when you
submit a pipeline in-game.

**2. Frontend** (in a second terminal — needs a static server because it
uses ES module imports, so it can't be opened as a raw `file://` URL):
```bash
cd frontend
python3 -m http.server 5500
```

**3. Play**: open `http://localhost:5500` in a browser, click **ENTER**,
then **WASD** to move, mouse to look, **E** to interact with the phone and
security doors.

## Why this architecture instead of a game engine

| Concern | Choice | Why |
|---|---|---|
| 3D rendering | Three.js (WebGL) | Full control, zero install for players (runs in browser), trivially embeddable in a desktop shell later, no engine license/editor overhead |
| ML | Python + scikit-learn via FastAPI | The puzzles need to be *real* ML — training real models on real (corrupted) data — which only makes sense server-side in Python, not reimplemented in JS |
| Desktop packaging (later, optional) | Electron or Tauri wrapping the same frontend | Turns the website into a double-clickable app without touching game logic |
| State/progression | SQLite via FastAPI (Phase 2) | Simple, file-based, no external DB server needed for a solo/college project |

## Roadmap (next phases)

1. **Phase 3 — randomized "chaos events"**: mid-puzzle server-pushed
   perturbations (metric changes, new outliers, shrinking timer) via a
   `/api/puzzle/event` poll or WebSocket.
2. **Phase 4b — deeper rewards**: cosmetic unlocks (name tags, player
   capsule skins) tied to badges, not just the numeric HUD; a small
   leaderboard once there's a real account system.
3. **Phase 5 — narrative polish**: final "unknown dataset" boss room in the
   core security area, full escape + reunion ending cinematic.
4. **Phase 6 — packaging**: wrap in Electron/Tauri for an offline desktop
   build (bundle the FastAPI backend as a local subprocess).

## Design notes

- Visual language: near-black facility tones, cold cyan HUD/security accent,
  amber for alerts/briefings, monospace terminal type for anything data- or
  system-related — keeps puzzle terminals and narrative UI visually distinct.
- The backend never sends the model the answer key or the "right" pipeline —
  it only sends the corrupted preview + stats; the player has to *reason*
  about what's wrong with the data, matching the "understand, don't just
  pick a listed answer" requirement from the brief.
