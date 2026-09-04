// Security Guard / Warden AI Voice & Subtitle System
// Speaks lines using browser's built-in speechSynthesis API with subtitle HUD.

import { API_BASE } from "./config.js";

let voiceEnabled = true;
let subtitleTimer = null;

const FALLBACK_LINES = {
  attempt_passed_3star: "Flawless optimization. Access granted to the next sector.",
  attempt_passed_2star: "Clean execution. Door bulkhead unlocked.",
  attempt_passed_1star: "Barely met tolerance margins, but a pass is a pass. Move through.",
  attempt_failed: "Pipeline crashed. Anomaly threshold breached. Try again, intruder.",
  door_opened: "Accessing sector workstation terminal. Let's see your machine learning skills.",
};

export function initGuardVoice() {
  // Guard voice setup
}

export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
}

export function onPuzzlePassed(stars = 3) {
  if (stars >= 3) {
    guardSpeak("attempt_passed_3star");
  } else if (stars === 2) {
    guardSpeak("attempt_passed_2star");
  } else {
    guardSpeak("attempt_passed_1star");
  }
}

export function onPuzzleFailed() {
  guardSpeak("attempt_failed");
}

export async function guardSpeak(event) {
  let line = FALLBACK_LINES[event] || "Security system alert.";
  try {
    const res = await fetch(`${API_BASE}/api/guard/line/${event}`);
    if (res.ok) {
      const data = await res.json();
      if (data.line) line = data.line;
    }
  } catch (err) {
    // Fallback line used
  }

  // Display Subtitle
  const subtitle = document.getElementById("guard-subtitle");
  if (subtitle) {
    subtitle.textContent = `[WARDEN AI]: "${line}"`;
    subtitle.classList.add("visible");

    clearTimeout(subtitleTimer);
    subtitleTimer = setTimeout(() => {
      subtitle.classList.remove("visible");
    }, 4500);
  }

  // Speech synthesis
  if (voiceEnabled && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel(); // cancel previous
      const utter = new SpeechSynthesisUtterance(line);
      utter.pitch = 0.65;
      utter.rate = 0.95;
      utter.volume = 0.9;
      window.speechSynthesis.speak(utter);
    } catch (e) {
      // Audio fallback ignored
    }
  }
}
