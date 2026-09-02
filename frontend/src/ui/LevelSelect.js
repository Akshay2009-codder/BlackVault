/**
 * LevelSelect — Grid of level cards with star progress.
 */
export class LevelSelect {
    constructor(state, api, callbacks) {
        this.state = state;
        this.api = api;
        this.callbacks = callbacks;

        this.el = document.getElementById('level-select');
        this.gridEl = document.getElementById('level-grid');
        this.btnBack = document.getElementById('btn-back-menu');

        this.btnBack.addEventListener('click', () => callbacks.onBack());
    }

    async show() {
        this.el.classList.add('active');
        await this._loadLevels();
    }

    hide() {
        this.el.classList.remove('active');
    }

    async _loadLevels() {
        this.gridEl.innerHTML = '';

        let levelsData = null;
        try {
            levelsData = await this.api.getLevels();
        } catch (e) {
            console.warn('Could not load levels from backend');
        }

        const maxLevel = this.state.playerData?.current_level || 1;
        const totalLevels = Math.max(maxLevel + 2, 10);

        for (let i = 1; i <= totalLevels; i++) {
            const unlocked = i <= maxLevel;
            const isCurrent = i === maxLevel;
            const levelInfo = levelsData?.levels?.find(l => l.level_number === i);

            const card = document.createElement('div');
            card.className = `level-card ${!unlocked ? 'locked' : ''} ${isCurrent ? 'current' : ''}`;

            const stars = levelInfo ? levelInfo.total_stars : 0;
            const maxStars = 15;

            const starDisplay = this._renderStars(stars, maxStars);
            const doorsComplete = levelInfo ? levelInfo.doors.filter(d => d.completed).length : 0;

            card.innerHTML = `
                <div class="level-number">${unlocked ? i : '🔒'}</div>
                <div class="level-stars">${starDisplay}</div>
                <div class="level-progress">${unlocked ? `${doorsComplete}/5 doors` : 'Locked'}</div>
            `;

            if (unlocked) {
                card.addEventListener('click', () => this.callbacks.onSelectLevel(i));
            }

            this.gridEl.appendChild(card);
        }
    }

    _renderStars(earned, max) {
        const fullStars = Math.min(earned, max);
        const starGroups = Math.ceil(max / 3);
        let display = '';

        for (let i = 0; i < Math.min(fullStars, 5); i++) {
            display += '⭐';
        }
        for (let i = fullStars; i < 5; i++) {
            display += '☆';
        }

        return display;
    }
}
