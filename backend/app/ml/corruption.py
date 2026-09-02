"""
Data corruption engine — injects noise, missing values, and outliers.
Severity scales with level. Used by datasets.py during generation.
"""
import random


def corrupt_value(value, corruption_type: str, severity: float = 0.1):
    """Apply a single corruption to a value."""
    if corruption_type == "missing":
        return None
    elif corruption_type == "outlier" and isinstance(value, (int, float)):
        multiplier = random.choice([10, 100, -10])
        return value * multiplier
    elif corruption_type == "bad_type" and isinstance(value, (int, float)):
        return str(value) + random.choice(["?", "!", "N/A", ""])
    elif corruption_type == "noise" and isinstance(value, (int, float)):
        noise = random.gauss(0, abs(value) * severity)
        return round(value + noise, 2)
    elif corruption_type == "swap" and isinstance(value, str):
        if len(value) > 2:
            chars = list(value)
            i, j = random.sample(range(len(chars)), 2)
            chars[i], chars[j] = chars[j], chars[i]
            return "".join(chars)
    return value


def corrupt_dataset(rows: list, corruption_rate: float, columns: list = None) -> list:
    """
    Apply random corruptions across a dataset.
    Returns the corrupted rows (original list is modified in place).
    """
    corruption_types = ["missing", "outlier", "bad_type", "noise"]

    for row in rows:
        if random.random() < corruption_rate:
            if columns:
                col = random.choice(columns)
            else:
                col = random.choice(list(row.keys()))

            ctype = random.choice(corruption_types)
            row[col] = corrupt_value(row[col], ctype, corruption_rate)

    return rows


def add_duplicates(rows: list, duplicate_rate: float) -> list:
    """Add duplicate rows to a dataset."""
    duplicates = []
    for row in rows:
        if random.random() < duplicate_rate:
            duplicates.append(row.copy())
    rows.extend(duplicates)
    random.shuffle(rows)
    return rows
