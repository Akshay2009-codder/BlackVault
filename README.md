# BlackVault (Level-Based Plan)

See `idea.md` for the full concept and phase breakdown.

## Layout

- `idea.md` — concept + phase plan (start here)
- `backend/` — FastAPI + scikit-learn backend
  - `main.py` — entrypoint (`uvicorn main:app --reload --port 8000`)
  - `app/levels.py` — per-level difficulty config for the 5 doors
  - `app/stars.py` — 1-3 star scoring formula
  - `app/guard.py` — Security Guard AI line pools
  - `app/routes.py` — API routes (door open/submit, guard line, level progress)
  - `app/generators/` — one dataset generator per puzzle type (stubs, Phase 2)
- `frontend/` — Three.js (no game engine) browser frontend
  - `main.js` — entrypoint
  - `src/levelManager.js` — hub state (level, doors cleared, stars)
  - `src/guardVoice.js` — speechSynthesis-based guard voice lines
  - `src/sceneSetup.js`, `world.js`, `player.js`, `interactions.js`,
    `puzzleTerminal.js`, `hud.js`, `narrative.js`, `modelLoader.js` — stubs,
    ported from the old plan and adapted to the hub-of-5-doors layout in
    later phases
  - `assets/models/` — drop-in .glb models go here

## Status

Phase 1 only: structure, idea.md, and interface-level skeleton files.
Nothing is playable yet -- Phase 2 makes Level 1 fully playable end to end.
