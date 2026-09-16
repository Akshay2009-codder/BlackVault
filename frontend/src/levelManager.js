import { API_BASE, DOOR_TYPES, BOSS_DOOR_TYPE } from "./config.js";
import { renderHud } from "./hud.js";
import { setDoorActiveState, setExitUnlocked } from "./world.js";
import { triggerFinale } from "./finale.js";

// Sequential door order — each room connects directly to the next
const SEQUENTIAL_DOORS = ["classification", "regression", "clustering", "anomaly", BOSS_DOOR_TYPE];

let state = {
  currentSector: 1,
  activeDoorIndex: 0,
  doorsCleared: [],
  starsByDoor: {},
  currentRoom: "classification",
};

export function initLevelManager({ level = 1 } = {}) {
  state.currentSector = level;
  state.activeDoorIndex = 0;
  state.doorsCleared = [];
  state.currentRoom = "classification";

  updateWorldDoorVisuals();
  renderHud(state);
}

export function getActiveDoor() {
  if (state.doorsCleared.length >= SEQUENTIAL_DOORS.length) return "exit";
  return SEQUENTIAL_DOORS[state.activeDoorIndex] || SEQUENTIAL_DOORS[0];
}

export function isDoorActive(doorType) {
  if (doorType === "exit") return isLevelComplete();
  return getActiveDoor() === doorType;
}

export function updateWorldDoorVisuals() {
  SEQUENTIAL_DOORS.forEach((doorType, idx) => {
    const isUnlocked = state.doorsCleared.includes(doorType);
    const isActive = idx === state.activeDoorIndex && !isUnlocked;
    setDoorActiveState(doorType, isActive, isUnlocked);
  });

  if (isLevelComplete()) {
    setExitUnlocked();
  }
}

export function recordDoorSuccess(doorType, stars, sectorIndex) {
  if (!state.doorsCleared.includes(doorType)) {
    state.doorsCleared.push(doorType);
  }
  state.starsByDoor[doorType] = Math.max(state.starsByDoor[doorType] || 0, stars);

  const idx = SEQUENTIAL_DOORS.indexOf(doorType);
  if (idx !== -1 && idx === state.activeDoorIndex) {
    state.activeDoorIndex = Math.min(SEQUENTIAL_DOORS.length - 1, state.activeDoorIndex + 1);
  }

  if (sectorIndex >= state.currentSector && state.currentSector < 5) {
    state.currentSector = sectorIndex + 1;
    state.currentRoom = SEQUENTIAL_DOORS[state.activeDoorIndex] || "mystery";
  }

  // Update door visuals immediately (door opens, glow goes green)
  updateWorldDoorVisuals();
  renderHud(state);

  // ── Check finale ────────────────────────────────────────────────────────
  if (isLevelComplete()) {
    // All 5 rooms cleared — trigger finale after brief delay
    setTimeout(() => {
      triggerFinale(() => {
        // After reveal → show level complete
        import("./hud.js").then(({ showLevelComplete }) => {
          const totalStars = Object.values(state.starsByDoor).reduce((a, b) => a + b, 0);
          showLevelComplete(state.currentSector, totalStars, DOOR_TYPES.length * 3);
        });
      });
    }, 2500);
    return;
  }

  // Door is now open — player walks through to the next room naturally.
  // setMaxZBound is already extended by setDoorUnlocked() in world.js.
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
  return state.doorsCleared.length >= SEQUENTIAL_DOORS.length;
}

export function advanceLevel() {
  state.currentSector = Math.min(5, (state.currentSector || 1) + 1);
  state.activeDoorIndex = 0;
  state.doorsCleared = [];
  state.currentRoom = "classification";
  updateWorldDoorVisuals();
  renderHud(state);
}
