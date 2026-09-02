/**
 * LabScene — Main 3D lab environment with 5 doors.
 * Built with Three.js: floor, walls, ceiling, neon-lit doors, ambient fog.
 */
import * as THREE from 'three';

// Door configuration
const DOORS = [
    { type: 'cleaning',       name: 'Data Cleaning',       color: 0x00ff88, icon: '🧹', position: { x: -8, z: -12 }, rotation: 0 },
    { type: 'regression',     name: 'Regression',          color: 0x4488ff, icon: '📈', position: { x: 8, z: -12 },  rotation: 0 },
    { type: 'classification', name: 'Classification',      color: 0xaa44ff, icon: '🏷️', position: { x: -14, z: 0 }, rotation: Math.PI / 2 },
    { type: 'clustering',     name: 'Clustering',          color: 0xff8800, icon: '🔮', position: { x: 14, z: 0 },  rotation: -Math.PI / 2 },
    { type: 'anomaly',        name: 'Anomaly Detection',   color: 0xff4444, icon: '🔍', position: { x: 0, z: -14 }, rotation: 0 },
];

const DOOR_INTERACT_DISTANCE = 4;

export class LabScene {
    constructor(canvas) {
        this.canvas = canvas;

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            alpha: false,
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.8;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.025);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            70, window.innerWidth / window.innerHeight, 0.1, 100
        );
        this.camera.position.set(0, 1.7, 8);

        // Clock
        this.clock = new THREE.Clock();

        // Door meshes
        this.doorMeshes = [];
        this.doorData = [];
        this.nearestDoor = null;

        // Callbacks
        this.onDoorInteract = null;

        // Build
        this._buildLab();
        this._buildDoors();
        this._buildLighting();

        // Resize handler
        window.addEventListener('resize', () => this._onResize());
    }

    _buildLab() {
        const textureLoader = new THREE.TextureLoader();

        // Floor
        const floorGeo = new THREE.PlaneGeometry(32, 32);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            metalness: 0.8,
            roughness: 0.3,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        this.scene.add(floor);

        // Floor grid lines
        const gridHelper = new THREE.GridHelper(32, 32, 0x111122, 0x0a0a18);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Ceiling
        const ceilingGeo = new THREE.PlaneGeometry(32, 32);
        const ceilingMat = new THREE.MeshStandardMaterial({
            color: 0x080818,
            metalness: 0.5,
            roughness: 0.7,
        });
        const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
        ceiling.rotation.x = Math.PI / 2;
        ceiling.position.y = 4;
        this.scene.add(ceiling);

        // Walls
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x0c0c1a,
            metalness: 0.6,
            roughness: 0.4,
        });

        // Back wall
        this._addWall(0, 2, -16, 32, 4, wallMat, 0);
        // Front wall (with entrance gap)
        this._addWall(-11, 2, 16, 10, 4, wallMat, 0);
        this._addWall(11, 2, 16, 10, 4, wallMat, 0);
        // Left wall
        this._addWall(-16, 2, 0, 32, 4, wallMat, Math.PI / 2);
        // Right wall
        this._addWall(16, 2, 0, 32, 4, wallMat, Math.PI / 2);

        // Wall trim (neon strips along base)
        this._addNeonStrip(0, 0.05, -15.9, 32, 0x00f0ff, 0);
        this._addNeonStrip(-15.9, 0.05, 0, 32, 0x00f0ff, Math.PI / 2);
        this._addNeonStrip(15.9, 0.05, 0, 32, 0x00f0ff, Math.PI / 2);

        // Central console/platform
        const platformGeo = new THREE.CylinderGeometry(2.5, 3, 0.3, 8);
        const platformMat = new THREE.MeshStandardMaterial({
            color: 0x111128,
            metalness: 0.9,
            roughness: 0.2,
            emissive: 0x000811,
        });
        const platform = new THREE.Mesh(platformGeo, platformMat);
        platform.position.set(0, 0.15, 0);
        platform.castShadow = true;
        this.scene.add(platform);

        // Holographic pillar on platform
        const pillarGeo = new THREE.CylinderGeometry(0.15, 0.15, 3, 16);
        const pillarMat = new THREE.MeshStandardMaterial({
            color: 0x00f0ff,
            emissive: 0x00f0ff,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.4,
        });
        const pillar = new THREE.Mesh(pillarGeo, pillarMat);
        pillar.position.set(0, 1.8, 0);
        this.scene.add(pillar);
        this.holoPillar = pillar;

        // Ambient particles (floating dust/data)
        this._addParticles();
    }

    _addWall(x, y, z, width, height, material, rotationY) {
        const geo = new THREE.PlaneGeometry(width, height);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotationY;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
    }

    _addNeonStrip(x, y, z, length, color, rotationY) {
        const geo = new THREE.BoxGeometry(length, 0.05, 0.02);
        const mat = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 2,
        });
        const strip = new THREE.Mesh(geo, mat);
        strip.position.set(x, y, z);
        strip.rotation.y = rotationY;
        this.scene.add(strip);

        // Add point light for glow
        const light = new THREE.PointLight(color, 0.5, 6);
        light.position.copy(strip.position);
        light.position.y += 0.2;
        this.scene.add(light);
    }

    _buildDoors() {
        DOORS.forEach((doorConfig, index) => {
            const group = new THREE.Group();
            group.position.set(doorConfig.position.x, 0, doorConfig.position.z);
            group.rotation.y = doorConfig.rotation;

            // Door frame
            const frameGeo = new THREE.BoxGeometry(3, 3.5, 0.3);
            const frameMat = new THREE.MeshStandardMaterial({
                color: 0x111122,
                metalness: 0.8,
                roughness: 0.3,
            });
            const frame = new THREE.Mesh(frameGeo, frameMat);
            frame.position.y = 1.75;
            frame.castShadow = true;
            group.add(frame);

            // Door panel (the actual door)
            const doorGeo = new THREE.BoxGeometry(2.2, 3, 0.1);
            const doorMat = new THREE.MeshStandardMaterial({
                color: 0x0a0a18,
                metalness: 0.9,
                roughness: 0.2,
                emissive: new THREE.Color(doorConfig.color),
                emissiveIntensity: 0.05,
            });
            const door = new THREE.Mesh(doorGeo, doorMat);
            door.position.y = 1.5;
            door.position.z = 0.11;
            door.castShadow = true;
            group.add(door);

            // Neon border around door
            const borderMat = new THREE.MeshStandardMaterial({
                color: doorConfig.color,
                emissive: doorConfig.color,
                emissiveIntensity: 1.5,
            });

            // Top border
            const topBorder = new THREE.Mesh(
                new THREE.BoxGeometry(2.4, 0.06, 0.15),
                borderMat
            );
            topBorder.position.set(0, 3.05, 0.12);
            group.add(topBorder);

            // Bottom border
            const bottomBorder = topBorder.clone();
            bottomBorder.position.y = 0.05;
            group.add(bottomBorder);

            // Left border
            const sideBorder = new THREE.Mesh(
                new THREE.BoxGeometry(0.06, 3, 0.15),
                borderMat
            );
            sideBorder.position.set(-1.2, 1.55, 0.12);
            group.add(sideBorder);

            // Right border
            const rightBorder = sideBorder.clone();
            rightBorder.position.x = 1.2;
            group.add(rightBorder);

            // Door light
            const doorLight = new THREE.PointLight(doorConfig.color, 1.5, 8);
            doorLight.position.set(0, 2, 1.5);
            doorLight.castShadow = false;
            group.add(doorLight);

            // Status indicator (circle above door)
            const indicatorGeo = new THREE.SphereGeometry(0.12, 16, 16);
            const indicatorMat = new THREE.MeshStandardMaterial({
                color: doorConfig.color,
                emissive: doorConfig.color,
                emissiveIntensity: 2,
            });
            const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
            indicator.position.set(0, 3.4, 0.15);
            group.add(indicator);

            this.scene.add(group);

            // Store for raycasting
            this.doorMeshes.push(door);
            this.doorData.push({
                ...doorConfig,
                mesh: door,
                group: group,
                light: doorLight,
                indicator: indicator,
                borderMat: borderMat,
                completed: false,
                stars: 0,
            });
        });
    }

    _buildLighting() {
        // Ambient
        const ambient = new THREE.AmbientLight(0x111133, 0.4);
        this.scene.add(ambient);

        // Main overhead light
        const mainLight = new THREE.PointLight(0x4466aa, 1, 30);
        mainLight.position.set(0, 3.8, 0);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.width = 1024;
        mainLight.shadow.mapSize.height = 1024;
        this.scene.add(mainLight);

        // Subtle hemisphere light
        const hemiLight = new THREE.HemisphereLight(0x111133, 0x050510, 0.3);
        this.scene.add(hemiLight);

        // Spotlight on central platform
        const spotLight = new THREE.SpotLight(0x00f0ff, 2, 10, Math.PI / 6, 0.5);
        spotLight.position.set(0, 4, 0);
        spotLight.target.position.set(0, 0, 0);
        this.scene.add(spotLight);
        this.scene.add(spotLight.target);
    }

    _addParticles() {
        const count = 200;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = Math.random() * 4;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;

            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 0.8, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.04,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending,
        });

        this.particles = new THREE.Points(geo, mat);
        this.scene.add(this.particles);
    }

    setLevel(levelNumber, levelData) {
        // Update door states based on level data
        if (levelData?.level) {
            const doors = levelData.level.doors;
            doors.forEach(doorInfo => {
                const door = this.doorData.find(d => d.type === doorInfo.door_type);
                if (door) {
                    door.completed = doorInfo.completed;
                    door.stars = doorInfo.stars;

                    // Change door appearance based on completion
                    if (doorInfo.completed) {
                        door.indicator.material.emissiveIntensity = 3.0;
                        door.borderMat.emissiveIntensity = 2.5;
                        door.light.intensity = 2.5;
                    } else {
                        door.indicator.material.emissiveIntensity = 1.0;
                        door.borderMat.emissiveIntensity = 1.0;
                        door.light.intensity = 1.2;
                    }
                }
            });
        }
    }

    unlockDoorEffect(doorType) {
        const door = this.doorData.find(d => d.type === doorType);
        if (!door) return;

        door.completed = true;
        // Bright flash animation
        const initialIntensity = door.light.intensity;
        let flashTime = 0;
        const flashInterval = setInterval(() => {
            flashTime += 0.05;
            door.light.intensity = 4 + Math.sin(flashTime * 15) * 3;
            door.borderMat.emissiveIntensity = 4 + Math.sin(flashTime * 15) * 2;
            if (flashTime > 1.5) {
                clearInterval(flashInterval);
                door.light.intensity = 2.5;
                door.borderMat.emissiveIntensity = 2.5;
            }
        }, 30);
    }

    updateDoorProximity(playerPosition) {
        this.nearestDoor = null;
        let minDist = Infinity;

        this.doorData.forEach(door => {
            const doorWorldPos = new THREE.Vector3();
            door.group.getWorldPosition(doorWorldPos);
            const dist = playerPosition.distanceTo(doorWorldPos);

            if (dist < DOOR_INTERACT_DISTANCE && dist < minDist) {
                minDist = dist;
                this.nearestDoor = door;
            }
        });

        // Pulse nearest door
        const time = this.clock.getElapsedTime();
        this.doorData.forEach(door => {
            if (door === this.nearestDoor) {
                const pulse = 1 + Math.sin(time * 4) * 0.5;
                door.light.intensity = 1.5 + pulse;
                door.borderMat.emissiveIntensity = 1.5 + pulse * 0.5;
            } else {
                door.light.intensity = door.completed ? 0.5 : 1.5;
                door.borderMat.emissiveIntensity = door.completed ? 0.5 : 1.5;
            }
        });
    }

    render() {
        const time = this.clock.getElapsedTime();

        // Animate holographic pillar
        if (this.holoPillar) {
            this.holoPillar.rotation.y = time * 0.5;
            this.holoPillar.material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
        }

        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length; i += 3) {
                positions[i + 1] += Math.sin(time + positions[i]) * 0.001;
                if (positions[i + 1] > 4) positions[i + 1] = 0;
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
            this.particles.rotation.y = time * 0.02;
        }

        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
