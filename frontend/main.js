// BlackVault frontend entrypoint — Corporate Research Tower edition.
// Five rooms connect directly door-to-door. First-person / third-person player,
// ML puzzle terminals with real code editor.

import * as THREE from "three";
import { initScene, updateSceneEffects, updateAnimatables, getComposer, setCamSwayEnabled } from "./src/sceneSetup.js";
import { initWorld, updateWorldAnimations, setWorldSceneRef } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createPlayerCharacter, updatePlayerCharacter } from "./src/character.js";
import { initAmbient, setRoomAmbient } from "./src/ambient.js";

const BUILD_TAG = "blackvault-tower-v2-room2room";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing Corporate Research Tower:", BUILD_TAG);

let timeDilation = 1.0;
export function setTimeDilation(scale) {
  timeDilation = Math.max(0.1, Math.min(2.0, scale));
}
export function getTimeDilation() {
  return timeDilation;
}
window.setTimeDilation = setTimeDilation;

// ── Boot Sequence ───────────────────────────────────────────────────────
// Animated loading overlay: shows logo + progress bar while Three.js world initialises.
async function runBootSequence(onComplete) {
  const overlay   = document.getElementById("boot-overlay");
  const bar       = document.getElementById("boot-bar");
  const statusEl  = document.getElementById("boot-status");

  const steps = [
    [10,  "LOADING SECURE ENVIRONMENT…"],
    [28,  "BUILDING TOWER GEOMETRY…"],
    [50,  "CONSTRUCTING DOOR STATIONS…"],
    [68,  "LOADING PLAYER SYSTEMS…"],
    [82,  "WIRING PUZZLE TERMINALS…"],
    [94,  "CALIBRATING LIGHTING RIG…"],
    [100, "CLEARANCE GRANTED — ENTERING VAULT"],
  ];

  function setProgress(pct, label) {
    if (bar) bar.style.width = pct + "%";
    if (statusEl) statusEl.textContent = label;
  }

  for (const [pct, label] of steps.slice(0, -1)) {
    setProgress(pct, label);
    await new Promise(r => setTimeout(r, 160 + Math.random() * 120));
  }

  // Run the actual initialisation now
  await onComplete();

  // Final step
  setProgress(100, steps[steps.length - 1][1]);
  await new Promise(r => setTimeout(r, 500));

  // Fade out boot overlay
  if (overlay) overlay.classList.add("boot-done");
}

(async () => {
  // 1. Scene & Renderer (sync, fast)
  const { scene, camera, renderer } = initScene();

  // 2. Run boot sequence while initialising
  await runBootSequence(async () => {
    // 2a. Building environment & door stations (pass camera for cinematics)
    initWorld(scene, camera);
    setWorldSceneRef(scene); // needed by spark burst particle system

    // 2b. Player movement & pointer lock (async — loads view-model GLB)
    await initPlayer(camera, renderer.domElement, scene);

    // 2c. Third-person player body
    createPlayerCharacter(scene);

    // 2d. Workstation seating & interactions
    initInteractions(camera, (doorType, roomIndex) => {
      // Disable camera sway while in IDE
      setCamSwayEnabled(false);
      openTerminal(doorType, roomIndex);
    });

    // 2e. Terminal UI & Level Progression
    initTerminalUI();
    initGuardVoice();
    initLevelManager({ level: 1 });
  });

  window.__scene = scene;
  window.__camera = camera;
  window.__renderer = renderer;

  // 3. Start ambient audio on first user interaction (autoplay policy)
  const startAmbient = () => {
    initAmbient();
    setRoomAmbient("classification");
    document.removeEventListener("click", startAmbient);
    document.removeEventListener("keydown", startAmbient);
  };
  document.addEventListener("click", startAmbient, { once: true });
  document.addEventListener("keydown", startAmbient, { once: true });

  // Re-enable camera sway when pointer lock is acquired (exiting IDE)
  document.addEventListener("pointerlockchange", () => {
    setCamSwayEnabled(!!document.pointerLockElement);
  });

  // 4. Animation Loop
  const clock = new THREE.Clock();
  const composer = getComposer();

  function animate() {
    requestAnimationFrame(animate);

    const rawDelta = clock.getDelta();
    const delta = Math.min(0.1, rawDelta) * timeDilation;

    updatePlayer(delta);
    updatePlayerCharacter(delta);
    updateSceneEffects(delta);
    updateAnimatables(delta);
    updateWorldAnimations(delta);
    updateInteractions();

    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  animate();
})();
