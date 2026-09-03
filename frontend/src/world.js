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

const doorColors = {
  classification: 0x4caf50,
  regression: 0x2196f3,
  clustering: 0x9c27b0,
  anomaly: 0xff9800,
  mystery: 0xe91e63,
};

export function initWorld(scene) {
  const W = 28, L = 32, H = 5.4;

  // ── 1. FLOOR ──
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ map: createFloorTexture(), roughness: 0.18, metalness: 0.42 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ── 2. CEILING ──
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(W, L),
    new THREE.MeshStandardMaterial({ color: 0x080c14, roughness: 0.9 })
  );
  ceiling.position.y = H;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  // ── 3. WALLS ──
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x131924, roughness: 0.8 });
  const mullionMat = new THREE.MeshStandardMaterial({ color: 0x0c1220, metalness: 0.85 });

  [[L, H, -W / 2, H / 2, 0, Math.PI / 2],   // left
   [L, H,  W / 2, H / 2, 0, -Math.PI / 2],  // right
   [W, H,  0, H / 2, L / 2, Math.PI]].forEach(([gw, gh, px, py, pz, ry]) => {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(gw, gh), wallMat);
    w.position.set(px, py, pz);
    w.rotation.y = ry;
    w.receiveShadow = true;
    scene.add(w);
  });

  // ── 4. NIGHT CITY SKYLINE (North wall backdrop) ──
  const skyline = new THREE.Mesh(
    new THREE.PlaneGeometry(W + 12, H + 6),
    new THREE.MeshBasicMaterial({ map: createCitySkylineTexture() })
  );
  skyline.position.set(0, H / 2 + 1, -L / 2 - 0.5);
  scene.add(skyline);

  // Glass curtain wall
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c1626, transparent: true, opacity: 0.28,
    roughness: 0.04, transmission: 0.88, ior: 1.52,
  });
  const glassWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), glassMat);
  glassWall.position.set(0, H / 2, -L / 2 + 0.08);
  scene.add(glassWall);

  // Steel mullions
  for (let x = -W / 2 + 3.2; x < W / 2; x += 3.5) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, H, 0.2), mullionMat);
    m.position.set(x, H / 2, -L / 2 + 0.1);
    scene.add(m);
  }

  // Horizontal beam above glass
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.14, 0.22), mullionMat);
  topBeam.position.set(0, H - 0.07, -L / 2 + 0.1);
  scene.add(topBeam);

  // Cyan LED strip along top of window
  const cyanStrip = new THREE.Mesh(
    new THREE.BoxGeometry(W, 0.06, 0.06),
    new THREE.MeshBasicMaterial({ color: 0x40d8f0 })
  );
  cyanStrip.position.set(0, H - 0.55, -L / 2 + 0.2);
  scene.add(cyanStrip);
  const cyanLight = new THREE.PointLight(0x40d8f0, 2.5, 24);
  cyanLight.position.set(0, H - 0.65, -L / 2 + 1.6);
  scene.add(cyanLight);

  // ── 5. CEILING DUCTS & LIGHTS ──
  const ductMat = new THREE.MeshStandardMaterial({ color: 0x1e2635, metalness: 0.8, roughness: 0.28 });
  [-6.5, 6.5].forEach((xd) => {
    const duct = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, L, 24), ductMat);
    duct.rotation.x = Math.PI / 2;
    duct.position.set(xd, H - 0.72, 0);
    scene.add(duct);
    for (let z = -L / 2 + 3; z < L / 2; z += 4) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 10, 24), ductMat);
      ring.position.set(xd, H - 0.72, z);
      scene.add(ring);
    }
  });

  // Suspended LED tube lights (matching photo's long white bars)
  const tubeFixtures = [
    { x: -4.5, z: -8 }, { x: 4.5, z: -8 },
    { x: -4.5, z: -1.5 }, { x: 4.5, z: -1.5 },
    { x: -2.6, z: 3.0 }, { x: 2.6, z: 3.0 },
  ];
  tubeFixtures.forEach(({ x, z }) => {
    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 3.5), mullionMat);
    housing.position.set(x, H - 0.92, z);
    scene.add(housing);

    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.04, 3.38),
      new THREE.MeshBasicMaterial({ color: 0xf0f8ff })
    );
    tube.position.set(x, H - 1.0, z);
    scene.add(tube);

    const spot = new THREE.SpotLight(0xf0f8ff, 4.0, 18, Math.PI / 3.4, 0.3, 1.0);
    spot.position.set(x, H - 1.02, z);
    spot.target.position.set(x, 0, z);
    spot.castShadow = false;
    scene.add(spot);
    scene.add(spot.target);

    [-1.5, 1.5].forEach((wz) => {
      const wire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.007, 0.007, 0.9, 8),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      wire.position.set(x, H - 0.47, z + wz);
      scene.add(wire);
    });
  });

  // ── 6. CEILING MONITOR RIG (4 surveillance screens hanging center) ──
  buildCeilingRig(scene, mullionMat);

  // ── 7. GLASS CONFERENCE ROOM (North midground) ──
  buildConferenceRoom(scene, glassMat, mullionMat);

  // ── 8. FOREGROUND WORKSTATIONS (matching photo) ──
  // Left desk: Code IDE screen, cyan RGB tower
  buildWorkstation(scene, {
    x: -2.5, z: 2.2, rotY: -0.1,
    screenTex: createLeftUltrawideScreenTexture(),
    towerRGB: 0x5ec8d8,
  });
  // Right desk: 3D engine screen, amber RGB tower
  buildWorkstation(scene, {
    x: 2.5, z: 2.2, rotY: 0.1,
    screenTex: createRightUltrawideScreenTexture(),
    towerRGB: 0xff9800,
  });
  // Mid-left desk
  buildWorkstation(scene, {
    x: -4.8, z: -3.5, rotY: 0,
    screenTex: createLeftUltrawideScreenTexture(),
    towerRGB: 0x9c27b0,
  });
  // Mid-right desk
  buildWorkstation(scene, {
    x: 4.8, z: -3.5, rotY: 0,
    screenTex: createRightUltrawideScreenTexture(),
    towerRGB: 0x00e676,
  });

  // ── 9. RIGHT WALL: NEBULA LOGO + NEON SIGNS + PANTRY ──
  // NEBULA STUDIOS logo panel
  const logoMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 1.85),
    new THREE.MeshBasicMaterial({ map: createLogoTexture() })
  );
  logoMesh.position.set(W / 2 - 0.05, 3.5, -1.5);
  logoMesh.rotation.y = -Math.PI / 2;
  scene.add(logoMesh);
  const logoSpot = new THREE.SpotLight(0x8bc3dd, 2.8, 10, Math.PI / 3, 0.5);
  logoSpot.position.set(W / 2 - 1.8, 4.8, -1.5);
  logoSpot.target.position.set(W / 2 - 0.05, 3.5, -1.5);
  scene.add(logoSpot); scene.add(logoSpot.target);

  // Neon signs
  [["GAME ON", "#00e5ff", "#0088ff", 5.0], ["LOAD GAME", "#ff4081", "#e040fb", 8.5]].forEach(([text, mc, gc, z]) => {
    const neon = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.92),
      new THREE.MeshBasicMaterial({ map: createNeonSignTexture(text, mc, gc) })
    );
    neon.position.set(W / 2 - 0.05, 3.4, z);
    neon.rotation.y = -Math.PI / 2;
    scene.add(neon);
    const nl = new THREE.PointLight(parseInt(mc.replace("#", "0x")), 2.0, 8);
    nl.position.set(W / 2 - 0.8, 3.4, z);
    scene.add(nl);
  });

  // Pantry counter
  const pantry = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 1.0, 7.0),
    new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.65 })
  );
  pantry.position.set(W / 2 - 0.65, 0.5, 7.5);
  scene.add(pantry);
  for (let zd = 5.0; zd <= 9.5; zd += 1.3) {
    const disp = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.8, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x1e2738, metalness: 0.8 }));
    disp.position.set(W / 2 - 0.65, 1.4, zd);
    scene.add(disp);
    const dg = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.18),
      new THREE.MeshBasicMaterial({ color: 0x5ec8d8 }));
    dg.rotation.y = -Math.PI / 2;
    dg.position.set(W / 2 - 1.02, 1.55, zd);
    scene.add(dg);
  }

  // ── 10. LEFT WALL: SERVER RACKS & SHELVES ──
  for (let zs = 3.0; zs <= 11.0; zs += 4.0) {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 4.2, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x0f1520, metalness: 0.85 })
    );
    rack.position.set(-W / 2 + 0.55, 2.1, zs);
    scene.add(rack);
    for (let r = 0; r < 5; r++) {
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 2.9),
        new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? 0x00e5ff : 0x69f0ae }));
      led.position.set(-W / 2 + 1.06, 0.7 + r * 0.72, zs);
      scene.add(led);
    }
  }

  // ── 11. VERTICAL ACCENT COLUMNS (orange strips) ──
  [-W / 2 + 0.1, W / 2 - 0.1].forEach((cx) => {
    [-6.5, 1.5].forEach((cz) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.5, H, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x18202d, roughness: 0.7 }));
      col.position.set(cx, H / 2, cz);
      scene.add(col);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.055, H - 0.3, 0.055),
        new THREE.MeshBasicMaterial({ color: 0xff9100 }));
      strip.position.set(cx + (cx > 0 ? -0.27 : 0.27), H / 2, cz);
      scene.add(strip);
      const cl = new THREE.PointLight(0xff9100, 1.2, 8);
      cl.position.set(cx + (cx > 0 ? -0.55 : 0.55), 2.5, cz);
      scene.add(cl);
    });
  });

  // ── 12. SECURITY DOORS ──
  createDoorStation(scene, "classification", -W / 2 + 0.1, -2.5, Math.PI / 2);
  createDoorStation(scene, "clustering", -W / 2 + 0.1, -7.5, Math.PI / 2);
  createDoorStation(scene, "regression", W / 2 - 0.1, -4.5, -Math.PI / 2);
  createDoorStation(scene, "anomaly", W / 2 - 0.1, -9.5, -Math.PI / 2);
  createDoorStation(scene, "mystery", -5.5, L / 2 - 0.1, Math.PI);

  // ── 13. EXIT VAULT DOOR ──
  const exitX = 2.5, exitZ = L / 2 - 0.1;
  const ev = new THREE.Group();
  ev.position.set(exitX, 0, exitZ);
  ev.rotation.y = Math.PI;

  const evPanel = new THREE.Mesh(new THREE.BoxGeometry(4.4, 4.4, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x1a2330, metalness: 0.92 }));
  evPanel.position.y = 2.2;
  ev.add(evPanel);

  const vpG = new THREE.CylinderGeometry(1.65, 1.65, 0.35, 32);
  vpG.rotateX(Math.PI / 2);
  const vp = new THREE.Mesh(vpG, new THREE.MeshStandardMaterial({ color: 0x101520, metalness: 0.95 }));
  vp.position.y = 2.2;
  ev.add(vp);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.45, 0.08, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3333 })
  );
  ring.position.set(0, 2.2, 0.22);
  ev.add(ring);

  const vLight = new THREE.PointLight(0xff3333, 1.6, 9);
  vLight.position.set(0, 3.8, 0.8);
  ev.add(vLight);

  scene.add(ev);
  exitDoor = { position: new THREE.Vector3(exitX, 1.5, exitZ - 2.0), group: ev, glow: ring, light: vLight };
}

// ── Workstation: desk + curved ultrawide monitor + PC tower (on desk) + keyboard + chair ──
function buildWorkstation(scene, { x, z, rotY, screenTex, towerRGB }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  const legMat = new THREE.MeshStandardMaterial({ color: 0x090d14, metalness: 0.9 });
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x18202c, roughness: 0.28, metalness: 0.35 });
  const DESK_Y = 0.74;
  const DESK_TOP = DESK_Y + 0.04; // surface y

  // Desk top
  const desk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.15), deskMat);
  desk.position.y = DESK_Y;
  desk.receiveShadow = true;
  g.add(desk);

  // Desk legs (4)
  [[-1.15, -0.45], [-1.15, 0.45], [1.15, -0.45], [1.15, 0.45]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, DESK_Y, 0.06), legMat);
    leg.position.set(lx, DESK_Y / 2, lz);
    g.add(leg);
  });

  // Desk under-rail cross brace
  const brace = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 0.04), legMat);
  brace.position.set(0, 0.2, 0);
  g.add(brace);

  // ── Curved Ultrawide Monitor ──
  // Build as flat PlaneGeometry with vertex displacement for curvature
  const MON_W = 1.9, MON_H = 0.6;
  const monGeo = new THREE.PlaneGeometry(MON_W, MON_H, 32, 1);
  const posAttr = monGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const nx = posAttr.getX(i) / (MON_W / 2);
    // parabolic curve: centre flat, edges curve towards camera (+Z)
    posAttr.setZ(i, nx * nx * 0.14);
  }
  monGeo.computeVertexNormals();

  const monScreen = new THREE.Mesh(
    monGeo,
    new THREE.MeshBasicMaterial({ map: screenTex, side: THREE.FrontSide })
  );
  // Position monitor so it faces the camera (towards +Z in group space)
  monScreen.position.set(0, DESK_TOP + 0.44, -0.08);
  g.add(monScreen);

  // Monitor bezel/casing
  const bezelGeo = new THREE.PlaneGeometry(MON_W + 0.06, MON_H + 0.06, 32, 1);
  const bezelPos = bezelGeo.attributes.position;
  for (let i = 0; i < bezelPos.count; i++) {
    const nx = bezelPos.getX(i) / ((MON_W + 0.06) / 2);
    bezelPos.setZ(i, nx * nx * 0.14 - 0.012);
  }
  bezelGeo.computeVertexNormals();
  const bezel = new THREE.Mesh(
    bezelGeo,
    new THREE.MeshStandardMaterial({ color: 0x050810, metalness: 0.9, roughness: 0.3, side: THREE.FrontSide })
  );
  bezel.position.copy(monScreen.position);
  g.add(bezel);

  // Monitor stand
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), legMat);
  pole.position.set(0, DESK_TOP + 0.19, -0.18);
  g.add(pole);
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.018, 0.22), legMat);
  standBase.position.set(0, DESK_TOP + 0.009, -0.14);
  g.add(standBase);

  // Screen glow on desk
  const screenLight = new THREE.PointLight(0x70b8ff, 1.8, 3.5);
  screenLight.position.set(0, DESK_TOP + 0.44, 0.4);
  g.add(screenLight);

  // ── PC Tower — ON the desk, right side ──
  const pcG = new THREE.Group();
  pcG.position.set(0.88, DESK_TOP, -0.06); // sitting ON the desk surface
  g.add(pcG);

  // PC body (vertical tower)
  const pcBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.48, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x090c12, metalness: 0.92, roughness: 0.2 })
  );
  pcBody.position.y = 0.24; // half-height above base
  pcG.add(pcBody);

  // Tempered glass left panel
  const pcGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.44),
    new THREE.MeshPhysicalMaterial({ color: 0x050508, transparent: true, opacity: 0.42, roughness: 0.06 })
  );
  pcGlass.rotation.y = -Math.PI / 2;
  pcGlass.position.set(-0.112, 0.24, 0);
  pcG.add(pcGlass);

  // Interior RGB glow
  const pcLight = new THREE.PointLight(towerRGB, 2.0, 2.5);
  pcLight.position.set(0, 0.22, 0);
  pcG.add(pcLight);

  // Three RGB ring fans on glass side
  for (let f = -0.15; f <= 0.15; f += 0.15) {
    const fan = new THREE.Mesh(
      new THREE.RingGeometry(0.038, 0.07, 16),
      new THREE.MeshBasicMaterial({ color: towerRGB, side: THREE.DoubleSide })
    );
    fan.rotation.y = -Math.PI / 2;
    fan.position.set(-0.112, 0.24 + f, 0);
    pcG.add(fan);
  }

  // Front LED stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.015, 0.42, 0.015),
    new THREE.MeshBasicMaterial({ color: towerRGB })
  );
  stripe.position.set(0.06, 0.24, 0.21);
  pcG.add(stripe);

  // ── Keyboard & Mousepad on desk ──
  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.004, 0.38),
    new THREE.MeshStandardMaterial({ color: 0x090c12, roughness: 0.7 })
  );
  pad.position.set(-0.1, DESK_TOP + 0.002, 0.28);
  g.add(pad);

  const kb = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.018, 0.2),
    new THREE.MeshStandardMaterial({ map: createKeyboardTexture(), roughness: 0.3 })
  );
  kb.position.set(-0.2, DESK_TOP + 0.013, 0.28);
  g.add(kb);

  const mouse = new THREE.Mesh(
    new THREE.BoxGeometry(0.075, 0.026, 0.11),
    new THREE.MeshStandardMaterial({ color: 0x161d28, metalness: 0.5, roughness: 0.4 })
  );
  mouse.position.set(0.2, DESK_TOP + 0.017, 0.28);
  g.add(mouse);

  // ── Headset on stand ──
  const hStand = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.032, 0.26, 8), legMat);
  hStand.position.set(-1.0, DESK_TOP + 0.13, 0.2);
  g.add(hStand);
  const hBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 10, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x1a2230 })
  );
  hBand.position.set(-1.0, DESK_TOP + 0.26, 0.2);
  g.add(hBand);

  // ── Coffee cup ──
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.022, 0.065, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  cup.position.set(0.6, DESK_TOP + 0.033, 0.38);
  g.add(cup);

  // ── Gaming Chair ──
  buildChair(g, legMat, { x: 0, y: 0, z: 0.92 });

  scene.add(g);
}

function buildChair(parent, legMat, { x, y, z }) {
  const chairG = new THREE.Group();
  chairG.position.set(x, y, z);

  const seatMat = new THREE.MeshStandardMaterial({ color: 0x111620, roughness: 0.55 });

  // Seat cushion
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.1, 0.52), seatMat);
  seat.position.y = 0.5;
  chairG.add(seat);

  // Seat side bolsters
  [-0.25, 0.25].forEach((sx) => {
    const bolster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.5), seatMat);
    bolster.position.set(sx, 0.54, 0);
    chairG.add(bolster);
  });

  // Backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 0.09), seatMat);
  back.position.set(0, 0.94, 0.22);
  back.rotation.x = -0.1;
  chairG.add(back);

  // Back bolsters
  [-0.21, 0.21].forEach((bx) => {
    const bb = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.7, 0.06), seatMat);
    bb.position.set(bx, 0.92, 0.22);
    bb.rotation.x = -0.1;
    chairG.add(bb);
  });

  // Headrest pillow
  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.14, 0.09),
    new THREE.MeshStandardMaterial({ color: 0x1c2840 }));
  pillow.position.set(0, 1.25, 0.24);
  chairG.add(pillow);

  // Armrests
  [-0.28, 0.28].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.16), legMat);
    arm.position.set(ax, 0.65, 0.08);
    chairG.add(arm);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x1a2230 }));
    pad.position.set(ax, 0.77, 0.08);
    chairG.add(pad);
  });

  // Cylinder pedestal stem
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 12), legMat);
  stem.position.y = 0.29;
  chairG.add(stem);

  // 5-star base
  const baseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.04, 16), legMat);
  baseDisc.position.y = 0.1;
  chairG.add(baseDisc);

  // Five caster arms
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.05), legMat);
    arm.position.set(Math.cos(angle) * 0.18, 0.06, Math.sin(angle) * 0.18);
    arm.rotation.y = -angle;
    chairG.add(arm);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10),
      new THREE.MeshStandardMaterial({ color: 0x0a0c10 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(Math.cos(angle) * 0.32, 0.04, Math.sin(angle) * 0.32);
    chairG.add(wheel);
  }

  parent.add(chairG);
}

function buildCeilingRig(scene, mullionMat) {
  const cx = 0, cz = -2.5, cy = 4.4;
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.1, 12), mullionMat);
  pole.position.set(cx, cy + 0.55, cz);
  scene.add(pole);

  // Horizontal arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.06, 0.06), mullionMat);
  arm.position.set(cx, cy, cz);
  scene.add(arm);

  const screens = [
    { x: -0.9, y: -0.4, label: "CAM-01 HUB AISLE", rx: 0.4, ry: 0.3 },
    { x: 0.9,  y: -0.4, label: "CAM-02 VAULT CORE", rx: 0.4, ry: -0.3 },
    { x: -0.9, y: -1.2, label: "CAM-03 PIPELINE",  rx: 0.4, ry: 0.3 },
    { x: 0.9,  y: -1.2, label: "CAM-04 THREAT",    rx: 0.4, ry: -0.3 },
  ];

  screens.forEach(({ x, y, label, rx, ry }) => {
    const s = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.78),
      new THREE.MeshBasicMaterial({ map: createCeilingScreenTexture(label) })
    );
    s.position.set(cx + x, cy + y, cz);
    s.rotation.set(rx, ry, 0);
    scene.add(s);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.44, 0.82, 0.05), mullionMat);
    back.position.copy(s.position);
    back.rotation.copy(s.rotation);
    back.translateZ(-0.03);
    scene.add(back);
  });
}

function buildConferenceRoom(scene, glassMat, mullionMat) {
  // Glass partition
  const confGlass = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.1), glassMat);
  confGlass.position.set(0, 2.05, -9.5);
  scene.add(confGlass);

  const confBeam = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.12, 0.18), mullionMat);
  confBeam.position.set(0, 4.1, -9.5);
  scene.add(confBeam);

  const confCyan = new THREE.Mesh(
    new THREE.BoxGeometry(18.0, 0.05, 0.05),
    new THREE.MeshBasicMaterial({ color: 0x40d8f0 })
  );
  confCyan.position.set(0, 4.05, -9.4);
  scene.add(confCyan);
  const confCyanL = new THREE.PointLight(0x40d8f0, 1.0, 10);
  confCyanL.position.set(0, 4.0, -9.0);
  scene.add(confCyanL);

  // Whiteboards
  const wbMat = new THREE.MeshBasicMaterial({ map: createWhiteboardTexture() });
  [[-3.2, 2.1, -12.4, 5.0, 2.6], [6.0, 2.1, -12.4, 4.2, 2.5]].forEach(([bx, by, bz, bw, bh]) => {
    const wb = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), wbMat);
    wb.position.set(bx, by, bz);
    scene.add(wb);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.1, bh + 0.1, 0.06), mullionMat);
    frame.position.set(bx, by, bz - 0.04);
    scene.add(frame);
  });

  // PROJECT COSMOS center display
  const cc = document.createElement("canvas");
  cc.width = 512; cc.height = 380;
  const ctx = cc.getContext("2d");
  ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, 512, 380);
  ctx.strokeStyle = "#40d8f0"; ctx.lineWidth = 4; ctx.strokeRect(8, 8, 496, 364);
  ctx.textAlign = "center";
  ctx.font = "bold 22px Inter,sans-serif"; ctx.fillStyle = "#5ec8d8";
  ctx.fillText("GAME BUILD IN PROGRESS", 256, 100);
  ctx.font = "bold 38px Inter,sans-serif"; ctx.fillStyle = "#ffffff";
  ctx.fillText("PROJECT COSMOS", 256, 160);
  ctx.font = "bold 16px 'Courier New',monospace"; ctx.fillStyle = "#4080b0";
  ctx.fillText("VERSION 2.4.0 — PRODUCTION", 256, 210);
  ctx.fillStyle = "#2a6040"; ctx.fillRect(130, 255, 252, 60);
  ctx.strokeStyle = "#4caf50"; ctx.lineWidth = 2; ctx.strokeRect(130, 255, 252, 60);
  ctx.font = "bold 18px 'Courier New',monospace"; ctx.fillStyle = "#69f0ae";
  ctx.fillText("[ ALL SYSTEMS ONLINE ]", 256, 292);
  const cosmosMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 2.0),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cc) })
  );
  cosmosMesh.position.set(1.5, 2.2, -10.8);
  scene.add(cosmosMesh);
  const cosmosFrame = new THREE.Mesh(new THREE.BoxGeometry(2.9, 2.1, 0.07), mullionMat);
  cosmosFrame.position.set(1.5, 2.2, -10.85);
  scene.add(cosmosFrame);

  // Conference table
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x18202d, roughness: 0.35, metalness: 0.5 });
  const table = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.1, 2.2), tableMat);
  table.position.set(0, 0.88, -13.5);
  scene.add(table);
  [-3.0, 3.0].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.88, 1.8), mullionMat);
    leg.position.set(lx, 0.44, -13.5);
    scene.add(leg);
  });

  // Conf room chairs
  for (let ci = -3; ci <= 3; ci += 1.5) {
    const cs = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44),
      new THREE.MeshStandardMaterial({ color: 0x101520 }));
    cs.position.set(ci, 0.5, -12.3);
    scene.add(cs);
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.6, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x101520 }));
    cb.position.set(ci, 0.86, -12.07);
    scene.add(cb);
  }
}

function createDoorStation(scene, doorType, x, z, rotY) {
  const color = doorColors[doorType] || 0x5ec8d8;
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = rotY;

  // Frame
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(3.2, 4.0, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x18202d, metalness: 0.88 }));
  doorFrame.position.y = 2.0;
  g.add(doorFrame);

  // Sliding panel
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 3.6, 0.18),
    new THREE.MeshStandardMaterial({ color: 0x0c111a, metalness: 0.75 })
  );
  panel.position.y = 1.95;
  g.add(panel);

  // Top glow bar
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.1, 0.2),
    new THREE.MeshBasicMaterial({ color })
  );
  glow.position.y = 3.82;
  g.add(glow);

  // Side glow strips
  [-1.05, 1.05].forEach((sx) => {
    const sg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 3.5, 0.06),
      new THREE.MeshBasicMaterial({ color }));
    sg.position.set(sx, 1.9, 0.1);
    g.add(sg);
  });

  const doorLight = new THREE.PointLight(color, 1.8, 8);
  doorLight.position.set(0, 3.6, 0.7);
  g.add(doorLight);

  // Terminal pedestal
  const ped = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.1, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x161e2b, metalness: 0.85 }));
  ped.position.set(1.85, 0.55, 0.6);
  g.add(ped);

  // Pedestal screen
  const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.38),
    new THREE.MeshBasicMaterial({ color }));
  sc.position.set(1.85, 1.08, 0.88);
  sc.rotation.x = -0.32;
  g.add(sc);

  const tl = new THREE.PointLight(color, 1.0, 3.5);
  tl.position.set(1.85, 1.12, 1.05);
  g.add(tl);

  scene.add(g);

  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
  doorRegistry[doorType] = {
    position: new THREE.Vector3(x, 1.5, z).addScaledVector(fwd, 1.6),
    group: g, panel, glow, doorType,
  };
}

export function getDoorRegistry() { return doorRegistry; }
export function getExitDoor() { return exitDoor; }

export function setDoorUnlocked(doorType) {
  const entry = doorRegistry[doorType];
  if (entry?.panel) {
    entry.panel.position.y = 4.4;
    entry.glow.material.color.setHex(0x4caf50);
  }
}
export function setExitUnlocked() {
  if (exitDoor?.glow) {
    exitDoor.glow.material.color.setHex(0x4caf50);
    exitDoor.light?.color.setHex(0x4caf50);
  }
}
