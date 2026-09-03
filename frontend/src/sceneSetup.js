// Three.js renderer, camera, and lighting setup for the BlackVault Hub.

import * as THREE from "three";

let scene, camera, renderer;

export function initScene() {
  const canvas = document.getElementById("scene");

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0c10);
  scene.fog = new THREE.FogExp2(0x0a0c10, 0.035);

  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.7, 0);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Atmospheric Lighting
  const ambientLight = new THREE.AmbientLight(0x1a2230, 1.2);
  scene.add(ambientLight);

  const ceilingLight = new THREE.PointLight(0x5ec8d8, 2.0, 30);
  ceilingLight.position.set(0, 5, 0);
  ceilingLight.castShadow = true;
  scene.add(ceilingLight);

  const accentLight = new THREE.PointLight(0xe8a33d, 1.5, 25);
  accentLight.position.set(0, 2, -10);
  scene.add(accentLight);

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
