// HUD — renders room label, stars, and door count. Pure DOM, no Three.js.
// Includes:
//  - Animated star count-up (smooth number ramp)
//  - Timer ring: circular SVG progress indicator for active puzzles
//  - Achievement popup: "3 Stars!" toast for the first perfect clear

import { DOOR_TYPES } from "./config.js";

const ROOM_DISPLAY = {
  "classification": "Room 1 — Classification Lab",
  "regression":     "Room 2 — Regression Lab",
  "clustering":     "Room 3 — Clustering Hub",
  "anomaly":        "Room 4 — Anomaly Wing",
  "mystery":        "Room 5 — The Vault",
};

let _displayedStars = 0;   // current animated value on screen
let _targetStars = 0;      // true star count
let _starRafId = null;
const _achievedDoors = new Set(); // track which doors have fired the "3 stars" toast

export function renderHud(state) {
  const starsMap = state.starsByDoor || {};
  const totalStars = Object.values(starsMap).reduce((a, b) => a + b, 0);

  const room = state.currentRoom || "classification";
  const lvlEl = document.getElementById("level-label");
  if (lvlEl) lvlEl.textContent = ROOM_DISPLAY[room] || "Reception";

  // Only animate if stars actually increased
  if (totalStars > _targetStars) {
    _targetStars = totalStars;
    _animateStarCount();
  } else {
    _targetStars = totalStars;
    _displayedStars = totalStars;
    _updateStarEl(totalStars);
  }

  const cleared = state.doorsCleared || [];
  const remaining = DOOR_TYPES.filter(d => !cleared.includes(d));
  const doorsEl = document.getElementById("doors-remaining");
  if (doorsEl) {
    doorsEl.textContent =
      remaining.length === 0
        ? "All rooms cleared — vault exit open"
        : `Rooms remaining: ${remaining.length}`;
  }
}

function _updateStarEl(val) {
  const starsEl = document.getElementById("stars-total");
  if (starsEl) starsEl.textContent = `★ ${val} / ${DOOR_TYPES.length * 3}`;
}

function _animateStarCount() {
  if (_starRafId) cancelAnimationFrame(_starRafId);
  const start = _displayedStars;
  const end = _targetStars;
  const startTime = performance.now();
  const duration = 800; // ms

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    // Ease-out cubic
    const e = 1 - Math.pow(1 - t, 3);
    _displayedStars = Math.round(start + (end - start) * e);
    _updateStarEl(_displayedStars);
    if (t < 1) {
      _starRafId = requestAnimationFrame(step);
    } else {
      _displayedStars = end;
      _updateStarEl(end);
    }
  }
  _starRafId = requestAnimationFrame(step);
}

export function showInteractPrompt(text) {
  const el = document.getElementById("interact-prompt");
  if (el) {
    el.textContent = text;
    el.classList.remove("hidden");
  }
}

export function hideInteractPrompt() {
  const el = document.getElementById("interact-prompt");
  if (el) el.classList.add("hidden");
}

export function showLevelComplete(level, totalStars, maxStars) {
  const summaryEl = document.getElementById("level-complete-summary");
  if (summaryEl) {
    summaryEl.textContent = `All ${level} rooms cleared — ${totalStars} / ${maxStars} stars earned.`;
  }
  const lc = document.getElementById("level-complete");
  if (lc) {
    lc.classList.remove("hidden");
    lc.classList.add("animate-in");
  }
}

export function hideLevelComplete() {
  const lc = document.getElementById("level-complete");
  if (lc) {
    lc.classList.add("hidden");
    lc.classList.remove("animate-in");
  }
}

// ── Achievement popup ─────────────────────────────────────────────────
// Shows a brief "3 Stars — Perfect Clear!" toast the FIRST time a door
// earns 3 stars. Subsequent perfect clears are silent (no spam).
export function maybeShowAchievement(doorType, stars) {
  if (stars < 3 || _achievedDoors.has(doorType)) return;
  _achievedDoors.add(doorType);

  let popup = document.getElementById("achievement-popup");
  if (!popup) return;

  const titleEl = popup.querySelector(".ach-title");
  const subEl   = popup.querySelector(".ach-sub");
  if (titleEl) titleEl.textContent = "⭐ 3-Star Clear!";
  if (subEl)   subEl.textContent   = `${doorType.toUpperCase()} sector — perfect execution.`;

  popup.classList.remove("hidden", "ach-hide");
  popup.classList.add("ach-show");

  // Auto-dismiss after 4 s
  setTimeout(() => {
    popup.classList.remove("ach-show");
    popup.classList.add("ach-hide");
    setTimeout(() => popup.classList.add("hidden"), 500);
  }, 4000);
}

// ── Timer Ring ───────────────────────────────────────────────────────
// Call this every second from puzzleTerminal to drive the SVG ring.
// fraction: 0.0 (empty) → 1.0 (full)
export function updateTimerRing(fraction) {
  const ring = document.getElementById("timer-ring-progress");
  if (!ring) return;
  const r = 18; // must match SVG r attribute
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, fraction));
  ring.style.strokeDasharray = `${dash.toFixed(2)} ${circ.toFixed(2)}`;

  // Colour: green → amber → red as time runs out
  if (fraction > 0.5) {
    ring.style.stroke = "#7a9471";
  } else if (fraction > 0.22) {
    ring.style.stroke = "#c9a66b";
  } else {
    ring.style.stroke = "#c0504a";
  }
}
