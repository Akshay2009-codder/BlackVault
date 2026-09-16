// HUD — renders room label, stars, and door count. Pure DOM, no Three.js.

import { DOOR_TYPES } from "./config.js";

const ROOM_DISPLAY = {
  "classification": "Room 1 — Classification Lab",
  "regression":     "Room 2 — Regression Lab",
  "clustering":     "Room 3 — Clustering Hub",
  "anomaly":        "Room 4 — Anomaly Wing",
  "mystery":        "Room 5 — The Vault",
};

export function renderHud(state) {
  const starsMap = state.starsByDoor || {};
  const totalStars = Object.values(starsMap).reduce((a, b) => a + b, 0);

  const room = state.currentRoom || "classification";
  const lvlEl = document.getElementById("level-label");
  if (lvlEl) lvlEl.textContent = ROOM_DISPLAY[room] || "Reception";

  const starsEl = document.getElementById("stars-total");
  if (starsEl) starsEl.textContent = `★ ${totalStars} / ${DOOR_TYPES.length * 3}`;

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
  if (lc) lc.classList.remove("hidden");
}

export function hideLevelComplete() {
  const lc = document.getElementById("level-complete");
  if (lc) lc.classList.add("hidden");
}
