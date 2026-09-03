/**
 * HUD — In-game heads-up display: level, stars, doors, next-door hint.
 */
export class HUD {
    constructor(state) {
        this.state   = state;
        this.el      = document.getElementById('hud');
        this.levelEl = document.getElementById('hud-level');
        this.starsEl = document.getElementById('hud-stars');
        this.doorsEl = document.getElementById('hud-doors');
        this._hintTimeout = null;
    }

    show() { this.el.classList.remove('hidden'); }
    hide() { this.el.classList.add('hidden'); }

    update(state) {
        this.levelEl.textContent = state.currentLevel;

        if (state.levelData?.level) {
            const lv = state.levelData.level;
            this.starsEl.textContent = `⭐ ${lv.total_stars} / ${lv.doors.length * 3}`;
            const done = lv.doors.filter(d => d.completed).length;
            this.doorsEl.textContent = `${done} / ${lv.doors.length}`;
        } else {
            this.starsEl.textContent = '⭐ 0 / 15';
            this.doorsEl.textContent = '0 / 5';
        }
    }

    /** Shows a brief "Next: <name> →" banner at bottom of HUD */
    showNextDoorHint(doorName) {
        if (this._hintTimeout) clearTimeout(this._hintTimeout);

        let hint = document.getElementById('hud-next-door');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'hud-next-door';
            hint.className = 'hud-next-door';
            this.el.appendChild(hint);
        }

        hint.innerHTML = `🔓 Next Door Unlocked: <strong>${doorName}</strong>`;
        hint.classList.add('visible');

        this._hintTimeout = setTimeout(() => {
            hint.classList.remove('visible');
        }, 4000);
    }
}
