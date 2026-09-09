"""
Executes player-submitted Python code in a restricted, timed sandbox.

Design goals (this is a solo college project run locally, not a public
multi-tenant service -- so this is "restrict obvious footguns and runaway
loops," not a production-grade untrusted-code sandbox):

- Runs in a separate process (so an infinite loop or crash can't take down
  the API server, and a hard timeout can actually kill it).
- Only a whitelisted set of builtins and ML libraries are exposed -- no
  `open`, `import`, `os`, `subprocess`, `socket`, `eval`/`exec` access from
  inside the player's code, no network.
- The player defines exactly one function (the puzzle's "entry point") and
  nothing else about their code is trusted -- we only ever call that one
  function and read its return value.
"""

import multiprocessing as mp
from dataclasses import dataclass
from typing import Any, Callable


class CodeRunError(Exception):
    """Raised for any failure while running player code (syntax error,
    runtime exception, timeout, missing entry point, disallowed import)."""


@dataclass
class RunResult:
    value: Any


def _safe_globals() -> dict:
    import numpy as np
    import pandas as pd
    from sklearn.linear_model import LogisticRegression, LinearRegression
    from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
    from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
    from sklearn.svm import SVC, OneClassSVM
    from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
    from sklearn.preprocessing import StandardScaler, LabelEncoder, MinMaxScaler

    safe_builtins = {
        "range": range, "len": len, "print": print, "min": min, "max": max,
        "sum": sum, "abs": abs, "enumerate": enumerate, "zip": zip, "map": map,
        "filter": filter, "list": list, "dict": dict, "set": set, "tuple": tuple,
        "float": float, "int": int, "str": str, "bool": bool, "sorted": sorted,
        "round": round, "isinstance": isinstance, "type": type, "True": True,
        "False": False, "None": None, "ValueError": ValueError, "TypeError": TypeError,
        "KeyError": KeyError, "Exception": Exception, "object": object, "all": all,
        "any": any, "AttributeError": AttributeError, "IndexError": IndexError,
        "StopIteration": StopIteration, "getattr": getattr, "hasattr": hasattr,
        "RuntimeError": RuntimeError, "ZeroDivisionError": ZeroDivisionError,
    }

    return {
        "__builtins__": safe_builtins,
        "np": np, "numpy": np,
        "pd": pd, "pandas": pd,
        "LogisticRegression": LogisticRegression,
        "LinearRegression": LinearRegression,
        "DecisionTreeClassifier": DecisionTreeClassifier,
        "DecisionTreeRegressor": DecisionTreeRegressor,
        "RandomForestClassifier": RandomForestClassifier,
        "RandomForestRegressor": RandomForestRegressor,
        "IsolationForest": IsolationForest,
        "SVC": SVC,
        "OneClassSVM": OneClassSVM,
        "KMeans": KMeans,
        "DBSCAN": DBSCAN,
        "AgglomerativeClustering": AgglomerativeClustering,
        "StandardScaler": StandardScaler,
        "MinMaxScaler": MinMaxScaler,
        "LabelEncoder": LabelEncoder,
    }


def _worker(code: str, entry_point: str, call_args: tuple, conn) -> None:
    try:
        g = _safe_globals()
        try:
            compiled = compile(code, "<player_code>", "exec")
        except SyntaxError as e:
            conn.send(("error", f"SyntaxError: {e.msg} (line {e.lineno})"))
            return
        exec(compiled, g)
        fn: Callable = g.get(entry_point)
        if fn is None or not callable(fn):
            conn.send(("error", f"You must define a function named `{entry_point}`"))
            return
        result = fn(*call_args)
        conn.send(("ok", result))
    except Exception as e:  # noqa: BLE001 -- deliberately broad: any player-code failure is data, not a server error
        conn.send(("error", f"{type(e).__name__}: {e}"))
    finally:
        conn.close()


def run_player_code(code: str, entry_point: str, call_args: tuple, timeout_sec: int = 15) -> Any:
    """Run `code`, then call `<entry_point>(*call_args)` inside it, in a
    separate process with a hard timeout. Returns the function's return
    value, or raises CodeRunError with a player-facing message."""
    if not code or not code.strip():
        raise CodeRunError("You haven't written any code yet.")

    parent_conn, child_conn = mp.Pipe()
    proc = mp.Process(target=_worker, args=(code, entry_point, call_args, child_conn))
    proc.start()
    proc.join(timeout_sec)

    if proc.is_alive():
        proc.terminate()
        proc.join()
        raise CodeRunError(f"Your code didn't finish within {timeout_sec}s -- check for an infinite loop.")

    if parent_conn.poll():
        status, payload = parent_conn.recv()
        if status == "error":
            raise CodeRunError(payload)
        return payload

    raise CodeRunError("Your code crashed before returning a result.")
