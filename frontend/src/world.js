// High-detail 3D Studio Lab environment strictly matching reference photo.
// Features foreground workstations with curved ultrawide monitors facing camera,
// PC towers with RGB glass panels, mechanical keyboards, gaming chairs,
// glass conference room with illuminated whiteboards, night city skyline,
// industrial ceiling ducts, and glowing accent signage.

import * as THREE from "three";
import { DOOR_TYPES, BOSS_DOOR_TYPE, DOOR_LABELS } from "./config.js";
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

const doorRegistry = {};
let exitDoor = null;

const doorColors = {
  classification: 0x4caf50, // Neon Green
  regression: 0x2196f3,     // Neon Cyan / Blue
  clustering: 0x9c27b0,     // Neon Purple
  anomaly: 0xff9800,        // Neon Amber / Orange
  mystery: 0xe91e63,        // Neon Magenta
};

export function initWorld(scene) {
  const roomW = 28;
  const roomL = 32;
  const roomH = 5.4;

  // ── 1. ARCHITECTURAL SHELL ──
  const floorMat = new THREE.MeshStandardMaterial({
    map: createFloorTexture(),
    roughness: 0.18,
    metalness: 0.42,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomL), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceilMat = new THREE.MeshStandardMaterial({ color: 0x090d14, roughness: 0.85 });
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomL), ceilMat);
  ceiling.position.y = roomH;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  const wallMat = new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.75 });

  // Left Wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(roomL, roomH), wallMat);
  leftWall.position.set(-roomW / 2, roomH / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right Wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(roomL, roomH), wallMat);
  rightWall.position.set(roomW / 2, roomH / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // South Wall
  const southWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), wallMat);
  southWall.position.set(0, roomH / 2, roomL / 2);
  southWall.rotation.y = Math.PI;
  southWall.receiveShadow = true;
  scene.add(southWall);

  // ── 2. PANORAMIC NIGHT CITY SKYLINE (North Wall) ──
  const skylineMat = new THREE.MeshBasicMaterial({ map: createCitySkylineTexture() });
  const skyline = new THREE.Mesh(new THREE.PlaneGeometry(roomW + 10, roomH + 4), skylineMat);
  skyline.position.set(0, (roomH + 4) / 2 - 1, -roomL / 2 - 0.5);
  scene.add(skyline);

  // Glass Window Wall with black mullions
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c1626,
    transparent: true,
    opacity: 0.32,
    roughness: 0.04,
    metalness: 0.15,
    transmission: 0.84,
    ior: 1.52,
  });
  const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(roomW, roomH), glassMat);
  glassWall.position.set(0, roomH / 2, -roomL / 2 + 0.1);
  scene.add(glassWall);

  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0e141f, metalness: 0.85, roughness: 0.3 });
  for (let x = -roomW / 2 + 3.2; x < roomW / 2; x += 3.5) {
    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.14, roomH, 0.22), mullionMat);
    mullion.position.set(x, roomH / 2, -roomL / 2 + 0.12);
    scene.add(mullion);
  }

  // Cyan glowing LED strip running above window
  const cyanStrip = new THREE.Mesh(
    new THREE.BoxGeometry(roomW, 0.08, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x40d8f0 })
  );
  cyanStrip.position.set(0, roomH - 0.6, -roomL / 2 + 0.2);
  scene.add(cyanStrip);

  const cyanLight = new THREE.PointLight(0x40d8f0, 2.2, 22);
  cyanLight.position.set(0, roomH - 0.7, -roomL / 2 + 1.5);
  scene.add(cyanLight);

  // ── 3. INDUSTRIAL CEILING: DUCTS & SUSPENDED LIGHT FIXTURES ──
  const ductMat = new THREE.MeshStandardMaterial({
    color: 0x222a38,
    metalness: 0.78,
    roughness: 0.3,
  });

  [-6.5, 6.5].forEach((xPos) => {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, roomL, 24), ductMat);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(xPos, roomH - 0.75, 0);
    scene.add(duct);

    for (let z = -roomL / 2 + 3; z < roomL / 2; z += 3.8) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 12, 24), ductMat);
      ring.position.set(xPos, roomH - 0.75, z);
      scene.add(ring);
    }
  });

  // Suspended Linear LED Fixtures
  const lightFixtures = [
    { x: -4.5, z: -8.0 }, { x: 4.5, z: -8.0 },
    { x: -4.5, z: -1.5 }, { x: 4.5, z: -1.5 },
    { x: -2.6, z: 2.2 },  { x: 2.6, z: 2.2 },
  ];

  lightFixtures.forEach((pos) => {
    const fixGeo = new THREE.BoxGeometry(0.32, 0.14, 3.4);
    const fixture = new THREE.Mesh(fixGeo, mullionMat);
    fixture.position.set(pos.x, roomH - 0.95, pos.z);
    scene.add(fixture);

    const diffGeo = new THREE.BoxGeometry(0.26, 0.04, 3.3);
    const diffuser = new THREE.Mesh(diffGeo, new THREE.MeshBasicMaterial({ color: 0xf4faff }));
    diffuser.position.set(pos.x, roomH - 1.03, pos.z);
    scene.add(diffuser);

    const spot = new THREE.SpotLight(0xf4faff, 3.8, 18, Math.PI / 3.5, 0.35, 1.0);
    spot.position.set(pos.x, roomH - 1.05, pos.z);
    spot.target.position.set(pos.x, 0, pos.z);
    scene.add(spot);
    scene.add(spot.target);

    [-1.5, 1.5].forEach((wz) => {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, 0.95, 8),
        new THREE.MeshBasicMaterial({ color: 0x444444 })
      );
      wire.position.set(pos.x, roomH - 0.48, pos.z + wz);
      scene.add(wire);
    });
  });

  // ── 4. CEILING 4-MONITOR RIG ──
  const rigCenter = new THREE.Vector3(0, roomH - 1.45, -2.5);

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.45, 16), mullionMat);
  pole.position.set(rigCenter.x, roomH - 0.72, rigCenter.z);
  scene.add(pole);

  const monConfigs = [
    { label: "CAM-01 HUB AISLE", x: -0.92, y: 0.42, rotY: 0.28, rotX: 0.38 },
    { label: "CAM-02 VAULT CORE", x: 0.92,  y: 0.42, rotY: -0.28, rotX: 0.38 },
    { label: "CAM-03 PIPELINE MON", x: -0.92, y: -0.38, rotY: 0.28, rotX: 0.38 },
    { label: "CAM-04 THREAT RADAR", x: 0.92,  y: -0.38, rotY: -0.28, rotX: 0.38 },
  ];

  monConfigs.forEach((cfg) => {
    const sMat = new THREE.MeshBasicMaterial({ map: createCeilingScreenTexture(cfg.label) });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.8), sMat);
    screen.position.set(rigCenter.x + cfg.x, rigCenter.y + cfg.y, rigCenter.z);
    screen.rotation.set(cfg.rotX, cfg.rotY, 0);
    scene.add(screen);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.84, 0.06), mullionMat);
    back.position.copy(screen.position);
    back.rotation.copy(screen.rotation);
    back.translateZ(-0.035);
    scene.add(back);
  });

  // ── 5. GLASS CONFERENCE ROOM & WHITEBOARDS ──
  const confWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.0), glassMat);
  confWall.position.set(0, 2.0, -9.5);
  scene.add(confWall);

  const confBeam = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.14, 0.2), mullionMat);
  confBeam.position.set(0, 4.0, -9.5);
  scene.add(confBeam);

  const confCyan = new THREE.Mesh(
    new THREE.BoxGeometry(18.0, 0.05, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x40d8f0 })
  );
  confCyan.position.set(0, 3.94, -9.38);
  scene.add(confCyan);

  // Left Whiteboard
  const board1 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 2.6),
    new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() })
  );
  board1.position.set(-3.2, 2.1, -12.5);
  scene.add(board1);

  // Center vertical display: "PROJECT COSMOS"
  const cosmosCanvas = document.createElement("canvas");
  cosmosCanvas.width = 512; cosmosCanvas.height = 360;
  const cctx = cosmosCanvas.getContext("2d");
  cctx.fillStyle = "#0c1320"; cctx.fillRect(0, 0, 512, 360);
  cctx.strokeStyle = "#40d8f0"; cctx.lineWidth = 4; cctx.strokeRect(10, 10, 492, 340);
  cctx.font = "bold 20px 'Inter', sans-serif"; cctx.fillStyle = "#5ec8d8";
  cctx.textAlign = "center";
  cctx.fillText("GAME BUILD IN PROGRESS", 256, 120);
  cctx.font = "bold 32px 'Inter', sans-serif"; cctx.fillStyle = "#ffffff";
  cctx.fillText("PROJECT COSMOS", 256, 175);
  cctx.font = "16px 'Courier New', monospace"; cctx.fillStyle = "#70a0d0";
  cctx.fillText("VERSION 2.4.0 — PRODUCTION", 256, 230);
  const cosmosTex = new THREE.CanvasTexture(cosmosCanvas);

  const cosmosBoard = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.0),
    new THREE.MeshBasicMaterial({ map: cosmosTex })
  );
  cosmosBoard.position.set(1.4, 2.1, -11.0);
  scene.add(cosmosBoard);

  const cosmosStand = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.1, 0.08), mullionMat);
  cosmosStand.position.set(1.4, 2.1, -11.05);
  scene.add(cosmosStand);

  // Right Whiteboard
  const board2 = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 2.6),
    new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() })
  );
  board2.position.set(6.2, 2.1, -12.5);
  scene.add(board2);

  // Conference Table
  const confTable = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 0.1, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x18202d, roughness: 0.35, metalness: 0.5 })
  );
  confTable.position.set(0, 0.88, -13.5);
  scene.add(confTable);

  [-3.0, 3.0].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.88, 1.8), mullionMat);
    leg.position.set(lx, 0.44, -13.5);
    scene.add(leg);
  });

  // ── 6. PRIMARY FOREGROUND WORKSTATIONS (EXACT MATCH TO REFERENCE PHOTO) ──
  // Foreground Left Desk: Code IDE + 3D Wireframe + RGB PC Tower + Keyboard
  buildForegroundDesk(scene, {
    x: -2.6,
    z: 2.0,
    rotY: -0.08,
    screenTexture: createLeftUltrawideScreenTexture(),
    towerRGB: 0x5ec8d8,
  });

  // Foreground Right Desk: 3D Corridor Viewport + Amber RGB PC Tower + Keyboard + Headset
  buildForegroundDesk(scene, {
    x: 2.6,
    z: 2.0,
    rotY: 0.08,
    screenTexture: createRightUltrawideScreenTexture(),
    towerRGB: 0xff9800,
  });

  // Midground Workstations
  buildMidgroundDesk(scene, {
    x: -4.5,
    z: -4.2,
    rotY: 0.05,
    screenTexture: createLeftUltrawideScreenTexture(),
    towerRGB: 0x9c27b0,
  });

  buildMidgroundDesk(scene, {
    x: 4.5,
    z: -4.2,
    rotY: -0.05,
    screenTexture: createRightUltrawideScreenTexture(),
    towerRGB: 0x00e676,
  });

  // ── 7. RIGHT WALL: NEBULA STUDIOS, NEON SIGNS & LOUNGE ──
  const logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.6, 1.9),
    new THREE.MeshBasicMaterial({ map: createLogoTexture() })
  );
  logoMesh.position.set(roomW / 2 - 0.06, 3.4, -1.0);
  logoMesh.rotation.y = -Math.PI / 2;
  scene.add(logoMesh);

  const logoSpot = new THREE.SpotLight(0x8bc3dd, 2.6, 12, Math.PI / 3, 0.5);
  logoSpot.position.set(roomW / 2 - 2.2, 4.8, -1.0);
  logoSpot.target.position.set(roomW / 2 - 0.06, 3.4, -1.0);
  scene.add(logoSpot);
  scene.add(logoSpot.target);

  const neon1 = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.95),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("GAME ON", "#00e5ff", "#0088ff") })
  );
  neon1.position.set(roomW / 2 - 0.06, 3.4, 5.2);
  neon1.rotation.y = -Math.PI / 2;
  scene.add(neon1);

  const neon1Light = new THREE.PointLight(0x00e5ff, 2.0, 8);
  neon1Light.position.set(roomW / 2 - 0.8, 3.4, 5.2);
  scene.add(neon1Light);

  const neon2 = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 0.95),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture("LOAD GAME", "#ff4081", "#e040fb") })
  );
  neon2.position.set(roomW / 2 - 0.06, 3.4, 8.8);
  neon2.rotation.y = -Math.PI / 2;
  scene.add(neon2);

  const neon2Light = new THREE.PointLight(0xff4081, 2.0, 8);
  neon2Light.position.set(roomW / 2 - 0.8, 3.4, 8.8);
  scene.add(neon2Light);

  // Pantry Kitchenette
  const pantry = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.05, 6.8),
    new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.65 })
  );
  pantry.position.set(roomW / 2 - 0.7, 0.52, 7.2);
  scene.add(pantry);

  for (let zDisp = 5.2; zDisp <= 8.8; zDisp += 1.2) {
    const disp = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.85, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x222a38, metalness: 0.8 })
    );
    disp.position.set(roomW / 2 - 0.7, 1.48, zDisp);
    scene.add(disp);

    const dispGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.2, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x5ec8d8 })
    );
    dispGlow.position.set(roomW / 2 - 1.06, 1.6, zDisp);
    dispGlow.rotation.y = -Math.PI / 2;
    scene.add(dispGlow);
  }

  // ── 8. LEFT WALL: TECH SHELVING & SERVER RACKS ──
  for (let zShelf = 3.0; zShelf <= 10.5; zShelf += 3.8) {
    const shelf = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 4.0, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x111722, metalness: 0.85, roughness: 0.25 })
    );
    shelf.position.set(-roomW / 2 + 0.6, 2.0, zShelf);
    scene.add(shelf);

    for (let r = 0; r < 5; r++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.04, 2.8),
        new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? 0x00e5ff : 0x76ff03 })
      );
      led.position.set(-roomW / 2 + 1.12, 0.65 + r * 0.7, zShelf);
      scene.add(led);
    }
  }

  // Vertical Orange Accent Strips on Concrete Columns
  [-roomW / 2 + 0.1, roomW / 2 - 0.1].forEach((colX) => {
    [-6.5, 2.0].forEach((colZ) => {
      const col = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, roomH, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x18202d, roughness: 0.7 })
      );
      col.position.set(colX, roomH / 2, colZ);
      scene.add(col);

      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, roomH - 0.4, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xff9100 })
      );
      strip.position.set(colX + (colX > 0 ? -0.29 : 0.29), roomH / 2, colZ);
      scene.add(strip);

      const colLight = new THREE.PointLight(0xff9100, 1.4, 8);
      colLight.position.set(colX + (colX > 0 ? -0.6 : 0.6), 2.7, colZ);
      scene.add(colLight);
    });
  });

  // ── 9. THE 5 SECURITY DOORS & TERMINAL STATIONS ──
  createDoorStation(scene, "classification", -roomW / 2 + 0.1, -2.5, Math.PI / 2);
  createDoorStation(scene, "clustering", -roomW / 2 + 0.1, -7.5, Math.PI / 2);
  createDoorStation(scene, "regression", roomW / 2 - 0.1, -4.5, -Math.PI / 2);
  createDoorStation(scene, "anomaly", roomW / 2 - 0.1, -9.5, -Math.PI / 2);
  createDoorStation(scene, "mystery", -5.5, roomL / 2 - 0.1, Math.PI);

  // ── 10. REINFORCED EXIT VAULT DOOR ──
  const exitX = 2.0;
  const exitZ = roomL / 2 - 0.1;
  const exitGroup = new THREE.Group();
  exitGroup.position.set(exitX, 0, exitZ);
  exitGroup.rotation.y = Math.PI;

  const vf = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 4.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x1a2330, metalness: 0.92, roughness: 0.2 })
  );
  vf.position.y = 2.2;
  exitGroup.add(vf);

  const vpGeo = new THREE.CylinderGeometry(1.65, 1.65, 0.35, 32);
  vpGeo.rotateX(Math.PI / 2);
  const vp = new THREE.Mesh(
    vpGeo,
    new THREE.MeshStandardMaterial({ color: 0x101520, metalness: 0.95, roughness: 0.15 })
  );
  vp.position.y = 2.2;
  exitGroup.add(vp);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.08, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3333 })
  );
  ring.position.set(0, 2.2, 0.22);
  exitGroup.add(ring);

  const vLight = new THREE.PointLight(0xff3333, 1.4, 9);
  vLight.position.set(0, 3.8, 0.8);
  exitGroup.add(vLight);

  scene.add(exitGroup);

  exitDoor = {
    position: new THREE.Vector3(exitX, 1.5, exitZ - 2.0),
    group: exitGroup,
    glow: ring,
    light: vLight,
  };
}

// Builds the primary foreground workstation facing TOWARDS camera
function buildForegroundDesk(scene, config) {
  const ws = new THREE.Group();
  ws.position.set(config.x, 0, config.z);
  ws.rotation.y = config.rotY;

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.28, metalness: 0.4 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x090d14, metalness: 0.9 });

  // 1. Desk Surface (2.6m wide x 1.15m deep)
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.15), deskMat);
  desk.position.y = 0.74;
  desk.castShadow = true;
  desk.receiveShadow = true;
  ws.add(desk);

  // Metal legs
  [-1.15, 1.15].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.95), legMat);
    leg.position.set(lx, 0.37, 0);
    ws.add(leg);
  });

  // 2. Curved Ultrawide Monitor (Concave face towards camera +Z)
  const monW = 1.9;
  const monH = 0.65;
  const monGeo = new THREE.PlaneGeometry(monW, monH, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    // Smooth curvature: edges wrap forward towards camera (+Z)
    posAttr.setZ(i, (x * x) * 0.18);
  }
  monGeo.computeVertexNormals();

  const monScreen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: config.screenTexture, side: THREE.DoubleSide })
  );
  monScreen.position.set(-0.25, 1.18, -0.15);
  ws.add(monScreen);

  // Monitor casing backing
  const casingGeo = monGeo.clone();
  casingGeo.translate(0, 0, -0.015);
  const casing = new THREE.Mesh(
    casingGeo,
    new THREE.MeshStandardMaterial({ color: 0x05080e, metalness: 0.95, roughness: 0.3, side: THREE.DoubleSide })
  );
  casing.position.set(-0.25, 1.18, -0.15);
  ws.add(casing);

  // Monitor stand
  const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 12), legMat);
  standPole.position.set(-0.25, 0.94, -0.26);
  ws.add(standPole);

  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.02, 0.24), legMat);
  standBase.position.set(-0.25, 0.785, -0.22);
  ws.add(standBase);

  // Screen glow on desk
  const monGlow = new THREE.PointLight(0x70b8ff, 2.0, 4.0);
  monGlow.position.set(-0.25, 1.18, 0.2);
  ws.add(monGlow);

  // 3. Desktop PC Tower on right side of desk
  const pc = new THREE.Group();
  pc.position.set(0.98, 1.08, 0.02);
  pc.rotation.y = config.rotY > 0 ? -0.25 : 0.25;

  const pcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.26, 0.60, 0.54),
    new THREE.MeshStandardMaterial({ color: 0x090c12, metalness: 0.92, roughness: 0.2 })
  );
  pc.add(pcBody);

  // Tempered glass panel
  const pcGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.56),
    new THREE.MeshPhysicalMaterial({ color: 0x060606, transparent: true, opacity: 0.45, roughness: 0.08 })
  );
  pcGlass.position.set(-0.135, 0, 0);
  pcGlass.rotation.y = -Math.PI / 2;
  pc.add(pcGlass);

  // Internal RGB glow and fans
  const pcLight = new THREE.PointLight(config.towerRGB, 2.4, 3.5);
  pcLight.position.set(-0.06, 0, 0);
  pc.add(pcLight);

  for (let f = -0.18; f <= 0.18; f += 0.18) {
    const fan = new THREE.Mesh(
      new THREE.RingGeometry(0.045, 0.08, 16),
      new THREE.MeshBasicMaterial({ color: config.towerRGB, side: THREE.DoubleSide })
    );
    fan.position.set(-0.07, f, 0.27);
    pc.add(fan);
  }

  // Front RGB stripes
  const stripeGeo = new THREE.BoxGeometry(0.02, 0.52, 0.01);
  const stripeMat = new THREE.MeshBasicMaterial({ color: config.towerRGB });
  const stripe = new THREE.Mesh(stripeGeo, stripeMat);
  stripe.position.set(0.08, 0, 0.275);
  pc.add(stripe);

  ws.add(pc);

  // 4. RGB Mechanical Keyboard & Desk Mat
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.005, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.7 })
  );
  pad.position.set(-0.15, 0.784, 0.22);
  ws.add(pad);

  const kbGeo = new THREE.BoxGeometry(0.58, 0.02, 0.22);
  const kbMat = new THREE.MeshStandardMaterial({
    map: createKeyboardTexture(),
    roughness: 0.35,
  });
  const kb = new THREE.Mesh(kbGeo, kbMat);
  kb.position.set(-0.25, 0.795, 0.22);
  ws.add(kb);

  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.03, 0.13),
    new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.5 })
  );
  mouse.position.set(0.18, 0.796, 0.22);
  ws.add(mouse);

  // Headset on stand
  const hStand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.28, 12), legMat);
  hStand.position.set(-1.0, 0.92, 0.2);
  ws.add(hStand);

  const hBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.022, 12, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.5 })
  );
  hBand.position.set(-1.0, 1.06, 0.2);
  ws.add(hBand);

  // 5. Gaming Chair
  const chair = new THREE.Group();
  chair.position.set(-0.25, 0, 0.92);

  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.09, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x101520, roughness: 0.55 })
  );
  seat.position.y = 0.5;
  chair.add(seat);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.82, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x101520, roughness: 0.55 })
  );
  back.position.set(0, 0.9, 0.25);
  back.rotation.x = -0.12;
  chair.add(back);

  const pillow = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.14, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x1e2738 })
  );
  pillow.position.set(0, 1.22, 0.26);
  chair.add(pillow);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 16), legMat);
  base.position.y = 0.12;
  chair.add(base);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 12), legMat);
  stem.position.y = 0.31;
  chair.add(stem);

  ws.add(chair);

  // 6. Direct Desk Task Light
  const taskLight = new THREE.PointLight(0xe8f4ff, 2.5, 5.0);
  taskLight.position.set(-0.25, 2.2, 0.1);
  ws.add(taskLight);

  scene.add(ws);
}

// Builds the midground workstations facing towards -Z
function buildMidgroundDesk(scene, config) {
  const ws = new THREE.Group();
  ws.position.set(config.x, 0, config.z);
  ws.rotation.y = config.rotY;

  const deskMat = new THREE.MeshStandardMaterial({ color: 0x141a24, roughness: 0.3, metalness: 0.5 });
  const legMat = new THREE.MeshStandardMaterial({ color: 0x0a0e16, metalness: 0.9 });

  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.1), deskMat);
  desk.position.y = 0.74;
  ws.add(desk);

  [-1.1, 1.1].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.74, 0.9), legMat);
    leg.position.set(lx, 0.37, 0);
    ws.add(leg);
  });

  const monW = 1.7;
  const monH = 0.58;
  const monGeo = new THREE.PlaneGeometry(monW, monH, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    posAttr.setZ(i, -(x * x) * 0.16);
  }
  monGeo.computeVertexNormals();

  const mon = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: config.screenTexture, side: THREE.DoubleSide })
  );
  mon.position.set(0, 1.18, 0.15);
  ws.add(mon);

  const casingGeo = monGeo.clone();
  casingGeo.translate(0, 0, 0.015);
  const casing = new THREE.Mesh(casingGeo, new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.9, side: THREE.DoubleSide }));
  casing.position.set(0, 1.18, 0.15);
  ws.add(casing);

  const glow = new THREE.PointLight(0x70b8ff, 1.4, 4.5);
  glow.position.set(0, 1.18, -0.3);
  ws.add(glow);

  const pc = new THREE.Group();
  pc.position.set(0.95, 1.05, 0.05);
  const pcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.54, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x090c12, metalness: 0.9 })
  );
  pc.add(pcBody);

  const rgb = new THREE.PointLight(config.towerRGB, 1.6, 3.0);
  rgb.position.set(-0.06, 0, 0);
  pc.add(rgb);
  ws.add(pc);

  const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.5), legMat);
  chair.position.set(0, 0.75, -0.75);
  ws.add(chair);

  scene.add(ws);
}

// Builds high-tech Security Door + Interactive Pedestal Terminal
function createDoorStation(scene, doorType, x, z, rotY) {
  const color = doorColors[doorType] || 0x5ec8d8;
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotY;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 4.0, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x18202d, metalness: 0.88, roughness: 0.2 })
  );
  frame.position.y = 2.0;
  group.add(frame);

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.6, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x0c111a, metalness: 0.75, roughness: 0.35 })
  );
  panel.position.y = 1.95;
  group.add(panel);

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.12, 0.22),
    new THREE.MeshBasicMaterial({ color })
  );
  glow.position.y = 3.82;
  group.add(glow);

  const doorLight = new THREE.PointLight(color, 1.8, 8);
  doorLight.position.set(0, 3.7, 0.7);
  group.add(doorLight);

  const pedestal = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 1.15, 0.55),
    new THREE.MeshStandardMaterial({ color: 0x161e2b, metalness: 0.85 })
  );
  pedestal.position.set(1.9, 0.58, 0.65);
  group.add(pedestal);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.42),
    new THREE.MeshBasicMaterial({ color })
  );
  screen.position.set(1.9, 1.1, 0.94);
  screen.rotation.x = -0.35;
  group.add(screen);

  const termLight = new THREE.PointLight(color, 1.2, 3.5);
  termLight.position.set(1.9, 1.15, 1.1);
  group.add(termLight);

  scene.add(group);

  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  const interactPos = new THREE.Vector3(x, 1.5, z).addScaledVector(fwd, 1.6);

  doorRegistry[doorType] = {
    position: interactPos,
    group,
    panel,
    glow,
    doorType,
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
    entry.panel.position.y = 4.4;
    entry.glow.material.color.setHex(0x4caf50);
  }
}

export function setExitUnlocked() {
  if (exitDoor && exitDoor.glow) {
    exitDoor.glow.material.color.setHex(0x4caf50);
    if (exitDoor.light) exitDoor.light.color.setHex(0x4caf50);
  }
}
