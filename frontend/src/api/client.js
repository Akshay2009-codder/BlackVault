/**
 * APIClient — Backend API wrapper using fetch().
 */
const BASE_URL = 'http://localhost:8000/api';

export class APIClient {
    constructor(baseUrl = BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async _fetch(path, options = {}) {
        const res = await fetch(`${this.baseUrl}${path}`, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(err.detail || `HTTP ${res.status}`);
        }
        return res.json();
    }

    // ───── Player ─────
    async getPlayer(playerId = 1) {
        return this._fetch(`/progress/player?player_id=${playerId}`);
    }

    // ───── Levels ─────
    async getLevels(playerId = 1) {
        return this._fetch(`/levels?player_id=${playerId}`);
    }

    async getLevel(levelNumber, playerId = 1) {
        return this._fetch(`/levels/${levelNumber}?player_id=${playerId}`);
    }

    // ───── Challenges ─────
    async startChallenge(level, doorType, playerId = 1) {
        return this._fetch('/challenges/start', {
            method: 'POST',
            body: JSON.stringify({
                player_id: playerId,
                level: level,
                door_type: doorType,
            }),
        });
    }

    async submitChallenge(level, doorType, actions, timeTaken, playerId = 1) {
        return this._fetch('/challenges/submit', {
            method: 'POST',
            body: JSON.stringify({
                player_id: playerId,
                level: level,
                door_type: doorType,
                actions: actions,
                time_taken: timeTaken,
            }),
        });
    }

    // ───── Progress ─────
    async getProgress(playerId = 1) {
        return this._fetch(`/progress?player_id=${playerId}`);
    }
}
