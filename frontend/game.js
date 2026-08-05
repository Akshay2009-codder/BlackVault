// BlackVault 3D Engine (Three.js)

let camera, scene, renderer, raycaster;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let prevTime = performance.now();
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

let isLocked = false;
let interactableObjects = [];
let currentInteractTarget = null;
let doorMesh, doorLight;

const instructions = document.getElementById('instructions');
const interactionPrompt = document.getElementById('interaction-prompt');
const uiOverlay = document.getElementById('ui-overlay');
const closeUiBtn = document.getElementById('close-ui');

// Level Complete UI
const levelCompleteUI = document.createElement('div');
levelCompleteUI.style.position = 'absolute';
levelCompleteUI.style.top = '0';
levelCompleteUI.style.left = '0';
levelCompleteUI.style.width = '100vw';
levelCompleteUI.style.height = '100vh';
levelCompleteUI.style.backgroundColor = 'rgba(0, 255, 102, 0.9)';
levelCompleteUI.style.color = '#000';
levelCompleteUI.style.display = 'none';
levelCompleteUI.style.flexDirection = 'column';
levelCompleteUI.style.justifyContent = 'center';
levelCompleteUI.style.alignItems = 'center';
levelCompleteUI.style.zIndex = '200';
levelCompleteUI.style.fontFamily = "'Fira Code', monospace";
levelCompleteUI.innerHTML = '<h1 style="font-size: 5rem; margin-bottom: 20px;">MISSION ACCOMPLISHED</h1><p style="font-size: 1.5rem; font-weight: bold;">You have bypassed the BlackVault Security System.</p><button onclick="location.reload()" style="margin-top: 30px; padding: 15px 30px; font-size: 1.2rem; background: #000; color: #00ff66; border: 2px solid #000; cursor: pointer; font-family: \'Fira Code\', monospace;">PLAY AGAIN</button>';
document.body.appendChild(levelCompleteUI);

// PointerLock implementation
const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const PI_2 = Math.PI / 2;

init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x020305);
  scene.fog = new THREE.FogExp2(0x020305, 0.04);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.y = 1.6; // Player height
  camera.position.z = 10;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
  scene.add(ambientLight);
  
  const pointLight = new THREE.PointLight(0x00f0ff, 1, 20);
  pointLight.position.set(0, 4, -5);
  scene.add(pointLight);

  // Build Environment
  buildRoom();
  buildTerminal();
  buildDoor();
  buildServerRacks();

  // Raycaster for interaction
  raycaster = new THREE.Raycaster();

  // Event Listeners
  document.addEventListener('click', () => {
    if (!isLocked && uiOverlay.style.display !== 'block') {
      document.body.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === document.body) {
      isLocked = true;
      instructions.style.display = 'none';
    } else {
      isLocked = false;
      if (uiOverlay.style.display !== 'block') {
        instructions.style.display = 'flex';
      }
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (isLocked) {
      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;
      euler.setFromQuaternion(camera.quaternion);
      euler.y -= movementX * 0.002;
      euler.x -= movementY * 0.002;
      euler.x = Math.max(-PI_2, Math.min(PI_2, euler.x));
      camera.quaternion.setFromEuler(euler);
    }
  });

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);

  closeUiBtn.addEventListener('click', () => {
    uiOverlay.style.display = 'none';
    document.body.requestPointerLock();
  });
}

function onKeyDown(event) {
  switch (event.code) {
    case 'KeyW': moveForward = true; break;
    case 'KeyA': moveLeft = true; break;
    case 'KeyS': moveBackward = true; break;
    case 'KeyD': moveRight = true; break;
    case 'KeyE': 
      if (currentInteractTarget && isLocked) {
        document.exitPointerLock();
        uiOverlay.style.display = 'block';
      }
      break;
    case 'KeyO': // Secret key to test door opening without backend
      openDoor();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case 'KeyW': moveForward = false; break;
    case 'KeyA': moveLeft = false; break;
    case 'KeyS': moveBackward = false; break;
    case 'KeyD': moveRight = false; break;
  }
}

function buildRoom() {
  // Floor
  const floorGeo = new THREE.PlaneGeometry(30, 30);
  const floorMat = new THREE.MeshStandardMaterial({ 
    color: 0x050505, 
    roughness: 0.1, 
    metalness: 0.5 
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Ceiling
  const ceilingGeo = new THREE.PlaneGeometry(30, 30);
  const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 1.0 });
  const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 8;
  scene.add(ceiling);

  // Grid Helper for cyberpunk feel
  const gridHelper = new THREE.GridHelper(30, 30, 0x00f0ff, 0x002233);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);

  // Walls
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.8 });
  const wallGeo = new THREE.PlaneGeometry(30, 8);
  
  const wall1 = new THREE.Mesh(wallGeo, wallMat);
  wall1.position.set(0, 4, -15);
  scene.add(wall1);

  const wall2 = new THREE.Mesh(wallGeo, wallMat);
  wall2.position.set(0, 4, 15);
  wall2.rotation.y = Math.PI;
  scene.add(wall2);

  const wall3 = new THREE.Mesh(wallGeo, wallMat);
  wall3.position.set(-15, 4, 0);
  wall3.rotation.y = Math.PI / 2;
  scene.add(wall3);

  const wall4 = new THREE.Mesh(wallGeo, wallMat);
  wall4.position.set(15, 4, 0);
  wall4.rotation.y = -Math.PI / 2;
  scene.add(wall4);
}

function buildTerminal() {
  const group = new THREE.Group();
  
  // Pedestal
  const pedGeo = new THREE.BoxGeometry(1.2, 1, 1.2);
  const pedMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
  const pedestal = new THREE.Mesh(pedGeo, pedMat);
  pedestal.position.y = 0.5;
  group.add(pedestal);

  // Screen
  const screenGeo = new THREE.BoxGeometry(1.5, 1, 0.1);
  const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 1.5, 0.3);
  screen.rotation.x = -0.2;
  group.add(screen);

  // Holographic Beam
  const beamGeo = new THREE.CylinderGeometry(0.5, 0.8, 3, 16);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.set(0, 3, 0.3);
  group.add(beam);

  // Glow
  const glowLight = new THREE.PointLight(0x00f0ff, 1.5, 8);
  glowLight.position.set(0, 1.5, 1);
  group.add(glowLight);

  group.position.set(0, 0, -8);
  scene.add(group);
  
  // Add to interactables (use screen for raycasting)
  screen.userData = { type: 'terminal' };
  interactableObjects.push(screen);
}

function buildServerRacks() {
  const rackGeo = new THREE.BoxGeometry(2, 6, 2);
  const rackMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, metalness: 0.9, roughness: 0.2 });
  
  for(let i=0; i<4; i++) {
    // Left side racks
    const rackL = new THREE.Mesh(rackGeo, rackMat);
    rackL.position.set(-10, 3, -10 + (i * 4));
    scene.add(rackL);
    addServerLights(rackL.position);

    // Right side racks
    const rackR = new THREE.Mesh(rackGeo, rackMat);
    rackR.position.set(10, 3, -10 + (i * 4));
    scene.add(rackR);
    addServerLights(rackR.position);
  }
}

function addServerLights(pos) {
  const cGeo = new THREE.BoxGeometry(1.8, 0.1, 2.1);
  const cMat = new THREE.MeshBasicMaterial({ color: 0x00ff66 });
  const lightBand = new THREE.Mesh(cGeo, cMat);
  lightBand.position.copy(pos);
  lightBand.position.y += Math.random() * 2;
  scene.add(lightBand);
}

function buildDoor() {
  const doorGeo = new THREE.BoxGeometry(4, 5, 0.5);
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xff3366, metalness: 0.5, roughness: 0.5 });
  doorMesh = new THREE.Mesh(doorGeo, doorMat);
  doorMesh.position.set(0, 2.5, 14.8);
  scene.add(doorMesh);
  
  // Light above door
  doorLight = new THREE.PointLight(0xff3366, 2, 10);
  doorLight.position.set(0, 6, 13);
  scene.add(doorLight);
}

function openDoor() {
  // Simple animation to slide door open
  const targetX = 4;
  const slide = setInterval(() => {
    if (doorMesh.position.x < targetX) {
      doorMesh.position.x += 0.1;
    } else {
      clearInterval(slide);
    }
  }, 16);
  
  // Turn light green
  doorMesh.material.color.setHex(0x00ff66);
  doorLight.color.setHex(0x00ff66);
}

// Hook for iframe to call when train succeeds
window.addEventListener('message', (event) => {
  if (event.data === 'UNLOCK_DOOR') {
    openDoor();
  } else if (event.data === 'CLOSE_UI') {
    uiOverlay.style.display = 'none';
    document.body.requestPointerLock();
  }
});

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function checkInteractions() {
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(interactableObjects);
  
  if (intersects.length > 0 && intersects[0].distance < 4) {
    if (currentInteractTarget !== intersects[0].object) {
      currentInteractTarget = intersects[0].object;
      interactionPrompt.style.display = 'block';
    }
  } else {
    if (currentInteractTarget) {
      currentInteractTarget = null;
      interactionPrompt.style.display = 'none';
    }
  }
}

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  
  if (isLocked) {
    const delta = (time - prevTime) / 1000;
    
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;
    
    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize();
    
    if (moveForward || moveBackward) velocity.z -= direction.z * 40.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 40.0 * delta;

    camera.translateX(velocity.x * delta);
    camera.translateZ(velocity.z * delta);
    
    // Simple collision with walls (Room is 30x30, so bounds are -14 to 14)
    if (camera.position.x < -14) camera.position.x = -14;
    if (camera.position.x > 14) camera.position.x = 14;
    if (camera.position.z < -14) camera.position.z = -14;
    if (camera.position.z > 14) camera.position.z = 14;

    // Check if player walked through the open door
    if (doorMesh.position.x >= 2 && camera.position.z > 13.5 && camera.position.x > -2 && camera.position.x < 2) {
        document.exitPointerLock();
        levelCompleteUI.style.display = 'flex';
        isLocked = false;
    }

    checkInteractions();
  }

  prevTime = time;
  renderer.render(scene, camera);
}
