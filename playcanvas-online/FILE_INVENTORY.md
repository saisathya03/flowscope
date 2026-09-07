# FlowScope AI — PlayCanvas Online: File Inventory

## Created files

| File | Purpose |
|---|---|
| `flowscope-main.mjs` | The complete application in one upload-ready PlayCanvas ESM script (`FlowScopeMain`, script name `flowScopeMain`). Builds camera, lights, floor, all 16 nodes, Bézier tube routes, pooled particles, HTML dashboard, picking, anomaly visuals, predictions, recommendations, story mode and quality presets. ~1,970 lines, organised into 10 labelled sections. |
| `network_traffic.json` | Byte-for-byte copy of `../data/network_traffic.json` (unmodified). |
| `ml_results.json` | Byte-for-byte copy of `../data/ml_results.json` (unmodified). |
| `PLAYCANVAS_IMPORT_GUIDE.md` | Beginner step-by-step import, launch, troubleshooting and publish guide. |
| `FILE_INVENTORY.md` | This file. |

No other files were created or modified. The existing Three.js prototype is untouched.

## Source JSON record counts

- `network_traffic.json`: **360 records**, 28 fields each, forming **24 unique source→destination routes**. Anomaly kinds present: API Overload, Database Overload, Failed Connection, High Latency, Network Congestion, Packet Loss, Server Overload, Suspicious Traffic, Traffic Spike (+ Normal).
- `ml_results.json`: 12 KPI metrics, 4 model-metric entries, detections (6 bottlenecks, 6 high-traffic zones, 3 failed connections, 3 suspicious routes, 9 slow routes, 19 overloaded records), **16 node predictions**, **6 recommendations**, **8 alerts**, 12 forecast points, and a complete `predictive_flow` (Server-01 → API-Gateway → Server-04 → Database-02) — so the predicted route shown is the real ML output, not a demo. The demo-route fallback exists in code and is clearly labelled, but is not needed with this data.

## Static validation performed (static only — not run inside PlayCanvas)

- `node --check flowscope-main.mjs` (Node v24.19.0): **syntax OK**.
- Grep scan: no TODO/FIXME/placeholder markers; no Three.js or Unity references.
- Manual review: one exported class (`FlowScopeMain extends Script`), `static scriptName = 'flowScopeMain'`, two `@attribute @type {Asset} @resource json` attributes (`networkTraffic`, `mlResults`), balanced sections, allocation-free per-frame paths (shared temp `Vec3`s, particle pool, one-time data aggregation, cached materials, meshes disposed on quality rebuild).
- **Not validated:** actual execution inside the PlayCanvas Editor/Launcher — I have no access to your PlayCanvas account, so runtime behaviour is unverified until you press Launch.

## Manual PlayCanvas steps still required (browser only)

1. Create a blank project (Engine V2).
2. Upload the three files (`.mjs` + two `.json`).
3. Create the empty `FlowScopeApp` entity, add a Script component, attach `flowScopeMain`.
4. Assign the two JSON assets to the script's attributes.
5. Disable/delete the template's default Camera and Light entities.
6. Launch; optionally Publish.

Full details in `PLAYCANVAS_IMPORT_GUIDE.md`.

## Assumptions about the current PlayCanvas engine API

- **Engine V2 with ESM scripts** (`Script` base class, `static scriptName`, JSDoc attribute tags `@attribute` / `@type {Asset}` / `@resource json`). This is the current recommended scripting format.
- `Entity.addComponent('render', { type })` primitives used: `box`, `sphere`, `cylinder`, `cone`, `plane`.
- Custom meshes via `new Mesh(device)` + `setPositions/setNormals/setIndices/update(PRIMITIVE_TRIANGLES)` and `MeshInstance`.
- `pc.TorusGeometry` + `Mesh.fromGeometry` are used for rings **inside a try/catch**; on engines without them the code falls back to thin discs.
- `StandardMaterial` metalness workflow (`useMetalness`, `metalness`, `gloss`, `emissive`, `emissiveIntensity`, `blendType`).
- Scene fog API differs between engine generations; the script handles both the object-style (`scene.fog.type`) and property-style (`scene.fog = 'exp2'`) forms defensively.
- `CameraComponent.screenToWorld` / `worldToScreen` operate in canvas CSS pixel coordinates (used for picking and the DOM node labels). On very high-DPI displays labels could be offset; if so this is a known first thing to adjust.
- Input is read from DOM events on the engine canvas (no dependency on `pc.Mouse` being enabled and no physics engine required — picking is pure ray math).
- The HTML dashboard is injected into `document.body`, which works in the Launch page and published builds.
