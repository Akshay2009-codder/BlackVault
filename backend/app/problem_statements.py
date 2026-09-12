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


def get_problem_statement(door_type: str, step: int = 1) -> str:
    info = get_step_info(door_type, step)
    return info["instructions"]


def get_starter_code(door_type: str, step: int = 1) -> str:
    info = get_step_info(door_type, step)
    return info["starter_code"]


def get_step_info(door_type: str, step: int = 1) -> dict:
    step = max(1, min(3, step))
    if step == 1:
        return {
            "step": 1,
            "title": "Step 1: Data Cleaning (Easiest)",
            "instructions": (
                f"SECURITY GATE: {door_type.upper()} // STEP 1: DATA CLEANING\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "The incoming sensor dataset is dirty: it contains duplicate rows and missing values.\n"
                "Your objective for Step 1 is simple: CLEAN THE DATA.\n\n"
                "Define a function `clean_data(df)` that:\n"
                "  1. Removes duplicate records (`df.drop_duplicates()`)\n"
                "  2. Fills missing values with column median/mean (`df.fillna(...)`)\n"
                "  3. Returns the cleaned DataFrame.\n\n"
                "✓ Only data cleaning is required to pass Step 1!\n"
                "  Feature engineering and model training will unlock in Step 2."
            ),
            "starter_code": '''import numpy as np
import pandas as pd

def clean_data(df):
    """
    Step 1: Data Cleaning
    - Remove duplicate rows
    - Fill missing values with numeric median or mean
    Return the cleaned DataFrame.
    """
    # 1. Remove duplicate records
    df_clean = df.drop_duplicates()

    # 2. Impute missing values
    df_clean = df_clean.fillna(df_clean.median(numeric_only=True))

    return df_clean
'''
        }
    elif step == 2:
        return {
            "step": 2,
            "title": "Step 2: Feature Work & Scaling",
            "instructions": (
                f"SECURITY GATE: {door_type.upper()} // STEP 2: FEATURE ENGINEERING\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "✓ Step 1 Complete! Now prepare the features for machine learning.\n"
                "Goal: Write `preprocess_features(df)` to:\n"
                "  1. Encode any categorical columns (`pd.get_dummies(df, drop_first=True)`)\n"
                "  2. Scale numeric features with StandardScaler or MinMaxScaler\n"
                "  3. Return the scaled feature matrix.\n\n"
                "✓ Only feature work is required to pass Step 2!\n"
                "  Model training and evaluation will unlock in Step 3."
            ),
            "starter_code": '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

# Reusable Step 1 cleaner:
def clean_data(df):
    df_clean = df.drop_duplicates()
    return df_clean.fillna(df_clean.median(numeric_only=True))

def preprocess_features(df):
    """
    Step 2: Feature Engineering & Scaling
    - One-hot encode categorical features (pd.get_dummies)
    - Scale features using StandardScaler
    Return the scaled feature array or DataFrame.
    """
    # 1. Encode categorical columns if any
    df_encoded = pd.get_dummies(df, drop_first=True)

    # 2. Scale features
    scaler = StandardScaler()
    scaled = scaler.fit_transform(df_encoded)

    return scaled
'''
        }
    else:
        # Step 3: Model training
        model_name = "RandomForestClassifier" if door_type == "classification" else "LinearRegression"
        if door_type == "clustering":
            starter = '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def cluster(feature_df):
    """
    Step 3: Model Training & Evaluation
    Cluster the data and return cluster labels (0, 1, 2).
    """
    clean_df = clean_data(feature_df)
    scaler = StandardScaler()
    X = scaler.fit_transform(pd.get_dummies(clean_df, drop_first=True))

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    return kmeans.fit_predict(X)
'''
        elif door_type == "anomaly":
            starter = '''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def detect(feature_df):
    """
    Step 3: Model Training & Evaluation
    Detect anomalies in sensor data. Return 0 for normal, 1 for anomaly.
    """
    clean_df = clean_data(feature_df)
    scaler = StandardScaler()
    X = scaler.fit_transform(pd.get_dummies(clean_df, drop_first=True))

    iso = IsolationForest(contamination=0.1, random_state=42)
    raw_preds = iso.fit_predict(X)
    return [1 if p == -1 else 0 for p in raw_preds]
'''
        else:
            starter = f'''import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def predict(train_df, test_df, target_col):
    """
    Step 3: Model Training & Evaluation
    Use your cleaned features from Steps 1 & 2 to train the model.
    Return predictions for test_df.
    """
    # 1. Clean train data
    clean_train = clean_data(train_df)
    y_train = clean_train[target_col]
    X_train_raw = clean_train.drop(columns=[target_col])

    # 2. One-hot encode & scale
    X_train_enc = pd.get_dummies(X_train_raw, drop_first=True)
    X_test_enc = pd.get_dummies(test_df, drop_first=True)
    X_train_enc, X_test_enc = X_train_enc.align(X_test_enc, join="left", axis=1, fill_value=0)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_enc)
    X_test_scaled = scaler.transform(X_test_enc)

    # 3. Train model
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train_scaled, y_train)

    # 4. Predict
    return clf.predict(X_test_scaled)
'''
        return {
            "step": 3,
            "title": "Step 3: Model Training & Metric Evaluation",
            "instructions": (
                f"SECURITY GATE: {door_type.upper()} // STEP 3: MODEL TRAINING\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "✓ Steps 1 & 2 passed! Now build the final model pipeline.\n"
                "Goal: Train the ML model to achieve the target evaluation metric.\n"
                "Once Step 3 passes, the security bulkhead door will unlock!"
            ),
            "starter_code": starter
        }

# End of problem statements and starter codes
