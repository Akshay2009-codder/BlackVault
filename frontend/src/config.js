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

// Sci-Fi Corporate Control-Room Palette: Dark Graphite + RGB Neon Accents
export const BUILDING_PALETTE = {
  // RGB Neon Accents
  hotPink:        0xff2e9a,  // #FF2E9A - vibrant neon pink/magenta
  electricBlue:   0x2fd1ff,  // #2FD1FF - intense cyan/blue
  emeraldGreen:   0x22f0a8,  // #22F0A8 - vivid data-center green
  coolWhite:      0xe6f8ff,  // #E6F8FF - backlit signage white
  gold:           0xd4af37,  // #D4AF37 - metallic hardware trim

  // Dark Architectural Base
  wallGraphite:   0x1a1d24,  // #1A1D24 - dark matte graphite walls
  wallAlt:        0x161820,  // #161820 - secondary dark panel
  floorDark:      0x14161b,  // #14161B - glossy reflective dark floor
  floorGrout:     0x0d0f13,  // #0D0F13 - dark floor grid seam
  ceilingDark:    0x0f1114,  // #0F1114 - dark exposed ceiling/trusses
  furniture:      0x101216,  // #101216 - dark console/chassis body
};

// Door identity colours — rotating accent per floor
export const DOOR_COLORS = {
  classification: 0xff2e9a, // 1F: Hot Pink
  regression:     0x22f0a8, // 2F: Emerald Green
  clustering:     0x2fd1ff, // 3F: Electric Blue
  anomaly:        0xff2e9a, // 4F: Hot Pink & Cyan alert
  mystery:        0x22f0a8, // 5F: Core Vault Climax (Tri-Accent)
};

// Status colours — reserved for locked / solved states ONLY (distinct from floor accents!)
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
