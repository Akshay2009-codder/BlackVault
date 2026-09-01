import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

// ---------------------------------------------------------------------------
// Renderer / scene / camera / controls — the core Three.js objects every
// other module renders into or reads the player position from.
// ---------------------------------------------------------------------------
const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
// PBR materials read as flat/dim under the default NoToneMapping — filmic
// tone mapping + a touch of exposure is what makes a dark security-facility
// scene still look like a lit space instead of a void with floating props.
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0b0e14, 6, 26);
scene.background = new THREE.Color(0x0b0e14);

export const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 4);

export const controls = new PointerLockControls(camera, document.body);
export const clock = new THREE.Clock();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Lighting + geometry factories, reused by world.js to build both scenes
// ---------------------------------------------------------------------------
export function addRoomLighting(color = 0x5ec8d8, intensity = 0.6) {
  // Hemisphere light gives a natural sky/ground gradient fill across every
  // surface with almost no cost — this alone is what turns "flat black
  // walls" into a room you can actually read the shape of.
  const hemi = new THREE.HemisphereLight(0x4a6478, 0x11161e, 2.2);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0x4a5f74, 1.8);
  scene.add(amb);
  // Directional light has infinite range and constant intensity everywhere
  // in the scene, unlike point lights which fall off with distance — this
  // is the safety net that guarantees nothing goes fully black no matter
  // how far it is from a point light.
  const sun = new THREE.DirectionalLight(0xaac4d6, 1.1);
  sun.position.set(4, 10, 6);
  scene.add(sun);
  const point = new THREE.PointLight(color, intensity * 2.4, 26);
  point.position.set(0, 3, 0);
  scene.add(point);
}

export function makeRoom(width, depth, height, wallColor = 0x232e3d) {
  const group = new THREE.Group();
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1c2636, roughness: 0.85 });
  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });

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

  // Faint floor grid — cheap visual definition (security-facility tile
  // look) that also makes the floor plane itself legible at a glance
  // instead of reading as more void.
  const gridSize = Math.max(width, depth);
  const grid = new THREE.GridHelper(gridSize, Math.round(gridSize), 0x2f4756, 0x1c2733);
  grid.position.y = 0.01;
  group.add(grid);

  return group;
}

export function makeDoor(color = 0xd9534f) {
  const geo = new THREE.BoxGeometry(1.6, 2.6, 0.15);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 });
  return new THREE.Mesh(geo, mat);
}

export function makeTeammate(color) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.0, 4, 8), bodyMat);
  body.position.y = 0.9;
  group.add(body);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xd7c9a8, roughness: 0.7 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), headMat);
  head.position.y = 1.65;
  group.add(head);
  return group;
}

// A glowing ceiling strip light. Emissive materials self-illuminate and
// render independently of scene lighting, so this is always visible
// regardless of ambient/point light settings — it doubles as a visible
// "fixture" the room's point lights can be anchored to, and as a hard
// guarantee that a room never reads as a total void.
export function makeCeilingFixture(length = 0.7, color = 0x5ec8d8) {
  const geo = new THREE.BoxGeometry(length, 0.06, 0.18);
  const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5 });
  return new THREE.Mesh(geo, mat);
}