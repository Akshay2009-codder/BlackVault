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


# Builtins deliberately allowed in player code. Anything not listed here
# is unavailable — including __import__, open, exec, eval, compile, input,
# getattr/setattr are also excluded to reduce reflection-based escapes.
SAFE_BUILTINS = {
    "range": range, "len": len, "print": print, "min": min, "max": max,
    "sum": sum, "abs": abs, "round": round, "sorted": sorted,
    "list": list, "dict": dict, "set": set, "tuple": tuple, "str": str,
    "int": int, "float": float, "bool": bool, "enumerate": enumerate,
    "zip": zip, "map": map, "filter": filter, "isinstance": isinstance,
    "True": True, "False": False, "None": None,
    "Exception": Exception, "ValueError": ValueError, "TypeError": TypeError,
    "KeyError": KeyError, "IndexError": IndexError,
}

REQUIRED_OUTPUTS = {
    "classification": ["y_test", "y_pred"],
    "regression": ["y_test", "y_pred"],
    "clustering": ["labels"],
    "anomaly_detection": ["anomaly_flags"],
}

DEFAULT_TIMEOUT_SECONDS = 10
MAX_STDOUT_CHARS = 2000


def _build_namespace(df, feature_cols, target_col):
    """Everything player code is allowed to see. Must stay in sync with
    CODE_EDITOR_CONTRACT.md and PythonSyntaxHighlighter.ProvidedNames."""
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

        required = REQUIRED_OUTPUTS.get(level_id, [])
        missing = [v for v in required if v not in namespace]
        if missing:
            result_queue.put({
                "success": False, "error_type": "missing_output",
                "message": f"Your code must define: {', '.join(missing)}",
                "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
            })
            return

        # Only pass back small, serializable outputs — never the full
        # namespace (could contain unpicklable sklearn objects/large data).
        outputs = {}
        for v in required:
            val = namespace[v]
            try:
                outputs[v] = list(val)  # works for arrays/Series/lists
            except TypeError:
                outputs[v] = val

        result_queue.put({
            "success": True,
            "outputs": outputs,
            "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
        })

    except Exception as e:
        # Catch-all: anything unexpected still returns a clean error
        # instead of the process just dying silently.
        result_queue.put({
            "success": False, "error_type": "runtime_error",
            "message": f"Unexpected error: {e}",
            "stdout": stdout_capture.getvalue()[:MAX_STDOUT_CHARS]
        })


def run_player_code(code: str, df, feature_cols, target_col: Optional[str],
                     level_id: str, timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS) -> dict:
    """
    Public entry point. Returns a dict matching either
    CodeExecutionSuccess-ish shape ({"success": True, "outputs": {...}, "stdout": ...})
    or CodeExecutionFailure-ish shape ({"success": False, "error_type": ..., "message": ..., "stdout": ...}).

    The caller (main.py's /train/code endpoint) is responsible for taking
    `outputs` and computing the actual metric via ml/train.py-style logic,
    then building the final CodeExecutionSuccess response.
    """
    ctx = multiprocessing.get_context("spawn")  # 'spawn' is safer/more
    # portable across platforms than 'fork' for this kind of isolation.
    result_queue = ctx.Queue()
    df_dict = df.to_dict()

    process = ctx.Process(
        target=_worker,
        args=(code, df_dict, feature_cols, target_col, level_id, result_queue)
    )
    process.start()
    process.join(timeout_seconds)

    if process.is_alive():
        process.terminate()
        process.join()
        return {
            "success": False, "error_type": "timeout",
            "message": f"Code did not finish within {timeout_seconds} seconds.",
            "stdout": ""
        }

    if not result_queue.empty():
        return result_queue.get()

    # Process died without putting anything on the queue (segfault-like
    # failure, killed by OS, etc.) — still return a clean error.
    return {
        "success": False, "error_type": "runtime_error",
        "message": "Code execution failed unexpectedly (no result returned).",
        "stdout": ""
    }