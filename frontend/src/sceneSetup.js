// Three.js renderer, camera, and lighting setup for BlackVault.
// Dusty Pink + Burgundy + Cream corporate tower aesthetic.
// Warm ambient fill, cream-tinted directional light, golden dust motes.

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let scene, camera, renderer;
let dustParticles = null;
let composer = null;

// Registry of { light, baseIntensity } objects for idle monitor flicker
const flickerLights = [];

export function registerFlickerLight(light, baseIntensity) {
  flickerLights.push({ light, baseIntensity });
}

export function initScene() {
  const canvas = document.getElementById("scene");

  scene = new THREE.Scene();
  // Cream architecture: warm off-white background
  scene.background = new THREE.Color(0xf2e8dc);
  // Airy warm fog — gives depth while staying in the cream palette
  scene.fog = new THREE.FogExp2(0xf2e8dc, 0.005);

  camera = new THREE.PerspectiveCamera(
    64,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.95, 2.5);
  camera.lookAt(0, 1.45, 12.0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Warm cream ambient fill — bright enough to read the cream walls clearly
  const ambientLight = new THREE.AmbientLight(0xfff5ee, 1.5);
  scene.add(ambientLight);

  // Warm golden-white overhead directional light (simulates recessed ceiling panels)
  const skyDirLight = new THREE.DirectionalLight(0xfff3e0, 0.95);
  skyDirLight.position.set(5, 22.0, 10);
  skyDirLight.castShadow = true;
  skyDirLight.shadow.mapSize.width = 2048;
  skyDirLight.shadow.mapSize.height = 2048;
  skyDirLight.shadow.bias = -0.0001;
  skyDirLight.shadow.camera.near = 0.5;
  skyDirLight.shadow.camera.far = 200;
  skyDirLight.shadow.camera.left  = -30;
  skyDirLight.shadow.camera.right  = 30;
  skyDirLight.shadow.camera.top    = 30;
  skyDirLight.shadow.camera.bottom = -30;
  scene.add(skyDirLight);

  // Soft warm fill from below (bounce off the cream floor)
  const fillLight = new THREE.DirectionalLight(0xfaf0e6, 0.35);
  fillLight.position.set(-8, 2, -5);
  scene.add(fillLight);

  // ── Post-Processing: Bloom ─────────────────────────────────────────
  // Higher threshold so cream walls stay clean; only emissive strips bloom.
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.5,    // strength
    0.45,   // radius
    0.78    // threshold — only truly bright emissives bloom
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ── Atmospheric Dust Motes — warm golden ─────────────────────────
  createDustMotes();

  window.addEventListener("resize", onWindowResize);
  scene.add(camera);

  return { scene, camera, renderer };
}

function createDustMotes() {
  const particleCount = 700;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random() * 7.0 + 0.3;
    positions[i * 3 + 2] = Math.random() * 150 - 5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Warm golden dust — floats gently in the warm cream interior
  const material = new THREE.PointsMaterial({
    color: 0xe8c88a,
    size: 0.06,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  dustParticles = new THREE.Points(geometry, material);
  scene.add(dustParticles);
}

export function updateSceneEffects(delta) {
  if (!dustParticles) return;
  const positions = dustParticles.geometry.attributes.position.array;
  const count = positions.length / 3;
  const time = performance.now() * 0.0005;

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 1] += 0.0003 + Math.sin(time + i) * 0.001;
    positions[i * 3]     += Math.cos(time + i * 0.5) * 0.0005;
    if (positions[i * 3 + 1] > 8.0) positions[i * 3 + 1] = 0.1;
  }
  dustParticles.geometry.attributes.position.needsUpdate = true;
}

// Idle monitor / light flicker animation — call every frame
export function updateAnimatables(delta) {
  const t = performance.now() * 0.001;
  for (const { light, baseIntensity } of flickerLights) {
    const flicker = 1.0
      + Math.sin(t * 7.3 + light.id) * 0.055
      + Math.sin(t * 17.1 + light.id * 0.7) * 0.022;
    light.intensity = baseIntensity * flicker;
  }
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);
}

export function getScene()    { return scene; }
export function getCamera()   { return camera; }
export function getRenderer() { return renderer; }
export function getComposer() { return composer; }
