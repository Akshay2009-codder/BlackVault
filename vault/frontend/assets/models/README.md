# Drop your 3D models here

The game auto-detects these exact filenames on load. If a file isn't present
yet, the game keeps using its procedural placeholder (a plain box/room), so
nothing breaks — drop files in whenever they're ready.

| Filename | Replaces | Notes |
|---|---|---|
| `home_room.glb` | The starting apartment room | Room-scale model, floor at world Y = 0 |
| `facility_corridor.glb` | The facility corridor shell | Long corridor, floor at world Y = 0, centered on X/Z origin, built along -Z |
| `phone.glb` | The desk phone prop | Small prop, origin at its base |
| `security_door.glb` | Every locked security door | Single reusable door model, origin at bottom-center so the open animation (sliding up) looks right |
| `teammate.glb` | Both teammates (Reyes and Nomad) | Single reusable rig, origin at the feet (Y = 0 at ground contact), facing -Z (same forward axis as the player) |

## Conventions to follow when exporting

- **Format:** glTF Binary (`.glb`) — single file, easiest to drop in.
- **Units:** meters, real-world scale (a door should be ~1–2m wide, ~2.5–3m tall).
- **Forward axis:** -Z (glTF/Three.js default). The player walks toward -Z
  down the corridor.
- **Origin/pivot:**
  - Rooms (`home_room`, `facility_corridor`): origin at the center of the
    floor, floor itself at Y = 0.
  - `phone.glb`: origin at the base of the model, since it's placed on a desk
    at a fixed Y.
  - `security_door.glb`: origin at the bottom-center of the door, since the
    unlock animation moves the model straight up along Y from its current
    position.
  - `teammate.glb`: origin at ground level between the feet, like a standard
    character rig — the two teammates are the same model reused with
    different positions, no separate file needed per character.
- **Materials:** PBR materials embedded in the glTF (baked textures or
  simple PBR values) render as-is; no extra setup needed on the code side.
- **Scale mismatch:** if a model loads but looks too big/small, the quickest
  fix is re-exporting at the right real-world scale from your 3D tool —
  that's more reliable than compensating in code.

Once you drop a matching file in here, refresh the page — no code changes
needed.
