// First-person player controller with procedural 3D arms/hands ("self" character),
// realistic walk bobbing, typing animation during terminal use, and seated camera transitions.

import * as THREE from "three";

let camera = null;
let domElement = null;
let armsGroup = null;
let leftArm = null;
let rightArm = null;
let leftHand = null;
let rightHand = null;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { forward: false, backward: false, left: false, right: false };

let isLocked = false;
let isSeated = false;
let isTyping = false;
let euler = new THREE.Euler(0, 0, 0, "YXZ");
const SPEED = 6.5;

// Multi-Room facility boundaries
const BOUND_MIN_X = -10.0;
const BOUND_MAX_X = 10.0;
const BOUND_MIN_Z = -134.0;
const BOUND_MAX_Z = 8.5;

// Animation timing & state
let walkTimer = 0;
let idleTimer = 0;
let typingTimer = 0;

// Seating camera lerp state
let seatTarget = {
  pos: new THREE.Vector3(),
  lookAt: new THREE.Vector3(),
  standPos: new THREE.Vector3(),
  standEuler: new THREE.Euler(),
  isTransitioning: false,
  progress: 0,
  isExiting: false,
};

export function initPlayer(cam, element = document.body) {
  camera = cam;
  domElement = element;

  // Set initial spawn position in Room 1
  camera.position.set(0, 1.7, 4.0);
  euler.set(0, 0, 0);
  camera.quaternion.setFromEuler(euler);

  // Build the procedural 3D player arms attached to the camera
  createPlayerArms();

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup", onKeyUp);
  document.addEventListener("mousemove", onMouseMove);

  element.addEventListener("click", () => {
    const pycharm = document.getElementById("pycharm-ide");
    const isOverlayOpen = pycharm && !pycharm.classList.contains("hidden");
    if (!isOverlayOpen && !isSeated) {
      element.requestPointerLock();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === element;
  });
}

/**
 * Creates 3D tactical sleeves and gloved hands attached to the camera
 */
function createPlayerArms() {
  armsGroup = new THREE.Group();
  armsGroup.name = "PlayerArmsGroup";
  camera.add(armsGroup);

  // Materials
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x18202c,
    roughness: 0.75,
    metalness: 0.2,
  });

  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x0c0f14,
    roughness: 0.5,
    metalness: 0.4,
  });

  const armorPlateMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.3,
    metalness: 0.8,
  });

  const cyanLedMat = new THREE.MeshBasicMaterial({
    color: 0x5ec8d8,
  });

  function createArm(isLeft = false) {
    const side = isLeft ? -1 : 1;
    const arm = new THREE.Group();

    // Forearm / Sleeve
    const sleeveGeo = new THREE.CylinderGeometry(0.048, 0.058, 0.35, 12);
    const sleeve = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeve.rotation.x = Math.PI / 3.2;
    sleeve.rotation.z = side * -0.15;
    sleeve.position.set(side * 0.18, -0.22, -0.38);
    arm.add(sleeve);

    // Tactical forearm plate / smartwatch device
    const plateGeo = new THREE.BoxGeometry(0.06, 0.12, 0.02);
    const plate = new THREE.Mesh(plateGeo, armorPlateMat);
    plate.position.set(0, 0, 0.05);
    plate.rotation.x = -Math.PI / 20;
    sleeve.add(plate);

    // Smartwatch cyan HUD status strip on left arm
    if (isLeft) {
      const screenGeo = new THREE.PlaneGeometry(0.035, 0.07);
      const screen = new THREE.Mesh(screenGeo, cyanLedMat);
      screen.position.set(0, 0, 0.062);
      sleeve.add(screen);
    }

    // Wrist
    const wristGeo = new THREE.CylinderGeometry(0.04, 0.044, 0.08, 10);
    const wrist = new THREE.Mesh(wristGeo, gloveMat);
    wrist.position.set(0, -0.18, 0);
    sleeve.add(wrist);

    // Palm / Glove hand
    const handGroup = new THREE.Group();
    handGroup.position.set(0, -0.25, 0);

    const palmGeo = new THREE.BoxGeometry(0.07, 0.09, 0.035);
    const palm = new THREE.Mesh(palmGeo, gloveMat);
    handGroup.add(palm);

    // Knuckle armor guard
    const knuckleGeo = new THREE.BoxGeometry(0.072, 0.025, 0.04);
    const knuckle = new THREE.Mesh(knuckleGeo, armorPlateMat);
    knuckle.position.set(0, -0.02, 0.005);
    handGroup.add(knuckle);

    // Fingers
    for (let i = 0; i < 4; i++) {
      const fingerGeo = new THREE.BoxGeometry(0.014, 0.05, 0.016);
      const finger = new THREE.Mesh(fingerGeo, gloveMat);
      finger.position.set((i - 1.5) * 0.016, -0.06, 0);
      finger.rotation.x = Math.PI / 5;
      handGroup.add(finger);
    }

    // Thumb
    const thumbGeo = new THREE.BoxGeometry(0.015, 0.045, 0.016);
    const thumb = new THREE.Mesh(thumbGeo, gloveMat);
    thumb.position.set(side * 0.038, -0.02, 0.015);
    thumb.rotation.z = side * -Math.PI / 4;
    thumb.rotation.x = Math.PI / 6;
    handGroup.add(thumb);

    sleeve.add(handGroup);

    return { armGroup: arm, sleeve, handGroup };
  }

  const left = createArm(true);
  leftArm = left.sleeve;
  leftHand = left.handGroup;
  armsGroup.add(left.armGroup);

  const right = createArm(false);
  rightArm = right.sleeve;
  rightHand = right.handGroup;
  armsGroup.add(right.armGroup);

  armsGroup.position.set(0, 0, 0);
}

function onKeyDown(e) {
  if (isSeated) return;
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
  if (!isLocked || !camera || isSeated) return;

  const movementX = e.movementX || 0;
  const movementY = e.movementY || 0;

  euler.setFromQuaternion(camera.quaternion);
  euler.y -= movementX * 0.0022;
  euler.x -= movementY * 0.0022;
  euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));

  camera.quaternion.setFromEuler(euler);
}

/**
 * Animate smooth camera seating when player accesses a computer terminal near the door
 */
export function seatPlayerAtWorkstation(deskPosition, deskLookAt) {
  isSeated = true;
  isTyping = true;
  moveState.forward = false;
  moveState.backward = false;
  moveState.left = false;
  moveState.right = false;

  seatTarget.standPos.copy(camera.position);
  seatTarget.standEuler.copy(euler);

  // Position player in chair: seated height 1.28m
  seatTarget.pos.set(deskPosition.x, 1.28, deskPosition.z);
  seatTarget.lookAt.copy(deskLookAt);
  seatTarget.isTransitioning = true;
  seatTarget.progress = 0;
  seatTarget.isExiting = false;
}

/**
 * Return player from seated position back to first person walking
 */
export function standPlayerUp() {
  isTyping = false;
  seatTarget.isTransitioning = true;
  seatTarget.progress = 0;
  seatTarget.isExiting = true;
}

export function updatePlayer(delta) {
  if (!camera) return;

  // Handle Seated Camera Lerp Transition
  if (seatTarget.isTransitioning) {
    seatTarget.progress += delta * 2.5; // ~0.4s smooth glide
    const t = Math.min(1.0, seatTarget.progress);
    const smoothT = t * t * (3 - 2 * t); // Smoothstep

    if (!seatTarget.isExiting) {
      // Sitting down at computer
      camera.position.lerpVectors(seatTarget.standPos, seatTarget.pos, smoothT);
      const targetQuat = new THREE.Quaternion();
      const m = new THREE.Matrix4();
      m.lookAt(camera.position, seatTarget.lookAt, new THREE.Vector3(0, 1, 0));
      targetQuat.setFromRotationMatrix(m);
      camera.quaternion.slerp(targetQuat, 0.15);

      if (t >= 1.0) {
        seatTarget.isTransitioning = false;
      }
    } else {
      // Standing up
      camera.position.lerpVectors(seatTarget.pos, seatTarget.standPos, smoothT);
      const standQuat = new THREE.Quaternion().setFromEuler(seatTarget.standEuler);
      camera.quaternion.slerp(standQuat, 0.2);

      if (t >= 1.0) {
        seatTarget.isTransitioning = false;
        isSeated = false;
        camera.position.copy(seatTarget.standPos);
        euler.copy(seatTarget.standEuler);
        camera.quaternion.setFromEuler(euler);
      }
    }
  }

  // Normal movement when not seated
  if (!isSeated) {
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

    // Clamp within facility room boundaries
    camera.position.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, camera.position.x));
    camera.position.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, camera.position.z));
  }

  // Update Procedural Arms Animations
  updateArmsAnimation(delta);
}

/**
 * Natural first-person arms sway, walk bob, and typing motions
 */
function updateArmsAnimation(delta) {
  if (!armsGroup) return;

  const speedSq = velocity.x * velocity.x + velocity.z * velocity.z;
  const isMoving = speedSq > 0.1 && !isSeated;

  idleTimer += delta * 2.0;

  if (isTyping || isSeated) {
    // Seated / Typing pose on computer keyboard
    typingTimer += delta * 12.0;
    const typeOffsetL = Math.sin(typingTimer) * 0.012;
    const typeOffsetR = Math.cos(typingTimer * 1.1) * 0.012;

    armsGroup.position.lerp(new THREE.Vector3(0, -0.05, 0.08), 0.1);
    if (leftArm) {
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, Math.PI / 2.3 + typeOffsetL, 0.1);
      leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, 0.25, 0.1);
    }
    if (rightArm) {
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, Math.PI / 2.3 + typeOffsetR, 0.1);
      rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, -0.25, 0.1);
    }
  } else if (isMoving) {
    // Walking arm swing & view bobbing
    walkTimer += delta * 9.5;
    const bobY = Math.sin(walkTimer * 2) * 0.014;
    const bobX = Math.cos(walkTimer) * 0.018;

    armsGroup.position.set(bobX, bobY, 0);

    if (leftArm) {
      leftArm.rotation.x = Math.PI / 3.2 + Math.sin(walkTimer) * 0.15;
      leftArm.rotation.z = -0.15 + Math.cos(walkTimer) * 0.05;
    }
    if (rightArm) {
      rightArm.rotation.x = Math.PI / 3.2 - Math.sin(walkTimer) * 0.15;
      rightArm.rotation.z = 0.15 - Math.cos(walkTimer) * 0.05;
    }
  } else {
    // Idle breathing sway
    const breathY = Math.sin(idleTimer) * 0.005;
    const breathX = Math.cos(idleTimer * 0.5) * 0.003;

    armsGroup.position.lerp(new THREE.Vector3(breathX, breathY, 0), 0.1);

    if (leftArm) {
      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, Math.PI / 3.2 + breathY * 2, 0.1);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, -0.15, 0.1);
    }
    if (rightArm) {
      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, Math.PI / 3.2 + breathY * 2, 0.1);
      rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.15, 0.1);
    }
  }
}

export function getPlayerPosition() {
  return camera ? camera.position : new THREE.Vector3();
}

export function getControls() {
  return {
    isLocked,
    isSeated,
    lock: () => domElement && domElement.requestPointerLock(),
    unlock: () => document.exitPointerLock && document.exitPointerLock(),
  };
}
