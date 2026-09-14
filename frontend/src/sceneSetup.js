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
  // Dark graphite architecture background
  scene.background = new THREE.Color(0x0a0c10);
  // Atmospheric tech fog — adds depth while preserving crisp neon light sources
  scene.fog = new THREE.FogExp2(0x0c0e14, 0.0055);

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
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Moody dark graphite ambient fill — kept very low so real light sources do the work
  const ambientLight = new THREE.AmbientLight(0x18202e, 0.35);
  scene.add(ambientLight);

  // Hemisphere fill: cool-white sky, near-black ground bounce
  // Gives surfaces correct directionality (top vs bottom faces differ) without any
  // colour cast — ceilings read lighter than floors, which is architecturally correct.
  const hemiLight = new THREE.HemisphereLight(0xd4e8ff, 0x0a0c10, 0.30);
  scene.add(hemiLight);

  // Cool-white overhead directional light simulating recessed ceiling fixtures
  const skyDirLight = new THREE.DirectionalLight(0xe8f4ff, 0.85);
  skyDirLight.position.set(5, 28.0, 15);
  skyDirLight.castShadow = true;
  skyDirLight.shadow.mapSize.width = 2048;
  skyDirLight.shadow.mapSize.height = 2048;
  skyDirLight.shadow.bias = -0.00005;
  skyDirLight.shadow.normalBias = 0.03; // cures shadow acne on walls and floors
  skyDirLight.shadow.camera.near = 0.5;
  skyDirLight.shadow.camera.far = 350;
  skyDirLight.shadow.camera.left  = -45;
  skyDirLight.shadow.camera.right  = 45;
  skyDirLight.shadow.camera.top    = 45;
  skyDirLight.shadow.camera.bottom = -45;
  scene.add(skyDirLight);

  // NOTE: Global colour-wash directional lights were intentionally removed.
  // Coloured accent lighting now comes only from local point/spot lights placed
  // near actual LED strip objects, screens, and signage — not from scene-wide tints.

  // ── Post-Processing: Vivid Neon Bloom ─────────────────────────────
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.72,   // reduced strength — only true emissive surfaces (LEDs, screens) bloom
    0.50,   // radius
    0.55    // raised threshold — walls lit by point lights no longer bloom
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ── Atmospheric Data Motes — electric cyan ─────────────────────────
  createDustMotes();

  window.addEventListener("resize", onWindowResize);
  scene.add(camera);

  return { scene, camera, renderer };
}

function createDustMotes() {
  const particleCount = 650;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 38;
    positions[i * 3 + 1] = Math.random() * 8.0 + 0.3;
    positions[i * 3 + 2] = Math.random() * 180 - 5;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  // Electric cyan floating data motes
  const material = new THREE.PointsMaterial({
    color: 0x2fd1ff,
    size: 0.05,
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
    positions[i * 3 + 1] += 0.0003 + Math.sin(time + i) * 0.001;
    positions[i * 3]     += Math.cos(time + i * 0.5) * 0.0005;
    if (positions[i * 3 + 1] > 8.0) positions[i * 3 + 1] = 0.1;
  }
  dustParticles.geometry.attributes.position.needsUpdate = true;
}

// Stable ambient illumination — eliminates distracting scene-wide flickering
export function updateAnimatables(delta) {
  // Keep registered lights steady at their designed base intensity
  for (const { light, baseIntensity } of flickerLights) {
    if (light && light.intensity !== baseIntensity) {
      light.intensity = baseIntensity;
    }
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
