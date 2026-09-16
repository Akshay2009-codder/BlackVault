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

// Sci-Fi Corporate Control-Room Palette: Dark Graphite + RGB Neon Accents
export const BUILDING_PALETTE = {
  // RGB Neon Accents
  hotPink:        0xff2e9a,  // #FF2E9A - vibrant neon pink/magenta
  electricBlue:   0x2fd1ff,  // #2FD1FF - intense cyan/blue
  emeraldGreen:   0x22f0a8,  // #22F0A8 - vivid data-center green
  coolWhite:      0xe6f8ff,  // #E6F8FF - backlit signage white
  gold:           0xd4af37,  // #D4AF37 - metallic hardware trim

  // Architectural Tech Palette (Bright, clean, non-black surfaces)
  wallGraphite:   0x7292a6,  // #7292A6 - sleek silver-steel wall tone (bright & clear)
  wallAlt:        0x5e7e92,  // #5E7E92 - secondary satin cyan-steel panel
  floorDark:      0x243240,  // #243240 - rich slate-blue floor
  floorGrout:     0x1c2834,  // #1C2834 - subtle floor grid seam
  ceilingDark:    0x364c60,  // #364C60 - mid-tone architectural ceiling
  trussMetal:     0x486478,  // #486478 - bright structural beam metal tone
  ceilingCyan:    0x3fd8e8,  // #3FD8E8 - glowing cyan-teal beam strips
  downlightWhite: 0xe8f4ff,  // #E8F4FF - soft cool-white recessed downlights
  edgeMagenta:    0xff4fa3,  // #FF4FA3 - sparse magenta ceiling edge strips
  furniture:      0x344b5c,  // #344B5C - sleek steel console chassis
};

// Door identity colours — unified electric cyan/blue accent
export const DOOR_COLORS = {
  classification: 0x2fd1ff, // 1F: Electric Cyan/Blue
  regression:     0x2fd1ff, // 2F: Electric Cyan/Blue
  clustering:     0x2fd1ff, // 3F: Electric Cyan/Blue
  anomaly:        0x2fd1ff, // 4F: Electric Cyan/Blue
  mystery:        0x2fd1ff, // 5F: Electric Cyan/Blue
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
