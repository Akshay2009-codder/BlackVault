// Three.js renderer, camera, and lighting setup for BlackVault.
// Deep Ocean-Slate + Warm Brass corporate tower aesthetic.
// Cool ambient fill, steel-blue hemisphere, champagne directional light.
//
// Post-processing stack (in order):
//   1. RenderPass   — main scene render
//   2. UnrealBloomPass — selective glow on emissive/neon elements
//   3. ShaderPass (vignette + colour-grade) — cinematic frame + palette unity
//   4. OutputPass   — gamma/sRGB conversion

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

let scene, camera, renderer;
let dustParticles = null;
let composer = null;

// Idle camera sway state — subtle breathing effect
let swayTime = 0;
let baseCamPos = null;   // captured once player has spawned
let camSwayEnabled = true;

// Registry of { light, baseIntensity } objects for idle monitor flicker
const flickerLights = [];

export function registerFlickerLight(light, baseIntensity) {
  flickerLights.push({ light, baseIntensity });
}

export function setCamSwayEnabled(v) { camSwayEnabled = v; }

// ── Custom vignette + colour-grade shader ──────────────────────────────
// Applied as a full-screen ShaderPass after bloom.
// Vignette: radial darkness from edges toward centre.
// Colour grade: lift shadows to warm dark-teal, push highlights cream.
const VignetteColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVigStrength: { value: 0.72 },   // vignette darkness
    uVigSoftness: { value: 0.60 },   // vignette radius
    uSaturation:  { value: 1.08 },   // slight saturation boost
    uContrast:    { value: 1.06 },   // slight contrast lift
    // Shadow tint: warm dark teal (matches scene background)
    uShadowTint:  { value: new THREE.Color(0.10, 0.16, 0.20) },
    // Highlight tint: warm cream (matches CSS --cream)
    uHighlightTint: { value: new THREE.Color(0.98, 0.92, 0.85) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uVigStrength;
    uniform float uVigSoftness;
    uniform float uSaturation;
    uniform float uContrast;
    uniform vec3 uShadowTint;
    uniform vec3 uHighlightTint;
    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);

      // ── 1. Vignette ──────────────────────────────────────────────
      vec2 uv = vUv - 0.5;
      float vd = dot(uv, uv);
      float vignette = smoothstep(uVigSoftness, uVigSoftness - 0.35, vd * uVigStrength);
      color.rgb *= vignette;

      // ── 2. Saturation ────────────────────────────────────────────
      float luma = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
      color.rgb = mix(vec3(luma), color.rgb, uSaturation);

      // ── 3. Contrast ──────────────────────────────────────────────
      color.rgb = (color.rgb - 0.5) * uContrast + 0.5;

      // ── 4. Shadow / Highlight tint (colour grade) ─────────────
      // Blend shadow tint into dark areas, highlight tint into bright areas
      float brightness = dot(color.rgb, vec3(0.333));
      color.rgb = mix(
        mix(color.rgb, uShadowTint,    (1.0 - brightness) * 0.18),
        mix(color.rgb, uHighlightTint, brightness          * 0.09),
        0.5
      );

      color.rgb = clamp(color.rgb, 0.0, 1.0);
      gl_FragColor = color;
    }
  `,
};

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
    precision: "highp",
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

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
  skyDirLight.shadow.mapSize.width = 1024;
  skyDirLight.shadow.mapSize.height = 1024;
  skyDirLight.shadow.bias = -0.0001;
  skyDirLight.shadow.normalBias = 0.02;
  skyDirLight.shadow.camera.near = 0.5;
  skyDirLight.shadow.camera.far = 280;
  skyDirLight.shadow.camera.left  = -35;
  skyDirLight.shadow.camera.right  = 35;
  skyDirLight.shadow.camera.top    = 35;
  skyDirLight.shadow.camera.bottom = -35;
  scene.add(skyDirLight);

  // ── Post-Processing Stack ─────────────────────────────────────────
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // 1. Bloom — tuned for emissive neon signs, door glows, screens
  //    Slightly stronger than before (0.30→0.42), same tight threshold so
  //    only truly bright emissive surfaces bloom, not the whole scene.
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.42,   // strength: punchy enough to feel real without halation
    0.30,   // radius:   tight spread — neons glow, walls don't
    0.82    // threshold: only picks up emissive + very bright areas
  );
  composer.addPass(bloomPass);

  // 2. Vignette + Colour Grade — one full-screen ShaderPass
  const vignettePass = new ShaderPass(VignetteColorGradeShader);
  composer.addPass(vignettePass);

  // 3. Output — gamma correction / sRGB
  composer.addPass(new OutputPass());

  // ── Atmospheric Data Motes — electric cyan (GPU-friendly) ────────
  createDustMotes();

  window.addEventListener("resize", onWindowResize, { passive: true });
  scene.add(camera);

  return { scene, camera, renderer };
}

function createDustMotes() {
  const particleCount = 500;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const speeds    = new Float32Array(particleCount);   // per-particle vertical drift speed

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 38;
    positions[i * 3 + 1] = Math.random() * 8.0 + 0.3;
    positions[i * 3 + 2] = Math.random() * 180 - 5;
    speeds[i] = 0.04 + Math.random() * 0.08; // varied drift
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));

  // Electric cyan floating data motes
  const material = new THREE.PointsMaterial({
    color: 0x2fd1ff,
    size: 0.048,
    transparent: true,
    opacity: 0.30,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  dustParticles = new THREE.Points(geometry, material);
  dustParticles.userData.positions = positions;
  dustParticles.userData.speeds = speeds;
  scene.add(dustParticles);
}

export function updateSceneEffects(delta) {
  // ── Dust motes: per-particle drift with gentle xy oscillation ────
  if (dustParticles) {
    const pos = dustParticles.userData.positions;
    const spd = dustParticles.userData.speeds;
    const t = performance.now() * 0.001;
    for (let i = 0; i < pos.length / 3; i++) {
      pos[i * 3 + 1] += spd[i] * delta;
      pos[i * 3]     += Math.sin(t * 0.3 + i * 0.5) * 0.002; // gentle lateral drift
      if (pos[i * 3 + 1] > 9.0) {
        pos[i * 3 + 1] = 0.2;
      }
    }
    dustParticles.geometry.attributes.position.needsUpdate = true;
  }

  // ── Idle camera sway — subtle breathing while standing still ─────
  // Only active when pointer is locked (i.e., player is in-world, not in IDE)
  if (camSwayEnabled && camera && document.pointerLockElement) {
    swayTime += delta;
    // Very small amplitudes: barely perceptible but makes the world feel alive
    const swayX = Math.sin(swayTime * 0.55) * 0.0018;
    const swayY = Math.sin(swayTime * 0.38) * 0.0012 + Math.sin(swayTime * 0.91) * 0.0006;
    camera.position.x += swayX;
    camera.position.y += swayY;
  }
}

// Stable ambient illumination
export function updateAnimatables(delta) {
  // Empty - lights are static and stable for maximum frame rate
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
