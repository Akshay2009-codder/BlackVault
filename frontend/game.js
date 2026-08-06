/* ============================================================
   BLACKVAULT — game.js
   Shared engine used by index.html (ML Puzzle IDE) and
   terminal_simulator.html (boot / narrative terminal).

   This file is the ONE bridge point between:
     Unity (WebView)  <-->  this HTML/JS layer  <-->  FastAPI backend

   Ak: wire the CONFIG.API_BASE + ENDPOINTS below to match your
   FastAPI routes. Until the backend is running, every call falls
   back to MOCK_DATA so you can build/demo the UI standalone.
   ============================================================ */

const CONFIG = {
  API_BASE: "http://127.0.0.1:8000",   // <- change to your FastAPI host
  USE_MOCK_IF_UNREACHABLE: true,       // auto-fallback so UI never blocks on missing backend
  TYPE_SPEED_MS: 14,                   // terminal typewriter speed
};

const ENDPOINTS = {
  currentMission: () => `${CONFIG.API_BASE}/api/mission/current`,
  preprocess:     () => `${CONFIG.API_BASE}/api/mission/preprocess`,
  train:          () => `${CONFIG.API_BASE}/api/mission/train`,
};

/* ============================================================
   UNITY BRIDGE
   Unity's WebView (or a browser iframe during dev) can listen for
   these postMessage events. If this page is running INSIDE Unity's
   UnityWebView / WebGL wrapper, window.unityInstance may exist and
   SendMessage(gameObjectName, methodName, value) can be called
   directly instead — both paths are wired below.
   ============================================================ */
const UnityBridge = {
  gameObject: "IDEController", // must match the GameObject name in Unity holding IDEController.cs

  send(eventName, payload) {
    const data = typeof payload === "string" ? payload : JSON.stringify(payload);

    // Path 1: native Unity WebGL / UnityWebView bridge
    if (window.unityInstance && typeof window.unityInstance.SendMessage === "function") {
      window.unityInstance.SendMessage(this.gameObject, eventName, data);
      return;
    }
    // Path 2: generic postMessage bridge (works for a native WebView plugin listening on window)
    try {
      window.parent.postMessage({ source: "blackvault-web", event: eventName, data }, "*");
    } catch (e) { /* no parent frame, that's fine during standalone dev */ }

    console.log(`[UnityBridge] ${eventName} ->`, payload);
  },

  doorUnlocked(missionResult)  { this.send("OnDoorUnlocked", missionResult); },
  attemptFailed(missionResult) { this.send("OnAttemptFailed", missionResult); },
  missionLoaded(mission)       { this.send("OnMissionLoaded", mission); },
  requestHint()                { this.send("OnHintRequested", {}); },
};

/* ============================================================
   TERMINAL TEXT FX — shared typewriter used on both pages
   ============================================================ */
function typeLine(el, text, speed = CONFIG.TYPE_SPEED_MS) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = "";
    const tick = () => {
      if (i < text.length) {
        el.textContent += text[i++];
        setTimeout(tick, speed + (Math.random() * 10 - 5));
      } else resolve();
    };
    tick();
  });
}

async function typeSequence(container, lines, opts = {}) {
  const { speed = CONFIG.TYPE_SPEED_MS, lineDelay = 220, cls = "" } = opts;
  for (const line of lines) {
    const p = document.createElement("div");
    if (cls) p.className = cls;
    container.appendChild(p);
    await typeLine(p, line, speed);
    await new Promise((r) => setTimeout(r, lineDelay));
    container.scrollTop = container.scrollHeight;
  }
}

/* ============================================================
   API CLIENT — with transparent mock fallback
   ============================================================ */
const Api = {
  async _fetch(url, options) {
    try {
      const res = await fetch(url, {
        ...options,
        headers: { "Content-Type": "application/json", ...(options?.headers || {}) },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (!CONFIG.USE_MOCK_IF_UNREACHABLE) throw err;
      console.warn(`[Api] backend unreachable (${url}), using mock data. Reason:`, err.message);
      return null; // caller falls back to mock
    }
  },

  async getCurrentMission() {
    const live = await this._fetch(ENDPOINTS.currentMission());
    return live || MockData.mission();
  },

  async preprocess(steps) {
    const live = await this._fetch(ENDPOINTS.preprocess(), {
      method: "POST",
      body: JSON.stringify({ steps }),
    });
    return live || MockData.preprocessResult(steps);
  },

  async train(algorithm, hyperparams) {
    const live = await this._fetch(ENDPOINTS.train(), {
      method: "POST",
      body: JSON.stringify({ algorithm, hyperparams }),
    });
    return live || MockData.trainResult(algorithm);
  },
};

/* ============================================================
   MOCK DATA — lets you build/demo the frontend before the
   FastAPI backend + trained pipeline exist. Delete this whole
   block once your backend responses match the same shape.
   ============================================================ */
const MockData = {
  mission() {
    return {
      level: 2,
      title: "SECTOR 02 — PRICE PREDICTION ENGINE",
      dataset_name: "house_prices.csv",
      problem_type: "regression",
      story_brief:
        "The corridor door is fused shut. Its lock is bound to a valuation model — feed it a working regressor and it releases.",
      target_metric: "RMSE",
      target_value: 28000,
      comparison: "below",
      time_limit_seconds: 480,
      hints_enabled: true,
      attempts_remaining: 3,
      algorithms: ["Linear Regression", "Decision Tree Regressor", "Random Forest Regressor"],
      dataset: {
        columns: ["id", "area_sqft", "bedrooms", "location", "year_built", "price"],
        rows: [
          [1, 1450, 3, "Suburb", 2011, 312000],
          [2, null, 2, "Downtown", 2005, 275000],
          [3, 2100, 4, "Suburb", 1998, null],
          [4, 980, 1, "Downtown", 2016, 190000],
          [4, 980, 1, "Downtown", 2016, 190000],
          [5, 1720, 3, null, 2009, 298500],
        ],
        issues: { missing_values: 3, duplicate_rows: 1, unencoded_categoricals: ["location"] },
      },
    };
  },

  preprocessResult(steps) {
    const resolved = new Set(steps);
    const stillMissing = resolved.has("fill_missing") ? 0 : 3;
    const stillDup = resolved.has("remove_duplicates") ? 0 : 1;
    const stillCat = resolved.has("encode_categorical") ? [] : ["location"];
    return {
      ready_to_train: stillMissing === 0 && stillDup === 0 && stillCat.length === 0,
      remaining_issues: { missing_values: stillMissing, duplicate_rows: stillDup, unencoded_categoricals: stillCat },
    };
  },

  trainResult(algorithm) {
    const scoreByAlgo = {
      "Linear Regression": 34200,
      "Decision Tree Regressor": 30500,
      "Random Forest Regressor": 24800,
    };
    const rmse = scoreByAlgo[algorithm] ?? 39000;
    const passed = rmse < 28000;
    return {
      algorithm,
      metrics: { RMSE: rmse, MAE: Math.round(rmse * 0.78), R2: passed ? 0.87 : 0.61 },
      target_metric: "RMSE",
      target_value: 28000,
      passed,
      message: passed
        ? "MODEL ACCEPTED — LOCK DISENGAGED"
        : "MODEL REJECTED — ERROR EXCEEDS TOLERANCE",
    };
  },
};

/* ============================================================
   GAME STATE
   ============================================================ */
const GameState = {
  mission: null,
  appliedSteps: new Set(),
  attemptsUsed: 0,
  timerHandle: null,
  secondsLeft: 0,

  reset(mission) {
    this.mission = mission;
    this.appliedSteps.clear();
    this.attemptsUsed = 0;
    this.secondsLeft = mission.time_limit_seconds;
  },

  startTimer(onTick, onExpire) {
    clearInterval(this.timerHandle);
    this.timerHandle = setInterval(() => {
      this.secondsLeft = Math.max(0, this.secondsLeft - 1);
      onTick(this.secondsLeft);
      if (this.secondsLeft === 0) {
        clearInterval(this.timerHandle);
        onExpire();
      }
    }, 1000);
  },

  stopTimer() { clearInterval(this.timerHandle); },
};

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}