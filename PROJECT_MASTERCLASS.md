# FlowScope AI — Project Masterclass

> This document describes the CURRENT implementation of FlowScope AI.
> Code is treated as the primary source of truth. Synthetic data,
> ML output, What-If simulation, visual storytelling, and future
> real-world functionality are explicitly separated.

**Last verified against code: 4 September 2026**

**Verified against:** `index.html` (346 lines), `css/styles.css` (553), `js/app.js` (7,737), `js/splats.js` (300), `python/generate_dummy_data.py` (266), `python/analyze_and_predict.py` (301), `data/network_traffic.csv` (360 rows), `data/network_traffic.json`, `data/ml_results.json`, `data/data_dictionary.md`, and the Three.js vendor files.

### Status tags used throughout

| Tag | Meaning |
|---|---|
| **[IMPLEMENTED]** | Exists and works in the current code |
| **[PARTIALLY IMPLEMENTED]** | Some logic or UI exists, but the behaviour is not complete |
| **[DEMO / VISUAL METAPHOR]** | Storytelling. Does not represent literal telemetry content |
| **[SIMULATED]** | Produced temporarily by What-If or demo logic |
| **[SYNTHETIC DATA]** | Generated dataset used by the prototype |
| **[ML OUTPUT]** | Produced by the machine-learning pipeline |
| **[PLANNED / CONCEPTUAL]** | An idea, not currently implemented |

### Table of contents

Concept and purpose: 1–5 · Buildings and visuals: 6–9 · Data: 10–13 · Code: 14–21 · Machine learning: 22–26 · What-If and story: 27–32 · Reference: 33–42 · Presenting: 43–47 · Viva: 48–53 · Final: 54–55

---

## 1. The Exact Project Concept

The central concept is **DATA MOVEMENT VISUALIZATION**.

Start from zero. Inside any company, computers constantly send data to each other. A staff member opens an application, the application asks a gateway, the gateway asks a server, the server asks a database, and results travel on to cloud and analytics services. That conversation is continuous, and it is completely invisible.

FlowScope AI takes measurements of that conversation and draws it as a city you can watch.

### The seven ideas, kept apart

| Idea | Meaning | Where it lives in this project |
|---|---|---|
| **Data Movement** | **WHAT** we want to understand. Data leaving one system and arriving at another. | The concept behind everything |
| **Network-flow telemetry** | **HOW** we measure that movement. One row of numbers per observation. | `data/network_traffic.csv` and `.json` **[SYNTHETIC DATA]** |
| **3D Network City** | **WHERE** we visually represent it. | The Three.js scene in `js/app.js` **[IMPLEMENTED]** |
| **Analysis** | *What is happening?* Totals, averages, busiest routes, worst routes. | `python/analyze_and_predict.py` and `aggregateData()` **[IMPLEMENTED]** |
| **Anomaly Detection** | *Is something unusual happening?* | Isolation Forest **[ML OUTPUT]** |
| **Prediction** | *What may happen next?* | 4 × Random Forest Regression **[ML OUTPUT]** |
| **What-If Simulation** | *What might happen if conditions change?* | `runWhatIfBranch()` in `js/app.js` **[IMPLEMENTED]**, values **[SIMULATED]** |
| **Recommendation** | *What action could be considered?* | 6 rules in `recommendations_for()` **[IMPLEMENTED, rule-based]** |
| **Decision Support** | The final purpose. A human reads it and decides. | The project deliberately stops here |

### The master mental model

```
DATA              360 flow records, 28 fields each
   ↓
MOVEMENT          who sent what to whom, how fast, in what condition
   ↓
ANALYSIS          totals, averages, busiest and worst routes
   ↓
3D VISUALIZATION  buildings, bridges, particles, colour
   ↓
DETECT            Isolation Forest finds unusual rows
   ↓
PREDICT           Random Forest estimates the next interval
   ↓
SIMULATE          What-If tests a condition and an alternative
   ↓
RECOMMEND         rules turn findings into an action
   ↓
DECIDE            a human acts
```

### Why each stage exists

**DATA** exists because you cannot manage what you do not measure. **MOVEMENT** is the specific thing we measure, because performance and security problems live in the movement between systems, not inside any one box. **ANALYSIS** exists because 360 raw rows mean nothing to a human; averages and rankings do. **3D VISUALIZATION** exists because a spatial picture communicates relationships faster than a table. **DETECT** exists because nobody can write a rule for every possible failure. **PREDICT** exists because reacting after an outage is expensive. **SIMULATE** exists because you should test an option before acting on it. **RECOMMEND** exists to turn a finding into a sentence someone can act on. **DECIDE** stays human because the system has no authority to change infrastructure and should not have it.

---

## 2. Exact Project Goal

**The goal is not "to create a 3D city."** The city is the visualization and communication layer. If the same understanding could be delivered by a table, the table would be fine. The city exists because it delivers it faster.

**The actual goal** is to make invisible backend data movement visible and understandable, identify where problems are occurring, predict possible future problems, simulate possible conditions or alternatives, and provide decision-support recommendations.

| Type of goal | Statement |
|---|---|
| **Technical goal** | Build a pipeline that converts flow telemetry into a spatial model, runs anomaly detection and forecasting over it, and exposes a What-If layer that projects alternatives, all reproducibly. |
| **Business / user goal** | Give a mixed audience of managers, developers, network engineers and analysts one shared picture of where data is moving, where it is at risk, and what could be done about it. |
| **Visualization goal** | Encode volume, speed, direction and health simultaneously, so a non-specialist can read the state of the infrastructure at a glance while specialists can still drill into exact numbers. |
| **AI goal** | Flag unusual behaviour without being told what to look for, estimate the next interval, and project the consequences of a hypothetical change, always labelled honestly. |
| **Final one-sentence goal** | **To make invisible backend data movement visible, understandable, predictive and actionable, so that a human can make a faster and better decision.** |

---

## 3. Real-World Problem

### Where data moves in a company

Departments and applications, API gateways, application servers, databases, cloud services, AI and analytics services, IoT systems, and security systems. Every one of these talks to several others, all day.

### What engineers normally use

Logs, metrics, tables, monitoring dashboards, alerts and network tools. These are excellent and they are not being replaced. **FlowScope AI is an additional visualization and decision-support layer, not a replacement for professional monitoring.** Say this plainly if anyone asks; it is the technically correct answer.

### Why it becomes hard to hold in your head

A single flow carries at least ten linked facts at once:

| Fact | Question it answers |
|---|---|
| Source | Who sent it? |
| Destination | Who received it? |
| Volume | How much? |
| Speed | How fast? |
| Bandwidth | How full was the link? |
| Latency | How long did the network take? |
| Load | How stressed were the systems? |
| Queue | How many requests were waiting? |
| Packet loss | How much did not arrive? |
| Connection status | Did it even work? |

One row is readable. Twenty-four routes across sixteen systems, each with those ten facts changing every twelve minutes, is not. In a dashboard each fact lives in its own panel, so joining them into one story happens inside the engineer's head, under time pressure, during an incident. Direction is the worst casualty: a table can tell you latency is 185 ms, but not that the delay is on the path *into* the database rather than out of it.

### What FlowScope AI adds

It builds a **visual mental model**. The topology becomes a place. Direction becomes motion. Volume becomes size. Health becomes colour. Because the picture is spatial and persistent, people build a memory of it, so "Server-02 is red again" means something to the whole room, not just to the person reading the dashboard.

---

## 4. Practical Backend Data Flow

A realistic simplified request path, which is also the path the project's main story follows:

```
User / Development
      ↓          a person uses an application and it produces a request
API Gateway
      ↓          the single entrance: it checks the request and decides where it goes
Application Server
      ↓          the business logic runs here; it needs stored data
Database
      ↓          the data is read or written and the answer is returned
Application Server
      ↓          the answer is assembled into a result
Cloud / downstream service
                 the result is stored, published or handed to another service
```

**What happens at each stage**

- **User / Development.** Someone triggers work: opening a screen, deploying a build, running a report. This is where a request is born.
- **API Gateway.** One controlled front door. It typically authenticates the caller, applies rate limits, and routes the call to whichever server should handle it. Having one door means security and routing are decided in one place.
- **Application Server.** The machine that runs the actual logic. It is where load, queueing and processing time appear, so it is usually where slowness is first felt.
- **Database.** Persistent storage. Reads and writes are often the slowest part of a request, so a database under pressure affects everything upstream.
- **Application Server again.** The result comes back and is combined into a final response.
- **Cloud / downstream.** Storage, backup, analytics or another service consumes the result.

**Important honesty note.** Real architectures vary enormously. Many use message queues, caches, microservice meshes, serverless functions or event streams, and many requests never touch a database at all. This is one common, teachable shape, and the project's topology models this shape. Do not claim every company request follows this exact route.

---

## 5. Network City — Why a City?

### The mapping

| City element | Represents |
|---|---|
| **Building** | A system, component or department |
| **Road / route (bridge or sky arc)** | A logical communication relationship between two systems |
| **Moving particles** | Data movement along that relationship |
| **Building activity** (LEDs, spinning cores, rings) | The system's function and current state |
| **Building warning** (yellow, red, pulsing ring) | A problem at that system |
| **The city seen from above** | The whole infrastructure at once |

### Why spatial representation helps

Humans are extremely good at space and very bad at long lists. You remember where your front door is without effort; you do not remember row 47 of a table. A spatial layout gives four advantages here:

1. **Relationships become visible.** You can see that four routes all converge on one server, which is the definition of a single point of failure. No table shows that shape.
2. **Direction becomes obvious.** Particles travel from source to destination, so you can see which way the pressure flows.
3. **Position becomes memory.** After two minutes the audience knows where Server-02 is. From then on, a red glow there is instantly meaningful.
4. **Everyone reads the same picture.** A manager and a network engineer can point at the same building and be talking about the same thing.

### What it costs, and how the project handles that

A city trades precision for comprehension. A red building tells you something is wrong but not that latency is 227.79 ms. The project handles this by keeping exact numbers one click away: `showNodeDetails()` opens the Node Inspector and `enterRouteFocus()` floats the exact route metrics in 3D. **[IMPLEMENTED]**

---

## 6. Every Building / Node

There are exactly **16 nodes**, defined in `NODE_CONFIG` at the top of `js/app.js`. Positions are **hand-placed constants**, chosen to match `reference-network-city.png`; they are **not** calculated from data.

Shared visual state machine, set by `setBuildingState(id, mode)` **[IMPLEMENTED]**:

| Mode | Visual |
|---|---|
| `idle` | Department accent colour, normal light |
| `receiving` | Cyan, input ring on the ground |
| `processing` | Brighter cyan, boosted local light, building-specific animation |
| `success` | Green, green ground ring |
| `warning` | Yellow, yellow ground ring |
| `error` | Red, larger red ground ring |

Cloud nodes are the exception: they are routed to their own controller (see section 16).

### 6.1 Development

| Field | Value |
|---|---|
| **Name / Type / Role** | `Development` · `Department` · Origin of work |
| **Represents** | A development team and its applications |
| **Input** | None. It is a starting point in the dataset |
| **Function** | Creates requests, builds and files |
| **Output** | `Development → API-Gateway` (26 rows, 233.6 MB average, the third-largest route by volume) |
| **Normal visual** | 14-floor glass tower, copper `#b86b43` window and trim accents, position (−42, 6) |
| **Processing visual** | Monitors blink, tower windows glow, a package appears and moves to the entrance **[DEMO / VISUAL METAPHOR]** |
| **Success / Warning / Failure** | Green / yellow / red ground ring via `setBuildingState()` |
| **Dataset fields** | `data_volume_mb`, `transfer_speed_mbps`, `api_requests`, `data_priority` |
| **Code** | `buildDevelopmentTower()`, phase `CREATE_FILE` |

### 6.2 QA, HR, Finance, Management

| Field | Value |
|---|---|
| **Type / Role** | `Department` · Other business units |
| **Represents** | QA testing, HR systems, Finance systems, Management reporting |
| **Output routes** | `QA → API-Gateway` (13 rows), `HR → Server-01` (7), `Finance → Database-01` (8), `Management → AI-Engine` (7) |
| **Input** | Management also receives: `Cloud-01 → Management` (13 rows) |
| **Normal visual** | Small blocks on minor islands, scaled 1.5×, with their department accent: QA coral `#c97a72`, HR dusty rose `#b98291`, Finance champagne gold `#b89b62`, Management pearl silver `#c9ced6` |
| **Code** | `buildDepartment()` via `buildScaled()` |

### 6.3 API-Gateway

| Field | Value |
|---|---|
| **Type / Role** | `API` · The single controlled entrance |
| **Represents** | An API gateway: authentication, rate limiting and routing |
| **Input** | `Development → API-Gateway` (26), `QA → API-Gateway` (13) |
| **Function** | Receives, authenticates, routes, accepts |
| **Output** | To `Server-01` (23), `Server-02` (26), `Server-03` (14), `Security-Hub` (8), plus `Database-01` (2) and `Database-02` (1) which exist only because the Database Overload injection rewrote the destination |
| **Normal visual** | A large vertical ring on a heavy base. Routes pass **through the centre** of the ring along `API_AXIS`. Gunmetal `#697681` structure with a pale blue aperture |
| **Processing visual** | Portal opens, packet pauses in the centre, two scanner rings counter-rotate, `AUTH ✓` / `ROUTE ✓` / `ACCEPTED` stack up **[DEMO / VISUAL METAPHOR]** |
| **Warning / Failure** | Ground pulse turns yellow then red; packets stack in front of it |
| **Dataset fields** | `api_requests`, `queue_length`, `access_permission`, `threat_level`, `network_load_percent` |
| **Code** | `buildGatewayRing()`, phases `API_AUTH` and `API_ROUTE` |

### 6.4 Server-01, Server-02, Server-03, Server-04

| Field | Value |
|---|---|
| **Type / Role** | `Server` · Application logic |
| **Represents** | Machines running business logic |
| **Input** | From the gateway, plus `HR → Server-01` (7) and `IoT-Gateway → Server-02` (18) |
| **Function** | Receive, queue, process, complete |
| **Output** | `Server-01 → Database-01` (14) and `→ Database-02` (12); `Server-02 → Database-01` (27, the single busiest route) and `→ Database-02` (26); `Server-03 → Cloud-01` (21); `Server-04 → Database-02` (16) |
| **Normal visual** | Rack cabinets of different heights on one shared island: Server-01 10.4 units, Server-02 13.2, Server-03 9.2, Server-04 6.6 wide and low. Server-01 copper, Server-02 and Server-04 bronze `#8f7863`, Server-03 gunmetal |
| **Processing visual** | Rack LEDs light bottom to top, a core spins, data lines climb the facade, a progress arc fills |
| **Warning** | Colours shift cyan → yellow; if `queue_length > 20`, waiting packets appear in an intake lane and are drawn in one at a time |
| **Failure / Critical** | Colours shift to red, a heat shimmer appears, a red ring expands |
| **Special case** | Server-02 additionally carries a **red alert cluster** (beacon, vertical strips, ground ring) because it is the predicted bottleneck. That styling is fixed in `buildServerTower()` via `spec.beacon` **[DEMO / VISUAL METAPHOR]** |
| **Dataset fields** | `network_load_percent`, `queue_length`, `response_time_ms`, `active_connections`, `latency_ms` |
| **Code** | `buildServerTower()`, `makeServerOverlay()`, phases `SERVER_PROCESS` and `SERVER_RESPONSE` |

### 6.5 Database-01, Database-02

| Field | Value |
|---|---|
| **Type / Role** | `Database` · Persistent storage |
| **Represents** | Databases answering queries and storing records |
| **Input** | From the servers, plus `Finance → Database-01` (8) |
| **Function** | Read, write, confirm |
| **Output** | `Database-01 → AI-Engine` (11), `Database-02 → AI-Engine` (13) |
| **Normal visual** | Five-floor cylindrical vaults with storage rings and a rotating roof disk. Database-01 champagne gold (Finance), Database-02 bronze (Operations) |
| **Processing visual** | Rings light top to bottom, a glowing cube sinks into the core, rings compress, a green spark fires, an expanding ring confirms |
| **Success** | "Record Saved ✓" / "Data returned" |
| **Warning / Failure** | Ring colour follows `recordTone()`: yellow above 70 % load, red on an anomaly or above 88 % |
| **Dataset fields** | `database_queries`, `queue_length`, `latency_ms`, `network_load_percent` |
| **Code** | `buildDatabaseVault()`, phases `DATABASE_WRITE` and `DATABASE_READ` |

### 6.6 Cloud-01

| Field | Value |
|---|---|
| **Type / Role** | `Cloud` · External hosted services |
| **Represents** | Cloud storage and services |
| **Input** | `Server-03 → Cloud-01` (21), `AI-Engine → Cloud-01` (21), `IoT-Gateway → Cloud-01` (24), `Security-Hub → Cloud-01` (9). It receives 11,767 MB, more than any other node |
| **Function** | Receive, process, confirm success or failure |
| **Output** | `Cloud-01 → Management` (13) |
| **Visual states** | Its own six-state controller. See section 16 |
| **Dataset fields** | `data_volume_mb`, `network_load_percent`, `latency_ms`, `queue_length` |
| **Code** | `buildCloudFacility()`, `registerCloud()`, `setCloudState()`, `cloudOperationSuccess()`, `cloudOperationFailed()` |

### 6.7 AI-Engine

| Field | Value |
|---|---|
| **Type / Role** | `AI` · Analytics and model service |
| **Represents** | An analytics or inference service inside the company |
| **Input** | `Database-01 → AI-Engine` (11), `Database-02 → AI-Engine` (13), `Management → AI-Engine` (7) |
| **Function** | Analyse, produce a projection |
| **Output** | `AI-Engine → Cloud-01` (21) |
| **Normal visual** | A glass pyramid on a hexagonal base, pearl silver frame and trim (Management), with a floating purple core and orbiting rings |
| **Processing visual** | Purple particles spiral inward, an orbit ring turns, neural links glow, a small waveform panel appears |
| **Output visual** | A translucent purple orb and a dashed purple predicted route toward Cloud-01 |
| **Dataset fields** | `ai_requests`, plus its own entry in `ml_results.predictions` |
| **Code** | `buildAiPyramid()`, phase `AI_ANALYZE` |
| **Critical distinction** | This building is a **visual representation** of an analytics service in the modelled company. **It is not the project's own machine learning.** The project's ML runs in Python, offline. See section 21 |

### 6.8 Security-Hub

| Field | Value |
|---|---|
| **Type / Role** | `Security` · Inspection checkpoint |
| **Represents** | A security inspection function |
| **Input** | `API-Gateway → Security-Hub` (8) |
| **Function** | Scan, then allow or block |
| **Output** | `Security-Hub → Cloud-01` (9) |
| **Normal visual** | A compact hardened block with vents and a rotating core, gunmetal (IT) |
| **Processing visual** | A laser bar sweeps up and down, a wireframe shield appears around the packet |
| **Allow** | Shield turns green, "Security scan passed ✓", the packet continues |
| **Block** | Shield turns red, the packet stops and shrinks, the route turns red, "Threat detected — Route blocked" |
| **Dataset fields** | `threat_level`, `access_permission`, `data_classification`, `anomaly_status` |
| **Code** | `buildSecurity()`, phase `SECURITY_SCAN` |
| **Honesty** | Blocking is **visual simulation only**. See section 20 |

### 6.9 IoT-Gateway

| Field | Value |
|---|---|
| **Type / Role** | `IoT` · Device and sensor gateway |
| **Represents** | The collection point for device telemetry |
| **Input** | Sensors. There are no inbound rows in the dataset; it only sends |
| **Function** | Collect many small messages, aggregate them |
| **Output** | `IoT-Gateway → Server-02` (18), `IoT-Gateway → Cloud-01` (24) |
| **Normal visual** | A tall lattice mast, 18.5 units, with dishes, a rotating radar and red aviation obstruction lights. Bronze accents (Operations) |
| **Processing visual** | Six small sensor posts around the base emit dots that fly in and merge into one larger packet |
| **Output message** | The real `iot_messages` value of the active row, for example "137 messages aggregated" |
| **Dataset fields** | `iot_messages`, `data_volume_mb` |
| **Code** | `buildIotTower()`, phase `IOT_AGGREGATE` |

### Route count

**24 unique source-to-destination routes.** 22 are declared in the `ROUTES` table in `python/generate_dummy_data.py`; the other two (`API-Gateway → Database-01` and `API-Gateway → Database-02`) exist only because the Database Overload injection rewrites the destination. **[SYNTHETIC DATA]**

---

## 7. Department Building Color System

### The principle

> **BUILDING COLOR = identity. WHO the building represents.**
> **FLOW COLOR = status. WHAT is happening to the data.**

These are two independent systems and they never mix. A copper Development tower can still send a blue normal flow, receive a red anomaly indication and show a green success state.

### The implemented palette

From `DEPARTMENT_COLORS` in `js/app.js`. These are the exact hex values in the code. **[IMPLEMENTED]**

| Department | Name | Hex | Buildings that carry it |
|---|---|---|---|
| Development | Copper / burnt orange | `#b86b43` | Development, Server-01 |
| QA | Soft coral | `#c97a72` | QA |
| Finance | Champagne gold | `#b89b62` | Finance, Database-01 |
| Management | Pearl silver | `#c9ced6` | Management, AI-Engine |
| HR | Dusty rose | `#b98291` | HR |
| Operations | Bronze taupe | `#8f7863` | Server-02, Server-04, Database-02, Cloud-01, IoT-Gateway |
| IT | Gunmetal silver | `#697681` | API-Gateway, Server-03, Security-Hub |

There is also `DEPARTMENT_NEUTRAL = 0x697681`, used for shared infrastructure. The server island holds buildings from three departments, so the island itself stays neutral gunmetal.

### Where the colour is applied

Only to **selected architectural elements**: window illumination, entrance and roof trim, thin vertical edge lights, signage plate borders, foundation rings and island edge lighting. Applied through `ctx.accent = departmentColor(config.id)` in `buildNodes()`, which flows into every builder.

### Dark architecture

The main bodies are **dark graphite, black-metallic and dark architectural glass**. The base material colours in `ensureCityMaterials()` and `ensureRealismMaterials()` were darkened for this: `paintedMetal` `#454c56`, `paintedDark` `#2c323a`, `panel` `#333a45`, `glassWall` `#4d6070`, `glassAtrium` `#3f5666`, `foundationSide` `#363c44`. The procedural seam, window and floor-plate texture base tones were darkened to match. This produces an enterprise digital-twin look rather than a neon one. **[IMPLEMENTED]**

### Identity yields to state, then returns

The edge lights, trim and status rings are registered as **status materials**. When an operation runs, `setNodeStatusColor()` temporarily overrides them with the state colour (cyan, green, amber or red), and the department identity returns when the building goes idle. **[IMPLEMENTED]**

### Deliberate exceptions that stay on the data legend

These are on purpose, and you should be able to name them:

- The **red beacon, vertical strips and ground ring on Server-02**, because it is the predicted bottleneck.
- **Red aviation obstruction lights** on tall masts, which is real-world realism, not a data colour.
- The **purple AI core** and its analytics rings, because purple means AI in the flow legend.
- The **pale blue aperture** in the gateway ring, because it is the data portal.
- The **Cloud-01 operation states**, which have their own six colours.

### In the UI

The left rail shows two legends. Data colours are drawn as **round glowing dots**; department colours are drawn as **square matte swatches**, so they cannot be confused. CSS rule: `.dept-legend .color-key .dot { border-radius: 2px; box-shadow: none; }` **[IMPLEMENTED]**


---

## 8. Why Particles?

> **Particles are a visual representation of measured data movement. They should not automatically be interpreted as literal individual network packets.**

This is the single most likely trap question, so know the reasoning. Each route draws between 3 and 14 particles, and that count is computed from the route's **average megabytes**. One particle therefore stands for a share of the traffic, not a countable unit. A route carrying 233 MB does not draw 233 million packets; it draws about 5 dots whose size and speed encode the measurement.

### The implemented mapping

Every row below was read out of `js/app.js`. Nothing here is invented.

| Telemetry field | Visual property | Code location | Human meaning |
|---|---|---|---|
| `data_volume_mb` | Particle **size** | `addConduit()` line 2872: `size = (.26 + clamp(volume / 2600, .02, .18)) * sizeScale` | Bigger dot = more data moved |
| `data_volume_mb` | Particle **count** | `addConduit()` line 2871: `count = clamp(round((volume / 45) * density), 3, particleLimit)` | More dots = more data moved |
| `transfer_speed_mbps` | Particle **speed** | `addConduit()` line 2883: `speed = .03 + route.speed / 9000` | Faster dot = higher transfer speed |
| `source_id → destination_id` | **Direction** | `animate()`: `phase` runs 0 → 1 along a curve from the source port to the destination port | Data travels the way the arrow points |
| `bandwidth_usage_percent` | Route **thickness** | `buildStoryRoute()` line 5040: `radiusScale = .8 + clamp(bandwidth / 100, 0, 1) * .7` | Thicker pipe = more of the link in use |
| `network_load_percent` | Route **glow** | `buildStoryRoute()` line 5040: `glowScale = .6 + clamp(networkLoad / 100, 0, 1) * 1.2` | Brighter = system under more load |
| Endpoint busyness | Particle **density thinning** | `buildCurrentFlows()`: `density = clamp(1.18 - overlap * .05, .5, 1)` | Busy hubs are thinned so the picture stays readable |
| Status fields | **Colour** | `flowColor()` line 2688 | See section 33 |

### Numerical examples

**Small route.** `API-Gateway → Security-Hub` averages **68.5 MB**.
Count = `round(68.5 / 45)` = 2, raised to the floor of **3 particles**.
Size = `.26 + 68.5/2600` = **0.29**.
Result: a thin, quiet trickle.

**Large route.** `API-Gateway → Server-03` averages **339 MB**.
Count = `round(339 / 45)` = **8 particles** before the density factor.
Size = `.26 + 339/2600` = **0.39**.
Result: a thick, busy stream of noticeably bigger dots.

**Fast versus slow.** At **562 Mbps** a particle advances `.03 + 562/9000` = **0.092** of the route each second, crossing in about **11 seconds**. At **163 Mbps** it advances **0.048**, taking about **21 seconds**. The audience feels the difference without reading a number.

**Thickness.** At **32 % bandwidth** the story route radius scale is `.8 + 0.32 × .7` = **1.02**. At **95 %** it is **1.47**, roughly 44 % fatter.

### Two honest limitations you should state

1. **Thickness and glow are data-driven only on the story routes, the Flow River tubes and the splat view.** The ordinary bridges in the free-explore city use a **fixed radius of 0.36** and a fixed glow. There, load and bandwidth are communicated by colour and by the inspector instead. **[PARTIALLY IMPLEMENTED]**
2. **Density is reduced, not increased, at busy hubs.** The `density` factor drops to as low as 0.5 when many routes touch the same building. That is a legibility choice, not a statement about the data.

---

## 9. Particle Life Cycle

### Where a particle is created

In `addConduit()` for bridge routes and `addSkyArc()` for elevated routes. Both call `acquireParticle(color, size, opacity)`, which takes an object from `particlePool.bodies` if one is free and only builds a new one when the pool is empty. Each particle is a `THREE.Group` containing a small sphere core and a glow sprite, plus 1 to 4 trailing sprites from `acquireTrail()`.

### How source and destination are selected

They are not chosen by the particle. They come from the **route**. `aggregateData()` groups all 360 rows by `source_id → destination_id`, producing 24 entries in `state.routeStats`, each with its own averages. `buildCurrentFlows()` then walks those routes, filters them through `routeVisible()`, and creates particles for the ones that pass.

### How the path is calculated

`makeConduitCurve(source, destination, index)` builds a Catmull-Rom curve that starts at the source's port, rises to bridge height 2.95, applies a lane offset of ±1.7 so parallel routes do not overlap, and lands at the destination's port. The API Gateway is special: `nodePort()` returns a point on the ring's axis, so the curve passes **through the centre of the ring**.

If the curve would cross an unrelated island (`curveCrossesForeignIsland()`), or if the conduit budget is used up (9 on FAST, 14 on HIGH, 16 on ULTRA), the route becomes a **sky arc** instead via `makeSkyArc()`: a dashed line plus a thin glowing tube high above the city.

### How it moves

In `animate()`, once per frame:

```js
item.phase = (item.phase + delta * item.speed * state.flowSpeed) % 1;
item.object.position.copy(item.curve.getPoint(item.phase));
```

`phase` is a number from 0 to 1 representing progress along the curve. Because it wraps with `% 1`, a particle that reaches the destination reappears at the source. Trailing sprites are placed at slightly earlier phases, which produces the comet tail.

### How speed affects movement

`item.speed` was fixed at creation as `.03 + route.speed / 9000`. The per-frame increment is `delta × speed × state.flowSpeed`, so the **simulation speed slider** multiplies every particle at once without changing any data.

### What happens when it reaches a building

Nothing physical. The phase wraps and the particle restarts. There is no collision detection and no arrival event on ordinary routes. **Arrival behaviour only exists inside the story**, where `flowTravel()` drives a single scripted packet along a curve for a measured duration and then hands control to the next phase.

### When it is removed or reused

`releaseParticles(list)` detaches the bodies and trails and pushes them back into `particlePool` for reuse. This happens on any rebuild: changing a filter, changing render quality, restarting the story, or switching view mode. Pooling is why changing a filter does not stutter.

### How Story Mode controls particles

The story does not reuse the free-explore particles. `applyFlowVisibility()` hides `currentLayer` while the story is active and shows `storyLayer` or `flowLayer` instead. `buildStoryRoute()` creates route entries whose particle count comes from `active_connections / 40` rather than volume, and sets `item.speedScale`, a second multiplier the story uses to slow a route down. `runOptimizationTween()` hides particles one at a time to animate traffic migrating.

### How anomaly and prediction states affect particles

- **Anomaly.** `flowColor()` returns red and `addConduit()` passes `anomalous: 1` into the shader's `uPulse` uniform, which makes the tube throb.
- **What-If pause.** `setEntrySpeed(entry, .05)` slows the affected route's particles almost to a stop while the observed state is displayed.
- **Prediction.** Predicted routes have their own particles in `predictedLayer`, always purple, created by `buildPredictedFlows()`.
- **Simulation.** `buildSimulatedRoute()` creates a translucent purple dashed arc with its own particles, removed when the branch ends.
- **Route focus.** `tweakParticle()` dims and hides a proportion of other routes' particles so the selected route stands out.

---

## 10. Complete Dataset Masterclass

### The file

| Property | Value | Source |
|---|---|---|
| Records | **360** | `RECORD_COUNT = 360` |
| Columns | **28** | the `FIELDS` list |
| Sampling interval | **12 minutes** | `start + timedelta(minutes=12 * i)` |
| Time range | 2026-08-25 06:00 UTC to 2026-08-28 05:48 UTC | computed from the above |
| Generation | Synthetic | `python/generate_dummy_data.py` **[SYNTHETIC DATA]** |
| Seed | **42** | `SEED = 42`, so the file is byte-identical on every regeneration |
| Systems | 16 | the `NODES` table |
| Routes | 24 unique pairs | 22 declared + 2 created by injection |
| Problem rows | **28** | one injected every 13th row, cycling 9 types |
| Business rhythm | Peak at 13:30, ×0.48 outside 07:00–21:00 | `business_factor` |

### A. Flow identity

| Field | Type | Meaning | Example | How the project uses it |
|---|---|---|---|---|
| `timestamp` | datetime | When observed | `2026-08-25T07:00:00Z` | Ordering, hour features for the model, 4-hour forecast buckets, story record selection |
| `source_id` | text | Sending system | `Development` | Route key, node stats, one-hot model feature, particle origin |
| `source_type` | category | Sender class | `Department` | TYPE filter, purple AI rule, model feature |
| `source_department` | category | Owning team | `Development` | DEPT filter, department building colour |
| `destination_id` | text | Receiving system | `API-Gateway` | Route key, node stats, particle destination |
| `destination_type` | category | Receiver class | `API` | TYPE filter, What-If issue classification |
| `destination_department` | category | Owning team | `IT` | DEPT filter |

### B. Performance

| Field | Type | Meaning | Example | How the project uses it |
|---|---|---|---|---|
| `data_volume_mb` | number, MB | Data moved in the interval | `101.49` | **Particle size and count**, TOTAL TRAFFIC KPI, an ML prediction target |
| `transfer_speed_mbps` | number, Mbps | Effective speed | `337.01` | **Particle speed**, cyan colour rule above 500 |
| `bandwidth_usage_percent` | number, 0–100 | Share of link capacity used | `36.63` | Route thickness in story routes, BANDWIDTH KPI, an ML target |
| `latency_ms` | number, ms | Network delay | `33.73` | AVG LATENCY KPI, red rule above 90, node health, What-If threshold at 120, an ML target |
| `packet_loss_percent` | number, 0–100 | Share not delivered | `0.05` | PACKET LOSS metric, red rule above 3, alert severity ×3 |
| `network_load_percent` | number, 0–100 | Stress on the systems involved | `33.67` | NETWORK LOAD KPI, node health, What-If threshold at 85, an ML target, the primary What-If input |
| `active_connections` | integer | Concurrent connections | `220` | CONNECTIONS KPI (**last row only**), story particle count |

### C. Workload

| Field | Type | Meaning | Example | How the project uses it |
|---|---|---|---|---|
| `response_time_ms` | number, ms | Full application turnaround | `51.28` | Node Inspector, alert severity, story lines |
| `queue_length` | integer | Requests waiting | `2` | Story queue lane above 20, What-If threshold at 30, model feature |
| `processing_rate` | number | Effective throughput | `237.65` | Aggregated and shown in the story; the "records/second" unit in the data dictionary is not really supported by the generator formula |
| `api_requests` | integer | API operations | `402` | API TRAFFIC metric (sum 94,333) |
| `database_queries` | integer | Database operations | `22` | DB QUERIES metric (sum 61,218) |
| `ai_requests` | integer | AI operations | `8` | AI REQUESTS metric (sum 14,267) |
| `iot_messages` | integer | Device messages | `2` | The IoT aggregation count in the story |

### D. Security and governance

| Field | Type | Meaning | Example | How the project uses it |
|---|---|---|---|---|
| `data_priority` | category | Low / Normal / High / Critical | `Critical` | Yellow colour rule, story packet colour |
| `data_classification` | category | Public / Internal / Confidential / Restricted | `Confidential` | Security scan label; not otherwise shown |
| `access_permission` | category | Open / Employee / Role-Based / Privileged / Denied | `Role-Based` | Security block condition when Denied |
| `threat_level` | category | Low / Medium / High / Critical | `Low` | Red colour rule when Critical, node threat pill, What-If threat scenario |

### E. Health and status

| Field | Type | Meaning | Example | How the project uses it |
|---|---|---|---|---|
| `connection_status` | category | Connected / Degraded / Failed | `Connected` | Red rule when Failed, broken conduit drawing, What-If failure scenario |
| `route_status` | category | Optimal / Congested / Rerouted / Blocked | `Optimal` | Recommendation rule 4, alert wording, Connection Inspector, What-If congestion |
| `anomaly_status` | category | `Normal` or one of nine problem names | `Normal` | ANOMALIES KPI (28), ANOMALY filter, red rules, alert type, recommendation rules |

**The nine problem names:** High Latency, Server Overload, Packet Loss, Traffic Spike, Failed Connection, Network Congestion, Suspicious Traffic, API Overload, Database Overload.

**Critical honesty point.** `anomaly_status` is written by the **generator**, not by the AI. The Isolation Forest never sees it. Say "28 labelled problem events in the dataset", never "the AI found 28 anomalies".

### Three real rows explained

**Row 1 — a healthy flow.** Line 7 of `data/network_traffic.csv`:

```
2026-08-25T07:00:00Z, Development, Department, Development, API-Gateway, API, IT,
101.49, 337.01, 36.63, 33.73, 0.05, 33.67, 220, 51.28, 2,
Critical, Confidential, Role-Based, Low, Connected, Optimal, 237.65, 402, 22, 8, 2, Normal
```

*This row means:* at 7 a.m. on 25 August, the Development department sent 101.49 MB to the API Gateway, which IT owns. It moved at 337 Mbps and used 36.6 % of the link. The network delay was 33.7 ms and almost nothing was lost, 0.05 %. The systems sat at 33.7 % load with 220 open connections, and the application answered in 51.3 ms with only 2 requests waiting. The content was Critical priority and Confidential, so role-based access applied. Security risk was Low, the connection was healthy and the route optimal. The receiving side processed about 238 records a second, and the traffic was 402 API calls, 22 database queries, 8 AI requests and 2 device messages. **Nothing was wrong.** This is the kind of row a normal blue flow is drawn from.

**Row 2 — an overload.** Line 93, the row the What-If demo uses:

```
2026-08-26T00:12:00Z, API-Gateway, API, IT, Server-02, Server, Operations,
118.6, 562.13, 32.56, 44.56, 0.23, 95.52, 228, 170.9, 51,
Normal, Restricted, Privileged, Medium, Degraded, Optimal, 524.55, 321, 10, 15, 2, API Overload
```

*This row means:* just after midnight, the gateway pushed 118.6 MB to Server-02 at a healthy 562 Mbps, but **the systems were at 95.52 % load** with **51 requests queued**, and the application now took **170.9 ms** to answer instead of the usual 50. The connection is marked **Degraded**, the data was Restricted and required Privileged access, security risk was Medium, and the event is labelled **API Overload**. **This is a system running out of capacity**, and it is exactly what triggers the What-If branch.

**Row 3 — a report going out.** Line 313:

```
2026-08-27T20:12:00Z, Cloud-01, Cloud, Operations, Management, Department, Management,
105.79, 714.92, 37.98, 47.62, 0.27, 34.93, 196, 78.96, 1,
Normal, Internal, Employee, Low, Connected, Optimal, 771.28, 12, 12, 12, 0, Normal
```

*This row means:* in the evening, Cloud-01 sent 105.8 MB back to Management at a fast 715 Mbps. Delay 47.6 ms, loss negligible, systems at 34.9 % load with 196 connections and only 1 item queued. The content was Internal and needed only employee-level access. Almost no API, database or AI work was involved (12 each) and no device messages. **A healthy reporting flow at the end of the working day.**

---

## 11. Synthetic Data — Why?

The dataset is **entirely synthetic**, produced by `python/generate_dummy_data.py`. **[SYNTHETIC DATA]**

### Why synthetic was the right choice

| Reason | Explanation |
|---|---|
| **Safe development** | No permission is needed, no real system is touched, and no confidential or personal information can leak into a student project. |
| **Reproducibility** | `SEED = 42` means the file is identical every time. The demo, the screenshots and the numbers in this document all match, every run. |
| **Controlled anomalies** | Real failures are rare and unpredictable. Here all nine problem types are guaranteed present, injected every 13th row, so anomaly handling can actually be demonstrated. |
| **Presentation consistency** | The story picks the same record every time, so the demo never depends on luck. |
| **Realistic shape** | The generator models a working day: a `business_factor` peaking at 13:30 and dropping to 0.48 outside 07:00–21:00, so the traffic has a believable rhythm rather than being uniform noise. |

### Its limitations, stated honestly

- It **does not prove real production performance**. Nothing here demonstrates how the system behaves at real scale.
- It **does not represent any specific company's real network**. The topology is a teaching model.
- It contains **no real employee or customer traffic**, no real addresses, no real content.
- Because rows are generated largely independently, there is very little genuine time-series structure to learn, which is the main reason the forecast scores are weak (section 24).

### How to say it

*"The dataset is synthetic, generated with a fixed seed so my demonstration is reproducible and so that all nine failure types are guaranteed to appear. It proves the pipeline works; it does not prove production performance."*

---

## 12. Localhost — Complete Explanation

### What is localhost?

`localhost` is a name that always points back to **the computer you are sitting at**. `http://localhost:8000` means "ask a program running on my own machine, on port 8000, for a file". Nothing leaves the machine and no internet connection is involved.

### What is the local HTTP server?

It is one command:

```
python -m http.server 8000
```

That is the entire content of `run_windows.bat` and `run_mac_linux.sh`. Python's built-in module serves files from the current folder over HTTP. **It has no database, no login and no application logic. It only hands over files.**

### Why can't we just double-click index.html?

Because browsers block two things on a `file://` page for security:

1. **`fetch()` of local files.** `js/app.js` lines 142–143 call `fetch('./data/network_traffic.json')` and `fetch('./data/ml_results.json')`. From `file://` the browser refuses this as a cross-origin request.
2. **JavaScript modules.** `index.html` loads the app with `<script type="module" src="./js/app.js">`, and module loading is also blocked on `file://`.

Serving the folder over HTTP satisfies both.

### Who does what

| Component | Responsibility |
|---|---|
| **The browser** | Requests files, runs the JavaScript, draws the WebGL canvas, handles mouse and keyboard |
| **`index.html`** | The page skeleton: loading screen, KPI strip, left control rail, the 3D stage, right AI panel, the flow and situation panels, the alerts dialog. It contains an `importmap` that points the bare name `three` at `./js/vendor/three.module.js`. It holds **no application logic** |
| **`css/styles.css`** | Colours, fonts, panel positions, and the `immersive` layout that hides the side rails in city mode |
| **`js/app.js`** | Everything else: loading, aggregation, scene construction, the story, What-If, all interaction |
| **Three.js** | Turns the scene description into WebGL draw calls. Also `OrbitControls` for the camera and `UnrealBloomPass` for the glow |
| **Chart.js** | Draws the 12-hour trend line in the right panel |
| **Network data** | `data/network_traffic.json`, fetched at startup |
| **ML results** | `data/ml_results.json`, fetched at startup |

### Does Python run when the browser loads?

**No.** This is a common viva question and the answer is important.

`python/generate_dummy_data.py` and `python/analyze_and_predict.py` are run **by hand, beforehand**. They leave behind `network_traffic.csv`, `network_traffic.json` and `ml_results.json`. The browser only reads those files. `ml_results.json` carries a `generated_at` timestamp of `2026-09-01T14:05:06Z`, which proves the analysis was a separate earlier event. **[IMPLEMENTED as a pre-generated pipeline]**

The `python -m http.server` process is a **different** thing: a file server, not the analysis.

### The exact runtime flow

Verified in `main()` at the end of `js/app.js`:

```
Browser opens http://localhost:8000
   ↓
localhost HTTP server hands over index.html
   ↓
index.html loads css/styles.css, then chart.umd.js, then js/app.js as a module
   ↓
js/app.js runs main():
     1. loadData()             fetch both JSON files (fallback data if missing)
     2. aggregateData()        24 route summaries, 16 node summaries
     3. selectSituation()      pick the record for the 12-step situation story
     4. populateFilters()      fill the department dropdown
     5. populateDashboard()    KPI cards, predictions, recommendations, alerts,
                               then buildForecastChart() draws the trend
     6. initThree()            scene, camera, renderer, lights, bloom composer, then:
                                 buildCityEnvironment()   water, sky, mountains, 13 islands
                                 buildNodes()             the 16 buildings
                                 buildCurrentFlows()      bridges, arcs, particles
                                 buildPredictedFlows()    the purple suggested path
                                 buildFlowRiver()         the alternative river view
                                 buildSplatScene()        the experimental splat view
                               then setVisualizationMode('city') and animate() starts
     7. bindUi()               every button, slider, filter and key
     8. restoreLayoutState()   restore collapsed sidebars from localStorage
     9. startSimulationClock() the top-bar clock starts ticking
    10. initSituationStory() + bindSituationControls()
    11. +450 ms   the loading screen fades out
    12. +1100 ms  startSystemFlow() begins the guided story
   ↓
render loop (animate) runs every frame
   ↓
user interaction: orbit, click, filter, story controls
```

### The sentence to say in your viva

*"Localhost is only hosting the prototype's files on my own laptop. Python ran earlier and left a results file behind. The visualisation reads a generated dataset. It is not connected to any real company network, and nothing here can change any real system."*

---

## 13. Project File Structure

### Current tree

```
ai-3d-data-flow/
├── index.html                          346 lines
├── favicon.svg
├── css/
│   └── styles.css                      553 lines
├── js/
│   ├── app.js                        7,737 lines   <- the whole application
│   ├── splats.js                       300 lines
│   └── vendor/
│       ├── three.module.js
│       ├── three.core.js
│       ├── OrbitControls.js
│       ├── chart.umd.js
│       ├── postprocessing/  EffectComposer, RenderPass, UnrealBloomPass,
│       │                    ShaderPass, MaskPass, Pass
│       └── shaders/         CopyShader, LuminosityHighPassShader
├── data/
│   ├── network_traffic.csv           360 rows, 28 columns
│   ├── network_traffic.json          the same rows for the browser
│   ├── ml_results.json               the analysis output
│   └── data_dictionary.md
├── python/
│   ├── generate_dummy_data.py        266 lines
│   ├── analyze_and_predict.py        301 lines
│   └── requirements.txt              pandas, numpy, scikit-learn
├── sample_outputs/
│   └── analysis_summary.txt
├── playcanvas-online/                 a separate PlayCanvas port, not part of this app
├── run_windows.bat
├── run_mac_linux.sh
├── README.md
├── PROJECT_MASTERCLASS.md             this file
├── PROJECT_CHEATCODE_NOOB_GUIDE.md
├── CINEMATIC-V3-UPDATE-INSTRUCTIONS.txt
├── reference-network-city.png
├── Screenshot 2026-09-02 104445.png
└── .gitignore
```

### File reference

| File | Purpose | Input | Output | Important functions | Used by | Why it matters |
|---|---|---|---|---|---|---|
| `index.html` | Page skeleton and importmap | — | The DOM | — | The browser | Every panel and control is declared here |
| `css/styles.css` | All styling | Body classes set by JS | The visual look | `.immersive`, `.flow-panel`, `.flow-basis`, `.dept-legend` | The browser | Explains the immersive city layout and the data-class colours |
| `js/app.js` | **The entire application** | Both JSON files | The 3D scene and all UI updates | See section 14 | The browser | This is the project |
| `js/splats.js` | Gaussian splat renderer | Node config, curves | Instanced point clouds | `createSplatCloud`, `nodeSplats`, `environmentSplats`, `curveSplats` | `app.js` | Only used by SPLAT MODE |
| `js/vendor/three.module.js`, `three.core.js` | Three.js library | — | WebGL draw calls | — | `app.js` | Draws everything |
| `js/vendor/OrbitControls.js` | Camera control | Mouse events | Camera transform | — | `app.js` | Drag, zoom, pan |
| `js/vendor/postprocessing/*`, `shaders/*` | Bloom pipeline | The rendered scene | The glow | `EffectComposer`, `UnrealBloomPass` | `app.js` | The cinematic look |
| `js/vendor/chart.umd.js` | Chart.js | Forecast array | The trend line | — | `app.js` | The 12-hour chart |
| `data/network_traffic.csv` | 360 raw records | — | — | — | Python | The dataset **[SYNTHETIC DATA]** |
| `data/network_traffic.json` | The same records | — | — | — | `loadData()` | What the browser reads |
| `data/ml_results.json` | Analysis output | — | — | `metrics`, `model_metrics`, `detections`, `predictions`, `recommendations`, `alerts`, `forecast`, `predictive_flow` | `loadData()` | Every AI number in the UI **[ML OUTPUT]** |
| `data/data_dictionary.md` | Field documentation | — | — | — | Humans | Reference for the 28 fields |
| `python/generate_dummy_data.py` | Creates the dataset | Seed 42 | CSV + JSON | `build_record()`, `bounded()`, `main()`; tables `NODES`, `ROUTES`, `ANOMALIES` | Run by hand | Defines the entire simulated world |
| `python/analyze_and_predict.py` | Analysis and ML | The CSV | `ml_results.json`, `analysis_summary.txt` | `train_predictions()`, `recommendations_for()`, `number()`, `main()` | Run by hand | Produces all ML output |
| `python/requirements.txt` | Library list | — | — | — | pip | Needed only to regenerate, not to run the UI |
| `sample_outputs/analysis_summary.txt` | Readable summary | — | — | — | Humans | Quick proof the pipeline ran |
| `run_windows.bat`, `run_mac_linux.sh` | Start the file server | — | — | `python -m http.server 8000` | You | Required because `fetch()` fails on `file://` |
| `README.md` | Overview and setup | — | — | — | Humans | Getting started |
| `PROJECT_CHEATCODE_NOOB_GUIDE.md` | Beginner cheat sheet | — | — | — | Humans | Last-minute revision |
| `playcanvas-online/` | A separate PlayCanvas port | — | — | `flowscope-main.mjs` | Not loaded by this app | Mention only if asked |
| `reference-network-city.png` | Design reference | — | — | — | Humans | The look the city was built to match |

**There is no automated test suite in the project.**


---

## 14. JavaScript / Three.js Masterclass

### The Three.js building blocks, in beginner terms

| Concept | What it is | In this project |
|---|---|---|
| **Scene** | The container holding everything | `scene`, with a dark background and exponential fog |
| **Camera** | The viewpoint | `THREE.PerspectiveCamera`. City mode uses field of view 54 and far plane 900 |
| **Renderer** | Draws the scene to a canvas | `THREE.WebGLRenderer` with ACES filmic tone mapping and soft shadows |
| **Lights** | Make materials visible | City rig: hemisphere, a shadow-casting "moon" directional light, two spot fills and a back fill (`buildCityLightRig()`). River mode has its own holographic rig |
| **Materials** | How a surface looks | `MeshStandardMaterial` and `MeshPhysicalMaterial` for architecture, custom `ShaderMaterial` for flowing routes, `SpriteMaterial` for labels and glows |
| **Geometry** | The shape | Boxes, cylinders, tori, extruded hexagons, and `TubeGeometry` along curves for routes. Cached in `geometryCache` so shapes are built once |
| **Groups / layers** | Organisation | `nodeLayer`, `currentLayer`, `predictedLayer`, `cityEnvironmentLayer`, `storyLayer`, `flowLayer`, `focusLayer`, plus the river and splat layers |

### Key architectural ideas

**Everything is built up front.** `initThree()` builds all three view modes at startup and then toggles visibility. Switching views is instant because nothing is rebuilt.

**Objects are pooled.** `particlePool` recycles particle bodies and trails, so changing a filter never allocates inside the render loop.

**Materials and textures are shared and cached.** `cachedTexture()`, `geo()` and `cityMaterialCache` mean the 16 buildings reuse the same procedural textures. Anything with `userData.shared = true` is never disposed.

**Story control is frame-driven, not timer-driven.** The `FlowSequence` class advances from `animate()` using the frame delta, so pausing the render pauses the story exactly, and the simulation-speed slider scales it.

### Function reference

| Function | File | Input | Output / side effect | What it does | When it runs | What the user sees |
|---|---|---|---|---|---|---|
| `main()` | `js/app.js` | — | Everything | Boot sequence | Once, on load | The app appears |
| `loadData()` | `js/app.js` | — | `state.data`, `state.ml` | Fetches both JSON files; falls back to 90 built-in rows if missing | First | The loading text |
| `aggregateData()` | `js/app.js` | `state.data` | `state.routeStats` (24), `state.nodeStats` (16) | Groups rows per route and per node, computes averages and health | After load | Feeds colours, sizes and inspectors |
| `initThree()` | `js/app.js` | — | Scene globals | Creates renderer, camera, lights, bloom, then all three views | After the dashboard | The 3D scene appears |
| `buildCityEnvironment()` | `js/app.js` | Quality | `cityEnvironmentLayer` | Water, sky dome, two mountain ridges, distant skyline, 13 islands, haze, light rig | Startup and on quality change | The harbour setting |
| `buildNodes()` | `js/app.js` | `NODE_CONFIG` | `nodeLayer`, `nodeObjects` | Builds all 16 buildings, labels, leader lines, anomaly rings | Startup and on quality change | The buildings |
| `buildCurrentFlows()` | `js/app.js` | Filters, quality | `currentLayer`, `particles` | Turns visible routes into bridges or sky arcs with particles | Startup and on every filter change | The moving data |
| `buildPredictedFlows()` | `js/app.js` | `ml.predictive_flow` | `predictedLayer` | The purple dashed suggested path plus a "Route via" chip | Startup | The purple route |
| `addConduit()` | `js/app.js` | Route, curve, colour | Meshes + particles | Glass tube, glowing core, filament, trough, pylons, particles | Per route | One bridge |
| `addSkyArc()` | `js/app.js` | Route, curve, colour | Meshes + particles | Dashed line, thin tube, particles | Per route | One elevated route |
| `flowColor()` | `js/app.js` | A route summary | Hex colour | The ordered colour rules | Per route | Route and particle colour |
| `departmentColor()` | `js/app.js` | A node id | Hex colour | Looks up the owning department | Per building | Architectural identity |
| `animate()` | `js/app.js` | Clock | A rendered frame | Moves particles, pulses lights, spins fans, eases the camera, renders | Every frame | All motion |
| `setVisualizationMode()` | `js/app.js` | `'city'`, `'river'`, `'splat'` | Layer visibility, camera, lighting | Switches views | On button click | The whole look changes |
| `bindUi()` | `js/app.js` | — | Event listeners | Attaches every control | Startup | Buttons start working |
| `pickObject()` | `js/app.js` | Pointer | The hit object | Raycasts against registered meshes | On hover and click | Tooltip and selection |
| `showNodeDetails()` | `js/app.js` | Node id | DOM + camera | Fills the Node Inspector | On building click | The side panel |
| `enterRouteFocus()` | `js/app.js` | A route | 3D overlays + DOM | Dims the city, floats metric beacons along the route, offers an alternative if anomalous | On route click in city mode | The spatial inspector |
| `populateDashboard()` | `js/app.js` | `state.ml` | DOM | KPIs, predictions, recommendations, alert list | Startup | The dashboard |
| `buildForecastChart()` | `js/app.js` | `ml.forecast` | Chart.js chart | The 12-hour trend | Startup | The right-panel chart |
| `FlowSequence` (class) | `js/app.js` | Phase list | Runs phases in order | Frame-driven controller with wait, tween, pause and jump | While the story runs | Step-by-step storytelling |
| `startSystemFlow()` | `js/app.js` | — | Starts the story | Resets state, forces city mode, runs `FLOW_PHASES` | 1.1 s after load, and on STORY MODE | The guided story |
| `pickFlowRecord()` | `js/app.js` | Source, destination | A dataset row + provenance | Chooses the row for a hop per the ROWS profile | Per hop | The numbers on the panel |
| `setBuildingState()` | `js/app.js` | Node id, mode | Materials, lights, rings | The six-state building machine | Throughout the story | Building colour and rings |
| `setCloudState()` | `js/app.js` | Node id, mode | Cloud materials and light | The cloud's own state machine | Cloud phases | Cloud colour |
| `cloudOperationSuccess()` | `js/app.js` | Node id, message | White glow sequence | Bloom, sparks, ring, message, hold, fade | On a successful cloud operation | The white flash |
| `classifyIssue()` | `js/app.js` | A row, a focus node | An issue object or `null` | Threshold check and classification | At branch points | Whether the story branches |
| `runWhatIfBranch()` | `js/app.js` | Row, focus, route | An outcome object | The whole What-If branch | When an issue is detected | The simulation sequence |
| `projectUnderTraffic()` | `js/app.js` | Observed values, multiplier | Projected values | Queueing projection | Inside the branch | The "if nothing changes" card |
| `simulateAlternative()` | `js/app.js` | Baseline, transferred load | Projected values | The alternative's projection | Inside the branch | The comparison card |
| `chooseAlternative()` | `js/app.js` | Source, destination, kind | An alternative or `null` | Predictive path, else lowest-load peer; `null` for threats | Inside the branch | The purple route |
| `selectSituationRecord()` | `js/app.js` | The dataset | A record + priority | Picks the most important record by fixed priority | Startup | Which record the 12-step story tells |
| `showSituationStep()` | `js/app.js` | Step index | DOM + 3D | Renders one of the 12 steps | SITUATION mode | The step panel |
| `applyRenderQuality()` | `js/app.js` | Quality setting | Full rebuild | Pixel ratio, shadows, counts | On FAST/HIGH/ULTRA | Detail versus frame rate |

---

## 15. Building Functionality

Every building performs its function rather than sitting still. The pattern for each is the same:

```
DATA ENTERS  →  BUILDING RECEIVES  →  FUNCTION ANIMATION  →  PROCESSING  →  SUCCESS / FAILURE  →  DATA LEAVES
```

| Building | Data enters | Receives | Function animation | Processing | Success / failure | Data leaves |
|---|---|---|---|---|---|---|
| **Development** | — (origin) | — | Monitors blink, windows glow **[DEMO]** | A package is created and scaled up **[DEMO]** | "File ready for upload" | Travels to API-Gateway on the real route |
| **API Gateway** | Packet arrives at the ring | Portal opens, packet pauses in the centre | Two scanner rings counter-rotate **[DEMO]** | `AUTH ✓` → `ROUTE ✓` → `ACCEPTED` stack up **[DEMO]** | Ground pulse cyan / yellow / red by `recordTone()` **[IMPLEMENTED]** | Exit portal opens, packet moves to the chosen server |
| **Server** | Packet moves to the door | `setBuildingState('receiving')`, input ring | Rack LEDs sweep bottom to top, core spins, data lines climb, progress arc fills **[IMPLEMENTED]** | Duration scales with load; if `queue_length > 20` a queue lane appears and is drained one packet at a time **[IMPLEMENTED]** | "Business logic completed", or a red overload message and heat shimmer | Continues to the database |
| **Database** | Packet arrives on the route | Input ring | Rings light top to bottom **[IMPLEMENTED]** | Cube sinks in, rings compress, green spark **[DEMO for the cube]** | "Record Saved ✓", then "Reading data…" → "Data returned" | Result travels back to the server |
| **Cloud** | Packet approaches | Intake ring fades in | Upload counter 25 → 60 → 85 → 100 % **[DEMO]** | `setCloudState('processing')` | **White glow** on success, red pulse on failure **[IMPLEMENTED]** | Stored icons appear on the roof shelf |
| **AI Engine** | Analytics batch arrives | Input ring | Purple particles spiral inward, orbit ring turns, neural links glow, waveform appears **[IMPLEMENTED]** | "Analyzing pattern…" | "Future load predicted" with the stored forecast **[ML OUTPUT]** | A translucent purple predicted route toward Cloud-01 |
| **Security Hub** | Packet arrives | Scanning zone | Laser sweeps, shield hologram appears **[IMPLEMENTED]** | The packet is held while scanned | Green shield and "Security scan passed ✓", or red shield and "Threat detected — Route blocked" | Continues to Cloud-01, or stops entirely |
| **IoT Gateway** | Sensors emit | — | Six sensor posts emit dots that fly in and merge **[IMPLEMENTED]** | Merge sphere grows | "*n* messages aggregated" using the row's real `iot_messages` | The stream goes to the row's destination |
| **Departments** | — (origin) | — | Window and roof accents in the department colour | — | State ring if involved in the story | Travel on their real routes |

### The line that keeps you honest

*"These animations are a visual language for what each system does. The gateway is not really authenticating anything, and the database is not really running SQL. What is real is the row of telemetry behind each step, and the panel prints which row it used."*

---

## 16. Cloud-01 — Updated Version

**[IMPLEMENTED]** Cloud nodes have their own state machine, separate from every other building. It lives in the "CLOUD OPERATION STATES" section of `js/app.js` and is driven from `animate()` by `updateCloudStates()`.

### The state machine, verified from `CLOUD_TARGETS`

| State | Colour in code | What it means | Visual |
|---|---|---|---|
| `idle` | Dark blue `0x2f4f72`, no pulse | Nothing happening | The cloud's resting look |
| `receiving` | Blue-cyan `0x3f9ad8`, slow pulse (speed 2.2) | Data is arriving | Gentle breathing glow |
| `processing` | Cyan `0x39e7ff`, faster pulse (speed 4.4) | The operation is running | Brighter internal activity |
| `success` | **White `0xffffff`**, intensity 7.5, no pulse | The operation **completed successfully** | The full success burst |
| `warning` | Yellow-amber `0xffb347`, fast pulse (speed 5.5) | The cloud is under load | Amber warning breathing |
| `failed` | Red `0xff3c4e`, very fast pulse (speed 9) | The operation failed | Red alarm pulse |

Values ease smoothly between states each frame rather than snapping.

### The success sequence, exactly as coded in `cloudOperationSuccess()`

```
data enters                 setCloudState('receiving')
   ↓
operation processes         setCloudState('processing')
   ↓
SUCCESS event               cloudOperationSuccess() is called
   ↓
Cloud becomes luminous white   the puffs ease to white, intensity 7.5, light 5.5
   ↓
soft white bloom            a large white sprite fades in over 0.45 s
   ↓
3–5 digital sparks          count is 3 + a pseudo-random 0–2, drifting outward and fading
   ↓
one expanding ring          a white ring grows to 16× and fades over 1.3 s
   ↓
success message             a white holographic card, e.g. "Cloud-01 — File Saved Successfully ✓"
   ↓
hold                        about 1.8 s
   ↓
fade back to normal         setCloudState('idle'), eased over 1.25 s
```

### What white means

> **White means: "The current Cloud operation completed successfully."**

It does **not** mean "data is in the cloud". Arrival alone never triggers it. In the Security Hub phase, for example, the packet reaches Cloud-01 and the cloud goes to `processing` with the message "Synchronizing…" first; the white glow only fires afterwards with "Data Synchronized ✓". In the IoT phase the same pattern applies, and if the row is anomalous it calls `cloudOperationFailed()` instead. **[IMPLEMENTED]**

### Reusable by design

The functions are generic, not tied to file upload:

- `cloudOperationSuccess(id, message, options)`
- `cloudOperationFailed(id, message, options)`
- `runCloudOperation(id, { message, succeed, processingSeconds })`
- `setCloudState(id, mode)`

They are exposed for demonstration as `window.cloudOps`, so you can run `cloudOps.success('Cloud-01', 'Backup Completed ✓')` in the browser console and the same white sequence plays. **[IMPLEMENTED]**

### Failure path

If the What-If branch on the cloud finds no workable option, `systemFlow.cloudBlocked` is set, the `CLOUD_SAVED` phase skips the white glow entirely and calls `cloudOperationFailed()` with "Upload held · load critical". **The white glow can only follow a real success.** **[IMPLEMENTED]**

---

## 17. API Gateway Masterclass

### What an API gateway is, practically

In real architectures the API gateway is the **single controlled entrance** to a set of backend services. Concentrating authentication, rate limiting, routing and logging in one place means those concerns are handled consistently instead of being reimplemented in every service. It is also the natural place to see overload first, because every request passes through it.

### What is implemented

| Stage | Implemented? | What happens |
|---|---|---|
| **RECEIVE** | **[IMPLEMENTED]** | The packet travels the real `Development → API-Gateway` route and stops at the ring centre. `setBuildingState(api, 'receiving')` lights the input ring |
| **AUTH** | **[DEMO / VISUAL METAPHOR]** | A portal circle opens, two scanner rings counter-rotate, "Authenticating…" appears, then `AUTH ✓`. The dataset contains no authentication event; the `access_permission` field is the nearest real thing |
| **ROUTE** | **[DEMO / VISUAL METAPHOR]** | `ROUTE ✓` appears and the panel says "Routing → Server-02". The destination is real: it comes from the dataset row |
| **ACCEPT** | **[IMPLEMENTED colour logic]** | The final label is `ACCEPTED`, or `ACCEPTED · HIGH LOAD`, or `ACCEPTED · DEGRADED PATH`, chosen by `recordTone()`. Cyan when healthy, yellow above 70 % load, red on an anomaly or above 88 % |
| **OVERLOAD** | **[IMPLEMENTED]** | If `queue_length > 40` while the destination server is below the 85 % threshold, the gateway-side What-If branch runs: packets stack in front of the ring and the mitigation option is "distribute requests, shed low-priority traffic, scale capacity" |
| **FAILURE** | **[PARTIALLY IMPLEMENTED]** | There is no dedicated gateway-failure animation. A failed row on a gateway route turns the route red and can trigger the failure scenario, which is handled generically |

### Physical detail worth mentioning

The gateway is the only building routes pass **through**. `nodePort()` detects `metrics.ring` and returns a point on `API_AXIS`, so the conduit curve enters one side of the ring and exits the other. It reads as a checkpoint rather than a wall.

---

## 18. Server Masterclass

### The metrics and how each is visualised

| Metric | Field | How it appears |
|---|---|---|
| **Processing** | — | Rack LEDs sweep bottom to top, a core spins, a progress arc fills, data lines climb the facade |
| **Network load** | `network_load_percent` | Animation intensity `0.6 + load/100 × 1.4`, core spin rate, and the colour stage |
| **Queue** | `queue_length` | Above 20, a queue lane of waiting packets appears in front of the building and is drained one at a time |
| **Latency** | `latency_ms` | Feeds the tone thresholds and the What-If projection |
| **Response time** | `response_time_ms` | Shown in the Node Inspector and the story lines |
| **Connections** | `active_connections` | Sets the story route's particle count, `connections / 40` clamped to 4–14 |
| **Overload** | Combination | Colour progression, heat shimmer, red ground ring |

### The actual thresholds in the code

Never invent these. These are the real numbers:

**Route and building tone, `recordTone()`:**

| Condition | Result |
|---|---|
| Failed connection, blocked route, any anomaly label, Critical threat, or load **> 88 %** | **red** |
| Load **> 70 %**, congested route, degraded connection, or latency **> 120 ms** | **yellow** |
| Otherwise | **cyan** |

**Node health, `aggregateData()`:**

| Condition | Result |
|---|---|
| Average load **> 84 %** or average latency **> 120 ms** | `Critical` |
| Average load **> 68 %** or average latency **> 80 ms** | `Watch` |
| Otherwise | `Healthy` |

**What-If detection, `WHATIF_LIMITS`:** load 85, bandwidth 85, latency 120, packet loss 3, queue 30.

**What-If risk, `riskLabel()`:** load ≥ 90 or latency ≥ 200 → CRITICAL; ≥ 75 or ≥ 120 → HIGH; ≥ 60 or ≥ 80 → MEDIUM; otherwise LOW.

**Python prediction risk, `train_predictions()`:** predicted load ≥ 88 or predicted latency ≥ 180 → Critical; ≥ 72 or ≥ 110 → Watch; otherwise Stable.

**Story queue lane:** `queue_length > 20`.

### The colour progression during processing

The server starts cyan. If `recordTone()` says the row is not healthy, at 38 % through the processing animation it shifts to **yellow** and the building state becomes `warning`. If the tone is red, at 72 % it shifts to **red**, the state becomes `error`, and a red heat shimmer fades in. **[IMPLEMENTED]**

---

## 19. Database Masterclass

### What is implemented

| Operation | Implemented? | Visual |
|---|---|---|
| **Write** | **[IMPLEMENTED]** as a phase | Rings light top to bottom in a cascade, the packet moves to the top of the vault, sinks 3.3 units into the core while shrinking to nothing, the rings compress by 8 %, a green spark fires, an expanding green ring confirms, "Record Saved ✓" |
| **Read** | **[IMPLEMENTED]** as a phase | Rings light again, a glowing block rises out of the vault while growing, "Reading data…" → "Data returned", then it travels back along the same route in reverse |
| **Queries** | **[IMPLEMENTED]** as data | The row's `database_queries` value is printed on the phase note, for example 306 queries |
| **Queue** | **[IMPLEMENTED]** as data | `queue_length` feeds the tone and the What-If projection |
| **Processing** | **[DEMO / VISUAL METAPHOR]** | The sinking cube represents persistence. No SQL exists anywhere in the project |
| **Database overload** | **[IMPLEMENTED]** | Ring colour follows `recordTone()`. The What-If `db-congestion` scenario triggers on load, latency or queue and offers the other vault |

### The write animation in order

```
packet arrives on the real route
   ↓  setBuildingState(db, 'receiving')
rings light from the top floor downward       (5 rings, 1.1 s cascade)
   ↓
packet lifts to the top of the vault          (0.7 s, arced)
   ↓
packet sinks into the core and shrinks        (0.85 s, ease-in)
   ↓
rings compress by 8 %  +  green spark fires   (0.45 s, simultaneous)
   ↓
expanding green ring  +  "Record Saved ✓"     (1.1 s)
   ↓
rings turn green
```

### Read and write in the same phase pair

`DATABASE_WRITE` is followed immediately by `DATABASE_READ`, which replays the same curve in reverse to represent the answer returning. **The request-and-response pairing is [DEMO / VISUAL METAPHOR]**: the dataset records one directional flow per row and does not pair requests with responses.

---

## 20. Security Hub

### What is implemented

| Stage | Behaviour |
|---|---|
| **Normal traffic** | The packet travels the real `API-Gateway → Security-Hub` route |
| **Security scanning** | A laser bar sweeps up and down three times over 1.5 s while a wireframe shield and a soft inner shell surround the packet. "Scanning packet…" |
| **Threat detection** | `blocked` is true when the row has `threat_level === 'Critical'`, or `access_permission === 'Denied'`, or `route_status === 'Blocked'`, or `connection_status === 'Failed'`, or `anomaly_status === 'Suspicious Traffic'` |
| **Allow** | Shield turns green, a green ring expands from the base, "Security scan passed ✓", the packet continues to Cloud-01, the cloud synchronises and shows its white success |
| **Block** | Shield turns red, the route is recoloured red, a vertical lock ring appears, "Threat detected — Route blocked" with the threat level and permission, the packet shrinks to nothing and **does not continue** |
| **After a block** | The What-If branch runs. `chooseAlternative()` returns `null` for threats by design, so the result is "Block the route and investigate the source" and no alternative is drawn |

### The honesty answer

> **Blocking is a visual simulation. It is not actual network control.**

There is no firewall call, no access-control-list change and no network API anywhere in the codebase. The prototype cannot block anything in the real world. What it demonstrates is the **decision**: given this telemetry, the correct action is to block and investigate. Acting on that decision would be a separate, authorised, human-approved system. **[PLANNED / CONCEPTUAL]**

### An important security design choice

`chooseAlternative()` begins with:

```js
if (kind === 'threat') return null;
```

Flagged traffic is never given a different destination. Rerouting suspicious traffic to another database would be a security mistake. The correct answer to a threat is containment, so the app says "No safe alternative available" rather than inventing a detour. **[IMPLEMENTED]**

---

## 21. AI Engine

### The distinction that matters most

| | The AI-Engine building | The project's actual machine learning |
|---|---|---|
| **What it is** | A 3D pyramid at position (27, 0) in the Network City | Two scikit-learn models |
| **Where it lives** | `buildAiPyramid()` in `js/app.js` | `python/analyze_and_predict.py` |
| **What it represents** | An analytics or inference service **inside the modelled company** | The project's own analysis of the dataset |
| **When it runs** | Every frame, as animation | Once, by hand, before the browser is opened |
| **What it produces** | Purple particles, an orbit ring, a waveform panel, a predicted route | `data/ml_results.json` |
| **Is it doing ML?** | **No.** It is a picture of a system that would do analytics | **Yes.** Isolation Forest and Random Forest Regression |

**Say it like this:** *"The pyramid is a building in the city that represents the company's analytics service. My project's machine learning is Python code that runs offline and writes a results file. They are two different things that happen to both be called AI."*

### What the building actually shows

**[IMPLEMENTED]** During the `AI_ANALYZE` phase: eight purple particles spiral inward toward the core, a steel orbit ring rotates, six neural link lines pulse, and a small waveform panel fades in beside the pyramid. The message is "Analyzing pattern…".

**[ML OUTPUT]** The result line then reads "Future load predicted · AI-Engine 36.4%", taken from the AI-Engine entry in `ml_results.predictions`. The code appends "(demo floor)" only when that entry's `forecast_basis` mentions a scenario; AI-Engine's basis is `"Random Forest baseline"`, so no floor applies to it.

**[SIMULATED / PREDICTED]** A translucent purple orb appears above the pyramid, and a dashed purple arc extends toward Cloud-01 with the caption "translucent = forecast, not current traffic".


---

## 22. ML Pipeline

### The actual pipeline

```
network data            data/network_traffic.csv, 360 rows
      ↓
preprocessing           pd.read_csv(parse_dates=['timestamp']), sort by timestamp
                        NOTE: there is no cleaning step. No nulls, no dedup, no outlier removal
      ↓
features                for the detector: the 14 NUMERIC_COLUMNS
                        for the forecaster: hour, minute, day_of_week, the 14 numerics,
                        plus one-hot source_id, destination_id, source_type,
                        destination_type, data_priority, threat_level
      ↓
models                  IsolationForest  +  4 x RandomForestRegressor
      ↓
post-processing         scenario_floors raise 4 nodes; risk labels assigned
      ↓
output                  data/ml_results.json  +  sample_outputs/analysis_summary.txt
      ↓
browser visualization   loadData() fetches the JSON; populateDashboard() and the
                        story and What-If layers read from it
```

**Discrepancy worth naming:** the README describes a "Cleaning/aggregation" stage. In the code there is aggregation but **no cleaning**. The generated data has no missing values, so nothing needs cleaning. Say "aggregation", not "cleaning".

### The 14 feature columns, `NUMERIC_COLUMNS`

`data_volume_mb`, `transfer_speed_mbps`, `bandwidth_usage_percent`, `latency_ms`, `packet_loss_percent`, `network_load_percent`, `active_connections`, `response_time_ms`, `queue_length`, `processing_rate`, `api_requests`, `database_queries`, `ai_requests`, `iot_messages`.

Note what is **not** in there: no timestamp, no identity fields, and **no `anomaly_status`**. The detector is genuinely unsupervised.

### What `ml_results.json` contains

| Section | Contents | Consumed by |
|---|---|---|
| `generated_at` | `2026-09-01T14:05:06Z` | The status bar |
| `records_analyzed` | 360 | The status bar |
| `algorithms` | The two model names | Not read by the UI |
| `forecast_method` | The honesty note about stress floors | Not read by the UI |
| `metrics` | 12 KPI values | The KPI strip, HUD chips, mini metrics |
| `model_metrics` | MAE and R² for each of the 4 targets | The What-If confidence figure |
| `detections` | 6 high-traffic zones, 6 bottlenecks, and counts: 3 failed connections, 3 suspicious routes, 9 slow routes, 19 overloaded records | Mostly unread by the UI |
| `predictions` | 16 node forecasts | PREDICTED EVENTS, the bottleneck marker, What-If cross-reference |
| `recommendations` | 6 rule outputs | The right rail shows the first 4 |
| `alerts` | The 8 highest-severity rows | The Alert Center |
| `forecast` | 9 historical + 3 projected 4-hour buckets | The Chart.js trend and the HUD sparklines |
| `predictive_flow` | The current and suggested paths | The purple route, the red bottleneck segments |

---

## 23. Isolation Forest

### For a complete beginner

Picture every observation as a dot in a space made from 14 measurements. Ordinary traffic clusters into a thick cloud. Now play a game: slice the space with random cuts, over and over, until one dot sits alone in its own little box.

- A dot **in the middle of the crowd** needs many cuts before it is alone.
- A dot **far away from everyone** is isolated after only a few cuts.

**Few cuts needed = unusual.** That is the entire idea. It is called a *forest* because the game is played 180 times with different random cuts and the results are averaged.

### Normal observations versus unusual observations

| Normal observation | Unusual observation |
|---|---|
| 101 MB, 337 Mbps, 34 ms latency, 34 % load, queue 2 | 409 MB, **0 Mbps**, **100 % packet loss**, response time 1,123 ms |
| Sits inside the cloud with hundreds of similar rows | Nothing else looks like it, so it separates immediately |

### The implementation

```python
detector = IsolationForest(n_estimators=180, contamination=0.08, random_state=42)
df["isolation_score"] = detector.fit_predict(df[NUMERIC_COLUMNS])
df["model_anomaly"] = df["isolation_score"].eq(-1)
```

| Aspect | Value |
|---|---|
| **Input** | The 14 numeric columns, all 360 rows |
| **Training** | Unsupervised. It is never shown `anomaly_status`. `fit_predict` trains and labels in one call |
| **Preprocessing** | None. No scaling is needed because the method is based on splits, not distances |
| **Parameters** | 180 trees, `contamination=0.08` (it is told to expect about 8 % unusual), `random_state=42` for reproducibility |
| **Anomaly score** | Only the `-1` / `+1` label is kept. The continuous `decision_function` score is **never computed or stored** **[PARTIALLY IMPLEMENTED]** |
| **Output** | **29 of 360 rows** flagged, stored as `metrics.model_anomalies` |
| **Visual effect** | Indirect only. The flagged rows are combined with the labelled ones to build the alert pool. **Per-row flags are not written to the JSON, so the 3D city cannot highlight exactly which rows the model chose** **[PARTIALLY IMPLEMENTED]** |

### Why Isolation Forest was selected

1. **Unsupervised.** Real failures are rare and rarely labelled, so a method that needs no answer key is realistic.
2. **Scale-tolerant.** It splits on values rather than measuring distances, so megabytes and milliseconds can sit in the same model without normalisation.
3. **Fast and simple.** Linear time, one main parameter to set.
4. **Well suited to numeric tables**, which is exactly what flow telemetry is.

### Do not exaggerate what it can do

It answers only "**is this row unusual compared with the others?**". It does **not** identify the root cause, it does **not** know *why* a row is odd, and it does **not** distinguish a genuine incident from a legitimate rare event such as a scheduled backup. It also cannot detect a problem that looks statistically normal.

### The two numbers you must not merge

| Number | What it is |
|---|---|
| **28** | Rows where `anomaly_status != 'Normal'`. **Labels written by the generator.** This is the ANOMALIES KPI card |
| **29** | Rows the Isolation Forest flagged. **A model output.** Stored in the JSON, not shown on screen |

They are different things and the code never compares them. There is **no precision or recall measurement** anywhere in the project. **[PARTIALLY IMPLEMENTED]**

---

## 24. Random Forest Regression

### For a complete beginner

A **decision tree** asks yes/no questions ("is it after midday?", "is the load above 60 %?") until it reaches a small group of similar past examples, then answers with their average. A single tree overfits. A **random forest** trains 140 trees, each on a random slice of rows and features, and averages their answers, which cancels out much of the error.

### What "next interval" means here

The dataset has one row every **12 minutes**. The target is built with:

```python
ordered[f"next_{target}"] = ordered.groupby("source_id")[target].shift(-1)
```

So "next" means **the next row belonging to the same source system**, whatever its destination. Because rows are interleaved across systems, that is roughly the system's next observation, not always exactly 12 minutes later. Worth knowing if you are challenged on it.

### The four models

| Target | What it predicts | Where the output appears |
|---|---|---|
| `data_volume_mb` | Next interval's traffic volume | "traffic may rise 63.0 %" and `traffic_change_percent` |
| `network_load_percent` | Next interval's load | "Projected load 91.2 %", the risk badge, the bottleneck marker, the What-If confidence figure |
| `latency_ms` | Next interval's latency | "latency 184 ms" |
| `bandwidth_usage_percent` | Next interval's bandwidth | Stored in the JSON but **not displayed** |

### The flow

```
current row for a system      the latest row for each of the 16 source nodes
        ↓
features                      hour, minute, day_of_week, 14 numerics,
                              one-hot ids/types/priority/threat  (~60 columns)
        ↓
Random Forest (140 trees)     four separate forests, one per target
        ↓
predicted next value          clamped at 0, and at 100 for percentages
        ↓
scenario_floors               four nodes are raised to a fixed minimum
        ↓
risk label                    Critical / Watch / Stable
```

### Parameters and evaluation

```python
RandomForestRegressor(n_estimators=140, max_depth=12, min_samples_leaf=2,
                      random_state=42, n_jobs=1)
```

Rows usable: 344 of 360, because the last row of each source has no "next". Split: the first 80 % in time order = **275 training rows**, the last **69 for testing**.

**The honest scores, straight from `model_metrics`:**

| Target | MAE | R² |
|---|---|---|
| `data_volume_mb` | 100.97 MB | **0.11** |
| `network_load_percent` | 17.18 points | **−0.01** |
| `latency_ms` | 23.5 ms | **−0.06** |
| `bandwidth_usage_percent` | 14.09 points | **0.19** |

An R² near zero means the forecast is **barely better than guessing the average**, and a negative value means slightly worse. This is expected: the generator draws each row largely independently, so there is very little genuine sequential structure to learn, and 275 training rows is tiny. **State this before anyone finds it.**

### The stress floors — the most important honesty point

`train_predictions()` contains:

```python
scenario_floors = {
  "API-Gateway": {"network_load_percent": 88.4, "latency_ms": 118.0, ...},
  "Server-02":   {"network_load_percent": 91.2, "latency_ms": 184.0, ...},
  "Database-01": {"network_load_percent": 86.5, "latency_ms": 162.0, ...},
  "Cloud-01":    {"network_load_percent": 82.0, "latency_ms": 105.0, ...},
}
```

The model's own estimate is computed first, then `max()` raises it to these minimums for those four nodes. The comment in the code says so plainly, and each prediction carries a `forecast_basis` string of either `"Random Forest baseline"` or `"Random Forest + overload stress scenario"`.

**Consequence: every Critical and Watch badge in the UI comes from the floors, not from the model.** All twelve other nodes are Stable on the model's own output. **[DEMO / VISUAL METAPHOR applied to ML OUTPUT]**

### One more thing that is not the Random Forest

The **12-hour forecast chart** is not model output. Its three projected points are the mean of the last three 4-hour buckets multiplied by fixed factors 1.06, 1.13 and 1.21, with load and latency scaled by `1 + 0.07 × step` and `1 + 0.09 × step`. **[PARTIALLY IMPLEMENTED — heuristic, not ML]**

---

## 25. Anomaly vs Prediction

| | Anomaly detection | Prediction |
|---|---|---|
| **The question** | "Something unusual is happening **now**." | "This **may** happen next." |
| **Tense** | Present | Future |
| **Method** | Isolation Forest, unsupervised | Random Forest Regression, supervised |
| **Input** | 14 numeric columns of one row | Time features + 14 numerics + one-hot identity |
| **Output** | A `-1` / `+1` flag per row | Four numbers per system |
| **Can it be wrong?** | Yes. It can flag a legitimate rare event or miss a subtle problem | Yes, and on this dataset it usually is |
| **Where it appears** | The alert pool, `model_anomalies: 29` | PREDICTED EVENTS, the risk badges, the bottleneck marker |

### A concrete example from the current data

**Observed now (anomaly territory).** Row 93, `API-Gateway → Server-02` at 00:12 on 26 August:
- `network_load_percent` = **95.52 %**, `queue_length` = **51**, connection **Degraded**, labelled **API Overload**.
- This is a **present-tense** problem. It crosses the 85 % What-If threshold and the 88 % red tone threshold.

**Predicted next (prediction territory).** From `ml_results.predictions`, the Server-02 entry:
- predicted `network_load_percent` = **91.2 %**, predicted `latency_ms` = **184 ms**, risk **Critical**,
- `forecast_basis` = **"Random Forest + overload stress scenario"**.
- This is a **future-tense** estimate, and the honest footnote is that those exact numbers are the demo floor.

**How to phrase both in one breath:** *"Right now Server-02's path is observed at 95 % load with 51 requests queued. The forecast says its next interval may sit around 91 % load and 184 ms, which the file marks as a baseline plus a demo stress floor."*

---

## 26. Recommendation Engine

### What it is

**Rule-based. Not machine learning.** It is six `if` statements in `recommendations_for(df, predictions)` in `python/analyze_and_predict.py`. It is a **hybrid** only in the sense that some conditions read ML output (the predicted load), but the decision logic itself is deterministic.

Recommendations are **pre-generated**: they are computed once when the Python script runs and stored in `ml_results.json`. The browser only displays them.

**Do not call these "AI".** This is the single easiest place to lose credibility with a technical examiner.

### The six rules

| # | PROBLEM | CONDITION in code | RECOMMENDATION | Severity | Shown? |
|---|---|---|---|---|---|
| 1 | API overload | Any row labelled `API Overload`, **or** the API-Gateway prediction's risk is not `Stable` | "Increase API Gateway capacity and enable rate-based autoscaling." | Critical | Yes |
| 2 | Database overload | Any row labelled `Database Overload` | "Optimize Database-01 queries and shift read traffic to Database-02." | High | Yes |
| 3 | Suspicious traffic | Any row labelled `Suspicious Traffic`; the **last** such row supplies the names | "Investigate and isolate traffic from Server-01 to Database-02." | Critical | Yes |
| 4 | Congestion | Any row with `route_status == 'Congested'` | "Reroute Server-02 traffic through Server-04 to Database-02." | High | Yes |
| 5 | Cloud pressure | Any prediction for Cloud-01 with predicted load > 80 | "Scale Cloud-01 resources before the next forecast interval." | Medium | **No** |
| 6 | Always | Unconditional | "Move low-priority internal traffic to lower-load routes during peak periods." | Optimization | **No** |

Six are generated and the UI displays the **first four** (`recommendations.slice(0, 4)`), which is why the count badge reads 4.

### Two honest weaknesses

- **Rules 2 and 4 hard-code node names in the string.** Rule 4 always says "Server-02 through Server-04" no matter which route was actually congested. **[PARTIALLY IMPLEMENTED]**
- **There is no rule for High Latency, Packet Loss, Server Overload, Failed Connection or Traffic Spike.** Those conditions surface only through the alerts and the story. **[PARTIALLY IMPLEMENTED]**

### The second, separate rule set in JavaScript

`SITUATION_RECOMMENDATIONS` in `js/app.js` maps each anomaly type to an action and a mode used by the story:

| Anomaly | Action | Mode |
|---|---|---|
| High Latency | Reroute traffic through a lower-latency server | reroute |
| Server Overload | Move non-critical traffic to the lowest-load server | reroute |
| API Overload | Increase API Gateway capacity and enable rate limiting | capacity |
| Database Overload | Optimize database queries and shift read traffic | capacity |
| Packet Loss | Inspect the route and activate the backup path | reroute |
| Suspicious Traffic | Isolate the route and investigate the source | isolate |
| Failed Connection | Activate the available backup route | reroute |
| Network Congestion | Rebalance across an alternative route | reroute |
| Traffic Spike | Apply burst shaping and spread the load | reroute |
| Normal | Maintain current routing and continue monitoring | monitor |

**[IMPLEMENTED, rule-based]**

---

## 27. What-If Simulation — Updated Version

**[IMPLEMENTED]** This is the newest and most substantial part of the project.

### The definition

> **What-If Simulation asks: "What might happen if we change a condition?"**

It is not a measurement and it is not a model forecast. It is a transparent calculation that lets you compare options **before** acting.

### The three classes of number, never mixed

The app enforces this on screen. A coloured line under the panel note always states which class you are looking at, and every simulated card carries a **SIMULATED** badge.

| Class | Panel colour | Meaning | Source |
|---|---|---|---|
| **OBSERVED** | Green | Read from a dataset row or an aggregate. **Never modified** | `network_traffic.json` |
| **PREDICTED** | Cyan | Random Forest output plus its documented demo floors | `ml_results.json` |
| **SIMULATED** | Purple | The What-If projection, calculated live | `projectUnderTraffic()` and `simulateAlternative()` |

**The dataset is never mutated.** Every simulation works on copies and returns new objects.

### The worked example, with the real numbers

**OBSERVED.** Row 93: Server-02's path at **95.52 % load**, 44.56 ms latency, **51 queued**.

**PREDICTED.** `ml_results.predictions` for Server-02: next interval **91.2 % load, 184 ms**, risk Critical, basis "Random Forest + overload stress scenario".

**WHAT-IF question.** "What if traffic to Server-02 increases by 50 %?"

**SIMULATED result:**

| | Load | Latency | Queue | Risk |
|---|---|---|---|---|
| **IF NOTHING CHANGES** | 99.5 % | 399 ms | 476 | **CRITICAL** |
| **ALTERNATIVE via Server-04** | 66.0 % | 66 ms | 3 | **MEDIUM** |

*(These numbers were produced by running the shipped functions against the real dataset, not by hand.)*

### The actual mathematics

`projectUnderTraffic(observed, multiplier)` uses an **M/M/1 queueing approximation**. The plain-English idea: **delay grows as one divided by the free capacity**, so a system at 50 % busy shrugs off extra work while a system at 95 % does not.

```js
const rho     = clamp(observed.load / 100, .02, .97);        // current utilisation
const service = Math.max(observed.latency * (1 - rho), .5);  // implied service time
const rho2    = clamp(rho * multiplier, .02, .995);          // utilisation after the change
const latency = service / (1 - rho2);                        // new delay
```

The implied service time is held constant, so **only the extra demand changes the outcome**. Queue length scales by the ratio of `rho/(1-rho)` before and after.

`simulateAlternative(baseline, transferRho)` applies the transferred load to the alternative's **own observed baseline**:

- `alternativeBaseline()` uses the alternative route's own rows if there are **at least three** of them, otherwise the destination node's aggregate. A one-row route is usually just the injected anomaly and would be an unfair baseline.
- The transferred amount is stated explicitly on the card: **all** of the traffic when a node is unavailable, **half** of the extra demand when traffic is being distributed.

For the example above, Server-04's own observed traffic averages 42.1 % load and 39 ms latency, and half the extra demand is added on top.

### The improvement test

An option is only accepted if it is clearly better **and** not itself near overload:

```js
outcome.improves = altProjection.isReroute
  ? altProjection.load < 92
  : altProjection.load < projection.load - 4
    && altProjection.latency < projection.latency
    && altProjection.load < 90;
```

If nothing passes, the branch says "No option clearly improves the outcome — escalating for a human decision" and the story keeps the current route.

### The confidence figure

`predictionConfidence()` computes `100 − (MAE_load / average_load × 100)`, clamped to 35–95. With the shipped data: `100 − (17.18 / 41.52 × 100)` ≈ **59 %**.

**Note a real inconsistency:** the right-hand forecast card in `index.html` has a hard-coded "**87 %** confidence" badge. It is static text and is not computed anywhere. Quote 59 %, or call the badge illustrative. **[PARTIALLY IMPLEMENTED / inconsistent]**

---

## 28. What-If Issue Types

Detection is done by `classifyIssue(record, focusId)`. All six kinds below are **[IMPLEMENTED]**. The numbers shown were produced by running the shipped functions over the real dataset.

### Scenario 1 — Server overload **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | Focus node is a Server and load > 85, or bandwidth > 85, or latency > 120, or loss > 3, or queue > 30 |
| **Visual change** | Route thickens and slows, cyan → yellow → red, red ground ring, packets stack in front of the building |
| **Simulation** | Traffic × 1.5. Observed 95.5 % → projected **99.5 % load, 399 ms, queue 476** |
| **Prediction** | Risk **CRITICAL**. The ML forecast row for the node is also shown for comparison |
| **Recommendation** | "Shift traffic from Server-02 to the lower-load route via Server-04" |
| **Alternative** | `API-Gateway → Server-04 → Database-02`, taken from the stored predictive flow. Projected **66 % load, 66 ms, MEDIUM** |
| **Result** | Applied. Purple becomes green, the packet travels via Server-04, and the rest of the story continues on Server-04 and Database-02 |

### Scenario 2 — Database congestion **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | Focus node is a Database and a threshold is crossed |
| **Visual change** | Vault rings flash yellow or red, queue grows |
| **Simulation** | Traffic × 1.4. Observed 93.3 % → projected **99.5 % load, 2,069 ms** |
| **Alternative** | Database-02, chosen as the lowest-load Database peer. Baseline is its own node aggregate, 43.1 % load. Projected **61.7 % load, 64 ms, MEDIUM** |
| **Recommendation** | "Shift eligible read traffic from Database-01 to Database-02" |
| **Result** | Applied. `systemFlow.ids.db` switches and the write animation continues on the new vault |

### Scenario 3 — Server failure **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | `connection_status == 'Failed'`, or `route_status == 'Blocked'`, or the `Failed Connection` label |
| **Visual change** | Building goes to `error`, red ring expands, packets stop |
| **Simulation** | Multiplier 1, so **all** of the failed node's load is transferred to the alternative |
| **Alternative** | The lowest-load Server peer, Server-04 |
| **Improvement test** | The reroute branch: accepted if the alternative stays below 92 % |
| **Result** | Applied, and the failed route stays dim |

### Scenario 4 — API Gateway overload **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | `queue_length > 40` while the destination server is **at or below** the 85 % threshold, so the gateway is clearly the constraint |
| **Visual change** | Packets stack before the ring, the pulse turns yellow then red |
| **Simulation** | Traffic × 1.4 |
| **Recommendation** | "Distribute requests to *X*, shed low-priority traffic, scale API-Gateway capacity". Where a stored recommendation matches, it is quoted |
| **Result** | Applied if the option improves |

### Scenario 5 — Security threat **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | Critical threat, or Denied access, or the `Suspicious Traffic` label |
| **Visual change** | Scanner turns red, shield turns red, the packet stops, the route turns red |
| **Simulation** | The route is treated as blocked |
| **Alternative** | **None, by design.** `chooseAlternative()` returns `null` for threats |
| **Recommendation** | "Block the route and investigate the source", with the stored recommendation quoted if it matches |
| **Result** | Not applied. The panel reads "Flagged traffic is not rerouted. The route stays blocked and the source is investigated" |

### Scenario 6 — Cloud overload **[IMPLEMENTED]**

| Stage | What happens |
|---|---|
| **Trigger** | Focus node is a Cloud and a threshold is crossed |
| **Visual change** | Cloud goes to `warning` yellow, then `failed` red. **The white success glow is suppressed** |
| **Simulation** | Traffic × 1.35. Observed 96 % → projected **99.5 % load, 1,469 ms** |
| **Alternative** | Cloud-01 is the only Cloud node, so no peer exists. The branch falls back to **mitigation on the same node**: `MITIGATION_FACTOR = 0.65`, meaning 35 % of low-priority demand is delayed or shed. Projected **62.4 % load, 20 ms, MEDIUM** |
| **Recommendation** | "Delay low-priority traffic and scale Cloud-01 capacity" |
| **Result** | Applied, and only then does `CLOUD_SAVED` play the white success glow. If it had not been applied, `cloudOperationFailed()` runs instead |

### Also detected, handled generically

**Network congestion**, **traffic spike** and **packet loss** are all detected by `classifyIssue()` and mapped to the `congestion` or `server-overload` kinds. They do not have bespoke animations of their own. **[PARTIALLY IMPLEMENTED]**

---

## 29. Dynamic Story Mode — Updated Version

### Linear, conditional or hybrid?

**Hybrid.** There is a fixed backbone of 15 phases in `FLOW_PHASES`, and at four specific points the story **branches conditionally** based on the live telemetry.

### The backbone

| # | Phase id | Title |
|---|---|---|
| 1 | `CREATE_FILE` | Development — file created |
| 2 | `SEND_TO_API` | Upload — Development → API Gateway |
| 3 | `API_AUTH` | API Gateway — authenticate |
| 4 | `API_ROUTE` | API Gateway — route to server |
| 5 | `SERVER_PROCESS` | Server — process request |
| 6 | `DATABASE_WRITE` | Database — write record |
| 7 | `DATABASE_READ` | Database — read and return |
| 8 | `SERVER_RESPONSE` | Server — assemble response |
| 9 | `CLOUD_UPLOAD` | Upload — Server → Cloud |
| 10 | `CLOUD_SAVED` | Cloud — file saved |
| 11 | `COMPLETE` | Main flow complete |
| 12 | `SECURITY_SCAN` | Security Hub — inspect |
| 13 | `AI_ANALYZE` | AI Engine — analyze and predict |
| 14 | `IOT_AGGREGATE` | IoT Gateway — collect and aggregate |
| 15 | `FINISHED` | System flow finished |

### The branch points

| Phase | Condition checked | Focus |
|---|---|---|
| `API_AUTH` | `queue_length > 40` **and** load ≤ 85 | The gateway |
| `SERVER_PROCESS` | Any `classifyIssue()` result | The server |
| `DATABASE_WRITE` | Any `classifyIssue()` result | The database |
| `CLOUD_UPLOAD` | Any `classifyIssue()` result | The cloud |
| `SECURITY_SCAN` | Runs its own branch whenever the packet is blocked | The security hub |

### The exact branch logic

```
NORMAL STORY
   ↓
CHECK SYSTEM HEALTH        classifyIssue(record, focusNode) against WHATIF_LIMITS
   ↓
HEALTHY?  →  continue to the next phase, no interruption
   ↓
ISSUE?
   ↓
IDENTIFY ISSUE             kind, severity, and the reasons that crossed the thresholds
   ↓
PAUSE / SLOW               setEntrySpeed(entry, .05) almost freezes the particles
   ↓
SHOW PROBLEM               CURRENT STATE card, badge OBSERVED
   ↓
WHAT-IF                    the city dims, the question appears
   ↓
PREDICTION                 IF NOTHING CHANGES card, badge SIMULATED
   ↓
ALTERNATIVE                a translucent purple route, or same-node mitigation
   ↓
COMPARISON                 two-column before/after card
   ↓
RECOMMENDATION             action text, matched to a stored recommendation where possible
   ↓
OPTIMIZED RESULT           purple becomes green, old route fades, the packet travels the new way
   ↓
CONTINUE                   systemFlow.ids are updated so later phases use the new server or vault
```

### An important guard

Only **one** branch may run in the main flow, enforced by `maybeWhatIf()` and the `whatIf.mainBranchDone` flag. This keeps the demo a single clear story rather than a chain of interruptions. The Security Hub calls `runWhatIfBranch()` directly and is not subject to that guard.

### The row profiles

The `ROWS` button in the flow panel cycles three profiles, and the panel always prints which row drove each hop:

| Profile | Behaviour |
|---|---|
| **DEMO STORY** (default) | Every hop uses its latest row, **except** the gateway → server hop, which uses that pair's **worst observed row** so the branch has a real problem to work with. It is still a genuine dataset row, and the note says "worst observed row for this pair (demonstration selection)" |
| **LATEST** | Every hop uses its latest row. With the shipped data every hop is healthy, so **no branch fires** and the story runs clean |
| **PEAK LOAD** | Every hop uses its worst observed row |

### The second, older story

The **12-step "Live Network Situation"** still exists, reached from the `SITUATION` button. `SITUATION_STEPS` runs: data generated, data collected, data movement, situation changed, data processed, analysis, anomaly detection, AI prediction, recommendation, optimization simulation, before and after, result. With the shipped data it selects the highest-priority record by a fixed priority order, which is the **Suspicious Traffic** row `Server-01 → Database-02` from 27 August at 20:24, and ends with "Critical issue requires manual investigation". Its before/after values are fixed-factor simulations and are labelled "SIMULATED RESULT" on screen. **[IMPLEMENTED]**


---

## 30. Full Normal Story

Run this with the `ROWS: LATEST` profile, where every hop in the shipped dataset is healthy and no branch fires.

| Step | Technically what it represents | What the data says | What the user sees | Why the visual changes |
|---|---|---|---|---|
| **1. Development creates a request** | A team produces work that must reach a backend service | Latest `Development → API-Gateway` row: 73.97 MB, 316.97 Mbps, 35.36 ms, 19.77 % load, queue 3, Normal | Monitors blink, tower windows glow, a package appears and slides to the entrance | The building is `processing`, so its accent brightens and its local light doubles |
| **2. Upload to the gateway** | The request leaves the department and enters the controlled entrance | Volume sets particle size, speed sets particle speed | Blue particles carry the package across the glass bridge into the ring | Size `.26 + 73.97/2600` ≈ 0.29; speed `.03 + 316.97/9000` ≈ 0.065 |
| **3. Gateway authenticates** | The entrance validates the caller before routing | Latest `API-Gateway → Server-02` row: 57.1 MB, 486 Mbps, 17.19 ms, 27.09 % load, queue 0, Normal | Portal opens, scanners spin, `AUTH ✓` `ROUTE ✓` `ACCEPTED` stack up in cyan | `recordTone()` returns cyan because load is 27 %, well under 70 % |
| **4. Gateway routes to the server** | The gateway chooses which backend will handle the work | The destination in the row is Server-02 | Exit portal opens, "Routing → Server-02", the packet crosses to the server | The destination is read from the row, not scripted |
| **5. Server processes** | The business logic runs | Load 27 %, queue 0, response 26.98 ms | Rack LEDs sweep upward, the core spins, the progress arc fills, "Business logic completed" | No queue lane appears because `queue_length` is 0, well under 20. Colour stays cyan |
| **6. Database writes** | The result is persisted | Latest `Server-02 → Database-01` row: 161.87 MB, 33.13 % load, **306 database queries**, Normal | Vault rings cascade downward, the cube sinks in, rings compress, green spark, "Record Saved ✓" | The green confirmation reflects a successful, healthy row |
| **7. Database reads back** | The stored answer is returned | The same route, replayed in reverse | A block rises out of the vault, "Data returned", it travels back to the server | The reverse path is a **[DEMO / VISUAL METAPHOR]**: the dataset does not pair requests with responses |
| **8. Server assembles the response** | The final result is composed | Processing rate from the same row | The core spins faster, the arc fills, the packet turns **green** and becomes "Processed result" | Green marks a successfully processed payload |
| **9. Upload to the cloud** | The result is handed to a downstream service | **No `Server-02 → Cloud-01` row exists**, so the nearest `Server → Cloud` row is used and the panel says so | The intake ring fades in as the packet approaches, then 25 → 60 → 85 → 100 % | Honest substitution, printed on the panel |
| **10. Cloud confirms success** | The operation completed | — | Cloud-01 flashes **white**, sparks fly, a ring expands, "Cloud-01 — File Saved Successfully ✓" | White means the operation succeeded, not merely that data arrived |
| **11. Complete** | The journey is finished | — | Wide camera, "Main flow complete — route healthy" | All main routes recoloured green |

---

## 31. Full Problem Story

This is what plays by default, with `ROWS: DEMO STORY`. Steps 1 to 4 are identical to the normal story, so start from the server.

| Step | What the data says | What the user sees | Status |
|---|---|---|---|
| **5. Server-02 begins processing** | The gateway → server hop now uses that pair's **worst observed row**: 2026-08-26 00:12, **95.52 % load, queue 51, response 170.9 ms, Degraded, labelled API Overload** | Rack LEDs sweep, the core spins faster because intensity scales with load | **[SYNTHETIC DATA]**, real row |
| **6. Traffic increases, load rises** | Load 95.52 % crosses both the 85 % detection threshold and the 88 % red threshold | At 38 % through the animation the overlay turns **yellow**; at 72 % it turns **red** and a heat shimmer fades in | **[IMPLEMENTED]** |
| **7. Queue grows** | `queue_length` = 51, above the 20 threshold | A queue lane of waiting packets appears in front of Server-02 and is drawn in one at a time | **[IMPLEMENTED]** |
| **8. Warning, then red overload** | Severity is critical because load > 90 | A red ground ring expands, the route throbs | **[IMPLEMENTED]** |
| **9. Anomaly detected** | Reasons: load 96 %, queue 51, connection degraded, api overload | Red message: **"Issue Detected - Server Overload"**. Panel kind reads `ISSUE DETECTED`, data class reads **OBSERVED** | **[IMPLEMENTED]** |
| **10. Story pauses** | The same row, displayed | Particles almost freeze. A card titled **CURRENT STATE**, badge **OBSERVED**: load 96 %, latency 45 ms, queue 51, loss 0.23 %, route status Optimal | **[IMPLEMENTED]** |
| **11. What-If begins** | — | The city dims to 68 % exposure, other routes fade to 22 %, purple text asks **"What if traffic to Server-02 increases by 50%?"** | **[IMPLEMENTED]** |
| **12. Prediction** | Queueing projection at ×1.5 | Red card, badge **SIMULATED**: **99.5 % load, 399 ms, queue 476, risk CRITICAL**. The ML forecast row is shown beside it for comparison | **[SIMULATED]** + **[ML OUTPUT]** |
| **13. Alternative appears** | The failing segment is on the stored predictive path, so that path supplies the detour | A translucent purple dashed arc: `API-Gateway → Server-04 → Database-02` | **[SIMULATED]** |
| **14. Comparison** | Server-04's own observed baseline is 42.1 % load and 39 ms | Two-column card: 99.5 % / 399 ms / 476 against **66 % / 66 ms / 3**, risk MEDIUM. The note prints the baseline source and the transfer assumption | **[SIMULATED]** |
| **15. Recommendation** | Rule text, cross-referenced against the stored recommendations | Green message: "AI Recommendation - Shift traffic from Server-02 to the lower-load route via Server-04" | **[IMPLEMENTED, rule-based]** |
| **16. Optimization applied** | `improves` is true: 66 < 99.5 − 4, 66 < 399, and 66 < 90 | The purple route becomes **green**, the old route fades out, the packet travels via Server-04, Server-02 returns to idle | **[DEMO]** — nothing real is rerouted |
| **17. Story continues optimised** | `systemFlow.ids.server` becomes Server-04 and `.db` becomes Database-02; records are re-picked | Server-04 lights up, its progress arc fills, "Business logic completed on Server-04" | **[IMPLEMENTED]** |
| **18. Database writes** | The `Server-04 → Database-02` route exists with 16 real rows | Vault rings cascade, cube sinks, "Record Saved ✓" | **[IMPLEMENTED]** |
| **19. Cloud upload** | Nearest `Server → Cloud` row | 25 → 60 → 85 → 100 % | **[DEMO]** counter, real row |
| **20. Cloud success** | The operation completed | Cloud-01 flashes **white**, sparks, expanding ring, "Cloud-01 — File Saved Successfully ✓" | **[IMPLEMENTED]** |
| **21. Final result** | — | "**Network Optimized — Operation Completed Successfully**" | **[IMPLEMENTED]** |

**Demo-only transitions to mark aloud:** the file name, the AUTH and ROUTE wording, the request-and-response pairing, the upload percentage counter, and the reroute itself.

---

## 32. Before vs After

The What-If comparison card always shows **two simulated columns**, never a simulated column against a measured one. That is deliberate: comparing a projection with a measurement would be misleading.

| | CURRENT STATE | SIMULATED (if nothing changes) | OPTIMIZED (simulated alternative) |
|---|---|---|---|
| **Class** | **OBSERVED** | **SIMULATED** | **SIMULATED** |
| **Source** | Dataset row 93 | `projectUnderTraffic(observed, 1.5)` | `simulateAlternative(Server-04 baseline, transfer)` |
| **Load** | 95.5 % | 99.5 % | 66.0 % |
| **Latency** | 44.6 ms | 399 ms | 66 ms |
| **Queue** | 51 | 476 | 3 |
| **Risk** | — | CRITICAL | MEDIUM |
| **Shown as** | A card with an OBSERVED badge, before the city dims | The left column of the comparison card | The right column of the comparison card |
| **Assumption printed** | — | "Traffic ×1.50 applied to the observed utilisation" | "Assumes half of the additional demand moves to the alternative. Baseline: Server-04 node baseline from its own observed traffic" |

**How to describe it:** *"The observed state is what we measured. The middle column is what the same system looks like if the pressure grows. The right column is what a different route would look like carrying half that extra demand, starting from its own measured baseline. Both projections are labelled simulated."*

---

## 33. Color System Masterclass

### Flow colours — WHAT IS HAPPENING

Set by `flowColor()` in `js/app.js`, checked in this exact order. The first matching rule wins.

| Order | Colour | Hex | Trigger in code |
|---|---|---|---|
| 1 | **RED** | `0xff3c4e` | The route key is a bottleneck segment of `predictive_flow` |
| 2 | **RED** | | Worst row has `threat_level === 'Critical'`, or `Suspicious Traffic`, or `connection_status === 'Failed'` |
| 3 | **RED** | | Has an anomaly **and** average latency > 90, or load > 78, or loss > 3 |
| 4 | **GREEN** | `0x2eea8b` | The route key is a recommended segment of `predictive_flow` |
| 5 | **YELLOW** | `0xffd426` | Worst row's `data_priority === 'Critical'` |
| 6 | **PURPLE** | `0xa45dff` | Source or destination type is `AI` |
| 7 | **CYAN** | `0x39e7ff` | Average `transfer_speed_mbps` > 500 |
| 8 | **GREEN** | | Connected, Optimal, and `index % 6 === 0` — a decorative rule |
| 9 | **BLUE** | `0x129cff` | Everything else. The default |

### Meaning in plain words

| Colour | Meaning |
|---|---|
| **BLUE** | Normal, routine traffic |
| **CYAN** | High-speed traffic, and the "receiving / processing" state of a building |
| **YELLOW** | Warning. Either critical-priority delivery on a route, or a threshold crossed on a building |
| **RED** | Problem: a bottleneck segment, a failure, a critical threat, or an anomaly with bad metrics |
| **PURPLE** | AI traffic, and **all** predicted or simulated routes |
| **GREEN** | Recommended, optimal, or successfully processed |
| **WHITE** | **Contextual and Cloud-only.** See below |

### White is not a global flow status

**White is not in `flowColor()` at all.** No route, particle or building state uses white as a flow colour. White appears in exactly one place: the Cloud success state, where it means **"the current Cloud operation completed successfully"**. Never present white as a general status colour. **[IMPLEMENTED]**

### Department building colours — WHO OWNS IT

A separate, independent system. See section 7 for the full palette. Copper Development, coral QA, gold Finance, pearl Management, rose HR, bronze Operations, gunmetal IT. Applied to windows, trim, edge lights and signage only; bodies stay dark graphite and dark glass.

### Deliberate exceptions on the buildings

Red on Server-02's beacon and ground ring (predicted bottleneck), red aviation obstruction lights on tall masts, the purple AI core, the pale blue gateway aperture, and the Cloud state colours. All are on the data legend on purpose.

---

## 34. UI Masterclass

Every control below exists in `index.html` and is bound in `bindUi()`, `bindHud()`, `bindLayoutControls()`, `bindRouteFocusControls()`, `bindFlowControls()` or `bindSituationControls()`. **[all IMPLEMENTED]**

| Control | What it does | Code that handles it | What changes in 3D | When to use it in the demo |
|---|---|---|---|---|
| **FLOW RIVER / NETWORK CITY / SPLAT MODE** | Switches view | `setVisualizationMode()` | Layer visibility, camera, lighting, fog, field of view | Open in city; switch to river for impact |
| **STORY MODE** | Runs the 15-phase system flow | `startSystemFlow()` | The guided story with What-If branching | Your main demo |
| **SITUATION** | Runs the 12-step anomaly walkthrough | `startStory()` → `startSituationStory()` | A different, older narrative | Only if you have time |
| **PAUSE FLOW** | Freezes particles and the sim clock | `#pause-flow` listener | All motion stops; the camera still works | To hold a frame while explaining |
| **CINE CAM** | Automatic camera flight | `setCineCamera()` | The camera follows a closed loop | Background footage, not analysis |
| **FULL VIEW** (key `F`) | Hides all chrome | `toggleFullView()` | The 3D fills the screen | For the final wide shot |
| **Current data flow** toggle | Shows or hides observed routes | `.layer-toggle[data-layer=current]` | `currentLayer` visibility | To isolate the predicted path |
| **Predicted data flow** toggle | Shows or hides the purple path | `.layer-toggle[data-layer=predicted]` | `predictedLayer` visibility | To explain current versus predicted |
| **DEPT filter** | Filters by owning department | `#department-filter` | Rebuilds all flows | To show one team's traffic |
| **TYPE filter** | Filters by node type | `#type-filter` | Rebuilds all flows | To isolate databases or servers |
| **ALL / NORMAL / ANOMALY** | Filters by problem status | `#anomaly-filter` | Rebuilds all flows. ANOMALY leaves 19 routes; NORMAL leaves 5 | The strongest single filter for a demo |
| **Simulation speed** 0.25×–3× | Multiplies all motion | `#speed-control` | Particle phase increments, shader time, the sim clock | Slow down to explain, speed up to show rhythm |
| **Hologram intensity** 0.4×–1.8× | Bloom strength | `#bloom-control` → `applyModeLighting()` | Glow only. No data changes | Adjust for the projector |
| **FAST / HIGH / ULTRA** | Render quality | `applyRenderQuality()` | Pixel ratio, shadows, conduit and particle counts, river strand counts | Use FAST on a weak laptop |
| **Click a building** | Node Inspector | `showNodeDetails()` | Camera glides in; the panel shows in/out traffic, load, latency, connections, response time, threat and anomaly count | To prove exact numbers exist |
| **Click a route (city)** | Spatial route focus | `enterRouteFocus()` | The city dims, metric beacons float along the route, an alternative is offered if anomalous | The most impressive single interaction |
| **PIN / FOLLOW PARTICLE** | Locks focus, or rides a particle | `toggleRoutePin()`, `toggleParticleFollow()` | The camera chases one particle along the curve | A memorable moment |
| **Alert Center (VIEW)** | Opens the alert dialog | `#open-alerts` | A modal listing the 8 highest-severity events | To show the incident list |
| **Camera presets** (keys 1–4, R) | Perspective, top, side, front, reset | `setCameraPreset()` | Eased camera moves | Top view to explain the layout |
| **Rotate / zoom / pan** | Free camera | `OrbitControls` | Camera transform | Whenever you are talking |
| **Flow panel PREV / PAUSE / NEXT** | Step control for the story | `flowJump()`, `toggleFlowPause()` | Jumps or freezes phases | To reach the What-If quickly |
| **ROWS button** | Cycles DEMO STORY / LATEST / PEAK LOAD | `toggleFlowProfile()` | Restarts the story with different rows | To show a healthy run versus a problem run |
| **KPI strip** | 8 headline numbers | `populateDashboard()` | — | Your opening numbers |
| **Traffic forecast chart** | 12-hour trend | `buildForecastChart()` | — | To show the trend |
| **Predicted events** | Top 3 node forecasts | `populateDashboard()` | — | To introduce prediction |
| **Recommendation engine** | The first 4 rules | `populateDashboard()` | — | To close the loop |

### The KPI numbers with the shipped data

| Card | Value | Where it comes from |
|---|---|---|
| TOTAL TRAFFIC | 68.5K MB | `metrics.total_data_volume_mb` |
| AVG LATENCY | 43.4 ms | `metrics.average_latency_ms` |
| BANDWIDTH | 42.2 % | `metrics.average_bandwidth_usage_percent` |
| NETWORK LOAD | 41.5 % | `metrics.average_network_load_percent` |
| CONNECTIONS | 56 | `metrics.active_connections` — **the last row only**, not a total |
| ANOMALIES | 28 | `metrics.anomalies` — **dataset labels**, not the model |
| CRITICAL ROUTES | 2 | Computed in JS: anomalyCount > 0 **and** (load > 60 or latency > 70) |
| SYSTEM HEALTH | 83 % STABLE | `clamp(round(100 − load×0.18 − loss×1.2 − anomalies×0.28), 45, 99)` — **our own formula**, not an industry standard |

---

## 35. Current vs Predicted Routes

| | Current / observed | Predicted / simulated |
|---|---|---|
| **Geometry** | Glass conduit bridge, or a solid sky arc | Elevated **dashed** sky arc |
| **Opacity** | Solid, shader opacity around 0.95 | Translucent, around 0.32–0.55 |
| **Colour** | Rule-based: blue, cyan, yellow, red or green | Always **purple** |
| **Source of truth** | `state.routeStats`, built from real rows | `ml_results.predictive_flow` (prepared) or the What-If branch (calculated live) |
| **Built by** | `buildCurrentFlows()` → `addConduit()` / `addSkyArc()` | `buildPredictedFlows()` and `buildSimulatedRoute()` |
| **Layer** | `currentLayer` | `predictedLayer`, `flowLayer` |
| **Toggle** | "Current data flow" | "Predicted data flow" |

### Two different purple routes — know the difference

| | The stored predictive path | The What-If alternative |
|---|---|---|
| **Where it comes from** | A **literal list** in `analyze_and_predict.py`: current `[Server-01, API-Gateway, Server-02, Database-01]`, predicted `[Server-01, API-Gateway, Server-04, Database-02]` | Computed live by `chooseAlternative()` and `simulateAlternative()` |
| **Is it model output?** | **No.** It is a prepared scenario path **[DEMO / VISUAL METAPHOR]** | It is a calculation over observed baselines **[SIMULATED]** |
| **When visible** | Always, if the predicted layer is on | Only during a What-If branch |
| **Extra detail** | Carries a "Route via Server-04" chip. Two of its segments (`Server-01 → API-Gateway`, `API-Gateway → Server-04`) **do not exist in the dataset** | Its baseline source is printed on the card |

### How the audience should read them

> **Solid means this is what we observed. Translucent purple means this is a projection, not a measurement. Green means this is the option that was chosen.**

---

## 36. End-to-End Technical Flow

```
[SYNTHETIC DATA]  python/generate_dummy_data.py
                  seed 42, 16 nodes, 22 weighted routes, business-hours rhythm,
                  a problem injected every 13th row
        ↓
                  data/network_traffic.csv  +  data/network_traffic.json   (360 rows x 28 fields)
        ↓
[ML OUTPUT]       python/analyze_and_predict.py   (run by hand, once)
                    pd.read_csv, sort by timestamp        <- no cleaning step exists
                    IsolationForest(180 trees, contamination 0.08) on 14 numeric columns
                        -> 29 rows flagged
                    build next-interval targets per source_id, one-hot encode ~60 features
                    4 x RandomForestRegressor(140 trees, depth 12), 275 train / 69 test
                        -> MAE and R2 recorded
                    scenario_floors raise 4 nodes                <- DEMO calibration
                    risk labels assigned (Critical / Watch / Stable)
                    groupby route -> high-traffic zones and bottlenecks
                    resample 4h -> 9 historical + 3 projected points (fixed multipliers)
                    severity score -> top 8 alerts
                    6 if/else rules -> recommendations
                    predictive_flow written as a literal            <- DEMO path
        ↓
                  data/ml_results.json  +  sample_outputs/analysis_summary.txt
        ↓
                  python -m http.server 8000        <- a file server only
        ↓
                  browser requests index.html, then css, chart.umd.js, js/app.js
        ↓
[IMPLEMENTED]     main()
                    loadData()        fetch both JSON files
                    aggregateData()   24 route summaries, 16 node summaries
                    selectSituation() pick the record for the 12-step story
                    populateDashboard() + buildForecastChart()
                    initThree()
                      buildCityEnvironment / buildNodes / buildCurrentFlows /
                      buildPredictedFlows / buildFlowRiver / buildSplatScene
                      -> setVisualizationMode('city') -> animate()
                    bindUi(), startSimulationClock()
                    +1100 ms -> startSystemFlow()
        ↓
                  data mapped to visuals:
                    flowColor()        -> route and particle colour
                    departmentColor()  -> building identity colour
                    addConduit()       -> particle size, count and speed
        ↓
[IMPLEMENTED]     FlowSequence runs FLOW_PHASES, one phase at a time
        ↓
                  at four phases: classifyIssue() against WHATIF_LIMITS
                       healthy -> continue
                       issue   -> runWhatIfBranch()
        ↓
[SIMULATED]       projectUnderTraffic() and simulateAlternative()
                  -> cards badged SIMULATED, purple alternative route
        ↓
[rule-based]      recommendation shown, cross-referenced with ml_results.recommendations
        ↓
                  optimisation applied inside the story, ids updated, story continues
        ↓
                  human reads it and decides.   Nothing real is changed.
```

---

## 37. Real vs Visual

The table that prevents presentation mistakes.

| Feature | What it looks like | What it actually means |
|---|---|---|
| **Particle** | A glowing dot flying along a bridge | A visual share of the route's measured volume and speed. **Not one packet** |
| **File icon / `project_build.zip`** | A labelled box travelling through the city | **[DEMO / VISUAL METAPHOR]** The dataset contains no filenames or file contents |
| **Building** | A tower, vault, ring or pyramid | One of the 16 systems in the modelled topology. Its position is hand-placed, not computed |
| **Road / bridge** | A glass tube between two islands | A logical source-to-destination relationship that exists in the dataset |
| **Sky arc** | A dashed line high above the city | The same thing, drawn differently because a bridge would cross another island or the bridge budget is used up |
| **Cloud white glow** | A bright white flash with sparks | **The current Cloud operation completed successfully.** Not "data is in the cloud" |
| **Purple route** | A translucent dashed arc | A projection. Either the prepared predictive path or a live What-If alternative. **Never observed traffic** |
| **Red route** | A throbbing red tube | A bottleneck segment, a failure, a critical threat, or an anomaly with bad metrics |
| **Green route** | A solid green tube | A recommended segment, or the option that was applied inside the story |
| **Database animation** | A cube sinking into a vault | Persistence, as a metaphor. **No SQL exists in the project** |
| **Security shield** | A wireframe sphere and a sweeping laser | An inspection decision. **No firewall or access control is called** |
| **AUTH ✓ / ROUTE ✓** | Floating labels at the gateway | **[DEMO / VISUAL METAPHOR]** The dataset has no authentication event |
| **Upload 25 → 100 %** | A counter above the cloud | **[DEMO / VISUAL METAPHOR]** The row behind it is real; the percentage is storytelling |
| **Queue lane packets** | Boxes waiting outside a building | Driven by the real `queue_length` value, above 20 |
| **BOTTLENECK chip on Server-02** | A red floating label | The node with the **highest predicted load** in `ml_results`, which is 91.2 % from a demo floor |
| **Simulation clock** | A ticking UTC time in the top bar | A clock counting up from the last dataset timestamp. **Not a live feed** |

---

## 38. Real vs Synthetic vs Simulated

| Class | What it covers | Where it comes from | Is it a measurement? | How to describe it |
|---|---|---|---|---|
| **Current telemetry** | What a real deployment would ingest | **[PLANNED / CONCEPTUAL]** — does not exist in this project | Would be | "That is the next phase" |
| **Synthetic telemetry** | All 360 rows and 28 fields | `generate_dummy_data.py`, seed 42 | It is the prototype's stand-in for measurement | "Generated data shaped like real telemetry" |
| **ML-derived result** | 16 predictions, 8 alerts, 12 forecast points, model scores | `analyze_and_predict.py` → `ml_results.json` | No. It is a model output over synthetic data, and four nodes carry demo floors | "Real models, weak scores, documented floors" |
| **What-If result** | Every number on a card badged SIMULATED | `projectUnderTraffic()`, `simulateAlternative()` | **Never.** It is a calculation | "A projection so we can compare options" |
| **Visual metaphor** | File name, AUTH labels, upload percentages, the city itself, the sinking cube | The story code | No | "A visual language for what each system does" |
| **Future real data** | Authorised live telemetry with login and an ingestion pipeline | **[PLANNED / CONCEPTUAL]** | Would be | "Phase two" |

**The one-line summary:** *"Observed comes from a dataset row. Predicted comes from a model file. Simulated comes from a live calculation. The application labels all three on screen, and I keep them apart when I speak."*

---

## 39. Real Company Deployment **[PLANNED / CONCEPTUAL]**

Everything in this section is a design, not an implementation.

### Possible authorised sources

| Source | Fields it could supply |
|---|---|
| **Network telemetry** (flow exporters, switch and firewall counters) | volume, speed, bandwidth, latency, packet loss, connection status |
| **API gateway metrics** | api_requests, queue_length, response_time, route status |
| **Server monitoring** | network_load, queue_length, processing_rate, active_connections |
| **Database metrics** | database_queries, latency, queue depth |
| **Cloud monitoring** | volume, load, egress on cloud services |
| **Security telemetry** | threat_level, access_permission, data_classification |
| **IoT telemetry** | iot_messages, device volume |

### The architecture

```
authorised telemetry     read-only service accounts on existing monitoring systems
        ↓
collector                agents or exporters that pull metrics on a schedule
        ↓
aggregation              normalise into the same 28-field shape, one row per interval
        ↓
backend / API            a time-series store plus an authenticated read API
        ↓
analysis / ML            scheduled or streaming; models retrained on real history,
                         evaluated by backtesting, demo floors removed
        ↓
FlowScope                the front end replaces loadData() with authenticated calls
        ↓
3D visualization         the same city, now reflecting reality
        ↓
human approval           before any action is taken
```

### Non-negotiable requirements

| Requirement | Why |
|---|---|
| **Authorisation** | Written approval from IT security before collecting anything. Monitoring without it is not acceptable |
| **Authentication** | Single sign-on. The prototype has none, and the operator name in the corner is hard-coded text |
| **Access control** | Roles, and scoping by department so people see only what they should |
| **Privacy** | **System-to-system metadata only.** Never message contents, documents, passwords, tokens, personal identifiers, browsing history or anything about individual employees. The visualisation needs none of it |
| **Encryption** | HTTPS in transit and encryption at rest. The prototype serves plain HTTP on localhost |
| **Retention** | A defined retention period and a deletion policy, aligned with data-protection rules |
| **Audit** | A record of who viewed what |
| **Human approval** | Any automated action must be reversible and approved by a person before it runs |
| **Monitoring the monitor** | The collector itself needs health checks, and the UI must show clearly when telemetry is stale or missing |

**Note on scope:** this section describes an architecture at the level of "which existing monitoring systems would be read from". It deliberately does not provide instructions for intrusive collection.

---

## 40. Current Limitations

Every item below was found in the code. Being able to list these is a strength, not a weakness.

| # | Limitation | Evidence |
|---|---|---|
| 1 | **Synthetic dataset** | `generate_dummy_data.py`, `SEED = 42`, anomalies injected every 13th row |
| 2 | **Small data volume** | 360 rows; 344 usable for regression; 275 for training |
| 3 | **Offline, pre-generated ML** | `ml_results.json` has a fixed `generated_at`. Python does not run when the page loads |
| 4 | **Not live** | Both JSON files are fetched once. The top-bar clock only ticks |
| 5 | **Localhost prototype** | `python -m http.server 8000`. No backend, no database, no API |
| 6 | **No authentication or access control** | No login anywhere. "DEMO OPERATOR" is static HTML |
| 7 | **No real telemetry ingestion** | No collector, no network calls except the two local `fetch()` calls |
| 8 | **No infrastructure control** | No network API is called anywhere. "Reroute" only redraws the story |
| 9 | **Weak forecast model** | R² of 0.11, −0.01, −0.06 and 0.19; one chronological split, no cross-validation |
| 10 | **Demo stress floors** | `scenario_floors` raises four nodes. Every Critical and Watch badge comes from them |
| 11 | **Detector output barely surfaced** | Per-row Isolation Forest flags are not persisted; `model_anomalies` is not read by the UI |
| 12 | **No detector evaluation** | No precision or recall is computed against the labels |
| 13 | **Simplified, hard-coded topology** | 16 nodes and their positions are constants, defined in both Python and JavaScript, and can drift apart |
| 14 | **Prepared demo scenarios** | The `predictive_flow` path is a literal, and two of its segments do not exist in the data |
| 15 | **Encoding gaps** | Thickness and glow follow data only on story routes, river tubes and splats, not on ordinary city bridges |
| 16 | **A static confidence badge** | "87 % confidence" in `index.html` is hard-coded; the computed value is 59 % |
| 17 | **Partial recommendation coverage** | No rule for High Latency, Packet Loss, Server Overload, Failed Connection or Traffic Spike; 6 generated, 4 shown |
| 18 | **Browser performance** | Hundreds of meshes, 2× pixel ratio and 4096 shadow maps on ULTRA. Integrated graphics need FAST |
| 19 | **No automated tests** | There is no test suite in the project |
| 20 | **Documentation drift** | The README still describes a nine-step story and 56/96/144 river strands; the code has a 12-step situation story, a 15-phase system flow, and 70/130/190 strands |

---

## 41. Why This Project Is Useful

Stated without exaggeration.

| Benefit | What it actually delivers |
|---|---|
| **Visual understanding** | Topology, direction, volume and health in one picture, so relationships such as "four routes converge on one server" become obvious |
| **Incident communication** | During an incident, a manager and an engineer can point at the same building instead of trading screenshots |
| **Training** | A new joiner can learn the shape of the system in minutes. That is genuinely hard from documentation |
| **Operations overview** | A single ambient view suitable for a wall screen, complementing the detailed dashboards |
| **Demonstration** | It makes an abstract pipeline concrete for non-technical stakeholders, which is often what unlocks funding for the real thing |
| **Capacity planning concepts** | The What-If layer shows the *shape* of the problem: why a system at 95 % reacts badly to a small increase while one at 50 % does not |
| **What-If exploration** | A structured way to compare options before acting, with the assumptions printed |
| **Decision support** | It ends with a recommendation for a human, which is the appropriate boundary for a system with no authority over infrastructure |

**What it is not:** a replacement for Grafana, Prometheus, a SIEM or an APM tool. It is an additional layer on top of them.

---

## 42. What Makes It Different

The value is **integration**, not any single component. Each part on its own is ordinary; the combination is not common in a student project.

```
network-flow data
   +  3D spatial visualization
   +  functional system animations   (each building performs its real job)
   +  anomaly detection              (unsupervised ML)
   +  prediction                     (supervised ML, honestly scored)
   +  What-If simulation             (transparent projection with stated assumptions)
   +  recommendations                (rule-based, honestly labelled)
   =  a decision-support view rather than a dashboard
```

Three things worth pointing at specifically:

1. **Buildings perform their function.** Most 3D network visualisations are nodes and lines. Here the gateway authenticates and routes, the server queues and processes, the database writes and reads, and the cloud confirms success or failure.
2. **The What-If layer states its assumptions.** It prints where the alternative's baseline came from and how much traffic it assumed was moved.
3. **Honesty is built into the interface.** Observed, predicted and simulated are labelled on screen in three colours, so the audience is never left guessing which kind of number they are reading.

**Avoid claiming** "first ever", "unique in the world" or "better than existing tools". The accurate claim is that it integrates these pieces into one coherent, honest view.


---

## 43. 5-Minute Presentation

*Spoken, not read. Pause where the dashes are.*

"Good morning. My project is called FlowScope AI, and I want to start with the problem rather than the technology.

Inside any company, systems talk to each other constantly. Someone opens an application, that application calls an API gateway, the gateway calls a server, the server queries a database, and the results travel on to cloud and analytics services. This happens thousands of times a day, and it is completely invisible. We understand it through logs and monitoring dashboards, which are excellent tools, but they show numbers in separate boxes. During an incident, joining ten of those boxes into one story happens inside an engineer's head, under pressure. And the thing you most want to know, *where* the data is getting stuck, is the hardest thing to see.

So my concept is **data movement visualization**. Let me be precise about three words, because they are easy to confuse. **Data movement** is the concept I want to understand. **Network-flow telemetry** is how I measure it. The **3D Network City** is where I show it.

My goal is not to build a 3D city. The city is the communication layer. The goal is to make invisible backend data movement visible and understandable, identify where problems are happening, predict what may happen next, simulate alternatives, and give a recommendation a human can act on.

Let me explain what is actually running. I open a browser at localhost port 8000. Localhost simply means my own computer. I run a small Python file server, because browsers block loading local data files and JavaScript modules when you open a page directly from disk. The server only hands over files. It is not connected to any network. I want to be very clear about that: this is a prototype on generated data.

The data is a table of 360 records covering three days, one row every twelve minutes, with 28 fields. One row means: at this time, this system sent this much data to that system, at this speed, with this delay, this load, this security classification and this status. It is synthetic, generated with a fixed seed, which gives me reproducibility and lets me guarantee that all nine failure types appear.

Before the browser opens, a Python script analyses that table. An **Isolation Forest** flags the rows that look least like everything else, which is unsupervised, so it needs no answer key. Four **Random Forest** models estimate each system's next interval. A rule engine turns findings into recommended actions. All of it is written to one JSON file, and the browser reads that file.

Now the city. There are sixteen buildings, one per system, on islands in a harbour. Bridges between them are the routes that exist in the data. The moving particles are the data itself. Particle size follows data volume, particle speed follows transfer speed, direction runs from source to destination, and colour follows status.

I should say this clearly, because it is the question people ask: **a particle is not one network packet.** Each route draws between three and fourteen particles, and that count comes from the route's average megabytes. It is a visual representation of measured movement.

Each building performs its real function. The gateway opens a portal, scans the packet and shows authenticate, route, accepted. The server lights its rack LEDs from bottom to top and fills a progress arc, and if the queue length in the data is above twenty, you literally see packets waiting outside. The database cascades its rings, drops the record in, and confirms. The cloud counts an upload up to a hundred percent and then flashes bright white. White has one specific meaning: the cloud operation completed successfully. Not that data arrived, but that the operation succeeded.

Let me walk through what happens in the demo. Development creates a build and sends it to the gateway. The gateway authenticates and routes it to Server-02. And then the telemetry says Server-02 is at ninety-six percent load with fifty-one requests queued. The route thickens, turns yellow, then red. Packets stack up outside the building. The story stops and shows me what I actually measured.

And then the **What-If layer** starts. It asks: what if traffic to this server increases by fifty percent? It projects the answer using a queueing approximation, where delay grows as one over the free capacity, which is why a system at ninety-five percent reacts so badly to a small push. The answer is ninety-nine and a half percent load and nearly four hundred milliseconds of latency, risk critical.

Then it tests an alternative. A translucent purple route appears through Server-04 to Database-02. Crucially, Server-04's starting point is not invented: it is that server's own observed traffic, forty-two percent load. The comparison card shows sixty-six percent load and sixty-six milliseconds against ninety-nine and four hundred. The recommendation appears, the route turns green, the packet travels the new way, the database writes, and the cloud finishes with its white success glow.

Throughout all of that, every number on screen is labelled. Green means observed, from a dataset row. Cyan means predicted, from the model file. Purple means simulated, calculated live. I keep those three apart because confusing them would be dishonest.

Which brings me to limitations, and I would rather state them than be caught by them. The data is synthetic. The analysis is offline, not live. The forecast model is weak on this dataset, with R-squared near zero, and four nodes carry documented demo floors that make the overload story visible. There is no login. And nothing here changes any real system: the word reroute only means the story redraws itself.

So what is it for? It is an additional visualisation and decision-support layer on top of proper monitoring tools, not a replacement for them. Its value is that a manager, a developer and a network engineer can look at the same picture and agree on where the problem is, then compare two options before acting.

The next phase would be a few weeks of authorised, anonymised real telemetry in the same twenty-eight field shape, then a live feed behind a login, models retrained and properly backtested with the demo floors removed, and any action gated behind human approval.

Thank you. I am happy to take questions."

---

## 44. 2-Minute Presentation

"My project is FlowScope AI, and the concept is **data movement visualization**.

In a company, data moves constantly between departments, gateways, servers, databases, cloud and AI services. That movement is where performance and security problems actually live, and it is invisible. We normally see it as numbers in dashboards, where it is very hard to tell *where* data is getting stuck.

My goal is not to build a 3D city. The city is the communication layer. The goal is to make invisible backend data movement visible, detect problems, predict what may happen next, simulate alternatives, and support a human decision.

Here is how it works. The data source is a table: one row per source-to-destination flow every twelve minutes, with twenty-eight fields including volume, speed, latency, load and security context. It is synthetic, generated with a fixed seed. A Python script analyses it before the browser opens: an Isolation Forest finds unusual rows, four Random Forest models estimate each system's next interval, and a rule engine produces recommendations. The browser reads the results and builds a city where each building is a system, each bridge is a route, and the particles are the data. Size follows volume, speed follows transfer speed, and colour follows status.

One example. Development sends a build through the gateway to Server-02. The telemetry shows Server-02 at ninety-six percent load with fifty-one requests queued. The route turns red, packets stack outside the building, and the story pauses to show what was measured.

Then the What-If layer asks: what if traffic increases by fifty percent? It projects ninety-nine and a half percent load and four hundred milliseconds, risk critical. It tests an alternative through Server-04, starting from that server's own observed baseline, and gets sixty-six percent and sixty-six milliseconds. The recommendation appears, the route turns green, and the cloud finishes with a white success glow.

The AI is real but honest. The detector is unsupervised. The forecast is a weak baseline on this small synthetic set, and four nodes carry documented demo floors. The recommendations are rules, not a model, and I do not call them AI.

The final value is that a mixed audience can share one picture, compare two options with the assumptions printed, and make a faster decision. Nothing here monitors or controls a real network. That is the next phase."

---

## 45. 1-Minute Presentation

"FlowScope AI turns backend data movement into a 3D city so you can see what is normally invisible.

Each building is a system: departments, an API gateway, servers, databases, the cloud, an AI engine, security and IoT. The bridges are the real routes in my dataset, and the moving particles represent the measured data movement. Bigger means more data, faster means higher speed, red means a problem.

Behind the picture, a Python pipeline runs an Isolation Forest to find unusual observations and four Random Forest models to estimate the next interval, then rules produce recommendations.

The part I am most proud of is What-If. When a system crosses a threshold, the story pauses, shows what was observed, asks what happens if traffic grows by fifty percent, tests an alternative route using that route's own measured baseline, compares the two side by side, and recommends the better one.

Everything is labelled observed, predicted or simulated, so the three are never confused. It runs on synthetic data on my own laptop. It is a decision-support prototype, not a connection to any real network."

---

## 46. 30-Second Elevator Pitch

"FlowScope AI turns backend data movement into an animated 3D city. Buildings are systems, bridges are routes, and the moving particles represent measured data movement. Machine learning finds unusual behaviour and forecasts the next interval, and a What-If layer lets you test what happens if a problem grows and whether a different route would be better, before you act. It runs on synthetic data on my own laptop, so it is a decision-support prototype, not a live network connection."

---

## 47. Demo Script

Start the server first, in your own terminal so it survives:

```
python -m http.server 8000
```

Then open `http://localhost:8000` and press **Ctrl+F5** once.

---

**STEP 1 — Open**

> **SAY:** "This is FlowScope AI. I want to be clear from the start: this runs on my laptop, on generated data. It is not connected to any network."
> **SHOW:** The loading screen, then Network City.
> **EXPECTED:** The loading text reads "Loading synthetic network telemetry", then the harbour city appears and the bottom-centre **SYSTEM FLOW** panel starts at PHASE 01 / 15.
> **NEXT:** Check the ROWS button reads **ROWS: DEMO STORY**. If not, click it until it does.

**STEP 2 — The city**

> **SAY:** "Sixteen buildings, one per system. The bridges are the real routes in my dataset. The particles are the data itself."
> **SHOW:** Drag to rotate slowly. Point at the Development tower, the gateway ring, the four servers on the shared island, the two database vaults, the AI pyramid, the cloud, the IoT mast.
> **EXPECTED:** Labels float above each building. Server-02 is visibly red with a beacon.
> **NEXT:** Press **2** for top view, then **1** to return.

**STEP 3 — The encoding**

> **SAY:** "Particle size follows data volume, speed follows transfer speed, and direction runs from source to destination. A particle is not one packet; it is a visual share of the measured traffic."
> **SHOW:** Point at a busy bridge and a quiet one.
> **EXPECTED:** Visibly different density and dot size.
> **NEXT:** Let the story run to phase 5.

**STEP 4 — The numbers**

> **SAY:** "Total traffic sixty-eight thousand megabytes, average latency forty-three milliseconds, twenty-eight labelled anomalies, health eighty-three percent. Health is my own composite formula, not an industry standard."
> **SHOW:** The HUD chips at the top left of the scene, or press the ☰ button to open the control rail.
> **EXPECTED:** Traffic, latency, load and health chips with sparklines.
> **NEXT:** Return to watching the story.

**STEP 5 — The problem appears**

> **SAY:** "Now watch Server-02. The telemetry says ninety-six percent load with fifty-one requests queued."
> **SHOW:** Phase 5, `SERVER_PROCESS`.
> **EXPECTED:** LEDs sweep, the route thickens and turns yellow then red, packets stack in front of the building, and a red message reads "Issue Detected - Server Overload".
> **NEXT:** Let it pause.

**STEP 6 — The observed state**

> **SAY:** "The story stops and shows me exactly what was measured. Notice the badge says OBSERVED."
> **SHOW:** The CURRENT STATE card.
> **EXPECTED:** Load 96 %, latency 45 ms, queue 51, loss 0.23 %, route status Optimal, badge **OBSERVED**.
> **NEXT:** Press **PAUSE** on the flow panel if you want to hold it.

**STEP 7 — What-If**

> **SAY:** "Now the What-If layer. What happens if traffic grows by fifty percent?"
> **SHOW:** The city dims and the purple question appears.
> **EXPECTED:** "What if traffic to Server-02 increases by 50%?" and the panel data-class line turns purple, reading SIMULATED.
> **NEXT:** Let it continue.

**STEP 8 — The projection**

> **SAY:** "Ninety-nine and a half percent load, nearly four hundred milliseconds, risk critical. These are projections, not measurements, and the app says so."
> **SHOW:** The red IF NOTHING CHANGES card.
> **EXPECTED:** Load 99.5 %, latency 399 ms, queue 476, risk CRITICAL, badge **SIMULATED**.
> **NEXT:** Continue.

**STEP 9 — The alternative and the comparison**

> **SAY:** "It tests an alternative through Server-04. Server-04's starting point is its own observed traffic, forty-two percent load, so the baseline is real."
> **SHOW:** The purple dashed route, then the two-column card.
> **EXPECTED:** 99.5 % / 399 ms against **66 % / 66 ms**, risk MEDIUM, with the assumption printed at the bottom.
> **NEXT:** Continue.

**STEP 10 — Recommendation and optimisation**

> **SAY:** "The recommendation is to shift traffic. The route turns green and the story continues on Server-04. Nothing real is rerouted; the story redraws itself."
> **SHOW:** The green message, then the packet travelling via Server-04.
> **EXPECTED:** Purple becomes green, Server-02 returns to normal.
> **NEXT:** Continue to the database and the cloud.

**STEP 11 — Cloud success**

> **SAY:** "White has one meaning: the cloud operation completed successfully. Not that data arrived, but that the operation succeeded."
> **SHOW:** Phase 10, `CLOUD_SAVED`.
> **EXPECTED:** Cloud-01 flashes bright white with sparks and an expanding ring, "File Saved Successfully ✓", then "Network Optimized — Operation Completed Successfully".
> **NEXT:** Click **EXPLORE FULL NETWORK** on the result panel.

**STEP 12 — Inspect a building**

> **SAY:** "Everything is inspectable. Here are Server-02's exact numbers."
> **SHOW:** Click the Server-02 tower.
> **EXPECTED:** The Node Inspector shows incoming and outgoing traffic, load, latency, connections, response time, threat level and anomaly count.
> **NEXT:** Mention the honest detail: "The health pill says healthy because those are three-day averages; the red state is the forecast."

**STEP 13 — Inspect a route**

> **SAY:** "And here is a single route with its metrics floating in space."
> **SHOW:** Click a red bridge.
> **EXPECTED:** The city dims, beacons appear for volume, speed, latency, packet loss and bandwidth, and a green recommended alternative if the route is anomalous.
> **NEXT:** Press **FOLLOW PARTICLE**, then **Esc**.

**STEP 14 — Filters**

> **SAY:** "I can isolate just the problem traffic."
> **SHOW:** Open the control rail, click **ANOMALY** in the filter, then **ALL**.
> **EXPECTED:** The city thins to 19 routes, then returns to 24.
> **NEXT:** Optionally switch to **FLOW RIVER** for ten seconds.

**STEP 15 — The honest close**

> **SAY:** "To be clear about what this is: three hundred and sixty synthetic records, analysed offline, on a local server, with no login and no control over any real system. The forecast is a weak baseline and four nodes carry documented demo floors. What it demonstrates is the pipeline and the decision-support view. The next phase is authorised real telemetry."
> **SHOW:** Face the audience, not the screen.
> **EXPECTED:** Nods.
> **NEXT:** "Questions?"


---

## 48. Viva Master Section

### Basic concept

**1. What is your project?** FlowScope AI turns records of data moving between backend systems into an animated 3D city, adds anomaly detection and forecasting, and lets you test What-If conditions before acting. The output is a recommendation for a human.

**2. What is the exact concept?** Data movement visualization. Data movement is what I want to understand, network-flow telemetry is how I measure it, and the Network City is where I show it.

**3. What is your goal?** To make invisible backend data movement visible, understandable, predictive and actionable, so a human can decide faster and better.

**4. Is the 3D city the goal?** No. It is the communication layer. If a table conveyed the same understanding as quickly, a table would be fine.

**5. Who is the audience?** A mixed one. Managers, developers, network engineers and analysts, all looking at the same picture.

### Networking

**6. What is an API gateway?** A single controlled entrance to a set of backend services, where authentication, rate limiting, routing and logging are handled consistently in one place.

**7. What is latency versus response time?** Latency is the network delay alone. Response time is the full application turnaround, so it is always larger. In my data response time is generated as latency times 1.15 to 1.85.

**8. What is bandwidth versus transfer speed?** Transfer speed is how fast the data actually moved, in megabits per second. Bandwidth usage is what share of the link's capacity that consumed, as a percentage.

**9. What is network load versus bandwidth usage?** Load is stress on the systems involved. Bandwidth is utilisation of the link. A server can be at high load while its link is not full.

**10. What is queue length?** How many requests are waiting to be processed. It is the earliest warning of overload, which is why my story shows packets stacking outside a building when it exceeds twenty.

**11. What is packet loss?** The percentage of data that did not arrive. In my dataset one hundred percent means the connection failed outright.

### Dataset

**12. How many records?** 360, one every twelve minutes across three days, with 28 fields each.

**13. What does one row mean?** One observation of data moving from one system to another during one twelve-minute slot, with its performance, workload, security and status attributes.

**14. Where does the data come from?** `python/generate_dummy_data.py`, with seed 42. It is synthetic.

**15. Why is `anomaly_status` in the dataset?** It is a ground-truth label written by the generator so I can demonstrate all nine failure types. The Isolation Forest never sees it.

**16. How many systems and routes?** Sixteen systems and twenty-four unique source-to-destination routes.

**17. Does the dataset contain personal data?** No. It is system-to-system metadata only, with no people, no content and no addresses.

### Visualization

**18. What is a particle?** A visual representation of measured data movement. Each route draws three to fourteen particles based on its average megabytes.

**19. Is a particle a packet?** No. That is the most important thing to get right.

**20. What does particle size mean?** Data volume, computed as `.26 + clamp(volume/2600, .02, .18)`.

**21. What does particle speed mean?** Transfer speed, computed as `.03 + speed/9000`.

**22. What does route thickness mean?** Bandwidth usage, but only on story routes, river tubes and splats. Ordinary city bridges use a fixed radius, and I say so.

**23. Why are buildings different colours?** Building colour is department identity. Flow colour is data status. They are two independent systems that never mix.

### Three.js

**24. Why Three.js?** It is the standard JavaScript 3D library, it runs in any browser with no installation, and I bundled it locally so the prototype works offline.

**25. What are the main Three.js pieces?** A scene, a perspective camera, a WebGL renderer, lights, materials and geometry, plus OrbitControls for the camera and UnrealBloomPass for the glow.

**26. How do particles move?** Each has a phase from 0 to 1 along a Catmull-Rom curve. Every frame the phase advances by delta times speed times the simulation-speed multiplier, and the position is read from the curve.

**27. How do you keep it fast?** Objects are pooled in `particlePool`, geometry and textures are cached and shared, all three views are built once and toggled, and three quality presets scale pixel ratio, shadows and object counts.

### Localhost

**28. Why localhost?** Localhost means my own computer. I serve the folder over HTTP because browsers block `fetch()` of local files and JavaScript modules on a `file://` page.

**29. What is the server doing?** `python -m http.server 8000` hands over files. It has no database, no login and no logic.

**30. Does Python run when the page loads?** No. The two Python scripts run beforehand and leave `ml_results.json` behind. The browser only reads that file. Its `generated_at` timestamp proves it was a separate earlier event.

**31. Is localhost monitoring your office?** No. Nothing is scanned, captured or connected to. It serves files from one folder on one laptop.

### AI and ML

**32. Which algorithms?** Two, both scikit-learn: Isolation Forest for anomaly detection, and four Random Forest Regression models for prediction.

**33. Where do they run?** In `python/analyze_and_predict.py`, offline, before the browser opens.

**34. What features do they use?** The detector uses fourteen numeric columns. The forecaster uses those plus hour, minute, day of week, and one-hot encoded source, destination, types, priority and threat level.

**35. Is the recommendation engine AI?** No. It is six deterministic `if` rules, and I do not call them AI.

**36. Is the AI-Engine building your machine learning?** No. That building represents an analytics service inside the modelled company. My machine learning is Python code that runs offline.

### Anomaly detection

**37. What does Isolation Forest do?** It repeatedly splits the data at random and measures how quickly each row becomes isolated. Rows that separate quickly are unusual.

**38. Why is it unsupervised?** It is never shown the label column, so it needs no answer key. That matters because real failures are rare and rarely labelled.

**39. How many rows did it flag?** Twenty-nine out of three hundred and sixty, with contamination set to 0.08.

**40. Why does the KPI say 28 then?** Because that card counts the dataset's own labels. Twenty-eight labelled, twenty-nine flagged by the model. Two different numbers that the code never compares.

**41. Can it find the root cause?** No. It only says a row is unusual compared with the others. It does not know why, and it cannot distinguish an incident from a legitimate rare event.

### Prediction

**42. What does it predict?** For each system, the next interval's data volume, network load, latency and bandwidth usage.

**43. What does "next interval" mean?** The next row belonging to the same source system, which is roughly twelve minutes later.

**44. How accurate is it?** Weak on this data. R-squared values of 0.11, minus 0.01, minus 0.06 and 0.19, so barely better than guessing the average. The rows are generated independently and there are only 275 training rows.

**45. Then why does Server-02 show critical?** Because of documented stress floors on four nodes in `scenario_floors`, which make the demo scenario visible. The JSON records this in each prediction's `forecast_basis`.

### What-If

**46. What is What-If simulation?** It asks what might happen if a condition changes, projects the answer, tests an alternative, and compares them so an option can be chosen before acting.

**47. Is What-If a machine-learning prediction?** No. It is a transparent queueing calculation. Prediction comes from a trained model; What-If is a projection I choose to run.

**48. How does the maths work?** An M/M/1 approximation where delay grows as one over the free capacity. The service time implied by the observed latency and load is held constant, so only the extra demand changes the result.

**49. Are the alternative's numbers invented?** No. The alternative starts from its own observed baseline, using its route rows if there are at least three, otherwise the destination node's aggregate. The card prints which was used.

**50. What if no safe alternative exists?** The app says "No safe alternative available" and invents nothing. For a security threat it deliberately never offers a reroute.

### Recommendations

**51. How are recommendations produced?** Six deterministic rules in `recommendations_for()`, based on the anomaly labels, route status and predicted load. Six are generated and four are shown.

**52. Give an example.** If any row is labelled API Overload, or the gateway's predicted risk is not stable, recommend increasing gateway capacity and enabling rate-based autoscaling.

**53. Are recommendations pre-generated?** Yes. They are computed once by the Python script and stored in `ml_results.json`. The browser only displays them.

### Architecture

**54. Walk me through the pipeline.** Generator writes CSV and JSON. Analysis script runs both models plus rules and writes `ml_results.json`. A local file server serves everything. The browser loads both JSON files, aggregates per route and node, builds the 3D scene, and runs the story with its What-If branch.

**55. Where is the whole application?** In `js/app.js`, 7,737 lines. The HTML is a skeleton and the CSS is styling.

**56. How is the story controlled?** A `FlowSequence` class advances fifteen phases from the render loop using the frame delta, which is why pausing the render pauses the story exactly.

### Real deployment

**57. How would you connect real data?** Replace the generator with authorised collectors reading existing monitoring systems, add a time-series store and an authenticated API, retrain the models on real history, and remove the demo floors.

**58. What permissions would you need?** Written approval from IT security, and read-only service accounts on the monitoring systems. Nothing invasive.

**59. Would you need employee data?** No. System-to-system metadata only. Never message contents, documents, passwords, tokens or personal identifiers.

**60. Would it control the network?** Not without human approval, and even then that would be a separate, authorised system. The current prototype has no such capability at all.

### Limitations

**61. What is the biggest limitation?** The data is synthetic, so nothing here proves real production behaviour.

**62. What else?** Offline analysis, a weak forecast model, demo floors on four nodes, no login, no ingestion, no infrastructure control, and no automated tests.

**63. What is only partially implemented?** Route thickness and glow follow data only on story routes. The detector's per-row flags are not persisted. There is no rule for several anomaly types. The 87 percent confidence badge is static text.

### Future scope

**64. What is next?** Phase two, a few weeks of authorised anonymised telemetry in the same 28-field shape. Then a live feed behind a login, retrained and backtested models, an interactive What-If control panel, and human-approved remediation.

**65. What would you improve first?** Persisting the Isolation Forest's per-row scores so the city can highlight exactly which observations the model flagged, and measuring the detector against the labels.

---

## 49. Difficult Viva Questions

**Why 3D instead of Grafana?** I am not replacing Grafana. Grafana is better at precise time-series values, and I say so. Three-D adds topology, direction and simultaneous state, which a panel-based dashboard cannot show. It is an additional layer for shared understanding.

**Why not just a normal dashboard?** A dashboard shows one metric per panel, so joining ten panels into one story happens in the viewer's head. My view shows the relationships directly, and the exact numbers are still one click away in the inspectors.

**Does a particle equal a packet?** No. Each route draws three to fourteen particles derived from its average megabytes. A particle is a visual share of measured movement, not a countable unit.

**How do you know data actually moved?** In this prototype I do not, because the data is synthetic. What I can prove is that every visual property traces to a specific field in a specific row, and the panel prints which row. With real telemetry the same mapping would carry real evidence.

**Why use synthetic data?** For safety, reproducibility and controlled anomalies. I needed all nine failure types present to demonstrate the handling, and a fixed seed so my demonstration is identical every time. It proves the pipeline, not production performance.

**Can Isolation Forest identify the exact root cause?** No. It only says a row is unusual relative to the others. It does not know why, cannot separate a genuine incident from a legitimate rare event, and cannot see a problem that looks statistically normal.

**Why Random Forest?** It handles mixed numeric and categorical inputs, needs little tuning, resists outliers and gives a reasonable baseline. For real time-series work I would move to models built for temporal structure and backtest them properly.

**How accurate is your prediction?** On this dataset, poor. R-squared of 0.11, minus 0.01, minus 0.06 and 0.19. I report those numbers rather than hide them, and I explain that independent synthetic rows and 275 training samples are the reason.

**What happens if the ML prediction is wrong?** Nothing breaks, because nothing is automated. A wrong forecast produces a wrong badge and possibly an unnecessary recommendation, which a human then rejects. That is exactly why the chain ends at a human.

**Is What-If an ML prediction?** No. Prediction is model output. What-If is a transparent queueing calculation with printed assumptions. They are labelled differently on screen, cyan and purple.

**Does your system actually reroute production traffic?** No. There is no network call anywhere in the codebase. "Reroute" only means the story redraws itself along a different path.

**Can it read employee files?** No. There is no file access of any kind. The dataset contains no content, only counts and measurements.

**Can it see passwords?** No, and it should never be built to. The design deliberately works at the system-to-system metadata level only.

**Is localhost monitoring your office?** No. It is a Python file server handing over files from one folder on my laptop. It opens no sockets to any other machine.

**Is the Cloud building a real cloud connection?** No. Cloud-01 is a node in my modelled topology. There is no cloud account, no API key and no upload.

**Does green mean the actual network was fixed?** No. Green means the simulated option was accepted and the story continued on that route. Nothing real changed.

**What happens when telemetry is missing?** Two things happen in the current code. If a route pair has no rows, `pickFlowRecord()` falls back to the nearest row of the same node types and the panel prints that substitution. If the JSON files fail to load entirely, `loadData()` falls back to ninety built-in rows and a fabricated analysis so the app still runs. In a real deployment, missing telemetry should be shown as unknown rather than substituted, and I would treat that as a required change.

**What is the biggest limitation?** The dataset is synthetic, so the project demonstrates a working pipeline and a decision-support view but proves nothing about real production behaviour.

**Why is Server-02 red but its inspector says healthy?** Because they measure different things. The inspector shows three-day averages, which are 44.9 percent load and 43 milliseconds, so it is healthy on average. The red state comes from the forecast and from fixed demo styling. I would reconcile that in a real version.

**Two of your predicted path's segments do not exist in the data. Why?** Because that path is a prepared scenario literal in the Python script, not model output. I flag it as a demo artefact, and the live What-If alternative is the part that is actually computed.

---

## 50. "Sir Asks Why?" Section

| Question | Short answer |
|---|---|
| **Why Network City?** | A building has a place, a size, lights and a state, and so does a system. Space is how humans remember relationships. |
| **Why particles?** | Movement is the subject, and a still image cannot show movement. One particle carries volume, speed, direction and state at once. |
| **Why Three.js?** | The standard browser 3D library, no installation needed, and bundled locally so the prototype runs offline. |
| **Why AI?** | Thresholds only catch the failures you already imagined. Unsupervised detection finds the unusual without being told, and regression estimates what comes next. |
| **Why Isolation Forest?** | Unsupervised, scale-tolerant, fast, and well suited to numeric tables. Real failures are rare and rarely labelled. |
| **Why Random Forest?** | Handles mixed numeric and categorical inputs, needs little tuning, resists outliers, and gives an interpretable baseline. |
| **Why What-If?** | Because prediction alone does not tell you what to do. Comparing options before acting is the actual decision. |
| **Why a recommendation?** | To turn a finding into a sentence someone can act on. Detection without a next step is not decision support. |
| **Why localhost?** | Browsers block loading local data files and modules from disk, so a small file server is required. It also proves nothing external is involved. |
| **Why synthetic data?** | Safety, reproducibility, and guaranteed coverage of all nine failure types. |
| **Why is the Cloud white on success?** | White is the highest-contrast, most unmistakable signal available, and it is reserved for exactly one meaning so it can never be misread. |
| **Why different building colours?** | To separate identity from status. Building colour says who owns the system; flow colour says what is happening to the data. |
| **Why is the predicted route purple?** | Purple is outside the healthy blue-to-green range and the alarming red range, so a projection can never be mistaken for observed traffic. Translucent and dashed reinforces it. |
| **Why is an anomaly red?** | Universal convention for a problem, and it draws the eye first, which is what you want during an incident. |
| **Why is the optimised route green?** | Universal convention for resolved or safe, and it visually closes the story: red problem, purple option, green outcome. |

---

## 51. Common Presentation Mistakes

| Do not say | Say instead |
|---|---|
| "Each particle is one network packet." | "A particle is a visual representation of measured data movement, not necessarily one packet." |
| "Localhost is connected to the company network." | "Localhost is my own laptop serving the prototype's files. Nothing external is connected." |
| "This is real company data." | "The dataset is synthetic, generated with a fixed seed so the demonstration is reproducible." |
| "`project_build.zip` is in the telemetry." | "The file name is a storytelling metaphor. The dataset contains no filenames or file contents." |
| "Isolation Forest identifies the root cause." | "It flags rows that are unusual compared with the rest. It does not know why." |
| "The prediction is guaranteed." | "It is a baseline with R-squared near zero on this data, and four nodes carry documented demo floors." |
| "The What-If numbers are observed." | "They are a projection. The app labels every simulated card SIMULATED." |
| "The recommendation changes production infrastructure." | "It recommends. Nothing real is changed, and any real action would need human approval." |
| "The buildings are really processing data." | "The animations are a visual language for what each system does. The real content is the telemetry row behind each step." |
| "All of this is AI." | "The detector and the forecaster are machine learning. The recommendations are six deterministic rules." |
| "It is live." | "The animation is continuous, but the data is a static snapshot analysed offline. The top clock is a simulation clock." |
| "The AI-Engine building is my model." | "That building represents an analytics service in the modelled company. My models are Python code that runs offline." |
| "White means the data reached the cloud." | "White means the cloud operation completed successfully. Arrival alone never triggers it." |
| "The purple path was computed by the model." | "The stored predictive path is a prepared scenario literal. The What-If alternative is the part computed live." |
| "The AI found 28 anomalies." | "Twenty-eight are labelled events in the dataset. The Isolation Forest separately flagged twenty-nine." |
| "Green means the network was fixed." | "Green means the simulated option was accepted and the story continued on it." |
| "It replaces our monitoring tools." | "It is an additional visualisation and decision-support layer on top of them." |
| "The system blocked the threat." | "The Security Hub shows the decision to block. It has no ability to block anything in reality." |

---

## 52. Cheat Sheet

| | |
|---|---|
| **PROJECT** | FlowScope AI |
| **CONCEPT** | Data Movement Visualization |
| **INPUT** | Network-flow telemetry. 360 synthetic rows, 28 fields, one every 12 minutes, seed 42 |
| **VISUALIZATION** | 3D Network City, built with Three.js in `js/app.js` |
| **BUILDINGS** | 16 systems: 5 departments, 1 API gateway, 4 servers, 2 databases, 1 cloud, 1 AI engine, 1 IoT gateway, 1 security hub |
| **ROUTES** | 24 unique source-to-destination pairs |
| **PARTICLES** | Visual representation of measured data movement. Size = volume, speed = transfer speed, direction = source to destination |
| **ANALYSIS** | Totals, averages, busiest routes, bottleneck routes |
| **ANOMALY** | Isolation Forest, 180 trees, contamination 0.08, unsupervised, flagged 29 of 360 |
| **PREDICTION** | 4 × Random Forest Regression, 140 trees, next-interval volume / load / latency / bandwidth. R² 0.11, −0.01, −0.06, 0.19 |
| **WHAT-IF** | Queueing projection over observed values, plus an alternative baselined on its own observed rows |
| **RECOMMENDATION** | 6 deterministic rules, 4 displayed. **Not** machine learning |
| **STORY** | 15 phases with conditional What-If branching, plus a separate 12-step situation walkthrough |
| **CLOUD SUCCESS** | Bright white glow, bloom, 3–5 sparks, one expanding ring. Means the operation completed successfully |
| **COLOURS** | Blue normal, cyan fast, yellow priority or warning, red problem, purple predicted or simulated, green recommended or resolved, white cloud success only |
| **DEPARTMENT COLOURS** | Copper Development, coral QA, gold Finance, pearl Management, rose HR, bronze Operations, gunmetal IT |
| **OUTPUT** | Visual decision support |
| **KEY NUMBERS** | 68.5K MB traffic, 43.4 ms latency, 41.5 % load, 28 labelled anomalies, 2 critical routes, 83 % health |
| **RUN IT** | `python -m http.server 8000`, then `http://localhost:8000` |
| **GOAL** | Make invisible backend data movement visible, understandable, predictive and actionable |
| **NOT** | Not live, not real company data, not connected to any network, not controlling anything |

---

## 53. One-Line Memory Answers

1. "Data movement is my concept; network-flow telemetry is my data source."
2. "The Network City is the visual representation of digital infrastructure."
3. "Particles represent measured data movement, not necessarily individual packets."
4. "Building colour identifies the system; flow colour identifies the data state."
5. "Anomaly detection asks whether something unusual is happening."
6. "Prediction estimates what may happen next."
7. "What-If tests what may happen if a condition changes."
8. "Recommendation suggests what action could be considered."
9. "3D is my communication layer, not my final goal."
10. "Localhost hosts my prototype; it is not a live company network."
11. "One row is one source-to-destination observation in a twelve-minute slot."
12. "The dataset is synthetic, generated with seed 42, so my demo is reproducible."
13. "Isolation Forest is unsupervised: it never sees the label column."
14. "Twenty-eight anomalies are dataset labels; the model separately flagged twenty-nine."
15. "The forecast is a baseline with R-squared near zero, and I report that honestly."
16. "Four nodes carry documented demo floors; every critical badge comes from them."
17. "The recommendation engine is six rules, not a machine-learning model."
18. "Observed, predicted and simulated are three different things, and the app labels all three."
19. "White on the cloud means the operation completed successfully, not that data arrived."
20. "Purple always means a projection, never observed traffic."
21. "The AI-Engine building represents an analytics service; my ML is Python running offline."
22. "Python runs beforehand and leaves a results file; the browser only reads it."
23. "Nothing here monitors, controls or changes any real system."
24. "Blocking a threat is a visual decision, not actual network control."
25. "The What-If alternative starts from that route's own observed baseline."
26. "The queueing model says delay grows as one over the free capacity."
27. "Flagged traffic is never rerouted; the answer to a threat is containment."
28. "Only one What-If branch runs in the main story, to keep the demo one clear narrative."
29. "It is an additional layer on top of professional monitoring, not a replacement."
30. "The system recommends; a human decides."
31. "The file name and the upload percentage are storytelling; the numbers on the panel are real rows."
32. "The goal is to make invisible backend data movement visible, understandable and actionable."

---

## 54. Final Master Example

One complete journey, connecting everything. This is the default demo.

### Step 1 — A developer triggers work

| Layer | What happens |
|---|---|
| **Data** | Row: `Development → API-Gateway`, latest row, 73.97 MB at 316.97 Mbps, 19.77 % load, Normal |
| **Code** | `pickFlowRecord('Development', 'API-Gateway')` returns the row; phase `CREATE_FILE` runs |
| **3D** | The Development tower lights, monitors blink, a package appears and moves to the entrance |
| **Say** | "A developer packages a build. The file name is a storytelling metaphor; the megabytes and speed are a real row." |

### Step 2 — Upload to the gateway

| Layer | What happens |
|---|---|
| **Data** | Volume sets particle size; speed sets particle speed |
| **Code** | `buildFlowRoute()` then `flowTravel()` for the measured duration |
| **3D** | Blue particles carry the package across the bridge into the ring |
| **Say** | "Particle size is volume, particle speed is transfer speed, and direction runs source to destination." |

### Step 3 — The gateway authenticates and routes

| Layer | What happens |
|---|---|
| **Data** | Row: `API-Gateway → Server-02`, the pair's worst observed row, 95.52 % load, queue 51, Degraded, labelled API Overload |
| **Code** | Phase `API_AUTH`; `recordTone()` returns red because load exceeds 88 |
| **3D** | Portal opens, scanners spin, `AUTH ✓` `ROUTE ✓` `ACCEPTED` stack up, the ground pulse is red |
| **Say** | "The gateway checks and routes. The labels are storytelling; the destination and the load come from the row." |

### Step 4 — Server-02 begins processing

| Layer | What happens |
|---|---|
| **Data** | Load 95.52 %, queue 51, response 170.9 ms |
| **Code** | Phase `SERVER_PROCESS`; `makeServerOverlay()`; queue lane appears because 51 exceeds 20 |
| **3D** | Rack LEDs sweep upward, the core spins, the progress arc fills, packets stack outside |
| **Say** | "The server starts the business logic, but look at the queue forming outside." |

### Step 5 — Overload becomes visible

| Layer | What happens |
|---|---|
| **Data** | Thresholds crossed: load 96, queue 51, connection degraded, api overload |
| **Code** | `classifyIssue()` returns kind `server-overload`, severity critical |
| **3D** | Cyan to yellow at 38 %, to red at 72 %, heat shimmer, red ground ring, "Issue Detected - Server Overload" |
| **Say** | "A threshold was crossed. This came from the data, not from a script." |

### Step 6 — The story pauses on the observed state

| Layer | What happens |
|---|---|
| **Data** | The same row, displayed unchanged |
| **Code** | `setEntrySpeed(entry, .05)`; `makeStateCard()` with badge OBSERVED |
| **3D** | Particles nearly freeze; a card shows load 96 %, latency 45 ms, queue 51, loss 0.23 % |
| **Say** | "This is what we actually measured. Notice the badge says observed." |

### Step 7 — What-If asks the question

| Layer | What happens |
|---|---|
| **Data** | No new data. The question is a hypothesis |
| **Code** | `setSceneDim(true)`; other routes dimmed to 22 % |
| **3D** | The city dims; purple text: "What if traffic to Server-02 increases by 50%?" |
| **Say** | "Now we test a condition before acting." |

### Step 8 — The projection

| Layer | What happens |
|---|---|
| **Data** | `projectUnderTraffic(observed, 1.5)` on a copy. The dataset is untouched |
| **Code** | Queueing approximation: utilisation 0.955 → 0.995, service time held constant |
| **3D** | Red card, badge SIMULATED: 99.5 % load, 399 ms, queue 476, risk CRITICAL |
| **Say** | "If nothing changes, this is where it goes. These are projections, not measurements." |

### Step 9 — An alternative is tested

| Layer | What happens |
|---|---|
| **Data** | Server-04's own observed baseline: 42.1 % load, 39 ms latency |
| **Code** | `chooseAlternative()` finds the failing segment on the stored predictive path; `simulateAlternative()` adds half the extra demand |
| **3D** | A translucent purple dashed arc: `API-Gateway → Server-04 → Database-02` |
| **Say** | "The alternative's starting point is its own measured traffic, so the baseline is real." |

### Step 10 — Comparison

| Layer | What happens |
|---|---|
| **Data** | Two simulated columns, never simulated against measured |
| **Code** | `makeCompareCard()`; the note prints the baseline source and the transfer assumption |
| **3D** | 99.5 % / 399 ms / 476 against 66 % / 66 ms / 3, risk MEDIUM |
| **Say** | "Both columns are projections. The assumptions are printed at the bottom." |

### Step 11 — Recommendation

| Layer | What happens |
|---|---|
| **Data** | Cross-referenced against `ml_results.recommendations` |
| **Code** | `findMlRecommendation()`; scenario action text |
| **3D** | Green message: "Shift traffic from Server-02 to the lower-load route via Server-04" |
| **Say** | "This is rule-based, not a model. I do not call it AI." |

### Step 12 — Optimisation applied

| Layer | What happens |
|---|---|
| **Data** | `improves` is true: 66 < 95.5, 66 < 399, and 66 < 90 |
| **Code** | `systemFlow.ids.server` becomes Server-04, `.db` becomes Database-02, records re-picked |
| **3D** | Purple becomes green, the old route fades, the packet travels via Server-04, Server-02 returns to idle |
| **Say** | "The optimisation is applied inside the story. Nothing real is rerouted." |

### Step 13 — Database write

| Layer | What happens |
|---|---|
| **Data** | The `Server-04 → Database-02` route exists with 16 real rows |
| **Code** | Phase `DATABASE_WRITE` |
| **3D** | Vault rings cascade, the cube sinks in, green spark, expanding ring, "Record Saved ✓" |
| **Say** | "The result is persisted. The cube is a metaphor; the row is real." |

### Step 14 — Cloud upload and success

| Layer | What happens |
|---|---|
| **Data** | No `Server → Cloud-01` row for this pair, so the nearest same-type row is used and the panel says so |
| **Code** | Phase `CLOUD_UPLOAD`, then `cloudOperationSuccess()` |
| **3D** | 25 → 60 → 85 → 100 %, then bright white, sparks, expanding ring, "File Saved Successfully ✓" |
| **Say** | "White means the cloud operation completed successfully, not merely that data arrived." |

### Step 15 — Decision supported

| Layer | What happens |
|---|---|
| **Data** | — |
| **Code** | Phase `FINISHED` |
| **3D** | "Network Optimized — Operation Completed Successfully" |
| **Say** | "Problem detected, tested, compared, decided. The system recommended; a human decides. That is the whole point." |

---

## 55. Final Project Truth Table

Use this to decide what you can safely claim. **Anything marked NO must never be said.**

| Claim | Status | Evidence in code | Safe to say? |
|---|---|---|---|
| Project uses synthetic network-flow data | **[SYNTHETIC DATA]** | `python/generate_dummy_data.py`, `SEED = 42`, 360 rows | **YES** |
| One row is a source-to-destination observation in a 12-minute slot | **[IMPLEMENTED]** | `build_record()`, `timedelta(minutes=12 * i)` | **YES** |
| Particles represent measured data movement | **[IMPLEMENTED]** | `addConduit()` lines 2871–2883 | **YES** |
| Particle size follows data volume | **[IMPLEMENTED]** | `size = .26 + clamp(volume/2600, .02, .18)` | **YES** |
| Particle speed follows transfer speed | **[IMPLEMENTED]** | `speed = .03 + route.speed/9000` | **YES** |
| Route thickness follows bandwidth **everywhere** | **[PARTIALLY IMPLEMENTED]** | Story routes, river tubes and splats only; city bridges use a fixed 0.36 | **NO — say "on story routes"** |
| Route glow follows network load **everywhere** | **[PARTIALLY IMPLEMENTED]** | `glowScale` in `buildStoryRoute()` only | **NO — say "on story routes"** |
| Each particle is one network packet | **NOT TRUE** | Counts are derived from average volume | **NO** |
| The project uses Isolation Forest for anomaly detection | **[ML OUTPUT]** | `IsolationForest(n_estimators=180, contamination=0.08)` | **YES** |
| Isolation Forest is unsupervised | **[IMPLEMENTED]** | `NUMERIC_COLUMNS` excludes `anomaly_status` | **YES** |
| It flagged 29 of 360 rows | **[ML OUTPUT]** | `metrics.model_anomalies` = 29 | **YES** |
| The AI found the 28 anomalies shown on the KPI card | **NOT TRUE** | That card reads `metrics.anomalies`, the generator's labels | **NO** |
| Per-row detector flags are shown in the 3D city | **NOT IMPLEMENTED** | Flags are not written to the JSON | **NO** |
| The project uses Random Forest Regression for prediction | **[ML OUTPUT]** | 4 × `RandomForestRegressor(n_estimators=140, max_depth=12)` | **YES** |
| It predicts next-interval volume, load, latency and bandwidth | **[IMPLEMENTED]** | `TARGETS` list | **YES** |
| The forecast is production accurate | **NOT TRUE** | R² 0.11, −0.01, −0.06, 0.19 | **NO** |
| Four nodes carry documented demo stress floors | **[DEMO / VISUAL METAPHOR]** | `scenario_floors`, and `forecast_basis` in the JSON | **YES, and say it proactively** |
| Every Critical or Watch badge comes from those floors | **[IMPLEMENTED fact]** | All 12 other nodes are Stable | **YES** |
| The 87 % confidence badge is computed | **NOT TRUE** | Static text in `index.html`; computed value is 59 % | **NO** |
| The 12-hour forecast chart is Random Forest output | **NOT TRUE** | Fixed multipliers 1.06 / 1.13 / 1.21 | **NO** |
| Recommendations are rule-based | **[IMPLEMENTED]** | 6 `if` statements in `recommendations_for()` | **YES** |
| Recommendations are AI-generated | **NOT TRUE** | No model is involved in the decision logic | **NO** |
| Six recommendations are generated, four are shown | **[IMPLEMENTED]** | `recommendations.slice(0, 4)` | **YES** |
| What-If simulation is implemented | **[IMPLEMENTED]** | `runWhatIfBranch()` and its supporting functions | **YES** |
| What-If uses a transparent queueing approximation | **[IMPLEMENTED]** | `projectUnderTraffic()` | **YES** |
| What-If alternatives use their own observed baseline | **[IMPLEMENTED]** | `alternativeBaseline()`, minimum 3 rows | **YES** |
| What-If numbers are measurements | **NOT TRUE** | They are calculated; every card is badged SIMULATED | **NO** |
| Flagged traffic is never rerouted | **[IMPLEMENTED]** | `chooseAlternative()` returns `null` for threats | **YES** |
| The story branches conditionally on telemetry | **[IMPLEMENTED]** | `classifyIssue()` at four phases, plus security | **YES** |
| The story is fully linear | **NOT TRUE** | It is a hybrid: fixed backbone with conditional branches | **NO** |
| Cloud-01 has a six-state machine | **[IMPLEMENTED]** | `CLOUD_TARGETS` | **YES** |
| White on the Cloud means the operation succeeded | **[IMPLEMENTED]** | `cloudOperationSuccess()`, only called on success | **YES** |
| White means data arrived at the cloud | **NOT TRUE** | Arrival sets `receiving`, then `processing` | **NO** |
| Building colour is department identity | **[IMPLEMENTED]** | `DEPARTMENT_COLORS`, applied via `ctx.accent` | **YES** |
| Building colour indicates data status | **NOT TRUE** | Status uses the flow legend and state rings | **NO** |
| The stored predictive path is model output | **NOT TRUE** | A literal in `analyze_and_predict.py` lines 270–274 | **NO** |
| Two segments of that path do not exist in the data | **[IMPLEMENTED fact]** | `Server-01 → API-Gateway`, `API-Gateway → Server-04` | **YES, if asked** |
| `project_build.zip` is a real telemetry field | **NOT TRUE** | No filename exists in the 28 fields | **NO** |
| The AUTH and ROUTE labels come from the data | **NOT TRUE** | No authentication event exists in the dataset | **NO** |
| The upload percentage comes from the data | **NOT TRUE** | A scripted counter | **NO** |
| Python runs when the browser loads | **NOT TRUE** | `ml_results.json` has a fixed `generated_at` | **NO** |
| The system monitors a live company network | **NOT IMPLEMENTED** | Only two local `fetch()` calls exist | **NO** |
| The system automatically reroutes real production traffic | **NOT IMPLEMENTED** | No network API is called anywhere | **NO** |
| The Security Hub can actually block traffic | **NOT IMPLEMENTED** | No firewall or ACL call exists | **NO** |
| The prototype has authentication | **NOT IMPLEMENTED** | No login; "DEMO OPERATOR" is static HTML | **NO** |
| The prototype can read files, passwords or messages | **NOT IMPLEMENTED** | No such capability or field exists | **NO** |
| It is an additional layer on top of monitoring tools | **Accurate positioning** | — | **YES** |
| It replaces Grafana or professional monitoring | **NOT TRUE** | — | **NO** |
| There are automated tests | **NOT IMPLEMENTED** | No test suite in the project | **NO** |
| The system recommends and a human decides | **[IMPLEMENTED by design]** | The chain ends at display | **YES** |

---

*End of document. Verified against the codebase on 4 September 2026. Every function name, file name, dataset field, node name, colour, threshold and metric above was read from the current source. Anything marked PLANNED / CONCEPTUAL is not implemented.*
