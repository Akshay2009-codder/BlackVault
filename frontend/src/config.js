// Shared frontend config -- API base URL, door types, and per-door-type
// algorithm/param options (mirrors backend/app/scoring.py's *_ALGOS dicts).
export const API_BASE = "http://localhost:8000";

export const DOOR_TYPES = ["classification", "regression", "clustering", "anomaly"];
export const BOSS_DOOR_TYPE = "mystery";

// Floor labels for HUD and directory board
export const FLOOR_LABELS = {
  ground:         "G  — Reception & Lobby",
  classification: "1F — Classification Lab",
  regression:     "2F — Regression Lab",
  clustering:     "3F — Clustering Hub",
  anomaly:        "4F — Anomaly Wing",
  mystery:        "5F — The Vault",
};

export const DOOR_LABELS = {
  classification: "Classification Lab",
  regression:     "Regression Lab",
  clustering:     "Clustering Hub",
  anomaly:        "Anomaly Wing",
  mystery:        "Core Vault",
};

// Dusty Pink + Burgundy + Cream building identity palette
export const BUILDING_PALETTE = {
  burgundy:    0x6b1f2a,  // primary accent
  dustyPink:   0xc98f8a,  // secondary accent
  brushedGold: 0xc9a66b,  // tertiary accent (sparingly)
  cream:       0xf2e8dc,  // wall main
  creamAlt:    0xeadfd0,  // wall secondary
  floorCream:  0xdccfc0,  // floor tile
  grout:       0x2b1a1c,  // floor grout / dark trim
  ceilingCream:0xf7f1e8,  // ceiling
  furniture:   0x241417,  // deep burgundy-black (desks, chairs, panels)
  gold:        0xc9a66b,  // brushed gold (handles, rings, chrome)
};

// Door identity colours — each floor leans on one accent
export const DOOR_COLORS = {
  classification: 0x6b1f2a, // Burgundy
  regression:     0xc98f8a, // Dusty Pink
  clustering:     0xc9a66b, // Brushed Gold
  anomaly:        0x8c2635, // Brighter Burgundy-Red (danger)
  mystery:        0x6b1f2a, // Burgundy (climax returns to primary)
};

// Status colours — reserved for locked / solved states ONLY
export const STATUS_COLORS = {
  locked:   0x8c2635, // Bright burgundy-red  — locked / danger
  unlocked: 0x7a9471, // Muted sage green      — solved / unlocked
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
