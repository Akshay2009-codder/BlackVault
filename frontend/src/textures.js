// Procedural high-detail canvas textures for realistic studio environment.

import * as THREE from "three";

export function createFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Base dark polished concrete
  ctx.fillStyle = "#161d28";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle concrete grain noise
  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 16;
    data[i] = Math.max(0, Math.min(255, data[i] + noise));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Floor slab seams
  ctx.strokeStyle = "#0b1017";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let x = 0; x <= 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  for (let y = 0; y <= 1024; y += 256) {
    ctx.moveTo(0, y); ctx.lineTo(1024, y);
  }
  ctx.stroke();

  // Subtle tile bevel specular line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let x = 2; x <= 1024; x += 256) {
    ctx.moveTo(x, 0); ctx.lineTo(x, 1024);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  return texture;
}

export function createCitySkylineTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");

  // Deep night sky gradient with atmospheric mist
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, "#04070d");
  grad.addColorStop(0.4, "#081324");
  grad.addColorStop(0.75, "#102542");
  grad.addColorStop(1, "#1e3c66");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Distant stars
  for (let i = 0; i < 200; i++) {
    const sx = Math.random() * 2048;
    const sy = Math.random() * 450;
    const r = Math.random() * 1.5;
    ctx.fillStyle = `rgba(210, 235, 255, ${Math.random() * 0.8 + 0.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw 50 realistic skyscrapers with lit windows
  const layers = [
    { color: "#060c18", minH: 350, maxH: 680, windowAlpha: 0.4, widthRange: [60, 120] },
    { color: "#0a1526", minH: 450, maxH: 880, windowAlpha: 0.7, widthRange: [70, 150] },
    { color: "#102036", minH: 550, maxH: 960, windowAlpha: 0.95, widthRange: [80, 170] },
  ];

  layers.forEach((layer) => {
    let currX = -50;
    while (currX < 2100) {
      const bWidth = layer.widthRange[0] + Math.random() * (layer.widthRange[1] - layer.widthRange[0]);
      const bHeight = layer.minH + Math.random() * (layer.maxH - layer.minH);
      const bY = 1024 - bHeight;

      ctx.fillStyle = layer.color;
      ctx.fillRect(currX, bY, bWidth, bHeight);

      // Rooftop tower / spire
      if (Math.random() > 0.4) {
        ctx.fillRect(currX + bWidth * 0.42, bY - 35, bWidth * 0.16, 35);
        ctx.strokeStyle = "#557799";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currX + bWidth * 0.5, bY - 35);
        ctx.lineTo(currX + bWidth * 0.5, bY - 80);
        ctx.stroke();

        // Red flashing beacon
        ctx.fillStyle = "#ff3333";
        ctx.beginPath();
        ctx.arc(currX + bWidth * 0.5, bY - 82, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lit office windows
      const rows = Math.floor(bHeight / 14);
      const cols = Math.floor(bWidth / 10);
      for (let r = 2; r < rows - 2; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (Math.random() > 0.42) {
            const wx = currX + c * 10 + 2;
            const wy = bY + r * 14 + 2;
            const isWarm = Math.random() > 0.35;
            const color = isWarm
              ? `rgba(255, 225, 160, ${layer.windowAlpha * (0.6 + Math.random() * 0.4)})`
              : `rgba(150, 230, 255, ${layer.windowAlpha * (0.6 + Math.random() * 0.4)})`;
            ctx.fillStyle = color;
            ctx.fillRect(wx, wy, 6, 8);
          }
        }
      }

      currX += bWidth + Math.random() * 14;
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

  // IDE Dark Background
  ctx.fillStyle = "#0e131d";
  ctx.fillRect(0, 0, 1280, 420);

  // File tree column
  ctx.fillStyle = "#090d14";
  ctx.fillRect(0, 0, 180, 420);
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = "#687d9d";
  ctx.fillText("EXPLORER", 18, 22);

  const files = [
    "▼ BLACKVAULT",
    "  ▶ src",
    "    • sceneSetup.js",
    "    • world.js",
    "    • player.js",
    "  ▶ models",
    "    • hub_room.glb",
    "    • security_door.glb",
    "  ▶ backend",
    "    • main.py",
    "    • scoring.py"
  ];
  files.forEach((f, i) => {
    ctx.fillStyle = f.includes("•") ? "#9db2cf" : "#546a87";
    ctx.fillText(f, 14, 46 + i * 18);
  });

  // Editor Tabs
  ctx.fillStyle = "#151c28";
  ctx.fillRect(180, 0, 560, 28);
  ctx.fillStyle = "#1c2536";
  ctx.fillRect(180, 0, 160, 28);
  ctx.fillStyle = "#70b8ff";
  ctx.fillText("pipeline.js  ×", 196, 18);

  // Syntax highlighted code lines
  const codeLines = [
    { no: "1", text: "import * as THREE from 'three';", color: "#e87a90" },
    { no: "2", text: "import { createSecurityGrid } from './world.js';", color: "#c678dd" },
    { no: "3", text: "", color: "#fff" },
    { no: "4", text: "export function initQuantumHub() {", color: "#e5c07b" },
    { no: "5", text: "    const scene = new THREE.Scene();", color: "#abb2bf" },
    { no: "6", text: "    const doors = ['classification', 'regression'];", color: "#98c379" },
    { no: "7", text: "    const security = new SecurityWardenAI();", color: "#61afef" },
    { no: "8", text: "    // Real scikit-learn scoring pipeline", color: "#5c6370" },
    { no: "9", text: "    doors.forEach(d => attachTerminal(d));", color: "#56b6c2" },
    { no: "10", text: "    renderer.toneMapping = ACESFilmic;", color: "#abb2bf" },
    { no: "11", text: "    return { scene, security };", color: "#c678dd" },
    { no: "12", text: "}", color: "#e5c07b" },
    { no: "13", text: "", color: "#fff" },
    { no: "14", text: "function onDoorSolved(stars, score) {", color: "#61afef" },
    { no: "15", text: "    if (score >= threshold) unlockVault();", color: "#98c379" },
    { no: "16", text: "    wardenVoice.speak('attempt_passed');", color: "#e06c75" },
    { no: "17", text: "}", color: "#abb2bf" },
  ];

  ctx.font = "12px 'Courier New', monospace";
  codeLines.forEach((cl, idx) => {
    const y = 48 + idx * 17;
    ctx.fillStyle = "#3e4d68";
    ctx.fillText(cl.no.padStart(3, " "), 190, y);
    ctx.fillStyle = cl.color;
    ctx.fillText(cl.text, 230, y);
  });

  // Terminal footer
  ctx.fillStyle = "#0c1017";
  ctx.fillRect(180, 360, 560, 60);
  ctx.fillStyle = "#4caf50";
  ctx.fillText("✓ Connected: http://127.0.0.1:8000 (BlackVault ML Hub)", 196, 385);
  ctx.fillStyle = "#5ec8d8";
  ctx.fillText("➜ status: 4 doors online | WARDEN AI ready", 196, 403);

  // Right Side: 3D Engine Preview Viewport (matching the reference photo)
  ctx.fillStyle = "#141a24";
  ctx.fillRect(740, 0, 540, 420);
  ctx.strokeStyle = "#253042";
  ctx.lineWidth = 1;
  ctx.strokeRect(740, 0, 540, 420);

  // 3D Grid
  ctx.strokeStyle = "rgba(70, 95, 130, 0.4)";
  for (let gx = 740; gx <= 1280; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, 420); ctx.stroke();
  }
  for (let gy = 0; gy <= 420; gy += 30) {
    ctx.beginPath(); ctx.moveTo(740, gy); ctx.lineTo(1280, gy); ctx.stroke();
  }

  // 3D Wireframe Cube/Room in center (like in photo)
  const cx = 1010, cy = 210;
  ctx.strokeStyle = "#5ec8d8";
  ctx.lineWidth = 2.5;

  // Front face
  ctx.strokeRect(cx - 70, cy - 50, 140, 100);
  // Back face
  ctx.strokeRect(cx - 40, cy - 80, 140, 100);
  // Connecting edges
  ctx.beginPath();
  ctx.moveTo(cx - 70, cy - 50); ctx.lineTo(cx - 40, cy - 80);
  ctx.moveTo(cx + 70, cy - 50); ctx.lineTo(cx + 100, cy - 80);
  ctx.moveTo(cx - 70, cy + 50); ctx.lineTo(cx - 40, cy + 20);
  ctx.moveTo(cx + 70, cy + 50); ctx.lineTo(cx + 100, cy + 20);
  ctx.stroke();

  // Glow point at center
  ctx.fillStyle = "#40d8f0";
  ctx.shadowColor = "#40d8f0";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Viewport labels
  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = "#70b8ff";
  ctx.fillText("VIEWPORT 01 [PERSPECTIVE]", 755, 25);
  ctx.fillStyle = "#8aa4c8";
  ctx.fillText("Objects: 14 | Vertices: 2,480 | FPS: 60", 755, 400);

  return new THREE.CanvasTexture(canvas);
}

// Right Ultrawide Screen: 3D Corridor/Room Viewport (matching the reference photo)
export function createRightUltrawideScreenTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");

  // Viewport background
  ctx.fillStyle = "#121722";
  ctx.fillRect(0, 0, 1280, 420);

  // Left & Right toolbars
  ctx.fillStyle = "#0c1017";
  ctx.fillRect(0, 0, 140, 420);
  ctx.fillRect(1140, 0, 140, 420);

  ctx.font = "bold 11px 'Courier New', monospace";
  ctx.fillStyle = "#5ec8d8";
  ctx.fillText("OUTLINER", 14, 24);
  const outliner = ["▼ Level_01", "  • Floor_Mesh", "  • Wall_North", "  • Ceiling_Rig", "  • Door_Gate", "  • Light_Spot_01"];
  outliner.forEach((o, i) => {
    ctx.fillStyle = "#7f98b8";
    ctx.fillText(o, 12, 50 + i * 20);
  });

  ctx.fillStyle = "#5ec8d8";
  ctx.fillText("DETAILS", 1154, 24);
  ctx.fillStyle = "#8ba5c4";
  ctx.fillText("Pos: 0, 1.7, 0", 1154, 52);
  ctx.fillText("Rot: 0, 0, 0", 1154, 74);
  ctx.fillText("Scale: 1, 1, 1", 1154, 96);
  ctx.fillText("Mat: PBR_Metal", 1154, 118);

  // Center: 3D Corridor rendering (like the 3D game level in the photo!)
  const vx = 140, vw = 1000;
  const cx = vx + vw / 2, cy = 210;

  // Corridor walls perspective
  ctx.fillStyle = "#1a2230";
  ctx.beginPath();
  ctx.moveTo(vx, 0); ctx.lineTo(cx - 150, cy - 80);
  ctx.lineTo(cx - 150, cy + 80); ctx.lineTo(vx, 420);
  ctx.fill();

  ctx.fillStyle = "#1a2230";
  ctx.beginPath();
  ctx.moveTo(vx + vw, 0); ctx.lineTo(cx + 150, cy - 80);
  ctx.lineTo(cx + 150, cy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();

  // Floor
  ctx.fillStyle = "#151b26";
  ctx.beginPath();
  ctx.moveTo(vx, 420); ctx.lineTo(cx - 150, cy + 80);
  ctx.lineTo(cx + 150, cy + 80); ctx.lineTo(vx + vw, 420);
  ctx.fill();

  // End door
  ctx.fillStyle = "#0e141f";
  ctx.fillRect(cx - 150, cy - 80, 300, 160);
  ctx.strokeStyle = "#40d8f0";
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - 130, cy - 70, 260, 150);

  // Cyan emissive door light
  ctx.shadowColor = "#40d8f0";
  ctx.shadowBlur = 25;
  ctx.fillStyle = "#40d8f0";
  ctx.fillRect(cx - 120, cy - 65, 240, 8);
  ctx.shadowBlur = 0;

  // Header
  ctx.font = "bold 12px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("LEVEL EDITOR — FACILITY CORRIDOR [REALTIME PBR SHADER]", vx + 20, 30);

  return new THREE.CanvasTexture(canvas);
}

// RGB Mechanical Keyboard texture
export function createKeyboardTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  // Keyboard body
  ctx.fillStyle = "#0c1017";
  ctx.fillRect(0, 0, 512, 180);

  // Key rows with vibrant RGB rainbow backlighting
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
      ctx.fillStyle = "#18202d";
      ctx.fillRect(kx, ky, kw, kh);

      // Keycap top highlight
      ctx.fillStyle = `hsla(${hue}, 80%, 75%, 0.4)`;
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

  ctx.fillStyle = "#121822";
  ctx.fillRect(0, 0, 1024, 512);

  // Header
  ctx.font = "bold 24px 'Inter', sans-serif";
  ctx.fillStyle = "#5ec8d8";
  ctx.fillText("GAME BUILD IN PROGRESS", 50, 55);

  ctx.font = "bold 38px 'Inter', sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("PROJECT COSMOS", 50, 105);

  // Diagrams and text boxes
  ctx.strokeStyle = "#e8a33d";
  ctx.lineWidth = 2;
  ctx.strokeRect(50, 150, 260, 130);
  ctx.font = "16px 'Courier New', monospace";
  ctx.fillStyle = "#e8a33d";
  ctx.fillText("[ ML SENSORS ]", 70, 185);
  ctx.fillStyle = "#a0b8d8";
  ctx.fillText("• Clean missing vals", 70, 215);
  ctx.fillText("• Impute mean/median", 70, 240);

  // Arrow
  ctx.strokeStyle = "#5ec8d8";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(320, 215); ctx.lineTo(420, 215);
  ctx.lineTo(410, 205); ctx.moveTo(420, 215); ctx.lineTo(410, 225);
  ctx.stroke();

  ctx.strokeRect(440, 150, 260, 130);
  ctx.fillStyle = "#5ec8d8";
  ctx.fillText("[ NEURAL CORE ]", 460, 185);
  ctx.fillStyle = "#a0b8d8";
  ctx.fillText("• Logistic / RF", 460, 215);
  ctx.fillText("• Silhouette > 0.6", 460, 240);

  // Arrow 2
  ctx.beginPath();
  ctx.moveTo(710, 215); ctx.lineTo(800, 215);
  ctx.lineTo(790, 205); ctx.moveTo(800, 215); ctx.lineTo(790, 225);
  ctx.stroke();

  ctx.strokeStyle = "#4caf50";
  ctx.strokeRect(820, 150, 150, 130);
  ctx.fillStyle = "#4caf50";
  ctx.fillText("[ UNLOCK ]", 840, 200);
  ctx.fillText("★ ★ ★", 855, 235);

  // Bottom notes
  ctx.font = "15px 'Courier New', monospace";
  ctx.fillStyle = "#8ca2be";
  ctx.fillText("SECURITY PROTOCOL: WARDEN AI actively monitoring intruder pipelines.", 50, 360);
  ctx.fillText("STATUS: All 5 Security Doors active in hub.", 50, 395);

  return new THREE.CanvasTexture(canvas);
}

export function createLogoTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0d131f";
  ctx.fillRect(0, 0, 1024, 300);

  // Stylized 'N' Logo mark
  ctx.lineWidth = 22;
  ctx.strokeStyle = "#4080ff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(70, 230);
  ctx.lineTo(70, 70);
  ctx.lineTo(170, 230);
  ctx.lineTo(170, 70);
  ctx.stroke();

  // Cyan gradient overlay
  ctx.strokeStyle = "#40d8f0";
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(70, 70);
  ctx.lineTo(170, 230);
  ctx.stroke();

  // Text
  ctx.font = "bold 64px 'Inter', sans-serif";
  ctx.fillStyle = "#dce7f5";
  ctx.fillText("NEBULA", 220, 140);

  ctx.font = "34px 'Inter', sans-serif";
  ctx.fillStyle = "#6d8bb3";
  ctx.fillText("S T U D I O S", 225, 195);

  return new THREE.CanvasTexture(canvas);
}

export function createNeonSignTexture(text, mainColor, glowColor) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#080c14";
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

  ctx.fillStyle = "#0a0e16";
  ctx.fillRect(0, 0, 512, 340);

  ctx.strokeStyle = "rgba(40, 80, 120, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, 452, 280);
  ctx.beginPath();
  ctx.moveTo(256, 30); ctx.lineTo(256, 310);
  ctx.moveTo(30, 170); ctx.lineTo(482, 170);
  ctx.stroke();

  ctx.font = "bold 16px 'Courier New', monospace";
  ctx.fillStyle = "#ff4444";
  ctx.fillText("● LIVE [SURVEILLANCE]", 44, 60);

  ctx.fillStyle = "#5ec8d8";
  ctx.fillText(camLabel, 44, 85);

  ctx.font = "12px 'Courier New', monospace";
  ctx.fillStyle = "#88a6c8";
  ctx.fillText("FPS: 60.0 | ISO 800 | 4K HDR", 44, 280);
  ctx.fillText("STATUS: SECTOR MONITORED", 44, 300);

  return new THREE.CanvasTexture(canvas);
}
