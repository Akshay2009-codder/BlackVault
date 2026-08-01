# Nexus Protocol — ML Backend (Phase 1)

This is the ML backend for the Classification, Regression, and Clustering
missions. It's a standalone FastAPI service — no Unity required to test it.

## What's already done and verified

- Datasets generated (`app/data/`) with 4 variants each (clean, missing
  values, outliers, hard-combo) for all 3 missions
- Preprocessing pipeline (`app/ml/preprocessing.py`) — tested directly, works
- Training/evaluation (`app/ml/train.py`) — tested directly for all 3
  mission types, all passed correctly
- SQLite mission variety system (`app/db.py`) — seeded with 36 mission
  combinations, verified random selection gives different variants each call
- FastAPI app (`app/main.py`) wiring it all together

**Note:** This sandbox doesn't have internet access, so I couldn't install
`fastapi`/`uvicorn` here or run the live server — but the underlying
preprocessing + training logic (the actual ML) has been tested directly and
works correctly. Once you run this on your own machine with internet access,
the API layer just exposes that same tested logic over HTTP.

## Setup (on your machine)

```bash
cd nexus-backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Initialize the database (run once)

```bash
cd app
python db.py
```

You should see: `Seeded 36 mission combinations.`

## Run the server

```bash
uvicorn main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` — FastAPI auto-generates an interactive
API tester (Swagger UI). Use it to try everything below without writing any
client code yet.

## Try it manually

**1. Get a mission:**
```
GET http://127.0.0.1:8000/get-mission/classification
```
Call it a few times — notice the `dataset_variant`, `target_metric_value`,
and `time_limit_seconds` change. That's the mission variety system working.

**2. Submit an attempt** (use the `id` from step 1 as `mission_id`):
```json
POST http://127.0.0.1:8000/submit-mission
{
  "mission_id": 1,
  "level_id": "classification",
  "algorithm": "random_forest",
  "preprocessing": {
    "missing_strategy": "fill_median",
    "remove_duplicates": true,
    "outlier_strategy": "clip_iqr",
    "scaling": "standard"
  }
}
```

For regression, use `"algorithm": "linear_regression"` (or
`decision_tree`/`random_forest`) with `"level_id": "regression"`.

For clustering, use `"algorithm": "kmeans"`, `"level_id": "clustering"`, and
include `"k": 5` in the request body.

## Next step (Phase 3)

Once this runs correctly on your machine, Unity's `UnityWebRequest` calls
these same two endpoints — `GET /get-mission/{level}` when the player
reaches a terminal, and `POST /submit-mission` when they hit Submit in the
puzzle UI. No changes needed here for that to work.

## Swapping in the real datasets

Replace `app/data/heart_disease.csv`, `house_prices.csv`, and
`mall_customers.csv` with the real Kaggle versions (same column names as
generated here), then re-run `python app/generate_datasets.py` to regenerate
the variants from the real data, then `python app/db.py` to re-seed.
