// Renders the top-left HUD (level, total stars, doors remaining) and the
// interact prompt. Pure DOM -- no Three.js here.

import { DOOR_TYPES } from "./config.js";

export function renderHud(state) {
  const totalStars = Object.values(state.starsByDoor || {}).reduce((a, b) => a + b, 0);
  const lvlEl = document.getElementById("level-label");
  if (lvlEl) lvlEl.textContent = `Level ${state.level || state.currentSector || 1}`;

  const starsEl = document.getElementById("stars-total");
  if (starsEl) starsEl.textContent = `Stars: ${totalStars} / ${DOOR_TYPES.length * 3}`;

  const remaining = DOOR_TYPES.filter(d => !(state.doorsCleared || []).includes(d));
  const doorsEl = document.getElementById("doors-remaining");
  if (doorsEl) {
    doorsEl.textContent =
      remaining.length === 0 ? "All doors cleared -- vault exit open" : `Doors remaining: ${remaining.length}`;
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
  if (summaryEl) summaryEl.textContent = `Level ${level} cleared with ${totalStars} / ${maxStars} stars.`;
  const lc = document.getElementById("level-complete");
  if (lc) lc.classList.remove("hidden");
}

export function hideLevelComplete() {
  const lc = document.getElementById("level-complete");
  if (lc) lc.classList.add("hidden");
}
