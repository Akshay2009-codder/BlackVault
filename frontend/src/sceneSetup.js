// Three.js renderer, camera, and lighting setup for BlackVault.
// Wonder-inducing "golden hour meets aurora" aesthetic.
// Warm ivory/pearl architecture, god-ray dominant key, enchanted motes.
//
// Post-processing stack (in order):
//   1. RenderPass   — main scene render
//   2. UnrealBloomPass — bloom tuned for god-rays + glowing accents
//   3. ShaderPass (vignette + warm colour-grade) — luminous cinematic grade
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
    uVigStrength: { value: 0.32 },   // gentle vignette — keeps wonder bright at edges
    uVigSoftness: { value: 0.80 },   // wide smooth falloff
    uSaturation:  { value: 1.18 },   // slightly boosted — makes gold/lavender pop
    uContrast:    { value: 1.05 },   // soft contrast lift
    // Shadow tint: warm twilight violet — no cold steel-azure in shadows
    uShadowTint:  { value: new THREE.Color(0.28, 0.24, 0.38) },
    // Highlight tint: radiant warm ivory — #F5F0E8
    uHighlightTint: { value: new THREE.Color(0.96, 0.94, 0.91) },
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
      float vignette = smoothstep(uVigSoftness, uVigSoftness - 0.40, vd * uVigStrength);
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
  // Warm pearl-ivory background — light reads luminously against ivory walls
  scene.background = new THREE.Color(0xd8cfc4);
  // Soft warm ivory-gold atmospheric haze — god-rays will be visible in this
  scene.fog = new THREE.FogExp2(0xcfc6b8, 0.0010);

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
  renderer.toneMappingExposure = 1.20;  // slightly lifted — ivory walls read warm
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  // Warm ivory ambient fill — walls receive light as luminous pearl
  const ambientLight = new THREE.AmbientLight(0xfff5e8, 0.90);
  scene.add(ambientLight);

  // Hemisphere fill: warm ivory sky above, soft amber-lavender ground bounce
  const hemiLight = new THREE.HemisphereLight(0xfff5e8, 0x9090c0, 0.80);
  scene.add(hemiLight);

  // Warm gold directional — master key light, casts god-ray-style shadows
  const skyDirLight = new THREE.DirectionalLight(0xffe8c0, 1.35);
  skyDirLight.position.set(8, 22.0, 15);
  skyDirLight.castShadow = true;
  skyDirLight.shadow.mapSize.width = 2048;
  skyDirLight.shadow.mapSize.height = 2048;
  skyDirLight.shadow.bias = -0.0001;
  skyDirLight.shadow.normalBias = 0.02;
  skyDirLight.shadow.camera.near = 0.5;
  skyDirLight.shadow.camera.far = 300;
  skyDirLight.shadow.camera.left  = -40;
  skyDirLight.shadow.camera.right  = 40;
  skyDirLight.shadow.camera.top    = 40;
  skyDirLight.shadow.camera.bottom = -40;
  scene.add(skyDirLight);

  // Secondary cool twilight-blue fill from opposite angle (aurora feel)
  const coolFill = new THREE.DirectionalLight(0xc0d0ff, 0.28);
  coolFill.position.set(-10, 12, -8);
  scene.add(coolFill);

  // ── Post-Processing Stack ─────────────────────────────────────────
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // 1. Bloom — tuned for god-rays, enchanted motes, glowing accents
  //    Wider radius so light-shaft halos bleed softly into ivory walls.
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.55,   // strength: enough for god-ray halation and mote glow
    0.55,   // radius:   wider — god-rays bleed softly, motes have halo
    0.78    // threshold: picks up bright emissives + god-ray panels
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

// Enchanted light-mote color palette — golden hour meets aurora
// Three overlapping systems in warm gold, soft lavender, and twilight blue
const MOTE_COLORS = [0xE8B84B, 0xB39DDB, 0x6B7FD7];

function createDustMotes() {
  const particleCount = 180;  // per color layer (540 total)

  MOTE_COLORS.forEach((color, layerIdx) => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds    = new Float32Array(particleCount);
    const phases    = new Float32Array(particleCount); // lateral oscillation phase

    for (let i = 0; i < particleCount; i++) {
      // Distribute across the full building length, bias toward lobby (Z<30) and vault (Z>174)
      let z;
      const r = Math.random();
      if (r < 0.35)       z = Math.random() * 34 - 5;          // lobby cluster
      else if (r < 0.55)  z = 174 + Math.random() * 52;        // vault cluster
      else                z = 30 + Math.random() * 144;         // mid floors

      positions[i * 3]     = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = Math.random() * 10.5 + 0.5;
      positions[i * 3 + 2] = z;
      speeds[i]  = 0.025 + Math.random() * 0.055;  // slow gentle drift
      phases[i]  = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("speed",    new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute("phase",    new THREE.BufferAttribute(phases, 1));

    // Mote size varies per layer: gold largest, blue smallest for depth
    const sizes = [0.062, 0.048, 0.038];
    const opacs = [0.55,  0.45,  0.40];

    const material = new THREE.PointsMaterial({
      color,
      size: sizes[layerIdx],
      transparent: true,
      opacity: opacs[layerIdx],
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData.positions = positions;
    particles.userData.speeds    = speeds;
    particles.userData.phases    = phases;
    particles.userData.maxY      = layerIdx === 0 ? 13.5 : (layerIdx === 1 ? 11.0 : 9.5);
    scene.add(particles);

    if (!dustParticles) dustParticles = particles;  // keep first ref for compat
    // Store all layers
    if (!scene.userData.moteLayers) scene.userData.moteLayers = [];
    scene.userData.moteLayers.push(particles);
  });
}

export function updateSceneEffects(delta) {
  // ── Enchanted motes: per-layer drift with gentle spiraling oscillation ────
  const layers = scene && scene.userData.moteLayers;
  if (layers) {
    const t = performance.now() * 0.001;
    layers.forEach((particles, li) => {
      const pos = particles.userData.positions;
      const spd = particles.userData.speeds;
      const phs = particles.userData.phases;
      const maxY = particles.userData.maxY || 9.0;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        // Slow upward drift
        pos[i * 3 + 1] += spd[i] * delta;
        // Gentle figure-eight lateral oscillation — enchanted float
        pos[i * 3]     += Math.sin(t * 0.22 + phs[i]) * 0.0018;
        pos[i * 3 + 2] += Math.cos(t * 0.15 + phs[i] * 0.7) * 0.0010;
        // Reset when too high — teleport back to floor
        if (pos[i * 3 + 1] > maxY) {
          pos[i * 3 + 1] = 0.3 + Math.random() * 0.5;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;
    });
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
