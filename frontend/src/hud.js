// Renders the top-left HUD (level, total stars, doors remaining) and the
// interact prompt. Pure DOM -- no Three.js here.

import { DOOR_TYPES } from "./config.js";

export function renderHud(state) {
  const totalStars = Object.values(state.starsByDoor).reduce((a, b) => a + b, 0);
  document.getElementById("level-label").textContent = `Level ${state.level}`;
  document.getElementById("stars-total").textContent = `Stars: ${totalStars} / ${DOOR_TYPES.length * 3}`;

  const remaining = DOOR_TYPES.filter(d => !state.doorsCleared.includes(d));
  document.getElementById("doors-remaining").textContent =
    remaining.length === 0 ? "All doors cleared -- vault exit open" : `Doors remaining: ${remaining.length}`;
}

export function showInteractPrompt(text) {
  const el = document.getElementById("interact-prompt");
  el.textContent = text;
  el.classList.remove("hidden");
}

export function hideInteractPrompt() {
  document.getElementById("interact-prompt").classList.add("hidden");
}

export function showLevelComplete(level, totalStars, maxStars) {
  document.getElementById("level-complete-summary").textContent =
    `Level ${level} cleared with ${totalStars} / ${maxStars} stars.`;
  document.getElementById("level-complete").classList.remove("hidden");
}

export function hideLevelComplete() {
  document.getElementById("level-complete").classList.add("hidden");
}
