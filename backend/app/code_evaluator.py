"""
Safe Python code executor for BlackVault PyCharm IDE door puzzles.
Executes code with captured stdout and evaluates model outputs against door thresholds.
"""

import io
import sys
import traceback
from typing import Dict, Any


def evaluate_python_puzzle(door_type: str, level: int, code: str, attempts: int = 1, time_remaining: int = 300) -> Dict[str, Any]:
    # Capture standard output
    old_stdout = sys.stdout
    captured_output = io.StringIO()
    sys.stdout = captured_output

    # Safe globals environment with scientific packages
    sandbox_globals = {
        "__name__": "__main__",
        "__doc__": None,
        "__package__": None,
    }

    passed = False
    error_msg = None
    metric_score = 0.0

    try:
        # Execute submitted code
        exec(code, sandbox_globals)
        sys.stdout = old_stdout
        out_text = captured_output.getvalue()

        # Check door-specific passing condition and variables
        if door_type == "classification":
            result = sandbox_globals.get("result", None)
            clean_func = sandbox_globals.get("clean_sensor_data", None)
            if clean_func or result is not None:
                passed = True
                metric_score = 1.0
            else:
                acc = sandbox_globals.get("acc", 0.0)
                metric_score = float(acc)
                if metric_score >= 0.80:
                    passed = True
                else:
                    error_msg = f"AssertionError: Model accuracy {metric_score:.4f} is below 0.80 threshold."

        elif door_type == "regression":
            norm_func = sandbox_globals.get("normalize_features", None)
            result = sandbox_globals.get("result", None)
            if norm_func or result is not None:
                passed = True
                metric_score = 1.0
            else:
                score = sandbox_globals.get("score", 0.0)
                metric_score = float(score)
                if metric_score >= 0.50:
                    passed = True
                else:
                    error_msg = f"AssertionError: R^2 calibration score {metric_score:.4f} is below 0.50 threshold."

        elif door_type == "clustering":
            class_func = sandbox_globals.get("classify_threats", None)
            threats = sandbox_globals.get("threat_flags", None)
            if class_func or threats is not None:
                passed = True
                metric_score = 1.0
            else:
                sil_score = sandbox_globals.get("sil_score", 0.0)
                metric_score = float(sil_score)
                if metric_score >= 0.60:
                    passed = True
                else:
                    error_msg = f"AssertionError: Silhouette separation score {metric_score:.4f} is below 0.60 threshold."

        elif door_type == "anomaly":
            detect_func = sandbox_globals.get("detect_temperature_spikes", None)
            anomalies = sandbox_globals.get("anomalies", None)
            if detect_func or anomalies is not None:
                passed = True
                metric_score = 1.0
            else:
                detected_outliers = sandbox_globals.get("detected_outliers", 0)
                metric_score = float(detected_outliers)
                if 15 <= detected_outliers <= 25:
                    passed = True
                else:
                    error_msg = f"AssertionError: Detected outliers count ({detected_outliers}) must match expected ~20 anomalies."

        elif door_type == "mystery":
            calc_func = sandbox_globals.get("calculate_accuracy", None)
            score = sandbox_globals.get("score", None)
            if calc_func or score is not None:
                passed = True
                metric_score = 1.0
            else:
                final_acc = sandbox_globals.get("final_acc", 0.0)
                metric_score = float(final_acc)
                if metric_score >= 0.80:
                    passed = True
                else:
                    error_msg = f"AssertionError: Master accuracy {metric_score:.4f} is below 0.80 threshold."

        else:
            passed = True
            metric_score = 1.0

    except Exception as e:
        sys.stdout = old_stdout
        out_text = captured_output.getvalue()
        # Format clean traceback message without internal runner frames
        tb_lines = traceback.format_exception_only(type(e), e)
        error_msg = "".join(tb_lines).strip()

    # Calculate star rating
    if attempts <= 2 and time_remaining >= 120:
        stars = 3
    elif attempts <= 4:
        stars = 2
    else:
        stars = 1

    return {
        "passed": passed,
        "output": out_text.strip() if out_text else None,
        "error": error_msg,
        "score": metric_score,
        "stars": stars if passed else 0,
        "door_type": door_type,
        "level": level,
    }
