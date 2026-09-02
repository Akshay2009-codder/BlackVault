/**
 * AudioManager — Stub for Howler.js audio system.
 * Will be fully implemented in Phase 5.
 */
export class AudioManager {
    constructor() {
        this.sounds = {};
        this.musicPlaying = false;
    }

    /**
     * Load a sound file.
     */
    load(name, src, options = {}) {
        // Phase 5: use Howler.js
        this.sounds[name] = { src, ...options };
    }

    play(name) {
        // Phase 5: Howl.play()
        console.log(`[Audio] Playing: ${name}`);
    }

    stop(name) {
        console.log(`[Audio] Stopping: ${name}`);
    }

    setVolume(name, volume) {
        // Phase 5
    }
}
