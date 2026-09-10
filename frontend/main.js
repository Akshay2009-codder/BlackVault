// BlackVault frontend entrypoint.
// Third-person/first-person player, V key camera toggle, dark tech lab,
// ML puzzle terminals with real code editor.

import * as THREE from "three";
import { initScene, updateSceneEffects, updateAnimatables, getComposer } from "./src/sceneSetup.js";
import { initWorld, updateWorldAnimations } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createPlayerCharacter, updatePlayerCharacter } from "./src/character.js";

const BUILD_TAG = "blackvault-overhaul-v7";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing overhauled facility:", BUILD_TAG);

// Async init wrapper — initPlayer now loads the GLB view-model
(async () => {
  // 1. Scene & Renderer
  const { scene, camera, renderer } = initScene();

  // 2. Lab environment & door stations
  initWorld(scene);

  // 3. Player movement & pointer lock (async — loads view-model GLB)
  await initPlayer(camera, renderer.domElement, scene);

  // 4. Third-person player body
  createPlayerCharacter(scene);

  // 5. Workstation seating & interactions
  initInteractions(camera, (doorType, roomIndex) => {
    openTerminal(doorType, roomIndex);
  });

  // 6. Terminal UI & Level Progression
  initTerminalUI();
  initGuardVoice();
  initLevelManager({ level: 1 });

  // 7. Animation Loop
  const clock = new THREE.Clock();
  const composer = getComposer();

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Player movement & camera
    updatePlayer(delta);

    // Animate player body (walk cycle, idle)
    updatePlayerCharacter(delta);

    // Animate atmospheric effects (dust motes)
    updateSceneEffects(delta);

    // Idle monitor flicker & emissive pulse
    updateAnimatables(delta);

    // Mystery core spin + hover animation
    updateWorldAnimations(delta);

    updateInteractions();

    // Render via EffectComposer (bloom pass) instead of renderer directly
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, camera);
    }
  }

  animate();
})();
