import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();

/**
 * Tries to load a GLB at `path`. On success, removes `placeholder` from
 * `parent` and adds the loaded model in its place (copying position/
 * rotation/visibility from the placeholder), then calls
 * `opts.onReplaced(model)` so callers can update any references
 * (interactables, door tracking, etc.) that were pointing at the
 * placeholder. On failure (file not present yet), does nothing — the
 * placeholder keeps rendering.
 */
export function replaceWithModel(path, placeholder, parent, opts = {}) {
  gltfLoader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      model.position.copy(placeholder.position);
      model.rotation.copy(placeholder.rotation);
      model.visible = placeholder.visible;
      if (opts.scale) model.scale.setScalar(opts.scale);
      parent.remove(placeholder);
      parent.add(model);
      if (opts.onReplaced) opts.onReplaced(model);
    },
    undefined,
    () => { /* model not provided yet — keep procedural placeholder */ }
  );
}

/**
 * For whole-room placeholders (a THREE.Group of floor/wall/ceiling meshes):
 * hides the procedural geometry and adds the loaded model as a child of the
 * SAME group, so existing `group.visible` toggles (scene switching) keep
 * working without callers needing a new reference.
 */
export function replaceRoomModel(path, group) {
  gltfLoader.load(
    path,
    (gltf) => {
      group.children.forEach((c) => { c.visible = false; });
      group.add(gltf.scene);
    },
    undefined,
    () => { /* model not provided yet — keep procedural room */ }
  );
}
