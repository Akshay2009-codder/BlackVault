// PyCharm ML Code Editor & Terminal Controller
// Handles IDE window events, problem diagnostics in RED text,
// real-time Python pipeline execution console, and door unlocking.

import { API_BASE } from "./config.js";
import { setDoorUnlocked } from "./world.js";
import { standPlayerUp, getControls } from "./player.js";
import * as levelManager from "./levelManager.js";
import { onPuzzlePassed, onPuzzleFailed } from "./guardVoice.js";

let activePuzzle = null;
let timerInterval = null;
let timeRemaining = 0;
let attemptsRemaining = 0;
let currentRoomIndex = 1;

const ALGORITHMS_BY_TYPE = {
  classification: [
    { value: "random_forest", label: "RandomForestClassifier(n_estimators=100)" },
    { value: "logistic_regression", label: "LogisticRegression(max_iter=500)" },
    { value: "xgboost", label: "XGBClassifier(learning_rate=0.1)" },
    { value: "gradient_boosting", label: "GradientBoostingClassifier()" },
  ],
  regression: [
    { value: "random_forest", label: "RandomForestRegressor(n_estimators=100)" },
    { value: "linear_regression", label: "Ridge(alpha=1.0)" },
    { value: "xgboost", label: "XGBRegressor(max_depth=5)" },
    { value: "gradient_boosting", label: "GradientBoostingRegressor()" },
  ],
  clustering: [
    { value: "kmeans", label: "KMeans(n_clusters=3, n_init='auto')" },
    { value: "dbscan", label: "DBSCAN(eps=0.5, min_samples=5)" },
  ],
  anomaly: [
    { value: "isolation_forest", label: "IsolationForest(contamination=0.1)" },
    { value: "local_outlier_factor", label: "LocalOutlierFactor(novelty=True)" },
  ],
  mystery: [
    { value: "random_forest", label: "RandomForestClassifier(n_estimators=100)" },
    { value: "xgboost", label: "XGBClassifier(learning_rate=0.1)" },
  ],
};

const RED_PROBLEM_DIAGNOSTICS = {
  classification: {
    title: "CRITICAL ERROR: High Data Corruption & Classification Sub-threshold",
    desc: "The sector data contains unhandled dirty/duplicate rows. The baseline model fails the classification target metric (Accuracy/F1). Fix data preprocessing and select an optimal tree-based classifier.",
    errorMsg: "ClassificationAccuracyWarning: Target metric not reached. Corrupted rows detected in feature matrix.",
  },
  regression: {
    title: "CRITICAL ERROR: Severe Target Non-Linearity & RMSE Penalty",
    desc: "Target values have extreme outliers and missing feature entries. Baseline linear regression fails the RMSE ceiling. Enable feature standardization, impute missing values, and configure an ensemble regressor.",
    errorMsg: "RegressionResidualsError: High RMSE exceeding security tolerance threshold.",
  },
  clustering: {
    title: "CRITICAL ERROR: Cluster Overlap & Low Silhouette Coefficient",
    desc: "Unscaled feature dimensions cause dimensional distortion, dropping silhouette score below the security lock requirement. Scale all features and configure KMeans / DBSCAN cluster centers.",
    errorMsg: "ClusteringQualityWarning: Silhouette score sub-optimal. Feature scaling required.",
  },
  anomaly: {
    title: "CRITICAL ERROR: High Threat Infiltration & Undetected Outliers",
    desc: "Injected anomaly attack patterns bypassed detection. Baseline filter recall is below safety threshold. Configure IsolationForest / LOF with precise contamination ratio.",
    errorMsg: "SecurityThreatBreach: Outlier detection recall below minimum security requirement.",
  },
  mystery: {
    title: "CRITICAL ERROR: Core Vault Quantum Encryption Protocol",
    desc: "Multi-modal corrupted feature vectors blocking core terminal. Apply full preprocessing pipeline and optimal gradient booster.",
    errorMsg: "CoreEncryptionLockout: All pipeline stages require optimization.",
  },
};

export function initTerminalUI() {
  // Generate Line Numbers for PyCharm Gutter
  const gutter = document.getElementById("line-gutter");
  if (gutter) {
    let gutterHtml = "";
    for (let i = 1; i <= 24; i++) {
      gutterHtml += `<div>${i}</div>`;
    }
    gutter.innerHTML = gutterHtml;
  }

  // PyCharm Window Controls
  const closeBtn = document.getElementById("pycharm-close");
  if (closeBtn) closeBtn.addEventListener("click", closeTerminal);

  const minBtn = document.getElementById("pycharm-minimize");
  if (minBtn) minBtn.addEventListener("click", closeTerminal);

  // PyCharm Run Toolbar & Console
  const runBtn = document.getElementById("run-btn");
  if (runBtn) runBtn.addEventListener("click", submitPipeline);

  // Tab switching: pipeline.py vs dataset.csv
  const tabPipeline = document.getElementById("tab-pipeline");
  const tabDataset = document.getElementById("tab-dataset");
  const filePipeline = document.getElementById("file-pipeline-py");
  const fileDataset = document.getElementById("file-dataset-csv");
  const codeEditor = document.getElementById("code-editor");
  const datasetView = document.getElementById("dataset-preview-view");

  function showPipelineTab() {
    tabPipeline?.classList.add("active");
    tabDataset?.classList.remove("active");
    filePipeline?.classList.add("active");
    fileDataset?.classList.remove("active");
    codeEditor?.classList.remove("hidden");
    datasetView?.classList.add("hidden");
  }

  function showDatasetTab() {
    tabDataset?.classList.add("active");
    tabPipeline?.classList.remove("active");
    fileDataset?.classList.add("active");
    filePipeline?.classList.remove("active");
    codeEditor?.classList.add("hidden");
    datasetView?.classList.remove("hidden");
  }

  tabPipeline?.addEventListener("click", showPipelineTab);
  filePipeline?.addEventListener("click", showPipelineTab);
  tabDataset?.addEventListener("click", showDatasetTab);
  fileDataset?.addEventListener("click", showDatasetTab);

  // Dock Tabs: Problems vs Run Console
  const dockTabProblems = document.getElementById("dock-tab-problems");
  const dockTabRun = document.getElementById("dock-tab-run");
  const runConsole = document.getElementById("run-console");
  const problemsView = document.getElementById("problems-view");

  dockTabProblems?.addEventListener("click", () => {
    dockTabProblems.classList.add("active");
    dockTabRun?.classList.remove("active");
    problemsView?.classList.remove("hidden");
    runConsole?.classList.add("hidden");
  });

  dockTabRun?.addEventListener("click", () => {
    dockTabRun.classList.add("active");
    dockTabProblems?.classList.remove("active");
    runConsole?.classList.remove("hidden");
    problemsView?.classList.add("hidden");
  });

  // Algorithm change handler
  const algoSelect = document.getElementById("opt-algorithm");
  if (algoSelect) {
    algoSelect.addEventListener("change", (e) => {
      renderExtraParams(e.target.value);
    });
  }

  // Keyboard shortcut: Shift+F10 or Ctrl+Enter to Run
  document.addEventListener("keydown", (e) => {
    const pycharm = document.getElementById("pycharm-ide");
    if (pycharm && !pycharm.classList.contains("hidden")) {
      if ((e.shiftKey && e.code === "F10") || (e.ctrlKey && e.code === "Enter")) {
        e.preventDefault();
        submitPipeline();
      }
      if (e.code === "Escape") {
        closeTerminal();
      }
    }
  });
}

export async function openTerminal(doorType, roomIndex = 1) {
  currentRoomIndex = roomIndex || 1;
  const pycharm = document.getElementById("pycharm-ide");
  if (!pycharm) return;

  pycharm.classList.remove("hidden");

  // Update IDE title & metadata
  const titleEl = document.getElementById("ide-project-title");
  if (titleEl) {
    titleEl.textContent = `pipeline.py — [Sector 0${currentRoomIndex}: ${doorType.toUpperCase()}] — PyCharm 2024.2`;
  }

  // Set Red Problem Diagnostics
  const diag = RED_PROBLEM_DIAGNOSTICS[doorType] || RED_PROBLEM_DIAGNOSTICS.classification;
  const problemTitle = document.getElementById("problem-banner-title");
  const problemDesc = document.getElementById("problem-banner-desc");
  const probMsgText = document.getElementById("prob-msg-text");

  if (problemTitle) problemTitle.textContent = diag.title;
  if (problemDesc) problemDesc.textContent = diag.desc;
  if (probMsgText) probMsgText.textContent = diag.errorMsg;

  // Clear Console
  const consoleOut = document.getElementById("console-output");
  if (consoleOut) {
    consoleOut.innerHTML = `
      <div class="console-line sys">Sector 0${currentRoomIndex} Data Socket Connected...</div>
      <div class="console-line info">Connecting to backend ML engine: ${API_BASE}...</div>
    `;
  }

  // Populate Algorithm dropdown for this door type
  populateAlgorithms(doorType);

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

    updateTimerDisplay();
    updateAttemptsDisplay();
    startTimer();
    renderDatasetPreview(data.dataset_preview);

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line sys">Dataset Loaded: ${data.dataset_preview?.total_rows || 200} samples across ${data.dataset_preview?.columns?.length || 5} features.</div>
        <div class="console-line error"># ERROR DETECTED: Fix the pipeline below and press Run ▶</div>
      `;
    }
  } catch (err) {
    console.error("[PyCharm] Failed to open door puzzle:", err);
    if (consoleOut) {
      consoleOut.innerHTML += `<div class="console-line error">[CRITICAL] Backend Connection Error: ${err.message}. Using offline sandbox.</div>`;
    }
    // Fallback sandbox
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
          [0.82, 1.45, -0.22, 1],
        ],
        total_rows: 300,
      },
    };
    timeRemaining = 300;
    attemptsRemaining = 5;
    updateTimerDisplay();
    startTimer();
    renderDatasetPreview(activePuzzle.dataset_preview);
  }
}

export function closeTerminal() {
  const pycharm = document.getElementById("pycharm-ide");
  if (pycharm) pycharm.classList.add("hidden");

  clearInterval(timerInterval);
  timerInterval = null;

  // Stand player up in front of the computer
  standPlayerUp();
}

function populateAlgorithms(doorType) {
  const select = document.getElementById("opt-algorithm");
  if (!select) return;

  const algos = ALGORITHMS_BY_TYPE[doorType] || ALGORITHMS_BY_TYPE.classification;
  select.innerHTML = algos
    .map((a) => `<option value="${a.value}">${a.label}</option>`)
    .join("");

  renderExtraParams(algos[0]?.value);
}

function renderExtraParams(algoValue) {
  const container = document.getElementById("opt-extra-params");
  if (!container) return;

  if (algoValue === "random_forest") {
    container.innerHTML = `
      <label class="ide-select-row">
        <span>n_estimators:</span>
        <select id="param-n-estimators" class="ide-select">
          <option value="50">50 trees</option>
          <option value="100" selected>100 trees</option>
          <option value="200">200 trees</option>
        </select>
      </label>
    `;
  } else if (algoValue === "kmeans") {
    container.innerHTML = `
      <label class="ide-select-row">
        <span>n_clusters:</span>
        <select id="param-n-clusters" class="ide-select">
          <option value="2">2 clusters</option>
          <option value="3" selected>3 clusters</option>
          <option value="4">4 clusters</option>
        </select>
      </label>
    `;
  } else {
    container.innerHTML = "";
  }
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
            .map((val) => `<td>${val === null ? '<span style="color:#ff5252">NaN</span>' : val}</td>`)
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
  if (el) el.textContent = `Attempts: ${attemptsRemaining}`;
}

function onTimeExpired() {
  const consoleOut = document.getElementById("console-output");
  if (consoleOut) {
    consoleOut.innerHTML += `<div class="console-line error">⏱ TIME EXPIRED: Security terminal locked down.</div>`;
  }
  onPuzzleFailed();
}

async function submitPipeline() {
  if (!activePuzzle) return;

  const runBtn = document.getElementById("run-btn");
  if (runBtn) runBtn.disabled = true;

  const dropDuplicates = document.getElementById("opt-drop-duplicates")?.checked || false;
  const fillMissing = document.getElementById("opt-fill-missing")?.value || "";
  const encode = document.getElementById("opt-encode")?.checked || false;
  const scale = document.getElementById("opt-scale")?.checked || false;
  const algorithm = document.getElementById("opt-algorithm")?.value || "";

  const extraParams = {};
  const nEst = document.getElementById("param-n-estimators");
  if (nEst) extraParams.n_estimators = parseInt(nEst.value, 10);
  const nClust = document.getElementById("param-n-clusters");
  if (nClust) extraParams.n_clusters = parseInt(nClust.value, 10);

  const pipelineChoice = {
    drop_duplicates: dropDuplicates,
    fill_missing: fillMissing,
    encode_categorical: encode,
    scale_features: scale,
    algorithm: algorithm,
    extra_params: extraParams,
  };

  const consoleOut = document.getElementById("console-output");
  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line sys">========================================================</div>
      <div class="console-line info">[RUN] Executing 'pipeline.py' with parameters:</div>
      <div class="console-line sys">  • drop_duplicates=${dropDuplicates} | fill_missing='${fillMissing}'</div>
      <div class="console-line sys">  • encode=${encode} | scale=${scale} | algorithm='${algorithm}'</div>
      <div class="console-line info">[TRAINING] Fitting scikit-learn model on Sector 0${currentRoomIndex} dataset...</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  try {
    const res = await fetch(`${API_BASE}/api/door/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        puzzle_id: activePuzzle.puzzle_id,
        pipeline_choice: pipelineChoice,
        time_remaining_seconds: timeRemaining,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    handleSubmissionResult(data);
  } catch (err) {
    console.warn("[PyCharm] Offline submission simulation:", err);
    // Offline heuristic evaluation
    const isPassing = fillMissing !== "" && (scale || encode);
    handleSubmissionResult({
      passed: isPassing,
      score: isPassing ? 0.885 : 0.62,
      target: 0.75,
      stars: isPassing ? 3 : null,
      door_type: activePuzzle.door_type,
    });
  } finally {
    if (runBtn) runBtn.disabled = false;
  }
}

function handleSubmissionResult(result) {
  const consoleOut = document.getElementById("console-output");
  attemptsRemaining = result.attempts_remaining !== undefined ? result.attempts_remaining : attemptsRemaining - 1;
  updateAttemptsDisplay();

  if (result.passed) {
    const stars = result.stars || 3;
    const starStr = "★".repeat(stars) + "☆".repeat(3 - stars);

    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line success">✓ [TEST METRIC PASSED]: Score = ${Number(result.score).toFixed(4)} (Target: ${Number(result.target).toFixed(4)})</div>
        <div class="console-line success">★ PERFORMANCE RATING: ${starStr} (${stars} Stars)</div>
        <div class="console-line success">🔓 SECURITY BULKHEAD UNLOCKED! Door is opening...</div>
        <div class="console-line sys">Process finished with exit code 0</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }

    // Hide problem banner and badge
    const probBadge = document.getElementById("problem-badge");
    if (probBadge) {
      probBadge.innerHTML = `<span style="color:#4caf50">●</span> 0 Errors (Resolved)`;
      probBadge.style.borderColor = "#4caf50";
      probBadge.style.background = "rgba(76, 175, 80, 0.15)";
      probBadge.style.color = "#69f0ae";
    }

    const probBanner = document.getElementById("problem-banner");
    if (probBanner) probBanner.classList.add("hidden");

    // Unlock Door in 3D World
    const doorType = result.door_type || activePuzzle.door_type;
    setDoorUnlocked(doorType);

    // Audio / Voice reaction
    onPuzzlePassed(stars);

    // Notify Level Manager
    levelManager.recordDoorSuccess(doorType, stars, currentRoomIndex);

    // Show Sector Cleared Banner
    showSectorClearedBanner(currentRoomIndex, stars);

    // Stop timer
    clearInterval(timerInterval);
  } else {
    if (consoleOut) {
      consoleOut.innerHTML += `
        <div class="console-line error">❌ [E102 FAILED]: Score = ${Number(result.score).toFixed(4)} did not meet required target (${Number(result.target).toFixed(4)}).</div>
        <div class="console-line error"># ERROR: Check missing value handling, feature scaling, and algorithm selection above!</div>
        <div class="console-line sys">Process finished with exit code 1</div>
      `;
      consoleOut.scrollTop = consoleOut.scrollHeight;
    }
    onPuzzleFailed();
  }
}

function showSectorClearedBanner(roomIndex, stars) {
  const banner = document.getElementById("sector-cleared-banner");
  const title = document.getElementById("cleared-title");
  const desc = document.getElementById("cleared-desc");

  if (!banner) return;

  const nextSector = roomIndex + 1;
  if (title) title.textContent = `Sector 0${roomIndex} Cleared! (${"★".repeat(stars)})`;
  if (desc) desc.textContent = `Door bulkhead opened. Walk through to proceed to Sector 0${nextSector} (Harder Difficulty).`;

  banner.classList.remove("hidden");
  setTimeout(() => {
    banner.classList.add("hidden");
  }, 5000);
}
