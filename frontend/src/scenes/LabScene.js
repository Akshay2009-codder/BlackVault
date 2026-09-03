/**
 * LabScene — Full ML Research Lab environment.
 * Features: 5 sequential doors, computer workstations, server racks,
 * ceiling lights, neon strips, and rich cyberpunk-lab aesthetics.
 */
import * as THREE from 'three';

// Door order — must complete in sequence
const DOOR_ORDER = ['cleaning', 'regression', 'classification', 'clustering', 'anomaly'];

// Door configuration
const DOORS = [
    { type: 'cleaning',       name: 'Data Cleaning',       color: 0x00ff88, icon: '🧹', position: { x: -10, z: -13 }, rotation: 0,            order: 0 },
    { type: 'regression',     name: 'Regression',          color: 0x4488ff, icon: '📈', position: { x:  10, z: -13 }, rotation: 0,            order: 1 },
    { type: 'classification', name: 'Classification',      color: 0xaa44ff, icon: '🏷️', position: { x: -14, z:  -4 }, rotation: Math.PI / 2,  order: 2 },
    { type: 'clustering',     name: 'Clustering',          color: 0xff8800, icon: '🔮', position: { x:  14, z:  -4 }, rotation: -Math.PI / 2, order: 3 },
    { type: 'anomaly',        name: 'Anomaly Detection',   color: 0xff4444, icon: '🔍', position: { x:   0, z: -14 }, rotation: 0,            order: 4 },
];

const DOOR_INTERACT_DISTANCE = 4.5;

export class LabScene {
    constructor(canvas) {
        this.canvas = canvas;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.85;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x040810);
        this.scene.fog = new THREE.FogExp2(0x040810, 0.022);

        // Camera
        this.camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.7, 9);

        this.clock = new THREE.Clock();

        // Door data
        this.doorMeshes = [];
        this.doorData   = [];
        this.nearestDoor = null;

        // Callbacks
        this.onDoorInteract = null;

        // Build scene
        this._buildLab();
        this._buildDoors();
        this._buildWorkstations();
        this._buildLighting();
        this._buildServerRacks();

        window.addEventListener('resize', () => this._onResize());
    }

    // ─────────────────────────────────────────────
    //  LAB CONSTRUCTION
    // ─────────────────────────────────────────────

    _buildLab() {
        // ── Floor ──
        const floorGeo = new THREE.PlaneGeometry(34, 34);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x080812, metalness: 0.85, roughness: 0.25 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Floor grid
        const grid = new THREE.GridHelper(34, 34, 0x0d1020, 0x0a0a18);
        grid.position.y = 0.005;
        this.scene.add(grid);

        // Floor accent lines
        this._addFloorAccent(-7, 0.01, 0, 34, 0.05, 0x00f0ff, 0);
        this._addFloorAccent( 7, 0.01, 0, 34, 0.05, 0x00f0ff, 0);

        // ── Ceiling ──
        const ceilGeo = new THREE.PlaneGeometry(34, 34);
        const ceilMat = new THREE.MeshStandardMaterial({ color: 0x06060f, metalness: 0.5, roughness: 0.8 });
        const ceil = new THREE.Mesh(ceilGeo, ceilMat);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.y = 4.5;
        this.scene.add(ceil);

        // ── Walls ──
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x0b0b1c, metalness: 0.6, roughness: 0.5 });

        this._addWall(0,    2.25, -17,  34, 4.5, wallMat, 0);             // back
        this._addWall(-11,  2.25, 17,   12, 4.5, wallMat, 0);             // front-left
        this._addWall( 11,  2.25, 17,   12, 4.5, wallMat, 0);             // front-right
        this._addWall(-17,  2.25,  0,   34, 4.5, wallMat, Math.PI / 2);   // left
        this._addWall( 17,  2.25,  0,   34, 4.5, wallMat, Math.PI / 2);   // right

        // ── Wall panel details (circuit-board strips) ──
        this._addWallPanel(-17, 1.5, -5,  0.08, 2, 6, 0x001133, Math.PI / 2);
        this._addWallPanel(-17, 1.5,  5,  0.08, 2, 6, 0x001133, Math.PI / 2);
        this._addWallPanel( 17, 1.5, -5,  0.08, 2, 6, 0x001133, Math.PI / 2);
        this._addWallPanel( 17, 1.5,  5,  0.08, 2, 6, 0x001133, Math.PI / 2);

        // ── Neon baseboard strips ──
        this._addNeonStrip(0,     0.05, -16.9, 34, 0x00f0ff, 0);
        this._addNeonStrip(-16.9, 0.05,   0,   34, 0x00f0ff, Math.PI / 2);
        this._addNeonStrip( 16.9, 0.05,   0,   34, 0x00f0ff, Math.PI / 2);

        // ── Ceiling light bars ──
        const ceilLightPositions = [
            { x: -5, z: -6 }, { x: 5, z: -6 },
            { x: -5, z:  2 }, { x: 5, z:  2 },
            { x:  0, z: -12 },
        ];
        ceilLightPositions.forEach(p => this._addCeilingLight(p.x, p.z));

        // ── Central Holographic Pillar ──
        const platGeo = new THREE.CylinderGeometry(2, 2.5, 0.25, 8);
        const platMat = new THREE.MeshStandardMaterial({ color: 0x10102a, metalness: 0.95, roughness: 0.15, emissive: 0x000511 });
        const plat = new THREE.Mesh(platGeo, platMat);
        plat.position.set(0, 0.12, 1);
        this.scene.add(plat);

        const pillarGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.5, 16);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 0.4, transparent: true, opacity: 0.35 });
        this.holoPillar = new THREE.Mesh(pillarGeo, pillarMat);
        this.holoPillar.position.set(0, 2, 1);
        this.scene.add(this.holoPillar);

        // Hologram disc at pillar top
        const discGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.04, 32);
        const discMat = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.5 });
        this.holoDisc = new THREE.Mesh(discGeo, discMat);
        this.holoDisc.position.set(0, 3.75, 1);
        this.scene.add(this.holoDisc);

        // ── Ambient Particles ──
        this._addParticles();
    }

    _addWall(x, y, z, w, h, mat, ry) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        m.receiveShadow = true;
        this.scene.add(m);
    }

    _addWallPanel(x, y, z, depth, h, w, color, ry) {
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15, metalness: 0.9, roughness: 0.3 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(depth, h, w), mat);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        this.scene.add(m);
    }

    _addFloorAccent(x, y, z, len, width, color, ry) {
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(width, 0.01, len), mat);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        this.scene.add(m);
    }

    _addNeonStrip(x, y, z, length, color, ry) {
        const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2.5 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(length, 0.04, 0.03), mat);
        m.position.set(x, y, z);
        m.rotation.y = ry;
        this.scene.add(m);
        const light = new THREE.PointLight(color, 0.4, 8);
        light.position.set(x, y + 0.3, z);
        this.scene.add(light);
    }

    _addCeilingLight(x, z) {
        // Light fixture box
        const fixMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc8e0ff, emissiveIntensity: 3 });
        const fix = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 2.5), fixMat);
        fix.position.set(x, 4.44, z);
        this.scene.add(fix);

        // Actual light
        const light = new THREE.SpotLight(0xb0ccff, 1.2, 12, Math.PI / 5, 0.6);
        light.position.set(x, 4.4, z);
        light.target.position.set(x, 0, z);
        light.castShadow = false;
        this.scene.add(light);
        this.scene.add(light.target);
    }

    // ─────────────────────────────────────────────
    //  COMPUTER WORKSTATIONS
    // ─────────────────────────────────────────────

    _buildWorkstations() {
        // Left wall workstations (x = -14, facing right)
        this._addWorkstation(-13.5, 0, -10, -Math.PI / 2, 0x4488ff);
        this._addWorkstation(-13.5, 0,  -4, -Math.PI / 2, 0x00f0ff);

        // Right wall workstations (x = +14, facing left)
        this._addWorkstation(13.5, 0, -10, Math.PI / 2, 0xaa44ff);
        this._addWorkstation(13.5, 0,  -4, Math.PI / 2, 0xff8800);

        // Back wall cluster (z = -14)
        this._addWorkstation(-5, 0, -13.5, 0, 0x00ff88);
        this._addWorkstation( 5, 0, -13.5, 0, 0xff4444);
    }

    _addWorkstation(x, y, z, ry, accentColor) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = ry;

        // Desk surface
        const deskGeo = new THREE.BoxGeometry(2.2, 0.08, 0.9);
        const deskMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.7, roughness: 0.4 });
        const desk = new THREE.Mesh(deskGeo, deskMat);
        desk.position.y = 0.82;
        desk.castShadow = true;
        desk.receiveShadow = true;
        group.add(desk);

        // Desk legs
        [[-0.95, 0], [0.95, 0], [-0.95, 0.7], [0.95, 0.7]].forEach(([lx, lz]) => {
            const leg = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 0.82, 0.06),
                new THREE.MeshStandardMaterial({ color: 0x0a0a18, metalness: 0.9 })
            );
            leg.position.set(lx, 0.41, lz - 0.35);
            group.add(leg);
        });

        // Monitor base
        const baseGeo = new THREE.BoxGeometry(0.4, 0.04, 0.25);
        const baseMat = new THREE.MeshStandardMaterial({ color: 0x080818, metalness: 0.95 });
        const monBase = new THREE.Mesh(baseGeo, baseMat);
        monBase.position.set(0, 0.87, -0.15);
        group.add(monBase);

        // Monitor stem
        const stem = new THREE.Mesh(
            new THREE.BoxGeometry(0.04, 0.28, 0.04),
            baseMat
        );
        stem.position.set(0, 1.01, -0.18);
        group.add(stem);

        // Monitor screen frame
        const frameGeo = new THREE.BoxGeometry(1.1, 0.65, 0.05);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x0c0c20, metalness: 0.9, roughness: 0.2 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 1.3, -0.2);
        group.add(frame);

        // Monitor screen (glowing)
        const screenGeo = new THREE.BoxGeometry(1.0, 0.56, 0.02);
        const screenMat = new THREE.MeshStandardMaterial({
            color: accentColor,
            emissive: accentColor,
            emissiveIntensity: 0.08,
        });
        const screen = new THREE.Mesh(screenGeo, screenMat);
        screen.position.set(0, 1.3, -0.17);
        group.add(screen);
        this._addScreenContent(group, accentColor);

        // Screen glow light
        const screenLight = new THREE.PointLight(accentColor, 0.4, 2.5);
        screenLight.position.set(0, 1.3, 0);
        group.add(screenLight);

        // Keyboard
        const kbGeo = new THREE.BoxGeometry(0.85, 0.025, 0.28);
        const kbMat = new THREE.MeshStandardMaterial({ color: 0x0e0e22, metalness: 0.8, roughness: 0.5 });
        const kb = new THREE.Mesh(kbGeo, kbMat);
        kb.position.set(0, 0.875, 0.18);
        group.add(kb);

        // Keyboard key rows
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 12; col++) {
                const keyGeo = new THREE.BoxGeometry(0.055, 0.01, 0.055);
                const keyMat = new THREE.MeshStandardMaterial({
                    color: 0x14142a,
                    emissive: accentColor,
                    emissiveIntensity: 0.03,
                    metalness: 0.6
                });
                const key = new THREE.Mesh(keyGeo, keyMat);
                key.position.set(-0.32 + col * 0.06, 0.89, 0.1 + row * 0.07);
                group.add(key);
            }
        }

        // Mouse
        const mouseGeo = new THREE.BoxGeometry(0.09, 0.03, 0.14);
        const mouseMat = new THREE.MeshStandardMaterial({ color: 0x111122, metalness: 0.85 });
        const mouse = new THREE.Mesh(mouseGeo, mouseMat);
        mouse.position.set(0.58, 0.875, 0.18);
        group.add(mouse);

        // Accent strip on desk edge
        const stripGeo = new THREE.BoxGeometry(2.2, 0.025, 0.025);
        const stripMat = new THREE.MeshStandardMaterial({ color: accentColor, emissive: accentColor, emissiveIntensity: 2 });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(0, 0.87, 0.44);
        group.add(strip);

        this.scene.add(group);
    }

    _addScreenContent(group, color) {
        // Fake code lines on screen
        const lineCount = 6;
        const lineMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.6 });
        for (let i = 0; i < lineCount; i++) {
            const w = 0.15 + Math.random() * 0.5;
            const lineGeo = new THREE.BoxGeometry(w, 0.018, 0.005);
            const lineMesh = new THREE.Mesh(lineGeo, lineMat);
            const indent = (i % 2 === 1) ? 0.06 : 0;
            lineMesh.position.set(-0.38 + w / 2 + indent, 1.5 - i * 0.07, -0.16);
            group.add(lineMesh);
        }
    }

    // ─────────────────────────────────────────────
    //  SERVER RACKS
    // ─────────────────────────────────────────────

    _buildServerRacks() {
        this._addServerRack(-15.5, 0, -14, Math.PI / 2);
        this._addServerRack(-15.5, 0, -10, Math.PI / 2);
        this._addServerRack( 15.5, 0, -14, -Math.PI / 2);
        this._addServerRack( 15.5, 0, -10, -Math.PI / 2);
    }

    _addServerRack(x, y, z, ry) {
        const group = new THREE.Group();
        group.position.set(x, y, z);
        group.rotation.y = ry;

        // Rack body
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0a0a18, metalness: 0.9, roughness: 0.3 });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.5), bodyMat);
        body.position.y = 1.1;
        body.castShadow = true;
        group.add(body);

        // Unit slots
        for (let i = 0; i < 8; i++) {
            const slotColor = [0x00ff88, 0x4488ff, 0xaa44ff, 0xff8800, 0xff4444, 0x00f0ff, 0x00ff88, 0x4488ff][i];
            const slotMat = new THREE.MeshStandardMaterial({ color: slotColor, emissive: slotColor, emissiveIntensity: 0.5 });
            const slot = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.2, 0.02), slotMat);
            slot.position.set(0, 0.35 + i * 0.24, 0.26);
            group.add(slot);

            // LED indicators
            for (let j = 0; j < 3; j++) {
                const led = new THREE.Mesh(
                    new THREE.BoxGeometry(0.025, 0.025, 0.01),
                    new THREE.MeshStandardMaterial({ color: slotColor, emissive: slotColor, emissiveIntensity: 3 })
                );
                led.position.set(-0.22 + j * 0.06, 0.35 + i * 0.24, 0.27);
                group.add(led);
            }
        }

        // Rack light
        const rackLight = new THREE.PointLight(0x00f0ff, 0.3, 2);
        rackLight.position.set(0, 1.5, 0.5);
        group.add(rackLight);

        this.scene.add(group);
    }

    // ─────────────────────────────────────────────
    //  DOORS — Sequential Unlock System
    // ─────────────────────────────────────────────

    _buildDoors() {
        DOORS.forEach((cfg, index) => {
            const group = new THREE.Group();
            group.position.set(cfg.position.x, 0, cfg.position.z);
            group.rotation.y = cfg.rotation;

            // Door frame
            const frameGeo = new THREE.BoxGeometry(3.2, 3.8, 0.32);
            const frameMat = new THREE.MeshStandardMaterial({ color: 0x0e0e22, metalness: 0.85, roughness: 0.25 });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.y = 1.9;
            frame.castShadow = true;
            group.add(frame);

            // Door panel
            const doorGeo = new THREE.BoxGeometry(2.4, 3.2, 0.1);
            const doorMat = new THREE.MeshStandardMaterial({
                color: 0x080818,
                metalness: 0.92,
                roughness: 0.18,
                emissive: new THREE.Color(cfg.color),
                emissiveIntensity: 0.04,
            });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.y = 1.65;
            door.position.z = 0.12;
            door.castShadow = true;
            group.add(door);

            // Neon border
            const borderMat = new THREE.MeshStandardMaterial({
                color: cfg.color, emissive: cfg.color, emissiveIntensity: 1.8
            });

            [[0, 3.35, 0.12, 2.6, 0.07, 0.16],
             [0, 0.06, 0.12, 2.6, 0.07, 0.16],
             [-1.3, 1.7, 0.12, 0.07, 3.3, 0.16],
             [ 1.3, 1.7, 0.12, 0.07, 3.3, 0.16],
            ].forEach(([bx, by, bz, bw, bh, bd]) => {
                const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), borderMat);
                b.position.set(bx, by, bz);
                group.add(b);
            });

            // Door number plate
            const plateMat = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, metalness: 0.9 });
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.04), plateMat);
            plate.position.set(0, 1.65, 0.17);
            group.add(plate);

            // Door light
            const doorLight = new THREE.PointLight(cfg.color, 1.8, 9);
            doorLight.position.set(0, 2, 1.8);
            group.add(doorLight);

            // Status indicator sphere
            const indGeo = new THREE.SphereGeometry(0.14, 16, 16);
            const indMat = new THREE.MeshStandardMaterial({ color: cfg.color, emissive: cfg.color, emissiveIntensity: 2 });
            const indicator = new THREE.Mesh(indGeo, indMat);
            indicator.position.set(0, 3.55, 0.18);
            group.add(indicator);

            // ── LOCK BARRIER for doors 2-5 ──
            let barrier = null;
            let lockGlow = null;

            if (index > 0) {
                // Holographic red barrier
                const barrierGeo = new THREE.BoxGeometry(2.4, 3.2, 0.06);
                const barrierMat = new THREE.MeshStandardMaterial({
                    color: 0xff2222,
                    emissive: 0xff2222,
                    emissiveIntensity: 0.4,
                    transparent: true,
                    opacity: 0.35,
                    depthWrite: false,
                });
                barrier = new THREE.Mesh(barrierGeo, barrierMat);
                barrier.position.set(0, 1.65, 0.2);
                group.add(barrier);

                // Horizontal scan lines on barrier
                for (let s = 0; s < 8; s++) {
                    const scanMat = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff4444, emissiveIntensity: 1, transparent: true, opacity: 0.5 });
                    const scanLine = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.02, 0.07), scanMat);
                    scanLine.position.set(0, 0.2 + s * 0.4, 0.22);
                    group.add(scanLine);
                }

                // Lock glow light
                lockGlow = new THREE.PointLight(0xff2222, 1.2, 5);
                lockGlow.position.set(0, 2, 1);
                group.add(lockGlow);

                // Padlock icon sphere
                const lockSphereGeo = new THREE.SphereGeometry(0.18, 12, 12);
                const lockSphereMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 3 });
                const lockSphere = new THREE.Mesh(lockSphereGeo, lockSphereMat);
                lockSphere.position.set(0, 1.65, 0.35);
                group.add(lockSphere);
            }

            this.scene.add(group);

            this.doorMeshes.push(door);
            this.doorData.push({
                ...cfg,
                mesh: door,
                group,
                light: doorLight,
                indicator,
                borderMat,
                barrier,
                lockGlow,
                completed: false,
                stars: 0,
                unlocked: index === 0, // only first door starts unlocked
            });
        });
    }

    // ─────────────────────────────────────────────
    //  LIGHTING
    // ─────────────────────────────────────────────

    _buildLighting() {
        const ambient = new THREE.AmbientLight(0x10102a, 0.5);
        this.scene.add(ambient);

        const main = new THREE.PointLight(0x3355aa, 0.8, 35);
        main.position.set(0, 4, 0);
        main.castShadow = true;
        main.shadow.mapSize.set(1024, 1024);
        this.scene.add(main);

        const hemi = new THREE.HemisphereLight(0x111133, 0x040408, 0.25);
        this.scene.add(hemi);

        const spot = new THREE.SpotLight(0x00f0ff, 1.8, 12, Math.PI / 7, 0.5);
        spot.position.set(0, 4.4, 1);
        spot.target.position.set(0, 0, 1);
        this.scene.add(spot);
        this.scene.add(spot.target);
    }

    // ─────────────────────────────────────────────
    //  PARTICLES
    // ─────────────────────────────────────────────

    _addParticles() {
        const count = 280;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const cols = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            pos[i * 3]     = (Math.random() - 0.5) * 32;
            pos[i * 3 + 1] = Math.random() * 4.5;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 32;
            const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.9, 0.5);
            cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));

        const mat = new THREE.PointsMaterial({ size: 0.035, vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending });
        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    // ─────────────────────────────────────────────
    //  PUBLIC API — Level & Door State
    // ─────────────────────────────────────────────

    setLevel(levelNumber, levelData) {
        if (!levelData?.level) return;

        levelData.level.doors.forEach(doorInfo => {
            const door = this.doorData.find(d => d.type === doorInfo.door_type);
            if (!door) return;

            door.completed = doorInfo.completed;
            door.stars     = doorInfo.stars;

            if (doorInfo.completed) {
                door.indicator.material.emissiveIntensity = 3.5;
                door.borderMat.emissiveIntensity = 2.8;
                door.light.intensity = 2.8;
                // Remove barrier if somehow it's still there
                if (door.barrier) door.barrier.visible = false;
                if (door.lockGlow) door.lockGlow.visible = false;
            }
        });

        // Recalculate which door should be unlocked next
        this._recalcSequentialUnlocks();
    }

    _recalcSequentialUnlocks() {
        let allPreviousComplete = true;
        this.doorData.forEach((door, i) => {
            if (i === 0) {
                door.unlocked = true;
            } else {
                door.unlocked = allPreviousComplete && this.doorData[i - 1].completed;
            }
            if (!door.completed) allPreviousComplete = false;

            // Apply visual state
            if (door.barrier) door.barrier.visible = !door.unlocked;
            if (door.lockGlow) door.lockGlow.visible = !door.unlocked;
        });
    }

    unlockNextDoor(completedDoorType) {
        const idx = DOOR_ORDER.indexOf(completedDoorType);
        const nextDoor = this.doorData.find(d => d.type === DOOR_ORDER[idx + 1]);
        if (!nextDoor) return; // Was last door

        nextDoor.unlocked = true;
        if (nextDoor.barrier) nextDoor.barrier.visible = false;
        if (nextDoor.lockGlow) nextDoor.lockGlow.visible = false;

        // Unlock flash on next door
        let t = 0;
        const flash = setInterval(() => {
            t += 0.06;
            nextDoor.light.intensity = 2 + Math.sin(t * 12) * 1.5;
            nextDoor.borderMat.emissiveIntensity = 2 + Math.sin(t * 12) * 1;
            if (t > 2) {
                clearInterval(flash);
                nextDoor.light.intensity = 1.8;
                nextDoor.borderMat.emissiveIntensity = 1.8;
            }
        }, 30);
    }

    unlockDoorEffect(doorType) {
        const door = this.doorData.find(d => d.type === doorType);
        if (!door) return;

        door.completed = true;
        let t = 0;
        const flash = setInterval(() => {
            t += 0.05;
            door.light.intensity = 4 + Math.sin(t * 15) * 3;
            door.borderMat.emissiveIntensity = 4 + Math.sin(t * 15) * 2;
            if (t > 1.5) {
                clearInterval(flash);
                door.light.intensity = 2.5;
                door.borderMat.emissiveIntensity = 2.5;
                door.indicator.material.emissiveIntensity = 3.5;
            }
        }, 30);
    }

    // Returns the nearest interactable (unlocked) door
    updateDoorProximity(playerPos) {
        this.nearestDoor = null;
        let minDist = Infinity;

        const time = this.clock.getElapsedTime();

        this.doorData.forEach(door => {
            const wp = new THREE.Vector3();
            door.group.getWorldPosition(wp);
            const dist = playerPos.distanceTo(wp);

            if (door.unlocked && dist < DOOR_INTERACT_DISTANCE && dist < minDist) {
                minDist = dist;
                this.nearestDoor = door;
            }

            // Pulse nearest unlocked door, dim locked ones
            if (door === this.nearestDoor) {
                const pulse = 1 + Math.sin(time * 4) * 0.5;
                door.light.intensity = 1.8 + pulse;
                door.borderMat.emissiveIntensity = 1.8 + pulse * 0.5;
            } else if (!door.completed) {
                door.light.intensity  = door.unlocked ? 1.8 : 0.5;
                door.borderMat.emissiveIntensity = door.unlocked ? 1.5 : 0.4;
            }

            // Animate barrier scanline flicker on locked doors
            if (!door.unlocked && door.barrier) {
                door.barrier.material.opacity = 0.25 + Math.sin(time * 3 + door.order) * 0.12;
            }
        });
    }

    // ─────────────────────────────────────────────
    //  RENDER LOOP
    // ─────────────────────────────────────────────

    render() {
        const t = this.clock.getElapsedTime();

        if (this.holoPillar) {
            this.holoPillar.rotation.y = t * 0.6;
            this.holoPillar.material.opacity = 0.25 + Math.sin(t * 2) * 0.1;
        }
        if (this.holoDisc) {
            this.holoDisc.rotation.y = -t * 0.8;
            this.holoDisc.material.emissiveIntensity = 1 + Math.sin(t * 3) * 0.3;
        }
        if (this.particles) {
            const pos = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] += Math.sin(t + pos[i]) * 0.0008;
                if (pos[i + 1] > 4.5) pos[i + 1] = 0;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y = t * 0.015;
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
