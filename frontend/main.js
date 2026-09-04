// BlackVault frontend entrypoint.
// Connects Three.js multi-sector facility, tactical 3D character,
// player movement, door computer workstation seating, PyCharm ML IDE, and level progression.

import * as THREE from "three";
import { initScene } from "./src/sceneSetup.js";
import { initWorld, getCurrentRoomIndex } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager, updateCurrentSector } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createGuard, updateGuard } from "./src/character.js";

const BUILD_TAG = "blackvault-pycharm-sector-v3";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing multi-sector facility:", BUILD_TAG);

// 1. Scene & Renderer
const { scene, camera, renderer } = initScene();

// 2. Multi-room facility layout & door stations
initWorld(scene);

// 3. Tactical 3D Character (GLB loader + animation)
createGuard(scene);

// 4. Player movement & pointer lock
initPlayer(camera, renderer.domElement);

// 5. Workstation seating & PyCharm interactions
initInteractions(camera, (doorType, roomIndex) => {
  openTerminal(doorType, roomIndex);
});

// 6. PyCharm ML IDE UI & Level Progression
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
  const playerPos = getPlayerPosition();
  updateGuard(delta, playerPos);

  // Update active sector based on player position in facility
  const activeSector = getCurrentRoomIndex(playerPos.z);
  updateCurrentSector(activeSector);

  renderer.render(scene, camera);
}

animate();
