// Owns hub state: current level, which of the 5 doors are cleared, and
// stars earned per door. Connects API endpoints with the hub scene and HUD.

import { API_BASE, DOOR_TYPES } from "./config.js";
import { renderHud, showLevelComplete } from "./hud.js";
import { guardSpeak } from "./guardVoice.js";

let state = {
  level: 1,
  doorsCleared: [],
  starsByDoor: {},
};

export function initLevelManager({ level = 1 }) {
  state.level = level;
  refreshProgress();
}

export async function refreshProgress() {
  try {
    const res = await fetch(`${API_BASE}/api/level/${state.level}/progress`);
    if (res.ok) {
      const data = await res.json();
      state.doorsCleared = data.doors_cleared || [];
      state.starsByDoor = data.stars_by_door || {};
    }
  } catch (err) {
    console.warn("[BlackVault] progress fetch failed (backend not running yet?)", err);
  }
  renderHud(state);
}

export async function openDoor(doorType) {
  if (!DOOR_TYPES.includes(doorType)) {
    throw new Error(`Unknown door type: ${doorType}`);
  }
  const res = await fetch(`${API_BASE}/api/door/open`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level: state.level, door_type: doorType }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to open door terminal");
  }
  guardSpeak("door_opened");
  return res.json();
}

export async function submitAttempt(puzzle_id, pipeline_choice, time_remaining_seconds) {
  const res = await fetch(`${API_BASE}/api/door/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      puzzle_id,
      pipeline_choice,
      time_remaining_seconds,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Submission request failed");
  }

  const data = await res.json();

  if (data.passed) {
    if (data.door_type && !state.doorsCleared.includes(data.door_type)) {
      state.doorsCleared.push(data.door_type);
    }
    if (data.door_type && data.stars) {
      state.starsByDoor[data.door_type] = Math.max(state.starsByDoor[data.door_type] || 0, data.stars);
    }
    renderHud(state);

    if (data.stars === 3) guardSpeak("attempt_passed_3star");
    else if (data.stars === 2) guardSpeak("attempt_passed_2star");
    else guardSpeak("attempt_passed_1star");

    if (isLevelComplete()) {
      setTimeout(() => {
        guardSpeak("level_cleared");
        const totalStars = Object.values(state.starsByDoor).reduce((a, b) => a + b, 0);
        showLevelComplete(state.level, totalStars, DOOR_TYPES.length * 3);
      }, 1200);
    }
  } else {
    guardSpeak("attempt_failed");
  }

  return data;
}

export function isLevelComplete() {
  return DOOR_TYPES.every(d => state.doorsCleared.includes(d));
}

export async function advanceLevel() {
  state.level += 1;
  state.doorsCleared = [];
  state.starsByDoor = {};
  await refreshProgress();
}

export function getState() {
  return state;
}
