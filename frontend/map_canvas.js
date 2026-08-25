/* ============================================================
   map_canvas.js — Dynamic SVG Map Visualizer & API Controller
   ============================================================ */

(function () {
  const API_BASE = "http://localhost:8000";
  let facilityData = null;
  let selectedSector = null;

  // Viewport Zoom & Pan State
  let viewBox = { x: -100, y: -20, width: 1200, height: 900 };
  let isPanning = false;
  let startPoint = { x: 0, y: 0 };

  const svg = document.getElementById("facilitySvg");
  const svgContainer = document.getElementById("svgContainer");

  function updateViewBox() {
    svg.setAttribute(
      "viewBox",
      `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`
    );
  }

  async function fetchFacilityMap() {
    try {
      const res = await fetch(`${API_BASE}/map/facility`);
      if (res.ok) {
        facilityData = await res.json();
        renderMap();
        if (facilityData.sectors && facilityData.sectors.length > 0) {
          selectSector(facilityData.sectors[0].sector_id);
        }
      } else {
        console.warn("Backend map API unavailable. Using fallback layout.");
        useFallbackMap();
      }
    } catch (err) {
      console.warn("Map API error, loading offline layout:", err);
      useFallbackMap();
    }
  }

  function useFallbackMap() {
    facilityData = {
      sectors: [
        { sector_id: "SEC_00", name: "Surface Command Hub", level_number: 0, unlocked: true, position: { x: 500, y: 100 }, active_hazard: "None", terminals: [{ name: "Hub Terminal", dataset: "hub", level_number: 0 }], doors: [{ door_id: "D1", target_sector_id: "SEC_01", status: "UNLOCKED" }] },
        { sector_id: "SEC_01", name: "Data Core (Cleaning)", level_number: 1, unlocked: true, position: { x: 500, y: 220 }, active_hazard: "Sparks & Corrupt Data Stream", terminals: [{ name: "Preprocess Terminal", dataset: "house_prices", level_number: 1 }], doors: [{ door_id: "D2", target_sector_id: "SEC_02", status: "SEALED" }] },
        { sector_id: "SEC_02", name: "Processing Vault (Regression)", level_number: 2, unlocked: false, position: { x: 750, y: 350 }, active_hazard: "Overheating Racks", terminals: [{ name: "Regression Terminal", dataset: "house_prices", level_number: 2 }], doors: [{ door_id: "D3", target_sector_id: "SEC_03", status: "SEALED" }] },
        { sector_id: "SEC_03", name: "Neural Lab (Classification)", level_number: 3, unlocked: false, position: { x: 750, y: 550 }, active_hazard: "Cryo-Leak Vapors", terminals: [{ name: "Classifier Terminal", dataset: "heart_disease", level_number: 3 }], doors: [{ door_id: "D4", target_sector_id: "SEC_04", status: "SEALED" }] },
        { sector_id: "SEC_04", name: "Cluster Node (Unsupervised)", level_number: 4, unlocked: false, position: { x: 500, y: 550 }, active_hazard: "Laser Grid Sensors", terminals: [{ name: "Cluster Terminal", dataset: "mall_customers", level_number: 4 }], doors: [{ door_id: "D5", target_sector_id: "SEC_05", status: "SEALED" }] },
        { sector_id: "SEC_05", name: "Anomaly Containment Vault", level_number: 5, unlocked: false, position: { x: 250, y: 550 }, active_hazard: "Turret Sweeps", terminals: [{ name: "Anomaly Terminal", dataset: "credit_card", level_number: 5 }], doors: [{ door_id: "D6", target_sector_id: "SEC_06", status: "SEALED" }] },
        { sector_id: "SEC_06", name: "Central AI Core (Boss Chamber)", level_number: 6, unlocked: false, position: { x: 500, y: 720 }, active_hazard: "Neural Overload", terminals: [{ name: "Boss Sandbox Terminal", dataset: "boss_dataset", level_number: 6 }], doors: [] },
      ]
    };
    renderMap();
    selectSector("SEC_01");
  }

  function renderMap() {
    const edgesGroup = document.getElementById("mapEdges");
    const nodesGroup = document.getElementById("mapNodes");
    edgesGroup.innerHTML = "";
    nodesGroup.innerHTML = "";

    const sectorMap = {};
    facilityData.sectors.forEach((s) => {
      // Map coordinates to SVG space if needed
      sectorMap[s.sector_id] = s;
    });

    // Render Connection Lines (Edges)
    facilityData.sectors.forEach((sec) => {
      sec.doors.forEach((door) => {
        const targetSec = sectorMap[door.target_sector_id];
        if (targetSec) {
          const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
          line.setAttribute("x1", sec.position.x > 10 ? sec.position.x : sec.position.x * 4 + 500);
          line.setAttribute("y1", sec.position.y > 10 ? sec.position.y : sec.position.y * 3 + 100);
          line.setAttribute("x2", targetSec.position.x > 10 ? targetSec.position.x : targetSec.position.x * 4 + 500);
          line.setAttribute("y2", targetSec.position.y > 10 ? targetSec.position.y : targetSec.position.y * 3 + 100);
          line.setAttribute("class", `map-edge ${door.status.toLowerCase()}`);
          line.setAttribute("stroke-width", "3");
          edgesGroup.appendChild(line);
        }
      });
    });

    // Sector Color Theme Mapping
    const SECTOR_THEMES = {
      SEC_00: { color: "#00f0ff", title: "Cyan" },
      SEC_01: { color: "#00bfff", title: "Tech Blue" },
      SEC_02: { color: "#ffaa00", title: "Flame Amber" },
      SEC_03: { color: "#cc00ff", title: "Deep Violet" },
      SEC_04: { color: "#00ff66", title: "Neon Lime" },
      SEC_05: { color: "#ff2a5f", title: "Hazards Red" },
      SEC_06: { color: "#ffd700", title: "Platinum Gold" },
    };

    // Render Sector Nodes with full-color themes
    facilityData.sectors.forEach((sec) => {
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      const posX = sec.position.x > 10 ? sec.position.x : sec.position.x * 4 + 500;
      const posY = sec.position.y > 10 ? sec.position.y : sec.position.y * 3 + 100;
      const themeColor = SECTOR_THEMES[sec.sector_id]?.color || "#00f0ff";

      g.setAttribute("class", `map-node ${sec.unlocked ? "unlocked" : "sealed"}`);
      g.setAttribute("transform", `translate(${posX}, ${posY})`);
      g.setAttribute("data-sector-id", sec.sector_id);

      // Outer ring with sector theme color
      const outerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      outerCircle.setAttribute("r", "26");
      outerCircle.setAttribute("fill", "none");
      outerCircle.setAttribute("stroke", sec.unlocked ? themeColor : "#ff2a5f");
      outerCircle.setAttribute("stroke-width", "2");
      outerCircle.setAttribute("opacity", "0.8");
      outerCircle.setAttribute("style", `filter: drop-shadow(0 0 6px ${themeColor});`);

      // Inner node circle
      const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      innerCircle.setAttribute("class", "main-node");
      innerCircle.setAttribute("r", "18");
      innerCircle.setAttribute("fill", sec.unlocked ? themeColor : "#ff2a5f");

      // Label text
      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("y", "38");
      text.setAttribute("class", "node-label");
      text.setAttribute("fill", themeColor);
      text.textContent = sec.name.split("(")[0].trim();

      g.appendChild(outerCircle);
      g.appendChild(innerCircle);
      g.appendChild(text);

      g.addEventListener("click", () => selectSector(sec.sector_id));
      nodesGroup.appendChild(g);
    });

    // Render 3D Operative Character & Animated Patrol Car
    render3DCharacterAndRover(nodesGroup);


    // Render Radar Sweep Line
    const radarGroup = document.getElementById("radarSweep");
    if (radarGroup) {
      radarGroup.innerHTML = "";
      const sweep = document.createElementNS("http://www.w3.org/2000/svg", "line");
      sweep.setAttribute("x1", "500");
      sweep.setAttribute("y1", "400");
      sweep.setAttribute("x2", "950");
      sweep.setAttribute("y2", "400");
      sweep.setAttribute("class", "radar-sweep-line");
      radarGroup.appendChild(sweep);
    }
  }

  function render3DCharacterAndRover(parentGroup) {
    // 3D Operative Avatar at Sector 01
    const charGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    charGroup.setAttribute("transform", "translate(500, 220)");
    charGroup.setAttribute("class", "character-avatar");

    // Glowing Visor Cone
    const visorCone = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    visorCone.setAttribute("points", "0,0 -15,-30 15,-30");
    visorCone.setAttribute("fill", "rgba(0, 240, 255, 0.25)");
    visorCone.setAttribute("stroke", "#00f0ff");
    visorCone.setAttribute("stroke-width", "1");

    // Operative Icon (Stylized 3D Character)
    const opBody = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    opBody.setAttribute("r", "10");
    opBody.setAttribute("fill", "#00f0ff");
    opBody.setAttribute("stroke", "#ffffff");
    opBody.setAttribute("stroke-width", "2");
    opBody.setAttribute("style", "filter: drop-shadow(0 0 10px #00f0ff);");

    const opText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    opText.setAttribute("y", "-16");
    opText.setAttribute("class", "node-label");
    opText.setAttribute("fill", "#ffff00");
    opText.textContent = "OPERATIVE VESPER";

    charGroup.appendChild(visorCone);
    charGroup.appendChild(opBody);
    charGroup.appendChild(opText);
    parentGroup.appendChild(charGroup);

    // Animated 3D Patrol Rover Car
    const roverGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    roverGroup.setAttribute("id", "patrolRoverCar");

    // Rover Body Shape (High-Tech Car)
    const carBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    carBody.setAttribute("x", "-14");
    carBody.setAttribute("y", "-8");
    carBody.setAttribute("width", "28");
    carBody.setAttribute("height", "16");
    carBody.setAttribute("rx", "4");
    carBody.setAttribute("fill", "#ffff00");
    carBody.setAttribute("stroke", "#ffaa00");
    carBody.setAttribute("stroke-width", "2");

    // Headlights Light Beams
    const headlightL = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    headlightL.setAttribute("points", "14,-6 40,-12 40,0");
    headlightL.setAttribute("fill", "rgba(255, 255, 0, 0.4)");

    const headlightR = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    headlightR.setAttribute("points", "14,6 40,0 40,12");
    headlightR.setAttribute("fill", "rgba(255, 255, 0, 0.4)");

    const carText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    carText.setAttribute("y", "-12");
    carText.setAttribute("class", "node-label");
    carText.setAttribute("fill", "#ffaa00");
    carText.textContent = "PATROL CAR-01";

    roverGroup.appendChild(headlightL);
    roverGroup.appendChild(headlightR);
    roverGroup.appendChild(carBody);
    roverGroup.appendChild(carText);
    parentGroup.appendChild(roverGroup);

    // Animate Patrol Car along corridor path
    let carProgress = 0;
    const waypoints = [
      { x: 500, y: 220 },
      { x: 750, y: 350 },
      { x: 750, y: 550 },
      { x: 500, y: 550 },
      { x: 250, y: 550 },
      { x: 500, y: 720 },
    ];

    setInterval(() => {
      carProgress = (carProgress + 0.005) % (waypoints.length - 1);
      const idx = Math.floor(carProgress);
      const frac = carProgress - idx;
      const p1 = waypoints[idx];
      const p2 = waypoints[idx + 1];

      const cx = p1.x + (p2.x - p1.x) * frac;
      const cy = p1.y + (p2.y - p1.y) * frac;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);

      roverGroup.setAttribute("transform", `translate(${cx}, ${cy}) rotate(${angle})`);
    }, 30);
  }



  function selectSector(sectorId) {
    selectedSector = facilityData.sectors.find((s) => s.sector_id === sectorId);
    if (!selectedSector) return;

    document.getElementById("inspectorName").textContent = `${selectedSector.sector_id} // ${selectedSector.name.toUpperCase()}`;
    const statusEl = document.getElementById("inspectorStatus");
    statusEl.textContent = selectedSector.unlocked
      ? `STATUS: UNLOCKED [LEVEL ${selectedSector.level_number}]`
      : `STATUS: SEALED [REQUIRED LEVEL ${selectedSector.level_number}]`;
    statusEl.className = selectedSector.unlocked ? "glow-green mono" : "glow-red mono";

    document.getElementById("inspectorHazard").textContent =
      selectedSector.active_hazard || "NONE (SECTOR STABLE)";

    const termWrap = document.getElementById("inspectorTerminals");
    termWrap.innerHTML = "";
    selectedSector.terminals.forEach((t) => {
      const item = document.createElement("div");
      item.className = "mono glow-cyan";
      item.style.cssText = "font-size:11px; border:1px solid var(--panel-line); padding:6px 10px; background:rgba(0,240,255,0.05);";
      item.textContent = `▶ ${t.name} (${t.dataset})`;
      termWrap.appendChild(item);
    });
  }

  // Event Handlers for Navigation Buttons
  document.getElementById("zoomInBtn")?.addEventListener("click", () => {
    viewBox.width *= 0.8;
    viewBox.height *= 0.8;
    updateViewBox();
  });

  document.getElementById("zoomOutBtn")?.addEventListener("click", () => {
    viewBox.width *= 1.25;
    viewBox.height *= 1.25;
    updateViewBox();
  });

  document.getElementById("resetMapBtn")?.addEventListener("click", () => {
    viewBox = { x: -100, y: -20, width: 1200, height: 900 };
    updateViewBox();
  });

  document.getElementById("launchTerminalBtn")?.addEventListener("click", () => {
    if (!selectedSector) return;
    window.location.href = `index.html?level=${selectedSector.level_number}`;
  });

  document.getElementById("fastTravelBtn")?.addEventListener("click", () => {
    if (!selectedSector) return;
    if (!selectedSector.unlocked) {
      alert(`[SECURITY ALERT] Cannot teleport to SEALED sector '${selectedSector.name}'. Solve terminal puzzles to clear doors.`);
      return;
    }
    localStorage.setItem("blackvault_current_sector", selectedSector.sector_id);
    document.getElementById("playerLocation").textContent = `SECTOR: ${selectedSector.level_number} (${selectedSector.name.toUpperCase()})`;
    const statusEl = document.getElementById("facilityStatus");
    statusEl.textContent = "TELEPORT COMPLETE";
    statusEl.className = "glow-cyan";
    setTimeout(() => {
      statusEl.textContent = "FACILITY ONLINE";
      statusEl.className = "glow-green";
    }, 2500);
  });


  document.getElementById("findPathBtn")?.addEventListener("click", async () => {
    if (!selectedSector) return;
    const currentSectorId = localStorage.getItem("blackvault_current_sector") || "SEC_01";
    try {
      const res = await fetch(`${API_BASE}/map/pathfinding`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_sector_id: currentSectorId,
          target_sector_id: selectedSector.sector_id,
          operative_clearance: 6
        })
      });
      if (res.ok) {
        const data = await res.json();
        renderRouteLine(data.path);
        const statusEl = document.getElementById("facilityStatus");
        statusEl.textContent = `ROUTE COMPUTED: ${data.total_steps} SECTORS (${data.estimated_seconds}s)`;
        statusEl.className = "glow-cyan";
      } else {
        alert("Pathfinding solver returned no viable route.");
      }
    } catch (err) {
      console.warn("Pathfinding API offline, highlighting direct target:", err);
    }
  });

  function renderRouteLine(pathSteps) {
    let routeGroup = document.getElementById("routePathGroup");
    if (!routeGroup) {
      routeGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      routeGroup.setAttribute("id", "routePathGroup");
      svg.appendChild(routeGroup);
    }
    routeGroup.innerHTML = "";

    if (!pathSteps || pathSteps.length < 2) return;

    const points = pathSteps.map((step) => {
      const px = step.position.x > 10 ? step.position.x : step.position.x * 4 + 500;
      const py = step.position.y > 10 ? step.position.y : step.position.y * 3 + 100;
      return `${px},${py}`;
    }).join(" ");

    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    polyline.setAttribute("points", points);
    polyline.setAttribute("fill", "none");
    polyline.setAttribute("stroke", "#ffff00");
    polyline.setAttribute("stroke-width", "4");
    polyline.setAttribute("stroke-dasharray", "8, 4");
    polyline.setAttribute("style", "animation: flowEdge 1.5s linear infinite; filter: drop-shadow(0 0 8px #ffff00);");
    routeGroup.appendChild(polyline);
  }

  // Filter buttons handler
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");
      const filter = e.target.dataset.filter;
      document.querySelectorAll(".map-node").forEach((node) => {
        const isUnlocked = node.classList.contains("unlocked");
        if (filter === "ALL") node.style.display = "block";
        else if (filter === "UNLOCKED") node.style.display = isUnlocked ? "block" : "none";
        else if (filter === "SEALED") node.style.display = !isUnlocked ? "block" : "none";
      });
    });
  });

  fetchFacilityMap();
  updateViewBox();
})();


