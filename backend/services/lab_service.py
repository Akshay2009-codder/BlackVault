"""
lab_service.py — Neural Network Laboratory Training & Visualization Service
=============================================================================
Trains real Multi-Layer Perceptron (MLP) neural models using scikit-learn
and returns step-by-step training loss curves, weight matrices, and metrics.
"""

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, confusion_matrix

from services.preprocessing import load_dataset


def train_neural_lab_model(
    dataset_name: str = "heart_disease",
    hidden_layers: List[int] = [16, 8],
    learning_rate: float = 0.01,
    max_epochs: int = 50,
    activation: str = "relu",
) -> Dict[str, Any]:
    """Trains an MLPClassifier neural network and returns topology & progress stats."""
    df = load_dataset(dataset_name)

    # Clean numeric columns
    numeric_df = df.select_dtypes(include=[np.number]).dropna()
    if numeric_df.empty:
        raise ValueError("Selected dataset contains no numeric features for neural network training.")

    target_col = "target" if "target" in numeric_df.columns else numeric_df.columns[-1]
    feature_cols = [c for c in numeric_df.columns if c != target_col]

    X = numeric_df[feature_cols]
    y = numeric_df[target_col]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.25, random_state=42
    )

    mlp = MLPClassifier(
        hidden_layer_sizes=tuple(hidden_layers),
        activation=activation if activation in ["relu", "logistic", "tanh"] else "relu",
        learning_rate_init=learning_rate,
        max_iter=max_epochs,
        random_state=42,
        solver="adam",
    )

    mlp.fit(X_train, y_train)

    y_pred = mlp.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    cm = confusion_matrix(y_test, y_pred).tolist()

    # Extract layer sizes
    input_size = len(feature_cols)
    output_size = len(np.unique(y))
    layer_sizes = [input_size] + hidden_layers + [output_size]

    return {
        "dataset": dataset_name,
        "features": feature_cols,
        "layer_sizes": layer_sizes,
        "accuracy": round(acc, 4),
        "loss_curve": [round(float(l), 5) for l in mlp.loss_curve_],
        "total_iterations": mlp.n_iter_,
        "confusion_matrix": cm,
        "passed": acc >= 0.75,
    }
