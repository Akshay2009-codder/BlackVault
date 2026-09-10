// Stylized sci-fi player character for third-person view.
// Clean low-poly design with glowing cyan accents and visor.

import * as THREE from "three";
import { setPlayerBodyMesh, getPlayerFacingY, getIsMoving, getVelocity, getIsRunning, getIsGrounded } from "./player.js";

let bodyMesh = null;
let bodyParts = {};
let walkCycle = 0;
let idleTime = 0;

// ── Materials ──────────────────────────────────────────────────────────
const suitMat = new THREE.MeshStandardMaterial({ color: 0x1a2030, roughness: 0.5, metalness: 0.3 });
const armorMat = new THREE.MeshStandardMaterial({ color: 0x252e3e, roughness: 0.35, metalness: 0.5 });
const glowMat = new THREE.MeshStandardMaterial({ color: 0x2f80ed, emissive: 0x2f80ed, emissiveIntensity: 0.8, roughness: 0.2 });
const visorMat = new THREE.MeshStandardMaterial({ color: 0x2f80ed, emissive: 0x2f80ed, emissiveIntensity: 1.2, roughness: 0.1, metalness: 0.9 });
const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.75 });
const bootMat = new THREE.MeshStandardMaterial({ color: 0x0e1420, roughness: 0.4, metalness: 0.6 });

export function createPlayerCharacter(scene) {
  bodyMesh = new THREE.Group();
  bodyMesh.name = "PlayerBody";
  bodyMesh.visible = false;
  scene.add(bodyMesh);

  buildBody();
  setPlayerBodyMesh(bodyMesh);
  return bodyMesh;
}

function buildBody() {
  // ── Torso ──────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 0.52, 12),
    armorMat
  );
  torso.position.y = 1.30;
  torso.castShadow = true;
  bodyMesh.add(torso);
  bodyParts.torso = torso;

  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.28, 0.06),
    armorMat
  );
  chestPlate.position.set(0, 0.05, 0.10);
  torso.add(chestPlate);

  const chestGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.22, 0.02),
    glowMat
  );
  chestGlow.position.set(0, 0.05, 0.14);
  torso.add(chestGlow);

  [-0.24, 0.24].forEach((sx) => {
    const pad = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      armorMat
    );
    pad.scale.set(1, 0.7, 1);
    pad.position.set(sx, 0.22, 0);
    torso.add(pad);

    const shoulderGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.02, 0.06),
      glowMat
    );
    shoulderGlow.position.set(sx, 0.26, 0);
    torso.add(shoulderGlow);
  });

  // ── Hips / Belt ────────────────────────────────────────────────────
  const hips = new THREE.Mesh(
    new THREE.CylinderGeometry(0.20, 0.17, 0.16, 12),
    suitMat
  );
  hips.position.y = 1.02;
  bodyMesh.add(hips);
  bodyParts.hips = hips;

  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.215, 0.04, 12),
    armorMat
  );
  belt.position.y = 1.115;
  bodyMesh.add(belt);

  const beltGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.03, 0.06),
    glowMat
  );
  beltGlow.position.set(0, 1.115, 0.19);
  bodyMesh.add(beltGlow);

  // ── Arms ───────────────────────────────────────────────────────────
  function makeArm(sign) {
    const armGrp = new THREE.Group();
    armGrp.position.set(sign * 0.24, 1.47, 0);

    const upper = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.055, 0.24, 4, 8),
      suitMat
    );
    upper.position.y = -0.16;
    upper.castShadow = true;
    armGrp.add(upper);

    const foreGrp = new THREE.Group();
    foreGrp.position.y = -0.30;
    armGrp.add(foreGrp);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.048, 0.22, 4, 8),
      suitMat
    );
    forearm.position.y = -0.14;
    foreGrp.add(forearm);

    const wristGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.02, 10),
      glowMat
    );
    wristGlow.position.y = -0.24;
    foreGrp.add(wristGlow);

    const hand = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 6),
      skinMat
    );
    hand.position.y = -0.28;
    foreGrp.add(hand);

    return armGrp;
  }

  const leftArmGrp = makeArm(1);
  bodyMesh.add(leftArmGrp);
  bodyParts.leftArmGrp = leftArmGrp;
  bodyParts.lForearmGrp = leftArmGrp.children[1];

  const rightArmGrp = makeArm(-1);
  bodyMesh.add(rightArmGrp);
  bodyParts.rightArmGrp = rightArmGrp;
  bodyParts.rForearmGrp = rightArmGrp.children[1];

  // ── Legs ───────────────────────────────────────────────────────────
  function makeLeg(sign) {
    const legGrp = new THREE.Group();
    legGrp.position.set(sign * 0.09, 1.01, 0);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.07, 0.34, 4, 8),
      suitMat
    );
    thigh.position.y = -0.20;
    thigh.castShadow = true;
    legGrp.add(thigh);

    const shinGrp = new THREE.Group();
    shinGrp.position.y = -0.42;
    legGrp.add(shinGrp);

    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.06, 0.34, 4, 8),
      suitMat
    );
    shin.position.y = -0.20;
    shinGrp.add(shin);

    const kneeGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.02, 0.04),
      glowMat
    );
    kneeGlow.position.set(0, -0.02, 0.06);
    shinGrp.add(kneeGlow);

    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.08, 0.18),
      bootMat
    );
    boot.position.set(0, -0.44, 0.03);
    shinGrp.add(boot);

    return legGrp;
  }

  const leftLegGrp = makeLeg(1);
  bodyMesh.add(leftLegGrp);
  bodyParts.leftLegGrp = leftLegGrp;
  bodyParts.lShinGrp = leftLegGrp.children[1];

  const rightLegGrp = makeLeg(-1);
  bodyMesh.add(rightLegGrp);
  bodyParts.rightLegGrp = rightLegGrp;
  bodyParts.rShinGrp = rightLegGrp.children[1];

  // ── Neck & Head ───────────────────────────────────────────────────
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.1, 10),
    skinMat
  );
  neck.position.y = 1.60;
  bodyMesh.add(neck);

  const headGrp = new THREE.Group();
  headGrp.position.y = 1.74;
  bodyMesh.add(headGrp);
  bodyParts.headGrp = headGrp;

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 10),
    armorMat
  );
  helmet.scale.set(1, 1.1, 1);
  helmet.position.y = 0.06;
  headGrp.add(helmet);

  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.05, 0.04),
    visorMat
  );
  visor.position.set(0, 0.04, 0.12);
  headGrp.add(visor);

  const helmetLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.01, 0.24),
    glowMat
  );
  helmetLine.position.set(0, 0.18, 0);
  headGrp.add(helmetLine);

  const bodyGlow = new THREE.PointLight(0x40d8f0, 0.6, 3.0);
  bodyGlow.position.set(0, 1.3, 0.3);
  bodyMesh.add(bodyGlow);
}

// ── Seating & Typing Animation State ────────────────────────────────
let isSittingState = false;
let sittingProgress = 0; // 0 (standing) to 1 (fully seated)
let typingTime = 0;

export function setPlayerSittingState(sitting) {
  isSittingState = sitting;
  if (sitting) {
    typingTime = 0;
  }
}

export function getPlayerSittingState() {
  return isSittingState;
}

// ── Update (called every frame from main.js) ──────────────────────────
export function updatePlayerCharacter(delta) {
  if (!bodyMesh || !bodyMesh.visible) return;

  const isMoving = getIsMoving();
  const isRunning = getIsRunning && getIsRunning();
  const isGrounded = getIsGrounded ? getIsGrounded() : true;

  idleTime += delta * 1.6;

  // ── 1. Sitting / Typing Animation ────────────────────────────────
  if (isSittingState || sittingProgress > 0.001) {
    if (isSittingState) {
      sittingProgress = Math.min(1, sittingProgress + delta * 3.5);
    } else {
      sittingProgress = Math.max(0, sittingProgress - delta * 4.0);
    }

    const t = sittingProgress; // smooth progress factor (0..1)
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    // Lower torso & hips to seat level
    if (bodyParts.torso) bodyParts.torso.position.y = 1.30 - 0.40 * easedT;
    if (bodyParts.hips) bodyParts.hips.position.y = 1.02 - 0.42 * easedT;

    // Thighs bend 90 degrees forward
    const thighRot = -Math.PI * 0.48 * easedT;
    if (bodyParts.leftLegGrp) bodyParts.leftLegGrp.rotation.x = thighRot;
    if (bodyParts.rightLegGrp) bodyParts.rightLegGrp.rotation.x = thighRot;

    // Shins bend 90 degrees downward
    const shinRot = Math.PI * 0.48 * easedT;
    if (bodyParts.lShinGrp) bodyParts.lShinGrp.rotation.x = shinRot;
    if (bodyParts.rShinGrp) bodyParts.rShinGrp.rotation.x = shinRot;

    // Arms reach forward towards terminal screen/keyboard
    let lArmRot = -0.55 * easedT;
    let rArmRot = -0.55 * easedT;
    let lForeRot = -0.45 * easedT;
    let rForeRot = -0.45 * easedT;

    // Active Typing Loop while fully seated
    if (easedT >= 0.95 && isSittingState) {
      typingTime += delta * 12.0;
      lArmRot += Math.sin(typingTime * 1.5) * 0.05;
      rArmRot += Math.cos(typingTime * 1.8) * 0.05;
      lForeRot += Math.sin(typingTime * 2.2) * 0.07;
      rForeRot += Math.cos(typingTime * 2.5) * 0.07;

      if (bodyParts.torso) bodyParts.torso.rotation.y = Math.sin(typingTime * 0.5) * 0.02;
      if (bodyParts.headGrp) bodyParts.headGrp.rotation.x = 0.12 + Math.sin(typingTime * 0.8) * 0.02;
    } else {
      if (bodyParts.headGrp) bodyParts.headGrp.rotation.x = 0.12 * easedT;
    }

    if (bodyParts.leftArmGrp) bodyParts.leftArmGrp.rotation.x = lArmRot;
    if (bodyParts.rightArmGrp) bodyParts.rightArmGrp.rotation.x = rArmRot;
    if (bodyParts.lForearmGrp) bodyParts.lForearmGrp.rotation.x = lForeRot;
    if (bodyParts.rForearmGrp) bodyParts.rForearmGrp.rotation.x = rForeRot;

    return;
  }

  // Restore head tilt when completely standing
  if (bodyParts.headGrp) bodyParts.headGrp.rotation.x = 0;

  // ── 2. Airborne Jump Pose ──────────────────────────────────────────
  if (!isGrounded) {
    if (bodyParts.leftLegGrp) bodyParts.leftLegGrp.rotation.x = -0.6;
    if (bodyParts.rightLegGrp) bodyParts.rightLegGrp.rotation.x = 0.4;
    if (bodyParts.lShinGrp) bodyParts.lShinGrp.rotation.x = 0.8;
    if (bodyParts.rShinGrp) bodyParts.rShinGrp.rotation.x = 0.6;
    if (bodyParts.leftArmGrp) bodyParts.leftArmGrp.rotation.x = 0.4;
    if (bodyParts.rightArmGrp) bodyParts.rightArmGrp.rotation.x = -0.4;
  } else if (isMoving) {
    // ── 3. Locomotion (Walk / Run) ───────────────────────────────────
    const cycleSpeed = isRunning ? 14.5 : 8.5;
    const swingAmp = isRunning ? 0.85 : 0.55;
    walkCycle += delta * cycleSpeed;
    const swing = Math.sin(walkCycle) * swingAmp;

    if (bodyParts.leftLegGrp) bodyParts.leftLegGrp.rotation.x = swing;
    if (bodyParts.rightLegGrp) bodyParts.rightLegGrp.rotation.x = -swing;

    if (bodyParts.lShinGrp) bodyParts.lShinGrp.rotation.x = Math.max(0, -swing) * 0.5;
    if (bodyParts.rShinGrp) bodyParts.rShinGrp.rotation.x = Math.max(0, swing) * 0.5;

    if (bodyParts.leftArmGrp) bodyParts.leftArmGrp.rotation.x = -swing * 0.6;
    if (bodyParts.rightArmGrp) bodyParts.rightArmGrp.rotation.x = swing * 0.6;

    if (bodyParts.torso) bodyParts.torso.rotation.y = Math.sin(walkCycle) * (isRunning ? 0.12 : 0.06);

    const bobOffset = Math.abs(Math.sin(walkCycle)) * (isRunning ? 0.07 : 0.04);
    if (bodyMesh) bodyMesh.position.y = (bodyMesh.position.y || 0) + bobOffset;
  } else {
    // ── 4. Idle Breathing ────────────────────────────────────────────
    const breath = Math.sin(idleTime) * 0.008;

    if (bodyParts.torso) bodyParts.torso.position.y = 1.30 + breath;
    if (bodyParts.leftArmGrp) bodyParts.leftArmGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.leftArmGrp.rotation.x, 0, 0.08);
    if (bodyParts.rightArmGrp) bodyParts.rightArmGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.rightArmGrp.rotation.x, 0, 0.08);
    if (bodyParts.leftLegGrp) bodyParts.leftLegGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.leftLegGrp.rotation.x, 0, 0.1);
    if (bodyParts.rightLegGrp) bodyParts.rightLegGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.rightLegGrp.rotation.x, 0, 0.1);
    if (bodyParts.lShinGrp) bodyParts.lShinGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.lShinGrp.rotation.x, 0, 0.1);
    if (bodyParts.rShinGrp) bodyParts.rShinGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.rShinGrp.rotation.x, 0, 0.1);
  }
}

export function getPlayerBodyMesh() {
  return bodyMesh;
}
