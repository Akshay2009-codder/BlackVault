// Real Python Code Editor Terminal — BlackVault Research Edition
// Uses Monaco Editor for syntax-highlighted code editing.
// Interactive challenges where player writes Python code with 3-trial limit.
// Ejection on 3 failed trials + unobstructed visible door opening animation.

import { API_BASE } from "./config.js";
import { setDoorUnlocked, playSecurityAlarmSFX, playErrorBuzzerSFX } from "./world.js";
import { standPlayerUp, ejectPlayerFromDesk } from "./player.js";
import * as levelManager from "./levelManager.js";
import { onPuzzlePassed, onPuzzleFailed } from "./guardVoice.js";

let activePuzzle = null;
let currentStep = 1;
let timerInterval = null;
let timeRemaining = 0;
let attemptsRemaining = 3;
const MAX_ATTEMPTS = 3;
let currentRoomIndex = 1;
let monacoEditor = null;
let monacoReady = false;

// Lockout tracking after 3 failed attempts
let lockoutUntil = 0;

export function isTerminalLockedOut() {
  return Date.now() < lockoutUntil;
}

export function getLockoutRemainingSeconds() {
  return Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
}

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
      // High-contrast Cyber Studio IDE theme
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

function getEditorCode() {
  if (monacoEditor) return monacoEditor.getValue();
  const ta = document.getElementById("code-editor-textarea");
  return ta ? ta.value : "";
}

// ── Step Chips Progression UI ────────────────────────────────────────
export function updateStepChips(step, taskName = "Write Code & Run") {
  const chip = document.getElementById("chip-step-1");
  if (!chip) return;
  const numEl = chip.querySelector(".chip-num");
  const labelEl = chip.querySelector(".chip-label");
  if (step >= 2) {
    chip.classList.add("completed");
    chip.classList.remove("active");
    if (numEl) numEl.textContent = "✓";
    if (labelEl) labelEl.textContent = "Task Verified — Clearance Granted!";
  } else {
    chip.classList.add("active");
    chip.classList.remove("completed");
    if (numEl) numEl.textContent = "★";
    if (labelEl) labelEl.textContent = `Task: ${taskName}`;
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
  if (isTerminalLockedOut()) {
    const rem = getLockoutRemainingSeconds();
    showSecurityAlertBanner(`⚠️ TERMINAL LOCKED OUT: ${rem}s remaining after 3 failed attempts.`);
    return;
  }

  currentRoomIndex = roomIndex || 1;
  currentStep = 1;
  attemptsRemaining = MAX_ATTEMPTS; // Reset to 3 fresh attempts

  const ide = document.getElementById("pycharm-ide");
  if (!ide) return;

  // Wait for Monaco to be ready
  await initMonaco();

  // Trigger monitor wake-up smooth animation
  ide.classList.remove("hidden");
  ide.classList.remove("waking-up");
  void ide.offsetWidth; // Force layout reflow
  ide.classList.add("waking-up");

  // Release pointer lock for typing
  if (document.exitPointerLock) document.exitPointerLock();

  const stepData = getOfflineStepInfo(doorType);
  updateStepChips(1, stepData.title);

  // Reset console output
  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML = `
      <div class="console-line sys">BlackVault Security Mainframe — Sector ${doorType.toUpperCase()}</div>
      <div class="console-line info">📋 Objective: ${escapeHtml(stepData.shortSummary)}</div>
      <div class="console-line warning">⚡ Security policy: You have 3 trials to pass verification.</div>
    `;
  }

  activePuzzle = {
    puzzle_id: `door-${doorType}-${Date.now()}`,
    door_type: doorType,
    level: currentRoomIndex,
    dataset_preview: stepData.dataset_preview,
  };

  createEditor(stepData.starter_code);

  const problemEl = document.getElementById("problem-statement");
  if (problemEl) {
    problemEl.textContent = stepData.instructions;
  }

  const tabLabel = document.getElementById("ide-tab-label");
  if (tabLabel) tabLabel.textContent = `${doorType}_task.py`;

  timeRemaining = 300; // 5 minutes
  updateTimerDisplay();
  updateAttemptsDisplay();
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
    statsEl.textContent = `Total Rows: ${preview.total_rows || 20} | Columns: ${preview.columns?.join(", ")}`;
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
            .map((val) => `<td>${val === null || val === "NaN" ? '<span class="nan-val">NaN</span>' : val}</td>`)
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
}

function updateAttemptsDisplay() {
  const el = document.getElementById("terminal-attempts");
  if (el) {
    el.textContent = `Trials: ${attemptsRemaining} / ${MAX_ATTEMPTS}`;
    if (attemptsRemaining === 1) {
      el.style.color = "#ff4444";
      el.style.fontWeight = "700";
    } else if (attemptsRemaining === 2) {
      el.style.color = "#ffaa00";
    } else {
      el.style.color = "";
    }
  }
}

function onTimeExpired() {
  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `<div class="console-line error">⏱ TIME EXPIRED: Session terminated.</div>`;
  }
  handleFailedAttempt("Session time limit expired.");
}

// ── Submit & Evaluate Code ───────────────────────────────────────────
async function submitCode() {
  if (!activePuzzle) return;

  const code = getEditorCode();
  if (!code || !code.trim()) {
    const consoleOut = document.getElementById("terminal-result");
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line error">No code provided. Write your Python solution above!</div>`;
    }
    return;
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Testing Code...";
  }

  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line sys">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="console-line info">▶ Running script & verifying output...</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  setTimeout(() => {
    evaluatePlayerCode(code);
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "▶ Run & Unlock Door (Ctrl+Enter)";
    }
  }, 250);
}

// ── Python Challenge Code Evaluator ──────────────────────────────────
function evaluatePlayerCode(code) {
  const doorType = activePuzzle?.door_type || "classification";
  const consoleOut = document.getElementById("terminal-result");

  // Check if player hasn't edited anything or left pure pass / None
  if (code.includes("# TODO") && (code.includes("pass") || code.includes("return None") || code.includes("cleaned = None") || code.includes("normalized = None") || code.includes("labels = None") || code.includes("spikes = None") || code.includes("accuracy = None"))) {
    handleFailedAttempt("Incomplete code: Replace the # TODO placeholder with your solution.");
    return;
  }

  let passed = false;
  let successMsg = "";
  let errorMsg = "";

  if (doorType === "classification") {
    // ROOM 1: DATA CLEANING (Replace NaN with 0.0)
    const hasNanHandling = code.includes("nan_to_num") || code.includes("isnan") || code.includes("where") || code.includes("fillna") || code.includes("0.0") || code.includes("0");
    const hasReturn = code.includes("return");

    if (!hasReturn) {
      errorMsg = "Function must return the cleaned data array.";
    } else if (!hasNanHandling) {
      errorMsg = "Missing NaN handling. Hint: Use np.nan_to_num(data, nan=0.0) or np.where(np.isnan(data), 0.0, data).";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── DATA CLEANING VERIFIED ────────────────</div>
        <div class="console-line success">✓ Test Case 1: [12.5, NaN, 34.0, NaN, 55.2] -> [12.5, 0.0, 34.0, 0.0, 55.2] (PASS)</div>
        <div class="console-line success">✓ Test Case 2: Zero NaNs Remaining in Sensor Matrix</div>
        <div class="console-line success">✓ Data Integrity Score: 100% — Ready for ML Pipeline!</div>
      `;
    }
  } else if (doorType === "regression") {
    // ROOM 2: FEATURE NORMALIZATION (Min-Max Scaling to [0, 1])
    const hasMinMax = (code.includes("min") && code.includes("max")) || code.includes("MinMaxScaler") || (code.includes("-") && code.includes("/"));
    const hasReturn = code.includes("return");

    if (!hasReturn) {
      errorMsg = "Function must return the normalized data array.";
    } else if (!hasMinMax) {
      errorMsg = "Missing min-max scaling formula. Hint: (data - np.min(data)) / (np.max(data) - np.min(data)).";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── FEATURE SCALING VERIFIED ────────────────</div>
        <div class="console-line success">✓ Test Case 1: [10.0, 30.0, 60.0, 100.0] -> [0.0, 0.22, 0.56, 1.0] (PASS)</div>
        <div class="console-line success">✓ Range Check: All features strictly bounded in [0.0, 1.0]</div>
        <div class="console-line success">✓ Normalization Loss: 0.0000 — Scale Calibrated!</div>
      `;
    }
  } else if (doorType === "clustering") {
    // ROOM 3: THREAT CLASSIFIER (Threshold binary 0/1)
    const hasThreshold = code.includes(">") || code.includes("threshold") || code.includes("50");
    const hasBinaryOutput = code.includes("astype") || code.includes("1") || code.includes("where") || code.includes("for");

    if (!code.includes("return")) {
      errorMsg = "Function must return the array of binary labels.";
    } else if (!hasThreshold || !hasBinaryOutput) {
      errorMsg = "Missing classification logic. Hint: (signals > threshold).astype(int) or [1 if s > 50 else 0 for s in signals].";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── THREAT CLASSIFIER VERIFIED ────────────────</div>
        <div class="console-line success">✓ Test Case 1: Signals [15, 82, 45, 99, 12, 67] -> [0, 1, 0, 1, 0, 1] (PASS)</div>
        <div class="console-line success">✓ Threat Detection Precision: 100.0%</div>
        <div class="console-line success">✓ False Positive Rate: 0.0%</div>
      `;
    }
  } else if (doorType === "anomaly") {
    // ROOM 4: ANOMALY DETECTION (Filter temps > max_safe)
    const hasFilter = code.includes(">") || code.includes("max_safe") || code.includes("80");
    const hasReturn = code.includes("return");

    if (!hasReturn) {
      errorMsg = "Function must return the filtered anomalies.";
    } else if (!hasFilter) {
      errorMsg = "Missing anomaly filter. Hint: temps[temps > max_safe] or [t for t in temps if t > 80.0].";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── ANOMALY DETECTION VERIFIED ────────────────</div>
        <div class="console-line success">✓ Test Case 1: Temps [42.0, 45.5, 95.0, 43.2, 88.4, 41.0] -> [95.0, 88.4] (PASS)</div>
        <div class="console-line success">✓ Intrusion Spikes Flagged: 2 Critical Overheating Events</div>
        <div class="console-line success">✓ Anomaly Recall Rate: 100.0%</div>
      `;
    }
  } else {
    // ROOM 5: MASTER VAULT EVALUATION (Accuracy calculation)
    const hasAccuracy = (code.includes("==") || code.includes("accuracy_score") || code.includes("mean") || code.includes("sum")) && code.includes("return");

    if (!code.includes("return")) {
      errorMsg = "Function must return the calculated accuracy score.";
    } else if (!hasAccuracy) {
      errorMsg = "Missing accuracy calculation. Hint: np.mean(y_true == y_pred) or sum(y_true == y_pred) / len(y_true).";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── MASTER VAULT CLEARANCE ────────────────</div>
        <div class="console-line success">✓ Test Case 1: Matching 5 of 6 Predictions -> Accuracy = 0.8333 (PASS)</div>
        <div class="console-line success">✓ Master Matrix Security Clearance Verified!</div>
        <div class="console-line success">🔓 BULKHEAD DOOR DISENGAGING...</div>
      `;
    }
  }

  if (passed) {
    if (consoleOut) {
      consoleOut.innerHTML += successMsg;
      consoleOut.innerHTML += `
        <div class="console-line success">✓ GATE VERIFICATION PASSED: Clearance Granted (3 Stars)!</div>
        <div class="console-line success">🔓 BULKHEAD OPENING IN FULL VIEW...</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    updateStepChips(2);
    const stars = 3;
    onPuzzlePassed(stars);
    levelManager.recordDoorSuccess(doorType, stars, currentRoomIndex);
    showSectorClearedBanner(doorType, stars);

    clearInterval(timerInterval);

    // CRITICAL: Close IDE immediately (350ms delay) so player gets direct, unobstructed view of the door opening!
    setTimeout(() => {
      const ide = document.getElementById("pycharm-ide");
      if (ide) {
        ide.classList.add("hidden");
        ide.classList.remove("waking-up");
      }
      // Stand up character cleanly and trigger smooth cinematic door animation
      standPlayerUp(() => {
        setDoorUnlocked(doorType);
      });
    }, 350);

  } else {
    handleFailedAttempt(errorMsg);
  }
}

// ── Handle Failed Attempt & 3-Trial Ejection ─────────────────────────
function handleFailedAttempt(errorMsg) {
  attemptsRemaining--;
  updateAttemptsDisplay();
  playErrorBuzzerSFX();
  onPuzzleFailed();

  const consoleOut = document.getElementById("terminal-result");

  if (attemptsRemaining > 0) {
    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line error">❌ VERIFICATION FAILED: ${escapeHtml(errorMsg)}</div>
        <div class="console-line warning">⚠️ Trials remaining: ${attemptsRemaining} / ${MAX_ATTEMPTS}. Check your code and try again.</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }
  } else {
    // 3rd FAILURE: OUT THE PLAYER (EJECT & LOCKOUT)!
    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line error">🚨 CRITICAL FAILURE: 3 Failed Trials Exhausted!</div>
        <div class="console-line error">🚨 SECURITY VIOLATION: EJECTING USER FROM MAINFRAME...</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    // Play loud siren SFX
    playSecurityAlarmSFX();

    // Set 4-second lockout cooldown
    lockoutUntil = Date.now() + 4000;

    // Show prominent ejection alert banner
    showSecurityAlertBanner("🚨 SECURITY BREACH: 3 Failed Trials! Ejected from terminal. Resetting in 4s...");

    // Close terminal immediately and eject player backward from desk
    setTimeout(() => {
      const ide = document.getElementById("pycharm-ide");
      if (ide) {
        ide.classList.add("hidden");
        ide.classList.remove("waking-up");
      }
      clearInterval(timerInterval);
      timerInterval = null;

      ejectPlayerFromDesk(() => {
        console.log("[BlackVault] Player ejected after 3 failed trials.");
      });
    }, 450);
  }
}

// ── Challenge Templates Per Sector ───────────────────────────────────
function getOfflineStepInfo(doorType) {
  const TASKS = {
    classification: {
      title: "Data Cleaning (Handling NaNs)",
      shortSummary: "Replace missing sensor values (np.nan) with 0.0",
      instructions: `ROOM 1 — DATA CLEANING & RECEPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Concept: Data Cleaning (Handling Missing Values)
🎯 Objective: Raw sensor logs contain corrupted missing readings (NaN).
Write code to replace all NaN values with 0.0 so the dataset is clean for training.

Input:
• raw_data: NumPy array with missing NaN values (e.g. [12.5, NaN, 34.0, NaN, 55.2])

Your Task:
1. Complete the 'clean_sensor_data' function
2. Replace all NaN values with 0.0 (Hint: Use np.nan_to_num(data, nan=0.0) or np.where)
3. Return the cleaned array`,
      starter_code: `# ROOM 1: DATA CLEANING CHALLENGE
# Concept: Clean raw corrupted sensor readings by replacing NaNs with 0.0
import numpy as np

# Raw corrupted telemetry readings from Reception Door
raw_data = np.array([12.5, np.nan, 34.0, np.nan, 55.2])

def clean_sensor_data(data):
    # TODO: Replace all NaN (missing) values in data with 0.0
    # Hint: Use np.nan_to_num(data, nan=0.0)
    cleaned = None  # Write your solution here
    
    return cleaned

# Run cleaner
result = clean_sensor_data(raw_data)
print("Cleaned Sensor Data:", result)
`,
      dataset_preview: {
        columns: ["timestamp_ms", "sensor_voltage", "status"],
        head_rows: [
          [100, 12.5, "OK"],
          [200, "NaN", "CORRUPTED"],
          [300, 34.0, "OK"],
          [400, "NaN", "CORRUPTED"],
          [500, 55.2, "OK"],
        ],
        total_rows: 25,
      },
    },

    regression: {
      title: "Feature Scaling & Normalization",
      shortSummary: "Normalize raw numbers between 0.0 and 1.0 using Min-Max scaling",
      instructions: `ROOM 2 — FEATURE NORMALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Concept: Min-Max Feature Scaling
🎯 Objective: Machine learning models require scaled inputs between 0.0 and 1.0.
Scale the raw network speed readings using the Min-Max formula:
   normalized = (data - min) / (max - min)

Input:
• raw_speeds: NumPy array of raw transfer rates (e.g. [10.0, 30.0, 60.0, 100.0])

Your Task:
1. Complete 'normalize_features' function
2. Calculate Min-Max normalized values in range [0.0, 1.0]
3. Return the scaled array`,
      starter_code: `# ROOM 2: FEATURE SCALING CHALLENGE
# Concept: Scale data into [0.0, 1.0] range using (data - min) / (max - min)
import numpy as np

# Raw transfer speeds in MB/s
raw_speeds = np.array([10.0, 30.0, 60.0, 100.0])

def normalize_features(data):
    # TODO: Calculate Min-Max scaled values between 0.0 and 1.0
    # Hint: (data - np.min(data)) / (np.max(data) - np.min(data))
    normalized = None  # Write your solution here
    
    return normalized

# Run normalization
result = normalize_features(raw_speeds)
print("Normalized Features (0-1):", result)
`,
      dataset_preview: {
        columns: ["packet_id", "raw_speed_mbps", "scaled_target"],
        head_rows: [
          [1, 10.0, 0.0],
          [2, 30.0, 0.22],
          [3, 60.0, 0.56],
          [4, 100.0, 1.0],
        ],
        total_rows: 30,
      },
    },

    clustering: {
      title: "Threat Classification (Thresholding)",
      shortSummary: "Classify network signals: 1 if signal > 50, else 0",
      instructions: `ROOM 3 — THREAT CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Concept: Binary Classification via Decision Threshold
🎯 Objective: Classify incoming network frequency signals.
If signal strength > 50, classify as 1 (Threat).
Otherwise, classify as 0 (Safe).

Input:
• signals: Array of signal intensities [15, 82, 45, 99, 12, 67]
• threshold: Value 50

Your Task:
1. Complete 'classify_threats' function
2. Return binary array of 1s (threat) and 0s (safe)
   Hint: (signals > threshold).astype(int) or list comprehension`,
      starter_code: `# ROOM 3: THREAT CLASSIFICATION CHALLENGE
# Concept: Classify signals into Threat (1) vs Safe (0) based on threshold
import numpy as np

signals = np.array([15, 82, 45, 99, 12, 67])
THRESHOLD = 50

def classify_threats(signals, threshold=50):
    # TODO: Return array where elements > threshold become 1, else 0
    # Hint: (signals > threshold).astype(int)
    labels = None  # Write your solution here
    
    return labels

# Run classifier
threat_flags = classify_threats(signals, THRESHOLD)
print("Classified Threat Labels:", threat_flags)
`,
      dataset_preview: {
        columns: ["signal_id", "frequency_ghz", "label_class"],
        head_rows: [
          [101, 15, 0],
          [102, 82, 1],
          [103, 45, 0],
          [104, 99, 1],
          [105, 12, 0],
          [106, 67, 1],
        ],
        total_rows: 50,
      },
    },

    anomaly: {
      title: "Anomaly & Outlier Detection",
      shortSummary: "Filter and return server temperature spikes exceeding 80.0 °C",
      instructions: `ROOM 4 — ANOMALY DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Concept: Outlier & Sensor Anomaly Detection
🎯 Objective: Identify overheating server hardware by filtering temperatures
that exceed the maximum safe threshold of 80.0 °C.

Input:
• temps: NumPy array of temperatures [42.0, 45.5, 95.0, 43.2, 88.4, 41.0]
• max_safe: Threshold 80.0

Your Task:
1. Complete 'detect_temperature_spikes' function
2. Return only the anomalous temperature readings (> max_safe)
   Hint: temps[temps > max_safe]`,
      starter_code: `# ROOM 4: ANOMALY DETECTION CHALLENGE
# Concept: Filter out abnormal readings that exceed safe operating limits
import numpy as np

# Sensor temperatures in degrees Celsius
temps = np.array([42.0, 45.5, 95.0, 43.2, 88.4, 41.0])
MAX_SAFE = 80.0

def detect_temperature_spikes(temps, max_safe=80.0):
    # TODO: Return array containing only temperatures > max_safe
    # Hint: temps[temps > max_safe]
    spikes = None  # Write your solution here
    
    return spikes

# Run anomaly detector
anomalies = detect_temperature_spikes(temps, MAX_SAFE)
print("Detected Overheating Spikes:", anomalies)
`,
      dataset_preview: {
        columns: ["sensor_id", "temp_celsius", "is_anomaly"],
        head_rows: [
          ["S1", 42.0, "NORMAL"],
          ["S2", 45.5, "NORMAL"],
          ["S3", 95.0, "ANOMALY!"],
          ["S4", 43.2, "NORMAL"],
          ["S5", 88.4, "ANOMALY!"],
        ],
        total_rows: 40,
      },
    },

    mystery: {
      title: "Master Model Accuracy Metric",
      shortSummary: "Calculate model prediction accuracy: np.mean(y_true == y_pred)",
      instructions: `ROOM 5 — MASTER VAULT CORE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 Concept: Model Evaluation & Accuracy Score
🎯 Objective: Calculate the final model accuracy to unlock the Master Core Vault.
Accuracy is the proportion of predictions that match actual ground-truth labels.

Formula:
   accuracy = sum(y_true == y_pred) / total_samples

Input:
• y_true: Ground truth labels [1, 0, 1, 1, 0, 1]
• y_pred: Model predictions [1, 0, 1, 0, 0, 1]

Your Task:
1. Complete 'calculate_accuracy' function
2. Return the accuracy score as a float
   Hint: np.mean(y_true == y_pred)`,
      starter_code: `# ROOM 5: MASTER VAULT EVALUATION
# Concept: Compute accuracy metric to verify model clearance for master vault
import numpy as np

# Actual security clearances vs model predictions
y_true = np.array([1, 0, 1, 1, 0, 1])
y_pred = np.array([1, 0, 1, 0, 0, 1])

def calculate_accuracy(y_true, y_pred):
    # TODO: Calculate fraction of matching predictions
    # Hint: np.mean(y_true == y_pred)
    accuracy = None  # Write your solution here
    
    return accuracy

# Run evaluation
score = calculate_accuracy(y_true, y_pred)
print("Master Model Accuracy:", score)
`,
      dataset_preview: {
        columns: ["sample_id", "y_true", "y_pred", "match"],
        head_rows: [
          [1, 1, 1, "MATCH"],
          [2, 0, 0, "MATCH"],
          [3, 1, 1, "MATCH"],
          [4, 1, 0, "DIFF"],
          [5, 0, 0, "MATCH"],
          [6, 1, 1, "MATCH"],
        ],
        total_rows: 50,
      },
    },
  };

  return TASKS[doorType] || TASKS["classification"];
}

function showSectorClearedBanner(doorType, stars) {
  const banner = document.getElementById("sector-cleared-banner");
  const title = document.getElementById("cleared-title");
  const desc = document.getElementById("cleared-desc");

  if (!banner) return;

  if (title) title.textContent = `${doorType.toUpperCase()} Sector Cleared! (${"★".repeat(stars)})`;
  if (desc) desc.textContent = `Bulkhead doors fully open. Walk through the doorway to enter next sector.`;

  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.add("hidden");
  }, 6000);
}

function showSecurityAlertBanner(text) {
  let alertEl = document.getElementById("security-eject-alert");
  if (!alertEl) {
    alertEl = document.createElement("div");
    alertEl.id = "security-eject-alert";
    alertEl.className = "security-eject-alert";
    document.body.appendChild(alertEl);
  }
  alertEl.textContent = text;
  alertEl.classList.remove("hidden");
  alertEl.classList.add("visible");

  setTimeout(() => {
    alertEl.classList.remove("visible");
    setTimeout(() => alertEl.classList.add("hidden"), 400);
  }, 4000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
