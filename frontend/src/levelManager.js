import { API_BASE, DOOR_TYPES, BOSS_DOOR_TYPE, FLOOR_LABELS } from "./config.js";
import { renderHud } from "./hud.js";
import { setDoorActiveState, setExitUnlocked, getElevatorPositions } from "./world.js";
import { triggerElevatorRide } from "./elevator.js";
import { triggerFinale } from "./finale.js";

// Sequential door order mirrors floor order
const SEQUENTIAL_DOORS = ["classification", "regression", "clustering", "anomaly", BOSS_DOOR_TYPE];

// Map each door to its floor labels (from floor / to floor)
const DOOR_FLOOR_MAP = {
  classification: { from: "G",  to: "1F" },
  regression:     { from: "1F", to: "2F" },
  clustering:     { from: "2F", to: "3F" },
  anomaly:        { from: "3F", to: "4F" },
  mystery:        { from: "4F", to: "5F" },
};

// Map door index → floor label shown in HUD
const FLOOR_LABEL_BY_INDEX = ["G", "1F", "2F", "3F", "4F", "5F"];

let state = {
  currentSector: 1,
  activeDoorIndex: 0,
  doorsCleared: [],
  starsByDoor: {},
  currentFloor: "G",
  elevatorRiding: false,
};

// Callback to extend the player's Z bound after an elevator ride
let pendingZExtend = null;
let onElevatorDoneCallback = null;

export function initLevelManager({ level = 1 } = {}) {
  state.currentSector = level;
  state.activeDoorIndex = 0;
  state.doorsCleared = [];
  state.currentFloor = "G";
  state.elevatorRiding = false;

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
  }

  // Update door visuals immediately (door opens, glow goes green)
  updateWorldDoorVisuals();
  renderHud(state);

  // ── Check finale ────────────────────────────────────────────────────────
  if (isLevelComplete()) {
    // All 5 floors cleared — trigger finale after brief delay
    setTimeout(() => {
      triggerFinale(() => {
        // After ride back down → show level complete
        import("./hud.js").then(({ showLevelComplete }) => {
          const totalStars = Object.values(state.starsByDoor).reduce((a, b) => a + b, 0);
          showLevelComplete(state.currentSector, totalStars, DOOR_TYPES.length * 3);
        });
      });
    }, 2500);
    return;
  }

  // ── Trigger elevator ride to next floor ──────────────────────────────────
  const floorData = DOOR_FLOOR_MAP[doorType];
  if (floorData) {
    state.elevatorRiding = true;
    // Small delay so player sees door open first
    setTimeout(() => {
      triggerElevatorRide(floorData.from, floorData.to, () => {
        state.currentFloor = floorData.to;
        state.elevatorRiding = false;
        renderHud(state);
      });
    }, 1800);
  }
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

export function isElevatorRiding() {
  return state.elevatorRiding;
}

export function advanceLevel() {
  state.currentSector = Math.min(5, (state.currentSector || 1) + 1);
  state.activeDoorIndex = 0;
  state.doorsCleared = [];
  state.currentFloor = "G";
  updateWorldDoorVisuals();
  renderHud(state);
}
