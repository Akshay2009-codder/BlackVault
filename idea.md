# BlackVault — Revised Plan (Level-Based)

## What changed from the old plan

Old plan: a single continuous corridor with a randomized "mission" system (random dataset,
random problem type, random events) — no explicit levels.

**New plan:** a proper **level structure**.

- The player starts each run in the **Lab Entrance Hub**.
- The hub has **5 security doors** visible at once.
- Each door = one ML puzzle type: **Classification, Regression, Clustering, Anomaly
  Detection, Mystery (unknown type)**.
- The player can tackle the 5 doors in any order within a level.
- Clearing all 5 doors clears the **Level** and unlocks the next one.
- Every new level reuses the same 5 door/puzzle types, but each door gets **harder**:
  bigger/messier datasets, fewer hints, stricter target metrics, shorter timers, fewer
  retries — exactly like the old "difficulty progression" idea, just organized by
  discrete levels (1, 2, 3, ...) instead of one endless corridor.
- Each door awards **1–3 stars** based on performance (see Star Rating below), not just
  pass/fail. Stars are what the player is chasing for replay value and leaderboard/portfolio
  value.
- A **Security Guard AI** (the antagonist) watches the player's progress across the level
  and reacts with **voice lines** (spoken, not just text) — taunts when the player fails,
  warnings when time is low, grudging respect when the player 3-stars a door, and escalating
  threats as the player advances toward the core.
- Coding: the actual ML work (train/evaluate) still happens exactly like before — the
  player edits/chooses a small pipeline in-terminal, it's sent to the FastAPI backend,
  which runs the real scikit-learn code and returns a real score. No fake pass/fail —
  the player is genuinely doing the ML.

## Core Loop

1. Player spawns in the **Lab Entrance Hub** for the current level.
2. Hub shows 5 doors, each labeled by puzzle type and locked.
3. Player walks to a door → security terminal opens → real dataset + puzzle loads,
   difficulty-scaled to the current level.
4. Player cleans data / picks algorithm / sets params / trains → backend scores it.
5. Door awards 1–3 stars based on score margin, time used, and attempts taken, then unlocks.
6. Security Guard AI comments via voice + subtitle throughout (idle chatter, taunts,
   praise, warnings).
7. Once all 5 doors on the level are cleared, the exit vault door in the hub unlocks →
   player advances to Level N+1 (harder version of the same 5 puzzle types), or — if
   this was the final configured level — the **Core Security Vault** boss room opens
   (Mystery-type finale, as in the old plan).
8. Total stars earned + level reached are the player's score for
   exhibition/leaderboard purposes.

## Star Rating (per door)

Stars are computed server-side from three signals, weighted:

- **Metric margin**: how far above/below the required threshold the player's score is
  (e.g. accuracy 0.95 against a 0.80 target scores higher than 0.81 against 0.80).
- **Attempts used**: fewer submit attempts = more stars.
- **Time remaining**: more time left when the door unlocks = more stars.

Rough bands (tunable per puzzle type during Phase 4):
- ★☆☆ — passed the threshold, used most attempts/time.
- ★★☆ — passed comfortably, moderate attempts/time.
- ★★★ — passed with a strong margin, few attempts, plenty of time left.

## Security Guard AI + Voice

- A single recurring character (name TBD, e.g. "WARDEN") who is the facility's security
  AI — separate from the escaped teammates in the story.
- Drives narrative tension: reacts to the player's live performance, not scripted only
  by level number.
- **Voice** is implemented with the browser's built-in `speechSynthesis` API (free, no
  external API key, no generative AI/TTS service needed) reading short pre-written line
  banks — keeps this fully within the "no Generative AI" constraint while still feeling
  alive. Lines are picked from pools keyed to events (door opened, door failed, 3-star
  clear, low time, level cleared, boss room entered), so dialogue doesn't repeat
  mechanically.
- Subtitle text always shown alongside voice for accessibility and for
  screenshots/demo videos.

## Phases

### Phase 1 — Restructure & Foundations (this delivery)
- New file/folder structure (below).
- `idea.md` (this document).
- Backend skeleton: `levels.py` (level → per-door difficulty config), `stars.py`
  (star-scoring formula), `guard.py` (guard state + line-pool selection logic),
  updated `schemas.py`/`routes.py` stubs wired for level + door instead of free mission.
- Frontend skeleton: `levelManager.js` (hub state, 5 doors, level progression),
  `guardVoice.js` (speechSynthesis wrapper + line pools), placeholders for hud/world
  updates.
- No visuals/assets yet — structure and interfaces only, so Phase 2 can fill them in
  fast without re-architecting.

### Phase 2 — Lab Entrance Hub (Level 1 playable)
- Build the hub scene: 5 doors placed around a central room, each clearly labeled.
- Wire all 4 known puzzle generators (classification/regression/clustering/anomaly)
  as Level 1 (easy) doors; Mystery door reserved for the boss room, not a normal door.
- Door → terminal → submit → score → star award → door unlock, fully working end to
  end for Level 1.
- Basic HUD: level number, stars collected this level, doors remaining.

### Phase 3 — Level Progression
- Difficulty scaling table across levels (dataset size/noise, target metric, time
  limit, hint availability, retry count) driven by `levels.py`.
- Level-complete → advance-to-next-level flow; hub resets with harder versions of the
  same 5 doors.
- Persist per-level, per-door best star result (SQLite) so replaying a level to
  improve stars is meaningful.

### Phase 4 — Star Rating Tuning
- Empirically calibrate the star bands per puzzle type and level so 1/2/3-star
  outcomes actually feel fair and achievable (not always 3-star or never 3-star).
- Add star display on doors in the hub (so the player sees their best result per door
  at a glance) and a level-summary star total.

### Phase 5 — Security Guard + Voice
- Implement guard reaction hooks at every meaningful event (door open, fail, pass,
  3-star, level clear).
- Line-pool content pass (enough variety that repeat playthroughs don't feel robotic).
- speechSynthesis integration + subtitle UI + a mute/voice-off toggle (accessibility +
  demo-friendliness).

### Phase 6 — Boss Room, Polish & Packaging
- Reuse/port the old Mystery/Core Security Vault boss room as the finale after the
  last configured level.
- Reuse/port chaos events (Phase-3-of-old-plan random perturbations) as an optional
  higher-level twist, now scoped per-door instead of per-mission.
- Reuse/port XP/badge system alongside stars (stars = per-door skill signal, XP/badges
  = overall progress signal).
- Lighting/visual polish, README, packaging notes (Electron/Tauri) for a distributable
  desktop build.

## Carried over from the old plan (unchanged)

- No game engine: Three.js in the browser for 3D, FastAPI + scikit-learn/pandas/NumPy/
  XGBoost backend, SQLite for persistence.
- Solo project, tight deadline — implementation favors speed and working end-to-end
  slices over polish at each phase.
- Real ML pipelines only — every puzzle is genuinely trained/evaluated server-side,
  never faked.
- Free 3D assets (Unity Asset Store equivalents aren't used since there's no Unity;
  for Three.js: Poly Pizza, Kenney, Sketchfab free-licensed .glb models) — drop-in
  model loading already supports swapping placeholders for real .glb files with no
  code changes.
- Individual files are the default delivery format; this first delivery is a zip only
  because it was explicitly requested.
