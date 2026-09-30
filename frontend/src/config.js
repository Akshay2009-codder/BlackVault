// Shared frontend config -- API base URL, door types, and per-door-type
// algorithm/param options (mirrors backend/app/scoring.py's *_ALGOS dicts).
export const API_BASE = "http://localhost:8000";

export const DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"];
export const BOSS_DOOR_TYPE = "mystery";

// Room labels for HUD and directory board (room-to-room layout, no elevator)
export const ROOM_LABELS = {
  classification: "Room 1 — Classification Lab",
  regression:     "Room 2 — Regression Lab",
  clustering:     "Room 3 — Clustering Hub",
  anomaly:        "Room 4 — Anomaly Wing",
  mystery:        "Room 5 — The Vault",
};

export const DOOR_LABELS = {
  classification: "Classification Lab",
  regression:     "Regression Lab",
  clustering:     "Clustering Hub",
  anomaly:        "Anomaly Wing",
  mystery:        "Core Vault",
};

// Neutral/Electric Aesthetic Palette
export const BUILDING_PALETTE = {
  // Accents
  hotPink:        0x0F5C56,
  electricBlue:   0x0F5C56,
  emeraldGreen:   0x0F5C56,
  coolWhite:      0xF4F1EC,
  gold:           0x26241F,

  // Architectural Base
  wallGraphite:   0xF4F1EC,
  wallAlt:        0xF4F1EC,
  floorDark:      0xD9D4C8,
  floorGrout:     0x2B2B2E,
  ceilingDark:    0xEDEAE3,
  trussMetal:     0x26241F,
  ceilingCyan:    0x0F5C56,
  downlightWhite: 0xFFFFFF,
  edgeMagenta:    0x0F5C56,
  furniture:      0x26241F,
};

// Door identity colours
export const DOOR_COLORS = {
  classification: 0x0F5C56,
  regression:     0x0F5C56,
  clustering:     0x0F5C56,
  anomaly:        0x0F5C56,
  mystery:        0x0F5C56,
};

// Status colours — reserved for locked / solved states ONLY
export const STATUS_COLORS = {
  locked:   0xC1502E, // terracotta
  unlocked: 0x0F5C56, // teal
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
