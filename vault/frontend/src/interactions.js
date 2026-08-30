import * as THREE from 'three';
import { controls, scene } from './sceneSetup.js';
import { facilityGroup, interactables } from './world.js';
import { startPhoneCutscene } from './narrative.js';
import { openPuzzleTerminal } from './puzzleTerminal.js';

const promptEl = document.getElementById('interact-prompt');
let nearestTarget = null;

export function updateInteractPrompt() {
  const p = controls.object.position;
  let nearest = null, nearestDist = Infinity;
  for (const t of interactables) {
    if (t.used || !t.mesh.parent || (!t.mesh.parent.visible && t.mesh.parent !== scene)) continue;
    if (t.id === 'phone' && facilityGroup.visible) continue;
    if (t.id.startsWith('door_') && !facilityGroup.visible) continue;
    const d = p.distanceTo(t.mesh.getWorldPosition(new THREE.Vector3()));
    if (d < t.range && d < nearestDist) { nearest = t; nearestDist = d; }
  }
  nearestTarget = nearest;
  promptEl.classList.toggle('hidden', !nearest);
}

function tryInteract() {
  if (!nearestTarget) return;
  if (nearestTarget.id === 'phone') startPhoneCutscene();
  if (nearestTarget.id.startsWith('door_')) openPuzzleTerminal(nearestTarget.door);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyE') tryInteract();
});
