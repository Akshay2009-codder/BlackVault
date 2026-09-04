import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
      // Enable shadows and tweak materials
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
 * Helper to clone GLTF scene and animations
 */
function cloneGltf(gltf) {
  return {
    scene: gltf.scene.clone(true),
    animations: gltf.animations || [],
  };
}
