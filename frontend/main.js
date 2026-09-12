// BlackVault frontend entrypoint — Corporate Research Tower edition.
// Five floors connected by elevators. First-person / third-person player,
// ML puzzle terminals with real code editor.

import * as THREE from "three";
import { initScene, updateSceneEffects, updateAnimatables, getComposer } from "./src/sceneSetup.js";
import { initWorld, updateWorldAnimations, getElevatorPositions } from "./src/world.js";
import { initPlayer, updatePlayer, getPlayerPosition } from "./src/player.js";
import { initInteractions, updateInteractions } from "./src/interactions.js";
import { initTerminalUI, openTerminal } from "./src/puzzleTerminal.js";
import { initLevelManager } from "./src/levelManager.js";
import { initGuardVoice } from "./src/guardVoice.js";
import { createPlayerCharacter, updatePlayerCharacter } from "./src/character.js";
import { initElevator } from "./src/elevator.js";

const BUILD_TAG = "blackvault-tower-v1";
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

(async () => {
  // 1. Scene & Renderer
  const { scene, camera, renderer } = initScene();

  // 2. Building environment & door stations (pass camera for cinematics)
  initWorld(scene, camera);

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

  // 7. Elevator system — get positions registered during world build
  const elevatorPositions = getElevatorPositions();
  initElevator(elevatorPositions, null);  // onRideComplete handled inside levelManager

  // 8. Animation Loop
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
