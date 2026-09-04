// BlackVault frontend entrypoint.
// Third-person player character, V key camera toggle, bright lab environment,
// bi-parting doors, ML puzzle terminals.

import * as THREE from "three";
import { initScene } from "./src/sceneSetup.js";
import { initWorld, getCurrentRoomIndex, updateDoors } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager, updateCurrentSector } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createPlayerCharacter, updatePlayerCharacter } from "./src/character.js";

const BUILD_TAG = "blackvault-lab-v4";
const tagEl = document.getElementById("build-tag");
if (tagEl) tagEl.textContent = BUILD_TAG;
console.log("[BlackVault] Initializing multi-sector facility:", BUILD_TAG);

// 1. Scene & Renderer
const { scene, camera, renderer } = initScene();

// 2. Multi-room facility layout & door stations
initWorld(scene);

// 3. Player movement & pointer lock (pass scene so arms can be added)
initPlayer(camera, renderer.domElement, scene);

// 4. Third-person player body (created after initPlayer so setPlayerBodyMesh is ready)
createPlayerCharacter(scene);

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

  // Player movement & camera
  updatePlayer(delta);

  // Animate player body (walk cycle, idle)
  updatePlayerCharacter(delta);

  updateInteractions();

  // Update active sector based on player position in facility
  const playerPos = getPlayerPosition();
  const activeSector = getCurrentRoomIndex(playerPos.z);
  updateCurrentSector(activeSector);

  // Animate bi-parting door slides
  updateDoors(delta);

  renderer.render(scene, camera);
}

animate();
