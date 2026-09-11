// Shared frontend config -- API base URL, door types, and per-door-type
// algorithm/param options (mirrors backend/app/scoring.py's *_ALGOS dicts).
export const API_BASE = "http://localhost:8000";

export const DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"];
export const BOSS_DOOR_TYPE = "mystery";

export const DOOR_LABELS = {
  classification: "Classification Lab",
  regression: "Regression Lab",
  clustering: "Clustering Hub",
  anomaly: "Anomaly Wing",
  mystery: "Core Security Vault",
};

export const DOOR_COLORS = {
  classification: 0x2f80ed, // Electric Blue
  regression:     0x8b5cf6, // Violet
  clustering:     0xff9f43, // Amber
  anomaly:        0xef476f, // Locked/danger red (anomaly uses status red as its identity)
  mystery:        0x8b5cf6, // Violet (climax room)
};

export const STATUS_COLORS = {
  locked:   0xef476f, // Locked / danger red
  unlocked: 0x22c55e, // Success green — only for solved states
};

export const ALGORITHMS = {
  classification: [
    ["logistic_regression", "Logistic Regression"],
    ["decision_tree", "Decision Tree"],
    ["random_forest", "Random Forest"],
    ["svm", "SVM"],
  ],
  regression: [
    ["linear_regression", "Linear Regression"],
    ["decision_tree_regressor", "Decision Tree Regressor"],
    ["random_forest_regressor", "Random Forest Regressor"],
  ],
  clustering: [
    ["kmeans", "K-Means"],
    ["dbscan", "DBSCAN"],
    ["hierarchical", "Hierarchical (Agglomerative)"],
  ],
  anomaly: [
    ["isolation_forest", "Isolation Forest"],
    ["one_class_svm", "One-Class SVM"],
  ],
  mystery: [
    ["random_forest", "Random Forest"],
    ["logistic_regression", "Logistic Regression"],
  ],
};

// Extra numeric params shown per algorithm; sent as pipeline_choice.params.
export const EXTRA_PARAMS = {
  random_forest: [["n_estimators", "Trees", 100]],
  random_forest_regressor: [["n_estimators", "Trees", 100]],
  kmeans: [["n_clusters", "Clusters (k)", 3]],
  hierarchical: [["n_clusters", "Clusters (k)", 3]],
  dbscan: [["eps", "Eps", 1.5], ["min_samples", "Min samples", 5]],
  isolation_forest: [["contamination", "Contamination", 0.08]],
  one_class_svm: [["contamination", "Contamination (nu)", 0.08]],
};
