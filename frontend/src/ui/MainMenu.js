/**
 * MainMenu — Title screen with play and level select buttons.
 */
export class MainMenu {
    constructor(state, callbacks) {
        this.state = state;
        this.callbacks = callbacks;

        this.el = document.getElementById('main-menu');
        this.btnPlay = document.getElementById('btn-play');
        this.btnLevels = document.getElementById('btn-levels');
        this.statLevel = document.getElementById('stat-level');
        this.statStars = document.getElementById('stat-stars');

        this.btnPlay.addEventListener('click', () => callbacks.onPlay());
        this.btnLevels.addEventListener('click', () => callbacks.onLevelSelect());

        // Spawn floating particles
        this._spawnParticles();
    }

    show() {
        this.el.classList.add('active');
        this._updateStats();
    }

    hide() {
        this.el.classList.remove('active');
    }

    _updateStats() {
        const p = this.state.playerData;
        if (p) {
            this.statLevel.textContent = p.current_level;
            this.statStars.textContent = p.total_stars;
        }
    }

    _spawnParticles() {
        const container = document.getElementById('menu-particles');
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 8}s`;
            particle.style.animationDuration = `${6 + Math.random() * 6}s`;

            const colors = ['#00f0ff', '#00ff88', '#aa44ff', '#4488ff'];
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.boxShadow = `0 0 6px ${particle.style.background}`;

            container.appendChild(particle);
        }
    }
}
