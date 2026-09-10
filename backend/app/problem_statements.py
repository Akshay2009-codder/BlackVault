"""
Problem statements and starter code templates for each door type.
Displayed in the in-game code editor when the player opens a door.
"""

PROBLEM_STATEMENTS = {
    "classification": (
        "SECURITY GATE: CLASSIFICATION\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "The security system has intercepted a corrupted dataset of network signals.\n"
        "Your mission: build a classification pipeline that achieves the target F1 score.\n\n"
        "You are given:\n"
        "  • train_df — training data with features + 'target' column\n"
        "  • test_df  — test features only (no target)\n"
        "  • target_col — name of the target column ('target')\n\n"
        "Define a function `predict(train_df, test_df, target_col)` that returns\n"
        "a list/array of predicted labels for test_df.\n\n"
        "⚠ The data is DIRTY: missing values, duplicates, and outliers.\n"
        "   You must clean it before training!"
    ),
    "regression": (
        "SECURITY GATE: REGRESSION\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "A calibration dataset for the facility's sensor array is corrupted.\n"
        "Your mission: build a regression pipeline that achieves the target R² score.\n\n"
        "You are given:\n"
        "  • train_df — training data with features + 'target' column\n"
        "  • test_df  — test features only (no target)\n"
        "  • target_col — name of the target column ('target')\n\n"
        "Define a function `predict(train_df, test_df, target_col)` that returns\n"
        "a list/array of predicted values for test_df.\n\n"
        "⚠ The data contains missing values and noise. Clean and scale appropriately!"
    ),
    "clustering": (
        "SECURITY GATE: CLUSTERING\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "The facility's sensor network has unlabeled spatial data that must be grouped.\n"
        "Your mission: cluster the data to achieve the target silhouette score.\n\n"
        "You are given:\n"
        "  • feature_df — a DataFrame of unlabeled features\n\n"
        "Define a function `cluster(feature_df)` that returns\n"
        "a list/array of integer cluster labels (one per row).\n\n"
        "💡 Hint: There are 3 natural clusters. Scale features before clustering!"
    ),
    "anomaly": (
        "SECURITY GATE: ANOMALY DETECTION\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "Intrusion signatures have been injected into the network traffic logs.\n"
        "Your mission: detect the anomalies to achieve the target recall score.\n\n"
        "You are given:\n"
        "  • feature_df — a DataFrame of network metrics\n\n"
        "Define a function `detect(feature_df)` that returns\n"
        "a list/array of 0s and 1s (0 = normal, 1 = anomaly).\n\n"
        "⚠ Use IsolationForest or similar. The contamination ratio is ~5-10%."
    ),
    "mystery": (
        "CORE VAULT: MYSTERY CHALLENGE\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "The vault's core encryption uses an UNKNOWN problem type.\n"
        "Inspect the data carefully to determine whether this is classification,\n"
        "regression, clustering, or anomaly detection — then solve it.\n\n"
        "The function you must define depends on the problem type:\n"
        "  • Classification/Regression: `predict(train_df, test_df, target_col)`\n"
        "  • Clustering: `cluster(feature_df)`\n"
        "  • Anomaly Detection: `detect(feature_df)`\n\n"
        "⚠ You must diagnose the problem type yourself from the data!"
    ),
}

STARTER_CODES = {
    "classification": '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

def predict(train_df, test_df, target_col):
    """
    Build a classification pipeline.
    Return predicted labels for test_df.
    """
    # Step 1: Separate features and target
    y_train = train_df[target_col]
    X_train = train_df.drop(columns=[target_col])

    # Step 2: Clean the data (handle missing values, duplicates)
    # TODO: Your code here

    # Step 3: Scale features
    # TODO: Your code here

    # Step 4: Train a classifier
    # TODO: Your code here

    # Step 5: Predict on test data
    # TODO: Return predictions
    pass
''',
    "regression": '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression

def predict(train_df, test_df, target_col):
    """
    Build a regression pipeline.
    Return predicted values for test_df.
    """
    # Step 1: Separate features and target
    y_train = train_df[target_col]
    X_train = train_df.drop(columns=[target_col])

    # Step 2: Clean the data
    # TODO: Your code here

    # Step 3: Scale features
    # TODO: Your code here

    # Step 4: Train a regressor
    # TODO: Your code here

    # Step 5: Predict on test data
    # TODO: Return predictions
    pass
''',
    "clustering": '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

def cluster(feature_df):
    """
    Cluster the unlabeled data.
    Return a list of integer cluster labels.
    """
    # Step 1: Clean missing values
    # TODO: Your code here

    # Step 2: Scale features
    # TODO: Your code here

    # Step 3: Fit a clustering model
    # TODO: Your code here

    # Step 4: Return cluster labels
    # TODO: Return labels
    pass
''',
    "anomaly": '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

def detect(feature_df):
    """
    Detect anomalies in the data.
    Return a list of 0s (normal) and 1s (anomaly).
    """
    # Step 1: Clean missing values
    # TODO: Your code here

    # Step 2: Scale features
    # TODO: Your code here

    # Step 3: Fit an anomaly detector
    # TODO: Your code here

    # Step 4: Convert predictions (-1=anomaly, 1=normal) to (1, 0)
    # TODO: Return binary labels
    pass
''',
    "mystery": '''import numpy as np
import pandas as pd

# MYSTERY CHALLENGE
# First, inspect the data to determine the problem type.
# Then define the correct function:
#   predict(train_df, test_df, target_col) for classification/regression
#   cluster(feature_df) for clustering
#   detect(feature_df) for anomaly detection

# TODO: Write your solution here
pass
''',
}


def get_problem_statement(door_type: str) -> str:
    return PROBLEM_STATEMENTS.get(door_type, PROBLEM_STATEMENTS["classification"])


def get_starter_code(door_type: str) -> str:
    return STARTER_CODES.get(door_type, STARTER_CODES["classification"])
