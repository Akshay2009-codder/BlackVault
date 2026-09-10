// Three.js renderer, camera, and lighting setup for the BlackVault Studio Lab.
// DARK TECH LAB AESTHETIC — accent lights carry the color, not the room itself.

import * as THREE from "three";

let scene, camera, renderer;

export function initScene() {
  const canvas = document.getElementById("scene");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xecf3f9);
  scene.fog = new THREE.FogExp2(0xecf3f9, 0.003);

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.92, 5.5);
  camera.lookAt(0, 1.45, -4.5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // High ambient fill for a bright, pristine lab environment
  const ambientLight = new THREE.AmbientLight(0xf0f4f8, 0.85);
  scene.add(ambientLight);

  // Cool sky directional sunlight/window fill
  const skyDirLight = new THREE.DirectionalLight(0x9bd0ff, 1.2);
  skyDirLight.position.set(0, 12.0, -10);
  skyDirLight.target.position.set(0, 1.0, 0);
  scene.add(skyDirLight);
  scene.add(skyDirLight.target);

  // Bright overhead studio ceiling lights
  const mainStudioLight = new THREE.PointLight(0xfff8ee, 1.2, 38, 1.2);
  mainStudioLight.position.set(0, 4.8, 1.5);
  scene.add(mainStudioLight);

  const backStudioLight = new THREE.PointLight(0xe0f0ff, 1.1, 34, 1.2);
  backStudioLight.position.set(0, 4.8, -6.5);
  scene.add(backStudioLight);

  window.addEventListener("resize", onWindowResize);

  scene.add(camera);

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
