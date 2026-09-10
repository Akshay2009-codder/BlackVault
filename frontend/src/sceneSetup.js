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
  scene.background = new THREE.Color(0xf2f4f7);
  scene.fog = new THREE.FogExp2(0xe8ecf1, 0.0025);

  camera = new THREE.PerspectiveCamera(
    62,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 1.92, 2.5);
  camera.lookAt(0, 1.45, 12.0);

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Clean bright ambient fill for soft white walls & warm light grey floor
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
  scene.add(ambientLight);

  // Soft sky directional fill
  const skyDirLight = new THREE.DirectionalLight(0xf0f4f8, 1.1);
  skyDirLight.position.set(5, 18.0, 10);
  skyDirLight.castShadow = true;
  skyDirLight.shadow.mapSize.width = 2048;
  skyDirLight.shadow.mapSize.height = 2048;
  skyDirLight.shadow.bias = -0.0001;
  scene.add(skyDirLight);

  // ── Post-Processing: Bloom ─────────────────────────────────────────
  // Genuine glow on all emissive materials (door glows, light strips, core).
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength — noticeable but not blown-out on light walls
    0.40,   // radius
    0.72    // threshold — only truly emissive surfaces bloom
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
  const particleCount = 450;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = Math.random() * 5.0 + 0.2;
    positions[i * 3 + 2] = Math.random() * 120 - 5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x2f80ed,
    size: 0.08,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
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
    positions[i * 3 + 1] += Math.sin(time + i) * 0.0015;
    positions[i * 3] += Math.cos(time + i * 0.5) * 0.0008;
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
