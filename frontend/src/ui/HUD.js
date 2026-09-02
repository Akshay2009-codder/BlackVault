/**
 * HUD — In-game heads-up display showing level, stars, doors completed.
 */
export class HUD {
    constructor(state) {
        this.state = state;
        this.el = document.getElementById('hud');
        this.levelEl = document.getElementById('hud-level');
        this.starsEl = document.getElementById('hud-stars');
        this.doorsEl = document.getElementById('hud-doors');
    }

    show() {
        this.el.classList.remove('hidden');
    }

    hide() {
        this.el.classList.add('hidden');
    }

    update(state) {
        this.levelEl.textContent = state.currentLevel;

        if (state.levelData?.level) {
            const level = state.levelData.level;
            const totalStars = level.total_stars;
            const maxStars = level.doors.length * 3;
            this.starsEl.textContent = `⭐ ${totalStars} / ${maxStars}`;

            const completedDoors = level.doors.filter(d => d.completed).length;
            this.doorsEl.textContent = `${completedDoors} / ${level.doors.length}`;
        } else {
            this.starsEl.textContent = '⭐ 0 / 15';
            this.doorsEl.textContent = '0 / 5';
        }
    }
}
