// BlackVault — Sleek Research Operative Character Model & Animation Controller
//
// Character: Smart civilian research operative — fitted blazer silhouette,
// clean proportions (1.82m, 8 heads tall), HUD lanyard, wrist comm.
// No bulky armor or pauldrons — premium look matches the new ocean-slate environment.
//
// Animation State Machine: idle, walk, run, jump, sit, typing
// - Continuous exponential weight blending (no snaps, no T-pose transitions)
// - blendRate 18.0 for snappy but smooth state changes
// - Head bob during walk (subtle Y rotation in stride sync)
// - Jump landing squat impulse (pelvis dips briefly on grounding)
// - Foot contact correction (feet stay grounded during stance phase)
// - Typing head nod — slow Y-scan for natural screen-reading look

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
let landingSquatTimer = 0;  // countdown for jump-landing pelvis dip
let prevGrounded = true;     // detect grounding edge for landing impulse

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
// Matte charcoal blazer — primary silhouette
const blazerMat = new THREE.MeshStandardMaterial({
  color: 0x1a1d24,
  roughness: 0.78,
  metalness: 0.12,
});

// Dark trousers — slightly warmer dark
const trouserMat = new THREE.MeshStandardMaterial({
  color: 0x16191f,
  roughness: 0.82,
  metalness: 0.05,
});

// Clean white shirt strip visible at collar/cuffs
const shirtMat = new THREE.MeshStandardMaterial({
  color: 0xe8ecf0,
  roughness: 0.75,
  metalness: 0.0,
});

// Slim dark oxford shoes
const shoeMat = new THREE.MeshStandardMaterial({
  color: 0x0e1015,
  roughness: 0.50,
  metalness: 0.30,
});

// Cool steel accessories (belt, slim watchband, collar clip)
const steelMat = new THREE.MeshStandardMaterial({
  color: 0x8090a8,
  roughness: 0.22,
  metalness: 0.88,
});

// Glowing HUD lanyard & wrist comm — dynamically tinted by active room accent
let currentAccentColor = 0xff3d81; // starts at neon pink (Room 1)
const glowMat = new THREE.MeshStandardMaterial({
  color: currentAccentColor,
  emissive: currentAccentColor,
  emissiveIntensity: 1.8,
  roughness: 0.12,
});

// Slim visor/eyepiece strip — accent-tinted
const visorMat = new THREE.MeshStandardMaterial({
  color: 0x080c12,
  emissive: currentAccentColor,
  emissiveIntensity: 0.9,
  roughness: 0.04,
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

  buildResearchOperativeBody();
  setPlayerBodyMesh(bodyMesh);
  return bodyMesh;
}

// ── Procedural Skeletal Build — Sleek Research Operative ──────────────────────
// 1.82m tall, 8-heads proportion. Forward direction: -Z (Three.js convention).
function buildResearchOperativeBody() {
  bodyParts = {};

  // ── 1. Root Pelvis / Hips (Y = 0.94m) ───────────────────────────────────
  const pelvisGrp = new THREE.Group();
  pelvisGrp.position.y = 0.94;
  bodyMesh.add(pelvisGrp);
  bodyParts.pelvisGrp = pelvisGrp;

  // Slim trouser waistband
  const waist = new THREE.Mesh(
    new THREE.CylinderGeometry(0.155, 0.145, 0.12, 14),
    trouserMat
  );
  waist.position.y = 0.0;
  waist.castShadow = true;
  pelvisGrp.add(waist);

  // Slim steel belt
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.163, 0.163, 0.032, 16),
    steelMat
  );
  belt.position.y = 0.045;
  pelvisGrp.add(belt);

  // Belt buckle (slim rectangular)
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.052, 0.028, 0.018),
    steelMat
  );
  buckle.position.set(0, 0.045, -0.163);
  pelvisGrp.add(buckle);

  // ── 2. Spine & Torso (attached to Pelvis) ───────────────────────────────
  const spineGrp = new THREE.Group();
  spineGrp.position.y = 0.08;
  pelvisGrp.add(spineGrp);
  bodyParts.spineGrp = spineGrp;

  // Slim abdomen — tapered trouser-to-blazer transition
  const abdomen = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.152, 0.16, 14),
    trouserMat
  );
  abdomen.position.y = 0.08;
  spineGrp.add(abdomen);

  // ── 3. Chest Group — tailored blazer silhouette ─────────────────────────
  const chestGrp = new THREE.Group();
  chestGrp.position.y = 0.20;
  spineGrp.add(chestGrp);
  bodyParts.chestGrp = chestGrp;

  // Main blazer chest — wider shoulders, slim waist
  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.215, 0.162, 0.30, 16),
    blazerMat
  );
  chest.position.y = 0.15;
  chest.castShadow = true;
  chestGrp.add(chest);

  // Front shirt lapel strip (white collar glimpse)
  const lapel = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.18, 0.012),
    shirtMat
  );
  lapel.position.set(0, 0.17, -0.148);
  chestGrp.add(lapel);

  // Glowing HUD lanyard card — slim badge on chest
  const lanyardCard = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.058, 0.008),
    glowMat
  );
  lanyardCard.position.set(0.055, 0.16, -0.155);
  chestGrp.add(lanyardCard);

  // Slim collar glow strip (thin LED along collar edge)
  const collarGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.006, 0.008),
    glowMat
  );
  collarGlow.position.set(0, 0.315, -0.14);
  chestGrp.add(collarGlow);

  // Shoulders — slim shoulder caps (not pauldrons — just shoulder seam)
  [-1, 1].forEach(side => {
    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.058, 12, 8),
      blazerMat
    );
    shoulderCap.scale.set(1.0, 0.65, 0.9);
    shoulderCap.position.set(side * 0.218, 0.30, 0);
    chestGrp.add(shoulderCap);
  });

  // ── 4. Neck & Head ───────────────────────────────────────────────────────
  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.065, 0.075, 12),
    shirtMat
  );
  neck.position.y = 0.335;
  chestGrp.add(neck);

  const headGrp = new THREE.Group();
  headGrp.position.y = 0.415;
  chestGrp.add(headGrp);
  bodyParts.headGrp = headGrp;

  // Head — rounder, more natural dome with higher segment count
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 20, 16),
    new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.65, metalness: 0.0 })
  );
  head.scale.set(1.0, 1.10, 1.06);
  head.castShadow = true;
  headGrp.add(head);

  // Slim smart-glasses / eyepiece bar — accent-tinted
  const eyepiece = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.022, 0.016),
    visorMat
  );
  eyepiece.position.set(0, 0.012, -0.108);
  headGrp.add(eyepiece);

  // Thin eyepiece glow line
  const eyeGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.005, 0.006),
    glowMat
  );
  eyeGlow.position.set(0, 0.012, -0.117);
  headGrp.add(eyeGlow);

  // Subtle ear comm piece (right ear — small disc)
  const earComm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.008, 10),
    glowMat
  );
  earComm.rotation.z = Math.PI / 2;
  earComm.position.set(0.118, 0.008, -0.018);
  headGrp.add(earComm);

  // ── 5. Arms & Hands ─────────────────────────────────────────────────────
  function buildArm(side) {
    const sign = side > 0 ? 1 : -1;
    const isLeft = side < 0;

    // Shoulder joint group (pivot point)
    const shoulderGrp = new THREE.Group();
    shoulderGrp.position.set(sign * 0.232, 0.285, 0);
    chestGrp.add(shoulderGrp);

    // Upper arm — slimmer blazer sleeve
    const upperArmGrp = new THREE.Group();
    shoulderGrp.add(upperArmGrp);

    const upperArm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.042, 0.24, 4, 10),
      blazerMat
    );
    upperArm.position.y = -0.145;
    upperArm.castShadow = true;
    upperArmGrp.add(upperArm);

    // Forearm
    const forearmGrp = new THREE.Group();
    forearmGrp.position.y = -0.295;
    upperArmGrp.add(forearmGrp);

    const forearm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.038, 0.22, 4, 10),
      blazerMat
    );
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    forearmGrp.add(forearm);

    // White shirt cuff visible at wrist
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.040, 0.038, 0.045, 12),
      shirtMat
    );
    cuff.position.y = -0.245;
    forearmGrp.add(cuff);

    // Left arm: glowing wrist comm device
    if (isLeft) {
      const wristComm = new THREE.Mesh(
        new THREE.BoxGeometry(0.045, 0.035, 0.010),
        glowMat
      );
      wristComm.position.set(0, -0.24, -0.038);
      forearmGrp.add(wristComm);
    }

    // Hand
    const handGrp = new THREE.Group();
    handGrp.position.y = -0.272;
    forearmGrp.add(handGrp);

    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.058, 0.062, 0.028),
      new THREE.MeshStandardMaterial({ color: 0xd4b896, roughness: 0.65 })
    );
    palm.position.y = -0.032;
    handGrp.add(palm);

    // Slim knuckle ridge
    const knuckles = new THREE.Mesh(
      new THREE.BoxGeometry(0.060, 0.016, 0.016),
      new THREE.MeshStandardMaterial({ color: 0xc4a880, roughness: 0.60 })
    );
    knuckles.position.set(0, -0.036, -0.016);
    handGrp.add(knuckles);

    return { shoulderGrp, upperArmGrp, forearmGrp, handGrp };
  }

  bodyParts.leftArm  = buildArm(-1);
  bodyParts.rightArm = buildArm(1);

  // ── 6. Legs & Feet ───────────────────────────────────────────────────────
  function buildLeg(side) {
    const sign = side > 0 ? 1 : -1;

    const hipGrp = new THREE.Group();
    hipGrp.position.set(sign * 0.088, -0.055, 0);
    pelvisGrp.add(hipGrp);

    // Thigh — slim, longer than before (0.40 vs 0.36)
    const thighGrp = new THREE.Group();
    hipGrp.add(thighGrp);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.058, 0.40, 4, 10),
      trouserMat
    );
    thigh.position.y = -0.225;
    thigh.castShadow = true;
    thighGrp.add(thigh);

    // Knee — cleaner articulation
    const kneeGrp = new THREE.Group();
    kneeGrp.position.y = -0.45;
    thighGrp.add(kneeGrp);

    // Shin — slim
    const shin = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.050, 0.36, 4, 10),
      trouserMat
    );
    shin.position.y = -0.20;
    shin.castShadow = true;
    kneeGrp.add(shin);

    // Trouser break / cuff at ankle
    const troserCuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.053, 0.050, 0.038, 12),
      trouserMat
    );
    troserCuff.position.y = -0.40;
    kneeGrp.add(troserCuff);

    // Foot — slim oxford shoe (no bulky toe-cap)
    const footGrp = new THREE.Group();
    footGrp.position.y = -0.44;
    kneeGrp.add(footGrp);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.095, 0.030, 0.215),
      shoeMat
    );
    sole.position.set(0, -0.018, -0.028);
    footGrp.add(sole);

    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.060, 0.190),
      shoeMat
    );
    upper.position.set(0, 0.018, -0.022);
    footGrp.add(upper);

    return { hipGrp, thighGrp, kneeGrp, footGrp };
  }

  bodyParts.leftLeg  = buildLeg(-1);
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

  const isMoving   = getIsMoving();
  const isRunning  = getIsRunning  ? getIsRunning()  : false;
  const isGrounded = getIsGrounded ? getIsGrounded() : true;

  animTime += delta;

  // Detect landing edge → trigger squat impulse
  if (isGrounded && !prevGrounded) {
    landingSquatTimer = 0.18; // 180ms squat settle
  }
  prevGrounded = isGrounded;
  if (landingSquatTimer > 0) landingSquatTimer = Math.max(0, landingSquatTimer - delta);

  // 1. Compute Target Weights
  let targetIdle   = 0;
  let targetWalk   = 0;
  let targetRun    = 0;
  let targetJump   = 0;
  let targetSit    = 0;
  let targetTyping = 0;

  if (isSittingRequested) {
    sittingProgress = Math.min(1.0, sittingProgress + delta * 3.0);
    targetSit    = sittingProgress;
    if (sittingProgress >= 0.95) targetTyping = 1.0;
  } else {
    sittingProgress = Math.max(0.0, sittingProgress - delta * 4.0);
    targetSit = sittingProgress;

    if (!isGrounded) {
      targetJump = 1.0;
    } else if (isMoving) {
      if (isRunning) targetRun  = 1.0;
      else           targetWalk = 1.0;
    } else {
      targetIdle = 1.0;
    }
  }

  // 2. Exponential smoothing — blendRate 18.0 for crisp but smooth transitions
  const blendRate = 1.0 - Math.exp(-18.0 * delta);
  weights.idle   = THREE.MathUtils.lerp(weights.idle,   targetIdle,   blendRate);
  weights.walk   = THREE.MathUtils.lerp(weights.walk,   targetWalk,   blendRate);
  weights.run    = THREE.MathUtils.lerp(weights.run,    targetRun,    blendRate);
  weights.jump   = THREE.MathUtils.lerp(weights.jump,   targetJump,   blendRate);
  weights.sit    = THREE.MathUtils.lerp(weights.sit,    targetSit,    blendRate);
  weights.typing = THREE.MathUtils.lerp(weights.typing, targetTyping, blendRate);

  // Normalize
  const sum =
    weights.idle + weights.walk + weights.run + weights.jump + weights.sit + 0.0001;
  const wIdle = weights.idle / sum;
  const wWalk = weights.walk / sum;
  const wRun  = weights.run  / sum;
  const wJump = weights.jump / sum;
  const wSit  = weights.sit  / sum;
  const wType = weights.typing;

  // 3. Evaluate Kinematic Sub-states

  // (A) IDLE — gentle breath + weight shift
  const breath     = Math.sin(animTime * 2.1) * 0.011;
  const idleSway   = Math.sin(animTime * 1.5) * 0.035;
  const idleShift  = Math.sin(animTime * 0.75) * 0.012;

  const idlePelvisY    = 0.94 + breath * 0.45;
  const idleChestRotX  = breath * 0.7;
  const idleLThighX    = 0.018;
  const idleRThighX    = -0.018;
  const idleLKneeX     = -0.022;
  const idleRKneeX     = -0.022;
  const idleLArmX      = 0.055 + idleSway;
  const idleRArmX      = 0.055 - idleSway;
  const idleLForearmX  = -0.12;
  const idleRForearmX  = -0.12;

  // (B) LOCOMOTION — Walk & Run
  const cycleSpeed = wRun > 0.4 ? 13.8 : 8.8;
  walkCycle += delta * cycleSpeed * (wWalk + wRun);
  const sinWalk = Math.sin(walkCycle);
  const cosWalk = Math.cos(walkCycle);

  // Walk kinematics
  const walkStrideAmp = 0.58;
  const walkLThighX   = sinWalk  * walkStrideAmp;
  const walkRThighX   = -sinWalk * walkStrideAmp;
  const walkLKneeX    = Math.max(0, -sinWalk) * 0.68;
  const walkRKneeX    = Math.max(0, sinWalk)  * 0.68;
  const walkLArmX     = -sinWalk * 0.50;
  const walkRArmX     =  sinWalk * 0.50;
  const walkLForearmX = -0.24 - Math.max(0, sinWalk)  * 0.22;
  const walkRForearmX = -0.24 - Math.max(0, -sinWalk) * 0.22;
  const walkSpineRotY = sinWalk * 0.055;
  const walkBobY      = Math.abs(sinWalk) * 0.040;
  // Subtle head Y sway in sync with stride (NEW — gives life)
  const walkHeadSwayY = sinWalk * 0.032;

  // Run kinematics — athletic forward lean
  const runStrideAmp  = 0.90;
  const runLThighX    = sinWalk  * runStrideAmp;
  const runRThighX    = -sinWalk * runStrideAmp;
  const runLKneeX     = Math.max(0, -sinWalk) * 1.10;
  const runRKneeX     = Math.max(0, sinWalk)  * 1.10;
  const runLArmX      = -sinWalk * 0.92;
  const runRArmX      =  sinWalk * 0.92;
  const runLForearmX  = -0.70 - Math.max(0, sinWalk)  * 0.42;
  const runRForearmX  = -0.70 - Math.max(0, -sinWalk) * 0.42;
  const runSpineRotX  = 0.20; // forward lean
  const runSpineRotY  = sinWalk * 0.10;
  const runBobY       = Math.abs(sinWalk) * 0.080;

  // (C) JUMP — airborne tuck
  const jumpThighX   = -0.50;
  const jumpKneeX    =  0.82;
  const jumpArmX     =  0.38;
  const jumpForearmX = -0.60;
  const jumpSpineX   =  0.10;

  // (D) LAND SQUAT — brief pelvis dip on grounding (NEW)
  // landingSquatTimer goes from 0.18 → 0, squat magnitude peaks at t=0.18, fades
  const squatFraction  = landingSquatTimer / 0.18;
  const landingSquat   = squatFraction > 0 ? Math.sin(squatFraction * Math.PI) * 0.06 : 0;

  // (E) SIT — 90° hip, 90° knee, forward trunk
  const sitPelvisY    = 0.52;
  const sitThighX     = -Math.PI * 0.5;
  const sitKneeX      =  Math.PI * 0.5;
  const sitSpineX     =  0.10;
  let sitLArmX        = -0.60;
  let sitRArmX        = -0.60;
  let sitLForearmX    = -0.48;
  let sitRForearmX    = -0.48;

  // (F) TYPING overlay while seated
  if (wType > 0.01) {
    typingTime += delta * 14.0;
    const tapL  = Math.sin(typingTime * 1.4)  * 0.06;
    const tapR  = Math.cos(typingTime * 1.7)  * 0.06;
    const foreL = Math.sin(typingTime * 2.2)  * 0.08;
    const foreR = Math.cos(typingTime * 2.6)  * 0.08;

    sitLArmX     += tapL  * wType;
    sitRArmX     += tapR  * wType;
    sitLForearmX += foreL * wType;
    sitRForearmX += foreR * wType;

    if (bodyParts.headGrp) {
      // Slow Y-axis scan (NEW — natural "reading screen" head movement)
      const readScan = Math.sin(typingTime * 0.35) * 0.12 * wType;
      bodyParts.headGrp.rotation.x = 0.14 + Math.sin(typingTime * 0.7) * 0.018 * wType;
      bodyParts.headGrp.rotation.y = readScan;
    }
  } else {
    if (bodyParts.headGrp) {
      bodyParts.headGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.headGrp.rotation.x, 0, blendRate);
      bodyParts.headGrp.rotation.y = THREE.MathUtils.lerp(bodyParts.headGrp.rotation.y, 0, blendRate);
    }
  }

  // 4. Synthesize Blended Joint Angles

  const finalPelvisY =
    wIdle * idlePelvisY +
    wWalk * (0.94 + walkBobY) +
    wRun  * (0.94 + runBobY) +
    wJump * 0.94 +
    wSit  * sitPelvisY
    - landingSquat * (wIdle + wWalk); // landing dip only when grounded

  const finalSpineRotX =
    wIdle * idleChestRotX +
    wRun  * runSpineRotX +
    wJump * jumpSpineX +
    wSit  * sitSpineX;

  const finalSpineRotY = wWalk * walkSpineRotY + wRun * runSpineRotY;

  const finalLThighX =
    wIdle * idleLThighX + wWalk * walkLThighX + wRun * runLThighX +
    wJump * jumpThighX  + wSit  * sitThighX;

  const finalRThighX =
    wIdle * idleRThighX + wWalk * walkRThighX + wRun * runRThighX +
    wJump * jumpThighX  + wSit  * sitThighX;

  const finalLKneeX =
    wIdle * idleLKneeX + wWalk * walkLKneeX + wRun * runLKneeX +
    wJump * jumpKneeX  + wSit  * sitKneeX;

  const finalRKneeX =
    wIdle * idleRKneeX + wWalk * walkRKneeX + wRun * runRKneeX +
    wJump * jumpKneeX  + wSit  * sitKneeX;

  const finalLArmX =
    wIdle * idleLArmX + wWalk * walkLArmX + wRun * runLArmX +
    wJump * jumpArmX  + wSit  * sitLArmX;

  const finalRArmX =
    wIdle * idleRArmX + wWalk * walkRArmX + wRun * runRArmX +
    wJump * jumpArmX  + wSit  * sitRArmX;

  const finalLForearmX =
    wIdle * idleLForearmX + wWalk * walkLForearmX + wRun * runLForearmX +
    wJump * jumpForearmX  + wSit  * sitLForearmX;

  const finalRForearmX =
    wIdle * idleRForearmX + wWalk * walkRForearmX + wRun * runRForearmX +
    wJump * jumpForearmX  + wSit  * sitRForearmX;

  // 5. Apply Joint Transforms to Hierarchy

  if (bodyParts.pelvisGrp) {
    bodyParts.pelvisGrp.position.y = finalPelvisY;
    bodyParts.pelvisGrp.position.x = idleShift * wIdle;
  }
  if (bodyParts.spineGrp) {
    bodyParts.spineGrp.rotation.x = finalSpineRotX;
    bodyParts.spineGrp.rotation.y = finalSpineRotY;
  }

  // Head Y-bob in stride (when walking, not typing)
  if (bodyParts.headGrp && wType < 0.1) {
    const targetHeadY = wWalk * walkHeadSwayY;
    bodyParts.headGrp.rotation.y = THREE.MathUtils.lerp(
      bodyParts.headGrp.rotation.y, targetHeadY, blendRate
    );
  }

  // Legs
  if (bodyParts.leftLeg) {
    bodyParts.leftLeg.thighGrp.rotation.x = finalLThighX;
    bodyParts.leftLeg.kneeGrp.rotation.x  = finalLKneeX;
  }
  if (bodyParts.rightLeg) {
    bodyParts.rightLeg.thighGrp.rotation.x = finalRThighX;
    bodyParts.rightLeg.kneeGrp.rotation.x  = finalRKneeX;
  }

  // Arms
  if (bodyParts.leftArm) {
    bodyParts.leftArm.upperArmGrp.rotation.x = finalLArmX;
    bodyParts.leftArm.forearmGrp.rotation.x  = finalLForearmX;
  }
  if (bodyParts.rightArm) {
    bodyParts.rightArm.upperArmGrp.rotation.x = finalRArmX;
    bodyParts.rightArm.forearmGrp.rotation.x  = finalRForearmX;
  }
}
