# BlackVault — ML Escape Lab

## 1. Concept Summary

A browser-based 3D game where the player navigates a **high-tech lab facility** and solves
**real Machine Learning challenges** behind 5 doors. The game is **level-based** — starting
from Level 1, each level makes the challenges progressively harder. Players earn **1–3 stars**
based on their performance (accuracy, speed, efficiency).

The lab has a **security guard** that patrols the corridors, adding time pressure. Voice lines
and ambient audio create an immersive atmosphere.

## 2. Core Mechanics

### The Lab
- A 3D first-person environment (Three.js + WebGL)
- Lab entrance is the hub — 5 doors branch off from it
- Each door leads to a different ML challenge type
- Futuristic/cyberpunk lab aesthetic with neon lighting

### The 5 Doors

| Door | Color  | ML Challenge         | Description                                    |
|------|--------|----------------------|------------------------------------------------|
| 1    | Green  | Data Cleaning        | Fix dirty data: missing values, duplicates, bad types |
| 2    | Blue   | Regression           | Predict numerical values (house prices, etc.)  |
| 3    | Purple | Classification       | Categorize data (spam/not spam, medical, etc.) |
| 4    | Orange | Clustering           | Group unlabeled data into meaningful clusters   |
| 5    | Red    | Anomaly Detection    | Find fraudulent/unusual entries in datasets    |

### Level System
- Game starts at **Level 1**
- All 5 doors must be completed to unlock the next level
- Each level increases difficulty:
  - More data corruption
  - Stricter accuracy thresholds
  - Less time allowed
  - More complex datasets
  - Additional noise/outliers

### Star Rating (per door, per level)
- ⭐ (1 star): Passed the challenge — met minimum threshold
- ⭐⭐ (2 stars): Good performance — above-average accuracy/speed
- ⭐⭐⭐ (3 stars): Excellent performance — near-perfect accuracy in fast time

### Security Guard
- AI-controlled guard patrols the lab
- If the guard catches you outside a door, you lose time
- Guard voice lines warn you ("Hey! What are you doing here?")
- Guard becomes more aggressive at higher levels

### Voice & Audio
- Guard voice lines (warnings, suspicion, alert)
- Lab ambient sounds (hums, beeps, distant machinery)
- Door unlock/lock SFX
- Terminal boot-up and interaction sounds
- Success/failure jingles for challenge completion

## 3. Tech Stack

| Layer                    | Choice                          | Why                                           |
|--------------------------|---------------------------------|-----------------------------------------------|
| 3D rendering             | Three.js (WebGL)                | Full control, runs in browser                 |
| Player controller        | Custom AABB collision           | Lightweight, no physics engine needed         |
| UI (HUD, menus, terminal)| HTML/CSS/JS overlays on canvas  | Clean separation of 3D and 2D                 |
| ML backend               | Python + FastAPI                | Real ML evaluation, not fake quizzes          |
| ML logic                 | scikit-learn, pandas, numpy     | Industry-standard ML libraries                |
| State/session            | FastAPI + SQLite                | Tracks levels, stars, progress                |
| Audio                    | Howler.js                       | Layered SFX/music                             |

## 4. Game Flow

```
Main Menu
    ↓
Level Select (shows levels & stars earned)
    ↓
Lab Entrance (3D hub with 5 doors)
    ↓
Click a door → Terminal opens (ML Challenge UI)
    ↓
Solve challenge → Earn stars (1-3)
    ↓
Door unlocks → Return to lab
    ↓
Complete all 5 doors → Level complete!
    ↓
Next level unlocked (harder challenges)
```

## 5. Phases

### Phase 1 — Foundation & Lab Hub
- File structure scaffold
- Three.js lab scene with 5 colored doors
- First-person controller + pointer-lock camera
- Main menu + level select UI
- FastAPI backend with health, level, and progress endpoints
- SQLite database schema
- Star rating backend logic

### Phase 2 — First Door (Data Cleaning)
- Terminal UI opens on door click
- Backend generates dirty datasets
- Player picks cleaning actions
- Server scores and awards stars
- Door visually unlocks on success

### Phase 3 — Remaining 4 Doors
- Regression, Classification, Clustering, Anomaly Detection
- Each with unique datasets and interaction patterns
- All 5 must be done to unlock next level

### Phase 4 — Levels & Difficulty Scaling
- Level progression system
- Difficulty scales per level
- Level select shows star progress
- Replay completed levels for better stars

### Phase 5 — Security Guard & Audio
- Guard patrol AI in the lab
- Voice lines and warning system
- Ambient audio, SFX, terminal sounds
- Guard time-pressure mechanic

### Phase 6 — Polish & Full Game Loop
- Star summary screen per level
- Persistent progress
- Visual polish (lighting, particles, animations)
- Performance optimization
