// BlackVault — Realistic Human Research Operative Character Model & Animation Controller
//
// Character: Realistically proportioned research operative — 1.82m, ~8 heads tall.
// Natural human face with sculpted brow, nose bridge, lips, ears, and short hair cap.
// Fitted dark blazer over white shirt, slim trousers, oxford shoes.
// Skin uses warm ochre MeshStandardMaterial (not metallic/plastic).
// Hair uses a dark matte material with subtle depth.
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

// ── Skin & Hair Materials ──────────────────────────────────────────────────────
// Warm human skin — NOT metallic, NOT plastic; natural subsurface scatter approximation
const skinMat = new THREE.MeshStandardMaterial({
  color: 0xc8956a,     // warm ochre-tan — believably human
  roughness: 0.72,
  metalness: 0.0,
  envMapIntensity: 0.4,
});

// Slightly darker skin for ear/nose recessed areas
const skinDarkMat = new THREE.MeshStandardMaterial({
  color: 0xb8825c,
  roughness: 0.75,
  metalness: 0.0,
});

// Short dark hair — matte, natural
const hairMat = new THREE.MeshStandardMaterial({
  color: 0x1a120a,
  roughness: 0.88,
  metalness: 0.0,
});

// Eyebrow micro detail
const eyebrowMat = new THREE.MeshStandardMaterial({
  color: 0x120d08,
  roughness: 0.90,
  metalness: 0.0,
});

// Eyes — deep iris with subtle shine
const irisMat = new THREE.MeshStandardMaterial({
  color: 0x3d2b18,
  roughness: 0.35,
  metalness: 0.0,
});
const scleraMat = new THREE.MeshStandardMaterial({
  color: 0xf0ece8,
  roughness: 0.50,
  metalness: 0.0,
});
const pupilMat = new THREE.MeshStandardMaterial({
  color: 0x080604,
  roughness: 0.20,
  metalness: 0.0,
});
const lipMat = new THREE.MeshStandardMaterial({
  color: 0xa06050,
  roughness: 0.65,
  metalness: 0.0,
});

// ── Clothing Materials ─────────────────────────────────────────────────────────
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

// ── Procedural Skeletal Build — Realistic Research Operative ──────────────────
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
    new THREE.CylinderGeometry(0.226, 0.170, 0.30, 16),   // wider: 0.215→0.226 top, 0.162→0.170 bottom
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
    new THREE.CylinderGeometry(0.054, 0.066, 0.092, 12),   // wider: 0.046→0.054 top, 0.058→0.066 base
    skinMat
  );
  neck.position.y = 0.335;
  chestGrp.add(neck);

  // Shirt collar visible above blazer
  const collarRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.060, 0.065, 0.032, 12),
    shirtMat
  );
  collarRing.position.y = 0.325;
  chestGrp.add(collarRing);

  const headGrp = new THREE.Group();
  headGrp.position.y = 0.425;
  chestGrp.add(headGrp);
  bodyParts.headGrp = headGrp;

  buildRealisticHead(headGrp);

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

    // Hand — realistic palm with skin material
    const handGrp = new THREE.Group();
    handGrp.position.y = -0.272;
    forearmGrp.add(handGrp);

    // Palm — slightly rounded box
    const palm = new THREE.Mesh(
      new THREE.BoxGeometry(0.060, 0.065, 0.030),
      skinMat
    );
    palm.position.y = -0.032;
    handGrp.add(palm);

    // Thumb — small capsule angled outward
    const thumbGrp = new THREE.Group();
    thumbGrp.position.set(sign * -0.035, -0.040, -0.010);
    thumbGrp.rotation.z = sign * 0.55;
    handGrp.add(thumbGrp);
    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.011, 0.028, 3, 6),
      skinMat
    );
    thumb.position.y = 0.020;
    thumbGrp.add(thumb);

    // Four fingers as a fused capsule block
    const fingers = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.014, 0.040, 3, 8),
      skinMat
    );
    fingers.position.set(0, -0.075, -0.012);
    handGrp.add(fingers);

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

    // Thigh — slim, longer (0.40)
    const thighGrp = new THREE.Group();
    hipGrp.add(thighGrp);

    const thigh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.060, 0.43, 4, 10),   // longer: 0.40→0.43, slightly wider
      trouserMat
    );
    thigh.position.y = -0.240;
    thigh.castShadow = true;
    thighGrp.add(thigh);

    // Knee joint
    const kneeGrp = new THREE.Group();
    kneeGrp.position.y = -0.48;   // pushed down slightly to match longer thigh
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

    // Foot — slim oxford shoe
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

    // Toe cap — slightly rounded front
    const toeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.042, 8, 6, 0, Math.PI),
      shoeMat
    );
    toeCap.scale.set(1.0, 0.7, 1.1);
    toeCap.position.set(0, 0.010, -0.105);
    footGrp.add(toeCap);

    return { hipGrp, thighGrp, kneeGrp, footGrp };
  }

  bodyParts.leftLeg  = buildLeg(-1);
  bodyParts.rightLeg = buildLeg(1);
}

// ── Realistic Human Head Builder ──────────────────────────────────────────────
// Produces: rounded skull, brow ridge, nose bridge + tip, ears, lips, eyes, short hair cap.
function buildRealisticHead(headGrp) {
  // ── Skull — rounded, naturally scaled (not a perfect sphere) ──────────────
  const skull = new THREE.Mesh(
    new THREE.SphereGeometry(0.118, 24, 20),
    skinMat
  );
  skull.scale.set(1.0, 1.08, 1.06);   // less egg-shaped: real skulls are wider than tall
  skull.castShadow = true;
  headGrp.add(skull);

  // ── Mandible / Jaw plane — breaks up the flat sphere face ────────────────
  // A flattened ellipsoid sitting at the lower-front of the skull gives the
  // jawline width that distinguishes a human face from a balloon.
  const jaw = new THREE.Mesh(
    new THREE.SphereGeometry(0.088, 16, 10, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.45),
    skinMat
  );
  jaw.scale.set(1.05, 0.68, 0.90);
  jaw.position.set(0, -0.072, -0.018);
  headGrp.add(jaw);

  // Cheekbone width — two subtle bumps flanking the upper jaw
  [-1, 1].forEach(side => {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.032, 8, 6),
      skinMat
    );
    cheek.scale.set(0.9, 0.65, 0.55);
    cheek.position.set(side * 0.078, -0.010, -0.096);
    headGrp.add(cheek);
  });

  // ── Hair Cap — close-cropped dark hair over upper skull ───────────────────
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.122, 22, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hairMat
  );
  hairCap.scale.set(1.0, 1.12, 1.05);
  hairCap.position.y = 0.010;
  hairCap.castShadow = false;
  headGrp.add(hairCap);

  // Hair side taper — thin strips on temples
  [-1, 1].forEach(side => {
    const temple = new THREE.Mesh(
      new THREE.BoxGeometry(0.010, 0.070, 0.075),
      hairMat
    );
    temple.position.set(side * 0.116, 0.020, -0.030);
    headGrp.add(temple);
  });

  // ── Brow Ridge — slight protrusion above eyes ─────────────────────────────
  const browRidge = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.012, 0.120, 3, 8),
    skinMat
  );
  browRidge.rotation.z = Math.PI / 2;
  browRidge.position.set(0, 0.048, -0.108);
  headGrp.add(browRidge);

  // ── Eyebrows ──────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.008, 0.010),
      eyebrowMat
    );
    brow.position.set(side * 0.042, 0.056, -0.111);
    brow.rotation.z = side * 0.08; // slight arch
    headGrp.add(brow);
  });

  // ── Eyes ──────────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    // Eye socket recess (dark area around eye)
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      skinDarkMat
    );
    socket.scale.set(1.3, 0.85, 0.5);
    socket.position.set(side * 0.042, 0.022, -0.108);
    headGrp.add(socket);

    // White of eye (sclera)
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 10, 8),
      scleraMat
    );
    sclera.scale.set(1.2, 0.75, 0.6);
    sclera.position.set(side * 0.042, 0.022, -0.112);
    headGrp.add(sclera);

    // Iris
    const iris = new THREE.Mesh(
      new THREE.CircleGeometry(0.010, 12),
      irisMat
    );
    iris.position.set(side * 0.042, 0.022, -0.121);
    headGrp.add(iris);

    // Pupil
    const pupil = new THREE.Mesh(
      new THREE.CircleGeometry(0.005, 10),
      pupilMat
    );
    pupil.position.set(side * 0.042, 0.022, -0.1215);
    headGrp.add(pupil);

    // Upper eyelid — thin crescent
    const eyelid = new THREE.Mesh(
      new THREE.BoxGeometry(0.038, 0.007, 0.010),
      skinMat
    );
    eyelid.position.set(side * 0.042, 0.033, -0.113);
    eyelid.rotation.z = side * 0.05;
    headGrp.add(eyelid);
  });

  // ── Nose ──────────────────────────────────────────────────────────────────
  // Bridge — slim vertical ridge down the centre
  const noseBridge = new THREE.Mesh(
    new THREE.BoxGeometry(0.018, 0.055, 0.016),
    skinMat
  );
  noseBridge.position.set(0, -0.010, -0.118);
  headGrp.add(noseBridge);

  // Nose tip — small round bulb
  const noseTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.018, 10, 8),
    skinMat
  );
  noseTip.scale.set(1.0, 0.75, 0.95);
  noseTip.position.set(0, -0.038, -0.122);
  headGrp.add(noseTip);

  // Nostrils — two small oval depressions
  [-1, 1].forEach(side => {
    const nostril = new THREE.Mesh(
      new THREE.SphereGeometry(0.009, 8, 6),
      skinDarkMat
    );
    nostril.scale.set(1.0, 0.65, 0.85);
    nostril.position.set(side * 0.014, -0.044, -0.118);
    headGrp.add(nostril);
  });

  // ── Lips & Mouth ──────────────────────────────────────────────────────────
  // Upper lip
  const upperLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.040, 0.012, 0.014),
    lipMat
  );
  upperLip.position.set(0, -0.062, -0.116);
  headGrp.add(upperLip);

  // Lower lip — slightly fuller
  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(0.038, 0.013, 0.015),
    lipMat
  );
  lowerLip.position.set(0, -0.076, -0.115);
  headGrp.add(lowerLip);

  // Philtrum indent (barely visible but breaks up the face plane)
  const philtrum = new THREE.Mesh(
    new THREE.BoxGeometry(0.014, 0.016, 0.006),
    skinDarkMat
  );
  philtrum.position.set(0, -0.053, -0.118);
  headGrp.add(philtrum);

  // Chin
  const chin = new THREE.Mesh(
    new THREE.SphereGeometry(0.020, 8, 6),
    skinMat
  );
  chin.scale.set(1.2, 0.75, 0.90);
  chin.position.set(0, -0.096, -0.105);
  headGrp.add(chin);

  // ── Ears ──────────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    const earGrp = new THREE.Group();
    earGrp.position.set(side * 0.118, 0.002, -0.014);

    // Ear lobe — main body
    const ear = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 10, 8),
      skinMat
    );
    ear.scale.set(0.35, 0.85, 0.55);
    earGrp.add(ear);

    // Inner ear detail — helical fold
    const helix = new THREE.Mesh(
      new THREE.TorusGeometry(0.018, 0.004, 5, 12, Math.PI * 1.3),
      skinDarkMat
    );
    helix.rotation.x = Math.PI / 2;
    helix.rotation.z = side > 0 ? 0.3 : -0.3;
    helix.position.z = -0.004;
    earGrp.add(helix);

    // Ear canal (dark oval recess)
    const canal = new THREE.Mesh(
      new THREE.CircleGeometry(0.007, 8),
      skinDarkMat
    );
    canal.position.z = 0.012;
    earGrp.add(canal);

    earGrp.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    headGrp.add(earGrp);
  });

  // ── Slim smart-glasses / eyepiece bar — accent-tinted ─────────────────────
  const eyepiece = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.018, 0.012),
    visorMat
  );
  eyepiece.position.set(0, 0.022, -0.114);
  headGrp.add(eyepiece);

  // Thin eyepiece glow line
  const eyeGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.004, 0.005),
    glowMat
  );
  eyeGlow.position.set(0, 0.022, -0.118);
  headGrp.add(eyeGlow);

  // Subtle ear comm piece (right ear — small disc)
  const earComm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.010, 0.010, 0.006, 10),
    glowMat
  );
  earComm.rotation.z = Math.PI / 2;
  earComm.position.set(0.124, 0.004, -0.016);
  headGrp.add(earComm);
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
  // Subtle head Y sway in sync with stride
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

  // (D) LAND SQUAT — brief pelvis dip on grounding
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
      // Slow Y-axis scan — natural "reading screen" head movement
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
