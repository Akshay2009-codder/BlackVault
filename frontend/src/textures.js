// Procedural canvas textures for BlackVault — Dusty Pink + Burgundy + Cream palette.
// Architecture Palette: Cream #F2E8DC, warm cream-grey floor #DCCFC0, dark grout #2B1A1C
// Accents: Burgundy #6B1F2A, Dusty Pink #C98F8A, Brushed Gold #C9A66B

import * as THREE from "three";

export function createFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm cream-grey tile base
  ctx.fillStyle = "#dccfc0";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle surface variation noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.9));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.8));
  }
  ctx.putImageData(imgData, 0, 0);

  // Dark grout lines (#2B1A1C)
  ctx.strokeStyle = "#2b1a1c";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  for (let x = 0; x <= 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  for (let y = 0; y <= 1024; y += 256) {
    ctx.moveTo(0, y); ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // Faint inner tile subdivision (softer grout)
  ctx.strokeStyle = "rgba(43, 26, 28, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 128; x < 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  for (let y = 128; y < 1024; y += 256) {
    ctx.moveTo(0, y); ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // Very subtle warm burgundy inlay at tile corners
  ctx.fillStyle = "rgba(107, 31, 42, 0.18)";
  for (let x = 0; x <= 1024; x += 256) {
    for (let y = 0; y <= 1024; y += 256) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 35);
  return texture;
}

export function createCitySkylineTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm evening twilight gradient — amber-rose sky
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0,    "#1a0810");
  grad.addColorStop(0.3,  "#2e1020");
  grad.addColorStop(0.6,  "#4a1c2c");
  grad.addColorStop(0.82, "#6b2435");
  grad.addColorStop(1,    "#8c3a40");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Warm atmospheric glow blobs (rose + gold)
  for (let i = 0; i < 12; i++) {
    const cx = Math.random() * 2048;
    const cy = 120 + Math.random() * 280;
    const cr = 80 + Math.random() * 140;
    const isGold = Math.random() > 0.5;
    ctx.fillStyle = isGold
      ? "rgba(201, 166, 107, 0.07)"
      : "rgba(201, 143, 138, 0.07)";
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Building silhouettes — three depth layers
  const layers = [
    { color: "#3a1420", minH: 320, maxH: 640, widthRange: [65, 135] },
    { color: "#2a0e18", minH: 430, maxH: 820, widthRange: [75, 155] },
    { color: "#1e080f", minH: 540, maxH: 920, widthRange: [85, 185] },
  ];

  layers.forEach((layer) => {
    let currX = -50;
    while (currX < 2100) {
      const bWidth  = layer.widthRange[0] + Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
      const bHeight = layer.minH + Math.random() * (layer.maxH - layer.minH);
      const bY = 1024 - bHeight;

      ctx.fillStyle = layer.color;
      ctx.fillRect(currX, bY, bWidth, bHeight);

      // Rooftop spire with warm gold tip
      if (Math.random() > 0.4) {
        ctx.fillRect(currX + bWidth * 0.44, bY - 40, bWidth * 0.12, 40);
        ctx.fillStyle = "#c9a66b";
        ctx.fillRect(currX + bWidth * 0.47, bY - 46, 4, 7);
        ctx.fillStyle = layer.color;
      }

      // Window lights — warm cream/gold/rose
      const rows = Math.floor(bHeight / 14);
      const cols = Math.floor(bWidth / 10);
      for (let r = 2; r < rows - 2; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (Math.random() > 0.45) {
            const wx = currX + c * 10 + 2;
            const wy = bY + r * 14 + 2;
            const rand = Math.random();
            let wColor;
            if (rand > 0.55) {
              wColor = `rgba(242, 232, 220, ${0.55 + Math.random() * 0.4})`;  // cream
            } else if (rand > 0.25) {
              wColor = `rgba(201, 166, 107, ${0.5 + Math.random() * 0.45})`; // gold
            } else {
              wColor = `rgba(201, 143, 138, ${0.45 + Math.random() * 0.4})`; // dusty pink
            }
            ctx.fillStyle = wColor;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      currX += bWidth + Math.random() * 14;
    }
  });

  return new THREE.CanvasTexture(canvas);
}

// Left Ultrawide: Python code editor with warm dark theme
export function createLeftUltrawideScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");

  // Warm dark bg
  ctx.fillStyle = "#0f0709";
  ctx.fillRect(0, 0, 1280, 420);

  // File tree sidebar
  ctx.fillStyle = "#0a0507";
  ctx.fillRect(0, 0, 190, 420);
  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#c98f8a";
  ctx.fillText("BLACKVAULT EXPLORER", 14, 22);

  const files = [
    "▼ BLACKVAULT",
    "  ▶ src",
    "    • classifier_pipeline.py",
    "    • regression_engine.py",
    "    • clustering_core.py",
    "  ▶ datasets",
    "    • building_features.csv",
    "    • anomaly_stream.json",
    "  ▶ backend",
    "    • sandbox.py",
    "    • scoring.py"
  ];
  files.forEach((f, i) => {
    ctx.fillStyle = f.includes("•") ? "#e8c4c0" : "#6b4040";
    ctx.fillText(f, 14, 46 + i * 18);
  });

  // Editor tabs
  ctx.fillStyle = "#160b0d";
  ctx.fillRect(190, 0, 550, 28);
  ctx.fillStyle = "#241417";
  ctx.fillRect(190, 0, 180, 28);
  ctx.fillStyle = "#c98f8a";
  ctx.fillText("classifier_pipeline.py ×", 202, 18);

  // Code lines — warm syntax colours
  const codeLines = [
    { no: "1",  text: "import numpy as np, pandas as pd",                  color: "#e8a0a0" },
    { no: "2",  text: "from sklearn.ensemble import RandomForestClassifier", color: "#c98f8a" },
    { no: "3",  text: "from sklearn.model_selection import cross_val_score", color: "#c98f8a" },
    { no: "4",  text: "",                                                    color: "#fff" },
    { no: "5",  text: "def evaluate_gate(df, target_col):",                  color: "#c9a66b" },
    { no: "6",  text: "    X = df.drop(columns=[target_col])",               color: "#f2e8dc" },
    { no: "7",  text: "    y = df[target_col]",                              color: "#f2e8dc" },
    { no: "8",  text: "    # Fit high-accuracy classifier",                  color: "#6b4040" },
    { no: "9",  text: "    clf = RandomForestClassifier(n_estimators=100)",  color: "#c98f8a" },
    { no: "10", text: "    scores = cross_val_score(clf, X, y, cv=5)",        color: "#7a9471" },
    { no: "11", text: "    print(f'Accuracy: {scores.mean():.4f}')",          color: "#c9a66b" },
    { no: "12", text: "    if scores.mean() >= 0.85: unlock_door()",          color: "#7a9471" },
    { no: "13", text: "    return clf.fit(X, y)",                             color: "#c9a66b" },
  ];

  ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
  codeLines.forEach((cl, idx) => {
    const y = 48 + idx * 17;
    ctx.fillStyle = "#5c3030";
    ctx.fillText(cl.no.padStart(3, " "), 200, y);
    ctx.fillStyle = cl.color;
    ctx.fillText(cl.text, 240, y);
  });

  // Terminal footer
  ctx.fillStyle = "#0a0507";
  ctx.fillRect(190, 360, 550, 60);
  ctx.fillStyle = "#7a9471";
  ctx.fillText("✓ Connected: http://127.0.0.1:8000 (BlackVault ML Engine)", 206, 385);
  ctx.fillStyle = "#c9a66b";
  ctx.fillText("➜ STATUS: All 5 Floor Terminals Online | Engine Ready", 206, 403);

  // Right: viewport preview
  ctx.fillStyle = "#120809";
  ctx.fillRect(740, 0, 540, 420);
  // Grid in gold
  ctx.strokeStyle = "rgba(201, 166, 107, 0.2)";
  ctx.lineWidth = 1;
  for (let gx = 740; gx <= 1280; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 420); ctx.stroke();
  }
  for (let gy = 0; gy <= 420; gy += 30) {
    ctx.beginPath(); ctx.moveTo(740, gy); ctx.lineTo(1280, gy); ctx.stroke();
  }
  // Building cross-section wireframe
  const cx = 1010, cy = 210;
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cx - 70, cy - 50, 140, 100);
  ctx.strokeRect(cx - 40, cy - 80, 140, 100);
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 50); ctx.lineTo(cx - 40, cy - 80);
  ctx.moveTo(cx + 70, cy - 50); ctx.lineTo(cx + 100, cy - 80);
  ctx.moveTo(cx - 70, cy + 50); ctx.lineTo(cx - 40, cy + 20);
  ctx.moveTo(cx + 70, cy + 50); ctx.lineTo(cx + 100, cy + 20);
  ctx.stroke();
  // Core glow — burgundy
  ctx.fillStyle = "#6b1f2a";
  ctx.shadowColor = "#6b1f2a";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#c9a66b";
  ctx.fillText("BUILDING VIEWPORT [FLOOR MODEL]", 755, 25);
  ctx.fillStyle = "#6b4040";
  ctx.fillText("Floors: 5+G | Material: PBR Cream | FPS: 60", 755, 400);

  return new THREE.CanvasTexture(canvas);
}

// Right Ultrawide: Floor overview / building plan view
export function createRightUltrawideScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0d0608";
  ctx.fillRect(0, 0, 1280, 420);

  // Side panels
  ctx.fillStyle = "#090405";
  ctx.fillRect(0, 0, 150, 420);
  ctx.fillRect(1130, 0, 150, 420);

  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#c98f8a";
  ctx.fillText("FLOORS", 22, 24);
  const floors = ["5F — The Vault", "4F — Anomaly", "3F — Clustering", "2F — Regression", "1F — Classif.", "G  — Lobby"];
  floors.forEach((o, i) => {
    ctx.fillStyle = i === 0 ? "#c9a66b" : "#6b4040";
    ctx.fillText(o, 8, 50 + i * 22);
  });

  ctx.fillStyle = "#c9a66b";
  ctx.fillText("STATUS", 1140, 24);
  ctx.fillStyle = "#6b4040";
  ctx.fillText("Floor: 1F", 1140, 52);
  ctx.fillText("Sec: ACTIVE", 1140, 74);
  ctx.fillText("Temp: 21°C", 1140, 96);
  ctx.fillText("Air: OK", 1140, 118);

  // Corridor perspective — warm cream interior
  const vx = 150, vw = 980, vcx = vx + vw / 2, vcy = 210;
  ctx.fillStyle = "#2a1418";
  ctx.beginPath();
  ctx.moveTo(vx, 0); ctx.lineTo(vcx - 160, vcy - 80);
  ctx.lineTo(vcx - 160, vcy + 80); ctx.lineTo(vx, 420);
  ctx.fill();
  ctx.fillStyle = "#2a1418";
  ctx.beginPath();
  ctx.moveTo(vx + vw, 0); ctx.lineTo(vcx + 160, vcy - 80);
  ctx.lineTo(vcx + 160, vcy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();
  ctx.fillStyle = "#1e0e11";
  ctx.beginPath();
  ctx.moveTo(vx, 420); ctx.lineTo(vcx - 160, vcy + 80);
  ctx.lineTo(vcx + 160, vcy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();

  // Elevator doors at end with gold trim
  ctx.fillStyle = "#180c0e";
  ctx.fillRect(vcx - 160, vcy - 80, 320, 160);
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(vcx - 140, vcy - 70, 280, 150);
  // Door seam glow
  ctx.shadowColor = "#c9a66b";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#c9a66b";
  ctx.fillRect(vcx - 3, vcy - 64, 6, 138);
  ctx.shadowBlur = 0;

  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillStyle = "#f2e8dc";
  ctx.fillText("FLOOR VIEW — BLACKVAULT CORPORATE TOWER", vx + 20, 28);

  return new THREE.CanvasTexture(canvas);
}

// Dark-keycap mechanical keyboard — deep burgundy-black
export function createKeyboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#180c0e";
  ctx.fillRect(0, 0, 512, 180);

  const rows = 5, cols = 15;
  const kw = 26, kh = 24;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const kx = 18 + c * 32;
      const ky = 16 + r * 30;
      // Subtle gold underglow
      ctx.fillStyle = "rgba(201, 166, 107, 0.6)";
      ctx.fillRect(kx - 1, ky - 1, kw + 2, kh + 2);
      // Deep keycap
      ctx.fillStyle = "#241417";
      ctx.fillRect(kx, ky, kw, kh);
      // Highlight
      ctx.fillStyle = "rgba(201, 166, 107, 0.25)";
      ctx.fillRect(kx + 3, ky + 3, kw - 6, 4);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

// Whiteboard — cream board, burgundy/gold marker text
export function createWhiteboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Cream board surface
  ctx.fillStyle = "#f2e8dc";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 1012, 500);

  // Header
  ctx.font = "bold 22px 'Inter', sans-serif";
  ctx.fillStyle = "#6b1f2a";
  ctx.fillText("BLACKVAULT — MACHINE LEARNING PIPELINE", 50, 55);

  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#241417";
  ctx.fillText("Sensor Data  →  Feature Eng.  →  Model Fit  →  Score  →  UNLOCK", 50, 90);

  // Box 1
  ctx.strokeStyle = "#6b1f2a";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 130, 240, 120);
  ctx.fillStyle = "#6b1f2a";
  ctx.font = "15px 'JetBrains Mono', monospace";
  ctx.fillText("[ 01. INGESTION ]", 70, 165);
  ctx.fillStyle = "#5a3030";
  ctx.fillText("• Impute nulls", 70, 195);
  ctx.fillText("• StandardScaler", 70, 220);

  // Arrow
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(300, 190); ctx.lineTo(390, 190);
  ctx.lineTo(382, 182); ctx.moveTo(390, 190); ctx.lineTo(382, 198);
  ctx.stroke();

  // Box 2
  ctx.strokeStyle = "#c98f8a";
  ctx.strokeRect(410, 130, 240, 120);
  ctx.fillStyle = "#c98f8a";
  ctx.fillText("[ 02. MODEL ]", 430, 165);
  ctx.fillStyle = "#5a3030";
  ctx.fillText("• RandomForest / SVM", 430, 195);
  ctx.fillText("• CrossVal ≥ 0.85", 430, 220);

  // Arrow 2
  ctx.strokeStyle = "#c9a66b";
  ctx.beginPath();
  ctx.moveTo(660, 190); ctx.lineTo(750, 190);
  ctx.lineTo(742, 182); ctx.moveTo(750, 190); ctx.lineTo(742, 198);
  ctx.stroke();

  // Box 3 — gold
  ctx.strokeStyle = "#c9a66b";
  ctx.strokeRect(770, 130, 200, 120);
  ctx.fillStyle = "#c9a66b";
  ctx.fillText("[ UNLOCKED ]", 790, 165);
  ctx.fillStyle = "#7a9471";
  ctx.font = "22px serif";
  ctx.fillText("★ ★ ★", 808, 215);

  // Notes
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#8c5555";
  ctx.fillText("BUILDING PROTOCOL: Complete each floor terminal to ascend to the next level.", 50, 350);
  ctx.fillText("STATUS: 5 Floor Terminals linked to Central Building Access System.", 50, 380);

  return new THREE.CanvasTexture(canvas);
}

// Logo texture — cream bg, burgundy wordmark
export function createLogoTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f2e8dc";
  ctx.fillRect(0, 0, 1024, 300);

  // BV monogram
  ctx.lineWidth = 20;
  ctx.strokeStyle = "#6b1f2a";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(60, 220); ctx.lineTo(60, 70); ctx.lineTo(155, 220); ctx.lineTo(155, 70);
  ctx.stroke();
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(60, 70); ctx.lineTo(155, 220);
  ctx.stroke();

  // Wordmark
  ctx.font = "bold 62px 'Inter', sans-serif";
  ctx.fillStyle = "#241417";
  ctx.fillText("BLACKVAULT", 210, 140);
  ctx.font = "32px 'Inter', sans-serif";
  ctx.fillStyle = "#6b1f2a";
  ctx.fillText("C O R P O R A T E   R E S E A R C H   T O W E R", 215, 192);

  return new THREE.CanvasTexture(canvas);
}

// Neon/warm sign texture — cream bg, burgundy glow text
export function createNeonSignTexture(text, mainColor, glowColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  // Warm dark panel background
  ctx.fillStyle = "#1a0d0f";
  ctx.fillRect(0, 0, 512, 180);

  // Gold frame border
  ctx.shadowColor = "#c9a66b";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 3;
  ctx.strokeRect(14, 14, 484, 152);
  ctx.shadowBlur = 0;

  // Inner thin accent line
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(20, 20, 472, 140);

  ctx.font = "bold 42px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Glow layer
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 28;
  ctx.fillStyle = glowColor;
  ctx.fillText(text, 256, 90);

  // Bright overlay
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#f2e8dc";
  ctx.fillText(text, 256, 90);
  ctx.shadowBlur = 0;

  return new THREE.CanvasTexture(canvas);
}

// Ceiling/CCTV screen texture
export function createCeilingScreenTexture(camLabel) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#100608";
  ctx.fillRect(0, 0, 512, 340);
  ctx.strokeStyle = "rgba(201, 143, 138, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 452, 280);
  ctx.beginPath();
  ctx.moveTo(256, 30); ctx.lineTo(256, 310);
  ctx.moveTo(30, 170); ctx.lineTo(482, 170);
  ctx.stroke();

  ctx.font = "bold 16px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#8c2635";
  ctx.fillText("● LIVE [SURVEILLANCE]", 44, 60);
  ctx.fillStyle = "#c98f8a";
  ctx.fillText(camLabel, 44, 85);
  ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#6b4040";
  ctx.fillText("FPS: 60.0 | ISO 800 | 4K HDR", 44, 280);
  ctx.fillText("STATUS: FLOOR MONITORED", 44, 300);

  return new THREE.CanvasTexture(canvas);
}

// Lobby rug texture — concentric cream/burgundy/gold rings with company brand
export function createHubRugTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm cream rug base
  ctx.fillStyle = "#e8dccf";
  ctx.fillRect(0, 0, 1024, 1024);

  const colors = ["#6b1f2a", "#c9a66b", "#c98f8a", "#241417", "#6b1f2a"];
  const cx = 512, cy = 512;

  // Concentric rings
  for (let i = 0; i < colors.length; i++) {
    const r = 480 - i * 80;
    ctx.strokeStyle = colors[i];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Radiating spokes
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.strokeStyle = colors[i];
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 490, cy + Math.sin(angle) * 490);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Center medallion
  ctx.fillStyle = "#241417";
  ctx.beginPath();
  const hexR = 78;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * hexR;
    const py = cy + Math.sin(a) * hexR;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#c9a66b";
  ctx.font = "bold 18px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT", cx, cy + 6);
  ctx.textAlign = "left";

  return new THREE.CanvasTexture(canvas);
}

// Floor directory board — tall standing sign with all floors listed
export function createFloorDirectoryTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");

  // Panel background
  ctx.fillStyle = "#241417";
  ctx.fillRect(0, 0, 512, 768);

  // Gold outer border
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, 492, 748);

  // Inner burgundy border
  ctx.strokeStyle = "#6b1f2a";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, 476, 732);

  // Header
  ctx.fillStyle = "#c9a66b";
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT CORP", 256, 58);
  ctx.font = "14px 'Inter', sans-serif";
  ctx.fillStyle = "#c98f8a";
  ctx.fillText("CORPORATE RESEARCH TOWER", 256, 82);

  // Separator
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, 100); ctx.lineTo(477, 100);
  ctx.stroke();

  // Floor entries
  const floors = [
    { label: "5F",  name: "The Vault",         sub: "Core Security Vault — Restricted", col: "#d4af37" },
    { label: "4F",  name: "Anomaly Wing",       sub: "Security Operations & Radar",      col: "#ff3d81" },
    { label: "3F",  name: "Clustering Hub",     sub: "Executive Boardroom",              col: "#e63946" },
    { label: "2F",  name: "Regression Lab",     sub: "Data & Server Infrastructure",     col: "#16c784" },
    { label: "1F",  name: "Classification Lab", sub: "Research & Machine Learning",      col: "#ff3d81" },
    { label: "G",   name: "Reception & Lobby",  sub: "Main Entrance — Corporate Nexus",   col: "#d4af37" },
  ];

  floors.forEach((f, i) => {
    const y = 135 + i * 100;
    // Row bg
    ctx.fillStyle = i % 2 === 0 ? "rgba(107, 31, 42, 0.12)" : "rgba(36, 20, 23, 0.6)";
    ctx.fillRect(24, y, 464, 88);

    // Floor number badge
    ctx.fillStyle = f.col;
    ctx.fillRect(32, y + 16, 60, 56);
    ctx.fillStyle = "#241417";
    ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.fillText(f.label, 62, y + 50);

    // Name & sub
    ctx.textAlign = "left";
    ctx.fillStyle = "#f2e8dc";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillText(f.name, 106, y + 42);
    ctx.fillStyle = "#8c6060";
    ctx.font = "12px 'Inter', sans-serif";
    ctx.fillText(f.sub, 106, y + 62);

    // Row separator
    ctx.strokeStyle = "rgba(201, 166, 107, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(24, y + 88); ctx.lineTo(488, y + 88);
    ctx.stroke();
  });

  // Footer
  ctx.fillStyle = "#6b4040";
  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("USE ELEVATOR TO ACCESS FLOORS", 256, 745);

  return new THREE.CanvasTexture(canvas);
}

// Elevator door texture — brushed deep metal with gold trim seam
export function createElevatorDoorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Deep brushed metal
  ctx.fillStyle = "#1e1012";
  ctx.fillRect(0, 0, 256, 512);

  // Horizontal brush strokes
  for (let y = 0; y < 512; y += 4) {
    const v = (Math.random() - 0.5) * 12;
    ctx.fillStyle = `rgba(255, 220, 190, ${0.03 + Math.abs(v) * 0.003})`;
    ctx.fillRect(0, y, 256, 2);
  }

  // Raised panel recesses
  const panels = [[20, 40, 216, 200], [20, 270, 216, 200]];
  panels.forEach(([px, py, pw, ph]) => {
    ctx.strokeStyle = "#c9a66b";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px, py, pw, ph);
    ctx.fillStyle = "rgba(201, 166, 107, 0.05)";
    ctx.fillRect(px, py, pw, ph);
  });

  // Gold center seam line (right edge — seam where doors meet)
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "transparent");
  grad.addColorStop(0.25, "#c9a66b");
  grad.addColorStop(0.75, "#c9a66b");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(252, 0, 4, 512);

  return new THREE.CanvasTexture(canvas);
}

// Elevator floor indicator display
export function createElevatorFloorIndicatorTexture(floorLabel) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0a0507";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 248, 120);

  ctx.font = "bold 58px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#c9a66b";
  ctx.shadowColor = "#c9a66b";
  ctx.shadowBlur = 20;
  ctx.fillText(floorLabel, 128, 64);
  ctx.shadowBlur = 0;

  return new THREE.CanvasTexture(canvas);
}

// Department plaque for wall mounting
export function createDeptPlaqueTexture(deptName, subtitle) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#241417";
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = "#f2e8dc";
  ctx.textAlign = "center";
  ctx.fillText(deptName, 256, 50);

  ctx.font = "14px 'Inter', sans-serif";
  ctx.fillStyle = "#c9a66b";
  ctx.fillText(subtitle, 256, 82);

  return new THREE.CanvasTexture(canvas);
}

// Regression chart — dusty pink version
export function createRegressionChartTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 400;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#120809";
  ctx.fillRect(0, 0, 640, 400);
  ctx.strokeStyle = "#c98f8a";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(10, 10, 620, 380);

  ctx.fillStyle = "#c98f8a";
  ctx.font = "bold 16px 'Inter', sans-serif";
  ctx.fillText("REGRESSION ANALYSIS — RESIDUALS", 24, 40);

  ctx.fillStyle = "rgba(201, 143, 138, 0.7)";
  for (let i = 0; i < 58; i++) {
    const px = 60 + (i / 58) * 530 + (Math.random() - 0.5) * 24;
    const py = 340 - (i / 58) * 264 + (Math.random() - 0.5) * 42;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.moveTo(60, 340);
  ctx.lineTo(590, 76);
  ctx.stroke();

  ctx.strokeStyle = "rgba(201, 143, 138, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(55, 50); ctx.lineTo(55, 360); ctx.lineTo(608, 360);
  ctx.stroke();

  ctx.fillStyle = "#8c7070";
  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillText("PREDICTED", 255, 390);
  ctx.fillStyle = "#7a9471";
  ctx.fillText("R² = 0.942 [OPTIMAL]", 450, 62);

  return new THREE.CanvasTexture(canvas);
}

// Cluster presentation screen — brushed gold version
export function createClusterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#100809";
  ctx.fillRect(0, 0, 800, 480);
  ctx.strokeStyle = "#c9a66b";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(10, 10, 780, 460);

  ctx.fillStyle = "#c9a66b";
  ctx.font = "bold 20px 'Inter', sans-serif";
  ctx.fillText("K-MEANS CLUSTER ANALYSIS", 24, 50);

  const clusters = [
    { cx: 210, cy: 210, color: "#ff3d81" },
    { cx: 510, cy: 170, color: "#16c784" },
    { cx: 360, cy: 350, color: "#e63946" },
  ];
  clusters.forEach(c => {
    ctx.fillStyle = c.color;
    for (let i = 0; i < 32; i++) {
      const rx = c.cx + (Math.random() - 0.5) * 110;
      const ry = c.cy + (Math.random() - 0.5) * 88;
      ctx.beginPath();
      ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = c.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(c.cx, c.cy, 68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  ctx.fillStyle = "#6b4040";
  ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillText("Silhouette: 0.78  |  Inertia: 118.2  |  k=3  |  Convergence: PASSED", 24, 462);

  return new THREE.CanvasTexture(canvas);
}

// Anomaly / Threat level screen — burgundy-red warning version
export function createThreatLevelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c0508";
  ctx.fillRect(0, 0, 1024, 360);

  const screens = [
    { x:  16, label: "SECTOR A", value: "97.4%", status: "BREACH",  col: "#e63946" },
    { x: 270, label: "SECTOR B", value: "12.1%", status: "NOMINAL", col: "#16c784" },
    { x: 524, label: "SECTOR C", value: "63.5%", status: "WARNING", col: "#ff9900" },
    { x: 778, label: "SECTOR D", value: "97.1%", status: "BREACH",  col: "#ff3d81" },
  ];
  screens.forEach(s => {
    ctx.fillStyle = "#120810";
    ctx.fillRect(s.x, 20, 238, 314);
    ctx.strokeStyle = s.col;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(s.x, 20, 238, 314);
    ctx.fillStyle = s.col;
    ctx.font = "bold 15px 'JetBrains Mono', monospace";
    ctx.fillText(s.label, s.x + 12, 52);
    ctx.font = "bold 46px 'Inter', sans-serif";
    ctx.shadowColor = s.col;
    ctx.shadowBlur = 18;
    ctx.fillText(s.value, s.x + 14, 158);
    ctx.shadowBlur = 0;
    ctx.font = "bold 16px 'Inter', sans-serif";
    ctx.fillText(s.status, s.x + 14, 196);
    const barH = parseFloat(s.value) / 100 * 82;
    ctx.fillStyle = s.col + "88";
    ctx.fillRect(s.x + 12, 298 - barH, 40, barH);
    ctx.fillStyle = "#6b4040";
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.fillText("ANOMALY SCORE", s.x + 12, 322);
  });

  return new THREE.CanvasTexture(canvas);
}

// Caution stripe — burgundy-dark stripes for Anomaly Wing
export function createCautionStripeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, 256, 256);
  const sw = 32;
  for (let i = -2; i < 12; i++) {
    ctx.fillStyle = i % 2 === 0
      ? "rgba(140, 38, 53, 0.85)"
      : "rgba(36, 20, 23, 0.9)";
    ctx.save();
    ctx.translate(i * sw - 128, 0);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(0, -512, sw, 1024);
    ctx.restore();
  }
  return new THREE.CanvasTexture(canvas);
}

// Company banner / reception sign
export function createReceptionBannerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  // Cream banner
  ctx.fillStyle = "#f2e8dc";
  ctx.fillRect(0, 0, 1024, 256);

  // Burgundy stripe top and bottom
  ctx.fillStyle = "#6b1f2a";
  ctx.fillRect(0, 0, 1024, 14);
  ctx.fillRect(0, 242, 1024, 14);

  // Gold inner stripe
  ctx.fillStyle = "#c9a66b";
  ctx.fillRect(0, 14, 1024, 4);
  ctx.fillRect(0, 238, 1024, 4);

  ctx.font = "bold 68px 'Inter', sans-serif";
  ctx.fillStyle = "#241417";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT CORP", 512, 120);

  ctx.font = "24px 'Inter', sans-serif";
  ctx.fillStyle = "#6b1f2a";
  ctx.fillText("Corporate Research Tower  ·  Authorized Personnel Only", 512, 168);

  return new THREE.CanvasTexture(canvas);
}

// Security door terminal screen texture
export function createDoorTerminalScreenTexture(doorType = "classification", statusColor = "#6B1F2A") {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Deep dark console background
  ctx.fillStyle = "#120709";
  ctx.fillRect(0, 0, 1024, 512);

  // Outer border with accent
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 500);

  // Header bar
  ctx.fillStyle = "#1d0c10";
  ctx.fillRect(8, 8, 1008, 48);
  ctx.strokeStyle = "rgba(201, 166, 107, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 1008, 48);

  // Window dots
  const dotColors = ["#ff3d81", "#16c784", "#e63946"];
  dotColors.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(30 + idx * 20, 32, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // Terminal title
  ctx.font = "bold 16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#c9a66b";
  ctx.fillText(`SECURITY TERMINAL // SECTOR ${doorType.toUpperCase()}`, 110, 38);

  ctx.font = "13px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#c98f8a";
  ctx.textAlign = "right";
  ctx.fillText("READY FOR AUTHENTICATION [E]", 990, 38);
  ctx.textAlign = "left";

  // Left sub-panel: Status & Specs
  ctx.fillStyle = "rgba(36, 20, 23, 0.7)";
  ctx.fillRect(24, 76, 320, 410);
  ctx.strokeStyle = "rgba(107, 31, 42, 0.6)";
  ctx.strokeRect(24, 76, 320, 410);

  ctx.fillStyle = "#c98f8a";
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.fillText("BULKHEAD CONTROLLER", 40, 108);

  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#a88a82";
  ctx.fillText("PROTOCOL: ML Verification", 40, 142);
  ctx.fillText(`TARGET: ${doorType.toUpperCase()}`, 40, 168);
  ctx.fillText("STATUS: STANDBY", 40, 194);
  ctx.fillText("DIFFICULTY: SEQUENTIAL", 40, 220);
  ctx.fillText("ENCRYPTION: 4096-BIT", 40, 246);

  // Steps indicator preview
  ctx.fillStyle = "#c9a66b";
  ctx.fillText("TIERED VERIFICATION:", 40, 290);
  ctx.fillStyle = "#7a9471";
  ctx.fillText("▶ 1. Data Sanitization", 52, 318);
  ctx.fillStyle = "#8a7572";
  ctx.fillText("🔒 2. Feature Engineering", 52, 344);
  ctx.fillText("🔒 3. Model Pipeline", 52, 370);

  // Large lock icon / badge
  ctx.strokeStyle = statusColor;
  ctx.lineWidth = 3;
  ctx.strokeRect(90, 400, 180, 64);
  ctx.fillStyle = "rgba(107, 31, 42, 0.35)";
  ctx.fillRect(90, 400, 180, 64);
  ctx.fillStyle = "#f2e8dc";
  ctx.font = "bold 13px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("ACCESS RESTRICTED", 180, 438);
  ctx.textAlign = "left";

  // Right main panel: Code IDE snippet
  ctx.fillStyle = "#0c0507";
  ctx.fillRect(364, 76, 636, 410);
  ctx.strokeStyle = "rgba(201, 143, 138, 0.3)";
  ctx.strokeRect(364, 76, 636, 410);

  // Code line numbers bar
  ctx.fillStyle = "#150a0d";
  ctx.fillRect(364, 76, 46, 410);

  const codeSnippets = [
    { no: "01", text: "# BlackVault Security Subroutine", color: "#6b4040" },
    { no: "02", text: "import numpy as np, pandas as pd", color: "#e8a0a0" },
    { no: "03", text: "from sklearn.model_selection import split", color: "#c98f8a" },
    { no: "04", text: "", color: "#fff" },
    { no: "05", text: "# Step 1: Clean duplicates & missing values", color: "#6b4040" },
    { no: "06", text: "def clean_data(df):", color: "#c9a66b" },
    { no: "07", text: "    df = df.drop_duplicates()", color: "#f2e8dc" },
    { no: "08", text: "    return df.fillna(df.median())", color: "#7a9471" },
    { no: "09", text: "", color: "#fff" },
    { no: "10", text: "# Step 2: Scale and encode features", color: "#6b4040" },
    { no: "11", text: "def preprocess(X):", color: "#c9a66b" },
    { no: "12", text: "    return StandardScaler().fit_transform(X)", color: "#f2e8dc" },
    { no: "13", text: "", color: "#fff" },
    { no: "14", text: "# Step 3: Train model to threshold", color: "#6b4040" },
    { no: "15", text: "def predict(train_df, test_df, target):", color: "#c9a66b" },
    { no: "16", text: "    # Execute verification...", color: "#c98f8a" },
  ];

  ctx.font = "13px 'JetBrains Mono', monospace";
  codeSnippets.forEach((line, idx) => {
    const y = 104 + idx * 24;
    ctx.fillStyle = "#5c333a";
    ctx.fillText(line.no, 376, y);
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, 426, y);
  });

  return new THREE.CanvasTexture(canvas);
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL ROOM & DATA CENTER TEXTURES (Matching Reference Image)
// ─────────────────────────────────────────────────────────────────────────────

/** Large illuminated BLACKVAULT backlit billboard logo with shield emblem */
export function createBacklitLogoTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Sleek bright brushed titanium and satin steel base
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#2c4860");
  grad.addColorStop(0.5, "#3b5d7a");
  grad.addColorStop(1, "#243c52");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 512);

  // Metallic horizontal grain
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  for (let y = 0; y < 512; y += 3) {
    ctx.fillRect(0, y, 2048, 1);
  }

  // Intense outer perimeter backlight glow box (cool white & electric cyan)
  ctx.shadowColor = "#2fd1ff";
  ctx.shadowBlur = 32;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 12;
  ctx.strokeRect(18, 18, 2012, 476);
  ctx.shadowBlur = 0;

  // Secondary inner cyan rim
  ctx.strokeStyle = "#2fd1ff";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, 1988, 452);

  // --- Shield Icon on Left (Center around X = 360, Y = 256) ---
  const cx = 350, cy = 256;
  ctx.save();
  ctx.shadowColor = "#2fd1ff";
  ctx.shadowBlur = 26;

  // Outer Shield Silhouette
  ctx.beginPath();
  ctx.moveTo(cx, cy - 130);
  ctx.lineTo(cx + 85, cy - 90);
  ctx.lineTo(cx + 75, cy + 45);
  ctx.lineTo(cx, cy + 130);
  ctx.lineTo(cx - 75, cy + 45);
  ctx.lineTo(cx - 85, cy - 90);
  ctx.closePath();
  ctx.fillStyle = "#345570";
  ctx.fill();
  ctx.strokeStyle = "#2fd1ff";
  ctx.lineWidth = 9;
  ctx.stroke();

  // Inner Shield Outline
  ctx.beginPath();
  ctx.moveTo(cx, cy - 100);
  ctx.lineTo(cx + 60, cy - 70);
  ctx.lineTo(cx + 52, cy + 30);
  ctx.lineTo(cx, cy + 98);
  ctx.lineTo(cx - 52, cy + 30);
  ctx.lineTo(cx - 60, cy - 70);
  ctx.closePath();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Glowing Concentric Lens Target Core
  ctx.beginPath();
  ctx.arc(cx, cy - 6, 36, 0, Math.PI * 2);
  ctx.strokeStyle = "#2fd1ff";
  ctx.lineWidth = 7;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy - 6, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy - 6, 9, 0, Math.PI * 2);
  ctx.fillStyle = "#22f0a8";
  ctx.fill();

  ctx.restore();

  // --- Illuminated "BLACKVAULT" Wordmark Typography ---
  ctx.save();
  ctx.font = "900 132px 'Montserrat', 'Inter', 'Segoe UI', sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Double-pass neon drop glow
  ctx.shadowColor = "#2fd1ff";
  ctx.shadowBlur = 32;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("BLACKVAULT", 480, 256);

  ctx.shadowColor = "#22f0a8";
  ctx.shadowBlur = 14;
  ctx.fillText("BLACKVAULT", 480, 256);
  ctx.shadowBlur = 0;

  // Tech sub-header
  ctx.font = "bold 22px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#2fd1ff";
  ctx.fillText("ENTERPRISE SECURITY OPERATIONS // NEURAL COMPUTE NEXUS", 490, 350);

  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

/** Glossy dark floor with glowing holographic blueprint outlines and labeled zones */
export function createHolographicFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");

  // High-gloss dark charcoal tile base
  ctx.fillStyle = "#121419";
  ctx.fillRect(0, 0, 2048, 2048);

  // Floor grid tiles (128x128 tile grid)
  ctx.strokeStyle = "rgba(42, 50, 68, 0.45)";
  ctx.lineWidth = 2;
  for (let x = 0; x <= 2048; x += 128) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 2048); ctx.stroke();
  }
  for (let y = 0; y <= 2048; y += 128) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(2048, y); ctx.stroke();
  }

  // Glowing cyan perimeter floor tracks
  ctx.shadowColor = "#2fd1ff";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(47, 209, 255, 0.85)";
  ctx.lineWidth = 4;

  // Central Aisle Corridor Tracks
  ctx.strokeRect(380, 180, 1288, 1688);
  ctx.strokeRect(400, 200, 1248, 1648);

  // Perforated air-flow floor ventilation tiles
  for (let x = 460; x < 1580; x += 280) {
    for (let y = 280; y < 1780; y += 380) {
      ctx.fillStyle = "#0b0d12";
      ctx.fillRect(x, y, 220, 290);
      ctx.strokeStyle = "#2fd1ff";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 220, 290);
      // Perforation grid dots
      ctx.fillStyle = "rgba(47, 209, 255, 0.65)";
      for (let dotX = x + 18; dotX < x + 204; dotX += 22) {
        for (let dotY = y + 18; dotY < y + 274; dotY += 22) {
          ctx.fillRect(dotX, dotY, 4, 4);
        }
      }
    }
  }

  // --- Labeled Holographic Blueprint Zones ---
  // Zone 1: Green "CORE COMPUTE"
  ctx.shadowColor = "#22f0a8";
  ctx.strokeStyle = "#22f0a8";
  ctx.lineWidth = 3.5;
  ctx.strokeRect(100, 360, 260, 1280);
  ctx.fillStyle = "rgba(34, 240, 168, 0.08)";
  ctx.fillRect(100, 360, 260, 1280);

  ctx.font = "bold 26px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#22f0a8";
  ctx.save();
  ctx.translate(145, 1000);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("CORE COMPUTE // CLUSTER ARRAY 01-16", 0, 0);
  ctx.restore();

  // Zone 2: Blue "SECURE STORAGE"
  ctx.shadowColor = "#2fd1ff";
  ctx.strokeStyle = "#2fd1ff";
  ctx.strokeRect(1688, 360, 260, 1280);
  ctx.fillStyle = "rgba(47, 209, 255, 0.08)";
  ctx.fillRect(1688, 360, 260, 1280);

  ctx.fillStyle = "#2fd1ff";
  ctx.save();
  ctx.translate(1840, 1000);
  ctx.rotate(Math.PI / 2);
  ctx.fillText("SECURE STORAGE // TIER-4 VAULT VOLUMES", 0, 0);
  ctx.restore();

  // Zone 3: Pink "NETWORK HUB" in front of command console
  ctx.shadowColor = "#ff2e9a";
  ctx.strokeStyle = "#ff2e9a";
  ctx.strokeRect(580, 1280, 888, 540);
  ctx.fillStyle = "rgba(255, 46, 154, 0.07)";
  ctx.fillRect(580, 1280, 888, 540);

  ctx.fillStyle = "#ff2e9a";
  ctx.font = "bold 26px 'JetBrains Mono', monospace";
  ctx.fillText("[ NETWORK HUB // OPTICAL ROUTING ]", 620, 1340);
  ctx.fillText("FUNCTION FLOOR AREA // SEC-01", 620, 1380);

  // Coordinate ticks & tech specs
  ctx.shadowBlur = 0;
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
  ctx.fillText("+04.22.8", 620, 1770);
  ctx.fillText("SYS_CLK: 100Gbps // SYNCHRONIZED", 1060, 1770);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** Detailed server rack front face texture with blinking multi-color LEDs and blade chassis */
export function createServerRackFaceTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Deep matte rack chassis
  ctx.fillStyle = "#0c0d12";
  ctx.fillRect(0, 0, 512, 1024);

  // Side upright mounting rails
  ctx.fillStyle = "#181b24";
  ctx.fillRect(0, 0, 26, 1024);
  ctx.fillRect(486, 0, 26, 1024);

  // 18 Server blade unit slots
  const slotH = 52;
  for (let i = 0; i < 18; i++) {
    const y = 28 + i * slotH;
    // Slot chassis
    ctx.fillStyle = i % 2 === 0 ? "#11131a" : "#141720";
    ctx.fillRect(34, y, 444, slotH - 4);
    ctx.strokeStyle = "#202533";
    ctx.lineWidth = 1;
    ctx.strokeRect(34, y, 444, slotH - 4);

    // Hard drive bays (4 per blade)
    for (let d = 0; d < 4; d++) {
      const dx = 46 + d * 56;
      ctx.fillStyle = "#090a0e";
      ctx.fillRect(dx, y + 8, 48, slotH - 20);
      ctx.strokeStyle = "#262c3d";
      ctx.strokeRect(dx, y + 8, 48, slotH - 20);
      // Drive activity LED
      ctx.fillStyle = Math.random() > 0.35 ? "#22f0a8" : "#2fd1ff";
      ctx.fillRect(dx + 38, y + 12, 4, 4);
    }

    // Dense server status indicator LEDs on right side
    const ledX = 285;
    for (let c = 0; c < 8; c++) {
      const lx = ledX + c * 22;
      const rand = Math.random();
      let col = "#22f0a8"; // emerald green
      if (rand < 0.28) col = "#2fd1ff"; // electric blue
      else if (rand < 0.42) col = "#ff2e9a"; // hot pink
      else if (rand < 0.52) col = "#ff9900"; // amber
      else if (rand < 0.62) col = "#0a1018"; // off

      ctx.shadowColor = col;
      ctx.shadowBlur = col !== "#0a1018" ? 6 : 0;
      ctx.fillStyle = col;
      ctx.fillRect(lx, y + 14, 8, 6);
      ctx.fillRect(lx, y + 26, 8, 6);
    }
    ctx.shadowBlur = 0;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** 4 distinct high-tech data-viz screens for command console workstations */
export function createControlConsoleScreenTextures() {
  const textures = [];

  // Screen 1: 3D Wireframe Topology & Cluster Graph (Cyan/Emerald)
  {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0c12"; ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "#2fd1ff"; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 1000, 488);
    ctx.fillStyle = "#2fd1ff"; ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText("SYSTEM TOPOLOGY // ISOMETRIC COMPUTE GRAPH", 32, 48);

    // Isometric wireframe nodes
    ctx.strokeStyle = "rgba(47, 209, 255, 0.7)"; ctx.lineWidth = 1.5;
    const nodes = [
      { x: 300, y: 220 }, { x: 520, y: 150 }, { x: 740, y: 220 },
      { x: 400, y: 360 }, { x: 620, y: 360 }, { x: 520, y: 280 }
    ];
    nodes.forEach(n1 => {
      nodes.forEach(n2 => {
        if (Math.hypot(n1.x - n2.x, n1.y - n2.y) < 280) {
          ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y); ctx.stroke();
        }
      });
    });
    nodes.forEach((n, i) => {
      ctx.fillStyle = i % 2 === 0 ? "#22f0a8" : "#2fd1ff";
      ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2); ctx.fill();
    });
    ctx.shadowBlur = 0;
    textures.push(new THREE.CanvasTexture(canvas));
  }

  // Screen 2: World Threat Heatmap & Spatial Matrix (Pink/Amber/Cyan)
  {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0c0a12"; ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "#ff2e9a"; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 1000, 488);
    ctx.fillStyle = "#ff2e9a"; ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText("GLOBAL INTRUSION RADAR // THREAT HEATMAP", 32, 48);

    // Heatmap concentric gradient rings
    const hotspots = [
      { x: 340, y: 240, r: 120, col: "rgba(255, 46, 154, " },
      { x: 680, y: 200, r: 100, col: "rgba(34, 240, 168, " },
      { x: 520, y: 320, r: 140, col: "rgba(47, 209, 255, " }
    ];
    hotspots.forEach(h => {
      const grad = ctx.createRadialGradient(h.x, h.y, 5, h.x, h.y, h.r);
      grad.addColorStop(0, h.col + "0.85)");
      grad.addColorStop(0.5, h.col + "0.35)");
      grad.addColorStop(1, h.col + "0.0)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
    });

    // Radar scan lines
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    for (let r = 50; r < 350; r += 50) {
      ctx.beginPath(); ctx.arc(520, 260, r, 0, Math.PI * 2); ctx.stroke();
    }
    textures.push(new THREE.CanvasTexture(canvas));
  }

  // Screen 3: Telemetry, Training Loss & Accuracy Graphs (Emerald/White)
  {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#090d12"; ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "#22f0a8"; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 1000, 488);
    ctx.fillStyle = "#22f0a8"; ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText("MODEL TELEMETRY // REAL-TIME F1 & LOSS CONVERGENCE", 32, 48);

    // Coordinate grid
    ctx.strokeStyle = "rgba(34, 240, 168, 0.18)";
    for (let x = 60; x < 960; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 80); ctx.lineTo(x, 460); ctx.stroke();
    }
    for (let y = 80; y < 460; y += 50) {
      ctx.beginPath(); ctx.moveTo(60, y); ctx.lineTo(960, y); ctx.stroke();
    }

    // Loss curve 1 (Green)
    ctx.strokeStyle = "#22f0a8"; ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(60, 410);
    ctx.bezierCurveTo(280, 390, 520, 180, 960, 140);
    ctx.stroke();

    // Loss curve 2 (Pink)
    ctx.strokeStyle = "#ff2e9a"; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.bezierCurveTo(320, 190, 600, 380, 960, 420);
    ctx.stroke();

    ctx.font = "16px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("ACCURACY: 98.6%  |  VAL_LOSS: 0.0142  |  EPOCH: 500/500", 60, 478);
    textures.push(new THREE.CanvasTexture(canvas));
  }

  // Screen 4: Real-time Optical Packet Waterfall & Radar (Cyan/Blue)
  {
    const canvas = document.createElement("canvas");
    canvas.width = 1024; canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0c14"; ctx.fillRect(0, 0, 1024, 512);

    ctx.strokeStyle = "#2fd1ff"; ctx.lineWidth = 2; ctx.strokeRect(12, 12, 1000, 488);
    ctx.fillStyle = "#2fd1ff"; ctx.font = "bold 20px 'JetBrains Mono', monospace";
    ctx.fillText("NETWORK THROUGHPUT // PACKET ROUTING MATRIX", 32, 48);

    // Spectrum bars
    for (let b = 0; b < 44; b++) {
      const bx = 60 + b * 20;
      const h = 40 + Math.random() * 280;
      ctx.fillStyle = b % 3 === 0 ? "#ff2e9a" : (b % 2 === 0 ? "#2fd1ff" : "#22f0a8");
      ctx.fillRect(bx, 440 - h, 14, h);
    }
    textures.push(new THREE.CanvasTexture(canvas));
  }

  return textures;
}

/** Clean architectural frosted & smoked glass partition texture with subtle frosted grid */
export function createHolographicGlassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Clean smoked glass tint
  ctx.clearRect(0, 0, 1024, 1024);
  ctx.fillStyle = "rgba(25, 32, 42, 0.42)";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle frosted privacy grid band in middle
  ctx.fillStyle = "rgba(220, 230, 245, 0.08)";
  ctx.fillRect(32, 380, 960, 260);

  // Fine frosted horizontal lines
  ctx.strokeStyle = "rgba(220, 230, 245, 0.18)";
  ctx.lineWidth = 1.0;
  for (let y = 390; y <= 630; y += 20) {
    ctx.beginPath();
    ctx.moveTo(32, y);
    ctx.lineTo(992, y);
    ctx.stroke();
  }

  // Subtle header text in cool white/silver
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.fillStyle = "rgba(220, 235, 250, 0.55)";
  ctx.fillText("ARCHITECTURAL GLAZING // ZONE-01 PARTITION", 48, 64);

  // Thin outer glass bevel line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(8, 8, 1008, 1008);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** Geometric 3D acoustic baffle wall pattern with warm silver-slate panels & pink back-glow */
export function createAcousticWallPanelTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm architectural slate-silver base
  ctx.fillStyle = "#525a66";
  ctx.fillRect(0, 0, 1024, 1024);

  // Diamond geometric grid with warm walnut-bronze and metallic highlights
  const step = 128;
  for (let x = 0; x < 1024; x += step) {
    for (let y = 0; y < 1024; y += step) {
      ctx.save();
      ctx.translate(x + step / 2, y + step / 2);
      // Outer bevel facet
      ctx.fillStyle = (x + y) % (step * 2) === 0 ? "#6c7684" : "#464d57";
      ctx.beginPath();
      ctx.moveTo(0, -step / 2 + 8);
      ctx.lineTo(step / 2 - 8, 0);
      ctx.lineTo(0, step / 2 - 8);
      ctx.lineTo(-step / 2 + 8, 0);
      ctx.closePath();
      ctx.fill();

      // Metallic top-left highlight
      ctx.strokeStyle = "rgba(230, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-step / 2 + 8, 0);
      ctx.lineTo(0, -step / 2 + 8);
      ctx.lineTo(step / 2 - 8, 0);
      ctx.stroke();

      // Warm bronze bottom-right shadow
      ctx.strokeStyle = "rgba(60, 42, 30, 0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(step / 2 - 8, 0);
      ctx.lineTo(0, step / 2 - 8);
      ctx.lineTo(-step / 2 + 8, 0);
      ctx.stroke();

      // Neon magenta glowing border seam
      ctx.shadowColor = "#ff2e9a";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = "rgba(255, 46, 154, 0.70)";
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// ── Wall surface noise texture (Brushed Warm Silver & Steel) ────────────────
export function createWallNoiseTexture() {
  const W = 512, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Base: rich brushed architectural silver-champagne (#8a8f98)
  ctx.fillStyle = "#8a8f98";
  ctx.fillRect(0, 0, W, H);

  // Brushed horizontal metal grain
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 22;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise * 1.05)); // subtle warm tint
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.95));
  }
  ctx.putImageData(imgData, 0, 0);

  // Horizontal architectural panel seams with bevel highlight/shadow
  for (let y = 128; y < H; y += 128) {
    // Dark groove
    ctx.strokeStyle = "rgba(35, 30, 25, 0.55)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(W, y);
    ctx.stroke();

    // Top edge silver highlight
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, y + 2); ctx.lineTo(W, y + 2);
    ctx.stroke();
  }

  // Vertical panel joints
  for (let x = 256; x < W; x += 256) {
    ctx.strokeStyle = "rgba(35, 30, 25, 0.45)";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, H);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 2, 0); ctx.lineTo(x + 2, H);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  return texture;
}

// ── Rich Walnut Timber Wood Slats Texture ────────────────────────────────────
export function createWalnutWoodSlatTexture() {
  const W = 512, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Deep shadow reveal backing
  ctx.fillStyle = "#1e140d";
  ctx.fillRect(0, 0, W, H);

  const slatW = 24;
  const gap = 8;
  const total = slatW + gap;

  for (let x = 4; x < W; x += total) {
    // Walnut wood gradient on each slat
    const grad = ctx.createLinearGradient(x, 0, x + slatW, 0);
    grad.addColorStop(0, "#8a5836");
    grad.addColorStop(0.2, "#a06842");
    grad.addColorStop(0.7, "#885635");
    grad.addColorStop(1, "#683e22");
    ctx.fillStyle = grad;
    ctx.fillRect(x, 0, slatW, H);

    // Subtle wood grain lines
    ctx.strokeStyle = "rgba(50, 25, 10, 0.25)";
    ctx.lineWidth = 1.0;
    for (let gy = 0; gy < H; gy += 16 + Math.random() * 20) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.bezierCurveTo(x + 8, gy + (Math.random() - 0.5) * 8, x + 16, gy + (Math.random() - 0.5) * 8, x + slatW, gy);
      ctx.stroke();
    }

    // Left edge light highlight
    ctx.strokeStyle = "rgba(240, 200, 160, 0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x + 1, 0); ctx.lineTo(x + 1, H);
    ctx.stroke();

    // Right edge bevel shadow
    ctx.strokeStyle = "rgba(20, 10, 5, 0.5)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + slatW - 1, 0); ctx.lineTo(x + slatW - 1, H);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 2);
  return texture;
}

// ── Brushed Silver Wall Cladding Texture ─────────────────────────────────────
export function createBrushedSilverWallTexture() {
  const W = 512, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Crisp metallic silver base
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#a8b2bc");
  grad.addColorStop(0.5, "#9ca6b0");
  grad.addColorStop(1, "#b2bcc6");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Fine metallic brush lines
  const imgData = ctx.getImageData(0, 0, W, H);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 1.05));
  }
  ctx.putImageData(imgData, 0, 0);

  // Anodized panel segmentation
  ctx.strokeStyle = "rgba(40, 50, 60, 0.4)";
  ctx.lineWidth = 2.0;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1.0;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  return texture;
}

// ── Modern Abstract Wall Art Canvas ─────────────────────────────────────────
export function createModernArtCanvasTexture(themeIndex = 0) {
  const W = 512, H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Minimalist warm gallery background
  ctx.fillStyle = "#e8e2d8";
  ctx.fillRect(0, 0, W, H);

  // Geometric abstract forms in walnut brown, metallic silver, terracotta, brass
  if (themeIndex === 0) {
    // Large walnut brown circle
    ctx.fillStyle = "#7a482b";
    ctx.beginPath(); ctx.arc(220, 260, 150, 0, Math.PI * 2); ctx.fill();

    // Brushed silver arch
    ctx.fillStyle = "#96a2b0";
    ctx.beginPath();
    ctx.arc(320, 220, 110, Math.PI, Math.PI * 2);
    ctx.lineTo(430, 420);
    ctx.lineTo(210, 420);
    ctx.closePath();
    ctx.fill();

    // Warm brass accent line
    ctx.strokeStyle = "#d4af37";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(80, 120); ctx.lineTo(440, 120);
    ctx.stroke();

    // Terracotta crescent
    ctx.fillStyle = "#b85c38";
    ctx.beginPath(); ctx.arc(160, 360, 60, 0, Math.PI * 2); ctx.fill();
  } else {
    // Modern cybernetic Bauhaus
    ctx.fillStyle = "#343c48";
    ctx.fillRect(80, 80, 200, 360);

    ctx.fillStyle = "#9a6642";
    ctx.beginPath(); ctx.arc(340, 220, 100, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#c8d0da";
    ctx.fillRect(240, 300, 200, 140);

    ctx.strokeStyle = "#2fd1ff";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(40, 440); ctx.lineTo(480, 440); ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// ── Architectural Directory / Totem Display Texture ─────────────────────────
export function createWallDirectoryTexture() {
  const W = 512, H = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Brushed titanium & dark glass background
  ctx.fillStyle = "#1e2229";
  ctx.fillRect(0, 0, W, H);

  // Metallic header bar
  const hGrad = ctx.createLinearGradient(0, 0, W, 0);
  hGrad.addColorStop(0, "#7c5438");
  hGrad.addColorStop(0.5, "#a87850");
  hGrad.addColorStop(1, "#7c5438");
  ctx.fillStyle = hGrad;
  ctx.fillRect(0, 0, W, 100);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px 'Inter', sans-serif";
  ctx.fillText("BLACKVAULT TOWER", 40, 58);
  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#d8e4f0";
  ctx.fillText("CORPORATE RESEARCH & ML HUB", 40, 85);

  // Floor Directory list
  const floors = [
    { num: "5F", name: "MYSTERY CORE // QUANTUM VAULT", col: "#22f0a8" },
    { num: "4F", name: "ANOMALY ISOLATION WING",       col: "#ff2e9a" },
    { num: "3F", name: "CLUSTERING & NEURAL LAB",       col: "#2fd1ff" },
    { num: "2F", name: "REGRESSION & COMPUTE FARM",     col: "#22f0a8" },
    { num: "1F", name: "CLASSIFICATION & DATA LAB",     col: "#ff2e9a" },
    { num: "G",  name: "SECURITY OPS // MAIN LOBBY",    col: "#2fd1ff", active: true },
  ];

  floors.forEach((f, idx) => {
    const y = 140 + idx * 130;
    ctx.fillStyle = f.active ? "rgba(47, 209, 255, 0.15)" : "rgba(255, 255, 255, 0.04)";
    ctx.fillRect(24, y, W - 48, 110);
    ctx.strokeStyle = f.active ? f.col : "rgba(255, 255, 255, 0.12)";
    ctx.lineWidth = f.active ? 2.5 : 1;
    ctx.strokeRect(24, y, W - 48, 110);

    // Number badge
    ctx.fillStyle = f.col;
    ctx.font = "bold 32px 'Inter', sans-serif";
    ctx.fillText(f.num, 48, y + 65);

    // Floor Name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px 'Inter', sans-serif";
    ctx.fillText(f.name, 115, y + 52);

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "14px 'JetBrains Mono', monospace";
    ctx.fillText(f.active ? "CURRENT LOCATION // STATUS: SECURE" : "ACCESS RESTRICTED // CLEARANCE REQ.", 115, y + 80);
  });

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

// Architectural ceiling texture with subtle graphite depth falloff & acoustic panel seams
export function createArchitecturalCeilingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Base dark graphite #2A2E36
  ctx.fillStyle = "#2a2e36";
  ctx.fillRect(0, 0, 1024, 1024);

  // Modular ceiling acoustic tiles / structural bays (4x4 grid of 256x256 tiles)
  const tileSize = 256;
  for (let x = 0; x < 1024; x += tileSize) {
    for (let y = 0; y < 1024; y += tileSize) {
      // Subtle depth gradient within each bay:
      // Darker at highest center recess (#20232a), lighter towards beam mounting edges (#383d48)
      const grad = ctx.createRadialGradient(
        x + tileSize / 2, y + tileSize / 2, 8,
        x + tileSize / 2, y + tileSize / 2, tileSize * 0.72
      );
      grad.addColorStop(0, "#20232a");   // Highest recessed point (darkest)
      grad.addColorStop(0.55, "#2a2e36"); // Base graphite plane
      grad.addColorStop(1, "#383d48");   // Slightly lighter near structural beam/light mounts

      ctx.fillStyle = grad;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

      // Fine structural beveled panel border (#181a20)
      ctx.strokeStyle = "#181a20";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1, y + 1, tileSize - 2, tileSize - 2);

      // Inner micro-bevel highlight on bottom-right edges
      ctx.strokeStyle = "rgba(78, 88, 104, 0.35)";
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(x + tileSize - 3, y + 3);
      ctx.lineTo(x + tileSize - 3, y + tileSize - 3);
      ctx.lineTo(x + 3, y + tileSize - 3);
      ctx.stroke();
    }
  }

  // Fine tactile surface noise / micro-stippling for realistic PBR response
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 1.05));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 1.15));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 32);
  return texture;
}

