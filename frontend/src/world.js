// World: bright research-facility corridors with bi-parting automatic sliding doors.
// Each room has: white polished tile floor, off-white walls, fluorescent LED ceiling
// panels, server racks (beige/lab style), a computer workstation, and a
// two-panel automatic door that smoothly slides left+right when unlocked.

import * as THREE from "three";
import {
  createFloorTexture,
  createWallTexture,
  createKeyboardTexture,
  createLabSignTexture,
  createScreenTexture,
} from "./textures.js";

// ── Registry ─────────────────────────────────────────────────────────────────
const doorRegistry = {};
let exitDoor = null;
const roomDoors = [];

// Active door slide animations: { entry, progress 0→1 }
const doorAnimations = [];

// ── Room Specs ────────────────────────────────────────────────────────────────
const ROOM_SPECS = [
  {
    roomIndex: 1,
    name: "Sector 01 — Classification Hub",
    doorType: "classification",
    startZ: 8,
    endZ: -18,
    doorZ: -18,
    accentColor: 0x2ecc71,   // green
    lightColor: 0xd4f8e8,
    wallTint: 0xedf5f0,
  },
  {
    roomIndex: 2,
    name: "Sector 02 — Regression Core",
    doorType: "regression",
    startZ: -18,
    endZ: -48,
    doorZ: -48,
    accentColor: 0x2980b9,   // blue
    lightColor: 0xd0e8ff,
    wallTint: 0xeef2f8,
  },
  {
    roomIndex: 3,
    name: "Sector 03 — Clustering Lab",
    doorType: "clustering",
    startZ: -48,
    endZ: -78,
    doorZ: -78,
    accentColor: 0x8e44ad,   // purple
    lightColor: 0xeeddff,
    wallTint: 0xf2eef8,
  },
  {
    roomIndex: 4,
    name: "Sector 04 — Anomaly Lab",
    doorType: "anomaly",
    startZ: -78,
    endZ: -108,
    doorZ: -108,
    accentColor: 0xe67e22,   // orange
    lightColor: 0xffeedd,
    wallTint: 0xf8f2ee,
  },
  {
    roomIndex: 5,
    name: "Sector 05 — Core Vault",
    doorType: "mystery",
    startZ: -108,
    endZ: -138,
    doorZ: -138,
    accentColor: 0xe91e63,   // pink/red
    lightColor: 0xffd8e8,
    wallTint: 0xf8eef2,
  },
];

// ── World Init ────────────────────────────────────────────────────────────────
export function initWorld(scene) {
  const W = 22, H = 5.2;
  ROOM_SPECS.forEach((spec) => buildRoom(scene, spec, W, H));
}

// ── Per-frame door animation (call from main animation loop) ─────────────────
export function updateDoors(delta) {
  for (let i = doorAnimations.length - 1; i >= 0; i--) {
    const anim = doorAnimations[i];
    anim.progress = Math.min(1.0, anim.progress + delta * 1.4); // ~0.7s open time
    const t = easeInOutCubic(anim.progress);

    // Slide the two panels outward
    const entry = anim.entry;
    if (entry.panelLeft)  entry.panelLeft.position.x  = THREE.MathUtils.lerp(entry.panelLeft._startX,  entry.panelLeft._targetX,  t);
    if (entry.panelRight) entry.panelRight.position.x = THREE.MathUtils.lerp(entry.panelRight._startX, entry.panelRight._targetX, t);

    // Remove finished animations
    if (anim.progress >= 1.0) {
      doorAnimations.splice(i, 1);
    }
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ── Room Builder ──────────────────────────────────────────────────────────────
function buildRoom(scene, spec, W, H) {
  const length = Math.abs(spec.startZ - spec.endZ);
  const midZ = (spec.startZ + spec.endZ) / 2;

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.25,
    metalness: 0.05,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: createWallTexture(spec.wallTint),
    roughness: 0.85,
    metalness: 0.0,
  });

  const ceilMat = new THREE.MeshStandardMaterial({
    color: 0xf4f6f8,
    roughness: 0.9,
  });

  // 1. FLOOR
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, length), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, midZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // 2. CEILING
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, length), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, H, midZ);
  scene.add(ceiling);

  // 3. SIDE WALLS
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(length, H), wallMat);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-W / 2, H / 2, midZ);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(length, H), wallMat);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(W / 2, H / 2, midZ);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back wall (room 1 entrance)
  if (spec.roomIndex === 1) {
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    backWall.position.set(0, H / 2, spec.startZ + 0.05);
    scene.add(backWall);
    buildEntranceWindows(scene, spec.startZ, W, H);
  }

  // 4. CEILING FLUORESCENT STRIP LIGHTS
  buildCeilingLights(scene, spec, W, H, midZ, length);

  // 5. SERVER RACKS + BENCH (left wall)
  buildLabEquipment(scene, spec, W, midZ);

  // 6. ROOM LABEL SIGN
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 0.72),
    new THREE.MeshBasicMaterial({ map: createLabSignTexture(spec.name, spec.accentColor) })
  );
  sign.position.set(W / 2 - 0.06, 3.5, midZ);
  sign.rotation.y = -Math.PI / 2;
  scene.add(sign);

  // 7. MULTIPLE COMPUTER WORKSTATIONS (3 along left side + 1 at door)
  //    Row of computers facing the right wall, spaced along the room
  const rowZ = [midZ + 6, midZ + 0, midZ - 6];
  rowZ.forEach((rz) => {
    buildWorkstation(scene, {
      x: -W / 2 + 3.8,
      z: rz,
      screenColor: spec.accentColor,
      facingRight: true,  // faces +X (right side)
    });
  });

  // 8. WHITEBOARD on left wall
  buildWhiteboard(scene, spec, W, midZ + 4);

  // 9. FILING CABINETS cluster on right wall
  buildFilingCabinets(scene, W, midZ - 5);

  // 10. OFFICE PLANT near right wall
  buildPlant(scene, W / 2 - 1.5, midZ + 8);

  // 11. PRINTER / SCANNER station
  buildPrinter(scene, W / 2 - 1.8, midZ - 8, spec.accentColor);

  // 12. WATER COOLER near entrance/exit
  buildWaterCooler(scene, -W / 2 + 1.5, spec.startZ - 2.5);

  // 13. SECURITY PARTITION + BI-PARTING DOOR (at end of room)
  buildDoorWithStation(scene, spec, W, H);
}



// ── Entrance Windows ──────────────────────────────────────────────────────────
function buildEntranceWindows(scene, startZ, W, H) {
  // Window frame row — bright daylight sky visible
  const windowMat = new THREE.MeshBasicMaterial({ color: 0xa8d8f0, transparent: true, opacity: 0.55 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e0, roughness: 0.3, metalness: 0.6 });

  const panelW = 3.2, panelH = 2.4;
  const count = Math.floor(W / (panelW + 0.4));
  const totalW = count * panelW + (count - 1) * 0.4;
  const startX = -totalW / 2;

  for (let i = 0; i < count; i++) {
    const cx = startX + i * (panelW + 0.4) + panelW / 2;
    const win = new THREE.Mesh(new THREE.PlaneGeometry(panelW, panelH), windowMat);
    win.position.set(cx, H / 2 + 0.3, startZ + 0.08);
    scene.add(win);

    // Frame
    [[-panelW / 2, 0, 0.1, panelH + 0.06], [panelW / 2, 0, 0.1, panelH + 0.06],
     [0, -panelH / 2, panelW + 0.2, 0.1], [0, panelH / 2, panelW + 0.2, 0.1]].forEach(([fx, fy, fw, fh]) => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.06), frameMat);
      frame.position.set(cx + fx, H / 2 + 0.3 + fy, startZ + 0.06);
      scene.add(frame);
    });
  }

  // Sky gradient plane behind windows
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 4, H + 6),
    new THREE.MeshBasicMaterial({ color: 0x87ceeb })
  );
  sky.position.set(0, H / 2 + 1, startZ + 0.5);
  scene.add(sky);
}

// ── Ceiling Lights ────────────────────────────────────────────────────────────
function buildCeilingLights(scene, spec, W, H, midZ, length) {
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xe0e4ea, roughness: 0.5, metalness: 0.3 });
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0xfff8f0 }); // warm white LED

  const spacing = 8;
  const count = Math.ceil(length / spacing);
  for (let i = 0; i < count; i++) {
    const lz = midZ - length / 2 + (i + 0.5) * (length / count);

    // Recessed fixture housing
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 5.0), fixtureMat);
    fixture.position.set(0, H - 0.04, lz);
    scene.add(fixture);

    // LED tube emissive strip
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 4.6), tubeMat);
    tube.position.set(0, H - 0.1, lz);
    scene.add(tube);

    // Area light point
    const pt = new THREE.PointLight(0xfff5ee, 3.5, 22, 1.2);
    pt.position.set(0, H - 0.5, lz);
    pt.castShadow = false;
    scene.add(pt);

    // Colored accent strip matching door type
    const accent = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.025, 4.6),
      new THREE.MeshBasicMaterial({ color: spec.accentColor })
    );
    accent.position.set(0.14, H - 0.12, lz);
    scene.add(accent);
  }
}

// ── Lab Equipment ─────────────────────────────────────────────────────────────
function buildLabEquipment(scene, spec, W, midZ) {
  const rackMat = new THREE.MeshStandardMaterial({ color: 0xdce2ea, roughness: 0.45, metalness: 0.5 });
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x0a1628 });

  // Server racks along left wall
  for (let sz = midZ - 8; sz <= midZ + 8; sz += 8) {
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.85, 3.8, 2.2), rackMat);
    rack.position.set(-W / 2 + 0.52, 1.9, sz);
    rack.castShadow = true;
    scene.add(rack);

    // Rack unit panels
    for (let r = 0; r < 6; r++) {
      const unit = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.25, 0.04), new THREE.MeshStandardMaterial({ color: 0xccd4de, metalness: 0.7, roughness: 0.2 }));
      unit.position.set(-W / 2 + 0.52, 0.5 + r * 0.55, sz + 1.06);
      scene.add(unit);

      // Status LEDs
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6),
        new THREE.MeshBasicMaterial({ color: r % 3 === 0 ? spec.accentColor : 0x00cc66 }));
      led.position.set(-W / 2 + 0.52 - 0.3, 0.5 + r * 0.55, sz + 1.08);
      scene.add(led);
    }
  }

  // Lab bench on right wall
  const benchMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.05 });
  const bench = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.06, 0.8), benchMat);
  bench.position.set(W / 2 - 2.0, 0.92, midZ);
  bench.castShadow = true;
  bench.receiveShadow = true;
  scene.add(bench);

  // Bench legs
  const legMat = new THREE.MeshStandardMaterial({ color: 0xb0b8c0, metalness: 0.8, roughness: 0.2 });
  [[-2.8, -0.32], [-2.8, 0.32], [2.8, -0.32], [2.8, 0.32]].forEach(([lx, lz2]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.92, 0.06), legMat);
    leg.position.set(W / 2 - 2.0 + lx, 0.46, midZ + lz2);
    scene.add(leg);
  });

  // Monitor on bench
  const mon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.04), screenMat);
  mon.position.set(W / 2 - 2.0, 1.22, midZ + 0.36);
  scene.add(mon);
  const monLight = new THREE.PointLight(spec.accentColor, 0.8, 1.8);
  monLight.position.set(W / 2 - 2.0, 1.22, midZ + 0.2);
  scene.add(monLight);
}

// ── Bi-Parting Door + Workstation ──────────────────────────────────────────────
function buildDoorWithStation(scene, spec, W, H) {
  const doorZ = spec.doorZ;
  const doorType = spec.doorType;
  const accentHex = spec.accentColor;

  // Wall material — off-white
  const wallMat = new THREE.MeshStandardMaterial({ color: spec.wallTint, roughness: 0.85, metalness: 0.0 });
  // Steel frame
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc8d0da, roughness: 0.3, metalness: 0.75 });
  // Door panel — brushed steel with slight tint
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xd8dfe8, roughness: 0.2, metalness: 0.8 });

  const doorW = 3.6;       // total door opening width
  const doorH = 3.2;
  const halfPW = doorW / 2; // each panel width
  const sideW = (W - doorW) / 2;

  // --- Partition wall left & right of door opening ---
  const leftPart = new THREE.Mesh(new THREE.BoxGeometry(sideW, H, 0.35), wallMat);
  leftPart.position.set(-W / 2 + sideW / 2, H / 2, doorZ);
  scene.add(leftPart);

  const rightPart = new THREE.Mesh(new THREE.BoxGeometry(sideW, H, 0.35), wallMat);
  rightPart.position.set(W / 2 - sideW / 2, H / 2, doorZ);
  scene.add(rightPart);

  // Top lintel
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorW + 0.3, H - doorH - 0.05, 0.35), wallMat);
  lintel.position.set(0, doorH + (H - doorH) / 2, doorZ);
  scene.add(lintel);

  // --- Door outer frame (stainless steel border) ---
  const frameThick = 0.12;
  // Top bar
  const topBar = new THREE.Mesh(new THREE.BoxGeometry(doorW + frameThick * 2, frameThick, 0.18), frameMat);
  topBar.position.set(0, doorH + frameThick / 2, doorZ + 0.01);
  scene.add(topBar);
  // Side pillars
  [-doorW / 2 - frameThick / 2, doorW / 2 + frameThick / 2].forEach((px) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH + frameThick, 0.18), frameMat);
    pillar.position.set(px, doorH / 2, doorZ + 0.01);
    scene.add(pillar);
  });
  // Floor threshold
  const threshold = new THREE.Mesh(new THREE.BoxGeometry(doorW, 0.06, 0.18), frameMat);
  threshold.position.set(0, 0.03, doorZ + 0.01);
  scene.add(threshold);

  // --- Two bi-parting sliding panels ---
  // Left panel slides to the left (negative X)
  const leftPanel = new THREE.Mesh(
    new THREE.BoxGeometry(halfPW - 0.04, doorH, 0.12),
    panelMat.clone()
  );
  leftPanel.position.set(-halfPW / 2, doorH / 2, doorZ + 0.02);
  leftPanel.castShadow = true;
  leftPanel._startX = -halfPW / 2;
  leftPanel._targetX = -doorW - 0.3;  // slides fully into left wall pocket
  scene.add(leftPanel);

  // Right panel slides to the right (positive X)
  const rightPanel = new THREE.Mesh(
    new THREE.BoxGeometry(halfPW - 0.04, doorH, 0.12),
    panelMat.clone()
  );
  rightPanel.position.set(halfPW / 2, doorH / 2, doorZ + 0.02);
  rightPanel.castShadow = true;
  rightPanel._startX = halfPW / 2;
  rightPanel._targetX = doorW + 0.3;  // slides fully into right wall pocket
  scene.add(rightPanel);

  // Vertical center split line (hairline seam between the two panels)
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.015, doorH, 0.14), frameMat);
  seam.position.set(0, doorH / 2, doorZ + 0.025);
  scene.add(seam);

  // --- Colored LED status strip across top of door ---
  const ledStrip = new THREE.Mesh(
    new THREE.BoxGeometry(doorW - 0.1, 0.055, 0.08),
    new THREE.MeshBasicMaterial({ color: accentHex })
  );
  ledStrip.position.set(0, doorH - 0.04, doorZ + 0.1);
  scene.add(ledStrip);

  // Warm point light at doorway
  const doorLight = new THREE.PointLight(accentHex, 1.8, 7);
  doorLight.position.set(0, doorH - 0.2, doorZ + 1.0);
  scene.add(doorLight);

  // Small keypad panel on right pillar
  buildKeypad(scene, doorZ, doorW, accentHex);

  // --- Door wall pocket recesses (visual depth for panels to slide into) ---
  const pocketMat = new THREE.MeshStandardMaterial({ color: 0xbec8d0, roughness: 0.6, metalness: 0.4 });
  const leftPocket = new THREE.Mesh(new THREE.BoxGeometry(halfPW + 0.1, doorH + 0.1, 0.22), pocketMat);
  leftPocket.position.set(-W / 2 + sideW / 2, doorH / 2, doorZ);
  scene.add(leftPocket);
  const rightPocket = new THREE.Mesh(new THREE.BoxGeometry(halfPW + 0.1, doorH + 0.1, 0.22), pocketMat);
  rightPocket.position.set(W / 2 - sideW / 2, doorH / 2, doorZ);
  scene.add(rightPocket);
  // Cover pockets with wall face
  const lFace = new THREE.Mesh(new THREE.PlaneGeometry(sideW, H), wallMat);
  lFace.position.set(-W / 2 + sideW / 2, H / 2, doorZ - 0.18);
  scene.add(lFace);
  const rFace = new THREE.Mesh(new THREE.PlaneGeometry(sideW, H), wallMat);
  rFace.position.set(W / 2 - sideW / 2, H / 2, doorZ - 0.18);
  scene.add(rFace);

  // --- Computer workstation next to the door ---
  const deskX = -3.5;
  const deskZ = doorZ + 2.0;
  const chairZ = doorZ + 3.1;

  buildWorkstation(scene, {
    x: deskX,
    z: deskZ,
    screenColor: accentHex,
  });

  // --- Register door entry ─────────────────────────────────────────────────
  const entry = {
    roomIndex: spec.roomIndex,
    doorType,
    name: spec.name,
    // Interaction trigger (near chair)
    position: new THREE.Vector3(deskX, 1.5, chairZ),
    // Seated camera position & look
    deskPosition: new THREE.Vector3(deskX, 1.28, chairZ),
    deskLookAt: new THREE.Vector3(deskX, 1.45, deskZ - 0.2),
    seatPosition: new THREE.Vector3(deskX, 1.28, chairZ),
    seatLookAt: new THREE.Vector3(deskX, 1.45, deskZ - 0.2),
    doorCenter: new THREE.Vector3(0, 1.5, doorZ),
    panelLeft: leftPanel,
    panelRight: rightPanel,
    ledStrip,
    doorLight,
    isUnlocked: false,
  };

  doorRegistry[doorType] = entry;
  roomDoors.push(entry);
}

// ── Keypad ────────────────────────────────────────────────────────────────────
function buildKeypad(scene, doorZ, doorW, accentColor) {
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.4, metalness: 0.8 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.06), padMat);
  pad.position.set(doorW / 2 + 0.26, 1.28, doorZ + 0.14);
  scene.add(pad);

  // Screen glow
  const screenGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.06),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  screenGlow.rotation.y = -Math.PI / 12;
  screenGlow.position.set(doorW / 2 + 0.26, 1.36, doorZ + 0.18);
  scene.add(screenGlow);

  // Key dots
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const dot = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, 0.028, 0.01),
        new THREE.MeshStandardMaterial({ color: 0xc0c8d0, metalness: 0.5 })
      );
      dot.position.set(
        doorW / 2 + 0.26 + (col - 1) * 0.046,
        1.22 + (1 - row) * 0.046,
        doorZ + 0.175
      );
      scene.add(dot);
    }
  }
}

// ── Workstation ───────────────────────────────────────────────────────────────
function buildWorkstation(scene, { x, z, screenColor, facingRight = false }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  if (facingRight) g.rotation.y = -Math.PI / 2; // orient so monitor faces +X

  const legMat  = new THREE.MeshStandardMaterial({ color: 0xa8b0ba, metalness: 0.9, roughness: 0.15 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f3, roughness: 0.35, metalness: 0.05 });
  const DESK_Y  = 0.76;
  const DESK_TOP = DESK_Y + 0.04;

  // Desk surface
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.07, 1.1), deskMat);
  desk.position.y = DESK_Y;
  desk.castShadow = true;
  desk.receiveShadow = true;
  g.add(desk);

  // Desk legs
  [[-1.1, -0.42], [-1.1, 0.42], [1.1, -0.42], [1.1, 0.42]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.055, DESK_Y, 0.055), legMat);
    leg.position.set(lx, DESK_Y / 2, lz);
    g.add(leg);
  });

  // Cable tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.15), legMat);
  tray.position.set(0, DESK_Y - 0.1, -0.42);
  g.add(tray);

  // Widescreen curved monitor
  const monW = 1.85, monH = 0.62;
  const monGeo = new THREE.PlaneGeometry(monW, monH, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const nx = posAttr.getX(i) / (monW / 2);
    posAttr.setZ(i, nx * nx * 0.11);
  }
  monGeo.computeVertexNormals();
  const monScreen = new THREE.Mesh(monGeo, new THREE.MeshBasicMaterial({ map: createScreenTexture(screenColor) }));
  monScreen.position.set(0, DESK_TOP + 0.43, -0.12);
  g.add(monScreen);

  // Bezel + stand
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(monW + 0.06, monH + 0.05, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x1a1e24, roughness: 0.6, metalness: 0.4 }));
  bezel.position.set(0, DESK_TOP + 0.43, -0.14);
  g.add(bezel);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 8), legMat);
  pole.position.set(0, DESK_TOP + 0.18, -0.22);
  g.add(pole);
  const mbase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.025, 12), legMat);
  mbase.position.set(0, DESK_TOP + 0.012, -0.22);
  g.add(mbase);

  // Screen glow
  const screenLight = new THREE.PointLight(screenColor, 1.2, 3.0);
  screenLight.position.set(0, DESK_TOP + 0.44, 0.3);
  g.add(screenLight);

  // PC chassis
  const pc = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.38, 0.38),
    new THREE.MeshStandardMaterial({ color: 0xdde2e8, roughness: 0.2, metalness: 0.6 }));
  pc.position.set(0.9, DESK_TOP + 0.19, -0.08);
  g.add(pc);
  const pcAccent = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.34, 0.01),
    new THREE.MeshBasicMaterial({ color: screenColor }));
  pcAccent.position.set(0.027, 0, 0.17);
  pc.add(pcAccent);

  // Keyboard + mouse + pad
  const kb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.014, 0.195),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.4 }));
  kb.position.set(-0.1, DESK_TOP + 0.011, 0.3);
  g.add(kb);
  const mouse = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.022, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xe8eaec, roughness: 0.3, metalness: 0.1 }));
  mouse.position.set(0.27, DESK_TOP + 0.015, 0.3);
  g.add(mouse);
  const mousepad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x1a1e2a, roughness: 0.95 }));
  mousepad.position.set(0.22, DESK_TOP + 0.004, 0.3);
  g.add(mousepad);

  // Paper stack
  const paper = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.03, 0.22),
    new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.9 }));
  paper.position.set(-0.82, DESK_TOP + 0.018, 0.08);
  g.add(paper);

  // Coffee mug
  buildMug(g, DESK_TOP, screenColor);

  // Chair
  buildChair(g, legMat, 0, 0, 0.9);

  scene.add(g);
}


// ── Coffee Mug ────────────────────────────────────────────────────────────────
function buildMug(g, DESK_TOP, accentColor) {
  const mugMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0.0 });
  const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.09, 14), mugMat);
  mug.position.set(-0.85, DESK_TOP + 0.048, 0.28);
  g.add(mug);
  // Handle
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.022, 0.007, 6, 12, Math.PI),
    mugMat
  );
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.812, DESK_TOP + 0.048, 0.28);
  g.add(handle);
  // Accent stripe
  const stripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.0385, 0.0385, 0.018, 14),
    new THREE.MeshBasicMaterial({ color: accentColor })
  );
  stripe.position.set(-0.85, DESK_TOP + 0.057, 0.28);
  g.add(stripe);
}

// ── Office Chair ──────────────────────────────────────────────────────────────
function buildChair(parent, legMat, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const fabricMat = new THREE.MeshStandardMaterial({ color: 0xdde2e8, roughness: 0.75, metalness: 0.0 });
  const meshMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, roughness: 0.8 }); // mesh back
  const plasticMat = new THREE.MeshStandardMaterial({ color: 0x2c3040, roughness: 0.55, metalness: 0.3 });

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.09, 0.50), fabricMat);
  seat.position.y = 0.5;
  g.add(seat);

  // Seat edge trim
  const trim = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.025, 0.52), plasticMat);
  trim.position.y = 0.455;
  g.add(trim);

  // Backrest — mesh style
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.06), meshMat);
  back.position.set(0, 0.96, 0.22);
  back.rotation.x = -0.1;
  g.add(back);

  // Lumbar support
  const lumbar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.065), fabricMat);
  lumbar.position.set(0, 0.68, 0.245);
  lumbar.rotation.x = -0.1;
  g.add(lumbar);

  // Headrest
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.16, 0.07), fabricMat);
  head.position.set(0, 1.37, 0.245);
  head.rotation.x = 0.15;
  g.add(head);

  // Armrests
  [-0.3, 0.3].forEach((ax) => {
    const ar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.28), plasticMat);
    ar.position.set(ax, 0.72, 0.08);
    g.add(ar);
    const arPost = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.04), plasticMat);
    arPost.position.set(ax, 0.61, 0.08);
    g.add(arPost);
  });

  // Gas cylinder stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.44, 10), legMat);
  stem.position.y = 0.27;
  g.add(stem);

  // Five-star base
  const starBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 5), legMat);
  starBase.scale.x = 10;
  starBase.scale.z = 10;
  starBase.position.y = 0.03;
  g.add(starBase);

  // Caster wheels
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), plasticMat);
    wheel.position.set(Math.cos(angle) * 0.28, 0.042, Math.sin(angle) * 0.28);
    g.add(wheel);
  }

  parent.add(g);
}

// ── Whiteboard ────────────────────────────────────────────────────────────────
function buildWhiteboard(scene, spec, W, z) {
  const frameMat  = new THREE.MeshStandardMaterial({ color: 0xc8d0d8, metalness: 0.5, roughness: 0.35 });
  const boardMat  = new THREE.MeshStandardMaterial({ color: 0xfafbfc, roughness: 0.3 });
  const markerMat = new THREE.MeshStandardMaterial({ color: spec.accentColor });

  // Board panel
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.8, 0.05), boardMat);
  board.position.set(-W / 2 + 0.06, 2.1, z);
  board.rotation.y = Math.PI / 2;
  scene.add(board);

  // Frame
  const frameBox = new THREE.Mesh(new THREE.BoxGeometry(5.0, 2.0, 0.07), frameMat);
  frameBox.position.set(-W / 2 + 0.05, 2.1, z);
  frameBox.rotation.y = Math.PI / 2;
  scene.add(frameBox);

  // Marker tray
  const tray = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.06, 0.12), frameMat);
  tray.position.set(-W / 2 + 0.06, 1.2, z);
  tray.rotation.y = Math.PI / 2;
  scene.add(tray);

  // Drawn content: arrow + text lines (simple geometry)
  const r = (spec.accentColor >> 16) & 0xff;
  const g2 = (spec.accentColor >> 8) & 0xff;
  const b2 = spec.accentColor & 0xff;
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 192;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fafbfc";
  ctx.fillRect(0, 0, 512, 192);
  ctx.strokeStyle = `rgb(${r},${g2},${b2})`;
  ctx.lineWidth = 4;
  // Box diagram
  ctx.strokeRect(30, 30, 120, 70);
  ctx.strokeRect(200, 30, 120, 70);
  ctx.strokeRect(370, 30, 120, 70);
  // Arrows
  ctx.beginPath(); ctx.moveTo(150, 65); ctx.lineTo(200, 65); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(320, 65); ctx.lineTo(370, 65); ctx.stroke();
  // Labels
  ctx.fillStyle = `rgb(${r},${g2},${b2})`;
  ctx.font = "bold 20px Arial";
  ctx.fillText("INPUT", 45, 72);
  ctx.fillText("MODEL", 215, 72);
  ctx.fillText("OUTPUT", 378, 72);
  ctx.fillStyle = "#334155";
  ctx.font = "16px Arial";
  ctx.fillText("● Accuracy: 94.2%", 30, 135);
  ctx.fillText("● Loss: 0.058", 30, 158);
  ctx.fillText("● Epochs: 50", 30, 181);

  const tex = new THREE.CanvasTexture(canvas);
  const content = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.6), new THREE.MeshBasicMaterial({ map: tex }));
  content.position.set(-W / 2 + 0.085, 2.1, z);
  content.rotation.y = Math.PI / 2;
  scene.add(content);
}

// ── Filing Cabinets ────────────────────────────────────────────────────────────
function buildFilingCabinets(scene, W, z) {
  const cabinetMat = new THREE.MeshStandardMaterial({ color: 0xd0d8e4, roughness: 0.55, metalness: 0.4 });
  const handleMat  = new THREE.MeshStandardMaterial({ color: 0xa8b4c0, roughness: 0.3, metalness: 0.8 });

  for (let i = 0; i < 3; i++) {
    const cx = W / 2 - 0.5;
    const cz = z + i * 0.65;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.28, 0.58), cabinetMat);
    cab.position.set(cx, 0.64, cz);
    cab.castShadow = true;
    scene.add(cab);
    // Drawer handles
    for (let d = 0; d < 3; d++) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.025), handleMat);
      handle.position.set(cx, 0.22 + d * 0.36, cz + 0.3);
      scene.add(handle);
    }
    // Label slot
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.005), new THREE.MeshStandardMaterial({ color: 0xfafafa }));
    slot.position.set(cx - 0.08, 0.28, cz + 0.3);
    scene.add(slot);
  }
}

// ── Office Plant ──────────────────────────────────────────────────────────────
function buildPlant(scene, x, z) {
  const potMat  = new THREE.MeshStandardMaterial({ color: 0xc0785e, roughness: 0.8 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 1.0 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3a6b2a, roughness: 0.9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3d8c3a, roughness: 0.75, side: THREE.DoubleSide });

  // Pot
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.32, 12), potMat);
  pot.position.set(x, 0.16, z);
  scene.add(pot);
  // Soil
  const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 12), soilMat);
  soil.position.set(x, 0.34, z);
  scene.add(soil);
  // Stems + leaves
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const lean  = 0.12;
    const stem  = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.55 + Math.random() * 0.25, 6), stemMat);
    stem.position.set(x + Math.sin(angle) * lean, 0.64, z + Math.cos(angle) * lean);
    stem.rotation.z = Math.sin(angle) * 0.25;
    stem.rotation.x = Math.cos(angle) * 0.2;
    scene.add(stem);
    // Leaf
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(0.28 + Math.random() * 0.12, 0.14), leafMat);
    leaf.position.set(x + Math.sin(angle) * (lean + 0.14), 0.84 + Math.random() * 0.15, z + Math.cos(angle) * (lean + 0.14));
    leaf.rotation.y = angle; leaf.rotation.z = 0.4;
    scene.add(leaf);
  }
}

// ── Printer / Scanner ─────────────────────────────────────────────────────────
function buildPrinter(scene, x, z, accentColor) {
  const bodyMat  = new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.5, metalness: 0.3 });
  const screenMat2 = new THREE.MeshBasicMaterial({ color: accentColor });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.32, 0.52), bodyMat);
  body.position.set(x, 0.9, z);
  body.castShadow = true;
  scene.add(body);

  // Top lid / scanner glass
  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.04, 0.50), new THREE.MeshStandardMaterial({ color: 0xcdd4dc, roughness: 0.3 }));
  lid.position.set(x, 1.08, z);
  scene.add(lid);

  // Small screen panel
  const screen2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.01), screenMat2);
  screen2.position.set(x - 0.18, 0.94, z + 0.265);
  scene.add(screen2);

  // Paper output tray
  const tray2 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.025, 0.35), bodyMat);
  tray2.position.set(x, 0.76, z - 0.34);
  tray2.rotation.x = -0.25;
  scene.add(tray2);

  // Stand
  const standTop = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.54), new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 }));
  standTop.position.set(x, 0.745, z);
  scene.add(standTop);
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.60, 0.74, 0.52), new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.6 }));
  standBase.position.set(x, 0.37, z);
  scene.add(standBase);
}

// ── Water Cooler ──────────────────────────────────────────────────────────────
function buildWaterCooler(scene, x, z) {
  const bodyMat2 = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.45, metalness: 0.3 });
  const bottleMat = new THREE.MeshStandardMaterial({ color: 0xa8d8f0, transparent: true, opacity: 0.7, roughness: 0.15, metalness: 0.05 });
  const tapMat = new THREE.MeshStandardMaterial({ color: 0xc8d0da, metalness: 0.7, roughness: 0.3 });

  // Body
  const body2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 14), bodyMat2);
  body2.position.set(x, 0.5, z);
  body2.castShadow = true;
  scene.add(body2);

  // Water bottle
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 0.48, 14), bottleMat);
  bottle.position.set(x, 1.24, z);
  scene.add(bottle);
  // Bottle cap
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 10), new THREE.MeshStandardMaterial({ color: 0x3b82f6 }));
  cap.position.set(x, 1.50, z);
  scene.add(cap);

  // Drip tray
  const drip = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 14), tapMat);
  drip.position.set(x, 0.78, z);
  scene.add(drip);

  // Taps (hot=red, cold=blue)
  [[-0.07, 0xff4444], [0.07, 0x2288ff]].forEach(([tx, tc]) => {
    const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.065, 8), new THREE.MeshStandardMaterial({ color: tc, metalness: 0.6 }));
    tap.rotation.z = Math.PI / 2;
    tap.position.set(x + tx, 0.68, z + 0.21);
    scene.add(tap);
  });

  // Base
  const base2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.38), bodyMat2);
  base2.position.set(x, 0.035, z);
  scene.add(base2);
}

// ── Exports ───────────────────────────────────────────────────────────────────
export function getDoorRegistry() {
  return doorRegistry;
}

export function getRoomDoors() {
  return roomDoors;
}

export function getExitDoor() {
  return exitDoor;
}

/**
 * Unlock a door: start the bi-parting slide animation and change LED to green.
 */
export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (!entry || entry.isUnlocked) return;
  entry.isUnlocked = true;

  // Queue animation
  doorAnimations.push({ entry, progress: 0 });

  // Switch LED strip to bright green
  if (entry.ledStrip) entry.ledStrip.material.color.setHex(0x2ecc71);
  if (entry.doorLight) entry.doorLight.color.setHex(0x2ecc71);
}

export function getCurrentRoomIndex(playerZ) {
  for (const spec of ROOM_SPECS) {
    if (playerZ <= spec.startZ && playerZ >= spec.endZ) {
      return spec.roomIndex;
    }
  }
  return 1;
}
