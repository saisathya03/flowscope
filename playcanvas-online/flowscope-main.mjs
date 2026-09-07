/**
 * FlowScope AI — PlayCanvas Online edition
 * =========================================================================
 * One upload-ready ESM script that builds the complete AI-powered 3D
 * data-flow city: camera, lights, 16 nodes, curved routes, pooled particles,
 * HTML dashboard overlay, picking, anomalies, predictions, recommendations
 * and a nine-stage story mode.
 *
 * Attach to an empty Entity ("FlowScopeApp") and assign the two JSON assets
 * (network_traffic.json, ml_results.json) in the Inspector. Everything else
 * is created programmatically.
 *
 * Written for the current PlayCanvas ESM scripting format (Engine 2.x).
 * =========================================================================
 * Sections:
 *   1. Constants: palette, node catalogue, quality presets, story stages
 *   2. Small utilities and formatters
 *   3. CurveLUT       — cubic Bézier lookup table (allocation-free sampling)
 *   4. DataModel      — one-time aggregation of records + ML results
 *   5. MaterialCache  — cached StandardMaterials and canvas textures
 *   6. NodeFactory    — distinct primitive geometry per node type
 *   7. TubeBuilder    — custom tube meshes for solid / dashed routes
 *   8. UiOverlay      — injected HTML/CSS dashboard (no extra files)
 *   9. CameraRig      — orbit / zoom / pan / damping / focus / auto-rotate
 *  10. FlowScopeMain  — the Script class that ties everything together
 * =========================================================================
 */

import * as pc from 'playcanvas';
import {
    Script,
    Entity,
    Asset,
    Vec3,
    Color,
    StandardMaterial,
    Mesh,
    MeshInstance,
    Texture,
    BLEND_NORMAL,
    BLEND_ADDITIVE,
    PRIMITIVE_TRIANGLES
} from 'playcanvas';

/* =========================================================================
 * 1. CONSTANTS
 * ========================================================================= */

const PALETTE = {
    blue:   new Color(0.24, 0.49, 1.00),  // normal traffic
    cyan:   new Color(0.16, 0.90, 1.00),  // high-speed traffic
    purple: new Color(0.64, 0.36, 1.00),  // AI / analytics / predicted
    yellow: new Color(1.00, 0.83, 0.29),  // critical priority
    red:    new Color(1.00, 0.28, 0.34),  // suspicious / failed / anomalous
    green:  new Color(0.24, 1.00, 0.55),  // processed / optimized
    steel:  new Color(0.10, 0.13, 0.18),
    glass:  new Color(0.20, 0.75, 0.85),
    cloud:  new Color(0.75, 0.85, 1.00),
    dept:   new Color(0.18, 0.24, 0.34)
};

/** Same city layout as the existing prototype dataset. */
const NODE_CATALOG = [
    { id: 'Development',  type: 'Department', department: 'Development', pos: [-19, 0,   9], color: 'blue'   },
    { id: 'QA',           type: 'Department', department: 'QA',          pos: [-19, 0,   1], color: 'cyan'   },
    { id: 'HR',           type: 'Department', department: 'HR',          pos: [-18, 0,  -8], color: 'dept'   },
    { id: 'Finance',      type: 'Department', department: 'Finance',     pos: [ -9, 0, -13], color: 'yellow' },
    { id: 'Management',   type: 'Department', department: 'Management',  pos: [ 18, 0, -10], color: 'cyan'   },
    { id: 'API-Gateway',  type: 'API',        department: 'IT',          pos: [-10, 0,   5], color: 'cyan'   },
    { id: 'Security-Hub', type: 'Security',   department: 'IT',          pos: [ -8, 0,  -5], color: 'red'    },
    { id: 'Server-01',    type: 'Server',     department: 'Development', pos: [ -2, 0,  10], color: 'blue'   },
    { id: 'Server-02',    type: 'Server',     department: 'Operations',  pos: [  0, 0,   2], color: 'blue'   },
    { id: 'Server-03',    type: 'Server',     department: 'IT',          pos: [  0, 0,  -8], color: 'blue'   },
    { id: 'Server-04',    type: 'Server',     department: 'Operations',  pos: [  7, 0,   4], color: 'green'  },
    { id: 'Database-01',  type: 'Database',   department: 'Finance',     pos: [  8, 0,  11], color: 'yellow' },
    { id: 'Database-02',  type: 'Database',   department: 'Operations',  pos: [ 11, 0,  -2], color: 'cyan'   },
    { id: 'AI-Engine',    type: 'AI',         department: 'Management',  pos: [ 18, 0,   6], color: 'purple' },
    { id: 'Cloud-01',     type: 'Cloud',      department: 'Operations',  pos: [ 20, 0,  14], color: 'cloud'  },
    { id: 'IoT-Gateway',  type: 'IoT',        department: 'Operations',  pos: [  4, 0, -14], color: 'green'  }
];

const QUALITY = {
    LOW:   { routeSegments: 14, tubeSides: 4, particlesPerRoute: 4,  maxRoutes: 18, shadows: false, shadowRes: 512,  localLights: false },
    HIGH:  { routeSegments: 24, tubeSides: 6, particlesPerRoute: 8,  maxRoutes: 24, shadows: true,  shadowRes: 1024, localLights: true  },
    ULTRA: { routeSegments: 40, tubeSides: 8, particlesPerRoute: 14, maxRoutes: 24, shadows: true,  shadowRes: 2048, localLights: true  }
};

/** Normal-operation thresholds used to explain anomalies in the alert panel. */
const THRESHOLDS = {
    latency_ms: 120,
    network_load_percent: 80,
    packet_loss_percent: 2,
    bandwidth_usage_percent: 85,
    queue_length: 12
};

const STORY_STAGES = [
    { label: 'STEP 1 — DATA GENERATED',  title: 'Development creates API traffic',
      copy: 'A new software release sends a wave of requests into the company network.',
      node: 'Development', speed: 0.75, predicted: false, anomaly: false, optimized: false },
    { label: 'STEP 2 — DATA MOVEMENT',   title: 'Particles enter the API Gateway',
      copy: 'Solid particle streams show live routes, direction, volume and transfer speed.',
      node: 'API-Gateway', speed: 1.0, predicted: false, anomaly: false, optimized: false },
    { label: 'STEP 3 — TRAFFIC INCREASE', title: 'Demand rises across the network',
      copy: 'Particle density and route glow climb as request volume and bandwidth use grow.',
      node: 'API-Gateway', speed: 1.75, predicted: false, anomaly: false, optimized: false },
    { label: 'STEP 4 — BOTTLENECK',      title: 'Server-02 becomes overloaded',
      copy: 'Queue length, latency and network load cross safe thresholds. Affected routes pulse red.',
      node: 'Server-02', speed: 1.25, predicted: false, anomaly: true, optimized: false },
    { label: 'STEP 5 — AI DETECTION',    title: 'Isolation Forest flags the anomaly',
      copy: 'The AI engine detects abnormal latency and load patterns and raises alerts.',
      node: 'AI-Engine', speed: 1.0, predicted: false, anomaly: true, optimized: false },
    { label: 'STEP 6 — PREDICTION',      title: 'The model projects what happens next',
      copy: 'Random Forest forecasts traffic, load, latency and bandwidth. Translucent purple paths show the projected flow.',
      node: 'AI-Engine', speed: 1.0, predicted: true, anomaly: false, optimized: false },
    { label: 'STEP 7 — RECOMMENDATION',  title: 'Actionable guidance is produced',
      copy: 'The recommendation engine proposes concrete fixes, ranked by severity.',
      node: 'Security-Hub', speed: 1.0, predicted: true, anomaly: false, optimized: false },
    { label: 'STEP 8 — OPTIMIZATION',    title: 'Traffic shifts to the healthier path',
      copy: 'Load is rebalanced along the AI-suggested route, relieving the bottleneck.',
      node: 'Server-04', speed: 1.25, predicted: true, anomaly: false, optimized: true },
    { label: 'STEP 9 — RESULT',          title: 'The network returns to a healthy state',
      copy: 'Latency and load recover. Green routes mark successfully optimized flows.',
      node: 'API-Gateway', speed: 1.0, predicted: false, anomaly: false, optimized: true }
];

/* =========================================================================
 * 2. UTILITIES
 * ========================================================================= */

function num(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function invLerp(a, b, v) { return b === a ? 0 : clamp((v - a) / (b - a), 0, 1); }
function mapRange(v, a, b, outA, outB) { return outA + (outB - outA) * invLerp(a, b, v); }

const Fmt = {
    mb(v) { return v >= 1024 ? (v / 1024).toFixed(1) + ' GB' : Math.round(v) + ' MB'; },
    count(v) {
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
        return String(Math.round(v));
    },
    ms(v) { return v.toFixed(1) + ' ms'; },
    pct(v) { return v.toFixed(1) + ' %'; }
};

/* =========================================================================
 * 3. CURVE LOOKUP TABLE (cubic Bézier, allocation-free sampling)
 * ========================================================================= */

class CurveLUT {
    /**
     * @param {Vec3} p0 @param {Vec3} p1 @param {Vec3} p2 @param {Vec3} p3
     * @param {number} samples
     */
    constructor(p0, p1, p2, p3, samples) {
        this.points = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const u = 1 - t;
            const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
            this.points.push(new Vec3(
                a * p0.x + b * p1.x + c * p2.x + d * p3.x,
                a * p0.y + b * p1.y + c * p2.y + d * p3.y,
                a * p0.z + b * p1.z + c * p2.z + d * p3.z
            ));
        }
        this.last = this.points.length - 1;
    }

    /** Writes the position at t (0..1) into `out` without allocating. */
    sample(t, out) {
        const f = clamp(t, 0, 1) * this.last;
        const i = Math.min(Math.floor(f), this.last - 1);
        const frac = f - i;
        const a = this.points[i], b = this.points[i + 1];
        out.set(
            a.x + (b.x - a.x) * frac,
            a.y + (b.y - a.y) * frac,
            a.z + (b.z - a.z) * frac
        );
        return out;
    }
}

/** Builds the standard FlowScope arc between two node positions. */
function buildRouteCurve(start, end, lift, sideSign, samples) {
    const p0 = new Vec3(start.x, start.y + 2.0, start.z);
    const p3 = new Vec3(end.x, end.y + 2.0, end.z);
    const dx = p3.x - p0.x, dz = p3.z - p0.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const arc = clamp(dist * 0.26, 1.4, 6.5) + lift;
    // Sideways bow so opposite-direction routes do not overlap.
    const len = dist || 1;
    const sx = (-dz / len) * dist * 0.09 * sideSign;
    const sz = (dx / len) * dist * 0.09 * sideSign;
    const p1 = new Vec3(p0.x + dx * 0.25 + sx, p0.y + arc, p0.z + dz * 0.25 + sz);
    const p2 = new Vec3(p0.x + dx * 0.75 + sx, p0.y + arc, p0.z + dz * 0.75 + sz);
    return new CurveLUT(p0, p1, p2, p3, samples);
}

/* =========================================================================
 * 4. DATA MODEL — one-time aggregation (no per-frame JSON work)
 * ========================================================================= */

class DataModel {
    constructor(records, ml) {
        this.records = Array.isArray(records) ? records : [];
        this.ml = ml && typeof ml === 'object' ? ml : {};
        this.routes = [];            // aggregated source→destination routes
        this.nodeStats = new Map();  // id → per-node aggregate
        this.kpis = {};
        this.usedFallbackKpis = false;
        this.aggregate();
    }

    nodeStat(id) {
        if (!this.nodeStats.has(id)) {
            this.nodeStats.set(id, {
                id, inMb: 0, outMb: 0, latSum: 0, latN: 0, respSum: 0, respN: 0,
                peakLoad: 0, connections: 0, threat: 'Low', anomalies: new Set(), health: 1
            });
        }
        return this.nodeStats.get(id);
    }

    aggregate() {
        const routeMap = new Map();
        const threatRank = { Low: 0, Medium: 1, High: 2, Critical: 3 };
        let totalMb = 0, latSum = 0, spdSum = 0, bwSum = 0, loadSum = 0, lossSum = 0;
        let apiSum = 0, dbSum = 0, aiSum = 0, connMax = 0, anomalies = 0;
        const n = this.records.length;

        for (let i = 0; i < n; i++) {
            const r = this.records[i];
            const src = r.source_id, dst = r.destination_id;
            if (!src || !dst) continue;

            const vol = num(r.data_volume_mb);
            const lat = num(r.latency_ms);
            const spd = num(r.transfer_speed_mbps);
            const bw = num(r.bandwidth_usage_percent);
            const load = num(r.network_load_percent);
            const loss = num(r.packet_loss_percent);
            const anomalous = r.anomaly_status && r.anomaly_status !== 'Normal';
            const failed = r.connection_status === 'Failed';
            const critical = r.data_priority === 'Critical';
            const highThreat = r.threat_level === 'High' || r.threat_level === 'Critical';

            totalMb += vol; latSum += lat; spdSum += spd; bwSum += bw;
            loadSum += load; lossSum += loss;
            apiSum += num(r.api_requests); dbSum += num(r.database_queries); aiSum += num(r.ai_requests);
            connMax = Math.max(connMax, num(r.active_connections));
            if (anomalous) anomalies++;

            const key = src + '>' + dst;
            let route = routeMap.get(key);
            if (!route) {
                route = {
                    key, source: src, destination: dst,
                    sourceType: r.source_type || '', destType: r.destination_type || '',
                    sourceDept: r.source_department || '', destDept: r.destination_department || '',
                    count: 0, volume: 0, speed: 0, bandwidth: 0, latency: 0, load: 0, loss: 0,
                    aiRequests: 0, anomalyCount: 0, failedCount: 0, criticalCount: 0, threatCount: 0,
                    anomalyKinds: new Set(), routeStatus: {}, connStatus: {}
                };
                routeMap.set(key, route);
            }
            route.count++;
            route.volume += vol; route.speed += spd; route.bandwidth += bw;
            route.latency += lat; route.load += load; route.loss += loss;
            route.aiRequests += num(r.ai_requests);
            if (anomalous) { route.anomalyCount++; route.anomalyKinds.add(r.anomaly_status); }
            if (failed) route.failedCount++;
            if (critical) route.criticalCount++;
            if (highThreat) route.threatCount++;
            route.routeStatus[r.route_status] = (route.routeStatus[r.route_status] || 0) + 1;
            route.connStatus[r.connection_status] = (route.connStatus[r.connection_status] || 0) + 1;

            // Per-node aggregates
            const s = this.nodeStat(src), d = this.nodeStat(dst);
            s.outMb += vol; d.inMb += vol;
            s.latSum += lat; s.latN++; d.latSum += lat; d.latN++;
            s.respSum += num(r.response_time_ms); s.respN++;
            s.peakLoad = Math.max(s.peakLoad, load); d.peakLoad = Math.max(d.peakLoad, load);
            s.connections++; d.connections++;
            if (threatRank[r.threat_level] > threatRank[s.threat]) s.threat = r.threat_level;
            if (anomalous) { s.anomalies.add(r.anomaly_status); d.anomalies.add(r.anomaly_status); }
        }

        // Finalise routes: averages + dominant statuses, sorted by importance.
        this.routes = Array.from(routeMap.values());
        for (const rt of this.routes) {
            const c = Math.max(1, rt.count);
            rt.speed /= c; rt.bandwidth /= c; rt.latency /= c; rt.load /= c; rt.loss /= c;
            rt.isAnomalous = rt.anomalyCount > 0;
            rt.isFailed = rt.failedCount > 0 && rt.failedCount * 2 >= rt.count;
            rt.isCritical = rt.criticalCount > 0;
            rt.dominantRouteStatus = dominantKey(rt.routeStatus);
            rt.dominantConnStatus = dominantKey(rt.connStatus);
        }
        this.routes.sort((a, b) =>
            (b.anomalyCount - a.anomalyCount) || (b.volume - a.volume));

        for (const s of this.nodeStats.values()) {
            const avgLat = s.latN ? s.latSum / s.latN : 0;
            const latPen = invLerp(30, 250, avgLat);
            const loadPen = invLerp(50, 100, s.peakLoad);
            const anomPen = s.anomalies.size > 0 ? 0.25 : 0;
            s.avgLatency = avgLat;
            s.avgResponse = s.respN ? s.respSum / s.respN : 0;
            s.health = clamp(1 - 0.4 * latPen - 0.35 * loadPen - anomPen, 0, 1);
        }

        // KPIs computed from the records themselves (ML metrics as fallback).
        const m = this.ml.metrics || {};
        this.usedFallbackKpis = n === 0;
        const preds = Array.isArray(this.ml.predictions) ? this.ml.predictions : [];
        let predictedMb = 0;
        for (const p of preds) predictedMb += num(p.predicted && p.predicted.data_volume_mb);
        const det = this.ml.detections || {};
        const criticalRoutes =
            (Array.isArray(det.bottlenecks) ? det.bottlenecks.length : 0) +
            num(det.failed_connections);

        this.kpis = n > 0 ? {
            totalTraffic: totalMb,
            avgLatency: latSum / n,
            avgSpeed: spdSum / n,
            avgBandwidth: bwSum / n,
            avgLoad: loadSum / n,
            avgLoss: lossSum / n,
            connections: connMax,
            apiTraffic: apiSum,
            dbTraffic: dbSum,
            aiTraffic: aiSum,
            anomalies,
            criticalRoutes,
            predictedTraffic: predictedMb
        } : {
            totalTraffic: num(m.total_data_volume_mb),
            avgLatency: num(m.average_latency_ms),
            avgSpeed: num(m.average_transfer_speed_mbps),
            avgBandwidth: num(m.average_bandwidth_usage_percent),
            avgLoad: num(m.average_network_load_percent),
            avgLoss: num(m.average_packet_loss_percent),
            connections: num(m.active_connections),
            apiTraffic: num(m.api_traffic),
            dbTraffic: num(m.database_traffic),
            aiTraffic: num(m.ai_traffic),
            anomalies: num(m.anomalies),
            criticalRoutes,
            predictedTraffic: predictedMb
        };

        const k = this.kpis;
        k.systemHealth = clamp(1 -
            invLerp(40, 95, k.avgLoad) * 0.35 -
            invLerp(40, 200, k.avgLatency) * 0.25 -
            clamp((k.anomalies / Math.max(1, n || num(this.ml.records_analyzed) || 1)) * 4, 0, 1) * 0.30,
            0, 1);
    }

    /** Predicted node chain from the ML file, with a clearly-labelled demo fallback. */
    predictedChain() {
        const pf = this.ml.predictive_flow;
        if (pf && Array.isArray(pf.predicted) && pf.predicted.length >= 2) {
            return { chain: pf.predicted, reason: pf.reason || '', demo: false };
        }
        return {
            chain: ['API-Gateway', 'Server-04', 'Database-02'],
            reason: 'DEMONSTRATION route only — ml_results.json contained no complete predicted route.',
            demo: true
        };
    }
}

function dominantKey(counts) {
    let best = '—', bestN = -1;
    for (const k in counts) if (counts[k] > bestN) { best = k; bestN = counts[k]; }
    return best;
}

/* =========================================================================
 * 5. MATERIAL CACHE (materials created once, reused everywhere)
 * ========================================================================= */

class MaterialCache {
    constructor(app) {
        this.app = app;
        this.cache = new Map();
        this.textures = [];
    }

    /** Dark metal / glass / emissive standard material. */
    standard(key, opts) {
        if (this.cache.has(key)) return this.cache.get(key);
        const m = new StandardMaterial();
        m.diffuse = opts.diffuse || PALETTE.steel;
        m.useMetalness = true;
        m.metalness = opts.metalness !== undefined ? opts.metalness : 0.8;
        m.gloss = opts.gloss !== undefined ? opts.gloss : 0.6;
        if (opts.emissive) {
            m.emissive = opts.emissive;
            m.emissiveIntensity = opts.emissiveIntensity !== undefined ? opts.emissiveIntensity : 1;
        }
        if (opts.opacity !== undefined && opts.opacity < 1) {
            m.opacity = opts.opacity;
            m.blendType = BLEND_NORMAL;
            m.depthWrite = opts.depthWrite !== undefined ? opts.depthWrite : true;
        }
        if (opts.emissiveMap) m.emissiveMap = opts.emissiveMap;
        if (opts.opacityMap) { m.opacityMap = opts.opacityMap; m.blendType = BLEND_NORMAL; m.depthWrite = false; }
        m.update();
        this.cache.set(key, m);
        return m;
    }

    /** Additive glow material for particles (shared per colour). */
    particle(key, color) {
        const k = 'particle:' + key;
        if (this.cache.has(k)) return this.cache.get(k);
        const m = new StandardMaterial();
        m.diffuse = new Color(0, 0, 0);
        m.emissive = color;
        m.emissiveIntensity = 2.0;
        m.blendType = BLEND_ADDITIVE;
        m.depthWrite = false;
        m.update();
        this.cache.set(k, m);
        return m;
    }

    /** Per-route emissive tube material (cloned so glow can animate per route). */
    tube(color, opacity, glow) {
        const m = new StandardMaterial();
        m.diffuse = new Color(0.01, 0.01, 0.02);
        m.emissive = color;
        m.emissiveIntensity = glow;
        if (opacity < 1) {
            m.opacity = opacity;
            m.blendType = BLEND_NORMAL;
            m.depthWrite = false;
        }
        m.update();
        return m;
    }

    canvasTexture(draw, size) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        draw(canvas.getContext('2d'), size);
        const tex = new Texture(this.app.graphicsDevice, { width: size, height: size, mipmaps: true });
        tex.setSource(canvas);
        this.textures.push(tex);
        return tex;
    }

    gridTexture() {
        if (this._grid) return this._grid;
        this._grid = this.canvasTexture((ctx, s) => {
            ctx.fillStyle = '#04111d';
            ctx.fillRect(0, 0, s, s);
            ctx.strokeStyle = 'rgba(30,155,211,0.45)';
            ctx.lineWidth = 1;
            const cells = 32;
            for (let i = 0; i <= cells; i++) {
                const p = (i / cells) * s;
                ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, s); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(s, p); ctx.stroke();
            }
        }, 1024);
        return this._grid;
    }

    blobTexture() {
        if (this._blob) return this._blob;
        this._blob = this.canvasTexture((ctx, s) => {
            const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
            g.addColorStop(0, 'rgba(255,255,255,0.85)');
            g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
            g.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, s, s);
        }, 128);
        return this._blob;
    }
}

/* =========================================================================
 * 6. NODE FACTORY — distinct primitive silhouettes
 * ========================================================================= */

class NodeFactory {
    constructor(app, materials) {
        this.app = app;
        this.mats = materials;
    }

    prim(parent, type, pos, scale, material, rot) {
        const e = new Entity('part');
        e.addComponent('render', { type });
        e.render.material = material;
        e.setLocalPosition(pos[0], pos[1], pos[2]);
        e.setLocalScale(scale[0], scale[1], scale[2]);
        if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
        parent.addChild(e);
        return e;
    }

    torus(parent, pos, ringRadius, tubeRadius, material, rot) {
        // TorusGeometry is available in Engine 2.x; fall back to a thin disc.
        try {
            if (pc.TorusGeometry && Mesh.fromGeometry) {
                const mesh = Mesh.fromGeometry(this.app.graphicsDevice,
                    new pc.TorusGeometry({ ringRadius, tubeRadius, segments: 40, sides: 10 }));
                const e = new Entity('ring');
                e.addComponent('render', { meshInstances: [new MeshInstance(mesh, material)] });
                e.setLocalPosition(pos[0], pos[1], pos[2]);
                if (rot) e.setLocalEulerAngles(rot[0], rot[1], rot[2]);
                parent.addChild(e);
                return e;
            }
        } catch (e) { /* fall through to disc fallback */ }
        return this.prim(parent, 'cylinder', pos,
            [ringRadius * 2, tubeRadius * 1.4, ringRadius * 2], material, rot);
    }

    blobShadow(parent, radius) {
        const m = this.mats.standard('blobShadow', {
            diffuse: new Color(0, 0, 0), metalness: 0, gloss: 0.2,
            opacity: 0.55, opacityMap: this.mats.blobTexture()
        });
        // Dark grounding disc: fake contact shadow.
        const e = this.prim(parent, 'plane', [0, 0.02, 0], [radius, 1, radius], m);
        e.render.castShadows = false;
        e.render.receiveShadows = false;
        return e;
    }

    /** Returns the node root entity with all geometry attached. */
    build(def) {
        const root = new Entity(def.id);
        root.setPosition(def.pos[0], def.pos[1], def.pos[2]);
        const color = PALETTE[def.color] || PALETTE.blue;
        const M = this.mats;

        const dark = M.standard('dark', { diffuse: PALETTE.steel, metalness: 0.88, gloss: 0.55 });
        const darker = M.standard('darker', { diffuse: new Color(0.07, 0.09, 0.13), metalness: 0.85, gloss: 0.5 });

        switch (def.type) {
            case 'Server': {
                this.prim(root, 'box', [0, 1.6, 0], [1.7, 3.2, 1.4], dark);
                const slot = M.standard('slot', {
                    diffuse: new Color(0.02, 0.06, 0.09), metalness: 0.6, gloss: 0.7,
                    emissive: PALETTE.cyan, emissiveIntensity: 0.9
                });
                for (let i = 0; i < 5; i++)
                    this.prim(root, 'box', [0, 0.55 + i * 0.58, 0.72], [1.45, 0.13, 0.05], slot);
                this.blobShadow(root, 2.6);
                break;
            }
            case 'Database': {
                const glass = M.standard('dbGlass', {
                    diffuse: PALETTE.glass, metalness: 0.6, gloss: 0.75,
                    emissive: PALETTE.cyan, emissiveIntensity: 0.35, opacity: 0.55
                });
                for (let i = 0; i < 3; i++)
                    this.prim(root, 'cylinder', [0, 0.65 + i * 1.3, 0], [2.2, 0.55, 2.2], i === 1 ? glass : dark);
                this.blobShadow(root, 3.0);
                break;
            }
            case 'API': {
                this.prim(root, 'cylinder', [0, 0.22, 0], [2.8, 0.22, 2.8], darker);
                const ringMat = M.standard('apiRing', {
                    diffuse: new Color(0.05, 0.2, 0.26), metalness: 0.7, gloss: 0.7,
                    emissive: PALETTE.cyan, emissiveIntensity: 1.4
                });
                this.torus(root, [0, 2.5, 0], 1.7, 0.09, ringMat, [90, 0, 0]);
                this.torus(root, [0, 2.5, 0], 1.25, 0.07, ringMat, [90, 45, 0]);
                this.prim(root, 'cylinder', [0, 3.9, 0], [0.09, 1.4, 0.09], dark);
                this.prim(root, 'cone', [0, 4.8, 0], [0.28, 0.5, 0.28], ringMat);
                this.blobShadow(root, 3.2);
                break;
            }
            case 'AI': {
                this.prim(root, 'cylinder', [0, 0.18, 0], [2.4, 0.18, 2.4], darker);
                const holo = M.standard('aiHolo', {
                    diffuse: new Color(0.2, 0.1, 0.35), metalness: 0.4, gloss: 0.7,
                    emissive: PALETTE.purple, emissiveIntensity: 1.4, opacity: 0.85
                });
                const core = this.prim(root, 'sphere', [0, 2.4, 0], [1.7, 1.7, 1.7], holo);
                core.name = 'aiCore';
                const ringMat = M.standard('aiRing', {
                    diffuse: new Color(0.1, 0.05, 0.2), metalness: 0.5, gloss: 0.6,
                    emissive: PALETTE.purple, emissiveIntensity: 1.1, opacity: 0.8
                });
                const r1 = this.torus(root, [0, 2.4, 0], 1.5, 0.06, ringMat, [70, 0, 0]);
                const r2 = this.torus(root, [0, 2.4, 0], 1.9, 0.05, ringMat, [-60, 30, 0]);
                r1.name = 'aiRing1'; r2.name = 'aiRing2';
                this.blobShadow(root, 3.0);
                break;
            }
            case 'Cloud': {
                this.prim(root, 'cylinder', [0, 0.2, 0], [3.4, 0.2, 3.4], darker);
                const cloudMat = M.standard('cloud', {
                    diffuse: PALETTE.cloud, metalness: 0.1, gloss: 0.75,
                    emissive: new Color(0.2, 0.28, 0.45), emissiveIntensity: 0.4, opacity: 0.42
                });
                this.prim(root, 'sphere', [0, 2.3, 0], [2.8, 2.1, 2.6], cloudMat);
                this.prim(root, 'sphere', [-1.5, 1.9, 0.3], [1.9, 1.5, 1.7], cloudMat);
                this.prim(root, 'sphere', [1.5, 2.0, -0.2], [1.7, 1.4, 1.6], cloudMat);
                this.blobShadow(root, 3.6);
                break;
            }
            case 'IoT': {
                const iotMat = M.standard('iot', {
                    diffuse: new Color(0.1, 0.3, 0.19), metalness: 0.65, gloss: 0.5,
                    emissive: PALETTE.green, emissiveIntensity: 0.7
                });
                this.prim(root, 'cylinder', [0, 1.9, 0], [0.22, 3.8, 0.22], dark);
                this.prim(root, 'cone', [0, 4.1, 0], [0.5, 0.8, 0.5], iotMat);
                const ringMat = M.standard('iotRing', {
                    diffuse: new Color(0.05, 0.15, 0.1), metalness: 0.4, gloss: 0.5,
                    emissive: PALETTE.green, emissiveIntensity: 1.0, opacity: 0.55
                });
                this.torus(root, [0, 3.1, 0], 0.9, 0.05, ringMat);
                this.torus(root, [0, 3.5, 0], 0.6, 0.05, ringMat);
                for (let i = 0; i < 3; i++) {
                    const a = i * Math.PI * 2 / 3;
                    this.prim(root, 'box',
                        [Math.cos(a) * 0.75, 2.6, Math.sin(a) * 0.75], [0.07, 1.0, 0.07], dark);
                }
                this.blobShadow(root, 2.4);
                break;
            }
            case 'Security': {
                const secMat = M.standard('security', {
                    diffuse: new Color(0.42, 0.10, 0.14), metalness: 0.8, gloss: 0.55,
                    emissive: PALETTE.red, emissiveIntensity: 0.35
                });
                this.prim(root, 'box', [0, 1.3, 0], [2.4, 2.6, 2.4], secMat);
                this.prim(root, 'sphere', [0, 3.2, 0], [1.9, 2.2, 0.5], secMat);
                const edge = M.standard('secEdge', {
                    diffuse: new Color(0.1, 0.03, 0.04), metalness: 0.6, gloss: 0.7,
                    emissive: PALETTE.red, emissiveIntensity: 1.2
                });
                this.prim(root, 'box', [0, 2.62, 0], [2.5, 0.08, 2.5], edge);
                this.blobShadow(root, 3.0);
                break;
            }
            default: { // Department office building
                const h = 2.2 + (Math.abs(hashCode(def.id)) % 4) * 0.45;
                this.prim(root, 'box', [0, h / 2, 0], [2.3, h, 2.3], M.standard('dept', {
                    diffuse: PALETTE.dept, metalness: 0.7, gloss: 0.5
                }));
                this.prim(root, 'box', [0.45, h + 0.32, 0.35], [1.1, 0.64, 1.1], darker);
                const win = M.standard('deptWin', {
                    diffuse: new Color(0.02, 0.05, 0.08), metalness: 0.5, gloss: 0.8,
                    emissive: color, emissiveIntensity: 0.8
                });
                this.prim(root, 'box', [0, h * 0.55, 1.17], [1.7, h * 0.55, 0.05], win);
                this.prim(root, 'box', [1.17, h * 0.55, 0], [0.05, h * 0.55, 1.7], win);
                this.blobShadow(root, 2.8);
            }
        }

        // Status beacon used for anomaly pulsing / selection highlight.
        const beacon = new Entity('beacon');
        beacon.addComponent('render', { type: 'sphere' });
        const beaconMat = this.mats.tube(color, 1, 1.2);
        beacon.render.material = beaconMat;
        beacon.setLocalPosition(0, 5.4, 0);
        beacon.setLocalScale(0.22, 0.22, 0.22);
        root.addChild(beacon);

        return { root, beacon, beaconMat, baseColor: color };
    }
}

function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return h;
}

/* =========================================================================
 * 7. TUBE BUILDER — custom meshes for solid and dashed routes
 * ========================================================================= */

const _tanA = new Vec3(), _tanB = new Vec3(), _side = new Vec3(), _up = new Vec3();

class TubeBuilder {
    constructor(app) { this.app = app; }

    /**
     * Builds a tube along curve windows.
     * @param {CurveLUT} curve
     * @param {number} radius
     * @param {number} sides
     * @param {Array<[number, number]>} windows - t ranges to fill (dashes)
     * @param {number} segsPerWindow
     */
    build(curve, radius, sides, windows, segsPerWindow) {
        const positions = [], normals = [], indices = [];
        const c = new Vec3();
        let ringStart = 0;

        for (const [t0, t1] of windows) {
            const rings = Math.max(2, segsPerWindow);
            for (let i = 0; i < rings; i++) {
                const t = t0 + (t1 - t0) * (i / (rings - 1));
                curve.sample(t, c);
                curve.sample(Math.min(t + 0.01, 1), _tanA);
                _tanA.sub(c);
                if (_tanA.lengthSq() < 1e-8) _tanA.set(0, 0, 1);
                _tanA.normalize();
                _side.cross(_tanA, Vec3.UP);
                if (_side.lengthSq() < 1e-6) _side.set(1, 0, 0);
                _side.normalize();
                _up.cross(_side, _tanA).normalize();

                for (let s2 = 0; s2 <= sides; s2++) {
                    const a = (s2 / sides) * Math.PI * 2;
                    const nx = Math.cos(a), ny = Math.sin(a);
                    const ox = _side.x * nx + _up.x * ny;
                    const oy = _side.y * nx + _up.y * ny;
                    const oz = _side.z * nx + _up.z * ny;
                    positions.push(c.x + ox * radius, c.y + oy * radius, c.z + oz * radius);
                    normals.push(ox, oy, oz);
                }
            }
            for (let i = 0; i < rings - 1; i++) {
                for (let s2 = 0; s2 < sides; s2++) {
                    const a = ringStart + i * (sides + 1) + s2;
                    const b = a + sides + 1;
                    indices.push(a, b, a + 1, a + 1, b, b + 1);
                }
            }
            ringStart += rings * (sides + 1);
        }

        const mesh = new Mesh(this.app.graphicsDevice);
        mesh.setPositions(positions);
        mesh.setNormals(normals);
        mesh.setIndices(indices);
        mesh.update(PRIMITIVE_TRIANGLES);
        return mesh;
    }

    solidWindows() { return [[0, 1]]; }

    dashedWindows() {
        const w = [];
        const dash = 0.055, gap = 0.045;
        for (let t = 0; t < 1; t += dash + gap)
            w.push([t, Math.min(t + dash, 1)]);
        return w;
    }
}

/* =========================================================================
 * 8. UI OVERLAY — complete dashboard injected from this script
 * ========================================================================= */

const UI_CSS = `
#fs-root { position: fixed; inset: 0; pointer-events: none; z-index: 10;
  font-family: 'Segoe UI', system-ui, sans-serif; color: #dbe7f5; font-size: 13px; }
#fs-root * { box-sizing: border-box; }
.fs-panel { position: absolute; background: rgba(4,10,20,0.85); border: 1px solid rgba(60,150,220,0.25);
  border-radius: 8px; padding: 10px 12px; pointer-events: auto; backdrop-filter: blur(3px); }
.fs-h { color: #7ecbff; font-size: 11px; letter-spacing: 1.2px; font-weight: 600; margin: 4px 0 6px; }
#fs-topbar { position: absolute; top: 0; left: 0; right: 0; height: 38px;
  background: rgba(3,8,16,0.9); border-bottom: 1px solid rgba(60,150,220,0.25);
  display: flex; align-items: center; gap: 14px; padding: 0 14px; pointer-events: auto; }
#fs-title { color: #8fd8ff; font-weight: 700; letter-spacing: 1.5px; font-size: 14px; white-space: nowrap; }
#fs-status { margin-left: auto; color: #92a4bd; font-size: 11px; text-align: right;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#fs-left { top: 48px; left: 8px; width: 218px; max-height: calc(100vh - 160px); overflow-y: auto; }
#fs-right { top: 48px; right: 8px; width: 268px; max-height: calc(100vh - 160px); overflow-y: auto; }
.fs-kpi { display: flex; justify-content: space-between; padding: 1px 0; }
.fs-kpi span:first-child { color: #8296b3; font-size: 11px; }
.fs-kpi span:last-child { color: #fff; font-weight: 600; font-size: 12px; }
.fs-legend { font-size: 11px; line-height: 1.7; }
.fs-body { color: #c6d4e8; font-size: 11px; line-height: 1.55; white-space: pre-line; }
.fs-alert { border-left: 3px solid #ff4757; background: rgba(255,71,87,0.08);
  margin: 4px 0; padding: 5px 7px; font-size: 11px; cursor: pointer; border-radius: 3px; }
.fs-alert .fs-detail { display: none; color: #9fb2cc; margin-top: 4px; }
.fs-alert.open .fs-detail { display: block; }
.fs-rec { border-left: 3px solid #ffd54a; background: rgba(255,213,74,0.07);
  margin: 4px 0; padding: 6px 8px; font-size: 11px; cursor: pointer; border-radius: 3px; }
.fs-rec.fs-critical { border-left-color: #ff4757; background: rgba(255,71,87,0.08); }
.fs-rec.selected { outline: 1px solid #ffd54a; }
.fs-rec .fs-benefit { display: none; color: #9fb2cc; margin-top: 4px; }
.fs-rec.selected .fs-benefit { display: block; }
#fs-bottom { position: absolute; left: 234px; right: 284px; bottom: 8px; min-height: 44px;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.fs-btn { background: #17263c; color: #fff; border: 1px solid rgba(90,160,230,0.35);
  border-radius: 5px; padding: 5px 10px; font-size: 11px; cursor: pointer; }
.fs-btn:hover { background: #1e3450; }
.fs-ctrl { display: flex; align-items: center; gap: 4px; color: #8296b3; font-size: 11px; }
.fs-ctrl select { background: #101d30; color: #dbe7f5; border: 1px solid rgba(90,160,230,0.3);
  border-radius: 4px; font-size: 11px; padding: 3px; }
.fs-ctrl input[type=range] { width: 90px; }
#fs-story { position: absolute; left: 50%; transform: translateX(-50%); bottom: 64px;
  width: 560px; max-width: 92vw; display: none; }
#fs-story .fs-stage-label { color: #29e6ff; font-size: 11px; letter-spacing: 1px; }
#fs-story .fs-stage-title { color: #fff; font-size: 15px; font-weight: 700; margin: 3px 0; }
#fs-story .fs-stage-copy { color: #aebdd4; font-size: 12px; line-height: 1.5; min-height: 36px; }
#fs-story .fs-story-row { display: flex; justify-content: space-between; margin-top: 8px; }
#fs-labels { position: absolute; inset: 0; overflow: hidden; }
.fs-label { position: absolute; transform: translate(-50%, -100%); color: #bfe4ff;
  font-size: 10px; letter-spacing: 0.6px; text-shadow: 0 0 4px #000; white-space: nowrap; }
.fs-warn { position: absolute; transform: translate(-50%, -100%); font-size: 15px;
  text-shadow: 0 0 6px #000; animation: fswarn 1s infinite alternate; }
@keyframes fswarn { from { opacity: 0.55; } to { opacity: 1; } }
#fs-loading, #fs-error { position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; background: rgba(2,6,12,0.92);
  pointer-events: auto; gap: 12px; }
#fs-loading .fs-spin { width: 34px; height: 34px; border: 3px solid rgba(60,150,220,0.25);
  border-top-color: #29e6ff; border-radius: 50%; animation: fsspin 0.9s linear infinite; }
@keyframes fsspin { to { transform: rotate(360deg); } }
#fs-error { display: none; }
#fs-error .fs-err-box { max-width: 520px; background: rgba(40,8,12,0.9);
  border: 1px solid #ff4757; border-radius: 8px; padding: 18px 22px; line-height: 1.6; }
@media (max-width: 1500px) {
  #fs-left { width: 190px; } #fs-right { width: 236px; }
  #fs-bottom { left: 200px; right: 246px; }
  #fs-root { font-size: 12px; }
}
@media (max-width: 1100px) {
  #fs-left { display: none; } #fs-bottom { left: 8px; }
}
`;

class UiOverlay {
    constructor() {
        this.handlers = {};
        this.el = {};
        this.build();
    }

    on(name, fn) { this.handlers[name] = fn; }
    fire(name, arg) { if (this.handlers[name]) this.handlers[name](arg); }

    h(tag, cls, parent, text) {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        if (parent) parent.appendChild(e);
        return e;
    }

    build() {
        const style = document.createElement('style');
        style.textContent = UI_CSS;
        document.head.appendChild(style);
        this.style = style;

        const root = this.h('div', null, document.body);
        root.id = 'fs-root';
        this.root = root;

        // Node labels + warning markers live below the panels.
        const labels = this.h('div', null, root); labels.id = 'fs-labels';
        this.el.labels = labels;

        // Top bar
        const top = this.h('div', null, root); top.id = 'fs-topbar';
        this.h('div', null, top).id = 'fs-title';
        top.firstChild.textContent = 'FLOWSCOPE AI — 3D NETWORK CITY (PlayCanvas)';
        const status = this.h('div', null, top); status.id = 'fs-status';
        this.el.status = status;

        // Left panel: KPIs + legend
        const left = this.h('div', 'fs-panel', root); left.id = 'fs-left';
        this.h('div', 'fs-h', left, 'NETWORK KPIs');
        this.el.kpi = {};
        const kpiDefs = [
            ['totalTraffic', 'Total traffic'], ['avgLatency', 'Avg latency'],
            ['avgSpeed', 'Avg speed'], ['avgBandwidth', 'Bandwidth use'],
            ['avgLoad', 'Network load'], ['avgLoss', 'Packet loss'],
            ['connections', 'Connections'], ['apiTraffic', 'API traffic'],
            ['dbTraffic', 'DB traffic'], ['aiTraffic', 'AI traffic'],
            ['anomalies', 'Anomalies'], ['criticalRoutes', 'Critical routes'],
            ['predictedTraffic', 'Predicted traffic'], ['systemHealth', 'System health']
        ];
        for (const [key, label] of kpiDefs) {
            const row = this.h('div', 'fs-kpi', left);
            this.h('span', null, row, label);
            this.el.kpi[key] = this.h('span', null, row, '—');
        }
        this.h('div', 'fs-h', left, 'LEGEND');
        const legend = this.h('div', 'fs-legend', left);
        const legendRows = [
            ['#3D7EFF', 'Normal traffic'], ['#29E6FF', 'High-speed traffic'],
            ['#A45CFF', 'AI / predicted'], ['#FFD54A', 'Critical priority'],
            ['#FF4757', 'Threat / anomaly'], ['#3DFF8C', 'Optimized']
        ];
        for (const [c, t] of legendRows) {
            const row = this.h('div', null, legend);
            row.innerHTML = `<span style="color:${c}">■</span> ${t}`;
        }

        // Right panel: alerts, selection, predictions, recommendations
        const right = this.h('div', 'fs-panel', root); right.id = 'fs-right';
        this.h('div', 'fs-h', right, 'ALERTS');
        this.el.alerts = this.h('div', null, right);
        this.h('div', 'fs-h', right, 'SELECTION');
        this.el.selTitle = this.h('div', null, right, 'Click a node or route.');
        this.el.selTitle.style.cssText = 'color:#fff;font-weight:600;margin-bottom:3px;';
        this.el.selBody = this.h('div', 'fs-body', right, '');
        this.h('div', 'fs-h', right, 'AI PREDICTIONS');
        this.el.predictions = this.h('div', 'fs-body', right, 'Loading…');
        this.h('div', 'fs-h', right, 'AI RECOMMENDATIONS');
        this.el.recs = this.h('div', null, right);

        // Bottom control bar
        const bottom = this.h('div', null, root); bottom.id = 'fs-bottom';
        const btn = (label, ev) => {
            const b = this.h('button', 'fs-btn fs-panel', bottom, label);
            b.style.position = 'static';
            b.addEventListener('click', () => this.fire(ev, b));
            return b;
        };
        const ctrl = (label) => {
            const c = this.h('div', 'fs-ctrl fs-panel', bottom);
            c.style.position = 'static';
            if (label) this.h('span', null, c, label);
            return c;
        };
        const select = (parent, options, ev) => {
            const s = this.h('select', null, parent);
            for (const o of options) {
                const opt = this.h('option', null, s, o);
                opt.value = o;
            }
            s.addEventListener('change', () => this.fire(ev, s.value));
            return s;
        };
        const check = (label, ev, on) => {
            const c = ctrl(null);
            const cb = this.h('input', null, c);
            cb.type = 'checkbox'; cb.checked = on;
            this.h('span', null, c, label);
            cb.addEventListener('change', () => this.fire(ev, cb.checked));
            return cb;
        };

        this.el.pauseBtn = btn('❚❚ Pause', 'pause');
        const speed = ctrl('Speed');
        const slider = this.h('input', null, speed);
        slider.type = 'range'; slider.min = '0.25'; slider.max = '3'; slider.step = '0.05'; slider.value = '1';
        slider.addEventListener('input', () => this.fire('speed', parseFloat(slider.value)));
        this.el.speed = slider;
        this.el.quality = select(ctrl('Quality'), ['LOW', 'HIGH', 'ULTRA'], 'quality');
        this.el.quality.value = 'HIGH';
        this.el.dept = select(ctrl('Dept'), ['All'], 'filterDept');
        this.el.type = select(ctrl('Type'), ['All'], 'filterType');
        this.el.anom = select(ctrl('Status'), ['All', 'Normal', 'Anomaly'], 'filterStatus');
        this.el.current = check('Current', 'toggleCurrent', true);
        this.el.predicted = check('Predicted', 'togglePredicted', true);
        this.el.autoRotate = check('Auto-rotate', 'autoRotate', false);
        btn('Reset Cam', 'resetCam');
        this.el.storyBtn = btn('Story Mode', 'story');
        btn('⛶', 'fullscreen');

        // Story panel
        const story = this.h('div', 'fs-panel', root); story.id = 'fs-story';
        this.el.storyPanel = story;
        this.el.stageLabel = this.h('div', 'fs-stage-label', story, '');
        this.el.stageTitle = this.h('div', 'fs-stage-title', story, '');
        this.el.stageCopy = this.h('div', 'fs-stage-copy', story, '');
        const row = this.h('div', 'fs-story-row', story);
        const prev = this.h('button', 'fs-btn', row, '◀ Back');
        const exit = this.h('button', 'fs-btn', row, 'Exit');
        const next = this.h('button', 'fs-btn', row, 'Next ▶');
        prev.addEventListener('click', () => this.fire('storyPrev'));
        exit.addEventListener('click', () => this.fire('storyExit'));
        next.addEventListener('click', () => this.fire('storyNext'));
        this.el.storyPrev = prev; this.el.storyNext = next;

        // Loading + error overlays
        const loading = this.h('div', null, root); loading.id = 'fs-loading';
        this.h('div', 'fs-spin', loading);
        this.h('div', null, loading, 'Building the 3D network city…');
        this.el.loading = loading;

        const error = this.h('div', null, root); error.id = 'fs-error';
        this.el.errorBox = this.h('div', 'fs-err-box', error);
        this.el.error = error;
    }

    setStatus(text) { this.el.status.textContent = text; }
    hideLoading() { this.el.loading.style.display = 'none'; }

    showError(html) {
        this.el.loading.style.display = 'none';
        this.el.error.style.display = 'flex';
        this.el.errorBox.innerHTML = html;
    }

    setKpis(k) {
        const e = this.el.kpi;
        e.totalTraffic.textContent = Fmt.mb(k.totalTraffic);
        e.avgLatency.textContent = Fmt.ms(k.avgLatency);
        e.avgSpeed.textContent = Math.round(k.avgSpeed) + ' Mbps';
        e.avgBandwidth.textContent = Fmt.pct(k.avgBandwidth);
        e.avgLoad.textContent = Fmt.pct(k.avgLoad);
        e.avgLoss.textContent = k.avgLoss.toFixed(2) + ' %';
        e.connections.textContent = Fmt.count(k.connections);
        e.apiTraffic.textContent = Fmt.count(k.apiTraffic);
        e.dbTraffic.textContent = Fmt.count(k.dbTraffic);
        e.aiTraffic.textContent = Fmt.count(k.aiTraffic);
        e.anomalies.textContent = String(k.anomalies);
        e.criticalRoutes.textContent = String(k.criticalRoutes);
        e.predictedTraffic.textContent = Fmt.mb(k.predictedTraffic);
        e.systemHealth.textContent = Math.round(k.systemHealth * 100) + ' %';
        e.systemHealth.style.color =
            k.systemHealth > 0.75 ? '#3DFF8C' : k.systemHealth > 0.5 ? '#FFD54A' : '#FF4757';
    }

    setFilterOptions(departments, types) {
        const fill = (sel, values) => {
            while (sel.options.length > 1) sel.remove(1);
            for (const v of values) {
                const o = document.createElement('option');
                o.value = o.textContent = v;
                sel.appendChild(o);
            }
        };
        fill(this.el.dept, departments);
        fill(this.el.type, types);
    }

    showNodeDetails(stat, def) {
        this.el.selTitle.textContent = def.id + '  (' + def.type + ')';
        const health = Math.round(stat.health * 100);
        const healthLabel = health > 75 ? 'Healthy' : health > 50 ? 'Degraded' : 'Critical';
        this.el.selBody.textContent =
            `Department: ${def.department}\n` +
            `Incoming: ${Fmt.mb(stat.inMb)}   Outgoing: ${Fmt.mb(stat.outMb)}\n` +
            `Network load (peak): ${Fmt.pct(stat.peakLoad)}\n` +
            `Avg latency: ${Fmt.ms(stat.avgLatency)}\n` +
            `Active connections: ${stat.connections}\n` +
            `Response time: ${Fmt.ms(stat.avgResponse)}\n` +
            `Health: ${health} % (${healthLabel})\n` +
            `Threat level: ${stat.threat}` +
            (stat.anomalies.size ? `\n⚠ Anomalies: ${Array.from(stat.anomalies).join(', ')}` : '');
    }

    showRouteDetails(rt) {
        this.el.selTitle.textContent = rt.source + ' → ' + rt.destination;
        this.el.selBody.textContent =
            `Records: ${rt.count}\n` +
            `Data volume: ${Fmt.mb(rt.volume)}\n` +
            `Transfer speed: ${Math.round(rt.speed)} Mbps\n` +
            `Latency: ${Fmt.ms(rt.latency)}\n` +
            `Packet loss: ${rt.loss.toFixed(2)} %\n` +
            `Bandwidth: ${Fmt.pct(rt.bandwidth)}\n` +
            `Route status: ${rt.dominantRouteStatus}\n` +
            `Connection status: ${rt.dominantConnStatus}\n` +
            `Anomaly status: ${rt.anomalyKinds.size ? Array.from(rt.anomalyKinds).join(', ') : 'Normal'}`;
    }

    clearSelection() {
        this.el.selTitle.textContent = 'Click a node or route.';
        this.el.selBody.textContent = '';
    }

    renderAlerts(alerts) {
        const box = this.el.alerts;
        box.innerHTML = '';
        if (!alerts.length) {
            this.h('div', 'fs-body', box, 'No active alerts.');
            return;
        }
        for (const a of alerts.slice(0, 6)) {
            const el = this.h('div', 'fs-alert', box);
            const lat = num(a.latency_ms);
            this.h('div', null, el, `${a.type}: ${a.source} → ${a.destination}`);
            const detail = this.h('div', 'fs-detail', el,
                `Latency ${lat.toFixed(0)} ms vs ≤ ${THRESHOLDS.latency_ms} ms normal · ` +
                `load ${num(a.network_load_percent).toFixed(0)} % · ` +
                `loss ${num(a.packet_loss_percent).toFixed(1)} %\n` +
                `Cause: ${a.type}. Recommendation: ${a.recommendation || '—'}`);
            detail.style.whiteSpace = 'pre-line';
            el.addEventListener('click', () => el.classList.toggle('open'));
        }
        if (alerts.length > 6)
            this.h('div', 'fs-body', box, `… ${alerts.length - 6} more alerts in ml_results.json`);
    }

    renderPredictions(preds, chainInfo) {
        const lines = [];
        const ranked = preds.slice().sort((a, b) => {
            const rank = { Critical: 3, High: 2, Medium: 1, Low: 0 };
            return (rank[b.risk] || 0) - (rank[a.risk] || 0);
        });
        for (const p of ranked.slice(0, 5)) {
            if (!p.predicted) continue;
            const mark = p.risk === 'Critical' ? '‼' : (p.risk === 'High' ? '!' : '•');
            lines.push(`${mark} ${p.node}  ${p.traffic_change_percent >= 0 ? '+' : ''}` +
                `${Math.round(num(p.traffic_change_percent))}% traffic, ` +
                `load ${Math.round(num(p.predicted.network_load_percent))}%, ` +
                `${Math.round(num(p.predicted.latency_ms))} ms`);
        }
        lines.push('');
        lines.push((chainInfo.demo ? '⚠ DEMO route: ' : 'AI route: ') + chainInfo.chain.join(' → '));
        if (chainInfo.reason) lines.push(chainInfo.reason);
        this.el.predictions.textContent = lines.join('\n');
    }

    renderRecommendations(recs, onSelect) {
        const box = this.el.recs;
        box.innerHTML = '';
        this._recEls = [];
        recs.forEach((rec, i) => {
            const el = this.h('div', 'fs-rec' + (rec.severity === 'Critical' ? ' fs-critical' : ''), box);
            this.h('div', null, el, `[${rec.severity}] ${rec.action}`);
            this.h('div', 'fs-benefit', el, '');
            el.addEventListener('click', () => onSelect(i, el));
            this._recEls.push(el);
        });
    }

    selectRecommendation(index, benefitText) {
        this._recEls.forEach((el, i) => {
            el.classList.toggle('selected', i === index);
            if (i === index) el.querySelector('.fs-benefit').textContent = benefitText;
        });
    }

    setStory(active, stage, index, total) {
        this.el.storyPanel.style.display = active ? 'block' : 'none';
        this.el.storyBtn.textContent = active ? 'Exit Story' : 'Story Mode';
        if (active && stage) {
            this.el.stageLabel.textContent = stage.label;
            this.el.stageTitle.textContent = stage.title;
            this.el.stageCopy.textContent = stage.copy;
            this.el.storyPrev.disabled = index === 0;
            this.el.storyNext.textContent = index >= total - 1 ? 'Finish' : 'Next ▶';
        }
    }

    /** Creates a floating world-anchored label; caller positions it per frame. */
    makeLabel(text, cls) {
        const el = this.h('div', cls, this.el.labels, text);
        return el;
    }

    destroy() {
        this.root.remove();
        this.style.remove();
    }
}

/* =========================================================================
 * 9. CAMERA RIG — orbit / zoom / pan with damping, limits and focus
 * ========================================================================= */

const _camOffset = new Vec3();

class CameraRig {
    constructor(app) {
        this.app = app;
        this.entity = new Entity('FlowScopeCamera');
        this.entity.addComponent('camera', {
            clearColor: new Color(0.008, 0.02, 0.045),
            fov: 45,
            nearClip: 0.2,
            farClip: 300
        });
        app.root.addChild(this.entity);

        this.defaults = { yaw: -18, pitch: 34, distance: 46, target: new Vec3(0, 1.5, 0) };
        this.yaw = this.yawGoal = this.defaults.yaw;
        this.pitch = this.pitchGoal = this.defaults.pitch;
        this.distance = this.distanceGoal = this.defaults.distance;
        this.target = this.defaults.target.clone();
        this.targetGoal = this.defaults.target.clone();

        this.minDistance = 10; this.maxDistance = 90;
        this.minPitch = 8; this.maxPitch = 82;
        this.panLimit = 32;
        this.autoRotate = false;
        this.idleTime = 99;
        this._drag = null;

        this.bindInput();
        this.apply(1);
    }

    bindInput() {
        const canvas = this.app.graphicsDevice.canvas;
        this._canvas = canvas;

        this._onDown = (e) => {
            if (e.target !== canvas) return;
            this._drag = { button: e.button, x: e.clientX, y: e.clientY, moved: 0 };
            this.idleTime = 0;
        };
        this._onMove = (e) => {
            if (!this._drag) return;
            const dx = e.clientX - this._drag.x;
            const dy = e.clientY - this._drag.y;
            this._drag.x = e.clientX; this._drag.y = e.clientY;
            this._drag.moved += Math.abs(dx) + Math.abs(dy);
            this.idleTime = 0;
            if (this._drag.button === 0) {              // left drag: orbit
                this.yawGoal -= dx * 0.28;
                this.pitchGoal = clamp(this.pitchGoal + dy * 0.24, this.minPitch, this.maxPitch);
            } else if (this._drag.button === 2) {       // right drag: pan
                const yawRad = this.yaw * Math.PI / 180;
                const scale = 0.0016 * this.distance;
                const fx = -Math.sin(yawRad), fz = -Math.cos(yawRad);
                const rx = Math.cos(yawRad), rz = -Math.sin(yawRad);
                this.targetGoal.x = clamp(this.targetGoal.x + (-dx * rx + dy * fx) * scale, -this.panLimit, this.panLimit);
                this.targetGoal.z = clamp(this.targetGoal.z + (-dx * rz + dy * fz) * scale, -this.panLimit, this.panLimit);
            }
        };
        this._onUp = () => { this._drag = null; };
        this._onWheel = (e) => {
            if (e.target !== canvas) return;
            e.preventDefault();
            this.idleTime = 0;
            this.distanceGoal = clamp(
                this.distanceGoal + Math.sign(e.deltaY) * this.distanceGoal * 0.09,
                this.minDistance, this.maxDistance);
        };
        this._onCtx = (e) => { if (e.target === canvas) e.preventDefault(); };

        window.addEventListener('mousedown', this._onDown);
        window.addEventListener('mousemove', this._onMove);
        window.addEventListener('mouseup', this._onUp);
        canvas.addEventListener('wheel', this._onWheel, { passive: false });
        window.addEventListener('contextmenu', this._onCtx);
    }

    unbindInput() {
        window.removeEventListener('mousedown', this._onDown);
        window.removeEventListener('mousemove', this._onMove);
        window.removeEventListener('mouseup', this._onUp);
        this._canvas.removeEventListener('wheel', this._onWheel);
        window.removeEventListener('contextmenu', this._onCtx);
    }

    reset() {
        this.yawGoal = this.defaults.yaw;
        this.pitchGoal = this.defaults.pitch;
        this.distanceGoal = this.defaults.distance;
        this.targetGoal.copy(this.defaults.target);
    }

    focusOn(position, distance) {
        this.targetGoal.set(position.x, position.y + 2, position.z);
        this.distanceGoal = clamp(distance || 20, this.minDistance, this.maxDistance);
    }

    update(dt) {
        this.idleTime += dt;
        if (this.autoRotate && this.idleTime > 4) this.yawGoal += dt * 4;
        this.apply(1 - Math.exp(-9 * dt));
    }

    apply(k) {
        this.yaw += (this.yawGoal - this.yaw) * k;
        this.pitch += (this.pitchGoal - this.pitch) * k;
        this.distance += (this.distanceGoal - this.distance) * k;
        this.target.lerp(this.target, this.targetGoal, k);

        const yawRad = this.yaw * Math.PI / 180;
        const pitchRad = this.pitch * Math.PI / 180;
        const horiz = Math.cos(pitchRad) * this.distance;
        _camOffset.set(
            Math.sin(yawRad) * horiz,
            Math.sin(pitchRad) * this.distance,
            Math.cos(yawRad) * horiz
        );
        this.entity.setPosition(
            this.target.x + _camOffset.x,
            this.target.y + _camOffset.y,
            this.target.z + _camOffset.z
        );
        this.entity.lookAt(this.target);
    }

    /** Builds a picking ray from canvas-relative pixel coordinates. */
    screenRay(x, y, outOrigin, outDir) {
        const cam = this.entity.camera;
        cam.screenToWorld(x, y, cam.nearClip + 0.01, outOrigin);
        cam.screenToWorld(x, y, 60, outDir);
        outDir.sub(outOrigin).normalize();
    }
}

/* =========================================================================
 * 10. MAIN SCRIPT
 * ========================================================================= */

const _rayOrigin = new Vec3(), _rayDir = new Vec3(), _tmpV = new Vec3(), _tmpW = new Vec3();
const _screen = new Vec3();

export class FlowScopeMain extends Script {
    static scriptName = 'flowScopeMain';

    /**
     * The uploaded network_traffic.json asset (traffic records array).
     * @attribute
     * @type {Asset}
     * @resource json
     */
    networkTraffic = null;

    /**
     * The uploaded ml_results.json asset (metrics, anomalies, predictions).
     * @attribute
     * @type {Asset}
     * @resource json
     */
    mlResults = null;

    initialize() {
        this.ui = new UiOverlay();
        this.sim = { paused: false, speed: 1, time: 0 };
        this.filters = { dept: 'All', type: 'All', status: 'All', current: true, predicted: true };
        this.quality = QUALITY.HIGH;
        this.qualityName = 'HIGH';
        this.routeViews = [];
        this.predictedViews = [];
        this.particlePool = [];
        this.meshes = [];
        this.nodes = new Map();
        this.selectedRoute = null;
        this.selectedNode = null;
        this.story = { active: false, index: 0 };
        this.lastClick = { time: -10, id: null };

        const trafficOk = this.networkTraffic && this.networkTraffic.resource;
        const mlOk = this.mlResults && this.mlResults.resource;
        if (!trafficOk || !mlOk) {
            this.ui.showError(
                '<b>FlowScope cannot start — JSON assets are not assigned.</b><br><br>' +
                'Select the <b>FlowScopeApp</b> entity, open its Script component and assign:<br>' +
                '• <b>networkTraffic</b> → network_traffic.json ' + (trafficOk ? '✔' : '✖ missing') + '<br>' +
                '• <b>mlResults</b> → ml_results.json ' + (mlOk ? '✔' : '✖ missing') + '<br><br>' +
                'Both files are in the playcanvas-online folder. Upload them to Assets first.');
            return;
        }

        // Defer the heavy build one tick so the loading overlay paints first.
        setTimeout(() => {
            try {
                this.buildEverything();
                this.ui.hideLoading();
            } catch (err) {
                console.error(err);
                this.ui.showError('<b>FlowScope failed to build the scene.</b><br><br>' +
                    'Browser console error:<br><code>' + String(err && err.message || err) + '</code>');
            }
        }, 30);

        this.on('destroy', () => this.teardown());
    }

    teardown() {
        if (this.rig) this.rig.unbindInput();
        if (this.ui) this.ui.destroy();
        for (const m of this.meshes) m.destroy();
        this.meshes.length = 0;
    }

    /* ------------------------------------------------------------------ */

    buildEverything() {
        const app = this.app;
        this.model = new DataModel(this.networkTraffic.resource, this.mlResults.resource);
        this.materials = new MaterialCache(app);
        this.tubes = new TubeBuilder(app);
        this.factory = new NodeFactory(app, this.materials);

        this.buildEnvironment();
        this.buildNodes();
        this.rig = new CameraRig(app);
        this.rebuildRoutes();
        this.buildUiBindings();
        this.bindPicking();

        const ml = this.model.ml;
        this.ui.setKpis(this.model.kpis);
        this.ui.renderAlerts(Array.isArray(ml.alerts) ? ml.alerts : []);
        this.ui.renderPredictions(Array.isArray(ml.predictions) ? ml.predictions : [],
            this.model.predictedChain());
        this.ui.renderRecommendations(Array.isArray(ml.recommendations) ? ml.recommendations : [],
            (i) => this.selectRecommendation(i));

        const depts = [], types = [];
        for (const d of NODE_CATALOG) {
            if (!depts.includes(d.department)) depts.push(d.department);
            if (!types.includes(d.type)) types.push(d.type);
        }
        this.ui.setFilterOptions(depts, types);

        this.ui.setStatus(
            `${this.model.records.length} records · ${this.model.routes.length} routes · ` +
            `ML: ${(ml.algorithms || []).join(', ') || 'n/a'} · generated ${ml.generated_at || '—'}` +
            (this.model.usedFallbackKpis ? ' · ⚠ KPI fallback (record list empty)' : ''));
    }

    buildEnvironment() {
        const app = this.app;
        app.scene.ambientLight = new Color(0.10, 0.13, 0.19);

        // Fog (API differs between engine generations — apply defensively).
        try {
            const fog = app.scene.fog;
            if (fog && typeof fog === 'object') {
                fog.type = 'exp2';
                fog.color = new Color(0.008, 0.035, 0.078);
                fog.density = 0.009;
            } else {
                app.scene.fog = 'exp2';
                app.scene.fogColor = new Color(0.008, 0.035, 0.078);
                app.scene.fogDensity = 0.009;
            }
        } catch (e) { /* fog is cosmetic — ignore engine differences */ }

        const rootName = 'FlowScope-Generated';
        this.sceneRoot = new Entity(rootName);
        app.root.addChild(this.sceneRoot);

        // Floor: dark metallic platform with a subtle grid texture.
        const floorMat = this.materials.standard('floor', {
            diffuse: new Color(0.05, 0.075, 0.11), metalness: 0.8, gloss: 0.45,
            emissive: new Color(1, 1, 1), emissiveIntensity: 0.16,
            emissiveMap: this.materials.gridTexture()
        });
        const floor = new Entity('Floor');
        floor.addComponent('render', { type: 'plane' });
        floor.render.material = floorMat;
        floor.setLocalScale(64, 1, 52);
        floor.render.castShadows = false;
        this.sceneRoot.addChild(floor);

        // Key light (warm-white directional with soft shadows).
        this.keyLight = new Entity('KeyLight');
        this.keyLight.addComponent('light', {
            type: 'directional',
            color: new Color(1, 0.95, 0.88),
            intensity: 1.15,
            castShadows: this.quality.shadows,
            shadowResolution: this.quality.shadowRes,
            shadowBias: 0.15,
            normalOffsetBias: 0.06,
            shadowDistance: 90
        });
        this.keyLight.setEulerAngles(48, -34, 0);
        this.sceneRoot.addChild(this.keyLight);

        // Blue rim light from behind.
        const rim = new Entity('RimLight');
        rim.addComponent('light', {
            type: 'directional',
            color: new Color(0.32, 0.52, 1),
            intensity: 0.5,
            castShadows: false
        });
        rim.setEulerAngles(18, 142, 0);
        this.sceneRoot.addChild(rim);
    }

    buildNodes() {
        this.nodeRoot = new Entity('Nodes');
        this.sceneRoot.addChild(this.nodeRoot);

        for (const def of NODE_CATALOG) {
            const built = this.factory.build(def);
            this.nodeRoot.addChild(built.root);

            // Subtle coloured local light (HIGH/ULTRA only).
            let light = null;
            if (this.quality.localLights) {
                light = new Entity('local');
                light.addComponent('light', {
                    type: 'point', color: built.baseColor,
                    intensity: 0.55, range: 6.5, castShadows: false
                });
                light.setLocalPosition(0, 3, 1.3);
                built.root.addChild(light);
            }

            const stat = this.model.nodeStat(def.id);
            const label = this.ui.makeLabel(def.id, 'fs-label');
            const warn = this.ui.makeLabel('⚠', 'fs-warn');
            warn.style.display = 'none';

            this.nodes.set(def.id, {
                def, stat,
                entity: built.root,
                beacon: built.beacon,
                beaconMat: built.beaconMat,
                baseColor: built.baseColor,
                light, label, warn,
                center: new Vec3(def.pos[0], 2.2, def.pos[2]),
                radius: 2.4,
                pulse: Math.random() * Math.PI * 2,
                anomalous: stat.anomalies.size > 0
            });
        }
    }

    /* ---------------- routes + particles ---------------- */

    routeColor(rt) {
        if (rt.isFailed || rt.isAnomalous) return PALETTE.red;
        if (rt.isCritical) return PALETTE.yellow;
        if (rt.aiRequests > 0 && (rt.destType === 'AI' || rt.sourceType === 'AI')) return PALETTE.purple;
        if (rt.speed > 420) return PALETTE.cyan;
        return PALETTE.blue;
    }

    rebuildRoutes() {
        // Dispose previous meshes/entities; return particles to the pool.
        for (const v of this.routeViews.concat(this.predictedViews)) {
            v.entity.destroy();
            for (const p of v.particles) p.entity.enabled = false;
        }
        for (const m of this.meshes) m.destroy();
        this.meshes.length = 0;
        this.routeViews = [];
        this.predictedViews = [];
        this.selectedRoute = null;

        if (this.routeRoot) this.routeRoot.destroy();
        this.routeRoot = new Entity('Routes');
        this.sceneRoot.addChild(this.routeRoot);

        const q = this.quality;
        const model = this.model;
        const visible = model.routes.slice(0, q.maxRoutes);
        const dirSeen = new Set();

        // Current routes
        for (const rt of visible) {
            const src = this.nodes.get(rt.source);
            const dst = this.nodes.get(rt.destination);
            if (!src || !dst) continue;

            const reverseKey = rt.destination + '>' + rt.source;
            const sideSign = dirSeen.has(reverseKey) ? -1 : 1;
            dirSeen.add(rt.key);

            const curve = buildRouteCurve(
                src.entity.getPosition(), dst.entity.getPosition(), 0, sideSign, 64);
            const radius = mapRange(clamp(rt.bandwidth, 0, 100), 0, 100, 0.045, 0.20);
            const glow = mapRange(clamp(rt.load, 0, 100), 0, 100, 0.55, 2.2);
            const color = this.routeColor(rt);
            const mat = this.materials.tube(color, 0.92, glow);
            const mesh = this.tubes.build(curve, radius, q.tubeSides,
                this.tubes.solidWindows(), q.routeSegments);
            this.meshes.push(mesh);

            const entity = new Entity('route:' + rt.key);
            entity.addComponent('render', { meshInstances: [new MeshInstance(mesh, mat)] });
            entity.render.castShadows = false;
            this.routeRoot.addChild(entity);

            // Direction arrow at 60% of the curve.
            const arrow = new Entity('arrow');
            arrow.addComponent('render', { type: 'cone' });
            arrow.render.material = mat;
            arrow.render.castShadows = false;
            curve.sample(0.6, _tmpV);
            curve.sample(0.64, _tmpW);
            arrow.setPosition(_tmpV);
            arrow.lookAt(_tmpW);
            arrow.rotateLocal(90, 0, 0);
            arrow.setLocalScale(radius * 4 + 0.12, radius * 6 + 0.2, radius * 4 + 0.12);
            this.routeRoot.addChild(arrow);

            const view = {
                data: rt, curve, entity, arrow, mat, baseGlow: glow,
                baseColor: color, highlight: null,
                predicted: false, visible: true,
                breakPoint: rt.isFailed ? 0.55 : 1,
                particles: [],
                particleSpeed: mapRange(clamp(rt.speed, 30, 900), 30, 900, 0.05, 0.32),
                particleSize: mapRange(clamp(rt.volume / Math.max(1, rt.count), 2, 200), 2, 200, 0.12, 0.4),
                particleCount: Math.max(2, Math.round(
                    q.particlesPerRoute * clamp(rt.count / 24, 0.35, 1.6)))
            };
            this.assignParticles(view, color);
            this.routeViews.push(view);
        }

        // Predicted route chain (translucent purple, dashed, fewer particles).
        const chainInfo = model.predictedChain();
        for (let i = 0; i + 1 < chainInfo.chain.length; i++) {
            const src = this.nodes.get(chainInfo.chain[i]);
            const dst = this.nodes.get(chainInfo.chain[i + 1]);
            if (!src || !dst) continue;

            const curve = buildRouteCurve(
                src.entity.getPosition(), dst.entity.getPosition(), 1.8, -1, 64);
            const mat = this.materials.tube(PALETTE.purple, 0.30, 1.0);
            const mesh = this.tubes.build(curve, 0.085, Math.max(4, q.tubeSides - 2),
                this.tubes.dashedWindows(), 3);
            this.meshes.push(mesh);

            const entity = new Entity('predicted:' + i);
            entity.addComponent('render', { meshInstances: [new MeshInstance(mesh, mat)] });
            entity.render.castShadows = false;
            this.routeRoot.addChild(entity);

            const view = {
                data: null, curve, entity, arrow: null, mat, baseGlow: 1.0,
                baseColor: PALETTE.purple, highlight: null,
                predicted: true, visible: true, breakPoint: 1,
                particles: [],
                particleSpeed: 0.12,
                particleSize: 0.16,
                particleCount: Math.max(2, Math.round(q.particlesPerRoute / 3))
            };
            this.assignParticles(view, PALETTE.purple, 0.4);
            this.predictedViews.push(view);
        }

        this.applyFilters();
    }

    /** Borrows pooled particle entities for a route (grows the pool once, reuses after). */
    assignParticles(view, color, alpha) {
        const key = color.toString();
        const mat = this.materials.particle(key + (alpha ? ':t' : ''), color);
        for (let i = 0; i < view.particleCount; i++) {
            let p = this.particlePool.find((x) => !x.inUse);
            if (!p) {
                const e = new Entity('particle');
                e.addComponent('render', { type: 'sphere' });
                e.render.castShadows = false;
                e.render.receiveShadows = false;
                this.sceneRoot.addChild(e);
                p = { entity: e, inUse: false, t: 0 };
                this.particlePool.push(p);
            }
            p.inUse = true;
            p.t = i / view.particleCount;
            p.entity.enabled = true;
            p.entity.render.material = mat;
            const s = view.particleSize * (0.85 + Math.random() * 0.3);
            p.entity.setLocalScale(s, s, s);
            view.particles.push(p);
        }
    }

    /* ---------------- filters / highlighting ---------------- */

    routePassesFilters(rt) {
        const f = this.filters;
        if (f.dept !== 'All' && rt.sourceDept !== f.dept && rt.destDept !== f.dept) return false;
        if (f.type !== 'All' && rt.sourceType !== f.type && rt.destType !== f.type) return false;
        if (f.status === 'Anomaly' && !rt.isAnomalous) return false;
        if (f.status === 'Normal' && rt.isAnomalous) return false;
        return true;
    }

    applyFilters() {
        for (const v of this.routeViews) {
            v.visible = this.filters.current && this.routePassesFilters(v.data);
            v.entity.enabled = v.visible;
            if (v.arrow) v.arrow.enabled = v.visible;
            for (const p of v.particles) p.entity.enabled = v.visible;
        }
        for (const v of this.predictedViews) {
            v.visible = this.filters.predicted;
            v.entity.enabled = v.visible;
            for (const p of v.particles) p.entity.enabled = v.visible;
        }
    }

    setRouteHighlight(view, color) {
        view.highlight = color || null;
        const c = color || view.baseColor;
        view.mat.emissive = c;
        view.mat.emissiveIntensity = color ? view.baseGlow + 0.9 : view.baseGlow;
        view.mat.update();
    }

    clearHighlights() {
        for (const v of this.routeViews) if (v.highlight) this.setRouteHighlight(v, null);
        for (const v of this.predictedViews) if (v.highlight) this.setRouteHighlight(v, null);
    }

    highlightRoutesTouching(nodeId, color) {
        for (const v of this.routeViews)
            if (v.data && (v.data.source === nodeId || v.data.destination === nodeId))
                this.setRouteHighlight(v, color);
    }

    /* ---------------- UI bindings ---------------- */

    buildUiBindings() {
        const ui = this.ui;
        ui.on('pause', (btn) => {
            this.sim.paused = !this.sim.paused;
            btn.textContent = this.sim.paused ? '▶ Resume' : '❚❚ Pause';
        });
        ui.on('speed', (v) => { this.sim.speed = v; });
        ui.on('quality', (name) => {
            this.qualityName = name;
            this.quality = QUALITY[name] || QUALITY.HIGH;
            this.keyLight.light.castShadows = this.quality.shadows;
            this.keyLight.light.shadowResolution = this.quality.shadowRes;
            for (const n of this.nodes.values())
                if (n.light) n.light.enabled = this.quality.localLights;
            this.rebuildRoutes();
        });
        ui.on('filterDept', (v) => { this.filters.dept = v; this.applyFilters(); });
        ui.on('filterType', (v) => { this.filters.type = v; this.applyFilters(); });
        ui.on('filterStatus', (v) => { this.filters.status = v; this.applyFilters(); });
        ui.on('toggleCurrent', (v) => { this.filters.current = v; this.applyFilters(); });
        ui.on('togglePredicted', (v) => { this.filters.predicted = v; this.applyFilters(); });
        ui.on('autoRotate', (v) => { this.rig.autoRotate = v; });
        ui.on('resetCam', () => this.rig.reset());
        ui.on('fullscreen', () => {
            const el = document.documentElement;
            if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
            else if (document.exitFullscreen) document.exitFullscreen();
        });
        ui.on('story', () => this.story.active ? this.exitStory() : this.startStory());
        ui.on('storyNext', () => this.storyStep(1));
        ui.on('storyPrev', () => this.storyStep(-1));
        ui.on('storyExit', () => this.exitStory());
    }

    selectRecommendation(index) {
        const recs = this.model.ml.recommendations || [];
        const rec = recs[index];
        if (!rec) return;
        this.clearHighlights();

        // Loose match of node names inside the recommendation text.
        const text = ((rec.action || '') + ' ' + (rec.reason || ''))
            .toLowerCase().replace(/[-\s]/g, '');
        let matched = null;
        for (const def of NODE_CATALOG) {
            if (text.includes(def.id.toLowerCase().replace(/-/g, ''))) { matched = def; break; }
        }

        let benefit = 'AI-generated recommendation. ' + (rec.reason || '');
        if (matched) {
            const node = this.nodes.get(matched.id);
            this.highlightRoutesTouching(matched.id, PALETTE.yellow);
            this.rig.focusOn(node.entity.getPosition(), 20);
            const pred = (this.model.ml.predictions || []).find((p) => p.node === matched.id);
            if (pred && pred.current && pred.predicted) {
                benefit += `\nExpected effect at ${matched.id}: load ` +
                    `${Math.round(num(pred.current.network_load_percent))}% → ` +
                    `${Math.round(num(pred.predicted.network_load_percent))}%, latency ` +
                    `${Math.round(num(pred.current.latency_ms))} → ` +
                    `${Math.round(num(pred.predicted.latency_ms))} ms (${pred.risk} risk).`;
            }
        }
        this.ui.selectRecommendation(index, benefit);
    }

    /* ---------------- story mode ---------------- */

    startStory() {
        this.story.active = true;
        this.story.index = 0;
        this.applyStoryStage();
    }

    exitStory() {
        this.story.active = false;
        this.clearHighlights();
        this.sim.speed = parseFloat(this.ui.el.speed.value);
        this.filters.predicted = this.ui.el.predicted.checked;
        this.applyFilters();
        this.rig.reset();
        this.ui.setStory(false);
    }

    storyStep(dir) {
        if (!this.story.active) return;
        const next = this.story.index + dir;
        if (next >= STORY_STAGES.length) { this.exitStory(); return; }
        this.story.index = clamp(next, 0, STORY_STAGES.length - 1);
        this.applyStoryStage();
    }

    applyStoryStage() {
        const stage = STORY_STAGES[this.story.index];
        this.sim.speed = stage.speed;
        this.filters.predicted = stage.predicted || stage.optimized;
        this.applyFilters();
        this.clearHighlights();
        if (stage.anomaly) this.highlightRoutesTouching(stage.node, PALETTE.red);
        if (stage.optimized)
            for (const v of this.predictedViews) this.setRouteHighlight(v, PALETTE.green);
        const node = this.nodes.get(stage.node);
        if (node) this.rig.focusOn(node.entity.getPosition(), 18);
        this.ui.setStory(true, stage, this.story.index, STORY_STAGES.length);
    }

    /* ---------------- picking ---------------- */

    bindPicking() {
        const canvas = this.app.graphicsDevice.canvas;
        this._pickDown = null;
        this._onPickDown = (e) => {
            if (e.button !== 0 || e.target !== canvas) return;
            this._pickDown = { x: e.clientX, y: e.clientY };
        };
        this._onPickUp = (e) => {
            if (e.button !== 0 || !this._pickDown) return;
            const moved = Math.abs(e.clientX - this._pickDown.x) + Math.abs(e.clientY - this._pickDown.y);
            this._pickDown = null;
            if (moved > 6 || e.target !== canvas) return;
            const rect = canvas.getBoundingClientRect();
            this.pick(e.clientX - rect.left, e.clientY - rect.top);
        };
        window.addEventListener('mousedown', this._onPickDown);
        window.addEventListener('mouseup', this._onPickUp);
    }

    pick(x, y) {
        this.rig.screenRay(x, y, _rayOrigin, _rayDir);

        // Nodes first: ray-sphere intersection, nearest hit wins.
        let bestNode = null, bestDist = Infinity;
        for (const n of this.nodes.values()) {
            _tmpV.sub2(n.center, _rayOrigin);
            const proj = _tmpV.dot(_rayDir);
            if (proj < 0) continue;
            const dSq = _tmpV.lengthSq() - proj * proj;
            if (dSq < n.radius * n.radius && proj < bestDist) {
                bestDist = proj; bestNode = n;
            }
        }
        if (bestNode) { this.selectNode(bestNode); return; }

        // Routes: distance from ray to curve LUT points.
        let bestRoute = null, bestRouteD = 0.55;
        for (const v of this.routeViews) {
            if (!v.visible) continue;
            const pts = v.curve.points;
            for (let i = 0; i < pts.length; i += 2) {
                _tmpV.sub2(pts[i], _rayOrigin);
                const proj = _tmpV.dot(_rayDir);
                if (proj < 0) continue;
                const d = Math.sqrt(Math.max(0, _tmpV.lengthSq() - proj * proj));
                if (d < bestRouteD) { bestRouteD = d; bestRoute = v; }
            }
        }
        if (bestRoute) { this.selectRoute(bestRoute); return; }

        this.deselect();
    }

    selectNode(n) {
        this.deselect(true);
        this.selectedNode = n;
        n.beaconMat.emissiveIntensity = 2.6;
        n.beaconMat.update();
        this.ui.showNodeDetails(n.stat, n.def);

        // Double-click focuses the camera.
        const now = performance.now();
        if (this.lastClick.id === n.def.id && now - this.lastClick.time < 350)
            this.rig.focusOn(n.entity.getPosition(), 18);
        this.lastClick = { id: n.def.id, time: now };
    }

    selectRoute(v) {
        this.deselect(true);
        this.selectedRoute = v;
        this.setRouteHighlight(v, v.baseColor.clone().lerp(v.baseColor, new Color(1, 1, 1), 0.35));
        this.ui.showRouteDetails(v.data);
    }

    deselect(silent) {
        if (this.selectedNode) {
            this.selectedNode.beaconMat.emissiveIntensity = 1.2;
            this.selectedNode.beaconMat.update();
            this.selectedNode = null;
        }
        if (this.selectedRoute) {
            this.setRouteHighlight(this.selectedRoute, this.selectedRoute.highlight === PALETTE.yellow ? PALETTE.yellow : null);
            this.selectedRoute = null;
        }
        if (!silent) this.ui.clearSelection();
    }

    /* ---------------- per-frame update ---------------- */

    update(dt) {
        if (!this.rig) return; // still loading or errored

        this.rig.update(dt);
        const simDt = this.sim.paused ? 0 : dt * this.sim.speed;
        this.sim.time += simDt;

        // Particles along curves (allocation-free).
        this.advanceParticles(this.routeViews, simDt);
        this.advanceParticles(this.predictedViews, simDt * 0.8);

        // Anomaly pulses: route glow + node beacons.
        const pulse = 0.5 + 0.5 * Math.sin(this.sim.time * 3.1);
        for (const v of this.routeViews) {
            if (!v.visible || !v.data || !v.data.isAnomalous || v.highlight) continue;
            v.mat.emissiveIntensity = v.baseGlow + pulse * 1.1;
            v.mat.update();
        }

        const cam = this.rig.entity.camera;
        for (const n of this.nodes.values()) {
            if (n.anomalous) {
                n.pulse += dt * 3.2;
                const s = 0.22 + 0.1 * (0.5 + 0.5 * Math.sin(n.pulse));
                n.beacon.setLocalScale(s, s, s);
                n.beaconMat.emissive = PALETTE.red;
                n.beaconMat.emissiveIntensity = 1.4 + pulse;
                n.beaconMat.update();
            }
            // Screen-anchored label + warning marker.
            cam.worldToScreen(n.center, _screen);
            const visible = _screen.z > 0;
            n.label.style.display = visible ? 'block' : 'none';
            if (visible) {
                n.label.style.left = _screen.x + 'px';
                n.label.style.top = (_screen.y - 26) + 'px';
            }
            const warnVisible = visible && n.anomalous;
            n.warn.style.display = warnVisible ? 'block' : 'none';
            if (warnVisible) {
                n.warn.style.left = _screen.x + 'px';
                n.warn.style.top = (_screen.y - 40) + 'px';
            }
        }

        // Slow AI core ring rotation for life.
        const ai = this.nodes.get('AI-Engine');
        if (ai) {
            const r1 = ai.entity.findByName('aiRing1');
            const r2 = ai.entity.findByName('aiRing2');
            if (r1) r1.rotateLocal(0, dt * 40, 0);
            if (r2) r2.rotateLocal(0, -dt * 28, 0);
        }
    }

    advanceParticles(views, simDt) {
        for (const v of views) {
            if (!v.visible) continue;
            const speed = v.particleSpeed;
            for (const p of v.particles) {
                p.t += speed * simDt;
                if (p.t >= v.breakPoint) p.t -= v.breakPoint; // failed routes break early
                v.curve.sample(p.t, _tmpV);
                p.entity.setPosition(_tmpV);
            }
        }
    }
}
