import { API_BASE } from './config.js';

const rankEl = document.getElementById('hud-rank');
const xpFillEl = document.getElementById('hud-xp-fill');
const xpLabelEl = document.getElementById('hud-xp-label');
const badgesEl = document.getElementById('hud-badges');

/** Renders a `{ total_xp, rank, badges, next_rank, doors_cleared }` payload
 * from /api/progress or /api/puzzle/submit into the corner HUD. */
export function renderProgress(progress) {
  rankEl.textContent = progress.rank.toUpperCase();

  const next = progress.next_rank;
  if (next) {
    const pct = Math.min(100, Math.max(4, 100 - (next.xp_needed / (progress.total_xp + next.xp_needed)) * 100));
    xpFillEl.style.width = `${pct}%`;
    xpLabelEl.textContent = `${progress.total_xp} XP \u2014 ${next.xp_needed} to ${next.name.toUpperCase()}`;
  } else {
    xpFillEl.style.width = '100%';
    xpLabelEl.textContent = `${progress.total_xp} XP \u2014 MAX RANK`;
  }

  badgesEl.innerHTML = progress.badges
    .map((b) => `<span class="hud-badge-pill">${b}</span>`)
    .join('');
}

async function loadInitialProgress() {
  try {
    const res = await fetch(`${API_BASE}/api/progress`);
    if (!res.ok) return;
    renderProgress(await res.json());
  } catch (e) {
    // backend not reachable yet — HUD just stays at its zero-state defaults
  }
}

loadInitialProgress();
