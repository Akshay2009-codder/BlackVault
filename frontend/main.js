// BlackVault frontend entrypoint.
// Connects Three.js hub scene, player controls, raycasting interactions,
// terminal puzzle UI, level progression, security guard AI voice, and 3D character.

import * as THREE from "three";
import { initScene, getCamera, getRenderer, getScene } from "./src/sceneSetup.js";
import { initWorld } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createGuard, updateGuard } from "./src/character.js";

const BUILD_TAG = "blackvault-level-hub-v2";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing hub:", BUILD_TAG);

// 1. Scene & Renderer
const { scene, camera, renderer } = initScene();

// 2. Hub geometry & 5 doors
initWorld(scene);

// 3. Security Guard 3D character
createGuard(scene);

// 4. Player movement & pointer lock
initPlayer(camera, renderer.domElement);

// 5. Raycasting door interactions
initInteractions(camera, (doorType) => {
  openTerminal(doorType);
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
  updatePlayer(delta);
  updateInteractions();

  // Update guard AI & animation
  updateGuard(delta, getPlayerPosition());

  renderer.render(scene, camera);
}

animate();
