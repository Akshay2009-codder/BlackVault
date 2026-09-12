"""
Scoring engine -- executes chosen data cleaning, preprocessing, and ML models
against active puzzle datasets using scikit-learn.
"""

from typing import Dict, Any
import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import f1_score, r2_score, recall_score, silhouette_score
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import StandardScaler

from .stars import StarInput, compute_stars
from . import code_runner


def evaluate_submission(puzzle: dict, pipeline_choice: dict, time_remaining: int) -> Dict[str, Any]:
    """Execute pipeline_choice against puzzle dataframe and compute metric + stars."""
    df = puzzle["dataframe"].copy(deep=True)
    feature_cols = list(puzzle["feature_cols"])
    target_col = puzzle.get("target_col")

    # 1. Deduplication
    if pipeline_choice.get("drop_duplicates"):
        df = df.drop_duplicates()

    # 2. Missing value handling
    fill_missing = pipeline_choice.get("fill_missing")
    if fill_missing == "drop_rows":
        df = df.dropna(subset=feature_cols)
    elif fill_missing in ("mean", "median"):
        strategy = "mean" if fill_missing == "mean" else "median"
        num_cols = [c for c in feature_cols if pd.api.types.is_numeric_dtype(df[c])]
        if num_cols:
            imputer = SimpleImputer(strategy=strategy)
            df[num_cols] = imputer.fit_transform(df[num_cols])

    # Check for remaining missing values
    if df[feature_cols].isna().any().any():
        return {
            "passed": False,
            "score": 0.0,
            "target": puzzle["threshold"],
            "higher_is_better": puzzle.get("higher_is_better", True),
            "stars": None,
            "reason": "Dataset still contains missing values. Select a valid imputation strategy or drop rows.",
        }

    if len(df) < 10:
        return {
            "passed": False,
            "score": 0.0,
            "target": puzzle["threshold"],
            "higher_is_better": puzzle.get("higher_is_better", True),
            "stars": None,
            "reason": "Too few rows remaining after filtering. Adjust cleaning choices.",
        }

    # 3. Categorical encoding
    if pipeline_choice.get("encode_categorical"):
        cat_cols = [c for c in feature_cols if not pd.api.types.is_numeric_dtype(df[c])]
        if cat_cols:
            df = pd.get_dummies(df, columns=cat_cols, drop_first=True)
            feature_cols = [c for c in df.columns if c != target_col]

    # 4. Feature scaling
    scale_features = bool(pipeline_choice.get("scale_features", False))
    algo = pipeline_choice.get("algorithm", "").lower()
    params = pipeline_choice.get("params", {}) or {}

    ptype = puzzle.get("real_type") or puzzle.get("type", "classification")
    threshold = float(puzzle["threshold"])
    higher_is_better = puzzle.get("higher_is_better", True)

    score = 0.0

    # ── CLUSTERING ──
    if ptype == "clustering":
        X = df[feature_cols].values
        if scale_features:
            X = StandardScaler().fit_transform(X)

        k = int(params.get("n_clusters") or 3)
        if algo == "kmeans" or not algo:
            model = KMeans(n_clusters=max(2, k), n_init=10, random_state=42)
        elif algo == "hierarchical":
            model = AgglomerativeClustering(n_clusters=max(2, k))
        elif algo == "dbscan":
            eps = float(params.get("eps") or 0.9)
            model = DBSCAN(eps=eps)
        else:
            model = KMeans(n_clusters=max(2, k), n_init=10, random_state=42)

        labels = model.fit_predict(X)
        n_labels = len(set(labels) - {-1})
        if n_labels < 2 or n_labels >= len(X):
            score = -0.5
        else:
            score = float(silhouette_score(X, labels))

    # ── SUPERVISED: CLASSIFICATION / REGRESSION / ANOMALY ──
    else:
        X = df[feature_cols].values
        y = df[target_col].values

        stratify = y if ptype in ("classification", "anomaly") and len(np.unique(y)) > 1 else None
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=stratify
        )

        if scale_features:
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X_train)
            X_test = scaler.transform(X_test)

        if ptype == "classification":
            if algo == "logistic_regression" or not algo:
                clf = LogisticRegression(max_iter=1000)
            elif algo == "random_forest":
                n_est = int(params.get("n_estimators") or 100)
                clf = RandomForestClassifier(n_estimators=n_est, random_state=42)
            elif algo == "knn":
                k = int(params.get("n_neighbors") or 5)
                clf = KNeighborsClassifier(n_neighbors=k)
            else:
                clf = LogisticRegression(max_iter=1000)

            clf.fit(X_train, y_train)
            preds = clf.predict(X_test)
            score = float(f1_score(y_test, preds, average="weighted", zero_division=0))

        elif ptype == "regression":
            if algo == "linear_regression" or not algo:
                reg = LinearRegression()
            elif algo == "random_forest":
                n_est = int(params.get("n_estimators") or 100)
                reg = RandomForestRegressor(n_estimators=n_est, random_state=42)
            elif algo == "ridge":
                alpha = float(params.get("alpha") or 1.0)
                reg = Ridge(alpha=alpha)
            else:
                reg = LinearRegression()

            reg.fit(X_train, y_train)
            preds = reg.predict(X_test)
            score = float(r2_score(y_test, preds))

        elif ptype == "anomaly":
            contamination = float(params.get("contamination") or puzzle.get("contamination", 0.05))
            contamination = min(0.4, max(0.01, contamination))

            if algo == "isolation_forest" or not algo:
                det = IsolationForest(contamination=contamination, random_state=42)
            elif algo == "one_class_svm":
                det = IsolationForest(contamination=contamination, random_state=42)
            else:
                det = IsolationForest(contamination=contamination, random_state=42)

            det.fit(X_train)
            raw_preds = det.predict(X_test)  # 1 = normal, -1 = anomaly
            preds = np.where(raw_preds == -1, 1, 0)
            score = float(recall_score(y_test, preds, zero_division=0))

    score = round(float(score), 4)
    passed = bool(score >= threshold if higher_is_better else score <= threshold)

    stars = None
    if passed:
        star_in = StarInput(
            score=score,
            target=threshold,
            higher_is_better=higher_is_better,
            attempts_used=puzzle.get("attempts_used", 1),
            max_attempts=puzzle.get("max_attempts", 5),
            time_remaining_seconds=max(0, time_remaining),
            time_limit_seconds=puzzle.get("time_limit_seconds", 300),
        )
        stars = compute_stars(star_in)

    return {
        "passed": passed,
        "score": score,
        "target": threshold,
        "higher_is_better": higher_is_better,
        "stars": stars,
    }


def _to_1d_array(result, expected_len: int):
    """Coerce a player's returned predictions into a flat Python list of the
    expected length, raising a player-facing error if it doesn't fit."""
    if result is None:
        raise code_runner.CodeRunError("Your function returned None instead of predictions.")
    if isinstance(result, (pd.Series, pd.DataFrame)):
        result = result.values
    if isinstance(result, np.ndarray):
        result = result.ravel().tolist()
    if not isinstance(result, (list, tuple)):
        raise code_runner.CodeRunError(
            f"Expected a list/array of predictions, got {type(result).__name__}."
        )
    result = list(result)
    if len(result) != expected_len:
        raise code_runner.CodeRunError(
            f"Expected {expected_len} predictions (one per row), got {len(result)}."
        )
    return result


def score_code(puzzle: dict, code: str, time_remaining: int) -> Dict[str, Any]:
    """The real gameplay path: run the player's own Python (written line by
    line in the in-game editor, not a checkbox pipeline) against the real
    dataset, then grade it with the puzzle's real metric.

    puzzle["type"] is what the door is labeled (may be "mystery"); puzzle
    real problem type is puzzle.get("real_type") or puzzle["type"] -- the
    player must diagnose this themselves for a mystery door by inspecting
    the data and defining the matching function (predict/cluster/detect).
    """
    df_full = puzzle["dataframe"].copy(deep=True)
    feature_cols = list(puzzle["feature_cols"])
    target_col = puzzle.get("target_col")
    ptype = puzzle.get("real_type") or puzzle.get("type", "classification")
    threshold = float(puzzle["threshold"])
    higher_is_better = puzzle.get("higher_is_better", True)

    def _fail(msg: str) -> Dict[str, Any]:
        return {
            "passed": False, "score": 0.0, "target": threshold,
            "higher_is_better": higher_is_better, "stars": None, "error_message": msg,
        }

    try:
        if ptype in ("classification", "regression"):
            stratify = None
            if ptype == "classification" and df_full[target_col].nunique() > 1:
                stratify = df_full[target_col]
            train_df, test_df = train_test_split(
                df_full, test_size=0.25, random_state=42, stratify=stratify
            )
            train_df = train_df.reset_index(drop=True).copy()
            test_full = test_df.reset_index(drop=True).copy()
            y_test = test_full[target_col].values
            test_input = test_full[feature_cols].copy()
            train_input = train_df[feature_cols + [target_col]].copy()

            result = code_runner.run_player_code(
                code, "predict", (train_input, test_input, target_col)
            )
            preds = _to_1d_array(result, len(test_input))

            if ptype == "classification":
                score = float(f1_score(y_test, preds, average="weighted", zero_division=0))
            else:
                score = float(r2_score(y_test, preds))

        elif ptype == "clustering":
            feature_df = df_full[feature_cols].copy()
            result = code_runner.run_player_code(code, "cluster", (feature_df,))
            labels = _to_1d_array(result, len(feature_df))
            n_labels = len(set(labels) - {-1})
            if n_labels < 2 or n_labels >= len(feature_df):
                score = -0.5
            else:
                clean_X = feature_df.apply(lambda c: c.fillna(c.mean())).values
                score = float(silhouette_score(clean_X, labels))

        elif ptype == "anomaly":
            feature_df = df_full[feature_cols].copy()
            y_true = df_full[target_col].values
            result = code_runner.run_player_code(code, "detect", (feature_df,))
            preds = _to_1d_array(result, len(feature_df))
            preds_bin = [1 if p in (1, True, "1", 1.0) else 0 for p in preds]
            score = float(recall_score(y_true, preds_bin, zero_division=0))

        else:
            return _fail(f"Unknown problem type '{ptype}'.")

    except code_runner.CodeRunError as e:
        return _fail(str(e))
    except Exception as e:  # noqa: BLE001 -- any grading failure is shown to the player, not a 500
        return _fail(f"{type(e).__name__}: {e}")

    score = round(float(score), 4)
    passed = bool(score >= threshold if higher_is_better else score <= threshold)

    stars = None
    if passed:
        star_in = StarInput(
            score=score,
            target=threshold,
            higher_is_better=higher_is_better,
            attempts_used=puzzle.get("attempts_used", 1),
            max_attempts=puzzle.get("max_attempts", 5),
            time_remaining_seconds=max(0, time_remaining),
            time_limit_seconds=puzzle.get("time_limit_seconds", 300),
        )
        stars = compute_stars(star_in)

    return {
        "passed": passed, "score": score, "target": threshold,
        "higher_is_better": higher_is_better, "stars": stars, "error_message": None,
    }


def score_code_tiered(puzzle: dict, code: str, step: int = 1, time_remaining: int = 300) -> Dict[str, Any]:
    """Score code based on tiered progression (Step 1: Cleaning, Step 2: Features, Step 3: Model)."""
    step = step or 1
    door_type = puzzle.get("door_type", "classification")

    if step == 1:
        # Step 1: Only data cleaning required
        df_raw = puzzle["dataframe"].copy(deep=True)
        # Guarantee duplicates and missing values exist in test data
        if df_raw.duplicated().sum() == 0:
            df_raw = pd.concat([df_raw, df_raw.iloc[:12]], ignore_index=True)
        feature_cols = list(puzzle.get("feature_cols", []))
        if df_raw.isna().sum().sum() == 0 and feature_cols:
            for c in feature_cols[:2]:
                idx = df_raw.sample(frac=0.15, random_state=42).index
                df_raw.loc[idx, c] = np.nan

        func_name = "clean_data" if "def clean_data" in code else ("clean" if "def clean" in code else None)
        if not func_name:
            if "def predict" in code or "def cluster" in code or "def detect" in code:
                # If they wrote a full model already, let them pass or evaluate
                pass
            else:
                return {
                    "passed": False, "score": 0.0, "target": 1.0, "step": 1, "next_step": 1,
                    "step_passed": False, "stars": None,
                    "error_message": "Function 'clean_data(df)' not found. Please define 'def clean_data(df):' to clean the dataset."
                }

        try:
            if func_name:
                cleaned = code_runner.run_player_code(code, func_name, (df_raw,))
            else:
                return score_code(puzzle, code, time_remaining)

            if not isinstance(cleaned, pd.DataFrame):
                return {
                    "passed": False, "score": 0.0, "target": 1.0, "step": 1, "next_step": 1,
                    "step_passed": False, "stars": None,
                    "error_message": f"Expected clean_data to return a pandas DataFrame, got {type(cleaned).__name__}."
                }

            missing_count = int(cleaned.isna().sum().sum())
            dup_count = int(cleaned.duplicated().sum())
            min_rows = max(10, int(len(df_raw) * 0.4))

            if len(cleaned) < min_rows:
                return {
                    "passed": False, "score": 0.0, "target": 1.0, "step": 1, "next_step": 1,
                    "step_passed": False, "stars": None,
                    "error_message": f"Too many rows removed ({len(cleaned)} remaining out of {len(df_raw)}). Use imputation (.fillna) rather than dropping all rows."
                }

            if dup_count > 0:
                return {
                    "passed": False, "score": 0.5, "target": 1.0, "step": 1, "next_step": 1,
                    "step_passed": False, "stars": None,
                    "error_message": f"Dataset still contains {dup_count} duplicate rows. Call df.drop_duplicates()."
                }

            if missing_count > 0:
                return {
                    "passed": False, "score": 0.5, "target": 1.0, "step": 1, "next_step": 1,
                    "step_passed": False, "stars": None,
                    "error_message": f"Dataset still contains {missing_count} missing values. Call df.fillna(...) to impute them."
                }

            # Step 1 Passed!
            from .problem_statements import get_step_info
            next_info = get_step_info(door_type, 2)
            return {
                "passed": True, "score": 1.0, "target": 1.0, "step": 1, "next_step": 2,
                "step_passed": True, "stars": None, "error_message": None,
                "next_starter_code": next_info["starter_code"],
                "next_instructions": next_info["instructions"],
            }
        except Exception as e:
            return {
                "passed": False, "score": 0.0, "target": 1.0, "step": 1, "next_step": 1,
                "step_passed": False, "stars": None, "error_message": f"{type(e).__name__}: {e}"
            }

    elif step == 2:
        # Step 2: Feature work & scaling
        df_raw = puzzle["dataframe"].copy(deep=True)
        clean_df = df_raw.drop_duplicates().fillna(df_raw.median(numeric_only=True))
        target_col = puzzle.get("target_col")
        feature_df = clean_df.drop(columns=[target_col]) if target_col and target_col in clean_df else clean_df

        func_name = "preprocess_features" if "def preprocess_features" in code else ("preprocess" if "def preprocess" in code else None)
        if not func_name:
            if "def predict" in code or "def cluster" in code or "def detect" in code:
                return score_code(puzzle, code, time_remaining)
            return {
                "passed": False, "score": 0.0, "target": 1.0, "step": 2, "next_step": 2,
                "step_passed": False, "stars": None,
                "error_message": "Function 'preprocess_features(df)' not found. Please define 'def preprocess_features(df):'."
            }

        try:
            res = code_runner.run_player_code(code, func_name, (feature_df,))
            if isinstance(res, tuple):
                res = res[0]
            if isinstance(res, pd.DataFrame):
                res = res.values
            if not isinstance(res, np.ndarray):
                return {
                    "passed": False, "score": 0.0, "target": 1.0, "step": 2, "next_step": 2,
                    "step_passed": False, "stars": None,
                    "error_message": f"Expected preprocess_features to return a NumPy array or DataFrame of features, got {type(res).__name__}."
                }

            if res.shape[0] != len(feature_df):
                return {
                    "passed": False, "score": 0.0, "target": 1.0, "step": 2, "next_step": 2,
                    "step_passed": False, "stars": None,
                    "error_message": f"Expected {len(feature_df)} rows in output, got {res.shape[0]}."
                }

            if not np.issubdtype(res.dtype, np.number):
                return {
                    "passed": False, "score": 0.5, "target": 1.0, "step": 2, "next_step": 2,
                    "step_passed": False, "stars": None,
                    "error_message": "Features contain non-numeric data. Use pd.get_dummies() to encode categorical columns."
                }

            if np.isnan(res).any():
                return {
                    "passed": False, "score": 0.5, "target": 1.0, "step": 2, "next_step": 2,
                    "step_passed": False, "stars": None,
                    "error_message": "Preprocessed features contain NaN values. Ensure all missing values are imputed."
                }

            stds = np.nanstd(res, axis=0)
            means = np.nanmean(res, axis=0)
            is_scaled = np.all(stds < 6.0) and (np.all(np.abs(means) < 4.0) or (np.min(res) >= -0.1 and np.max(res) <= 1.2))
            if not is_scaled:
                return {
                    "passed": False, "score": 0.7, "target": 1.0, "step": 2, "next_step": 2,
                    "step_passed": False, "stars": None,
                    "error_message": "Features do not appear scaled. Use StandardScaler().fit_transform(X) or MinMaxScaler()."
                }

            # Step 2 Passed!
            from .problem_statements import get_step_info
            next_info = get_step_info(door_type, 3)
            return {
                "passed": True, "score": 1.0, "target": 1.0, "step": 2, "next_step": 3,
                "step_passed": True, "stars": None, "error_message": None,
                "next_starter_code": next_info["starter_code"],
                "next_instructions": next_info["instructions"],
            }
        except Exception as e:
            return {
                "passed": False, "score": 0.0, "target": 1.0, "step": 2, "next_step": 2,
                "step_passed": False, "stars": None, "error_message": f"{type(e).__name__}: {e}"
            }

    else:
        # Step 3: Full model evaluation
        res = score_code(puzzle, code, time_remaining)
        res["step"] = 3
        res["next_step"] = None
        res["step_passed"] = res["passed"]
        return res

