/**
 * Door — Interactive door entity.
 * Data-only class; 3D mesh is managed by LabScene.
 */
export class Door {
    constructor(config) {
        this.type = config.type;
        this.name = config.name;
        this.color = config.color;
        this.icon = config.icon;
        this.completed = false;
        this.stars = 0;
        this.locked = false;
    }

    complete(stars) {
        this.completed = true;
        this.stars = Math.max(this.stars, stars);
    }

    reset() {
        this.completed = false;
        this.stars = 0;
    }
}
