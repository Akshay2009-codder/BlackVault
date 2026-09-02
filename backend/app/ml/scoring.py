"""
Scoring engine — computes metrics from player actions and maps to 1–3 stars.
"""
import random


def compute_score(door_type: str, level: int, actions: list,
                  challenge_data: dict, time_taken: float, config: dict) -> dict:
    """
    Compute the player's score based on their chosen actions.
    Returns score, target, message, and metric name.
    """
    scorers = {
        "cleaning": _score_cleaning,
        "regression": _score_regression,
        "classification": _score_classification,
        "clustering": _score_clustering,
        "anomaly": _score_anomaly,
    }

    scorer = scorers.get(door_type)
    if not scorer:
        raise ValueError(f"Unknown door type: {door_type}")

    return scorer(level, actions, challenge_data, time_taken, config)


def score_to_stars(score: float, target: float, time_taken: float, time_limit: float) -> int:
    """
    Convert a score to 1–3 stars.
    - 1 star: met the target
    - 2 stars: exceeded target by 10%+ OR completed in <70% of time
    - 3 stars: exceeded target by 15%+ AND completed in <50% of time
    """
    if score < target:
        return 0  # Failed

    time_ratio = time_taken / time_limit if time_limit > 0 else 1.0
    score_ratio = score / target if target > 0 else 1.0

    if score_ratio >= 1.15 and time_ratio <= 0.5:
        return 3
    elif score_ratio >= 1.10 or time_ratio <= 0.7:
        return 2
    else:
        return 1


def _score_cleaning(level, actions, challenge_data, time_taken, config):
    """Score data cleaning actions."""
    answer = challenge_data.get("answer", {})
    total_issues = answer.get("issues", 5) + answer.get("duplicates", 0)

    # Each correct action fixes some issues
    correct_actions = {"remove_missing", "fill_missing_mean", "fill_missing_mode",
                       "remove_duplicates", "fix_data_types", "remove_outliers", "cap_outliers"}
    player_correct = [a for a in actions if a in correct_actions]

    # Score = percentage of issues addressed
    fixes_per_action = max(1, total_issues // len(correct_actions)) if correct_actions else 0
    issues_fixed = min(total_issues, len(player_correct) * fixes_per_action)
    score = issues_fixed / max(1, total_issues)

    target = config["threshold_modifier"]

    return {
        "score": round(score, 4),
        "target": target,
        "metric_name": "cleaning_accuracy",
        "message": f"Fixed {issues_fixed}/{total_issues} issues ({score:.0%})",
        "details": {"issues_fixed": issues_fixed, "total_issues": total_issues},
    }


def _score_regression(level, actions, challenge_data, time_taken, config):
    """Score regression model selection."""
    model_scores = {
        "linear_regression": 0.72,
        "ridge_regression": 0.75,
        "lasso_regression": 0.73,
        "decision_tree": 0.68,
        "random_forest": 0.82,
    }
    preprocessing = {"remove_missing": 0.03, "fill_missing_mean": 0.05, "normalize_features": 0.04}

    base_score = 0.5
    for a in actions:
        if a in model_scores:
            base_score = max(base_score, model_scores[a])
        elif a in preprocessing:
            base_score += preprocessing[a]

    # Add level variance
    base_score += random.gauss(0, 0.02)
    score = max(0, min(1, base_score))
    target = config["threshold_modifier"]

    return {
        "score": round(score, 4),
        "target": target,
        "metric_name": "r2_score",
        "message": f"R² Score: {score:.4f} (target: {target:.2f})",
        "details": {"models_tried": [a for a in actions if a in model_scores]},
    }


def _score_classification(level, actions, challenge_data, time_taken, config):
    """Score classification model selection."""
    model_scores = {
        "logistic_regression": 0.78,
        "decision_tree": 0.72,
        "random_forest": 0.85,
        "svm": 0.80,
        "knn": 0.75,
    }
    preprocessing = {"remove_missing": 0.02, "normalize_features": 0.03, "balance_classes": 0.05}

    base_score = 0.5
    for a in actions:
        if a in model_scores:
            base_score = max(base_score, model_scores[a])
        elif a in preprocessing:
            base_score += preprocessing[a]

    base_score += random.gauss(0, 0.02)
    score = max(0, min(1, base_score))
    target = config["threshold_modifier"]

    return {
        "score": round(score, 4),
        "target": target,
        "metric_name": "f1_score",
        "message": f"F1 Score: {score:.4f} (target: {target:.2f})",
        "details": {"models_tried": [a for a in actions if a in model_scores]},
    }


def _score_clustering(level, actions, challenge_data, time_taken, config):
    """Score clustering approach."""
    answer = challenge_data.get("answer", {})
    true_k = answer.get("n_clusters", 3)

    # Determine chosen k
    chosen_k = true_k  # Default
    for a in actions:
        if a.startswith("set_clusters_"):
            chosen_k = int(a.split("_")[-1])

    # Score based on how close k is to the truth
    k_diff = abs(chosen_k - true_k)
    k_penalty = k_diff * 0.15

    model_scores = {"kmeans": 0.70, "dbscan": 0.75, "agglomerative": 0.72}
    preprocessing = {"normalize_features": 0.05}

    base_score = 0.4
    for a in actions:
        if a in model_scores:
            base_score = max(base_score, model_scores[a])
        elif a in preprocessing:
            base_score += preprocessing[a]

    score = max(0, min(1, base_score - k_penalty))
    target = max(0.3, config["threshold_modifier"] - 0.2)

    return {
        "score": round(score, 4),
        "target": target,
        "metric_name": "silhouette_score",
        "message": f"Silhouette Score: {score:.4f} (target: {target:.2f})",
        "details": {"chosen_clusters": chosen_k, "optimal_clusters": true_k},
    }


def _score_anomaly(level, actions, challenge_data, time_taken, config):
    """Score anomaly detection approach."""
    model_scores = {
        "isolation_forest": 0.82,
        "local_outlier_factor": 0.78,
        "one_class_svm": 0.75,
        "statistical_threshold": 0.65,
    }
    threshold_bonus = {
        "set_threshold_low": -0.05,
        "set_threshold_medium": 0.0,
        "set_threshold_high": 0.05,
    }
    preprocessing = {"normalize_features": 0.03}

    base_score = 0.4
    for a in actions:
        if a in model_scores:
            base_score = max(base_score, model_scores[a])
        elif a in threshold_bonus:
            base_score += threshold_bonus[a]
        elif a in preprocessing:
            base_score += preprocessing[a]

    base_score += random.gauss(0, 0.02)
    score = max(0, min(1, base_score))
    target = config["threshold_modifier"]

    return {
        "score": round(score, 4),
        "target": target,
        "metric_name": "precision_recall",
        "message": f"Detection Score: {score:.4f} (target: {target:.2f})",
        "details": {},
    }
