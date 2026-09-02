/**
 * ChallengeScene — Stub for individual challenge room scenes.
 * Will be expanded in Phase 2 when terminal puzzle gameplay is built.
 */
export class ChallengeScene {
    constructor() {
        this.active = false;
        this.doorType = null;
    }

    enter(doorType) {
        this.active = true;
        this.doorType = doorType;
    }

    exit() {
        this.active = false;
        this.doorType = null;
    }
}
