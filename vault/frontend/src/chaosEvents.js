/**
 * chaosEvents.js — Phase 3 SSE chaos event client.
 *
 * Responsibilities
 * ----------------
 * 1. Open an EventSource to /api/puzzle/events/{puzzle_id} when a puzzle
 *    terminal opens, close it when the puzzle resolves.
 * 2. Parse each server-sent event and dispatch a `chaos` CustomEvent on
 *    window so that puzzleTerminal.js and sceneSetup.js can handle their
 *    respective concerns independently.
 * 3. Apply the in-scene visual effects (camera shake + vignette) for
 *    `lockdown_pulse` events — those don't touch puzzle UI.
 *
 * Custom event shape
 * ------------------
 * window.dispatchEvent(new CustomEvent('chaos', { detail: { type, ...payload } }))
 */

import { API_BASE } from './config.js';
import { cameraShake, setVignette } from './sceneSetup.js';

let activeSource = null;

// ---------------------------------------------------------------------------
// Public API — called by puzzleTerminal.js
// ---------------------------------------------------------------------------

/** Open an SSE connection for the given puzzle. */
export function openChaosStream(puzzleId) {
  closeChaosStream(); // defensive: close any leftover stream first

  const url = `${API_BASE}/api/puzzle/events/${puzzleId}`;
  activeSource = new EventSource(url);

  activeSource.onmessage = (event) => {
    let payload;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return; // malformed event — ignore
    }

    // stream_end sentinel: server has finished emitting, we can close
    if (payload.type === 'stream_end') {
      closeChaosStream();
      return;
    }

    // Handle in-scene effects directly here
    if (payload.type === 'lockdown_pulse') {
      const intensity = (payload.intensity ?? 0.6) * 0.08; // scale to world units
      cameraShake(intensity, 700);
      setVignette('#d9534f', payload.intensity ?? 0.55, 900);
    }

    // Broadcast to all other modules (puzzleTerminal.js listens for this)
    window.dispatchEvent(new CustomEvent('chaos', { detail: payload }));
  };

  activeSource.onerror = () => {
    // The connection dropped (puzzle submitted, server restarted, etc.).
    // Clean up quietly — the terminal already handles its own close path.
    closeChaosStream();
  };
}

/** Close the SSE connection (called on submit, timeout, or terminal close). */
export function closeChaosStream() {
  if (activeSource) {
    activeSource.close();
    activeSource = null;
  }
}
