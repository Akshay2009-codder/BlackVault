import { controls } from './sceneSetup.js';
import { desk, facilityGroup, homeGroup, interactables, phone, teammates } from './world.js';
import { gameState } from './world.js';

// ---------------------------------------------------------------------------
// Generic dialogue-sequence player, reused for every cutscene beat below.
// ---------------------------------------------------------------------------
const cutsceneEl = document.getElementById('cutscene');
const cutsceneSpeaker = document.getElementById('cutscene-speaker');
const cutsceneText = document.getElementById('cutscene-text');
const cutsceneNext = document.getElementById('cutscene-next');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const mapScreen = document.getElementById('map-screen');
const travelBtn = document.getElementById('travel-btn');

startBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  controls.lock();
});

let activeSequence = null; // { lines, index, onComplete }

function playSequence(lines, onComplete) {
  controls.unlock();
  activeSequence = { lines, index: 0, onComplete };
  showSequenceLine();
  cutsceneEl.classList.remove('hidden');
}

function showSequenceLine() {
  const line = activeSequence.lines[activeSequence.index];
  cutsceneSpeaker.textContent = line.speaker;
  cutsceneText.textContent = line.text;
  const isLast = activeSequence.index === activeSequence.lines.length - 1;
  cutsceneNext.textContent = isLast ? (line.finalLabel || 'CONTINUE \u25b8') : 'CONTINUE \u25b8';
}

cutsceneNext.addEventListener('click', () => {
  if (!activeSequence) return;
  activeSequence.index++;
  if (activeSequence.index < activeSequence.lines.length) {
    showSequenceLine();
  } else {
    cutsceneEl.classList.add('hidden');
    const cb = activeSequence.onComplete;
    activeSequence = null;
    if (cb) cb();
  }
});

// ---------------------------------------------------------------------------
// Beat 1: the mystery call
// ---------------------------------------------------------------------------
const CALL_LINES = [
  { speaker: 'UNKNOWN CALLER', text: 'Don\u2019t hang up. We need someone with your access history \u2014 tonight.' },
  { speaker: 'UNKNOWN CALLER', text: 'Meridian Research is running an unauthorized ML weapons-classification project. We\u2019re shutting it down.' },
  { speaker: 'UNKNOWN CALLER', text: 'A team is already assembling. Coordinates incoming. Move.', finalLabel: 'VIEW LOCATION \u25b8' },
];

export function startPhoneCutscene() {
  playSequence(CALL_LINES, () => {
    interactables.find((t) => t.id === 'phone').used = true;
    mapScreen.classList.remove('hidden');
  });
}

// ---------------------------------------------------------------------------
// Beat 2: mission briefing with the full team, before entry
// ---------------------------------------------------------------------------
const BRIEFING_LINES = [
  { speaker: 'REYES // TEAM LEAD', text: 'Target: Meridian\u2019s sub-level research wing. They\u2019re training classifiers to flag weapons platforms \u2014 we pull the drive and torch the project.' },
  { speaker: 'NOMAD // INFIL', text: 'Entry point is a maintenance shaft on the east face. Cameras are on a fixed loop, twelve-second gap on rotation.' },
  { speaker: 'REYES // TEAM LEAD', text: 'Their security stack is model-driven \u2014 badge auth, access anomaly detection, all of it. If it trips, doors seal themselves. No override.' },
  { speaker: 'NOMAD // INFIL', text: 'Escape route\u2019s the same shaft. If we get split up, that\u2019s the fallback \u2014 don\u2019t improvise.' },
  { speaker: 'REYES // TEAM LEAD', text: 'Stay tight, stay quiet. Let\u2019s move.', finalLabel: 'ENTER FACILITY \u25b8' },
];

travelBtn.addEventListener('click', () => {
  mapScreen.classList.add('hidden');
  playSequence(BRIEFING_LINES, enterFacility);
});

function enterFacility() {
  homeGroup.visible = false;
  phone.visible = false;
  desk.visible = false;
  facilityGroup.visible = true;
  controls.object.position.set(0, 1.7, 20);
  teammates.forEach((t) => { t.mesh.visible = true; });
  controls.lock();
}

// ---------------------------------------------------------------------------
// Beat 3: the alarm / lockdown, fired automatically mid-corridor
// ---------------------------------------------------------------------------
const ALARM_LINES = [
  { speaker: 'SECURITY SYSTEM', text: 'INTRUSION DETECTED. INITIATING EMERGENCY LOCKDOWN.' },
  { speaker: 'REYES // TEAM LEAD', text: 'Alarm\u2019s tripped! Fall back to the shaft \u2014 go, go!' },
];

// -- Beat 4: comms after the team is forced to leave without the player --
const COMMS_LINES = [
  { speaker: 'NOMAD (COMMS)', text: 'The shaft\u2019s sealed behind us \u2014 we can\u2019t get back through. Do you copy?' },
  { speaker: 'REYES (COMMS)', text: 'Security\u2019s running everything off their ML stack. Find another way out \u2014 you\u2019re going to have to beat their systems from the inside.' },
  { speaker: 'REYES (COMMS)', text: 'We\u2019ll hold position as long as we can. Move fast.', finalLabel: 'CONTINUE \u25b8' },
];

export function triggerAlarmSequence() {
  gameState.alarmTriggered = true;
  fleeTeammates();
  playSequence(ALARM_LINES, () => {
    playSequence(COMMS_LINES, () => { controls.lock(); });
  });
}

function fleeTeammates() {
  const startTime = performance.now();
  const startPositions = teammates.map((t) => t.mesh.position.clone());
  const duration = 900;
  function step() {
    const t = Math.min(1, (performance.now() - startTime) / duration);
    teammates.forEach((tm, i) => {
      tm.mesh.position.x = startPositions[i].x + (tm.xOffset > 0 ? 5 : -5) * t;
      tm.mesh.position.z = startPositions[i].z + 3 * t;
    });
    if (t < 1) requestAnimationFrame(step);
    else teammates.forEach((tm) => { tm.mesh.visible = false; });
  }
  requestAnimationFrame(step);
}

// ---------------------------------------------------------------------------
// Beat 4b: the Core Vault intro, played once before the final door's
// terminal opens — sets up that this last one has no ID on file.
// ---------------------------------------------------------------------------
const CORE_VAULT_LINES = [
  { speaker: 'SECURITY SYSTEM', text: 'CORE VAULT ACCESS REQUESTED. NO CLASSIFICATION ON FILE FOR THIS DATA STREAM.' },
  { speaker: 'NOMAD (COMMS)', text: 'That\u2019s not in their manifest \u2014 whatever it is, we\u2019ve got no intel on it.' },
  { speaker: 'REYES (COMMS)', text: 'You\u2019re reading it cold. Work out what it is, then beat it. This is the last one.', finalLabel: 'OPEN TERMINAL \u25b8' },
];

export function playMysteryIntro(onComplete) {
  playSequence(CORE_VAULT_LINES, onComplete);
}

// ---------------------------------------------------------------------------
// Beat 5: mission-complete beat once the final door unlocks
// ---------------------------------------------------------------------------
export function showEscapeComplete() {
  playSequence([
    {
      speaker: 'SECTOR CLEAR',
      text: 'All security locks disengaged. The extraction team confirms your signal \u2014 the core escape route is open. Mission complete.',
      finalLabel: 'CLOSE \u25b8',
    },
  ], () => {});
}