// First-person movement, collision, a lightweight visible player body
// (arms + a walking bob, since this is FPS-only there's no third-person
// view of the rest of the character), and the "sit down at a terminal"
// camera transition used when the player presses E on a door.

import * as THREE from "three";

let camera = null;
let domElement = null;
let playerBodyMesh = null;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { forward: false, backward: false, left: false, right: false };

let isLocked = false;
let euler = new THREE.Euler(0, 0, 0, "YXZ");
const SPEED = 7.0;
const EYE_HEIGHT = 1.7;

// Studio room & facility boundaries
const BOUND_MIN_X = -12.0;
const BOUND_MAX_X = 12.0;
const BOUND_MIN_Z = -140.0;
const BOUND_MAX_Z = 13.5;

// --- Visible first-person body (arms) -----------------------------------
let armsGroup = null;
let walkTime = 0;

function buildArms() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a679, roughness: 0.65 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x3a4a5c, roughness: 0.8 });

  function makeArm(sign) {
    const arm = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 4, 8), sleeveMat);
    upper.position.set(sign * 0.16, -0.22, -0.28);
    upper.rotation.z = sign * 0.25;
    upper.rotation.x = 0.35;
    upper.castShadow = true;
    arm.add(upper);

    const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.09, 4, 8), skinMat);
    hand.position.set(sign * 0.21, -0.38, -0.46);
    hand.rotation.x = 0.6;
    hand.castShadow = true;
    arm.add(hand);

    return arm;
  }

  group.add(makeArm(1));
  group.add(makeArm(-1));
  group.position.set(0, 0, 0);
  return group;
}

export function initPlayer(cam, element = document.body, sceneRef = null) {
  camera = cam;
  domElement = element;

  if (sceneRef && cam && !cam.parent) {
    sceneRef.add(cam);
  }

  armsGroup = buildArms();
  camera.add(armsGroup);

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);

  element.addEventListener("click", () => {
    const terminal = document.getElementById("terminal");
    const pycharm = document.getElementById("pycharm-ide");
    const isModalOpen = (terminal && !terminal.classList.contains("hidden")) ||
                        (pycharm && !pycharm.classList.contains("hidden"));
    if (!isModalOpen && !movementLocked) {
      element.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === element;
  });
}

function onKeyDown(e) {
  if (movementLocked) return;
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
  if (!isLocked || !camera || movementLocked) return;

  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;

  euler.setFromQuaternion(camera.quaternion);
  euler.y -= movementX * 0.0022;
  euler.x -= movementY * 0.0022;
  euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));

  camera.quaternion.setFromEuler(euler);
}

export function updatePlayer(delta) {
  if (!camera || movementLocked) return;

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

  // Clamp within realistic facility room rectangle
  camera.position.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, camera.position.x));
  camera.position.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, camera.position.z));

  // Walking bob for both the camera (footstep feel) and the visible arms,
  // plus a subtle arm sway so the body reads as alive rather than a
  // floating camera.
  const moving = moveState.forward || moveState.backward || moveState.left || moveState.right;
  if (moving && isLocked) {
    walkTime += delta * 9;
    camera.position.y = EYE_HEIGHT + Math.sin(walkTime) * 0.035;
    if (armsGroup) {
      armsGroup.position.y = Math.sin(walkTime * 2) * 0.012;
      armsGroup.rotation.z = Math.sin(walkTime) * 0.02;
    }
  } else {
    walkTime = 0;
    camera.position.y += (EYE_HEIGHT - camera.position.y) * Math.min(1, delta * 8);
    if (armsGroup) {
      armsGroup.position.y += (0 - armsGroup.position.y) * Math.min(1, delta * 8);
      armsGroup.rotation.z += (0 - armsGroup.rotation.z) * Math.min(1, delta * 8);
    }
  }
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

// --- Sit-at-terminal camera transition -----------------------------------
// Presses of E near a door hand off from free WASD movement to a short
// tween that moves the camera to the seat in front of that door's
// terminal, so the player visually "sits down" (and reaches out with
// their hands) before the code editor opens. standUp() reverses it.

let movementLocked = false;
let tweenHandle = null;
let standPosition = new THREE.Vector3(0, EYE_HEIGHT, 5.5);

export function isMovementLocked() {
  return movementLocked;
}

function tweenCamera(toPos, toLookAt, duration, onDone) {
  if (!camera) return;
  if (tweenHandle) cancelAnimationFrame(tweenHandle);
  const fromPos = camera.position.clone();
  const fromQuat = camera.quaternion.clone();

  const lookMatrix = new THREE.Matrix4().lookAt(toPos, toLookAt, camera.up);
  const toQuat = new THREE.Quaternion().setFromRotationMatrix(lookMatrix);

  const start = performance.now();
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
    camera.position.lerpVectors(fromPos, toPos, eased);
    camera.quaternion.slerpQuaternions(fromQuat, toQuat, eased);
    if (armsGroup) {
      // Reach forward as we sit, like typing at the terminal.
      armsGroup.position.z = -0.06 * eased;
    }
    if (t < 1) {
      tweenHandle = requestAnimationFrame(step);
    } else {
      tweenHandle = null;
      if (onDone) onDone();
    }
  }
  tweenHandle = requestAnimationFrame(step);
}

export function sitAt(seatPositionOrCam, seatLookAtOrPos, onSeatedOrLookAt, maybeCallback) {
  let pos, lookAt, cb;
  if (seatPositionOrCam && seatPositionOrCam.isCamera) {
    pos = seatLookAtOrPos;
    lookAt = onSeatedOrLookAt;
    cb = maybeCallback;
  } else {
    pos = seatPositionOrCam;
    lookAt = seatLookAtOrPos;
    cb = onSeatedOrLookAt;
  }
  movementLocked = true;
  standPosition.copy(camera ? camera.position : standPosition);
  standPosition.y = EYE_HEIGHT;
  tweenCamera(pos, lookAt, 500, cb);
}

export function standUp(onStood) {
  const backTo = standPosition.clone();
  const lookAt = backTo.clone().add(new THREE.Vector3(0, 0, -1));
  tweenCamera(backTo, lookAt, 350, () => {
    if (camera) camera.position.copy(backTo);
    if (armsGroup) armsGroup.position.z = 0;
    movementLocked = false;
    if (onStood) onStood();
  });
}

// Compatibility exports
export const standPlayerUp = standUp;
export function setPlayerBodyMesh(mesh) {
  playerBodyMesh = mesh;
}
export function getPlayerFacingY() {
  return euler ? euler.y : 0;
}
export function getIsMoving() {
  return moveState.forward || moveState.backward || moveState.left || moveState.right;
}
export function getVelocity() {
  return velocity;
}
