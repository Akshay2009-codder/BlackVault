/**
 * DoorPrompt — Shows door info when player approaches and interacts.
 */

const DOOR_DESCRIPTIONS = {
    cleaning: 'Fix dirty data: missing values, duplicates, bad types, outliers',
    regression: 'Predict numerical values using regression models',
    classification: 'Categorize data into classes using ML models',
    clustering: 'Group unlabeled data into meaningful clusters',
    anomaly: 'Find fraudulent or unusual entries in datasets',
};

export class DoorPrompt {
    constructor(state, callbacks) {
        this.state = state;
        this.callbacks = callbacks;

        this.el = document.getElementById('door-prompt');
        this.iconEl = document.getElementById('prompt-icon');
        this.titleEl = document.getElementById('prompt-title');
        this.descEl = document.getElementById('prompt-desc');
        this.starsEl = document.getElementById('prompt-stars');
        this.btnEnter = document.getElementById('btn-enter-door');
        this.btnCancel = document.getElementById('btn-cancel-door');

        this.btnEnter.addEventListener('click', () => callbacks.onEnter());
        this.btnCancel.addEventListener('click', () => callbacks.onCancel());
    }

    show(door, state) {
        this.iconEl.textContent = door.icon;
        this.titleEl.textContent = door.name;
        this.titleEl.style.color = `#${door.color.toString(16).padStart(6, '0')}`;
        this.descEl.textContent = DOOR_DESCRIPTIONS[door.type] || 'Unknown challenge';

        // Show earned stars
        let starsHtml = '';
        for (let i = 1; i <= 3; i++) {
            if (i <= door.stars) {
                starsHtml += '<span class="earned">⭐</span>';
            } else {
                starsHtml += '☆';
            }
        }
        this.starsEl.innerHTML = starsHtml;

        this.el.classList.remove('hidden');
    }

    hide() {
        this.el.classList.add('hidden');
    }
}
