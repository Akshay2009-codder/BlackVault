// PyCharm-style 3D ML Code Editor & Puzzle Runner for BlackVault.
// Implements full IDE layout: Project Tool Window, Editor with Red Error Squiggles,
// Real-time Python Code Execution, PyCharm Run Console, and Door Unlocking.

import { ML_PUZZLES } from "./puzzles/mlPuzzles.js";
import { standPlayerUp } from "./player.js";
import * as levelManager from "./levelManager.js";
import { unlockDoor } from "./world.js";
import { playDoorSound } from "./guardVoice.js";

let currentDoorType = null;
let currentPuzzle = null;
let currentCode = "";
let timerInterval = null;
let secondsLeft = 300;
let attemptsUsed = 0;
let isExecuting = false;

export function initPycharmIDE() {
  const ideEl = document.getElementById("pycharm-ide");
  if (!ideEl) return;

  // Run button in PyCharm toolbar & Run console
  const runBtn = document.getElementById("pycharm-run-btn");
  const runBtnFooter = document.getElementById("pycharm-footer-run-btn");
  const closeBtn = document.getElementById("pycharm-close-btn");
  const resetBtn = document.getElementById("pycharm-reset-btn");
  const hintBtn = document.getElementById("pycharm-hint-btn");
  const textarea = document.getElementById("pycharm-code-editor");

  if (runBtn) runBtn.addEventListener("click", executeCode);
  if (runBtnFooter) runBtnFooter.addEventListener("click", executeCode);
  if (closeBtn) closeBtn.addEventListener("click", closeIDE);
  if (resetBtn) resetBtn.addEventListener("click", resetCode);
  if (hintBtn) hintBtn.addEventListener("click", toggleHint);

  // Textarea input & tab key handling
  if (textarea) {
    textarea.addEventListener("input", onCodeInput);
    textarea.addEventListener("keydown", onCodeKeyDown);
    textarea.addEventListener("scroll", syncEditorScroll);
  }

  // Keyboard shortcut Ctrl+Enter or Shift+F10 to Run
  window.addEventListener("keydown", (e) => {
    if (ideEl.classList.contains("hidden")) return;
    if (e.key === "Escape") {
      closeIDE();
    } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      executeCode();
    } else if (e.shiftKey && e.key === "F10") {
      e.preventDefault();
      executeCode();
    }
  });
}

export function openIDE(doorType) {
  const ideEl = document.getElementById("pycharm-ide");
  if (!ideEl) return;

  currentDoorType = doorType;
  currentPuzzle = ML_PUZZLES[doorType] || ML_PUZZLES.classification;
  currentCode = currentPuzzle.initialCode;
  attemptsUsed = 0;
  secondsLeft = 300;

  // Populate UI metadata
  const fileTab = document.getElementById("pycharm-active-tab-name");
  const windowTitle = document.getElementById("pycharm-window-title");
  const projectFileName = document.getElementById("pycharm-project-filename");
  const difficultyBadge = document.getElementById("pycharm-difficulty-badge");
  const problemStatement = document.getElementById("pycharm-problem-text");
  const textarea = document.getElementById("pycharm-code-editor");

  if (fileTab) fileTab.textContent = currentPuzzle.fileName;
  if (windowTitle) windowTitle.textContent = `BlackVault — [${currentPuzzle.fileName}] — PyCharm 2026.1`;
  if (projectFileName) projectFileName.textContent = currentPuzzle.fileName;
  if (difficultyBadge) difficultyBadge.textContent = currentPuzzle.difficulty;
  if (problemStatement) problemStatement.textContent = currentPuzzle.problemStatement;

  if (textarea) {
    textarea.value = currentCode;
  }

  // Update line numbers & error highlights
  renderLineNumbersAndHighlights();

  // Reset Run Console
  const consoleOut = document.getElementById("pycharm-console-output");
  if (consoleOut) {
    consoleOut.innerHTML = `
      <div class="console-line cmd">C:\\BlackVault\\.venv\\Scripts\\python.exe -u C:/BlackVault/src/${currentPuzzle.fileName}</div>
      <div class="console-line text-muted">[INITIALIZED] PyCharm Debug & Execution Engine ready.</div>
      <div class="console-line text-muted">[INSPECTION] <span class="text-danger">${currentPuzzle.brokenLines.length} code defects detected</span> in red gutter. Fix bugs and click ▶ Run.</div>
    `;
  }

  // Start countdown timer
  startTimer();

  // Show IDE overlay
  ideEl.classList.remove("hidden");

  // Exit pointer lock for typing
  if (document.exitPointerLock) {
    document.exitPointerLock();
  }
}

export function closeIDE() {
  const ideEl = document.getElementById("pycharm-ide");
  if (!ideEl) return;

  ideEl.classList.add("hidden");
  clearInterval(timerInterval);

  // Return player to standing position
  standPlayerUp();
}

function startTimer() {
  clearInterval(timerInterval);
  const timerEl = document.getElementById("pycharm-timer");

  const update = () => {
    const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
    const secs = String(secondsLeft % 60).padStart(2, "0");
    if (timerEl) timerEl.textContent = `${mins}:${secs}`;
    if (secondsLeft <= 0) {
      clearInterval(timerInterval);
    } else {
      secondsLeft--;
    }
  };

  update();
  timerInterval = setInterval(update, 1000);
}

function resetCode() {
  if (!currentPuzzle) return;
  const textarea = document.getElementById("pycharm-code-editor");
  if (textarea) {
    textarea.value = currentPuzzle.initialCode;
    currentCode = textarea.value;
    renderLineNumbersAndHighlights();
  }
}

function toggleHint() {
  if (!currentPuzzle || !currentPuzzle.hints) return;
  const consoleOut = document.getElementById("pycharm-console-output");
  if (!consoleOut) return;

  const hintText = currentPuzzle.hints.map((h, i) => `💡 <b>Hint ${i + 1}:</b> ${h}`).join("<br/>");
  consoleOut.innerHTML += `
    <div class="console-line hint-box">
      ${hintText}
    </div>
  `;
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

function onCodeInput(e) {
  currentCode = e.target.value;
  renderLineNumbersAndHighlights();
}

function onCodeKeyDown(e) {
  const textarea = e.target;

  // Support Tab key for 4-space indent
  if (e.key === "Tab") {
    e.preventDefault();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    textarea.value = textarea.value.substring(0, start) + "    " + textarea.value.substring(end);
    textarea.selectionStart = textarea.selectionEnd = start + 4;
    currentCode = textarea.value;
    renderLineNumbersAndHighlights();
  }
}

function syncEditorScroll() {
  const textarea = document.getElementById("pycharm-code-editor");
  const lineNumbers = document.getElementById("pycharm-line-numbers");
  const highlights = document.getElementById("pycharm-code-highlights");

  if (textarea && lineNumbers && highlights) {
    lineNumbers.scrollTop = textarea.scrollTop;
    highlights.scrollTop = textarea.scrollTop;
    highlights.scrollLeft = textarea.scrollLeft;
  }
}

/**
 * Render line numbers, breakpoint dots, and red highlighted lines with error annotations
 */
function renderLineNumbersAndHighlights() {
  const textarea = document.getElementById("pycharm-code-editor");
  const lineNumbers = document.getElementById("pycharm-line-numbers");
  const highlights = document.getElementById("pycharm-code-highlights");
  if (!textarea || !lineNumbers || !highlights || !currentPuzzle) return;

  const lines = textarea.value.split("\n");
  const brokenSet = new Set(currentPuzzle.brokenLines);

  let gutterHtml = "";
  let highlightHtml = "";

  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const isBroken = brokenSet.has(lineNum);
    const annotation = currentPuzzle.errorAnnotations[lineNum] || "";

    // Gutter item
    gutterHtml += `
      <div class="gutter-row ${isBroken ? 'has-error' : ''}" title="${annotation}">
        <span class="breakpoint-dot"></span>
        <span class="line-num">${lineNum}</span>
        ${isBroken ? '<span class="error-badge">✖</span>' : '<span class="gutter-spacer"></span>'}
      </div>
    `;

    // Highlight row overlay
    const escaped = escapeHtml(lineText) || "&nbsp;";
    if (isBroken) {
      highlightHtml += `<div class="code-line-broken" title="${annotation}">${escaped}</div>`;
    } else {
      highlightHtml += `<div class="code-line-normal">${escaped}</div>`;
    }
  });

  lineNumbers.innerHTML = gutterHtml;
  highlights.innerHTML = highlightHtml;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Executes the Python code by sending it to backend endpoint /api/door/code_submit
 */
async function executeCode() {
  if (isExecuting || !currentPuzzle) return;
  isExecuting = true;
  attemptsUsed++;

  const runBtn = document.getElementById("pycharm-run-btn");
  const runBtnFooter = document.getElementById("pycharm-footer-run-btn");
  const consoleOut = document.getElementById("pycharm-console-output");

  if (runBtn) runBtn.classList.add("running");
  if (runBtnFooter) runBtnFooter.disabled = true;

  if (consoleOut) {
    consoleOut.innerHTML += `
      <div class="console-line cmd">▶ Running ${currentPuzzle.fileName}...</div>
      <div class="console-line text-info">[EXECUTING] Python scikit-learn sandbox worker running...</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }

  try {
    const resp = await fetch("/api/door/code_submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        door_type: currentDoorType,
        level: currentPuzzle.level,
        submitted_code: currentCode,
        time_remaining_seconds: secondsLeft,
        attempts_used: attemptsUsed
      })
    });

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.detail || `Server status ${resp.status}`);
    }

    const data = await resp.json();
    handleExecutionResult(data);

  } catch (err) {
    // Local fallback evaluation if backend endpoint is unreachable or offline
    console.warn("[PyCharm] Falling back to client-side verification:", err);
    fallbackClientVerification();
  } finally {
    isExecuting = false;
    if (runBtn) runBtn.classList.remove("running");
    if (runBtnFooter) runBtnFooter.disabled = false;
  }
}

function handleExecutionResult(data) {
  const consoleOut = document.getElementById("pycharm-console-output");
  if (!consoleOut) return;

  if (data.passed) {
    consoleOut.innerHTML += `
      <div class="console-line text-success">${escapeHtml(data.output || "All security pipeline tests passed.")}</div>
      <div class="console-line success-banner">
        🎉 <b>SECURITY GATE VERIFIED</b> — Door [${currentDoorType.toUpperCase()}] is sliding open!<br/>
        ★ Stars Awarded: ${"★".repeat(data.stars || 3)}
      </div>
      <div class="console-line text-muted">Process finished with exit code 0</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;

    // Trigger door unlock in 3D world
    unlockDoor(currentDoorType);
    playDoorSound && playDoorSound();

    // Record progress
    levelManager.recordDoorSuccess(currentDoorType, data.score || 1.0, data.stars || 3);

    // Close IDE after brief delay to let player enjoy victory
    setTimeout(() => {
      closeIDE();
    }, 2500);

  } else {
    // Show realistic traceback error
    consoleOut.innerHTML += `
      <div class="console-line text-danger"><b>Traceback (most recent call last):</b></div>
      <div class="console-line text-danger">${escapeHtml(data.error || "AssertionError: Model failed accuracy / consistency verification.")}</div>
      <div class="console-line text-danger">Process finished with exit code 1</div>
    `;
    consoleOut.scrollTop = consoleOut.scrollHeight;
  }
}

/**
 * Client-side fallback validator if backend network is unavailable
 */
function fallbackClientVerification() {
  const consoleOut = document.getElementById("pycharm-console-output");
  if (!consoleOut) return;

  // Inspect if typical fixes have been applied
  let passed = false;
  let errorMsg = "";

  if (currentDoorType === "classification") {
    const hasIntNeighbors = currentCode.includes("n_neighbors=5") || currentCode.includes("n_neighbors = 5") || currentCode.includes("n_neighbors=3");
    const hasFitCall = /knn\.fit\s*\(\s*X_train\s*,\s*y_train\s*\)/.test(currentCode);

    if (!hasIntNeighbors) {
      errorMsg = "TypeError: 'n_neighbors' must be an integer, got '5' (string).";
    } else if (!hasFitCall) {
      errorMsg = "sklearn.exceptions.NotFittedError: This KNeighborsClassifier instance is not fitted yet. Call 'fit' with appropriate arguments before using this estimator.";
    } else {
      passed = true;
    }
  } else if (currentDoorType === "regression") {
    const hasScaledXTrain = currentCode.includes("scaler.fit_transform(X_train)") || currentCode.includes("scaler.fit_transform( X_train )");
    const hasPredictScaled = currentCode.includes("scaler.transform(X_test)") || currentCode.includes("X_train");

    if (!hasScaledXTrain) {
      errorMsg = "ValueError: X and y have incompatible shapes: y_train used instead of X_train in feature scaler.";
    } else {
      passed = true;
    }
  } else if (currentDoorType === "clustering") {
    const hasImport = currentCode.includes("silhouette_score");
    const hasClusters = !currentCode.includes("n_clusters=0");
    const hasFitPredict = currentCode.includes("fit_predict(") || currentCode.includes("fit(");

    if (!hasImport) {
      errorMsg = "NameError: name 'silhouette_score' is not defined. Missing from sklearn.metrics import.";
    } else if (!hasClusters) {
      errorMsg = "ValueError: n_clusters must be > 0; got 0.";
    } else if (!hasFitPredict) {
      errorMsg = "AttributeError: 'KMeans' object has no attribute 'fit_predict_score'.";
    } else {
      passed = true;
    }
  } else if (currentDoorType === "anomaly") {
    const hasEnsemble = currentCode.includes("from sklearn.ensemble import IsolationForest");
    const hasValidContam = !currentCode.includes("contamination=1.5");
    const hasMinusOne = currentCode.includes("raw_preds == -1") || currentCode.includes("raw_preds == - 1");

    if (!hasEnsemble) {
      errorMsg = "ModuleNotFoundError: No module named 'sklearn.tree.IsolationForest'. IsolationForest is in sklearn.ensemble.";
    } else if (!hasValidContam) {
      errorMsg = "ValueError: contamination must be in (0, 0.5], got 1.5.";
    } else if (!hasMinusOne) {
      errorMsg = "ValueError: Outlier count 0 did not match expected anomaly profile (IsolationForest returns -1 for outliers).";
    } else {
      passed = true;
    }
  } else if (currentDoorType === "mystery") {
    const hasScaler = currentCode.includes("StandardScaler") && currentCode.includes("scaler.fit_transform");
    const hasValidActivation = currentCode.includes('activation="relu"') || currentCode.includes("activation='relu'") || currentCode.includes('activation="tanh"');
    const hasValidLr = !currentCode.includes("learning_rate_init=-");
    const hasValidMaxIter = !currentCode.includes("max_iter=1,") && !currentCode.includes("max_iter=1\n");

    if (!hasValidActivation) {
      errorMsg = "ValueError: The activation 'super_relu' is not supported. Supported activations: ('identity', 'logistic', 'tanh', 'relu').";
    } else if (!hasValidLr) {
      errorMsg = "ValueError: learning_rate_init must be > 0; got -0.01.";
    } else if (!hasValidMaxIter) {
      errorMsg = "ConvergenceWarning: Stochastic Optimizer: Maximum iterations (1) reached and the optimization hasn't converged yet.";
    } else if (!hasScaler) {
      errorMsg = "ConvergenceWarning: Neural network failed without feature normalization (StandardScaler missing).";
    } else {
      passed = true;
    }
  }

  handleExecutionResult({
    passed,
    error: errorMsg,
    output: passed ? "[SECURITY CHECK] All assertions passed. Model metrics exceed gate threshold." : null,
    score: passed ? 0.96 : 0.0,
    stars: attemptsUsed <= 2 ? 3 : (attemptsUsed <= 4 ? 2 : 1)
  });
}
