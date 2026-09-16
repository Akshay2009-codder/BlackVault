// Three.js renderer, camera, and lighting setup for BlackVault.
// Deep Ocean-Slate + Warm Brass corporate tower aesthetic.
// Cool ambient fill, steel-blue hemisphere, champagne directional light.

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
  // Warm teal-slate background — matches new wall palette, clearly not black
  scene.background = new THREE.Color(0x2a3e4e);
  // Atmospheric depth fog in warm teal-slate
  scene.fog = new THREE.FogExp2(0x2a3e4e, 0.0016);

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

  // Strong ambient fill so teal-slate walls are clearly visible
  const ambientLight = new THREE.AmbientLight(0xd8e8f0, 0.95);
  scene.add(ambientLight);

  // Hemisphere fill: bright cool-white sky, teal ground bounce
  const hemiLight = new THREE.HemisphereLight(0xe8f2ff, 0x2a4050, 0.80);
  scene.add(hemiLight);

  // Warm champagne directional — key light that hits the teal walls
  const skyDirLight = new THREE.DirectionalLight(0xfff0d0, 0.85);
  skyDirLight.position.set(6, 20.0, 18);
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

  // ── Post-Processing: Vivid Neon Bloom ─────────────────────────────
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.35,   // subtle calibrated strength
    0.30,   // radius
    0.85    // high threshold — standard physical materials and metal chords never bloom
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

  for (let i = 0; i < count; i++) {
    positions[i * 3 + 1] += 0.004 * delta * 60.0;
    if (positions[i * 3 + 1] > 8.0) positions[i * 3 + 1] = 0.3;
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
