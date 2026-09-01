// BLACKVAULT — entry point.
// Every module below has side effects on import (building scene objects,
// attaching DOM listeners), so importing them in this order is what
// actually assembles the game. See src/ for the implementation:
//
//   src/config.js         API base URL + 3D model drop-in paths
//   src/modelLoader.js    GLTF loading with placeholder fallback
//   src/sceneSetup.js     renderer/scene/camera/controls + geometry factories
//   src/world.js          builds the home room, facility corridor, doors, team
//   src/player.js         WASD movement + room bounds
//   src/narrative.js      cutscene sequences (call, briefing, alarm, ending)
//   src/puzzleTerminal.js the ML security-terminal UI + backend calls
//   src/hud.js            corner HUD: rank, XP bar, unlocked badges
//   src/interactions.js   nearest-target prompt + E-to-interact

import { camera, clock, controls, renderer, scene } from './src/sceneSetup.js';
import './src/world.js';
import { updateMovement } from './src/player.js';
import './src/narrative.js';
import './src/puzzleTerminal.js';
import './src/hud.js';
import './src/chaosEvents.js';
import { updateInteractPrompt } from './src/interactions.js';

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);
  if (controls.isLocked) {
    updateMovement(delta);
    updateInteractPrompt();
  }
  renderer.render(scene, camera);
}
animate();
