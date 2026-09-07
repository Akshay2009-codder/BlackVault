// Phase 1 stub -- Drop-in .glb model loading with procedural placeholder fallback (ported from old plan).
// Port the matching logic from the old mission-based plan in Phase 2/6 as noted
// in idea.md, adapted to the hub-of-5-doors layout instead of a single corridor.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export function init() {
  // TODO: implement in a later phase.
}

const loader = new GLTFLoader();
const modelCache = new Map();

/**
 * Load a GLTF/GLB model from URL with caching.
 * @param {string} url - Path to the .glb / .gltf file
 * @param {function} onLoad - Callback with (gltf)
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

function cloneGltf(gltf) {
  return {
    scene: gltf.scene.clone(true),
    animations: gltf.animations || [],
  };
}
