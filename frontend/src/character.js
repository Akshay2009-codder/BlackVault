// Procedural player body character for 3rd-person view.
// Shown when camera mode is NOT first-person (V key cycles).
// No guard/NPC — this IS the player's visible body.

import * as THREE from "three";
import { setPlayerBodyMesh, getPlayerFacingY, getIsMoving, getVelocity } from "./player.js";

let bodyMesh   = null; // root group
let bodyParts  = {};
let walkCycle  = 0;
let idleTime   = 0;
let isBodyVisible = false;

// ── Create Player Body ────────────────────────────────────────────────────────
export function createPlayerCharacter(scene) {
  bodyMesh = new THREE.Group();
  bodyMesh.name = "PlayerBody";
  bodyMesh.visible = false; // hidden in 1st-person by default
  scene.add(bodyMesh);

  buildBody();

  // Register with player controller
  setPlayerBodyMesh(bodyMesh);
  return bodyMesh;
}

function buildBody() {
  // ── Materials ──────────────────────────────────────────────────────────────
  const skinMat    = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.75 });
  const coatMat    = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.78, metalness: 0.02 });  // white lab coat
  const shirtMat   = new THREE.MeshStandardMaterial({ color: 0x3b82c4, roughness: 0.8 });                    // blue shirt underneath
  const pantsMat   = new THREE.MeshStandardMaterial({ color: 0x2c3a50, roughness: 0.72 });                   // navy trousers
  const shoesMat   = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.55, metalness: 0.2 });   // dark shoes
  const hairMat    = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.9 });                    // dark hair
  const badgeMat   = new THREE.MeshStandardMaterial({ color: 0x1a3a6e, metalness: 0.6, roughness: 0.3 });    // navy ID badge

  // ── Torso (lab coat) ───────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.22), coatMat);
  torso.position.y = 1.30;
  torso.castShadow = true;
  bodyMesh.add(torso);
  bodyParts.torso = torso;

  // Coat lapels (dark blue shirt visible at neck)
  const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.30, 0.01), shirtMat);
  lapelL.position.set(-0.06, 0.06, 0.115);
  lapelL.rotation.z = -0.18;
  torso.add(lapelL);
  const lapelR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.30, 0.01), shirtMat);
  lapelR.position.set(0.06, 0.06, 0.115);
  lapelR.rotation.z = 0.18;
  torso.add(lapelR);

  // Chest pocket + ID badge
  const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.01), coatMat);
  pocket.position.set(0.12, 0.15, 0.115);
  torso.add(pocket);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.075, 0.015), badgeMat);
  badge.position.set(0.12, 0.08, 0.122);
  torso.add(badge);
  // Badge clip
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.01, 0.018), new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.8 }));
  clip.position.set(0.12, 0.16, 0.122);
  torso.add(clip);

  // Coat buttons
  [0.05, -0.02, -0.09, -0.16].forEach((by) => {
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), new THREE.MeshStandardMaterial({ color: 0xd0d4da, metalness: 0.4 }));
    btn.rotation.x = Math.PI / 2;
    btn.position.set(0, by, 0.116);
    torso.add(btn);
  });

  // Shoulder pads (coat)
  [-0.25, 0.25].forEach((sx) => {
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.25), coatMat);
    sh.position.set(sx, 0.22, 0);
    torso.add(sh);
  });

  // ── Hips ───────────────────────────────────────────────────────────────────
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.21), pantsMat);
  hips.position.y = 1.03;
  hips.castShadow = true;
  bodyMesh.add(hips);
  bodyParts.hips = hips;

  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.225), new THREE.MeshStandardMaterial({ color: 0x1a1e26, roughness: 0.5, metalness: 0.5 }));
  belt.position.y = 1.115;
  bodyMesh.add(belt);
  // Buckle
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.015), new THREE.MeshStandardMaterial({ color: 0xb8c0cc, metalness: 0.85, roughness: 0.2 }));
  buckle.position.set(0, 1.115, 0.12);
  bodyMesh.add(buckle);

  // ── Left Arm ───────────────────────────────────────────────────────────────
  const leftArmGrp = new THREE.Group();
  leftArmGrp.position.set(0.25, 1.47, 0);
  bodyMesh.add(leftArmGrp);
  bodyParts.leftArmGrp = leftArmGrp;

  const lUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.30, 10), coatMat);
  lUpper.position.y = -0.15;
  leftArmGrp.add(lUpper);

  const lForearmGrp = new THREE.Group();
  lForearmGrp.position.y = -0.30;
  leftArmGrp.add(lForearmGrp);
  bodyParts.lForearmGrp = lForearmGrp;

  const lForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.28, 10), coatMat);
  lForearm.position.y = -0.14;
  lForearmGrp.add(lForearm);

  const lHand = buildHand(false);
  lHand.position.y = -0.30;
  lForearmGrp.add(lHand);
  bodyParts.lHand = lHand;

  // ── Right Arm ──────────────────────────────────────────────────────────────
  const rightArmGrp = new THREE.Group();
  rightArmGrp.position.set(-0.25, 1.47, 0);
  bodyMesh.add(rightArmGrp);
  bodyParts.rightArmGrp = rightArmGrp;

  const rUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.30, 10), coatMat);
  rUpper.position.y = -0.15;
  rightArmGrp.add(rUpper);

  const rForearmGrp = new THREE.Group();
  rForearmGrp.position.y = -0.30;
  rightArmGrp.add(rForearmGrp);
  bodyParts.rForearmGrp = rForearmGrp;

  const rForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.052, 0.28, 10), coatMat);
  rForearm.position.y = -0.14;
  rForearmGrp.add(rForearm);

  const rHand = buildHand(true);
  rHand.position.y = -0.30;
  rForearmGrp.add(rHand);
  bodyParts.rHand = rHand;

  // ── Left Leg ───────────────────────────────────────────────────────────────
  const leftLegGrp = new THREE.Group();
  leftLegGrp.position.set(0.11, 1.01, 0);
  bodyMesh.add(leftLegGrp);
  bodyParts.leftLegGrp = leftLegGrp;

  const lThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.44, 10), pantsMat);
  lThigh.position.y = -0.22;
  leftLegGrp.add(lThigh);

  const lShinGrp = new THREE.Group();
  lShinGrp.position.y = -0.44;
  leftLegGrp.add(lShinGrp);
  bodyParts.lShinGrp = lShinGrp;

  const lShin = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.066, 0.44, 10), pantsMat);
  lShin.position.y = -0.22;
  lShinGrp.add(lShin);

  const lShoe = buildShoe();
  lShoe.position.set(0.01, -0.46, 0.04);
  lShinGrp.add(lShoe);

  // ── Right Leg ──────────────────────────────────────────────────────────────
  const rightLegGrp = new THREE.Group();
  rightLegGrp.position.set(-0.11, 1.01, 0);
  bodyMesh.add(rightLegGrp);
  bodyParts.rightLegGrp = rightLegGrp;

  const rThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.44, 10), pantsMat);
  rThigh.position.y = -0.22;
  rightLegGrp.add(rThigh);

  const rShinGrp = new THREE.Group();
  rShinGrp.position.y = -0.44;
  rightLegGrp.add(rShinGrp);
  bodyParts.rShinGrp = rShinGrp;

  const rShin = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.066, 0.44, 10), pantsMat);
  rShin.position.y = -0.22;
  rShinGrp.add(rShin);

  const rShoe = buildShoe();
  rShoe.position.set(-0.01, -0.46, 0.04);
  rShinGrp.add(rShoe);

  // ── Neck ───────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.12, 10), skinMat);
  neck.position.y = 1.62;
  bodyMesh.add(neck);

  // ── Head ───────────────────────────────────────────────────────────────────
  const headGrp = new THREE.Group();
  headGrp.position.y = 1.76;
  bodyMesh.add(headGrp);
  bodyParts.headGrp = headGrp;

  // Head shape
  const headGeo = new THREE.BoxGeometry(0.22, 0.26, 0.22);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 0.06;
  headGrp.add(head);

  // Hair
  const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.1, 0.23), hairMat);
  hairTop.position.y = 0.21;
  headGrp.add(hairTop);
  const hairBack = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.22, 0.06), hairMat);
  hairBack.position.set(0, 0.1, -0.12);
  headGrp.add(hairBack);

  // Eyes
  [-0.055, 0.055].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1a2235 }));
    eye.position.set(ex, 0.06, 0.11);
    headGrp.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    pupil.position.set(ex, 0.06, 0.125);
    headGrp.add(pupil);
  });

  // Nose
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.04), skinMat);
  nose.position.set(0, 0.02, 0.128);
  headGrp.add(nose);

  // Mouth
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.01), new THREE.MeshStandardMaterial({ color: 0x8b4040 }));
  mouth.position.set(0, -0.04, 0.116);
  headGrp.add(mouth);

  // Ears
  [-0.115, 0.115].forEach((ex) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), skinMat);
    ear.scale.set(0.6, 0.9, 0.5);
    ear.position.set(ex, 0.05, 0);
    headGrp.add(ear);
  });
}

// ── Hand builder ──────────────────────────────────────────────────────────────
function buildHand(isRight = false) {
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.78 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0xe8c090, roughness: 0.5 });
  const side    = isRight ? -1 : 1;
  const hg      = new THREE.Group();

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.09, 0.04), skinMat);
  hg.add(palm);

  [-0.028, -0.009, 0.011, 0.030].forEach((fx, fi) => {
    const fg = new THREE.Group();
    fg.position.set(fx, -0.058, 0.008);
    fg.rotation.x = Math.PI / 7;
    [0.036, 0.030, 0.024].forEach((len, pi) => {
      const ph = new THREE.Mesh(new THREE.CylinderGeometry(0.009 - pi * 0.001, 0.0095, len, 7), skinMat);
      ph.position.y = -(0.018 + pi * 0.033);
      fg.add(ph);
    });
    const nail = new THREE.Mesh(new THREE.PlaneGeometry(0.011, 0.014), nailMat);
    nail.position.set(0, -0.09, 0.006); nail.rotation.x = -0.25;
    fg.add(nail);
    hg.add(fg);
  });

  const tg = new THREE.Group();
  tg.position.set(side * 0.046, -0.02, 0.016);
  tg.rotation.z = side * -Math.PI / 3.5;
  tg.rotation.x = Math.PI / 8;
  [0.034, 0.026].forEach((len, ti) => {
    const tp = new THREE.Mesh(new THREE.CylinderGeometry(0.01 - ti * 0.001, 0.011, len, 7), skinMat);
    tp.position.y = -(0.017 + ti * 0.032);
    tg.add(tp);
  });
  hg.add(tg);
  return hg;
}

// ── Shoe builder ──────────────────────────────────────────────────────────────
function buildShoe() {
  const shoesMat = new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.55, metalness: 0.25 });
  const sg = new THREE.Group();

  // Sole
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.135, 0.04, 0.30), new THREE.MeshStandardMaterial({ color: 0x0e1118, roughness: 0.8 }));
  sole.position.set(0, -0.02, 0);
  sg.add(sole);
  // Upper
  const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.26), shoesMat);
  upper.position.set(0, 0.045, -0.02);
  sg.add(upper);
  // Toe cap
  const toe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.08), shoesMat);
  toe.position.set(0, 0.03, 0.14);
  sg.add(toe);
  return sg;
}

// ── Update (called every frame from main.js) ──────────────────────────────────
export function updatePlayerCharacter(delta) {
  if (!bodyMesh || !bodyMesh.visible) return;

  const isMoving = getIsMoving();

  idleTime  += delta * 1.6;
  if (isMoving) {
    walkCycle += delta * 8.5;

    const swing = Math.sin(walkCycle) * 0.55;

    // Leg swing
    if (bodyParts.leftLegGrp)  bodyParts.leftLegGrp.rotation.x  =  swing;
    if (bodyParts.rightLegGrp) bodyParts.rightLegGrp.rotation.x = -swing;

    // Shin follow-through
    if (bodyParts.lShinGrp)  bodyParts.lShinGrp.rotation.x  = Math.max(0, -swing) * 0.5;
    if (bodyParts.rShinGrp)  bodyParts.rShinGrp.rotation.x  = Math.max(0,  swing) * 0.5;

    // Arm counter-swing
    if (bodyParts.leftArmGrp)  bodyParts.leftArmGrp.rotation.x  = -swing * 0.55;
    if (bodyParts.rightArmGrp) bodyParts.rightArmGrp.rotation.x  =  swing * 0.55;

    // Torso twist
    if (bodyParts.torso) bodyParts.torso.rotation.y = Math.sin(walkCycle) * 0.06;

    // Vertical bob
    if (bodyMesh) bodyMesh.position.y = Math.abs(Math.sin(walkCycle)) * 0.04;
  } else {
    // Idle breathing
    const breath = Math.sin(idleTime) * 0.008;

    if (bodyParts.torso)      bodyParts.torso.position.y      = 1.30 + breath;
    if (bodyParts.leftArmGrp) bodyParts.leftArmGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.leftArmGrp.rotation.x,  0, 0.08);
    if (bodyParts.rightArmGrp)bodyParts.rightArmGrp.rotation.x= THREE.MathUtils.lerp(bodyParts.rightArmGrp.rotation.x, 0, 0.08);
    if (bodyParts.leftLegGrp) bodyParts.leftLegGrp.rotation.x = THREE.MathUtils.lerp(bodyParts.leftLegGrp.rotation.x,  0, 0.1);
    if (bodyParts.rightLegGrp)bodyParts.rightLegGrp.rotation.x= THREE.MathUtils.lerp(bodyParts.rightLegGrp.rotation.x, 0, 0.1);
    if (bodyMesh)             bodyMesh.position.y              = THREE.MathUtils.lerp(bodyMesh.position.y, 0, 0.1);
  }
}

export function getPlayerBodyMesh() {
  return bodyMesh;
}
