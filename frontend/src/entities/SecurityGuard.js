/**
 * SecurityGuard — Stub for patrol AI + voice triggers.
 * Will be implemented in Phase 5.
 */
export class SecurityGuard {
    constructor() {
        this.active = false;
        this.position = { x: 0, y: 0, z: 0 };
        this.patrolPoints = [];
        this.alertLevel = 0;
    }

    update(deltaTime) {
        // Phase 5: patrol logic, proximity detection, voice triggers
    }

    setPatrolRoute(points) {
        this.patrolPoints = points;
    }
}
