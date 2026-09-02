/**
 * Camera — Pointer-lock first-person camera controller.
 */
export class Camera {
    constructor(threeCamera) {
        this.camera = threeCamera;
        this.sensitivity = 0.002;
        this.pitchLimit = Math.PI / 2 - 0.1;
        this.pitch = 0;
        this.yaw = 0;

        document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    }

    _onMouseMove(event) {
        if (!document.pointerLockElement) return;

        this.yaw -= event.movementX * this.sensitivity;
        this.pitch -= event.movementY * this.sensitivity;

        // Clamp pitch
        this.pitch = Math.max(-this.pitchLimit, Math.min(this.pitchLimit, this.pitch));

        // Apply rotation
        this.camera.rotation.order = 'YXZ';
        this.camera.rotation.y = this.yaw;
        this.camera.rotation.x = this.pitch;
    }

    reset() {
        this.pitch = 0;
        this.yaw = 0;
        this.camera.rotation.set(0, 0, 0);
    }
}
