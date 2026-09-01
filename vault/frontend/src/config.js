// Central configuration: backend API base URL and 3D model drop-in paths.

export const API_BASE = 'http://localhost:8000';

// Drop your own .glb/.gltf files in frontend/assets/models/ using these
// exact filenames and the game swaps to them automatically. If a file is
// missing, the procedural placeholder mesh stays on screen, so nothing
// breaks while assets are still being produced. See
// frontend/assets/models/README.md for scale/pivot conventions.
export const MODEL_PATHS = {
  home_room: 'assets/models/home_room.glb',
  facility_corridor: 'assets/models/facility_corridor.glb',
  phone: 'assets/models/phone.glb',
  security_door: 'assets/models/security_door.glb',
  teammate: 'assets/models/teammate.glb',
};