import * as THREE from 'three';
import { controls } from './sceneSetup.js';
import { ALARM_TRIGGER_Z, CORRIDOR_HALF_DEPTH, doors, facilityGroup, gameState, teammates } from './world.js';
import { triggerAlarmSequence } from './narrative.js';

const move = { forward: false, back: false, left: false, right: false };
const velocity = new THREE.Vector3();

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = true; break;
    case 'KeyS': move.back = true; break;
    case 'KeyA': move.left = true; break;
    case 'KeyD': move.right = true; break;
  }
});
document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': move.forward = false; break;
    case 'KeyS': move.back = false; break;
    case 'KeyA': move.left = false; break;
    case 'KeyD': move.right = false; break;
  }
});

export function updateMovement(delta) {
  const speed = 3.2;
  velocity.set(0, 0, 0);
  if (move.forward) velocity.z -= 1;
  if (move.back) velocity.z += 1;
  if (move.left) velocity.x -= 1;
  if (move.right) velocity.x += 1;
  if (velocity.lengthSq() > 0) {
    velocity.normalize().multiplyScalar(speed * delta);
    controls.moveRight(velocity.x);
    controls.moveForward(-velocity.z);
  }
  // keep player inside current room bounds; in the facility, the nearest
  // still-locked door blocks further progress down the corridor
  const p = controls.object.position;
  if (facilityGroup.visible) {
    const firstLocked = doors.find((d) => !d.unlocked);
    const zMin = firstLocked ? firstLocked.z + 1.3 : -(CORRIDOR_HALF_DEPTH - 1);
    p.x = Math.max(-2.7, Math.min(2.7, p.x));
    p.z = Math.max(zMin, Math.min(CORRIDOR_HALF_DEPTH - 1, p.z));

    // teammates stay beside the player until the alarm fires
    if (!gameState.alarmTriggered) {
      teammates.forEach((t) => {
        t.mesh.position.z = p.z - 0.6;
        t.mesh.position.x = t.xOffset;
      });
      if (p.z <= ALARM_TRIGGER_Z) triggerAlarmSequence();
    }
  } else {
    p.x = Math.max(-3.7, Math.min(3.7, p.x));
    p.z = Math.max(-3.7, Math.min(3.7, p.z));
  }
  p.y = 1.7;
}
