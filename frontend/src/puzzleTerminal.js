// Terminal UI: renders the dataset preview + pipeline-choice controls for
// an opened door, runs the client-side countdown, and handles submit ->
// score -> stars, all against the DOM already defined in index.html.

import { ALGORITHMS, EXTRA_PARAMS, DOOR_LABELS } from "./config.js";
import * as levelManager from "./levelManager.js";
import { unlockPointer, lockPointer } from "./interactions.js";

let currentPuzzle = null;   // { puzzle_id, door_type, time_limit_seconds, max_attempts, ... }
let timerInterval = null;
let timeRemaining = 0;
let attemptsRemaining = 0;

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function renderDatasetTable(preview) {
  const table = document.getElementById("dataset-table");
  const thead = table.querySelector("thead");
  const tbody = table.querySelector("tbody");
  thead.innerHTML = "";
  tbody.innerHTML = "";

  const headRow = document.createElement("tr");
  for (const col of preview.columns) {
    const th = document.createElement("th");
    th.textContent = col === preview.target_col ? `${col} (target)` : col;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);

  for (const row of preview.rows) {
    const tr = document.createElement("tr");
    for (const col of preview.columns) {
      const td = document.createElement("td");
      const val = row[col];
      if (val === null || val === undefined) {
        td.textContent = "NaN";
        td.classList.add("is-null");
      } else if (typeof val === "number") {
        td.textContent = Number.isInteger(val) ? val : val.toFixed(3);
      } else {
        td.textContent = val;
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  const missing = Object.entries(preview.missing_counts)
    .filter(([, n]) => n > 0)
    .map(([c, n]) => `${c}: ${n}`)
    .join(", ") || "none";
  document.getElementById("dataset-stats").textContent =
    `Rows: ${preview.total_rows} (showing first ${preview.rows.length}) | Duplicate rows: ${preview.duplicate_row_count} | Missing values: ${missing}`;

  const hintEl = document.getElementById("terminal-hint");
  if (preview.hint) {
    hintEl.textContent = `Hint: ${preview.hint}`;
    hintEl.classList.remove("hidden");
  } else {
    hintEl.classList.add("hidden");
  }
}

function renderAlgorithmOptions(doorType) {
  const select = document.getElementById("opt-algorithm");
  select.innerHTML = "";
  for (const [value, label] of ALGORITHMS[doorType]) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = label;
    select.appendChild(opt);
  }
  renderExtraParams(select.value);
  select.onchange = () => renderExtraParams(select.value);
}

function renderExtraParams(algoKey) {
  const container = document.getElementById("opt-extra-params");
  container.innerHTML = "";
  const params = EXTRA_PARAMS[algoKey] || [];
  for (const [key, label, defaultVal] of params) {
    const wrapper = document.createElement("label");
    wrapper.textContent = `${label}: `;
    const input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.value = defaultVal;
    input.dataset.paramKey = key;
    wrapper.appendChild(input);
    container.appendChild(wrapper);
  }
}

function collectPipelineChoice() {
  const algorithm = document.getElementById("opt-algorithm").value;
  const params = {};
  document.querySelectorAll("#opt-extra-params input").forEach(input => {
    params[input.dataset.paramKey] = parseFloat(input.value);
  });
  return {
    drop_duplicates: document.getElementById("opt-drop-duplicates").checked,
    fill_missing: document.getElementById("opt-fill-missing").value || null,
    encode_categorical: document.getElementById("opt-encode").checked,
    scale_features: document.getElementById("opt-scale").checked,
    algorithm,
    params,
  };
}

function startTimer() {
  clearInterval(timerInterval);
  timeRemaining = currentPuzzle.time_limit_seconds;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeRemaining -= 1;
    updateTimerDisplay();
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showResult(false, "Time expired -- terminal locked. Close and try the door again.");
      document.getElementById("submit-btn").disabled = true;
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById("terminal-timer").textContent = fmtTime(timeRemaining);
  document.getElementById("terminal-attempts").textContent = `Attempts: ${attemptsRemaining}`;
}

function showResult(passed, text) {
  const el = document.getElementById("terminal-result");
  el.textContent = text;
  el.classList.toggle("pass", passed);
  el.classList.toggle("fail", !passed);
}

export async function openTerminal(doorType) {
  let puzzle;
  try {
    puzzle = await levelManager.openDoor(doorType);
  } catch (err) {
    console.error(err);
    return;
  }

  currentPuzzle = { ...puzzle, door_type: doorType };
  attemptsRemaining = puzzle.max_attempts_remaining;

  document.getElementById("terminal-title").textContent = `Security Terminal -- ${DOOR_LABELS[doorType]}`;
  document.getElementById("submit-btn").disabled = false;
  document.getElementById("terminal-result").textContent = "";
  document.getElementById("terminal-result").className = "";
  document.getElementById("opt-drop-duplicates").checked = false;
  document.getElementById("opt-fill-missing").value = "";
  document.getElementById("opt-encode").checked = false;
  document.getElementById("opt-scale").checked = false;

  renderDatasetTable(puzzle.dataset_preview);
  renderAlgorithmOptions(doorType);
  startTimer();

  document.getElementById("terminal").classList.remove("hidden");
  unlockPointer();
}

export function closeTerminal() {
  clearInterval(timerInterval);
  document.getElementById("terminal").classList.add("hidden");
  currentPuzzle = null;
  lockPointer();
}

async function handleSubmit() {
  if (!currentPuzzle) return;
  const btn = document.getElementById("submit-btn");
  btn.disabled = true;

  let result;
  try {
    result = await levelManager.submitAttempt(
      currentPuzzle.puzzle_id,
      collectPipelineChoice(),
      timeRemaining
    );
  } catch (err) {
    showResult(false, err.message || "Submission failed.");
    btn.disabled = false;
    return;
  }

  attemptsRemaining = result.attempts_remaining;
  updateTimerDisplay();

  const targetDesc = result.higher_is_better ? `>= ${result.target}` : `<= ${result.target}`;
  if (result.passed) {
    clearInterval(timerInterval);
    showResult(true, `PASSED -- score ${result.score.toFixed(3)} (needed ${targetDesc}). ${"\u2605".repeat(result.stars)}${"\u2606".repeat(3 - result.stars)}`);
    btn.disabled = true;
    setTimeout(closeTerminal, 1800);
  } else if (attemptsRemaining <= 0) {
    showResult(false, `FAILED -- score ${result.score.toFixed(3)} (needed ${targetDesc}). No attempts left -- close and re-open the door.`);
    btn.disabled = true;
  } else {
    showResult(false, `Not quite -- score ${result.score.toFixed(3)} (needed ${targetDesc}). Try again.`);
    btn.disabled = false;
  }
}

export function initTerminalUI() {
  document.getElementById("submit-btn").addEventListener("click", handleSubmit);
  document.getElementById("terminal-close").addEventListener("click", closeTerminal);
}

export function isTerminalOpen() {
  return currentPuzzle !== null;
}
