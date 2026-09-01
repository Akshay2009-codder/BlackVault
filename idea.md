# ML Escape Facility — Project Plan (No Game Engine)

## 1. Concept Summary

A cinematic, single-player 3D adventure built for the **browser**, no Unity/Unreal/Godot. The
player is left behind during a botched heist inside a secure research facility and must escape
by solving real Machine Learning problems that double as the facility's security systems
(data cleaning, regression, classification, clustering, anomaly detection, model selection).
Every room presents a different dataset-driven puzzle with a measurable success bar
(e.g. "F1 ≥ 0.90"), time pressure, random data corruption events, and a reward/progression loop.

## 2. Tech Stack (No Engine)

| Layer | Choice | Why |
|---|---|---|
| 3D rendering | **Three.js** (WebGL) | Full control, no engine license/runtime, runs in-browser |
| Player controller / physics | **cannon-es** or hand-rolled AABB collision | Lightweight, no need for a full physics engine |
| App shell / UI (HUD, dialogue, terminals) | **React** over the Three.js canvas | Terminal/puzzle UI is really 2D web UI — React is the right tool, Three.js just owns the 3D layer |
| ML backend | **Python + FastAPI** | You already validated this pattern in BlackVault; reuse it |
| ML puzzle logic | **scikit-learn**, **pandas**, **numpy** | Real, evaluable ML — not fake quizzes |
| State/session | FastAPI + a lightweight DB (SQLite to start) | Tracks run seed, room state, XP, unlocks |
| Cinematics | Scripted camera paths in Three.js + timed UI overlays (no video files needed) | Keeps it lightweight and dynamic |
| Audio | Howler.js | Simple layered SFX/music without an engine |

**Why this split:** Three.js handles "walk around the facility," React handles "solve the
terminal puzzle" (which is fundamentally a data-science mini-app: tables, charts, buttons),
and FastAPI is the source of truth for datasets, scoring, randomization, and progression —
so nothing important can be faked/cheesed from the client.

## 3. High-Level Architecture

```
frontend/ (Three.js + React)
  scenes/           - Home, Meeting Point, Facility (per-room chunks)
  player/           - controller, camera, interaction raycasting
  cinematics/       - camera path player, dialogue overlay, phone-call UI
  terminals/        - React puzzle UIs (data table, model picker, metric readout)
  hud/              - timer, objective tracker, XP/rank display
  api/              - typed client for backend calls

backend/ (FastAPI)
  routers/
    session.py      - start run, get current state, save progress
    rooms.py        - fetch room definition + dataset for current seed
    challenge.py     - submit pipeline choices, run scoring, return pass/fail
    rewards.py       - XP, unlocks, rank calculation
  ml/
    datasets/        - generators/loaders per problem type (house price, fraud, medical, etc.)
    problems/         - one module per ML problem type (cleaning, regression, classification, clustering, anomaly, selection)
    corruption.py     - injects missing values, outliers, label noise, imbalance, feature drift
    scoring.py        - metric computation (F1, RMSE, silhouette, etc.) vs the room's target
  models/            - Pydantic + DB schema (Run, Room, Attempt, Player)
  db.py
```

## 4. Core Design Rules Carried Into Every Phase

- ML is never a standalone quiz screen — it's rendered as "repair this terminal / classify these
  intruders / clean this corrupted log" inside the fiction.
- Every challenge = **dataset + goal metric + time limit + attempts + hint budget**, all
  generated server-side from a seed so runs differ and can't be inspected/cheated from JS.
- Difficulty curve: more time/attempts/hints early, less later; random corruption events escalate
  in frequency and severity deeper into the facility.
- Client sends *decisions* (which cleaning step, which model, which features); server executes
  the actual pipeline and returns the real metric — keeps it honest and keeps the ML "real."

## 5. Phased Build Plan

### Phase 0 — Foundations
- Repo scaffolding (frontend + backend), CI-less local dev scripts, `.env` config.
- Three.js scene boot: empty room, first-person controller, pointer-lock camera, basic
  collision against a simple box level.
- FastAPI boot: `/health`, session creation, SQLite schema migration.
- **Deliverable:** you can walk around an empty test room and hit a live backend endpoint.

### Phase 1 — Home Intro & Phone Call
- Home scene (small, few interactive props) to establish tone.
- Incoming call UI (ringing state → accept → briefing text/audio) triggers a scripted camera
  cut and scene transition to the map reveal.
- **Deliverable:** scripted intro sequence, no gameplay systems yet, just cinematic flow + transition.

### Phase 2 — Team Briefing (Meeting Point Scene)
- Static meeting-room scene, teammates as simple rigged/placeholder models or even camera-cut
  "screen" portraits if full character rigging is out of scope initially.
- Branching-free dialogue sequence covering target/objective/plan/risks/entry/escape.
- Transition cinematic: convoy/travel montage (can be a fast camera fly-through, not full sim).
- **Deliverable:** briefing playable start to finish, ends by loading the Facility scene.

### Phase 3 — Facility Exploration Core
- Modular room-chunk system so rooms can be authored independently and streamed/loaded by ID.
- Interaction system: raycast-based "open door / pick up / use terminal" prompts.
- Teammate-follow behavior for the pre-lockdown section (simple waypoint AI, not full pathfinding).
- **Deliverable:** player can walk the pre-lockdown section of the facility, follow the team, and interact with props.

### Phase 4 — Lockdown & Separation Event
- Scripted alarm trigger (environmental + audio + lighting change), doors sealing animation.
- Radio/comm UI showing the "you're on your own" exchange.
- Locks the player out of the exit path, opens up the maze of ML-security rooms.
- **Deliverable:** the pivot moment is fully playable and gates progression into the main loop.

### Phase 5 — ML Puzzle Framework (Backend + Terminal UI Shell)
- Backend: `Room`/`Challenge` data model — problem type, dataset ref, target metric, time limit,
  attempts, hint budget, seed.
- Backend: generic scoring pipeline runner (takes client-submitted pipeline steps, executes with
  scikit-learn, returns metric + pass/fail).
- Frontend: generic **Terminal Puzzle UI** — data preview table, action toolbar (clean/transform/
  select model/train/evaluate), metric readout, ACCESS GRANTED/DENIED states, countdown timer.
- **Deliverable:** one fully working end-to-end puzzle (pick one problem type, e.g. data cleaning) proving the full loop: enter room → terminal opens → solve → door unlocks.

### Phase 6 — Individual Room Challenge Types
Build out each problem type as its own backend module + matching frontend interaction pattern,
one at a time, reusing the Phase 5 shell:
1. Data Cleaning (missing values, duplicates, bad types)
2. Regression (house-price style)
3. Classification (medical/customer dataset)
4. Clustering (customer segmentation)
5. Anomaly Detection (fraud transactions)
6. Model Selection / Evaluation (compare models, justify choice against a metric)
- **Deliverable:** all six problem types playable as standalone rooms with distinct datasets and framing.

### Phase 7 — Dynamic Randomization & Corruption Events
- Seeded dataset generation per run so no two playthroughs match exactly.
- `corruption.py`: mid-challenge random events (outliers appear, labels flip, class imbalance
  introduced, target metric changes, timer cut) fired server-side and pushed to the client.
- **Deliverable:** replaying a room feels different each time; corruption events visibly affect the live puzzle state.

### Phase 8 — Time, Attempts, Hints & Difficulty Curve
- Central difficulty config: per-room-depth defaults for time/attempts/hints, scaled by progress.
- Hint system (server-authored hints revealed at a cost of time or attempts).
- Fail/retry flow that doesn't feel punishing (soft retry vs. hard lockout, your call).
- **Deliverable:** difficulty visibly ramps from Room 1 to the Final Room.

### Phase 9 — Rewards & Progression
- XP, ranks, unlockable cosmetics/tags/emotes/titles as backend-tracked player state.
- Post-challenge reward screen; persistent profile across sessions.
- **Deliverable:** completing rooms visibly grows the player's profile and unlocks content.

### Phase 10 — Final Core Challenge & Ending
- The "unknown dataset, figure it out yourself" capstone room — deliberately less guided than
  earlier rooms (no problem-type label given upfront).
- Escape sequence + reunion cinematic + ending state.
- **Deliverable:** full game loop playable start to finish.

### Phase 11 — Polish Pass
- Lighting/mood pass on the facility, audio mixing, UI juice (transitions, terminal SFX),
  performance pass (draw calls, texture sizes) since this is unoptimized-by-default in raw Three.js.
- Bug bash across the full playthrough.

## 6. Suggested Build Order Priority

If you want a playable vertical slice fastest: **Phase 0 → 3 → 5 → one room from 6 → 4** wired
in reverse-order-of-dependency isn't ideal narratively, but the fastest path to "does this concept
actually work and feel fun" is: minimal walking + one real ML terminal puzzle end-to-end, before
investing in the full cinematic intro/briefing.

## 7. Open Questions to Resolve Before Coding Phase 6 in Full
- Character models/animations for teammates — placeholder capsules first, or invest in rigged models early?
- Hint system cost model — time penalty, attempt penalty, or free with diminishing returns?
- How much of the "understand the situation and choose an approach" is truly open-ended vs.
  guided multiple-choice-of-techniques (affects both difficulty and how hard the backend scoring is to build)?