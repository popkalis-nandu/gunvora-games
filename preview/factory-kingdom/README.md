# Factory Kingdom 250 · GUNVORA GAMES — realistic 3D (all 250 levels)

A factory business sim built mobile-first. Build: `phase3-250-levels`, shown in `<meta name="fk-build">`.

## Layout (phase 3)
- The 3D scene fills about 80% of a portrait screen.
- At the top is a thin HUD row: level pill (tap it for the level map), coins, workers and orders.
- Goal chips can be collapsed.
- At the bottom is a slim bar of icon tabs with a one-line status. A tab opens a bottom sheet. Close the sheet by swiping it down, tapping outside it, or tapping the tab again.
- In landscape the tabs move to a narrow side rail and the sheet becomes a side panel.
- Tap a machine for a popover with Start/Stop or Boost, Service and Upgrade.
- Machine chips are compact and drop their text label when zoomed out.
- The tutorial is a small card near the bottom.

## Levels
There are 250 levels across 6 eras (`js/data.js`). Levels 1–10 are hand-written; levels 11–250 are generated from era rules.

| Era | Levels | Theme | Access |
|---|---|---|---|
| 1 | 1–25 | Small Workshop | free |
| 2 | 26–50 | First Factory | free |
| 3 | 51–100 | Print, Pack & Automate | Premium |
| 4 | 101–150 | Factories & Export | Premium |
| 5 | 151–200 | Robotics & Smart Mfg | Premium |
| 6 | 201–250 | Global Industrial Empire | Premium |

- Every 10th level is a milestone. Level 250 is the "Industrial Emperor" finale.
- After level 50 a premium gate appears. There are no payments. Menu → "🧪 Tester: unlock premium" (or the gate button) unlocks levels 51–250.
- Content unlocks by level:
  - Spaces 0–7.
  - Raw materials: wood, steel, plastic, paper, electronics, composites.
  - 23 products.
  - Machine tiers T1–T6.
  - Vehicles: cart → truck → big truck → semi → e-truck fleet.
  - Facilities: print line, auto dock, AGVs, smart-factory dashboard, solar roof.
  - Export fleet: train, ship, plane.
  - Satellite plants and global HQ hubs.

## 3D (three.js r170, vendored)
| File | Contents |
|---|---|
| `js/scene3d.js` | Buildings for spaces 0–7 (cut-away roofs), machines T1–T6 (robot cells), conveyors, workers, vehicles (with semis and e-trucks), raw stores, forklift, supplier truck, chips, 3D coins and fireworks, construction animation, camera |
| `js/scene3d-products.js` | Procedural models for all 23 products |
| `js/scene3d-empire.js` | Lazy-loaded: print line, auto dock, AGVs, smart dashboard, solar roof, rail and train, port with cranes and ship, airport and cargo plane, satellite plants with shuttle vans, global hubs |

Animations:
- Workers walk, carry, operate machines and repair them.
- Each machine tier has its own cycle.
- Conveyors run.
- The forklift unloads the supplier truck. The truck arrives, waits and U-turns away.
- Delivery trucks load and depart.
- Breakdowns give off smoke and repairs give off sparks.
- Exports leave by train, ship or plane.
- Buildings grow in when you expand.
- Coins and fireworks play on rewards and level-ups.

Performance:
- Static geometry is merged and repeated items are instanced.
- The empire module is lazy-loaded.
- Graphics presets High, Medium and Low, with auto-downscale.
- `?2d` gives the lightweight 2D fallback.

## Saves
- The save key is `gunvora_factorykingdom3d_v1`.
- Saves from the 2D game and from 3D v1 are migrated automatically.
- The tester premium flag is stored in `gunvora_fk_tester_premium`.

## Debug
`window.FK` gives play-test hooks; `window.FK_R3` is the renderer.

See CREDITS.md for asset licences.
