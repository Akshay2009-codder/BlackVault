// BlackVault — Ambient Room Atmosphere Synthesizer
// Produces a layered, living electrical hum using the same Web Audio API
// approach as the existing SFX (playDoorUnlockSFX etc. in world.js).
//
// Layers:
//   A. Root sine hum (60 Hz power-line fundamental)
//   B. Harmonic sawtooth (120 Hz — first overtone, gives presence)
//   C. Band-passed noise (server fan white-noise filtered to ~400–900 Hz)
//   D. Sub-bass sine (30 Hz, very low gain — felt more than heard)
//   E. Slow LFO ±1 Hz detune on layer A for organic breathing
//
// Usage:
//   import { initAmbient, setRoomAmbient } from "./ambient.js";
//   initAmbient();           // call once after first user gesture
//   setRoomAmbient("classification"); // switch per-room coloration

let ctx = null;
let masterGain = null;
let humOscA = null;
let humOscB = null;
let lfoOsc = null;
let lfoGain = null;
let noiseSource = null;
let bandFilter = null;
let subOsc = null;
let initialized = false;
let fadeInDone = false;

// Per-room tint: shifts noise filter frequency and harmonic gain slightly
// so each room has a subtly different sonic personality.
const ROOM_PROFILES = {
  classification: { filterHz: 520, harmGain: 0.022, subGain: 0.012 },
  regression:     { filterHz: 680, harmGain: 0.018, subGain: 0.014 },
  clustering:     { filterHz: 440, harmGain: 0.025, subGain: 0.010 },
  anomaly:        { filterHz: 760, harmGain: 0.016, subGain: 0.016 },
  mystery:        { filterHz: 320, harmGain: 0.030, subGain: 0.020 },
  default:        { filterHz: 520, harmGain: 0.020, subGain: 0.012 },
};

export function initAmbient() {
  if (initialized) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.connect(ctx.destination);

    // ── A. Root hum: 60 Hz sine ─────────────────────────────────
    humOscA = ctx.createOscillator();
    humOscA.type = "sine";
    humOscA.frequency.setValueAtTime(60, ctx.currentTime);
    const gainA = ctx.createGain();
    gainA.gain.setValueAtTime(0.028, ctx.currentTime);
    humOscA.connect(gainA);
    gainA.connect(masterGain);
    humOscA.start();

    // ── B. Harmonic overtone: 120 Hz sawtooth, very soft ────────
    humOscB = ctx.createOscillator();
    humOscB.type = "sawtooth";
    humOscB.frequency.setValueAtTime(120, ctx.currentTime);
    const gainB = ctx.createGain();
    gainB.gain.setValueAtTime(0.020, ctx.currentTime);
    // LP filter to tame sawtooth harshness
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.setValueAtTime(240, ctx.currentTime);
    lpFilter.Q.setValueAtTime(0.8, ctx.currentTime);
    humOscB.connect(lpFilter);
    lpFilter.connect(gainB);
    gainB.connect(masterGain);
    humOscB.start();

    // ── C. Server fan noise: band-passed white noise ──────────────
    const bufferSize = ctx.sampleRate * 3; // 3-second looping buffer
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;

    bandFilter = ctx.createBiquadFilter();
    bandFilter.type = "bandpass";
    bandFilter.frequency.setValueAtTime(520, ctx.currentTime);
    bandFilter.Q.setValueAtTime(0.6, ctx.currentTime);

    const gainC = ctx.createGain();
    gainC.gain.setValueAtTime(0.042, ctx.currentTime);

    noiseSource.connect(bandFilter);
    bandFilter.connect(gainC);
    gainC.connect(masterGain);
    noiseSource.start();

    // ── D. Sub-bass: 30 Hz sine, felt not heard ──────────────────
    subOsc = ctx.createOscillator();
    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(30, ctx.currentTime);
    const gainD = ctx.createGain();
    gainD.gain.setValueAtTime(0.012, ctx.currentTime);
    subOsc.connect(gainD);
    gainD.connect(masterGain);
    subOsc.start();

    // ── E. LFO: slow ±1 Hz detune on root hum ────────────────────
    lfoOsc = ctx.createOscillator();
    lfoOsc.type = "sine";
    lfoOsc.frequency.setValueAtTime(0.18, ctx.currentTime); // ~11s period
    lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(1.0, ctx.currentTime); // ±1 Hz detune
    lfoOsc.connect(lfoGain);
    lfoGain.connect(humOscA.detune);
    lfoOsc.start();

    // Fade in over 4 seconds
    masterGain.gain.linearRampToValueAtTime(0.72, ctx.currentTime + 4.0);

    initialized = true;
    fadeInDone = true;
  } catch (e) {
    console.warn("[BlackVault] Ambient audio init failed:", e);
  }
}

export function setRoomAmbient(roomKey) {
  if (!ctx || !bandFilter) return;
  const profile = ROOM_PROFILES[roomKey] || ROOM_PROFILES.default;
  const t = ctx.currentTime;

  // Smooth crossfade to new room personality over 2.5s
  bandFilter.frequency.linearRampToValueAtTime(profile.filterHz, t + 2.5);
}

export function fadeOutAmbient(durationSeconds = 2.0) {
  if (!masterGain || !ctx) return;
  masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + durationSeconds);
}

export function fadeInAmbient(durationSeconds = 2.0) {
  if (!masterGain || !ctx) return;
  masterGain.gain.linearRampToValueAtTime(0.72, ctx.currentTime + durationSeconds);
}
