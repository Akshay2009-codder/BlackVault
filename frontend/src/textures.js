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
    { label: "5F",  name: "The Vault",         sub: "Mystery Level — Restricted",  col: "#c9a66b" },
    { label: "4F",  name: "Anomaly Wing",       sub: "Security Operations",          col: "#8c2635" },
    { label: "3F",  name: "Clustering Hub",     sub: "Executive Boardroom",          col: "#c9a66b" },
    { label: "2F",  name: "Regression Lab",     sub: "Data & Server Floor",          col: "#c98f8a" },
    { label: "1F",  name: "Classification Lab", sub: "Research & Development",       col: "#6b1f2a" },
    { label: "G",   name: "Reception & Lobby",  sub: "Main Entrance — Visitor ID",   col: "#c9a66b" },
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
    { cx: 210, cy: 210, color: "#c98f8a" },
    { cx: 510, cy: 170, color: "#6b1f2a" },
    { cx: 360, cy: 350, color: "#c9a66b" },
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
    { x:  16, label: "SECTOR A", value: "97.4%", status: "BREACH",  col: "#8c2635" },
    { x: 270, label: "SECTOR B", value: "12.1%", status: "NOMINAL", col: "#7a9471" },
    { x: 524, label: "SECTOR C", value: "63.5%", status: "WARNING", col: "#c9a66b" },
    { x: 778, label: "SECTOR D", value: "97.1%", status: "BREACH",  col: "#8c2635" },
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
  const dotColors = ["#c0504a", "#c9a66b", "#7a9471"];
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

