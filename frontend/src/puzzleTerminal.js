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

// ── Step Chips Progression UI ─────────────────────────────────────────
export function updateStepChips(step) {
  for (let i = 1; i <= 3; i++) {
    const chip = document.getElementById(`chip-step-${i}`);
    if (!chip) continue;
    chip.classList.remove("active", "completed", "locked");
    const numEl = chip.querySelector(".chip-num");
    if (i < step) {
      chip.classList.add("completed");
      if (numEl) numEl.textContent = "✓";
    } else if (i === step) {
      chip.classList.add("active");
      if (numEl) numEl.textContent = String(i);
    } else {
      chip.classList.add("locked");
      if (numEl) numEl.textContent = String(i);
    }
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
      <div class="console-line sys">Connecting to BlackVault Terminal Engine...</div>
      <div class="console-line info">Sector: ${doorType.toUpperCase()} // Initializing Step 1 (Data Cleaning)...</div>
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

    // Display Step 1 problem statement
    const problemEl = document.getElementById("problem-statement");
    if (problemEl) {
      problemEl.textContent = data.problem_statement || getOfflineStepInfo(doorType, 1).instructions;
    }

    // Set tab label
    const tabLabel = document.getElementById("ide-tab-label");
    if (tabLabel) tabLabel.textContent = `step1_clean_${doorType}.py`;

    // Create Monaco Editor with Step 1 starter code
    createEditor(data.starter_code || getOfflineStepInfo(doorType, 1).starter_code);

    // Render dataset preview
    renderDatasetPreview(data.dataset_preview);

    updateTimerDisplay();
    updateAttemptsDisplay();
    startTimer();

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line success">Dataset loaded: ${data.dataset_preview?.total_rows || 200} samples, ${data.dataset_preview?.columns?.length || 5} features</div>
        <div class="console-line warning">💡 Step 1: Clean missing values & duplicates. Press ▶ Run (Ctrl+Enter) to evaluate.</div>
      `;
    }
  } catch (err) {
    console.warn("[Terminal] Using offline tiered mode:", err.message);
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line success">Connected in Offline Mode. Step 1 starter code ready!</div>`;
    }

    // Offline tiered setup
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
          [0.82, 1.45, -0.22, 1], // Duplicate row to clean!
          [0.45, -0.62, null, 0],
        ],
        total_rows: 300,
      },
    };

    const step1Data = getOfflineStepInfo(doorType, 1);
    createEditor(step1Data.starter_code);

    const problemEl = document.getElementById("problem-statement");
    if (problemEl) {
      problemEl.textContent = step1Data.instructions;
    }

    const tabLabel = document.getElementById("ide-tab-label");
    if (tabLabel) tabLabel.textContent = `step1_clean_${doorType}.py`;

    timeRemaining = 450;
    attemptsRemaining = 10;
    updateTimerDisplay();
    startTimer();
    renderDatasetPreview(activePuzzle.dataset_preview);
  }
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

// ── Submit Code (Gated Step-by-Step) ─────────────────────────────────
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
    submitBtn.textContent = "⏳ Running Step " + currentStep + "...";
  }

  const consoleOut = document.getElementById("terminal-result");
  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line sys">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      <div class="console-line info">▶ Validating Step ${currentStep} in ML Sandbox...</div>
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
        step: currentStep,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Server error ${res.status}`);
    }

    const data = await res.json();
    handleResult(data);
  } catch (err) {
    console.warn("[Terminal] Falling back to offline tiered verification:", err);
    fallbackVerification(code);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "▶ Run & Submit (Ctrl+Enter)";
    }
  }
}

// ── Handle Result & Gated Transitions ─────────────────────────────────
function handleResult(result) {
  const consoleOut = document.getElementById("terminal-result");
  attemptsRemaining = result.attempts_remaining !== undefined ? result.attempts_remaining : attemptsRemaining - 1;
  updateAttemptsDisplay();

  const doorType = result.door_type || activePuzzle?.door_type || "classification";

  if (result.step_passed) {
    // Check if there is a next gated step (e.g., Step 1 -> 2, Step 2 -> 3)
    if (result.next_step && result.next_step > currentStep) {
      const passedStep = currentStep;
      currentStep = result.next_step;
      updateStepChips(currentStep);

      const stepTitles = {
        1: "Data Cleaning (Duplicate Removal & Median Imputation)",
        2: "Feature Engineering & Scaling (One-Hot & Scaler)",
        3: "Model Training & Evaluation",
      };

      if (consoleOut) {
        consoleOut.innerHTML += `
          <div class="console-line success">✓ STEP ${passedStep} PASSED: ${stepTitles[passedStep]}!</div>
          <div class="console-line info">🔓 UNLOCKED STEP ${currentStep}: ${stepTitles[currentStep]}</div>
          <div class="console-line warning">💡 Editor template updated for Step ${currentStep}. Review instructions and proceed!</div>
        `;
        consoleOut.scrollTop = consoleOut.scrollHeight;
      }

      // Update Tab Label
      const tabLabel = document.getElementById("ide-tab-label");
      if (tabLabel) {
        tabLabel.textContent = `step${currentStep}_${doorType}.py`;
      }

      // Update problem statement
      if (result.next_instructions) {
        const problemEl = document.getElementById("problem-statement");
        if (problemEl) problemEl.textContent = result.next_instructions;
      }

      // Update editor code with new starter template
      if (result.next_starter_code) {
        setEditorCode(result.next_starter_code);
      }

      return;
    }

    // All steps passed! (Step 3 completed successfully)
    if (result.passed) {
      updateStepChips(4); // All 3 chips marked completed
      const stars = result.stars || 3;
      const starStr = "★".repeat(stars) + "☆".repeat(3 - stars);

      if (consoleOut) {
        consoleOut.innerHTML += `
          <div class="console-line success">✓ ALL 3 STEPS COMPLETED! Score = ${Number(result.score || 1.0).toFixed(4)} (Target: ${Number(result.target || 0.75).toFixed(4)})</div>
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

      // Auto-close terminal after 2.8 seconds to showcase the cinematic opening
      setTimeout(() => closeTerminal(), 2800);
      return;
    }
  }

  // If failed
  if (consoleOut) {
    const errorMsg = result.error_message || `Code output did not satisfy requirements for Step ${currentStep}.`;
    consoleOut.innerHTML += `
      <div class="console-line error">❌ STEP ${currentStep} FAILED: ${escapeHtml(errorMsg)}</div>
      <div class="console-line warning">Check requirements and try again. Attempts remaining: ${attemptsRemaining}</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }
  onPuzzleFailed();
}

// ── Offline Tiered Fallback Verification ──────────────────────────────
function fallbackVerification(code) {
  const doorType = activePuzzle?.door_type || "classification";

  if (currentStep === 1) {
    // Step 1: Data Cleaning (drop_duplicates, fillna)
    const hasDef = code.includes("def clean_data") || code.includes("def clean");
    const hasDupes = code.includes("drop_duplicates");
    const hasFill = code.includes("fillna") || code.includes("imputer") || code.includes("SimpleImputer");

    if (hasDef && (hasDupes || hasFill)) {
      const step2Data = getOfflineStepInfo(doorType, 2);
      handleResult({
        step_passed: true,
        passed: true,
        step: 1,
        next_step: 2,
        door_type: doorType,
        attempts_remaining: attemptsRemaining - 1,
        next_instructions: step2Data.instructions,
        next_starter_code: step2Data.starter_code,
      });
    } else {
      handleResult({
        step_passed: false,
        passed: false,
        step: 1,
        door_type: doorType,
        attempts_remaining: attemptsRemaining - 1,
        error_message: "Step 1 Requirement: Define def clean_data(df) calling df.drop_duplicates() and df.fillna(...).",
      });
    }
  } else if (currentStep === 2) {
    // Step 2: Feature Work & Scaling (pd.get_dummies, StandardScaler)
    const hasDef = code.includes("def preprocess_features") || code.includes("def preprocess");
    const hasDummies = code.includes("get_dummies") || code.includes("OneHotEncoder");
    const hasScaler = code.includes("StandardScaler") || code.includes("MinMaxScaler") || code.includes("scaler");

    if (hasDef && (hasDummies || hasScaler)) {
      const step3Data = getOfflineStepInfo(doorType, 3);
      handleResult({
        step_passed: true,
        passed: true,
        step: 2,
        next_step: 3,
        door_type: doorType,
        attempts_remaining: attemptsRemaining - 1,
        next_instructions: step3Data.instructions,
        next_starter_code: step3Data.starter_code,
      });
    } else {
      handleResult({
        step_passed: false,
        passed: false,
        step: 2,
        door_type: doorType,
        attempts_remaining: attemptsRemaining - 1,
        error_message: "Step 2 Requirement: Define def preprocess_features(df) using pd.get_dummies() and StandardScaler.",
      });
    }
  } else {
    // Step 3: Model Training
    let passed = false;
    if (doorType === "clustering") {
      passed = (code.includes("def cluster") || code.includes("KMeans")) && (code.includes("fit_predict") || code.includes(".fit("));
    } else if (doorType === "anomaly") {
      passed = (code.includes("def detect") || code.includes("IsolationForest")) && code.includes("fit");
    } else {
      passed = (code.includes("def predict") || code.includes("Classifier") || code.includes("Regressor")) && (code.includes(".fit(") || code.includes("fit_predict"));
    }

    handleResult({
      step_passed: passed,
      passed: passed,
      step: 3,
      score: passed ? 0.91 : 0.42,
      target: 0.70,
      higher_is_better: true,
      attempts_used: 1,
      attempts_remaining: attemptsRemaining - 1,
      door_type: doorType,
      stars: passed ? 3 : null,
      error_message: passed ? null : "Step 3 Requirement: Train your model using .fit() and return predictions.",
    });
  }
}

// ── Offline Step Templates & Instructions ─────────────────────────────
function getOfflineStepInfo(doorType, step) {
  if (step === 1) {
    return {
      step: 1,
      instructions: `SECURITY GATE: ${doorType.toUpperCase()} // STEP 1: DATA CLEANING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The incoming sensor dataset is dirty: it contains duplicate rows and missing values.
Your objective for Step 1 is simple: CLEAN THE DATA.

Define a function clean_data(df) that:
  1. Removes duplicate records (df.drop_duplicates())
  2. Fills missing values with column median/mean (df.fillna(...))
  3. Returns the cleaned DataFrame.

✓ Only data cleaning is required to pass Step 1!
  Feature engineering and model training will unlock in Step 2.`,
      starter_code: `import numpy as np
import pandas as pd

def clean_data(df):
    """
    Step 1: Data Cleaning
    - Remove duplicate rows
    - Fill missing values with numeric median or mean
    Return the cleaned DataFrame.
    """
    # 1. Remove duplicate records
    df_clean = df.drop_duplicates()

    # 2. Impute missing values
    df_clean = df_clean.fillna(df_clean.median(numeric_only=True))

    return df_clean
`,
    };
  } else if (step === 2) {
    return {
      step: 2,
      instructions: `SECURITY GATE: ${doorType.toUpperCase()} // STEP 2: FEATURE ENGINEERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Step 1 Complete! Now prepare the features for machine learning.
Goal: Write preprocess_features(df) to:
  1. Encode categorical columns (pd.get_dummies(df, drop_first=True))
  2. Scale features with StandardScaler or MinMaxScaler
  3. Return the scaled feature matrix.

✓ Only feature work is required to pass Step 2!
  Model training and evaluation will unlock in Step 3.`,
      starter_code: `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

# Reusable Step 1 cleaner:
def clean_data(df):
    df_clean = df.drop_duplicates()
    return df_clean.fillna(df_clean.median(numeric_only=True))

def preprocess_features(df):
    """
    Step 2: Feature Engineering & Scaling
    - One-hot encode categorical features (pd.get_dummies)
    - Scale features using StandardScaler
    Return the scaled feature array or DataFrame.
    """
    # 1. Encode categorical columns if any
    df_encoded = pd.get_dummies(df, drop_first=True)

    # 2. Scale features
    scaler = StandardScaler()
    scaled = scaler.fit_transform(df_encoded)

    return scaled
`,
    };
  } else {
    let starter = "";
    if (doorType === "clustering") {
      starter = `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def cluster(feature_df):
    """
    Step 3: Model Training & Evaluation
    Cluster the data and return cluster labels (0, 1, 2).
    """
    clean_df = clean_data(feature_df)
    scaler = StandardScaler()
    X = scaler.fit_transform(pd.get_dummies(clean_df, drop_first=True))

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    return kmeans.fit_predict(X)
`;
    } else if (doorType === "anomaly") {
      starter = `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def detect(feature_df):
    """
    Step 3: Model Training & Evaluation
    Detect anomalies in sensor data. Return 0 for normal, 1 for anomaly.
    """
    clean_df = clean_data(feature_df)
    scaler = StandardScaler()
    X = scaler.fit_transform(pd.get_dummies(clean_df, drop_first=True))

    iso = IsolationForest(contamination=0.1, random_state=42)
    raw_preds = iso.fit_predict(X)
    return [1 if p == -1 else 0 for p in raw_preds]
`;
    } else {
      starter = `import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier

def clean_data(df):
    return df.drop_duplicates().fillna(df.median(numeric_only=True))

def predict(train_df, test_df, target_col):
    """
    Step 3: Model Training & Evaluation
    Use your cleaned features from Steps 1 & 2 to train the model.
    Return predictions for test_df.
    """
    # 1. Clean train data
    clean_train = clean_data(train_df)
    y_train = clean_train[target_col]
    X_train_raw = clean_train.drop(columns=[target_col])

    # 2. One-hot encode & scale
    X_train_enc = pd.get_dummies(X_train_raw, drop_first=True)
    X_test_enc = pd.get_dummies(test_df, drop_first=True)
    X_train_enc, X_test_enc = X_train_enc.align(X_test_enc, join="left", axis=1, fill_value=0)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_enc)
    X_test_scaled = scaler.transform(X_test_enc)

    # 3. Train model
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X_train_scaled, y_train)

    # 4. Predict
    return clf.predict(X_test_scaled)
`;
    }

    return {
      step: 3,
      instructions: `SECURITY GATE: ${doorType.toUpperCase()} // STEP 3: MODEL TRAINING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Steps 1 & 2 passed! Now build the final model pipeline.
Goal: Train the ML model to achieve the target evaluation metric.
Once Step 3 passes, the security bulkhead door will unlock!`,
      starter_code: starter,
    };
  }
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
