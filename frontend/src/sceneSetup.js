// Three.js renderer, camera, and lighting setup for BlackVault facility.
// Bright clean neutral architecture with soft warm ambient fill & atmospheric dust motes.
// Post-processing: EffectComposer + UnrealBloomPass for emissive bloom.

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
  // Light neutral architecture: off-white background instead of dark cyberpunk void
  scene.background = new THREE.Color(0xf2f4f7);
  // Airy, sparse fog — gives depth without the dark smothering look
  scene.fog = new THREE.FogExp2(0xf2f4f7, 0.006);

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
  renderer.toneMappingExposure = 1.05; // Slightly reduced — light walls don't need as much push
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Bright clean ambient fill for the neutral facility
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.6);
  scene.add(ambientLight);

  // Warm white overhead directional light (simulates ceiling panels / recessed lighting)
  const skyDirLight = new THREE.DirectionalLight(0xfff8f0, 1.0);
  skyDirLight.position.set(5, 22.0, 10);
  skyDirLight.castShadow = true;
  skyDirLight.shadow.mapSize.width = 2048;
  skyDirLight.shadow.mapSize.height = 2048;
  skyDirLight.shadow.bias = -0.0001;
  skyDirLight.shadow.camera.near = 0.5;
  skyDirLight.shadow.camera.far = 200;
  skyDirLight.shadow.camera.left = -30;
  skyDirLight.shadow.camera.right = 30;
  skyDirLight.shadow.camera.top = 30;
  skyDirLight.shadow.camera.bottom = -30;
  scene.add(skyDirLight);

  // Secondary soft fill from below (bounce light off the light-coloured floor)
  const fillLight = new THREE.DirectionalLight(0xfafbfc, 0.4);
  fillLight.position.set(-8, 2, -5);
  scene.add(fillLight);

  // ── Post-Processing: Bloom ─────────────────────────────────────────
  // Higher threshold so white walls don't bloom, only vivid accent surfaces do.
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength — visible but not overwhelming on light BG
    0.5,    // radius
    0.75    // threshold — higher: only truly bright emissives bloom (door strips, neon signs)
  );
  composer.addPass(bloomPass);

  // OutputPass converts from linear to sRGB + applies tone mapping
  composer.addPass(new OutputPass());

  // ── Atmospheric Dust Motes ───────────────────────────────────────
  createDustMotes();

  window.addEventListener("resize", onWindowResize);
  scene.add(camera);

  return { scene, camera, renderer };
}

function createDustMotes() {
  const particleCount = 800;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = Math.random() * 6.5 + 0.3;
    positions[i * 3 + 2] = Math.random() * 140 - 5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Soft blue-white dust — visible against the light architecture, not garish
  const material = new THREE.PointsMaterial({
    color: 0xc8d8ff,
    size: 0.07,
    transparent: true,
    opacity: 0.28,
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
    // Gentle upward drift + lateral sway
    positions[i * 3 + 1] += 0.0004 + Math.sin(time + i) * 0.0012;
    positions[i * 3]     += Math.cos(time + i * 0.5) * 0.0006;
    // Wrap vertically so motes recycle
    if (positions[i * 3 + 1] > 7.5) positions[i * 3 + 1] = 0.1;
  }
  dustParticles.geometry.attributes.position.needsUpdate = true;
}

// Idle monitor/light flicker animation — call every frame
export function updateAnimatables(delta) {
  const t = performance.now() * 0.001;
  for (const { light, baseIntensity } of flickerLights) {
    // Subtle irregular flicker: combine two sine waves at different frequencies
    const flicker = 1.0
      + Math.sin(t * 7.3 + light.id) * 0.06
      + Math.sin(t * 17.1 + light.id * 0.7) * 0.025;
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

export function getScene() { return scene; }
export function getCamera() { return camera; }
export function getRenderer() { return renderer; }
export function getComposer() { return composer; }
