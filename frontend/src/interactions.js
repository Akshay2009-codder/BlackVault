// Raycasts from the camera each frame to detect when the player is looking
// at a door within interaction range, shows the "Press E" prompt, and opens
// the terminal for that door type. Also owns pointer-lock lifecycle so the
// terminal (a normal DOM overlay) can release/reacquire the mouse cleanly.

import * as THREE from "three";
import { getDoorRegistry, getExitDoor } from "./world.js";
import { getPlayerPosition, getControls } from "./player.js";
import * as hud from "./hud.js";
import * as levelManager from "./levelManager.js";

const INTERACT_RANGE = 4.5;
const raycaster = new THREE.Raycaster();
const forward = new THREE.Vector3();

let camera = null;
let openTerminalCallback = null;
let targetedDoorType = null;
let targetedIsExit = false;

export function initInteractions(cam, onOpenDoor) {
  camera = cam;
  openTerminalCallback = onOpenDoor;
  document.addEventListener("keydown", onKeyDown);
}

function onKeyDown(e) {
  if (e.code !== "KeyE") return;
  if (!targetedDoorType) return;
  if (targetedIsExit) {
    if (levelManager.isLevelComplete()) levelManager.advanceLevel();
  } else {
    openTerminalCallback(targetedDoorType);
  }
}

export function updateInteractions() {
  if (!camera) return;

  targetedDoorType = null;
  targetedIsExit = false;
  hud.hideInteractPrompt();

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
    if (angle < 0.5 && dist < closest.dist) {
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
      if (levelManager.isLevelComplete()) {
        hud.showInteractPrompt("Press E to advance to the next level");
      }
    } else {
      hud.showInteractPrompt(`Press E to access ${closest.doorType} terminal`);
    }
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
