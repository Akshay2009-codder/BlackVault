// BlackVault 3D Corporate Tower — World Architecture
// Floor-based building with elevator lobbies, distinct floor identities,
// all sharing the Dusty Pink + Burgundy + Cream architectural palette.
//
// PALETTE:
//   Walls:     Cream #F2E8DC / Secondary #EADFD0
//   Floor:     Warm cream-grey #DCCFC0 with dark grout #2B1A1C
//   Ceiling:   #F7F1E8
//   Primary:   Burgundy #6B1F2A  (most used, building identity)
//   Secondary: Dusty Pink #C98F8A (softer highlights, upholstery)
//   Tertiary:  Brushed Gold #C9A66B (sparingly, trim, handles)
//   Furniture: Deep burgundy-black #241417
//   Danger:    #8C2635 (locked doors)
//   Solved:    #7A9471 (sage green — solved state)

import * as THREE from "three";
import { BOSS_DOOR_TYPE, STATUS_COLORS } from "./config.js";
import {
  createFloorTexture,
  createCitySkylineTexture,
  createLeftUltrawideScreenTexture,
  createRightUltrawideScreenTexture,
  createKeyboardTexture,
  createWhiteboardTexture,
  createNeonSignTexture,
  createFloorDirectoryTexture,
  createElevatorDoorTexture,
  createElevatorFloorIndicatorTexture,
  createDeptPlaqueTexture,
  createRegressionChartTexture,
  createClusterTexture,
  createThreatLevelTexture,
  createCautionStripeTexture,
  createReceptionBannerTexture,
  createHubRugTexture,
  createDoorTerminalScreenTexture,
} from "./textures.js";
import { setMaxZBound } from "./player.js";
import { registerFlickerLight } from "./sceneSetup.js";
import { setTimeDilation } from "../main.js";

// ── Collision Registry ────────────────────────────────────────────────────
const collisionBoxes = [];

export function addCollisionBox(minX, maxX, minZ, maxZ, tag = "prop", isDoorBarrier = false) {
  const box = {
    minX: Math.min(minX, maxX),
    maxX: Math.max(minX, maxX),
    minZ: Math.min(minZ, maxZ),
    maxZ: Math.max(minZ, maxZ),
    tag,
    isDoorBarrier,
    active: true,
  };
  collisionBoxes.push(box);
  return box;
}

export function removeCollisionBox(box) {
  const idx = collisionBoxes.indexOf(box);
  if (idx !== -1) collisionBoxes.splice(idx, 1);
}

export function getCollisionBoxes() {
  return collisionBoxes;
}

export function clearCollisionBoxes() {
  collisionBoxes.length = 0;
}

let worldCamera = null;

// ── Dusty Pink + Burgundy + Cream Palette ─────────────────────────────────
const P = {
  // Architecture — warm cream
  wallMain:  0xf2e8dc,   // Cream walls
  wallAlt:   0xeadfd0,   // Secondary cream (variation between floors)
  floor:     0xdccfc0,   // Warm cream-grey floor
  floorTrim: 0x2b1a1c,   // Dark grout / baseboard trim
  ceiling:   0xf7f1e8,   // Ceiling cream
  furniture: 0x241417,   // Deep burgundy-black (desks, chairs, panels)
  chrome:    0xc9a66b,   // Brushed gold (handles, rings, details)

  // Accents
  burgundy:  0x6b1f2a,   // Primary accent — used most
  pink:      0xc98f8a,   // Secondary — dusty pink
  gold:      0xc9a66b,   // Tertiary — brushed gold (sparingly)

  // Status — reserved
  danger:    0x8c2635,   // Locked / danger
  sage:      0x7a9471,   // Solved / unlocked

  // Plant greens
  plant1:    0x4a6b3a,
  plant2:    0x3a5530,
  plant3:    0x5a7a48,
};

// Room geometry constants
const ROOM_W  = 30.0;
const ROOM_H  = 6.0;   // Standard floor height
const VAULT_H = 8.5;   // Top floor grand vault
const DATA_H  = 5.6;   // Server floor low ceiling

// Total building depth — 6 zones (Ground + 5 floors)
const TOTAL_LEN = 148.0;

const doorRegistry = {};
let exitDoor = null;
let mysteryCoreMesh = null;
let mysteryOuterRing = null;
let mysteryInnerRing = null;

// Elevator alcove positions exported for elevator.js
const elevatorPositions = [];

// Door accent colours (each floor leans on one accent)
const doorColors = {
  classification: P.burgundy,
  regression:     P.pink,
  clustering:     P.gold,
  anomaly:        P.danger,
  mystery:        P.burgundy,
};

// ─────────────────────────────────────────────────────────────────────────────
export function initWorld(scene, cameraRef = null) {
  worldCamera = cameraRef;
  clearCollisionBoxes();

  // ── Shared base materials ────────────────────────────────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    color: P.floor,
    roughness: 0.42,
    metalness: 0.04,
  });
  const wallMat    = new THREE.MeshStandardMaterial({ color: P.wallMain, roughness: 0.55, metalness: 0.02 });
  const wallAltMat = new THREE.MeshStandardMaterial({ color: P.wallAlt,  roughness: 0.55, metalness: 0.02 });
  const ceilMat    = new THREE.MeshStandardMaterial({ color: P.ceiling,  roughness: 0.72, metalness: 0.01 });
  const trimMat    = new THREE.MeshStandardMaterial({ color: P.floorTrim, roughness: 0.5,  metalness: 0.1 });

  // ── Global continuous floor ──────────────────────────────────────────────
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, TOTAL_LEN), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, TOTAL_LEN / 2 - 4.0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Dark baseboard trim along perimeter walls
  [-ROOM_W / 2 + 0.08, ROOM_W / 2 - 0.08].forEach(tx => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.30, TOTAL_LEN), trimMat);
    trim.position.set(tx, 0.15, TOTAL_LEN / 2 - 4.0);
    scene.add(trim);
  });

  // ── Ceiling segments ─────────────────────────────────────────────────────
  // Ground (Z: -4 → 22, H: 6.0)
  addCeiling(scene, 26.0, ROOM_H,   9.0,  ceilMat);
  // Floor 1 (Z: 22 → 44, H: 6.0)
  addCeiling(scene, 22.0, ROOM_H,  33.0,  ceilMat);
  // Floor 2 (Z: 44 → 66, H: 5.6)
  addCeiling(scene, 22.0, DATA_H,  55.0,  ceilMat);
  // Floor 3 (Z: 66 → 88, H: 6.0)
  addCeiling(scene, 22.0, ROOM_H,  77.0,  ceilMat);
  // Floor 4 (Z: 88 → 110, H: 6.0)
  addCeiling(scene, 22.0, ROOM_H,  99.0,  ceilMat);
  // Floor 5 / Vault (Z: 110 → 144, H: 8.5)
  addCeiling(scene, 34.0, VAULT_H, 127.0, ceilMat);

  // Step wall at vault entry (height bump 6→8.5 at Z=110)
  const transWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, VAULT_H - ROOM_H), wallAltMat
  );
  transWall.position.set(0, ROOM_H + (VAULT_H - ROOM_H) / 2, 110.0);
  scene.add(transWall);

  // ── Outer perimeter walls (standard height) ──────────────────────────────
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, ROOM_H), wallMat);
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, TOTAL_LEN / 2 - 4.0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, ROOM_H), wallMat);
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, TOTAL_LEN / 2 - 4.0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Elevated vault side walls (Y: 6→8.5)
  [[-ROOM_W / 2, Math.PI / 2], [ROOM_W / 2, -Math.PI / 2]].forEach(([wx, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(34.0, VAULT_H - ROOM_H), wallAltMat);
    w.position.set(wx, ROOM_H + (VAULT_H - ROOM_H) / 2, 127.0);
    w.rotation.y = ry;
    scene.add(w);
  });

  // South entry wall + city-skyline backdrop
  const southWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_H), wallMat);
  southWall.position.set(0, ROOM_H / 2, -4.0);
  southWall.rotation.y = Math.PI;
  scene.add(southWall);

  const skyline = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W + 8, ROOM_H + 3),
    new THREE.MeshBasicMaterial({ map: createCitySkylineTexture() })
  );
  skyline.position.set(0, ROOM_H / 2, -4.2);
  scene.add(skyline);

  // ── Build all floors ──────────────────────────────────────────────────────
  buildGroundLobby(scene);
  buildFloor1Classification(scene);
  buildFloor2Regression(scene);
  buildFloor3Clustering(scene);
  buildFloor4AnomalyWing(scene);
  buildFloor5MysteryVault(scene);

  // ── Door stations (puzzle terminals) ──────────────────────────────────────
  createDoorStation(scene, "classification", 0, 22.0,  ROOM_H);
  createDoorStation(scene, "regression",     0, 44.0,  DATA_H);
  createDoorStation(scene, "clustering",     0, 66.0,  ROOM_H);
  createDoorStation(scene, "anomaly",        0, 88.0,  ROOM_H);
  createDoorStation(scene, "mystery",        0, 140.0, VAULT_H);

  setMaxZBound(20.8);
}

function addCeiling(scene, len, h, midZ, mat) {
  const c = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, len), mat);
  c.rotation.x = Math.PI / 2;
  c.position.set(0, h, midZ);
  scene.add(c);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUND FLOOR — Reception Lobby
// Cream walls, burgundy signage, directory board, reception desk, waiting sofas
// Elevator bank on far end leading to Floor 1
// ─────────────────────────────────────────────────────────────────────────────
function buildGroundLobby(scene) {
  const Z0 = -4, Z1 = 22, ZMid = 9.0;
  const accent = P.burgundy;
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });

  // Floor number plaque at entrance
  floorPlaqueMesh(scene, "G", "Reception & Lobby", P.burgundy, 0, ROOM_H - 0.75, Z0 + 1.0, 5.5);

  // Company reception banner on south wall
  const bannerMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(18.0, 1.8),
    new THREE.MeshBasicMaterial({ map: createReceptionBannerTexture() })
  );
  bannerMesh.position.set(0, ROOM_H - 1.3, Z0 + 0.12);
  bannerMesh.rotation.y = Math.PI;
  scene.add(bannerMesh);

  // Burgundy wainscot wall panels (lower half accent)
  const wainH = 1.4;
  const wainMat = new THREE.MeshStandardMaterial({ color: 0x5a1a22, roughness: 0.6, metalness: 0.05 });
  [-ROOM_W / 2, ROOM_W / 2].forEach((wx, side) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, wainH), wainMat);
    w.position.set(wx, wainH / 2, ZMid);
    w.rotation.y = side === 0 ? Math.PI / 2 : -Math.PI / 2;
    scene.add(w);
    // Gold cap rail on top of wainscot
    const cap = new THREE.Mesh(new THREE.BoxGeometry(Z1 - Z0, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: P.gold }));
    cap.position.set(wx, wainH + 0.03, ZMid);
    scene.add(cap);
  });

  // Ceiling recessed lighting strips (cream, warm)
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, ROOM_H);

  // Ambient lobby light — soft warm
  const lobbyLight = new THREE.PointLight(0xffe4d0, 1.0, 40);
  lobbyLight.position.set(0, ROOM_H - 0.6, ZMid);
  scene.add(lobbyLight);

  // ── Reception desk (curved front desk) ──────────────────────────────────
  buildReceptionDesk(scene, 0, 5.0);

  // ── Floor directory standing board ───────────────────────────────────────
  const dirTexture = createFloorDirectoryTexture();
  const dirBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.4),
    new THREE.MeshBasicMaterial({ map: dirTexture })
  );
  dirBoard.position.set(-ROOM_W / 2 + 2.2, 1.5, 4.5);
  dirBoard.rotation.y = Math.PI / 2;
  scene.add(dirBoard);
  // Board stand
  const stand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.5, 8),
    new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9 })
  );
  stand.position.set(-ROOM_W / 2 + 2.2, 0.75, 4.5);
  scene.add(stand);
  const standBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16),
    new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9 })
  );
  standBase.position.set(-ROOM_W / 2 + 2.2, 0.04, 4.5);
  scene.add(standBase);

  // ── Waiting area sofas ───────────────────────────────────────────────────
  buildSofa(scene, ROOM_W / 2 - 3.0, 6.0, -Math.PI / 2);
  buildSofa(scene, ROOM_W / 2 - 3.0, 11.0, -Math.PI / 2);

  // Coffee table between sofas
  const ctMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.3, metalness: 0.6 });
  const ctable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), ctMat);
  ctable.position.set(ROOM_W / 2 - 3.0, 0.42, 8.5);
  scene.add(ctable);
  const ctLeg = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.38, 0.8), new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85 }));
  ctLeg.position.set(ROOM_W / 2 - 3.0, 0.21, 8.5);
  scene.add(ctLeg);

  // ── Lobby rug ────────────────────────────────────────────────────────────
  const rugMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(8.0, 10.0),
    new THREE.MeshStandardMaterial({ map: createHubRugTexture(), roughness: 0.9 })
  );
  rugMesh.rotation.x = -Math.PI / 2;
  rugMesh.position.set(ROOM_W / 2 - 3.0, 0.005, 8.5);
  scene.add(rugMesh);

  // ── Elevator alcove on far wall (leads to Floor 1) ───────────────────────
  buildElevatorAlcove(scene, 0, Z1 - 2.5, "G", ROOM_H, accent);
  elevatorPositions.push({ z: Z1 - 2.5, label: "G", nextLabel: "1F", doorType: "classification" });

  // Plants
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, 14.0);
  makeOfficePlant(scene,  ROOM_W / 2 - 2.5, 14.0);
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, 3.0);

  buildCCTVProp(scene, ROOM_W / 2 - 0.6, ROOM_H - 0.2, 2.5, Math.PI * 1.2);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 1 — CLASSIFICATION LAB
// Open-plan workspace, cubicle farm, break corner — Burgundy identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor1Classification(scene) {
  const Z0 = 22, Z1 = 44, ZMid = 33.0;
  const accent = P.burgundy;
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });

  floorPlaqueMesh(scene, "1F", "Classification Lab", P.burgundy, 0, ROOM_H - 0.75, Z0 + 1.0, 6.5);
  deptWallPlaque(scene, "DATA SCIENCE DIVISION", "Classification & Prediction Systems", Z0 + 0.08, ROOM_H / 2, P.burgundy);

  // Burgundy wainscot on left wall
  const wainMat = new THREE.MeshStandardMaterial({ color: 0x521820, roughness: 0.65 });
  const wain = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, 1.2), wainMat);
  wain.position.set(-ROOM_W / 2, 0.6, ZMid);
  wain.rotation.y = Math.PI / 2;
  scene.add(wain);

  // Accent strips
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  const rl = new THREE.PointLight(accent, 0.7, 36);
  rl.position.set(0, ROOM_H - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 0.7);

  // ── Cubicle farm (2 rows × 3 cubicles) ──────────────────────────────────
  const cubiclePositions = [
    { x: -6.0, z: Z0 + 5.0  }, { x: -6.0, z: Z0 + 10.0 }, { x: -6.0, z: Z0 + 15.0 },
    {  x: 6.0, z: Z0 + 5.0  }, {  x: 6.0, z: Z0 + 10.0 }, {  x: 6.0, z: Z0 + 15.0 },
  ];
  cubiclePositions.forEach((pos, i) => {
    buildCubicle(scene, pos.x, pos.z, i % 2 === 0 ? 0 : Math.PI, accent);
    const ml = new THREE.PointLight(accent, 2.0, 4.5);
    buildWorkstationDesk(scene, {
      x: pos.x, z: pos.z, rotY: i % 2 === 0 ? 0 : Math.PI, accentColor: accent,
      screenTexture: createLeftUltrawideScreenTexture(), monitorLight: ml,
    });
    registerFlickerLight(ml, 2.0);
  });

  // ── Whiteboard on left wall ───────────────────────────────────────────────
  const wb = new THREE.Mesh(
    new THREE.PlaneGeometry(6.0, 3.0),
    new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() })
  );
  wb.position.set(-ROOM_W / 2 + 0.08, 2.8, ZMid + 3.0);
  wb.rotation.y = Math.PI / 2;
  scene.add(wb);
  const wbBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.4, 6.5), accentMat);
  wbBar.position.set(-ROOM_W / 2 + 0.03, 2.8, ZMid + 3.0);
  scene.add(wbBar);

  // ── Break corner (top right) ─────────────────────────────────────────────
  buildBreakCorner(scene, ROOM_W / 2 - 4.0, Z0 + 4.5);

  // ── Elevator alcove on far wall ──────────────────────────────────────────
  buildElevatorAlcove(scene, 0, Z1 - 2.5, "1F", ROOM_H, accent);
  elevatorPositions.push({ z: Z1 - 2.5, label: "1F", nextLabel: "2F", doorType: "regression" });

  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, Z0 + 18.0, 0.1);
  makeOfficePlant(scene, ROOM_W / 2 - 2.5, Z0 + 19.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 2 — REGRESSION LAB
// Server/data floor, cable trays, low ceiling — Dusty Pink identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor2Regression(scene) {
  const Z0 = 44, Z1 = 66, ZMid = 55.0;
  const accent = P.pink;
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });
  const h = DATA_H;

  floorPlaqueMesh(scene, "2F", "Regression Lab", P.pink, 0, h - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "DATA ENGINEERING FLOOR", "Server Infrastructure & Regression Systems", Z0 + 0.08, h / 2, P.pink);

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, h);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, h);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  const rl = new THREE.PointLight(accent, 1.0, 32);
  rl.position.set(0, h - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 1.0);

  // Dense server rack arrays — dusty pink left, gold right
  [Z0 + 4.0, Z0 + 10.5, Z0 + 17.0].forEach(rz => {
    buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, rz, accent);
    buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, rz, P.gold);
  });

  // Dusty pink accent panel on left wall
  const pPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(10.0, h),
    new THREE.MeshStandardMaterial({ color: 0xf2e0dc, roughness: 0.55, metalness: 0.01 })
  );
  pPanel.position.set(-ROOM_W / 2 + 0.06, h / 2, ZMid);
  pPanel.rotation.y = Math.PI / 2;
  scene.add(pPanel);
  const pBorder = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.04, 10.08), accentMat);
  pBorder.position.set(-ROOM_W / 2 + 0.03, h / 2, ZMid);
  scene.add(pBorder);

  // Overhead cable tray — gold metallic
  const cabMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.88, roughness: 0.2 });
  const cableTray = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 8.0, 0.18, Z1 - Z0), cabMat);
  cableTray.position.set(0, h - 0.35, ZMid);
  scene.add(cableTray);
  // Pink LED strip under tray
  const trayLED = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W - 8.8, 0.06, Z1 - Z0 - 1.0),
    accentMat
  );
  trayLED.position.set(0, h - 0.45, ZMid);
  scene.add(trayLED);

  // Pendant cone lights — gold shades
  const chromeMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.92 });
  [ZMid - 6.5, ZMid, ZMid + 6.5].forEach(pz => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), chromeMat);
    rod.position.set(0, h - 0.85, pz);
    scene.add(rod);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.32, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.6, side: THREE.DoubleSide })
    );
    shade.position.set(0, h - 1.35, pz);
    scene.add(shade);
    const pl = new THREE.PointLight(accent, 1.4, 7);
    pl.position.set(0, h - 1.55, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.4);
  });

  // Solo analyst workstation in aisle
  const mMon = new THREE.PointLight(accent, 2.0, 5);
  buildWorkstationDesk(scene, {
    x: 0, z: ZMid - 1.5, rotY: 0, accentColor: accent,
    screenTexture: createRightUltrawideScreenTexture(), monitorLight: mMon,
  });
  registerFlickerLight(mMon, 2.0);

  // Regression chart on right wall
  const chartMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 3.2),
    new THREE.MeshBasicMaterial({ map: createRegressionChartTexture() })
  );
  chartMesh.position.set(ROOM_W / 2 - 0.08, 2.8, Z0 + 9.5);
  chartMesh.rotation.y = -Math.PI / 2;
  scene.add(chartMesh);

  // Elevator alcove
  buildElevatorAlcove(scene, 0, Z1 - 2.5, "2F", h, accent);
  elevatorPositions.push({ z: Z1 - 2.5, label: "2F", nextLabel: "3F", doorType: "clustering" });
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 3 — CLUSTERING HUB
// Executive boardroom floor — Brushed Gold identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor3Clustering(scene) {
  const Z0 = 66, Z1 = 88, ZMid = 77.0;
  const accent = P.gold;
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });

  floorPlaqueMesh(scene, "3F", "Clustering Hub", P.gold, 0, ROOM_H - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "EXECUTIVE BOARDROOM", "Strategic Clustering & Analysis Division", Z0 + 0.08, ROOM_H / 2, P.gold);

  // Cream-warm feature wall at far end
  const featWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_H),
    new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.55, metalness: 0.01 })
  );
  featWall.position.set(0, ROOM_H / 2, Z1 - 0.06);
  scene.add(featWall);
  const featBorder = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + 0.04, 0.06, 0.08), accentMat);
  featBorder.position.set(0, ROOM_H - 0.03, Z1 - 0.04);
  scene.add(featBorder);

  // Drop ceiling inset over table area
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xf0e8da, roughness: 0.5 });
  const dropCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 8.0, 16.0), dropMat);
  dropCeil.rotation.x = Math.PI / 2;
  dropCeil.position.set(0, 4.8, ZMid);
  scene.add(dropCeil);

  // Perimeter cornice molding in gold
  const cornMat = new THREE.MeshStandardMaterial({ color: P.gold, roughness: 0.3, metalness: 0.85 });
  [[-ROOM_W / 2 + 3.0, 0], [ROOM_W / 2 - 3.0, 0], [0, -8.0], [0, 8.0]].forEach(([ox, oz], i) => {
    const isLong = i < 2;
    const cornGeo = isLong
      ? new THREE.BoxGeometry(0.12, 0.28, 16.0)
      : new THREE.BoxGeometry(ROOM_W - 6.12, 0.28, 0.12);
    const corn = new THREE.Mesh(cornGeo, cornMat);
    corn.position.set(ox, 4.8 - 0.14, ZMid + oz);
    scene.add(corn);
  });

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  // Executive conference table — deep burgundy-black top, gold edge
  const tableMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.18, metalness: 0.55 });
  const confTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.09, 14.0), tableMat);
  confTable.position.set(0, 0.78, ZMid);
  scene.add(confTable);
  const tableEdge = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.035, 14.02), accentMat);
  tableEdge.position.set(0, 0.83, ZMid);
  scene.add(tableEdge);

  const chromeMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.93 });
  [[-1.2, ZMid - 6.0], [1.2, ZMid - 6.0], [-1.2, ZMid + 6.0], [1.2, ZMid + 6.0]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), chromeMat);
    leg.position.set(lx, 0.39, lz);
    scene.add(leg);
  });

  // Executive chairs — dusty pink upholstery
  [
    { x: -3.0, z: ZMid - 5.0, ry: Math.PI / 2 },
    { x: -3.0, z: ZMid,       ry: Math.PI / 2 },
    { x: -3.0, z: ZMid + 5.0, ry: Math.PI / 2 },
    { x:  3.0, z: ZMid - 5.0, ry: -Math.PI / 2 },
    { x:  3.0, z: ZMid,       ry: -Math.PI / 2 },
    { x:  3.0, z: ZMid + 5.0, ry: -Math.PI / 2 },
  ].forEach(({ x, z, ry }) => buildSimpleChair(scene, x, z, ry, P.pink));

  // Pendant lights — gold over table
  [ZMid - 5.0, ZMid, ZMid + 5.0].forEach(pz => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 8), chromeMat);
    rod.position.set(0, ROOM_H - 0.8, pz);
    scene.add(rod);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.36, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.6, side: THREE.DoubleSide })
    );
    shade.position.set(0, ROOM_H - 1.75, pz);
    scene.add(shade);
    const pl = new THREE.PointLight(0xffe8c0, 1.8, 7);
    pl.position.set(0, ROOM_H - 1.95, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.8);
  });

  // Cluster presentation screen
  const presScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 3.8),
    new THREE.MeshBasicMaterial({ map: createClusterTexture() })
  );
  presScreen.position.set(0, 2.7, Z1 - 2.5);
  scene.add(presScreen);
  const scrLight = new THREE.PointLight(accent, 1.5, 11);
  scrLight.position.set(0, 2.7, Z1 - 3.5);
  scene.add(scrLight);
  registerFlickerLight(scrLight, 1.5);

  // Break room on side
  buildCoffeeStation(scene, ROOM_W / 2 - 2.5, Z0 + 4.5);
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, Z0 + 4.0);
  makeOfficePlant(scene,  ROOM_W / 2 - 2.5, Z0 + 19.0);

  // Elevator alcove
  buildElevatorAlcove(scene, 0, Z1 - 2.5, "3F", ROOM_H, accent);
  elevatorPositions.push({ z: Z1 - 2.5, label: "3F", nextLabel: "4F", doorType: "anomaly" });
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 4 — ANOMALY WING
// Security operations center — Burgundy-Red danger identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor4AnomalyWing(scene) {
  const Z0 = 88, Z1 = 110, ZMid = 99.0;
  const red = P.danger, burg = P.burgundy;

  floorPlaqueMesh(scene, "4F", "Anomaly Wing", P.danger, 0, ROOM_H - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "SECURITY OPERATIONS CENTER", "Anomaly Detection & Threat Monitoring", Z0 + 0.08, ROOM_H / 2, P.danger);

  // Red-tinted feature wall on left half
  const redPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W / 2 - 1.0, ROOM_H),
    new THREE.MeshStandardMaterial({ color: 0xf2e4e4, roughness: 0.55, metalness: 0.01 })
  );
  redPanel.position.set(-ROOM_W / 4 - 0.5, ROOM_H / 2, Z0 + 0.06);
  scene.add(redPanel);
  const redBorder = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W / 2 - 0.96, 0.06, 0.08),
    new THREE.MeshBasicMaterial({ color: red })
  );
  redBorder.position.set(-ROOM_W / 4 - 0.5, ROOM_H - 0.03, Z0 + 0.04);
  scene.add(redBorder);

  // THREAT LEVEL HIGH notice — printed sign on wall
  const threatSignMat = new THREE.MeshStandardMaterial({ color: 0x1a0a0c, roughness: 0.5 });
  const threatSign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.7), new THREE.MeshBasicMaterial({
    map: createNeonSignTexture("THREAT LEVEL: HIGH", "#8C2635", "#8C2635"),
  }));
  threatSign.position.set(ROOM_W / 2 - 0.08, ROOM_H - 1.0, Z0 + 8.0);
  threatSign.rotation.y = -Math.PI / 2;
  scene.add(threatSign);

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, new THREE.MeshBasicMaterial({ color: burg }), ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, new THREE.MeshBasicMaterial({ color: red }),  ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, new THREE.MeshBasicMaterial({ color: red }));

  const dl1 = new THREE.PointLight(burg, 1.5, 26); dl1.position.set(-6.0, ROOM_H - 0.8, ZMid); scene.add(dl1); registerFlickerLight(dl1, 1.5);
  const dl2 = new THREE.PointLight(red,  1.5, 26); dl2.position.set( 6.0, ROOM_H - 0.8, ZMid); scene.add(dl2); registerFlickerLight(dl2, 1.5);

  // Security command arc (3 desks)
  [
    { x: -6.5, z: Z0 + 9.5, rotY:  0.35, col: burg },
    { x:  0.0, z: Z0 + 7.5, rotY:  0.0,  col: burg },
    { x:  6.5, z: Z0 + 9.5, rotY: -0.35, col: red  },
  ].forEach(({ x, z, rotY, col }) => {
    const ml = new THREE.PointLight(col, 2.0, 5);
    buildWorkstationDesk(scene, {
      x, z, rotY, accentColor: col,
      screenTexture: createLeftUltrawideScreenTexture(), monitorLight: ml,
    });
    registerFlickerLight(ml, 2.0);
  });

  // Lounge break area
  buildLoungeArea(scene, -ROOM_W / 2 + 4.5, Z0 + 5.0);

  // Massive threat screen
  const threatMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(13.0, 4.0),
    new THREE.MeshBasicMaterial({ map: createThreatLevelTexture() })
  );
  threatMesh.position.set(0, 2.8, Z1 - 2.2);
  scene.add(threatMesh);
  const twLight = new THREE.PointLight(STATUS_COLORS.locked, 1.8, 14);
  twLight.position.set(0, 2.8, Z1 - 3.5);
  scene.add(twLight);
  registerFlickerLight(twLight, 1.8);

  // Server banks — alternating burg/red
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 16.5, burg);
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 10.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 16.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 10.5, burg);

  // Hazard caution stripes (burgundy-dark)
  const cautionMat = new THREE.MeshBasicMaterial({
    map: createCautionStripeTexture(), transparent: true, opacity: 0.8,
  });
  [[-ROOM_W / 2 + 3.2, ZMid + 1.5], [ROOM_W / 2 - 3.2, ZMid + 1.5]].forEach(([cx, cz]) => {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 10.0), cautionMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(cx, 0.004, cz);
    scene.add(d);
  });

  buildCCTVProp(scene, 0, ROOM_H - 0.2, Z0 + 2.5, 0);
  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, Z0 + 15.0, 0.38);

  // Elevator alcove
  buildElevatorAlcove(scene, 0, Z1 - 2.5, "4F", ROOM_H, red);
  elevatorPositions.push({ z: Z1 - 2.5, label: "4F", nextLabel: "5F", doorType: "mystery" });
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 5 — THE VAULT (Mystery / Top Floor)
// Grand vault ceiling, mystery core, all three accents at climax
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor5MysteryVault(scene) {
  const Z0 = 110, Z1 = 144, ZCore = 127.0;
  const vH = VAULT_H;

  floorPlaqueMesh(scene, "5F", "The Vault — Restricted", P.burgundy, 0, vH - 0.95, Z0 + 2.5, 7.0);

  // Vault entry wall — cream with all-three-accent border
  const vaultEntryPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, vH),
    new THREE.MeshStandardMaterial({ color: 0xf5f0e8, roughness: 0.5, metalness: 0.02 })
  );
  vaultEntryPanel.position.set(0, vH / 2, Z0 + 0.08);
  scene.add(vaultEntryPanel);

  // Triple-stripe accent border: burgundy + pink + gold
  [[P.burgundy, 0.04], [P.pink, 0.022], [P.gold, 0.01]].forEach(([col, yOff], i) => {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(ROOM_W + 0.04, 0.05, 0.08),
      new THREE.MeshBasicMaterial({ color: col })
    );
    stripe.position.set(0, vH - 0.03 - i * 0.06, Z0 + 0.05);
    scene.add(stripe);
  });

  // Grand entrance columns — brushed gold
  const colMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.88, roughness: 0.18 });
  [[-6.0, Z0 + 3.5], [6.0, Z0 + 3.5]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, vH, 16), colMat);
    col.position.set(cx, vH / 2, cz);
    scene.add(col);

    // Base collar ring — burgundy
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.06, 8, 16),
      new THREE.MeshBasicMaterial({ color: P.burgundy })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, 0.06, cz);
    scene.add(ring);

    // Top cap ring — dusty pink
    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.06, 8, 16),
      new THREE.MeshBasicMaterial({ color: P.pink })
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.set(cx, vH - 0.1, cz);
    scene.add(topRing);

    const bl = new THREE.PointLight(P.burgundy, 1.5, 7.0);
    bl.position.set(cx, 0.5, cz);
    scene.add(bl);
    registerFlickerLight(bl, 1.5);
  });

  // Ceiling dome ring — gold
  const domeRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.0, 0.12, 16, 48),
    new THREE.MeshBasicMaterial({ color: P.gold })
  );
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, vH - 0.6, ZCore);
  scene.add(domeRing);

  // Spinning outer ring — dusty pink
  mysteryOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.08, 12, 64),
    new THREE.MeshBasicMaterial({ color: P.pink })
  );
  mysteryOuterRing.rotation.x = Math.PI / 3;
  mysteryOuterRing.position.set(0, vH - 1.4, ZCore);
  scene.add(mysteryOuterRing);

  // Inner ring — brushed gold
  mysteryInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.06, 12, 48),
    new THREE.MeshBasicMaterial({ color: P.gold })
  );
  mysteryInnerRing.rotation.x = -Math.PI / 4;
  mysteryInnerRing.position.set(0, 3.2, ZCore);
  scene.add(mysteryInnerRing);

  // Ambient vault lights — burgundy + pink warm glow
  const p1 = new THREE.PointLight(P.burgundy, 2.5, 30); p1.position.set(-8, 5.5, Z0 + 10); scene.add(p1); registerFlickerLight(p1, 2.5);
  const p2 = new THREE.PointLight(P.pink,     2.5, 30); p2.position.set( 8, 5.5, Z0 + 10); scene.add(p2); registerFlickerLight(p2, 2.5);
  const p3 = new THREE.PointLight(0xffe0cc,   2.0, 30); p3.position.set( 0, 6.2, Z0 + 24); scene.add(p3); registerFlickerLight(p3, 2.0);

  // Octagonal pedestal — deep furniture black, gold ring
  const pedMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.92, roughness: 0.14 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.42, 8), pedMat);
  ped.position.set(0, 0.21, ZCore);
  scene.add(ped);

  const pedRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.3, 0.065, 16, 32),
    new THREE.MeshBasicMaterial({ color: P.gold })
  );
  pedRing.rotation.x = Math.PI / 2;
  pedRing.position.set(0, 0.42, ZCore);
  scene.add(pedRing);

  const pedLight = new THREE.PointLight(P.burgundy, 2.0, 10);
  pedLight.position.set(0, 0.5, ZCore);
  scene.add(pedLight);
  registerFlickerLight(pedLight, 2.0);

  // Mystery core — burgundy wireframe icosahedron + gold nucleus
  mysteryCoreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 2),
    new THREE.MeshStandardMaterial({
      color: P.burgundy, emissive: P.burgundy, emissiveIntensity: 2.0, wireframe: true
    })
  );
  mysteryCoreMesh.position.set(0, 3.2, ZCore);
  scene.add(mysteryCoreMesh);

  // Inner nucleus — brushed gold
  mysteryCoreMesh.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshStandardMaterial({ color: P.gold, emissive: P.gold, emissiveIntensity: 1.8 })
  ));

  // Containment pillars — alternating burgundy/pink
  [
    { x: -4.2, z: ZCore - 4.2 }, { x: 4.2, z: ZCore - 4.2 },
    { x: -4.2, z: ZCore + 4.2 }, { x: 4.2, z: ZCore + 4.2 },
  ].forEach(({ x, z }, i) => {
    const col = i % 2 === 0 ? P.burgundy : P.pink;
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 7.8, 16),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.18 })
    );
    pillar.position.set(x, 3.9, z);
    scene.add(pillar);

    [[4.0], [0.06]].forEach(([yp]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.05, 8, 16),
        new THREE.MeshBasicMaterial({ color: col })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, yp, z);
      scene.add(ring);
    });

    const bl = new THREE.PointLight(col, 2.0, 8.0);
    bl.position.set(x, 1.0, z);
    scene.add(bl);
    registerFlickerLight(bl, 2.0);

    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.14, 16),
      new THREE.MeshBasicMaterial({ color: col })
    );
    topCap.position.set(x, 7.75, z);
    scene.add(topCap);

    const topLight = new THREE.PointLight(col, 1.5, 5.0);
    topLight.position.set(x, 7.5, z);
    scene.add(topLight);
    registerFlickerLight(topLight, 1.5);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOOR STATION (Puzzle terminal + blast doors)
// ─────────────────────────────────────────────────────────────────────────────
function createDoorStation(scene, doorType, x, z, wallH) {
  const color = doorColors[doorType] || P.burgundy;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const DOOR_OPENING_W = 4.8;
  const DOOR_HALF = DOOR_OPENING_W / 2;
  const panelW = ROOM_W / 2 - DOOR_HALF;

  const wallPanelMat = new THREE.MeshStandardMaterial({ color: P.wallMain, roughness: 0.48, metalness: 0.06 });
  const frameMat    = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.2 });
  const skirtMat    = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.8,  roughness: 0.3 });

  // Flanking wall panels
  [-1, 1].forEach(side => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW, wallH, 0.55), wallPanelMat);
    panel.position.set(side * (DOOR_HALF + panelW / 2), wallH / 2, 0);
    group.add(panel);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.32, 0.58), skirtMat);
    skirt.position.set(side * (DOOR_HALF + panelW / 2), 0.16, 0);
    group.add(skirt);
  });

  // Top cornice
  const fullCornice = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.22, 0.60), skirtMat);
  fullCornice.position.set(0, wallH - 0.11, 0);
  group.add(fullCornice);

  // Door portal archway posts
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  leftPost.position.set(-2.58, 2.3, 0);
  group.add(leftPost);
  const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  rightPost.position.set(2.58, 2.3, 0);
  group.add(rightPost);
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.52, 0.38, 0.65), frameMat);
  topBeam.position.set(0, 4.41, 0);
  group.add(topBeam);

  // Hydraulic pistons
  [-1.6, 1.6].forEach(px => {
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95 })
    );
    piston.position.set(px, 4.75, 0);
    group.add(piston);
  });

  // Header panel above door frame
  const headerH = wallH - 4.6;
  if (headerH > 0) {
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_OPENING_W + 0.72, headerH, 0.55), wallPanelMat
    );
    header.position.set(0, 4.6 + headerH / 2, 0);
    group.add(header);
  }

  // Glowing LED bars flanking door — use room accent colour
  const pillarMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.85, roughness: 0.2,
  });
  [-2.78, 2.78].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.6, 0.68), pillarMat);
    pillar.position.set(px, 2.3, 0.02);
    group.add(pillar);
  });

  // Bi-parting blast door leaves — deep furniture black
  const doorMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9, roughness: 0.18 });
  const seamGlowMat = new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked });

  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.65, 4.3, 0.28), doorMat);
  leftLeaf.position.set(-1.25, 2.15, 0);
  group.add(leftLeaf);
  for (let r = 0; r < 3; r++) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.1, 0.04),
      new THREE.MeshStandardMaterial({ color: P.floorTrim, metalness: 0.88, roughness: 0.25 })
    );
    panel.position.set(-0.1, -1.2 + r * 1.3, 0.14);
    leftLeaf.add(panel);
  }
  const leftEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.32), seamGlowMat);
  leftEdgeGlow.position.set(1.30, 0, 0);
  leftLeaf.add(leftEdgeGlow);

  const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.65, 4.3, 0.28), doorMat);
  rightLeaf.position.set(1.25, 2.15, 0);
  group.add(rightLeaf);
  for (let r = 0; r < 3; r++) {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.1, 0.04),
      new THREE.MeshStandardMaterial({ color: P.floorTrim, metalness: 0.88, roughness: 0.25 })
    );
    panel.position.set(0.1, -1.2 + r * 1.3, 0.14);
    rightLeaf.add(panel);
  }
  const rightEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.32), seamGlowMat);
  rightEdgeGlow.position.set(-1.30, 0, 0);
  rightLeaf.add(rightEdgeGlow);

  // Top status bar
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.16, 0.32),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  glow.position.y = 4.41;
  group.add(glow);

  const doorLight = new THREE.PointLight(STATUS_COLORS.locked, 2.2, 12);
  doorLight.position.set(0, 4.3, 1.1);
  group.add(doorLight);

  // ── Workstation Computer & Desk Setup (Next to Door) ──────────────────────
  const deskGroup = new THREE.Group();
  deskGroup.position.set(2.6, 0, -1.35);

  const deskMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.22, metalness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.18 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: P.pink, roughness: 0.65 });

  // Desk top with gold chamfer trim
  const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.95), deskMat);
  deskTop.position.y = 0.74;
  deskTop.castShadow = true;
  deskGroup.add(deskTop);

  const deskTrim = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.025, 0.99), goldMat);
  deskTrim.position.y = 0.71;
  deskGroup.add(deskTrim);

  // Cantilever brushed gold legs with crossbar
  [-0.8, 0.8].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.70, 0.82), goldMat);
    leg.position.set(lx, 0.35, 0);
    deskGroup.add(leg);
  });
  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.6, 12), goldMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 0.25, -0.2);
  deskGroup.add(crossbar);

  // Ultrawide Curved Terminal Monitor
  const monGeo = new THREE.PlaneGeometry(1.5, 0.62, 28, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    posAttr.setZ(i, posAttr.getX(i) ** 2 * 0.14);
  }
  monGeo.computeVertexNormals();

  const colorHex = "#" + color.toString(16).padStart(6, "0");
  const termScreenTex = createDoorTerminalScreenTexture(doorType, colorHex);
  const screen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: termScreenTex, side: THREE.DoubleSide })
  );
  screen.position.set(0, 1.20, -0.18);
  deskGroup.add(screen);

  // Monitor casing back
  const casingGeo = monGeo.clone();
  casingGeo.translate(0, 0, -0.02);
  const monCasing = new THREE.Mesh(
    casingGeo,
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.95, roughness: 0.25, side: THREE.DoubleSide })
  );
  monCasing.position.set(0, 1.20, -0.18);
  deskGroup.add(monCasing);

  // Monitor stand and base
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.025, 16), goldMat);
  standBase.position.set(0, 0.79, -0.2);
  deskGroup.add(standBase);

  const standPillar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.06), goldMat);
  standPillar.position.set(0, 0.98, -0.25);
  standPillar.rotation.x = -0.1;
  deskGroup.add(standPillar);

  // Desk accessory pad
  const deskPad = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.006, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x160a0d, roughness: 0.75 })
  );
  deskPad.position.set(0, 0.785, 0.15);
  deskGroup.add(deskPad);

  // Mechanical Keyboard
  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.025, 0.24),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.35 })
  );
  keyboard.position.set(-0.1, 0.796, 0.15);
  deskGroup.add(keyboard);

  // Mouse
  const mouse = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.03, 0.05, 4, 8),
    new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.8, roughness: 0.25 })
  );
  mouse.rotation.x = Math.PI / 2;
  mouse.position.set(0.35, 0.796, 0.15);
  deskGroup.add(mouse);

  // Terminal screen ambient glow light
  const termLight = new THREE.PointLight(color, 1.8, 5.0);
  termLight.position.set(0, 1.22, 0.25);
  deskGroup.add(termLight);
  registerFlickerLight(termLight, 1.8);

  group.add(deskGroup);

  // ── Executive Swivel Task Chair ──────────────────────────────────────────
  const chairGroup = new THREE.Group();
  chairGroup.position.set(2.6, 0, -0.45);

  const cMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35 });
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), pinkMat);
  cSeat.position.y = 0.48;
  chairGroup.add(cSeat);

  const cSeatTrim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.64), goldMat);
  cSeatTrim.position.y = 0.44;
  chairGroup.add(cSeatTrim);

  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.07), cMat);
  cBack.position.set(0, 0.88, 0.28);
  cBack.rotation.x = -0.12;
  chairGroup.add(cBack);

  const backAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.60, 0.03),
    pinkMat
  );
  backAccent.position.set(0, 0, -0.03);
  cBack.add(backAccent);

  // Chair armrests
  [-0.32, 0.32].forEach(ax => {
    const armPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), goldMat);
    armPost.position.set(ax, 0.60, 0.08);
    chairGroup.add(armPost);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.28), cMat);
    armPad.position.set(ax, 0.72, 0.08);
    chairGroup.add(armPad);
  });

  const cStem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12), goldMat);
  cStem.position.y = 0.26;
  chairGroup.add(cStem);

  const cBase = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 16), cMat);
  cBase.position.y = 0.08;
  chairGroup.add(cBase);

  // 5 casters
  for (let c = 0; c < 5; c++) {
    const ca = (c / 5) * Math.PI * 2;
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), goldMat);
    wheel.position.set(Math.cos(ca) * 0.32, 0.04, Math.sin(ca) * 0.32);
    chairGroup.add(wheel);
  }

  group.add(chairGroup);

  scene.add(group);

  group.updateMatrixWorld(true);
  const seatPosition = new THREE.Vector3(2.6, 1.18, -0.45).applyMatrix4(group.matrixWorld);
  const seatLookAt   = new THREE.Vector3(2.6, 1.18, -1.35).applyMatrix4(group.matrixWorld);

  // ── Collision registrations for Door Station ─────────────────────────────
  // 1. Door terminal desk
  addCollisionBox(x + 1.6, x + 3.6, z - 1.85, z - 0.85, `door_desk_${doorType}`);
  // 2. Left flanking wall
  addCollisionBox(x - ROOM_W / 2, x - DOOR_HALF, z - 0.35, z + 0.35, `door_wall_l_${doorType}`);
  // 3. Right flanking wall
  addCollisionBox(x + DOOR_HALF, x + ROOM_W / 2, z - 0.35, z + 0.35, `door_wall_r_${doorType}`);
  // 4. Blast door portal barrier (active when door is locked)
  const barrierBox = addCollisionBox(x - DOOR_HALF, x + DOOR_HALF, z - 0.35, z + 0.35, `door_barrier_${doorType}`, true);

  doorRegistry[doorType] = {
    position: new THREE.Vector3(x + 2.6, 1.5, z - 1.35),
    group, leftLeaf, rightLeaf, leftEdgeGlow, rightEdgeGlow,
    glow, doorLight, termLight, screen, chairGroup,
    doorType, seatPosition, seatLookAt, barrierBox,
    zDoor: z, isUnlocked: false, isActive: false,
  };

  if (doorType === BOSS_DOOR_TYPE) {
    exitDoor = doorRegistry[doorType];
  }
}

// ── Architectural & Prop Helpers ───────────────────────────────────────────

/** Reception desk — curved architectural multi-tier desk with fluted panels */
function buildReceptionDesk(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const darkMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.2, metalness: 0.5 });
  const flutingMat = new THREE.MeshStandardMaterial({ color: P.pink, roughness: 0.65 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1, metalness: 0.9
  });

  // 1. Recessed gold kickplate plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.08, 1.1), goldMat);
  plinth.position.set(0, 0.04, 0);
  g.add(plinth);

  // 2. Main lower desk body with vertical acoustic fluted panels
  const body = new THREE.Mesh(new THREE.BoxGeometry(8.4, 1.0, 0.95), darkMat);
  body.position.set(0, 0.58, 0);
  g.add(body);

  // Fluted panel slats on front face
  const slatCount = 28;
  const slatW = 0.22;
  const slatSpacing = 8.1 / slatCount;
  for (let i = 0; i < slatCount; i++) {
    const sx = -4.05 + i * slatSpacing + slatW / 2;
    const isGold = i % 7 === 0;
    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(slatW - 0.04, 0.92, 0.04),
      isGold ? goldMat : (i % 2 === 0 ? flutingMat : darkMat)
    );
    slat.position.set(sx, 0.58, 0.49);
    g.add(slat);
  }

  // 3. Countertop — polished dark burgundy stone with gold trim
  const top = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 1.25), darkMat);
  top.position.set(0, 1.12, 0.05);
  g.add(top);

  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(8.84, 0.03, 1.29), goldMat);
  topTrim.position.set(0, 1.09, 0.05);
  g.add(topTrim);

  // 4. Raised executive transaction counter / floating glass shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.04, 0.45), glassMat);
  shelf.position.set(0, 1.28, 0.35);
  g.add(shelf);

  const shelfTrim = new THREE.Mesh(new THREE.BoxGeometry(5.42, 0.02, 0.47), goldMat);
  shelfTrim.position.set(0, 1.26, 0.35);
  g.add(shelfTrim);

  // Standoff riser posts supporting the raised shelf
  [-2.2, -0.7, 0.7, 2.2].forEach(px => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 12), goldMat);
    post.position.set(px, 1.20, 0.35);
    g.add(post);
  });

  // 5. Left and Right return wings (angled curved receptionist wings)
  [-4.1, 4.1].forEach((wx, side) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.08, 1.8), darkMat);
    wing.position.set(wx, 0.58, -0.65);
    g.add(wing);

    const wingTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 1.95), darkMat);
    wingTop.position.set(wx, 1.12, -0.65);
    g.add(wingTop);

    const wingTrim = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.03, 1.99), goldMat);
    wingTrim.position.set(wx, 1.09, -0.65);
    g.add(wingTrim);

    // Decorative fluted slats on exterior side of wings
    for (let k = 0; k < 6; k++) {
      const wz = -1.4 + k * 0.28;
      const wslat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.92, 0.22), flutingMat);
      wslat.position.set(wx + (side === 0 ? -0.47 : 0.47), 0.58, wz);
      g.add(wslat);
    }
  });

  // 6. Dual articulated receptionist monitors on desk
  const monMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.95, roughness: 0.2 });
  [-0.9, 0.9].forEach((mx, idx) => {
    // Monitor stand
    const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 16), goldMat);
    standBase.position.set(mx, 1.17, -0.2);
    g.add(standBase);

    const standArm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 12), goldMat);
    standArm.position.set(mx, 1.30, -0.2);
    standArm.rotation.x = -0.15;
    g.add(standArm);

    // Screen casing
    const screenCase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), monMat);
    screenCase.position.set(mx, 1.45, -0.15);
    screenCase.rotation.y = idx === 0 ? 0.22 : -0.22;
    screenCase.rotation.x = -0.1;
    g.add(screenCase);

    // Glowing screen display
    const screenDisp = new THREE.Mesh(
      new THREE.PlaneGeometry(0.84, 0.49),
      new THREE.MeshBasicMaterial({
        map: idx === 0 ? createLeftUltrawideScreenTexture() : createRightUltrawideScreenTexture()
      })
    );
    screenDisp.position.set(mx, 1.45, -0.125);
    screenDisp.rotation.y = idx === 0 ? 0.22 : -0.22;
    screenDisp.rotation.x = -0.1;
    g.add(screenDisp);
  });

  // 7. Mechanical keyboard & desk pad on receptionist desk
  const deskPad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.005, 0.5), darkMat);
  deskPad.position.set(0, 1.165, -0.25);
  g.add(deskPad);

  const kb = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.025, 0.22),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.4 })
  );
  kb.position.set(0, 1.18, -0.22);
  g.add(kb);

  // 8. Reception intercom console
  const intercom = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.24), darkMat);
  intercom.position.set(1.8, 1.20, -0.1);
  intercom.rotation.y = -0.3;
  intercom.rotation.x = 0.15;
  g.add(intercom);

  const intercomLED = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.02, 0.04),
    new THREE.MeshBasicMaterial({ color: P.sage })
  );
  intercomLED.position.set(1.7, 1.25, -0.05);
  g.add(intercomLED);

  // 9. Reception light
  const rLight = new THREE.PointLight(0xfff5e8, 1.4, 10);
  rLight.position.set(0, 1.8, -0.5);
  g.add(rLight);
  registerFlickerLight(rLight, 1.4);

  scene.add(g);

  // Collision box for reception desk
  addCollisionBox(x - 4.8, x + 4.8, z - 1.6, z + 0.8, "reception_desk");
}


/** Cubicle partition set around a desk */
function buildCubicle(scene, x, z, rotY, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const partMat = new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.7 });
  const trimMat = new THREE.MeshBasicMaterial({ color: accent });

  // Back partition
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 0.1), partMat);
  back.position.set(0, 0.7, -0.8);
  g.add(back);
  // Back trim strip
  const backTrim = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 0.12), trimMat);
  backTrim.position.set(0, 1.4, -0.8);
  g.add(backTrim);

  // Side partition
  const side = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.4, 1.8), partMat);
  side.position.set(-1.55, 0.7, 0.1);
  g.add(side);
  const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 1.8), trimMat);
  sideTrim.position.set(-1.55, 1.4, 0.1);
  g.add(sideTrim);

  // Name plate on back partition
  const namePlateMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9 });
  const namePlate = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.02), namePlateMat);
  namePlate.position.set(-0.8, 1.28, -0.74);
  g.add(namePlate);

  scene.add(g);
}

/** Sofa / waiting area seating */
function buildSofa(scene, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const bodyMat = new THREE.MeshStandardMaterial({ color: P.pink, roughness: 0.75 });
  const legMat  = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9 });
  const trimMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.4, metalness: 0.3 });

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.32, 0.95), bodyMat);
  seat.position.y = 0.46;
  g.add(seat);
  // Back cushion
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 0.22), bodyMat);
  back.position.set(0, 0.78, -0.365);
  back.rotation.x = -0.1;
  g.add(back);
  // Armrests
  [-1.0, 1.0].forEach(ax => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, 0.95), trimMat);
    arm.position.set(ax, 0.52, 0);
    g.add(arm);
  });
  // Legs
  [[-0.95, -0.4], [0.95, -0.4], [-0.95, 0.4], [0.95, 0.4]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 8), legMat);
    leg.position.set(lx, 0.14, lz);
    g.add(leg);
  });

  scene.add(g);

  // Collision box for sofa
  addCollisionBox(x - 1.3, x + 1.3, z - 0.7, z + 0.7, "sofa");
}

/** Break corner with kitchenette */
function buildBreakCorner(scene, x, z) {
  buildCoffeeStation(scene, x, z);
  // Mini fridge / counter beside it
  const fridgeMat = new THREE.MeshStandardMaterial({ color: P.wallMain, roughness: 0.4, metalness: 0.2 });
  const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.3, 0.55), fridgeMat);
  fridge.position.set(x + 1.3, 0.65, z);
  scene.add(fridge);
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.5, 0.04),
    new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95 })
  );
  handle.position.set(x + 1.62, 0.8, z);
  scene.add(handle);
  // Two stools
  [-0.5, 0.5].forEach(ox => {
    const stoolSeat = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12),
      new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.5 })
    );
    stoolSeat.position.set(x + ox, 0.76, z + 1.2);
    scene.add(stoolSeat);
    const stoolStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9 })
    );
    stoolStem.position.set(x + ox, 0.41, z + 1.2);
    scene.add(stoolStem);
  });
}

/** Elevator alcove — two doors, floor indicator, call button */
function buildElevatorAlcove(scene, x, z, floorLabel, wallH, accent) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const alcoveMat = new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.6 });
  const doorTex = createElevatorDoorTexture();
  const doorMat = new THREE.MeshStandardMaterial({ map: doorTex, roughness: 0.35, metalness: 0.35 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });

  // Alcove recess depth
  const recW = 5.2, recH = wallH, recD = 0.55;
  const alcoveBack = new THREE.Mesh(new THREE.PlaneGeometry(recW, recH), alcoveMat);
  alcoveBack.position.set(0, recH / 2, recD);
  g.add(alcoveBack);

  // Two elevator door leaves (left & right door)
  const doorW = 2.4, doorH = 4.4;
  const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), doorMat);
  leftDoor.position.set(-1.25, doorH / 2, recD - 0.04);
  g.add(leftDoor);
  const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.08), doorMat);
  rightDoor.position.set(1.25, doorH / 2, recD - 0.04);
  g.add(rightDoor);

  // Gold door frame
  [[-2.48], [2.48]].forEach(([fx]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, doorH + 0.12, 0.12), goldMat);
    frame.position.set(fx, doorH / 2, recD - 0.04);
    g.add(frame);
  });
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW * 2 + 0.36, 0.12, 0.12), goldMat);
  topFrame.position.set(0, doorH + 0.06, recD - 0.04);
  g.add(topFrame);

  // Floor indicator display above doors
  const indicTex = createElevatorFloorIndicatorTexture(floorLabel);
  const indicator = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 0.7),
    new THREE.MeshBasicMaterial({ map: indicTex })
  );
  indicator.position.set(0, doorH + 0.55, recD + 0.01);
  g.add(indicator);

  // Call button panel on wall to the right of doors
  const btnPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.5, 0.08),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.8 })
  );
  btnPanel.position.set(2.85, 1.5, 0.04);
  g.add(btnPanel);
  // Up button
  const upBtn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12),
    new THREE.MeshBasicMaterial({ color: accent })
  );
  upBtn.rotation.x = Math.PI / 2;
  upBtn.position.set(2.85, 1.65, 0.1);
  g.add(upBtn);

  // Gold light seam between doors
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.05, doorH, 0.06), new THREE.MeshBasicMaterial({ color: P.gold }));
  seam.position.set(0, doorH / 2, recD - 0.01);
  g.add(seam);

  // Elevator ambient glow
  const elLight = new THREE.PointLight(0xffe8d0, 0.8, 6);
  elLight.position.set(0, 2.5, recD + 0.3);
  g.add(elLight);

  // Side trim panels flanking alcove
  const trimMat2 = new THREE.MeshStandardMaterial({ color: P.wallMain, roughness: 0.55 });
  [-1, 1].forEach(side => {
    const sidePanel = new THREE.Mesh(new THREE.BoxGeometry(0.4, recH, 0.55), trimMat2);
    sidePanel.position.set(side * (recW / 2 + 0.2), recH / 2, recD / 2);
    g.add(sidePanel);
    // Gold vertical trim strip
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, recH, 0.08), goldMat);
    strip.position.set(side * recW / 2, recH / 2, 0.02);
    g.add(strip);
  });

  scene.add(g);
}

/** Lounge seating area with cream sofa and coffee table */
function buildLoungeArea(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const seatMat = new THREE.MeshStandardMaterial({ color: P.pink, roughness: 0.7 });
  const trimMat = new THREE.MeshBasicMaterial({ color: P.gold });

  [-1.5, 1.5].forEach(lx => {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.45, 1.1), seatMat);
    chair.position.set(lx, 0.225, 0);
    g.add(chair);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.55, 0.2), seatMat);
    back.position.set(lx, 0.55, -0.45);
    g.add(back);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.03, 0.95), trimMat);
    cushion.position.set(lx, 0.46, 0.02);
    g.add(cushion);
  });

  const table = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.32, 0.9),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85 })
  );
  table.position.set(0, 0.16, 0);
  g.add(table);

  scene.add(g);
}

/** Ceiling strip */
function ceilStrip(scene, x, z0, z1, mat, h) {
  const len = z1 - z0;
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), mat);
  s.position.set(x, h - 0.1, (z0 + z1) / 2);
  scene.add(s);
}

/** Floor-level guide strip */
function floorStrip(scene, x, z0, z1, mat) {
  const len = z1 - z0;
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), mat);
  s.position.set(x, 0.04, (z0 + z1) / 2);
  scene.add(s);
}

/** Floor + floor-number plaque header sign — architectural framed plaque with standoffs */
function floorPlaqueMesh(scene, floorNum, name, color, x, y, z, w, rotY = 0) {
  const grp = new THREE.Group();
  grp.position.set(x, y, z);
  grp.rotation.y = rotY;

  const hexColor = "#" + color.toString(16).padStart(6, "0");
  const h = 0.95;
  const d = 0.08;

  // Dark burgundy-black backboard
  const backMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35, metalness: 0.5 });
  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, d), backMat);
  back.position.z = -d / 2;
  grp.add(back);

  // Extruded brushed gold frame
  const frameMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.18 });
  const topB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.20, 0.04, d + 0.02), frameMat);
  topB.position.set(0, (h + 0.16) / 2, 0);
  grp.add(topB);
  const botB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.20, 0.04, d + 0.02), frameMat);
  botB.position.set(0, -(h + 0.16) / 2, 0);
  grp.add(botB);
  const leftB = new THREE.Mesh(new THREE.BoxGeometry(0.04, h + 0.16, d + 0.02), frameMat);
  leftB.position.set(-(w + 0.16) / 2, 0, 0);
  grp.add(leftB);
  const rightB = new THREE.Mesh(new THREE.BoxGeometry(0.04, h + 0.16, d + 0.02), frameMat);
  rightB.position.set((w + 0.16) / 2, 0, 0);
  grp.add(rightB);

  // 4 metallic standoff mounting pins
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 12), frameMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(sx * (w / 2 - 0.06), sy * (h / 2 - 0.06), 0.02);
    grp.add(pin);
  });

  // Front illuminated sign faceplate
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture(`${floorNum}  ${name}`, hexColor, hexColor) })
  );
  face.position.z = 0.015;
  grp.add(face);

  scene.add(grp);
}

/** Department wall plaque with gold standoff framing */
function deptWallPlaque(scene, dept, subtitle, z, y, accentColor) {
  const grp = new THREE.Group();
  grp.position.set(0, y + 1.2, z + 0.08);

  const w = 8.0, h = 0.85, d = 0.06;
  const frameMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.18 });
  const backMat  = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35, metalness: 0.5 });

  const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, h + 0.14, d), backMat);
  back.position.z = -d / 2;
  grp.add(back);

  const topB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.03, d + 0.02), frameMat);
  topB.position.set(0, (h + 0.14) / 2, 0);
  grp.add(topB);
  const botB = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.03, d + 0.02), frameMat);
  botB.position.set(0, -(h + 0.14) / 2, 0);
  grp.add(botB);

  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 12), frameMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(sx * (w / 2 - 0.08), sy * (h / 2 - 0.08), 0.02);
    grp.add(pin);
  });

  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: createDeptPlaqueTexture(dept, subtitle) })
  );
  face.position.z = 0.015;
  grp.add(face);

  scene.add(grp);
}

/** Storage credenza with recessed shaker doors and brass handles */
function buildStorageUnit(scene, x, z) {
  const w = 2.8, h = 1.9, d = 0.65;
  const mat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.3, metalness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.18 });

  const g = new THREE.Group();
  const side = x < 0 ? 1 : -1;
  const posX = x + side * (w / 2 - 0.1);
  g.position.set(posX, 0.95, z);

  // Main cabinet body
  const cab = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  g.add(cab);

  // Top decorative trim
  const topTrim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.04, d + 0.06), goldMat);
  topTrim.position.set(0, h / 2, 0);
  g.add(topTrim);

  // 3 cabinet door fronts with recessed panels
  const doorW = (w - 0.12) / 3;
  for (let i = 0; i < 3; i++) {
    const dx = -w / 2 + 0.06 + i * doorW + doorW / 2;
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(doorW - 0.03, h - 0.14, 0.02),
      mat
    );
    door.position.set(dx, 0, d / 2 + 0.01);
    g.add(door);

    // Brass bar pull handle
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.03), goldMat);
    pull.position.set(dx + doorW * 0.3, 0.1, d / 2 + 0.03);
    g.add(pull);
  }

  scene.add(g);

  // Collision box for storage unit
  addCollisionBox(posX - w / 2, posX + w / 2, z - d / 2, z + d / 2, "storage_unit");
}

/** Coffee/break station with espresso machine, cups and counter */
function buildCoffeeStation(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const darkMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.3, metalness: 0.45 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95, roughness: 0.18 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.2 });

  // Countertop — cream composite with gold trim
  const counter = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.08, 0.85),
    new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.35, metalness: 0.1 })
  );
  counter.position.y = 0.90;
  g.add(counter);

  const cTrim = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.02, 0.89), goldMat);
  cTrim.position.y = 0.86;
  g.add(cTrim);

  // Cantilever legs
  [-0.75, 0.75].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.86, 0.75), goldMat);
    leg.position.set(lx, 0.43, 0);
    g.add(leg);
  });

  // Stainless Steel Espresso Machine
  const machine = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.42), steelMat);
  machine.position.set(-0.45, 1.18, 0);
  g.add(machine);

  // Top cup warmer tray
  const cupTray = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.38), darkMat);
  cupTray.position.set(-0.45, 1.43, 0);
  g.add(cupTray);

  // Portafilter handle
  const portafilter = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8), darkMat);
  portafilter.rotation.z = Math.PI / 2;
  portafilter.position.set(-0.45, 1.05, 0.26);
  g.add(portafilter);

  // Steam wand
  const wand = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), goldMat);
  wand.rotation.x = 0.4;
  wand.position.set(-0.25, 1.08, 0.18);
  g.add(wand);

  // Ceramic cups on counter
  [0.15, 0.38].forEach((cx, idx) => {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.038, 0.09, 12),
      new THREE.MeshStandardMaterial({ color: idx === 0 ? P.burgundy : P.pink, roughness: 0.3 })
    );
    mug.position.set(cx, 0.985, 0.05);
    g.add(mug);
  });

  scene.add(g);

  // Collision box
  addCollisionBox(x - 1.0, x + 1.0, z - 0.55, z + 0.55, "coffee_station");
}

/** Workstation desk with curved ultrawide monitor */
function buildWorkstationDesk(scene, config) {
  const ws = new THREE.Group();
  ws.position.set(config.x, 0, config.z);
  ws.rotation.y = config.rotY;

  const deskMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.22, metalness: 0.45 });
  const legMat  = new THREE.MeshStandardMaterial({ color: P.gold,      metalness: 0.92, roughness: 0.2 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 1.25), deskMat);
  desk.position.y = 0.74;
  desk.castShadow = true;
  ws.add(desk);

  [-1.25, 1.25].forEach(lx => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 1.05), legMat);
    leg.position.set(lx, 0.37, 0);
    ws.add(leg);
  });

  // Curved ultrawide display
  const monGeo = new THREE.PlaneGeometry(2.1, 0.72, 32, 1);
  const pa = monGeo.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setZ(i, pa.getX(i) ** 2 * 0.18);
  monGeo.computeVertexNormals();

  const monScreen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: config.screenTexture, side: THREE.DoubleSide })
  );
  monScreen.position.set(-0.25, 1.22, -0.15);
  ws.add(monScreen);

  const casCopy = monGeo.clone();
  casCopy.translate(0, 0, -0.015);
  const monCasing = new THREE.Mesh(casCopy,
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.95, roughness: 0.25, side: THREE.DoubleSide })
  );
  monCasing.position.set(-0.25, 1.22, -0.15);
  ws.add(monCasing);

  const monGlow = config.monitorLight || new THREE.PointLight(config.accentColor, 2.0, 4.5);
  monGlow.color.setHex(config.accentColor);
  monGlow.position.set(-0.25, 1.22, 0.25);
  ws.add(monGlow);

  const deskPad = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.005, 0.45),
    new THREE.MeshStandardMaterial({ color: 0x1a0d0f, roughness: 0.7 })
  );
  deskPad.position.set(-0.15, 0.784, 0.22);
  ws.add(deskPad);

  const keyboard = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.02, 0.24),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.35 })
  );
  keyboard.position.set(-0.25, 0.795, 0.22);
  ws.add(keyboard);

  scene.add(ws);

  // Collision box for workstation
  addCollisionBox(config.x - 1.5, config.x + 1.5, config.z - 0.75, config.z + 0.75, "workstation_desk");
}

/** Server rack tower with glowing LEDs */
function buildServerRackGroup(scene, x, z, accentColor) {
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 4.5, 3.5),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.2 })
  );
  shelf.position.set(x, 2.25, z);
  scene.add(shelf);

  for (let r = 0; r < 7; r++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.04, 3.0),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    led.position.set(x + (x > 0 ? -0.62 : 0.62), 0.6 + r * 0.6, z);
    scene.add(led);
  }

  // Collision box for server rack
  addCollisionBox(x - 0.7, x + 0.7, z - 1.85, z + 1.85, "server_rack");
}


/** Office plant */
function makeOfficePlant(scene, x, z) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.26, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.5 })
  );
  pot.position.y = 0.25;
  pot.castShadow = true;
  g.add(pot);

  const foliage = [P.plant1, P.plant2, P.plant3];
  for (let i = 0; i < 8; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.8, 6),
      new THREE.MeshStandardMaterial({ color: foliage[i % 3], roughness: 0.5 })
    );
    const a = (i / 8) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.15, 0.9 + Math.random() * 0.15, Math.sin(a) * 0.15);
    leaf.rotation.z = Math.cos(a) * 0.35;
    leaf.rotation.x = Math.sin(a) * 0.35;
    g.add(leaf);
  }
  g.position.set(x, 0, z);
  scene.add(g);
}

/** CCTV camera prop */
function buildCCTVProp(scene, x, y, z, rotY) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.2, 0.2),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85 })
  ));
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.06, 0.24, 12),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9 })
  );
  body.rotation.z = Math.PI / 2; body.position.set(0.14, -0.05, 0);
  g.add(body);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10),
    new THREE.MeshBasicMaterial({ color: P.furniture })
  );
  lens.rotation.z = Math.PI / 2; lens.position.set(0.26, -0.05, 0);
  g.add(lens);
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.014, 6, 6),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  led.position.set(0.06, 0.09, 0.07);
  g.add(led);
  g.position.set(x, y, z);
  g.rotation.y = rotY;
  scene.add(g);
}

/** Simple chair with room-accent trim */
function buildSimpleChair(scene, x, z, rotY, accentColor) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.5 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.7 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.5), mat);
  seat.position.y = 0.48; g.add(seat);
  // Pink seat cushion top
  const cushTop = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.02, 0.44), pinkMat);
  cushTop.position.y = 0.53; g.add(cushTop);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.06), mat);
  back.position.set(0, 0.8, 0.24); back.rotation.x = -0.1; g.add(back);
  // Pink backrest panel
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.02), pinkMat);
  backPanel.position.set(0, 0.8, 0.27); backPanel.rotation.x = -0.1; g.add(backPanel);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), goldMat);
  stem.position.y = 0.27; g.add(stem);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12), goldMat);
  base.position.y = 0.08; g.add(base);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
}

/** Structural column with accent ring */
function buildStructuralColumn(scene, x, z, h, accentColor) {
  const colMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9, roughness: 0.2 });
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), colMat);
  col.position.set(x, h / 2, z);
  scene.add(col);

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.3, 0.85),
    new THREE.MeshStandardMaterial({ color: P.gold })
  );
  base.position.set(x, 0.15, z);
  scene.add(base);

  const band = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.08, 0.76),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  band.position.set(x, 1.3, z);
  scene.add(band);

  // Collision box for structural column
  addCollisionBox(x - 0.45, x + 0.45, z - 0.45, z + 0.45, "column");
}

// ── Door SFX & Animation ───────────────────────────────────────────────────

function playDoorUnlockSFX() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.45, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.setValueAtTime(2200, ctx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.45);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.45);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start();
  } catch (e) {}
}

function animateDoorLeaves(entry, duration = 950, onDone) {
  const start = performance.now();
  const lStart = entry.leftLeaf.position.x;
  const rStart = entry.rightLeaf.position.x;
  const lTarget = -3.80, rTarget = 3.80;
  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const e = 1 - Math.pow(1 - t, 3);
    entry.leftLeaf.position.x  = lStart + (lTarget - lStart) * e;
    entry.rightLeaf.position.x = rStart + (rTarget - rStart) * e;
    if (t < 1) requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  requestAnimationFrame(step);
}

// ── Exported State Management ──────────────────────────────────────────────

export function getDoorRegistry() { return doorRegistry; }
export function getExitDoor()     { return exitDoor; }
export function getElevatorPositions() { return elevatorPositions; }

export function setDoorActiveState(doorType, isActive, isUnlocked = false) {
  const entry = doorRegistry[doorType];
  if (!entry) return;
  entry.isActive = isActive;
  entry.isUnlocked = isUnlocked;
  const themeColor = doorColors[doorType] || P.burgundy;

  if (isUnlocked) {
    entry.glow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.leftEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.rightEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    if (entry.doorLight) { entry.doorLight.color.setHex(STATUS_COLORS.unlocked); entry.doorLight.intensity = 2.5; }
    if (entry.screen) entry.screen.material.color.setHex(STATUS_COLORS.unlocked);
  } else if (isActive) {
    entry.glow.material.color.setHex(themeColor);
    entry.leftEdgeGlow.material.color.setHex(themeColor);
    entry.rightEdgeGlow.material.color.setHex(themeColor);
    if (entry.doorLight) { entry.doorLight.color.setHex(themeColor); entry.doorLight.intensity = 2.2; }
    if (entry.screen) entry.screen.material.color.setHex(themeColor);
  } else {
    entry.glow.material.color.setHex(STATUS_COLORS.locked);
    entry.leftEdgeGlow.material.color.setHex(STATUS_COLORS.locked);
    entry.rightEdgeGlow.material.color.setHex(STATUS_COLORS.locked);
    if (entry.doorLight) { entry.doorLight.color.setHex(STATUS_COLORS.locked); entry.doorLight.intensity = 1.2; }
    if (entry.screen) entry.screen.material.color.setHex(STATUS_COLORS.locked);
  }
}

export function setDoorUnlocked(doorType, onComplete) {
  const entry = doorRegistry[doorType];
  if (!entry || !entry.leftLeaf) {
    if (onComplete) onComplete();
    return;
  }

  // Deactivate physical door collision barrier
  if (entry.barrierBox) entry.barrierBox.active = false;

  // Set door status to unlocked (sage green colors)
  setDoorActiveState(doorType, true, true);

  // Play audio
  playDoorUnlockSFX();

  // 1. Slow down time: drop to 35% speed for ~1.8s
  try {
    if (typeof setTimeDilation === "function") setTimeDilation(0.35);
  } catch (e) {}

  // 2. Light flash: doorLight intensity bursts to 5.8 in sage green
  if (entry.doorLight) {
    entry.doorLight.color.setHex(STATUS_COLORS.unlocked);
    entry.doorLight.intensity = 5.8;
  }

  // Flash overlay on screen
  const flashEl = document.getElementById("cinematic-flash");
  if (flashEl) {
    flashEl.classList.remove("hidden");
    flashEl.style.opacity = "0.75";
    setTimeout(() => {
      flashEl.style.opacity = "0";
      setTimeout(() => flashEl.classList.add("hidden"), 500);
    }, 250);
  }

  // 3. Cinematic camera push-in towards the opening door
  let camRunning = false;
  if (worldCamera) {
    camRunning = true;
    const startPos = worldCamera.position.clone();
    const startQuat = worldCamera.quaternion.clone();
    const origFOV = worldCamera.fov;

    const pushTargetPos = new THREE.Vector3(0, 2.3, entry.zDoor - 4.4);
    const pushLookAt = new THREE.Vector3(0, 2.3, entry.zDoor);
    const lookMat = new THREE.Matrix4().lookAt(pushTargetPos, pushLookAt, worldCamera.up);
    const pushQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);

    const pushStart = performance.now();
    const pushDuration = 1200;

    function pushStep(now) {
      const t = Math.min(1, (now - pushStart) / pushDuration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      worldCamera.position.lerpVectors(startPos, pushTargetPos, eased);
      worldCamera.quaternion.slerpQuaternions(startQuat, pushQuat, eased);
      worldCamera.fov = THREE.MathUtils.lerp(origFOV, 56, eased);
      worldCamera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(pushStep);
      } else {
        // Hold for 400ms then smoothly return
        setTimeout(() => {
          const retStart = performance.now();
          const retDuration = 650;
          function retStep(now2) {
            const t2 = Math.min(1, (now2 - retStart) / retDuration);
            const eased2 = 1 - Math.pow(1 - t2, 2);

            worldCamera.position.lerpVectors(pushTargetPos, startPos, eased2);
            worldCamera.quaternion.slerpQuaternions(pushQuat, startQuat, eased2);
            worldCamera.fov = THREE.MathUtils.lerp(56, origFOV, eased2);
            worldCamera.updateProjectionMatrix();

            if (t2 < 1) {
              requestAnimationFrame(retStep);
            } else {
              // Resume normal time speed!
              try {
                if (typeof setTimeDilation === "function") setTimeDilation(1.0);
              } catch (e) {}
              if (entry.doorLight) entry.doorLight.intensity = 2.4;
              if (onComplete) onComplete();
            }
          }
          requestAnimationFrame(retStep);
        }, 450);
      }
    }
    requestAnimationFrame(pushStep);
  }

  // 4. Door leaves slide open in slow motion (takes 2200ms)
  animateDoorLeaves(entry, 2200, () => {
    setMaxZBound(entry.zDoor + 20.8);
    if (!camRunning) {
      try {
        if (typeof setTimeDilation === "function") setTimeDilation(1.0);
      } catch (e) {}
      if (entry.doorLight) entry.doorLight.intensity = 2.4;
      if (onComplete) onComplete();
    }
  });
}

export function setExitUnlocked() {
  if (exitDoor) setDoorUnlocked(BOSS_DOOR_TYPE);
}

export function resetHubForNewLevel() {
  Object.values(doorRegistry).forEach(entry => {
    if (!entry.leftLeaf) return;
    entry.leftLeaf.position.x  = -1.25;
    entry.rightLeaf.position.x =  1.25;
    entry.isUnlocked = false;
    entry.isActive = false;
    setDoorActiveState(entry.doorType, false, false);
  });
  setMaxZBound(20.8);
}

export function updateWorldAnimations(delta) {
  const t = performance.now() * 0.001;
  if (mysteryCoreMesh) {
    mysteryCoreMesh.rotation.y += delta * 0.6;
    mysteryCoreMesh.rotation.x += delta * 0.28;
    mysteryCoreMesh.position.y = 3.2 + Math.sin(t * 1.5) * 0.15;
  }
  if (mysteryOuterRing) {
    mysteryOuterRing.rotation.z += delta * 0.32;
  }
  if (mysteryInnerRing) {
    mysteryInnerRing.rotation.y += delta * 0.42;
  }
}
