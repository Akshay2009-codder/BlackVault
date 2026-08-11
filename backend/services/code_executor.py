"""
Code execution service — runs player-submitted Python against a dataset
and scores the result. This is what powers the "write real code" puzzle
mode (POST /train/code), as opposed to the toggle/dropdown UI in
services/training.py.

SAFETY MODEL — read this before changing anything:
This is NOT a hardened multi-tenant sandbox (that would need a real
container/subprocess-per-run with OS-level isolation, which is out of
scope for a college project running on the player's own machine). The
threat model here is "protect against accidents and infinite loops
during normal play," not "protect a server from a malicious stranger."
Since this is a single-player local game where the player runs their
own backend on their own machine, executing their own code is no
different in risk than them running a .py file directly — the sandbox
below exists to make BAD PYTHON (typos, infinite loops, accessing the
filesystem by habit) fail safely and return a normal in-game "solution
rejected" message instead of crashing the server or hanging the request
forever, not to defend against a genuinely malicious attacker.

Contract the player's code must follow (they see this in the in-game
instructions/starter template — see MLPuzzleUI.cs):
  - `df`            : the raw, uncleaned pandas DataFrame for this mission
  - `target_col`     : string column name (None for clustering/anomaly)
  - `feature_cols`    : list of column names, or None (meaning "use all
                        columns except target_col")
  - pd, np, and a fixed set of sklearn classes/functions are pre-imported

  Depending on problem_type, the code must set ONE of these variables
  before finishing:
    regression / classification  -> `y_test` and `y_pred`
    clustering                   -> `labels` (one cluster id per row)
    anomaly_detection             -> `anomaly_flags` (0/1 or bool per row)
"""

import threading
import math

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression, LinearRegression
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
from sklearn.svm import SVC, OneClassSVM
from sklearn.cluster import KMeans, DBSCAN
from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder
from sklearn.metrics import accuracy_score, f1_score, mean_squared_error, silhouette_score

EXECUTION_TIMEOUT_SECONDS = 10

# Only these names are available inside player code. No `open`, `__import__`,
# `eval`, `exec`, `os`, `sys` — accidental or copy-pasted attempts to touch
# the filesystem or import arbitrary modules fail with a NameError instead
# of doing anything, which is the safety property we actually want here.
_SAFE_BUILTINS = {
    "len": len, "range": range, "enumerate": enumerate, "zip": zip,
    "min": min, "max": max, "sum": sum, "abs": abs, "round": round,
    "sorted": sorted, "list": list, "dict": dict, "set": set, "tuple": tuple,
    "str": str, "int": int, "float": float, "bool": bool, "print": print,
    "isinstance": isinstance, "True": True, "False": False, "None": None,
    "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
    "KeyError": KeyError, "IndexError": IndexError,
}


def _build_namespace(df: pd.DataFrame, target_col, feature_cols):
    return {
        "__builtins__": _SAFE_BUILTINS,
        "df": df.copy(),
        "target_col": target_col,
        "feature_cols": feature_cols,
        "pd": pd,
        "np": np,
        "train_test_split": train_test_split,
        "LinearRegression": LinearRegression,
        "DecisionTreeRegressor": DecisionTreeRegressor,
        "RandomForestRegressor": RandomForestRegressor,
        "LogisticRegression": LogisticRegression,
        "DecisionTreeClassifier": DecisionTreeClassifier,
        "RandomForestClassifier": RandomForestClassifier,
        "SVC": SVC,
        "KMeans": KMeans,
        "DBSCAN": DBSCAN,
        "IsolationForest": IsolationForest,
        "OneClassSVM": OneClassSVM,
        "StandardScaler": StandardScaler,
        "MinMaxScaler": MinMaxScaler,
        "LabelEncoder": LabelEncoder,
    }


def _run_code(code: str, namespace: dict):
    exec(code, namespace)  # noqa: S102 — see module docstring for the threat model this accepts
    return namespace


def _execute_with_timeout(code: str, namespace: dict):
    """
    Runs the exec() call on a daemon worker thread and waits up to
    EXECUTION_TIMEOUT_SECONDS. Python cannot forcibly kill a running
    thread, so a genuinely stuck infinite loop keeps consuming CPU in
    the background even after this function returns a timeout error —
    accepted per the single-player, own-machine threat model in the
    module docstring. Using a DAEMON thread (rather than
    ThreadPoolExecutor's non-daemon workers) means these abandoned
    threads at least won't prevent the Python process itself from
    exiting cleanly; they still consume CPU while the server keeps
    running, so restart the backend if this happens repeatedly.
    """
    result_holder = {}
    error_holder = {}

    def target():
        try:
            result_holder["namespace"] = _run_code(code, namespace)
        except BaseException as e:  # noqa: BLE001 — captured and re-raised on the main thread
            error_holder["error"] = e

    thread = threading.Thread(target=target, daemon=True)
    thread.start()
    thread.join(timeout=EXECUTION_TIMEOUT_SECONDS)

    if thread.is_alive():
        # Still running past the deadline — abandon it (daemon=True means
        # it won't block process exit) and report a timeout to the caller.
        raise TimeoutError(
            f"Code took longer than {EXECUTION_TIMEOUT_SECONDS}s to run — "
            "check for an infinite loop or an unnecessarily large computation."
        )

    if "error" in error_holder:
        raise error_holder["error"]

    return result_holder["namespace"]


def _clean_number(value) -> float:
    """NaN/inf can't be JSON-serialized cleanly — collapse them to 0.0
    rather than letting FastAPI's JSON encoder choke on the response."""
    try:
        value = float(value)
    except (TypeError, ValueError):
        return 0.0
    return value if math.isfinite(value) else 0.0


def run_player_code(df: pd.DataFrame, req) -> dict:
    """
    Executes req.code against df and scores it according to req.problem_type.
    Returns the same response shape as services/training.py's train_model(),
    so main.py and the Unity client don't need separate response handling.
    """
    namespace = _build_namespace(df, req.target_col, req.feature_cols)

    try:
        namespace = _execute_with_timeout(req.code, namespace)
    except TimeoutError as e:
        return _failure_response(req, error=str(e))
    except Exception as e:  # noqa: BLE001 — deliberately broad: ANY player code error
        # (SyntaxError, NameError, KeyError, a raised ValueError, etc.)
        # should come back as a normal failed attempt, not a 500 crash.
        return _failure_response(req, error=f"{type(e).__name__}: {e}")

    try:
        if req.problem_type == "regression":
            y_test, y_pred = namespace.get("y_test"), namespace.get("y_pred")
            if y_test is None or y_pred is None:
                return _failure_response(req, error="Code must set y_test and y_pred.")
            achieved = _clean_number(np.sqrt(mean_squared_error(y_test, y_pred)))
            metric_name = "rmse"
            passed = achieved <= req.target_metric_value

        elif req.problem_type == "classification":
            y_test, y_pred = namespace.get("y_test"), namespace.get("y_pred")
            if y_test is None or y_pred is None:
                return _failure_response(req, error="Code must set y_test and y_pred.")
            metric_name = req.target_metric if req.target_metric in ("accuracy", "f1_score") else "accuracy"
            if metric_name == "f1_score":
                achieved = _clean_number(f1_score(y_test, y_pred, average="weighted"))
            else:
                achieved = _clean_number(accuracy_score(y_test, y_pred))
            passed = achieved >= req.target_metric_value

        elif req.problem_type == "clustering":
            labels = namespace.get("labels")
            if labels is None:
                return _failure_response(req, error="Code must set `labels`.")
            feat = req.feature_cols or df.select_dtypes(include=np.number).columns.tolist()
            n_clusters = len(set(labels) - {-1})
            achieved = _clean_number(
                silhouette_score(df[feat], labels) if n_clusters >= 2 else -1.0
            )
            metric_name = "silhouette_score"
            passed = achieved >= req.target_metric_value

        elif req.problem_type == "anomaly_detection":
            flags = namespace.get("anomaly_flags")
            if flags is None:
                return _failure_response(req, error="Code must set `anomaly_flags`.")
            flags = np.asarray(flags).astype(int)
            rate = _clean_number(flags.sum() / max(len(flags), 1))
            metric_name = "anomaly_rate"
            passed = 0.02 <= rate <= 0.15
            achieved = rate

        else:
            return _failure_response(req, error=f"Unknown problem_type '{req.problem_type}'.")

    except Exception as e:  # noqa: BLE001 — scoring against malformed player output
        return _failure_response(req, error=f"Error scoring your output ({type(e).__name__}: {e}).")

    return {
        "target_metric": metric_name,
        "target_value": req.target_metric_value,
        "achieved": achieved,
        "passed": bool(passed),
        "door_status": "UNLOCKED" if passed else "LOCKED",
    }


def _failure_response(req, error: str) -> dict:
    return {
        "target_metric": req.target_metric,
        "target_value": req.target_metric_value,
        "achieved": 0.0,
        "passed": False,
        "door_status": "LOCKED",
        "error": error,
    }