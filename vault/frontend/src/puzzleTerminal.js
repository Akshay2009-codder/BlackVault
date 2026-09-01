import { API_BASE } from './config.js';
import { controls } from './sceneSetup.js';
import { doors, interactables } from './world.js';
import { showEscapeComplete } from './narrative.js';
import { renderProgress } from './hud.js';
import { openChaosStream, closeChaosStream } from './chaosEvents.js';

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

let currentPuzzle = null;
let timerInterval = null;
let activeDoor = null;

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

const missingRow = document.getElementById('ctl-missing').closest('.control-block');
const clusterRow = document.getElementById('ctl-clusters').closest('.control-block');
const contamRow = document.getElementById('ctl-contamination').closest('.control-block');

export async function openPuzzleTerminal(door) {
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
  const metricLabel = currentPuzzle.metric === 'silhouette' ? 'SILHOUETTE' : currentPuzzle.metric.toUpperCase();
  metricLabelEl.textContent = `${metricLabel} \u2265 ${currentPuzzle.threshold}`;
  statRows.textContent = currentPuzzle.row_count;
  statMissing.textContent = currentPuzzle.missing_cell_count;
  statDupes.textContent = currentPuzzle.duplicate_row_count;

  renderPreviewTable(currentPuzzle);

  // clustering has no target column to clean around missing values in the
  // same way, but preprocessing controls stay relevant, so keep them visible
  // for every type; only the type-specific extra params toggle.
  missingRow.classList.remove('hidden');
  clusterRow.classList.toggle('hidden', currentPuzzle.type !== 'clustering');
  contamRow.classList.toggle('hidden', currentPuzzle.type !== 'anomaly');
  if (currentPuzzle.type === 'clustering') {
    document.getElementById('ctl-clusters').value = currentPuzzle.suggested_k || 3;
  }
  if (currentPuzzle.type === 'anomaly') {
    document.getElementById('ctl-contamination').value = currentPuzzle.contamination || 0.05;
  }

  ctlModel.innerHTML = '';
  for (const [val, label] of MODEL_OPTIONS[currentPuzzle.type]) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    ctlModel.appendChild(opt);
  }

  startTimer(currentPuzzle.time_limit_seconds);

  // Open SSE chaos stream now that we have a live puzzle_id.
  openChaosStream(currentPuzzle.puzzle_id);
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
  updateTimerDisplay(remaining);
  timerInterval = setInterval(() => {
    remaining -= 1;
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      closeChaosStream();
      resultEl.textContent = 'TIME EXPIRED \u2014 LOCK REASSERTED';
      resultEl.className = 'denied';
      submitBtn.disabled = true;
    }
  }, 1000);
  // Expose a mutable ref so chaos timer_jolt can adjust it.
  startTimer._remaining = () => remaining;
  startTimer._adjust = (delta) => { remaining = Math.max(0, remaining + delta); };
}

function updateTimerDisplay(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  puzzleTimerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

submitBtn.addEventListener('click', async () => {
  if (!currentPuzzle) return;
  submitBtn.disabled = true;
  closeChaosStream();
  resultEl.textContent = 'RUNNING PIPELINE\u2026';
  resultEl.className = '';

  const body = {
    puzzle_id: currentPuzzle.puzzle_id,
    missing_strategy: document.getElementById('ctl-missing').value,
    drop_duplicates: document.getElementById('ctl-dupes').checked,
    scale_features: document.getElementById('ctl-scale').checked,
    model: ctlModel.value,
  };
  if (currentPuzzle.type === 'clustering') {
    body.n_clusters = parseInt(document.getElementById('ctl-clusters').value, 10) || 3;
  }
  if (currentPuzzle.type === 'anomaly') {
    body.contamination = parseFloat(document.getElementById('ctl-contamination').value) || 0.05;
  }

  const res = await fetch(`${API_BASE}/api/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

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

// ---------------------------------------------------------------------------
// Phase 3 — React to chaos events dispatched by chaosEvents.js
// ---------------------------------------------------------------------------

/** Briefly pulse an element with the chaos-pulse CSS animation. */
function chaosPulse(el) {
  el.classList.remove('chaos-pulse');
  // Force a reflow so re-adding the class restarts the animation.
  void el.offsetWidth;
  el.classList.add('chaos-pulse');
  el.addEventListener('animationend', () => el.classList.remove('chaos-pulse'), { once: true });
}

window.addEventListener('chaos', (e) => {
  const ev = e.detail;

  // -- metric_shift: update the threshold label in the terminal brief --
  if (ev.type === 'metric_shift' && currentPuzzle) {
    currentPuzzle.threshold = ev.new_threshold;
    const sign = ev.delta > 0 ? '+' : '';
    const metricLabel = ev.metric === 'silhouette' ? 'SILHOUETTE' : ev.metric.toUpperCase();
    metricLabelEl.textContent = `${metricLabel} \u2265 ${ev.new_threshold.toFixed(3)}`;
    metricLabelEl.title = `CHAOS: threshold shifted ${sign}${ev.delta.toFixed(3)}`;
    chaosPulse(metricLabelEl);
  }

  // -- data_inject: prepend new rows to the preview table --
  if (ev.type === 'data_inject' && currentPuzzle && ev.rows?.length) {
    const cols = currentPuzzle.target_col
      ? [...currentPuzzle.feature_cols, currentPuzzle.target_col]
      : [...currentPuzzle.feature_cols];
    const newRows = ev.rows.map((row) => {
      const cells = cols.map((c) => {
        const v = row[c];
        if (v === null || v === undefined) return `<td class="na">NaN</td>`;
        return `<td class="chaos-new">${typeof v === 'number' ? v.toFixed(2) : v}</td>`;
      }).join('');
      return `<tr class="chaos-row">${cells}</tr>`;
    }).join('');
    // Prepend after the header row (first <tr>).
    const firstRow = previewTable.querySelector('tr');
    if (firstRow) firstRow.insertAdjacentHTML('afterend', newRows);
    // Update stat counters
    const currentMissing = parseInt(statMissing.textContent, 10) || 0;
    const currentRows = parseInt(statRows.textContent, 10) || 0;
    statRows.textContent = currentRows + ev.count;
    statMissing.textContent = currentMissing + ev.rows.filter((r) => Object.values(r).some((v) => v === null)).length;
    chaosPulse(statRows);
  }

  // -- timer_jolt: adjust remaining seconds --
  if (ev.type === 'timer_jolt' && typeof startTimer._adjust === 'function') {
    startTimer._adjust(ev.delta_seconds);
    puzzleTimerEl.classList.add(ev.delta_seconds < 0 ? 'timer-jolt-negative' : 'timer-jolt-positive');
    setTimeout(() => {
      puzzleTimerEl.classList.remove('timer-jolt-negative', 'timer-jolt-positive');
    }, 900);
  }
});

