# BlackVault — File Structure

```
BlackVault/
├── idea.md                          # Game concept & phases
├── filestructure.md                 # This file
├── .gitignore                       # Git ignore rules
├── README.md                        # Project overview & setup
│
├── frontend/
│   ├── index.html                   # Entry point — canvas + UI overlay
│   ├── style.css                    # Global styles (menus, HUD, terminal)
│   ├── main.js                      # App bootstrap — inits Three.js & UI
│   ├── package.json                 # Dependencies (three, howler)
│   │
│   ├── assets/
│   │   ├── audio/                   # Guard voice, SFX, ambient loops
│   │   ├── textures/                # Lab walls, floors, door surfaces
│   │   └── models/                  # 3D models (doors, lab props, guard)
│   │
│   └── src/
│       ├── scenes/
│       │   ├── LabScene.js          # Main lab hub — 5 doors in a room
│       │   └── ChallengeScene.js    # Puzzle room entered through a door
│       │
│       ├── player/
│       │   ├── Controller.js        # WASD movement + AABB collision
│       │   └── Camera.js            # Pointer-lock first-person camera
│       │
│       ├── entities/
│       │   ├── Door.js              # Clickable door (color, type, state)
│       │   └── SecurityGuard.js     # Patrol waypoints + voice trigger
│       │
│       ├── ui/
│       │   ├── HUD.js              # Level number, stars, timer overlay
│       │   ├── Terminal.js          # ML challenge data table + actions
│       │   ├── LevelSelect.js      # Grid of levels with star counts
│       │   ├── StarRating.js       # Animated 1-3 star display
│       │   └── MainMenu.js         # Title screen + start button
│       │
│       ├── audio/
│       │   └── AudioManager.js     # Play/stop/loop via Howler.js
│       │
│       └── api/
│           └── client.js           # fetch() wrappers for backend
│
└── backend/
    ├── main.py                      # FastAPI app + CORS + mount routers
    ├── requirements.txt             # fastapi, uvicorn, scikit-learn, etc.
    │
    └── app/
        ├── __init__.py
        ├── database.py              # SQLite connection + table creation
        │
        ├── routers/
        │   ├── __init__.py
        │   ├── levels.py            # GET /levels, GET /levels/{id}
        │   ├── challenges.py        # POST /challenge/start, /submit
        │   └── progress.py          # GET /progress, POST /progress/stars
        │
        ├── ml/
        │   ├── __init__.py
        │   ├── problems/
        │   │   ├── __init__.py
        │   │   ├── cleaning.py      # Door 1 logic
        │   │   ├── regression.py    # Door 2 logic
        │   │   ├── classification.py # Door 3 logic
        │   │   ├── clustering.py    # Door 4 logic
        │   │   └── anomaly.py       # Door 5 logic
        │   │
        │   ├── datasets.py          # Generate datasets per level+door
        │   ├── corruption.py        # Inject noise, missing vals, outliers
        │   └── scoring.py           # Compute metrics → map to 1-3 stars
        │
        └── models/
            ├── __init__.py
            ├── schemas.py           # Pydantic request/response models
            └── db_models.py         # SQLite table definitions
```
