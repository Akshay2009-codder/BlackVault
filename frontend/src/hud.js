// HUD — renders floor label, stars, and door count. Pure DOM, no Three.js.

import { DOOR_TYPES, FLOOR_LABELS } from "./config.js";

const FLOOR_LABEL_BY_INDEX = ["G", "1F", "2F", "3F", "4F", "5F"];
const FLOOR_DISPLAY = {
  "G":  "G — Reception & Lobby",
  "1F": "1F — Classification Lab",
  "2F": "2F — Regression Lab",
  "3F": "3F — Clustering Hub",
  "4F": "4F — Anomaly Wing",
  "5F": "5F — The Vault",
};

export function renderHud(state) {
  const starsMap = state.starsByDoor || {};
  const totalStars = Object.values(starsMap).reduce((a, b) => a + b, 0);

  const floor = state.currentFloor || "G";
  const lvlEl = document.getElementById("level-label");
  if (lvlEl) lvlEl.textContent = FLOOR_DISPLAY[floor] || `Floor ${floor}`;

  const starsEl = document.getElementById("stars-total");
  if (starsEl) starsEl.textContent = `★ ${totalStars} / ${DOOR_TYPES.length * 3}`;

  const cleared = state.doorsCleared || [];
  const remaining = DOOR_TYPES.filter(d => !cleared.includes(d));
  const doorsEl = document.getElementById("doors-remaining");
  if (doorsEl) {
    doorsEl.textContent =
      remaining.length === 0
        ? "All floors cleared — vault exit open"
        : `Floors remaining: ${remaining.length}`;
  }
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
    summaryEl.textContent = `All ${level} floors cleared — ${totalStars} / ${maxStars} stars earned.`;
  }
  const lc = document.getElementById("level-complete");
  if (lc) lc.classList.remove("hidden");
}

export function hideLevelComplete() {
  const lc = document.getElementById("level-complete");
  if (lc) lc.classList.add("hidden");
}
