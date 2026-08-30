import * as THREE from 'three';
import { MODEL_PATHS } from './config.js';
import { replaceRoomModel, replaceWithModel } from './modelLoader.js';
import { addRoomLighting, makeDoor, makeRoom, makeTeammate, scene } from './sceneSetup.js';

// Mutable shared game flags other modules read/write.
export const gameState = { alarmTriggered: false };

// ---------------------------------------------------------------------------
// Scene 1: Home
// ---------------------------------------------------------------------------
export const homeGroup = makeRoom(8, 8, 3);
scene.add(homeGroup);
addRoomLighting(0x5ec8d8, 0.5);
replaceRoomModel(MODEL_PATHS.home_room, homeGroup);

const phoneGeo = new THREE.BoxGeometry(0.25, 0.05, 0.5);
const phoneMat = new THREE.MeshStandardMaterial({ color: 0xe8a33d, emissive: 0xe8a33d, emissiveIntensity: 0.6 });
export let phone = new THREE.Mesh(phoneGeo, phoneMat);
phone.position.set(0, 0.8, -2);
scene.add(phone);
replaceWithModel(MODEL_PATHS.phone, phone, scene, {
  onReplaced: (model) => {
    phone = model;
    const entry = interactables.find((t) => t.id === 'phone');
    if (entry) entry.mesh = model;
  },
});

const deskGeo = new THREE.BoxGeometry(1.2, 0.75, 0.6);
const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a2f3a });
export const desk = new THREE.Mesh(deskGeo, deskMat);
desk.position.set(0, 0.375, -2);
scene.add(desk);

// ---------------------------------------------------------------------------
// Scene 2: Facility corridor (built, hidden until travel)
// A single long corridor with four sequential security doors, one per
// ML puzzle type — matches the brief's "each door = a different ML
// problem, harder deeper in" structure without needing separate rooms yet.
// ---------------------------------------------------------------------------
export const CORRIDOR_HALF_DEPTH = 29;
export const facilityGroup = new THREE.Group();
facilityGroup.visible = false;
scene.add(facilityGroup);

const corridor = makeRoom(6, CORRIDOR_HALF_DEPTH * 2, 3, 0x121722);
facilityGroup.add(corridor);
replaceRoomModel(MODEL_PATHS.facility_corridor, corridor);

const DOOR_DEFS = [
  { z: -7, puzzleType: 'classification', title: 'Badge Fraud Detector', difficulty: 1 },
  { z: -13, puzzleType: 'clustering', title: 'Customer Cluster Grid', difficulty: 2 },
  { z: -19, puzzleType: 'regression', title: 'Facility Power Draw Predictor', difficulty: 2 },
  { z: -25, puzzleType: 'anomaly', title: 'Fraud Transaction Scanner', difficulty: 3 },
];

export const doors = DOOR_DEFS.map((def) => {
  const mesh = makeDoor(0xd9534f);
  mesh.position.set(0, 1.3, def.z);
  facilityGroup.add(mesh);
  const doorState = { ...def, mesh, unlocked: false, baseY: 1.3 };
  replaceWithModel(MODEL_PATHS.security_door, mesh, facilityGroup, {
    onReplaced: (model) => {
      doorState.mesh = model;
      const entry = interactables.find((t) => t.door === doorState);
      if (entry) entry.mesh = model;
    },
  });
  return doorState;
});

// -- Teammates: walk alongside the player from the entry point until the
// alarm trigger line, then peel off and vanish when the lockdown hits --
export const ALARM_TRIGGER_Z = 11; // world-space Z at which the alarm auto-fires
const TEAM_DEFS = [
  { name: 'REYES', color: 0xe8a33d, xOffset: -1.1 },
  { name: 'NOMAD', color: 0x5ec8d8, xOffset: 1.1 },
];
export const teammates = TEAM_DEFS.map((def) => {
  const mesh = makeTeammate(def.color);
  mesh.position.set(def.xOffset, 0, 19);
  mesh.visible = false;
  facilityGroup.add(mesh);
  const teamState = { ...def, mesh, fleeing: false };
  replaceWithModel(MODEL_PATHS.teammate, mesh, facilityGroup, {
    onReplaced: (model) => { teamState.mesh = model; },
  });
  return teamState;
});

// ---------------------------------------------------------------------------
// Interaction targets — the shared list every prop/door registers into,
// and that interactions.js scans for the nearest usable target.
// ---------------------------------------------------------------------------
export const interactables = [
  { mesh: phone, range: 2, id: 'phone', used: false },
  ...doors.map((d, i) => ({ mesh: d.mesh, range: 2.4, id: `door_${i}`, used: false, door: d })),
];
