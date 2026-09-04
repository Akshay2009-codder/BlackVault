// Security Guard / Tactical 3D Character
// Loads the GLB model from assets/models/character.glb with procedural fallback.

import * as THREE from "three";
import { loadModel } from "./modelLoader.js";

let guardMesh = null;
let guardMixer = null;
let activeAction = null;
let isGlbLoaded = false;
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
  // Main container group
  guardMesh = new THREE.Group();
  guardMesh.position.set(-4, 0, -2);
  scene.add(guardMesh);

  // 1. Build procedural character as immediate render/fallback
  const proceduralGroup = buildProceduralGuard();
  guardMesh.add(proceduralGroup);

  // 2. Load the tactical GLB character model
  loadModel(
    "/assets/models/character.glb",
    (gltf) => {
      console.log("[Character] Tactical 3D model loaded successfully!", gltf);
      // Remove procedural group
      guardMesh.remove(proceduralGroup);

      const model = gltf.scene;

      // Auto-scale to human proportions (~1.85m tall)
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.y > 0) {
        const scale = 1.85 / size.y;
        model.scale.set(scale, scale, scale);
      } else {
        model.scale.set(1, 1, 1);
      }

      // Re-center model on ground
      const newBox = new THREE.Box3().setFromObject(model);
      model.position.y = -newBox.min.y;

      guardMesh.add(model);
      isGlbLoaded = true;

      // Animations
      if (gltf.animations && gltf.animations.length > 0) {
        guardMixer = new THREE.AnimationMixer(model);
        const clip = gltf.animations.find((a) => /walk|run|patrol/i.test(a.name)) || gltf.animations[0];
        if (clip) {
          activeAction = guardMixer.clipAction(clip);
          activeAction.play();
        }
      }
    },
    (err) => {
      console.log("[Character] Using high-fidelity procedural tactical guard.");
    }
  );

  return guardMesh;
}

function buildProceduralGuard() {
  const group = new THREE.Group();
  group.name = "ProceduralGuardGroup";

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

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.52, 0.22), uniformMat);
  torso.position.y = 1.35;
  torso.castShadow = true;
  group.add(torso);
  guardParts.torso = torso;

  // Chest badge
  const badge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.01), badgeMat);
  badge.position.set(-0.1, 0.12, 0.11);
  torso.add(badge);

  // Shoulder pads
  [-0.26, 0.26].forEach((sx) => {
    const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.26), uniformMat);
    shoulder.position.set(sx, 0.22, 0);
    torso.add(shoulder);
  });

  // Hips
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.2), uniformMat);
  hips.position.y = 1.08;
  group.add(hips);
  guardParts.hips = hips;

  // Belt & holster
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.22), beltMat);
  belt.position.y = 1.12;
  group.add(belt);

  const holster = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.06), bootsMat);
  holster.position.set(0.19, 1.08, 0.08);
  group.add(holster);

  // Arms
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
  leftHand.position.y = -0.3;
  leftForearmGroup.add(leftHand);

  // Right Arm
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
  rightHand.position.y = -0.3;
  rightForearmGroup.add(rightHand);

  // Legs
  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(0.12, 1.0, 0);
  group.add(leftLegGroup);
  guardParts.leftLegGroup = leftLegGroup;

  const leftThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.44, 12), uniformMat);
  leftThigh.position.y = -0.22;
  leftLegGroup.add(leftThigh);

  const leftShinGroup = new THREE.Group();
  leftShinGroup.position.y = -0.44;
  leftLegGroup.add(leftShinGroup);
  guardParts.leftShinGroup = leftShinGroup;

  const leftShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.44, 12), uniformMat);
  leftShin.position.y = -0.22;
  leftShinGroup.add(leftShin);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.24), bootsMat);
  leftBoot.position.set(0, -0.44, 0.04);
  leftShinGroup.add(leftBoot);

  // Right Leg
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(-0.12, 1.0, 0);
  group.add(rightLegGroup);
  guardParts.rightLegGroup = rightLegGroup;

  const rightThigh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.44, 12), uniformMat);
  rightThigh.position.y = -0.22;
  rightLegGroup.add(rightThigh);

  const rightShinGroup = new THREE.Group();
  rightShinGroup.position.y = -0.44;
  rightLegGroup.add(rightShinGroup);
  guardParts.rightShinGroup = rightShinGroup;

  const rightShin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.44, 12), uniformMat);
  rightShin.position.y = -0.22;
  rightShinGroup.add(rightShin);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.14, 0.24), bootsMat);
  rightBoot.position.set(0, -0.44, 0.04);
  rightShinGroup.add(rightBoot);

  // Head & Tactical Helmet
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.72;
  group.add(headGroup);
  guardParts.headGroup = headGroup;

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), skinMat);
  headGroup.add(head);

  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 16), helmetMat);
  helmet.scale.set(1, 1.08, 1.05);
  headGroup.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.065, 0.09), visorMat);
  visor.position.set(0, 0.01, 0.135);
  headGroup.add(visor);

  return group;
}

export function updateGuard(delta, playerPos) {
  if (!guardMesh) return;

  // Advance animation mixer if GLB is loaded
  if (guardMixer) {
    guardMixer.update(delta);
  }

  // AI State & Patrol Logic
  const distToPlayer = guardMesh.position.distanceTo(playerPos);

  if (distToPlayer < 4.0) {
    guardState = "alert";
  } else {
    guardState = "patrol";
  }

  if (guardState === "alert") {
    // Look at player
    const lookTarget = playerPos.clone();
    lookTarget.y = guardMesh.position.y;
    guardMesh.lookAt(lookTarget);

    idleTime += delta * 2;
    if (!isGlbLoaded && guardParts.torso) {
      guardParts.torso.position.y = 1.35 + Math.sin(idleTime) * 0.015;
    }
  } else {
    // Patrol between waypoints
    const curTarget = patrolPoints[patrolIndex];
    const toTarget = curTarget.clone().sub(guardMesh.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 0.3) {
      patrolIndex = (patrolIndex + 1) % patrolPoints.length;
    } else {
      toTarget.normalize();
      guardMesh.position.addScaledVector(toTarget, GUARD_SPEED * delta);
      guardMesh.lookAt(guardMesh.position.clone().add(toTarget));

      walkCycle += delta * 8;
      if (!isGlbLoaded && guardParts.leftLegGroup) {
        // Procedural walk animation
        const legSwing = Math.sin(walkCycle) * 0.55;
        guardParts.leftLegGroup.rotation.x = legSwing;
        guardParts.rightLegGroup.rotation.x = -legSwing;

        guardParts.leftArmGroup.rotation.x = -legSwing * 0.6;
        guardParts.rightArmGroup.rotation.x = legSwing * 0.6;

        if (guardParts.torso) {
          guardParts.torso.position.y = 1.35 + Math.abs(Math.sin(walkCycle)) * 0.04;
        }
      }
    }
  }
}

export function getGuardMesh() {
  return guardMesh;
}
