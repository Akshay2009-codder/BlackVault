import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const API_BASE = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// 3D asset loading — drop your own .glb/.gltf files in frontend/assets/models/
// using these exact filenames and the game will use them automatically.
// If a file is missing, the procedural placeholder mesh stays on screen, so
// nothing breaks while assets are still being produced. See
// frontend/assets/models/README.md for scale/pivot conventions.
// ---------------------------------------------------------------------------
const gltfLoader = new GLTFLoader();
const MODEL_PATHS = {
  home_room: 'assets/models/home_room.glb',
  facility_corridor: 'assets/models/facility_corridor.glb',
  phone: 'assets/models/phone.glb',
  security_door: 'assets/models/security_door.glb',
};

/**
 * Tries to load a GLB at `path`. On success, removes `placeholder` from
 * `parent` and adds the loaded model in its place (copying position/rotation
 * from the placeholder), then calls `opts.onReplaced(model)` so callers can
 * update any references (interactables, door tracking, etc.) that were
 * pointing at the placeholder. On failure (file not present yet), does
 * nothing — the placeholder keeps rendering.
 */
function replaceWithModel(path, placeholder, parent, opts = {}) {
  gltfLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.position.copy(placeholder.position);
      model.rotation.copy(placeholder.rotation);
      if (opts.scale) model.scale.setScalar(opts.scale);
      parent.remove(placeholder);
      parent.add(model);
      if (opts.onReplaced) opts.onReplaced(model);
    },
    undefined,
    () => { /* model not provided yet — keep procedural placeholder */ }
  );
}

/**
 * For whole-room placeholders (a THREE.Group of floor/wall/ceiling meshes):
 * hides the procedural geometry and adds the loaded model as a child of the
 * SAME group, so existing `group.visible` toggles (scene switching) keep
 * working without callers needing a new reference.
 */
function replaceRoomModel(path, group) {
  gltfLoader.load(
    path,
    (gltf) => {
      group.children.forEach((c) => { c.visible = false; });
      group.add(gltf.scene);
    },
    undefined,
    () => { /* model not provided yet — keep procedural room */ }
  );
}

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0e14, 6, 26);
scene.background = new THREE.Color(0x0b0e14);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 4);

const controls = new PointerLockControls(camera, document.body);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Lighting helper
// ---------------------------------------------------------------------------
function addRoomLighting(color = 0x5ec8d8, intensity = 0.6) {
  const amb = new THREE.AmbientLight(0x2a3646, 1.1);
  scene.add(amb);
  const point = new THREE.PointLight(color, intensity, 20);
  point.position.set(0, 3, 0);
  scene.add(point);
}

function makeRoom(width, depth, height, wallColor = 0x161c26) {
  const group = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x0e131b, roughness: 0.9 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), floorMat);
  floor.rotation.x = -Math.PI / 2;
  group.add(floor);

  const ceiling = floor.clone();
  ceiling.position.y = height;
  ceiling.rotation.x = Math.PI / 2;
  group.add(ceiling);

  const wallDefs = [
    { w: width, x: 0, z: -depth / 2, ry: 0 },
    { w: width, x: 0, z: depth / 2, ry: Math.PI },
    { w: depth, x: -width / 2, z: 0, ry: Math.PI / 2 },
    { w: depth, x: width / 2, z: 0, ry: -Math.PI / 2 },
  ];
  wallDefs.forEach((d) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(d.w, height), wallMat);
    wall.position.set(d.x, height / 2, d.z);
    wall.rotation.y = d.ry;
    group.add(wall);
  });

  return group;
}

function makeDoor(color = 0xd9534f) {
  const geo = new THREE.BoxGeometry(1.6, 2.6, 0.15);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------------------
// Scene 1: Home
// ---------------------------------------------------------------------------
const homeGroup = makeRoom(8, 8, 3);
scene.add(homeGroup);
addRoomLighting(0x5ec8d8, 0.5);
replaceRoomModel(MODEL_PATHS.home_room, homeGroup);

const phoneGeo = new THREE.BoxGeometry(0.25, 0.05, 0.5);
const phoneMat = new THREE.MeshStandardMaterial({ color: 0xe8a33d, emissive: 0xe8a33d, emissiveIntensity: 0.6 });
let phone = new THREE.Mesh(phoneGeo, phoneMat);
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
const desk = new THREE.Mesh(deskGeo, deskMat);
desk.position.set(0, 0.375, -2);
scene.add(desk);

// ---------------------------------------------------------------------------
// Scene 2: Facility corridor (built, hidden until travel)
// A single long corridor with three sequential security doors, one per
// ML puzzle type — matches the brief's "each door = a different ML
// problem, harder deeper in" structure without needing separate rooms yet.
// ---------------------------------------------------------------------------
const CORRIDOR_HALF_DEPTH = 22;
const facilityGroup = new THREE.Group();
facilityGroup.visible = false;
scene.add(facilityGroup);

const corridor = makeRoom(6, CORRIDOR_HALF_DEPTH * 2, 3, 0x121722);
facilityGroup.add(corridor);
replaceRoomModel(MODEL_PATHS.facility_corridor, corridor);

const DOOR_DEFS = [
  { z: -8, puzzleType: 'classification', title: 'Badge Fraud Detector', difficulty: 1 },
  { z: -15, puzzleType: 'clustering', title: 'Customer Cluster Grid', difficulty: 2 },
  { z: -21, puzzleType: 'anomaly', title: 'Fraud Transaction Scanner', difficulty: 3 },
];

const doors = DOOR_DEFS.map((def) => {
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

// ---------------------------------------------------------------------------
// Interaction targets
// ---------------------------------------------------------------------------
const interactables = [
  { mesh: phone, range: 2, id: 'phone', used: false },
  ...doors.map((d, i) => ({ mesh: d.mesh, range: 2.4, id: `door_${i}`, used: false, door: d })),
];

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------
const move = { forward: false, back: false, left: false, right: false };
const velocity = new THREE.Vector3();
const clock = new THREE.Clock();

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.back = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
    case 'KeyE': tryInteract(); break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.back = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
});

function updateMovement(delta) {
  const speed = 3.2;
  velocity.set(0, 0, 0);
  if (move.forward) velocity.z -= 1;
  if (move.back) velocity.z += 1;
  if (move.left) velocity.x -= 1;
  if (move.right) velocity.x += 1;
  if (velocity.lengthSq() > 0) {
    velocity.normalize().multiplyScalar(speed * delta);
    controls.moveRight(velocity.x);
    controls.moveForward(-velocity.z);
  }
  // keep player inside current room bounds; in the facility, the nearest
  // still-locked door blocks further progress down the corridor
  const p = controls.object.position;
  if (facilityGroup.visible) {
    const firstLocked = doors.find((d) => !d.unlocked);
    const zMin = firstLocked ? firstLocked.z + 1.3 : -(CORRIDOR_HALF_DEPTH - 1);
    p.x = Math.max(-2.7, Math.min(2.7, p.x));
    p.z = Math.max(zMin, Math.min(CORRIDOR_HALF_DEPTH - 1, p.z));
  } else {
    p.x = Math.max(-3.7, Math.min(3.7, p.x));
    p.z = Math.max(-3.7, Math.min(3.7, p.z));
  }
  p.y = 1.7;
}

// ---------------------------------------------------------------------------
// Interact prompt / nearest target
// ---------------------------------------------------------------------------
const promptEl = document.getElementById('interact-prompt');
let nearestTarget = null;

function updateInteractPrompt() {
  const p = controls.object.position;
  let nearest = null, nearestDist = Infinity;
  for (const t of interactables) {
    if (t.used || !t.mesh.parent || !t.mesh.parent.visible && t.mesh.parent !== scene) continue;
    if (t.id === 'phone' && facilityGroup.visible) continue;
    if (t.id.startsWith('door_') && !facilityGroup.visible) continue;
    const d = p.distanceTo(t.mesh.getWorldPosition(new THREE.Vector3()));
    if (d < t.range && d < nearestDist) { nearest = t; nearestDist = d; }
  }
  nearestTarget = nearest;
  promptEl.classList.toggle('hidden', !nearest);
}

function tryInteract() {
  if (!nearestTarget) return;
  if (nearestTarget.id === 'phone') startPhoneCutscene();
  if (nearestTarget.id.startsWith('door_')) openPuzzleTerminal(nearestTarget.door);
}

// ---------------------------------------------------------------------------
// UI flow: start -> phone cutscene -> map -> facility -> door puzzle
// ---------------------------------------------------------------------------
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const cutsceneEl = document.getElementById('cutscene');
const cutsceneSpeaker = document.getElementById('cutscene-speaker');
const cutsceneText = document.getElementById('cutscene-text');
const cutsceneNext = document.getElementById('cutscene-next');
const mapScreen = document.getElementById('map-screen');
const travelBtn = document.getElementById('travel-btn');

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  controls.lock();
});

const CALL_LINES = [
  { speaker: 'UNKNOWN CALLER', text: 'Don\u2019t hang up. We need someone with your access history \u2014 tonight.' },
  { speaker: 'UNKNOWN CALLER', text: 'Meridian Research is running an unauthorized ML weapons-classification project. We\u2019re shutting it down.' },
  { speaker: 'UNKNOWN CALLER', text: 'A team is already assembling. Coordinates incoming. Move.' },
];
let callIndex = 0;
let cutsceneMode = 'call'; // 'call' | 'end'

function startPhoneCutscene() {
  controls.unlock();
  cutsceneMode = 'call';
  callIndex = 0;
  showCallLine();
  cutsceneEl.classList.remove('hidden');
}

function showCallLine() {
  const line = CALL_LINES[callIndex];
  cutsceneSpeaker.textContent = line.speaker;
  cutsceneText.textContent = line.text;
  cutsceneNext.textContent = callIndex < CALL_LINES.length - 1 ? 'CONTINUE \u25b8' : 'VIEW LOCATION \u25b8';
}

cutsceneNext.addEventListener('click', () => {
  if (cutsceneMode === 'end') {
    cutsceneEl.classList.add('hidden');
    return;
  }
  callIndex++;
  if (callIndex < CALL_LINES.length) {
    showCallLine();
  } else {
    cutsceneEl.classList.add('hidden');
    interactables.find((t) => t.id === 'phone').used = true;
    mapScreen.classList.remove('hidden');
  }
});

travelBtn.addEventListener('click', () => {
  mapScreen.classList.add('hidden');
  homeGroup.visible = false;
  phone.visible = false;
  desk.visible = false;
  facilityGroup.visible = true;
  controls.object.position.set(0, 1.7, 20);
  controls.lock();
});

// ---------------------------------------------------------------------------
// ML puzzle terminal
// ---------------------------------------------------------------------------
const puzzleScreen = document.getElementById('puzzle-screen');
const puzzleTitleEl = document.getElementById('puzzle-title');
const puzzleTimerEl = document.getElementById('puzzle-timer');
const metricLabelEl = document.getElementById('puzzle-metric-label');
const statRows = document.getElementById('stat-rows');
const statMissing = document.getElementById('stat-missing');
const statDupes = document.getElementById('stat-dupes');
const previewTable = document.getElementById('preview-table');
const ctlModel = document.getElementById('ctl-model');
const submitBtn = document.getElementById('submit-btn');
const resultEl = document.getElementById('puzzle-result');

let currentPuzzle = null;
let timerInterval = null;

const MODEL_OPTIONS = {
  classification: [
    ['logistic_regression', 'Logistic Regression'],
    ['random_forest', 'Random Forest'],
    ['knn', 'K-Nearest Neighbors'],
  ],
  regression: [
    ['linear_regression', 'Linear Regression'],
    ['random_forest', 'Random Forest'],
  ],
  clustering: [
    ['kmeans', 'K-Means'],
    ['hierarchical', 'Hierarchical (Agglomerative)'],
    ['dbscan', 'DBSCAN'],
  ],
  anomaly: [
    ['isolation_forest', 'Isolation Forest'],
    ['one_class_svm', 'One-Class SVM'],
  ],
};

const missingRow = document.getElementById('ctl-missing').closest('.control-block');
const clusterRow = document.getElementById('ctl-clusters').closest('.control-block');
const contamRow = document.getElementById('ctl-contamination').closest('.control-block');

let activeDoor = null;

async function openPuzzleTerminal(door) {
  activeDoor = door;
  controls.unlock();
  puzzleScreen.classList.remove('hidden');
  resultEl.textContent = '';
  resultEl.className = '';
  submitBtn.disabled = false;

  const res = await fetch(`${API_BASE}/api/puzzle/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puzzle_type: door.puzzleType, difficulty: door.difficulty }),
  });
  currentPuzzle = await res.json();

  puzzleTitleEl.textContent = currentPuzzle.title.toUpperCase();
  const metricLabel = currentPuzzle.metric === 'silhouette' ? 'SILHOUETTE' : currentPuzzle.metric.toUpperCase();
  metricLabelEl.textContent = `${metricLabel} \u2265 ${currentPuzzle.threshold}`;
  statRows.textContent = currentPuzzle.row_count;
  statMissing.textContent = currentPuzzle.missing_cell_count;
  statDupes.textContent = currentPuzzle.duplicate_row_count;

  renderPreviewTable(currentPuzzle);

  // clustering has no target column to clean around missing values in the
  // same way, but preprocessing controls stay relevant, so keep them visible
  // for every type; only the type-specific extra params toggle.
  missingRow.classList.remove('hidden');
  clusterRow.classList.toggle('hidden', currentPuzzle.type !== 'clustering');
  contamRow.classList.toggle('hidden', currentPuzzle.type !== 'anomaly');
  if (currentPuzzle.type === 'clustering') {
    document.getElementById('ctl-clusters').value = currentPuzzle.suggested_k || 3;
  }
  if (currentPuzzle.type === 'anomaly') {
    document.getElementById('ctl-contamination').value = currentPuzzle.contamination || 0.05;
  }

  ctlModel.innerHTML = '';
  for (const [val, label] of MODEL_OPTIONS[currentPuzzle.type]) {
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = label;
    ctlModel.appendChild(opt);
  }

  startTimer(currentPuzzle.time_limit_seconds);
}

function renderPreviewTable(puzzle) {
  const cols = puzzle.target_col ? [...puzzle.feature_cols, puzzle.target_col] : [...puzzle.feature_cols];
  const thead = `<tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const rows = puzzle.preview_rows.map((row) => {
    return `<tr>${cols.map((c) => {
      const v = row[c];
      if (v === null || v === undefined) return `<td class="na">NaN</td>`;
      return `<td>${typeof v === 'number' ? v.toFixed(2) : v}</td>`;
    }).join('')}</tr>`;
  }).join('');
  previewTable.innerHTML = thead + rows;
}

function startTimer(seconds) {
  clearInterval(timerInterval);
  let remaining = seconds;
  updateTimerDisplay(remaining);
  timerInterval = setInterval(() => {
    remaining -= 1;
    updateTimerDisplay(remaining);
    if (remaining <= 0) {
      clearInterval(timerInterval);
      resultEl.textContent = 'TIME EXPIRED \u2014 LOCK REASSERTED';
      resultEl.className = 'denied';
      submitBtn.disabled = true;
    }
  }, 1000);
}

function updateTimerDisplay(seconds) {
  const m = Math.max(0, Math.floor(seconds / 60));
  const s = Math.max(0, seconds % 60);
  puzzleTimerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

submitBtn.addEventListener('click', async () => {
  if (!currentPuzzle) return;
  submitBtn.disabled = true;
  resultEl.textContent = 'RUNNING PIPELINE\u2026';
  resultEl.className = '';

  const body = {
    puzzle_id: currentPuzzle.puzzle_id,
    missing_strategy: document.getElementById('ctl-missing').value,
    drop_duplicates: document.getElementById('ctl-dupes').checked,
    scale_features: document.getElementById('ctl-scale').checked,
    model: ctlModel.value,
  };
  if (currentPuzzle.type === 'clustering') {
    body.n_clusters = parseInt(document.getElementById('ctl-clusters').value, 10) || 3;
  }
  if (currentPuzzle.type === 'anomaly') {
    body.contamination = parseFloat(document.getElementById('ctl-contamination').value) || 0.05;
  }

  const res = await fetch(`${API_BASE}/api/puzzle/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();

  if (data.access_granted) {
    clearInterval(timerInterval);
    resultEl.textContent = `ACCESS GRANTED \u2014 ${data.metric.toUpperCase()} ${data.score}`;
    resultEl.className = 'granted';
    unlockDoor(activeDoor);
    const isLastDoor = doors.every((d) => d.unlocked);
    setTimeout(() => {
      puzzleScreen.classList.add('hidden');
      controls.lock();
      if (isLastDoor) showEscapeComplete();
    }, 1400);
  } else {
    resultEl.textContent = data.reason
      ? data.reason.toUpperCase()
      : `ACCESS DENIED \u2014 ${data.metric.toUpperCase()} ${data.score} < ${data.threshold}`;
    resultEl.className = 'denied';
    submitBtn.disabled = false;
  }
});

function unlockDoor(door) {
  door.unlocked = true;
  door.mesh.traverse?.((obj) => {
    if (obj.material) {
      obj.material.color?.set(0x6fbf73);
      obj.material.emissive?.set?.(0x6fbf73);
    }
  });
  if (door.mesh.material) {
    door.mesh.material.color.set(0x6fbf73);
    door.mesh.material.emissive.set(0x6fbf73);
  }
  interactables.find((t) => t.door === door).used = true;
  let t = 0;
  const openAnim = () => {
    t += 0.02;
    door.mesh.position.y = door.baseY + Math.min(t, 1) * 2.6;
    if (t < 1) requestAnimationFrame(openAnim);
  };
  openAnim();
}

function showEscapeComplete() {
  cutsceneMode = 'end';
  cutsceneSpeaker.textContent = 'SECTOR CLEAR';
  cutsceneText.textContent = 'All security locks disengaged. The extraction team confirms your signal \u2014 the core escape route is open. Mission complete.';
  cutsceneNext.textContent = 'CLOSE \u25b8';
  cutsceneEl.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// Render loop
// ---------------------------------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  if (controls.isLocked) {
    updateMovement(delta);
    updateInteractPrompt();
  }
  renderer.render(scene, camera);
}
animate();
