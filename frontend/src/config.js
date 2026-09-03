// Shared frontend config -- API base URL, door constants, algorithms and labels.
export const API_BASE = "http://localhost:8000";
export const DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"];
export const BOSS_DOOR_TYPE = "mystery";

export const DOOR_LABELS = {
  classification: "Classification Gate",
  regression: "Regression Lock",
  clustering: "Clustering Chamber",
  anomaly: "Anomaly Firewall",
  mystery: "Core Security Vault",
};

export const ALGORITHMS = {
  classification: [
    ["logistic_regression", "Logistic Regression"],
    ["random_forest", "Random Forest Classifier"],
    ["knn", "K-Nearest Neighbors (KNN)"],
  ],
  regression: [
    ["linear_regression", "Linear Regression"],
    ["random_forest", "Random Forest Regressor"],
    ["ridge", "Ridge Regression"],
  ],
  clustering: [
    ["kmeans", "K-Means"],
    ["hierarchical", "Agglomerative Clustering"],
    ["dbscan", "DBSCAN"],
  ],
  anomaly: [
    ["isolation_forest", "Isolation Forest"],
    ["one_class_svm", "One-Class SVM"],
  ],
  mystery: [
    ["logistic_regression", "Logistic Regression"],
    ["random_forest", "Random Forest"],
    ["linear_regression", "Linear Regression"],
    ["kmeans", "K-Means"],
    ["isolation_forest", "Isolation Forest"],
  ],
};

export const EXTRA_PARAMS = {
  logistic_regression: [],
  linear_regression: [],
  random_forest: [
    ["n_estimators", "Estimators (Trees)", 100],
  ],
  knn: [
    ["n_neighbors", "Neighbors (k)", 5],
  ],
  ridge: [
    ["alpha", "Alpha", 1.0],
  ],
  kmeans: [
    ["n_clusters", "Clusters (k)", 3],
  ],
  hierarchical: [
    ["n_clusters", "Clusters (k)", 3],
  ],
  dbscan: [
    ["eps", "Epsilon", 0.9],
  ],
  isolation_forest: [
    ["contamination", "Contamination Rate", 0.05],
  ],
  one_class_svm: [
    ["contamination", "Nu / Outlier Fraction", 0.05],
  ],
};
