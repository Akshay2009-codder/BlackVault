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
  const amb = new THREE.AmbientLight(0x2a3646, 1.1);
  scene.add(amb);
  const point = new THREE.PointLight(color, intensity, 20);
  point.position.set(0, 3, 0);
  scene.add(point);
}

export function makeRoom(width, depth, height, wallColor = 0x161c26) {
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

// ---------------------------------------------------------------------------
// Phase 3 — Chaos Event visual effects
// ---------------------------------------------------------------------------

/**
 * Shake the camera for `durationMs` milliseconds.
 * `intensity` is in world-space units (0.01 is subtle, 0.08 is violent).
 */
export function cameraShake(intensity = 0.04, durationMs = 600) {
  const origin = camera.position.clone();
  const startTime = performance.now();

  function step() {
    const elapsed = performance.now() - startTime;
    if (elapsed >= durationMs) {
      // Snap back to origin to avoid drift.
      camera.position.copy(origin);
      return;
    }
    // Decay envelope: starts at full intensity, eases to zero.
    const t = elapsed / durationMs;
    const decay = 1 - t * t;
    camera.position.set(
      origin.x + (Math.random() * 2 - 1) * intensity * decay,
      origin.y + (Math.random() * 2 - 1) * intensity * decay * 0.5,
      origin.z + (Math.random() * 2 - 1) * intensity * decay,
    );
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Flash the #vignette overlay with `color` (CSS string or hex) at `opacity`
 * for `durationMs` milliseconds, then fade out.
 *
 * Requires a `<div id="vignette"></div>` in index.html styled with
 * `position:fixed; inset:0; pointer-events:none; z-index:9;`.
 */
export function setVignette(color = '#d9534f', opacity = 0.55, durationMs = 800) {
  const el = document.getElementById('vignette');
  if (!el) return;

  el.style.background = color;
  el.style.opacity = String(opacity);
  el.style.transition = 'none';

  // After a brief hold, fade out smoothly.
  const holdMs = durationMs * 0.25;
  setTimeout(() => {
    el.style.transition = `opacity ${durationMs * 0.75}ms ease-out`;
    el.style.opacity = '0';
  }, holdMs);
}

