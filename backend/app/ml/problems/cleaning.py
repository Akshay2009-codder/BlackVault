"""
Door 1: Data Cleaning challenge logic.
Handles validation, issue breakdown, and action-to-fix mapping.
"""

DESCRIPTION = "Fix dirty data: missing values, duplicates, bad types, outliers"
COLOR = "#00ff88"
DIFFICULTY_SCALE = {
    "base_issues": 5,
    "issues_per_level": 3,
    "max_issues": 30,
}

# Issue types that can appear in a dirty dataset
ISSUE_TYPES = ["missing", "duplicate", "bad_type", "outlier"]

# Which actions fix which issue types, and their descriptions
CLEANING_ACTIONS = {
    "remove_missing": {
        "fixes": ["missing"],
        "description": "Remove all rows containing missing (null) values",
        "impact": "Removes rows — reduces dataset size",
        "icon": "🗑️",
    },
    "fill_missing_mean": {
        "fixes": ["missing"],
        "description": "Fill missing numeric values with the column mean",
        "impact": "Preserves rows — may introduce bias toward average",
        "icon": "📊",
    },
    "fill_missing_mode": {
        "fixes": ["missing"],
        "description": "Fill missing categorical values with the most frequent value",
        "impact": "Preserves rows — good for categorical columns",
        "icon": "📋",
    },
    "remove_duplicates": {
        "fixes": ["duplicate"],
        "description": "Remove exact duplicate rows from the dataset",
        "impact": "Removes redundant data — prevents model bias",
        "icon": "♻️",
    },
    "fix_data_types": {
        "fixes": ["bad_type"],
        "description": "Convert mistyped values to their correct data type",
        "impact": "Fixes type errors — e.g. '42' string → 42 number",
        "icon": "🔧",
    },
    "remove_outliers": {
        "fixes": ["outlier"],
        "description": "Remove rows with extreme outlier values",
        "impact": "Removes extreme rows — aggressive but effective",
        "icon": "✂️",
    },
    "cap_outliers": {
        "fixes": ["outlier"],
        "description": "Cap outlier values at reasonable bounds (e.g. 1.5×IQR)",
        "impact": "Preserves rows — limits extreme values to boundaries",
        "icon": "📏",
    },
}


def get_issue_breakdown(dirty_rows, clean_rows):
    """
    Analyze a dirty dataset and return a detailed breakdown of issues.
    Returns counts per issue type and a list of (row_index, column, issue_type) tuples.
    """
    issues = []
    counts = {"missing": 0, "duplicate": 0, "bad_type": 0, "outlier": 0}

    # Track which rows are duplicates
    seen_ids = set()
    for idx, row in enumerate(dirty_rows):
        row_id = row.get("id")

        # Check for duplicates (same id appearing twice)
        if row_id is not None:
            if row_id in seen_ids:
                counts["duplicate"] += 1
                issues.append({
                    "row": idx,
                    "column": "id",
                    "type": "duplicate",
                    "value": row_id,
                })
                continue  # Skip other checks for duplicate rows
            seen_ids.add(row_id)

        # Check each field for issues
        for col, val in row.items():
            if col == "id":
                continue

            # Missing values
            if val is None:
                counts["missing"] += 1
                issues.append({
                    "row": idx,
                    "column": col,
                    "type": "missing",
                    "value": None,
                })

            # Bad types (e.g. string in a numeric field)
            elif col in ("age", "salary", "rating") and isinstance(val, str):
                counts["bad_type"] += 1
                issues.append({
                    "row": idx,
                    "column": col,
                    "type": "bad_type",
                    "value": val,
                })

            # Outliers (salary > 500k is suspicious)
            elif col == "salary" and isinstance(val, (int, float)) and val > 500000:
                counts["outlier"] += 1
                issues.append({
                    "row": idx,
                    "column": col,
                    "type": "outlier",
                    "value": val,
                })

    return {
        "counts": counts,
        "total": sum(counts.values()),
        "issues": issues,
    }


def validate_actions(actions, issue_breakdown):
    """
    Validate player actions against the actual issues in the dataset.
    Returns per-action feedback and an overall effectiveness score.
    """
    counts = issue_breakdown["counts"]
    feedback = []
    issues_addressed = set()
    unnecessary_actions = 0

    for action in actions:
        action_info = CLEANING_ACTIONS.get(action)
        if not action_info:
            feedback.append({
                "action": action,
                "status": "unknown",
                "message": f"Unknown action: {action}",
            })
            continue

        fixes = action_info["fixes"]
        was_needed = False

        for issue_type in fixes:
            if counts.get(issue_type, 0) > 0 and issue_type not in issues_addressed:
                was_needed = True
                issues_addressed.add(issue_type)
                feedback.append({
                    "action": action,
                    "status": "correct",
                    "message": f"✓ Fixed {counts[issue_type]} {issue_type} issue(s)",
                    "issues_fixed": counts[issue_type],
                })

        if not was_needed:
            # Check if it's redundant (same issue type already addressed)
            already_fixed = any(ft in issues_addressed for ft in fixes)
            if already_fixed:
                feedback.append({
                    "action": action,
                    "status": "redundant",
                    "message": f"⚠ Redundant — {fixes[0]} issues already addressed",
                })
            else:
                unnecessary_actions += 1
                feedback.append({
                    "action": action,
                    "status": "unnecessary",
                    "message": f"✗ No {fixes[0]} issues found in dataset",
                })

    # Check for unaddressed issues
    unaddressed = []
    for issue_type, count in counts.items():
        if count > 0 and issue_type not in issues_addressed:
            unaddressed.append({"type": issue_type, "count": count})
            feedback.append({
                "action": None,
                "status": "missed",
                "message": f"⚠ Missed: {count} {issue_type} issue(s) not addressed",
            })

    # Calculate effectiveness
    total_issue_types = sum(1 for c in counts.values() if c > 0)
    addressed_count = len(issues_addressed)

    if total_issue_types == 0:
        effectiveness = 1.0
    else:
        effectiveness = addressed_count / total_issue_types

    # Penalty for unnecessary actions
    penalty = unnecessary_actions * 0.1
    effectiveness = max(0, effectiveness - penalty)

    return {
        "feedback": feedback,
        "effectiveness": round(effectiveness, 4),
        "issues_addressed": list(issues_addressed),
        "unaddressed": unaddressed,
        "unnecessary_count": unnecessary_actions,
    }


def get_action_preview(action, issue_breakdown):
    """
    Get a preview of what an action will do, given the current issues.
    Used for real-time feedback in the terminal UI.
    """
    action_info = CLEANING_ACTIONS.get(action)
    if not action_info:
        return {"relevant": False, "message": "Unknown action"}

    counts = issue_breakdown["counts"]
    fixes = action_info["fixes"]

    relevant_count = sum(counts.get(ft, 0) for ft in fixes)
    if relevant_count > 0:
        return {
            "relevant": True,
            "message": f"Will fix {relevant_count} {fixes[0]} issue(s)",
            "count": relevant_count,
        }
    else:
        return {
            "relevant": False,
            "message": f"No {fixes[0]} issues to fix",
            "count": 0,
        }
