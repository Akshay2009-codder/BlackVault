// Raycasts from the camera each frame to detect when the player is looking
// at a door within interaction range, shows the "Press E" prompt, and opens
// the terminal for that door type. Also owns pointer-lock lifecycle so the
// terminal (a normal DOM overlay) can release/reacquire the mouse cleanly.

import * as THREE from "three";
import { getDoorRegistry, getExitDoor, setMasterSFXVolume } from "./world.js";
import { getPlayerPosition, getControls, sitAt } from "./player.js";
import * as hud from "./hud.js";
import * as levelManager from "./levelManager.js";
import { isTerminalLockedOut, getLockoutRemainingSeconds, isTerminalOpen, isEditorFocused } from "./puzzleTerminal.js";

const INTERACT_RANGE = 5.5;
const raycaster = new THREE.Raycaster();
const forward = new THREE.Vector3();

let camera = null;
let openTerminalCallback = null;
let targetedDoorType = null;
let targetedIsExit = false;
let isPaused = false;

export function initInteractions(cam, onOpenDoor) {
  camera = cam;
  openTerminalCallback = onOpenDoor;
  document.addEventListener("keydown", onKeyDown);
  
  // Bind pause menu UI
  const resumeBtn = document.getElementById("resume-btn");
  if (resumeBtn) resumeBtn.addEventListener("click", togglePauseMenu);
  
  const restartBtn = document.getElementById("restart-level-btn");
  if (restartBtn) restartBtn.addEventListener("click", () => {
    // Basic restart: reload page
    window.location.reload();
  });
  
  // We can attach volume slider listener here if we want, or in ambient.js
  const sfxSlider = document.getElementById("sfx-volume-slider");
  if (sfxSlider) {
    sfxSlider.addEventListener("input", (e) => {
      setMasterSFXVolume(parseFloat(e.target.value));
    });
  }
}

export function togglePauseMenu() {
  const pauseMenu = document.getElementById("pause-menu");
  if (!pauseMenu) return;
  
  isPaused = !isPaused;
  if (isPaused) {
    unlockPointer();
    pauseMenu.classList.remove("hidden");
    pauseMenu.classList.add("animate-in");
  } else {
    lockPointer();
    pauseMenu.classList.add("hidden");
    pauseMenu.classList.remove("animate-in");
  }
}

function onKeyDown(e) {
  if (e.code === "Escape") {
    // If terminal is open, puzzleTerminal.js handles closing it.
    // If not open, we toggle pause menu.
    if (!isTerminalOpen || !isTerminalOpen()) {
      togglePauseMenu();
    }
    return;
  }
  
  if (isPaused) return;

  if (e.code !== "KeyE") return;

  // CRITICAL: Ignore interaction key completely if terminal is already open or typing in editor
  if (isTerminalOpen && isTerminalOpen()) return;
  if (isEditorFocused && isEditorFocused()) return;
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || (activeEl.closest && activeEl.closest(".monaco-editor")))) {
    return;
  }

  if (!targetedDoorType) return;
  if (targetedIsExit) {
    if (levelManager.isLevelComplete && levelManager.isLevelComplete()) {
      if (levelManager.advanceLevel) levelManager.advanceLevel();
    }
  } else {
    if (isTerminalLockedOut && isTerminalLockedOut()) {
      return;
    }
    if (levelManager.isDoorActive && !levelManager.isDoorActive(targetedDoorType)) {
      return;
    }
    const entry = getDoorRegistry()[targetedDoorType];
    if (!entry || !entry.seatPosition) {
      if (openTerminalCallback) openTerminalCallback(targetedDoorType, entry?.roomIndex);
      return;
    }
    sitAt(entry.seatPosition, entry.seatLookAt, () => {
      if (openTerminalCallback) openTerminalCallback(targetedDoorType, entry.roomIndex);
    });
  }
}

export function updateInteractions() {
  if (!camera) return;

  targetedDoorType = null;
  targetedIsExit = false;
  hud.hideInteractPrompt();

  // If terminal is open, do not raycast or show interaction prompts
  if (isTerminalOpen && isTerminalOpen()) return;

  const playerPos = getPlayerPosition();
  camera.getWorldDirection(forward);
  raycaster.set(camera.position, forward);

  const doors = getDoorRegistry();
  let closest = { dist: Infinity, doorType: null, isExit: false };

  for (const [doorType, entry] of Object.entries(doors)) {
    const dist = playerPos.distanceTo(entry.position);
    if (dist > INTERACT_RANGE) continue;
    const toDoor = entry.position.clone().sub(camera.position).normalize();
    const angle = forward.angleTo(toDoor);
    if (angle < 0.75 && dist < closest.dist) {
      closest = { dist, doorType, isExit: false };
    }
  }

  const exitDoor = getExitDoor();
  if (exitDoor) {
    const dist = playerPos.distanceTo(exitDoor.position);
    if (dist <= INTERACT_RANGE) {
      const toDoor = exitDoor.position.clone().sub(camera.position).normalize();
      const angle = forward.angleTo(toDoor);
      if (angle < 0.5 && dist < closest.dist) {
        closest = { dist, doorType: "exit", isExit: true };
      }
    }
  }

  if (closest.doorType) {
    targetedDoorType = closest.doorType;
    targetedIsExit = closest.isExit;
    if (closest.isExit) {
      if (levelManager.isLevelComplete && levelManager.isLevelComplete()) {
        hud.showInteractPrompt("Press E to advance to the next level");
      } else {
        hud.showInteractPrompt("DOOR LOCKED — Complete all 5 sector terminals first");
      }
    } else {
      if (isTerminalLockedOut && isTerminalLockedOut()) {
        const rem = getLockoutRemainingSeconds ? getLockoutRemainingSeconds() : 3;
        hud.showInteractPrompt(`⚠️ LOCKOUT ACTIVE — Retry in ${rem}s`);
      } else {
        const isActive = levelManager.isDoorActive ? levelManager.isDoorActive(closest.doorType) : true;
        if (isActive) {
          hud.showInteractPrompt(`Press E to access ${closest.doorType} terminal`);
        } else {
          const activeDoor = levelManager.getActiveDoor ? levelManager.getActiveDoor() : "active";
          hud.showInteractPrompt(`DOOR LOCKED — Complete active ${activeDoor} door terminal first`);
        }
      }
    }
  }

  // --- Minimap / Compass Update ---
  updateMinimap();
}

function updateMinimap() {
  const minimapArrow = document.getElementById("minimap-arrow");
  if (!minimapArrow || !camera) return;
  
  const activeDoorType = levelManager.getActiveDoor ? levelManager.getActiveDoor() : null;
  if (!activeDoorType) return;
  
  let targetPos = null;
  if (activeDoorType === "exit") {
    const exitDoor = getExitDoor();
    if (exitDoor) targetPos = exitDoor.position;
  } else {
    const doors = getDoorRegistry();
    if (doors[activeDoorType]) {
      targetPos = doors[activeDoorType].position;
    }
  }
  
  if (targetPos) {
    const playerPos = getPlayerPosition();
    // Calculate angle in XZ plane
    const dx = targetPos.x - playerPos.x;
    const dz = targetPos.z - playerPos.z;
    const targetAngle = Math.atan2(dx, dz);
    
    // Player facing angle (yaw)
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    const playerYaw = euler.y;
    
    // Relative angle
    let relAngle = targetAngle - playerYaw;
    // Rotate by PI to match HTML arrow pointing up being forward
    // Arrow pointing up is 0deg rotation.
    // Wait, dx/dz is Math.atan2(dx, dz). Forward in Three.js is -Z.
    // Let's use simple heuristic:
    const toTarget = new THREE.Vector3(targetPos.x - playerPos.x, 0, targetPos.z - playerPos.z).normalize();
    const camDir = new THREE.Vector3();
    camera.getWorldDirection(camDir);
    camDir.y = 0;
    camDir.normalize();
    
    // Calculate signed angle between camDir and toTarget
    const angle = Math.atan2(
      camDir.clone().cross(toTarget).y,
      camDir.dot(toTarget)
    );
    
    // Convert to degrees and apply to CSS rotation
    const degrees = angle * (180 / Math.PI);
    minimapArrow.style.transform = `rotate(${degrees}deg)`;
  }
}

export function unlockPointer() {
  const controls = getControls();
  if (controls && controls.isLocked) controls.unlock();
}

export function lockPointer() {
  const controls = getControls();
  if (controls) controls.lock();
}
