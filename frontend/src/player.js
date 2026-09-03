// First-person movement and collision controls within the studio lab.

import * as THREE from "three";

let camera = null;
let domElement = null;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { forward: false, backward: false, left: false, right: false };

let isLocked = false;
let euler = new THREE.Euler(0, 0, 0, "YXZ");
const SPEED = 7.0;

// Studio room boundaries
const BOUND_MIN_X = -12.0;
const BOUND_MAX_X = 12.0;
const BOUND_MIN_Z = -13.5;
const BOUND_MAX_Z = 13.5;

export function initPlayer(cam, element = document.body) {
  camera = cam;
  domElement = element;

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);

  element.addEventListener("click", () => {
    const terminal = document.getElementById("terminal");
    if (!terminal || terminal.classList.contains("hidden")) {
      element.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === element;
  });
}

function onKeyDown(e) {
  switch (e.code) {
    case "KeyW": case "ArrowUp": moveState.forward = true; break;
    case "KeyS": case "ArrowDown": moveState.backward = true; break;
    case "KeyA": case "ArrowLeft": moveState.left = true; break;
    case "KeyD": case "ArrowRight": moveState.right = true; break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case "KeyW": case "ArrowUp": moveState.forward = false; break;
    case "KeyS": case "ArrowDown": moveState.backward = false; break;
    case "KeyA": case "ArrowLeft": moveState.left = false; break;
    case "KeyD": case "ArrowRight": moveState.right = false; break;
  }
}

function onMouseMove(e) {
  if (!isLocked || !camera) return;

  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;

  euler.setFromQuaternion(camera.quaternion);
  euler.y -= movementX * 0.0022;
  euler.x -= movementY * 0.0022;
  euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));

  camera.quaternion.setFromEuler(euler);
}

export function updatePlayer(delta) {
  if (!camera) return;

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveState.forward) - Number(moveState.backward);
  direction.x = Number(moveState.right) - Number(moveState.left);
  direction.normalize();

  if (moveState.forward || moveState.backward) {
    velocity.z -= direction.z * SPEED * 10.0 * delta;
  }
  if (moveState.left || moveState.right) {
    velocity.x += direction.x * SPEED * 10.0 * delta;
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);

  camera.position.addScaledVector(forward, -velocity.z * delta);
  camera.position.addScaledVector(right, velocity.x * delta);

  camera.position.y = 1.7;

  // Clamp within realistic studio room rectangle
  camera.position.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, camera.position.x));
  camera.position.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, camera.position.z));
}

export function getPlayerPosition() {
  return camera ? camera.position : new THREE.Vector3();
}

export function getControls() {
  return {
    isLocked,
    lock: () => domElement && domElement.requestPointerLock(),
    unlock: () => document.exitPointerLock && document.exitPointerLock(),
  };
}
