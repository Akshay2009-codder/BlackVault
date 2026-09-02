/**
 * Controller — First-person WASD movement with simple AABB collision.
 */
import * as THREE from 'three';

const MOVE_SPEED = 5;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.4;

// Lab boundaries
const BOUNDS = {
    minX: -15,
    maxX: 15,
    minZ: -15,
    maxZ: 15,
};

export class Controller {
    constructor(labScene, cameraController) {
        this.labScene = labScene;
        this.cameraController = cameraController;
        this.camera = labScene.camera;

        this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 8);
        this.velocity = new THREE.Vector3();

        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
        };

        this._direction = new THREE.Vector3();
        this._frontVector = new THREE.Vector3();
        this._sideVector = new THREE.Vector3();

        // Input
        document.addEventListener('keydown', (e) => this._onKey(e, true));
        document.addEventListener('keyup', (e) => this._onKey(e, false));
    }

    _onKey(event, pressed) {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = pressed;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = pressed;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = pressed;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = pressed;
                break;
        }
    }

    update() {
        if (!document.pointerLockElement) return;

        const delta = Math.min(this.labScene.clock.getDelta(), 0.05);

        // Get camera forward/right vectors (XZ plane only)
        this.camera.getWorldDirection(this._direction);
        this._frontVector.set(this._direction.x, 0, this._direction.z).normalize();
        this._sideVector.crossVectors(this.camera.up, this._frontVector).normalize();

        // Compute movement
        this.velocity.set(0, 0, 0);

        if (this.keys.forward) this.velocity.add(this._frontVector);
        if (this.keys.backward) this.velocity.sub(this._frontVector);
        if (this.keys.left) this.velocity.add(this._sideVector);
        if (this.keys.right) this.velocity.sub(this._sideVector);

        if (this.velocity.length() > 0) {
            this.velocity.normalize().multiplyScalar(MOVE_SPEED * delta);
        }

        // Apply movement
        const newPos = this.position.clone().add(this.velocity);

        // Simple boundary clamping
        newPos.x = Math.max(BOUNDS.minX + PLAYER_RADIUS, Math.min(BOUNDS.maxX - PLAYER_RADIUS, newPos.x));
        newPos.z = Math.max(BOUNDS.minZ + PLAYER_RADIUS, Math.min(BOUNDS.maxZ - PLAYER_RADIUS, newPos.z));
        newPos.y = PLAYER_HEIGHT;

        this.position.copy(newPos);
        this.camera.position.copy(this.position);
    }

    reset() {
        this.position.set(0, PLAYER_HEIGHT, 8);
        this.camera.position.copy(this.position);
        this.velocity.set(0, 0, 0);
        this.keys = { forward: false, backward: false, left: false, right: false };
    }
}
