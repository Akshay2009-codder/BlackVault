/**
 * BlackVault ML Lab — Main Application Bootstrap
 * Initializes Three.js scene, UI managers, and game state.
 */
import { LabScene } from './src/scenes/LabScene.js';
import { Controller } from './src/player/Controller.js';
import { Camera } from './src/player/Camera.js';
import { MainMenu } from './src/ui/MainMenu.js';
import { HUD } from './src/ui/HUD.js';
import { LevelSelect } from './src/ui/LevelSelect.js';
import { DoorPrompt } from './src/ui/DoorPrompt.js';
import { Terminal } from './src/ui/Terminal.js';
import { Results } from './src/ui/Results.js';
import { APIClient } from './src/api/client.js';

// ───── Game State ─────
const state = {
    currentScreen: 'menu',  // menu | levelSelect | playing | doorPrompt | terminal | results | paused
    currentLevel: 1,
    playerData: null,
    levelData: null,
    activeDoor: null,
    isPointerLocked: false,
};

// ───── Core Systems ─────
let labScene, controller, camera;
let mainMenu, hud, levelSelect, doorPrompt, terminal, results;
const api = new APIClient();

// ───── Initialize ─────
async function init() {
    const canvas = document.getElementById('game-canvas');

    // Load player data
    try {
        state.playerData = await api.getPlayer();
        state.currentLevel = state.playerData.current_level;
    } catch (e) {
        console.warn('Backend not available, using defaults');
        state.playerData = { id: 1, name: 'Agent', current_level: 1, total_stars: 0 };
    }

    // Init Three.js scene
    labScene = new LabScene(canvas);

    // Init player systems
    camera = new Camera(labScene.camera);
    controller = new Controller(labScene, camera);

    // Init UI
    mainMenu = new MainMenu(state, {
        onPlay: startGame,
        onLevelSelect: showLevelSelect,
    });

    hud = new HUD(state);

    levelSelect = new LevelSelect(state, api, {
        onSelectLevel: (level) => {
            state.currentLevel = level;
            startGame();
        },
        onBack: showMenu,
    });

    doorPrompt = new DoorPrompt(state, {
        onEnter: enterDoor,
        onCancel: closeDoorPrompt,
    });

    terminal = new Terminal(state, api, {
        onComplete: showResults,
        onClose: closeDoorPrompt,
    });

    results = new Results(state, {
        onContinue: returnToLab,
    });

    // Setup door interaction
    labScene.onDoorInteract = (door) => {
        if (state.currentScreen === 'playing') {
            showDoorPrompt(door);
        }
    };

    // Keyboard events
    document.addEventListener('keydown', onKeyDown);

    // Pointer lock change
    document.addEventListener('pointerlockchange', () => {
        state.isPointerLocked = !!document.pointerLockElement;
        const crosshair = document.getElementById('crosshair');
        crosshair.classList.toggle('visible', state.isPointerLocked);
    });

    // Hide loading
    document.getElementById('loading-screen').classList.remove('active');

    // Show menu
    showMenu();

    // Start render loop
    animate();
}

// ───── Screen Transitions ─────
function showMenu() {
    state.currentScreen = 'menu';
    exitPointerLock();
    hideAllOverlays();
    mainMenu.show();
    hud.hide();
}

function showLevelSelect() {
    state.currentScreen = 'levelSelect';
    hideAllOverlays();
    levelSelect.show();
}

async function startGame() {
    state.currentScreen = 'playing';
    hideAllOverlays();

    // Load level data
    try {
        const data = await api.getLevel(state.currentLevel);
        state.levelData = data;
    } catch (e) {
        console.warn('Could not load level data');
        state.levelData = null;
    }

    // Update lab scene for current level
    labScene.setLevel(state.currentLevel, state.levelData);
    hud.show();
    hud.update(state);

    // Reset player position
    controller.reset();

    // Request pointer lock
    requestPointerLock();
}

function showDoorPrompt(door) {
    state.currentScreen = 'doorPrompt';
    state.activeDoor = door;
    exitPointerLock();
    doorPrompt.show(door, state);
}

function closeDoorPrompt() {
    state.currentScreen = 'playing';
    state.activeDoor = null;
    doorPrompt.hide();
    requestPointerLock();
}

async function enterDoor() {
    if (!state.activeDoor) return;
    state.currentScreen = 'terminal';
    doorPrompt.hide();
    terminal.show(state.activeDoor, state);
}

function showResults(resultData) {
    state.currentScreen = 'results';
    state.lastResult = resultData;
    terminal.hide();
    results.show(resultData);
}

async function returnToLab() {
    state.currentScreen = 'playing';
    results.hide();

    const solvedDoor = state.activeDoor;
    state.activeDoor = null;

    // Refresh level data
    try {
        state.playerData = await api.getPlayer();
        state.currentLevel = state.playerData.current_level;
        const data = await api.getLevel(state.currentLevel);
        state.levelData = data;
        labScene.setLevel(state.currentLevel, state.levelData);
        
        // Trigger celebratory unlock effect if solved
        if (state.lastResult?.success && solvedDoor) {
            labScene.unlockDoorEffect(solvedDoor.type);
        }
    } catch (e) {
        console.warn('Could not refresh data');
    }

    hud.update(state);
    requestPointerLock();
}

// ───── Input Handling ─────
function onKeyDown(e) {
    switch (e.code) {
        case 'Escape':
            if (state.currentScreen === 'playing') {
                togglePause();
            } else if (state.currentScreen === 'doorPrompt') {
                closeDoorPrompt();
            } else if (state.currentScreen === 'paused') {
                togglePause();
            }
            break;
        case 'KeyE':
            if (state.currentScreen === 'playing' && labScene.nearestDoor) {
                showDoorPrompt(labScene.nearestDoor);
            } else if (state.currentScreen === 'doorPrompt') {
                enterDoor();
            }
            break;
    }
}

function togglePause() {
    const pauseEl = document.getElementById('pause-menu');
    if (state.currentScreen === 'playing') {
        state.currentScreen = 'paused';
        exitPointerLock();
        pauseEl.classList.add('active');
    } else if (state.currentScreen === 'paused') {
        state.currentScreen = 'playing';
        pauseEl.classList.remove('active');
        requestPointerLock();
    }
}

// ───── Pointer Lock ─────
function requestPointerLock() {
    const canvas = document.getElementById('game-canvas');
    canvas.requestPointerLock?.();
}

function exitPointerLock() {
    document.exitPointerLock?.();
}

// ───── Helpers ─────
function hideAllOverlays() {
    document.querySelectorAll('.overlay').forEach(el => el.classList.remove('active'));
    document.getElementById('door-prompt').classList.add('hidden');
}

// ───── Render Loop ─────
function animate() {
    requestAnimationFrame(animate);

    if (state.currentScreen === 'playing') {
        controller.update();
        labScene.updateDoorProximity(controller.position);

        // Update interaction hint
        const interactEl = document.getElementById('hud-interact');
        const interactText = document.getElementById('interact-text');
        if (labScene.nearestDoor) {
            interactEl.classList.remove('hidden');
            interactText.textContent = `Open ${labScene.nearestDoor.name}`;
        } else {
            interactEl.classList.add('hidden');
        }
    }

    labScene.render();
}

// ───── Pause Menu Buttons ─────
document.getElementById('btn-resume')?.addEventListener('click', togglePause);
document.getElementById('btn-quit')?.addEventListener('click', showMenu);
document.getElementById('btn-pause')?.addEventListener('click', togglePause);

// ───── Start ─────
init();
