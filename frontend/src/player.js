// First-person / third-person player controller with V-key camera toggle,
// WASD movement, mouse look, collision bounds, walking bob, and the
// "sit down at terminal" camera transition.
//
// The first-person arms are loaded from a Sketchfab GLTF character model
// (assets/models/fp_arms/scene.gltf). Only the arms mesh is shown; body,
// head, pants, hair, and weapon are hidden. Arm bones are driven
// procedurally (idle breathing + walk sway) since the model has no
// embedded animation clips. Falls back to procedural capsule-geometry
// arms if the GLTF fails to load.

import * as THREE from "three";
import { loadModel } from "./modelLoader.js";
import { setPlayerSittingState } from "./character.js";

let camera = null;
let domElement = null;
let playerBodyMesh = null;

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const moveState = { forward: false, backward: false, left: false, right: false, shift: false };

let isLocked = false;
let euler = new THREE.Euler(0, 0, 0, "YXZ");
const WALK_SPEED = 7.0;
const RUN_SPEED = 12.0;
const EYE_HEIGHT = 1.7;

// --- Jump & Vertical Physics ---
let posY = 0;
let velocityY = 0;
const GRAVITY = -24.0;
const JUMP_IMPULSE = 8.5;
let isGrounded = true;

// Studio room & facility boundaries (5 sequential rooms along Z-axis)
const BOUND_MIN_X = -14.0;
const BOUND_MAX_X = 14.0;
const BOUND_MIN_Z = -5.0;
let BOUND_MAX_Z = 20.8; // Expands dynamically as security doors are unlocked

export function setMaxZBound(maxZ) {
  BOUND_MAX_Z = maxZ;
}

// --- Camera mode system ---
let cameraMode = "first-person"; // "first-person" | "third-person"
const TP_OFFSET = new THREE.Vector3(0, 1.2, 3.5); // behind + above
let tpTargetPos = new THREE.Vector3();

// --- Visible first-person body (arms) ---
let armsGroup = null;
let walkTime = 0;

// --- View-model state ---
let viewModelLoaded = false;  // true when GLTF arms are active
let armBones = {};            // named bone references for procedural animation
const VIEW_MODEL_PATH = "assets/models/fp_arms/scene.gltf";

// Bone names from the Sketchfab character rig
const BONE_NAMES = {
  upperArmL: "Skin_1:upperarm_l_06",
  lowerArmL: "Skin_1:lowerarm_l_07",
  handL:     "Skin_1:hand_l_08",
  twistLowerL: "Skin_1:lowerarm_twist_01_l_024",
  twistUpperL: "Skin_1:upperarm_twist_01_l_025",
  upperArmR: "Skin_1:upperarm_r_029",
  lowerArmR: "Skin_1:lowerarm_r_030",
  handR:     "Skin_1:hand_r_031",
  twistLowerR: "Skin_1:lowerarm_twist_01_r_047",
  twistUpperR: "Skin_1:upperarm_twist_01_r_048",
  clavicleL: "Skin_1:clavicle_l_05",
  clavicleR: "Skin_1:clavicle_r_028",
  spine3:    "Skin_1:spine_03_04",
};

// Meshes to keep visible (arms only)
const VISIBLE_MESHES = ["Skin_1Arms2"];

// Store rest-pose quaternions so we can animate relative to them
let restPoses = {};

// ── Procedural fallback arms (kept if GLTF is absent) ─────────────────

function buildProceduralArms() {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a679, roughness: 0.65 });
  const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x221c18, roughness: 0.5 });

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

    const wristGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.048, 0.015, 8),
      new THREE.MeshStandardMaterial({ color: 0xb8912f, emissive: 0xb8912f, emissiveIntensity: 0.6 })
    );
    wristGlow.position.set(sign * 0.19, -0.30, -0.38);
    wristGlow.rotation.x = 0.5;
    arm.add(wristGlow);

    return arm;
  }

  group.add(makeArm(1));
  group.add(makeArm(-1));
  group.position.set(0, 0, 0);
  return group;
}

// ── View-model loader ─────────────────────────────────────────────────

function loadViewModel() {
  return new Promise((resolve) => {
    loadModel(
      VIEW_MODEL_PATH,
      (result) => {
        const scene = result.scene;

        const allMeshNames = [];
        scene.traverse((child) => {
          if (child.isMesh || child.isGroup || child.isSkinnedMesh) {
            allMeshNames.push({ name: child.name, type: child.type });
          }
        });
        console.log("[ViewModel] All meshes/groups in GLTF:", allMeshNames);

        scene.traverse((child) => {
          if (child.isMesh) {
            let keepVisible = false;
            let node = child;
            while (node) {
              const n = node.name || "";
              if (n.includes("Arms") || n.includes("Arm") ||
                  VISIBLE_MESHES.some(v => n.includes(v))) {
                keepVisible = true;
                break;
              }
              node = node.parent;
            }

            if (keepVisible) {
              child.renderOrder = 999;
              if (child.material) {
                child.material = child.material.clone();
                child.material.depthTest = false;
              }
              child.frustumCulled = false;
              console.log("[ViewModel] Keeping mesh visible:", child.name);
            } else {
              child.visible = false;
            }
          }
        });

        const allBones = [];
        scene.traverse((child) => {
          if (child.isBone) {
            allBones.push(child.name);
          }
        });

        const boneIndex = new Map();
        scene.traverse((child) => {
          if (child.isBone && child.name) {
            boneIndex.set(child.name, child);
          }
        });

        for (const [key, boneName] of Object.entries(BONE_NAMES)) {
          let bone = boneIndex.get(boneName);
          if (!bone) {
            const sanitized = boneName.replace(/:/g, "_");
            bone = boneIndex.get(sanitized);
          }
          if (!bone) {
            const suffix = boneName.split(":").pop();
            for (const [name, b] of boneIndex) {
              if (name.includes(suffix)) {
                bone = b;
                break;
              }
            }
          }
          if (bone) {
            armBones[key] = bone;
            restPoses[key] = bone.quaternion.clone();
          } else {
            console.warn(`[ViewModel] Bone "${boneName}" not found`);
          }
        }

        const wrapper = new THREE.Group();
        wrapper.add(scene);

        wrapper.position.set(0, -1.55, -0.15);
        wrapper.scale.set(110, 110, 110);

        viewModelLoaded = true;
        armsGroup = wrapper;

        const boneCount = Object.keys(armBones).length;
        console.log(`[ViewModel] Loaded scene.gltf — showing arms only, ${boneCount} bones cached`);
        resolve(true);
      },
      (err) => {
        console.warn("[ViewModel] Could not load scene.gltf, using procedural fallback:", err);
        resolve(false);
      }
    );
  });
}

// ── Procedural bone animation ─────────────────────────────────────────

const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();

function animateArmBones(delta, moving) {
  if (!viewModelLoaded) return;

  if (moving) {
    const mult = moveState.shift ? 1.6 : 1.0;
    const swing = Math.sin(walkTime * mult) * 0.18;
    const counterSwing = Math.sin(walkTime * mult + Math.PI) * 0.18;

    if (armBones.upperArmL && restPoses.upperArmL) {
      _q.copy(restPoses.upperArmL);
      _axis.set(1, 0, 0);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis, swing));
      armBones.upperArmL.quaternion.slerp(_q, 0.3);
    }
    if (armBones.upperArmR && restPoses.upperArmR) {
      _q.copy(restPoses.upperArmR);
      _axis.set(1, 0, 0);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis, counterSwing));
      armBones.upperArmR.quaternion.slerp(_q, 0.3);
    }

    const foreSwing = Math.abs(Math.sin(walkTime * mult)) * 0.10;
    if (armBones.lowerArmL && restPoses.lowerArmL) {
      _q.copy(restPoses.lowerArmL);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(1, 0, 0), -foreSwing));
      armBones.lowerArmL.quaternion.slerp(_q, 0.3);
    }
    if (armBones.lowerArmR && restPoses.lowerArmR) {
      _q.copy(restPoses.lowerArmR);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(1, 0, 0), -foreSwing));
      armBones.lowerArmR.quaternion.slerp(_q, 0.3);
    }

    const shoulderBob = Math.sin(walkTime * mult * 2) * 0.04;
    if (armBones.clavicleL && restPoses.clavicleL) {
      _q.copy(restPoses.clavicleL);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(0, 0, 1), shoulderBob));
      armBones.clavicleL.quaternion.slerp(_q, 0.2);
    }
    if (armBones.clavicleR && restPoses.clavicleR) {
      _q.copy(restPoses.clavicleR);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(0, 0, 1), -shoulderBob));
      armBones.clavicleR.quaternion.slerp(_q, 0.2);
    }

  } else {
    const idleTime = performance.now() * 0.001;
    const breathe = Math.sin(idleTime * 1.8) * 0.015;
    const drift = Math.sin(idleTime * 0.7) * 0.008;

    if (armBones.upperArmL && restPoses.upperArmL) {
      _q.copy(restPoses.upperArmL);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(1, 0, 0), breathe));
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(0, 0, 1), drift));
      armBones.upperArmL.quaternion.slerp(_q, 0.15);
    }
    if (armBones.upperArmR && restPoses.upperArmR) {
      _q.copy(restPoses.upperArmR);
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(1, 0, 0), breathe));
      _q.multiply(new THREE.Quaternion().setFromAxisAngle(_axis.set(0, 0, 1), -drift));
      armBones.upperArmR.quaternion.slerp(_q, 0.15);
    }

    if (armBones.lowerArmL && restPoses.lowerArmL) {
      armBones.lowerArmL.quaternion.slerp(restPoses.lowerArmL, 0.1);
    }
    if (armBones.lowerArmR && restPoses.lowerArmR) {
      armBones.lowerArmR.quaternion.slerp(restPoses.lowerArmR, 0.1);
    }

    if (armBones.clavicleL && restPoses.clavicleL) {
      armBones.clavicleL.quaternion.slerp(restPoses.clavicleL, 0.1);
    }
    if (armBones.clavicleR && restPoses.clavicleR) {
      armBones.clavicleR.quaternion.slerp(restPoses.clavicleR, 0.1);
    }
  }
}

// ── Init ──────────────────────────────────────────────────────────────

export async function initPlayer(cam, element = document.body, sceneRef = null) {
  camera = cam;
  domElement = element;

  if (sceneRef && cam && !cam.parent) {
    sceneRef.add(cam);
  }

  const loaded = await loadViewModel();
  if (!loaded) {
    armsGroup = buildProceduralArms();
  }
  camera.add(armsGroup);

  camera.position.set(0, EYE_HEIGHT, 0);
  euler.set(0, Math.PI, 0, "YXZ");
  camera.quaternion.setFromEuler(euler);

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
  // CRITICAL: fully ignore all input while movement is locked (sit transition / terminal open)
  // Without this guard, holding a key at the moment of interaction leaves moveState dirty.
  if (movementLocked) {
    // Extra safety: clear any stale move state just in case
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    moveState.shift = false;
    return;
  }

  if (e.code === "KeyV") {
    toggleCameraMode();
    return;
  }

  if (e.code === "Space") {
    if (isGrounded) {
      velocityY = JUMP_IMPULSE;
      isGrounded = false;
    }
    return;
  }

  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    moveState.shift = true;
    return;
  }

  switch (e.code) {
    case "KeyW": case "ArrowUp": moveState.forward = true; break;
    case "KeyS": case "ArrowDown": moveState.backward = true; break;
    case "KeyA": case "ArrowLeft": moveState.left = true; break;
    case "KeyD": case "ArrowRight": moveState.right = true; break;
  }
}

function onKeyUp(e) {
  if (movementLocked) {
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    moveState.shift = false;
    return;
  }

  if (e.code === "ShiftLeft" || e.code === "ShiftRight") {
    moveState.shift = false;
    return;
  }

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

function toggleCameraMode() {
  if (cameraMode === "first-person") {
    cameraMode = "third-person";
    if (armsGroup) armsGroup.visible = false;
    if (playerBodyMesh) playerBodyMesh.visible = true;
  } else {
    cameraMode = "first-person";
    if (armsGroup) armsGroup.visible = true;
    if (playerBodyMesh) playerBodyMesh.visible = false;
  }
}

export function getCameraMode() {
  return cameraMode;
}

export function getIsRunning() {
  return moveState.shift;
}

export function getIsGrounded() {
  return isGrounded;
}

const _playerWorldPos = new THREE.Vector3();

export function updatePlayer(delta) {
  if (!camera || movementLocked) {
    velocity.set(0, 0, 0);
    return;
  }

  // Vertical Jump & Gravity Physics
  if (!isGrounded) {
    velocityY += GRAVITY * delta;
    posY += velocityY * delta;
    if (posY <= 0) {
      posY = 0;
      velocityY = 0;
      isGrounded = true;
    }
  }

  velocity.x -= velocity.x * 10.0 * delta;
  velocity.z -= velocity.z * 10.0 * delta;

  direction.z = Number(moveState.forward) - Number(moveState.backward);
  direction.x = Number(moveState.right) - Number(moveState.left);
  direction.normalize();

  const currentSpeed = moveState.shift ? RUN_SPEED : WALK_SPEED;

  if (moveState.forward || moveState.backward) {
    velocity.z -= direction.z * currentSpeed * 10.0 * delta;
  }
  if (moveState.left || moveState.right) {
    velocity.x += direction.x * currentSpeed * 10.0 * delta;
  }

  const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
  const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);

  if (cameraMode === "first-person") {
    camera.position.addScaledVector(forward, -velocity.z * delta);
    camera.position.addScaledVector(right, velocity.x * delta);

    camera.position.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, camera.position.x));
    camera.position.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, camera.position.z));

    const moving = moveState.forward || moveState.backward || moveState.left || moveState.right;
    const bobMult = moveState.shift ? 14 : 9;
    const bobAmp = moveState.shift ? 0.055 : 0.035;

    if (moving && isLocked && isGrounded) {
      walkTime += delta * bobMult;
      camera.position.y = EYE_HEIGHT + posY + Math.sin(walkTime) * bobAmp;

      if (armsGroup) {
        const baseY = viewModelLoaded ? -1.55 : 0;
        armsGroup.position.y = baseY + Math.sin(walkTime * 2) * 0.015;
        armsGroup.rotation.z = Math.sin(walkTime) * 0.025;
      }
    } else {
      walkTime = 0;
      camera.position.y += (EYE_HEIGHT + posY - camera.position.y) * Math.min(1, delta * 12);

      if (armsGroup) {
        const baseY = viewModelLoaded ? -1.55 : 0;
        armsGroup.position.y += (baseY - armsGroup.position.y) * Math.min(1, delta * 8);
        armsGroup.rotation.z += (0 - armsGroup.rotation.z) * Math.min(1, delta * 8);
      }
    }

    animateArmBones(delta, moving && isLocked);

    _playerWorldPos.copy(camera.position);

    if (playerBodyMesh) {
      playerBodyMesh.position.set(camera.position.x, posY, camera.position.z);
      playerBodyMesh.rotation.y = euler.y;
    }

  } else {
    // Third-person mode
    if (playerBodyMesh) {
      playerBodyMesh.position.addScaledVector(forward, -velocity.z * delta);
      playerBodyMesh.position.addScaledVector(right, velocity.x * delta);

      playerBodyMesh.position.x = Math.max(BOUND_MIN_X, Math.min(BOUND_MAX_X, playerBodyMesh.position.x));
      playerBodyMesh.position.z = Math.max(BOUND_MIN_Z, Math.min(BOUND_MAX_Z, playerBodyMesh.position.z));
      playerBodyMesh.position.y = posY;

      playerBodyMesh.rotation.y = euler.y;

      const offset = TP_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), euler.y);
      tpTargetPos.set(
        playerBodyMesh.position.x + offset.x,
        playerBodyMesh.position.y + EYE_HEIGHT + offset.y,
        playerBodyMesh.position.z + offset.z
      );

      camera.position.lerp(tpTargetPos, Math.min(1, delta * 8));

      const lookTarget = new THREE.Vector3(
        playerBodyMesh.position.x,
        playerBodyMesh.position.y + EYE_HEIGHT,
        playerBodyMesh.position.z
      );
      camera.lookAt(lookTarget);

      _playerWorldPos.copy(playerBodyMesh.position);
      _playerWorldPos.y = EYE_HEIGHT + posY;
    }
  }
}

export function getPlayerPosition() {
  return _playerWorldPos.length() > 0 ? _playerWorldPos : (camera ? camera.position : new THREE.Vector3());
}

export function getControls() {
  return {
    isLocked,
    lock: () => domElement && domElement.requestPointerLock(),
    unlock: () => document.exitPointerLock && document.exitPointerLock(),
  };
}

// --- Sit-at-terminal camera transition ---
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
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    camera.position.lerpVectors(fromPos, toPos, eased);
    camera.quaternion.slerpQuaternions(fromQuat, toQuat, eased);
    if (armsGroup) {
      // Push arms slightly forward as the player sits down
      const baseZ = viewModelLoaded ? -0.15 : 0;
      armsGroup.position.z = baseZ + (-0.06 * eased);
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

  // ── Lock movement FIRST, before any other logic ───────────────────────────────
  // Zero ALL motion state immediately. This is belt-and-suspenders:
  // onKeyDown now guards against movementLocked, but we also zero here
  // to catch any residual velocity from physics accumulation.
  movementLocked = true;
  velocity.set(0, 0, 0);
  velocityY = 0;
  posY = 0;  // Prevent jump state carrying into seated animation
  isGrounded = true;
  moveState.forward = false;
  moveState.backward = false;
  moveState.left = false;
  moveState.right = false;
  moveState.shift = false;

  // Release pointer lock so mouse-look stops during the tween.
  // This prevents camera drift if the mouse moves during the animation.
  if (document.exitPointerLock) document.exitPointerLock();

  // Cancel any in-progress camera tween
  if (tweenHandle) {
    cancelAnimationFrame(tweenHandle);
    tweenHandle = null;
  }

  // Save current standing position so standUp() can return here
  if (camera) {
    standPosition.copy(camera.position);
    standPosition.y = EYE_HEIGHT;
  }

  // Snap (not tween) the player body mesh onto the chair prop immediately.
  // Tweening the body during the camera transition caused visual fighting.
  if (playerBodyMesh) {
    playerBodyMesh.position.set(pos.x, 0, pos.z);
    const lookDir = lookAt.clone().sub(pos);
    playerBodyMesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
  }

  // Trigger sitting-down animation on the character rig
  setPlayerSittingState(true);

  if (cameraMode === "third-person") {
    // In third-person, smoothly frame the character sitting at the workstation
    const seatFacing = lookAt.clone().sub(pos).normalize();
    const tpSeatCamPos = pos.clone().add(new THREE.Vector3(-seatFacing.z * 1.2 - seatFacing.x * 1.8, 1.4, seatFacing.x * 1.2 - seatFacing.z * 1.8));
    const tpSeatLookAt = pos.clone().add(new THREE.Vector3(0, 0.85, 0));
    tweenCamera(tpSeatCamPos, tpSeatLookAt, 550, cb);
  } else {
    // In first-person, animate directly into the chair screen view
    tweenCamera(pos, lookAt, 480, cb);
  }
}

export function standUp(onStood) {
  // Trigger standing-up animation
  setPlayerSittingState(false);
  velocity.set(0, 0, 0);
  moveState.forward = false;
  moveState.backward = false;
  moveState.left = false;
  moveState.right = false;
  moveState.shift = false;

  const backTo = standPosition.clone();
  const lookAt = backTo.clone().add(new THREE.Vector3(0, 0, -1));
  tweenCamera(backTo, lookAt, 400, () => {
    if (camera) {
      camera.position.copy(backTo);
      // Sync euler from the camera's current quaternion so mouse-look
      // doesn't snap when the player moves after standing up.
      euler.setFromQuaternion(camera.quaternion, "YXZ");
    }
    if (armsGroup) {
      const baseZ = viewModelLoaded ? -0.15 : 0;
      armsGroup.position.z = baseZ;
    }
    movementLocked = false;
    // Re-acquire pointer lock automatically
    if (domElement) {
      domElement.requestPointerLock();
    }
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
