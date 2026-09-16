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

// ── Fallback Verification — SINGLE EASY STEP ─────────────────────────
// Any code submission passes immediately. One click unlocks the door.
function fallbackVerification(code) {
  const doorType = activePuzzle?.door_type || "classification";

  // Pass as long as there is some code (don't make the player struggle)
  const hasCode = code && code.trim().length > 5;

  if (hasCode) {
    handleResult({
      step_passed: true,
      passed: true,
      step: 1,
      score: 1.0,
      target: 0.5,
      door_type: doorType,
      attempts_remaining: attemptsRemaining,
      stars: 3,
    });
  } else {
    handleResult({
      step_passed: false,
      passed: false,
      step: 1,
      door_type: doorType,
      attempts_remaining: attemptsRemaining - 1,
      error_message: "Write at least one line of code, then press Run!",
    });
  }
}

// ── Offline Step Templates — Simple Single-Step Per Room ────────────────
function getOfflineStepInfo(doorType) {
  const TASKS = {
    classification: {
      instructions: `SECURITY GATE: CLASSIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ The code is ready to run. Press ▶ Run to open the door!

Task: Classify data into two groups (0 or 1).
The solution is already written for you — just run it!`,
      starter_code: `# CLASSIFICATION GATE — Press Run to unlock!
# Task: Classify employee security clearance levels.

data = [
    {"name": "Alice",   "score": 92, "years": 5},
    {"name": "Bob",     "score": 45, "years": 1},
    {"name": "Carol",   "score": 88, "years": 8},
    {"name": "Dave",    "score": 31, "years": 0},
]

# Classify: score >= 70 and years >= 2 => cleared (1), else not (0)
clearance = [
    1 if row["score"] >= 70 and row["years"] >= 2 else 0
    for row in data
]

print("Clearance results:", clearance)
print("Cleared:", sum(clearance), "/ Total:", len(clearance))
print("Gate check: PASSED ✓")
`,
    },
    regression: {
      instructions: `SECURITY GATE: REGRESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ The code is ready to run. Press ▶ Run to open the door!

Task: Predict a numeric value from input features.
The solution is already written for you — just run it!`,
      starter_code: `# REGRESSION GATE — Press Run to unlock!
# Task: Predict server response time from load.

data_points = [
    {"cpu_load": 0.2, "connections": 10},
    {"cpu_load": 0.5, "connections": 50},
    {"cpu_load": 0.8, "connections": 200},
    {"cpu_load": 0.9, "connections": 500},
]

# Simple linear prediction: response = 50 + 300 * cpu_load + 0.1 * connections
predictions = [
    round(50 + 300 * p["cpu_load"] + 0.1 * p["connections"], 1)
    for p in data_points
]

print("Predicted response times (ms):", predictions)
print("Gate check: PASSED ✓")
`,
    },
    clustering: {
      instructions: `SECURITY GATE: CLUSTERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ The code is ready to run. Press ▶ Run to open the door!

Task: Group data points into clusters.
The solution is already written for you — just run it!`,
      starter_code: `# CLUSTERING GATE — Press Run to unlock!
# Task: Group network traffic patterns into 3 clusters.

traffic = [
    {"bytes": 120,  "packets": 5},
    {"bytes": 9800, "packets": 400},
    {"bytes": 130,  "packets": 6},
    {"bytes": 8900, "packets": 390},
    {"bytes": 5500, "packets": 200},
]

# Simple rule-based clustering (no sklearn needed)
def cluster(row):
    if row["bytes"] < 500:   return 0  # Low
    elif row["bytes"] < 6000: return 1  # Medium
    else:                     return 2  # High

labels = [cluster(t) for t in traffic]
print("Cluster labels:", labels)
print("Gate check: PASSED ✓")
`,
    },
    anomaly: {
      instructions: `SECURITY GATE: ANOMALY DETECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ The code is ready to run. Press ▶ Run to open the door!

Task: Find the anomalous data point in the sensor feed.
The solution is already written for you — just run it!`,
      starter_code: `# ANOMALY GATE — Press Run to unlock!
# Task: Flag unusual sensor readings.

readings = [0.98, 1.02, 0.97, 1.05, 8.74, 0.99, 1.01]

mean = sum(readings) / len(readings)
std  = (sum((x - mean) ** 2 for x in readings) / len(readings)) ** 0.5

anomaly_threshold = 2.5  # standard deviations
anomalies = [
    (i, x) for i, x in enumerate(readings)
    if abs(x - mean) > anomaly_threshold * std
]

print("Anomalies detected:", anomalies)
print(f"Mean={mean:.2f}, Std={std:.2f}, Threshold={anomaly_threshold}σ")
print("Gate check: PASSED ✓")
`,
    },
    mystery: {
      instructions: `THE VAULT — FINAL GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ You made it to the Vault! Press ▶ Run to open it!

Task: The vault recognizes those who understand all of ML.
The solution is already written for you — just run it!`,
      starter_code: `# THE VAULT — FINAL GATE. Press Run to open!
# Congratulations on reaching the Vault.

print("╔" + "═" * 48 + "╗")
print("║   BLACKVAULT CORP — VAULT ACCESS TERMINAL     ║")
print("║   Access Code: ML-9731-CLEARANCE-GRANTED       ║")
print("║   All 5 sector gates verified.                 ║")
print("╚" + "═" * 48 + "╝")
print()
print("ML Disciplines Cleared:")
for sector in ["Classification", "Regression", "Clustering", "Anomaly Detection"]:
    print(f"  ✓ {sector}")
print()
print("VAULT DOOR UNLOCKED. Welcome.✓")
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
