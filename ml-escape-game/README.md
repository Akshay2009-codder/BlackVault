# BLACKVAULT — ML Escape Game (Phase 1 prototype)

A browser-based, story-driven 3D escape game where the locks on doors are
real, randomly-generated Machine Learning problems solved with a real
scikit-learn backend — **no game engine** (no Unity/Unreal/Godot). The 3D
layer is plain **Three.js** (a graphics *library*, not an engine with an
editor/physics/asset pipeline), and it can be shipped either as a website
or wrapped later in Electron/Tauri for a installable desktop app.

## What's in this build

- Home room → walk to the phone → **E** to answer → 3-line mystery-call
  cutscene → map reveal → travel to the facility.
- One long facility corridor gated by **three sequential locked doors**,
  each a different ML problem type, each harder than the last:
  1. **Badge Fraud Detector** — classification (F1)
  2. **Customer Cluster Grid** — clustering (silhouette score, unsupervised)
  3. **Fraud Transaction Scanner** — anomaly detection (recall on hidden
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
  you can walk through; clearing the third door triggers a "Sector
  Clear" ending beat.
- **3D assets are drop-in ready.** The scene uses procedural placeholder
  geometry (boxes/rooms) by default, but if you drop matching `.glb`
  files into `frontend/assets/models/` (see the README there for exact
  filenames and conventions), the game swaps to your models automatically
  — no code changes needed.

This is the vertical slice: the full loop (explore → interact → real ML
puzzle → consequence) working end to end across four different ML problem
types, so the rest of the game is now mostly *content* (more rooms,
cutscenes, your 3D assets), not new plumbing.

## Run it

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (any static file server — it uses ES module imports so it
can't be opened as a raw `file://` URL):
```bash
cd frontend
python3 -m http.server 5500
```
Then open `http://localhost:5500`. Click **ENTER**, then **WASD** to move,
mouse to look, **E** to interact.

## Why this architecture instead of a game engine

| Concern | Choice | Why |
|---|---|---|
| 3D rendering | Three.js (WebGL) | Full control, zero install for players (runs in browser), trivially embeddable in a desktop shell later, no engine license/editor overhead |
| ML | Python + scikit-learn via FastAPI | The puzzles need to be *real* ML — training real models on real (corrupted) data — which only makes sense server-side in Python, not reimplemented in JS |
| Desktop packaging (later, optional) | Electron or Tauri wrapping the same frontend | Turns the website into a double-clickable app without touching game logic |
| State/progression | SQLite via FastAPI (Phase 2) | Simple, file-based, no external DB server needed for a solo/college project |

## Roadmap (next phases)

1. **Phase 2 — content breadth**: add the remaining room types (regression,
   clustering, anomaly detection, feature selection, model selection) as
   more backend generators + matching terminal UIs; wire them to more
   rooms/doors in the facility.
2. **Phase 3 — randomized "chaos events"**: mid-puzzle server-pushed
   perturbations (metric changes, new outliers, shrinking timer) via a
   `/api/puzzle/event` poll or WebSocket.
3. **Phase 4 — progression/rewards**: SQLite-backed player profile (XP,
   rank, unlocked cosmetics for the player capsule/HUD), persisted between
   sessions.
4. **Phase 5 — narrative polish**: mission-briefing cutscene with the full
   team, separation/alarm sequence, final "unknown dataset" boss room,
   ending cinematic.
5. **Phase 6 — packaging**: wrap in Electron/Tauri for an offline desktop
   build (bundle the FastAPI backend as a local subprocess).

## Design notes

- Visual language: near-black facility tones, cold cyan HUD/security accent,
  amber for alerts/briefings, monospace terminal type for anything data- or
  system-related — keeps puzzle terminals and narrative UI visually distinct.
- The backend never sends the model the answer key or the "right" pipeline —
  it only sends the corrupted preview + stats; the player has to *reason*
  about what's wrong with the data, matching the "understand, don't just
  pick a listed answer" requirement from the brief.
