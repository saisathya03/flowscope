# FlowScope AI — AI-Powered 3D Data Flow Visualization

FlowScope AI is a local, interactive prototype that turns 360 realistic synthetic network-flow records into a futuristic 3D digital office/network. The animated city is the primary view; compact metrics, ML predictions, anomalies, and recommendations support it.

## Cinematic V3 realism update

The V3 rendering pass keeps the dense **FLOW RIVER** presentation and rebuilds **NETWORK CITY** for clearer physical depth: a wider full-scene camera, metallic/rough materials, local architectural lighting, grounded contact shadows, restrained bloom, thinner routes, cleaner labels, and a city-only low-clutter environment. The existing data, controls, analysis, Story Mode, and port remain unchanged.

## What is included

- 360-record CSV and JSON datasets with normal traffic plus all nine requested abnormal conditions
- Interactive Three.js network city with 16 selectable nodes and data routes
- Default **Live Data River** view inspired by fiber-optic data-flow artwork: 56 strands on FAST, 96 on HIGH, and 144 on ULTRA
- 3D source server/database cluster → dense S-shaped data-in-transit river → cloud/AI/storage destination cluster
- Holographic rendering engine with Unreal-style bloom, volumetric beams, glass materials, emissive wireframes, animated scan bands, orbital rings, and a procedural background city
- Animated particles whose size, speed, density, color, route thickness, and glow encode telemetry
- Layered particle halos and trailing light streaks plus shader-driven data pulses inside every current route
- Current solid flows and translucent AI-predicted alternative paths
- Rotate, zoom, pan, pause, department/type/status filters, and speed control
- Clickable nodes and connections with drill-down telemetry
- Instant **FLOW RIVER / NETWORK CITY** view switching from the visualization toolbar
- Nine-step guided Story Mode
- Alert center with pulsing anomaly nodes and affected red routes
- Compact KPI dashboard and 12-hour Chart.js traffic forecast
- Isolation Forest anomaly detection
- Four Random Forest Regression forecasts: traffic volume, network load, latency, and bandwidth
- Rule-based actionable recommendation engine
- Pre-generated ML results, so the UI works immediately after starting the local server

## Project pipeline

```text
Dummy collection → Cleaning/aggregation → Analysis → ML detection/prediction
       → Recommendations → 3D current + predictive flow visualization
```

## Folder structure

```text
ai-3d-data-flow/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   └── vendor/
│       ├── three.module.js
│       ├── three.core.js
│       ├── OrbitControls.js
│       ├── chart.umd.js
│       ├── postprocessing/       # Bloom composer and render passes
│       └── shaders/              # Local post-processing shaders
├── data/
│   ├── network_traffic.csv       # 360 records
│   ├── network_traffic.json      # browser-ready version
│   ├── ml_results.json           # analysis/ML/recommendation output
│   └── data_dictionary.md
├── python/
│   ├── generate_dummy_data.py
│   ├── analyze_and_predict.py
│   └── requirements.txt
├── sample_outputs/
│   └── analysis_summary.txt
├── run_windows.bat
└── run_mac_linux.sh
```

## Run the visualization

Do not double-click `index.html`; browsers block local JSON loading from `file://`. Start the included local web server instead.

### Windows

1. Install Python 3 if it is not already installed.
2. Double-click `run_windows.bat`, or open Command Prompt in this folder and run:

```bat
python -m http.server 8000
```

3. Open <http://localhost:8000>.

### macOS / Linux

```bash
./run_mac_linux.sh
```

Then open <http://localhost:8000>.

All JavaScript libraries are stored inside the project. The visualization does not require an internet connection.

### Updating an existing Cinematic V2 folder

1. Extract `CINEMATIC-V3-SAME-FOLDER-UPDATE.zip` directly inside the existing `ai-3d-data-flow` folder.
2. Allow Windows to replace the existing files while preserving the `css` and `js` subfolders.
3. Keep `python -m http.server 8000` running, or restart it if it was stopped.
4. Open <http://localhost:8000> and press `Ctrl+F5` once to clear the older browser cache.

The update is browser code only. Do not open `run_windows.bat` if Windows warns about it; the Command Prompt command above is sufficient.

### If the loading screen does not finish

Check the Command Prompt window. A request for `/js/vendor/three.core.js` must return `200`, not `404`. The corrected project includes this required Three.js file. After replacing an older copy, stop the server with `Ctrl+C`, restart it, and force-refresh Chrome with `Ctrl+F5`.

## Regenerate the dataset and ML output

The included outputs are ready to use. To create a fresh deterministic copy:

```bash
python -m pip install -r python/requirements.txt
python python/generate_dummy_data.py
python python/analyze_and_predict.py
```

`generate_dummy_data.py` uses seed `42`, creates exactly 360 records, and includes:

- high latency
- server overload
- packet loss
- traffic spikes
- failed connections
- network congestion
- suspicious traffic
- API overload
- database overload

`analyze_and_predict.py` writes `data/ml_results.json`, which the browser reads on startup.

The four Random Forest models estimate the next interval from the current observation. For the prepared overload storyline, nodes with known overload examples receive a documented conservative stress floor after the model baseline. This is labelled in `ml_results.json` as `forecast_method`; it makes the demo scenario visible while avoiding a claim that a small synthetic dataset provides production-grade certainty.

## Visual encoding

| Visual | Data field |
|---|---|
| Particle size | `data_volume_mb` |
| Particle speed | `transfer_speed_mbps` |
| Line thickness | `bandwidth_usage_percent` |
| Glow intensity | `network_load_percent` |
| Direction | Source → destination |
| Particle density | Average traffic concentration |
| Blue | Normal data |
| Cyan | High-speed data |
| Purple | AI/analytics or predicted data |
| Yellow | Critical-priority data |
| Red | Threat, failed, or anomalous data |
| Green | Successfully processed/optimized data |

## Demonstration path

1. Start with the full rotating topology and explain the color legend.
2. Select `Server-02` and show node health and incoming/outgoing traffic.
3. Select a red connection and explain route latency, packet loss, and bandwidth.
4. Filter to `ANOMALY` traffic.
5. Toggle `AI predicted flow` off and on to compare current and future routes.
6. Open the Alert Center.
7. Run Story Mode for the complete data → bottleneck → AI → recommendation → result narrative.

## Holographic quality controls

- **Hologram intensity** controls bloom strength without changing the data.
- **FAST** reduces pixel density and light trails for integrated graphics.
- **HIGH** is the recommended default.
- **ULTRA** uses 2× render density, extra particles, longer trails, and wider bloom. Use it on a dedicated GPU or a recent laptop.

## Visualization modes

- **FLOW RIVER** is the default and matches the dense blue-flow reference style. The hundreds of lines are generated from the filtered route telemetry; their embedded red, yellow, purple and green events remain data-driven.
- **NETWORK CITY** uses the realistic physical-twin treatment with grounded nodes, calmer light, readable routes, and a wider camera that keeps the complete topology in frame. It is automatically used by Story Mode.

## Prototype note

This is a safe demonstration system. It uses only generated data and does not connect to, scan, or control a real company network. Real deployment would replace the JSON loader with authorized telemetry APIs and would require authentication, access controls, privacy review, monitoring, and human approval before automated rerouting.

## System flow (STORY MODE) — functional building story

`STORY MODE` now runs a step-by-step **system flow** in NETWORK CITY (it also auto-plays on load):
Development creates a package → API Gateway authenticates and routes → Server processes (rack LEDs, core,
progress arc, queue lane when `queue_length` is high, colour shift on overload) → Database writes and reads
(ring cascade, stored cube, confirmation ring) → Server assembles the response → Cloud uploads 25 → 60 →
85 → 100 % with a success flash, sparks, energy ring and stored file icons → main routes turn green.
Secondary flows follow: Security Hub scan (pass or block), AI Engine analysis with a translucent predicted
route, IoT Gateway sensor aggregation using the row's `iot_messages`.

Each hop is driven by a real dataset row: the latest row for that source → destination pair, or the
highest-load row when the panel is switched to `ROWS: PEAK LOAD`. Where no direct row exists (there is no
Server-02 → Cloud-01 row) the nearest row of the same node types is used and the panel says so. File names
such as `project_build.zip` are storytelling metaphors; the dataset holds no filenames.

The previous twelve-step anomaly walkthrough is still available from the `SITUATION` button.

## What-If simulation

When a hop's telemetry crosses a threshold (load > 85%, bandwidth > 85%, latency > 120 ms, loss > 3%,
queue > 30, or a failed / congested / suspicious status), the story branches: the flow pauses, the observed
state is shown, the issue is projected forward with an M/M/1 queueing approximation, a translucent purple
alternative is baselined on its own observed rows, a compact before/after card compares the two, a
recommendation is shown, and the optimised route is applied so the story continues on it. Where no peer
exists the layer simulates mitigation on the same node instead; flagged traffic is never rerouted.

Observed, predicted and simulated values are labelled separately in the panel and on every card, and the
dataset is never modified. The `ROWS` button cycles `DEMO STORY` (default), `LATEST` and `PEAK LOAD`.

### Cloud-01 operation states (universal white success glow)

Cloud nodes now carry a reusable operation state controller (`setCloudState`, `cloudOperationSuccess`,
`cloudOperationFailed`, `runCloudOperation`): **IDLE** dark blue · **RECEIVING** blue/cyan pulse ·
**PROCESSING** brighter cyan pulse · **SUCCESS** the whole cloud turns luminous white with a soft bloom,
3–5 white/cyan sparks, one expanding ring and a message, holds about 1.8 s, then fades back to dark blue ·
**FAILED** red warning pulse and message. The white glow fires only when an operation reaches SUCCESS
(file saved, data synchronized, sensor stream stored), never merely because data arrived. Test from the
browser console: `cloudOps.success('Cloud-01', 'Backup Completed ✓')`, `cloudOps.failed('Cloud-01')`.

## Department identity colours (architecture) vs data-flow colours (telemetry)

Two independent colour systems now run side by side in NETWORK CITY.

**Data-flow legend (unchanged, reserved):** blue normal, cyan high speed, purple AI / predicted,
yellow critical priority, red threat / failed / anomalous, green recommended / processed. These stay on
particles, routes, the river, the splat flows, node health states and every operation state.

**Department identity (new, architecture only):** each building carries the muted tone of the department
that owns it, applied to window illumination, entrance and roof trim, thin vertical edge lights, signage
borders, foundation rings and island edge lighting. Main bodies are dark graphite, black-metallic and dark
architectural glass.

| Department | Colour | Buildings |
|---|---|---|
| Development | Copper / burnt orange `#B86B43` | Development tower, Server-01 |
| QA | Soft coral `#C97A72` | QA |
| Finance | Champagne gold `#B89B62` | Finance, Database-01 |
| Management | Pearl silver `#C9CED6` | Management, AI-Engine |
| HR | Dusty rose `#B98291` | HR |
| Operations | Bronze taupe `#8F7863` | Server-02, Server-04, Database-02, Cloud-01, IoT-Gateway |
| IT | Gunmetal silver `#697681` | API-Gateway, Server-03, Security-Hub, shared server platform |

Identity says *who* the building is; the data legend says *what is happening*. A copper Development tower
still sends a blue normal flow, can receive a red anomaly indication and can show a green processed state.
The edge lights and trim are registered as status materials, so an active operation temporarily overrides
them (cyan receiving, brighter cyan processing, green success, amber warning, red error) and the department
identity returns when the building goes idle. Deliberate exceptions that stay on the data legend: the red
bottleneck beacon and ground ring on the predicted-overload server, red aviation obstruction lights, the AI
core and its purple analytics ring, the gateway's light data portal, and the Cloud operation states
(dark blue idle, cyan processing, white success, red failure). The left rail lists both legends.
