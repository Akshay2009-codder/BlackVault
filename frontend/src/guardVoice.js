// Speaks Security Guard AI lines using the browser's built-in
// speechSynthesis API (no external TTS/API key -- keeps this within the
// "no Generative AI" constraint). Falls back to subtitle-only if
// speechSynthesis is unavailable.

import { API_BASE } from "./config.js";

let voiceEnabled = true;

export function initGuardVoice() {
  // Placeholder for a future mute toggle wired up in Phase 5.
}

export function setVoiceEnabled(enabled) {
  voiceEnabled = enabled;
}

export async function guardSpeak(event) {
  let line;
  try {
    const res = await fetch(`${API_BASE}/api/guard/line/${event}`);
    const data = await res.json();
    line = data.line;
  } catch (err) {
    console.warn("[BlackVault] guard line fetch failed", err);
    return;
  }

  const subtitle = document.getElementById("guard-subtitle");
  if (subtitle) subtitle.textContent = line;

  if (voiceEnabled && "speechSynthesis" in window) {
    const utter = new SpeechSynthesisUtterance(line);
    utter.pitch = 0.7;
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }
}
