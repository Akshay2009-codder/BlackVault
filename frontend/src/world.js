import * as THREE from "three";
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
const roomDoors = [];

const doorColors = {
  classification: 0x4caf50,
  regression: 0x2196f3,
  clustering: 0x9c27b0,
  anomaly: 0xff9800,
  mystery: 0xe91e63,
};

const ROOM_SPECS = [
  {
    roomIndex: 1,
    name: "Sector 01: Classification Hub",
    doorType: "classification",
    startZ: 10,
    endZ: -16,
    doorZ: -16,
    accentColor: 0x4caf50,
    ambientColor: 0x5ec8d8,
  },
  {
    roomIndex: 2,
    name: "Sector 02: Regression Core",
    doorType: "regression",
    startZ: -16,
    endZ: -46,
    doorZ: -46,
    accentColor: 0x2196f3,
    ambientColor: 0x4080ff,
  },
  {
    roomIndex: 3,
    name: "Sector 03: Clustering Manifold",
    doorType: "clustering",
    startZ: -46,
    endZ: -76,
    doorZ: -76,
    accentColor: 0x9c27b0,
    ambientColor: 0xe040fb,
  },
  {
    roomIndex: 4,
    name: "Sector 04: Threat & Anomaly Lab",
    doorType: "anomaly",
    startZ: -76,
    endZ: -106,
    doorZ: -106,
    accentColor: 0xff9800,
    ambientColor: 0xff5722,
  },
  {
    roomIndex: 5,
    name: "Sector 05: Core BlackVault Sanctuary",
    doorType: "mystery",
    startZ: -106,
    endZ: -136,
    doorZ: -136,
    accentColor: 0xe91e63,
    ambientColor: 0x00e5ff,
  },
];

export function initWorld(scene) {
  const W = 22, H = 5.4;

  ROOM_SPECS.forEach((spec) => {
    buildRoom(scene, spec, W, H);
  });
}

function buildRoom(scene, spec, W, H) {
  const length = Math.abs(spec.startZ - spec.endZ);
  const midZ = (spec.startZ + spec.endZ) / 2;

  // 1. FLOOR
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, length),
    new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.18, metalness: 0.42 })
  );
  floor.position.set(0, 0, midZ);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // 2. CEILING
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W, length),
    new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.9 })
  );
  ceiling.position.set(0, H, midZ);
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // 3. SIDE WALLS
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x131924, roughness: 0.8 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.85 });

  // Left Wall
  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(length, H), wallMat);
  leftWall.position.set(-W / 2, H / 2, midZ);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right Wall
  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(length, H), wallMat);
  rightWall.position.set(W / 2, H / 2, midZ);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  // Back Wall (at entrance for Room 1)
  if (spec.roomIndex === 1) {
    const entranceWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat);
    entranceWall.position.set(0, H / 2, spec.startZ);
    scene.add(entranceWall);

    // City Skyline & Glass Wall on North side
    const skyline = new THREE.Mesh(
      new THREE.PlaneGeometry(W + 6, H + 4),
      new THREE.MeshBasicMaterial({ map: createCitySkylineTexture() })
    );
    skyline.position.set(0, H / 2 + 1, spec.startZ + 0.4);
    skyline.rotation.y = Math.PI;
    scene.add(skyline);
  }

  // Ceiling Lights
  const lightZ1 = midZ - length * 0.25;
  const lightZ2 = midZ + length * 0.25;
  [lightZ1, lightZ2].forEach((lz) => {
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 4.0), mullionMat);
    fixture.position.set(0, H - 0.8, lz);
    scene.add(fixture);

    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 3.8),
      new THREE.MeshBasicMaterial({ color: spec.ambientColor })
    );
    tube.position.set(0, H - 0.86, lz);
    scene.add(tube);

    const spot = new THREE.PointLight(spec.ambientColor, 2.0, 16);
    spot.position.set(0, H - 1.0, lz);
    scene.add(spot);
  });

  // Server Racks on side
  for (let sz = midZ - 5; sz <= midZ + 5; sz += 5) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 4.0, 2.5),
      new THREE.MeshStandardMaterial({ color: 0x0f1520, metalness: 0.85 })
    );
    rack.position.set(-W / 2 + 0.55, 2.0, sz);
    scene.add(rack);

    for (let r = 0; r < 4; r++) {
      const led = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 2.2),
        new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? spec.accentColor : 0x00e5ff })
      );
      led.position.set(-W / 2 + 1.02, 0.8 + r * 0.8, sz);
      scene.add(led);
    }
  }

  // Neon sign on right wall
  const neon = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 1.0),
    new THREE.MeshBasicMaterial({ map: createNeonSignTexture(spec.name.toUpperCase(), "#00e5ff", "#ff4081") })
  );
  neon.position.set(W / 2 - 0.05, 3.2, midZ);
  neon.rotation.y = -Math.PI / 2;
  scene.add(neon);

  // 4. SECURITY PARTITION WALL & DOOR
  buildDoorWithStation(scene, spec, W, H);
}

function buildDoorWithStation(scene, spec, W, H) {
  const doorZ = spec.doorZ;
  const doorType = spec.doorType;
  const color = spec.accentColor;
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x131924, roughness: 0.8 });

  // Partition wall spanning left and right of the door opening
  const doorWidth = 4.2;
  const sideWallWidth = (W - doorWidth) / 2;

  // Left partition
  const leftPart = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, H, 0.4), wallMat);
  leftPart.position.set(-W / 2 + sideWallWidth / 2, H / 2, doorZ);
  scene.add(leftPart);

  // Right partition
  const rightPart = new THREE.Mesh(new THREE.BoxGeometry(sideWallWidth, H, 0.4), wallMat);
  rightPart.position.set(W / 2 - sideWallWidth / 2, H / 2, doorZ);
  scene.add(rightPart);

  // Top lintel above door
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 1.4, 0.4), wallMat);
  lintel.position.set(0, H - 0.7, doorZ);
  scene.add(lintel);

  // Door Frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, 4.0, 0.5), mullionMat);
  frame.position.set(0, 2.0, doorZ);
  scene.add(frame);

  // Sliding Door Panel (moves up when unlocked)
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 3.8, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x0c111a, metalness: 0.85, roughness: 0.3 })
  );
  panel.position.set(0, 1.9, doorZ);
  scene.add(panel);

  // Top Glow Strip
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.12, 0.26),
    new THREE.MeshBasicMaterial({ color })
  );
  glow.position.set(0, 3.8, doorZ + 0.1);
  scene.add(glow);

  // Door status light
  const doorLight = new THREE.PointLight(color, 2.0, 8);
  doorLight.position.set(0, 3.6, doorZ + 0.8);
  scene.add(doorLight);

  // 5. COMPUTER WORKSTATION LOCATED DIRECTLY NEAR THE DOOR
  // Placed at X = -3.2, Z = doorZ + 2.4, facing north towards the monitor at doorZ + 1.2
  const deskX = -3.2;
  const deskZ = doorZ + 1.6;
  const chairZ = doorZ + 2.6;

  buildWorkstation(scene, {
    x: deskX,
    z: deskZ,
    rotY: 0,
    screenTex: createLeftUltrawideScreenTexture(),
    towerRGB: color,
  });

  const doorEntry = {
    roomIndex: spec.roomIndex,
    doorType,
    name: spec.name,
    position: new THREE.Vector3(deskX, 1.5, chairZ), // Interaction trigger point near chair
    deskPosition: new THREE.Vector3(deskX, 1.25, chairZ), // Seated chair camera position
    deskLookAt: new THREE.Vector3(deskX, 1.45, deskZ), // Camera lookAt facing screen
    doorCenter: new THREE.Vector3(0, 1.5, doorZ),
    panel,
    glow,
    doorLight,
    isUnlocked: false,
  };

  doorRegistry[doorType] = doorEntry;
  roomDoors.push(doorEntry);
}

// ── Workstation: desk + curved ultrawide monitor + PC tower (on desk) + keyboard + gaming chair ──
function buildWorkstation(scene, { x, z, rotY, screenTex, towerRGB }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const legMat = new THREE.MeshStandardMaterial({ color: 0x090d14, metalness: 0.9 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.28, metalness: 0.35 });
  const DESK_Y = 0.74;
  const DESK_TOP = DESK_Y + 0.04;

  // Desk top
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.1), deskMat);
  desk.position.y = DESK_Y;
  desk.receiveShadow = true;
  g.add(desk);

  // Desk legs
  [[-1.05, -0.45], [-1.05, 0.45], [1.05, -0.45], [1.05, 0.45]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESK_Y, 0.06), legMat);
    leg.position.set(lx, DESK_Y / 2, lz);
    g.add(leg);
  });

  // Curved Ultrawide Monitor
  const MON_W = 1.8, MON_H = 0.6;
  const monGeo = new THREE.PlaneGeometry(MON_W, MON_H, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const nx = posAttr.getX(i) / (MON_W / 2);
    posAttr.setZ(i, nx * nx * 0.12);
  }
  monGeo.computeVertexNormals();

  const monScreen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.FrontSide })
  );
  monScreen.position.set(0, DESK_TOP + 0.42, -0.08);
  g.add(monScreen);

  // Monitor Stand
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), legMat);
  pole.position.set(0, DESK_TOP + 0.19, -0.18);
  g.add(pole);

  // Screen glow
  const screenLight = new THREE.PointLight(0x70b8ff, 1.8, 3.5);
  screenLight.position.set(0, DESK_TOP + 0.44, 0.4);
  g.add(screenLight);

  // PC Tower on desk
  const pcG = new THREE.Group();
  pcG.position.set(0.82, DESK_TOP, -0.06);
  g.add(pcG);

  const pcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.48, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x090c12, metalness: 0.92, roughness: 0.2 })
  );
  pcBody.position.y = 0.24;
  pcG.add(pcBody);

  const pcLight = new THREE.PointLight(towerRGB, 2.2, 2.5);
  pcLight.position.set(0, 0.22, 0);
  pcG.add(pcLight);

  // RGB Fan rings
  for (let f = -0.15; f <= 0.15; f += 0.15) {
    const fan = new THREE.Mesh(
      new THREE.RingGeometry(0.038, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: towerRGB, side: THREE.DoubleSide })
    );
    fan.rotation.y = -Math.PI / 2;
    fan.position.set(-0.112, 0.24 + f, 0);
    pcG.add(fan);
  }

  // Keyboard & Mouse
  const kb = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.018, 0.2),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.3 })
  );
  kb.position.set(-0.15, DESK_TOP + 0.013, 0.28);
  g.add(kb);

  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.026, 0.11),
    new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.5, roughness: 0.4 })
  );
  mouse.position.set(0.25, DESK_TOP + 0.017, 0.28);
  g.add(mouse);

  // Gaming Chair facing monitor
  buildChair(g, legMat, { x: 0, y: 0, z: 0.95 });

  scene.add(g);
}

function buildChair(parent, legMat, { x, y, z }) {
  const chairG = new THREE.Group();
  chairG.position.set(x, y, z);

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.55 });

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.52), seatMat);
  seat.position.y = 0.5;
  chairG.add(seat);

  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 0.09), seatMat);
  back.position.set(0, 0.94, 0.22);
  back.rotation.x = -0.1;
  chairG.add(back);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1c2840 }));
  pillow.position.set(0, 1.25, 0.24);
  chairG.add(pillow);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12), legMat);
  stem.position.y = 0.29;
  chairG.add(stem);

  parent.add(chairG);
}

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
 * Slide the door open and switch indicator lights to bright green
 */
export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (entry) {
    entry.isUnlocked = true;
    if (entry.panel) {
      // Animate door slide up
      let currentY = entry.panel.position.y;
      const targetY = 5.2;
      const step = () => {
        if (entry.panel.position.y < targetY) {
          entry.panel.position.y += 0.12;
          requestAnimationFrame(step);
        }
      };
      step();
    }
    if (entry.glow) entry.glow.material.color.setHex(0x4caf50);
    if (entry.doorLight) entry.doorLight.color.setHex(0x4caf50);
  }
}

export function getCurrentRoomIndex(playerZ) {
  for (const spec of ROOM_SPECS) {
    if (playerZ <= spec.startZ && playerZ >= spec.endZ) {
      return spec.roomIndex;
    }
  }
  return 1;
}
