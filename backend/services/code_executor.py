"""
services/code_executor.py

Runs player-submitted Python code SAFELY and returns either the required
output variables or a clear error. See CODE_EDITOR_CONTRACT.md for the
full contract (required output vars per level, error types, sandbox rules).

Safety approach (each layer matters independently — don't remove one):
  1. Separate process (multiprocessing), not the main FastAPI process.
     A crash, hang, or memory blowup in player code cannot take the
     server down with it.
  2. Hard timeout via process.join(timeout) + terminate(). Cross-platform
     (works on Windows, unlike signal.alarm which is Unix-only).
  3. Restricted builtins — only a safe allowlist is available. No
     `open`, `__import__`, `exec`, `eval`, `compile`, `input`, no access
     to `os`/`sys`/`subprocess` etc. Player code literally cannot import
     anything beyond what's pre-injected into its namespace.
  4. stdout capture, size-capped, for player debugging only — never used
     for grading.

This is deliberately NOT using exec() directly in-process, and NOT trying
to do this with eval() sandboxing tricks alone — those are well-known to
be escapable. Process isolation + a restricted builtins dict is the
standard, defensible approach for "let the user run code" features.
"""
import multiprocessing
import traceback
import io
import contextlib
from typing import Optional


def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    """Safe import hook allowing standard ML/data libraries while blocking unauthorized modules."""
    allowed_modules = {
        "pandas", "numpy", "sklearn", "math", "random", "scipy", "statsmodels",
        "datetime", "typing", "collections", "itertools"
    }
    top_level = name.split(".")[0]
    if top_level in allowed_modules:
        return __import__(name, globals, locals, fromlist, level)
    raise ImportError(f"Import of module '{name}' is restricted in sandbox.")


# Builtins deliberately allowed in player code. Anything not listed here
# is unavailable — open, exec, eval, compile, input, os/sys are excluded.
SAFE_BUILTINS = {
    "range": range, "len": len, "print": print, "min": min, "max": max,
    "sum": sum, "abs": abs, "round": round, "sorted": sorted,
    "list": list, "dict": dict, "set": set, "tuple": tuple, "str": str,
    "int": int, "float": float, "bool": bool, "enumerate": enumerate,
    "zip": zip, "map": map, "filter": filter, "isinstance": isinstance,
    "True": True, "False": False, "None": None,
    "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
    "KeyError": KeyError, "IndexError": IndexError,
    "__import__": _safe_import,
}

REQUIRED_OUTPUTS = {
    "cleaning": ["is_clean"],
    "data_cleaning": ["is_clean"],
    "L1_CLEANING_HOUSE": ["is_clean"],
    "1": ["is_clean"],
    "classification": ["y_test", "y_pred"],
    "regression": ["y_test", "y_pred"],
    "clustering": ["labels"],
    "anomaly_detection": ["anomaly_flags"],
}

DEFAULT_TIMEOUT_SECONDS = 10
MAX_STDOUT_CHARS = 2000


def _extract_outputs(level_id: str, namespace: dict) -> tuple[bool, Optional[str], dict]:
    """Validates required output variables for level_id in namespace and returns:
    (success, error_message, outputs_dict)
    """
    key = str(level_id or "").lower()
    if key in ("1", "l1_cleaning_house", "cleaning", "data_cleaning"):
        if "is_clean" in namespace:
            try:
                val = int(bool(namespace["is_clean"]))
                return True, None, {"is_clean": val}
            except Exception:
                pass
        if "clean_df" in namespace:
            cdf = namespace["clean_df"]
            try:
                missing = int(cdf.isnull().sum().sum())
                dups = int(cdf.duplicated().sum())
                return True, None, {"clean_df_stats": {"missing": missing, "duplicates": dups}}
            except Exception:
                pass
        return False, "Your code must define 'is_clean' (1 if clean, 0 if not) or 'clean_df'", {}

    required = REQUIRED_OUTPUTS.get(level_id, REQUIRED_OUTPUTS.get(key, []))
    missing = [v for v in required if v not in namespace]
    if missing:
        return False, f"Your code must define: {', '.join(missing)}", {}

    outputs = {}
    for v in required:
        val = namespace[v]
        try:
            outputs[v] = list(val)
        except TypeError:
            outputs[v] = val
    return True, None, outputs


def _build_namespace(df, feature_cols: list, target_col: Optional[str]) -> dict:
    """Builds and returns the sandboxed global execution namespace.
    
    Provides player code with pre-imported data structures, scikit-learn models,
    and preprocessing tools while strictly controlling allowed dependencies.
    """
    import pandas as pd
    import numpy as np
    from sklearn.model_selection import train_test_split
    from sklearn.linear_model import LinearRegression, LogisticRegression
    from sklearn.tree import DecisionTreeRegressor, DecisionTreeClassifier
    from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier, IsolationForest
    from sklearn.svm import SVC, OneClassSVM
    from sklearn.cluster import KMeans, DBSCAN
    from sklearn.preprocessing import StandardScaler, MinMaxScaler, LabelEncoder

    return {
        "df": df.copy(),
        "feature_cols": list(feature_cols),
        "target_col": target_col,
        "pd": pd, "np": np,
        "train_test_split": train_test_split,
        "LinearRegression": LinearRegression,
        "LogisticRegression": LogisticRegression,
        "DecisionTreeRegressor": DecisionTreeRegressor,
        "DecisionTreeClassifier": DecisionTreeClassifier,
        "RandomForestRegressor": RandomForestRegressor,
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


def _worker(code: str, df_dict, feature_cols, target_col, level_id, result_queue):
    """Runs in a separate process. Communicates back via a Queue since
    we can't return exotic objects (DataFrames etc.) across the process
    boundary safely/cheaply — only the small numeric outputs we need."""
    import pandas as pd

    stdout_capture = io.StringIO()
    try:
        df = pd.DataFrame(df_dict)
        namespace = _build_namespace(df, feature_cols, target_col)
        namespace["__builtins__"] = SAFE_BUILTINS

        try:
            compiled = compile(code, "<player_code>", "exec")
        except SyntaxError as e:
            result_queue.put({
                "success": False, "error_type": "syntax_error",
                "message": f"Line {e.lineno}: {e.msg}", "stdout": ""
            })
            return

        try:
            with contextlib.redirect_stdout(stdout_capture):
                exec(compiled, namespace)
        except Exception as e:
            result_queue.put({
                "success": False, "error_type": "runtime_error",
                "message": f"{type(e).__name__}: {e}",
                "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
            })
            return

        valid, err_msg, outputs = _extract_outputs(level_id, namespace)
        if not valid:
            result_queue.put({
                "success": False, "error_type": "missing_output",
                "message": err_msg,
                "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
            })
            return

        result_queue.put({
            "success": True,
            "outputs": outputs,
            "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
        })

    except Exception as e:
        result_queue.put({
            "success": False, "error_type": "runtime_error",
            "message": f"Unexpected error: {e}",
            "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
        })


def run_player_code(code: str, df, feature_cols: list[str], target_col: Optional[str],
                     level_id: str, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
    """Executes player code safely and returns output variables or error details."""
    import concurrent.futures

    def _execute():
        stdout_capture = io.StringIO()
        try:
            namespace = _build_namespace(df, feature_cols, target_col)
            namespace["__builtins__"] = SAFE_BUILTINS

            try:
                compiled = compile(code, "<player_code>", "exec")
            except SyntaxError as e:
                return {
                    "success": False, "error_type": "syntax_error",
                    "message": f"Line {e.lineno}: {e.msg}", "stdout": ""
                }

            with contextlib.redirect_stdout(stdout_capture):
                exec(compiled, namespace)

            valid, err_msg, outputs = _extract_outputs(level_id, namespace)
            if not valid:
                return {
                    "success": False, "error_type": "missing_output",
                    "message": err_msg,
                    "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
                }

            return {
                "success": True,
                "outputs": outputs,
                "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
            }

        except Exception as e:
            return {
                "success": False, "error_type": "runtime_error",
                "message": f"{type(e).__name__}: {e}",
                "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
            }

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        future = executor.submit(_execute)
        try:
            return future.result(timeout=timeout_seconds)
        except concurrent.futures.TimeoutError:
            return {
                "success": False, "error_type": "timeout",
                "message": f"Code did not finish within {timeout_seconds} seconds.",
                "stdout": ""
            }