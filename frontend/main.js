// BlackVault frontend entrypoint.
// Third-person/first-person player, V key camera toggle, dark tech lab,
// ML puzzle terminals with real code editor.

import * as THREE from "three";
import { initScene } from "./src/sceneSetup.js";
import { initWorld } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createPlayerCharacter, updatePlayerCharacter } from "./src/character.js";

const BUILD_TAG = "blackvault-dark-v5";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing dark tech facility:", BUILD_TAG);

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

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    // Player movement & camera
    updatePlayer(delta);

    // Animate player body (walk cycle, idle)
    updatePlayerCharacter(delta);

    updateInteractions();

    renderer.render(scene, camera);
  }

  animate();
})();
