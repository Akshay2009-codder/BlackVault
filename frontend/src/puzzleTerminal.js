// Real Python Code Editor Terminal
// Uses Monaco Editor for syntax-highlighted code editing.
// Player writes actual Python code line by line — no checkboxes.

import { API_BASE } from "./config.js";
import { setDoorUnlocked } from "./world.js";
import { standPlayerUp } from "./player.js";
import * as levelManager from "./levelManager.js";
import { onPuzzlePassed, onPuzzleFailed } from "./guardVoice.js";

let activePuzzle = null;
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
      // Define a high-contrast, vibrant IDE theme
      window.monaco.editor.defineTheme("blackvault-vibrant", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: "64748b", fontStyle: "italic" },
          { token: "keyword", foreground: "38bdf8", fontStyle: "bold" },
          { token: "string", foreground: "4ade80" },
          { token: "number", foreground: "fbbf24" },
          { token: "type", foreground: "f472b6" },
          { token: "identifier", foreground: "f8fafc" },
          { token: "delimiter", foreground: "a855f7" },
        ],
        colors: {
          "editor.background": "#0f172a",
          "editor.foreground": "#f8fafc",
          "editor.lineHighlightBackground": "#1e293b",
          "editorCursor.foreground": "#38bdf8",
          "editor.selectionBackground": "#0284c744",
          "editorLineNumber.foreground": "#475569",
          "editorLineNumber.activeForeground": "#38bdf8",
          "editor.inactiveSelectionBackground": "#1e293b",
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

  // Destroy existing editor
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
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

    // Ctrl+Enter / Shift+F10 to submit
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
  const ide = document.getElementById("pycharm-ide");
  if (!ide) return;

  // Wait for Monaco to be ready
  await initMonaco();

  ide.classList.remove("hidden");

  // Release pointer lock for typing
  if (document.exitPointerLock) document.exitPointerLock();

  // Reset console
  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML = `
      <div class="console-line sys">Connecting to BlackVault ML Engine...</div>
      <div class="console-line info">Loading ${doorType.toUpperCase()} challenge data...</div>
    `;
  }

  // Request puzzle from backend
  try {
    const res = await fetch(`${API_BASE}/api/door/open`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: currentRoomIndex, door_type: doorType }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    activePuzzle = data;
    timeRemaining = data.time_limit_seconds || 300;
    attemptsRemaining = data.max_attempts_remaining || 5;

    // Display problem statement
    const problemEl = document.getElementById("problem-statement");
    if (problemEl) {
      problemEl.textContent = data.problem_statement || `Challenge: ${doorType.toUpperCase()}`;
    }

    // Set the tab label
    const tabLabel = document.getElementById("ide-tab-label");
    if (tabLabel) tabLabel.textContent = `solve_${doorType}.py`;

    // Create Monaco Editor with starter code
    createEditor(data.starter_code || `# Write your ${doorType} solution here\n`);

    // Render dataset preview
    renderDatasetPreview(data.dataset_preview);

    updateTimerDisplay();
    updateAttemptsDisplay();
    startTimer();

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line success">Dataset loaded: ${data.dataset_preview?.total_rows || 200} samples, ${data.dataset_preview?.columns?.length || 5} features</div>
        <div class="console-line warning">Write your Python code and press Run ▶ (Ctrl+Enter)</div>
      `;
    }
  } catch (err) {
    console.error("[Terminal] Failed to open door puzzle:", err);
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line error">[ERROR] ${err.message}. Using offline mode.</div>`;
    }

    // Offline fallback
    activePuzzle = {
      puzzle_id: `offline-${doorType}-${Date.now()}`,
      door_type: doorType,
      level: currentRoomIndex,
      dataset_preview: {
        columns: ["feature_1", "feature_2", "feature_3", "target"],
        head_rows: [
          [0.82, 1.45, -0.22, 1],
          [0.15, null, 0.65, 0],
          [-1.20, 0.44, 0.88, 1],
        ],
        total_rows: 300,
      },
    };

    const starterCode = getDefaultStarterCode(doorType);
    createEditor(starterCode);

    const problemEl = document.getElementById("problem-statement");
    if (problemEl) {
      problemEl.textContent = `OFFLINE MODE: ${doorType.toUpperCase()} Challenge\nWrite a Python function to solve this ${doorType} problem.\nSee the dataset preview below for the data format.`;
    }

    timeRemaining = 300;
    attemptsRemaining = 5;
    updateTimerDisplay();
    startTimer();
    renderDatasetPreview(activePuzzle.dataset_preview);
  }
}

function getDefaultStarterCode(doorType) {
  const starters = {
    classification: `import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

def predict(train_df, test_df, target_col):
    y_train = train_df[target_col]
    X_train = train_df.drop(columns=[target_col])
    
    # TODO: Clean data, handle missing values
    # TODO: Train a classifier
    # TODO: Return predictions for test_df
    pass
`,
    regression: `import numpy as np
import pandas as pd
from sklearn.linear_model import Ridge

def predict(train_df, test_df, target_col):
    y_train = train_df[target_col]
    X_train = train_df.drop(columns=[target_col])
    
    # TODO: Clean and scale features
    # TODO: Train a regressor
    # TODO: Return predictions for test_df
    pass
`,
    clustering: `import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

def cluster(feature_df):
    # TODO: Clean and scale features
    # TODO: Fit a clustering model
    # TODO: Return cluster labels
    pass
`,
    anomaly: `import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

def detect(feature_df):
    # TODO: Clean and scale features
    # TODO: Fit anomaly detector
    # TODO: Return 0 (normal) / 1 (anomaly) labels
    pass
`,
    mystery: `import numpy as np
import pandas as pd

# MYSTERY: Inspect the data and determine the problem type!
# Then define the correct function:
#   predict(train_df, test_df, target_col) - classification/regression
#   cluster(feature_df) - clustering
#   detect(feature_df) - anomaly detection
pass
`,
  };
  return starters[doorType] || starters.classification;
}

export function closeTerminal() {
  const ide = document.getElementById("pycharm-ide");
  if (ide) ide.classList.add("hidden");

  clearInterval(timerInterval);
  timerInterval = null;

  // Dispose Monaco Editor to free memory
  if (monacoEditor) {
    monacoEditor.dispose();
    monacoEditor = null;
  }

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

// ── Submit Code ──────────────────────────────────────────────────────
async function submitCode() {
  if (!activePuzzle) return;

  const code = getEditorCode();
  if (!code || !code.trim()) {
    const consoleOut = document.getElementById("terminal-result");
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line error">No code to run. Write your solution first!</div>`;
    }
    return;
  }

  const submitBtn = document.getElementById("submit-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Running...";
  }

  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line sys">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="console-line info">▶ Executing code in sandbox...</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  try {
    const res = await fetch(`${API_BASE}/api/door/submit_code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzle_id: activePuzzle.puzzle_id,
        code: code,
        time_remaining_seconds: timeRemaining,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    handleResult(data);
  } catch (err) {
    console.warn("[Terminal] Falling back to offline verification:", err);
    // Offline fallback — basic code inspection
    fallbackVerification(code);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "▶ Run & Submit (Ctrl+Enter)";
    }
  }
}

function handleResult(result) {
  const consoleOut = document.getElementById("terminal-result");
  attemptsRemaining = result.attempts_remaining !== undefined ? result.attempts_remaining : attemptsRemaining - 1;
  updateAttemptsDisplay();

  if (result.passed) {
    const stars = result.stars || 3;
    const starStr = "★".repeat(stars) + "☆".repeat(3 - stars);

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line success">✓ PASSED: Score = ${Number(result.score).toFixed(4)} (Target: ${Number(result.target).toFixed(4)})</div>
        <div class="console-line success">★ Rating: ${starStr} (${stars} Stars)</div>
        <div class="console-line success">🔓 SECURITY DOOR UNLOCKED!</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    const doorType = result.door_type || activePuzzle.door_type;
    setDoorUnlocked(doorType);
    onPuzzlePassed(stars);
    levelManager.recordDoorSuccess(doorType, stars, currentRoomIndex);

    // Show cleared banner
    showSectorClearedBanner(doorType, stars);

    clearInterval(timerInterval);

    // Auto-close after 3 seconds
    setTimeout(() => closeTerminal(), 3000);
  } else {
    if (consoleOut) {
      const errorMsg = result.error_message || "Score did not meet the target threshold.";
      consoleOut.innerHTML += `
        <div class="console-line error">❌ FAILED: Score = ${Number(result.score).toFixed(4)} (Target: ${Number(result.target).toFixed(4)})</div>
        <div class="console-line error">${escapeHtml(errorMsg)}</div>
        <div class="console-line warning">Fix your code and try again. Attempts remaining: ${attemptsRemaining}</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }
    onPuzzleFailed();
  }
}

function fallbackVerification(code) {
  const doorType = activePuzzle?.door_type || "classification";
  let passed = false;

  // Basic checks: has the right function defined and returns something
  if (doorType === "clustering") {
    passed = code.includes("def cluster") && (code.includes("fit_predict") || code.includes("fit("));
  } else if (doorType === "anomaly") {
    passed = code.includes("def detect") && code.includes("IsolationForest");
  } else {
    passed = code.includes("def predict") && (code.includes(".fit(") || code.includes(".fit_predict"));
  }

  handleResult({
    passed,
    score: passed ? 0.88 : 0.42,
    target: 0.70,
    higher_is_better: true,
    attempts_used: 1,
    attempts_remaining: attemptsRemaining - 1,
    door_type: doorType,
    stars: passed ? 3 : null,
    error_message: passed ? null : "Offline check: Your code doesn't define the required function correctly.",
  });
}

function showSectorClearedBanner(doorType, stars) {
  const banner = document.getElementById("sector-cleared-banner");
  const title = document.getElementById("cleared-title");
  const desc = document.getElementById("cleared-desc");

  if (!banner) return;

  if (title) title.textContent = `${doorType.toUpperCase()} Door Cleared! (${"★".repeat(stars)})`;
  if (desc) desc.textContent = `Security bulkhead opened. Walk through to proceed.`;

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
