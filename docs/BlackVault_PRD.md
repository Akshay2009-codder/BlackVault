# Code Editor Execution Contract

The player writes raw Python instead of clicking preprocessing toggles.
`POST /train/code` (backend/services/code_executor.py) runs it against
the raw dataset and reads specific result variables out of the code's
local scope afterward — this is the contract for what those must be.

## Available in the code's namespace

- `df` — a pandas DataFrame, the RAW dataset (not preprocessed —
  cleaning is part of the player's job now).
- `target_col` — string column name to predict (None for clustering/anomaly).
- `feature_cols` — list of column names, or `None` (use all columns except target).
- `pd`, `np`.
- `train_test_split`, and: `LinearRegression`, `LogisticRegression`,
  `DecisionTreeRegressor`, `DecisionTreeClassifier`, `RandomForestRegressor`,
  `RandomForestClassifier`, `SVC`, `KMeans`, `DBSCAN`, `IsolationForest`,
  `OneClassSVM`, `StandardScaler`, `MinMaxScaler`, `LabelEncoder`.
- `print()` works — not currently returned to Unity in the response, only
  used server-side for now.

**Not available:** file I/O, `import`, `os`, `sys`, network access, `eval`/`exec`.
Runs on a daemon worker thread with a 10-second timeout — see the safety
model explained in `code_executor.py`'s module docstring (single-player,
own-machine threat model, not a hardened multi-tenant sandbox).

## What your code must define, by problem type

### Regression / Classification
```python
y_test   # the true test-set values/labels
y_pred   # your model's predictions on that same split
```

### Clustering
```python
labels   # one cluster id per row
```

### Anomaly Detection
```python
anomaly_flags   # 0/1 (or True/False) per row
```

## Example (regression)

```python
clean_df = df.dropna()
X = clean_df[feature_cols] if feature_cols else clean_df.drop(columns=[target_col])
y = clean_df[target_col]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)

model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
y_pred = model.predict(X_test)
```
