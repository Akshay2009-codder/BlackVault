/**
 * Results — Post-challenge results screen with animated star ratings,
 * metric scores, and detailed action feedback.
 */
export class Results {
    constructor(state, callbacks) {
        this.state = state;
        this.callbacks = callbacks;

        this.el = document.getElementById('results-overlay');
        this.titleEl = document.getElementById('results-title');
        this.starsEl = document.getElementById('results-stars');
        this.detailsEl = document.getElementById('results-details');
        this.messageEl = document.getElementById('results-message');
        this.btnContinue = document.getElementById('btn-results-continue');

        this.btnContinue.addEventListener('click', () => callbacks.onContinue());
    }

    show(result, door = null) {
        const doorName = door?.name || this.state.activeDoor?.name || 'CHALLENGE';

        // Title
        if (result.success && result.stars > 0) {
            this.titleEl.textContent = `${doorName.toUpperCase()} — CLEARED`;
            this.titleEl.classList.remove('failed');
            this.titleEl.classList.add('success');
        } else {
            this.titleEl.textContent = `${doorName.toUpperCase()} — FAILED`;
            this.titleEl.classList.add('failed');
            this.titleEl.classList.remove('success');
        }

        // Stars animation
        this.starsEl.innerHTML = '';
        for (let i = 1; i <= 3; i++) {
            const star = document.createElement('span');
            star.className = `result-star ${i > result.stars ? 'dim' : 'earned'}`;
            star.textContent = '⭐';
            star.style.animationDelay = `${i * 0.25}s`;
            this.starsEl.appendChild(star);
        }

        // Details grid
        const scorePercent = typeof result.score === 'number' ? (result.score * 100).toFixed(1) : result.score;
        const targetPercent = typeof result.target === 'number' ? (result.target * 100).toFixed(1) : result.target;
        const metricName = result.metric_name ? result.metric_name.replace(/_/g, ' ').toUpperCase() : 'SCORE';

        let detailsHtml = `
            <div class="result-metric-name">${metricName}</div>
            <div class="result-stats-row">
                <div class="result-stat-box">
                    <span class="stat-lbl">SCORE</span>
                    <span class="stat-val ${result.score >= result.target ? 'val-good' : 'val-bad'}">${scorePercent}%</span>
                </div>
                <div class="result-stat-box">
                    <span class="stat-lbl">TARGET</span>
                    <span class="stat-val">${targetPercent}%</span>
                </div>
                <div class="result-stat-box">
                    <span class="stat-lbl">STARS</span>
                    <span class="stat-val val-gold">${result.stars} / 3</span>
                </div>
            </div>
        `;

        // Feedback list
        if (result.feedback && Array.isArray(result.feedback) && result.feedback.length > 0) {
            detailsHtml += '<div class="result-feedback-list">';
            result.feedback.forEach(item => {
                let statusClass = 'fb-neutral';
                if (item.status === 'correct') statusClass = 'fb-success';
                else if (item.status === 'missed') statusClass = 'fb-missed';
                else if (item.status === 'unnecessary' || item.status === 'redundant') statusClass = 'fb-warn';

                detailsHtml += `
                    <div class="feedback-item ${statusClass}">
                        <span class="feedback-msg">${item.message}</span>
                    </div>
                `;
            });
            detailsHtml += '</div>';
        }

        this.detailsEl.innerHTML = detailsHtml;

        // Custom narrative message
        const messages = {
            0: 'Threshold not met. Review the issues and refine your pipeline.',
            1: 'Security clearance granted. Door unlocked — standard efficiency.',
            2: 'Excellent work, Agent! Clean pipeline and swift execution.',
            3: '⭐ OUTSTANDING PERFORMANCE! Flawless ML pipeline deployed!',
        };
        this.messageEl.textContent = result.message || messages[result.stars] || '';
        this.messageEl.className = `results-message msg-stars-${result.stars}`;

        this.el.classList.add('active');
    }

    hide() {
        this.el.classList.remove('active');
    }
}
