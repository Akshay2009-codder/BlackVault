"""
Dataset generation for each door type and level.
Produces dirty/challenge datasets with increasing corruption per level.
"""
import random
import math


def generate_dataset(door_type: str, level: int, config: dict) -> dict:
    """Generate a challenge dataset for the given door type and level."""
    seed = level * 1000 + hash(door_type) % 1000
    random.seed(seed)

    generators = {
        "cleaning": _gen_cleaning,
        "regression": _gen_regression,
        "classification": _gen_classification,
        "clustering": _gen_clustering,
        "anomaly": _gen_anomaly,
    }

    generator = generators.get(door_type)
    if not generator:
        raise ValueError(f"Unknown door type: {door_type}")

    return generator(level, config)


def _gen_cleaning(level: int, config: dict) -> dict:
    """Generate a dirty dataset for data cleaning challenges."""
    from app.ml.problems.cleaning import get_issue_breakdown, CLEANING_ACTIONS

    n_rows = 15 + level * 3
    corruption_rate = config["corruption_rate"]

    # Generate clean data
    headers = ["id", "name", "age", "salary", "department", "rating"]
    departments = ["Engineering", "Marketing", "Sales", "HR", "Finance"]
    clean_rows = []
    dirty_rows = []
    # Track cell-level issues for frontend highlighting
    cell_issues = []  # list of {row, column, type, value}

    for i in range(n_rows):
        row = {
            "id": i + 1,
            "name": f"Employee_{i+1}",
            "age": random.randint(22, 65),
            "salary": round(random.uniform(30000, 150000), 2),
            "department": random.choice(departments),
            "rating": round(random.uniform(1.0, 5.0), 1),
        }
        clean_rows.append(row.copy())

        # Corrupt some rows
        dirty_row = row.copy()
        if random.random() < corruption_rate:
            corruption_type = random.choice(["missing", "duplicate", "bad_type", "outlier"])
            if corruption_type == "missing":
                field = random.choice(["age", "salary", "department", "rating"])
                dirty_row[field] = None
                cell_issues.append({
                    "row": len(dirty_rows), "column": field,
                    "type": "missing", "value": None,
                })
            elif corruption_type == "bad_type":
                dirty_row["age"] = "unknown"
                cell_issues.append({
                    "row": len(dirty_rows), "column": "age",
                    "type": "bad_type", "value": "unknown",
                })
            elif corruption_type == "outlier":
                outlier_val = round(random.uniform(900000, 9999999), 2)
                dirty_row["salary"] = outlier_val
                cell_issues.append({
                    "row": len(dirty_rows), "column": "salary",
                    "type": "outlier", "value": outlier_val,
                })
            elif corruption_type == "duplicate":
                # Add a duplicate row before the original
                dirty_rows.append(dirty_row.copy())
                cell_issues.append({
                    "row": len(dirty_rows) - 1, "column": "id",
                    "type": "duplicate", "value": dirty_row["id"],
                })
        dirty_rows.append(dirty_row)

    # Get structured issue breakdown using the cleaning module
    breakdown = get_issue_breakdown(dirty_rows, clean_rows)

    return {
        "dataset": {
            "headers": headers,
            "rows": dirty_rows,
            "row_count": len(dirty_rows),
            "issue_count": breakdown["total"],
        },
        "clean_dataset": clean_rows,
        "answer": {
            "issues": breakdown["counts"]["missing"] + breakdown["counts"]["bad_type"] + breakdown["counts"]["outlier"],
            "duplicates": breakdown["counts"]["duplicate"],
        },
        "issue_breakdown": breakdown,
        "cell_issues": cell_issues,
        "target_metric": "cleaning_accuracy",
        "target_value": config["threshold_modifier"],
        "available_actions": list(CLEANING_ACTIONS.keys()),
        "action_details": {
            key: {
                "description": val["description"],
                "impact": val["impact"],
                "icon": val["icon"],
                "fixes": val["fixes"],
            }
            for key, val in CLEANING_ACTIONS.items()
        },
        "hints": [
            f"This dataset has {breakdown['total']} issues to fix",
            "Look for missing values, wrong data types, and extreme outliers",
            f"Issue types: {', '.join(t for t, c in breakdown['counts'].items() if c > 0)}",
        ],
    }


def _gen_regression(level: int, config: dict) -> dict:
    """Generate a regression dataset (predict a continuous value)."""
    n_rows = 20 + level * 5
    corruption_rate = config["corruption_rate"]

    headers = ["sqft", "bedrooms", "bathrooms", "age_years", "garage", "price"]
    rows = []

    for i in range(n_rows):
        sqft = random.randint(800, 4000)
        bedrooms = random.randint(1, 6)
        bathrooms = random.randint(1, 4)
        age = random.randint(0, 50)
        garage = random.randint(0, 3)
        # Price formula with noise
        price = (sqft * 150 + bedrooms * 15000 + bathrooms * 10000 -
                 age * 2000 + garage * 8000 + random.gauss(0, 20000))
        price = max(50000, round(price, -3))

        row = {
            "sqft": sqft, "bedrooms": bedrooms, "bathrooms": bathrooms,
            "age_years": age, "garage": garage, "price": price
        }

        # Corrupt
        if random.random() < corruption_rate:
            corrupt_field = random.choice(["sqft", "bedrooms", "price"])
            if corrupt_field == "price":
                row["price"] = None
            else:
                row[corrupt_field] = None
        rows.append(row)

    return {
        "dataset": {"headers": headers, "rows": rows, "row_count": len(rows)},
        "target_metric": "r2_score",
        "target_value": config["threshold_modifier"],
        "available_actions": [
            "linear_regression",
            "ridge_regression",
            "lasso_regression",
            "decision_tree",
            "random_forest",
            "remove_missing",
            "fill_missing_mean",
            "normalize_features",
        ],
        "hints": [
            "Predict the house price from the features",
            "Try different regression models to find the best fit",
        ],
    }


def _gen_classification(level: int, config: dict) -> dict:
    """Generate a classification dataset."""
    n_rows = 25 + level * 5
    corruption_rate = config["corruption_rate"]

    headers = ["feature_1", "feature_2", "feature_3", "feature_4", "label"]
    rows = []

    for i in range(n_rows):
        label = random.choice(["spam", "not_spam"])
        if label == "spam":
            f1 = round(random.gauss(7, 2), 2)
            f2 = round(random.gauss(8, 1.5), 2)
            f3 = round(random.gauss(3, 1), 2)
            f4 = round(random.gauss(6, 2), 2)
        else:
            f1 = round(random.gauss(3, 2), 2)
            f2 = round(random.gauss(4, 1.5), 2)
            f3 = round(random.gauss(7, 1), 2)
            f4 = round(random.gauss(4, 2), 2)

        row = {"feature_1": f1, "feature_2": f2, "feature_3": f3, "feature_4": f4, "label": label}

        if random.random() < corruption_rate:
            row["label"] = random.choice(["spam", "not_spam"])  # Flip label
        rows.append(row)

    return {
        "dataset": {"headers": headers, "rows": rows, "row_count": len(rows)},
        "target_metric": "f1_score",
        "target_value": config["threshold_modifier"],
        "available_actions": [
            "logistic_regression",
            "decision_tree",
            "random_forest",
            "svm",
            "knn",
            "remove_missing",
            "normalize_features",
            "balance_classes",
        ],
        "hints": [
            "Classify each entry as spam or not_spam",
            "Look at the feature distributions for each class",
        ],
    }


def _gen_clustering(level: int, config: dict) -> dict:
    """Generate a clustering dataset (unlabeled groups)."""
    n_rows = 20 + level * 5
    n_clusters = 3 + min(level // 3, 4)

    headers = ["x", "y", "intensity"]
    rows = []
    centers = [(random.uniform(-10, 10), random.uniform(-10, 10)) for _ in range(n_clusters)]

    for i in range(n_rows):
        center = random.choice(centers)
        spread = 1.0 + config["corruption_rate"] * 5
        x = round(center[0] + random.gauss(0, spread), 2)
        y = round(center[1] + random.gauss(0, spread), 2)
        intensity = round(random.uniform(0, 10), 2)
        rows.append({"x": x, "y": y, "intensity": intensity})

    return {
        "dataset": {"headers": headers, "rows": rows, "row_count": len(rows)},
        "answer": {"n_clusters": n_clusters, "centers": centers},
        "target_metric": "silhouette_score",
        "target_value": max(0.3, config["threshold_modifier"] - 0.2),
        "available_actions": [
            "kmeans",
            "dbscan",
            "agglomerative",
            "set_clusters_2",
            "set_clusters_3",
            "set_clusters_4",
            "set_clusters_5",
            "set_clusters_6",
            "normalize_features",
        ],
        "hints": [
            f"There are hidden groups in this data — find them",
            "Try different numbers of clusters to see what works",
        ],
    }


def _gen_anomaly(level: int, config: dict) -> dict:
    """Generate an anomaly detection dataset (find the outliers)."""
    n_rows = 30 + level * 5
    anomaly_rate = 0.1 + config["corruption_rate"] * 0.2

    headers = ["transaction_id", "amount", "time_hour", "frequency", "is_fraud"]
    rows = []
    answer_frauds = []

    for i in range(n_rows):
        is_fraud = random.random() < anomaly_rate
        if is_fraud:
            amount = round(random.uniform(5000, 50000), 2)
            time_hour = random.randint(0, 5)  # Late night
            frequency = random.randint(10, 50)
            answer_frauds.append(i)
        else:
            amount = round(random.uniform(10, 2000), 2)
            time_hour = random.randint(8, 22)
            frequency = random.randint(1, 5)

        rows.append({
            "transaction_id": f"TXN-{1000+i}",
            "amount": amount,
            "time_hour": time_hour,
            "frequency": frequency,
            "is_fraud": None,  # Hidden — player must find these
        })

    return {
        "dataset": {"headers": headers, "rows": rows, "row_count": len(rows)},
        "answer": {"fraud_indices": answer_frauds, "n_frauds": len(answer_frauds)},
        "target_metric": "precision_recall",
        "target_value": config["threshold_modifier"],
        "available_actions": [
            "isolation_forest",
            "local_outlier_factor",
            "one_class_svm",
            "statistical_threshold",
            "set_threshold_low",
            "set_threshold_medium",
            "set_threshold_high",
            "normalize_features",
        ],
        "hints": [
            f"There are {len(answer_frauds)} suspicious transactions to find",
            "Fraudulent transactions tend to be large and occur at unusual times",
        ],
    }
