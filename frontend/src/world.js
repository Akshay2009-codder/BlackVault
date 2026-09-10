// BlackVault 3D Facility Architecture & World Design
// 5 Separate Sequential Rooms: Classification, Regression, Clustering, Anomaly, Mystery Core Vault
// Architectural system: Soft white (#F2F4F7) walls, warm light grey (#E8ECF1) floor, off-white (#FAFBFC) ceiling.
// 4 Accents: Electric Blue (#2F80ED), Violet (#8B5CF6), Amber (#FF9F43), Solved Green (#22C55E), Locked Red (#EF476F).

import * as THREE from "three";
import { DOOR_TYPES, BOSS_DOOR_TYPE, DOOR_LABELS, STATUS_COLORS } from "./config.js";
import {
  createFloorTexture,
  createCitySkylineTexture,
  createLeftUltrawideScreenTexture,
  createRightUltrawideScreenTexture,
  createKeyboardTexture,
  createWhiteboardTexture,
  createLogoTexture,
  createNeonSignTexture,
  createCeilingScreenTexture,
} from "./textures.js";
import { setMaxZBound } from "./player.js";
import { registerFlickerLight } from "./sceneSetup.js";

const doorRegistry = {};
let exitDoor = null;
let mysteryCoreMesh = null;
let mysteryOuterRing = null; // animated outer ring

const doorColors = {
  classification: 0x2f80ed, // Electric Blue
  regression: 0x8b5cf6,     // Violet
  clustering: 0xff9f43,     // Amber
  anomaly: 0x2f80ed,        // Electric Blue & Violet
  mystery: 0x8b5cf6,        // Climax Multi-accent
};

export function initWorld(scene) {
  const roomW = 22.0;
  const roomH = 5.4;

  // Materials for Base Architecture
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.25,
    metalness: 0.1,
    color: 0xe8ecf1,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xf2f4f7,
    roughness: 0.45,
    metalness: 0.05,
  });

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xfafbfc,
    roughness: 0.6,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.3,
    metalness: 0.4,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xeaf3fb,
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.9,
    ior: 1.5,
  });

  // ── Global Floor & Ceiling System (Extending through all 5 rooms: Z = -4 to 122) ──
  const totalLength = 126.0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, totalLength), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 59.0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Main ceiling (rooms 1-4, Z = -4 to 88)
  const mainCeilLength = 92.0;
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, mainCeilLength), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, roomH, 44.0);
  scene.add(ceiling);

  // Room 5 elevated ceiling at Y = 7.0 (dramatic vault height)
  const vaultCeilMat = new THREE.MeshStandardMaterial({ color: 0xf0f2f5, roughness: 0.55 });
  const vaultCeil = new THREE.Mesh(new THREE.PlaneGeometry(roomW, 34.0), vaultCeilMat);
  vaultCeil.rotation.x = Math.PI / 2;
  vaultCeil.position.set(0, 7.0, 103.0);
  scene.add(vaultCeil);

  // Transition step wall at Z=88 to cover the height gap (roomH → vaultH)
  const transWall = new THREE.Mesh(
    new THREE.PlaneGeometry(roomW, 7.0 - roomH),
    wallMat
  );
  transWall.position.set(0, roomH + (7.0 - roomH) / 2, 88.2);
  scene.add(transWall);

  // Outer Side Walls (Left & Right)
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLength, roomH), wallMat);
  leftWall.position.set(-roomW / 2, roomH / 2, 59.0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLength, roomH), wallMat);
  rightWall.position.set(roomW / 2, roomH / 2, 59.0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Vault side walls at greater height
  const leftVaultWall = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 7.0), wallMat);
  leftVaultWall.position.set(-roomW / 2, 3.5, 103.0);
  leftVaultWall.rotation.y = Math.PI / 2;
  scene.add(leftVaultWall);
  const rightVaultWall = new THREE.Mesh(new THREE.PlaneGeometry(34.0, 7.0), wallMat);
  rightVaultWall.position.set(roomW / 2, 3.5, 103.0);
  rightVaultWall.rotation.y = -Math.PI / 2;
  scene.add(rightVaultWall);

  // South Entrance Wall (Z = -4)
  const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
  southWall.position.set(0, roomH / 2, -4.0);
  southWall.rotation.y = Math.PI;
  scene.add(southWall);

  // North Window Wall on Room 1 (Skyline backdrop)
  const skylineMat = new THREE.MeshBasicMaterial({ map: createCitySkylineTexture() });
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(roomW + 8, roomH + 2), skylineMat);
  skyline.position.set(0, roomH / 2, -4.2);
  scene.add(skyline);

  // Wall Baseboard Trims
  [-roomW / 2 + 0.05, roomW / 2 - 0.05].forEach((tx) => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, totalLength), trimMat);
    trim.position.set(tx, 0.1, 59.0);
    scene.add(trim);
  });

  // ── 5 SEQUENTIAL ROOM DEFINITIONS ──

  // ── ROOM 1: CLASSIFICATION LAB (Z = -4 to 22) ───────────────────────
  buildRoom1Classification(scene, roomW, roomH, wallMat, trimMat, glassMat);

  // ── ROOM 2: REGRESSION LAB (Z = 22 to 44) ───────────────────────────
  buildRoom2Regression(scene, roomW, roomH, wallMat, trimMat, glassMat);

  // ── ROOM 3: CLUSTERING HUB (Z = 44 to 66) ───────────────────────────
  buildRoom3Clustering(scene, roomW, roomH, wallMat, trimMat, glassMat);

  // ── ROOM 4: ANOMALY WING (Z = 66 to 88) ─────────────────────────────
  buildRoom4Anomaly(scene, roomW, roomH, wallMat, trimMat, glassMat);

  // ── ROOM 5: MYSTERY CORE VAULT (Z = 88 to 120, High Climax Ceiling) ──
  buildRoom5MysteryVault(scene, roomW, roomH, wallMat, trimMat, glassMat);

  // ── 5 DIVIDER WALLS WITH BI-PARTING SLIDING SECURITY DOORS ──────────
  createSequentialDoorStation(scene, "classification", 0, 22.0, 0);
  createSequentialDoorStation(scene, "regression", 0, 44.0, 0);
  createSequentialDoorStation(scene, "clustering", 0, 66.0, 0);
  createSequentialDoorStation(scene, "anomaly", 0, 88.0, 0);
  createSequentialDoorStation(scene, "mystery", 0, 116.0, 0);

  // Initial Player Movement Z Bound (Room 1 only until Door 1 solved)
  setMaxZBound(20.8);
}

// ── ROOM 1: CLASSIFICATION LAB ───────────────────────────────────────
function buildRoom1Classification(scene, roomW, roomH, wallMat, trimMat, glassMat) {
  // Electric Blue Accent System (#2F80ED)
  const blueAccentMat = new THREE.MeshBasicMaterial({ color: 0x2f80ed });

  // Neon sign above entry: "CLASSIFICATION LAB"
  const sign1 = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 0.85),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("CLASSIFICATION LAB", "#2F80ED", "#2F80ED") })
  );
  sign1.position.set(0, roomH - 0.65, 1.5);
  scene.add(sign1);

  // Light Strips along ceiling edge
  [-roomW / 2 + 0.2, roomW / 2 - 0.2].forEach((sx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 24.0), blueAccentMat);
    strip.position.set(sx, roomH - 0.1, 9.0);
    scene.add(strip);
  });

  // Floor-level blue accent strip
  [-roomW / 2 + 0.05, roomW / 2 - 0.05].forEach((sx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 24.0), blueAccentMat);
    strip.position.set(sx, 0.03, 9.0);
    scene.add(strip);
  });

  const blueLight = new THREE.PointLight(0x2f80ed, 1.4, 18);
  blueLight.position.set(0, roomH - 0.8, 9.0);
  scene.add(blueLight);
  registerFlickerLight(blueLight, 1.4);

  // CCTV camera prop on ceiling corner
  buildCCTVProp(scene, roomW / 2 - 0.5, roomH - 0.15, 2.5, Math.PI * 1.1);
  buildCCTVProp(scene, -roomW / 2 + 0.5, roomH - 0.15, 18.0, Math.PI * 0.1);

  // Classification Decision Tree Whiteboard Panel
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.5),
    new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() })
  );
  board.position.set(-roomW / 2 + 0.1, 2.3, 8.0);
  board.rotation.y = Math.PI / 2;
  scene.add(board);

  // Workstation Desk facing camera (+Z)
  const monLight1 = new THREE.PointLight(0x2f80ed, 1.8, 4.0);
  buildWorkstationDesk(scene, {
    x: 0,
    z: 6.0,
    rotY: 0,
    accentColor: 0x2f80ed,
    screenTexture: createLeftUltrawideScreenTexture(),
    monitorLight: monLight1,
  });
  registerFlickerLight(monLight1, 1.8);

  // Server rack array on left wall
  buildServerRackGroup(scene, -roomW / 2 + 0.8, 14.0, 0x2f80ed);

  // Plant accent
  makeOfficePlant(scene, roomW / 2 - 1.5, 3.0);
}

// ── ROOM 2: REGRESSION LAB ───────────────────────────────────────────
function buildRoom2Regression(scene, roomW, roomH, wallMat, trimMat, glassMat) {
  // Violet Accent System (#8B5CF6)
  const violetAccentMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });

  // Neon sign
  const sign2 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 0.85),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("REGRESSION LAB", "#8B5CF6", "#8B5CF6") })
  );
  sign2.position.set(0, roomH - 0.65, 23.5);
  scene.add(sign2);

  // Glass partition divider
  const partition = new THREE.Mesh(new THREE.PlaneGeometry(12.0, 3.6), glassMat);
  partition.position.set(-3.5, 1.8, 33.0);
  scene.add(partition);

  const partitionBeam = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.12, 0.15), trimMat);
  partitionBeam.position.set(-3.5, 3.6, 33.0);
  scene.add(partitionBeam);

  // Violet Ceiling Light Fixtures
  [-roomW / 2 + 0.2, roomW / 2 - 0.2].forEach((sx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 20.0), violetAccentMat);
    strip.position.set(sx, roomH - 0.1, 33.0);
    scene.add(strip);
  });

  // Floor-level violet strip
  [-roomW / 2 + 0.05, roomW / 2 - 0.05].forEach((sx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 20.0), violetAccentMat);
    strip.position.set(sx, 0.03, 33.0);
    scene.add(strip);
  });

  const violetLight = new THREE.PointLight(0x8b5cf6, 1.5, 20);
  violetLight.position.set(0, roomH - 0.8, 33.0);
  scene.add(violetLight);
  registerFlickerLight(violetLight, 1.5);

  // Angled violet spotlight from ceiling (gives the room drama)
  const vSpot = new THREE.SpotLight(0x8b5cf6, 2.8, 14, Math.PI / 7, 0.4);
  vSpot.position.set(-5.0, roomH - 0.3, 28.0);
  vSpot.target.position.set(-5.0, 0, 30.0);
  scene.add(vSpot);
  scene.add(vSpot.target);

  // Right-wall regression chart panel
  const chartCanvas = createRegressionChartTexture();
  const chartPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.6),
    new THREE.MeshBasicMaterial({ map: chartCanvas })
  );
  chartPanel.position.set(roomW / 2 - 0.12, 2.4, 36.0);
  chartPanel.rotation.y = -Math.PI / 2;
  scene.add(chartPanel);

  // Dual Regression Telemetry Workstation
  const monLight2a = new THREE.PointLight(0x8b5cf6, 1.8, 4.0);
  const monLight2b = new THREE.PointLight(0x8b5cf6, 1.8, 4.0);
  buildWorkstationDesk(scene, {
    x: -3.0,
    z: 30.0,
    rotY: 0.15,
    accentColor: 0x8b5cf6,
    screenTexture: createRightUltrawideScreenTexture(),
    monitorLight: monLight2a,
  });
  buildWorkstationDesk(scene, {
    x: 3.0,
    z: 30.0,
    rotY: -0.15,
    accentColor: 0x8b5cf6,
    screenTexture: createLeftUltrawideScreenTexture(),
    monitorLight: monLight2b,
  });
  registerFlickerLight(monLight2a, 1.8);
  registerFlickerLight(monLight2b, 1.8);

  // Server Column Array
  buildServerRackGroup(scene, roomW / 2 - 0.8, 36.0, 0x8b5cf6);
}

// ── ROOM 3: CLUSTERING HUB ───────────────────────────────────────────
function buildRoom3Clustering(scene, roomW, roomH, wallMat, trimMat, glassMat) {
  // Amber Accent System (#FF9F43)
  const amberAccentMat = new THREE.MeshBasicMaterial({ color: 0xff9f43 });

  // Neon sign
  const sign3 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 0.85),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("CLUSTERING HUB", "#FF9F43", "#FF9F43") })
  );
  sign3.position.set(0, roomH - 0.65, 45.5);
  scene.add(sign3);

  // Amber Ceiling Light Strip
  [-roomW / 2 + 0.2, roomW / 2 - 0.2].forEach((sx) => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 20.0), amberAccentMat);
    strip.position.set(sx, roomH - 0.1, 55.0);
    scene.add(strip);
  });

  const amberLight = new THREE.PointLight(0xff9f43, 1.5, 20);
  amberLight.position.set(0, roomH - 0.8, 55.0);
  scene.add(amberLight);
  registerFlickerLight(amberLight, 1.5);

  // Amber Pendant Light Fixtures (hanging from ceiling)
  [{ x: -5.5, z: 52.0 }, { x: 5.5, z: 52.0 }, { x: 0, z: 58.5 }].forEach((p) => {
    // Pendant rod
    const rod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.8 })
    );
    rod.position.set(p.x, roomH - 0.6, p.z);
    scene.add(rod);
    // Shade
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.3, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.5, side: THREE.DoubleSide })
    );
    shade.position.set(p.x, roomH - 1.4, p.z);
    scene.add(shade);
    // Warm amber glow inside pendant
    const pendLight = new THREE.PointLight(0xff9f43, 1.2, 5.5);
    pendLight.position.set(p.x, roomH - 1.6, p.z);
    scene.add(pendLight);
    registerFlickerLight(pendLight, 1.2);
  });

  // Circular Collaboration Hub Desk in Center
  const hubTable = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.4, 0.1, 32),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 })
  );
  hubTable.position.set(0, 0.75, 54.0);
  scene.add(hubTable);

  const hubRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.42, 0.03, 16, 32),
    amberAccentMat
  );
  hubRing.rotation.x = Math.PI / 2;
  hubRing.position.set(0, 0.75, 54.0);
  scene.add(hubRing);

  // 3 Satellite chairs around hub
  [0, 1, 2].forEach((i) => {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 6;
    const cx = Math.cos(angle) * 3.2;
    const cz = 54.0 + Math.sin(angle) * 3.2;
    buildSimpleChair(scene, cx, cz, -angle + Math.PI, 0xff9f43);
  });

  // Clustering Holographic Scatter Plot Display
  const clusterCanvas = document.createElement("canvas");
  clusterCanvas.width = 512; clusterCanvas.height = 360;
  const cctx = clusterCanvas.getContext("2d");
  cctx.fillStyle = "#0c1320"; cctx.fillRect(0, 0, 512, 360);
  cctx.strokeStyle = "#ff9f43"; cctx.lineWidth = 3; cctx.strokeRect(8, 8, 496, 344);
  cctx.font = "bold 18px 'Inter', sans-serif"; cctx.fillStyle = "#ff9f43";
  cctx.fillText("K-MEANS CLUSTER RADAR", 24, 40);

  // Draw scatter clusters
  const clusters = [
    { cx: 140, cy: 150, color: "#2f80ed" },
    { cx: 340, cy: 120, color: "#8b5cf6" },
    { cx: 240, cy: 260, color: "#ff9f43" }
  ];
  clusters.forEach((c) => {
    cctx.fillStyle = c.color;
    for (let p = 0; p < 24; p++) {
      const rx = c.cx + (Math.random() - 0.5) * 80;
      const ry = c.cy + (Math.random() - 0.5) * 60;
      cctx.beginPath(); cctx.arc(rx, ry, 4, 0, Math.PI * 2); cctx.fill();
    }
  });

  const clusterBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.2),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(clusterCanvas) })
  );
  clusterBoard.position.set(0, 2.4, 54.0);
  scene.add(clusterBoard);

  makeOfficePlant(scene, -roomW / 2 + 1.8, 50.0);
  makeOfficePlant(scene, roomW / 2 - 1.8, 58.0);
}

// ── ROOM 4: ANOMALY WING ─────────────────────────────────────────────
function buildRoom4Anomaly(scene, roomW, roomH, wallMat, trimMat, glassMat) {
  // Dual Electric Blue (#2F80ED) & Violet (#8B5CF6) Cyber Defense Corridor
  // Neon sign
  const sign4 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.0, 0.85),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("ANOMALY WING", "#EF476F", "#EF476F") })
  );
  sign4.position.set(0, roomH - 0.65, 67.5);
  scene.add(sign4);

  const blueStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 20.0),
    new THREE.MeshBasicMaterial({ color: 0x2f80ed })
  );
  blueStrip.position.set(-roomW / 2 + 0.2, roomH - 0.1, 77.0);
  scene.add(blueStrip);

  const violetStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 20.0),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })
  );
  violetStrip.position.set(roomW / 2 - 0.2, roomH - 0.1, 77.0);
  scene.add(violetStrip);

  const dualLight1 = new THREE.PointLight(0x2f80ed, 1.4, 16);
  dualLight1.position.set(-4.0, roomH - 0.8, 77.0);
  scene.add(dualLight1);
  registerFlickerLight(dualLight1, 1.4);

  const dualLight2 = new THREE.PointLight(0x8b5cf6, 1.4, 16);
  dualLight2.position.set(4.0, roomH - 0.8, 77.0);
  scene.add(dualLight2);
  registerFlickerLight(dualLight2, 1.4);

  // Caution striping decal on floor near server banks
  const cautionCanvas = createCautionStripeTexture();
  [-roomW / 2 + 2.0, roomW / 2 - 2.0].forEach((cx) => {
    const decal = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 8.0),
      new THREE.MeshBasicMaterial({ map: cautionCanvas, transparent: true, opacity: 0.75 })
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(cx, 0.002, 77.0);
    scene.add(decal);
  });

  // Threat-level alert panel on right wall
  const alertPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(3.8, 2.2),
    new THREE.MeshBasicMaterial({ map: createThreatLevelTexture() })
  );
  alertPanel.position.set(roomW / 2 - 0.12, 2.5, 72.0);
  alertPanel.rotation.y = -Math.PI / 2;
  scene.add(alertPanel);

  // High-Density Cyber Server Banks lining both sides
  buildServerRackGroup(scene, -roomW / 2 + 0.8, 73.0, 0x2f80ed);
  buildServerRackGroup(scene, -roomW / 2 + 0.8, 81.0, 0x8b5cf6);
  buildServerRackGroup(scene, roomW / 2 - 0.8, 73.0, 0x8b5cf6);
  buildServerRackGroup(scene, roomW / 2 - 0.8, 81.0, 0x2f80ed);

  // Security Workstation Desk
  const monLight4 = new THREE.PointLight(0x2f80ed, 1.8, 4.0);
  buildWorkstationDesk(scene, {
    x: 0,
    z: 76.0,
    rotY: 0,
    accentColor: 0x2f80ed,
    screenTexture: createLeftUltrawideScreenTexture(),
    monitorLight: monLight4,
  });
  registerFlickerLight(monLight4, 1.8);
}

// ── ROOM 5: MYSTERY CORE SECURITY VAULT (GRAND CLIMAX) ───────────────
function buildRoom5MysteryVault(scene, roomW, roomH, wallMat, trimMat, glassMat) {
  // Climax Room: Elevated ceiling (7.0m tall) & dramatic multi-accent lighting
  const vaultH = 7.0;

  // Neon sign on entry
  const sign5 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 0.85),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("CORE VAULT", "#8B5CF6", "#2F80ED") })
  );
  sign5.position.set(0, vaultH - 0.85, 90.0);
  scene.add(sign5);

  // Multi-accent ceiling dome ring
  const domeRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.5, 0.12, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })
  );
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, vaultH - 0.5, 102.0);
  scene.add(domeRing);

  // Outer spinning ring (animated in updateWorldAnimations)
  mysteryOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.2, 0.06, 12, 64),
    new THREE.MeshBasicMaterial({ color: 0x2f80ed })
  );
  mysteryOuterRing.rotation.x = Math.PI / 3;
  mysteryOuterRing.position.set(0, vaultH - 1.2, 102.0);
  scene.add(mysteryOuterRing);

  // Pulse lights for climax atmosphere
  const p1 = new THREE.PointLight(0x2f80ed, 2.2, 22);
  p1.position.set(-6.0, 4.5, 98.0);
  scene.add(p1);
  registerFlickerLight(p1, 2.2);

  const p2 = new THREE.PointLight(0x8b5cf6, 2.2, 22);
  p2.position.set(6.0, 4.5, 98.0);
  scene.add(p2);
  registerFlickerLight(p2, 2.2);

  const p3 = new THREE.PointLight(0xff9f43, 2.2, 22);
  p3.position.set(0, 5.0, 108.0);
  scene.add(p3);
  registerFlickerLight(p3, 2.2);

  // Central Octagonal Elevated Pedestal Platform
  const pedGeo = new THREE.CylinderGeometry(3.5, 3.8, 0.35, 8);
  const pedMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.2,
  });
  const pedestal = new THREE.Mesh(pedGeo, pedMat);
  pedestal.position.set(0, 0.175, 102.0);
  scene.add(pedestal);

  const pedGlow = new THREE.Mesh(
    new THREE.TorusGeometry(3.55, 0.05, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0x8b5cf6 })
  );
  pedGlow.rotation.x = Math.PI / 2;
  pedGlow.position.set(0, 0.35, 102.0);
  scene.add(pedGlow);

  // Pillar base uplights — dramatic floor-to-ceiling illumination
  const pillarPos = [
    { x: -3.2, z: 98.8 }, { x: 3.2, z: 98.8 },
    { x: -3.2, z: 105.2 }, { x: 3.2, z: 105.2 },
  ];
  pillarPos.forEach((pos, idx) => {
    const colColor = idx % 2 === 0 ? 0x2f80ed : 0xff9f43;
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 6.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.9, roughness: 0.2 })
    );
    col.position.set(pos.x, 3.25, pos.z);
    scene.add(col);

    // Base uplight ring
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.04, 8, 16),
      new THREE.MeshBasicMaterial({ color: colColor })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(pos.x, 0.05, pos.z);
    scene.add(baseRing);

    const baseLight = new THREE.PointLight(colColor, 1.6, 5.5);
    baseLight.position.set(pos.x, 0.3, pos.z);
    scene.add(baseLight);
    registerFlickerLight(baseLight, 1.6);

    // Top ring
    const strip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.1, 16),
      new THREE.MeshBasicMaterial({ color: colColor })
    );
    strip.position.set(pos.x, 6.45, pos.z);
    scene.add(strip);
  });

  // Floating Rotating Holographic Mystery Core
  const coreGeo = new THREE.IcosahedronGeometry(0.85, 2);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x8b5cf6,
    emissiveIntensity: 1.2,
    wireframe: true,
  });
  mysteryCoreMesh = new THREE.Mesh(coreGeo, coreMat);
  mysteryCoreMesh.position.set(0, 2.8, 102.0);
  scene.add(mysteryCoreMesh);

  const innerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x2f80ed })
  );
  mysteryCoreMesh.add(innerCore);
}

// ── SEQUENTIAL DOOR & TERMINAL PEDESTAL STATION BUILDER ───────────────
function createSequentialDoorStation(scene, doorType, x, z, rotY) {
  const color = doorColors[doorType] || 0x2f80ed;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  // Outer Door Frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.88, roughness: 0.2 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.4, 0.4), frameMat);
  frame.position.y = 2.2;
  group.add(frame);

  // Flanking Accent Pillars
  const pillarMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.4 });
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.4, 0.44), pillarMat);
  leftPillar.position.set(-2.2, 2.2, 0.02);
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 4.4, 0.44), pillarMat);
  rightPillar.position.set(2.2, 2.2, 0.02);
  group.add(rightPillar);

  // Bi-parting Security Door Panels (Locked state initially = Red #EF476F glow)
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
  const seamGlowMat = new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked });

  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.95, 4.0, 0.2), doorMat);
  leftLeaf.position.set(-0.98, 2.1, 0);
  group.add(leftLeaf);

  const leftEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.8, 0.22), seamGlowMat);
  leftEdgeGlow.position.set(0.96, 0, 0);
  leftLeaf.add(leftEdgeGlow);

  const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.95, 4.0, 0.2), doorMat);
  rightLeaf.position.set(0.98, 2.1, 0);
  group.add(rightLeaf);

  const rightEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.8, 0.22), seamGlowMat);
  rightEdgeGlow.position.set(-0.96, 0, 0);
  rightLeaf.add(rightEdgeGlow);

  // Frame Top Status Light Strip
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.14, 0.26),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  glow.position.y = 4.25;
  group.add(glow);

  const doorLight = new THREE.PointLight(STATUS_COLORS.locked, 1.8, 10);
  doorLight.position.set(0, 4.1, 0.8);
  group.add(doorLight);

  // ── Interactive Pedestal Terminal ───────────────────────
  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 1.15, 0.58),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85 })
  );
  pedestal.position.set(2.2, 0.58, -1.2);
  group.add(pedestal);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.46),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  screen.position.set(2.2, 1.1, -0.92);
  screen.rotation.x = -0.35;
  group.add(screen);

  const termLight = new THREE.PointLight(color, 1.2, 4.0);
  termLight.position.set(2.2, 1.15, -0.8);
  group.add(termLight);

  // ── High-Tech Terminal Chair Prop ───────────────────────
  const chairGroup = new THREE.Group();
  chairGroup.position.set(2.2, 0, -0.35);

  const chairSeat = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.08, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 })
  );
  chairSeat.position.y = 0.48;
  chairGroup.add(chairSeat);

  const chairAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.02, 0.46),
    new THREE.MeshBasicMaterial({ color })
  );
  chairAccent.position.set(0, 0.525, 0);
  chairGroup.add(chairAccent);

  const chairBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.65, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  chairBack.position.set(0, 0.82, 0.24);
  chairBack.rotation.x = -0.12;
  chairGroup.add(chairBack);

  const chairBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
  );
  chairBase.position.y = 0.08;
  chairGroup.add(chairBase);

  const chairStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 0.36, 12),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
  );
  chairStem.position.y = 0.26;
  chairGroup.add(chairStem);

  group.add(chairGroup);
  scene.add(group);

  // Calculate World Positions for Raycasting and Sit Camera Targets
  const interactPos = new THREE.Vector3(x + 2.2, 1.5, z - 1.2);

  group.updateMatrixWorld(true);
  const seatPosition = new THREE.Vector3(2.2, 1.15, -0.35).applyMatrix4(group.matrixWorld);
  const seatLookAt = new THREE.Vector3(2.2, 1.1, -0.92).applyMatrix4(group.matrixWorld);

  doorRegistry[doorType] = {
    position: interactPos,
    group,
    leftLeaf,
    rightLeaf,
    leftEdgeGlow,
    rightEdgeGlow,
    glow,
    doorLight,
    termLight,
    screen,
    chairGroup,
    doorType,
    seatPosition,
    seatLookAt,
    zDoor: z,
    isUnlocked: false,
    isActive: false,
  };

  if (doorType === BOSS_DOOR_TYPE) {
    exitDoor = doorRegistry[doorType];
  }
}

// Helper to build high-detail workstation desk
function buildWorkstationDesk(scene, config) {
  const ws = new THREE.Group();
  ws.position.set(config.x, 0, config.z);
  ws.rotation.y = config.rotY;

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.28, metalness: 0.4 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.15), deskMat);
  desk.position.y = 0.74;
  desk.castShadow = true;
  desk.receiveShadow = true;
  ws.add(desk);

  [-1.15, 1.15].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.95), legMat);
    leg.position.set(lx, 0.37, 0);
    ws.add(leg);
  });

  // Curved Ultrawide Monitor
  const monW = 1.9;
  const monH = 0.65;
  const monGeo = new THREE.PlaneGeometry(monW, monH, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    posAttr.setZ(i, (x * x) * 0.18);
  }
  monGeo.computeVertexNormals();

  const monScreen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: config.screenTexture, side: THREE.DoubleSide })
  );
  monScreen.position.set(-0.25, 1.18, -0.15);
  ws.add(monScreen);

  const casingGeo = monGeo.clone();
  casingGeo.translate(0, 0, -0.015);
  const casing = new THREE.Mesh(
    casingGeo,
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.95, roughness: 0.3, side: THREE.DoubleSide })
  );
  casing.position.set(-0.25, 1.18, -0.15);
  ws.add(casing);

  // Use caller-supplied monitorLight if provided (so caller can register for flicker),
  // otherwise create one internally for backwards compatibility.
  const monGlow = config.monitorLight || new THREE.PointLight(config.accentColor, 1.8, 4.0);
  monGlow.color.setHex(config.accentColor);
  monGlow.position.set(-0.25, 1.18, 0.2);
  ws.add(monGlow);

  // RGB Keyboard & Desk mat
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.005, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.7 })
  );
  pad.position.set(-0.15, 0.784, 0.22);
  ws.add(pad);

  const kbMat = new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.35 });
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.02, 0.22), kbMat);
  kb.position.set(-0.25, 0.795, 0.22);
  ws.add(kb);

  scene.add(ws);
}

// Helper to build server rack column group
function buildServerRackGroup(scene, x, z, accentColor) {
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 4.2, 3.2),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 })
  );
  shelf.position.set(x, 2.1, z);
  scene.add(shelf);

  for (let r = 0; r < 6; r++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, 2.8),
      new THREE.MeshBasicMaterial({ color: accentColor })
    );
    led.position.set(x + (x > 0 ? -0.52 : 0.52), 0.6 + r * 0.65, z);
    scene.add(led);
  }
}

// Helper for office potted greenery
function makeOfficePlant(scene, x, z) {
  const group = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.24, 0.45, 16),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.5 })
  );
  pot.position.y = 0.225;
  pot.castShadow = true;
  group.add(pot);

  const foliageColors = [0x22c55e, 0x16a34a, 0x15803d];
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: foliageColors[i % foliageColors.length], roughness: 0.6 })
    );
    const a = (i / 7) * Math.PI * 2;
    leaf.position.set(Math.cos(a) * 0.14, 0.8 + Math.random() * 0.15, Math.sin(a) * 0.14);
    leaf.rotation.z = Math.cos(a) * 0.35;
    leaf.rotation.x = Math.sin(a) * 0.35;
    leaf.castShadow = true;
    group.add(leaf);
  }
  group.position.set(x, 0, z);
  scene.add(group);
}

// Helper: wall-mounted CCTV camera prop
function buildCCTVProp(scene, x, y, z, rotY) {
  const g = new THREE.Group();
  // Bracket
  const bracket = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.18, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 })
  );
  g.add(bracket);
  // Body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.055, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
  );
  body.rotation.z = Math.PI / 2;
  body.position.set(0.12, -0.05, 0);
  g.add(body);
  // Lens
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10),
    new THREE.MeshBasicMaterial({ color: 0x2f80ed })
  );
  lens.rotation.z = Math.PI / 2;
  lens.position.set(0.24, -0.05, 0);
  g.add(lens);
  // Status LED
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.012, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xef476f })
  );
  led.position.set(0.05, 0.08, 0.06);
  g.add(led);

  g.position.set(x, y, z);
  g.rotation.y = rotY;
  scene.add(g);
}

// Helper: simple chair for satellite seating
function buildSimpleChair(scene, x, z, rotY, accentColor) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.07, 0.46),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  seat.position.y = 0.46;
  g.add(seat);
  // Accent trim on seat
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.40, 0.018, 0.40),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  trim.position.y = 0.51;
  g.add(trim);
  // Back
  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.55, 0.055),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
  );
  back.position.set(0, 0.75, 0.22);
  back.rotation.x = -0.1;
  g.add(back);
  // Leg
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, 0.36, 10),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
  );
  stem.position.y = 0.26;
  g.add(stem);
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.035, 12),
    new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9 })
  );
  base.position.y = 0.07;
  g.add(base);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
}

// Regression chart panel texture (right wall of room 2)
function createRegressionChartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 400;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0d1220"; ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = "#8b5cf6"; ctx.lineWidth = 2; ctx.strokeRect(10, 10, 620, 380);
  ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillStyle = "#8b5cf6"; ctx.fillText("REGRESSION ANALYSIS — RESIDUALS", 24, 38);

  // Draw scatter with regression line
  const pts = [];
  ctx.fillStyle = "rgba(139,92,246,0.7)";
  for (let i = 0; i < 55; i++) {
    const px = 60 + (i / 55) * 530 + (Math.random() - 0.5) * 22;
    const py = 340 - (i / 55) * 260 + (Math.random() - 0.5) * 40;
    pts.push([px, py]);
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
  // Regression line
  ctx.strokeStyle = "#ff9f43"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(60, 340); ctx.lineTo(590, 80); ctx.stroke();
  // Axes
  ctx.strokeStyle = "rgba(139,92,246,0.4)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(55, 50); ctx.lineTo(55, 360); ctx.lineTo(605, 360); ctx.stroke();
  ctx.fillStyle = "#64748b";
  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillText("PREDICTED", 250, 390); ctx.fillText("R² = 0.924", 500, 60);
  return new THREE.CanvasTexture(canvas);
}

// Caution stripe texture for room 4 floor decals
function createCautionStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  const stripeW = 32;
  for (let i = -2; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(255,159,67,0.85)" : "rgba(15,23,42,0.85)";
    ctx.save();
    ctx.translate(i * stripeW - 128, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(0, -512, stripeW, 1024);
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

// Threat-level display texture for room 4
function createThreatLevelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 300;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#080c14"; ctx.fillRect(0, 0, 512, 300);
  ctx.strokeStyle = "#ef476f"; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 496, 284);
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillStyle = "#ef476f";
  ctx.shadowColor = "#ef476f"; ctx.shadowBlur = 14;
  ctx.fillText("⚠ THREAT LEVEL: HIGH", 24, 52);
  ctx.shadowBlur = 0;
  ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#f87171";
  const lines = [
    "ANOMALY DETECTED — SECTOR 4",
    "Confidence: 97.4%  |  Class: OUTLIER",
    "Isolation Forest: TRIGGERED",
    "One-Class SVM:    TRIGGERED",
    "──────────────────────────────────",
    "ACTION: Engage containment protocol",
    "AUTH REQUIRED to unlock next sector",
  ];
  lines.forEach((l, i) => {
    ctx.fillStyle = i < 4 ? "#f87171" : (i === 4 ? "#334155" : "#ff9f43");
    ctx.fillText(l, 24, 90 + i * 26);
  });
  // Blinking alert bar
  ctx.fillStyle = "rgba(239,71,111,0.2)";
  ctx.fillRect(8, 260, 496, 24);
  ctx.fillStyle = "#ef476f";
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.fillText("● LIVE MONITORING   FPS: 60   SECTOR 4 LOCKED", 18, 277);
  return new THREE.CanvasTexture(canvas);
}

export function getDoorRegistry() {
  return doorRegistry;
}

export function getExitDoor() {
  return exitDoor;
}

// Animate the mystery core and outer ring each frame
export function updateWorldAnimations(delta) {
  const t = performance.now() * 0.001;
  if (mysteryCoreMesh) {
    mysteryCoreMesh.rotation.y += delta * 0.55;
    mysteryCoreMesh.rotation.x += delta * 0.22;
    // Gentle hover bob
    mysteryCoreMesh.position.y = 2.8 + Math.sin(t * 1.4) * 0.12;
  }
  if (mysteryOuterRing) {
    mysteryOuterRing.rotation.z += delta * 0.28;
  }
}

// Update door state (Locked = Red #EF476F, Solved/Unlocked = Green #22C55E)
export function setDoorActiveState(doorType, isActive, isUnlocked = false) {
  const entry = doorRegistry[doorType];
  if (!entry) return;

  entry.isActive = isActive;
  entry.isUnlocked = isUnlocked;
  const themeColor = doorColors[doorType] || 0x2f80ed;

  if (isUnlocked) {
    entry.glow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.leftEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.rightEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    if (entry.doorLight) entry.doorLight.color.setHex(STATUS_COLORS.unlocked);
    if (entry.screen) entry.screen.material.color.setHex(STATUS_COLORS.unlocked);
  } else if (isActive) {
    entry.glow.material.color.setHex(themeColor);
    entry.leftEdgeGlow.material.color.setHex(themeColor);
    entry.rightEdgeGlow.material.color.setHex(themeColor);
    if (entry.doorLight) {
      entry.doorLight.color.setHex(themeColor);
      entry.doorLight.intensity = 2.0;
    }
    if (entry.screen) entry.screen.material.color.setHex(themeColor);
  } else {
    // Locked State (Red #EF476F)
    entry.glow.material.color.setHex(STATUS_COLORS.locked);
    entry.leftEdgeGlow.material.color.setHex(STATUS_COLORS.locked);
    entry.rightEdgeGlow.material.color.setHex(STATUS_COLORS.locked);
    if (entry.doorLight) {
      entry.doorLight.color.setHex(STATUS_COLORS.locked);
      entry.doorLight.intensity = 1.0;
    }
    if (entry.screen) entry.screen.material.color.setHex(STATUS_COLORS.locked);
  }
}

// Audio SFX for security door release
function playDoorUnlockSFX() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const bufferSize = ctx.sampleRate * 0.45;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.45);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.45);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    whiteNoise.start();
  } catch (err) {}
}

// Bi-parting sliding door opening animation
function animateDoorLeaves(entry, duration = 900, onDone) {
  const start = performance.now();
  const leftStart = entry.leftLeaf.position.x;
  const rightStart = entry.rightLeaf.position.x;
  const leftTarget = -2.85;
  const rightTarget = 2.85;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    entry.leftLeaf.position.x = leftStart + (leftTarget - leftStart) * eased;
    entry.rightLeaf.position.x = rightStart + (rightTarget - rightStart) * eased;

    if (t < 1) {
      requestAnimationFrame(step);
    } else if (onDone) {
      onDone();
    }
  }
  requestAnimationFrame(step);
}

// Unlock door and open physical passage into next room
export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (!entry || !entry.leftLeaf) return;
  setDoorActiveState(doorType, true, true);
  animateDoorLeaves(entry, 900);
  playDoorUnlockSFX();

  // Expand player physical Z-bound so player can walk into next room
  const nextZBound = entry.zDoor + 20.8;
  setMaxZBound(nextZBound);
}

export function setExitUnlocked() {
  if (exitDoor && exitDoor.glow) {
    exitDoor.glow.material.color.setHex(STATUS_COLORS.unlocked);
    if (exitDoor.doorLight) exitDoor.doorLight.color.setHex(STATUS_COLORS.unlocked);
  }
  if (exitDoor) {
    setDoorUnlocked(BOSS_DOOR_TYPE);
  }
}

export function resetHubForNewLevel() {
  Object.values(doorRegistry).forEach((entry) => {
    if (!entry.leftLeaf) return;
    entry.leftLeaf.position.x = -0.98;
    entry.rightLeaf.position.x = 0.98;
    entry.isUnlocked = false;
    entry.isActive = false;
    setDoorActiveState(entry.doorType, false, false);
  });
  setMaxZBound(20.8);
}

// End of world module
