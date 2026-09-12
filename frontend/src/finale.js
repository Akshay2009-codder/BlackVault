// BlackVault Finale — Rooftop Reveal
// Called after the player clears Floor 5 (The Vault).
// Shows a full-screen 2D painted scene: the building exterior at night,
// all 5 floors illuminated from outside, city panorama around it.
// Then offers "Ride Back Down" → level complete screen.

export function triggerFinale(onComplete) {
  const overlay = document.getElementById("finale-overlay");
  const canvas  = document.getElementById("finale-canvas");
  const backBtn = document.getElementById("finale-back-btn");

  if (!overlay || !canvas) return;

  // Paint the rooftop reveal canvas
  paintRooftopReveal(canvas);

  // Animate text in
  const tagline  = document.getElementById("finale-tagline");
  const headline = document.getElementById("finale-headline");
  const sub      = document.getElementById("finale-sub");

  if (tagline)  tagline.textContent  = "— BLACKVAULT CORP —";
  if (headline) headline.textContent = "You Made It Through.";
  if (sub)      sub.textContent      = "Five floors. Five puzzles. The whole tower — yours.\nEvery department, every challenge, cleared. The Vault is open.";

  // Show overlay with fade
  requestAnimationFrame(() => {
    overlay.classList.add("visible");
  });

  // Play finale ambient chime
  playFinaleChime();

  // Wire ride-back-down button
  if (backBtn) {
    backBtn.onclick = () => {
      overlay.classList.remove("visible");
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 900);
    };
  }
}

// ── Building Exterior Canvas Scene ────────────────────────────────────────

function paintRooftopReveal(canvas) {
  canvas.width  = window.innerWidth  || 1920;
  canvas.height = window.innerHeight || 1080;
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;

  // ── Night sky gradient ───────────────────────────────────────────────────
  const sky = ctx.createLinearGradient(0, 0, 0, H * 0.72);
  sky.addColorStop(0,    "#0a0307");
  sky.addColorStop(0.4,  "#1e0812");
  sky.addColorStop(0.72, "#3a1420");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Stars
  for (let i = 0; i < 320; i++) {
    const sx = Math.random() * W;
    const sy = Math.random() * H * 0.65;
    const sr = 0.5 + Math.random() * 1.2;
    ctx.fillStyle = `rgba(242, 232, 220, ${0.3 + Math.random() * 0.7})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Warm atmospheric glow near horizon
  for (let i = 0; i < 6; i++) {
    const gx = W * 0.2 + Math.random() * W * 0.6;
    const gy = H * 0.5 + Math.random() * H * 0.1;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 180 + Math.random() * 120);
    gr.addColorStop(0, "rgba(201,143,138,0.12)");
    gr.addColorStop(1, "transparent");
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  }

  // ── City background buildings (distant silhouettes) ─────────────────────
  const groundY = H * 0.82;
  const cityColors = ["#1e0e14", "#160b10", "#10080d"];
  let cx = -20;
  while (cx < W + 20) {
    const bw = 50 + Math.random() * 120;
    const bh = 80 + Math.random() * 280;
    const by = groundY - bh;
    ctx.fillStyle = cityColors[Math.floor(Math.random() * cityColors.length)];
    ctx.fillRect(cx, by, bw, bh);
    // Windows
    const rows = Math.floor(bh / 14), cols = Math.floor(bw / 10);
    for (let r = 1; r < rows - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (Math.random() > 0.5) {
          const wx = cx + c * 10 + 2, wy = by + r * 14 + 2;
          const brightness = 0.4 + Math.random() * 0.6;
          ctx.fillStyle = Math.random() > 0.5
            ? `rgba(242,232,220,${brightness * 0.7})`
            : `rgba(201,166,107,${brightness * 0.55})`;
          ctx.fillRect(wx, wy, 5, 7);
        }
      }
    }
    cx += bw + Math.random() * 12;
  }

  // Ground / pavement
  const groundGrad = ctx.createLinearGradient(0, groundY, 0, H);
  groundGrad.addColorStop(0, "#1a0d0f");
  groundGrad.addColorStop(1, "#0a0507");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  // Street lights
  for (let i = 0; i < 8; i++) {
    const lx = W * 0.05 + i * (W * 0.9 / 7);
    ctx.fillStyle = "#241417";
    ctx.fillRect(lx - 3, groundY - 60, 6, 60);
    ctx.fillStyle = "#c9a66b";
    ctx.shadowColor = "#c9a66b";
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(lx, groundY - 62, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // ── THE BLACKVAULT BUILDING (center, tall) ───────────────────────────────
  const bldW  = Math.min(W * 0.28, 380);
  const bldH  = H * 0.68;
  const bldX  = (W - bldW) / 2;
  const bldY  = groundY - bldH;

  // Shadow
  const shadowGrad = ctx.createLinearGradient(bldX - 40, 0, bldX + bldW + 40, 0);
  shadowGrad.addColorStop(0,   "rgba(0,0,0,0.6)");
  shadowGrad.addColorStop(0.5, "rgba(0,0,0,0.0)");
  shadowGrad.addColorStop(1,   "rgba(0,0,0,0.6)");
  ctx.fillStyle = shadowGrad;
  ctx.fillRect(bldX - 40, bldY, bldW + 80, bldH);

  // Building body
  const bldGrad = ctx.createLinearGradient(bldX, 0, bldX + bldW, 0);
  bldGrad.addColorStop(0,   "#241417");
  bldGrad.addColorStop(0.2, "#2e1a1e");
  bldGrad.addColorStop(0.8, "#2a1720");
  bldGrad.addColorStop(1,   "#1e1014");
  ctx.fillStyle = bldGrad;
  ctx.fillRect(bldX, bldY, bldW, bldH);

  // Gold vertical corner trim lines
  ctx.fillStyle = "#c9a66b";
  ctx.fillRect(bldX,             bldY, 4, bldH);
  ctx.fillRect(bldX + bldW - 4,  bldY, 4, bldH);

  // Floor bands — each floor has a horizontal accent stripe + lit windows
  const FLOORS = [
    { label: "5F — THE VAULT",         accent: "#6b1f2a", glow: "#6b1f2a" },
    { label: "4F — ANOMALY WING",      accent: "#8c2635", glow: "#8c2635" },
    { label: "3F — CLUSTERING HUB",    accent: "#c9a66b", glow: "#c9a66b" },
    { label: "2F — REGRESSION LAB",    accent: "#c98f8a", glow: "#c98f8a" },
    { label: "1F — CLASSIFICATION LAB",accent: "#6b1f2a", glow: "#6b1f2a" },
    { label: "G  — RECEPTION",         accent: "#c9a66b", glow: "#c9a66b" },
  ];
  const floorH = bldH / FLOORS.length;

  FLOORS.forEach((fl, i) => {
    const fy = bldY + i * floorH;

    // Floor horizontal accent band
    ctx.fillStyle = fl.accent;
    ctx.fillRect(bldX, fy + floorH - 4, bldW, 4);

    // Gold floor-number tab on left edge
    ctx.fillStyle = fl.accent + "cc";
    ctx.fillRect(bldX - 32, fy + floorH / 2 - 10, 32, 20);
    ctx.fillStyle = "#f2e8dc";
    ctx.font = "bold 10px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(fl.label.split("—")[0].trim(), bldX - 16, fy + floorH / 2 + 4);
    ctx.textAlign = "left";

    // Interior glow (lit floor)
    const floorGlow = ctx.createLinearGradient(bldX, fy, bldX + bldW, fy);
    floorGlow.addColorStop(0,   "transparent");
    floorGlow.addColorStop(0.2, fl.glow + "22");
    floorGlow.addColorStop(0.8, fl.glow + "22");
    floorGlow.addColorStop(1,   "transparent");
    ctx.fillStyle = floorGlow;
    ctx.fillRect(bldX, fy, bldW, floorH - 4);

    // Windows — each floor has its own warm-tinted lit windows
    const winCols = Math.floor(bldW / 26);
    const winRows = Math.floor((floorH - 12) / 16);
    for (let r = 1; r < winRows - 0.5; r++) {
      for (let c = 1; c < winCols - 1; c++) {
        const wx = bldX + c * 26 + 4;
        const wy = fy + r * 16 + 4;
        const on = Math.random() > 0.18;
        ctx.fillStyle = on
          ? `rgba(242,232,220,${0.55 + Math.random() * 0.4})`
          : "rgba(0,0,0,0.3)";
        ctx.fillRect(wx, wy, 14, 10);
      }
    }
  });

  // Rooftop spire — gold
  ctx.fillStyle = "#c9a66b";
  ctx.shadowColor = "#c9a66b";
  ctx.shadowBlur = 30;
  const spireX = bldX + bldW / 2;
  ctx.fillRect(spireX - 4, bldY - 80, 8, 80);
  ctx.fillRect(spireX - 12, bldY - 82, 24, 6);
  ctx.beginPath();
  ctx.arc(spireX, bldY - 86, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Building name on facade
  ctx.font = `bold ${Math.floor(bldW * 0.088)}px 'Inter', sans-serif`;
  ctx.fillStyle = "rgba(242,232,220,0.12)";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT", bldX + bldW / 2, groundY - bldH * 0.5);
  ctx.textAlign = "left";

  // Company sign at base — illuminated
  ctx.fillStyle = "#241417";
  ctx.fillRect(bldX + bldW * 0.2, groundY - 40, bldW * 0.6, 35);
  ctx.fillStyle = "#c9a66b";
  ctx.shadowColor = "#c9a66b";
  ctx.shadowBlur = 12;
  ctx.font = "bold 18px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT CORP", bldX + bldW / 2, groundY - 18);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // ── Overlay gradient for text readability ────────────────────────────────
  const textGrad = ctx.createLinearGradient(0, H * 0.65, 0, H);
  textGrad.addColorStop(0,   "transparent");
  textGrad.addColorStop(0.4, "rgba(10,5,7,0.7)");
  textGrad.addColorStop(1,   "rgba(10,5,7,0.97)");
  ctx.fillStyle = textGrad;
  ctx.fillRect(0, H * 0.65, W, H * 0.35);
}

// ── Finale Chime ──────────────────────────────────────────────────────────

function playFinaleChime() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    if (ctx.state === "suspended") ctx.resume();

    // Rising chord — burgundy/gold feel: A major spread
    const notes = [220, 277.2, 329.6, 440, 554.4];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.12);
      gain.gain.setValueAtTime(0.12, start + 1.2);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 3.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 3.6);
    });
  } catch (e) {}
}
