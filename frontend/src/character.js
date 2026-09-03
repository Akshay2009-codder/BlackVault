// Security Guard 3D Character with procedural geometry and walk/idle animation.
// Fully self-contained, no external assets needed.

import * as THREE from "three";

let guardMesh = null;
let guardMixer = null;
let guardParts = {};
let walkCycle = 0;
let idleTime = 0;
let guardState = "patrol"; // patrol | idle | alert
let patrolTarget = new THREE.Vector3(-4, 0, -2);
let patrolPoints = [
  new THREE.Vector3(-4, 0, -2),
  new THREE.Vector3(4, 0, -2),
  new THREE.Vector3(4, 0, -6),
  new THREE.Vector3(-4, 0, -6),
];
let patrolIndex = 0;

const GUARD_SPEED = 1.6;

export function createGuard(scene) {
  const group = new THREE.Group();

  // ── Materials ──
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4956a, roughness: 0.7, metalness: 0.0 });
  const uniformMat = new THREE.MeshStandardMaterial({ color: 0x1a2235, roughness: 0.7, metalness: 0.1 });
  const bootsMat = new THREE.MeshStandardMaterial({ color: 0x0a0c12, roughness: 0.5, metalness: 0.3 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x2c1810, roughness: 0.6 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: 0x111520, roughness: 0.4, metalness: 0.5 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xff4000,
    emissive: 0xff3300,
    emissiveIntensity: 1.0,
    roughness: 0.1,
    metalness: 0.8,
    transparent: true,
    opacity: 0.85,
  });
  const badgeMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });

  // ── Torso ──
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.52, 0.22),
    uniformMat
  );
  torso.position.y = 1.35;
  torso.castShadow = true;
  group.add(torso);
  guardParts.torso = torso;

  // Chest badge / rank stripe
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.01), badgeMat);
  badge.position.set(-0.1, 0.12, 0.11);
  torso.add(badge);

  // Shoulder pads
  [-0.26, 0.26].forEach((sx) => {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.26), uniformMat);
    shoulder.position.set(sx, 0.22, 0);
    torso.add(shoulder);
  });

  // ── Hips / Pelvis ──
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.2), uniformMat);
  hips.position.y = 1.08;
  group.add(hips);
  guardParts.hips = hips;

  // Belt
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.22), beltMat);
  belt.position.y = 1.12;
  group.add(belt);

  // Belt gadget (holster / device)
  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.06), bootsMat);
  holster.position.set(0.19, 1.08, 0.08);
  group.add(holster);

  // ── Left Arm ──
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(0.28, 1.5, 0);
  group.add(leftArmGroup);
  guardParts.leftArmGroup = leftArmGroup;

  const leftUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.3, 12), uniformMat);
  leftUpperArm.position.y = -0.15;
  leftArmGroup.add(leftUpperArm);

  const leftForearmGroup = new THREE.Group();
  leftForearmGroup.position.y = -0.3;
  leftArmGroup.add(leftForearmGroup);
  guardParts.leftForearmGroup = leftForearmGroup;

  const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 12), uniformMat);
  leftForearm.position.y = -0.14;
  leftForearmGroup.add(leftForearm);

  const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.065), skinMat);
  leftHand.position.y = -0.32;
  leftForearmGroup.add(leftHand);

  // ── Right Arm ──
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(-0.28, 1.5, 0);
  group.add(rightArmGroup);
  guardParts.rightArmGroup = rightArmGroup;

  const rightUpperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.065, 0.3, 12), uniformMat);
  rightUpperArm.position.y = -0.15;
  rightArmGroup.add(rightUpperArm);

  const rightForearmGroup = new THREE.Group();
  rightForearmGroup.position.y = -0.3;
  rightArmGroup.add(rightForearmGroup);
  guardParts.rightForearmGroup = rightForearmGroup;

  const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.28, 12), uniformMat);
  rightForearm.position.y = -0.14;
  rightForearmGroup.add(rightForearm);

  const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.065), skinMat);
  rightHand.position.y = -0.32;
  rightForearmGroup.add(rightHand);

  // ── Left Leg ──
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(0.12, 1.05, 0);
  group.add(leftLegGroup);
  guardParts.leftLegGroup = leftLegGroup;

  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 12), uniformMat);
  leftThigh.position.y = -0.19;
  leftLegGroup.add(leftThigh);

  const leftShinGroup = new THREE.Group();
  leftShinGroup.position.y = -0.38;
  leftLegGroup.add(leftShinGroup);
  guardParts.leftShinGroup = leftShinGroup;

  const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.36, 12), uniformMat);
  leftShin.position.y = -0.18;
  leftShinGroup.add(leftShin);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), bootsMat);
  leftBoot.position.set(0, -0.41, 0.04);
  leftShinGroup.add(leftBoot);

  // ── Right Leg ──
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-0.12, 1.05, 0);
  group.add(rightLegGroup);
  guardParts.rightLegGroup = rightLegGroup;

  const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.38, 12), uniformMat);
  rightThigh.position.y = -0.19;
  rightLegGroup.add(rightThigh);

  const rightShinGroup = new THREE.Group();
  rightShinGroup.position.y = -0.38;
  rightLegGroup.add(rightShinGroup);
  guardParts.rightShinGroup = rightShinGroup;

  const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.36, 12), uniformMat);
  rightShin.position.y = -0.18;
  rightShinGroup.add(rightShin);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.22), bootsMat);
  rightBoot.position.set(0, -0.41, 0.04);
  rightShinGroup.add(rightBoot);

  // ── Neck ──
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.1, 12), skinMat);
  neck.position.y = 1.63;
  group.add(neck);

  // ── Head ──
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.74;
  group.add(headGroup);
  guardParts.headGroup = headGroup;

  // Helmet outer shell
  const helmetShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.68),
    helmetMat
  );
  helmetShell.position.y = 0.04;
  helmetShell.castShadow = true;
  headGroup.add(helmetShell);

  // Lower face (chin/jaw)
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.24), skinMat);
  jaw.position.set(0, -0.06, 0.02);
  headGroup.add(jaw);

  // Visor (glowing red panel across eyes)
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.07, 0.04), visorMat);
  visor.position.set(0, 0.04, 0.17);
  headGroup.add(visor);

  // Visor glow light
  const visorLight = new THREE.PointLight(0xff3300, 0.8, 1.5);
  visorLight.position.set(0, 0.04, 0.22);
  headGroup.add(visorLight);

  // Helmet chin strap
  const chinStrap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.02), helmetMat);
  chinStrap.position.set(0, -0.12, 0.12);
  headGroup.add(chinStrap);

  // Antenna on helmet
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.15, 8), helmetMat);
  antenna.position.set(0.12, 0.22, 0.0);
  headGroup.add(antenna);

  // ── Place guard in scene ──
  group.position.set(0, 0, -2);
  group.castShadow = true;
  scene.add(group);
  guardMesh = group;

  return group;
}

// Called every frame from the animation loop
export function updateGuard(delta, playerPosition) {
  if (!guardMesh) return;

  walkCycle += delta;
  idleTime += delta;

  const distToPlayer = guardMesh.position.distanceTo(playerPosition);

  // ── State machine ──
  if (distToPlayer < 3.5) {
    guardState = "alert";
  } else if (guardState === "alert" && distToPlayer > 5) {
    guardState = "patrol";
  }

  if (guardState === "patrol") {
    const target = patrolPoints[patrolIndex];
    const dir = new THREE.Vector3().subVectors(target, guardMesh.position);
    dir.y = 0;
    const dist = dir.length();

    if (dist < 0.4) {
      patrolIndex = (patrolIndex + 1) % patrolPoints.length;
    } else {
      dir.normalize();
      guardMesh.position.addScaledVector(dir, GUARD_SPEED * delta);

      // Face movement direction
      const angle = Math.atan2(dir.x, dir.z);
      guardMesh.rotation.y = THREE.MathUtils.lerp(
        guardMesh.rotation.y, angle, 0.1
      );
    }
    animateWalk(walkCycle, 1.0);

  } else if (guardState === "alert") {
    // Face player
    const dir = new THREE.Vector3().subVectors(playerPosition, guardMesh.position);
    dir.y = 0;
    const angle = Math.atan2(dir.x, dir.z);
    guardMesh.rotation.y = THREE.MathUtils.lerp(guardMesh.rotation.y, angle, 0.12);

    // Slow approach
    if (distToPlayer > 2.2) {
      dir.normalize();
      guardMesh.position.addScaledVector(dir, GUARD_SPEED * 0.5 * delta);
      animateWalk(walkCycle, 0.5);
    } else {
      animateIdle(walkCycle);
    }

    // Alert: red visor pulses faster
    if (guardParts.headGroup) {
      const visor = guardParts.headGroup.children.find(c => c.material && c.material.emissive);
      if (visor) {
        visor.material.emissiveIntensity = 1.0 + Math.sin(walkCycle * 10) * 0.5;
      }
    }
  }

  // Clamp guard within room
  guardMesh.position.x = Math.max(-11, Math.min(11, guardMesh.position.x));
  guardMesh.position.z = Math.max(-13, Math.min(13, guardMesh.position.z));
  guardMesh.position.y = 0;
}

function animateWalk(t, speed = 1.0) {
  const freq = t * 3.5 * speed;
  const legSwing = Math.sin(freq) * 0.45;
  const armSwing = Math.sin(freq) * 0.35;
  const bobY = Math.abs(Math.sin(freq * 2)) * 0.015;

  if (guardParts.torso) guardParts.torso.position.y = 1.35 + bobY;

  if (guardParts.leftLegGroup) guardParts.leftLegGroup.rotation.x = legSwing;
  if (guardParts.rightLegGroup) guardParts.rightLegGroup.rotation.x = -legSwing;
  if (guardParts.leftShinGroup) guardParts.leftShinGroup.rotation.x = Math.max(0, -legSwing * 0.6);
  if (guardParts.rightShinGroup) guardParts.rightShinGroup.rotation.x = Math.max(0, legSwing * 0.6);

  if (guardParts.leftArmGroup) guardParts.leftArmGroup.rotation.x = -armSwing;
  if (guardParts.rightArmGroup) guardParts.rightArmGroup.rotation.x = armSwing;

  if (guardParts.headGroup) guardParts.headGroup.rotation.y = Math.sin(freq * 0.5) * 0.08;
}

function animateIdle(t) {
  const breathe = Math.sin(t * 1.2) * 0.008;
  if (guardParts.torso) guardParts.torso.position.y = 1.35 + breathe;

  // Slight head look-around
  if (guardParts.headGroup) {
    guardParts.headGroup.rotation.y = Math.sin(t * 0.5) * 0.3;
    guardParts.headGroup.rotation.x = Math.sin(t * 0.35) * 0.05;
  }

  // Arms hang at sides with subtle sway
  if (guardParts.leftArmGroup) guardParts.leftArmGroup.rotation.x = Math.sin(t * 0.8) * 0.06;
  if (guardParts.rightArmGroup) guardParts.rightArmGroup.rotation.x = -Math.sin(t * 0.8) * 0.06;

  // Reset legs
  if (guardParts.leftLegGroup) guardParts.leftLegGroup.rotation.x = 0;
  if (guardParts.rightLegGroup) guardParts.rightLegGroup.rotation.x = 0;
  if (guardParts.leftShinGroup) guardParts.leftShinGroup.rotation.x = 0;
  if (guardParts.rightShinGroup) guardParts.rightShinGroup.rotation.x = 0;
}

export function getGuardState() {
  return guardState;
}

export function getGuardPosition() {
  return guardMesh ? guardMesh.position : new THREE.Vector3();
}
