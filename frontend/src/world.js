// BlackVault 3D Facility - World Architecture
// Five distinct high-tech sci-fi research departments connected by heavy blast gates.
//
// Aesthetic: Bright Clean Neutral Research Facility
//   Walls:       #F2F4F7 (soft white primary) / #E8ECF1 (light warm grey secondary)
//   Floor:       #E8ECF1 (warm grey tile with subtle blue circuit inlays)
//   Trim:        #C8D0DA (light chrome trim & frames)
//   Ceiling:     #FAFBFC (off-white ceiling)
//   Furniture:   #D0D6DF (light grey hardware, monitors, workstations)
//   Accents:     #2F80ED (electric blue), #8B5CF6 (violet), #FF9F43 (amber), #22C55E (success green), #EF476F (locked/danger red)
//   Room identity: each room draws from 1-2 of the 4 non-status accents only

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
} from "./textures.js";
import { setMaxZBound } from "./player.js";
import { registerFlickerLight } from "./sceneSetup.js";

// ── Palette object ────────────────────────────────────────────────────────
// Light neutral architecture base + 4 accent colors used consistently everywhere.
const P = {
  // Architecture — light, bright, clean
  wallMain:  0xf2f4f7,   // Soft white walls
  wallAlt:   0xe8ecf1,   // Light warm grey (secondary wall / partition)
  floor:     0xe8ecf1,   // Warm grey floor tiles
  floorTrim: 0xc8d0da,   // Light chrome trim & baseboards
  ceiling:   0xfafbfc,   // Off-white ceiling
  furniture: 0xd0d6df,   // Light grey desks, props
  chrome:    0xa0aabb,   // Light chrome metal
  // Accent 1 — Electric Blue (Classification + general UI)
  blue:      0x2f80ed,
  // Accent 2 — Violet (Regression + Mystery vault)
  violet:    0x8b5cf6,
  // Accent 3 — Amber (Clustering boardroom)
  amber:     0xff9f43,
  // Status colors — reserved, not used for room identity
  green:     0x22c55e,   // Success / unlocked ONLY
  red:       0xef476f,   // Locked / danger ONLY (Anomaly wing identity)
  // Convenience alias
  cyan:      0x2f80ed,   // Alias → blue (old cyan refs become blue)
};

// Room geometry constants — expanded, grander scale!
const ROOM_W  = 30.0;   // Wide spacious facility corridors & rooms
const ROOM_H  = 6.0;    // Standard high ceiling (room 1 & 4)
const VAULT_H = 8.5;    // Room 5 grand elevated vault ceiling
const DATA_H  = 5.6;    // Room 2 data room ceiling
const CONF_H  = 4.8;    // Room 3 meeting drop ceiling

const doorRegistry = {};
let exitDoor = null;
let mysteryCoreMesh = null;
let mysteryOuterRing = null;
let mysteryInnerRing = null;

// Door glow colors mapped to room accent identities
const doorColors = {
  classification: P.blue,
  regression:     P.violet,
  clustering:     P.amber,
  anomaly:        P.red,
  mystery:        P.violet,
};

// ─────────────────────────────────────────────────────────────────────────────
export function initWorld(scene) {
  // ── Shared base materials — light neutral architecture ────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    color: P.floor,
    roughness: 0.38,
    metalness: 0.05,
  });
  const wallMat    = new THREE.MeshStandardMaterial({ color: P.wallMain, roughness: 0.55, metalness: 0.02 });
  const wallAltMat = new THREE.MeshStandardMaterial({ color: P.wallAlt,  roughness: 0.55, metalness: 0.02 });
  const ceilMat    = new THREE.MeshStandardMaterial({ color: P.ceiling,  roughness: 0.70, metalness: 0.01 });
  const trimMat    = new THREE.MeshStandardMaterial({ color: P.floorTrim,roughness: 0.25, metalness: 0.55 });

  // ── Global continuous floor (Z = −4 → 122) ───────────────────────────────
  const totalLen = 126.0;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, totalLen), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, 59.0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Sleek metallic baseboard trim along both perimeter walls
  [-ROOM_W / 2 + 0.08, ROOM_W / 2 - 0.08].forEach(tx => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.28, totalLen), trimMat);
    trim.position.set(tx, 0.14, 59.0);
    scene.add(trim);
  });

  // ── Ceiling segments per department ──────────────────────────────────────
  // Room 1 (Z: -4 → 22, H: 6.0m)
  const ceilR1 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 26.0), ceilMat);
  ceilR1.rotation.x = Math.PI / 2;
  ceilR1.position.set(0, ROOM_H, 9.0);
  scene.add(ceilR1);

  // Room 2 (Z: 22 → 44, H: 5.6m)
  const ceilR2 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 22.0), ceilMat);
  ceilR2.rotation.x = Math.PI / 2;
  ceilR2.position.set(0, DATA_H, 33.0);
  scene.add(ceilR2);

  // Room 3 (Z: 44 → 66, H: 6.0m)
  const ceilR3 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 22.0), ceilMat);
  ceilR3.rotation.x = Math.PI / 2;
  ceilR3.position.set(0, ROOM_H, 55.0);
  scene.add(ceilR3);

  // Room 4 (Z: 66 → 88, H: 6.0m)
  const ceilR4 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 22.0), ceilMat);
  ceilR4.rotation.x = Math.PI / 2;
  ceilR4.position.set(0, ROOM_H, 77.0);
  scene.add(ceilR4);

  // Room 5 (Z: 88 → 122, H: 8.5m grand vault ceiling)
  const ceilR5 = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 34.0), ceilMat);
  ceilR5.rotation.x = Math.PI / 2;
  ceilR5.position.set(0, VAULT_H, 105.0);
  scene.add(ceilR5);

  // Step wall: fills the height gap (6.0m → 8.5m) at vault entry Z=88
  const transWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, VAULT_H - ROOM_H), wallAltMat
  );
  transWall.position.set(0, ROOM_H + (VAULT_H - ROOM_H) / 2, 88.0);
  scene.add(transWall);

  // ── Outer perimeter walls ────────────────────────────────────────────────
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLen, ROOM_H), wallMat);
  leftWall.position.set(-ROOM_W / 2, ROOM_H / 2, 59.0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(totalLen, ROOM_H), wallMat);
  rightWall.position.set(ROOM_W / 2, ROOM_H / 2, 59.0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Elevated side walls for Room 5 Vault (Y: 6.0m → 8.5m)
  [[-ROOM_W / 2, Math.PI / 2], [ROOM_W / 2, -Math.PI / 2]].forEach(([wx, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(34.0, VAULT_H - ROOM_H), wallAltMat);
    w.position.set(wx, ROOM_H + (VAULT_H - ROOM_H) / 2, 105.0);
    w.rotation.y = ry;
    scene.add(w);
  });

  // South entry wall + city skyline backdrop window
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

  // ── 5 Distinct Department Rooms ──────────────────────────────────────────
  buildRoom1Workspace(scene);
  buildRoom2ServerRoom(scene);
  buildRoom3MeetingRoom(scene);
  buildRoom4ControlCentre(scene);
  buildRoom5ExecutiveVault(scene);

  // ── High-Tech Blast Door Stations ────────────────────────────────────────
  createDoorStation(scene, "classification", 0, 22.0,  ROOM_H);
  createDoorStation(scene, "regression",     0, 44.0,  DATA_H);
  createDoorStation(scene, "clustering",     0, 66.0,  ROOM_H);
  createDoorStation(scene, "anomaly",        0, 88.0,  ROOM_H);
  createDoorStation(scene, "mystery",        0, 118.0, VAULT_H);

  setMaxZBound(20.8);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM 1 — CLASSIFICATION LAB: Electric Blue AI Development Studio
// Identity: Electric Blue (#2F80ED) — clean bright tech workspace
// ─────────────────────────────────────────────────────────────────────────────
function buildRoom1Workspace(scene) {
  const Z0 = -4, Z1 = 22, ZMid = 9.0;
  const accent = P.blue;  // Room 1 leans exclusively on electric blue
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });

  signPanel(scene, "CLASSIFICATION LAB", "#2F80ED", "#2F80ED", 0, ROOM_H - 0.75, 0.8, 6.8);

  // Ceiling light strips + floor guide lines in electric blue
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  // Mid-room accent strips along ceiling centre for more depth
  ceilStrip(scene, -4.0, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  4.0, Z0, Z1, accentMat, ROOM_H);

  // Room ambient blue point light
  const rl = new THREE.PointLight(accent, 0.9, 38);
  rl.position.set(0, ROOM_H - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 0.9);

  // Structural columns flanking workspace with glowing blue light rings
  buildStructuralColumn(scene, -8.5, ZMid, ROOM_H, accent);
  buildStructuralColumn(scene,  8.5, ZMid, ROOM_H, accent);

  // ── Collaborative desk cluster: back-to-back pair ────────────────────────
  const mA = new THREE.PointLight(accent, 2.2, 5);
  buildWorkstationDesk(scene, {
    x: -6.5, z: 5.5, rotY: 0, accentColor: accent,
    screenTexture: createLeftUltrawideScreenTexture(), monitorLight: mA,
  });
  registerFlickerLight(mA, 2.2);

  const mB = new THREE.PointLight(accent, 2.2, 5);
  buildWorkstationDesk(scene, {
    x: -6.5, z: 10.5, rotY: Math.PI, accentColor: accent,
    screenTexture: createRightUltrawideScreenTexture(), monitorLight: mB,
  });
  registerFlickerLight(mB, 2.2);

  // ── Angled workstation on right ──────────────────────────────────────────
  const mC = new THREE.PointLight(accent, 2.2, 5);
  buildWorkstationDesk(scene, {
    x: 6.5, z: 8.0, rotY: -0.28, accentColor: accent,
    screenTexture: createLeftUltrawideScreenTexture(), monitorLight: mC,
  });
  registerFlickerLight(mC, 2.2);

  // ── Whiteboard on left wall with glowing blue frame ──────────────────────
  const wb = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 3.2),
    new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() })
  );
  wb.position.set(-ROOM_W / 2 + 0.08, 2.8, 9.0);
  wb.rotation.y = Math.PI / 2;
  scene.add(wb);

  const wbBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 7.2), accentMat);
  wbBar.position.set(-ROOM_W / 2 + 0.04, 2.8, 9.0);
  scene.add(wbBar);

  // Blue accent wall panel — makes right wall feel designed
  const accentPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(8.0, ROOM_H),
    new THREE.MeshStandardMaterial({ color: 0xe4edf9, roughness: 0.6, metalness: 0.02 })
  );
  accentPanel.position.set(ROOM_W / 2 - 0.06, ROOM_H / 2, ZMid - 2.0);
  accentPanel.rotation.y = -Math.PI / 2;
  scene.add(accentPanel);

  // Thin blue border trim on the accent panel
  const panelBorder = new THREE.Mesh(new THREE.BoxGeometry(0.06, ROOM_H + 0.04, 8.08), accentMat);
  panelBorder.position.set(ROOM_W / 2 - 0.03, ROOM_H / 2, ZMid - 2.0);
  scene.add(panelBorder);

  // ── Glass-enclosed server alcove in back-right ────────────────────────────
  buildServerRackGroup(scene, ROOM_W / 2 - 1.2, 16.5, accent);

  const frostedGlass = new THREE.MeshPhysicalMaterial({
    color: 0x2f80ed, transparent: true, opacity: 0.18,
    roughness: 0.05, transmission: 0.8,
  });
  const gFront = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 4.0), frostedGlass);
  gFront.position.set(6.5, 2.0, 13.0);
  scene.add(gFront);

  const gSide = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 4.0), frostedGlass);
  gSide.position.set(10.5, 2.0, 15.5);
  gSide.rotation.y = Math.PI / 2;
  scene.add(gSide);

  // ── Storage credenzas & Office Plants ────────────────────────────────────
  buildStorageUnit(scene, -ROOM_W / 2 + 0.4, 14.0);
  buildStorageUnit(scene, -ROOM_W / 2 + 0.4, 17.5);
  makeOfficePlant(scene,  ROOM_W / 2 - 2.5, 2.5);
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, 3.0);
  buildCCTVProp(scene,  ROOM_W / 2 - 0.6, ROOM_H - 0.2, 2.5,  Math.PI * 1.18);
  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, 17.0, 0.05);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM 2 — REGRESSION LAB: Violet + Blue Server Wing
// Identity: Violet (#8B5CF6) primary, Blue (#2F80ED) secondary on opposing racks
// ─────────────────────────────────────────────────────────────────────────────
function buildRoom2ServerRoom(scene) {
  const Z0 = 22, Z1 = 44, ZMid = 33.0;
  const accent = P.violet;  // Violet primary
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });
  const h = DATA_H;

  signPanel(scene, "REGRESSION LAB", "#8B5CF6", "#8B5CF6", 0, h - 0.75, Z0 + 1.5, 6.0);

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, h);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, h);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  const rl = new THREE.PointLight(accent, 1.25, 34);
  rl.position.set(0, h - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 1.25);

  // ── Dense server rack arrays on BOTH walls — violet left, blue right ─────
  [Z0 + 4.0, Z0 + 10.5, Z0 + 17.0].forEach(rz => {
    buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, rz, accent);  // violet
    buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, rz, P.blue); // blue secondary
  });

  // Violet accent wall panel on left — room identity marker
  const vPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(10.0, h),
    new THREE.MeshStandardMaterial({ color: 0xf0ecff, roughness: 0.55, metalness: 0.01 })
  );
  vPanel.position.set(-ROOM_W / 2 + 0.06, h / 2, ZMid);
  vPanel.rotation.y = Math.PI / 2;
  scene.add(vPanel);
  const vBorder = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.04, 10.08), accentMat);
  vBorder.position.set(-ROOM_W / 2 + 0.03, h / 2, ZMid);
  scene.add(vBorder);

  // ── Overhead industrial cable tray with glowing Violet LED ────────────────
  const cabMat = new THREE.MeshStandardMaterial({ color: P.floorTrim, metalness: 0.85, roughness: 0.2 });
  const cableTray = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 8.0, 0.18, Z1 - Z0), cabMat);
  cableTray.position.set(0, h - 0.35, ZMid);
  scene.add(cableTray);

  const trayLED = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W - 8.8, 0.08, Z1 - Z0 - 1.0),
    accentMat
  );
  trayLED.position.set(0, h - 0.45, ZMid);
  scene.add(trayLED);

  // Pendant cone lights along aisle
  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9 });
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
    const pl = new THREE.PointLight(accent, 1.5, 6.5);
    pl.position.set(0, h - 1.55, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.5);
  });

  // ── Solo telemetry analyst workstation in central aisle ───────────────────
  const mMon = new THREE.PointLight(accent, 2.2, 5);
  buildWorkstationDesk(scene, {
    x: 0, z: ZMid - 1.5, rotY: 0, accentColor: accent,
    screenTexture: createRightUltrawideScreenTexture(), monitorLight: mMon,
  });
  registerFlickerLight(mMon, 2.2);

  // ── Regression diagnostic chart on right wall ─────────────────────────────
  const chartMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 3.2),
    new THREE.MeshBasicMaterial({ map: createRegressionChartTexture() })
  );
  chartMesh.position.set(ROOM_W / 2 - 0.08, 2.8, Z0 + 9.5);
  chartMesh.rotation.y = -Math.PI / 2;
  scene.add(chartMesh);

  // Angled violet spotlight
  const spot = new THREE.SpotLight(accent, 4.0, 18, Math.PI / 7.0, 0.45);
  spot.position.set(-7.5, h - 0.4, ZMid - 3.5);
  spot.target.position.set(0, 0, ZMid);
  scene.add(spot, spot.target);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM 3 — CLUSTERING HUB: Amber Executive Briefing Boardroom
// Identity: Amber (#FF9F43) exclusively — warm, decisive, high-stakes meeting room
// ─────────────────────────────────────────────────────────────────────────────
function buildRoom3MeetingRoom(scene) {
  const Z0 = 44, Z1 = 66, ZMid = 55.0;
  const accent = P.amber;  // Amber exclusively
  const accentMat = new THREE.MeshBasicMaterial({ color: accent });

  signPanel(scene, "CLUSTERING HUB", "#FF9F43", "#FF9F43", 0, ROOM_H - 0.75, Z0 + 1.5, 6.0);

  // Architectural Drop Ceiling over conference table — warm tinted to echo amber identity
  const dropMat = new THREE.MeshStandardMaterial({ color: 0xf5ede0, roughness: 0.5 });
  const dropCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 6.0, Z1 - Z0 - 4.0), dropMat);
  dropCeil.rotation.x = Math.PI / 2;
  dropCeil.position.set(0, CONF_H, ZMid);
  scene.add(dropCeil);

  // Amber feature wall at the far end (presentation wall)
  const ambWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_H),
    new THREE.MeshStandardMaterial({ color: 0xfff3e8, roughness: 0.6, metalness: 0.01 })
  );
  ambWall.position.set(0, ROOM_H / 2, Z1 - 0.06);
  scene.add(ambWall);
  const ambBorder = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + 0.04, 0.06, 0.08), accentMat);
  ambBorder.position.set(0, ROOM_H - 0.03, Z1 - 0.04);
  scene.add(ambBorder);

  // Perimeter cornice molding
  const cornMat = new THREE.MeshStandardMaterial({ color: P.floorTrim, roughness: 0.3, metalness: 0.8 });
  [[-ROOM_W / 2 + 3.0, 0], [ROOM_W / 2 - 3.0, 0], [0, -(Z1 - Z0 - 4.0) / 2], [0, (Z1 - Z0 - 4.0) / 2]]
    .forEach(([ox, oz], i) => {
      const isLong = i < 2;
      const cornGeo = isLong
        ? new THREE.BoxGeometry(0.14, 0.32, Z1 - Z0 - 4.0)
        : new THREE.BoxGeometry(ROOM_W - 6.14, 0.32, 0.14);
      const corn = new THREE.Mesh(cornGeo, cornMat);
      corn.position.set(ox, CONF_H - 0.16, ZMid + oz);
      scene.add(corn);
    });

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, accentMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, accentMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z0, Z1, accentMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z0, Z1, accentMat);

  // ── Executive 14m Conference Table with Amber Glow Inlay ─────────────────
  const tableLen = 14.0;
  const tableMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.2, metalness: 0.5 });
  const confTable = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.09, tableLen), tableMat);
  confTable.position.set(0, 0.78, ZMid);
  confTable.castShadow = true;
  scene.add(confTable);

  const tableEdge = new THREE.Mesh(new THREE.BoxGeometry(2.82, 0.03, tableLen + 0.02), accentMat);
  tableEdge.position.set(0, 0.83, ZMid);
  scene.add(tableEdge);

  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.92 });
  [[-1.2, ZMid - 6.0], [1.2, ZMid - 6.0], [-1.2, ZMid + 6.0], [1.2, ZMid + 6.0]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), chromeMat);
    leg.position.set(lx, 0.39, lz);
    scene.add(leg);
  });

  // ── 6 Cantilever Chairs with Amber Trim ───────────────────────────────────
  [
    { x: -3.0, z: ZMid - 5.0, ry: Math.PI / 2 },
    { x: -3.0, z: ZMid,       ry: Math.PI / 2 },
    { x: -3.0, z: ZMid + 5.0, ry: Math.PI / 2 },
    { x:  3.0, z: ZMid - 5.0, ry: -Math.PI / 2 },
    { x:  3.0, z: ZMid,       ry: -Math.PI / 2 },
    { x:  3.0, z: ZMid + 5.0, ry: -Math.PI / 2 },
  ].forEach(({ x, z, ry }) => buildSimpleChair(scene, x, z, ry, accent));

  // ── 3 Suspended Pendant Cone Lights ──────────────────────────────────────
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
    const pl = new THREE.PointLight(accent, 1.8, 6.5);
    pl.position.set(0, ROOM_H - 1.95, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.8);
  });

  // ── Cluster Presentation Screen ──────────────────────────────────────────
  const presScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 3.8),
    new THREE.MeshBasicMaterial({ map: createClusterTexture() })
  );
  presScreen.position.set(0, 2.7, Z1 - 2.5);
  scene.add(presScreen);

  const scrLight = new THREE.PointLight(accent, 1.8, 11);
  scrLight.position.set(0, 2.7, Z1 - 3.5);
  scene.add(scrLight);
  registerFlickerLight(scrLight, 1.8);

  // ── Coffee Bar & Plants ──────────────────────────────────────────────────
  buildCoffeeStation(scene, ROOM_W / 2 - 2.5, Z0 + 4.0);
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, Z0 + 3.0);
  makeOfficePlant(scene,  ROOM_W / 2 - 2.5, Z0 + 19.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM 4 — ANOMALY WING: Red + Blue Security Operations Command
// Identity: Danger Red (#EF476F) + Electric Blue (#2F80ED) — SOC dual-tone tension
// ─────────────────────────────────────────────────────────────────────────────
function buildRoom4ControlCentre(scene) {
  const Z0 = 66, Z1 = 88, ZMid = 77.0;
  const red = P.red, blue = P.blue;

  signPanel(scene, "ANOMALY WING", "#EF476F", "#EF476F", 0, ROOM_H - 0.75, Z0 + 1.5, 5.5);

  // Red feature wall on left half — creates danger zone feel
  const redPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W / 2 - 1.0, ROOM_H),
    new THREE.MeshStandardMaterial({ color: 0xfff0f2, roughness: 0.55, metalness: 0.01 })
  );
  redPanel.position.set(-ROOM_W / 4 - 0.5, ROOM_H / 2, Z0 + 0.06);
  scene.add(redPanel);
  const redBorder = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W / 2 - 0.96, 0.06, 0.08), new THREE.MeshBasicMaterial({ color: red }));
  redBorder.position.set(-ROOM_W / 4 - 0.5, ROOM_H - 0.03, Z0 + 0.04);
  scene.add(redBorder);

  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z0, Z1, new THREE.MeshBasicMaterial({ color: blue }), ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z0, Z1, new THREE.MeshBasicMaterial({ color: red }),  ROOM_H);

  const dl1 = new THREE.PointLight(blue, 1.8, 26);
  dl1.position.set(-6.0, ROOM_H - 0.8, ZMid);
  scene.add(dl1); registerFlickerLight(dl1, 1.8);

  const dl2 = new THREE.PointLight(red, 1.8, 26);
  dl2.position.set( 6.0, ROOM_H - 0.8, ZMid);
  scene.add(dl2); registerFlickerLight(dl2, 1.8);

  // ── Security Command Arc (3 Desks) ───────────────────────────────────────
  [
    { x: -6.5, z: Z0 + 9.5, rotY:  0.35, col: blue },
    { x:  0.0, z: Z0 + 7.5, rotY:  0.0,  col: blue },
    { x:  6.5, z: Z0 + 9.5, rotY: -0.35, col: red },
  ].forEach(({ x, z, rotY, col }) => {
    const ml = new THREE.PointLight(col, 2.2, 5);
    buildWorkstationDesk(scene, {
      x, z, rotY, accentColor: col,
      screenTexture: createLeftUltrawideScreenTexture(),
      monitorLight: ml,
    });
    registerFlickerLight(ml, 2.2);
  });

  // ── Break / Lounge Zone on side ──────────────────────────────────────────
  buildLoungeArea(scene, -ROOM_W / 2 + 4.5, Z0 + 5.0);

  // ── Massive Threat-Level Screen Matrix ────────────────────────────────────
  const threatMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(13.0, 4.0),
    new THREE.MeshBasicMaterial({ map: createThreatLevelTexture() })
  );
  threatMesh.position.set(0, 2.8, Z1 - 2.2);
  scene.add(threatMesh);

  const twLight = new THREE.PointLight(STATUS_COLORS.locked, 2.0, 14);
  twLight.position.set(0, 2.8, Z1 - 3.5);
  scene.add(twLight);
  registerFlickerLight(twLight, 2.0);

  // Server banks — alternating red/blue for the dual-tone SOC identity
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 16.5, blue);
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 10.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 16.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 10.5, blue);

  // Hazard floor caution stripes
  const cautionMat = new THREE.MeshBasicMaterial({
    map: createCautionStripeTexture(), transparent: true, opacity: 0.85,
  });
  [[-ROOM_W / 2 + 3.2, ZMid + 1.5], [ROOM_W / 2 - 3.2, ZMid + 1.5]].forEach(([cx, cz]) => {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 10.0), cautionMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(cx, 0.004, cz);
    scene.add(d);
  });

  buildCCTVProp(scene, 0, ROOM_H - 0.2, Z0 + 2.5, 0);
  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, Z0 + 15.0, 0.38);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM 5 — CORE VAULT: Grand Multi-Tier Floating Quantum Neural Core
// Identity: Violet (#8B5CF6) + Blue (#2F80ED) — most dramatic, most distinct
// ─────────────────────────────────────────────────────────────────────────────
function buildRoom5ExecutiveVault(scene) {
  const Z0 = 88, Z1 = 120, ZCore = 104.0;
  const vH = VAULT_H;

  signPanel(scene, "CORE VAULT", "#8B5CF6", "#2F80ED", 0, vH - 0.95, Z0 + 2.5, 6.5);

  // Dramatic dark accent wall at vault entry — the one room that breaks the rule slightly
  // The wall transitions from the corridor's white to a deep violet-tinted panel, signalling
  // the climax space. This keeps consistent material language while creating drama.
  const vaultEntryPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, vH),
    new THREE.MeshStandardMaterial({ color: 0xede8ff, roughness: 0.5, metalness: 0.02 })
  );
  vaultEntryPanel.position.set(0, vH / 2, Z0 + 0.08);
  scene.add(vaultEntryPanel);
  const vBorder = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W + 0.04, 0.06, 0.1), new THREE.MeshBasicMaterial({ color: P.violet }));
  vBorder.position.set(0, vH - 0.03, Z0 + 0.06);
  scene.add(vBorder);

  // Grand entrance columns flanking entry
  const colMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.92, roughness: 0.15 });
  [[-6.0, Z0 + 3.5], [6.0, Z0 + 3.5]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, vH, 16), colMat);
    col.position.set(cx, vH / 2, cz);
    scene.add(col);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.06, 8, 16),
      new THREE.MeshBasicMaterial({ color: P.violet })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, 0.06, cz);
    scene.add(ring);

    const bl = new THREE.PointLight(P.violet, 1.8, 7.0);
    bl.position.set(cx, 0.5, cz);
    scene.add(bl);
    registerFlickerLight(bl, 1.8);
  });

  // Ceiling dome ring + spinning outer halo ring + inner ring
  const domeRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.0, 0.14, 16, 48),
    new THREE.MeshBasicMaterial({ color: P.violet })
  );
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, vH - 0.6, ZCore);
  scene.add(domeRing);

  mysteryOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.08, 12, 64),
    new THREE.MeshBasicMaterial({ color: P.cyan })
  );
  mysteryOuterRing.rotation.x = Math.PI / 3;
  mysteryOuterRing.position.set(0, vH - 1.4, ZCore);
  scene.add(mysteryOuterRing);

  mysteryInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.06, 12, 48),
    new THREE.MeshBasicMaterial({ color: P.green })
  );
  mysteryInnerRing.rotation.x = -Math.PI / 4;
  mysteryInnerRing.position.set(0, 3.2, ZCore);
  scene.add(mysteryInnerRing);

  // Vault ambient lights — Violet + Blue, no green/amber (those are other rooms' identities)
  const p1 = new THREE.PointLight(P.blue,   2.8, 32); p1.position.set(-8, 5.5, Z0 + 10); scene.add(p1); registerFlickerLight(p1, 2.8);
  const p2 = new THREE.PointLight(P.violet, 2.8, 32); p2.position.set( 8, 5.5, Z0 + 10); scene.add(p2); registerFlickerLight(p2, 2.8);
  const p3 = new THREE.PointLight(P.violet, 2.8, 32); p3.position.set( 0, 6.2, Z0 + 24); scene.add(p3); registerFlickerLight(p3, 2.8);

  // Central octagonal pedestal
  const pedMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9, roughness: 0.15 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.42, 8), pedMat);
  ped.position.set(0, 0.21, ZCore);
  scene.add(ped);

  const pedRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.3, 0.065, 16, 32),
    new THREE.MeshBasicMaterial({ color: P.violet })
  );
  pedRing.rotation.x = Math.PI / 2;
  pedRing.position.set(0, 0.42, ZCore);
  scene.add(pedRing);

  // Pedestal glow light (violet)
  const pedLight = new THREE.PointLight(P.violet, 2.0, 10);
  pedLight.position.set(0, 0.5, ZCore);
  scene.add(pedLight);
  registerFlickerLight(pedLight, 2.0);

  // Holographic floating mystery core (Double-nested icosahedron + glowing nucleus)
  mysteryCoreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 2),
    new THREE.MeshStandardMaterial({ color: P.violet, emissive: P.violet, emissiveIntensity: 2.0, wireframe: true })
  );
  mysteryCoreMesh.position.set(0, 3.2, ZCore);
  scene.add(mysteryCoreMesh);

  // Inner nucleus glows blue — violet outer + blue inner = the climax identity
  mysteryCoreMesh.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshStandardMaterial({ color: P.blue, emissive: P.blue, emissiveIntensity: 1.8 })
  ));

  // 4 Flanking Energy Containment Pillars — violet/blue only (room identity)
  [
    { x: -4.2, z: ZCore - 4.2 }, { x: 4.2, z: ZCore - 4.2 },
    { x: -4.2, z: ZCore + 4.2 }, { x: 4.2, z: ZCore + 4.2 },
  ].forEach(({ x, z }, i) => {
    // Alternating violet/blue — no amber or red (those are other rooms)
    const col = i % 2 === 0 ? P.violet : P.blue;
    const pillarMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.18 });
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 7.8, 16),
      pillarMat
    );
    pillar.position.set(x, 3.9, z);
    pillar.castShadow = true;
    scene.add(pillar);

    // Mid-height accent ring
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.05, 8, 16),
      new THREE.MeshBasicMaterial({ color: col })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 4.0, z);  // Ring at mid-pillar height
    scene.add(ring);

    // Base ring
    const baseRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.35, 0.05, 8, 16),
      new THREE.MeshBasicMaterial({ color: col })
    );
    baseRing.rotation.x = Math.PI / 2;
    baseRing.position.set(x, 0.06, z);
    scene.add(baseRing);

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

    // Top pillar glow
    const topLight = new THREE.PointLight(col, 1.5, 5.0);
    topLight.position.set(x, 7.5, z);
    scene.add(topLight);
    registerFlickerLight(topLight, 1.5);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COOL SCI-FI BLAST DOOR STATION: Heavy Armored Gate + Laser Barrier + Biometrics
// ─────────────────────────────────────────────────────────────────────────────
function createDoorStation(scene, doorType, x, z, wallH) {
  const color = doorColors[doorType] || P.cyan;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const DOOR_OPENING_W = 4.8;
  const DOOR_HALF = DOOR_OPENING_W / 2; // = 2.4m
  const panelW = ROOM_W / 2 - DOOR_HALF; // = 12.6m each side

  const wallPanelMat = new THREE.MeshStandardMaterial({
    color: P.wallMain, roughness: 0.45, metalness: 0.1,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: P.floorTrim, metalness: 0.92, roughness: 0.22,
  });
  const skirtMat = new THREE.MeshStandardMaterial({
    color: P.floorTrim, metalness: 0.85, roughness: 0.3,
  });

  // ── Solid Left & Right Flanking Bulkhead Walls ───────────────────────────
  [-1, 1].forEach(side => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelW, wallH, 0.55), wallPanelMat
    );
    panel.position.set(side * (DOOR_HALF + panelW / 2), wallH / 2, 0);
    group.add(panel);

    // Dark titanium skirting baseboard
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(panelW, 0.32, 0.58), skirtMat);
    skirt.position.set(side * (DOOR_HALF + panelW / 2), 0.16, 0);
    group.add(skirt);
  });

  // Top continuous cornice
  const fullCornice = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.22, 0.60), skirtMat);
  fullCornice.position.set(0, wallH - 0.11, 0);
  group.add(fullCornice);

  // ── Heavy Futuristic Door Portal Archway ─────────────────────────────────
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  leftPost.position.set(-2.58, 2.3, 0);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  rightPost.position.set(2.58, 2.3, 0);
  group.add(rightPost);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.52, 0.38, 0.65), frameMat);
  topBeam.position.set(0, 4.41, 0);
  group.add(topBeam);

  // Hydraulic actuator pistons on top of door frame
  [-1.6, 1.6].forEach(px => {
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95 })
    );
    piston.position.set(px, 4.75, 0);
    group.add(piston);
  });

  // Solid header wall panel above door frame to ceiling
  const headerH = wallH - 4.6;
  if (headerH > 0) {
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_OPENING_W + 0.72, headerH, 0.55),
      wallPanelMat
    );
    header.position.set(0, 4.6 + headerH / 2, 0);
    group.add(header);
  }

  // Glowing vertical LED light bars flanking door frame
  const pillarMat = new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 0.9, roughness: 0.2,
  });
  [-2.78, 2.78].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.6, 0.68), pillarMat);
    pillar.position.set(px, 2.3, 0.02);
    group.add(pillar);
  });

  // ── Bi-Parting Segmented Blast Door Leaves ────────────────────────────────
  const doorMat = new THREE.MeshStandardMaterial({
    color: P.furniture, metalness: 0.92, roughness: 0.18,
  });
  const seamGlowMat = new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked });

  // Each leaf is 2.65m wide (total 5.3m coverage for 4.8m opening -> 0.5m overlap)
  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.65, 4.3, 0.28), doorMat);
  leftLeaf.position.set(-1.25, 2.15, 0);
  group.add(leftLeaf);

  // Decorative armored panels on left door leaf
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

  // Top Status Bar Glow (Cyber Red -> Emerald Green)
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.16, 0.32),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  glow.position.y = 4.41;
  group.add(glow);

  const doorLight = new THREE.PointLight(STATUS_COLORS.locked, 2.2, 12);
  doorLight.position.set(0, 4.3, 1.1);
  group.add(doorLight);

  // ── High-Tech Holographic Terminal Pedestal ──────────────────────────────
  const termMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9 });
  const pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.65), termMat);
  pedestal.position.set(2.6, 0.6, -1.35);
  group.add(pedestal);

  // Pedestal glowing cyan accent ring
  const termRing = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.05, 0.69),
    new THREE.MeshBasicMaterial({ color })
  );
  termRing.position.set(2.6, 1.05, -1.35);
  group.add(termRing);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.72, 0.5),
    new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked })
  );
  screen.position.set(2.6, 1.18, -1.02);
  screen.rotation.x = -0.38;
  group.add(screen);

  const termLight = new THREE.PointLight(color, 1.5, 4.5);
  termLight.position.set(2.6, 1.22, -0.9);
  group.add(termLight);

  // ── Terminal Ergonomic Sci-Fi Chair ──────────────────────────────────────
  const chairGroup = new THREE.Group();
  chairGroup.position.set(2.6, 0, -0.42);

  const cMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.45 });
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.08, 0.6), cMat);
  cSeat.position.y = 0.48;
  chairGroup.add(cSeat);

  const cAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.02, 0.5),
    new THREE.MeshBasicMaterial({ color })
  );
  cAccent.position.set(0, 0.525, 0);
  chairGroup.add(cAccent);

  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.06), cMat);
  cBack.position.set(0, 0.85, 0.26); cBack.rotation.x = -0.12;
  chairGroup.add(cBack);

  const cBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.35, 0.04, 12),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9 })
  );
  cBase.position.y = 0.08;
  chairGroup.add(cBase);

  const cStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.36, 12),
    new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95 })
  );
  cStem.position.y = 0.26;
  chairGroup.add(cStem);

  group.add(chairGroup);
  scene.add(group);

  group.updateMatrixWorld(true);
  const seatPosition = new THREE.Vector3(2.6, 1.18, -0.42).applyMatrix4(group.matrixWorld);
  const seatLookAt   = new THREE.Vector3(2.6, 1.18, -1.02).applyMatrix4(group.matrixWorld);

  doorRegistry[doorType] = {
    position: new THREE.Vector3(x + 2.6, 1.5, z - 1.35),
    group, leftLeaf, rightLeaf, leftEdgeGlow, rightEdgeGlow,
    glow, doorLight, termLight, screen, chairGroup,
    doorType, seatPosition, seatLookAt,
    zDoor: z, isUnlocked: false, isActive: false,
  };

  if (doorType === BOSS_DOOR_TYPE) {
    exitDoor = doorRegistry[doorType];
  }
}

// ── Architectural & Prop Helpers ──────────────────────────────────────────

/** Structural architectural column with glowing sci-fi light ring */
function buildStructuralColumn(scene, x, z, h, accentColor) {
  const colMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9, roughness: 0.2 });
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.7, h, 0.7), colMat);
  col.position.set(x, h / 2, z);
  scene.add(col);

  // Base collar
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.3, 0.85), new THREE.MeshStandardMaterial({ color: P.floorTrim }));
  base.position.set(x, 0.15, z);
  scene.add(base);

  // Accent neon band
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.76), new THREE.MeshBasicMaterial({ color: accentColor }));
  band.position.set(x, 1.3, z);
  scene.add(band);
}

/** Break / Lounge seating area */
function buildLoungeArea(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const seatMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.6 });
  const trimMat = new THREE.MeshBasicMaterial({ color: P.cyan });

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

/** Ceiling emissive strip running from z0 → z1 */
function ceilStrip(scene, x, z0, z1, mat, h) {
  const len = z1 - z0;
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), mat);
  s.position.set(x, h - 0.1, (z0 + z1) / 2);
  scene.add(s);
}

/** Floor-level accent guide line */
function floorStrip(scene, x, z0, z1, mat) {
  const len = z1 - z0;
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), mat);
  s.position.set(x, 0.04, (z0 + z1) / 2);
  scene.add(s);
}

/** Neon department header sign */
function signPanel(scene, text, mainCol, glowCol, x, y, z, w = 6.0) {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, 0.95),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture(text, mainCol, glowCol) })
  );
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

/** Storage credenza against wall */
function buildStorageUnit(scene, x, z) {
  const w = 2.8;
  const mat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35, metalness: 0.35 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(w, 1.9, 0.6), mat);
  const side = x < 0 ? 1 : -1;
  cab.position.set(x + side * (w / 2 - 0.1), 0.95, z);
  scene.add(cab);

  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95 });
  const handle = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.04, 0.04), chromeMat);
  handle.position.set(x + side * (w / 2 - 0.1), 0.95, z + side * (-0.32));
  scene.add(handle);
}

/** Refreshment & Coffee station */
function buildCoffeeStation(scene, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35, metalness: 0.4 });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.75), mat);
  counter.position.set(x, 0.9, z);
  scene.add(counter);

  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95 });
  [[-0.75, 0.3], [0.75, 0.3], [-0.75, -0.3], [0.75, -0.3]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.9, 0.06), chromeMat);
    leg.position.set(x + lx, 0.45, z + lz);
    scene.add(leg);
  });

  const machine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.36), mat);
  machine.position.set(x - 0.55, 1.15, z);
  scene.add(machine);

  const mug = new THREE.Mesh(
    new THREE.CylinderGeometry(0.048, 0.04, 0.1, 10),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.5 })
  );
  mug.position.set(x + 0.25, 0.99, z - 0.12);
  scene.add(mug);
}

/** Premium workstation desk with curved ultrawide display */
function buildWorkstationDesk(scene, config) {
  const ws = new THREE.Group();
  ws.position.set(config.x, 0, config.z);
  ws.rotation.y = config.rotY;

  const deskMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.25, metalness: 0.4 });
  const legMat  = new THREE.MeshStandardMaterial({ color: P.chrome,    metalness: 0.92, roughness: 0.2 });

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
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
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
}

/** Office plant prop */
function makeOfficePlant(scene, x, z) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.26, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.4 })
  );
  pot.position.y = 0.25;
  pot.castShadow = true;
  g.add(pot);

  const foliage = [0x10b981, 0x059669, 0x047857];
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

/** CCTV surveillance camera prop */
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
    new THREE.MeshBasicMaterial({ color: P.cyan })
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

/** Satellite chair with room accent trim */
function buildSimpleChair(scene, x, z, rotY, accentColor) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.5 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.5), mat);
  seat.position.y = 0.48; g.add(seat);

  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(0.44, 0.02, 0.44),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  trim.position.y = 0.53; g.add(trim);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.6, 0.06), mat);
  back.position.set(0, 0.8, 0.24); back.rotation.x = -0.1; g.add(back);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 10), chromeMat);
  stem.position.y = 0.27; g.add(stem);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 12), chromeMat);
  base.position.y = 0.08; g.add(base);

  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  scene.add(g);
}

// ── Canvas Texture Generators ──────────────────────────────────────────────

function createRegressionChartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640; canvas.height = 400;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0c101d"; ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 2.5; ctx.strokeRect(10, 10, 620, 380);
  ctx.fillStyle = "#a855f7"; ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillText("REGRESSION ANALYSIS — RESIDUALS", 24, 40);

  ctx.fillStyle = "rgba(168, 85, 247, 0.75)";
  for (let i = 0; i < 58; i++) {
    const px = 60 + (i / 58) * 530 + (Math.random() - 0.5) * 24;
    const py = 340 - (i / 58) * 264 + (Math.random() - 0.5) * 42;
    ctx.beginPath(); ctx.arc(px, py, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  // Trend line in Electric Cyan
  ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 2.8;
  ctx.beginPath(); ctx.moveTo(60, 340); ctx.lineTo(590, 76); ctx.stroke();

  ctx.strokeStyle = "rgba(168, 85, 247, 0.35)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(55, 50); ctx.lineTo(55, 360); ctx.lineTo(608, 360); ctx.stroke();
  ctx.fillStyle = "#94a3b8"; ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillText("PREDICTED", 255, 390);
  ctx.fillStyle = "#10b981";
  ctx.fillText("R² = 0.942 [OPTIMAL]", 450, 62);
  return new THREE.CanvasTexture(canvas);
}

function createClusterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 800; canvas.height = 480;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0c101d"; ctx.fillRect(0, 0, 800, 480);
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2.5; ctx.strokeRect(10, 10, 780, 460);
  ctx.fillStyle = "#f59e0b"; ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillText("K-MEANS CLUSTER ANALYSIS", 24, 50);

  const clusters = [
    { cx: 210, cy: 210, color: "#38bdf8" },
    { cx: 510, cy: 170, color: "#a855f7" },
    { cx: 360, cy: 350, color: "#f59e0b" },
  ];
  clusters.forEach(c => {
    ctx.fillStyle = c.color;
    for (let i = 0; i < 32; i++) {
      const rx = c.cx + (Math.random() - 0.5) * 110;
      const ry = c.cy + (Math.random() - 0.5) * 88;
      ctx.beginPath(); ctx.arc(rx, ry, 5.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = c.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.arc(c.cx, c.cy, 68, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = "#94a3b8"; ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillText("Silhouette: 0.78  |  Inertia: 118.2  |  k=3  |  Convergence: PASSED", 24, 462);
  return new THREE.CanvasTexture(canvas);
}

function createCautionStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  const sw = 32;
  for (let i = -2; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0 ? "rgba(245, 158, 11, 0.9)" : "rgba(15, 23, 42, 0.9)";
    ctx.save();
    ctx.translate(i * sw - 128, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(0, -512, sw, 1024);
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

function createThreatLevelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024; canvas.height = 360;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#060912"; ctx.fillRect(0, 0, 1024, 360);
  const screens = [
    { x:  16, label: "SECTOR A", value: "97.4%", status: "BREACH",  col: "#ff3366" },
    { x: 270, label: "SECTOR B", value: "12.1%", status: "NOMINAL", col: "#10b981" },
    { x: 524, label: "SECTOR C", value: "63.5%", status: "WARNING", col: "#f59e0b" },
    { x: 778, label: "SECTOR D", value: "97.1%", status: "BREACH",  col: "#ff3366" },
  ];
  screens.forEach(s => {
    ctx.fillStyle = "#0c1220"; ctx.fillRect(s.x, 20, 238, 314);
    ctx.strokeStyle = s.col; ctx.lineWidth = 2.5; ctx.strokeRect(s.x, 20, 238, 314);
    ctx.fillStyle = s.col; ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.fillText(s.label, s.x + 12, 52);
    ctx.font = "bold 46px 'Inter', sans-serif";
    ctx.shadowColor = s.col; ctx.shadowBlur = 18;
    ctx.fillText(s.value, s.x + 14, 158);
    ctx.shadowBlur = 0;
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillText(s.status, s.x + 14, 196);
    const barH = parseFloat(s.value) / 100 * 82;
    ctx.fillStyle = s.col + "88"; ctx.fillRect(s.x + 12, 298 - barH, 40, barH);
    ctx.fillStyle = "#94a3b8"; ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText("ANOMALY SCORE", s.x + 12, 322);
  });
  return new THREE.CanvasTexture(canvas);
}

// ── Door Animation & Audio Helpers ─────────────────────────────────────────

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
    filt.frequency.setValueAtTime(2400, ctx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.45);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
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

// ── Exported State Management Functions ────────────────────────────────────

export function getDoorRegistry() { return doorRegistry; }
export function getExitDoor()     { return exitDoor; }

export function setDoorActiveState(doorType, isActive, isUnlocked = false) {
  const entry = doorRegistry[doorType];
  if (!entry) return;
  entry.isActive = isActive;
  entry.isUnlocked = isUnlocked;
  const themeColor = doorColors[doorType] || P.cyan;

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

export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (!entry || !entry.leftLeaf) return;
  setDoorActiveState(doorType, true, true);
  animateDoorLeaves(entry, 950);
  playDoorUnlockSFX();
  setMaxZBound(entry.zDoor + 20.8);
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
    mysteryCoreMesh.rotation.y += delta * 0.65;
    mysteryCoreMesh.rotation.x += delta * 0.3;
    mysteryCoreMesh.position.y = 3.2 + Math.sin(t * 1.5) * 0.15;
  }
  if (mysteryOuterRing) {
    mysteryOuterRing.rotation.z += delta * 0.35;
  }
  if (mysteryInnerRing) {
    mysteryInnerRing.rotation.y += delta * 0.45;
  }
}
