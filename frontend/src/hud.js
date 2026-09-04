// Renders top-left HUD with active sector, total stars, active door, and prompts.

import { DOOR_TYPES } from "./config.js";

export function renderHud(state) {
  const totalStars = Object.values(state.starsByDoor || {}).reduce((a, b) => a + b, 0);
  const sectorNames = [
    "Sector 01: Classification Hub",
    "Sector 02: Regression Core",
    "Sector 03: Clustering Manifold",
    "Sector 04: Threat & Anomaly Lab",
    "Sector 05: Core BlackVault Sanctuary",
  ];

  const levelLabel = document.getElementById("level-label");
  if (levelLabel) {
    levelLabel.textContent = sectorNames[state.currentSector - 1] || `Sector 0${state.currentSector}`;
  }

  const starsTotal = document.getElementById("stars-total");
  if (starsTotal) {
    starsTotal.textContent = `Total Stars: ★ ${totalStars} / 15`;
  }

  const doorsRemaining = document.getElementById("doors-remaining");
  if (doorsRemaining) {
    const clearedCount = state.doorsCleared ? state.doorsCleared.length : 0;
    doorsRemaining.textContent = `Sectors Cleared: ${clearedCount} / 5`;
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
  if (el) {
    el.classList.add("hidden");
  }
}
