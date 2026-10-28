# Factory Kingdom 250 · GUNVORA GAMES — realistic 3D prototype (levels 1–10)

Mobile-first factory business sim. The simulation, balance, levels 1–10, HUD tabs and save system
are unchanged from the 2D prototype; the presentation is now real-time 3D (three.js r170, vendored).

## Files
- `index.html` — shell, HUD/tabs, loader, import map (no CDN, no hotlinking). Has `noindex` meta.
- `css/style.css` — industrial graphite UI with GUNVORA branding.
- `js/data.js` — levels and balance. `js/game.js` — simulation, UI, save/load, 2D fallback renderer, and the `window.FK_INT` bridge.
- `js/scene3d.js` — 3D renderer (buildings, machines T1–T4, conveyors, workers, vehicles, particles, camera).
- `js/main3d.js` — boots the 3D renderer and falls back to 2D on any failure.
- `vendor/three/` — three.js r170 module build and the addons used (MIT).
- `assets/models/*.glb` (meshopt-compressed, WebP textures), `assets/tex/*.webp` (PBR sets), `assets/hdri/factory_yard_1k.hdr`.

## Rendering
- PBR (MeshStandardMaterial), HDRI image-based lighting, a directional sun with PCF soft shadows, ACES Filmic tone mapping, and GTAO ambient occlusion (High preset).
- Three-quarter isometric camera: drag to pan, pinch or scroll to zoom, recenter button. Tap a machine to start or boost it. Tap the shelf, raw stock, road or yard to open the matching tab.
- Graphics presets in the Menu: High (DPR 2, 2048 shadow map, AO), Medium (default on phones: DPR 1.5, 1024 shadows), and Low (DPR 1, 512 shadows). If frames take longer than about 38 ms, the resolution steps down automatically.
- Static geometry is merged by material. Rollers, goods, planks and dashes are instanced.
- No WebGL, or `?2d` in the URL, gives the original lightweight 2D canvas view.

## Saves
- New key: `gunvora_factorykingdom3d_v1`. A save from the 2D prototype (`gunvora_factorykingdom_v1`) is migrated automatically on first load.
- The graphics preset is stored under `gunvora_factorykingdom3d_gfx`.

## Debug
- `window.FK` exposes the state and actions for automated play-tests. `window.FK_R3` is the renderer API.

See CREDITS.md for asset licences.
