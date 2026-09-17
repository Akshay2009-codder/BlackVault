// BlackVault 3D Corporate Tower — World Architecture
// Room-to-room layout: 5 puzzle rooms connected directly through corridor doors.
// Deep Ocean-Slate + Warm Brass corporate palette.
//
// PALETTE:
//   Walls:     Deep ocean-slate #2C3A4A / Navy-midnight #243040
//   Floor:     Charcoal dark #1A2028 with brass grout
//   Ceiling:   Slate-navy #222D38
//   Accent:    Warm champagne brass #E8C878 (trim, handles, reveals)
//   Steel:     Steel-blue panels #3D5068
//   Neon:      RGB accents per room (pink / green / blue / red / violet)
//   Danger:    Electric amber #FF9900 (locked doors)
//   Solved:    Ice cyan #00F0FF (solved state)

import * as THREE from "three";
import { BOSS_DOOR_TYPE, STATUS_COLORS } from "./config.js";
import {
  createFloorTexture,
  createLeftUltrawideScreenTexture,
  createRightUltrawideScreenTexture,
  createKeyboardTexture,
  createWhiteboardTexture,
  createNeonSignTexture,
  createFloorDirectoryTexture,
  createDeptPlaqueTexture,
  createRegressionChartTexture,
  createClusterTexture,
  createThreatLevelTexture,
  createCautionStripeTexture,
  createReceptionBannerTexture,
  createHubRugTexture,
  createDoorTerminalScreenTexture,
  createBacklitLogoTexture,
  createHolographicFloorTexture,
  createServerRackFaceTexture,
  createControlConsoleScreenTextures,
  createHolographicGlassTexture,
  createAcousticWallPanelTexture,
  createWallNoiseTexture,
  createWalnutWoodSlatTexture,
  createBrushedSilverWallTexture,
  createModernArtCanvasTexture,
  createWallDirectoryTexture,
  createArchitecturalCeilingTexture,
} from "./textures.js";
import { setMaxZBound } from "./player.js";
import { registerFlickerLight } from "./sceneSetup.js";

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

var worldCamera = null;

// ── Luminous Titanium-Cyan & Champagne Gold Corporate Palette ─────────────
// Replaces dark/black surfaces with bright architectural titanium, warm teak, and vibrant neon
const P = {
  // Architectural Wall Surfaces — Luminous satin titanium-slate
  wallMain:    0x7a9eb5,   // Clean bright titanium-slate — primary wall
  wallAlt:     0x6a8fa8,   // Soft slate titanium — secondary panels
  wallSilver:  0xa4c0d8,   // Brushed platinum-silver composite upper panels
  wallBrown:   0x986b48,   // Warm architectural teak / amber bronze
  wallBronze:  0xb8885a,   // Warm champagne gold accent reveals
  warmWood:    0x8a5838,   // Rich warm teak timber slats
  floor:       0x3a4c5e,   // Reflective steel-slate tech floor
  floorTrim:   0x587890,   // Brushed steel baseboard
  ceiling:     0x3a5068,   // Luminous architectural ceiling
  trussSteel:  0x6c88a2,   // Brushed aluminum/titanium structural beams (bright & visible)

  // Ceiling light fixtures
  ceilingCyan:      0x00f0ff,   // Electric cyan-teal beam strips #00F0FF
  ceilingDownlight: 0xfffae8,   // Soft warm-white recessed downlights #FFFAE8
  ceilingMagenta:   0x38bdf8,   // Radiant cyan-azure accent strips #38BDF8

  // Furniture & props
  furniture:   0x384a5c,   // Slate-titanium chassis with metallic sheen
  chrome:      0xdde8f2,   // Bright polished chrome / silver
  gold:        0xf0c868,   // Vibrant champagne brass / gold trim
  leatherWarm: 0x5a7c98,   // Slate-cyan leather
  fabricSlate: 0x6a849c,   // Modern acoustic fabric

  // RGB Neon Accents (Vibrant light sources — per room)
  pink:      0x00d2ff,   // #00D2FF — electric cyan
  blue:      0x38bdf8,   // #38BDF8 — radiant azure
  green:     0x10b981,   // #10B981 — emerald neon
  white:     0xf0f9ff,   // #F0F9FF — luminous white
  burgundy:  0x0284c7,   // #0284C7 — deep cerulean

  // Status — reserved for door locks only
  danger:    0xf59e0b,   // Amber glow (#F59E0B)
  sage:      0x00f0ff,   // Brilliant Ice Cyan (#00F0FF)

  // Plant greens
  plant1:    0x10b981,
  plant2:    0x059669,
  plant3:    0x1abc9c,
};

// Room geometry constants (Generously scaled for expansive 38m wide layout)
const ROOM_W  = 38.0;
const ROOM_H  = 8.5;   // High control-room vaulted ceiling
const VAULT_H = 11.5;  // Top floor grand vault
const DATA_H  = 7.8;   // Server floor ceiling

// Total building depth — 6 zones (Ground + 5 floors)
const TOTAL_LEN = 236.0;

const doorRegistry = {};
let exitDoor = null;
let mysteryCoreMesh = null;
let mysteryOuterRing = null;
let mysteryInnerRing = null;



// Door accent colours (each floor leans on one accent)
const doorColors = {
  classification: P.blue,
  regression:     P.blue,
  clustering:     P.blue,
  anomaly:        P.blue,
  mystery:        P.blue,
};

// ─────────────────────────────────────────────────────────────────────────────
export function initWorld(scene, cameraRef = null) {
  worldCamera = cameraRef;
  clearCollisionBoxes();

  // ── Shared base materials ─────────────────────────────────────────────────
  const floorMat = new THREE.MeshStandardMaterial({
    map: createHolographicFloorTexture(),
    color: 0xffffff,
    roughness: 0.26,
    metalness: 0.25,
  });

  // Upper Walls: Warm terracotta composite panels
  const wallSilverMat = new THREE.MeshStandardMaterial({
    map: createBrushedSilverWallTexture(),
    color: 0xd07848,
    roughness: 0.52,
    metalness: 0.18,
  });

  // Lower Walls & Wainscoting: Warm rust-orange timber slats
  const woodSlatMat = new THREE.MeshStandardMaterial({
    map: createWalnutWoodSlatTexture(),
    color: 0xb86838,
    roughness: 0.55,
    metalness: 0.08,
  });

  const wallNoiseTex = createWallNoiseTexture();
  const wallMat = new THREE.MeshStandardMaterial({
    map: wallNoiseTex,
    color: P.wallMain,
    roughness: 0.70,
    metalness: 0.22,
  });
  const wallAltMat = new THREE.MeshStandardMaterial({
    map: wallNoiseTex,
    color: P.wallAlt,
    roughness: 0.65,
    metalness: 0.12,
  });

  const ceilMat = createAuroraCeilingMaterial();
  const trimMat = new THREE.MeshStandardMaterial({ color: P.floorTrim, roughness: 0.35, metalness: 0.45 });
  const brassTrimMat = new THREE.MeshStandardMaterial({ color: P.gold, roughness: 0.25, metalness: 0.85 });

  // ── Global continuous reflective dark floor ──────────────────────────────
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, TOTAL_LEN), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, TOTAL_LEN / 2 - 6.0);
  floor.receiveShadow = true;
  scene.add(floor);

  // Dark baseboard trim along perimeter walls
  [-ROOM_W / 2 + 0.08, ROOM_W / 2 - 0.08].forEach(tx => {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.30, TOTAL_LEN), trimMat);
    trim.position.set(tx, 0.15, TOTAL_LEN / 2 - 6.0);
    scene.add(trim);
  });

  // ── Ceiling segments (Exposed structural ceiling) ────────────────────────
  // Ground (Z: -6 → 30, H: 8.5)
  addCeiling(scene, 36.0, ROOM_H,  12.0,  ceilMat);
  // Floor 1 (Z: 30 → 66, H: 8.5)
  addCeiling(scene, 36.0, ROOM_H,  48.0,  ceilMat);
  // Floor 2 (Z: 66 → 102, H: 7.8)
  addCeiling(scene, 36.0, DATA_H,  84.0,  ceilMat);
  // Floor 3 (Z: 102 → 138, H: 8.5)
  addCeiling(scene, 36.0, ROOM_H, 120.0,  ceilMat);
  // Floor 4 (Z: 138 → 174, H: 8.5)
  addCeiling(scene, 36.0, ROOM_H, 156.0,  ceilMat);
  // Floor 5 / Vault (Z: 174 → 226, H: 11.5)
  addCeiling(scene, 52.0, VAULT_H, 200.0, ceilMat);

  // ── Industrial Ceiling Trusses, Beams & Practical Recessed Downlights ───
  buildArchitecturalCeilingSystem(scene);

  // Step wall at vault entry (height bump 8.5→11.5 at Z=174)
  const transWall = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, VAULT_H - ROOM_H), wallAltMat
  );
  transWall.position.set(0, ROOM_H + (VAULT_H - ROOM_H) / 2, 174.0);
  scene.add(transWall);

  // ── Two-Tone Architectural Perimeter Walls (Walnut Wood Slats Lower + Brushed Silver Upper) ──
  const wainH = 2.4; // Wainscot height in meters
  const upperH = ROOM_H - wainH;

  // Left Wall: Lower Walnut Slats
  const leftWallLower = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, wainH), woodSlatMat);
  leftWallLower.position.set(-ROOM_W / 2, wainH / 2, TOTAL_LEN / 2 - 6.0);
  leftWallLower.rotation.y = Math.PI / 2;
  leftWallLower.receiveShadow = true;
  scene.add(leftWallLower);

  // Left Wall: Upper Brushed Silver
  const leftWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, upperH), wallSilverMat);
  leftWallUpper.position.set(-ROOM_W / 2, wainH + upperH / 2, TOTAL_LEN / 2 - 6.0);
  leftWallUpper.rotation.y = Math.PI / 2;
  leftWallUpper.receiveShadow = true;
  scene.add(leftWallUpper);

  // Left Wall: Brushed Brass Accent Reveal Trim between Walnut and Silver
  const leftBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, TOTAL_LEN), brassTrimMat);
  leftBrassTrim.position.set(-ROOM_W / 2 + 0.04, wainH, TOTAL_LEN / 2 - 6.0);
  scene.add(leftBrassTrim);

  // Right Wall: Lower Walnut Slats
  const rightWallLower = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, wainH), woodSlatMat);
  rightWallLower.position.set(ROOM_W / 2, wainH / 2, TOTAL_LEN / 2 - 6.0);
  rightWallLower.rotation.y = -Math.PI / 2;
  rightWallLower.receiveShadow = true;
  scene.add(rightWallLower);

  // Right Wall: Upper Brushed Silver
  const rightWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(TOTAL_LEN, upperH), wallSilverMat);
  rightWallUpper.position.set(ROOM_W / 2, wainH + upperH / 2, TOTAL_LEN / 2 - 6.0);
  rightWallUpper.rotation.y = -Math.PI / 2;
  rightWallUpper.receiveShadow = true;
  scene.add(rightWallUpper);

  // Right Wall: Brushed Brass Accent Reveal Trim
  const rightBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, TOTAL_LEN), brassTrimMat);
  rightBrassTrim.position.set(ROOM_W / 2 - 0.04, wainH, TOTAL_LEN / 2 - 6.0);
  scene.add(rightBrassTrim);

  // Architectural Pilaster Columns with warm sconce lights along perimeter walls
  for (let pz = 0; pz <= TOTAL_LEN - 12.0; pz += 18.0) {
    buildWallPilasterColumn(scene, -ROOM_W / 2 + 0.15, pz - 6.0, ROOM_H, Math.PI / 2);
    buildWallPilasterColumn(scene,  ROOM_W / 2 - 0.15, pz - 6.0, ROOM_H, -Math.PI / 2);
  }

  // Elevated vault side walls (Y: 8.5→11.5)
  [[-ROOM_W / 2, Math.PI / 2], [ROOM_W / 2, -Math.PI / 2]].forEach(([wx, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(52.0, VAULT_H - ROOM_H), wallSilverMat);
    w.position.set(wx, ROOM_H + (VAULT_H - ROOM_H) / 2, 200.0);
    w.rotation.y = ry;
    scene.add(w);
  });

  // ── South Entrance Wall Architecture (Solid Silver & Walnut facing +Z into room) ──
  const southWallUpper = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, upperH), wallSilverMat);
  southWallUpper.position.set(0, wainH + upperH / 2, -6.0);
  southWallUpper.receiveShadow = true;
  scene.add(southWallUpper);

  const southWallLower = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, wainH), woodSlatMat);
  southWallLower.position.set(0, wainH / 2, -5.96);
  southWallLower.receiveShadow = true;
  scene.add(southWallLower);

  const southBrassTrim = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.08, 0.08), brassTrimMat);
  southBrassTrim.position.set(0, wainH, -5.92);
  scene.add(southBrassTrim);

  // Grand Architectural Main Entrance Doors & Foyer
  buildGrandEntranceDoors(scene, 0, -5.94);

  // ── Build all floors ──────────────────────────────────────────────────────
  buildGroundLobby(scene);
  buildFloor1Classification(scene);
  buildFloor2Regression(scene);
  buildFloor3Clustering(scene);
  buildFloor4AnomalyWing(scene);
  buildFloor5MysteryVault(scene);

  // ── Door stations (puzzle terminals) ──────────────────────────────────────
  createDoorStation(scene, "classification", 0, 30.0,  ROOM_H);
  createDoorStation(scene, "regression",     0, 66.0,  DATA_H);
  createDoorStation(scene, "clustering",     0, 102.0, ROOM_H);
  createDoorStation(scene, "anomaly",        0, 138.0, ROOM_H);
  createDoorStation(scene, "mystery",        0, 174.0, VAULT_H);

  setMaxZBound(28.5);
}

function addCeiling(scene, len, h, midZ, mat) {
  const c = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, len), mat);
  c.rotation.x = Math.PI / 2;
  c.position.set(0, h, midZ);
  scene.add(c);
}

/** Grand Architectural Main Entrance Double Glass Doors & Foyer */
function buildGrandEntranceDoors(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const frameMat   = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.92, roughness: 0.18 });
  const woodMat    = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.55 });
  const glassMat   = new THREE.MeshStandardMaterial({ color: 0x18202a, transparent: true, opacity: 0.72, roughness: 0.1, metalness: 0.85 });
  const brassMat   = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });
  const scannerMat = new THREE.MeshStandardMaterial({ color: 0x222630, metalness: 0.7, roughness: 0.3 });

  const doorW = 5.2, doorH = 3.6, frameD = 0.18;

  // 1. Heavy Outer Portal Casing in Walnut Timber
  const portal = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.8, doorH + 0.5, frameD + 0.08), woodMat);
  portal.position.set(0, (doorH + 0.5) / 2, 0);
  g.add(portal);

  // 2. Brushed Chrome Main Door Frame
  const mainFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.2, doorH + 0.1, frameD), frameMat);
  mainFrame.position.set(0, (doorH + 0.1) / 2, 0.02);
  g.add(mainFrame);

  // Left Door Leaf (Width: 2.3m)
  const leftLeafFrame = new THREE.Mesh(new THREE.BoxGeometry(2.35, doorH - 0.2, 0.08), frameMat);
  leftLeafFrame.position.set(-1.25, doorH / 2, 0.04);
  g.add(leftLeafFrame);

  const leftGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.05, doorH - 0.5), glassMat);
  leftGlass.position.set(-1.25, doorH / 2, 0.09);
  g.add(leftGlass);

  // Right Door Leaf (Width: 2.3m)
  const rightLeafFrame = new THREE.Mesh(new THREE.BoxGeometry(2.35, doorH - 0.2, 0.08), frameMat);
  rightLeafFrame.position.set(1.25, doorH / 2, 0.04);
  g.add(rightLeafFrame);

  const rightGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.05, doorH - 0.5), glassMat);
  rightGlass.position.set(1.25, doorH / 2, 0.09);
  g.add(rightGlass);

  // Vertical Architectural Brass Pull Handles
  [-0.22, 0.22].forEach(hx => {
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.4, 12), brassMat);
    handle.position.set(hx, 1.55, 0.14);
    g.add(handle);

    [-0.55, 0.55].forEach(sy => {
      const standoff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 8), brassMat);
      standoff.rotation.x = Math.PI / 2;
      standoff.position.set(hx, 1.55 + sy, 0.11);
      g.add(standoff);
    });
  });

  // Transom Header Plaque ("BLACKVAULT // CORPORATE ARCHIVE TOWER // MAIN ACCESS")
  const plaque = new THREE.Mesh(
    new THREE.BoxGeometry(doorW - 0.4, 0.35, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1e2430, metalness: 0.85, roughness: 0.25 })
  );
  plaque.position.set(0, doorH + 0.1, 0.06);
  g.add(plaque);

  const plaqueTrim = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.36, 0.03, 0.05), brassMat);
  plaqueTrim.position.set(0, doorH + 0.28, 0.06);
  g.add(plaqueTrim);

  // Overhead cool cyan-white downlight fixture
  const downlight = new THREE.PointLight(0xe8f0ff, 0.75, 6.0);
  downlight.position.set(0, doorH + 0.3, 0.6);
  g.add(downlight);

  // Electronic RFID Security Badge Scanner on right side wall
  const scanner = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.06), scannerMat);
  scanner.position.set(3.2, 1.4, 0.04);
  g.add(scanner);

  const scanLED = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.02), new THREE.MeshBasicMaterial({ color: P.blue }));
  scanLED.position.set(3.2, 1.52, 0.08);
  g.add(scanLED);

  // Flanking Entrance Architectural Planters
  buildArchitecturalPlanter(scene, -4.2, z + 0.8, 1.8, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  4.2, z + 0.8, 1.8, 0.8, 0.75);

  scene.add(g);
  addCollisionBox(x - doorW / 2 - 0.5, x + doorW / 2 + 0.5, z - 0.4, z + 0.3, "entrance_doors");
}

/** Architectural BLACKVAULT billboard sign on far wall */
function buildBacklitBlackvaultSign(scene, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const signW = 22.0, signH = 3.8;
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x7a9cb0, metalness: 0.85, roughness: 0.25 });
  const trimMat  = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });

  // Main sign plane with shield emblem & typography
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(signW, signH),
    new THREE.MeshBasicMaterial({ map: createBacklitLogoTexture() })
  );
  signMesh.position.z = 0.05;
  g.add(signMesh);

  // Extruded bright silver backplate
  const backplate = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.6, signH + 0.6, 0.16), frameMat);
  backplate.position.z = -0.08;
  g.add(backplate);

  // Brushed gold / champagne trim border around the billboard
  const borderThickness = 0.06;
  const bTop = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.72, borderThickness, 0.18), trimMat);
  bTop.position.set(0, (signH + 0.6) / 2, 0);
  g.add(bTop);

  const bBot = new THREE.Mesh(new THREE.BoxGeometry(signW + 0.72, borderThickness, 0.18), trimMat);
  bBot.position.set(0, -(signH + 0.6) / 2, 0);
  g.add(bBot);

  const bLeft = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, signH + 0.6, 0.18), trimMat);
  bLeft.position.set(-(signW + 0.6) / 2, 0, 0);
  g.add(bLeft);

  const bRight = new THREE.Mesh(new THREE.BoxGeometry(borderThickness, signH + 0.6, 0.18), trimMat);
  bRight.position.set((signW + 0.6) / 2, 0, 0);
  g.add(bRight);

  // Lower structural mezzanine beam (bright metal)
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.40, 0.75), frameMat);
  beam.position.set(0, -signH / 2 - 0.45, 0.25);
  g.add(beam);

  scene.add(g);
}

let auroraCeilingMaterial = null;

/**
 * Animated Aurora Deep-Space Sky Shader Material
 * - Base vertical gradient: deep indigo #151033 to near-black #0A0818
 * - Sweeping aurora streaks: Cyan #4FF2E0, Magenta #FF3EC8, Violet #8B5CF6
 * - Scattered twinkling star points: Cool White #E8F0FF, Pale Cyan #A8E8FF
 * - Self-illuminated with calibrated HDR headroom (never washes out or strobes)
 */
export function createAuroraCeilingMaterial() {
  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPosition;

    // Celestial Color Palette — Luminous Sapphire-Azure Sky (No pitch black)
    const vec3 cDarkIndigo  = vec3(0.18, 0.30, 0.48); // #2E4D7A - radiant twilight sapphire
    const vec3 cNearBlack   = vec3(0.12, 0.20, 0.34); // #1F3357 - deep rich azure sky
    const vec3 cCyan        = vec3(0.00, 0.95, 1.00); // #00F0FF - vibrant electric cyan
    const vec3 cMagenta     = vec3(0.22, 0.74, 0.97); // #38BDF8 - brilliant sky blue streak
    const vec3 cViolet      = vec3(0.65, 0.45, 1.00); // #A855F7 - luminous violet transition
    const vec3 cStarWhite   = vec3(0.95, 0.98, 1.00); // #F0F8FF
    const vec3 cStarCyan    = vec3(0.70, 0.95, 1.00); // #B0F0FF

    // Stable 2D hash (Shadertoy canonical hash12, robust to large coordinates)
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash12(i);
      float b = hash12(i + vec2(1.0, 0.0));
      float c = hash12(i + vec2(0.0, 1.0));
      float d = hash12(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.877, 0.479, -0.479, 0.877);
      for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p = rot * p * 2.02 + vec2(17.13, 23.47);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      // 1. Base Gradient: Deep cosmic indigo (#151033) at walls to near-black (#0A0818) center
      float distFromCenter = abs(vUv.x - 0.5) * 2.0;
      float edgeFalloff = smoothstep(0.15, 0.95, distFromCenter);
      vec3 baseColor = mix(cNearBlack, cDarkIndigo, edgeFalloff * 0.85 + 0.15);

      // Slow, majestic aurora drift
      float t = uTime * 0.12;

      // 2. Sweeping Aurora Ribbons / Curtains
      // Ribbon 1: Vivid Cyan Streak (#4FF2E0)
      vec2 p1 = vec2(vWorldPosition.x * 0.042, vWorldPosition.z * 0.024) + vec2(t * 0.45, sin(t * 0.3) * 0.4);
      float n1 = fbm(p1);
      float ridge1 = abs(sin(vWorldPosition.z * 0.048 + vWorldPosition.x * 0.028 + n1 * 3.0 + t * 0.7));
      float streak1 = exp(-ridge1 * 6.0) * smoothstep(0.25, 0.75, n1);

      // Ribbon 2: Sweeping Magenta Streak (#FF3EC8)
      vec2 p2 = vec2(vWorldPosition.x * 0.036, vWorldPosition.z * 0.020) - vec2(t * 0.38, cos(t * 0.25) * 0.35);
      float n2 = fbm(p2);
      float ridge2 = abs(sin(vWorldPosition.z * 0.042 - vWorldPosition.x * 0.034 + n2 * 3.2 - t * 0.6));
      float streak2 = exp(-ridge2 * 6.5) * smoothstep(0.28, 0.80, n2);

      // Ribbon 3: Violet Transition Glow (#8B5CF6)
      vec2 p3 = vec2(vWorldPosition.x * 0.028, vWorldPosition.z * 0.016) + vec2(sin(t * 0.2) * 0.5, t * 0.25);
      float n3 = fbm(p3);
      float ridge3 = abs(sin(vWorldPosition.z * 0.032 + n3 * 2.5 + t * 0.4));
      float streak3 = exp(-ridge3 * 7.0) * smoothstep(0.3, 0.85, n3);

      // Calibrated aurora composite — saturated, clearly defined colors that never blow out to white
      vec3 auroraColor = (cCyan * (streak1 * 0.62)) +
                         (cMagenta * (streak2 * 0.50)) +
                         (cViolet * (streak3 * 0.30));

      // 3. Crisp Scattered Celestial Stars (Anti-Aliased, Numerically Stable, Non-Flickering)
      vec2 starGrid = vWorldPosition.xz * 0.85;
      vec2 cellId = floor(starGrid);
      vec2 cellUv = fract(starGrid) - 0.5;

      float starVal = 0.0;
      vec3 starCol = cStarWhite;

      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 neighbor = vec2(float(x), float(y));
          vec2 nId = cellId + neighbor;
          float h = hash12(nId);

          if (h > 0.72) {
            vec2 offset = vec2(hash12(nId + vec2(1.23, 4.56)) - 0.5,
                               hash12(nId + vec2(7.89, 2.34)) - 0.5) * 0.68;
            vec2 p = cellUv - neighbor - offset;
            float d = length(p);

            // Gentle celestial twinkle: slow period, strictly controlled amplitude
            float twinkle = 0.55 + 0.15 * sin(uTime * 0.8 + h * 6.28);
            // Smooth Gaussian falloff: prevents subpixel jumping
            float starRadius = 0.042;
            float starIntensity = exp(-d * d / (starRadius * starRadius)) * twinkle;

            if (starIntensity > starVal) {
              starVal = starIntensity;
              starCol = (h > 0.88) ? cStarCyan : cStarWhite;
            }
          }
        }
      }

      // Safe star illumination: capped strictly below bloom threshold (0.85) to eliminate temporal strobing
      vec3 stars = starCol * (starVal * 0.65);

      // Final Color Composition: Rich, moody night sky with radiant colored aurora ribbons
      vec3 finalColor = baseColor + auroraColor + stars;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `;

  auroraCeilingMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0.0 },
    },
    vertexShader,
    fragmentShader,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  return auroraCeilingMaterial;
}

/**
 * Comprehensive Architectural Ceiling Structure & Downlight Illumination System
 * Features:
 * - Exposed structural steel trusses in dark metal tone #1C1F24 with subtle specular sheen
 * - Rim-light highlights on top chord catching aurora glow
 * - Continuous cyan-teal #3FD8E8 glowing trim strips along bottom chords and spine runner
 * - Soft cool-white #E8F4FF recessed downlight panel fixtures with practical room downlighting
 * - Sparse low-intensity magenta #FF4FA3 accent strips along ceiling perimeter edges
 */
function buildArchitecturalCeilingSystem(scene) {
  const steelMat = new THREE.MeshStandardMaterial({
    color: P.trussSteel,
    metalness: 0.68,
    roughness: 0.38,
  });
  const cyanGlowMat = new THREE.MeshBasicMaterial({ color: P.ceilingCyan });
  const magentaGlowMat = new THREE.MeshBasicMaterial({ color: P.ceilingMagenta, transparent: true, opacity: 0.82 });
  const downlightLensMat = new THREE.MeshStandardMaterial({
    color: P.ceilingDownlight,
    emissive: P.ceilingDownlight,
    emissiveIntensity: 0.62,
    roughness: 0.28,
  });
  const downlightBezelMat = new THREE.MeshStandardMaterial({ color: P.trussSteel, metalness: 0.70, roughness: 0.35 });
  const rimHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x3fd8e8,
    emissive: 0x3fd8e8,
    emissiveIntensity: 0.58,
    roughness: 0.25,
    metalness: 0.6,
  });

  const zones = [
    {
      name: "Ground Lobby",
      z0: -6.0, z1: 30.0, h: ROOM_H,
      trusses: [-2.0, 5.0, 12.0, 19.0, 26.0],
      downlights: [
        { x: -6.5, z:  1.5 }, { x: 6.5, z:  1.5 },
        { x: -6.5, z:  8.5 }, { x: 6.5, z:  8.5 },
        { x: -6.5, z: 15.5 }, { x: 6.5, z: 15.5 },
        { x: -6.5, z: 22.5 }, { x: 6.5, z: 22.5 },
      ],
      edgeMagenta: true,
    },
    {
      name: "Floor 1 Classification",
      z0: 30.0, z1: 66.0, h: ROOM_H,
      trusses: [34.0, 41.0, 48.0, 55.0, 62.0],
      downlights: [
        { x: -6.5, z: 37.5 }, { x: 6.5, z: 37.5 },
        { x: -6.5, z: 44.5 }, { x: 6.5, z: 44.5 },
        { x: -6.5, z: 51.5 }, { x: 6.5, z: 51.5 },
        { x: -6.5, z: 58.5 }, { x: 6.5, z: 58.5 },
      ],
      edgeMagenta: true,
    },
    {
      name: "Floor 2 Regression",
      z0: 66.0, z1: 102.0, h: DATA_H,
      trusses: [70.0, 77.0, 84.0, 91.0, 98.0],
      downlights: [
        { x: -6.5, z: 73.5 }, { x: 6.5, z: 73.5 },
        { x: -6.5, z: 80.5 }, { x: 6.5, z: 80.5 },
        { x: -6.5, z: 87.5 }, { x: 6.5, z: 87.5 },
        { x: -6.5, z: 94.5 }, { x: 6.5, z: 94.5 },
      ],
      edgeMagenta: true,
    },
    {
      name: "Floor 3 Clustering",
      z0: 102.0, z1: 138.0, h: ROOM_H,
      trusses: [106.0, 113.0, 120.0, 127.0, 134.0],
      downlights: [
        { x: -6.5, z: 109.5 }, { x: 6.5, z: 109.5 },
        { x: -6.5, z: 116.5 }, { x: 6.5, z: 116.5 },
        { x: -6.5, z: 123.5 }, { x: 6.5, z: 123.5 },
        { x: -6.5, z: 130.5 }, { x: 6.5, z: 130.5 },
      ],
      edgeMagenta: false,
    },
    {
      name: "Floor 4 Anomaly Wing",
      z0: 138.0, z1: 174.0, h: ROOM_H,
      trusses: [142.0, 149.0, 156.0, 163.0, 170.0],
      downlights: [
        { x: -6.5, z: 145.5 }, { x: 6.5, z: 145.5 },
        { x: -6.5, z: 152.5 }, { x: 6.5, z: 152.5 },
        { x: -6.5, z: 159.5 }, { x: 6.5, z: 159.5 },
        { x: -6.5, z: 166.5 }, { x: 6.5, z: 166.5 },
      ],
      edgeMagenta: true,
    },
    {
      name: "Floor 5 Mystery Vault",
      z0: 174.0, z1: 226.0, h: VAULT_H,
      trusses: [179.0, 186.0, 193.0, 207.0, 214.0, 221.0],
      downlights: [
        { x: -8.0, z: 182.5 }, { x: 8.0, z: 182.5 },
        { x: -8.0, z: 189.5 }, { x: 8.0, z: 189.5 },
        { x: -8.0, z: 210.5 }, { x: 8.0, z: 210.5 },
        { x: -8.0, z: 217.5 }, { x: 8.0, z: 217.5 },
      ],
      edgeMagenta: true,
    },
  ];

  zones.forEach(zone => {
    const { z0, z1, h, trusses, downlights, edgeMagenta } = zone;
    const len = z1 - z0;
    const midZ = (z0 + z1) / 2;

    // 1. Longitudinal Spine Beams (running continuously along Z at X = -8.5, 0.0, +8.5)
    [-8.5, 0.0, 8.5].forEach(lx => {
      const runner = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, len), steelMat);
      runner.position.set(lx, h - 0.45, midZ);
      scene.add(runner);
    });

    // Center continuous cyan glow strip on underside of center runner
    const centerGlow = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.02, len), cyanGlowMat);
    centerGlow.position.set(0.0, h - 0.55, midZ);
    scene.add(centerGlow);

    // 2. Perimeter Conduits & Sparse Low-Intensity Magenta Strips near room edges
    [-ROOM_W / 2 + 0.80, ROOM_W / 2 - 0.80].forEach(ex => {
      const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, len), steelMat);
      conduit.position.set(ex, h - 0.08, midZ);
      scene.add(conduit);

      if (edgeMagenta) {
        const magStrip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, len), magentaGlowMat);
        magStrip.position.set(ex, h - 0.12, midZ);
        scene.add(magStrip);
      }
    });

    // 3. Exposed Transverse Structural Trusses
    trusses.forEach(tz => {
      const tg = new THREE.Group();
      tg.position.set(0, 0, tz);

      // Top chord
      const topChord = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.2, 0.18, 0.18), steelMat);
      topChord.position.y = h - 0.15;
      tg.add(topChord);

      // Aurora Rim Highlight on top edge of top chord
      const rimHighlight = new THREE.Mesh(
        new THREE.BoxGeometry(ROOM_W - 0.4, 0.025, 0.04),
        rimHighlightMat
      );
      rimHighlight.position.set(0, h - 0.05, 0);
      tg.add(rimHighlight);

      // Bottom chord
      const botChord = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.2, 0.18, 0.18), steelMat);
      botChord.position.y = h - 0.95;
      tg.add(botChord);

      // Glowing Cyan-Teal Strip on bottom edge of truss
      const cyanStrip = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 0.4, 0.035, 0.06), cyanGlowMat);
      cyanStrip.position.set(0, h - 1.05, 0);
      tg.add(cyanStrip);

      // Web struts
      for (let x = -ROOM_W / 2 + 2.0; x <= ROOM_W / 2 - 2.0; x += 3.2) {
        const vStrut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.65, 0.12), steelMat);
        vStrut.position.set(x, h - 0.55, 0);
        tg.add(vStrut);

        const dStrut = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.05, 0.10), steelMat);
        dStrut.position.set(x + 1.6, h - 0.55, 0);
        dStrut.rotation.z = 0.65;
        tg.add(dStrut);
      }

      // Wall mounting gusset plates at truss ends
      [-ROOM_W / 2 + 0.12, ROOM_W / 2 - 0.12].forEach(gx => {
        const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.28), steelMat);
        gusset.position.set(gx, h - 0.55, 0);
        tg.add(gusset);
      });

      scene.add(tg);
    });

    // 4. Soft Cool-White Recessed Downlight Panels with Practical Downlights
    downlights.forEach(dl => {
      const dg = new THREE.Group();
      dg.position.set(dl.x, h, dl.z);

      // Bezel casing (offset down from ceiling plane to eliminate z-fighting)
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.6), downlightBezelMat);
      bezel.position.y = -0.05;
      dg.add(bezel);

      // Diffuser panel with steady calibrated emissive
      const lens = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 0.42), downlightLensMat);
      lens.position.y = -0.08;
      dg.add(lens);

      scene.add(dg);

      // Practical Downlight illuminating room from above
      const pLight = new THREE.PointLight(P.ceilingDownlight, 0.72, 16, 1.8);
      pLight.position.set(dl.x, h - 0.40, dl.z);
      scene.add(pLight);
      registerFlickerLight(pLight, 0.72);
    });
  });
}

function buildIndustrialCeilingTrusses(scene, zPositions) {
  // Aliased into buildArchitecturalCeilingSystem
}

/** Architectural Pilaster column on perimeter wall with up/down warm LED sconce */
function buildWallPilasterColumn(scene, x, z, h, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const silverMat   = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.85, roughness: 0.25 });
  const woodMat     = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.6 });
  const sconceMat   = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });
  const diffuserMat = new THREE.MeshStandardMaterial({
    color: 0x4ff2e0,        // Vivid cyan #4FF2E0 diffuser matching aurora palette
    emissive: 0x4ff2e0,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.15,
  });

  // Main pilaster column
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.32, h, 0.45), silverMat);
  col.position.set(0, h / 2, 0);
  g.add(col);

  // Walnut vertical inset
  const inset = new THREE.Mesh(new THREE.BoxGeometry(0.34, h - 0.6, 0.22), woodMat);
  inset.position.set(0, h / 2, 0);
  g.add(inset);

  // Sconce fixture at Y = 2.8m
  const sconce = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.40, 0.16), sconceMat);
  sconce.position.set(0, 2.8, 0.16);
  g.add(sconce);

  // Top and bottom diffuser slits — vivid cyan glow
  const topSlit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.12), diffuserMat);
  topSlit.position.set(0, 3.02, 0.16);
  g.add(topSlit);

  const botSlit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.04, 0.12), diffuserMat);
  botSlit.position.set(0, 2.58, 0.16);
  g.add(botSlit);

  // Bright magenta-pink sconce light at base — cyan-to-magenta gradient along pillar
  const sl = new THREE.PointLight(0xff3ec8, 0.55, 5.5);
  sl.position.set(0, 2.8, 0.45);
  g.add(sl);

  scene.add(g);
}

/** Modern Executive Lounge with Cognac Leather Sectional, Smoked Glass Table & Rug */
function buildExecutiveLounge(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const leatherMat = new THREE.MeshStandardMaterial({ color: P.leatherWarm, roughness: 0.45, metalness: 0.05 });
  const silverBaseMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9, roughness: 0.2 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.75 });
  const rugMat = new THREE.MeshStandardMaterial({ map: createHubRugTexture(), roughness: 0.9 });
  const goldMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.85, roughness: 0.25 });

  // 1. Designer Geometric Rug (under lounge)
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 4.8), rugMat);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0, 0.015, 0);
  g.add(rug);

  // 2. L-Shaped Sectional Sofa
  // Main back sofa section (length 3.6m)
  const mainSofa = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.42, 0.9), leatherMat);
  mainSofa.position.set(0, 0.28, -1.2);
  g.add(mainSofa);

  const mainBack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.55, 0.25), leatherMat);
  mainBack.position.set(0, 0.65, -1.55);
  g.add(mainBack);

  // Plinth base
  const mainBase = new THREE.Mesh(new THREE.BoxGeometry(3.64, 0.08, 0.94), silverBaseMat);
  mainBase.position.set(0, 0.04, -1.2);
  g.add(mainBase);

  // Chaise section (length 2.2m extending along -X)
  const chaise = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.42, 2.0), leatherMat);
  chaise.position.set(-1.32, 0.28, 0.25);
  g.add(chaise);

  const chaiseBack = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 2.0), leatherMat);
  chaiseBack.position.set(-1.67, 0.65, 0.25);
  g.add(chaiseBack);

  const chaiseBase = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 2.04), silverBaseMat);
  chaiseBase.position.set(-1.32, 0.04, 0.25);
  g.add(chaiseBase);

  // Throw pillows
  [-0.6, 0.6, 1.2].forEach((px, idx) => {
    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.38, 0.14),
      new THREE.MeshStandardMaterial({ color: idx === 1 ? P.gold : P.fabricSlate, roughness: 0.7 })
    );
    pillow.position.set(px, 0.58, -1.35);
    pillow.rotation.y = 0.15 * (idx - 1);
    g.add(pillow);
  });

  // 3. Circular Smoked Glass & Walnut Coffee Table
  const tableBase = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 0.32, 24), new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.5 }));
  tableBase.position.set(0.4, 0.16, 0.1);
  g.add(tableBase);

  const glassTop = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.03, 32), glassMat);
  glassTop.position.set(0.4, 0.34, 0.1);
  g.add(glassTop);

  const tableRing = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.02, 8, 32), goldMat);
  tableRing.rotation.x = Math.PI / 2;
  tableRing.position.set(0.4, 0.34, 0.1);
  g.add(tableRing);

  // Tabletop decorative sculpture / centerpiece
  const sculpture = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.12, 0),
    goldMat
  );
  sculpture.position.set(0.4, 0.46, 0.1);
  g.add(sculpture);

  // Glowing holographic datapad on table
  const datapad = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.015, 0.18),
    new THREE.MeshBasicMaterial({ color: P.blue })
  );
  datapad.position.set(0.65, 0.36, 0.25);
  datapad.rotation.y = 0.4;
  g.add(datapad);

  // 4. Modern Architectural Floor Lamp
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.85, 12), silverBaseMat);
  lampPole.position.set(1.9, 0.92, -1.4);
  g.add(lampPole);

  const lampShade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.32, 0.35, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf5eedc, roughness: 0.8, side: THREE.DoubleSide })
  );
  lampShade.position.set(1.9, 1.75, -1.4);
  g.add(lampShade);

  const lampLight = new THREE.PointLight(0xffebd0, 0.85, 6.0);
  lampLight.position.set(1.9, 1.70, -1.4);
  g.add(lampLight);

  scene.add(g);
  addCollisionBox(x - 2.0, x + 2.0, z - 2.0, z + 1.8, "lounge");
}

/** Multi-tiered Architectural Planter Box with lush tropical sci-fi greenery */
function buildArchitecturalPlanter(scene, x, z, w = 2.4, d = 0.8, h = 0.75) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const planterMat = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.55 });
  const trimMat    = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.88, roughness: 0.2 });
  const soilMat    = new THREE.MeshStandardMaterial({ color: 0x18120e, roughness: 0.95 });

  // Planter Casing
  const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), planterMat);
  box.position.y = h / 2;
  g.add(box);

  // Top Brushed Silver Rim
  const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), trimMat);
  rim.position.y = h;
  g.add(rim);

  // Base plinth
  const base = new THREE.Mesh(new THREE.BoxGeometry(w - 0.1, 0.08, d - 0.1), trimMat);
  base.position.y = 0.04;
  g.add(base);

  // Soil bed
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, d - 0.12), soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = h - 0.04;
  g.add(soil);

  // Layered foliage (bamboo stalks + monstera leaves + ferns)
  const plantCols = [0x2ecc71, 0x27ae60, 0x1abc9c, 0x16a085, 0x34495e];
  const count = Math.max(3, Math.floor(w * 2.2));
  for (let i = 0; i < count; i++) {
    const px = -w / 2 + 0.3 + (i / (count - 1)) * (w - 0.6) + (Math.random() - 0.5) * 0.15;
    const pz = (Math.random() - 0.5) * (d * 0.45);
    const stalkH = 0.8 + Math.random() * 0.9;
    const pMat = new THREE.MeshStandardMaterial({
      color: plantCols[i % plantCols.length],
      roughness: 0.5,
      metalness: 0.05,
      side: THREE.DoubleSide
    });

    // Bamboo stalk
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, stalkH, 6), trimMat);
    stalk.position.set(px, h + stalkH / 2, pz);
    g.add(stalk);

    // Leaves radiating out
    for (let l = 0; l < 4; l++) {
      const leafGeo = new THREE.PlaneGeometry(0.28 + Math.random() * 0.15, 0.14 + Math.random() * 0.06);
      const leaf = new THREE.Mesh(leafGeo, pMat);
      leaf.position.set(px, h + stalkH * (0.4 + l * 0.18), pz);
      leaf.rotation.set(0.35 + Math.random() * 0.3, l * (Math.PI / 2) + Math.random() * 0.4, 0.2);
      g.add(leaf);
    }
  }

  scene.add(g);
  addCollisionBox(x - w / 2 - 0.1, x + w / 2 + 0.1, z - d / 2 - 0.1, z + d / 2 + 0.1, "planter");
}

/** Standing Architectural Directory & Wayfinding Totem */
function buildWayfindingTotem(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const frameMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9, roughness: 0.2 });
  const baseMat  = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.5 });
  const screenMat = new THREE.MeshStandardMaterial({ map: createWallDirectoryTexture(), roughness: 0.35, metalness: 0.25 });
  const brassTrim = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.92, roughness: 0.2 });

  // Plinth Base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.16, 0.6), baseMat);
  base.position.y = 0.08;
  g.add(base);

  // Main Totem Body Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, 0.14), frameMat);
  frame.position.y = 1.36;
  g.add(frame);

  // Screen Face (both sides)
  const screenFront = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.1), screenMat);
  screenFront.position.set(0, 1.36, 0.075);
  g.add(screenFront);

  const screenBack = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.1), screenMat);
  screenBack.position.set(0, 1.36, -0.075);
  screenBack.rotation.y = Math.PI;
  g.add(screenBack);

  // Brass base accent trim
  const baseTrimMesh = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.18), brassTrim);
  baseTrimMesh.position.y = 0.22;
  g.add(baseTrimMesh);

  const pl = new THREE.PointLight(0xe8f4ff, 0.45, 3.5);
  pl.position.set(0, 1.4, 0.4);
  g.add(pl);

  scene.add(g);
  addCollisionBox(x - 0.7, x + 0.7, z - 0.35, z + 0.35, "totem");
}

/** High-Tech Holographic Security Core Pedestal */
function buildHolographicPedestal(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const metalMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.92, roughness: 0.18 });
  const woodMat  = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.5 });
  // Vivid cyan #4FF2E0 glass containment matching aurora/ceiling accent
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x4ff2e0, transparent: true, opacity: 0.4, roughness: 0.08, metalness: 0.8 });
  const goldMat  = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.92, roughness: 0.2 });
  // Bright magenta-pink #FF3EC8 base glow material
  const baseMagentaMat = new THREE.MeshStandardMaterial({
    color: 0xff3ec8,
    emissive: 0xff3ec8,
    emissiveIntensity: 0.45,
    metalness: 0.85,
    roughness: 0.25,
  });

  // Hexagonal Base — magenta-pink glow at base
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.35, 6), baseMagentaMat);
  base1.position.y = 0.175;
  g.add(base1);

  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.45, 6), woodMat);
  base2.position.y = 0.575;
  g.add(base2);

  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 0.1, 6), metalMat);
  topPlate.position.y = 0.85;
  g.add(topPlate);

  // Vivid cyan glass containment cylinder
  const glassCol = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.2, 16), glassMat);
  glassCol.position.y = 1.5;
  g.add(glassCol);

  // Top cap
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.15, 6), metalMat);
  topCap.position.y = 2.175;
  g.add(topCap);

  // Floating Rotating Geometric Architectural Core
  const holoCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 1), goldMat);
  holoCore.position.y = 1.5;
  g.add(holoCore);

  const innerCube = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), metalMat);
  innerCube.position.y = 1.5;
  g.add(innerCube);

  // Vivid cyan interior illumination #4FF2E0 matching ceiling aurora
  const hLight = new THREE.PointLight(0x4ff2e0, 0.80, 5.0);
  hLight.position.y = 1.5;
  g.add(hLight);

  // Magenta-pink base glow light #FF3EC8 for cyan-to-magenta gradient
  const baseLight = new THREE.PointLight(0xff3ec8, 0.60, 3.5);
  baseLight.position.y = 0.3;
  g.add(baseLight);

  scene.add(g);
  addCollisionBox(x - 0.85, x + 0.85, z - 0.85, z + 0.85, "holo_pedestal");
}

/** Framed Modern Abstract Art piece on wall */
function buildWallArtPiece(scene, x, y, z, rotY, w = 2.6, h = 3.4, themeIndex = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const canvasMat = new THREE.MeshBasicMaterial({ map: createModernArtCanvasTexture(themeIndex) });
  const frameMat  = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.88, roughness: 0.25 });
  const walnutMat = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.55 });

  // Outer Walnut Shadowbox Frame
  const shadowbox = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, h + 0.16, 0.08), walnutMat);
  shadowbox.position.z = -0.04;
  g.add(shadowbox);

  // Brass Inner Frame
  const brassFrame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, h + 0.04, 0.06), frameMat);
  brassFrame.position.z = -0.01;
  g.add(brassFrame);

  // Art Canvas
  const artMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), canvasMat);
  artMesh.position.z = 0.025;
  g.add(artMesh);

  // Wall-mounted picture spotlight sconce above frame
  const sconceArm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 8), frameMat);
  sconceArm.rotation.x = Math.PI / 2;
  sconceArm.position.set(0, h / 2 + 0.25, 0.18);
  g.add(sconceArm);

  const sconceHead = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.05, 0.08), frameMat);
  sconceHead.position.set(0, h / 2 + 0.25, 0.36);
  g.add(sconceHead);

  const artLight = new THREE.PointLight(0xffeed8, 0.65, 4.0);
  artLight.position.set(0, h / 2 + 0.15, 0.45);
  g.add(artLight);

  scene.add(g);
}

/** Modern Walnut & Brushed Silver Espresso & Refreshment Station */
function buildEspressoLoungeBar(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const woodMat   = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.5 });
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xded8d0, roughness: 0.2, metalness: 0.1 });
  const steelMat  = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9, roughness: 0.2 });
  const leatherMat = new THREE.MeshStandardMaterial({ color: P.leatherWarm, roughness: 0.45 });

  // Main Counter Island (Length 3.2m, Height 0.95m)
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 0.9), woodMat);
  counterBase.position.y = 0.45;
  g.add(counterBase);

  // Countertop (White Marble / Brushed Quartz)
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.06, 1.0), marbleMat);
  counterTop.position.y = 0.93;
  g.add(counterTop);

  // Espresso Machine
  const espressoMachine = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 0.45), steelMat);
  espressoMachine.position.set(-0.8, 1.18, 0);
  g.add(espressoMachine);

  // Coffee cups & accessories
  [-0.3, -0.15, 0].forEach(cx => {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), marbleMat);
    cup.position.set(cx, 0.99, 0.1);
    g.add(cup);
  });

  // Modern Barstools (3 stools)
  [-1.0, 0, 1.0].forEach(sx => {
    const stool = new THREE.Group();
    stool.position.set(sx, 0, 0.85);

    // Leather round cushion
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16), leatherMat);
    seat.position.y = 0.68;
    stool.add(seat);

    // Stem and base
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.64, 8), steelMat);
    stem.position.y = 0.32;
    stool.add(stem);

    const sBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 16), steelMat);
    sBase.position.y = 0.02;
    stool.add(sBase);

    g.add(stool);
  });

  scene.add(g);
  addCollisionBox(x - 1.7, x + 1.7, z - 0.6, z + 1.2, "espresso_bar");
}

/** Modern Walnut & Steel Architectural Bookshelf Unit */
function buildBookshelfStorageUnit(scene, x, z, rotY = 0) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const frameMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.85, roughness: 0.25 });
  const shelfMat = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.55 });
  const bookColors = [0x7a482b, 0x34495e, 0x2c3e50, 0x8a5434, 0xd4af37, 0x27ae60];

  const w = 3.2, h = 2.6, d = 0.45;

  // Vertical steel side uprights
  [-w / 2 + 0.04, w / 2 - 0.04].forEach(ux => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, d), frameMat);
    post.position.set(ux, h / 2, 0);
    g.add(post);
  });

  // Shelves at 5 vertical tiers
  for (let s = 0; s < 5; s++) {
    const sy = 0.15 + s * 0.55;
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), shelfMat);
    shelf.position.set(0, sy, 0);
    g.add(shelf);

    // Add books, binders, and succulent decor on each tier
    for (let b = 0; b < 6; b++) {
      const bx = -w / 2 + 0.4 + b * 0.45 + (Math.random() - 0.5) * 0.08;
      const bH = 0.25 + Math.random() * 0.18;
      const bW = 0.06 + Math.random() * 0.12;
      const bMat = new THREE.MeshStandardMaterial({ color: bookColors[(s * 3 + b) % bookColors.length], roughness: 0.7 });
      const book = new THREE.Mesh(new THREE.BoxGeometry(bW, bH, 0.26), bMat);
      book.position.set(bx, sy + bH / 2 + 0.02, 0);
      g.add(book);
    }
  }

  scene.add(g);
  addCollisionBox(x - w / 2 - 0.1, x + w / 2 + 0.1, z - d / 2 - 0.1, z + d / 2 + 0.1, "bookshelf");
}

/** Data Center Server Rack banks (refined titanium & silver styling) */
function buildDataCenterServerAisles(scene) {
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x485260, metalness: 0.8, roughness: 0.25 });
  const trimMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.95, roughness: 0.15 });
  const faceMat = new THREE.MeshBasicMaterial({ map: createServerRackFaceTexture(), side: THREE.DoubleSide });
  const cableMat = new THREE.MeshStandardMaterial({ color: 0x242e3a, roughness: 0.75, metalness: 0.2 });

  // 1. Left server corridor bank: X = -11.5, Z = 0.0 to 20.0 (clean side placement)
  for (let z = 0.0; z <= 20.0; z += 4.0) {
    const rackG = new THREE.Group();
    rackG.position.set(-11.5, 0, z);

    // Chassis body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.6, 4.8, 3.4), rackMat);
    body.position.y = 2.4;
    rackG.add(body);

    // Brushed silver corner extrusions (all 4 vertical corners)
    [[-0.78, -1.68], [-0.78, 1.68], [0.78, -1.68], [0.78, 1.68]].forEach(([ex, ez]) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.8, 0.06), trimMat);
      edge.position.set(ex, 2.4, ez);
      rackG.add(edge);
    });

    // Front face panel facing towards center aisle (+X)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.6), faceMat);
    face.position.set(0.81, 2.4, 0);
    face.rotation.y = Math.PI / 2;
    rackG.add(face);

    // Top brushed metal edge trim
    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 3.4), trimMat);
    topStrip.position.set(0.82, 4.75, 0);
    rackG.add(topStrip);

    // Top cable gantry with industrial cable conduit
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 3.5), rackMat);
    tray.position.set(0, 4.88, 0);
    rackG.add(tray);

    const cable1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.5), cableMat);
    cable1.position.set(-0.2, 4.96, 0);
    rackG.add(cable1);
    const cable2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 3.5), cableMat);
    cable2.position.set(0.2, 4.96, 0);
    rackG.add(cable2);

    scene.add(rackG);
    addCollisionBox(-12.4, -10.6, z - 1.75, z + 1.75, "server_rack_l");
  }

  // 2. Rear server flanking arrays: Z = 23.0
  // Left rear array: X = -13.5 to -8.5
  for (let x = -13.5; x <= -8.5; x += 3.2) {
    const rG = new THREE.Group();
    rG.position.set(x, 0, 23.0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.8, 1.4), rackMat);
    body.position.y = 2.4;
    rG.add(body);

    // Silver corner extrusions
    [[-1.38, -0.68], [1.38, -0.68], [-1.38, 0.68], [1.38, 0.68]].forEach(([ex, ez]) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.8, 0.06), trimMat);
      edge.position.set(ex, 2.4, ez);
      rG.add(edge);
    });

    // Face panel facing player (-Z)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.6), faceMat);
    face.position.set(0, 2.4, -0.71);
    face.rotation.y = Math.PI; // Face towards -Z (Player)
    rG.add(face);

    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), trimMat);
    topStrip.position.set(0, 4.75, -0.72);
    rG.add(topStrip);

    scene.add(rG);
    addCollisionBox(x - 1.45, x + 1.45, 22.2, 23.8, "server_rack_rear_l");
  }

  // Right rear array: X = 8.5 to 13.5
  for (let x = 8.5; x <= 13.5; x += 3.2) {
    const rG = new THREE.Group();
    rG.position.set(x, 0, 23.0);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 4.8, 1.4), rackMat);
    body.position.y = 2.4;
    rG.add(body);

    [[-1.38, -0.68], [1.38, -0.68], [-1.38, 0.68], [1.38, 0.68]].forEach(([ex, ez]) => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 4.8, 0.06), trimMat);
      edge.position.set(ex, 2.4, ez);
      rG.add(edge);
    });

    // Face panel facing player (-Z)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 4.6), faceMat);
    face.position.set(0, 2.4, -0.71);
    face.rotation.y = Math.PI; // Face towards -Z (Player)
    rG.add(face);

    const topStrip = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.08), trimMat);
    topStrip.position.set(0, 4.75, -0.72);
    rG.add(topStrip);

    scene.add(rG);
    addCollisionBox(x - 1.45, x + 1.45, 22.2, 23.8, "server_rack_rear_r");
  }
}

/** Seated sci-fi operative at command workstation */
function buildSeatedOperatorOperative(scene, x, y, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = rotY;

  const suitMat = new THREE.MeshStandardMaterial({ color: 0x1e2430, roughness: 0.6 });
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x2c3444, metalness: 0.8, roughness: 0.2 });
  const visorMat = new THREE.MeshBasicMaterial({ color: P.blue });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xc89d7c, roughness: 0.7 });

  // Pelvis / thighs seated
  const thighs = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.42), suitMat);
  thighs.position.set(0, 0.50, 0.15);
  g.add(thighs);

  // Calves down to floor
  [-0.11, 0.11].forEach(lx => {
    const calf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.44, 0.12), suitMat);
    calf.position.set(lx, 0.24, 0.32);
    g.add(calf);
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.10, 0.22), armorMat);
    boot.position.set(lx, 0.05, 0.36);
    g.add(boot);
  });

  // Torso leaning slightly forward
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.52, 0.24), suitMat);
  torso.position.set(0, 0.82, 0.04);
  torso.rotation.x = 0.08;
  g.add(torso);

  // Chest armor plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.06), armorMat);
  chestPlate.position.set(0, 0.84, 0.16);
  chestPlate.rotation.x = 0.08;
  g.add(chestPlate);

  // Head with headset and cyan visor
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.20), skinMat);
  head.position.set(0, 1.22, 0.06);
  g.add(head);

  const hair = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.22), armorMat);
  hair.position.set(0, 1.30, 0.05);
  g.add(hair);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.04), visorMat);
  visor.position.set(0, 1.22, 0.16);
  g.add(visor);

  // Arms reaching forward to keyboard
  [-0.22, 0.22].forEach(ax => {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), armorMat);
    shoulder.position.set(ax, 1.02, 0.04);
    g.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.26, 0.09), suitMat);
    upperArm.position.set(ax, 0.90, 0.14);
    upperArm.rotation.x = 0.6;
    g.add(upperArm);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), suitMat);
    forearm.position.set(ax * 0.9, 0.78, 0.30);
    forearm.rotation.x = 1.35;
    g.add(forearm);
  });

  scene.add(g);
}

/** Operator swivel chair for command desk */
function buildOperatorDeskChair(parentGroup, x, z) {
  const cg = new THREE.Group();
  cg.position.set(x, 0, z);

  const mat = new THREE.MeshStandardMaterial({ color: P.leatherWarm, roughness: 0.45 });
  const frameMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9, roughness: 0.2 });

  // Seat
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.08, 0.54), mat);
  seat.position.y = 0.48;
  cg.add(seat);

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.70, 0.06), mat);
  back.position.set(0, 0.86, -0.24);
  back.rotation.x = 0.1;
  cg.add(back);

  // Armrests
  [-0.30, 0.30].forEach(ax => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), frameMat);
    post.position.set(ax, 0.58, -0.06);
    cg.add(post);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, 0.26), mat);
    pad.position.set(ax, 0.69, -0.06);
    cg.add(pad);
  });

  // Stem & base
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12), frameMat);
  stem.position.y = 0.26;
  cg.add(stem);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), frameMat);
  base.position.y = 0.08;
  cg.add(base);

  parentGroup.add(cg);
}

/** Central Panoramic Command Console Desk with Multi-Monitor Screen Array */
function buildCentralCommandStation(scene, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);

  const consoleMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.25, metalness: 0.6 });
  const trimMat    = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.9, roughness: 0.2 });
  const woodTrim   = new THREE.MeshStandardMaterial({ color: P.wallBrown, roughness: 0.55 });
  const brassTrim  = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });

  // 1. Center main desk
  const centerDesk = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.08, 1.35), consoleMat);
  centerDesk.position.set(0, 0.74, 0);
  g.add(centerDesk);

  // Walnut edge trim along front
  const frontWood = new THREE.Mesh(new THREE.BoxGeometry(4.44, 0.09, 0.06), woodTrim);
  frontWood.position.set(0, 0.74, -0.68);
  g.add(frontWood);

  // Desk shadow reveal line
  const underGlow = new THREE.Mesh(new THREE.BoxGeometry(4.42, 0.03, 1.37), brassTrim);
  underGlow.position.set(0, 0.70, 0);
  g.add(underGlow);

  // Center chassis cabinet
  const baseCab = new THREE.Mesh(new THREE.BoxGeometry(4.1, 0.68, 0.95), consoleMat);
  baseCab.position.set(0, 0.35, 0.1);
  g.add(baseCab);

  // Left & Right angled console wings
  [-2.6, 2.6].forEach((wx, side) => {
    const angle = side === 0 ? 0.32 : -0.32;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 1.25), consoleMat);
    wing.position.set(wx, 0.74, 0.22);
    wing.rotation.y = angle;
    g.add(wing);

    const wingWood = new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.09, 0.06), woodTrim);
    wingWood.position.set(wx, 0.74, -0.42 + (side === 0 ? 0.05 : -0.05));
    wingWood.rotation.y = angle;
    g.add(wingWood);

    const wingGlow = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.03, 1.27), brassTrim);
    wingGlow.position.set(wx, 0.70, 0.22);
    wingGlow.rotation.y = angle;
    g.add(wingGlow);

    const wingCab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.68, 0.85), consoleMat);
    wingCab.position.set(wx, 0.35, 0.32);
    wingCab.rotation.y = angle;
    g.add(wingCab);
  });

  // 2. 4 Panoramic Curved High-Tech Displays facing -Z
  const screenTextures = createControlConsoleScreenTextures();
  const screenLayouts = [
    { x: -2.4, y: 1.28, z: 0.25, ry:  0.30, tex: screenTextures[0], glow: P.blue },
    { x: -0.85, y: 1.30, z: 0.02, ry:  0.08, tex: screenTextures[1], glow: P.pink },
    { x:  0.85, y: 1.30, z: 0.02, ry: -0.08, tex: screenTextures[2], glow: P.green },
    { x:  2.4, y: 1.28, z: 0.25, ry: -0.30, tex: screenTextures[3], glow: P.blue },
  ];

  screenLayouts.forEach(cfg => {
    const monGeo = new THREE.PlaneGeometry(1.55, 0.68, 24, 1);
    const posAttr = monGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setZ(i, posAttr.getX(i) ** 2 * 0.14);
    }
    monGeo.computeVertexNormals();

    const screenMesh = new THREE.Mesh(
      monGeo,
      new THREE.MeshBasicMaterial({ map: cfg.tex, side: THREE.DoubleSide })
    );
    screenMesh.position.set(cfg.x, cfg.y, cfg.z);
    screenMesh.rotation.y = cfg.ry + Math.PI; // Face -Z
    g.add(screenMesh);

    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.06), trimMat);
    stand.position.set(cfg.x, cfg.y - 0.32, cfg.z + 0.1);
    g.add(stand);

    const scLight = new THREE.PointLight(cfg.glow, 1.4, 5.0);
    scLight.position.set(cfg.x, cfg.y, cfg.z - 0.4);
    g.add(scLight);
  });

  // 3. Mechanical Keyboards & Accessories on Desk
  [-1.4, 0, 1.4].forEach(kx => {
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.005, 0.42), consoleMat);
    pad.position.set(kx, 0.785, -0.22);
    g.add(pad);

    const kb = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.02, 0.22),
      new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.4 })
    );
    kb.position.set(kx - 0.08, 0.795, -0.22);
    g.add(kb);

    const mouse = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.028, 0.05, 4, 8),
      new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.8 })
    );
    mouse.rotation.x = Math.PI / 2;
    mouse.position.set(kx + 0.30, 0.795, -0.22);
    g.add(mouse);
  });

  // 4. Operator Ergonomic Swivel Chairs & Seated Operatives
  const chairPositions = [
    { x: -1.4, z: -0.95 },
    { x:  0.0, z: -0.95 },
    { x:  1.4, z: -0.95 },
  ];

  chairPositions.forEach((cp, idx) => {
    buildOperatorDeskChair(g, cp.x, cp.z);
    if (idx === 0 || idx === 2) {
      buildSeatedOperatorOperative(scene, x + cp.x, 0, z + cp.z + 0.1, 0);
    }
  });

  scene.add(g);
  addCollisionBox(x - 4.2, x + 4.2, z - 1.4, z + 1.2, "command_station");
}

/** Left Wall with Acoustic Baffle Panels & Hot Pink Neon Backlighting */
function buildLeftAcousticBaffleWall(scene, z0, z1) {
  const wallLen = z1 - z0;
  const midZ = (z0 + z1) / 2;
  const wallX = -ROOM_W / 2 + 0.04;

  const panelMat = new THREE.MeshStandardMaterial({
    map: createAcousticWallPanelTexture(),
    roughness: 0.55,
    metalness: 0.35,
  });
  const pinkGlow = new THREE.MeshBasicMaterial({ color: P.pink });
  const blueGlow = new THREE.MeshBasicMaterial({ color: P.blue });

  const panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(wallLen, ROOM_H - 2.4), panelMat);
  panelMesh.position.set(wallX, 2.4 + (ROOM_H - 2.4) / 2, midZ);
  panelMesh.rotation.y = Math.PI / 2;
  scene.add(panelMesh);

  // Vertical Architectural Dark Steel Trim Battens — 3 refined reveals
  const battensMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85, roughness: 0.25 });
  [z0 + 9.0, z0 + 21.0, z0 + 31.0].forEach(z => {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, ROOM_H - 3.2, 0.06), battensMat);
    strip.position.set(wallX + 0.04, 2.4 + (ROOM_H - 2.4) / 2, z);
    scene.add(strip);
  });

  // 3 Illuminated Holographic Technical Schematic Panels on Wall Standoffs
  [z0 + 7.0, z0 + 17.0, z0 + 27.0].forEach(pz => {
    const scG = new THREE.Group();
    scG.position.set(wallX + 0.08, 4.2, pz);
    scG.rotation.y = Math.PI / 2;

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.4),
      new THREE.MeshBasicMaterial({
        map: createNeonSignTexture("SYSTEM DIAGNOSTICS // OPTICAL ROUTING", "#2fd1ff", "#2fd1ff"),
        transparent: true,
        opacity: 0.9,
      })
    );
    scG.add(glass);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(3.7, 2.5, 0.04),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85 })
    );
    frame.position.z = -0.03;
    scG.add(frame);

    const bBezel = new THREE.Mesh(
      new THREE.BoxGeometry(3.74, 0.04, 0.05),
      new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 })
    );
    bBezel.position.y = 1.27;
    scG.add(bBezel);

    scene.add(scG);
  });
}

/** Right Wall Transparent Glass Mezzanine Partition with Emerald Green Diagnostic HUD */
function buildRightGlassMezzanineWall(scene, z0, z1) {
  const wallX = 16.5;
  const glassTex = createHolographicGlassTexture();
  const glassMat = new THREE.MeshStandardMaterial({
    map: glassTex,
    transparent: true,
    opacity: 0.85,
    roughness: 0.1,
    metalness: 0.85,
    side: THREE.DoubleSide,
  });
  const frameMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.9, roughness: 0.2 });

  [z0 + 8.0, z0 + 18.0, z0 + 27.0].forEach(pz => {
    const gg = new THREE.Group();
    gg.position.set(wallX, 3.6, pz);
    gg.rotation.y = -Math.PI / 2;

    const gMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 4.8), glassMat);
    gg.add(gMesh);

    // Solid architectural dark steel framing around the glass partition
    const topF = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 0.12), frameMat);
    topF.position.y = 2.46;
    gg.add(topF);
    const botF = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.12, 0.12), frameMat);
    botF.position.y = -2.46;
    gg.add(botF);
    const leftF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.12), frameMat);
    leftF.position.x = -2.76;
    gg.add(leftF);
    const rightF = new THREE.Mesh(new THREE.BoxGeometry(0.12, 5.0, 0.12), frameMat);
    rightF.position.x = 2.76;
    gg.add(rightF);

    scene.add(gg);
  });
}

function buildGroundLobby(scene) {
  const Z0 = -6.0, Z1 = 30.0, ZMid = 12.0;

  // 1. Far Wall Backlit BLACKVAULT Billboard Sign with Glowing Shield Emblem
  buildBacklitBlackvaultSign(scene, 0, 5.8, 29.5);

  // 2. Data Center Server Racks (Left continuous aisle & rear wall arrays)
  buildDataCenterServerAisles(scene);

  // 4. Center Command Workstation Island with 4 Panoramic Displays & Operators
  buildCentralCommandStation(scene, 0, 12.5);

  // 5. Left Geometric Acoustic Baffle Wall with Hot Pink Backlighting & Schematics
  buildLeftAcousticBaffleWall(scene, Z0, Z1);

  // 6. Right Transparent Glass Mezzanine Wall with Emerald Green Diagnostic HUD
  buildRightGlassMezzanineWall(scene, Z0, Z1);

  // ── Aesthetic Room Additions: Executive Lounge, Planters, Totem & Core ──
  // 7. Executive Cognac Lounge on Right Entrance Corner (X = 9.0, Z = 2.5)
  buildExecutiveLounge(scene, 9.5, 2.5, -0.4);

  // 8. Architectural Planter Boxes
  buildArchitecturalPlanter(scene, -4.5, -3.5, 3.2, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  5.5, -3.5, 3.2, 0.8, 0.75);
  buildArchitecturalPlanter(scene, 14.5,  9.5, 2.8, 0.8, 0.75);

  // 9. Standing Wayfinding Directory Totem near entrance
  buildWayfindingTotem(scene, 3.8, -1.5, -0.3);

  // 10. High-Tech Holographic Security Core Pedestal
  buildHolographicPedestal(scene, -4.2, 3.5);

  // 11. Modern Framed Abstract Art on Walls
  buildWallArtPiece(scene, -ROOM_W / 2 + 0.12, 3.8, -1.0, Math.PI / 2, 2.8, 3.6, 0);
  buildWallArtPiece(scene,  ROOM_W / 2 - 0.12, 3.8, -1.0, -Math.PI / 2, 2.8, 3.6, 1);

  // 12. Modern Espresso & Refreshment Station on Right Wall
  buildEspressoLoungeBar(scene, 12.5, 17.5, -Math.PI / 2);


  // 13. Floor guide strips — architectural brass inlay expansion joints
  const floorInlayMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.85, roughness: 0.25 });
  floorStrip(scene, -1.8, 22.0, 30.0, floorInlayMat);
  floorStrip(scene,  1.8, 22.0, 30.0, floorInlayMat);

  // Main ambient room fill — cool cyan-white #E8F0FF matching ceiling palette
  const ambLight1 = new THREE.PointLight(0xe8f0ff, 0.75, 24);
  ambLight1.position.set(-4.0, 6.8, 5.0);
  scene.add(ambLight1);
  const ambLight2 = new THREE.PointLight(0xe8f0ff, 0.75, 24);
  ambLight2.position.set( 4.0, 6.8, 18.0);
  scene.add(ambLight2);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 1 — CLASSIFICATION LAB
// Open-plan workspace, cubicle farm, break corner — Burgundy identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor1Classification(scene) {
  const Z0 = 30.0, Z1 = 66.0, ZMid = 48.0;
  const accent = P.pink;
  const metalTrimMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });

  floorPlaqueMesh(scene, "1F", "Classification Lab", P.pink, 0, ROOM_H - 0.75, Z0 + 1.0, 6.5);
  deptWallPlaque(scene, "DATA SCIENCE DIVISION", "Classification & Prediction Systems", Z0 + 0.08, ROOM_H / 2, P.pink);

  // Dark wainscot on left wall with +0.035m offset to eliminate z-fighting
  const wainMat = new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.65 });
  const wain = new THREE.Mesh(new THREE.PlaneGeometry(Z1 - Z0, 1.2), wainMat);
  wain.position.set(-ROOM_W / 2 + 0.035, 0.6, ZMid);
  wain.rotation.y = Math.PI / 2;
  scene.add(wain);

  // Architectural metal strips at door threshold
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z1 - 6.0, Z1, metalTrimMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z1 - 6.0, Z1, metalTrimMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z1 - 4.0, Z1, metalTrimMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z1 - 4.0, Z1, metalTrimMat);

  // Near-neutral architectural fill from ceiling — colour comes from cubicle monitors
  const rl = new THREE.PointLight(0xfff4f8, 0.50, 32);
  rl.position.set(0, ROOM_H - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 0.50);

  // ── Cubicle farm (2 rows × 3 cubicles) ──────────────────────────────────
  const cubiclePositions = [
    { x: -6.0, z: Z0 + 7.0  }, { x: -6.0, z: Z0 + 15.0 }, { x: -6.0, z: Z0 + 23.0 },
    {  x: 6.0, z: Z0 + 7.0  }, {  x: 6.0, z: Z0 + 15.0 }, {  x: 6.0, z: Z0 + 23.0 },
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

  // ── Aesthetic Room Additions: Bookshelves, Planters & Wall Art ──────────
  buildBookshelfStorageUnit(scene, -ROOM_W / 2 + 3.0, Z0 + 10.0, Math.PI / 2);
  buildArchitecturalPlanter(scene, -ROOM_W / 2 + 3.0, Z0 + 18.0, 3.2, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  ROOM_W / 2 - 3.0, Z0 + 18.0, 3.2, 0.8, 0.75);
  buildWallArtPiece(scene, -ROOM_W / 2 + 0.12, 3.8, Z0 + 14.0, Math.PI / 2, 2.4, 3.2, 0);
  buildWallArtPiece(scene,  ROOM_W / 2 - 0.12, 3.8, Z0 + 14.0, -Math.PI / 2, 2.4, 3.2, 1);

  // ── Whiteboard on left wall ───────────────────────────────────────────────
  const wb = new THREE.Mesh(
    new THREE.PlaneGeometry(6.0, 3.0),
    new THREE.MeshStandardMaterial({ map: createWhiteboardTexture(), roughness: 0.3, metalness: 0.1 })
  );
  wb.position.set(-ROOM_W / 2 + 0.08, 2.8, ZMid + 3.0);
  wb.rotation.y = Math.PI / 2;
  scene.add(wb);
  const wbBar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.2, 6.2), metalTrimMat);
  wbBar.position.set(-ROOM_W / 2 + 0.03, 2.8, ZMid + 3.0);
  scene.add(wbBar);

  // ── Break corner (top right) ─────────────────────────────────────────────
  buildBreakCorner(scene, ROOM_W / 2 - 4.0, Z0 + 6.0);



  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, Z0 + 26.0, 0.1);
  makeOfficePlant(scene, ROOM_W / 2 - 2.5, Z0 + 28.0);
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 2 — REGRESSION LAB
// Server/data floor, cable trays, low ceiling — Dusty Pink identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor2Regression(scene) {
  const Z0 = 66.0, Z1 = 102.0, ZMid = 84.0;
  const accent = P.green;
  const metalTrimMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });
  const h = DATA_H;

  floorPlaqueMesh(scene, "2F", "Regression Lab", P.green, 0, h - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "DATA ENGINEERING FLOOR", "Server Infrastructure & Regression Systems", Z0 + 0.08, h / 2, P.green);

  // Architectural metal strips near the corridor door end
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z1 - 6.0, Z1, metalTrimMat, h);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z1 - 6.0, Z1, metalTrimMat, h);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z1 - 4.0, Z1, metalTrimMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z1 - 4.0, Z1, metalTrimMat);

  // Near-neutral ceiling fill — green character comes from server rack LEDs and pendant lights
  const rl = new THREE.PointLight(0xf0fff6, 0.50, 28);
  rl.position.set(0, h - 0.8, ZMid);
  scene.add(rl);
  registerFlickerLight(rl, 0.50);

  // Dense server rack arrays
  [Z0 + 6.0, Z0 + 14.0, Z0 + 22.0, Z0 + 29.0].forEach(rz => {
    buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, rz, accent);
    buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, rz, P.blue);
  });

  // Dark accent panel on left wall
  const pPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(12.0, h),
    new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.55, metalness: 0.1 })
  );
  pPanel.position.set(-ROOM_W / 2 + 0.04, h / 2, ZMid);
  pPanel.rotation.y = Math.PI / 2;
  scene.add(pPanel);
  const pBorder = new THREE.Mesh(new THREE.BoxGeometry(0.06, h + 0.04, 12.08), metalTrimMat);
  pBorder.position.set(-ROOM_W / 2 + 0.02, h / 2, ZMid);
  scene.add(pBorder);

  // Overhead cable tray
  const cabMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.88, roughness: 0.2 });
  const cableTray = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W - 8.0, 0.18, Z1 - Z0), cabMat);
  cableTray.position.set(0, h - 0.35, ZMid);
  scene.add(cableTray);

  // ── Aesthetic Room Additions: Planters, Bookshelves & Wall Art ──────────
  buildBookshelfStorageUnit(scene, -ROOM_W / 2 + 3.0, Z0 + 10.0, Math.PI / 2);
  buildArchitecturalPlanter(scene, -ROOM_W / 2 + 3.0, Z0 + 18.0, 2.8, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  ROOM_W / 2 - 3.0, Z0 + 18.0, 2.8, 0.8, 0.75);
  buildWallArtPiece(scene, -ROOM_W / 2 + 0.12, 3.4, Z0 + 8.0, Math.PI / 2, 2.2, 2.8, 1);

  // Pendant cone lights
  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.92 });
  [ZMid - 10.0, ZMid, ZMid + 10.0].forEach(pz => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 8), chromeMat);
    rod.position.set(0, h - 0.85, pz);
    scene.add(rod);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.32, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.6, side: THREE.DoubleSide })
    );
    shade.position.set(0, h - 1.35, pz);
    scene.add(shade);
    const pl = new THREE.PointLight(0xdfffe8, 1.2, 6);
    pl.position.set(0, h - 1.55, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.2);
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
    new THREE.MeshStandardMaterial({ map: createRegressionChartTexture(), roughness: 0.4, metalness: 0.2 })
  );
  chartMesh.position.set(ROOM_W / 2 - 0.08, 2.8, Z0 + 14.0);
  chartMesh.rotation.y = -Math.PI / 2;
  scene.add(chartMesh);

}


// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 3 — CLUSTERING HUB
// Executive boardroom floor — Brushed Gold identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor3Clustering(scene) {
  const Z0 = 102.0, Z1 = 138.0, ZMid = 120.0;
  const accent = P.blue;
  const metalTrimMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });

  floorPlaqueMesh(scene, "3F", "Clustering Hub", P.blue, 0, ROOM_H - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "EXECUTIVE BOARDROOM", "Strategic Clustering & Analysis Division", Z0 + 0.08, ROOM_H / 2, P.blue);

  // Drop ceiling inset over table area
  const dropMat = new THREE.MeshStandardMaterial({ color: P.wallAlt, roughness: 0.88, metalness: 0.02 });
  const dropCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W - 8.0, 18.0), dropMat);
  dropCeil.rotation.x = Math.PI / 2;
  dropCeil.position.set(0, 5.2, ZMid);
  scene.add(dropCeil);

  // Perimeter cornice molding
  const cornMat = new THREE.MeshStandardMaterial({ color: P.chrome, roughness: 0.3, metalness: 0.85 });
  [[-ROOM_W / 2 + 3.0, 0], [ROOM_W / 2 - 3.0, 0], [0, -9.0], [0, 9.0]].forEach(([ox, oz], i) => {
    const isLong = i < 2;
    const cornGeo = isLong
      ? new THREE.BoxGeometry(0.12, 0.28, 18.0)
      : new THREE.BoxGeometry(ROOM_W - 6.12, 0.28, 0.12);
    const corn = new THREE.Mesh(cornGeo, cornMat);
    corn.position.set(ox, 5.2 - 0.14, ZMid + oz);
    scene.add(corn);
  });

  // Architectural metal strips at presentation screen focal point
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z1 - 5.0, Z1, metalTrimMat, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z1 - 5.0, Z1, metalTrimMat, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z1 - 4.0, Z1, metalTrimMat);
  floorStrip(scene,  ROOM_W / 2 - 0.15, Z1 - 4.0, Z1, metalTrimMat);

  // Executive conference table
  const tableMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.18, metalness: 0.55 });
  const confTable = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.09, 16.0), tableMat);
  confTable.position.set(0, 0.78, ZMid);
  scene.add(confTable);
  const tableEdge = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.035, 16.02), metalTrimMat);
  tableEdge.position.set(0, 0.83, ZMid);
  scene.add(tableEdge);

  const chromeMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.93 });
  [[-1.4, ZMid - 7.0], [1.4, ZMid - 7.0], [-1.4, ZMid + 7.0], [1.4, ZMid + 7.0]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), chromeMat);
    leg.position.set(lx, 0.39, lz);
    scene.add(leg);
  });

  // Executive chairs
  [
    { x: -3.2, z: ZMid - 6.0, ry: Math.PI / 2 },
    { x: -3.2, z: ZMid - 2.0, ry: Math.PI / 2 },
    { x: -3.2, z: ZMid + 2.0, ry: Math.PI / 2 },
    { x: -3.2, z: ZMid + 6.0, ry: Math.PI / 2 },
    { x:  3.2, z: ZMid - 6.0, ry: -Math.PI / 2 },
    { x:  3.2, z: ZMid - 2.0, ry: -Math.PI / 2 },
    { x:  3.2, z: ZMid + 2.0, ry: -Math.PI / 2 },
    { x:  3.2, z: ZMid + 6.0, ry: -Math.PI / 2 },
  ].forEach(({ x, z, ry }) => buildSimpleChair(scene, x, z, ry, P.blue));

  // Pendant lights
  [ZMid - 6.0, ZMid, ZMid + 6.0].forEach(pz => {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6, 8), chromeMat);
    rod.position.set(0, ROOM_H - 0.8, pz);
    scene.add(rod);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.36, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.6, side: THREE.DoubleSide })
    );
    shade.position.set(0, ROOM_H - 1.75, pz);
    scene.add(shade);
    const pl = new THREE.PointLight(0xd4eaff, 1.4, 7);
    pl.position.set(0, ROOM_H - 1.95, pz);
    scene.add(pl);
    registerFlickerLight(pl, 1.4);
  });

  // Cluster presentation screen
  const presScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(7.0, 3.8),
    new THREE.MeshStandardMaterial({ map: createClusterTexture(), roughness: 0.35, metalness: 0.25 })
  );
  presScreen.position.set(0, 2.7, Z1 - 2.5);
  scene.add(presScreen);
  const scrLight = new THREE.PointLight(0xd4eaff, 1.2, 10);
  scrLight.position.set(0, 2.7, Z1 - 3.5);
  scene.add(scrLight);
  registerFlickerLight(scrLight, 1.2);

  // Break room on side
  buildCoffeeStation(scene, ROOM_W / 2 - 2.5, Z0 + 4.5);
  makeOfficePlant(scene, -ROOM_W / 2 + 2.5, Z0 + 4.0);
  makeOfficePlant(scene,  ROOM_W / 2 - 2.5, Z0 + 26.0);

  // ── Aesthetic Room Additions: Executive Lounge, Bookshelves & Wall Art ──
  buildExecutiveLounge(scene, -ROOM_W / 2 + 5.5, Z0 + 9.0, Math.PI / 3);
  buildBookshelfStorageUnit(scene, ROOM_W / 2 - 3.0, Z0 + 9.0, -Math.PI / 2);
  buildArchitecturalPlanter(scene, -ROOM_W / 2 + 3.0, Z0 + 22.0, 3.6, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  ROOM_W / 2 - 3.0, Z0 + 22.0, 3.6, 0.8, 0.75);
  buildWallArtPiece(scene, -ROOM_W / 2 + 0.12, 3.8, Z0 + 17.0, Math.PI / 2, 3.0, 3.6, 0);
  buildWallArtPiece(scene,  ROOM_W / 2 - 0.12, 3.8, Z0 + 17.0, -Math.PI / 2, 3.0, 3.6, 1);

}


// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 4 — ANOMALY WING
// Security operations center — Burgundy-Red danger identity
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor4AnomalyWing(scene) {
  const Z0 = 138.0, Z1 = 174.0, ZMid = 156.0;
  const red = P.pink, burg = P.wallAlt;

  floorPlaqueMesh(scene, "4F", "Anomaly Wing", P.pink, 0, ROOM_H - 0.75, Z0 + 1.0, 5.5);
  deptWallPlaque(scene, "SECURITY OPERATIONS CENTER", "Anomaly Detection & Threat Monitoring", Z0 + 0.08, ROOM_H / 2, P.pink);

  // THREAT LEVEL HIGH notice — printed sign on wall
  const threatSign = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 0.7), new THREE.MeshStandardMaterial({
    map: createNeonSignTexture("THREAT LEVEL: HIGH", "#FF2E9A", "#FF2E9A"),
    roughness: 0.35, metalness: 0.3
  }));
  threatSign.position.set(ROOM_W / 2 - 0.08, ROOM_H - 1.0, Z0 + 12.0);
  threatSign.rotation.y = -Math.PI / 2;
  scene.add(threatSign);

  // Architectural metal strips at threat screen focal wall
  const metalTrimMat4 = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.9, roughness: 0.2 });
  ceilStrip(scene, -ROOM_W / 2 + 0.35, Z1 - 5.0, Z1, metalTrimMat4, ROOM_H);
  ceilStrip(scene,  ROOM_W / 2 - 0.35, Z1 - 5.0, Z1, metalTrimMat4, ROOM_H);
  floorStrip(scene, -ROOM_W / 2 + 0.15, Z1 - 4.0, Z1, metalTrimMat4);

  // Near-neutral architectural fill
  const dl1 = new THREE.PointLight(0xfff2ee, 0.45, 30);
  dl1.position.set(0, ROOM_H - 0.8, ZMid);
  scene.add(dl1);
  registerFlickerLight(dl1, 0.45);

  // Security command arc (3 desks)
  [
    { x: -6.5, z: Z0 + 12.5, rotY:  0.35, col: P.blue },
    { x:  0.0, z: Z0 + 10.5, rotY:  0.0,  col: P.pink },
    { x:  6.5, z: Z0 + 12.5, rotY: -0.35, col: red    },
  ].forEach(({ x, z, rotY, col }) => {
    const ml = new THREE.PointLight(col, 2.0, 5);
    buildWorkstationDesk(scene, {
      x, z, rotY, accentColor: col,
      screenTexture: createLeftUltrawideScreenTexture(), monitorLight: ml,
    });
    registerFlickerLight(ml, 2.0);
  });

  // Lounge break area
  buildLoungeArea(scene, -ROOM_W / 2 + 4.5, Z0 + 7.0);

  // ── Aesthetic Room Additions: Planters, Bookshelves & Wall Art ──────────
  buildArchitecturalPlanter(scene, -ROOM_W / 2 + 3.2, Z0 + 11.0, 3.0, 0.8, 0.75);
  buildArchitecturalPlanter(scene,  ROOM_W / 2 - 3.2, Z0 + 11.0, 3.0, 0.8, 0.75);
  buildBookshelfStorageUnit(scene, ROOM_W / 2 - 3.0, Z0 + 26.0, -Math.PI / 2);
  buildWallArtPiece(scene, -ROOM_W / 2 + 0.12, 3.8, Z0 + 8.0, Math.PI / 2, 2.6, 3.2, 1);

  // Massive threat screen
  const threatMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(13.0, 4.0),
    new THREE.MeshStandardMaterial({ map: createThreatLevelTexture(), roughness: 0.35, metalness: 0.25 })
  );
  threatMesh.position.set(0, 2.8, Z1 - 2.2);
  scene.add(threatMesh);
  const twLight = new THREE.PointLight(STATUS_COLORS.locked, 1.8, 14);
  twLight.position.set(0, 2.8, Z1 - 3.5);
  scene.add(twLight);
  registerFlickerLight(twLight, 1.8);

  // Server banks
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 22.5, P.blue);
  buildServerRackGroup(scene, -ROOM_W / 2 + 1.2, Z0 + 16.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 22.5, red);
  buildServerRackGroup(scene,  ROOM_W / 2 - 1.2, Z0 + 16.5, P.blue);

  // Hazard caution stripes
  const cautionMat = new THREE.MeshBasicMaterial({
    map: createCautionStripeTexture(), transparent: true, opacity: 0.8,
  });
  [[-ROOM_W / 2 + 3.2, ZMid + 1.5], [ROOM_W / 2 - 3.2, ZMid + 1.5]].forEach(([cx, cz]) => {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 10.0), cautionMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(cx, 0.018, cz);
    scene.add(d);
  });

  buildCCTVProp(scene, 0, ROOM_H - 0.2, Z0 + 2.5, 0);
  buildCCTVProp(scene, -ROOM_W / 2 + 0.6, ROOM_H - 0.2, Z0 + 22.0, 0.38);

}


// ─────────────────────────────────────────────────────────────────────────────
// FLOOR 5 — THE VAULT (Mystery / Top Floor)
// Grand vault ceiling, mystery core, all three accents at climax
// ─────────────────────────────────────────────────────────────────────────────
function buildFloor5MysteryVault(scene) {
  const Z0 = 174.0, Z1 = 226.0, ZCore = 200.0;
  const vH = VAULT_H;

  floorPlaqueMesh(scene, "5F", "The Vault — Restricted", P.pink, 0, vH - 0.95, Z0 + 2.5, 7.0);

  // Grand entrance columns
  const colMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.88, roughness: 0.18 });
  const brassRingMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.92, roughness: 0.18 });

  [[-6.0, Z0 + 5.0], [6.0, Z0 + 5.0]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, vH, 16), colMat);
    col.position.set(cx, vH / 2, cz);
    scene.add(col);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.06, 8, 16),
      brassRingMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, 0.06, cz);
    scene.add(ring);

    const topRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.40, 0.06, 8, 16),
      brassRingMat
    );
    topRing.rotation.x = Math.PI / 2;
    topRing.position.set(cx, vH - 0.1, cz);
    scene.add(topRing);

    const bl = new THREE.PointLight(0xddeeff, 1.2, 7.0);
    bl.position.set(cx, 0.5, cz);
    scene.add(bl);
    registerFlickerLight(bl, 1.2);
  });

  // ── Aesthetic Room Additions: Planters & Holographic Pedestals ──────────
  buildArchitecturalPlanter(scene, -ROOM_W / 2 + 3.5, Z0 + 12.0, 3.8, 0.9, 0.85);
  buildArchitecturalPlanter(scene,  ROOM_W / 2 - 3.5, Z0 + 12.0, 3.8, 0.9, 0.85);
  buildHolographicPedestal(scene, -8.0, Z0 + 18.0);
  buildHolographicPedestal(scene,  8.0, Z0 + 18.0);

  // Ceiling dome ring
  const domeRing = new THREE.Mesh(
    new THREE.TorusGeometry(7.0, 0.12, 16, 48),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85, roughness: 0.3 })
  );
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, vH - 0.6, ZCore);
  scene.add(domeRing);

  // Spinning outer ring — gold
  mysteryOuterRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.5, 0.08, 12, 64),
    brassRingMat
  );
  mysteryOuterRing.rotation.x = Math.PI / 3;
  mysteryOuterRing.position.set(0, vH - 1.4, ZCore);
  scene.add(mysteryOuterRing);

  // Inner ring — chrome
  mysteryInnerRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.2, 0.06, 12, 48),
    colMat
  );
  mysteryInnerRing.rotation.x = -Math.PI / 4;
  mysteryInnerRing.position.set(0, 3.2, ZCore);
  scene.add(mysteryInnerRing);

  // Vault ambient fill
  const p1 = new THREE.PointLight(0xf4e0f4, 0.65, 22); p1.position.set(-8, 5.5, Z0 + 15); scene.add(p1); registerFlickerLight(p1, 0.65);
  const p2 = new THREE.PointLight(0xe0eeff, 0.65, 22); p2.position.set( 8, 5.5, Z0 + 15); scene.add(p2); registerFlickerLight(p2, 0.65);
  const p3 = new THREE.PointLight(0xe0fff4, 0.55, 20); p3.position.set( 0, 6.2, Z0 + 35); scene.add(p3); registerFlickerLight(p3, 0.55);

  // Octagonal pedestal
  const pedMat = new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.92, roughness: 0.14 });
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.6, 0.42, 8), pedMat);
  ped.position.set(0, 0.21, ZCore);
  scene.add(ped);

  const pedRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.3, 0.065, 16, 32),
    brassRingMat
  );
  pedRing.rotation.x = Math.PI / 2;
  pedRing.position.set(0, 0.42, ZCore);
  scene.add(pedRing);

  const pedLight = new THREE.PointLight(P.blue, 2.0, 10);
  pedLight.position.set(0, 0.5, ZCore);
  scene.add(pedLight);
  registerFlickerLight(pedLight, 2.0);

  // Mystery core — cyan wireframe icosahedron + glowing nucleus
  mysteryCoreMesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.1, 2),
    new THREE.MeshStandardMaterial({
      color: P.blue, emissive: P.blue, emissiveIntensity: 1.5, wireframe: true
    })
  );
  mysteryCoreMesh.position.set(0, 3.2, ZCore);
  scene.add(mysteryCoreMesh);

  // Inner nucleus
  mysteryCoreMesh.add(new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshStandardMaterial({ color: P.green, emissive: P.green, emissiveIntensity: 1.4 })
  ));

  // Containment pillars
  [
    { x: -4.2, z: ZCore - 4.2 }, { x: 4.2, z: ZCore - 4.2 },
    { x: -4.2, z: ZCore + 4.2 }, { x: 4.2, z: ZCore + 4.2 },
  ].forEach(({ x, z }, i) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 7.8, 16),
      new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.18 })
    );
    pillar.position.set(x, 3.9, z);
    scene.add(pillar);

    [[4.0], [0.06]].forEach(([yp]) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.35, 0.05, 8, 16),
        brassRingMat
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, yp, z);
      scene.add(ring);
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DOOR STATION (Puzzle terminal + blast doors)
// ─────────────────────────────────────────────────────────────────────────────
function createDoorStation(scene, doorType, x, z, wallH) {
  const color = doorColors[doorType] || P.pink;
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const DOOR_OPENING_W = 4.8;
  const DOOR_HALF = DOOR_OPENING_W / 2;
  const PORTAL_W = 5.2; // Width of the contrasting focal portal wall on each side
  const panelW = Math.max(0, ROOM_W / 2 - DOOR_HALF - PORTAL_W); // Remaining outer room wall

  // Color calculations for dual-state door leaves
  const hslColor = new THREE.Color(color);
  const hsl = {};
  hslColor.getHSL(hsl);

  // Closed/Locked State: Saturated accent with rich emissive glow
  const lockedLeafColor = new THREE.Color().setHSL(hsl.h, Math.max(0.60, hsl.s), 0.45);
  const lockedLeafEmissive = new THREE.Color().setHSL(hsl.h, Math.max(0.60, hsl.s), 0.28);

  // Unlocked/Open State: Bright, saturated version of accent with luminous emissive intensity
  const unlockedLeafColor = new THREE.Color().setHSL(hsl.h, Math.min(1.0, hsl.s * 1.15), 0.65);
  const unlockedLeafEmissive = new THREE.Color().setHSL(hsl.h, Math.min(1.0, hsl.s * 1.25), 0.45);

  // Materials
  // Portal-wall: warm architectural terracotta-gold (#b87848) — elegant and visible
  const portalWallMat = new THREE.MeshStandardMaterial({
    map: createBrushedSilverWallTexture(),
    color: 0xb87848,   // warm terracotta-gold — lit architectural panel
    roughness: 0.60,
    metalness: 0.15,
  });
  // Outer flanking wall: clean satin steel-titanium (#608298) — bright and architectural
  const outerWallMat = new THREE.MeshStandardMaterial({
    map: createWallNoiseTexture(),
    color: 0x608298,   // clean titanium-slate — bright, no black shadows
    roughness: 0.65,
    metalness: 0.18,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xa87850, // Warm bronze-gold architectural frame
    metalness: 0.85,
    roughness: 0.25,
  });
  const accentGlowMat = new THREE.MeshBasicMaterial({ color });
  const seamGlowMat = new THREE.MeshBasicMaterial({ color: STATUS_COLORS.locked });
  const trimMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.90, roughness: 0.20 });

  // 1. Contrasting Wall Section immediately framing the door (one door-width on each side)
  [-1, 1].forEach(side => {
    // Portal focal wall block
    const portalPanel = new THREE.Mesh(new THREE.BoxGeometry(PORTAL_W, wallH, 0.55), portalWallMat);
    portalPanel.position.set(side * (DOOR_HALF + PORTAL_W / 2), wallH / 2, 0);
    group.add(portalPanel);

    // Architectural vertical brass trim border separating portal wall from outer room wall
    const vTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallH, 0.58), trimMat);
    vTrim.position.set(side * (DOOR_HALF + PORTAL_W), wallH / 2, 0);
    group.add(vTrim);

    // Outer wall section
    if (panelW > 0.1) {
      const outerPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, wallH, 0.55), outerWallMat);
      outerPanel.position.set(side * (DOOR_HALF + PORTAL_W + panelW / 2), wallH / 2, 0);
      group.add(outerPanel);
    }

    // Baseboard skirt
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(PORTAL_W + panelW, 0.32, 0.58), frameMat);
    skirt.position.set(side * (DOOR_HALF + (PORTAL_W + panelW) / 2), 0.16, 0);
    group.add(skirt);
  });

  // Top header panel above door opening in portal material
  const headerH = wallH - 4.6;
  if (headerH > 0) {
    const header = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_OPENING_W + 0.72, headerH, 0.55),
      portalWallMat
    );
    header.position.set(0, 4.6 + headerH / 2, 0);
    group.add(header);
  }

  // Top cornice
  const fullCornice = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.22, 0.60), frameMat);
  fullCornice.position.set(0, wallH - 0.11, 0);
  group.add(fullCornice);

  // 2. Door Frame: Bright metal with thin glowing accent trim lines
  const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  leftPost.position.set(-2.58, 2.3, 0);
  group.add(leftPost);

  const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.36, 4.6, 0.65), frameMat);
  rightPost.position.set(2.58, 2.3, 0);
  group.add(rightPost);

  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.52, 0.38, 0.65), frameMat);
  topBeam.position.set(0, 4.41, 0);
  group.add(topBeam);

  // Thin glowing trim lines running along the door frame in floor accent color
  const leftFrameGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.6, 0.04), accentGlowMat);
  leftFrameGlow.position.set(-2.38, 2.3, 0.33);
  group.add(leftFrameGlow);

  const rightFrameGlow = new THREE.Mesh(new THREE.BoxGeometry(0.04, 4.6, 0.04), accentGlowMat);
  rightFrameGlow.position.set(2.38, 2.3, 0.33);
  group.add(rightFrameGlow);

  const topFrameGlow = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.04, 0.04), accentGlowMat);
  topFrameGlow.position.set(0, 4.20, 0.33);
  group.add(topFrameGlow);

  // Outer glowing LED pillars flanking door
  [-2.82, 2.82].forEach(px => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.6, 0.68), accentGlowMat);
    pillar.position.set(px, 2.3, 0.02);
    group.add(pillar);
  });

  // Hydraulic pistons
  [-1.6, 1.6].forEach(px => {
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12),
      new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.95 })
    );
    piston.position.set(px, 4.75, 0);
    group.add(piston);
  });

  // 3. Door Panels: High-tech luminous accent panels
  const doorLeafMat = new THREE.MeshStandardMaterial({
    color: lockedLeafColor,
    emissive: lockedLeafEmissive,
    emissiveIntensity: 0.35,
    metalness: 0.75,
    roughness: 0.25,
  });

  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.65, 4.3, 0.28), doorLeafMat);
  leftLeaf.position.set(-1.25, 2.15, 0);
  group.add(leftLeaf);

  for (let r = 0; r < 3; r++) {
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.1, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x547890, metalness: 0.85, roughness: 0.25 })
    );
    inset.position.set(-0.1, -1.2 + r * 1.3, 0.14);
    leftLeaf.add(inset);
  }
  const leftEdgeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 4.1, 0.32), seamGlowMat);
  leftEdgeGlow.position.set(1.30, 0, 0);
  leftLeaf.add(leftEdgeGlow);

  const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.65, 4.3, 0.28), doorLeafMat);
  rightLeaf.position.set(1.25, 2.15, 0);
  group.add(rightLeaf);

  for (let r = 0; r < 3; r++) {
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 1.1, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x547890, metalness: 0.85, roughness: 0.25 })
    );
    inset.position.set(0.1, -1.2 + r * 1.3, 0.14);
    rightLeaf.add(inset);
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
  deskGroup.position.set(3.2, 0, -0.75);
  deskGroup.rotation.y = Math.PI; // Screen faces -Z towards the chair!

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
  chairGroup.position.set(3.2, 0, -1.60);
  chairGroup.rotation.y = 0; // Chair faces +Z towards desk!

  const cMat = new THREE.MeshStandardMaterial({ color: P.furniture, roughness: 0.35 });
  const cSeat = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.62), pinkMat);
  cSeat.position.y = 0.48;
  chairGroup.add(cSeat);

  const cSeatTrim = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.02, 0.64), goldMat);
  cSeatTrim.position.y = 0.44;
  chairGroup.add(cSeatTrim);

  // Backrest behind player at -Z
  const cBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.07), cMat);
  cBack.position.set(0, 0.88, -0.28);
  cBack.rotation.x = 0.12;
  chairGroup.add(cBack);

  const backAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.60, 0.03),
    pinkMat
  );
  backAccent.position.set(0, 0, 0.03);
  cBack.add(backAccent);

  // Chair armrests
  [-0.32, 0.32].forEach(ax => {
    const armPost = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.24, 8), goldMat);
    armPost.position.set(ax, 0.60, -0.08);
    chairGroup.add(armPost);
    const armPad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, 0.28), cMat);
    armPad.position.set(ax, 0.72, -0.08);
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
  const seatPosition = new THREE.Vector3(3.2, 1.18, -1.60).applyMatrix4(group.matrixWorld);
  const seatLookAt   = new THREE.Vector3(3.2, 1.18, -0.75).applyMatrix4(group.matrixWorld);

  // ── Collision registrations for Door Station ─────────────────────────────
  // 1. Door terminal desk
  addCollisionBox(x + 2.2, x + 4.2, z - 1.25, z - 0.25, `door_desk_${doorType}`);
  // 2. Left flanking wall
  addCollisionBox(x - ROOM_W / 2, x - DOOR_HALF, z - 0.35, z + 0.35, `door_wall_l_${doorType}`);
  // 3. Right flanking wall
  addCollisionBox(x + DOOR_HALF, x + ROOM_W / 2, z - 0.35, z + 0.35, `door_wall_r_${doorType}`);
  // 4. Blast door portal barrier (active when door is locked)
  const barrierBox = addCollisionBox(x - DOOR_HALF, x + DOOR_HALF, z - 0.35, z + 0.35, `door_barrier_${doorType}`, true);

  doorRegistry[doorType] = {
    position: new THREE.Vector3(x + 3.2, 1.5, z - 1.18),
    group, leftLeaf, rightLeaf, leftEdgeGlow, rightEdgeGlow,
    doorLeafMat, lockedLeafColor, lockedLeafEmissive,
    unlockedLeafColor, unlockedLeafEmissive, themeColor: color,
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
  const trimMat = new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.88, roughness: 0.22 });

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

/** Ceiling architectural metal conduit strip */
function ceilStrip(scene, x, z0, z1, mat, h) {
  const len = z1 - z0;
  const standardMat = (mat && mat.isMeshStandardMaterial) ? mat : new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.85, roughness: 0.3 });
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, len), standardMat);
  s.position.set(x, h - 0.05, (z0 + z1) / 2);
  scene.add(s);
}

/** Floor-level architectural brass/metal inlay strip */
function floorStrip(scene, x, z0, z1, mat) {
  const len = z1 - z0;
  const standardMat = (mat && mat.isMeshStandardMaterial) ? mat : new THREE.MeshStandardMaterial({ color: P.gold, metalness: 0.85, roughness: 0.25 });
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, len), standardMat);
  s.position.set(x, 0.02, (z0 + z1) / 2);
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

  scene.add(ws);
  addCollisionBox(config.x - 1.5, config.x + 1.5, config.z - 0.75, config.z + 0.75, "workstation_desk");
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

/** Server rack tower with physical chassis slots and metallic rails */
function buildServerRackGroup(scene, x, z, accentColor) {
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 4.5, 3.5),
    new THREE.MeshStandardMaterial({ color: P.furniture, metalness: 0.88, roughness: 0.2 })
  );
  shelf.position.set(x, 2.25, z);
  scene.add(shelf);

  const slotMat = new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.75, roughness: 0.35 });
  const railMat = new THREE.MeshStandardMaterial({ color: P.chrome, metalness: 0.92, roughness: 0.18 });

  for (let r = 0; r < 7; r++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.46, 3.1),
      slotMat
    );
    slot.position.set(x + (x > 0 ? -0.61 : 0.61), 0.6 + r * 0.58, z);
    scene.add(slot);

    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.03, 3.12),
      railMat
    );
    rail.position.set(x + (x > 0 ? -0.62 : 0.62), 0.6 + r * 0.58 - 0.22, z);
    scene.add(rail);
  }

  // Collision box for server rack
  addCollisionBox(x - 0.7, x + 0.7, z - 1.85, z + 1.85, "server_rack");
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

    // 1. Chime - two bright rising tones
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
    oscGain.gain.setValueAtTime(0.18, ctx.currentTime);
    oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);

    // 2. Heavy pneumatic hiss + mechanical sub-bass servo
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1.8, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(1400, ctx.currentTime);
    filt.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 1.8);
    filt.Q.setValueAtTime(2.5, ctx.currentTime);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
    src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
    src.start();

    // 3. Sub-bass motor rumble
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = "triangle";
    subOsc.frequency.setValueAtTime(58, ctx.currentTime);
    subOsc.frequency.linearRampToValueAtTime(42, ctx.currentTime + 1.8);
    subGain.gain.setValueAtTime(0.25, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.8);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start();
    subOsc.stop(ctx.currentTime + 1.8);
  } catch (e) {}
}

export function playSecurityAlarmSFX() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    // Siren sweeps down and up
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.35);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.70);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 1.10);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 1.3);
  } catch (e) {}
}

export function playErrorBuzzerSFX() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.setValueAtTime(110, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.38);
  } catch (e) {}
}

function animateDoorLeaves(entry, duration = 6500, onDone) {
  const start = performance.now();
  const lStart = entry.leftLeaf.position.x;
  const rStart = entry.rightLeaf.position.x;
  // Wider target: panels slide fully clear of the frame opening
  const lTarget = -4.3, rTarget = 4.3;

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    // Smoothstep easing: gentle start, gentle finish — no abrupt deceleration snap
    // f(t) = t² × (3 − 2t)  — classic GLSL smoothstep
    const e = t * t * (3.0 - 2.0 * t);
    entry.leftLeaf.position.x  = lStart + (lTarget - lStart) * e;
    entry.rightLeaf.position.x = rStart + (rTarget - rStart) * e;

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      entry.leftLeaf.position.x = lTarget;
      entry.rightLeaf.position.x = rTarget;
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

// ── Exported State Management ──────────────────────────────────────────────

export function getDoorRegistry() { return doorRegistry; }
export function getExitDoor()     { return exitDoor; }


export function setDoorActiveState(doorType, isActive, isUnlocked = false) {
  const entry = doorRegistry[doorType];
  if (!entry) return;
  entry.isActive = isActive;
  entry.isUnlocked = isUnlocked;
  const themeColor = entry.themeColor || doorColors[doorType] || P.pink;

  if (isUnlocked) {
    if (entry.doorLeafMat) {
      entry.doorLeafMat.color.copy(entry.unlockedLeafColor);
      entry.doorLeafMat.emissive.copy(entry.unlockedLeafEmissive);
      entry.doorLeafMat.emissiveIntensity = 0.85;
    }
    entry.glow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.leftEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    entry.rightEdgeGlow.material.color.setHex(STATUS_COLORS.unlocked);
    if (entry.doorLight) { entry.doorLight.color.setHex(STATUS_COLORS.unlocked); entry.doorLight.intensity = 2.8; }
    if (entry.screen) entry.screen.material.color.setHex(STATUS_COLORS.unlocked);
  } else if (isActive) {
    if (entry.doorLeafMat) {
      entry.doorLeafMat.color.copy(entry.lockedLeafColor);
      entry.doorLeafMat.emissive.copy(entry.lockedLeafEmissive);
      entry.doorLeafMat.emissiveIntensity = 0.35;
    }
    entry.glow.material.color.setHex(themeColor);
    entry.leftEdgeGlow.material.color.setHex(themeColor);
    entry.rightEdgeGlow.material.color.setHex(themeColor);
    if (entry.doorLight) { entry.doorLight.color.setHex(themeColor); entry.doorLight.intensity = 2.2; }
    if (entry.screen) entry.screen.material.color.setHex(themeColor);
  } else {
    if (entry.doorLeafMat) {
      entry.doorLeafMat.color.copy(entry.lockedLeafColor);
      entry.doorLeafMat.emissive.copy(entry.lockedLeafEmissive);
      entry.doorLeafMat.emissiveIntensity = 0.18;
    }
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

  // Deactivate physical door collision barrier immediately
  if (entry.barrierBox) entry.barrierBox.active = false;

  // Set door status to unlocked (sage green colors)
  setDoorActiveState(doorType, true, true);

  // Play rich synthesized pneumatic unlock sound
  playDoorUnlockSFX();

  // 1. Light flash: doorLight intensity bursts in sage green
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
      setTimeout(() => flashEl.classList.add("hidden"), 400);
    }, 200);
  }

  // ── Spark burst — 60 glowing particles exploding from the door frame ──
  // Additive blending means they bloom through the post-processing stack.
  spawnDoorSparkBurst(entry, getScene());

  // 2. Cinematic camera shot: smooth camera glide to frame the blast door directly
  let camRunning = false;
  if (worldCamera) {
    camRunning = true;
    const startPos = worldCamera.position.clone();
    const startQuat = worldCamera.quaternion.clone();
    const origFOV = worldCamera.fov;

    // Direct framing in front of the door (centered at eye height looking into next sector)
    const pushTargetPos = new THREE.Vector3(0, 1.85, entry.zDoor - 5.8);
    const pushLookAt = new THREE.Vector3(0, 2.15, entry.zDoor + 2.0);
    const lookMat = new THREE.Matrix4().lookAt(pushTargetPos, pushLookAt, worldCamera.up);
    const pushQuat = new THREE.Quaternion().setFromRotationMatrix(lookMat);

    const pushStart = performance.now();
    const pushDuration = 1000;

    function pushStep(now) {
      const t = Math.min(1, (now - pushStart) / pushDuration);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      worldCamera.position.lerpVectors(startPos, pushTargetPos, eased);
      worldCamera.quaternion.slerpQuaternions(startQuat, pushQuat, eased);
      worldCamera.fov = THREE.MathUtils.lerp(origFOV, 58, eased);
      worldCamera.updateProjectionMatrix();

      if (t < 1) {
        requestAnimationFrame(pushStep);
      } else {
        // Hold camera on the door for the full 6.5-second slide (5500ms),
        // then glide back over 700ms — camera returns only AFTER the door is fully open.
        setTimeout(() => {
          const retStart = performance.now();
          const retDuration = 700;
          function retStep(now2) {
            const t2 = Math.min(1, (now2 - retStart) / retDuration);
            const eased2 = 1 - Math.pow(1 - t2, 2);

            worldCamera.position.lerpVectors(pushTargetPos, startPos, eased2);
            worldCamera.quaternion.slerpQuaternions(pushQuat, startQuat, eased2);
            worldCamera.fov = THREE.MathUtils.lerp(58, origFOV, eased2);
            worldCamera.updateProjectionMatrix();

            if (t2 < 1) {
              requestAnimationFrame(retStep);
            } else {
              if (entry.doorLight) entry.doorLight.intensity = 2.4;
              if (onComplete) onComplete();
            }
          }
          requestAnimationFrame(retStep);
        }, 5500);
      }
    }
    requestAnimationFrame(pushStep);
  }

  // 3. Door leaves slide open slowly and fully — 6.5 seconds, smoothstep easing.
  //    Player watches every centimeter of travel. Camera holds until motion completes.
  animateDoorLeaves(entry, 6500, () => {
    setMaxZBound(entry.zDoor + 20.8);
    if (!camRunning) {
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
  if (auroraCeilingMaterial && auroraCeilingMaterial.uniforms) {
    auroraCeilingMaterial.uniforms.uTime.value += delta;
  }
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

// ── Helper: exported for spark burst ──────────────────────────────────
let _worldSceneRef = null;
export function setWorldSceneRef(s) { _worldSceneRef = s; }
function getScene() { return _worldSceneRef; }

// ── Spark Burst Particle Effect ────────────────────────────────────────
// Called when a door unlocks — shoots 60 additive-blended glowing sparks
// outward from the door frame in the room's accent colour.
// Particles use PointsMaterial + additive blending so they glow through bloom.
function spawnDoorSparkBurst(entry, scene) {
  if (!scene) return;

  const count = 60;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const vel = []; // velocity per particle

  const cx = entry.group ? entry.group.position.x : 0;
  const cy = 2.2;
  const cz = entry.zDoor || 0;

  for (let i = 0; i < count; i++) {
    pos[i * 3]     = cx;
    pos[i * 3 + 1] = cy;
    pos[i * 3 + 2] = cz;
    // Random spherical velocity — bias upward
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.random() * Math.PI;
    const speed = 2.5 + Math.random() * 4.5;
    vel.push(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.abs(Math.cos(phi)) * speed * 0.8 + 0.5,
      Math.sin(phi) * Math.sin(theta) * speed * 0.6
    );
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  const themeColor = entry.themeColor || 0x00f0ff;
  const mat = new THREE.PointsMaterial({
    color: themeColor,
    size: 0.12,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const sparks = new THREE.Points(geo, mat);
  scene.add(sparks);

  const startTime = performance.now();
  const duration  = 1100; // ms

  function animateSparks(now) {
    const t = (now - startTime) / duration;
    if (t >= 1) {
      scene.remove(sparks);
      geo.dispose();
      mat.dispose();
      return;
    }

    const posArr = geo.attributes.position.array;
    const dt = 0.016; // approximate frame step in world units
    for (let i = 0; i < count; i++) {
      posArr[i * 3]     += vel[i * 3]     * dt;
      posArr[i * 3 + 1] += vel[i * 3 + 1] * dt;
      posArr[i * 3 + 2] += vel[i * 3 + 2] * dt;
      vel[i * 3 + 1]    -= 9.8 * dt; // gravity
    }
    geo.attributes.position.needsUpdate = true;

    // Fade out with ease-in: slow start, accelerates toward end
    mat.opacity = 1.0 - t * t;
    mat.size = 0.12 * (1.0 - t * 0.5);

    requestAnimationFrame(animateSparks);
  }
  requestAnimationFrame(animateSparks);
}

