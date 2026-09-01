import { API_BASE } from './config.js';
import { controls } from './sceneSetup.js';
import { doors, interactables } from './world.js';
import { playMysteryIntro, showEscapeComplete } from './narrative.js';
import { renderProgress } from './hud.js';

const puzzleScreen = document.getElementById('puzzle-screen');
const puzzleTitleEl = document.getElementById('puzzle-title');
const puzzleTimerEl = document.getElementById('puzzle-timer');
const metricLabelEl = document.getElementById('puzzle-metric-label');
const statRows = document.getElementById('stat-rows');
const statMissing = document.getElementById('stat-missing');
const statDupes = document.getElementById('stat-dupes');
const previewTable = document.getElementById('preview-table');
const ctlModel = document.getElementById('ctl-model');
const submitBtn = document.getElementById('submit-btn');
const resultEl = document.getElementById('puzzle-result');
const chaosIndicatorEl = document.getElementById('chaos-indicator');
const chaosAlertEl = document.getElementById('chaos-alert');

let currentPuzzle = null;
let timerInterval = null;
let activeDoor = null;
let puzzleStartTime = 0;
let lastKnownTimeLimit = 0;
let chaosAlertTimeout = null;

const MODEL_OPTIONS = {
  classification: [
    ['logistic_regression', 'Logistic Regression'],
    ['random_forest', 'Random Forest'],
    ['knn', 'K-Nearest Neighbors'],
  ],
  regression: [
    ['linear_regression', 'Linear Regression'],
    ['random_forest', 'Random Forest'],
  ],
  clustering: [
    ['kmeans', 'K-Means'],
    ['hierarchical', 'Hierarchical (Agglomerative)'],
    ['dbscan', 'DBSCAN'],
  ],
  anomaly: [
    ['isolation_forest', 'Isolation Forest'],
    ['one_class_svm', 'One-Class SVM'],
  ],
};

// The final "mystery" room doesn't tell the player which problem type
// they're facing, so the model dropdown offers every family at once,
// labeled by family — picking one from the wrong family is a legitimate
// (if costly) way to find out what this dataset actually is.
const MYSTERY_MODEL_OPTIONS = [
  ['logistic_regression', 'Classification \u2014 Logistic Regression'],
  ['knn', 'Classification \u2014 K-Nearest Neighbors'],
  ['linear_regression', 'Regression \u2014 Linear Regression'],
  ['random_forest', 'Classification/Regression \u2014 Random Forest'],
  ['kmeans', 'Clustering \u2014 K-Means'],
  ['hierarchical', 'Clustering \u2014 Hierarchical (Agglomerative)'],
  ['dbscan', 'Clustering \u2014 DBSCAN'],
  ['isolation_forest', 'Anomaly \u2014 Isolation Forest'],
  ['one_class_svm', 'Anomaly \u2014 One-Class SVM'],
];

const missingRow = document.getElementById('ctl-missing').closest('.control-block');
const clusterRow = document.getElementById('ctl-clusters').closest('.control-block');
const contamRow = document.getElementById('ctl-contamination').closest('.control-block');

export function openPuzzleTerminal(door) {
  if (door.puzzleType === 'mystery' && !door.introShown) {
    door.introShown = true;
    playMysteryIntro(() => openPuzzleTerminalInner(door));
    return;
  }
  openPuzzleTerminalInner(door);
}

async function openPuzzleTerminalInner(door) {
  activeDoor = door;
  controls.unlock();
  puzzleScreen.classList.remove('hidden');
  resultEl.textContent = '';
  resultEl.className = '';
  submitBtn.disabled = false;

  const res = await fetch(`${API_BASE}/api/puzzle/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzle_type: door.puzzleType, difficulty: door.difficulty }),
  });
  currentPuzzle = await res.json();

  puzzleTitleEl.textContent = currentPuzzle.title.toUpperCase();
  chaosIndicatorEl.classList.toggle('hidden', !currentPuzzle.has_chaos_event);
  chaosAlertEl.classList.add('hidden');
  clearTimeout(chaosAlertTimeout);
  const metricLabel = currentPuzzle.metric === 'silhouette' ? 'SILHOUETTE' : currentPuzzle.metric.toUpperCase();
  metricLabelEl.textContent = `${metricLabel} \u2265 ${currentPuzzle.threshold}`;
  statRows.textContent = currentPuzzle.row_count;
  statMissing.textContent = currentPuzzle.missing_cell_count;
  statDupes.textContent = currentPuzzle.duplicate_row_count;

  renderPreviewTable(currentPuzzle);

  const isMystery = currentPuzzle.type === 'mystery';

  // clustering has no target column to clean around missing values in the
  // same way, but preprocessing controls stay relevant, so keep them visible
  // for every type; only the type-specific extra params toggle. The mystery
  // room shows both extra-param rows regardless — the player doesn't get
  // told which one is relevant, that's part of the puzzle.
  missingRow.classList.remove('hidden');
  clusterRow.classList.toggle('hidden', !(currentPuzzle.type === 'clustering' || isMystery));
  contamRow.classList.toggle('hidden', !(currentPuzzle.type === 'anomaly' || isMystery));
  if (currentPuzzle.type === 'clustering' || isMystery) {
    document.getElementById('ctl-clusters').value = currentPuzzle.suggested_k || 3;
  }
  if (currentPuzzle.type === 'anomaly' || isMystery) {
    document.getElementById('ctl-contamination').value = currentPuzzle.contamination || 0.05;
  }

  ctlModel.innerHTML = '';
  const options = isMystery ? MYSTERY_MODEL_OPTIONS : MODEL_OPTIONS[currentPuzzle.type];
  for (const [val, label] of options) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    ctlModel.appendChild(opt);
  }

  startTimer(currentPuzzle.time_limit_seconds);
}

function renderPreviewTable(puzzle) {
  const cols = puzzle.target_col ? [...puzzle.feature_cols, puzzle.target_col] : [...puzzle.feature_cols];
  const thead = `<tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const rows = puzzle.preview_rows.map((row) => {
    return `<tr>${cols.map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return `<td class="na">NaN</td>`;
      return `<td>${typeof v === 'number' ? v.toFixed(2) : v}</td>`;
    }).join('')}</tr>`;
  }).join('');
  previewTable.innerHTML = thead + rows;
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  let remaining = seconds;
  lastKnownTimeLimit = seconds;
  puzzleStartTime = Date.now();
  updateTimerDisplay(remaining);
  timerInterval = setInterval(() => {
    remaining -= 1;
    updateTimerDisplay(remaining);

    const elapsed = Math.floor((Date.now() - puzzleStartTime) / 1000);
    checkChaosEvents(elapsed, (delta) => {
      remaining = Math.max(0, remaining - delta);
      updateTimerDisplay(remaining);
    });

    if (remaining <= 0) {
      clearInterval(timerInterval);
      resultEl.textContent = 'TIME EXPIRED \u2014 LOCK REASSERTED';
      resultEl.className = 'denied';
      submitBtn.disabled = true;
    }
  }, 1000);
}

async function checkChaosEvents(elapsed, onTimeCut) {
  if (!currentPuzzle) return;
  try {
    const res = await fetch(`${API_BASE}/api/puzzle/tick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle_id: currentPuzzle.puzzle_id, elapsed_seconds: elapsed }),
    });
    const data = await res.json();
    (data.events || []).forEach((event) => applyChaosEvent(event, onTimeCut));
  } catch (e) {
    // tick failures are non-critical — the puzzle just won't get a chaos
    // event applied this round; the pipeline itself is unaffected.
  }
}

function applyChaosEvent(event, onTimeCut) {
  showChaosAlert(event.message);
  statMissing.textContent = event.missing_cell_count;
  statDupes.textContent = event.duplicate_row_count;
  statRows.textContent = event.row_count;

  if (event.type === 'metric_shift') {
    currentPuzzle.threshold = event.threshold;
    const metricLabel = currentPuzzle.metric === 'silhouette' ? 'SILHOUETTE' : currentPuzzle.metric.toUpperCase();
    metricLabelEl.textContent = `${metricLabel} \u2265 ${event.threshold}`;
  }

  if (event.type === 'time_cut') {
    const delta = lastKnownTimeLimit - event.time_limit_seconds;
    lastKnownTimeLimit = event.time_limit_seconds;
    onTimeCut(delta);
  }
}

function showChaosAlert(message) {
  chaosAlertEl.textContent = message;
  chaosAlertEl.classList.remove('hidden');
  clearTimeout(chaosAlertTimeout);
  chaosAlertTimeout = setTimeout(() => chaosAlertEl.classList.add('hidden'), 5000);
}

function updateTimerDisplay(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  puzzleTimerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

submitBtn.addEventListener('click', async () => {
  if (!currentPuzzle) return;
  submitBtn.disabled = true;
  resultEl.textContent = 'RUNNING PIPELINE\u2026';
  resultEl.className = '';

  const isMystery = currentPuzzle.type === 'mystery';
  const body = {
    puzzle_id: currentPuzzle.puzzle_id,
    missing_strategy: document.getElementById('ctl-missing').value,
    drop_duplicates: document.getElementById('ctl-dupes').checked,
    scale_features: document.getElementById('ctl-scale').checked,
    model: ctlModel.value,
  };
  if (currentPuzzle.type === 'clustering' || isMystery) {
    body.n_clusters = parseInt(document.getElementById('ctl-clusters').value, 10) || 3;
  }
  if (currentPuzzle.type === 'anomaly' || isMystery) {
    body.contamination = parseFloat(document.getElementById('ctl-contamination').value) || 0.05;
  }

  const res = await fetch(`${API_BASE}/api/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));

  // A model picked from the wrong family (only reachable in the mystery
  // room, where every family is offered) is rejected by the backend as a
  // plain HTTP error with no access_granted field — treat that the same
  // way as a failed attempt instead of letting it crash the UI.
  if (!res.ok || !('access_granted' in data)) {
    resultEl.textContent = `PIPELINE REJECTED \u2014 ${(data.detail || 'incompatible approach for this dataset').toUpperCase()}`;
    resultEl.className = 'denied';
    submitBtn.disabled = false;
    return;
  }

  if (data.access_granted) {
    clearInterval(timerInterval);
    resultEl.textContent = `ACCESS GRANTED \u2014 ${data.metric.toUpperCase()} ${data.score}`;
    resultEl.className = 'granted';
    unlockDoor(activeDoor);
    if (data.progress) renderProgress(data.progress);
    const isLastDoor = doors.every((d) => d.unlocked);
    setTimeout(() => {
      puzzleScreen.classList.add('hidden');
      controls.lock();
      if (isLastDoor) showEscapeComplete();
    }, 1400);
  } else {
    resultEl.textContent = data.reason
      ? data.reason.toUpperCase()
      : `ACCESS DENIED \u2014 ${data.metric.toUpperCase()} ${data.score} < ${data.threshold}`;
    resultEl.className = 'denied';
    submitBtn.disabled = false;
  }
});

function unlockDoor(door) {
  door.unlocked = true;
  door.mesh.traverse?.((obj) => {
    if (obj.material) {
      obj.material.color?.set(0x6fbf73);
      obj.material.emissive?.set?.(0x6fbf73);
    }
  });
  if (door.mesh.material) {
    door.mesh.material.color.set(0x6fbf73);
    door.mesh.material.emissive.set(0x6fbf73);
  }
  interactables.find((t) => t.door === door).used = true;
  let t = 0;
  const openAnim = () => {
    t += 0.02;
    door.mesh.position.y = door.baseY + Math.min(t, 1) * 2.6;
    if (t < 1) requestAnimationFrame(openAnim);
  };
  openAnim();
}