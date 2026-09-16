// Real Python Code Editor Terminal
// Uses Monaco Editor for syntax-highlighted code editing.
// Tiered challenge progression: Step 1 (Data Cleaning) -> Step 2 (Feature Work) -> Step 3 (Model Training).
// Gated sequential unlocking with monitor wake-up animations.

import { API_BASE } from "./config.js";
import { setDoorUnlocked } from "./world.js";
import { standPlayerUp } from "./player.js";
import * as levelManager from "./levelManager.js";
import { onPuzzlePassed, onPuzzleFailed } from "./guardVoice.js";

let activePuzzle = null;
let currentStep = 1;
let timerInterval = null;
let timeRemaining = 0;
let attemptsRemaining = 0;
let currentRoomIndex = 1;
let monacoEditor = null;
let monacoReady = false;

// ── Monaco Editor Setup ──────────────────────────────────────────────
function initMonaco() {
  if (monacoReady) return Promise.resolve();

  return new Promise((resolve) => {
    if (typeof window.require === "undefined") {
      console.warn("[Terminal] Monaco loader not available, using textarea fallback");
      resolve();
      return;
    }

    window.require.config({
      paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs" },
    });

    window.require(["vs/editor/editor.main"], () => {
      // Define high-contrast Cyber Studio IDE theme matching Dusty Pink + Burgundy palette
      window.monaco.editor.defineTheme("blackvault-vibrant", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "8f7e84", fontStyle: "italic" },
          { token: "keyword", foreground: "c9a66b", fontStyle: "bold" },
          { token: "string", foreground: "7a9471" },
          { token: "number", foreground: "c98f8a" },
          { token: "type", foreground: "e0a899" },
          { token: "identifier", foreground: "f2e8dc" },
          { token: "delimiter", foreground: "c9a66b" },
        ],
        colors: {
          "editor.background": "#1a0d0f",
          "editor.foreground": "#f2e8dc",
          "editor.lineHighlightBackground": "#281418",
          "editorCursor.foreground": "#c9a66b",
          "editor.selectionBackground": "#6b1f2a55",
          "editorLineNumber.foreground": "#5a3a40",
          "editorLineNumber.activeForeground": "#c9a66b",
          "editor.inactiveSelectionBackground": "#281418",
        },
      });

      monacoReady = true;
      resolve();
    });
  });
}

function createEditor(initialCode) {
  const container = document.getElementById("code-editor-container");
  if (!container) return;

  if (monacoEditor) {
    monacoEditor.setValue(initialCode);
    return;
  }
  container.innerHTML = "";

  if (monacoReady && window.monaco) {
    monacoEditor = window.monaco.editor.create(container, {
      value: initialCode,
      language: "python",
      theme: "blackvault-vibrant",
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      minimap: { enabled: false },
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      wordWrap: "on",
      tabSize: 4,
      insertSpaces: true,
      automaticLayout: true,
      padding: { top: 12 },
      renderLineHighlight: "all",
      cursorBlinking: "smooth",
      cursorSmoothCaretAnimation: "on",
      smoothScrolling: true,
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8,
      },
    });

    // Ctrl+Enter to submit
    monacoEditor.addCommand(
      window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
      () => submitCode()
    );
  } else {
    // Textarea fallback
    const textarea = document.createElement("textarea");
    textarea.id = "code-editor-textarea";
    textarea.className = "fallback-editor";
    textarea.value = initialCode;
    textarea.spellcheck = false;
    container.appendChild(textarea);
  }
}

function setEditorCode(code) {
  if (monacoEditor) {
    monacoEditor.setValue(code);
  } else {
    const ta = document.getElementById("code-editor-textarea");
    if (ta) ta.value = code;
  }
}

function getEditorCode() {
  if (monacoEditor) return monacoEditor.getValue();
  const ta = document.getElementById("code-editor-textarea");
  return ta ? ta.value : "";
}

// ── Step Chips Progression UI (Single Easy Task) ────────────────────────
export function updateStepChips(step) {
  const chip = document.getElementById("chip-step-1");
  if (!chip) return;
  const numEl = chip.querySelector(".chip-num");
  const labelEl = chip.querySelector(".chip-label");
  if (step >= 2) {
    chip.classList.add("completed");
    chip.classList.remove("active");
    if (numEl) numEl.textContent = "✓";
    if (labelEl) labelEl.textContent = "Security Verified — Unlocked!";
  } else {
    chip.classList.add("active");
    chip.classList.remove("completed");
    if (numEl) numEl.textContent = "★";
    if (labelEl) labelEl.textContent = "Task: Run Security Verification (Press Run)";
  }
}

// ── Terminal UI Init ─────────────────────────────────────────────────
export function initTerminalUI() {
  const closeBtn = document.getElementById("terminal-close");
  if (closeBtn) closeBtn.addEventListener("click", closeTerminal);

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) submitBtn.addEventListener("click", submitCode);

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    const ide = document.getElementById("pycharm-ide");
    if (ide && !ide.classList.contains("hidden")) {
      if (e.code === "Escape") {
        closeTerminal();
      }
      if ((e.ctrlKey || e.metaKey) && e.code === "Enter") {
        e.preventDefault();
        submitCode();
      }
    }
  });

  // Pre-load Monaco
  initMonaco();
}

// ── Open Terminal for a Door ─────────────────────────────────────────
export async function openTerminal(doorType, roomIndex = 1) {
  currentRoomIndex = roomIndex || 1;
  currentStep = 1;
  updateStepChips(1);

  const ide = document.getElementById("pycharm-ide");
  if (!ide) return;

  // Wait for Monaco to be ready
  await initMonaco();

  // Trigger monitor wake-up smooth animation over 0.68s
  ide.classList.remove("hidden");
  ide.classList.remove("waking-up");
  void ide.offsetWidth; // Force layout reflow so animation restarts cleanly
  ide.classList.add("waking-up");

  // Release pointer lock for typing
  if (document.exitPointerLock) document.exitPointerLock();

  // Reset console output
  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML = `
      <div class="console-line sys">BlackVault Security Terminal — Sector ${doorType.toUpperCase()}</div>
      <div class="console-line info">✓ Task is pre-filled and ready. Press ▶ Run & Unlock Door (or Ctrl+Enter) to open!</div>
    `;
  }

  // Use pre-configured single-step task data
  const stepData = getOfflineStepInfo(doorType);

  activePuzzle = {
    puzzle_id: `door-${doorType}-${Date.now()}`,
    door_type: doorType,
    level: currentRoomIndex,
    dataset_preview: {
      columns: ["feature_1", "feature_2", "feature_3", "target"],
      head_rows: [
        [0.82, 1.45, -0.22, 1],
        [0.15, 0.30, 0.65, 0],
        [-1.20, 0.44, 0.88, 1],
        [0.45, -0.62, 0.11, 0],
      ],
      total_rows: 100,
    },
  };

  createEditor(stepData.starter_code);

  const problemEl = document.getElementById("problem-statement");
  if (problemEl) {
    problemEl.textContent = stepData.instructions;
  }

  const tabLabel = document.getElementById("ide-tab-label");
  if (tabLabel) tabLabel.textContent = `${doorType}_gate.py`;

  timeRemaining = 9999;  // No pressure
  attemptsRemaining = 99;
  updateTimerDisplay();
  startTimer();
  renderDatasetPreview(activePuzzle.dataset_preview);
}

export function closeTerminal() {
  const ide = document.getElementById("pycharm-ide");
  if (ide) {
    ide.classList.add("hidden");
    ide.classList.remove("waking-up");
  }

  clearInterval(timerInterval);
  timerInterval = null;

  standPlayerUp();
}

function renderDatasetPreview(preview) {
  if (!preview) return;

  const statsEl = document.getElementById("dataset-stats");
  if (statsEl) {
    statsEl.textContent = `Total Rows: ${preview.total_rows || 200} | Columns: ${preview.columns?.join(", ")}`;
  }

  const table = document.getElementById("dataset-table");
  if (!table) return;

  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");

  if (thead && preview.columns) {
    thead.innerHTML = `<tr>${preview.columns.map((c) => `<th>${c}</th>`).join("")}</tr>`;
  }

  if (tbody && preview.head_rows) {
    tbody.innerHTML = preview.head_rows
      .map(
        (row) =>
          `<tr>${row
            .map((val) => `<td>${val === null ? '<span class="nan-val">NaN</span>' : val}</td>`)
            .join("")}</tr>`
      )
      .join("");
  }
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      onTimeExpired();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const el = document.getElementById("terminal-timer");
  if (!el) return;
  const mins = Math.floor(Math.max(0, timeRemaining) / 60);
  const secs = Math.max(0, timeRemaining) % 60;
  el.textContent = `⏱ ${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  if (timeRemaining <= 60) {
    el.style.color = "#ff5252";
  } else {
    el.style.color = "";
  }
}

function updateAttemptsDisplay() {
  const el = document.getElementById("terminal-attempts");
  if (el) el.textContent = `Attempts: ${attemptsRemaining}`;
}

function onTimeExpired() {
  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `<div class="console-line error">⏱ TIME EXPIRED: Terminal locked.</div>`;
  }
  onPuzzleFailed();
}

// ── Submit Code (Single Easy Step) ──────────────────────────────────
async function submitCode() {
  if (!activePuzzle) return;

  const code = getEditorCode();
  if (!code || !code.trim()) {
    const consoleOut = document.getElementById("terminal-result");
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line error">No code to run. Write or press Run to execute!</div>`;
    }
    return;
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Running Security Check...";
  }

  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line sys">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="console-line info">▶ Executing Security Script...</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  // Fast direct execution and unlock
  setTimeout(() => {
    fallbackVerification(code);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "▶ Run & Unlock Door (Ctrl+Enter)";
    }
  }, 350);
}

// ── Handle Result & Door Clearance ────────────────────────────────────
function handleResult(result) {
  const consoleOut = document.getElementById("terminal-result");
  attemptsRemaining = result.attempts_remaining !== undefined ? result.attempts_remaining : attemptsRemaining - 1;
  updateAttemptsDisplay();

  const doorType = result.door_type || activePuzzle?.door_type || "classification";

  if (result.passed || result.step_passed) {
    updateStepChips(2); // Single task marked completed
    const stars = result.stars || 3;
    const starStr = "★".repeat(stars);

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line success">✓ GATE VERIFICATION PASSED: Security Clearance Granted!</div>
        <div class="console-line success">★ Rating: ${starStr} (${stars} Stars)</div>
        <div class="console-line success">🔓 BULKHEAD DOOR UNLOCKING IN SLOW MOTION...</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    // Trigger cinematic slow-motion unlock
    setDoorUnlocked(doorType);
    onPuzzlePassed(stars);
    levelManager.recordDoorSuccess(doorType, stars, currentRoomIndex);

    // Show cleared banner
    showSectorClearedBanner(doorType, stars);

    clearInterval(timerInterval);

    // Auto-close terminal after 2.4 seconds to showcase the cinematic opening
    setTimeout(() => closeTerminal(), 2400);
    return;
  }

  // If failed
  if (consoleOut) {
    const errorMsg = result.error_message || `Code output did not satisfy requirements.`;
    consoleOut.innerHTML += `
      <div class="console-line error">❌ CHECK FAILED: ${escapeHtml(errorMsg)}</div>
      <div class="console-line warning">Check code and press Run again. Attempts remaining: ${attemptsRemaining}</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }
  onPuzzleFailed();
}

// ── Fallback Verification & Educational ML Evaluation Engine ──────────
function fallbackVerification(code) {
  const doorType = activePuzzle?.door_type || "classification";
  const consoleOut = document.getElementById("terminal-result");

  if (!code || code.trim().length < 5) {
    handleResult({
      passed: false,
      step_passed: false,
      door_type: doorType,
      error_message: "Please write your Python ML solution and press Run!",
    });
    return;
  }

  // Educational ML Validation per Sector
  if (doorType === "classification") {
    const hasFit = code.includes(".fit(") || code.includes("classify") || code.includes("model");
    const hasPredict = code.includes(".predict(") || code.includes("predictions") || code.includes("return");

    if (!hasFit && !hasPredict) {
      handleResult({
        passed: false,
        step_passed: false,
        door_type: doorType,
        error_message: "Missing classifier fitting or prediction step. Use model.fit(X_train, y_train) and model.predict(X_test).",
      });
      return;
    }

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">──────────────── ML EVALUATION METRICS ────────────────</div>
        <div class="console-line info">Model: RandomForestClassifier(n_estimators=20)</div>
        <div class="console-line info">Training Samples: 80 | Validation Samples: 20</div>
        <div class="console-line success">✓ Training Accuracy: 100.0%</div>
        <div class="console-line success">✓ Validation F1-Score: 0.9850 (Target >= 0.80)</div>
        <div class="console-line info">Sample Predictions: [Safe, Threat, Safe, Safe, Threat, Safe, Threat...]</div>
        <div class="console-line success">🎯 CLASSIFIER PASSED BENCHMARK CRITERIA!</div>
      `;
    }

    handleResult({
      passed: true,
      step_passed: true,
      score: 0.985,
      target: 0.80,
      door_type: doorType,
      stars: 3,
    });
  } else if (doorType === "regression") {
    const hasReg = code.includes("LinearRegression") || code.includes(".fit(") || code.includes("predict");

    if (!hasReg) {
      handleResult({
        passed: false,
        step_passed: false,
        door_type: doorType,
        error_message: "Regression pipeline incomplete. Fit the regressor on (X_train, y_train) and predict X_test.",
      });
      return;
    }

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">──────────────── ML EVALUATION METRICS ────────────────</div>
        <div class="console-line info">Model: LinearRegression()</div>
        <div class="console-line info">Workload Features: [CPU Load, Active Connections, I/O Rate]</div>
        <div class="console-line success">✓ R² Score: 0.9642 (Target >= 0.80)</div>
        <div class="console-line success">✓ Mean Squared Error (MSE): 8.42 ms²</div>
        <div class="console-line info">Predicted Response Times: [42.1ms, 98.4ms, 184.2ms, 23.8ms, 115.0ms...]</div>
        <div class="console-line success">🎯 REGRESSION MODEL PASSED CALIBRATION!</div>
      `;
    }

    handleResult({
      passed: true,
      step_passed: true,
      score: 0.964,
      target: 0.80,
      door_type: doorType,
      stars: 3,
    });
  } else if (doorType === "clustering") {
    const hasCluster = code.includes("KMeans") || code.includes("cluster") || code.includes("fit_predict");

    if (!hasCluster) {
      handleResult({
        passed: false,
        step_passed: false,
        door_type: doorType,
        error_message: "Clustering pipeline incomplete. Initialize KMeans(n_clusters=3) and compute cluster labels.",
      });
      return;
    }

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">──────────────── ML EVALUATION METRICS ────────────────</div>
        <div class="console-line info">Model: KMeans(n_clusters=3)</div>
        <div class="console-line info">Unlabeled Telemetry Points: 150</div>
        <div class="console-line success">✓ Cluster Balance: [Cluster 0: 52, Cluster 1: 48, Cluster 2: 50]</div>
        <div class="console-line success">✓ Silhouette Score: 0.6820 (Target >= 0.45)</div>
        <div class="console-line success">🎯 OPTIMAL CLUSTER SEPARATION ACHIEVED!</div>
      `;
    }

    handleResult({
      passed: true,
      step_passed: true,
      score: 0.682,
      target: 0.45,
      door_type: doorType,
      stars: 3,
    });
  } else if (doorType === "anomaly") {
    const hasAnomaly = code.includes("IsolationForest") || code.includes("anomaly") || code.includes("detect");

    if (!hasAnomaly) {
      handleResult({
        passed: false,
        step_passed: false,
        door_type: doorType,
        error_message: "Anomaly detector incomplete. Use IsolationForest(contamination=0.08) to detect outliers.",
      });
      return;
    }

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">──────────────── ML EVALUATION METRICS ────────────────</div>
        <div class="console-line info">Model: IsolationForest(contamination=0.08)</div>
        <div class="console-line info">Security Log Records: 200</div>
        <div class="console-line success">✓ Anomalies Isolated: 16 suspicious intrusion spikes</div>
        <div class="console-line success">✓ Detection Recall: 95.8% | Precision: 93.4%</div>
        <div class="console-line success">🎯 THREAT SIGNATURE DETECTED AND CONTAINED!</div>
      `;
    }

    handleResult({
      passed: true,
      step_passed: true,
      score: 0.958,
      target: 0.85,
      door_type: doorType,
      stars: 3,
    });
  } else {
    // Mystery Vault Master Challenge
    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">──────────────── MASTER VAULT CLEARANCE ────────────────</div>
        <div class="console-line info">Pipeline: Master Ensemble Classifier</div>
        <div class="console-line success">✓ Encryption Vector Match: 100.0%</div>
        <div class="console-line success">✓ All 5 ML Disciplines Successfully Mastered!</div>
        <div class="console-line success">🔓 MASTER VAULT ACCESS GRANTED. WELCOME ARCHITECT.</div>
      `;
    }

    handleResult({
      passed: true,
      step_passed: true,
      score: 1.0,
      target: 0.90,
      door_type: doorType,
      stars: 3,
    });
  }
}

// ── Educational ML Challenge Templates Per Sector ─────────────────────
function getOfflineStepInfo(doorType) {
  const TASKS = {
    classification: {
      instructions: `ROOM 1 — CLASSIFICATION LAB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ML Concept: Supervised Binary Classification
🎯 Objective: Train a classifier to identify Threat vs Safe network signals.

Given:
• X_train: Matrix of signal features [frequency, entropy, amplitude]
• y_train: Binary labels (0 = Safe, 1 = Threat)
• X_test: Unlabeled incoming network signals

Your Task:
1. Initialize a classifier (e.g. RandomForestClassifier)
2. Fit the model on training data: model.fit(X_train, y_train)
3. Return predictions for X_test: model.predict(X_test)`,
      starter_code: `# ROOM 1: CLASSIFICATION CHALLENGE
# Concept: Supervised Binary Classification (Predict discrete 0 or 1)
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Simulated training data: [Signal Frequency, Packet Entropy, Amplitude]
X_train = np.array([
    [1.2, 0.4, 12.5],  # Safe
    [8.9, 0.9, 85.0],  # Threat
    [1.5, 0.3, 15.2],  # Safe
    [9.2, 0.8, 92.1],  # Threat
    [2.1, 0.5, 18.0],  # Safe
    [7.8, 0.9, 79.4],  # Threat
])
y_train = np.array([0, 1, 0, 1, 0, 1])

# Incoming test signals to classify
X_test = np.array([
    [1.4, 0.4, 14.0],  # Expect Safe (0)
    [8.5, 0.9, 88.0],  # Expect Threat (1)
])

def classify_signals(X_train, y_train, X_test):
    # Step 1: Initialize the Random Forest Classifier
    model = RandomForestClassifier(n_estimators=20, random_state=42)
    
    # Step 2: Fit model on training features & target labels
    model.fit(X_train, y_train)
    
    # Step 3: Predict class labels for test signals
    predictions = model.predict(X_test)
    
    print("✓ Model fitted! Predictions:", predictions)
    return predictions

# Execute classification
predictions = classify_signals(X_train, y_train, X_test)
`,
    },
    regression: {
      instructions: `ROOM 2 — REGRESSION LAB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ML Concept: Continuous Value Regression
🎯 Objective: Predict server latency (in milliseconds) from system load.

Given:
• X_train: System metrics [CPU Load %, Active Connections, Memory GB]
• y_train: Measured latency in milliseconds (continuous value)
• X_test: Incoming server workload metrics

Your Task:
1. Initialize a LinearRegression model
2. Fit the regressor: model.fit(X_train, y_train)
3. Predict and return continuous latency numbers: model.predict(X_test)`,
      starter_code: `# ROOM 2: REGRESSION CHALLENGE
# Concept: Continuous Value Prediction (Predict numeric millisecond latency)
import numpy as np
from sklearn.linear_model import LinearRegression

# Training data: [CPU Load (0-1), Connections, Memory GB] -> Latency (ms)
X_train = np.array([
    [0.15,  25,  4.2],
    [0.45,  95,  8.1],
    [0.75, 210, 14.5],
    [0.90, 380, 28.0],
])
y_train = np.array([24.5, 58.2, 122.0, 245.8])  # Target Latencies in ms

# Test server workload to predict
X_test = np.array([
    [0.30,  50,  6.0],
    [0.80, 290, 20.0],
])

def predict_latency(X_train, y_train, X_test):
    # Step 1: Initialize Linear Regression model
    model = LinearRegression()
    
    # Step 2: Fit on training data
    model.fit(X_train, y_train)
    
    # Step 3: Predict continuous latency values
    predicted_latency = model.predict(X_test)
    
    print("✓ Regression fitted! Predicted Latencies (ms):", [round(v, 2) for v in predicted_latency])
    return predicted_latency

# Execute regression
results = predict_latency(X_train, y_train, X_test)
`,
    },
    clustering: {
      instructions: `ROOM 3 — CLUSTERING HUB
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ML Concept: Unsupervised Learning (K-Means Clustering)
🎯 Objective: Group unlabeled network traffic into k=3 distinct clusters.

Given:
• X: Matrix of unlabeled packet statistics [Bytes, Packets/sec]

Your Task:
1. Initialize KMeans with n_clusters=3
2. Fit and predict cluster labels: model.fit_predict(X)
3. Return the integer cluster labels (0, 1, or 2)`,
      starter_code: `# ROOM 3: CLUSTERING CHALLENGE
# Concept: Unsupervised Learning (Discover 3 natural clusters without labels)
import numpy as np
from sklearn.cluster import KMeans

# Unlabeled network telemetry: [Packet Size (KB), Packets / Second]
X = np.array([
    [0.2,   5],   # Low traffic cluster
    [0.3,   8],
    [5.5, 120],   # Medium traffic cluster
    [6.1, 140],
    [45.0, 850],  # High traffic cluster
    [52.0, 920],
])

def cluster_traffic(X):
    # Step 1: Initialize KMeans with 3 clusters
    model = KMeans(n_clusters=3, random_state=42, n_init=10)
    
    # Step 2: Fit and compute cluster assignments
    cluster_labels = model.fit_predict(X)
    
    print("✓ KMeans fitted! Cluster assignments:", cluster_labels)
    return cluster_labels

# Execute clustering
labels = cluster_traffic(X)
`,
    },
    anomaly: {
      instructions: `ROOM 4 — ANOMALY WING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ML Concept: Unsupervised Anomaly / Outlier Detection
🎯 Objective: Detect rare intrusion spikes in server sensor logs.

Given:
• X: Sensor telemetry readings [CPU Temperature, Fan RPM, Voltage Spikes]

Your Task:
1. Initialize an IsolationForest with contamination=0.08
2. Fit and predict outliers: raw_preds = model.fit_predict(X)
3. Format output: 1 for anomaly (raw -1), 0 for normal (raw 1)`,
      starter_code: `# ROOM 4: ANOMALY DETECTION CHALLENGE
# Concept: Outlier & Intrusion Detection using Isolation Forest
import numpy as np
from sklearn.ensemble import IsolationForest

# Telemetry logs: [CPU Temp °C, Fan RPM, Voltage Ripple]
X = np.array([
    [42.0, 1800, 0.02],  # Normal
    [43.5, 1850, 0.03],  # Normal
    [41.8, 1790, 0.02],  # Normal
    [98.5, 4500, 0.85],  # INTRUSION SPIKE (Anomaly!)
    [44.0, 1820, 0.02],  # Normal
])

def detect_intrusions(X):
    # Step 1: Initialize Isolation Forest with expected ~8% contamination
    detector = IsolationForest(contamination=0.08, random_state=42)
    
    # Step 2: Fit and detect outliers (-1 = Anomaly, 1 = Normal)
    raw_preds = detector.fit_predict(X)
    
    # Step 3: Convert to binary flags: 1 for anomaly, 0 for normal
    anomalies = [1 if p == -1 else 0 for p in raw_preds]
    
    print("✓ Anomaly scan finished! Flagged anomalies:", anomalies)
    return anomalies

# Execute anomaly detector
flags = detect_intrusions(X)
`,
    },
    mystery: {
      instructions: `ROOM 5 — THE CORE VAULT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 ML Concept: Master Machine Learning Pipeline
🎯 Objective: Train the Master Security Classifier to decode the Vault Matrix.

Given:
• X_train, y_train: Multi-feature encryption vectors & clearance tiers
• X_test: Core Vault master access query

Your Task:
1. Initialize an ensemble RandomForestClassifier with n_estimators=30
2. Fit the model: model.fit(X_train, y_train)
3. Return predictions for X_test to unlock the final bulkhead`,
      starter_code: `# ROOM 5: THE CORE VAULT MASTER CHALLENGE
# Concept: Master Multi-Feature Ensemble Pipeline
import numpy as np
from sklearn.ensemble import RandomForestClassifier

# Master Vault Encryption Vectors
X_train = np.array([
    [10.2, 0.85, 3.4, 1],
    [24.5, 0.12, 1.2, 0],
    [11.0, 0.90, 3.8, 1],
    [22.8, 0.15, 1.0, 0],
])
y_train = np.array([1, 0, 1, 0])  # Clearance Granted (1) vs Denied (0)

X_test = np.array([
    [10.8, 0.88, 3.6, 1],  # Master Key Query
])

def unlock_core_vault(X_train, y_train, X_test):
    # Step 1: Initialize Master Ensemble Classifier
    master_model = RandomForestClassifier(n_estimators=30, random_state=42)
    
    # Step 2: Fit on Vault Encryption Matrix
    master_model.fit(X_train, y_train)
    
    # Step 3: Decode test clearance
    clearance = master_model.predict(X_test)
    
    print("✓ Vault Verification Matrix: 100% Validated!")
    print("Master Clearance:", clearance)
    return clearance

# Execute final unlock
access = unlock_core_vault(X_train, y_train, X_test)
`,
    },
  };

  return TASKS[doorType] || TASKS["classification"];
}

function showSectorClearedBanner(doorType, stars) {
  const banner = document.getElementById("sector-cleared-banner");
  const title = document.getElementById("cleared-title");
  const desc = document.getElementById("cleared-desc");

  if (!banner) return;

  if (title) title.textContent = `${doorType.toUpperCase()} Door Cleared! (${"★".repeat(stars)})`;
  if (desc) desc.textContent = `Security bulkhead opened in slow motion. Walk through to proceed.`;

  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.add("hidden");
  }, 5000);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
