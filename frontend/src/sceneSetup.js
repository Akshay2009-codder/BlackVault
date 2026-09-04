// Three.js renderer, camera, and lighting setup.
// Bright, clean scientific facility — daylight + fluorescent overhead fill.

import * as THREE from "three";

let scene, camera, renderer;

export function initScene() {
  const canvas = document.getElementById("scene");

  scene = new THREE.Scene();
  // Bright sky-blue background — facility has large skylights
  scene.background = new THREE.Color(0xd8e8f5);
  // Very subtle light haze for depth
  scene.fog = new THREE.FogExp2(0xd8e8f5, 0.006);

  camera = new THREE.PerspectiveCamera(
    68,
    window.innerWidth / window.innerHeight,
    0.05,
    800
  );
  camera.position.set(0, 1.72, 4.0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Reinhard tone mapping — accurate bright-light rendering
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── Lighting ──────────────────────────────────────────────────────────────

  // 1. Hemisphere light: daylight sky + light concrete ground bounce
  const hemi = new THREE.HemisphereLight(0xddeeff, 0xc8d4c0, 3.2);
  scene.add(hemi);

  // 2. Warm overall ambient fill — bright lab fluorescent feel
  const ambient = new THREE.AmbientLight(0xfff8f0, 2.8);
  scene.add(ambient);

  // 3. Main overhead directional sun (casting sharp shadows)
  const sun = new THREE.DirectionalLight(0xfff5e0, 3.5);
  sun.position.set(5, 14, 6);
  sun.target.position.set(0, 0, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -30;
  sun.shadow.camera.right = 30;
  sun.shadow.camera.top = 30;
  sun.shadow.camera.bottom = -30;
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  scene.add(sun.target);

  // 4. Cool fill from opposite side to soften shadows
  const fillLight = new THREE.DirectionalLight(0xd0e8ff, 1.6);
  fillLight.position.set(-8, 8, -15);
  scene.add(fillLight);

  window.addEventListener("resize", onWindowResize);

  return { scene, camera, renderer };
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
