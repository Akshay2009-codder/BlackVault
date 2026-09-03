// Three.js renderer, camera, and lighting setup for the BlackVault Studio Lab.

import * as THREE from "three";

let scene, camera, renderer;

export function initScene() {
  const canvas = document.getElementById("scene");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070b12);
  scene.fog = new THREE.FogExp2(0x09101c, 0.012);

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  // Positioned slightly elevated, looking down over the foreground workstations into the studio
  camera.position.set(0, 1.92, 5.5);
  camera.lookAt(0, 1.45, -4.5);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // ACES Filmic Tone Mapping & SRGB for photorealistic lighting balance
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // 1. Studio ambient fill (slate cool tone)
  const ambientLight = new THREE.AmbientLight(0x283850, 2.2);
  scene.add(ambientLight);

  // 2. City skyline & moonlight directional fill
  const skyDirLight = new THREE.DirectionalLight(0x70a0d4, 2.4);
  skyDirLight.position.set(0, 8.0, -20);
  skyDirLight.target.position.set(0, 1.0, 0);
  scene.add(skyDirLight);
  scene.add(skyDirLight.target);

  // 3. Central studio ceiling fill lights
  const mainStudioLight = new THREE.PointLight(0xe2f0fb, 2.5, 32, 1.1);
  mainStudioLight.position.set(0, 4.8, 1.5);
  scene.add(mainStudioLight);

  const backStudioLight = new THREE.PointLight(0xb0d8f8, 2.2, 26, 1.1);
  backStudioLight.position.set(0, 4.8, -6.5);
  scene.add(backStudioLight);

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
