// Procedural high-detail canvas textures for the BlackVault clean neutral research facility.
// Light Architecture Palette: Soft White (#F2F4F7), Warm Grey (#E8ECF1), Light Chrome (#C8D0DA)
// Accents on dark-background screens/signs: Electric Blue (#2F80ED), Violet (#8B5CF6), Amber (#FF9F43).

import * as THREE from "three";

export function createFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Warm grey neutral tile base (#E8ECF1)
  ctx.fillStyle = "#e8ecf1";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle noise for surface variation
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 6;
    data[i]     = Math.max(0, Math.min(255, data[i]     + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Tile grid lines in light chrome (#C4CAD4)
  ctx.strokeStyle = "#c4cad4";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let x = 0; x <= 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  for (let y = 0; y <= 1024; y += 256) {
    ctx.moveTo(0, y); ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // Faint inner tile subdivision lines
  ctx.strokeStyle = "#d4d9e2";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 128; x < 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  for (let y = 128; y < 1024; y += 256) {
    ctx.moveTo(0, y); ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // Very subtle blue circuit seam inlay (electric blue accent, barely visible)
  ctx.strokeStyle = "rgba(47, 128, 237, 0.12)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = 2; x <= 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  ctx.stroke();

  // Cross intersection dots — very subtle blue
  ctx.fillStyle = "rgba(47, 128, 237, 0.22)";
  for (let x = 0; x <= 1024; x += 256) {
    for (let y = 0; y <= 1024; y += 256) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
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

  // Deep twilight cyber skyline gradient
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#030712");
  grad.addColorStop(0.4, "#0f172a");
  grad.addColorStop(0.75, "#1e1b4b");
  grad.addColorStop(1, "#312e81");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Atmospheric neon aura / nebula
  for (let i = 0; i < 16; i++) {
    const cx = Math.random() * 2048;
    const cy = 150 + Math.random() * 300;
    const cr = 100 + Math.random() * 150;
    const isCyan = Math.random() > 0.5;
    ctx.fillStyle = isCyan ? "rgba(56, 189, 248, 0.08)" : "rgba(168, 85, 247, 0.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Futuristic megastructure towers
  const layers = [
    { color: "#1e293b", minH: 340, maxH: 680, windowAlpha: 0.85, widthRange: [70, 140] },
    { color: "#0f172a", minH: 450, maxH: 880, windowAlpha: 0.90, widthRange: [80, 160] },
    { color: "#090d16", minH: 560, maxH: 960, windowAlpha: 0.95, widthRange: [90, 190] },
  ];

  layers.forEach((layer) => {
    let currX = -50;
    while (currX < 2100) {
      const bWidth = layer.widthRange[0] + Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
      const bHeight = layer.minH + Math.random() * (layer.maxH - layer.minH);
      const bY = 1024 - bHeight;

      ctx.fillStyle = layer.color;
      ctx.fillRect(currX, bY, bWidth, bHeight);

      // Rooftop communication spire / holographic beacon
      if (Math.random() > 0.35) {
        ctx.fillRect(currX + bWidth * 0.45, bY - 45, bWidth * 0.1, 45);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(currX + bWidth * 0.47, bY - 50, 4, 6);
        ctx.fillStyle = layer.color;
      }

      // Glowing cyber window grids (Cyan, Violet, Amber)
      const rows = Math.floor(bHeight / 14);
      const cols = Math.floor(bWidth / 10);
      for (let r = 2; r < rows - 2; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (Math.random() > 0.4) {
            const wx = currX + c * 10 + 2;
            const wy = bY + r * 14 + 2;
            const rand = Math.random();
            let wColor;
            if (rand > 0.6) {
              wColor = `rgba(56, 189, 248, ${layer.windowAlpha * (0.6 + Math.random() * 0.4)})`;
            } else if (rand > 0.3) {
              wColor = `rgba(168, 85, 247, ${layer.windowAlpha * (0.5 + Math.random() * 0.5)})`;
            } else {
              wColor = `rgba(245, 158, 11, ${layer.windowAlpha * (0.6 + Math.random() * 0.4)})`;
            }
            ctx.fillStyle = wColor;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      currX += bWidth + Math.random() * 16;
    }
  });

  return new THREE.CanvasTexture(canvas);
}

// Left Ultrawide Screen: Code Editor on left + 3D wireframe box preview on right
export function createLeftUltrawideScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");

  // IDE Dark Background (#090D16)
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 1280, 420);

  // File tree column (#060910)
  ctx.fillStyle = "#060910";
  ctx.fillRect(0, 0, 190, 420);
  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("ML PIPELINE EXPLORER", 16, 22);

  const files = [
    "▼ BLACKVAULT",
    "  ▶ src",
    "    • classifier_pipeline.py",
    "    • telemetry_engine.py",
    "    • neural_core.py",
    "  ▶ datasets",
    "    • security_features.csv",
    "    • anomaly_stream.json",
    "  ▶ backend",
    "    • sandbox.py",
    "    • scoring.py"
  ];
  files.forEach((f, i) => {
    ctx.fillStyle = f.includes("•") ? "#93c5fd" : "#64748b";
    ctx.fillText(f, 14, 46 + i * 18);
  });

  // Editor Tabs
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(190, 0, 550, 28);
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(190, 0, 170, 28);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("classifier_pipeline.py ×", 204, 18);

  // Syntax highlighted code lines in Vibrant Cyan, Violet & Emerald
  const codeLines = [
    { no: "1", text: "import numpy as np, pandas as pd", color: "#f472b6" },
    { no: "2", text: "from sklearn.ensemble import RandomForestClassifier", color: "#38bdf8" },
    { no: "3", text: "from sklearn.model_selection import cross_val_score", color: "#38bdf8" },
    { no: "4", text: "", color: "#fff" },
    { no: "5", text: "def evaluate_security_gate(df, target_col):", color: "#a855f7" },
    { no: "6", text: "    X = df.drop(columns=[target_col])", color: "#f8fafc" },
    { no: "7", text: "    y = df[target_col]", color: "#f8fafc" },
    { no: "8", text: "    # Fit high-accuracy classifier", color: "#64748b" },
    { no: "9", text: "    clf = RandomForestClassifier(n_estimators=100)", color: "#38bdf8" },
    { no: "10", text: "    scores = cross_val_score(clf, X, y, cv=5)", color: "#10b981" },
    { no: "11", text: "    print(f'Accuracy: {scores.mean():.4f}')", color: "#fbbf24" },
    { no: "12", text: "    if scores.mean() >= 0.85: unlock_door()", color: "#10b981" },
    { no: "13", text: "    return clf.fit(X, y)", color: "#a855f7" },
  ];

  ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
  codeLines.forEach((cl, idx) => {
    const y = 48 + idx * 17;
    ctx.fillStyle = "#475569";
    ctx.fillText(cl.no.padStart(3, " "), 200, y);
    ctx.fillStyle = cl.color;
    ctx.fillText(cl.text, 240, y);
  });

  // Terminal footer
  ctx.fillStyle = "#030712";
  ctx.fillRect(190, 360, 550, 60);
  ctx.fillStyle = "#10b981";
  ctx.fillText("✓ Connected: http://127.0.0.1:8000 (BlackVault High-Speed ML)", 206, 385);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("➜ STATUS: All 5 Security Nodes Online | Quantum Engine Ready", 206, 403);

  // Right Side: 3D Engine Preview Viewport
  ctx.fillStyle = "#0c1322";
  ctx.fillRect(740, 0, 540, 420);
  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.strokeRect(740, 0, 540, 420);

  // 3D Grid in Cyan
  ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
  for (let gx = 740; gx <= 1280; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 420); ctx.stroke();
  }
  for (let gy = 0; gy <= 420; gy += 30) {
    ctx.beginPath(); ctx.moveTo(740, gy); ctx.lineTo(1280, gy); ctx.stroke();
  }

  // 3D Wireframe Cube/Room in center in Glowing Cyan
  const cx = 1010, cy = 210;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;

  ctx.strokeRect(cx - 70, cy - 50, 140, 100);
  ctx.strokeRect(cx - 40, cy - 80, 140, 100);
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 50); ctx.lineTo(cx - 40, cy - 80);
  ctx.moveTo(cx + 70, cy - 50); ctx.lineTo(cx + 100, cy - 80);
  ctx.moveTo(cx - 70, cy + 50); ctx.lineTo(cx - 40, cy + 20);
  ctx.moveTo(cx + 70, cy + 50); ctx.lineTo(cx + 100, cy + 20);
  ctx.stroke();

  // Glow point at center in Neon Violet
  ctx.fillStyle = "#a855f7";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Viewport labels
  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("FACILITY VIEWPORT 01 [REALTIME PBR]", 755, 25);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Meshes: 42 | Shaders: PBR_GLOW | FPS: 60", 755, 400);

  return new THREE.CanvasTexture(canvas);
}

// Right Ultrawide Screen: 3D Corridor/Room Viewport
export function createRightUltrawideScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");

  // Viewport background
  ctx.fillStyle = "#080c14";
  ctx.fillRect(0, 0, 1280, 420);

  // Left & Right toolbars
  ctx.fillStyle = "#05080e";
  ctx.fillRect(0, 0, 150, 420);
  ctx.fillRect(1130, 0, 150, 420);

  ctx.font = "bold 11px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("OUTLINER", 14, 24);
  const outliner = ["▼ Facility_Root", "  • Floor_CyberGrid", "  • Wall_Titanium", "  • BlastGate_Hydraulic", "  • Emissive_Beacons", "  • Quantum_Core"];
  outliner.forEach((o, i) => {
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(o, 12, 50 + i * 20);
  });

  ctx.fillStyle = "#a855f7";
  ctx.fillText("INSPECTOR", 1144, 24);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("Pos: 0, 1.7, 0", 1144, 52);
  ctx.fillText("Rot: 0, 0, 0", 1144, 74);
  ctx.fillText("Scale: 1, 1, 1", 1144, 96);
  ctx.fillText("Mat: Cyber_Metal", 1144, 118);

  // Center: 3D Corridor rendering in deep sci-fi slate & cyan
  const vx = 150, vw = 980;
  const cx = vx + vw / 2, cy = 210;

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(vx, 0); ctx.lineTo(cx - 160, cy - 80);
  ctx.lineTo(cx - 160, cy + 80); ctx.lineTo(vx, 420);
  ctx.fill();

  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.moveTo(vx + vw, 0); ctx.lineTo(cx + 160, cy - 80);
  ctx.lineTo(cx + 160, cy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();

  ctx.fillStyle = "#0b0f19";
  ctx.beginPath();
  ctx.moveTo(vx, 420); ctx.lineTo(cx - 160, cy + 80);
  ctx.lineTo(cx + 160, cy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();

  // End door with glowing Cyan & Violet frame
  ctx.fillStyle = "#030712";
  ctx.fillRect(cx - 160, cy - 80, 320, 160);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(cx - 140, cy - 70, 280, 150);

  // Glowing laser bar
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#38bdf8";
  ctx.fillRect(cx - 130, cy - 65, 260, 8);
  ctx.shadowBlur = 0;

  // Header
  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("LEVEL EDITOR — FACILITY CORRIDOR [REALTIME PBR SHADER]", vx + 20, 30);

  return new THREE.CanvasTexture(canvas);
}

// RGB Mechanical Keyboard texture with Rainbow Chroma Backlighting
export function createKeyboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  // Keyboard body in sleek dark titanium (#0f172a)
  ctx.fillStyle = "#0a0f1d";
  ctx.fillRect(0, 0, 512, 180);

  // Key rows with vibrant RGB rainbow chroma backlighting
  const rows = 5;
  const cols = 15;
  const kw = 26;
  const kh = 24;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hue = (c / cols) * 320;
      const kx = 18 + c * 32;
      const ky = 16 + r * 30;

      // Glow under key
      ctx.fillStyle = `hsl(${hue}, 95%, 55%)`;
      ctx.fillRect(kx - 1, ky - 1, kw + 2, kh + 2);

      // Keycap
      ctx.fillStyle = "#162032";
      ctx.fillRect(kx, ky, kw, kh);

      // Keycap top highlight
      ctx.fillStyle = `hsla(${hue}, 80%, 75%, 0.45)`;
      ctx.fillRect(kx + 3, ky + 3, kw - 6, 4);
    }
  }

  return new THREE.CanvasTexture(canvas);
}

export function createWhiteboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");

  // Glassmorphic whiteboard surface (#0f172a / #1e293b)
  ctx.fillStyle = "#0c1322";
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 1012, 500);

  // Header in Electric Cyan
  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("MACHINE LEARNING RESEARCH FACILITY", 50, 55);

  ctx.font = "bold 38px 'Inter', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText("PROJECT BLACKVAULT — ARCHITECTURE", 50, 105);

  // Diagram 1: Sensors in Amber
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 150, 260, 130);
  ctx.font = "16px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText("[ 01. ML SENSORS ]", 70, 185);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("• Impute missing vals", 70, 215);
  ctx.fillText("• StandardScaler(X)", 70, 240);

  // Arrow
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(320, 215); ctx.lineTo(420, 215);
  ctx.lineTo(410, 205); ctx.moveTo(420, 215); ctx.lineTo(410, 225);
  ctx.stroke();

  // Diagram 2: Neural Core in Violet
  ctx.strokeStyle = "#a855f7";
  ctx.strokeRect(440, 150, 260, 130);
  ctx.fillStyle = "#a855f7";
  ctx.fillText("[ 02. NEURAL CORE ]", 460, 185);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("• RandomForest / SVM", 460, 215);
  ctx.fillText("• CrossVal Acc > 0.85", 460, 240);

  // Arrow 2
  ctx.strokeStyle = "#10b981";
  ctx.beginPath();
  ctx.moveTo(710, 215); ctx.lineTo(800, 215);
  ctx.lineTo(790, 205); ctx.moveTo(800, 215); ctx.lineTo(790, 225);
  ctx.stroke();

  // Unlock Box in Neon Emerald
  ctx.strokeStyle = "#10b981";
  ctx.strokeRect(820, 150, 150, 130);
  ctx.fillStyle = "#10b981";
  ctx.fillText("[ UNLOCKED ]", 835, 200);
  ctx.fillText("★ ★ ★", 855, 235);

  // Bottom notes
  ctx.font = "15px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText("SECURITY PROTOCOL: WARDEN AI actively evaluating model performance.", 50, 360);
  ctx.fillText("STATUS: 5 Main Sector Bulkheads Connected to Central Neural Hub.", 50, 395);

  return new THREE.CanvasTexture(canvas);
}

export function createLogoTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0b0f19";
  ctx.fillRect(0, 0, 1024, 300);

  // Stylized 'N' Logo mark
  ctx.lineWidth = 22;
  ctx.strokeStyle = "#2f80ed";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(70, 230);
  ctx.lineTo(70, 70);
  ctx.lineTo(170, 230);
  ctx.lineTo(170, 70);
  ctx.stroke();

  // Cyan gradient overlay
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.lineTo(170, 230);
  ctx.stroke();

  // Text
  ctx.font = "bold 64px 'Inter', sans-serif";
  ctx.fillStyle = "#f8fafc";
  ctx.fillText("BLACKVAULT", 220, 140);

  ctx.font = "34px 'Inter', sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("A D V A N C E D   M L   L A B", 225, 195);

  return new THREE.CanvasTexture(canvas);
}

export function createNeonSignTexture(text, mainColor, glowColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#060a12";
  ctx.fillRect(0, 0, 512, 180);

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 472, 140);

  ctx.font = "bold 44px 'Inter', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 30;
  ctx.fillStyle = mainColor;
  ctx.fillText(text, 256, 90);

  ctx.shadowBlur = 10;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 256, 90);

  return new THREE.CanvasTexture(canvas);
}

export function createCeilingScreenTexture(camLabel) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 340;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080d1a";
  ctx.fillRect(0, 0, 512, 340);

  ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 452, 280);
  ctx.beginPath();
  ctx.moveTo(256, 30); ctx.lineTo(256, 310);
  ctx.moveTo(30, 170); ctx.lineTo(482, 170);
  ctx.stroke();

  ctx.font = "bold 16px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#ef4444";
  ctx.fillText("● LIVE [SURVEILLANCE]", 44, 60);

  ctx.fillStyle = "#38bdf8";
  ctx.fillText(camLabel, 44, 85);

  ctx.font = "12px 'JetBrains Mono', 'Courier New', monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("FPS: 60.0 | ISO 800 | 4K HDR", 44, 280);
  ctx.fillText("STATUS: SECTOR MONITORED", 44, 300);

  return new THREE.CanvasTexture(canvas);
}

export function createHubRugTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0c1424";
  ctx.fillRect(0, 0, 1024, 1024);

  const colors = ["#38bdf8", "#a855f7", "#10b981", "#f59e0b", "#38bdf8"];
  const cx = 512, cy = 512;

  // Concentric colorful rings pop against dark floor
  for (let i = 0; i < colors.length; i++) {
    const r = 480 - i * 80;
    ctx.strokeStyle = colors[i];
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Radiating spokes toward each of the 5 doors
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2;
    ctx.strokeStyle = colors[i];
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * 500, cy + Math.sin(angle) * 500);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Center hex badge in Electric Blue
  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  const hexR = 75;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * hexR;
    const py = cy + Math.sin(a) * hexR;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 22px 'JetBrains Mono', 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("BLACKVAULT", cx, cy + 8);
  ctx.textAlign = "left";

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
