/**
 * StarRating — Reusable star display component.
 */
export class StarRating {
    /**
     * Render stars as HTML string.
     * @param {number} earned - Stars earned (0-3)
     * @param {number} max - Maximum stars (default 3)
     * @returns {string} HTML string of stars
     */
    static render(earned, max = 3) {
        let html = '';
        for (let i = 1; i <= max; i++) {
            if (i <= earned) {
                html += '<span class="star earned" style="color: var(--star-gold); text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);">⭐</span>';
            } else {
                html += '<span class="star empty" style="color: var(--star-dim);">☆</span>';
            }
        }
        return html;
    }

    /**
     * Create a DOM element with stars.
     */
    static createElement(earned, max = 3) {
        const el = document.createElement('span');
        el.className = 'star-rating';
        el.innerHTML = StarRating.render(earned, max);
        return el;
    }
}
