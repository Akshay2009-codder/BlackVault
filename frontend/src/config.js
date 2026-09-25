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

// Wonder-inducing Aesthetic Palette: Warm Ivory + Soft Glowing Accents
export const BUILDING_PALETTE = {
  // Magical Accents
  hotPink:        0xB39DDB,  // #B39DDB - gentle lavender
  electricBlue:   0x6B7FD7,  // #6B7FD7 - twilight blue
  emeraldGreen:   0xB39DDB,  // #B39DDB - gentle lavender
  coolWhite:      0xF5F0E8,  // #F5F0E8 - warm ivory / pearl
  gold:           0xE8B84B,  // #E8B84B - warm gold

  // Warm Luminous Architectural Base
  wallGraphite:   0xF5F0E8,  // #F5F0E8 - warm ivory walls
  wallAlt:        0xE8DFD0,  // #E8DFD0 - warm stone
  floorDark:      0xE8DFD0,  // #E8DFD0 - reflective warm stone floor
  floorGrout:     0xE8B84B,  // #E8B84B - warm gold grout
  ceilingDark:    0xF5F0E8,  // #F5F0E8 - warm cream ceiling
  trussMetal:     0xD4C8A0,  // #D4C8A0 - warm champagne beam
  ceilingCyan:    0xE8B84B,  // #E8B84B - warm gold LED strip
  downlightWhite: 0xFFF8F0,  // #FFF8F0 - luminous warm-white downlights
  edgeMagenta:    0xB39DDB,  // #B39DDB - soft lavender accent
  furniture:      0xC8B898,  // #C8B898 - warm linen chassis
};

// Door identity colours — unified twilight blue accent
export const DOOR_COLORS = {
  classification: 0x6b7fd7, // 1F: Twilight Blue
  regression:     0x6b7fd7, // 2F: Twilight Blue
  clustering:     0x6b7fd7, // 3F: Twilight Blue
  anomaly:        0x6b7fd7, // 4F: Twilight Blue
  mystery:        0x6b7fd7, // 5F: Twilight Blue
};

// Status colours — reserved for locked / solved states ONLY
export const STATUS_COLORS = {
  locked:   0xff9900, // Electric Security Amber (#FF9900) — locked / danger
  unlocked: 0x00f0ff, // Brilliant Ice Cyan (#00F0FF)      — solved / unlocked
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
