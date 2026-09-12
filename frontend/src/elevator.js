// BlackVault Elevator System
// Manages elevator call-button interactions and the DOM overlay ride transition.
// Each floor has an elevator alcove. After solving a floor's puzzle, the player
// walks to the alcove and presses E to call the lift. A cinematic overlay plays
// (doors close, floor counter animates up, muzak plays, doors open).

import { FLOOR_LABELS } from "./config.js";

// Floor label sequence for the counter animation
const FLOOR_SEQUENCE = ["G", "1F", "2F", "3F", "4F", "5F"];
const FLOOR_NAMES = {
  "G":  "Reception & Lobby",
  "1F": "Classification Lab",
  "2F": "Regression Lab",
  "3F": "Clustering Hub",
  "4F": "Anomaly Wing",
  "5F": "The Vault",
};

let overlayEl = null;
let doorLeftEl = null;
let doorRightEl = null;
let floorDisplayEl = null;
let floorNameEl = null;
let barFillEl = null;
let muzakCtx = null;
let muzakNodes = [];
let isMuzakPlaying = false;

// Called positions registered from world.js
let elevatorCallPositions = []; // [{ z, label, nextLabel, doorType }]
let elevatorReadyCallback = null; // called once ride completes → levelManager extends Z

// ── DOM Setup ─────────────────────────────────────────────────────────────

export function initElevator(positions, onRideComplete) {
  elevatorCallPositions = positions || [];
  elevatorReadyCallback = onRideComplete;

  overlayEl    = document.getElementById("elevator-overlay");
  doorLeftEl   = document.querySelector(".elevator-door-left");
  doorRightEl  = document.querySelector(".elevator-door-right");
  floorDisplayEl = document.querySelector(".elevator-floor-display");
  floorNameEl    = document.querySelector(".elevator-floor-name");
  barFillEl      = document.querySelector(".elevator-bar-fill");
}

// Call this to check if player is near an elevator call button
// Returns the elevator entry data if close enough, else null
export function getNearestElevator(playerPos, maxDist = 5.5) {
  let best = null, bestDist = Infinity;
  for (const entry of elevatorCallPositions) {
    const dz = Math.abs(playerPos.z - entry.z);
    const dx = Math.abs(playerPos.x);
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < maxDist && dist < bestDist) {
      best = entry;
      bestDist = dist;
    }
  }
  return best;
}

// ── Elevator Ride ─────────────────────────────────────────────────────────

/**
 * triggerElevatorRide(fromLabel, toLabel, onComplete)
 * Plays the full elevator overlay: doors close → counter → doors open.
 * onComplete() is called when doors are fully open on the new floor.
 */
export function triggerElevatorRide(fromLabel, toLabel, onComplete) {
  if (!overlayEl) return;

  const fromIdx = FLOOR_SEQUENCE.indexOf(fromLabel);
  const toIdx   = FLOOR_SEQUENCE.indexOf(toLabel);

  // Set initial floor label
  setFloorDisplay(fromLabel, false);

  // Show overlay (fade in)
  overlayEl.classList.add("visible");
  doorLeftEl.classList.remove("open");
  doorRightEl.classList.remove("open");

  // Play elevator sound
  playElevatorSFX("close");

  // Start muzak after brief pause
  setTimeout(() => {
    startElevatorMuzak();
  }, 600);

  // Animate floor counter after a beat
  let counterDelay = 1200;
  setTimeout(() => {
    animateFloorCounter(fromIdx, toIdx, () => {
      // Counter finished — show destination floor name
      setFloorDisplay(toLabel, true);

      // Brief pause, then open doors
      setTimeout(() => {
        stopElevatorMuzak();
        playElevatorSFX("ding");

        // Open doors
        doorLeftEl.classList.add("open");
        doorRightEl.classList.add("open");

        // Fade out overlay, call complete
        setTimeout(() => {
          overlayEl.classList.remove("visible");
          // Reset doors for next time
          setTimeout(() => {
            doorLeftEl.classList.remove("open");
            doorRightEl.classList.remove("open");
          }, 600);
          if (onComplete) onComplete();
        }, 900);
      }, 600);
    });
  }, counterDelay);
}

function setFloorDisplay(label, showName) {
  if (floorDisplayEl) floorDisplayEl.textContent = label;
  if (floorNameEl) {
    floorNameEl.textContent = FLOOR_NAMES[label] || "";
    if (showName) floorNameEl.classList.add("visible");
    else floorNameEl.classList.remove("visible");
  }
  if (barFillEl) barFillEl.style.width = "0%";
}

function animateFloorCounter(fromIdx, toIdx, onDone) {
  const direction = fromIdx < toIdx ? 1 : -1;
  const steps = Math.abs(toIdx - fromIdx);
  let current = fromIdx;
  let step = 0;
  const stepDuration = Math.max(280, 700 / steps);

  function tick() {
    current += direction;
    step++;
    const label = FLOOR_SEQUENCE[current];
    if (floorDisplayEl) floorDisplayEl.textContent = label;
    if (barFillEl) barFillEl.style.width = `${(step / steps) * 100}%`;

    // Ding for each floor passed
    playElevatorSFX("pass");

    if (step < steps) {
      setTimeout(tick, stepDuration);
    } else {
      setTimeout(onDone, stepDuration);
    }
  }

  tick();
}

// ── Elevator SFX ──────────────────────────────────────────────────────────

function getAudioCtx() {
  if (!muzakCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    muzakCtx = new AC();
  }
  if (muzakCtx.state === "suspended") muzakCtx.resume();
  return muzakCtx;
}

function playElevatorSFX(type) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    if (type === "ding") {
      // Pleasant ding tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } else if (type === "close") {
      // Whoosh/mechanical close sound
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const filt = ctx.createBiquadFilter();
      filt.type = "lowpass";
      filt.frequency.setValueAtTime(600, ctx.currentTime);
      filt.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      src.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
      src.start();
    } else if (type === "pass") {
      // Quick floor-pass blip
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.12);
    }
  } catch (e) {}
}

// ── Elevator Muzak (pentatonic melody loop) ────────────────────────────────

// Simple pentatonic scale loop — gentle, warm
const MUZAK_NOTES = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3, 392.0, 329.6];
const MUZAK_DURATIONS = [0.45, 0.45, 0.45, 0.45, 0.9, 0.45, 0.45, 0.9];
let muzakTimeout = null;

function startElevatorMuzak() {
  if (isMuzakPlaying) return;
  isMuzakPlaying = true;
  scheduleMuzak(0);
}

function scheduleMuzak(noteIndex) {
  if (!isMuzakPlaying) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const freq = MUZAK_NOTES[noteIndex % MUZAK_NOTES.length];
    const dur  = MUZAK_DURATIONS[noteIndex % MUZAK_DURATIONS.length];

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.08, ctx.currentTime + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);

    // Gentle reverb via delay
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.22;
    const delayGain = ctx.createGain();
    delayGain.gain.value = 0.2;

    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(ctx.destination);

    muzakNodes.push(osc);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur);

    muzakTimeout = setTimeout(() => {
      scheduleMuzak(noteIndex + 1);
    }, dur * 1000);
  } catch (e) {}
}

export function stopElevatorMuzak() {
  isMuzakPlaying = false;
  if (muzakTimeout) clearTimeout(muzakTimeout);
  muzakTimeout = null;
  muzakNodes.forEach(n => { try { n.stop(); } catch (e) {} });
  muzakNodes = [];
}
