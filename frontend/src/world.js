// Hub room + 5 doors + exit vault door in Three.js.

import * as THREE from "three";
import { DOOR_TYPES, BOSS_DOOR_TYPE, DOOR_LABELS } from "./config.js";

const doorRegistry = {};
let exitDoor = null;
const doorColors = {
  classification: 0x4caf50,
  regression: 0x2196f3,
  clustering: 0x9c27b0,
  anomaly: 0xff9800,
  mystery: 0xe91e63,
};

export function initWorld(scene) {
  // Hub Floor
  const floorGeo = new THREE.CylinderGeometry(18, 18, 0.4, 32);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x121722,
    roughness: 0.6,
    metalness: 0.4,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.position.y = -0.2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceilGeo = new THREE.CylinderGeometry(18, 18, 0.4, 32);
  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0x0a0e17,
    roughness: 0.8,
  });
  const ceiling = new THREE.Mesh(ceilGeo, ceilMat);
  ceiling.position.y = 5.8;
  scene.add(ceiling);

  // Outer Wall Ring
  const wallGeo = new THREE.CylinderGeometry(18, 18, 6, 32, 1, true);
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x1b2332,
    roughness: 0.7,
    side: THREE.BackSide,
  });
  const wall = new THREE.Mesh(wallGeo, wallMat);
  wall.position.y = 2.8;
  scene.add(wall);

  // Central Hub Pillar
  const pillarGeo = new THREE.CylinderGeometry(1.2, 1.2, 6, 16);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x151c27,
    metalness: 0.8,
    roughness: 0.2,
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = 2.8;
  scene.add(pillar);

  // Light strip on central pillar
  const stripGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.2, 16);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x5ec8d8 });
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.y = 2.8;
  scene.add(strip);

  // Place the 5 doors around the circle perimeter
  const allDoors = [...DOOR_TYPES, BOSS_DOOR_TYPE];
  const radius = 16.5;

  allDoors.forEach((doorType, i) => {
    const angle = (i / allDoors.length) * Math.PI * 1.8 - Math.PI * 0.9;
    const x = Math.sin(angle) * radius;
    const z = -Math.cos(angle) * radius;

    const doorGroup = new THREE.Group();
    doorGroup.position.set(x, 0, z);
    doorGroup.rotation.y = angle + Math.PI;

    // Door Frame
    const frameGeo = new THREE.BoxGeometry(3.2, 4.2, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.7 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 2.1;
    doorGroup.add(frame);

    // Door Panel
    const panelGeo = new THREE.BoxGeometry(2.4, 3.8, 0.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0d121a,
      roughness: 0.5,
      metalness: 0.6,
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = 2.0;
    doorGroup.add(panel);

    // Glowing Door Indicator / Beacon
    const glowGeo = new THREE.BoxGeometry(2.2, 0.15, 0.25);
    const color = doorColors[doorType] || 0x5ec8d8;
    const glowMat = new THREE.MeshBasicMaterial({ color });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.y = 4.0;
    doorGroup.add(glow);

    // Terminal Pedestal next to door
    const termGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x1f2735, metalness: 0.8 });
    const term = new THREE.Mesh(termGeo, termMat);
    term.position.set(2.0, 0.6, 0.8);
    doorGroup.add(term);

    // Terminal Screen
    const screenGeo = new THREE.PlaneGeometry(0.6, 0.4);
    const screenMat = new THREE.MeshBasicMaterial({ color });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(2.0, 1.1, 1.11);
    screen.rotation.x = -0.3;
    doorGroup.add(screen);

    // Light above door
    const doorLight = new THREE.PointLight(color, 1.2, 8);
    doorLight.position.set(0, 3.8, 1.0);
    doorGroup.add(doorLight);

    scene.add(doorGroup);

    doorRegistry[doorType] = {
      position: new THREE.Vector3(x, 1.5, z),
      group: doorGroup,
      panel,
      glow,
      doorType,
    };
  });

  // Exit Vault Door (behind player spawn at +Z)
  const exitGroup = new THREE.Group();
  exitGroup.position.set(0, 0, 16.5);
  exitGroup.rotation.y = 0;

  const exitFrameGeo = new THREE.BoxGeometry(4.5, 4.5, 0.5);
  const exitFrameMat = new THREE.MeshStandardMaterial({ color: 0x333b49, metalness: 0.8 });
  const exitFrame = new THREE.Mesh(exitFrameGeo, exitFrameMat);
  exitFrame.position.y = 2.25;
  exitGroup.add(exitFrame);

  const exitPanelGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.3, 32);
  exitPanelGeo.rotateX(Math.PI / 2);
  const exitPanelMat = new THREE.MeshStandardMaterial({ color: 0x18202d, metalness: 0.9 });
  const exitPanel = new THREE.Mesh(exitPanelGeo, exitPanelMat);
  exitPanel.position.y = 2.25;
  exitGroup.add(exitPanel);

  const exitGlowGeo = new THREE.TorusGeometry(1.6, 0.08, 16, 32);
  const exitGlowMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
  const exitGlow = new THREE.Mesh(exitGlowGeo, exitGlowMat);
  exitGlow.position.set(0, 2.25, 0.2);
  exitGroup.add(exitGlow);

  scene.add(exitGroup);

  exitDoor = {
    position: new THREE.Vector3(0, 1.5, 16.5),
    group: exitGroup,
    glow: exitGlow,
  };
}

export function getDoorRegistry() {
  return doorRegistry;
}

export function getExitDoor() {
  return exitDoor;
}

export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (entry && entry.panel) {
    entry.panel.position.y = 4.5; // slide up
  }
}

export function setExitUnlocked() {
  if (exitDoor && exitDoor.glow) {
    exitDoor.glow.material.color.setHex(0x4caf50); // turns green
  }
}
