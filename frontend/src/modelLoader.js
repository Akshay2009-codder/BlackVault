// Model loading utility with GLTF caching, skeleton-safe cloning,
// and animation-mixer helpers for view-models and world props.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

export function init() {
  // Reserved for future pre-warming / progress-bar hookup.
}

const loader = new GLTFLoader();
const modelCache = new Map();

/**
 * Load a GLTF/GLB model from URL with caching.
 * @param {string} url  - Path to the .glb / .gltf file
 * @param {function} onLoad  - Callback with (gltf)
 * @param {function} onError - Optional error callback
 */
export function loadModel(url, onLoad, onError) {
  if (modelCache.has(url)) {
    const cached = modelCache.get(url);
    if (onLoad) onLoad(cloneGltf(cached));
    return;
  }

  loader.load(
    url,
    (gltf) => {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.side = THREE.FrontSide;
          }
        }
      });

      modelCache.set(url, gltf);
      if (onLoad) onLoad(cloneGltf(gltf));
    },
    undefined,
    (err) => {
      console.warn(`[ModelLoader] Failed to load model at ${url}:`, err);
      if (onError) onError(err);
    }
  );
}

/**
 * Clone a cached GLTF result using SkeletonUtils so skinned
 * meshes, skeletons, and bone references are preserved correctly.
 */
function cloneGltf(gltf) {
  return {
    scene: SkeletonUtils.clone(gltf.scene),
    animations: gltf.animations || [],
  };
}

// ── Animated-model API (Promise-based) ──────────────────────────────

/**
 * Load a GLTF/GLB that contains skinned meshes + animation clips.
 * Returns a ready-to-use helper object:
 *
 *   { scene, mixer, actions, play(name, opts) }
 *
 * `actions` is a Map<string, THREE.AnimationAction> keyed by clip name.
 * `play(name, { fadeIn = 0.25, loop = true })` cross-fades to the named
 * action, stopping the previous one.
 *
 * @param {string} url - Path to the .glb / .gltf file
 * @returns {Promise<{scene: THREE.Group, mixer: THREE.AnimationMixer, actions: Map, play: Function}>}
 */
export function loadAnimatedModel(url) {
  return new Promise((resolve, reject) => {
    loadModel(
      url,
      (result) => {
        const scene = result.scene;
        const mixer = new THREE.AnimationMixer(scene);
        const actions = new Map();

        // Index every embedded clip by its name
        for (const clip of result.animations) {
          const action = mixer.clipAction(clip);
          actions.set(clip.name, action);
        }

        let _current = null;

        /**
         * Cross-fade to a named animation clip.
         * @param {string} name      - Clip name (e.g. "idle", "walk")
         * @param {object} opts
         * @param {number} opts.fadeIn - Cross-fade duration in seconds (default 0.25)
         * @param {boolean} opts.loop  - Whether to loop (default true)
         */
        function play(name, { fadeIn = 0.25, loop = true } = {}) {
          const next = actions.get(name);
          if (!next) {
            console.warn(`[ModelLoader] Animation "${name}" not found. Available:`, [...actions.keys()]);
            return;
          }
          if (_current === next) return;

          next.reset();
          next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
          next.clampWhenFinished = !loop;

          if (_current) {
            next.crossFadeFrom(_current, fadeIn, true);
          }

          next.play();
          _current = next;
        }

        const clipNames = [...actions.keys()];
        console.log(`[ModelLoader] Loaded animated model "${url}" with clips:`, clipNames);

        resolve({ scene, mixer, actions, play });
      },
      (err) => reject(err)
    );
  });
}
