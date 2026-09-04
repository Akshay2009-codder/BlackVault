// Player controller — first/third-person camera, WASD movement, V to cycle view,
// pointer-lock mouse-look, walk-bob, seated terminal transitions.
// A separate procedural player body in the scene is shown in 3rd-person mode.

import * as THREE from "three";

// ── State ─────────────────────────────────────────────────────────────────────
let camera     = null;
let domElement = null;
let scene      = null;

// First-person arm meshes
let armsGroup = null;
let leftArm   = null;
let rightArm  = null;

// Third-person player body (set externally by character.js)
let playerBodyMesh = null;

const velocity   = new THREE.Vector3();
const direction  = new THREE.Vector3();
const moveState  = { forward: false, backward: false, left: false, right: false, sprint: false };

// The logical player world position (feet) — updated each frame
const playerPos = new THREE.Vector3(0, 0, 4.0);
// Facing direction (Y-axis Euler)
let facingY = 0;

let isLocked  = false;
let isSeated  = false;
let isTyping  = false;
let euler     = new THREE.Euler(0, 0, 0, "YXZ");
const SPEED   = 5.5;
const SPRINT  = 9.0;
const EYE_H   = 1.72;  // camera eye height

// ── Camera Modes ──────────────────────────────────────────────────────────────
// 0 = first person  1 = 3rd person close  2 = 3rd person far  3 = overhead
const CAMERA_MODES = ["first", "third_close", "third_far", "overhead"];
let cameraModeIdx  = 0;

const CAM_OFFSETS = {
  first:       { back: 0,    up: 0,    fov: 68 },
  third_close: { back: 2.8,  up: 0.9,  fov: 72 },
  third_far:   { back: 5.5,  up: 2.0,  fov: 65 },
  overhead:    { back: 0,    up: 9.0,  fov: 58 },
};

// Facility boundaries
const BOUND_MIN_X = -10.5;
const BOUND_MAX_X =  10.5;
const BOUND_MIN_Z = -140.0;
const BOUND_MAX_Z =   8.5;

// Walk animation timers
let walkTimer  = 0;
let idleTimer  = 0;
let typingTimer = 0;

// Smooth 3rd-person camera lerp target
const camTarget = new THREE.Vector3();
const camLook   = new THREE.Vector3();

// Seated transition
let seatTarget = {
  pos:   new THREE.Vector3(),
  lookAt:new THREE.Vector3(),
  standPos:   new THREE.Vector3(),
  standEuler: new THREE.Euler(),
  isTransitioning: false,
  progress: 0,
  isExiting: false,
};

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPlayer(cam, element = document.body, sceneRef = null) {
  camera    = cam;
  domElement = element;
  scene     = sceneRef;

  playerPos.set(0, 0, 4.0);
  camera.position.set(0, EYE_H, 4.0);
  euler.set(0, 0, 0);
  camera.quaternion.setFromEuler(euler);
  camera.fov = CAM_OFFSETS.first.fov;
  camera.updateProjectionMatrix();

  createPlayerArms();

  document.addEventListener("keydown", onKeyDown);
  document.addEventListener("keyup",   onKeyUp);
  document.addEventListener("mousemove", onMouseMove);

  element.addEventListener("click", () => {
    const anyOverlay = document.querySelector(".overlay:not(.hidden)");
    if (!anyOverlay && !isSeated) element.requestPointerLock();
  });

  document.addEventListener("pointerlockchange", () => {
    isLocked = document.pointerLockElement === element;
  });
}

// Called by character.js to hand the body mesh reference here
export function setPlayerBodyMesh(mesh) {
  playerBodyMesh = mesh;
}

// ── Key Handlers ──────────────────────────────────────────────────────────────
function onKeyDown(e) {
  switch (e.code) {
    case "KeyW": case "ArrowUp":    if (!isSeated) moveState.forward   = true; break;
    case "KeyS": case "ArrowDown":  if (!isSeated) moveState.backward  = true; break;
    case "KeyA": case "ArrowLeft":  if (!isSeated) moveState.left      = true; break;
    case "KeyD": case "ArrowRight": if (!isSeated) moveState.right     = true; break;
    case "ShiftLeft": case "ShiftRight": moveState.sprint = true; break;
    case "KeyV":
      if (!isSeated) cycleCameraMode();
      break;
  }
}

function onKeyUp(e) {
  switch (e.code) {
    case "KeyW": case "ArrowUp":    moveState.forward   = false; break;
    case "KeyS": case "ArrowDown":  moveState.backward  = false; break;
    case "KeyA": case "ArrowLeft":  moveState.left      = false; break;
    case "KeyD": case "ArrowRight": moveState.right     = false; break;
    case "ShiftLeft": case "ShiftRight": moveState.sprint = false; break;
  }
}

function onMouseMove(e) {
  if (!isLocked || !camera || isSeated) return;
  const mx = e.movementX || 0;
  const my = e.movementY || 0;
  euler.setFromQuaternion(camera.quaternion);
  euler.y -= mx * 0.0022;
  euler.x -= my * 0.0022;
  euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, euler.x));
  camera.quaternion.setFromEuler(euler);
  facingY = euler.y;
}

// ── Camera Mode ───────────────────────────────────────────────────────────────
function cycleCameraMode() {
  cameraModeIdx = (cameraModeIdx + 1) % CAMERA_MODES.length;
  const mode = CAMERA_MODES[cameraModeIdx];
  const cfg  = CAM_OFFSETS[mode];
  camera.fov = cfg.fov;
  camera.updateProjectionMatrix();

  // Arms only visible in first-person
  if (armsGroup) armsGroup.visible = (mode === "first");

  // Show/hide player body mesh
  if (playerBodyMesh) playerBodyMesh.visible = (mode !== "first");

  showCameraModeBadge(mode);
}

function showCameraModeBadge(mode) {
  let badge = document.getElementById("camera-mode-badge");
  if (!badge) {
    badge = document.createElement("div");
    badge.id = "camera-mode-badge";
    badge.style.cssText = `
      position:fixed; top:16px; left:50%; transform:translateX(-50%);
      background:rgba(255,255,255,0.82); border:1.5px solid rgba(46,204,113,0.6);
      color:#1a2130; font-family:'JetBrains Mono',monospace; font-size:13px;
      font-weight:700; padding:6px 18px; border-radius:20px;
      box-shadow:0 2px 12px rgba(0,0,0,0.12); z-index:25;
      transition:opacity 0.4s ease;
    `;
    document.body.appendChild(badge);
  }
  const labels = { first: "👁 First Person", third_close: "👤 3rd Person (Close)", third_far: "🎥 3rd Person (Far)", overhead: "🔭 Overhead View" };
  badge.textContent = labels[mode] || mode;
  badge.style.opacity = "1";
  clearTimeout(badge._t);
  badge._t = setTimeout(() => { badge.style.opacity = "0"; }, 2200);
}

// ── Seating ───────────────────────────────────────────────────────────────────
export function seatPlayerAtWorkstation(deskPosition, deskLookAt) {
  isSeated = true;
  isTyping = true;
  moveState.forward = moveState.backward = moveState.left = moveState.right = false;

  seatTarget.standPos.copy(camera.position);
  seatTarget.standEuler.copy(euler);
  seatTarget.pos.set(deskPosition.x, 1.28, deskPosition.z);
  seatTarget.lookAt.copy(deskLookAt);
  seatTarget.isTransitioning = true;
  seatTarget.progress = 0;
  seatTarget.isExiting = false;

  if (armsGroup) armsGroup.visible = true; // always show arms at computer
  if (playerBodyMesh) playerBodyMesh.visible = false;
}

export function standPlayerUp() {
  isTyping = false;
  seatTarget.isTransitioning = true;
  seatTarget.progress = 0;
  seatTarget.isExiting = true;
}

// ── Update ────────────────────────────────────────────────────────────────────
export function updatePlayer(delta) {
  if (!camera) return;

  const mode = CAMERA_MODES[cameraModeIdx];

  // ── Seated camera transition ──────────────────────────────────────────────
  if (seatTarget.isTransitioning) {
    seatTarget.progress = Math.min(1.0, seatTarget.progress + delta * 2.5);
    const t = smoothstep(seatTarget.progress);

    if (!seatTarget.isExiting) {
      camera.position.lerpVectors(seatTarget.standPos, seatTarget.pos, t);
      const tq = new THREE.Quaternion();
      const m  = new THREE.Matrix4();
      m.lookAt(camera.position, seatTarget.lookAt, new THREE.Vector3(0, 1, 0));
      tq.setFromRotationMatrix(m);
      camera.quaternion.slerp(tq, 0.18);
      if (t >= 1.0) seatTarget.isTransitioning = false;
    } else {
      camera.position.lerpVectors(seatTarget.pos, seatTarget.standPos, t);
      const sq = new THREE.Quaternion().setFromEuler(seatTarget.standEuler);
      camera.quaternion.slerp(sq, 0.2);
      if (t >= 1.0) {
        seatTarget.isTransitioning = false;
        isSeated = false;
        camera.position.copy(seatTarget.standPos);
        euler.copy(seatTarget.standEuler);
        camera.quaternion.setFromEuler(euler);
        // Restore correct visibility for current mode
        if (armsGroup) armsGroup.visible = (mode === "first");
        if (playerBodyMesh) playerBodyMesh.visible = (mode !== "first");
      }
    }
    updateArmsAnimation(delta);
    return;
  }

  // ── Movement ──────────────────────────────────────────────────────────────
  if (!isSeated) {
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(moveState.forward)  - Number(moveState.backward);
    direction.x = Number(moveState.right)    - Number(moveState.left);
    direction.normalize();

    const speed = moveState.sprint ? SPRINT : SPEED;

    if (moveState.forward  || moveState.backward) velocity.z -= direction.z * speed * 10.0 * delta;
    if (moveState.left     || moveState.right)    velocity.x += direction.x * speed * 10.0 * delta;

    const fwd = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), facingY);
    const rgt = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), facingY);

    playerPos.addScaledVector(fwd, -velocity.z * delta);
    playerPos.addScaledVector(rgt,  velocity.x * delta);
    playerPos.y = 0;

    playerPos.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, playerPos.x));
    playerPos.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, playerPos.z));
  }

  // ── Camera positioning per mode ───────────────────────────────────────────
  if (mode === "first") {
    camera.position.set(playerPos.x, playerPos.y + EYE_H, playerPos.z);
  } else {
    const cfg = CAM_OFFSETS[mode];
    // Compute camera position: behind player, elevated
    if (mode === "overhead") {
      camTarget.set(playerPos.x, playerPos.y + cfg.up, playerPos.z);
    } else {
      const behind = new THREE.Vector3(
        Math.sin(facingY) * cfg.back,
        0,
        Math.cos(facingY) * cfg.back
      );
      camTarget.set(playerPos.x + behind.x, playerPos.y + cfg.up, playerPos.z + behind.z);
    }
    camera.position.lerp(camTarget, 0.12);

    // Look at the player's head
    camLook.set(playerPos.x, playerPos.y + 1.4, playerPos.z);
    camera.lookAt(camLook);
    // Sync euler so mouse-look works after switching back
    euler.setFromQuaternion(camera.quaternion);
  }

  // ── Update player body mesh position & rotation ───────────────────────────
  if (playerBodyMesh) {
    const isMoving = moveState.forward || moveState.backward || moveState.left || moveState.right;
    playerBodyMesh.position.lerp(playerPos, 0.15);
    playerBodyMesh.position.y = 0;
    if (isMoving) {
      const targetRotY = facingY + Math.PI; // face the direction of travel
      playerBodyMesh.rotation.y = THREE.MathUtils.lerp(
        playerBodyMesh.rotation.y,
        targetRotY,
        0.15
      );
    }
  }

  updateArmsAnimation(delta);
}

// ── Arms Animation ────────────────────────────────────────────────────────────
function updateArmsAnimation(delta) {
  if (!armsGroup) return;
  const isMoving = (Math.abs(velocity.x) + Math.abs(velocity.z)) > 0.2 && !isSeated;
  idleTimer += delta * 1.8;

  if (isTyping || isSeated) {
    typingTimer += delta * 11.0;
    const typeL = Math.sin(typingTimer)       * 0.012;
    const typeR = Math.cos(typingTimer * 1.1) * 0.012;
    armsGroup.position.lerp(new THREE.Vector3(0, -0.05, 0.08), 0.1);
    if (leftArm)  { leftArm.rotation.x  = THREE.MathUtils.lerp(leftArm.rotation.x,  Math.PI / 2.3 + typeL, 0.1); leftArm.rotation.y  = THREE.MathUtils.lerp(leftArm.rotation.y,  0.25,  0.1); }
    if (rightArm) { rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, Math.PI / 2.3 + typeR, 0.1); rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, -0.25, 0.1); }
  } else if (isMoving) {
    walkTimer += delta * 9.5;
    const bobY = Math.sin(walkTimer * 2) * 0.013;
    const bobX = Math.cos(walkTimer)     * 0.016;
    armsGroup.position.set(bobX, bobY, 0);
    if (leftArm)  { leftArm.rotation.x  = Math.PI / 3.2 + Math.sin(walkTimer)  * 0.15; leftArm.rotation.z  = -0.15 + Math.cos(walkTimer)  * 0.05; }
    if (rightArm) { rightArm.rotation.x = Math.PI / 3.2 - Math.sin(walkTimer)  * 0.15; rightArm.rotation.z =  0.15 - Math.cos(walkTimer)  * 0.05; }
  } else {
    const breathY = Math.sin(idleTimer) * 0.004;
    const breathX = Math.cos(idleTimer * 0.5) * 0.002;
    armsGroup.position.lerp(new THREE.Vector3(breathX, breathY, 0), 0.08);
    if (leftArm)  { leftArm.rotation.x  = THREE.MathUtils.lerp(leftArm.rotation.x,  Math.PI / 3.2 + breathY * 2, 0.08); leftArm.rotation.z  = THREE.MathUtils.lerp(leftArm.rotation.z,  -0.15, 0.08); }
    if (rightArm) { rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, Math.PI / 3.2 + breathY * 2, 0.08); rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z,   0.15, 0.08); }
  }
}

// ── Procedural 1st-Person Arms (lab coat + skin) ──────────────────────────────
function createPlayerArms() {
  armsGroup = new THREE.Group();
  armsGroup.name = "PlayerArmsGroup";
  camera.add(armsGroup);

  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0xf2f2ef, roughness: 0.82, metalness: 0.0 });
  const cuffMat   = new THREE.MeshStandardMaterial({ color: 0xe5e4df, roughness: 0.72 });
  const skinMat   = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.78 });
  const nailMat   = new THREE.MeshStandardMaterial({ color: 0xe8c090, roughness: 0.5 });

  function createArm(isLeft = false) {
    const side = isLeft ? -1 : 1;
    const arm  = new THREE.Group();

    // Sleeve
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.062, 0.32, 12), sleeveMat);
    sleeve.rotation.x = Math.PI / 3.2;
    sleeve.rotation.z = side * -0.12;
    sleeve.position.set(side * 0.175, -0.21, -0.37);
    arm.add(sleeve);

    // Cuff
    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.055, 0.055, 12), cuffMat);
    cuff.position.set(0, -0.17, 0);
    sleeve.add(cuff);

    // Wrist skin
    const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.043, 0.07, 10), skinMat);
    wrist.position.set(0, -0.225, 0);
    sleeve.add(wrist);

    // Hand group
    const hg = new THREE.Group();
    hg.position.set(0, -0.28, 0);

    // Palm
    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.038), skinMat);
    hg.add(palm);

    // 4 Fingers
    [-0.028, -0.009, 0.010, 0.029].forEach((fx) => {
      const fg = new THREE.Group();
      fg.position.set(fx, -0.06, 0.006);
      fg.rotation.x = Math.PI / 6;
      [0.038, 0.032, 0.026].forEach((len, pi) => {
        const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.009 - pi * 0.001, 0.0095 - pi * 0.0005, len, 7), skinMat);
        ph.position.y = -(0.019 + pi * 0.035);
        fg.add(ph);
      });
      const nail = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 0.016), nailMat);
      nail.position.set(0, -0.096, 0.007); nail.rotation.x = -0.3;
      fg.add(nail);
      hg.add(fg);
    });

    // Thumb
    const tg = new THREE.Group();
    tg.position.set(side * 0.044, -0.024, 0.018);
    tg.rotation.z = side * -Math.PI / 3.5;
    tg.rotation.x = Math.PI / 8;
    [0.036, 0.028].forEach((len, ti) => {
      const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.01 - ti * 0.001, 0.011 - ti * 0.0005, len, 7), skinMat);
      tp.position.y = -(0.018 + ti * 0.034);
      tg.add(tp);
    });
    hg.add(tg);

    sleeve.add(hg);
    return { armGroup: arm, sleeve };
  }

  const left = createArm(true);
  leftArm = left.sleeve;
  armsGroup.add(left.armGroup);

  const right = createArm(false);
  rightArm = right.sleeve;
  armsGroup.add(right.armGroup);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function smoothstep(t) { return t * t * (3 - 2 * t); }

export function getPlayerPosition() {
  return playerPos;
}

export function getCameraMode() {
  return CAMERA_MODES[cameraModeIdx];
}

export function getPlayerFacingY() {
  return facingY;
}

export function getIsMoving() {
  return moveState.forward || moveState.backward || moveState.left || moveState.right;
}

export function getVelocity() {
  return velocity;
}

export function getControls() {
  return {
    isLocked,
    isSeated,
    lock:   () => domElement && domElement.requestPointerLock(),
    unlock: () => document.exitPointerLock && document.exitPointerLock(),
  };
}

export function sitAt(cam, seatPosition, seatLookAt, onComplete) {
  if (seatPosition && seatLookAt) {
    seatPlayerAtWorkstation(seatPosition, seatLookAt);
  } else if (seatPosition) {
    seatPlayerAtWorkstation(
      seatPosition,
      new THREE.Vector3(seatPosition.x, 1.45, seatPosition.z - 1)
    );
  }
  if (onComplete) setTimeout(onComplete, 350);
}
