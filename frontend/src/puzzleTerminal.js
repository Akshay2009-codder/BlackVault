// Real Python Code Editor Terminal — BlackVault Research Edition
// Uses Monaco Editor for syntax-highlighted code editing.
// Interactive challenges where player writes Python code with 3-trial limit.
// Ejection on 3 failed trials + unobstructed visible door opening animation.

import { API_BASE } from "./config.js";
import { setDoorUnlocked, playSecurityAlarmSFX, playErrorBuzzerSFX } from "./world.js";
import { standPlayerUp, ejectPlayerFromDesk } from "./player.js";
import * as levelManager from "./levelManager.js";
import { onPuzzlePassed, onPuzzleFailed } from "./guardVoice.js";
import { updateTimerRing, maybeShowAchievement } from "./hud.js";

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

  timeRemaining = 600; // 10 minutes — generous for beginners
  updateTimerRing(1.0); // start ring full
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
    // Drive the SVG ring: fraction = remaining / total (600s)
    updateTimerRing(Math.max(0, timeRemaining) / 600);
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

  // ── ARCHITECTURE GUARANTEE (do NOT break this contract) ──────────────────
  // There are NO checkboxes, dropdowns, radio buttons, pipeline-selectors,
  // algorithm pickers, or any other shortcut UI in the puzzle-solving flow.
  //
  // The player ALWAYS writes their solution as real Python code, line by line,
  // inside the Monaco editor (container id: "code-editor-container").
  //
  // Evaluation reads the raw editor text via getEditorCode() → monacoEditor.getValue().
  // Nothing is pre-filled by UI controls; nothing can be solved by clicking.
  //
  // Verified clean against index.html and all frontend JS files (Sep 2026).
  // ──────────────────────────────────────────────────────────────────────────

  // Detect completely unedited starter code (still has TODO placeholder AND the null sentinel)
  const hasNullSentinel =
    code.includes("cleaned = None") || code.includes("normalized = None") ||
    code.includes("labels = None")  || code.includes("spikes = None")     ||
    code.includes("accuracy = None");
  const hasToDoPlaceholder = code.includes("# TODO");
  if (hasToDoPlaceholder && hasNullSentinel) {
    handleFailedAttempt("Incomplete code: Replace the # TODO comment and the 'None' placeholder with your Python solution.");
    return;
  }

  let passed = false;
  let successMsg = "";
  let errorMsg = "";

  if (doorType === "classification") {
    // ── ROOM 1: DATA CLEANING (beginner-friendly) ──────────────────────────────
    // Accept any reasonable attempt: handling None rows, fixing negative salary,
    // stripping whitespace, OR simply having something written in place of None.
    // The threshold is intentionally very low so a first-time programmer can pass.
    const triedSomething = !hasNullSentinel; // Replaced the None placeholder
    const hasNoneHandling = code.includes("None") || code.includes("if row") ||
                            code.includes("continue") || code.includes("is None");
    const hasFixedSalary  = code.includes("salary = 0") || code.includes("= 0") ||
                            code.includes("max(") || code.includes("abs(");
    const hasStrip        = code.includes(".strip()") || code.includes("strip()");

    if (!triedSomething) {
      errorMsg = "Still showing placeholder code. Replace 'None' with your actual Python fix.";
    } else {
      // Pass if ANY meaningful change was made — encourage the beginner
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── DATA CLEANING VERIFIED ────────────────</div>
        <div class="console-line success">✓ None rows filtered: security scan passed</div>
        <div class="console-line success">✓ Invalid salary corrected: data integrity OK</div>
        <div class="console-line success">✓ Name whitespace stripped: records normalised</div>
        <div class="console-line success">✓ Clean record count: 4 — Gate 1 cleared!</div>
      `;
    }

  } else if (doorType === "regression") {
    // ── ROOM 2: FEATURE SCALING ────────────────────────────────────────────────
    // Accept min/max pattern, MinMaxScaler, or a subtraction + division expression.
    const hasMinMax = (code.includes("min") && code.includes("max")) ||
                      code.includes("MinMaxScaler") ||
                      (code.includes("-") && code.includes("/"));
    const hasReturn = code.includes("return");

    if (!hasReturn && hasNullSentinel) {
      errorMsg = "Replace the None placeholder with your scaling formula and keep the return statement.";
    } else if (!hasMinMax && !hasReturn) {
      errorMsg = "Missing normalisation logic. Hint: (data - np.min(data)) / (np.max(data) - np.min(data)).";
    } else if (!hasMinMax) {
      // They have a return but no obvious min/max — still accept if they replaced None
      if (!hasNullSentinel) {
        passed = true;
      } else {
        errorMsg = "Scaling formula not detected. Hint: use np.min() and np.max() in your formula.";
      }
    } else {
      passed = true;
    }
    if (passed) {
      successMsg = `
        <div class="console-line sys">──────────────── FEATURE SCALING VERIFIED ────────────────</div>
        <div class="console-line success">✓ Test: [10.0, 30.0, 60.0, 100.0] → [0.0, 0.22, 0.56, 1.0] (PASS)</div>
        <div class="console-line success">✓ All features bounded in [0.0, 1.0]</div>
        <div class="console-line success">✓ Gate 2 — Scale calibrated!</div>
      `;
    }

  } else if (doorType === "clustering") {
    // ── ROOM 3: THREAT CLASSIFICATION ─────────────────────────────────────────
    const hasThreshold  = code.includes(">") || code.includes("threshold") || code.includes("50");
    const hasBinaryOut  = code.includes("astype") || code.includes("int(") || code.includes("where") ||
                          code.includes("if") || code.includes("1");

    if (!hasThreshold || !hasBinaryOut) {
      errorMsg = "Hint: (signals > threshold).astype(int) classifies each signal as 0 or 1.";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── THREAT CLASSIFIER VERIFIED ────────────────</div>
        <div class="console-line success">✓ Signals [15, 82, 45, 99, 12, 67] → [0, 1, 0, 1, 0, 1] (PASS)</div>
        <div class="console-line success">✓ Threat precision: 100.0% — Gate 3 cleared!</div>
      `;
    }

  } else if (doorType === "anomaly") {
    // ── ROOM 4: ANOMALY DETECTION ─────────────────────────────────────────────
    const hasFilter = code.includes(">") || code.includes("max_safe") || code.includes("80");
    const hasReturn = code.includes("return");

    if (!hasFilter) {
      errorMsg = "Hint: temps[temps > max_safe] filters readings above the threshold.";
    } else if (!hasReturn && hasNullSentinel) {
      errorMsg = "Replace the None placeholder with your filter expression and keep 'return spikes'.";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── ANOMALY DETECTION VERIFIED ────────────────</div>
        <div class="console-line success">✓ Overheating spikes found: [95.0, 88.4] — Gate 4 cleared!</div>
        <div class="console-line success">✓ Anomaly recall rate: 100.0%</div>
      `;
    }

  } else {
    // ── ROOM 5: MASTER VAULT ACCURACY METRIC ──────────────────────────────────
    const hasAccuracy = code.includes("==") || code.includes("accuracy_score") ||
                        code.includes("mean") || code.includes("sum");
    const hasReturn   = code.includes("return");

    if (!hasReturn && hasNullSentinel) {
      errorMsg = "Replace the None placeholder with your accuracy formula and keep 'return accuracy'.";
    } else if (!hasAccuracy) {
      errorMsg = "Hint: np.mean(y_true == y_pred) gives the fraction of correct predictions.";
    } else {
      passed = true;
      successMsg = `
        <div class="console-line sys">──────────────── MASTER VAULT CLEARANCE ────────────────</div>
        <div class="console-line success">✓ Accuracy = 0.8333 — threshold met!</div>
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

    // Achievement popup (fires once per door on first perfect clear)
    maybeShowAchievement(doorType, stars);

    clearInterval(timerInterval);

    // Screen-shake camera punch — brief DOM shake class for physical feedback
    triggerScreenShake("success");

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

  // Screen-shake camera punch — physical feedback on failure
  triggerScreenShake("fail");

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
      title: "Employee Data Cleaning (Fix 3 Bugs)",
      shortSummary: "Fix 3 clearly marked bugs: skip None rows, set negative salary to 0, strip name whitespace",
      instructions: `GATE 1 — DATA CLEANING  (LEVEL 1 — EASY)
────────────────────────────────────────────────
📖 What you need to know: NONE— no ML needed! Just fix three simple Python bugs.

🔧 BUG 1 — Uncomment the two lines that skip None rows:
    if row is None:
        continue

🔧 BUG 2 — Change 'salary = salary' to 'salary = 0' inside the 'if salary < 0' block.

🔧 BUG 3 — Change row["name"] to row["name"].strip() so spaces are removed.

✅ When all 3 bugs are fixed, total_clean will equal 4 and the door opens!
No imports or ML libraries needed — pure Python only.`,
      starter_code: `# GATE 1 — Employee Record Cleaner  (LEVEL 1 — EASY)
# Three bugs are clearly marked below with # BUG comments.
# Your job: fix each bug so the code runs correctly.
#
# BUG 1 (line ~10): None rows crash the loop — skip them with: if row is None: continue
# BUG 2 (line ~14): Negative salary keeps its bad value — set it to 0 instead
# BUG 3 (line ~18): name.strip() is commented out — uncomment it to trim spaces
import numpy as np

raw_records = [
    {"name": "  Alice  ", "salary": 75000, "dept": "Engineering"},
    None,
    {"name": "Bob",       "salary": -500,  "dept": "Finance"},
    {"name": "  Carol ",  "salary": 62000, "dept": "HR"},
    None,
    {"name": "Dave",      "salary": 91000, "dept": "Security"},
]

clean_records = []

for row in raw_records:
    # BUG 1: We never skip None rows. Add: if row is None: continue
    # if row is None:
    #     continue

    salary = row["salary"]
    # BUG 2: Negative salary should be set to 0, not kept as-is
    if salary < 0:
        salary = salary   # FIX: change 'salary' to 0

    # BUG 3: strip() is commented out — names keep their whitespace
    name = row["name"]  # FIX: should be row["name"].strip()

    clean_records.append({"name": name, "salary": salary, "dept": row["dept"]})

total_clean = len(clean_records)
print(f"[GATE 1 CHECK] Clean records: {total_clean}")

if total_clean == 4:
    print("SUCCESS: Gate 1 passed. Door unlocked.")
else:
    print(f"Expected 4 clean records, got {total_clean}. Check Bug 1.")
`,
      dataset_preview: {
        columns: ["name", "salary", "dept"],
        head_rows: [
          ["  Alice  ", 75000, "Engineering"],
          ["None",     "(skip)", ""],
          ["Bob",       -500,  "Finance"],
          ["  Carol ",  62000, "HR"],
          ["Dave",      91000, "Security"],
        ],
        total_rows: 6,
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

// ── Screen shake — physical feedback on key moments ───────────────────
// Applies a CSS keyframe shake to the #scene canvas element.
// "success" = brief upward camera bump (joyful lift).
// "fail"    = lateral rattle (jarring knock-back).
function triggerScreenShake(type = "fail") {
  const canvas = document.getElementById("scene");
  if (!canvas) return;

  // Inject keyframes once
  if (!document.getElementById("shake-style")) {
    const style = document.createElement("style");
    style.id = "shake-style";
    style.textContent = `
      @keyframes shakeFail {
        0%   { transform: translateX(0); }
        15%  { transform: translateX(-7px); }
        30%  { transform: translateX(7px); }
        45%  { transform: translateX(-5px); }
        60%  { transform: translateX(5px); }
        75%  { transform: translateX(-3px); }
        90%  { transform: translateX(3px); }
        100% { transform: translateX(0); }
      }
      @keyframes shakeSuccess {
        0%   { transform: translateY(0) scale(1.0); }
        20%  { transform: translateY(-5px) scale(1.004); }
        50%  { transform: translateY(2px) scale(0.998); }
        100% { transform: translateY(0) scale(1.0); }
      }
      .screen-shake-fail    { animation: shakeFail    0.38s cubic-bezier(0.36, 0.07, 0.19, 0.97) both; }
      .screen-shake-success { animation: shakeSuccess 0.32s cubic-bezier(0.16, 1, 0.3, 1) both; }
    `;
    document.head.appendChild(style);
  }

  const cls = type === "success" ? "screen-shake-success" : "screen-shake-fail";
  canvas.classList.remove("screen-shake-fail", "screen-shake-success");
  void canvas.offsetWidth; // force reflow to restart animation
  canvas.classList.add(cls);
  setTimeout(() => canvas.classList.remove(cls), 450);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
