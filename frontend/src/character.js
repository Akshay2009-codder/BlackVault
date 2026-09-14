// BlackVault — Advanced Character Model & Animation Controller
// High-fidelity stylized sci-fi research operative with proper human anatomical
// proportions (1.84m tall, 7.8 heads tall) and continuous weight-blended
// animation state machine (idle, walk, run, jump, sit-down, typing, stand-up).

import * as THREE from "three";
import {
  setPlayerBodyMesh,
  getIsMoving,
  getIsRunning,
  getIsGrounded,
  getVelocity,
} from "./player.js";

let bodyMesh = null;
let bodyParts = {};

// ── Animation Timers & State Machine ──────────────────────────────────────────
let animTime = 0;
let walkCycle = 0;
let typingTime = 0;

// Continuous blend weights (0.0 to 1.0)
const weights = {
  idle: 1.0,
  walk: 0.0,
  run: 0.0,
  jump: 0.0,
  sit: 0.0,
  typing: 0.0,
};

let isSittingRequested = false;
let sittingProgress = 0; // 0 = fully standing, 1 = fully seated

// ── Materials ─────────────────────────────────────────────────────────────────
const suitMat = new THREE.MeshStandardMaterial({
  color: 0x15181f,
  roughness: 0.45,
  metalness: 0.35,
});

const armorMat = new THREE.MeshStandardMaterial({
  color: 0x222733,
  roughness: 0.28,
  metalness: 0.65,
});

const darkMat = new THREE.MeshStandardMaterial({
  color: 0x0c0e12,
  roughness: 0.6,
  metalness: 0.4,
});

const goldTrimMat = new THREE.MeshStandardMaterial({
  color: 0xd4af37,
  roughness: 0.2,
  metalness: 0.9,
});

const bootMat = new THREE.MeshStandardMaterial({
  color: 0x0d0f14,
  roughness: 0.4,
  metalness: 0.7,
});

// Glowing telemetry & visor — dynamically tinted by active floor accent
let currentAccentColor = 0xff3d81; // starts at Hot Pink (Floor 1)
const glowMat = new THREE.MeshStandardMaterial({
  color: currentAccentColor,
  emissive: currentAccentColor,
  emissiveIntensity: 1.6,
  roughness: 0.15,
});

const visorMat = new THREE.MeshStandardMaterial({
  color: 0x0a0c10,
  emissive: currentAccentColor,
  emissiveIntensity: 0.85,
  roughness: 0.05,
  metalness: 0.95,
});

export function setPlayerAccentColor(colorHexOrInt) {
  currentAccentColor = colorHexOrInt;
  glowMat.color.set(colorHexOrInt);
  glowMat.emissive.set(colorHexOrInt);
  visorMat.emissive.set(colorHexOrInt);
}

export function createPlayerCharacter(scene) {
  bodyMesh = new THREE.Group();
  bodyMesh.name = "PlayerBody";
  bodyMesh.visible = false;
  scene.add(bodyMesh);

  buildHighFidelityBody();
  setPlayerBodyMesh(bodyMesh);
  return bodyMesh;
}

// ── Procedural Skeletal Rigging & Anatomical Mesh Construction ─────────────────
// Forward direction is -Z (standard Three.js convention)
function buildHighFidelityBody() {
  bodyParts = {};

  // 1. Root Pelvis / Hips (Y = 0.98m)
  const pelvisGrp = new THREE.Group();
  pelvisGrp.position.y = 0.98;
  bodyMesh.add(pelvisGrp);
  bodyParts.pelvisGrp = pelvisGrp;

  // Pelvis armor block
  const pelvisMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.16, 0.16, 12),
    suitMat
  );
  pelvisMesh.castShadow = true;
  pelvisGrp.add(pelvisMesh);

  // Tactical utility belt with gold buckle
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.195, 0.195, 0.045, 14),
    armorMat
  );
  belt.position.y = 0.06;
  pelvisGrp.add(belt);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.05, 0.02),
    goldTrimMat
  );
  buckle.position.set(0, 0.06, -0.195);
  pelvisGrp.add(buckle);

  // Side equipment pouches
  [-0.19, 0.19].forEach((px) => {
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.07, 0.08),
      darkMat
    );
    pouch.position.set(px, 0.04, 0);
    pelvisGrp.add(pouch);
  });

  // 2. Spine & Torso (attached to Pelvis)
  const spineGrp = new THREE.Group();
  spineGrp.position.y = 0.10;
  pelvisGrp.add(spineGrp);
  bodyParts.spineGrp = spineGrp;

  // Abdomen
  const abdomen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.175, 0.18, 12),
    suitMat
  );
  abdomen.position.y = 0.09;
  spineGrp.add(abdomen);

  // Chest / Ribcage
  const chestGrp = new THREE.Group();
  chestGrp.position.y = 0.18;
  spineGrp.add(chestGrp);
  bodyParts.chestGrp = chestGrp;

  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.19, 0.28, 14),
    suitMat
  );
  chest.position.y = 0.14;
  chest.castShadow = true;
  chestGrp.add(chest);

  // Front ballistic chest plate
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.22, 0.05),
    armorMat
  );
  chestPlate.position.set(0, 0.16, -0.13);
  chestGrp.add(chestPlate);

  // Glowing power core strip on chest
  const chestGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.16, 0.015),
    glowMat
  );
  chestGlow.position.set(0, 0.16, -0.155);
  chestGrp.add(chestGlow);

  // Backpack energy pack
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.26, 0.09),
    armorMat
  );
  backpack.position.set(0, 0.16, 0.14);
  chestGrp.add(backpack);

  const packGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.02, 0.01),
    glowMat
  );
  packGlow.position.set(0, 0.22, 0.19);
  chestGrp.add(packGlow);

  // 3. Neck & Helmet Head
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.075, 0.09, 10),
    armorMat
  );
  neck.position.y = 0.32;
  chestGrp.add(neck);

  const headGrp = new THREE.Group();
  headGrp.position.y = 0.42;
  chestGrp.add(headGrp);
  bodyParts.headGrp = headGrp;

  // Aerodynamic combat helmet
  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.135, 16, 12),
    armorMat
  );
  helmet.scale.set(1.0, 1.15, 1.12);
  helmet.castShadow = true;
  headGrp.add(helmet);

  // High-gloss tinted curved visor
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.075, 0.06),
    visorMat
  );
  visor.position.set(0, 0.01, -0.115);
  headGrp.add(visor);

  // Visor telemetry glow HUD line
  const visorGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.008, 0.01),
    glowMat
  );
  visorGlow.position.set(0, 0.01, -0.146);
  headGrp.add(visorGlow);

  // Helmet crest
  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, 0.025, 0.24),
    glowMat
  );
  crest.position.set(0, 0.14, 0.01);
  headGrp.add(crest);

  // 4. Arms & Hands (Shoulders wide at X = ±0.26m)
  function buildArm(side) {
    const isRight = side > 0;
    const sign = isRight ? 1 : -1;

    // Shoulder clavicle joint
    const shoulderGrp = new THREE.Group();
    shoulderGrp.position.set(sign * 0.25, 0.27, 0);
    chestGrp.add(shoulderGrp);

    // Shoulder pauldron armor
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 10, 8),
      armorMat
    );
    pauldron.scale.set(1.0, 0.8, 1.0);
    pauldron.position.set(sign * 0.03, 0.02, 0);
    shoulderGrp.add(pauldron);

    const pauldronGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.015, 0.06),
      glowMat
    );
    pauldronGlow.position.set(sign * 0.03, 0.07, 0);
    shoulderGrp.add(pauldronGlow);

    // Upper arm
    const upperArmGrp = new THREE.Group();
    shoulderGrp.add(upperArmGrp);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.052, 0.22, 4, 8),
      suitMat
    );
    upperArm.position.y = -0.13;
    upperArm.castShadow = true;
    upperArmGrp.add(upperArm);

    // Forearm & Elbow
    const forearmGrp = new THREE.Group();
    forearmGrp.position.y = -0.27;
    upperArmGrp.add(forearmGrp);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.046, 0.22, 4, 8),
      suitMat
    );
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    forearmGrp.add(forearm);

    // Forearm bracer armor
    const bracer = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.14, 0.075),
      armorMat
    );
    bracer.position.y = -0.12;
    forearmGrp.add(bracer);

    // Wrist holographic comm pad (on left arm)
    if (!isRight) {
      const commPad = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.08, 0.015),
        glowMat
      );
      commPad.position.set(0, -0.12, -0.04);
      forearmGrp.add(commPad);
    }

    // Hand & Tactical Glove
    const handGrp = new THREE.Group();
    handGrp.position.y = -0.25;
    forearmGrp.add(handGrp);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.07, 0.035),
      darkMat
    );
    palm.position.y = -0.035;
    handGrp.add(palm);

    // Knuckle guard
    const knuckles = new THREE.Mesh(
      new THREE.BoxGeometry(0.068, 0.02, 0.02),
      goldTrimMat
    );
    knuckles.position.set(0, -0.04, -0.02);
    handGrp.add(knuckles);

    return {
      shoulderGrp,
      upperArmGrp,
      forearmGrp,
      handGrp,
    };
  }

  bodyParts.leftArm = buildArm(-1);
  bodyParts.rightArm = buildArm(1);

  // 5. Legs & Feet
  function buildLeg(side) {
    const isRight = side > 0;
    const sign = isRight ? 1 : -1;

    // Hip joint
    const hipGrp = new THREE.Group();
    hipGrp.position.set(sign * 0.10, -0.06, 0);
    pelvisGrp.add(hipGrp);

    // Thigh
    const thighGrp = new THREE.Group();
    hipGrp.add(thighGrp);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.072, 0.36, 4, 8),
      suitMat
    );
    thigh.position.y = -0.20;
    thigh.castShadow = true;
    thighGrp.add(thigh);

    // Thigh armor plate
    const thighPlate = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.20, 0.04),
      armorMat
    );
    thighPlate.position.set(0, -0.18, -0.065);
    thighGrp.add(thighPlate);

    // Knee & Shin
    const kneeGrp = new THREE.Group();
    kneeGrp.position.y = -0.42;
    thighGrp.add(kneeGrp);

    // Articulated knee cap
    const kneeCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.075, 0.07, 0.05),
      goldTrimMat
    );
    kneeCap.position.set(0, 0, -0.05);
    kneeGrp.add(kneeCap);

    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.062, 0.34, 4, 8),
      suitMat
    );
    shin.position.y = -0.19;
    shin.castShadow = true;
    kneeGrp.add(shin);

    // Shin armor guard with vertical telemetry line
    const shinGuard = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.24, 0.04),
      armorMat
    );
    shinGuard.position.set(0, -0.18, -0.055);
    kneeGrp.add(shinGuard);

    const shinGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.18, 0.01),
      glowMat
    );
    shinGlow.position.set(0, -0.18, -0.076);
    kneeGrp.add(shinGlow);

    // Foot / Tactical Boot
    const footGrp = new THREE.Group();
    footGrp.position.y = -0.42;
    kneeGrp.add(footGrp);

    const bootSole = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.045, 0.25),
      bootMat
    );
    bootSole.position.set(0, -0.025, -0.04);
    footGrp.add(bootSole);

    const bootUpper = new THREE.Mesh(
      new THREE.BoxGeometry(0.105, 0.08, 0.22),
      armorMat
    );
    bootUpper.position.set(0, 0.025, -0.03);
    footGrp.add(bootUpper);

    const toeCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.065, 0.08),
      goldTrimMat
    );
    toeCap.position.set(0, 0.015, -0.12);
    footGrp.add(toeCap);

    return {
      hipGrp,
      thighGrp,
      kneeGrp,
      footGrp,
    };
  }

  bodyParts.leftLeg = buildLeg(-1);
  bodyParts.rightLeg = buildLeg(1);
}

// ── Seating & Typing External API ──────────────────────────────────────────────
export function setPlayerSittingState(sitting) {
  isSittingRequested = sitting;
  if (sitting) {
    typingTime = 0;
  }
}

export function getPlayerSittingState() {
  return isSittingRequested;
}

export function getPlayerBodyMesh() {
  return bodyMesh;
}

// ── Continuous State-Blended Animation Loop ───────────────────────────────────
export function updatePlayerCharacter(delta) {
  if (!bodyMesh || !bodyMesh.visible) return;

  const isMoving = getIsMoving();
  const isRunning = getIsRunning ? getIsRunning() : false;
  const isGrounded = getIsGrounded ? getIsGrounded() : true;

  animTime += delta;

  // 1. Compute Target Weights for each State
  let targetIdle = 0;
  let targetWalk = 0;
  let targetRun = 0;
  let targetJump = 0;
  let targetSit = 0;
  let targetTyping = 0;

  if (isSittingRequested) {
    sittingProgress = Math.min(1.0, sittingProgress + delta * 2.8);
    targetSit = sittingProgress;
    if (sittingProgress >= 0.95) {
      targetTyping = 1.0;
    }
  } else {
    sittingProgress = Math.max(0.0, sittingProgress - delta * 3.5);
    targetSit = sittingProgress;

    if (!isGrounded) {
      targetJump = 1.0;
    } else if (isMoving) {
      if (isRunning) targetRun = 1.0;
      else targetWalk = 1.0;
    } else {
      targetIdle = 1.0;
    }
  }

  // 2. Exponential smoothing for continuous blending (zero snaps!)
  const blendRate = 1.0 - Math.exp(-14.0 * delta);
  weights.idle = THREE.MathUtils.lerp(weights.idle, targetIdle, blendRate);
  weights.walk = THREE.MathUtils.lerp(weights.walk, targetWalk, blendRate);
  weights.run = THREE.MathUtils.lerp(weights.run, targetRun, blendRate);
  weights.jump = THREE.MathUtils.lerp(weights.jump, targetJump, blendRate);
  weights.sit = THREE.MathUtils.lerp(weights.sit, targetSit, blendRate);
  weights.typing = THREE.MathUtils.lerp(weights.typing, targetTyping, blendRate);

  // Normalize active weights sum
  const sum =
    weights.idle +
    weights.walk +
    weights.run +
    weights.jump +
    weights.sit +
    0.0001;
  const wIdle = weights.idle / sum;
  const wWalk = weights.walk / sum;
  const wRun = weights.run / sum;
  const wJump = weights.jump / sum;
  const wSit = weights.sit / sum;
  const wType = weights.typing;

  // 3. Evaluate Kinematic Sub-states
  // (A) IDLE Pose Calculations
  const breath = Math.sin(animTime * 2.2) * 0.012;
  const idleArmSway = Math.sin(animTime * 1.6) * 0.04;
  const idleShift = Math.sin(animTime * 0.8) * 0.015;

  const idlePelvisY = 0.98 + breath * 0.5;
  const idleChestRotX = breath * 0.8;
  const idleLThighRotX = 0.02;
  const idleRThighRotX = -0.02;
  const idleLKneeRotX = -0.03;
  const idleRKneeRotX = -0.03;
  const idleLArmRotX = 0.06 + idleArmSway;
  const idleRArmRotX = 0.06 - idleArmSway;
  const idleLForearmRotX = -0.15;
  const idleRForearmRotX = -0.15;

  // (B) LOCOMOTION (Walk & Run) Calculations
  const cycleSpeed = wRun > 0.4 ? 13.5 : 8.6;
  walkCycle += delta * cycleSpeed * (wWalk + wRun);
  const sinWalk = Math.sin(walkCycle);
  const cosWalk = Math.cos(walkCycle);

  // Walk kinematics
  const walkStrideAmp = 0.62;
  const walkLThighRotX = sinWalk * walkStrideAmp;
  const walkRThighRotX = -sinWalk * walkStrideAmp;
  const walkLKneeRotX = Math.max(0, -sinWalk) * 0.72;
  const walkRKneeRotX = Math.max(0, sinWalk) * 0.72;
  const walkLArmRotX = -sinWalk * 0.55;
  const walkRArmRotX = sinWalk * 0.55;
  const walkLForearmRotX = -0.28 - Math.max(0, sinWalk) * 0.25;
  const walkRForearmRotX = -0.28 - Math.max(0, -sinWalk) * 0.25;
  const walkSpineRotY = sinWalk * 0.06;
  const walkBobY = Math.abs(sinWalk) * 0.045;

  // Run kinematics (forward lean, deep knee drive, high elbow bend)
  const runStrideAmp = 0.95;
  const runLThighRotX = sinWalk * runStrideAmp;
  const runRThighRotX = -sinWalk * runStrideAmp;
  const runLKneeRotX = Math.max(0, -sinWalk) * 1.15;
  const runRKneeRotX = Math.max(0, sinWalk) * 1.15;
  const runLArmRotX = -sinWalk * 0.95;
  const runRArmRotX = sinWalk * 0.95;
  const runLForearmRotX = -0.75 - Math.max(0, sinWalk) * 0.45;
  const runRForearmRotX = -0.75 - Math.max(0, -sinWalk) * 0.45;
  const runSpineRotX = 0.22; // Athletic forward forward-lean
  const runSpineRotY = sinWalk * 0.12;
  const runBobY = Math.abs(sinWalk) * 0.085;

  // (C) JUMP Pose Calculations (Dynamic airborne tuck)
  const jumpThighRotX = -0.55;
  const jumpKneeRotX = 0.85;
  const jumpArmRotX = 0.42;
  const jumpForearmRotX = -0.65;
  const jumpSpineRotX = 0.12;

  // (D) SIT Pose Calculations (90° hips, 90° knees, arms extended to desk)
  const sitPelvisY = 0.52; // Seat surface height
  const sitThighRotX = -Math.PI * 0.5; // -90 deg
  const sitKneeRotX = Math.PI * 0.5; // +90 deg
  const sitSpineRotX = 0.10; // slightly forward towards console
  let sitLArmRotX = -0.65;
  let sitRArmRotX = -0.65;
  let sitLForearmRotX = -0.52;
  let sitRForearmRotX = -0.52;

  // (E) ACTIVE TYPING Overlay while seated
  if (wType > 0.01) {
    typingTime += delta * 14.0;
    const typeTapL = Math.sin(typingTime * 1.4) * 0.06;
    const typeTapR = Math.cos(typingTime * 1.7) * 0.06;
    const typeForeL = Math.sin(typingTime * 2.2) * 0.08;
    const typeForeR = Math.cos(typingTime * 2.6) * 0.08;

    sitLArmRotX += typeTapL * wType;
    sitRArmRotX += typeTapR * wType;
    sitLForearmRotX += typeForeL * wType;
    sitRForearmRotX += typeForeR * wType;

    if (bodyParts.headGrp) {
      bodyParts.headGrp.rotation.x =
        0.14 + Math.sin(typingTime * 0.7) * 0.02 * wType;
      bodyParts.headGrp.rotation.y = Math.sin(typingTime * 0.4) * 0.025 * wType;
    }
  } else {
    if (bodyParts.headGrp) {
      bodyParts.headGrp.rotation.x = THREE.MathUtils.lerp(
        bodyParts.headGrp.rotation.x,
        0,
        blendRate
      );
      bodyParts.headGrp.rotation.y = THREE.MathUtils.lerp(
        bodyParts.headGrp.rotation.y,
        0,
        blendRate
      );
    }
  }

  // 4. Synthesize Blended Joint Angles
  const finalPelvisY =
    wIdle * idlePelvisY +
    wWalk * (0.98 + walkBobY) +
    wRun * (0.98 + runBobY) +
    wJump * 0.98 +
    wSit * sitPelvisY;

  const finalSpineRotX =
    wIdle * idleChestRotX +
    wWalk * 0 +
    wRun * runSpineRotX +
    wJump * jumpSpineRotX +
    wSit * sitSpineRotX;

  const finalSpineRotY = wWalk * walkSpineRotY + wRun * runSpineRotY;

  const finalLThighX =
    wIdle * idleLThighRotX +
    wWalk * walkLThighRotX +
    wRun * runLThighRotX +
    wJump * jumpThighRotX +
    wSit * sitThighRotX;

  const finalRThighX =
    wIdle * idleRThighRotX +
    wWalk * walkRThighRotX +
    wRun * runRThighRotX +
    wJump * jumpThighRotX +
    wSit * sitThighRotX;

  const finalLKneeX =
    wIdle * idleLKneeRotX +
    wWalk * walkLKneeRotX +
    wRun * runLKneeRotX +
    wJump * jumpKneeRotX +
    wSit * sitKneeRotX;

  const finalRKneeX =
    wIdle * idleRKneeRotX +
    wWalk * walkRKneeRotX +
    wRun * runRKneeRotX +
    wJump * jumpKneeRotX +
    wSit * sitKneeRotX;

  const finalLArmX =
    wIdle * idleLArmRotX +
    wWalk * walkLArmRotX +
    wRun * runLArmRotX +
    wJump * jumpArmRotX +
    wSit * sitLArmRotX;

  const finalRArmX =
    wIdle * idleRArmRotX +
    wWalk * walkRArmRotX +
    wRun * runRArmRotX +
    wJump * jumpArmRotX +
    wSit * sitRArmRotX;

  const finalLForearmX =
    wIdle * idleLForearmRotX +
    wWalk * walkLForearmRotX +
    wRun * runLForearmRotX +
    wJump * jumpForearmRotX +
    wSit * sitLForearmRotX;

  const finalRForearmX =
    wIdle * idleRForearmRotX +
    wWalk * walkRForearmRotX +
    wRun * runRForearmRotX +
    wJump * jumpForearmRotX +
    wSit * sitRForearmRotX;

  // 5. Apply Joint Transforms Smoothly to Hierarchy
  if (bodyParts.pelvisGrp) {
    bodyParts.pelvisGrp.position.y = finalPelvisY;
    bodyParts.pelvisGrp.position.x = idleShift * wIdle;
  }
  if (bodyParts.spineGrp) {
    bodyParts.spineGrp.rotation.x = finalSpineRotX;
    bodyParts.spineGrp.rotation.y = finalSpineRotY;
  }

  // Legs
  if (bodyParts.leftLeg) {
    bodyParts.leftLeg.thighGrp.rotation.x = finalLThighX;
    bodyParts.leftLeg.kneeGrp.rotation.x = finalLKneeX;
  }
  if (bodyParts.rightLeg) {
    bodyParts.rightLeg.thighGrp.rotation.x = finalRThighX;
    bodyParts.rightLeg.kneeGrp.rotation.x = finalRKneeX;
  }

  // Arms
  if (bodyParts.leftArm) {
    bodyParts.leftArm.upperArmGrp.rotation.x = finalLArmX;
    bodyParts.leftArm.forearmGrp.rotation.x = finalLForearmX;
  }
  if (bodyParts.rightArm) {
    bodyParts.rightArm.upperArmGrp.rotation.x = finalRArmX;
    bodyParts.rightArm.forearmGrp.rotation.x = finalRForearmX;
  }
}
