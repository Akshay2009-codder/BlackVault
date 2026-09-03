// BlackVault frontend entrypoint.
// Connects Three.js hub scene, player controls, raycasting interactions,
// terminal puzzle UI, level progression, and security guard AI voice.

import * as THREE from "three";
import { initScene, getCamera, getRenderer, getScene } from "./src/sceneSetup.js";
import { initWorld } from "./src/world.js";
import { initPlayer, updatePlayer } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";

const BUILD_TAG = "blackvault-level-hub-v2";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing hub:", BUILD_TAG);

// 1. Scene & Renderer
const { scene, camera, renderer } = initScene();

// 2. Hub geometry & 5 doors
initWorld(scene);

// 3. Player movement & pointer lock
initPlayer(camera, renderer.domElement);

// 4. Raycasting door interactions
initInteractions(camera, (doorType) => {
  openTerminal(doorType);
});

// 5. Terminal UI & Level Progression
initTerminalUI();
initGuardVoice();
initLevelManager({ level: 1 });

// 6. Animation Loop
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updatePlayer(delta);
  updateInteractions();

  renderer.render(scene, camera);
}

animate();
