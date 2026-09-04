// Level & Sector Progression Manager
// Tracks sectors cleared, star ratings, and unlocks.

import { API_BASE, DOOR_TYPES } from "./config.js";
import { renderHud } from "./hud.js";

let state = {
  currentSector: 1,
  doorsCleared: [],
  starsByDoor: {},
};

export function initLevelManager({ level = 1 } = {}) {
  state.currentSector = level;
  renderHud(state);
}

export function recordDoorSuccess(doorType, stars, sectorIndex) {
  if (!state.doorsCleared.includes(doorType)) {
    state.doorsCleared.push(doorType);
  }
  state.starsByDoor[doorType] = Math.max(state.starsByDoor[doorType] || 0, stars);

  if (sectorIndex >= state.currentSector && state.currentSector < 5) {
    state.currentSector = sectorIndex + 1;
  }

  renderHud(state);
}

export function updateCurrentSector(sectorIndex) {
  if (state.currentSector !== sectorIndex) {
    state.currentSector = sectorIndex;
    renderHud(state);
  }
}

export function getState() {
  return state;
}

export function isLevelComplete() {
  return state.doorsCleared.length >= 5;
}
