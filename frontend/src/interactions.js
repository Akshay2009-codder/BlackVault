// Raycasts and proximity detection for door computer workstations.
// Transitions player into seated view at the computer when pressing 'E',
// opening the PyCharm ML Code Editor.

import * as THREE from "three";
import { getDoorRegistry, getCurrentRoomIndex } from "./world.js";
import { getPlayerPosition, seatPlayerAtWorkstation, standPlayerUp, getControls } from "./player.js";
import * as hud from "./hud.js";

const INTERACT_RANGE = 4.2;
const raycaster = new THREE.Raycaster();
const forward = new THREE.Vector3();

let camera = null;
let openTerminalCallback = null;
let targetedEntry = null;

export function initInteractions(cam, onOpenTerminal) {
  camera = cam;
  openTerminalCallback = onOpenTerminal;
  document.addEventListener("keydown", onKeyDown);
}

function onKeyDown(e) {
  if (e.code !== "KeyE") return;
  if (!targetedEntry) return;

  const controls = getControls();
  if (controls.isSeated) return;

  // Seat player at the workstation
  seatPlayerAtWorkstation(targetedEntry.deskPosition, targetedEntry.deskLookAt);
  unlockPointer();

  // Open PyCharm IDE
  if (openTerminalCallback) {
    openTerminalCallback(targetedEntry.doorType, targetedEntry.roomIndex);
  }
}

export function updateInteractions() {
  if (!camera) return;

  const controls = getControls();
  if (controls.isSeated) {
    targetedEntry = null;
    hud.hideInteractPrompt();
    return;
  }

  targetedEntry = null;
  hud.hideInteractPrompt();

  const playerPos = getPlayerPosition();
  camera.getWorldDirection(forward);
  raycaster.set(camera.position, forward);

  const doors = getDoorRegistry();
  let closest = { dist: Infinity, entry: null };

  for (const [doorType, entry] of Object.entries(doors)) {
    const dist = playerPos.distanceTo(entry.position);
    if (dist > INTERACT_RANGE) continue;

    const toStation = entry.position.clone().sub(camera.position).normalize();
    const angle = forward.angleTo(toStation);

    if (angle < 0.75 && dist < closest.dist) {
      closest = { dist, entry };
    }
  }

  if (closest.entry) {
    targetedEntry = closest.entry;
    if (targetedEntry.isUnlocked) {
      hud.showInteractPrompt(`Door Unlocked — Proceed to Next Sector`);
    } else {
      hud.showInteractPrompt(`Press E to sit at computer & open PyCharm IDE`);
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
