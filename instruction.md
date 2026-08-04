BlackVault/
│
├── backend/
│   ├── main.py                      # FastAPI app — all endpoints (/ping, /mission/generate, /preprocess, /train)
│   ├── generate_datasets.py         # offline synthetic dataset generator
│   ├── requirements.txt
│   ├── .env                         # (optional) config like PORT, DEBUG — don't commit this
│   │
│   ├── data/                        # generated CSVs live here (gitignored)
│   │   ├── house_prices.csv
│   │   ├── heart_disease.csv
│   │   ├── mall_customers.csv
│   │   └── credit_card.csv
│   │
│   ├── models/                      # (Phase 2+) Pydantic request/response models, split out of main.py once it grows
│   │   ├── __init__.py
│   │   ├── preprocess_models.py
│   │   ├── train_models.py
│   │   └── mission_models.py
│   │
│   ├── services/                    # (Phase 2+) actual logic, split out of main.py for readability
│   │   ├── __init__.py
│   │   ├── preprocessing.py         # _apply_preprocessing() and friends
│   │   ├── training.py              # regression/classification/clustering/anomaly training logic
│   │   └── corruption_engine.py     # (Phase 4) runtime null/outlier/label-noise injection
│   │
│   ├── db/                          # (Phase 2+) SQLite + SQLAlchemy setup
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── models.py                # mission history, scores
│   │
│   ├── tests/                       # (Phase 7) pytest suite
│   │   ├── test_preprocess.py
│   │   └── test_train.py
│   │
│   └── blackvault.db                # SQLite file (gitignored)
│
├── BlackVault-Unity/                # the actual Unity project (opened via Unity Hub)
│   ├── Assets/
│   │   ├── Scripts/
│   │   │   ├── Phase0/
│   │   │   │   └── ApiTester.cs             # keep as a standalone connectivity test scene
│   │   │   │
│   │   │   ├── Player/
│   │   │   │   └── PlayerController.cs
│   │   │   │
│   │   │   ├── Interaction/
│   │   │   │   ├── TerminalInteractable.cs
│   │   │   │   └── DoorController.cs
│   │   │   │
│   │   │   ├── UI/
│   │   │   │   └── MLPuzzleUI.cs
│   │   │   │
│   │   │   ├── Managers/            # (as you grow) GameManager, MissionManager, SaveManager
│   │   │   └── Networking/          # (optional) shared ApiClient.cs if you dedupe request logic later
│   │   │
│   │   ├── Scenes/
│   │   │   ├── 00_ApiTest.unity     # Phase 0 test scene
│   │   │   ├── 01_Level1_DataCleaning.unity
│   │   │   ├── 02_Level2_Regression.unity
│   │   │   ├── 03_Level3_Classification.unity
│   │   │   ├── 04_Level4_Clustering.unity
│   │   │   ├── 05_Level5_Anomaly.unity
│   │   │   └── 06_BossRoom.unity
│   │   │
│   │   ├── Prefabs/
│   │   │   ├── Player.prefab
│   │   │   ├── Terminal.prefab
│   │   │   ├── Door.prefab
│   │   │   └── MLPuzzleCanvas.prefab
│   │   │
│   │   ├── Materials/
│   │   ├── Models/                  # imported Mixamo/Kenney/Sketchfab assets
│   │   ├── Audio/
│   │   └── UI/                      # fonts, icons, UI sprites
│   │
│   ├── Packages/                    # Unity-managed, don't touch manually
│   └── ProjectSettings/             # Unity-managed
│
├── docs/
│   └── BlackVault_PRD.md            # the PRD we wrote earlier
│
├── .gitignore
└── README.md