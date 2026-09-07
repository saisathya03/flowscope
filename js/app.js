import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { EffectComposer } from './vendor/postprocessing/EffectComposer.js';
import { RenderPass } from './vendor/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './vendor/postprocessing/UnrealBloomPass.js';
import { createSplatCloud, nodeSplats, environmentSplats, curveSplats } from './splats.js';

const COLORS = {
  blue: 0x129cff,
  cyan: 0x39e7ff,
  purple: 0xa45dff,
  yellow: 0xffd426,
  red: 0xff3c4e,
  green: 0x2eea8b,
  steel: 0x163c59,
  dark: 0x061422,
};

const NODE_CONFIG = [
  // Reference island layout (front = +z toward the camera). See ISLANDS for the hexagonal platforms.
  { id: 'Development', type: 'Department', department: 'Development', position: [-42, 0, 6], color: COLORS.blue },
  { id: 'QA', type: 'Department', department: 'QA', position: [-36, 0, -24], color: COLORS.cyan },
  { id: 'HR', type: 'Department', department: 'HR', position: [-30, 0, -52], color: 0x7cb9dc },
  { id: 'Finance', type: 'Department', department: 'Finance', position: [16, 0, -56], color: COLORS.yellow },
  { id: 'Management', type: 'Department', department: 'Management', position: [48, 0, -44], color: 0x73d8ff },
  { id: 'API-Gateway', type: 'API', department: 'IT', position: [-20, 0, -8], color: COLORS.cyan },
  { id: 'Security-Hub', type: 'Security', department: 'IT', position: [-10, 0, -50], color: COLORS.red },
  { id: 'Server-01', type: 'Server', department: 'Development', position: [0, 0, -33], color: COLORS.blue },
  { id: 'Server-02', type: 'Server', department: 'Operations', position: [10, 0, -32], color: COLORS.red },
  { id: 'Server-03', type: 'Server', department: 'IT', position: [-1, 0, -40], color: COLORS.blue },
  { id: 'Server-04', type: 'Server', department: 'Operations', position: [5, 0, -22], color: COLORS.green },
  { id: 'Database-01', type: 'Database', department: 'Finance', position: [-19, 0, 30], color: COLORS.yellow },
  { id: 'Database-02', type: 'Database', department: 'Operations', position: [24, 0, 34], color: COLORS.cyan },
  { id: 'AI-Engine', type: 'AI', department: 'Management', position: [27, 0, 0], color: COLORS.purple },
  { id: 'Cloud-01', type: 'Cloud', department: 'Operations', position: [54, 0, -16], color: COLORS.cyan },
  { id: 'IoT-Gateway', type: 'IoT', department: 'Operations', position: [32, 0, -52], color: COLORS.green },
];

const STORY_STEPS = [
  { label: 'STEP 1 — DATA GENERATED', title: 'Development creates API traffic', copy: 'A new software release sends a wave of requests into the company network.', node: 'Development', speed: 0.75, predicted: false },
  { label: 'STEP 2 — DATA MOVEMENT', title: 'Blue particles enter the API Gateway', copy: 'The solid particle stream shows the live route, direction, volume, and transfer speed.', node: 'API-Gateway', speed: 1, predicted: false },
  { label: 'STEP 3 — TRAFFIC INCREASE', title: 'Demand rises across the network', copy: 'Particle density and route glow increase as request volume and bandwidth use climb.', node: 'API-Gateway', speed: 1.75, predicted: false },
  { label: 'STEP 4 — BOTTLENECK', title: 'The API and Server-02 path becomes overloaded', copy: 'Queue length, latency, and network load cross safe thresholds. The affected route turns red.', node: 'Server-02', speed: 1.25, predicted: false, alert: true },
  { label: 'STEP 5 — AI DETECTION', title: 'Isolation Forest detects abnormal behavior', copy: 'The model compares current telemetry with historical patterns and flags the unusual flow.', node: 'AI-Engine', speed: 0.8, predicted: false, alert: true },
  { label: 'STEP 6 — PREDICTION', title: 'AI projects the next traffic state', copy: 'Translucent purple paths show where traffic is likely to move and which node may overload.', node: 'AI-Engine', speed: 0.85, predicted: true },
  { label: 'STEP 7 — RECOMMENDATION', title: 'Reroute through Server-04', copy: 'The engine recommends a lower-load path through Server-04 and Database-02.', node: 'Server-04', speed: 1, predicted: true },
  { label: 'STEP 8 — OPTIMIZATION', title: 'Traffic shifts to the alternative route', copy: 'Projected particles demonstrate the recommended path before the change is applied.', node: 'Database-02', speed: 1.25, predicted: true },
  { label: 'STEP 9 — RESULT', title: 'Latency falls and system health improves', copy: 'The optimized green flow reaches its destination with lower delay and restored capacity.', node: 'Database-02', speed: 1, predicted: true, result: true },
];

const state = {
  data: [],
  ml: null,
  routeStats: [],
  nodeStats: new Map(),
  flowSpeed: 1,
  paused: false,
  filters: { department: 'All', type: 'All', anomaly: 'All' },
  layers: { current: true, predicted: true },
  visualMode: 'river',
  cine: false,
  cineT: 0,
  bloomStrength: .8,
  renderQuality: 'balanced',
  preStoryMode: 'river',
  storyIndex: -1,
  storyTimer: null,
  fullView: false,
  cameraPreset: 'perspective',
};

let scene;
let camera;
let renderer;
let composer;
let bloomPass;
let controls;
let raycaster;
let pointer;
let clock;
let currentLayer;
let predictedLayer;
let nodeLayer;
let atmosphereLayer;
let riverCurrentLayer;
let riverPredictedLayer;
let riverArchitectureLayer;
let splatStaticLayer;
let splatFlowLayer;
let splatPredictedLayer;
let splatMaterials = [];
let nodeObjects = new Map();
let interactiveObjects = [];
let particles = [];
let predictedParticles = [];
let riverParticles = [];
let riverPredictedParticles = [];
let riverMaterials = [];
let pulsingNodes = [];
let scanBands = [];
let orbitalObjects = [];
let lightBeams = [];
let animatedRouteMaterials = [];
let groundScanners = [];
let particleGlowTexture;
let cameraGoal = null;
let forecastChart = null;
let pulsingShells = [];
let accentLights = [];
let cinePath = null;
let cityCinePath = null;
let storyLayer = null;
let storyParticles = [];
let focusLayer = null;
let focusParticles = [];
let beadTexture = null;
let floatingObjects = [];
let cityEnvironmentLayer;
let cityEnvMap = null;
let cityKeyLight = null;
let riverLights = [];
let cityAnimated = [];
let cityEnvAnimated = [];
let cityLabels = [];
let anomalyMarkers = [];
let cityStatusLights = [];
let cityBlinkers = [];
let anomalyNodes = new Set();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const average = (values) => values.length ? values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length : 0;
const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: digits });
const formatCompact = (value) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));

async function loadData() {
  const loadingLabel = $('#loading-label');
  try {
    loadingLabel.textContent = 'Reading 360 synthetic traffic records…';
    const [dataResponse, mlResponse] = await Promise.all([
      fetch('./data/network_traffic.json'),
      fetch('./data/ml_results.json'),
    ]);
    if (!dataResponse.ok || !mlResponse.ok) throw new Error('A generated data file is missing.');
    state.data = await dataResponse.json();
    state.ml = await mlResponse.json();
  } catch (error) {
    console.warn(error);
    loadingLabel.textContent = 'Using built-in demonstration telemetry…';
    state.data = makeFallbackData();
    state.ml = makeFallbackAnalysis(state.data);
  }
}

function makeFallbackData() {
  const routePairs = [
    ['Development', 'API-Gateway'], ['API-Gateway', 'Server-01'], ['API-Gateway', 'Server-02'],
    ['Server-01', 'Database-01'], ['Server-02', 'Database-01'], ['Server-04', 'Database-02'],
    ['Database-01', 'AI-Engine'], ['AI-Engine', 'Cloud-01'], ['IoT-Gateway', 'Server-02'],
  ];
  return Array.from({ length: 90 }, (_, index) => {
    const [source, destination] = routePairs[index % routePairs.length];
    const src = NODE_CONFIG.find((node) => node.id === source);
    const dst = NODE_CONFIG.find((node) => node.id === destination);
    const anomaly = index % 19 === 0;
    return {
      timestamp: new Date(Date.UTC(2026, 7, 28, 0, index * 5)).toISOString(), source_id: source,
      source_type: src.type, source_department: src.department, destination_id: destination,
      destination_type: dst.type, destination_department: dst.department,
      data_volume_mb: 100 + (index % 8) * 25, transfer_speed_mbps: 260 + (index % 6) * 55,
      bandwidth_usage_percent: anomaly ? 94 : 42 + (index % 20), latency_ms: anomaly ? 245 : 28 + (index % 22),
      packet_loss_percent: anomaly ? 8.4 : 0.2, network_load_percent: anomaly ? 95 : 48 + (index % 21),
      active_connections: 180 + index * 2, response_time_ms: anomaly ? 480 : 62,
      queue_length: anomaly ? 52 : 6, data_priority: index % 11 === 0 ? 'Critical' : 'Normal',
      data_classification: 'Internal', access_permission: 'Employee', threat_level: anomaly ? 'High' : 'Low',
      connection_status: anomaly ? 'Degraded' : 'Connected', route_status: anomaly ? 'Congested' : 'Optimal',
      processing_rate: 320, api_requests: 180, database_queries: 90, ai_requests: 25, iot_messages: 18,
      anomaly_status: anomaly ? 'High Latency' : 'Normal',
    };
  });
}

function makeFallbackAnalysis(data) {
  const anomalies = data.filter((row) => row.anomaly_status !== 'Normal');
  return {
    generated_at: new Date().toISOString(), records_analyzed: data.length,
    metrics: {
      total_data_volume_mb: data.reduce((sum, row) => sum + row.data_volume_mb, 0),
      average_latency_ms: average(data.map((row) => row.latency_ms)), average_transfer_speed_mbps: average(data.map((row) => row.transfer_speed_mbps)),
      average_bandwidth_usage_percent: average(data.map((row) => row.bandwidth_usage_percent)), average_network_load_percent: average(data.map((row) => row.network_load_percent)),
      average_packet_loss_percent: average(data.map((row) => row.packet_loss_percent)), active_connections: data.at(-1).active_connections,
      api_traffic: data.reduce((s, r) => s + r.api_requests, 0), database_traffic: data.reduce((s, r) => s + r.database_queries, 0),
      ai_traffic: data.reduce((s, r) => s + r.ai_requests, 0), anomalies: anomalies.length, model_anomalies: anomalies.length,
    },
    detections: { bottlenecks: [], failed_connections: 0, suspicious_routes: 0, slow_routes: anomalies.length, overloaded_records: anomalies.length },
    predictions: [
      { node: 'API-Gateway', traffic_change_percent: 25, predicted: { network_load_percent: 88, latency_ms: 142 }, risk: 'Critical' },
      { node: 'Database-01', traffic_change_percent: 18, predicted: { network_load_percent: 82, latency_ms: 128 }, risk: 'Watch' },
    ],
    recommendations: [
      { severity: 'Critical', action: 'Increase API Gateway capacity.', reason: 'Predicted load may reach 88%.' },
      { severity: 'High', action: 'Reroute Server-02 traffic through Server-04.', reason: 'The primary route is congested.' },
    ],
    alerts: anomalies.slice(0, 5).map((row) => ({ source: row.source_id, destination: row.destination_id, type: row.anomaly_status, latency_ms: row.latency_ms, network_load_percent: row.network_load_percent, packet_loss_percent: row.packet_loss_percent, recommendation: 'Reroute through Server-04.' })),
    forecast: Array.from({ length: 12 }, (_, i) => ({ timestamp: new Date(Date.now() + i * 3600000).toISOString(), traffic: 1000 + i * 85, load: 55 + i * 2, latency: 38 + i * 3, kind: i < 9 ? 'historical' : 'predicted' })),
    predictive_flow: { current: ['Server-01', 'API-Gateway', 'Server-02', 'Database-01'], predicted: ['Server-01', 'API-Gateway', 'Server-04', 'Database-02'] },
  };
}

function aggregateData() {
  const routes = new Map();
  const nodeRows = new Map(NODE_CONFIG.map((node) => [node.id, []]));

  state.data.forEach((row) => {
    const key = `${row.source_id}→${row.destination_id}`;
    if (!routes.has(key)) routes.set(key, []);
    routes.get(key).push(row);
    if (!nodeRows.has(row.source_id)) nodeRows.set(row.source_id, []);
    if (!nodeRows.has(row.destination_id)) nodeRows.set(row.destination_id, []);
    nodeRows.get(row.source_id).push({ ...row, direction: 'outgoing' });
    nodeRows.get(row.destination_id).push({ ...row, direction: 'incoming' });
  });

  state.routeStats = [...routes.entries()].map(([key, rows], index) => {
    const latest = rows.at(-1);
    const abnormalRows = rows.filter((row) => row.anomaly_status !== 'Normal');
    const worst = abnormalRows.at(-1) || latest;
    return {
      key,
      index,
      source: latest.source_id,
      destination: latest.destination_id,
      sourceType: latest.source_type,
      destinationType: latest.destination_type,
      sourceDepartment: latest.source_department,
      destinationDepartment: latest.destination_department,
      volume: average(rows.map((row) => row.data_volume_mb)),
      totalVolume: rows.reduce((sum, row) => sum + Number(row.data_volume_mb), 0),
      speed: average(rows.map((row) => row.transfer_speed_mbps)),
      bandwidth: average(rows.map((row) => row.bandwidth_usage_percent)),
      latency: average(rows.map((row) => row.latency_ms)),
      packetLoss: average(rows.map((row) => row.packet_loss_percent)),
      networkLoad: average(rows.map((row) => row.network_load_percent)),
      connections: Math.round(average(rows.map((row) => row.active_connections))),
      responseTime: average(rows.map((row) => row.response_time_ms)),
      queueLength: Math.round(average(rows.map((row) => row.queue_length))),
      processingRate: average(rows.map((row) => row.processing_rate)),
      priority: worst.data_priority,
      threat: worst.threat_level,
      connectionStatus: worst.connection_status,
      routeStatus: worst.route_status,
      anomalyStatus: worst.anomaly_status,
      anomalyCount: abnormalRows.length,
      samples: rows.length,
    };
  }).sort((a, b) => b.totalVolume - a.totalVolume);

  nodeRows.forEach((rows, id) => {
    const incoming = rows.filter((row) => row.direction === 'incoming');
    const outgoing = rows.filter((row) => row.direction === 'outgoing');
    const abnormal = rows.filter((row) => row.anomaly_status !== 'Normal');
    const config = NODE_CONFIG.find((node) => node.id === id) || {};
    const load = average(rows.map((row) => row.network_load_percent));
    const latency = average(rows.map((row) => row.latency_ms));
    state.nodeStats.set(id, {
      id,
      type: config.type || rows[0]?.source_type || 'Node',
      department: config.department || rows[0]?.source_department || 'Shared',
      incomingTraffic: incoming.reduce((sum, row) => sum + Number(row.data_volume_mb), 0),
      outgoingTraffic: outgoing.reduce((sum, row) => sum + Number(row.data_volume_mb), 0),
      load,
      latency,
      connections: Math.round(average(rows.map((row) => row.active_connections))),
      responseTime: average(rows.map((row) => row.response_time_ms)),
      threat: abnormal.some((row) => row.threat_level === 'Critical') ? 'Critical' : abnormal.length ? 'Elevated' : 'Low',
      health: load > 84 || latency > 120 ? 'Critical' : load > 68 || latency > 80 ? 'Watch' : 'Healthy',
      anomalyCount: abnormal.length,
    });
  });
}

function initThree() {
  const container = $('#scene-container');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x01050d);
  scene.fog = new THREE.FogExp2(0x020914, 0.0125);

  camera = new THREE.PerspectiveCamera(44, container.clientWidth / container.clientHeight, 0.1, 220);
  camera.position.set(0, 18.5, 44);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.55));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.prepend(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.target.set(0, 3.4, .8);
  controls.minDistance = 15;
  controls.maxDistance = 66;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.2;

  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  raycaster.params.Line.threshold = 0.3;
  pointer = new THREE.Vector2();

  currentLayer = new THREE.Group(); currentLayer.name = 'Current flows';
  predictedLayer = new THREE.Group(); predictedLayer.name = 'Predicted flows';
  nodeLayer = new THREE.Group(); nodeLayer.name = 'Network nodes';
  atmosphereLayer = new THREE.Group(); atmosphereLayer.name = 'Atmosphere';
  cityEnvironmentLayer = new THREE.Group(); cityEnvironmentLayer.name = 'Data centre environment';
  riverCurrentLayer = new THREE.Group(); riverCurrentLayer.name = 'Dense data river';
  riverPredictedLayer = new THREE.Group(); riverPredictedLayer.name = 'Predicted river branches';
  riverArchitectureLayer = new THREE.Group(); riverArchitectureLayer.name = 'Origin and destination infrastructure';
  splatStaticLayer = new THREE.Group(); splatStaticLayer.name = 'Gaussian splat infrastructure';
  splatFlowLayer = new THREE.Group(); splatFlowLayer.name = 'Gaussian splat flows';
  splatPredictedLayer = new THREE.Group(); splatPredictedLayer.name = 'Gaussian splat predicted flows';
  scene.add(atmosphereLayer, cityEnvironmentLayer, currentLayer, predictedLayer, nodeLayer, riverArchitectureLayer, riverCurrentLayer, riverPredictedLayer, splatStaticLayer, splatFlowLayer, splatPredictedLayer);

  // Holographic light rig used by FLOW RIVER and SPLAT MODE. NETWORK CITY uses its own physical rig
  // (see buildCityLightRig); applyModeLighting toggles between the two.
  const ambient = new THREE.HemisphereLight(0x7bdcff, 0x010308, 1.85);
  const key = new THREE.DirectionalLight(0xb5eaff, 3.0);
  key.position.set(-12, 28, 18);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -30; key.shadow.camera.right = 30; key.shadow.camera.top = 30; key.shadow.camera.bottom = -30;
  const purpleLight = new THREE.PointLight(COLORS.purple, 42, 34, 2);
  purpleLight.position.set(16, 10, 4);
  purpleLight.userData.modeAccent = { river: 42, city: 8.5 };
  purpleLight.userData.baseIntensity = 42;
  purpleLight.userData.flickerPhase = 1.7;
  const cyanLight = new THREE.PointLight(COLORS.cyan, 34, 34, 2);
  cyanLight.position.set(-11, 9, 7);
  cyanLight.userData.modeAccent = { river: 34, city: 7.5 };
  cyanLight.userData.baseIntensity = 34;
  cyanLight.userData.flickerPhase = 4.1;
  accentLights = [purpleLight, cyanLight];
  const rimLight = new THREE.SpotLight(COLORS.blue, 70, 70, Math.PI * .28, .55, 1.4);
  rimLight.position.set(1, 30, -24);
  rimLight.target.position.set(0, 0, 0);
  scene.add(ambient, key, purpleLight, cyanLight, rimLight, rimLight.target);
  riverLights = [ambient, key, purpleLight, cyanLight, rimLight];

  try {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), state.bloomStrength, .42, .38);
    composer.addPass(bloomPass);
  } catch (error) {
    console.warn('Bloom unavailable; using the direct WebGL renderer.', error);
    composer = null;
  }

  particleGlowTexture = createGlowTexture();
  particleGlowTexture.userData.shared = true;
  cityEnvMap = buildCityEnvMap();
  buildEnvironment();
  buildCityEnvironment();
  buildNodes();
  buildCurrentFlows();
  buildPredictedFlows();
  buildFlowRiverArchitecture();
  buildFlowRiver();
  buildSplatScene();
  buildSplatFlows();
  cinePath = buildCinePath();
  cityCinePath = buildCityCinePath();
  state.storyActive = true;
  setVisualizationMode('city', false);
  const startView = cityCameraView();
  camera.position.copy(startView.position);
  controls.target.copy(startView.target);
  cameraGoal = null;
  bindSceneInteraction();
  window.addEventListener('resize', onResize);
  animate();
}

function buildEnvironment() {
  // FLOW RIVER holographic backdrop. Everything here is tagged riverBackdrop so that NETWORK CITY can
  // replace it with the physical data-centre environment built by buildCityEnvironment().
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x04111d, roughness: .26, metalness: .78, transparent: true, opacity: .98, emissive: 0x02101b, emissiveIntensity: .38 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 52), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.12;
  floor.receiveShadow = true;
  floor.userData.riverBackdrop = true;
  atmosphereLayer.add(floor);

  const grid = new THREE.GridHelper(64, 64, 0x1e9bd3, 0x0a3b59);
  grid.position.y = 0.01;
  grid.material.transparent = true;
  grid.material.opacity = .28;
  grid.material.blending = THREE.AdditiveBlending;
  grid.userData.riverBackdrop = true;
  atmosphereLayer.add(grid);

  [8, 14, 21, 27].forEach((radius, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius, radius + (index === 3 ? .09 : .045), 160),
      new THREE.MeshBasicMaterial({ color: index % 2 ? COLORS.purple : COLORS.cyan, transparent: true, opacity: .055 - index * .008, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .035 + index * .004;
    ring.userData.rotationSpeed = (index % 2 ? -1 : 1) * (.008 + index * .002);
    ring.userData.groundRing = true;
    ring.userData.riverBackdrop = true;
    atmosphereLayer.add(ring);
    orbitalObjects.push(ring);
  });

  const starGeometry = new THREE.BufferGeometry();
  const starPositions = [];
  for (let i = 0; i < 760; i += 1) {
    starPositions.push((Math.random() - .5) * 90, 3 + Math.random() * 38, (Math.random() - .5) * 78);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x65d5ff, size: .075, transparent: true, opacity: .42, blending: THREE.AdditiveBlending, depthWrite: false }));
  stars.userData.rotationSpeed = .004;
  stars.userData.riverBackdrop = true;
  atmosphereLayer.add(stars);
  orbitalObjects.push(stars);

  [-21, -14, -7, 0, 7, 14, 21].forEach((x, index) => {
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(.025, .025, 16, 5),
      new THREE.MeshBasicMaterial({ color: index % 2 ? COLORS.blue : COLORS.cyan, transparent: true, opacity: .18, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    beacon.position.set(x, 8, index % 2 ? -22 : 22);
    beacon.userData.riverBackdrop = true;
    atmosphereLayer.add(beacon);
  });

  const scanner = new THREE.Mesh(
    new THREE.RingGeometry(1.2, 1.32, 96),
    new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: .12, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  scanner.rotation.x = -Math.PI / 2;
  scanner.position.y = .06;
  scanner.userData.phase = 0;
  scanner.userData.riverBackdrop = true;
  atmosphereLayer.add(scanner);
  groundScanners.push(scanner);

  buildBackdropCity();
  buildCircuitGround();
}

function buildCircuitGround() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 832;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let trace = 0; trace < 90; trace += 1) {
    const seed = trace * 7.13;
    let x = pseudoRandom(seed) * canvas.width;
    let y = pseudoRandom(seed + 1) * canvas.height;
    const hue = pseudoRandom(seed + 2);
    context.strokeStyle = hue > .82 ? 'rgba(164,93,255,.5)' : hue > .6 ? 'rgba(57,231,255,.42)' : 'rgba(18,120,220,.45)';
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(x, y);
    const segments = 2 + Math.floor(pseudoRandom(seed + 3) * 3);
    for (let s = 0; s < segments; s += 1) {
      const length = 30 + pseudoRandom(seed + s * 3 + 4) * 110;
      if (pseudoRandom(seed + s + 5) > .5) x += (pseudoRandom(seed + s + 6) > .5 ? 1 : -1) * length;
      else y += (pseudoRandom(seed + s + 7) > .5 ? 1 : -1) * length;
      context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = context.strokeStyle;
    context.beginPath(); context.arc(x, y, 3.2, 0, Math.PI * 2); context.fill();
    context.strokeStyle = context.strokeStyle.replace(/\.\d+\)/, '.22)');
    context.beginPath(); context.arc(x, y, 6.4, 0, Math.PI * 2); context.stroke();
  }
  for (let pad = 0; pad < 60; pad += 1) {
    const x = pseudoRandom(pad + 400) * canvas.width;
    const y = pseudoRandom(pad + 500) * canvas.height;
    context.fillStyle = 'rgba(70,180,255,.32)';
    context.fillRect(x, y, 4 + pseudoRandom(pad) * 7, 4 + pseudoRandom(pad + 1) * 7);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const circuitPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(64, 52),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: .2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  circuitPlane.rotation.x = -Math.PI / 2;
  circuitPlane.position.y = .02;
  circuitPlane.userData.riverBackdrop = true;
  atmosphereLayer.add(circuitPlane);
}

function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.12, 'rgba(255,255,255,.95)');
  gradient.addColorStop(.32, 'rgba(110,225,255,.55)');
  gradient.addColorStop(1, 'rgba(0,120,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function pseudoRandom(seed) {
  return Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
}

function buildBackdropCity() {
  for (let index = 0; index < 48; index += 1) {
    const angle = pseudoRandom(index + 1) * Math.PI * 2;
    const radius = 27 + pseudoRandom(index + 5) * 9;
    const width = .7 + pseudoRandom(index + 8) * 1.6;
    const depth = .7 + pseudoRandom(index + 11) * 1.6;
    const height = 2.5 + pseudoRandom(index + 14) * 9.5;
    const color = index % 5 === 0 ? COLORS.purple : index % 3 === 0 ? COLORS.cyan : COLORS.blue;
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      new THREE.MeshStandardMaterial({ color: 0x071928, emissive: color, emissiveIntensity: .06, metalness: .82, roughness: .22, transparent: true, opacity: .52 }),
    );
    tower.position.set(Math.cos(angle) * radius, height / 2 - .05, Math.sin(angle) * radius);
    tower.rotation.y = -angle;
    tower.userData.riverBackdrop = true;
    atmosphereLayer.add(tower);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(tower.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: .14, blending: THREE.AdditiveBlending }),
    );
    tower.add(edges);
    if (index % 3 === 0) {
      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(.018, .018, 2.5 + pseudoRandom(index) * 3, 5),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .55, blending: THREE.AdditiveBlending }),
      );
      antenna.position.set(tower.position.x, height + 1, tower.position.z);
      antenna.userData.riverBackdrop = true;
      atmosphereLayer.add(antenna);
    }
  }
}

// ------------------------------------------------------------------ island city layout

const CITY = { water: 0, islandTop: 1.55, bridgeHeight: 2.95, foundationTop: .58 };
const ISLANDS = [
  // `accent` is assigned below from the owning department (see DEPARTMENT_COLORS).
  { id: 'dev', x: -42, z: 6, r: 8, nodes: ['Development'] },
  { id: 'api', x: -20, z: -8, r: 6.5, nodes: ['API-Gateway'] },
  { id: 'citadel', x: 5, z: -31, r: 13, nodes: ['Server-01', 'Server-02', 'Server-03', 'Server-04'], citadel: true },
  { id: 'db1', x: -19, z: 30, r: 9, nodes: ['Database-01'] },
  { id: 'db2', x: 24, z: 34, r: 9, nodes: ['Database-02'] },
  { id: 'ai', x: 27, z: 0, r: 8, nodes: ['AI-Engine'] },
  { id: 'iot', x: 32, z: -52, r: 5, nodes: ['IoT-Gateway'] },
  { id: 'cloud', x: 54, z: -16, r: 9, nodes: ['Cloud-01'] },
  { id: 'sec', x: -10, z: -50, r: 4.5, nodes: ['Security-Hub'], minor: true },
  { id: 'qa', x: -36, z: -24, r: 4.5, nodes: ['QA'], minor: true },
  { id: 'hr', x: -30, z: -52, r: 4.5, nodes: ['HR'], minor: true },
  { id: 'fin', x: 16, z: -56, r: 4.5, nodes: ['Finance'], minor: true },
  { id: 'mgmt', x: 48, z: -44, r: 4.5, nodes: ['Management'], minor: true },
];
// Per-node structure metrics: label height above the island, route port height and port radius.
const CITY_NODE = {
  Development: { height: 24.2, top: 22.4, port: 5.6, portRadius: 3.6 },
  'API-Gateway': { height: 11.6, port: 5.6, portRadius: 0, ring: true },
  'Server-01': { height: 13.0, top: 11.6, port: 3.2, portRadius: 2.2 },
  'Server-02': { height: 16.0, top: 14.6, port: 3.4, portRadius: 2.3 },
  'Server-03': { height: 16.2, top: 10.6, port: 3.0, portRadius: 2.0 },
  'Server-04': { height: 8.4, top: 7.0, port: 2.6, portRadius: 3.6 },
  'Database-01': { height: 14.0, top: 12.6, port: 4.2, portRadius: 4.4 },
  'Database-02': { height: 14.0, top: 12.6, port: 4.2, portRadius: 4.4 },
  'AI-Engine': { height: 12.6, top: 11.2, port: 3.0, portRadius: 4.8 },
  'IoT-Gateway': { height: 23.6, top: 22.0, port: 2.6, portRadius: 2.2 },
  'Cloud-01': { height: 8.2, top: 7.4, port: 2.5, portRadius: 6.4 },
  'Security-Hub': { height: 7.6, port: 2.2, portRadius: 2.0 },
  QA: { height: 7.2, port: 2.2, portRadius: 2.0 },
  HR: { height: 7.2, port: 2.2, portRadius: 2.0 },
  Finance: { height: 7.2, port: 2.2, portRadius: 2.0 },
  Management: { height: 7.2, port: 2.2, portRadius: 2.0 },
};
// ------------------------------------------------------------------ department identity palette
// ARCHITECTURAL IDENTITY ONLY: which department owns the building. These muted, professional tones sit
// deliberately outside the data-flow legend (blue / cyan / purple / yellow / red / green), which stays
// reserved for what is happening to the data. Applied to window illumination, entrance and roof trim,
// thin vertical edge lights, signage borders and subtle emissive accents - never to particles, routes,
// the river or the splat flows.
const DEPARTMENT_COLORS = {
  Development: 0xb86b43, // copper / burnt orange
  QA: 0xc97a72,          // soft coral
  Finance: 0xb89b62,     // champagne gold
  Management: 0xc9ced6,  // pearl silver
  HR: 0xb98291,          // dusty rose
  Operations: 0x8f7863,  // bronze taupe
  IT: 0x697681,          // gunmetal silver
};
const DEPARTMENT_NEUTRAL = 0x697681; // shared infrastructure (platforms owned by several departments)
const mixHex = (hex, target, amount) => new THREE.Color(hex).lerp(new THREE.Color(target), amount).getHex();
function departmentOf(id) { return NODE_CONFIG.find((node) => node.id === id)?.department; }
function departmentColor(id) { return DEPARTMENT_COLORS[departmentOf(id)] ?? DEPARTMENT_NEUTRAL; }
// Lifted tone for lit glass and small LEDs so one identity still reads at close range.
function departmentTint(id, amount = .32) { return mixHex(departmentColor(id), 0xffffff, amount); }
// Islands take their owner identity; a platform shared by several departments stays neutral gunmetal.
ISLANDS.forEach((island) => {
  const departments = [...new Set(island.nodes.map(departmentOf))];
  island.accent = departments.length === 1 ? departmentColor(island.nodes[0]) : DEPARTMENT_NEUTRAL;
});
// Axis of the API Gateway ring: routes enter and leave the gateway through the centre of the ring.
const API_AXIS = new THREE.Vector3(30, 0, -24).normalize();

const textureCache = new Map();
const geometryCache = new Map();
const cityMaterialCache = new Map();
const cityMats = {};

function islandFor(id) {
  return ISLANDS.find((island) => island.nodes.includes(id));
}

function platformHeightAt() {
  return CITY.islandTop;
}

function cityQuality() {
  return { fast: state.renderQuality === 'performance', ultra: state.renderQuality === 'cinematic' };
}

function hexString(color) {
  return `#${new THREE.Color(color).getHexString()}`;
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return [canvas, canvas.getContext('2d')];
}

function finishTexture(canvas, { repeat = [1, 1], srgb = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat[0], repeat[1]);
  texture.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  texture.userData.shared = true;
  return texture;
}

function tiledTexture(texture, repeatX, repeatY) {
  return cachedTexture(`tiled:${texture.uuid}:${repeatX}:${repeatY}`, () => {
    const copy = texture.clone();
    copy.repeat.set(repeatX, repeatY);
    copy.userData.shared = true;
    return copy;
  });
}

function cachedTexture(key, maker) {
  if (!textureCache.has(key)) textureCache.set(key, maker());
  return textureCache.get(key);
}

function sprinkleNoise(context, width, height, count, alpha, seed = 0) {
  for (let i = 0; i < count; i += 1) {
    const bright = pseudoRandom(seed + i * 1.31) > .5;
    context.fillStyle = bright ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 1.4})`;
    context.fillRect(pseudoRandom(seed + i * 2.17) * width, pseudoRandom(seed + i * 3.07) * height, 1 + pseudoRandom(seed + i) * 1.5, 1 + pseudoRandom(seed + i + .5) * 1.5);
  }
}

function brushedMetalTexture(tone = '#676d75', variant = 0) {
  return cachedTexture(`brushed:${tone}:${variant}`, () => {
    const [canvas, context] = makeCanvas(512, 512);
    context.fillStyle = tone; context.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2400; i += 1) {
      const y = pseudoRandom(i * 1.7 + variant) * 512;
      const x = pseudoRandom(i * .93 + variant + 9) * 512;
      const length = 30 + pseudoRandom(i + 3) * 320;
      const strength = pseudoRandom(i + 5);
      context.strokeStyle = strength > .5 ? `rgba(255,255,255,${.015 + strength * .055})` : `rgba(0,0,0,${.03 + strength * .12})`;
      context.lineWidth = .5 + pseudoRandom(i + 11) * 1.3;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + length, y + (pseudoRandom(i + 13) - .5) * 1.2); context.stroke();
    }
    sprinkleNoise(context, 512, 512, 5000, .035, variant * 17);
    return finishTexture(canvas);
  });
}

function noiseTexture() {
  return cachedTexture('noise', () => {
    const [canvas, context] = makeCanvas(256, 256);
    context.fillStyle = '#8c8c8c'; context.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 9000; i += 1) {
      const shade = 90 + Math.floor(pseudoRandom(i * 1.11) * 80);
      context.fillStyle = `rgb(${shade},${shade},${shade})`;
      context.fillRect(pseudoRandom(i * 2.3) * 256, pseudoRandom(i * 3.1) * 256, 1 + pseudoRandom(i) * 2, 1 + pseudoRandom(i + 1) * 2);
    }
    return finishTexture(canvas, { srgb: false, repeat: [3, 3] });
  });
}

function floorPlateTextures(variant = 'platform') {
  return cachedTexture(`floor:${variant}`, () => {
    const size = 1024; const cell = 128;
    const base = variant === 'hall' ? [18, 21, 25] : variant === 'centre' ? [33, 37, 43] : [29, 33, 38];
    const [canvas, context] = makeCanvas(size, size);
    const [roughCanvas, rough] = makeCanvas(size, size);
    rough.fillStyle = '#8f8f8f'; rough.fillRect(0, 0, size, size);
    for (let row = 0; row < size / cell; row += 1) {
      for (let col = 0; col < size / cell; col += 1) {
        const seed = row * 31 + col * 7 + (variant === 'hall' ? 500 : 0);
        const shade = (pseudoRandom(seed) - .5) * 14;
        context.fillStyle = `rgb(${base[0] + shade},${base[1] + shade},${base[2] + shade})`;
        context.fillRect(col * cell, row * cell, cell, cell);
        const roughShade = 120 + Math.floor(pseudoRandom(seed + 2) * 60);
        rough.fillStyle = `rgb(${roughShade},${roughShade},${roughShade})`;
        rough.fillRect(col * cell, row * cell, cell, cell);
        context.fillStyle = 'rgba(255,255,255,.06)'; context.fillRect(col * cell + 3, row * cell + 3, cell - 6, 1);
        context.fillRect(col * cell + 3, row * cell + 3, 1, cell - 6);
        context.fillStyle = 'rgba(0,0,0,.35)'; context.fillRect(col * cell + 3, row * cell + cell - 4, cell - 6, 1);
        context.fillRect(col * cell + cell - 4, row * cell + 3, 1, cell - 6);
        [[10, 10], [cell - 10, 10], [10, cell - 10], [cell - 10, cell - 10]].forEach(([rx, ry]) => {
          context.fillStyle = 'rgba(0,0,0,.45)'; context.beginPath(); context.arc(col * cell + rx + .8, row * cell + ry + .8, 3, 0, Math.PI * 2); context.fill();
          context.fillStyle = 'rgba(150,160,172,.85)'; context.beginPath(); context.arc(col * cell + rx, row * cell + ry, 2.4, 0, Math.PI * 2); context.fill();
          context.fillStyle = 'rgba(255,255,255,.35)'; context.beginPath(); context.arc(col * cell + rx - .7, row * cell + ry - .7, .9, 0, Math.PI * 2); context.fill();
        });
        if (pseudoRandom(seed + 9) > .84) {
          context.fillStyle = 'rgba(0,0,0,.5)';
          for (let slot = 0; slot < 6; slot += 1) context.fillRect(col * cell + 30, row * cell + 34 + slot * 10, cell - 60, 3);
        } else if (pseudoRandom(seed + 19) > .9) {
          context.strokeStyle = 'rgba(0,0,0,.55)'; context.lineWidth = 2;
          context.strokeRect(col * cell + 26, row * cell + 26, cell - 52, cell - 52);
          context.fillStyle = 'rgba(255,255,255,.05)'; context.fillRect(col * cell + 28, row * cell + 28, cell - 56, 2);
        }
      }
    }
    context.fillStyle = '#07090c';
    for (let line = 0; line <= size / cell; line += 1) {
      context.fillRect(line * cell - 1.5, 0, 3, size);
      context.fillRect(0, line * cell - 1.5, size, 3);
    }
    rough.fillStyle = '#d8d8d8';
    for (let line = 0; line <= size / cell; line += 1) { rough.fillRect(line * cell - 1.5, 0, 3, size); rough.fillRect(0, line * cell - 1.5, size, 3); }
    for (let i = 0; i < 260; i += 1) {
      context.strokeStyle = `rgba(${pseudoRandom(i) > .5 ? '255,255,255' : '0,0,0'},${.03 + pseudoRandom(i + 2) * .06})`;
      context.lineWidth = 1;
      const x = pseudoRandom(i * 1.9) * size; const y = pseudoRandom(i * 2.9) * size;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + (pseudoRandom(i + 4) - .5) * 90, y + (pseudoRandom(i + 5) - .5) * 90); context.stroke();
    }
    sprinkleNoise(context, size, size, 14000, .03, 77);
    return { map: finishTexture(canvas), rough: finishTexture(roughCanvas, { srgb: false }) };
  });
}

function ventTexture(variant = 'solid') {
  return cachedTexture(`vent:${variant}`, () => {
    const [canvas, context] = makeCanvas(256, 256);
    if (variant === 'solid') { context.fillStyle = '#1b2026'; context.fillRect(0, 0, 256, 256); }
    else context.clearRect(0, 0, 256, 256);
    for (let row = 0; row < 16; row += 1) {
      const y = row * 16;
      if (variant === 'solid') { context.fillStyle = '#05070a'; context.fillRect(8, y + 5, 240, 7); }
      context.fillStyle = '#2a3138'; context.fillRect(8, y + (variant === 'solid' ? 12 : 8), 240, variant === 'solid' ? 4 : 8);
      context.fillStyle = 'rgba(255,255,255,.08)'; context.fillRect(8, y + (variant === 'solid' ? 12 : 8), 240, 1);
    }
    context.fillStyle = '#242a31'; context.fillRect(0, 0, 8, 256); context.fillRect(248, 0, 8, 256);
    return finishTexture(canvas, { repeat: [1, 1] });
  });
}

function driveBayTextures(ledHex) {
  return cachedTexture(`drivebay:${ledHex}`, () => {
    const [canvas, context] = makeCanvas(512, 512);
    const [emissiveCanvas, emissive] = makeCanvas(512, 512);
    emissive.fillStyle = '#000'; emissive.fillRect(0, 0, 512, 512);
    const led = hexString(ledHex);
    const rows = 9; const rowHeight = 512 / rows;
    for (let row = 0; row < rows; row += 1) {
      const y = row * rowHeight;
      context.fillStyle = row % 2 ? '#1e2429' : '#20262c'; context.fillRect(0, y, 512, rowHeight);
      context.fillStyle = 'rgba(255,255,255,.07)'; context.fillRect(0, y + 1, 512, 1.5);
      context.fillStyle = 'rgba(0,0,0,.6)'; context.fillRect(0, y + rowHeight - 3, 512, 3);
      const sleds = row % 3 === 1 ? 2 : 4;
      for (let sled = 0; sled < sleds; sled += 1) {
        const width = (400 / sleds) - 8; const x = 22 + sled * (400 / sleds);
        context.fillStyle = '#12161a'; context.fillRect(x, y + 10, width, rowHeight - 20);
        context.fillStyle = '#2b3239'; context.fillRect(x + 4, y + 14, width - 8, rowHeight - 28);
        context.fillStyle = 'rgba(0,0,0,.5)';
        for (let slot = 0; slot < 4; slot += 1) context.fillRect(x + 10, y + 18 + slot * 8, width - 20, 2.5);
        context.fillStyle = '#3d454d'; context.fillRect(x + width - 14, y + 16, 6, rowHeight - 32);
        // lit sled window
        const lit = pseudoRandom(row * 11 + sled * 5 + ledHex % 37) > .42;
        if (lit) {
          context.fillStyle = led; context.globalAlpha = .55; context.fillRect(x + 8, y + 22, width - 24, 6); context.globalAlpha = 1;
          emissive.fillStyle = led; emissive.globalAlpha = .75; emissive.fillRect(x + 8, y + 22, width - 24, 6); emissive.globalAlpha = 1;
        }
      }
      for (let dot = 0; dot < 3; dot += 1) {
        const dx = 448 + dot * 18; const dy = y + rowHeight / 2;
        const lit = pseudoRandom(row * 5 + dot + ledHex % 97) > .35;
        const dotColor = dot === 2 ? '#4fb4ff' : led;
        context.fillStyle = lit ? dotColor : '#0d1114';
        context.beginPath(); context.arc(dx, dy, 3.6, 0, Math.PI * 2); context.fill();
        if (lit) { emissive.fillStyle = dotColor; emissive.beginPath(); emissive.arc(dx, dy, 3.2, 0, Math.PI * 2); emissive.fill(); }
      }
      const activity = 20 + pseudoRandom(row * 3 + ledHex % 13) * 90;
      context.fillStyle = '#0c1014'; context.fillRect(340, y + rowHeight / 2 - 3, 92, 6);
      context.fillStyle = 'rgba(79,180,255,.55)'; context.fillRect(340, y + rowHeight / 2 - 3, activity, 6);
      emissive.fillStyle = 'rgba(60,150,230,.65)'; emissive.fillRect(340, y + rowHeight / 2 - 2, activity, 4);
    }
    sprinkleNoise(context, 512, 512, 3000, .03, 5);
    return { map: finishTexture(canvas, { repeat: [1, 1] }), emissive: finishTexture(emissiveCanvas, { repeat: [1, 1] }) };
  });
}

function windowsTextures(accentHex) {
  return cachedTexture(`windows:${accentHex}`, () => {
    const [canvas, context] = makeCanvas(512, 512);
    const [emissiveCanvas, emissive] = makeCanvas(512, 512);
    emissive.fillStyle = '#000'; emissive.fillRect(0, 0, 512, 512);
    context.fillStyle = '#1a1f26'; context.fillRect(0, 0, 512, 512);
    context.fillStyle = 'rgba(255,255,255,.04)';
    for (let band = 0; band < 8; band += 1) context.fillRect(0, band * 64, 512, 2);
    const accent = new THREE.Color(accentHex);
    const warm = new THREE.Color(0xd8c9a6);
    const cols = 6; const rows = 6; const cellW = 512 / cols; const cellH = 440 / rows;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = col * cellW + 14; const y = 40 + row * cellH + 10;
        const lit = pseudoRandom(row * 13 + col * 7 + accentHex % 101);
        context.fillStyle = '#0a0d11'; context.fillRect(x - 2, y - 2, cellW - 24, cellH - 16);
        if (lit > .38) {
          const tint = warm.clone().lerp(accent, .35 + pseudoRandom(row + col) * .3);
          const brightness = .45 + pseudoRandom(row * 3 + col) * .5;
          context.fillStyle = `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},${brightness})`; context.fillRect(x, y, cellW - 28, cellH - 20);
          emissive.fillStyle = `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},${brightness * .9})`;
          emissive.fillRect(x, y, cellW - 28, cellH - 20);
          context.fillStyle = 'rgba(0,0,0,.28)';
          for (let blind = 0; blind < 4; blind += 1) context.fillRect(x, y + 4 + blind * 9, cellW - 28, 2);
        } else {
          context.fillStyle = '#11161c'; context.fillRect(x, y, cellW - 28, cellH - 20);
          context.fillStyle = 'rgba(120,150,180,.08)'; context.fillRect(x, y, cellW - 28, 6);
        }
        context.fillStyle = 'rgba(255,255,255,.05)'; context.fillRect(x, y, cellW - 28, 1);
      }
    }
    context.fillStyle = '#12161b'; context.fillRect(0, 0, 512, 34); context.fillRect(0, 490, 512, 22);
    sprinkleNoise(context, 512, 512, 2500, .03, 33);
    return { map: finishTexture(canvas), emissive: finishTexture(emissiveCanvas) };
  });
}

function warningTexture() {
  return cachedTexture('warning', () => {
    const [canvas, context] = makeCanvas(256, 64);
    context.fillStyle = '#e0b12b'; context.fillRect(0, 0, 256, 64);
    context.fillStyle = '#111';
    for (let stripe = -1; stripe < 9; stripe += 1) {
      context.beginPath(); context.moveTo(stripe * 32, 0); context.lineTo(stripe * 32 + 16, 0); context.lineTo(stripe * 32 + 48, 64); context.lineTo(stripe * 32 + 32, 64); context.closePath(); context.fill();
    }
    sprinkleNoise(context, 256, 64, 900, .06, 3);
    return finishTexture(canvas, { repeat: [4, 1] });
  });
}

function databaseRingTextures(accentHex) {
  return cachedTexture(`dbring:${accentHex}`, () => {
    const [canvas, context] = makeCanvas(1024, 256);
    const [emissiveCanvas, emissive] = makeCanvas(1024, 256);
    emissive.fillStyle = '#000'; emissive.fillRect(0, 0, 1024, 256);
    context.fillStyle = '#333941'; context.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 1400; i += 1) {
      context.strokeStyle = pseudoRandom(i) > .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.09)'; context.lineWidth = 1;
      const y = pseudoRandom(i * 1.3) * 256; context.beginPath(); context.moveTo(0, y); context.lineTo(1024, y + (pseudoRandom(i) - .5) * 2); context.stroke();
    }
    const segments = 16; const width = 1024 / segments;
    const accent = hexString(accentHex);
    for (let segment = 0; segment < segments; segment += 1) {
      const x = segment * width;
      context.fillStyle = '#0a0d10'; context.fillRect(x, 0, 4, 256);
      context.fillStyle = 'rgba(255,255,255,.06)'; context.fillRect(x + 4, 0, 1.5, 256);
      // tall lit window slot like the reference storage towers
      const lit = pseudoRandom(segment * 3 + accentHex % 17) > .25;
      context.fillStyle = '#0b0e11'; context.fillRect(x + 18, 60, width - 36, 130);
      if (lit) {
        context.fillStyle = accent; context.globalAlpha = .7; context.fillRect(x + 22, 66, width - 44, 118); context.globalAlpha = 1;
        emissive.fillStyle = accent; emissive.globalAlpha = .85; emissive.fillRect(x + 22, 66, width - 44, 118); emissive.globalAlpha = 1;
        context.fillStyle = 'rgba(0,0,0,.35)';
        for (let bar = 0; bar < 6; bar += 1) context.fillRect(x + 22, 76 + bar * 18, width - 44, 3);
      }
      context.fillStyle = '#2c333a'; context.fillRect(x + 14, 26, width - 28, 12);
      context.fillStyle = '#0b0e11'; context.fillRect(x + 18, 30, width - 36, 4);
      context.fillStyle = pseudoRandom(segment + 5) > .5 ? '#4fb4ff' : '#12161a';
      context.beginPath(); context.arc(x + width - 22, 222, 4, 0, Math.PI * 2); context.fill();
      if (pseudoRandom(segment + 5) > .5) { emissive.fillStyle = 'rgba(79,180,255,.9)'; emissive.beginPath(); emissive.arc(x + width - 22, 222, 3.4, 0, Math.PI * 2); emissive.fill(); }
    }
    context.fillStyle = 'rgba(0,0,0,.45)'; context.fillRect(0, 0, 1024, 8); context.fillRect(0, 248, 1024, 8);
    return { map: finishTexture(canvas, { repeat: [1, 1] }), emissive: finishTexture(emissiveCanvas, { repeat: [1, 1] }) };
  });
}

function textPlateTexture(text, accentHex, { width = 256, height = 64, size = 26, subtitle = '' } = {}) {
  return cachedTexture(`plate:${text}:${accentHex}:${subtitle}`, () => {
    const [canvas, context] = makeCanvas(width, height);
    context.fillStyle = '#0d1115'; context.fillRect(0, 0, width, height);
    context.strokeStyle = 'rgba(255,255,255,.14)'; context.lineWidth = 2; context.strokeRect(2, 2, width - 4, height - 4);
    context.fillStyle = hexString(accentHex); context.fillRect(8, 8, 5, height - 16);
    context.fillStyle = '#d9e4ee'; context.font = `700 ${size}px "Segoe UI", Arial, sans-serif`; context.textBaseline = 'middle'; context.textAlign = 'left';
    context.fillText(text, 22, subtitle ? height * .38 : height / 2);
    if (subtitle) { context.fillStyle = 'rgba(160,190,215,.85)'; context.font = `600 ${Math.round(size * .55)}px "Segoe UI", Arial`; context.fillText(subtitle, 22, height * .74); }
    return finishTexture(canvas, { repeat: [1, 1] });
  });
}

function screenTexture(key, accentHex) {
  return cachedTexture(`screen:${key}:${accentHex}`, () => {
    const [canvas, context] = makeCanvas(256, 128);
    context.fillStyle = '#04080c'; context.fillRect(0, 0, 256, 128);
    const accent = hexString(accentHex);
    context.strokeStyle = accent; context.globalAlpha = .55; context.lineWidth = 2; context.strokeRect(6, 6, 244, 116);
    context.globalAlpha = .9; context.fillStyle = accent; context.font = '700 20px "Segoe UI", Arial'; context.textBaseline = 'top';
    context.fillText(key.toUpperCase(), 16, 14);
    context.globalAlpha = .7;
    for (let bar = 0; bar < 10; bar += 1) { const h = 8 + pseudoRandom(bar * 3 + accentHex % 7) * 46; context.fillRect(16 + bar * 22, 110 - h, 12, h); }
    context.globalAlpha = .5;
    for (let line = 0; line < 4; line += 1) context.fillRect(150, 46 + line * 14, 40 + pseudoRandom(line + accentHex % 5) * 60, 4);
    context.globalAlpha = 1;
    return finishTexture(canvas, { repeat: [1, 1] });
  });
}

function helipadTexture() {
  return cachedTexture('helipad', () => {
    const [canvas, context] = makeCanvas(256, 256);
    context.fillStyle = '#20262c'; context.fillRect(0, 0, 256, 256);
    context.strokeStyle = 'rgba(230,238,245,.85)'; context.lineWidth = 8;
    context.beginPath(); context.arc(128, 128, 98, 0, Math.PI * 2); context.stroke();
    context.fillStyle = 'rgba(230,238,245,.9)'; context.font = '900 120px "Segoe UI", Arial'; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.fillText('H', 128, 134);
    sprinkleNoise(context, 256, 256, 1200, .04, 8);
    return finishTexture(canvas, { repeat: [1, 1] });
  });
}

function waterNormalTexture() {
  return cachedTexture('waterNormal', () => {
    const size = 256;
    const heights = new Float32Array(size * size);
    for (let i = 0; i < 90; i += 1) {
      const cx = pseudoRandom(i * 1.3) * size; const cy = pseudoRandom(i * 2.7) * size; const radius = 14 + pseudoRandom(i) * 40; const amp = (pseudoRandom(i + 3) - .5) * 2;
      for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
        const dx = Math.min(Math.abs(x - cx), size - Math.abs(x - cx)); const dy = Math.min(Math.abs(y - cy), size - Math.abs(y - cy));
        const d = Math.hypot(dx, dy) / radius;
        if (d < 1) heights[y * size + x] += amp * (1 - d * d) * (1 - d * d);
      }
    }
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) heights[y * size + x] += Math.sin(x * .35 + y * .12) * .18 + Math.sin(y * .29 - x * .07) * .14;
    const [canvas, context] = makeCanvas(size, size);
    const image = context.createImageData(size, size);
    for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
      const left = heights[y * size + ((x - 1 + size) % size)]; const right = heights[y * size + ((x + 1) % size)];
      const up = heights[((y - 1 + size) % size) * size + x]; const down = heights[((y + 1) % size) * size + x];
      const nx = (left - right) * .5; const ny = (up - down) * .5;
      const length = Math.hypot(nx, ny, 1);
      const offset = (y * size + x) * 4;
      image.data[offset] = Math.round((nx / length * .5 + .5) * 255);
      image.data[offset + 1] = Math.round((ny / length * .5 + .5) * 255);
      image.data[offset + 2] = Math.round((1 / length * .5 + .5) * 255);
      image.data[offset + 3] = 255;
    }
    context.putImageData(image, 0, 0);
    return finishTexture(canvas, { srgb: false, repeat: [48, 48] });
  });
}

function skyTexture() {
  return cachedTexture('sky', () => {
    const [canvas, context] = makeCanvas(1024, 512);
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#04070f'); gradient.addColorStop(.3, '#081222'); gradient.addColorStop(.46, '#142a45');
    gradient.addColorStop(.5, '#2a4869'); gradient.addColorStop(.53, '#1b3450'); gradient.addColorStop(.6, '#0b1728'); gradient.addColorStop(1, '#050a14');
    context.fillStyle = gradient; context.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 26; i += 1) {
      const x = pseudoRandom(i * 3.3) * 1024; const y = 150 + pseudoRandom(i * 1.9) * 90; const rx = 60 + pseudoRandom(i) * 160; const ry = 14 + pseudoRandom(i + 2) * 30;
      const cloud = context.createRadialGradient(x, y, 0, x, y, rx);
      cloud.addColorStop(0, `rgba(120,150,190,${.08 + pseudoRandom(i + 5) * .1})`); cloud.addColorStop(1, 'rgba(120,150,190,0)');
      context.save(); context.scale(1, ry / rx); context.fillStyle = cloud; context.beginPath(); context.arc(x, y * (rx / ry), rx, 0, Math.PI * 2); context.fill(); context.restore();
    }
    for (let i = 0; i < 320; i += 1) {
      context.fillStyle = `rgba(210,225,255,${.25 + pseudoRandom(i) * .6})`;
      context.fillRect(pseudoRandom(i * 2.1) * 1024, pseudoRandom(i * 4.7) * 190, 1 + pseudoRandom(i + 1) * 1.2, 1 + pseudoRandom(i + 2) * 1.2);
    }
    const texture = finishTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  });
}

function geo(key, maker) {
  if (!geometryCache.has(key)) {
    const geometry = maker();
    geometry.userData.shared = true;
    geometryCache.set(key, geometry);
  }
  return geometryCache.get(key);
}
const gBox = (w, h, d) => geo(`box:${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const gCyl = (rt, rb, h, seg, open = false) => geo(`cyl:${rt},${rb},${h},${seg},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open));
const gTorus = (r, t, rs, ts, arc) => geo(`torus:${r},${t},${rs},${ts},${arc || 0}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc || Math.PI * 2));
const gSphere = (r, ws, hs) => geo(`sphere:${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
const gPlane = (w, h) => geo(`plane:${w},${h}`, () => new THREE.PlaneGeometry(w, h));
const gCircle = (r, seg) => geo(`circle:${r},${seg}`, () => new THREE.CircleGeometry(r, seg));
const gRing = (ri, ro, seg) => geo(`ring:${ri},${ro},${seg}`, () => new THREE.RingGeometry(ri, ro, seg));
const gIco = (r, detail) => geo(`ico:${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
const gCone = (r, h, seg) => geo(`cone:${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg));

function buildCityEnvMap() {
  const faces = [];
  for (let face = 0; face < 6; face += 1) {
    const [canvas, context] = makeCanvas(128, 128);
    const gradient = context.createLinearGradient(0, 0, 0, 128);
    if (face === 2) { gradient.addColorStop(0, '#0a1424'); gradient.addColorStop(1, '#0c1a2c'); }
    else if (face === 3) { gradient.addColorStop(0, '#071019'); gradient.addColorStop(1, '#03060b'); }
    else { gradient.addColorStop(0, '#0a1424'); gradient.addColorStop(.46, '#1f3a5c'); gradient.addColorStop(.55, '#132741'); gradient.addColorStop(1, '#04070c'); }
    context.fillStyle = gradient; context.fillRect(0, 0, 128, 128);
    if (face !== 2 && face !== 3) {
      for (let light = 0; light < 46; light += 1) {
        const warm = pseudoRandom(face * 50 + light) > .7;
        context.fillStyle = warm ? 'rgba(255,200,140,.5)' : 'rgba(110,190,255,.5)';
        context.fillRect(pseudoRandom(face * 7 + light * 3) * 128, 54 + pseudoRandom(face + light * 5) * 26, 1 + pseudoRandom(light) * 3, 1);
      }
      context.fillStyle = 'rgba(180,215,255,.16)'; context.fillRect(0, 58, 128, 3);
    }
    faces.push(canvas);
  }
  const cube = new THREE.CubeTexture(faces);
  cube.colorSpace = THREE.SRGBColorSpace;
  cube.needsUpdate = true;
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromCubemap(cube).texture;
    environment.name = 'city-environment';
    pmrem.dispose();
    cube.dispose();
    environment.userData.shared = true;
    return environment;
  } catch (error) {
    console.warn('Environment map unavailable', error);
    return null;
  }
}

function ensureCityMaterials() {
  if (cityMats.ready) return cityMats;
  const std = (options) => { const material = new THREE.MeshStandardMaterial({ envMap: cityEnvMap, envMapIntensity: .6, ...options }); material.userData.shared = true; return material; };
  const phys = (options) => { const material = new THREE.MeshPhysicalMaterial({ envMap: cityEnvMap, envMapIntensity: .65, ...options }); material.userData.shared = true; return material; };
  const brushed = brushedMetalTexture('#484d54', 0);
  const brushedDark = brushedMetalTexture('#343941', 1);
  const noise = noiseTexture();
  const platformTex = floorPlateTextures('platform');
  const centreTex = floorPlateTextures('centre');
  cityMats.gunmetal = std({ color: 0x4a5058, map: brushed, metalness: .74, roughness: .46, roughnessMap: noise, envMapIntensity: .8 });
  cityMats.charcoal = std({ color: 0x30363d, map: brushedDark, metalness: .6, roughness: .58 });
  cityMats.darkMetal = std({ color: 0x22272d, metalness: .7, roughness: .52, roughnessMap: noise });
  cityMats.steelLight = std({ color: 0x8d959e, map: brushed, metalness: .92, roughness: .3 });
  cityMats.seam = std({ color: 0x0a0d11, metalness: .5, roughness: .82, envMapIntensity: .1 });
  cityMats.rubber = std({ color: 0x15191d, metalness: .15, roughness: .92, envMapIntensity: .1 });
  cityMats.ventSolid = std({ color: 0xffffff, map: ventTexture('solid'), metalness: .62, roughness: .66 });
  cityMats.ventAlpha = std({ color: 0xffffff, map: ventTexture('alpha'), transparent: true, alphaTest: .5, side: THREE.DoubleSide, metalness: .62, roughness: .66 });
  cityMats.warning = std({ color: 0xffffff, map: warningTexture(), metalness: .35, roughness: .62, envMapIntensity: .25 });
  cityMats.platformFloor = std({ color: 0x6d747c, map: tiledTexture(platformTex.map, 3, 3), roughnessMap: tiledTexture(platformTex.rough, 3, 3), metalness: .7, roughness: .5, envMapIntensity: .7 });
  cityMats.centreFloor = std({ color: 0x767e86, map: tiledTexture(centreTex.map, 2, 2), roughnessMap: tiledTexture(centreTex.rough, 2, 2), metalness: .72, roughness: .44, envMapIntensity: .75 });
  cityMats.islandWall = std({ color: 0x2f353b, map: tiledTexture(brushedDark, 12, 1), metalness: .78, roughness: .52 });
  cityMats.helipad = std({ color: 0xffffff, map: helipadTexture(), metalness: .4, roughness: .7 });
  cityMats.water = phys({ color: 0x0a1727, metalness: .3, roughness: .2, clearcoat: .9, clearcoatRoughness: .12, normalMap: waterNormalTexture(), normalScale: new THREE.Vector2(.22, .22), envMapIntensity: 1.1 });
  cityMats.mountain = std({ color: 0x2a3a52, metalness: .05, roughness: 1, flatShading: true, envMapIntensity: .2 });
  cityMats.mountainFar = std({ color: 0x2f4059, metalness: .05, roughness: 1, flatShading: true, envMapIntensity: .15 });
  cityMats.sky = new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false, toneMapped: false });
  cityMats.sky.userData.shared = true;
  cityMats.glass = phys({ color: 0x6d8496, metalness: .05, roughness: .08, transmission: .58, thickness: .6, ior: 1.45, clearcoat: 1, clearcoatRoughness: .06, transparent: true, opacity: .92, depthWrite: false });
  cityMats.glassFast = phys({ color: 0x556a7a, metalness: .1, roughness: .1, clearcoat: 1, clearcoatRoughness: .08, transparent: true, opacity: .34, depthWrite: false });
  cityMats.pyramidGlass = phys({ color: 0x33344a, metalness: .1, roughness: .12, transmission: .45, thickness: 2.5, ior: 1.4, clearcoat: 1, clearcoatRoughness: .05, transparent: true, opacity: .62, depthWrite: false, side: THREE.DoubleSide, emissive: 0x181334, emissiveIntensity: .25 });
  cityMats.pyramidGlassFast = phys({ color: 0x3a3b52, metalness: .1, roughness: .12, clearcoat: 1, transparent: true, opacity: .42, depthWrite: false, side: THREE.DoubleSide, emissive: 0x181334, emissiveIntensity: .3 });
  cityMats.cloud = std({ color: 0x98aabd, roughness: .97, metalness: 0, emissive: 0x2a4a6e, emissiveIntensity: .16, transparent: true, opacity: .98, envMapIntensity: .2 });
  cityMats.cloudShade = std({ color: 0x74879a, roughness: .98, metalness: 0, emissive: 0x1f3448, emissiveIntensity: .1, transparent: true, opacity: .98, envMapIntensity: .15 });
  cityMats.tree = std({ color: 0x163f2a, roughness: .95, metalness: 0, envMapIntensity: .1 });
  cityMats.frameLine = new THREE.LineBasicMaterial({ color: 0x9cabb9, transparent: true, opacity: .78 });
  cityMats.frameLine.userData.shared = true;
  cityMats.latticeLine = new THREE.LineBasicMaterial({ color: 0x8592a0, transparent: true, opacity: .85 });
  cityMats.latticeLine.userData.shared = true;
  cityMats.leaderLine = new THREE.LineBasicMaterial({ color: 0xd6e2ee, transparent: true, opacity: .55 });
  cityMats.leaderLine.userData.shared = true;
  cityMats.contactShadow = new THREE.MeshBasicMaterial({ color: 0x000205, transparent: true, opacity: .34, depthWrite: false });
  cityMats.contactShadow.userData.shared = true;
  cityMats.ready = true;
  return cityMats;
}

function ledMaterial(hex) {
  const key = `led:${hex}`;
  if (!cityMaterialCache.has(key)) { const material = new THREE.MeshBasicMaterial({ color: hex, toneMapped: false }); material.userData.shared = true; cityMaterialCache.set(key, material); }
  return cityMaterialCache.get(key);
}

function glowMaterial(hex, opacity) {
  const key = `glow:${hex}:${opacity}`;
  if (!cityMaterialCache.has(key)) {
    const material = new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function lineMaterial(hex, opacity = .8) {
  const key = `line:${hex}:${opacity}`;
  if (!cityMaterialCache.has(key)) { const material = new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity, toneMapped: false }); material.userData.shared = true; cityMaterialCache.set(key, material); }
  return cityMaterialCache.get(key);
}

function emissiveMetal(hex, intensity = .8) {
  const key = `emissiveMetal:${hex}:${intensity}`;
  if (!cityMaterialCache.has(key)) {
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(.28), emissive: hex, emissiveIntensity: intensity, metalness: .4, roughness: .45, envMap: cityEnvMap, envMapIntensity: .2 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function driveBayMaterial(ledHex, rows = 1) {
  const key = `drivebayMat:${ledHex}:${rows}`;
  if (!cityMaterialCache.has(key)) {
    const textures = driveBayTextures(ledHex);
    const material = new THREE.MeshStandardMaterial({ color: 0x848b92, map: tiledTexture(textures.map, 1, rows), emissiveMap: tiledTexture(textures.emissive, 1, rows), emissive: 0xffffff, emissiveIntensity: 1.05, metalness: .62, roughness: .5, envMap: cityEnvMap, envMapIntensity: .3 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function skylineMaterial() {
  const key = 'skylineMat';
  if (!cityMaterialCache.has(key)) {
    const textures = windowsTextures(0x3f7fb8);
    const material = new THREE.MeshStandardMaterial({ color: 0x4d5765, map: tiledTexture(textures.map, 2, 4), emissiveMap: tiledTexture(textures.emissive, 2, 4), emissive: 0xffffff, emissiveIntensity: .26, metalness: .4, roughness: .7, envMap: cityEnvMap, envMapIntensity: .15 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function windowsMaterial(accentHex, repeatX = 1, repeatY = 1) {
  const key = `windowsMat:${accentHex}:${repeatX}:${repeatY}`;
  if (!cityMaterialCache.has(key)) {
    const textures = windowsTextures(accentHex);
    const material = new THREE.MeshStandardMaterial({ color: 0x71787f, map: tiledTexture(textures.map, repeatX, repeatY), emissiveMap: tiledTexture(textures.emissive, repeatX, repeatY), emissive: 0xffffff, emissiveIntensity: .78, metalness: .5, roughness: .52, envMap: cityEnvMap, envMapIntensity: .35 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function databaseModuleMaterial(accentHex) {
  const key = `dbModuleMat:${accentHex}`;
  if (!cityMaterialCache.has(key)) {
    const textures = databaseRingTextures(accentHex);
    const material = new THREE.MeshStandardMaterial({ color: 0x6b7278, map: textures.map, emissiveMap: textures.emissive, emissive: 0xffffff, emissiveIntensity: .95, metalness: .8, roughness: .42, envMap: cityEnvMap, envMapIntensity: .5 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function plateMaterial(text, accentHex, options) {
  const key = `plateMat:${text}:${accentHex}:${options?.subtitle || ''}`;
  if (!cityMaterialCache.has(key)) {
    const texture = textPlateTexture(text, accentHex, options);
    const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: .35, metalness: .3, roughness: .6 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function screenMaterial(key, accentHex) {
  const cacheKey = `screenMat:${key}:${accentHex}`;
  if (!cityMaterialCache.has(cacheKey)) {
    const texture = screenTexture(key, accentHex);
    const material = new THREE.MeshStandardMaterial({ map: texture, emissiveMap: texture, emissive: 0xffffff, emissiveIntensity: .95, metalness: .1, roughness: .35 });
    material.userData.shared = true; cityMaterialCache.set(cacheKey, material);
  }
  return cityMaterialCache.get(cacheKey);
}

function statusMaterial(ctx, hex, intensity = .85) {
  const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).multiplyScalar(.3), emissive: hex, emissiveIntensity: intensity, metalness: .35, roughness: .42, envMap: cityEnvMap, envMapIntensity: .2 });
  material.userData.baseHex = hex;
  ctx.statusMaterials.push(material);
  return material;
}

function addMesh(parent, geometry, material, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, cast = false, receive = false, ownId = null } = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  if (ownId) own(mesh, ownId);
  parent.add(mesh);
  return mesh;
}

function makeStrut(parent, from, to, radius, material) {
  const direction = to.clone().sub(from);
  const length = direction.length();
  const mesh = new THREE.Mesh(gCyl(radius, radius, 1, 6), material);
  mesh.scale.set(1, length, 1);
  mesh.position.copy(from).lerp(to, .5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  parent.add(mesh);
  return mesh;
}

function makeInstances(geometry, material, transforms, { colors = null, cast = false, receive = false } = {}) {
  const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, transforms.length));
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(transform.x || 0, transform.y || 0, transform.z || 0);
    dummy.rotation.set(transform.rx || 0, transform.ry || 0, transform.rz || 0);
    dummy.scale.set(transform.sx || 1, transform.sy || 1, transform.sz || 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
    if (colors) mesh.setColorAt(index, new THREE.Color(colors[index % colors.length]));
  });
  if (!transforms.length) mesh.count = 0;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function animateObject(object, animation) {
  object.userData.anim = animation;
  cityAnimated.push(object);
  return object;
}

// ------------------------------------------------------------------ environment

function buildMountainRidge(radius, baseHeight, variance, seed, material, segments = 180) {
  const positions = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const jag = pseudoRandom(seed + i) * variance + Math.sin(i * .37 + seed) * variance * .35 + Math.sin(i * 1.7 + seed * 2) * variance * .2;
    const height = baseHeight + jag;
    const r = radius + (pseudoRandom(seed + i * 3) - .5) * 12;
    positions.push(Math.cos(angle) * r, -3, Math.sin(angle) * r, Math.cos(angle) * r, height, Math.sin(angle) * r);
  }
  const indices = [];
  for (let i = 0; i < segments; i += 1) {
    const a = i * 2; const b = a + 1; const c = a + 2; const d = a + 3;
    indices.push(a, c, b, b, c, d);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.material.side = THREE.DoubleSide;
  return mesh;
}

// ------------------------------------------------------------------ procedural surfaces (realism pass)

function panelSeamTexture(variant = 'wall') {
  return cachedTexture(`panelSeam:${variant}`, () => {
    const size = 512; const cell = variant === 'wall' ? 128 : 64;
    const base = variant === 'wall' ? [38, 43, 50] : [31, 36, 42];
    const [canvas, context] = makeCanvas(size, size);
    for (let row = 0; row < size / cell; row += 1) for (let col = 0; col < size / cell; col += 1) {
      const seed = row * 17 + col * 5 + (variant === 'wall' ? 0 : 300);
      const shade = (pseudoRandom(seed) - .5) * 16;
      context.fillStyle = `rgb(${base[0] + shade},${base[1] + shade},${base[2] + shade})`;
      context.fillRect(col * cell, row * cell, cell, cell);
      context.fillStyle = 'rgba(255,255,255,.07)'; context.fillRect(col * cell + 2, row * cell + 2, cell - 4, 1.5);
      context.fillStyle = 'rgba(0,0,0,.4)'; context.fillRect(col * cell + 2, row * cell + cell - 4, cell - 4, 2);
      context.fillStyle = 'rgba(0,0,0,.28)'; context.fillRect(col * cell + cell - 4, row * cell + 2, 2, cell - 4);
      [[7, 7], [cell - 7, 7], [7, cell - 7], [cell - 7, cell - 7]].forEach(([bx, by]) => {
        context.fillStyle = 'rgba(0,0,0,.5)'; context.beginPath(); context.arc(col * cell + bx + .6, row * cell + by + .6, 2.2, 0, Math.PI * 2); context.fill();
        context.fillStyle = 'rgba(190,200,212,.8)'; context.beginPath(); context.arc(col * cell + bx, row * cell + by, 1.7, 0, Math.PI * 2); context.fill();
      });
      if (pseudoRandom(seed + 3) > .8) { context.fillStyle = 'rgba(0,0,0,.35)'; for (let slot = 0; slot < 5; slot += 1) context.fillRect(col * cell + 18, row * cell + 22 + slot * 9, cell - 36, 2.5); }
    }
    context.fillStyle = '#12171f';
    for (let line = 0; line <= size / cell; line += 1) { context.fillRect(line * cell - 1, 0, 2, size); context.fillRect(0, line * cell - 1, size, 2); }
    sprinkleNoise(context, size, size, 6000, .03, 91);
    return finishTexture(canvas);
  });
}

function windowFloorTextures(accentHex, floors = 4, columns = 8) {
  return cachedTexture(`windowFloor:${accentHex}:${floors}:${columns}`, () => {
    const width = 512; const height = 512;
    const [canvas, context] = makeCanvas(width, height);
    const [emissiveCanvas, emissive] = makeCanvas(width, height);
    emissive.fillStyle = '#000'; emissive.fillRect(0, 0, width, height);
    context.fillStyle = '#1d232b'; context.fillRect(0, 0, width, height);
    const accent = new THREE.Color(accentHex); const warm = new THREE.Color(0xe6d9b8);
    const floorHeight = height / floors; const columnWidth = width / columns;
    for (let floor = 0; floor < floors; floor += 1) {
      const y = floor * floorHeight;
      // spandrel band (solid floor slab) and mullions
      context.fillStyle = '#1e2631'; context.fillRect(0, y, width, floorHeight * .22);
      context.fillStyle = 'rgba(255,255,255,.08)'; context.fillRect(0, y + floorHeight * .22, width, 2);
      for (let col = 0; col < columns; col += 1) {
        const x = col * columnWidth;
        const lit = pseudoRandom(floor * 31 + col * 7 + accentHex % 89);
        const gx = x + 6; const gy = y + floorHeight * .26; const gw = columnWidth - 12; const gh = floorHeight * .68;
        context.fillStyle = '#0f151d'; context.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
        if (lit > .45) {
          const tint = warm.clone().lerp(accent, .25 + pseudoRandom(floor + col) * .35);
          const brightness = .3 + pseudoRandom(floor * 3 + col) * .5;
          const css = `rgba(${Math.round(tint.r * 255)},${Math.round(tint.g * 255)},${Math.round(tint.b * 255)},`;
          context.fillStyle = `${css}${brightness})`; context.fillRect(gx, gy, gw, gh);
          emissive.fillStyle = `${css}${brightness * .85})`; emissive.fillRect(gx, gy, gw, gh);
          context.fillStyle = 'rgba(0,0,0,.25)'; for (let blind = 0; blind < 3; blind += 1) context.fillRect(gx, gy + 4 + blind * (gh / 3.2), gw, 2);
        } else {
          context.fillStyle = '#18202a'; context.fillRect(gx, gy, gw, gh);
          context.fillStyle = 'rgba(140,170,200,.1)'; context.fillRect(gx, gy, gw, gh * .3);
        }
        context.fillStyle = '#3a4452'; context.fillRect(x, y, 4, floorHeight);
      }
    }
    sprinkleNoise(context, width, height, 2500, .03, 44);
    return { map: finishTexture(canvas), emissive: finishTexture(emissiveCanvas) };
  });
}

function windowFloorMaterial(accentHex, repeatX = 1, repeatY = 1, floors = 4, columns = 8) {
  const key = `windowFloorMat:${accentHex}:${repeatX}:${repeatY}:${floors}:${columns}`;
  if (!cityMaterialCache.has(key)) {
    const textures = windowFloorTextures(accentHex, floors, columns);
    const material = new THREE.MeshPhysicalMaterial({ color: 0x717880, map: tiledTexture(textures.map, repeatX, repeatY), emissiveMap: tiledTexture(textures.emissive, repeatX, repeatY), emissive: 0xffffff, emissiveIntensity: .62, metalness: .25, roughness: .3, clearcoat: .6, clearcoatRoughness: .2, envMap: cityEnvMap, envMapIntensity: .7 });
    material.userData.shared = true; cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function ensureRealismMaterials() {
  ensureCityMaterials();
  if (cityMats.realism) return cityMats;
  const std = (options) => { const material = new THREE.MeshStandardMaterial({ envMap: cityEnvMap, envMapIntensity: .6, ...options }); material.userData.shared = true; return material; };
  const phys = (options) => { const material = new THREE.MeshPhysicalMaterial({ envMap: cityEnvMap, envMapIntensity: .7, ...options }); material.userData.shared = true; return material; };
  const seams = panelSeamTexture('wall');
  const seamsFine = panelSeamTexture('fine');
  // Dark painted metal (roughness .35-.55, metalness .7-.9) - never pure black
  cityMats.paintedMetal = std({ color: 0x454c56, map: tiledTexture(seams, 1, 1), metalness: .78, roughness: .46, roughnessMap: noiseTexture() });
  cityMats.paintedDark = std({ color: 0x2c323a, map: tiledTexture(seamsFine, 2, 2), metalness: .82, roughness: .42 });
  // Brushed structural steel (roughness .25-.4, metalness .85-1)
  cityMats.brushedSteel = std({ color: 0x8f979f, map: brushedMetalTexture('#4f545b', 2), metalness: .92, roughness: .32 });
  cityMats.steelDark = std({ color: 0x555d66, map: brushedMetalTexture('#3c4149', 3), metalness: .9, roughness: .36 });
  // Painted panels (roughness .55-.75, metalness .1-.3)
  cityMats.panel = std({ color: 0x333a45, map: tiledTexture(seamsFine, 1, 1), metalness: .2, roughness: .66 });
  cityMats.panelLight = std({ color: 0x4b535f, map: tiledTexture(seamsFine, 1, 1), metalness: .18, roughness: .62 });
  cityMats.concrete = std({ color: 0x333a45, metalness: .08, roughness: .82, roughnessMap: noiseTexture(), envMapIntensity: .25 });
  // Glass (roughness .05-.18, metalness 0), kept visible with moderate opacity
  cityMats.glassWall = phys({ color: 0x4d6070, metalness: 0, roughness: .1, transparent: true, opacity: .42, clearcoat: 1, clearcoatRoughness: .08, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  cityMats.glassDoor = phys({ color: 0x5a6d7d, metalness: 0, roughness: .06, transparent: true, opacity: .34, clearcoat: 1, clearcoatRoughness: .05, depthWrite: false, envMapIntensity: 1.2 });
  cityMats.glassAtrium = phys({ color: 0x3f5666, metalness: 0, roughness: .12, transparent: true, opacity: .5, clearcoat: 1, clearcoatRoughness: .1, depthWrite: false, side: THREE.DoubleSide, emissive: 0x16283a, emissiveIntensity: .2 });
  cityMats.aperture = phys({ color: 0xbfe6ff, metalness: 0, roughness: .05, transparent: true, opacity: .28, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide, emissive: 0x6fc3ff, emissiveIntensity: .55 });
  cityMats.pipe = std({ color: 0x9fa9b6, map: brushedMetalTexture('#474c53', 4), metalness: .88, roughness: .34 });
  cityMats.pipeDark = std({ color: 0x5d6775, metalness: .8, roughness: .45 });
  cityMats.fanBlade = std({ color: 0xb4bcc6, metalness: .85, roughness: .38 });
  cityMats.cloudDense = std({ color: 0xa7b6c6, roughness: .98, metalness: 0, emissive: 0x2f4f72, emissiveIntensity: .2, transparent: true, opacity: .96, envMapIntensity: .25 });
  cityMats.cloudWisp = std({ color: 0x8898ab, roughness: 1, metalness: 0, emissive: 0x24405e, emissiveIntensity: .14, transparent: true, opacity: .55, depthWrite: false, envMapIntensity: .15 });
  cityMats.deck = std({ color: 0x6a7178, map: tiledTexture(floorPlateTextures('platform').map, .085, .085), roughnessMap: tiledTexture(floorPlateTextures('platform').rough, .085, .085), metalness: .7, roughness: .5, envMapIntensity: .7 });
  cityMats.foundationSide = std({ color: 0x363c44, map: tiledTexture(seams, .25, .25), metalness: .8, roughness: .48 });
  cityMats.sparks = new THREE.PointsMaterial({ color: 0xd9c4ff, size: .28, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true, map: particleGlowTexture, toneMapped: false });
  cityMats.sparks.userData.shared = true;
  cityMats.realism = true;
  return cityMats;
}

function hexShape(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i += 1) {
    const angle = (i / 6) * Math.PI * 2;
    if (i === 0) shape.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    else shape.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  shape.closePath();
  return shape;
}

function gHexExtrude(radius, depth, bevel = .2) {
  return geo(`hexExtrude:${radius},${depth},${bevel}`, () => {
    const geometry = new THREE.ExtrudeGeometry(hexShape(radius), { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
}

function gHexRing(outer, inner, depth) {
  return geo(`hexRing:${outer},${inner},${depth}`, () => {
    const shape = hexShape(outer);
    const hole = new THREE.Path();
    for (let i = 0; i < 6; i += 1) { const angle = (i / 6) * Math.PI * 2; if (i === 0) hole.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner); else hole.lineTo(Math.cos(angle) * inner, Math.sin(angle) * inner); }
    hole.closePath();
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 1 });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  });
}

// ------------------------------------------------------------------ modular architectural helpers

function createMechanicalFoundation(parent, { radius, height = .7, sides = 6, accent = DEPARTMENT_NEUTRAL, y = 0, ring = true, lights = true }) {
  const geometry = sides === 6 ? gHexExtrude(radius, height, Math.min(.18, height * .3)) : gCyl(radius, radius * 1.05, height, 48);
  const base = addMesh(parent, geometry, cityMats.paintedDark, { y: sides === 6 ? y : y + height / 2, cast: true, receive: true });
  const top = y + height + (sides === 6 ? Math.min(.18, height * .3) : 0);
  addMesh(parent, sides === 6 ? gHexRing(radius * .98, radius * .82, .08) : gRing(radius * .82, radius * .98, 48), cityMats.brushedSteel, { y: top + .001, rx: sides === 6 ? 0 : -Math.PI / 2, receive: true });
  if (ring) addMesh(parent, gRing(radius * .74, radius * .8, 48), statusMaterial(parent.userData.ctx, accent, .7), { y: top + .012, rx: -Math.PI / 2 });
  if (lights) {
    const dots = [];
    for (let i = 0; i < 12; i += 1) { const angle = (i / 12) * Math.PI * 2 + Math.PI / 12; dots.push({ x: Math.cos(angle) * radius * .96, y: y + height * .55, z: Math.sin(angle) * radius * .96, ry: -angle }); }
    parent.add(makeInstances(gBox(.14, .06, .05), emissiveMetal(0xffb060, 1), dots));
  }
  return { mesh: base, top };
}

function createStructuralFrame(parent, { width, depth, height, x = 0, y = 0, z = 0, column = .22, beams = 3, material = null }) {
  const mat = material || cityMats.brushedSteel;
  const columns = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => columns.push({ x: x + sx * width / 2, y: y + height / 2, z: z + sz * depth / 2, sx: column, sy: height, sz: column }));
  parent.add(makeInstances(gBox(1, 1, 1), mat, columns, { cast: true }));
  const rails = [];
  for (let level = 1; level <= beams; level += 1) {
    const ly = y + (height / (beams + 1)) * level;
    rails.push({ x, y: ly, z: z + depth / 2, sx: width + column, sy: column * .6, sz: column * .6 });
    rails.push({ x, y: ly, z: z - depth / 2, sx: width + column, sy: column * .6, sz: column * .6 });
    rails.push({ x: x + width / 2, y: ly, z, sx: column * .6, sy: column * .6, sz: depth + column });
    rails.push({ x: x - width / 2, y: ly, z, sx: column * .6, sy: column * .6, sz: depth + column });
  }
  parent.add(makeInstances(gBox(1, 1, 1), mat, rails));
}

function createFacadePanels(parent, { width, depth, height, x = 0, y = 0, z = 0, rows = 3, material = null, inset = .1 }) {
  const mat = material || cityMats.panel;
  const panels = [];
  const rowHeight = height / rows;
  for (let row = 0; row < rows; row += 1) {
    const py = y + rowHeight * (row + .5);
    const shrink = .92 - (row % 2) * .04;
    panels.push({ x, y: py, z: z + depth / 2 - inset, sx: width * shrink, sy: rowHeight * .84, sz: .08 });
    panels.push({ x, y: py, z: z - depth / 2 + inset, sx: width * shrink, sy: rowHeight * .84, sz: .08 });
    panels.push({ x: x + width / 2 - inset, y: py, z, sx: .08, sy: rowHeight * .84, sz: depth * shrink });
    panels.push({ x: x - width / 2 + inset, y: py, z, sx: .08, sy: rowHeight * .84, sz: depth * shrink });
  }
  parent.add(makeInstances(gBox(1, 1, 1), mat, panels, { cast: true }));
}

function createRecessedWindows(parent, { width, depth, height, x = 0, y = 0, z = 0, floors = 6, perFace = 5, accent = 0x4f9fe0, lit = .6, seed = 0, inset = .16, faces = ['front', 'back', 'left', 'right'] }) {
  const litWindows = []; const darkWindows = []; const frames = [];
  const floorHeight = height / floors;
  const layouts = { front: ['x', z + depth / 2 - inset, width], back: ['x', z - depth / 2 + inset, width], left: ['z', x - width / 2 + inset, depth], right: ['z', x + width / 2 - inset, depth] };
  faces.forEach((face) => {
    const [axis, offset, span] = layouts[face];
    const count = Math.max(2, Math.round(perFace * span / width));
    for (let floor = 0; floor < floors; floor += 1) {
      for (let i = 0; i < count; i += 1) {
        const t = (i + .5) / count - .5;
        const px = axis === 'x' ? x + t * span * .88 : offset;
        const pz = axis === 'x' ? offset : z + t * span * .88;
        const w = (span * .88) / count * .72;
        const item = { x: px, y: y + floorHeight * (floor + .55), z: pz, sx: axis === 'x' ? w : .06, sy: floorHeight * .52, sz: axis === 'x' ? .06 : w };
        (pseudoRandom(seed + floor * 13 + i * 7 + face.length) < lit ? litWindows : darkWindows).push(item);
        frames.push({ ...item, sx: item.sx + (axis === 'x' ? .12 : .02), sy: item.sy + .12, sz: item.sz + (axis === 'x' ? .02 : .12) });
      }
    }
  });
  parent.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, frames));
  if (litWindows.length) parent.add(makeInstances(gBox(1, 1, 1), emissiveMetal(new THREE.Color(accent).lerp(new THREE.Color(0xf1e6c8), .45).getHex(), .55), litWindows));
  if (darkWindows.length) parent.add(makeInstances(gBox(1, 1, 1), cityMats.glassWall, darkWindows));
}

function createRoofEquipment(parent, { width, depth, y, x = 0, z = 0, seed = 0, accent = DEPARTMENT_NEUTRAL }) {
  const units = Math.max(2, Math.round((width + depth) / 3));
  for (let i = 0; i < units; i += 1) {
    const px = x + (pseudoRandom(seed + i * 3) - .5) * width * .7;
    const pz = z + (pseudoRandom(seed + i * 5) - .5) * depth * .7;
    const kind = pseudoRandom(seed + i * 7);
    if (kind < .4) createCoolingUnit(parent, { x: px, y, z: pz, size: .8 + pseudoRandom(seed + i) * .5, fans: 1 + Math.round(pseudoRandom(seed + i + 1)), spin: 5 + pseudoRandom(i) * 4 });
    else if (kind < .7) { addMesh(parent, gCyl(.35, .35, 1.1, 14), cityMats.pipe, { x: px, y: y + .55, z: pz, cast: true }); addMesh(parent, gCyl(.4, .4, .12, 14), cityMats.steelDark, { x: px, y: y + 1.12, z: pz }); }
    else { addMesh(parent, gBox(1.2, .55, .8), cityMats.paintedMetal, { x: px, y: y + .28, z: pz, ry: pseudoRandom(seed + i) * 1.2, cast: true }); addMesh(parent, gBox(.9, .08, .5), cityMats.ventSolid, { x: px, y: y + .58, z: pz }); }
  }
  addMesh(parent, gBox(width * .5, .2, .3), cityMats.pipeDark, { x, y: y + .12, z: z + depth * .3 });
  addMesh(parent, gCyl(.1, .1, width * .5, 8), cityMats.pipe, { x, y: y + .3, z: z + depth * .3, rz: Math.PI / 2 });
  addBlinker(parent, accent, [x + width * .3, y + .2, z - depth * .3], 1.8, .05);
}

function createVentArray(parent, { count, x, y, z, ry = 0, size = .5, spacing = .7, vertical = false }) {
  const vents = [];
  for (let i = 0; i < count; i += 1) {
    const offset = (i - (count - 1) / 2) * spacing;
    vents.push({ x: x + (vertical ? 0 : Math.cos(ry) * offset), y: y + (vertical ? offset : 0), z: z - (vertical ? 0 : Math.sin(ry) * offset), ry, sx: size, sy: size * .8, sz: .06 });
  }
  parent.add(makeInstances(gBox(1, 1, 1), cityMats.ventSolid, vents));
}

function createCoolingUnit(parent, { x, y, z, size = 1, fans = 2, spin = 6 }) {
  const housing = addMesh(parent, gBox(size * fans * 1.05, size * .55, size * 1.05), cityMats.paintedMetal, { x, y: y + size * .28, z, cast: true });
  for (let i = 0; i < fans; i += 1) {
    const fx = x + (i - (fans - 1) / 2) * size * 1.02;
    addMesh(parent, gCyl(size * .42, size * .42, .06, 20), cityMats.steelDark, { x: fx, y: y + size * .58, z });
    addMesh(parent, gTorus(size * .42, size * .03, 6, 24), cityMats.brushedSteel, { x: fx, y: y + size * .6, z, rx: Math.PI / 2 });
    const fan = new THREE.Group();
    fan.position.set(fx, y + size * .62, z);
    [0, 1.05, 2.1].forEach((angle) => addMesh(fan, gBox(size * .74, .018, size * .08), cityMats.fanBlade, { ry: angle }));
    addMesh(fan, gCyl(size * .08, size * .08, .05, 10), cityMats.steelDark, {});
    animateObject(fan, { spinY: spin + i });
    parent.add(fan);
  }
  addMesh(parent, gBox(size * fans * .9, .05, .35), cityMats.ventSolid, { x, y: y + size * .28, z: z + size * .53 });
  return housing;
}

function createSafetyRailings(parent, { width, depth, y, x = 0, z = 0, height = .55, inset = .15 }) {
  const posts = []; const rails = [];
  const perimeter = [[x - width / 2 + inset, z - depth / 2 + inset], [x + width / 2 - inset, z - depth / 2 + inset], [x + width / 2 - inset, z + depth / 2 - inset], [x - width / 2 + inset, z + depth / 2 - inset]];
  for (let side = 0; side < 4; side += 1) {
    const [ax, az] = perimeter[side]; const [bx, bz] = perimeter[(side + 1) % 4];
    const length = Math.hypot(bx - ax, bz - az); const count = Math.max(2, Math.round(length / 1.1));
    for (let i = 0; i <= count; i += 1) { const t = i / count; posts.push({ x: ax + (bx - ax) * t, y: y + height / 2, z: az + (bz - az) * t, sx: .05, sy: height, sz: .05 }); }
    const angle = Math.atan2(bz - az, bx - ax);
    rails.push({ x: (ax + bx) / 2, y: y + height, z: (az + bz) / 2, ry: -angle, sx: length, sy: .04, sz: .04 });
    rails.push({ x: (ax + bx) / 2, y: y + height * .55, z: (az + bz) / 2, ry: -angle, sx: length, sy: .03, sz: .03 });
  }
  parent.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, posts));
  parent.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, rails));
}

function createAntennaArray(parent, { x, y, z, count = 3, height = 2.5, seed = 0, dish = true, color = 0xff6a6a }) {
  for (let i = 0; i < count; i += 1) {
    const px = x + (pseudoRandom(seed + i * 2) - .5) * 1.6; const pz = z + (pseudoRandom(seed + i * 4) - .5) * 1.6;
    const h = height * (.7 + pseudoRandom(seed + i) * .6);
    addMesh(parent, gCyl(.04, .07, h, 6), cityMats.brushedSteel, { x: px, y: y + h / 2, z: pz, cast: true });
    addMesh(parent, gCyl(.12, .14, .16, 8), cityMats.steelDark, { x: px, y: y + .08, z: pz });
    if (i % 2 === 0) addBlinker(parent, color, [px, y + h + .1, pz], 1.1 + i * .3, .06);
    if (dish && i === 0) addMesh(parent, gCyl(.42, .05, .18, 14, true), cityMats.brushedSteel, { x: px + .3, y: y + h * .6, z: pz, rz: Math.PI / 2 - .5 });
  }
}

function createServiceLights(parent, positions, color = 0xffb060, size = .12) {
  if (positions.length) parent.add(makeInstances(gBox(size, size * .45, size * .45), emissiveMetal(color, 1), positions));
}

// Thin vertical edge lights carrying the owning department's identity colour. They are registered as
// status materials, so an active data operation can temporarily override them and then restore identity.
function addDepartmentEdgeLights(parent, ctx, { width, depth, height, x = 0, y = 0, z = 0, thickness = .06, intensity = .5 }) {
  const strips = [];
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => strips.push({ x: x + sx * width / 2, y: y + height / 2, z: z + sz * depth / 2, sx: thickness, sy: height, sz: thickness }));
  parent.add(makeInstances(gBox(1, 1, 1), statusMaterial(ctx, ctx.accent, intensity), strips));
}

// ------------------------------------------------------------------ islands

function buildIsland(island) {
  const { fast, ultra } = cityQuality();
  ensureRealismMaterials();
  const group = new THREE.Group();
  group.position.set(island.x, 0, island.z);
  group.rotation.y = Math.PI / 6;
  group.userData.ctx = { statusMaterials: [] };
  const r = island.r;
  const top = CITY.islandTop;
  // Thick extruded hexagonal foundation with bevelled edge, standing in the water
  addMesh(group, gHexExtrude(r * 1.04, 1.25, .22), cityMats.foundationSide, { y: top - 1.65, cast: true, receive: true });
  addMesh(group, gHexRing(r * 1.06, r * .9, .18), cityMats.paintedDark, { y: top - .38, receive: true });
  addMesh(group, gHexExtrude(r * .98, .3, .05), cityMats.deck, { y: top - .35, receive: true });
  if (island.citadel) addMesh(group, gHexExtrude(r * .84, .45, .08), cityMats.paintedDark, { y: top, receive: true, cast: true });
  // Layered edge bands and recessed technical panels on the sides
  const bands = []; const panels = []; const amber = []; const stubs = [];
  for (let side = 0; side < 6; side += 1) {
    const angle = (side / 6) * Math.PI * 2 + Math.PI / 6;
    const mx = Math.cos(angle) * r * .866; const mz = Math.sin(angle) * r * .866;
    const ry = -angle + Math.PI / 2;
    bands.push({ x: mx * 1.03, y: top - .95, z: mz * 1.03, ry, sx: r * .95, sy: .16, sz: .24 });
    bands.push({ x: mx * 1.0, y: top + .04, z: mz * 1.0, ry, sx: r * .96, sy: .18, sz: .3 });
    for (let k = -1; k <= 1; k += 2) {
      const along = k * r * .3;
      panels.push({ x: mx * 1.045 - Math.sin(angle) * along, y: top - 1.15, z: mz * 1.045 + Math.cos(angle) * along, ry, sx: r * .24, sy: .55, sz: .1 });
      amber.push({ x: mx * 1.06 - Math.sin(angle) * along * .55, y: top - .62, z: mz * 1.06 + Math.cos(angle) * along * .55, ry });
    }
    // bridge attachment points on the side faces
    stubs.push({ x: mx * 1.02, y: top - .55, z: mz * 1.02, ry, sx: 1.4, sy: .6, sz: .8 });
  }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, bands));
  group.add(makeInstances(gBox(1, 1, 1), cityMats.panel, panels));
  group.add(makeInstances(gBox(1, 1, 1), cityMats.paintedMetal, stubs, { cast: true }));
  createServiceLights(group, amber, 0xffb060, .16);
  // Edge lights and bollards on the deck rim
  const lights = []; const bollards = [];
  for (let side = 0; side < 6; side += 1) {
    const a0 = (side / 6) * Math.PI * 2; const a1 = ((side + 1) / 6) * Math.PI * 2;
    const count = Math.max(3, Math.round(r / 1.6));
    for (let i = 0; i < count; i += 1) { const t = (i + .5) / count; lights.push({ x: (Math.cos(a0) * (1 - t) + Math.cos(a1) * t) * r * .95, y: top + .08, z: (Math.sin(a0) * (1 - t) + Math.sin(a1) * t) * r * .95, ry: -((side / 6) * Math.PI * 2 + Math.PI / 6) + Math.PI / 2 }); }
    bollards.push({ x: Math.cos(a0) * r * .92, y: top + .28, z: Math.sin(a0) * r * .92 });
  }
  group.add(makeInstances(gBox(.4, .05, .1), emissiveMetal(island.accent, .95), lights));
  group.add(makeInstances(gCyl(.14, .18, .55, 8), cityMats.brushedSteel, bollards));
  group.add(makeInstances(gSphere(.06, 6, 5), ledMaterial(island.accent), bollards.map((b) => ({ ...b, y: top + .6 }))));
  // Inner circular equipment rail with posts, cable channels, and the raised mounting base
  const railRadius = r * .62;
  addMesh(group, gTorus(railRadius, .05, 6, 64), cityMats.brushedSteel, { y: top + .5, rx: Math.PI / 2 });
  addMesh(group, gTorus(railRadius, .035, 6, 64), cityMats.brushedSteel, { y: top + .28, rx: Math.PI / 2 });
  const posts = [];
  for (let i = 0; i < 18; i += 1) { const angle = (i / 18) * Math.PI * 2; posts.push({ x: Math.cos(angle) * railRadius, y: top + .26, z: Math.sin(angle) * railRadius, sx: .05, sy: .52, sz: .05 }); }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, posts));
  const channels = []; const channelStrips = [];
  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2 + .35;
    const length = r * .78 - (island.citadel ? r * .5 : r * .32);
    const mid = (island.citadel ? r * .5 : r * .32) + length / 2;
    channels.push({ x: Math.cos(angle) * mid, y: top + .012, z: Math.sin(angle) * mid, ry: -angle, sx: length, sy: .04, sz: .55 });
    channelStrips.push({ x: Math.cos(angle) * mid, y: top + .036, z: Math.sin(angle) * mid, ry: -angle, sx: length - .3, sy: .01, sz: .06 });
  }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.rubber, channels));
  if (!fast) group.add(makeInstances(gBox(1, 1, 1), emissiveMetal(island.accent, .4), channelStrips));
  if (!island.citadel) {
    addMesh(group, gHexExtrude(r * .3, .22, .04), cityMats.paintedDark, { y: top, cast: true, receive: true });
  }
  // Service equipment, planting, spill light on the water
  const equipment = [];
  const equipmentCount = island.minor ? 2 : fast ? 3 : 5;
  for (let i = 0; i < equipmentCount; i += 1) {
    const angle = pseudoRandom(island.x * 3 + i * 7) * Math.PI * 2; const radius = r * (island.citadel ? .9 : .8);
    equipment.push({ x: Math.cos(angle) * radius, y: top + .4, z: Math.sin(angle) * radius, ry: angle, sx: .8 + pseudoRandom(i) * .8, sy: .5 + pseudoRandom(i + 2) * .7, sz: .6 + pseudoRandom(i + 4) * .6 });
  }
  group.add(makeInstances(gBox(1.2, 1, 1), cityMats.paintedMetal, equipment, { cast: true }));
  if (!fast && !island.minor) {
    const trees = [];
    for (let i = 0; i < (ultra ? 7 : 4); i += 1) { const angle = pseudoRandom(island.z * 5 + i * 11) * Math.PI * 2; trees.push({ x: Math.cos(angle) * r * .84, y: top + .55, z: Math.sin(angle) * r * .84, sx: .8 + pseudoRandom(i) * .5, sy: .8 + pseudoRandom(i + 1) * .7, sz: .8 + pseudoRandom(i) * .5 }); }
    group.add(makeInstances(gCone(.5, 1.3, 7), cityMats.tree, trees, { cast: true }));
  }
  const spill = addMesh(group, gCircle(1, 40), glowMaterial(island.accent, .05), { y: .03, rx: -Math.PI / 2, sx: r * 1.7, sy: r * 1.7 });
  spill.userData.cityBackdrop = true;
  const streak = new THREE.Mesh(gPlane(1, 1), new THREE.MeshBasicMaterial({ map: particleGlowTexture, color: island.accent, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  streak.rotation.set(-Math.PI / 2, 0, 0);
  streak.position.set(0, .025, r * .4);
  streak.scale.set(r * 1.2, r * 3.6, 1);
  group.add(streak);
  group.userData.island = island;
  cityEnvironmentLayer.add(group);
  return group;
}

// ------------------------------------------------------------------ light rig

function buildCityLightRig(parent) {
  const { fast, ultra } = cityQuality();
  const hemi = new THREE.HemisphereLight(0x7f9fcf, 0x0b1018, .75);
  const moon = new THREE.DirectionalLight(0xbcd2f2, 1.55);
  moon.position.set(60, 95, -70);
  moon.target.position.set(4, 0, -14);
  moon.castShadow = !fast;
  const shadowSize = fast ? 512 : ultra ? 4096 : 2048;
  moon.shadow.mapSize.set(shadowSize, shadowSize);
  moon.shadow.camera.left = -80; moon.shadow.camera.right = 80; moon.shadow.camera.top = 80; moon.shadow.camera.bottom = -80;
  moon.shadow.camera.near = 20; moon.shadow.camera.far = 320;
  moon.shadow.bias = -.0004;
  moon.shadow.normalBias = .06;
  moon.shadow.radius = ultra ? 3 : 4;
  const fill = new THREE.SpotLight(0x93b6e8, 900, 320, Math.PI * .34, .75, 1.4);
  fill.position.set(-80, 70, 110);
  fill.target.position.set(0, 4, -10);
  const rim = new THREE.SpotLight(0x5cc9ff, 520, 300, Math.PI * .3, .8, 1.5);
  rim.position.set(110, 46, 70);
  rim.target.position.set(6, 6, -14);
  const backFill = new THREE.DirectionalLight(0x3b5680, .32);
  backFill.position.set(-40, 30, -120);
  backFill.target.position.set(4, 4, -14);
  parent.add(hemi, moon, moon.target, fill, fill.target, rim, rim.target, backFill, backFill.target);
  cityKeyLight = moon;
}

// ------------------------------------------------------------------ primary structures

function buildDevelopmentTower(group, ctx) {
  const accent = ctx.accent;
  const { fast } = ctx.quality;
  group.userData.ctx = ctx;
  const foundation = createMechanicalFoundation(group, { radius: 6.2, height: .55, accent });
  // Wider podium with recessed panels, entrance canopy and technical annexes
  const podium = { width: 9.4, depth: 8.2, height: 2.6, y: foundation.top };
  addMesh(group, gBox(podium.width, podium.height, podium.depth), cityMats.paintedMetal, { y: podium.y + podium.height / 2, cast: true, receive: true, ownId: ctx.id });
  createFacadePanels(group, { ...podium, rows: 2, material: cityMats.panel });
  createRecessedWindows(group, { width: podium.width, depth: podium.depth, height: podium.height, y: podium.y + .2, floors: 1, perFace: 7, accent, lit: .7, seed: 3 });
  createStructuralFrame(group, { width: podium.width + .1, depth: podium.depth + .1, height: podium.height, y: podium.y, column: .3, beams: 1 });
  addMesh(group, gBox(podium.width + .5, .22, podium.depth + .5), cityMats.steelDark, { y: podium.y + podium.height + .1, cast: true });
  createSafetyRailings(group, { width: podium.width + .3, depth: podium.depth + .3, y: podium.y + podium.height + .2 });
  // entrance canopy on the front (+z) face
  addMesh(group, gBox(3.2, .16, 1.6), cityMats.brushedSteel, { y: podium.y + 1.7, z: podium.depth / 2 + .8, cast: true });
  [-1.3, 1.3].forEach((x) => addMesh(group, gCyl(.07, .07, 1.7, 8), cityMats.brushedSteel, { x, y: podium.y + .85, z: podium.depth / 2 + 1.5 }));
  addMesh(group, gBox(2.2, 1.5, .1), cityMats.glassDoor, { y: podium.y + .78, z: podium.depth / 2 + .02 });
  addMesh(group, gPlane(1.4, .3), plateMaterial('DEV TOWER', accent), { y: podium.y + 1.95, z: podium.depth / 2 + .03 });
  [[-4.2, 3.4, .9], [4.4, -3.2, 1.1], [3.8, 3.6, .7]].forEach(([x, z, s]) => { addMesh(group, gBox(1.6 * s, 1.1 * s, 1.2 * s), cityMats.paintedMetal, { x, y: foundation.top + .55 * s, z, cast: true }); createVentArray(group, { count: 2, x, y: foundation.top + .55 * s, z: z + .61 * s, size: .45 * s, spacing: .55 }); });
  // Main tower: 14 floors of glass-and-steel with exterior columns and a central atrium
  const tower = { width: 6.4, depth: 5.6, floors: 14, floorHeight: 1.18 };
  const towerY = podium.y + podium.height + .22;
  const towerHeight = tower.floors * tower.floorHeight;
  const facade = windowFloorMaterial(accent, 1, tower.floors / 2, 2, 7);
  const body = new THREE.Mesh(gBox(1, 1, 1), [facade, facade, cityMats.steelDark, cityMats.steelDark, facade, facade]);
  body.position.set(0, towerY + towerHeight / 2, 0);
  body.scale.set(tower.width, towerHeight, tower.depth);
  body.castShadow = true; body.receiveShadow = true;
  own(body, ctx.id);
  group.add(body);
  createStructuralFrame(group, { width: tower.width + .16, depth: tower.depth + .16, height: towerHeight, y: towerY, column: .26, beams: fast ? 3 : 6 });
  addDepartmentEdgeLights(group, ctx, { width: tower.width + .3, depth: tower.depth + .3, height: towerHeight - .4, y: towerY + .2 });
  // intermediate exterior columns on the long faces
  const columns = [];
  [-1, 1].forEach((side) => [-1, 0, 1].forEach((k) => columns.push({ x: k * tower.width / 3, y: towerY + towerHeight / 2, z: side * (tower.depth / 2 + .1), sx: .14, sy: towerHeight, sz: .14 })));
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, columns, { cast: true }));
  // floor slabs read as horizontal bands
  const slabs = [];
  for (let floor = 1; floor < tower.floors; floor += 1) slabs.push({ x: 0, y: towerY + floor * tower.floorHeight, z: 0, sx: tower.width + .22, sy: .09, sz: tower.depth + .22 });
  group.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, slabs));
  // central glass atrium spine on the front face
  addMesh(group, gBox(1.9, towerHeight - .4, .9), cityMats.glassAtrium, { y: towerY + towerHeight / 2, z: tower.depth / 2 + .35 });
  const atriumLights = [];
  for (let floor = 0; floor < tower.floors; floor += 1) if (floor % 2 === 0) atriumLights.push({ x: 0, y: towerY + floor * tower.floorHeight + .6, z: tower.depth / 2 + .35, sx: 1.4, sy: .05, sz: .3 });
  group.add(makeInstances(gBox(1, 1, 1), emissiveMetal(departmentTint(ctx.id, .2), .7), atriumLights));
  // roof: crown, machinery, railings, antennas
  const roofY = towerY + towerHeight;
  addMesh(group, gBox(tower.width + .4, .3, tower.depth + .4), cityMats.paintedMetal, { y: roofY + .15, cast: true });
  addMesh(group, gBox(tower.width * .55, 1.3, tower.depth * .5), cityMats.paintedDark, { y: roofY + .95, x: -.8, cast: true });
  createVentArray(group, { count: 3, x: -.8, y: roofY + .95, z: tower.depth * .25 + .05, size: .6, spacing: .75 });
  createRoofEquipment(group, { width: tower.width, depth: tower.depth, y: roofY + .3, x: 1.4, z: -.4, seed: 21, accent });
  createSafetyRailings(group, { width: tower.width + .2, depth: tower.depth + .2, y: roofY + .3 });
  createAntennaArray(group, { x: 1.6, y: roofY + 1.6, z: 1.2, count: 3, height: 3.2, seed: 8 });
  addMesh(group, gBox(tower.width + .46, .06, .05), statusMaterial(ctx, accent, .8), { y: roofY + .34, z: tower.depth / 2 + .23 });
  addMesh(group, gBox(tower.width + .46, .06, .05), statusMaterial(ctx, accent, .8), { y: roofY + .34, z: -tower.depth / 2 - .23 });
  // helipad on the island beside the tower
  addMesh(group, gCyl(1.8, 1.9, .16, 32), cityMats.helipad, { x: -5.3, y: foundation.top - .5, z: 4.4, receive: true });
  addMesh(group, gRing(1.85, 2.0, 32), statusMaterial(ctx, accent, .7), { x: -5.3, y: foundation.top - .41, z: 4.4, rx: -Math.PI / 2 });
  addLocalLight(group, ctx, accent, 16, 22, [0, 8, 6]);
}

function buildGatewayRing(group, ctx) {
  const seg = Math.max(ctx.seg, 48);
  const { fast } = ctx.quality;
  group.userData.ctx = ctx;
  const outerRadius = 4.5; const innerRadius = 3.3; const centreY = 5.6;
  const yaw = Math.atan2(API_AXIS.x, API_AXIS.z);
  // Heavy reinforced base: foundation, stepped plinth, anchor blocks and conduit connectors
  const foundation = createMechanicalFoundation(group, { radius: 5.2, height: .5, accent: ctx.accent });
  addMesh(group, gHexExtrude(3.6, .5, .08), cityMats.paintedMetal, { y: foundation.top, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gBox(6.4, .9, 3.2), cityMats.paintedDark, { y: foundation.top + .95, ry: yaw, cast: true });
  createFacadePanels(group, { width: 6.4, depth: 3.2, height: .9, y: foundation.top + .5, rows: 1, material: cityMats.panel });
  [-1, 1].forEach((side) => {
    const anchor = new THREE.Group();
    anchor.rotation.y = yaw;
    addMesh(anchor, gBox(1.6, 1.4, 2.6), cityMats.paintedMetal, { x: side * (outerRadius + .4), y: foundation.top + 1.2, cast: true });
    addMesh(anchor, gBox(.7, centreY - 1.4, 1.1), cityMats.brushedSteel, { x: side * (outerRadius + .55), y: foundation.top + 1.9 + (centreY - 1.4) / 2 - .5, cast: true });
    addMesh(anchor, gBox(1.2, .32, 1.4), cityMats.steelDark, { x: side * (outerRadius + .55), y: centreY + .2, cast: true });
    [-.7, .7].forEach((z) => addMesh(anchor, gCyl(.12, .12, 2.2, 8), cityMats.pipe, { x: side * (outerRadius + .2), y: foundation.top + 1.1, z, rz: Math.PI / 2 }));
    group.add(anchor);
  });
  // Two concentric vertical rings of thick segmented construction with mechanical joints
  const ring = new THREE.Group();
  ring.position.y = centreY;
  ring.rotation.y = yaw;
  addMesh(ring, gTorus(outerRadius, .78, 18, seg), cityMats.paintedMetal, { cast: true, ownId: ctx.id });
  addMesh(ring, gTorus(outerRadius, .5, 10, seg), cityMats.steelDark, { z: .72 });
  addMesh(ring, gTorus(outerRadius, .5, 10, seg), cityMats.steelDark, { z: -.72 });
  const segments = []; const joints = []; const bolts = [];
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    segments.push({ x: Math.cos(angle) * outerRadius, y: Math.sin(angle) * outerRadius, z: 0, rz: angle, sx: .55, sy: 1.95, sz: 1.9 });
    joints.push({ x: Math.cos(angle + Math.PI / 16) * outerRadius, y: Math.sin(angle + Math.PI / 16) * outerRadius, z: 0, rz: angle + Math.PI / 16, sx: .3, sy: 1.5, sz: 2.2 });
    [.95, -.95].forEach((z) => bolts.push({ x: Math.cos(angle) * (outerRadius + .35), y: Math.sin(angle) * (outerRadius + .35), z, rz: angle }));
  }
  ring.add(makeInstances(gBox(1, 1, 1), cityMats.panelLight, segments, { cast: true }));
  ring.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, joints, { cast: true }));
  ring.add(makeInstances(gCyl(.12, .12, .14, 8), cityMats.steelDark, bolts.map((b) => ({ ...b, rx: Math.PI / 2 }))));
  addMesh(ring, gTorus(outerRadius + .82, .05, 6, seg), statusMaterial(ctx, ctx.accent, .75), {});
  // rotating inner ring with its own segment plates and blue-white aperture light
  const inner = new THREE.Group();
  addMesh(inner, gTorus(innerRadius, .42, 14, seg), cityMats.steelDark, { cast: true });
  const innerPlates = [];
  for (let i = 0; i < 12; i += 1) { const angle = (i / 12) * Math.PI * 2; innerPlates.push({ x: Math.cos(angle) * innerRadius, y: Math.sin(angle) * innerRadius, z: 0, rz: angle, sx: .5, sy: 1.1, sz: 1.1 }); }
  inner.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, innerPlates, { cast: true }));
  addMesh(inner, gTorus(innerRadius - .5, .07, 8, seg), statusMaterial(ctx, 0x8fd4ff, 1.4), {});
  animateObject(inner, { spinZ: .35 });
  ring.add(inner);
  // central transparent energy aperture: particles pass straight through it
  addMesh(ring, gCircle(innerRadius - .6, seg), cityMats.aperture, {});
  addMesh(ring, gCircle(innerRadius - 1.6, seg), glowMaterial(0xbfe6ff, .12), {});
  addMesh(ring, gTorus(innerRadius - .62, .04, 6, seg), statusMaterial(ctx, 0xbfe6ff, 1.3), {});
  group.add(ring);
  // Side control modules with screens and conduit connectors
  [[-2.9, 2.4, -.35], [2.9, 2.4, .35]].forEach(([x, z, tilt]) => {
    const module = new THREE.Group();
    module.position.set(Math.cos(yaw) * x + Math.sin(yaw) * z, foundation.top, -Math.sin(yaw) * x + Math.cos(yaw) * z);
    module.rotation.y = yaw + tilt;
    addMesh(module, gBox(1.9, 1.5, 1.3), cityMats.paintedMetal, { y: .75, cast: true });
    createFacadePanels(module, { width: 1.9, depth: 1.3, height: 1.5, rows: 1, material: cityMats.panel });
    addMesh(module, gPlane(1.1, .5), screenMaterial('gateway', ctx.accent), { y: .95, z: .67 });
    createVentArray(module, { count: 3, x: -.96, y: .7, z: 0, ry: Math.PI / 2, size: .32, spacing: .38 });
    [-.5, 0, .5].forEach((cx) => addMesh(module, gCyl(.08, .08, .5, 8), cityMats.rubber, { x: cx, y: .2, z: .8, rx: Math.PI / 2 }));
    addBlinker(module, ctx.accent, [.7, 1.38, .66], 2.2, .04);
    group.add(module);
  });
  addLocalLight(group, ctx, 0x8fd4ff, fast ? 28 : 46, 26, [0, centreY, 0], true);
}

function buildServerTower(group, ctx) {
  // Dimensions only. LED and trim colour come from the owning department; `beacon` is the red anomaly
  // marker for the predicted bottleneck and deliberately stays on the data legend.
  const specs = {
    'Server-01': { width: 3.8, depth: 3.4, height: 10.4, beacon: false },
    'Server-02': { width: 4.0, depth: 3.6, height: 13.2, beacon: true },
    'Server-03': { width: 3.4, depth: 3.2, height: 9.2, beacon: false },
    'Server-04': { width: 6.6, depth: 4.6, height: 5.6, beacon: false },
  };
  const spec = { width: 3.4, depth: 3.2, height: 8, beacon: false, ...(specs[ctx.id] || {}), led: ctx.accent, secondary: departmentTint(ctx.id, .3) };
  group.userData.ctx = ctx;
  const { fast } = ctx.quality;
  const units = Math.max(4, Math.round(spec.height / 1.05));
  // Raised mechanical platform and chamfered cabinet body
  const foundation = createMechanicalFoundation(group, { radius: Math.max(spec.width, spec.depth) * .78, height: .42, accent: spec.led, lights: false });
  const y0 = foundation.top;
  addMesh(group, gBox(spec.width + .6, .28, spec.depth + .6), cityMats.steelDark, { y: y0 + .14, cast: true, receive: true });
  const body = addMesh(group, gBox(spec.width, spec.height, spec.depth), cityMats.paintedMetal, { y: y0 + .28 + spec.height / 2, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gBox(spec.width - .5, spec.height + .16, spec.depth - .5), cityMats.paintedDark, { y: y0 + .28 + spec.height / 2 });
  createStructuralFrame(group, { width: spec.width + .06, depth: spec.depth + .06, height: spec.height, y: y0 + .28, column: .24, beams: fast ? 2 : 4 });
  createFacadePanels(group, { width: spec.width, depth: spec.depth, height: spec.height, y: y0 + .28, rows: Math.max(2, Math.round(spec.height / 3)), material: cityMats.panel, inset: .06 });
  // Front glass door over recessed rack units with status LEDs
  const front = spec.depth / 2;
  addMesh(group, gPlane(spec.width - .7, spec.height - .5), driveBayMaterial(spec.led, units), { y: y0 + .28 + spec.height / 2, z: front + .02, ownId: ctx.id });
  addMesh(group, gBox(spec.width - .5, spec.height - .3, .06), cityMats.glassDoor, { y: y0 + .28 + spec.height / 2, z: front + .12 });
  addMesh(group, gBox(spec.width - .4, .12, .14), cityMats.brushedSteel, { y: y0 + .28 + spec.height - .1, z: front + .1 });
  addMesh(group, gBox(spec.width - .4, .12, .14), cityMats.brushedSteel, { y: y0 + .38, z: front + .1 });
  addMesh(group, gBox(.08, spec.height - .5, .12), cityMats.brushedSteel, { x: spec.width / 2 - .3, y: y0 + .28 + spec.height / 2, z: front + .1 });
  addMesh(group, gBox(.06, .9, .08), cityMats.steelDark, { x: -spec.width / 2 + .45, y: y0 + spec.height * .45, z: front + .2 });
  const leds = []; const amberLeds = [];
  for (let unit = 0; unit < units; unit += 1) {
    const uy = y0 + .55 + unit * ((spec.height - .6) / units);
    leds.push({ x: spec.width / 2 - .5, y: uy, z: front + .08 });
    if (spec.beacon && unit % 4 === 1) amberLeds.push({ x: spec.width / 2 - .64, y: uy, z: front + .08 });
    else leds.push({ x: spec.width / 2 - .64, y: uy, z: front + .08 });
  }
  group.add(makeInstances(gBox(.05, .05, .03), ledMaterial(spec.led), leds));
  if (amberLeds.length) group.add(makeInstances(gBox(.05, .05, .03), ledMaterial(0xffb347), amberLeds));
  addBlinker(group, spec.secondary, [-spec.width / 2 + .3, y0 + spec.height + .1, front + .1], 2.6, .04);
  // Side access panels, ventilation holes, cooling fans, power distribution and cable channels
  [1, -1].forEach((side) => {
    const sx = side * (spec.width / 2 + .02);
    createVentArray(group, { count: Math.max(2, Math.round(spec.height / 2.6)), x: sx, y: y0 + spec.height * .55, z: 0, ry: Math.PI / 2, size: Math.min(1.1, spec.depth * .32), spacing: 1.25, vertical: true });
    addMesh(group, gBox(.08, spec.height * .32, spec.depth * .42), cityMats.panelLight, { x: sx + side * .02, y: y0 + spec.height * .22, z: -spec.depth * .2, cast: true });
    addMesh(group, gBox(.06, .25, .08), cityMats.brushedSteel, { x: sx + side * .08, y: y0 + spec.height * .22, z: -spec.depth * .2 });
  });
  const fanCount = Math.max(1, Math.round(spec.width / 2.2));
  for (let i = 0; i < fanCount; i += 1) {
    const fx = (i - (fanCount - 1) / 2) * 1.6;
    addMesh(group, gCyl(.55, .55, .1, 18), cityMats.steelDark, { x: fx, y: y0 + spec.height * .42, z: -front - .04, rx: Math.PI / 2 });
    const fan = new THREE.Group();
    fan.position.set(fx, y0 + spec.height * .42, -front - .12);
    [0, 1.05, 2.1].forEach((angle) => addMesh(fan, gBox(.95, .1, .02), cityMats.fanBlade, { rz: angle }));
    animateObject(fan, { spinZ: 6 + i });
    group.add(fan);
    addMesh(group, gTorus(.56, .035, 6, 24), cityMats.brushedSteel, { x: fx, y: y0 + spec.height * .42, z: -front - .12 });
  }
  addMesh(group, gBox(spec.width * .7, .6, .3), cityMats.panelLight, { y: y0 + 1.0, z: -front - .16, cast: true });
  [-.45, -.15, .15, .45].forEach((x) => addMesh(group, gCyl(.06, .06, .5, 8), cityMats.rubber, { x: x * spec.width * .7, y: y0 + .72, z: -front - .3, rx: Math.PI / 2 }));
  addMesh(group, gBox(.32, spec.height - 1.6, .22), cityMats.rubber, { x: spec.width * .28, y: y0 + spec.height / 2 + .3, z: -front - .12 });
  addMesh(group, gBox(.32, spec.height - 1.6, .22), cityMats.rubber, { x: -spec.width * .28, y: y0 + spec.height / 2 + .3, z: -front - .12 });
  // Roof: cooling unit, machinery, railings, status strip, beacon
  const roofY = y0 + .28 + spec.height;
  addMesh(group, gBox(spec.width + .34, .24, spec.depth + .34), cityMats.steelDark, { y: roofY + .12, cast: true });
  createCoolingUnit(group, { x: -spec.width * .12, y: roofY + .24, z: 0, size: Math.min(1.3, spec.depth * .32), fans: spec.width > 5 ? 3 : 2, spin: 7 });
  addMesh(group, gBox(.9, .7, .8), cityMats.paintedMetal, { x: spec.width * .3, y: roofY + .59, z: spec.depth * .22, cast: true });
  createSafetyRailings(group, { width: spec.width + .3, depth: spec.depth + .3, y: roofY + .24, height: .45 });
  addMesh(group, gBox(spec.width + .4, .05, .04), statusMaterial(ctx, spec.led, .8), { y: roofY + .27, z: front + .2 });
  addMesh(group, gPlane(1.1, .28), plateMaterial(ctx.id.replace('Server-', 'SRV-'), spec.led), { y: y0 + spec.height * .93, z: front + .2 });
  if (spec.beacon) {
    addMesh(group, gCyl(.16, .2, .5, 10), cityMats.steelDark, { x: -spec.width * .3, y: roofY + .5, z: -spec.depth * .2 });
    const beacon = addMesh(group, gSphere(.22, 12, 10), statusMaterial(ctx, COLORS.red, 2.2), { x: -spec.width * .3, y: roofY + .95, z: -spec.depth * .2 });
    animateObject(beacon, { emissive: { base: 2.2, speed: 4.2, phase: 0 } });
    addMesh(group, gTorus(.28, .03, 6, 20), cityMats.brushedSteel, { x: -spec.width * .3, y: roofY + .95, z: -spec.depth * .2, rx: Math.PI / 2 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => addMesh(group, gBox(.07, spec.height * .9, .07), statusMaterial(ctx, COLORS.red, 1.1), { x: sx * (spec.width / 2 + .13), y: y0 + .28 + spec.height / 2, z: sz * (spec.depth / 2 + .13) }));
    const ring = addMesh(group, gTorus(Math.max(spec.width, spec.depth) * .78 * .74, .08, 8, 64), statusMaterial(ctx, COLORS.red, 1.3), { y: foundation.top + .05, rx: Math.PI / 2 });
    animateObject(ring, { emissive: { base: 1.3, speed: 2.6, phase: 1 } });
    addLocalLight(group, ctx, COLORS.red, 30, 24, [0, spec.height * .6, 0], true);
  } else {
    addDepartmentEdgeLights(group, ctx, { width: spec.width + .22, depth: spec.depth + .22, height: spec.height - .3, y: y0 + .4 });
    addLocalLight(group, ctx, spec.secondary, ctx.id === 'Server-04' ? 8 : 10, 14, [0, spec.height * .55, front + 1.2]);
  }
  return body;
}

function buildCitadelFillers() {
  const citadel = ISLANDS.find((island) => island.citadel);
  if (!citadel) return;
  const { fast, ultra } = cityQuality();
  ensureRealismMaterials();
  const fillers = new THREE.Group();
  fillers.position.set(citadel.x, CITY.islandTop, citadel.z);
  const ctx = { statusMaterials: [], id: 'citadel', quality: cityQuality() };
  fillers.userData.ctx = ctx;
  const count = fast ? 5 : ultra ? 11 : 8;
  let placed = 0;
  for (let candidate = 0; candidate < 80 && placed < count; candidate += 1) {
    const angle = pseudoRandom(candidate * 2.9) * Math.PI * 2;
    const radius = 3 + pseudoRandom(candidate * 1.3) * (citadel.r - 5.5);
    const x = Math.cos(angle) * radius; const z = Math.sin(angle) * radius;
    const clear = citadel.nodes.every((id) => {
      const config = NODE_CONFIG.find((node) => node.id === id);
      return Math.hypot(config.position[0] - citadel.x - x, config.position[2] - citadel.z - z) > (id === 'Server-04' ? 5.6 : 4.4);
    });
    if (!clear) continue;
    const height = 2.6 + pseudoRandom(candidate + 7) * 5.5;
    const width = 1.7 + pseudoRandom(candidate + 3) * 1.4;
    const led = pseudoRandom(candidate + 11) > .75 ? mixHex(DEPARTMENT_NEUTRAL, 0xffffff, .3) : DEPARTMENT_NEUTRAL;
    const cabinet = new THREE.Group();
    cabinet.position.set(x, .45, z);
    cabinet.rotation.y = pseudoRandom(candidate) * .6 - .3;
    addMesh(cabinet, gBox(width + .3, .2, width + .3), cityMats.steelDark, { y: .1, cast: true });
    addMesh(cabinet, gBox(width, height, width), cityMats.paintedMetal, { y: .2 + height / 2, cast: true, receive: true });
    createStructuralFrame(cabinet, { width: width + .04, depth: width + .04, height, y: .2, column: .14, beams: 2 });
    addMesh(cabinet, gPlane(width - .4, height - .4), driveBayMaterial(led, Math.max(2, Math.round(height / 1.1))), { y: .2 + height / 2, z: width / 2 + .01 });
    addMesh(cabinet, gBox(width + .2, .16, width + .2), cityMats.steelDark, { y: height + .28, cast: true });
    if (pseudoRandom(candidate + 5) > .5) createCoolingUnit(cabinet, { x: 0, y: height + .36, z: 0, size: Math.min(.8, width * .4), fans: 1, spin: 5 });
    fillers.add(cabinet);
    placed += 1;
  }
  // conduit manifolds and cable trays crossing the citadel deck
  addMesh(fillers, gCyl(.3, .3, citadel.r * 1.3, 10), cityMats.pipe, { y: .75, z: 5.5, rz: Math.PI / 2 });
  addMesh(fillers, gCyl(.3, .3, citadel.r * 1.1, 10), cityMats.pipe, { y: .75, x: -6, rx: Math.PI / 2 });
  const supports = [];
  for (let i = -5; i <= 5; i += 1) supports.push({ x: i * 2.6, y: .55, z: 5.5, sx: .12, sy: .5, sz: .5 });
  fillers.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, supports));
  createSafetyRailings(fillers, { width: citadel.r * 1.5, depth: citadel.r * 1.5, y: .45, height: .5, inset: .4 });
  nodeLayer.add(fillers);
}

function buildDatabaseVault(group, ctx) {
  const seg = Math.max(ctx.seg, 48);
  const { fast } = ctx.quality;
  group.userData.ctx = ctx;
  const radius = 3.6; const floors = 5; const floorHeight = 1.9;
  const foundation = createMechanicalFoundation(group, { radius: 5.4, height: .6, accent: ctx.accent });
  const y0 = foundation.top;
  addMesh(group, gCyl(radius + .7, radius + .95, .5, seg), cityMats.paintedDark, { y: y0 + .25, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gTorus(radius + .8, .08, 8, seg), cityMats.brushedSteel, { y: y0 + .5, rx: Math.PI / 2 });
  // Thick cylindrical vault body with stacked mechanical floors and recessed window strips
  const bodyHeight = floors * floorHeight;
  const body = addMesh(group, gCyl(radius, radius, bodyHeight, seg), cityMats.paintedMetal, { y: y0 + .5 + bodyHeight / 2, cast: true, receive: true, ownId: ctx.id });
  const bandMaterial = databaseModuleMaterial(ctx.accent);
  for (let floor = 0; floor < floors; floor += 1) {
    const fy = y0 + .5 + floor * floorHeight;
    addMesh(group, gCyl(radius + .22, radius + .22, .22, seg), cityMats.steelDark, { y: fy + .11, cast: true });
    addMesh(group, gCyl(radius + .06, radius + .06, floorHeight * .58, seg), bandMaterial, { y: fy + .22 + floorHeight * .29, cast: true, receive: true, ownId: ctx.id });
    addMesh(group, gTorus(radius + .12, .025, 6, seg), statusMaterial(ctx, ctx.accent, .8), { y: fy + .2, rx: Math.PI / 2 });
    addMesh(group, gCyl(radius + .18, radius + .18, .1, seg), cityMats.glassWall, { y: fy + floorHeight * .82 });
  }
  // Vertical support columns and external cooling pipes with brackets
  const columns = []; const brackets = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    columns.push({ x: Math.cos(angle) * (radius + .34), y: y0 + .5 + bodyHeight / 2, z: Math.sin(angle) * (radius + .34), ry: -angle, sx: .26, sy: bodyHeight + .2, sz: .34 });
    for (let floor = 1; floor < floors; floor += 1) brackets.push({ x: Math.cos(angle) * (radius + .32), y: y0 + .5 + floor * floorHeight, z: Math.sin(angle) * (radius + .32), ry: -angle, sx: .5, sy: .12, sz: .6 });
  }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, columns, { cast: true }));
  group.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, brackets));
  [.35, 1.2, 4.6].forEach((angle, index) => {
    const px = Math.cos(angle) * (radius + .62); const pz = Math.sin(angle) * (radius + .62);
    addMesh(group, gCyl(.16, .16, bodyHeight - .4, 10), cityMats.pipe, { x: px, y: y0 + .6 + bodyHeight / 2, z: pz, cast: true });
    addMesh(group, gTorus(.2, .06, 6, 14), cityMats.steelDark, { x: px, y: y0 + 1.4 + index, z: pz, rx: Math.PI / 2 });
    addMesh(group, gTorus(.2, .06, 6, 14), cityMats.steelDark, { x: px, y: y0 + bodyHeight - 1 - index, z: pz, rx: Math.PI / 2 });
    addMesh(group, gCyl(.16, .16, .9, 10), cityMats.pipe, { x: px * .92, y: y0 + .5, z: pz * .92, rz: Math.PI / 2, ry: -angle });
  });
  // Side maintenance modules with screens, vents and doors
  [2.2, 3.9].forEach((angle, index) => {
    const module = new THREE.Group();
    module.position.set(Math.cos(angle) * (radius + 1.1), y0 + .5, Math.sin(angle) * (radius + 1.1));
    module.rotation.y = -angle + Math.PI / 2;
    addMesh(module, gBox(2.2, 1.7, 1.4), cityMats.paintedMetal, { y: .85, cast: true });
    createFacadePanels(module, { width: 2.2, depth: 1.4, height: 1.7, rows: 1, material: cityMats.panel });
    addMesh(module, gPlane(.9, .42), screenMaterial(ctx.id.replace('Database-', 'DB '), ctx.accent), { y: 1.05, z: .72 });
    addMesh(module, gBox(.55, 1.1, .08), cityMats.glassDoor, { x: -.7, y: .6, z: .72 });
    createVentArray(module, { count: 2, x: 1.12, y: .9, z: 0, ry: Math.PI / 2, size: .45, spacing: .55 });
    addBlinker(module, ctx.accent, [.9, 1.5, .72], 1.9 + index, .04);
    group.add(module);
  });
  // Roof: rotating disk, ventilation units, railings, antenna
  const roofY = y0 + .5 + bodyHeight;
  addMesh(group, gCyl(radius + .3, radius + .3, .3, seg), cityMats.steelDark, { y: roofY + .15, cast: true });
  addMesh(group, gCyl(radius * .55, radius * .6, .35, seg), cityMats.paintedDark, { y: roofY + .47, cast: true });
  const disk = new THREE.Group();
  disk.position.y = roofY + .78;
  addMesh(disk, gCyl(radius * .5, radius * .5, .18, seg), cityMats.brushedSteel, { cast: true });
  addMesh(disk, gTorus(radius * .5, .04, 6, seg), statusMaterial(ctx, ctx.accent, 1), { y: .1, rx: Math.PI / 2 });
  const spokes = [];
  for (let i = 0; i < 6; i += 1) spokes.push({ x: 0, y: .16, z: 0, ry: (i / 6) * Math.PI, sx: radius, sy: .06, sz: .14 });
  disk.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, spokes));
  animateObject(disk, { spinY: .22 });
  group.add(disk);
  addMesh(group, gCyl(.45, .5, .5, 12), cityMats.steelDark, { y: roofY + 1.2 });
  addBlinker(group, ctx.accent, [0, roofY + 1.55, 0], 1.4, .07);
  const roofRing = [];
  for (let i = 0; i < (fast ? 4 : 8); i += 1) { const angle = (i / (fast ? 4 : 8)) * Math.PI * 2 + .2; roofRing.push({ angle }); }
  roofRing.forEach(({ angle }, index) => {
    const px = Math.cos(angle) * (radius * .78); const pz = Math.sin(angle) * (radius * .78);
    if (index % 2) createCoolingUnit(group, { x: px, y: roofY + .3, z: pz, size: .7, fans: 1, spin: 5 + index });
    else { addMesh(group, gBox(.9, .5, .7), cityMats.paintedMetal, { x: px, y: roofY + .55, z: pz, ry: -angle, cast: true }); addMesh(group, gBox(.7, .06, .5), cityMats.ventSolid, { x: px, y: roofY + .82, z: pz, ry: -angle }); }
  });
  const posts = []; const rails = [];
  for (let i = 0; i < 24; i += 1) { const angle = (i / 24) * Math.PI * 2; posts.push({ x: Math.cos(angle) * (radius + .1), y: roofY + .52, z: Math.sin(angle) * (radius + .1), sx: .05, sy: .45, sz: .05 }); }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, posts));
  addMesh(group, gTorus(radius + .1, .025, 6, seg), cityMats.brushedSteel, { y: roofY + .74, rx: Math.PI / 2 });
  addLocalLight(group, ctx, ctx.accent, 14, 16, [0, y0 + 3, radius + 1.4]);
}

function buildAiPyramid(group, ctx) {
  const { fast, ultra } = ctx.quality;
  group.userData.ctx = ctx;
  const size = 7.4; const height = 9.8;
  const foundation = createMechanicalFoundation(group, { radius: 6.6, height: .6, accent: ctx.accent });
  const y0 = foundation.top;
  addMesh(group, gHexExtrude(5.6, .35, .06), cityMats.paintedMetal, { y: y0, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gRing(4.6, 4.9, 64), statusMaterial(ctx, ctx.accent, 1.0), { y: y0 + .42, rx: -Math.PI / 2 });
  addMesh(group, gRing(3.3, 3.42, 64), statusMaterial(ctx, ctx.accent, .7), { y: y0 + .42, rx: -Math.PI / 2 });
  addMesh(group, gCircle(4.5, 48), glowMaterial(ctx.accent, .06), { y: y0 + .43, rx: -Math.PI / 2 });
  // Large glass pyramid on a steel edge frame with a hex apex cap
  const apexY = y0 + .4 + height;
  const pyramid = addMesh(group, gCone(size, height, 4), fast ? cityMats.pyramidGlassFast : cityMats.pyramidGlass, { y: y0 + .4 + height / 2, ry: Math.PI / 4, ownId: ctx.id });
  pyramid.castShadow = false;
  const corners = [0, 1, 2, 3].map((i) => { const angle = Math.PI / 4 + (i / 4) * Math.PI * 2; return new THREE.Vector3(Math.cos(angle) * size, y0 + .4, Math.sin(angle) * size); });
  corners.forEach((corner, i) => {
    makeStrut(group, corner, new THREE.Vector3(0, apexY, 0), .11, cityMats.brushedSteel);
    makeStrut(group, corner, corners[(i + 1) % 4], .1, cityMats.brushedSteel);
    for (let level = 1; level <= 3; level += 1) {
      const t = level / 4;
      const a = corner.clone().lerp(new THREE.Vector3(0, apexY, 0), t); const b = corners[(i + 1) % 4].clone().lerp(new THREE.Vector3(0, apexY, 0), t);
      makeStrut(group, a, b, .04, cityMats.steelDark);
    }
    addMesh(group, gBox(.6, .5, .6), cityMats.steelDark, { x: corner.x * .97, y: y0 + .62, z: corner.z * .97, cast: true });
  });
  addMesh(group, gCyl(.35, .5, .6, 8), cityMats.brushedSteel, { y: apexY + .2 });
  addBlinker(group, 0xd9c2ff, [0, apexY + .6, 0], 1.6, .08);
  // Floating purple energy core with rotating rings and internal sparks
  const coreY = y0 + .4 + height * .42;
  const wire = new THREE.LineSegments(geo('edges:ico:2.1,1', () => new THREE.EdgesGeometry(gIco(2.1, 1), 1)), lineMaterial(0xb98cff, .9));
  wire.position.y = coreY; animateObject(wire, { spinY: .35, spinX: .12 }); group.add(wire);
  const core = addMesh(group, gIco(.9, 2), statusMaterial(ctx, COLORS.purple, 1.9), { y: coreY });
  animateObject(core, { spinY: .6, spinX: .3, bob: { base: coreY, amp: .14, speed: 1.1, phase: 0 } });
  addMesh(group, gSphere(.5, 16, 12), ledMaterial(0xd8bfff), { y: coreY });
  addMesh(group, gSphere(1, 16, 12), glowMaterial(COLORS.purple, .14), { y: coreY, sx: 1.7, sy: 1.7, sz: 1.7 });
  [[.5, .2, 1.6], [1.3, -.6, 2.0], [2.1, .9, 2.5]].forEach(([rx, rz, radius], index) => {
    const ring = new THREE.Group();
    ring.position.y = coreY; ring.rotation.set(rx, 0, rz);
    addMesh(ring, gTorus(radius, .05, 8, 64), cityMats.brushedSteel, {});
    addMesh(ring, gTorus(radius, .02, 6, 64), statusMaterial(ctx, COLORS.purple, 1.2), { y: .06 });
    const plates = [];
    for (let i = 0; i < 6; i += 1) { const angle = (i / 6) * Math.PI * 2; plates.push({ x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius, ry: -angle, sx: .25, sy: .18, sz: .4 }); }
    ring.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, plates));
    animateObject(ring, { spinY: index % 2 ? -.5 - index * .15 : .45 + index * .1 });
    group.add(ring);
  });
  if (!fast) {
    const sparkCount = ultra ? 260 : 150;
    const positions = new Float32Array(sparkCount * 3);
    for (let i = 0; i < sparkCount; i += 1) {
      const radius = .6 + pseudoRandom(i * 1.7) * 3.2; const theta = pseudoRandom(i * 2.3) * Math.PI * 2; const phi = Math.acos(2 * pseudoRandom(i * 3.1) - 1);
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * radius; positions[i * 3 + 1] = coreY + Math.cos(phi) * radius * .8; positions[i * 3 + 2] = Math.sin(theta) * Math.sin(phi) * radius;
    }
    const sparkGeometry = new THREE.BufferGeometry();
    sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sparks = new THREE.Points(sparkGeometry, cityMats.sparks);
    animateObject(sparks, { spinY: .4 });
    group.add(sparks);
  }
  // Central pedestal and mechanical equipment around the pyramid base
  addMesh(group, gCyl(.6, .9, height * .36, 10), cityMats.steelDark, { y: y0 + .4 + height * .18 });
  addMesh(group, gTorus(.9, .08, 8, 24), cityMats.brushedSteel, { y: y0 + .55, rx: Math.PI / 2 });
  [0.6, 1.9, 3.4, 4.9].forEach((angle, index) => {
    const px = Math.cos(angle) * 6.0; const pz = Math.sin(angle) * 6.0;
    const module = new THREE.Group();
    module.position.set(px, y0, pz); module.rotation.y = -angle + Math.PI / 2;
    if (index % 2 === 0) { addMesh(module, gBox(1.6, 1.1, 1.1), cityMats.paintedMetal, { y: .55, cast: true }); createFacadePanels(module, { width: 1.6, depth: 1.1, height: 1.1, rows: 1, material: cityMats.panel }); addMesh(module, gPlane(.7, .32), screenMaterial('ai core', COLORS.purple), { y: .68, z: .56 }); }
    else createCoolingUnit(module, { x: 0, y: 0, z: 0, size: 1.0, fans: 2, spin: 5 + index });
    group.add(module);
    // cooling and power conduits entering the facility
    addMesh(group, gCyl(.13, .13, 6.0 - size * .55, 8), cityMats.pipe, { x: px * .62, y: y0 + .35, z: pz * .62, rz: Math.PI / 2, ry: -angle });
  });
  addLocalLight(group, ctx, COLORS.purple, fast ? 26 : 40, 30, [0, coreY, 0], true);
  addLocalLight(group, ctx, 0x8a5cff, 12, 16, [0, y0 + 1, 0]);
}

function buildCloudFacility(group, ctx) {
  const seg = Math.max(ctx.seg, 48);
  const { fast, ultra } = ctx.quality;
  group.userData.ctx = ctx;
  const radius = 6.2; const floors = 3; const floorHeight = 1.5;
  const foundation = createMechanicalFoundation(group, { radius: 7.4, height: .55, accent: ctx.accent });
  const y0 = foundation.top;
  addMesh(group, gCyl(radius + .6, radius + .9, .4, seg), cityMats.paintedDark, { y: y0 + .2, cast: true, receive: true, ownId: ctx.id });
  // Circular server building: illuminated floors with columns and glass bands
  const buildingHeight = floors * floorHeight;
  addMesh(group, gCyl(radius, radius, buildingHeight, seg), cityMats.paintedMetal, { y: y0 + .4 + buildingHeight / 2, cast: true, receive: true, ownId: ctx.id });
  for (let floor = 0; floor < floors; floor += 1) {
    const fy = y0 + .4 + floor * floorHeight;
    addMesh(group, gCyl(radius + .18, radius + .18, .18, seg), cityMats.steelDark, { y: fy + .09, cast: true });
    addMesh(group, gCyl(radius + .05, radius + .05, floorHeight * .62, seg), windowsMaterial(ctx.accent, 10, 1), { y: fy + .18 + floorHeight * .31, cast: true, ownId: ctx.id });
    addMesh(group, gTorus(radius + .1, .022, 6, seg), statusMaterial(ctx, ctx.accent, .8), { y: fy + .17, rx: Math.PI / 2 });
  }
  const columns = [];
  for (let i = 0; i < 14; i += 1) { const angle = (i / 14) * Math.PI * 2; columns.push({ x: Math.cos(angle) * (radius + .26), y: y0 + .4 + buildingHeight / 2, z: Math.sin(angle) * (radius + .26), ry: -angle, sx: .22, sy: buildingHeight + .1, sz: .3 }); }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, columns, { cast: true }));
  addMesh(group, gBox(1.4, 1.5, .1), cityMats.glassDoor, { y: y0 + .4 + .8, z: radius + .04 });
  addMesh(group, gBox(1.8, .12, .9), cityMats.brushedSteel, { y: y0 + .4 + 1.6, z: radius + .45 });
  addMesh(group, gPlane(1.3, .32), plateMaterial('CLOUD-01', ctx.accent), { y: y0 + .4 + 1.95, z: radius + .05 });
  // Wide mechanical roof platform with railings, cooling exhausts, antenna and uplink
  const roofY = y0 + .4 + buildingHeight;
  addMesh(group, gCyl(radius + .5, radius + .5, .35, seg), cityMats.steelDark, { y: roofY + .17, cast: true });
  addMesh(group, gCyl(radius * .7, radius * .74, .3, seg), cityMats.paintedDark, { y: roofY + .5, cast: true });
  const posts = [];
  for (let i = 0; i < 28; i += 1) { const angle = (i / 28) * Math.PI * 2; posts.push({ x: Math.cos(angle) * (radius + .35), y: roofY + .6, z: Math.sin(angle) * (radius + .35), sx: .05, sy: .5, sz: .05 }); }
  group.add(makeInstances(gBox(1, 1, 1), cityMats.brushedSteel, posts));
  addMesh(group, gTorus(radius + .35, .025, 6, seg), cityMats.brushedSteel, { y: roofY + .85, rx: Math.PI / 2 });
  for (let i = 0; i < (fast ? 4 : 8); i += 1) {
    const angle = (i / (fast ? 4 : 8)) * Math.PI * 2 + .3; const px = Math.cos(angle) * radius * .82; const pz = Math.sin(angle) * radius * .82;
    if (i % 2) { addMesh(group, gCyl(.42, .5, 1.6, 12), cityMats.pipe, { x: px, y: roofY + 1.15, z: pz, cast: true }); addMesh(group, gCyl(.5, .5, .1, 12), cityMats.steelDark, { x: px, y: roofY + 2.0, z: pz }); }
    else createCoolingUnit(group, { x: px, y: roofY + .35, z: pz, size: .85, fans: 2, spin: 6 + i });
  }
  createAntennaArray(group, { x: 2.2, y: roofY + .65, z: -2.4, count: 3, height: 3.4, seed: 17, color: 0xff6a6a });
  addMesh(group, gCyl(.9, .12, .5, 18, true), cityMats.brushedSteel, { x: -2.4, y: roofY + 1.6, z: 2.2, rz: Math.PI / 2 - .7, ry: .4 });
  addMesh(group, gCyl(.08, .1, 1.2, 8), cityMats.steelDark, { x: -2.4, y: roofY + 1.2, z: 2.2 });
  // Cloud cluster above: dense core spheres plus semi-transparent wisps, lit from beneath
  const cloudBase = roofY + 4.4;
  const puffs = [
    [0, 1.6, 0, 3.4], [-2.6, .9, .6, 2.5], [2.7, 1.0, .3, 2.6], [-1.2, 3.0, -.4, 2.3], [1.4, 3.1, .5, 2.4],
    [-4.2, .2, .2, 1.7], [4.3, .3, -.4, 1.8], [0, .2, 2.4, 2.4], [.5, .3, -2.6, 2.2], [-2, 2.3, 1.8, 1.7], [2.2, 2.4, -1.9, 1.8], [0, 4.4, 0, 1.6],
  ];
  const cloudPuffs = [];
  puffs.forEach(([x, y, z, size], index) => {
    const puff = addMesh(group, gSphere(size, ultra ? 26 : 20, ultra ? 20 : 15), index % 3 === 2 ? cityMats.cloudShade : cityMats.cloudDense, { x, y: cloudBase + y, z, cast: true, ownId: ctx.id });
    animateObject(puff, { bob: { base: cloudBase + y, amp: .06 + index * .01, speed: .5 + index * .07, phase: index * 1.2 } });
    cloudPuffs.push(registerCloudMaterial(puff));
    if (!fast) {
      const wisp = addMesh(group, gSphere(size * 1.28, 16, 12), cityMats.cloudWisp, { x: x * 1.05, y: cloudBase + y + .2, z: z * 1.05 });
      animateObject(wisp, { bob: { base: cloudBase + y + .2, amp: .08, speed: .4 + index * .05, phase: index } });
      cloudPuffs.push(registerCloudMaterial(wisp));
    }
  });
  const underGlow = addMesh(group, gSphere(1, 12, 8), glowMaterial(0x8fd4ff, .12), { y: cloudBase - .4, sx: 5.5, sy: 1.6, sz: 5.5 });
  const cloudLight = addLocalLight(group, ctx, 0x8fd4ff, fast ? 24 : 40, 26, [0, cloudBase - 1.2, 0]);
  // Cloud operation states (idle / receiving / processing / success / failed) drive these materials and light.
  registerCloud(ctx.id, { puffs: cloudPuffs, glow: underGlow, light: cloudLight, centre: [0, cloudBase + 1.6, 0] });
}

function buildIotTower(group, ctx) {
  const { fast } = ctx.quality;
  group.userData.ctx = ctx;
  const foundation = createMechanicalFoundation(group, { radius: 4.2, height: .5, accent: ctx.accent });
  const y0 = foundation.top;
  // Equipment cabinets at the base with cable connections to the platform
  [[-2.2, .9, 0], [2.3, -.6, .5], [.2, -2.4, -.3]].forEach(([x, z, tilt], index) => {
    const cabinet = new THREE.Group();
    cabinet.position.set(x, y0, z); cabinet.rotation.y = tilt;
    addMesh(cabinet, gBox(1.7, 1.6, 1.2), cityMats.paintedMetal, { y: .8, cast: true, receive: true, ownId: index === 0 ? ctx.id : null });
    createFacadePanels(cabinet, { width: 1.7, depth: 1.2, height: 1.6, rows: 1, material: cityMats.panel });
    addMesh(cabinet, gBox(.7, 1.2, .06), cityMats.glassDoor, { x: -.35, y: .8, z: .63 });
    createVentArray(cabinet, { count: 2, x: .87, y: .8, z: 0, ry: Math.PI / 2, size: .4, spacing: .5 });
    const leds = []; for (let i = 0; i < 4; i += 1) leds.push({ x: .25 + i * .14, y: .35, z: .62 });
    cabinet.add(makeInstances(gBox(.05, .05, .03), ledMaterial(ctx.accent), leds));
    addMesh(cabinet, gCyl(.06, .06, Math.hypot(x, z) * .8, 6), cityMats.rubber, { x: -x * .4, y: .08, z: -z * .4, ry: -Math.atan2(z, x), rz: Math.PI / 2 });
    group.add(cabinet);
  });
  addMesh(group, gPlane(.9, .26), plateMaterial('IOT-GW', ctx.accent), { x: -2.2, y: y0 + 1.42, z: .61 });
  // Central reinforced column with a tall lattice mast
  const mastBase = y0; const mastHeight = 18.5; const mastTop = mastBase + mastHeight;
  addMesh(group, gCyl(.9, 1.2, 1.2, 12), cityMats.paintedDark, { y: mastBase + .6, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gCyl(.42, .6, mastHeight * .55, 12), cityMats.brushedSteel, { y: mastBase + 1.2 + mastHeight * .275, cast: true, ownId: ctx.id });
  addMesh(group, gCyl(.22, .4, mastHeight * .45, 10), cityMats.brushedSteel, { y: mastBase + 1.2 + mastHeight * .55 + mastHeight * .225, cast: true });
  const legs = [];
  [0, 2.094, 4.189].forEach((angle) => legs.push({ x: Math.cos(angle) * .95, y: mastBase + 1.2 + (mastHeight - 1.5) / 2, z: Math.sin(angle) * .95, sx: .12, sy: mastHeight - 1.5, sz: .12 }));
  group.add(makeInstances(gBox(1, 1, 1), cityMats.steelDark, legs, { cast: true }));
  const latticePoints = [];
  const levels = fast ? 14 : 22;
  for (let level = 0; level < levels; level += 1) {
    const y = mastBase + 1.4 + level * ((mastHeight - 2.2) / levels); const yNext = y + (mastHeight - 2.2) / levels;
    const shrink = 1 - level / levels * .35;
    for (let leg = 0; leg < 3; leg += 1) {
      const a = leg * 2.094; const b = ((leg + 1) % 3) * 2.094;
      latticePoints.push(Math.cos(a) * .95 * shrink, y, Math.sin(a) * .95 * shrink, Math.cos(b) * .95 * shrink, yNext, Math.sin(b) * .95 * shrink);
      latticePoints.push(Math.cos(a) * .95 * shrink, y, Math.sin(a) * .95 * shrink, Math.cos(b) * .95 * shrink, y, Math.sin(b) * .95 * shrink);
    }
  }
  const latticeGeometry = new THREE.BufferGeometry();
  latticeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(latticePoints, 3));
  group.add(new THREE.LineSegments(latticeGeometry, cityMats.latticeLine));
  // Horizontal support arms with antenna dishes and receiver panels
  [[.4, 9.5, 2.2, 1], [2.5, 12.6, 1.9, -1], [4.6, 7.8, 2.4, 1], [1.5, 15.2, 1.4, -1]].forEach(([angle, height, reach, side], index) => {
    const arm = new THREE.Group();
    arm.position.set(0, mastBase + height, 0); arm.rotation.y = -angle;
    addMesh(arm, gBox(reach, .16, .16), cityMats.brushedSteel, { x: reach / 2, cast: true });
    addMesh(arm, gBox(reach * .8, .06, .06), cityMats.steelDark, { x: reach * .45, y: -.35, rz: .18 });
    const dish = new THREE.Group();
    dish.position.set(reach, .1, 0); dish.rotation.set(0, 0, side * .5);
    addMesh(dish, gCyl(.75, .08, .3, 16, true), cityMats.brushedSteel, { rz: Math.PI / 2, x: .3 });
    addMesh(dish, gCyl(.08, .08, .6, 6), cityMats.steelDark, { x: .55, rz: Math.PI / 2 });
    addMesh(dish, gSphere(.09, 8, 6), cityMats.steelDark, { x: .85 });
    arm.add(dish);
    if (index % 2 === 0) addMesh(arm, gBox(.4, .8, .08), cityMats.panelLight, { x: reach * .55, y: .5, cast: true });
    group.add(arm);
  });
  // Rotating radar component, aviation light, signal rings
  const radar = new THREE.Group();
  radar.position.y = mastTop - 1.4;
  addMesh(radar, gCyl(.3, .36, .4, 10), cityMats.steelDark, {});
  addMesh(radar, gBox(2.2, .5, .1), cityMats.panelLight, { y: .45, cast: true });
  addMesh(radar, gBox(2.0, .08, .08), cityMats.brushedSteel, { y: .2 });
  animateObject(radar, { spinY: 1.1 });
  group.add(radar);
  addMesh(group, gCyl(.12, .16, 1.6, 8), cityMats.brushedSteel, { y: mastTop + .6 });
  const aviation = addMesh(group, gSphere(.16, 10, 8), statusMaterial(ctx, COLORS.red, 2.4), { y: mastTop + 1.5 });
  animateObject(aviation, { emissive: { base: 2.4, speed: 3.6, phase: 0 } });
  [mastBase + 5, mastBase + 10.5].forEach((y) => addBlinker(group, COLORS.red, [.98, y, 0], 1.1, .06));
  [0, 2.094, 4.189].forEach((angle) => addBlinker(group, ctx.accent, [Math.cos(angle) * .7, mastTop - 2.6, Math.sin(angle) * .7], 2.6 + angle, .045));
  addMesh(group, gTorus(.9, .04, 8, 32), cityMats.steelDark, { y: mastTop - 2.6, rx: Math.PI / 2 });
  [0, .5].forEach((offset) => {
    const pulse = addMesh(group, gTorus(.7, .02, 6, 40), new THREE.MeshBasicMaterial({ color: ctx.accent, transparent: true, opacity: .3, depthWrite: false, blending: THREE.AdditiveBlending }), { y: mastTop - 2.6, rx: Math.PI / 2 });
    animateObject(pulse, { pulse: { speed: .3, phase: offset, grow: 4.5, opacity: .3 } });
  });
  [0.9, 3.0, 5.1].forEach((angle) => {
    makeStrut(group, new THREE.Vector3(0, mastTop - 3.5, 0), new THREE.Vector3(Math.cos(angle) * 3.6, y0 + .1, Math.sin(angle) * 3.6), .02, cityMats.rubber);
    addMesh(group, gCyl(.12, .16, .25, 8), cityMats.steelDark, { x: Math.cos(angle) * 3.6, y: y0 + .1, z: Math.sin(angle) * 3.6 });
  });
  addLocalLight(group, ctx, ctx.accent, 4, 10, [0, mastTop - 2.5, 0], true);
}

function buildCityEnvironment() {
  disposeGroup(cityEnvironmentLayer);
  ensureCityMaterials();
  const { fast, ultra } = cityQuality();

  // Water
  const water = addMesh(cityEnvironmentLayer, gPlane(900, 900), cityMats.water, { y: CITY.water, rx: -Math.PI / 2, receive: true });
  water.userData.cityBackdrop = true;
  // Sky dome and mountains
  const sky = addMesh(cityEnvironmentLayer, gSphere(480, 40, 20), cityMats.sky, { y: -20 });
  sky.userData.cityBackdrop = true;
  cityEnvironmentLayer.add(buildMountainRidge(300, 16, 30, 11, cityMats.mountainFar, 160));
  cityEnvironmentLayer.add(buildMountainRidge(230, 9, 18, 47, cityMats.mountain, 180));
  // Distant skyline behind the islands
  const skyline = []; const skylineLights = [];
  const skylineCount = fast ? 110 : ultra ? 320 : 220;
  for (let i = 0; i < skylineCount; i += 1) {
    const angle = Math.PI + pseudoRandom(i * 1.7) * Math.PI;
    const radius = 105 + pseudoRandom(i * 2.3) * 70;
    const height = 3 + pseudoRandom(i * 3.1) * 13 + (pseudoRandom(i) > .92 ? 10 : 0);
    const width = 2 + pseudoRandom(i + 5) * 4;
    skyline.push({ x: Math.cos(angle) * radius, y: height / 2 - 1, z: Math.sin(angle) * radius, sx: width, sy: height, sz: width, ry: pseudoRandom(i + 9) * Math.PI });
    if (pseudoRandom(i + 3) > .5) skylineLights.push({ x: Math.cos(angle) * radius, y: height + .2, z: Math.sin(angle) * radius });
  }
  const skylineMesh = makeInstances(gBox(1, 1, 1), skylineMaterial(), skyline);
  skylineMesh.userData.cityBackdrop = true;
  cityEnvironmentLayer.add(skylineMesh);
  cityEnvironmentLayer.add(makeInstances(gSphere(.18, 6, 5), ledMaterial(0xff6a6a), skylineLights));
  // Islands
  ISLANDS.forEach((island) => buildIsland(island));
  // Low haze over the water for depth
  if (!fast) {
    for (let i = 0; i < (ultra ? 12 : 8); i += 1) {
      const haze = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color: 0x0f2540, transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending }));
      haze.position.set(-80 + pseudoRandom(i * 5.1) * 180, 3 + pseudoRandom(i) * 4, -110 + pseudoRandom(i * 2.2) * 60);
      haze.scale.set(60 + pseudoRandom(i + 7) * 50, 14 + pseudoRandom(i + 3) * 8, 1);
      cityEnvironmentLayer.add(haze);
    }
  }
  buildCityLightRig(cityEnvironmentLayer);
  cityEnvironmentLayer.visible = state.visualMode === 'city';
}

// ------------------------------------------------------------------ nodes

function computeAnomalyNodes() {
  anomalyNodes = new Set();
  // The bottleneck is the node the model expects to overload first (highest predicted network load).
  const predictions = [...(state.ml?.predictions || [])].sort((a, b) => (b.predicted?.network_load_percent || 0) - (a.predicted?.network_load_percent || 0));
  const bottleneck = state.ml?.detections?.bottlenecks?.[0];
  const bottleneckNode = predictions[0]?.node || bottleneck?.node || bottleneck?.source || 'Server-02';
  anomalyNodes.add(bottleneckNode);
  state.nodeStats.forEach((stat, id) => { if (stat.health === 'Critical') anomalyNodes.add(id); });
  state.bottleneckNode = bottleneckNode;
}

function nodeStatusColor(id) {
  const stat = state.nodeStats.get(id);
  // Health states keep the data legend (red / amber); the resting colour is the owning department.
  if (stat?.health === 'Critical') return COLORS.red;
  if (stat?.health === 'Watch') return 0xffb347;
  return departmentColor(id);
}

function buildNodes() {
  interactiveObjects = interactiveObjects.filter((object) => object.userData.owner?.kind !== 'node');
  disposeGroup(nodeLayer);
  nodeObjects = new Map();
  pulsingNodes = [];
  cityAnimated = [];
  cityLabels = [];
  anomalyMarkers = [];
  cityStatusLights = [];
  cityBlinkers = [];
  ensureRealismMaterials();
  computeAnomalyNodes();
  const quality = cityQuality();

  NODE_CONFIG.forEach((config) => {
    const group = new THREE.Group();
    group.name = config.id;
    group.position.set(config.position[0], CITY.islandTop, config.position[2]);
    group.userData.config = config;
    const island = islandFor(config.id);
    const ctx = {
      id: config.id, config, quality, island,
      accent: departmentColor(config.id),
      statusColor: nodeStatusColor(config.id),
      statusMaterials: [],
      seg: quality.fast ? 20 : quality.ultra ? 56 : 36,
    };
    if (config.id === 'Development') buildDevelopmentTower(group, ctx);
    else if (config.type === 'Server') buildServerTower(group, ctx);
    else if (config.type === 'Database') buildDatabaseVault(group, ctx);
    else if (config.type === 'API') buildGatewayRing(group, ctx);
    else if (config.type === 'Cloud') buildCloudFacility(group, ctx);
    else if (config.type === 'AI') buildAiPyramid(group, ctx);
    else if (config.type === 'IoT') buildIotTower(group, ctx);
    else if (config.type === 'Security') buildScaled(group, ctx, buildSecurity, 1.5);
    else buildScaled(group, ctx, buildDepartment, 1.5);

    const metrics = CITY_NODE[config.id] || { height: 8 };
    const minor = !!island?.minor;
    const label = makeCityLabel(config.id, config.type, metrics.height + (minor ? 1.6 : 2.4), config.color, minor ? .72 : 1);
    group.add(label);
    const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, metrics.height + (minor ? 1.6 : 2.4) - .5, 0), new THREE.Vector3(0, metrics.top ?? metrics.height - .6, 0)]), cityMats.leaderLine);
    group.add(leader);

    if (anomalyNodes.has(config.id)) {
      const pulse = new THREE.Mesh(gRing(1, 1.06, 64), new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: .22, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      pulse.rotation.x = -Math.PI / 2;
      pulse.position.y = .06;
      pulse.scale.setScalar((metrics.portRadius || 2) + 1.2);
      pulse.userData.phase = pseudoRandom(config.position[0]) * Math.PI;
      pulse.userData.baseScale = (metrics.portRadius || 2) + 1.2;
      group.add(pulse);
      pulsingNodes.push(pulse);
      if (config.id === state.bottleneckNode) {
        const chip = makeAlertChip(`BOTTLENECK  •  ${config.id.toUpperCase()}`);
        chip.position.y = metrics.height + 6.2;
        chip.userData.phase = 0;
        group.add(chip);
        anomalyMarkers.push(chip);
      }
    }
    group.userData.statusMaterials = ctx.statusMaterials;
    nodeLayer.add(group);
    nodeObjects.set(config.id, group);
  });
  buildCitadelFillers();
}

function buildScaled(group, ctx, builder, scale) {
  const structure = new THREE.Group();
  structure.scale.setScalar(scale);
  builder(structure, ctx);
  group.add(structure);
  addMesh(group, gRing(2.05 * scale, 2.16 * scale, 48), statusMaterial(ctx, ctx.accent, .7), { y: .51 * scale, rx: -Math.PI / 2 });
}

function addLocalLight(group, ctx, color, intensity, distance, position, pulse = false) {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(...position);
  light.userData.baseIntensity = intensity;
  light.userData.pulse = pulse;
  light.userData.phase = pseudoRandom(ctx.config.position[0] * 2 + ctx.config.position[2]) * Math.PI * 2;
  group.add(light);
  cityStatusLights.push(light);
  return light;
}

function addBlinker(group, color, position, rate = 2.4, radius = .04) {
  const led = addMesh(group, gSphere(radius, 8, 6), ledMaterial(color), { x: position[0], y: position[1], z: position[2] });
  led.userData.rate = rate;
  led.userData.phase = pseudoRandom(position[0] * 7 + position[1] * 3 + position[2]) * Math.PI * 2;
  cityBlinkers.push(led);
  return led;
}

function buildSecurity(group, ctx) {
  const y0 = CITY.foundationTop;
  addMesh(group, gCyl(2.45, 2.7, .5, 6), cityMats.gunmetal, { y: .25, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gBox(2.9, .4, 2.5), cityMats.darkMetal, { y: y0 + .2, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gBox(2.92, .1, .03), cityMats.warning, { y: y0 + .3, z: 1.26 });
  addMesh(group, gBox(2.92, .1, .03), cityMats.warning, { y: y0 + .3, z: -1.26 });
  [[-1.05, -.9], [1.05, -.9], [-1.05, .9], [1.05, .9]].forEach(([x, z]) => addMesh(group, gBox(.2, 2.8, .2), cityMats.gunmetal, { x, y: y0 + .4 + 1.4, z, cast: true }));
  addDepartmentEdgeLights(group, ctx, { width: 2.3, depth: 2.0, height: 2.6, y: y0 + .5, thickness: .05, intensity: .45 });
  addMesh(group, gBox(2.3, .18, 2.0), cityMats.charcoal, { y: y0 + 3.25, cast: true, ownId: ctx.id });
  addMesh(group, gBox(2.3, .14, 2.0), cityMats.charcoal, { y: y0 + .47 });
  addMesh(group, gPlane(1.7, 2.5), cityMats.ventAlpha, { x: 1.05, y: y0 + 1.85, ry: Math.PI / 2 });
  addMesh(group, gPlane(1.7, 2.5), cityMats.ventAlpha, { x: -1.05, y: y0 + 1.85, ry: -Math.PI / 2 });
  addMesh(group, gPlane(1.9, 2.5), cityMats.ventAlpha, { z: .9, y: y0 + 1.85 });
  addMesh(group, gPlane(1.9, 2.5), cityMats.ventAlpha, { z: -.9, y: y0 + 1.85, ry: Math.PI });
  addMesh(group, gBox(.7, 1.9, .7), cityMats.darkMetal, { y: y0 + 1.85 });
  const core = addMesh(group, gIco(.55, 1), statusMaterial(ctx, ctx.accent, 1.6), { y: y0 + 1.9 });
  animateObject(core, { spinY: .7, spinX: .25 });
  addMesh(group, gSphere(.28, 14, 10), ledMaterial(departmentTint(ctx.id, .35)), { y: y0 + 1.9 });
  addLocalLight(group, ctx, ctx.accent, 6, 9, [0, y0 + 1.9, 0], true);
  [[-.85, -.7], [.85, -.7], [-.85, .7], [.85, .7]].forEach(([x, z]) => {
    addMesh(group, gCyl(.07, .09, .28, 8), cityMats.charcoal, { x, y: y0 + 3.48, z });
    addBlinker(group, ctx.accent, [x, y0 + 3.66, z], 1.6 + Math.abs(x + z), .035);
  });
  [-.55, .55].forEach((x) => {
    addMesh(group, gCyl(.36, .36, .06, 20), cityMats.charcoal, { x, y: y0 + 3.37, z: 0 });
    const fan = new THREE.Group();
    fan.position.set(x, y0 + 3.42, 0);
    [0, 1.05, 2.1].forEach((angle) => addMesh(fan, gBox(.62, .015, .06), cityMats.steelLight, { ry: angle }));
    animateObject(fan, { spinY: 7 + x * 2 });
    group.add(fan);
  });
  addMesh(group, gPlane(.8, .22), plateMaterial('SEC-HUB', ctx.accent), { y: y0 + .6, z: 1.27 });
}

function buildDepartment(group, ctx) {
  const y0 = CITY.foundationTop;
  const accent = ctx.accent;
  addMesh(group, gCyl(2.45, 2.7, .5, 6), cityMats.gunmetal, { y: .25, cast: true, receive: true, ownId: ctx.id });
  addMesh(group, gBox(3.0, .3, 2.6), cityMats.darkMetal, { y: y0 + .15, cast: true, receive: true });
  const facade = windowsMaterial(accent);
  const body = new THREE.Mesh(gBox(2.6, 3.4, 2.2), [facade, facade, cityMats.charcoal, cityMats.darkMetal, facade, facade]);
  body.position.y = y0 + .3 + 1.7;
  body.castShadow = true; body.receiveShadow = true;
  own(body, ctx.id);
  group.add(body);
  [[-1.3, -1.1], [1.3, -1.1], [-1.3, 1.1], [1.3, 1.1]].forEach(([x, z]) => addMesh(group, gBox(.12, 3.4, .12), cityMats.gunmetal, { x, y: y0 + 2.0, z, cast: true }));
  addDepartmentEdgeLights(group, ctx, { width: 2.74, depth: 2.34, height: 3.1, y: y0 + .45, thickness: .05, intensity: .5 });
  addMesh(group, gBox(2.75, .14, 2.35), cityMats.charcoal, { y: y0 + 3.77, cast: true, ownId: ctx.id });
  addMesh(group, gBox(2.64, .05, 2.24), statusMaterial(ctx, accent, .65), { y: y0 + 3.68 });
  addMesh(group, gBox(.65, .4, .55), cityMats.gunmetal, { x: -.7, y: y0 + 4.04, z: .3, cast: true });
  addMesh(group, gCyl(.2, .2, .5, 12), cityMats.steelLight, { x: .85, y: y0 + 4.09, z: .5 });
  addMesh(group, gCyl(.02, .035, 1.0, 6), cityMats.steelLight, { x: -.95, y: y0 + 4.32, z: -.7 });
  addBlinker(group, 0xff6a6a, [-.95, y0 + 4.86, -.7], 1.3, .045);
  addMesh(group, gBox(.55, .78, .08), cityMats.darkMetal, { y: y0 + .3 + .39, z: 1.12 });
  addMesh(group, gPlane(.9, .24), plateMaterial(ctx.id.toUpperCase(), accent), { y: y0 + 1.4, z: 1.12 });
}

function nodeVisualHeight(type) {
  return ({ Server: 4.75, Database: 4.0, API: 4.85, Cloud: 3.6, AI: 4.2, IoT: 4.6, Security: 4.1, Department: 3.45 })[type] || 4;
}

function makeChipTexture(text, { border = 'rgba(255,255,255,.28)', fill = 'rgba(10,14,22,.9)', color = '#f2f6fa', size = 46, width = 512, height = 112, weight = 600 } = {}) {
  const [canvas, context] = makeCanvas(width, height);
  context.font = `${weight} ${size}px "Segoe UI", Inter, Arial, sans-serif`;
  const textWidth = context.measureText(text).width;
  const boxWidth = Math.min(width - 8, textWidth + 64);
  const x = (width - boxWidth) / 2;
  context.fillStyle = fill; context.strokeStyle = border; context.lineWidth = 2.5;
  context.beginPath(); context.roundRect(x, 8, boxWidth, height - 16, 14); context.fill(); context.stroke();
  context.fillStyle = 'rgba(255,255,255,.06)'; context.fillRect(x + 2, 10, boxWidth - 4, 1.5);
  context.fillStyle = color; context.textAlign = 'center'; context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  return { texture, widthRatio: boxWidth / width };
}

function makeCityLabel(name, type, y, color, scale = 1) {
  const full = makeChipTexture(name);
  const short = makeChipTexture(name, { size: 52, weight: 700 });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: full.texture, transparent: true, opacity: .97, depthWrite: false, depthTest: false, fog: false }));
  sprite.position.y = y;
  const width = 9.2 * scale; const height = width * (112 / 512);
  sprite.scale.set(width, height, 1);
  sprite.renderOrder = 20;
  sprite.userData.labelLOD = { full: full.texture, short: short.texture, fullScale: [width, height], shortScale: [width * .8, height * .8], current: 'full' };
  cityLabels.push(sprite);
  return sprite;
}

function makeAlertChip(text) {
  const chip = makeChipTexture(text, { border: 'rgba(255,60,78,.95)', fill: 'rgba(48,6,14,.94)', color: '#ffd9dd', size: 40, weight: 700, width: 768, height: 112 });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chip.texture, transparent: true, opacity: .96, depthWrite: false, depthTest: false, fog: false }));
  sprite.scale.set(16.5, 16.5 * (112 / 768), 1);
  sprite.renderOrder = 21;
  return sprite;
}

function makeRouteChip(text) {
  const chip = makeChipTexture(text, { size: 42, width: 640 });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chip.texture, transparent: true, opacity: .96, depthWrite: false, depthTest: false, fog: false }));
  sprite.scale.set(12.5, 12.5 * (112 / 640), 1);
  sprite.renderOrder = 21;
  return sprite;
}

function makeWarningSprite() {
  return makeAlertChip('ANOMALY');
}

function setNodeStatusColor(id, hex) {
  const node = nodeObjects.get(id);
  node?.userData.statusMaterials?.forEach((material) => {
    const target = hex ?? material.userData.baseHex;
    material.emissive.setHex(target);
    material.color.setHex(target).multiplyScalar(.3);
  });
}

function own(object, id, kind = 'node') {
  object.userData.owner = { kind, id };
  interactiveObjects.push(object);
  return object;
}

function makeLabel(name, type, y, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 128;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  const accent = `#${new THREE.Color(color).getHexString()}`;
  context.fillStyle = 'rgba(1, 10, 21, .94)';
  context.strokeStyle = accent;
  context.lineWidth = 2;
  context.shadowColor = accent;
  context.shadowBlur = 6;
  context.beginPath(); context.roundRect(22, 10, 468, 100, 14); context.fill(); context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = accent;
  context.fillRect(42, 29, 7, 52);
  context.textAlign = 'center';
  context.fillStyle = '#e7f7ff';
  context.font = '700 30px Segoe UI, Arial';
  context.fillText(name, 256, 54);
  context.fillStyle = accent;
  context.font = '600 16px Segoe UI, Arial';
  context.fillText(type.toUpperCase(), 256, 85);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: .94, depthWrite: false }));
  sprite.position.y = y;
  sprite.scale.set(4.55, 1.14, 1);
  return sprite;
}

function routeVisible(route) {
  const departmentMatch = state.filters.department === 'All' || route.sourceDepartment === state.filters.department || route.destinationDepartment === state.filters.department;
  const typeMatch = state.filters.type === 'All' || route.sourceType === state.filters.type || route.destinationType === state.filters.type;
  const anomalyMatch = state.filters.anomaly === 'All' || (state.filters.anomaly === 'Normal' ? route.anomalyCount === 0 : route.anomalyCount > 0);
  return departmentMatch && typeMatch && anomalyMatch;
}

function getNodePoint(id, city = false) {
  const config = NODE_CONFIG.find((node) => node.id === id);
  if (!config) return null;
  if (city) {
    const metrics = CITY_NODE[id] || { port: 2.5 };
    return new THREE.Vector3(config.position[0], CITY.islandTop + metrics.port, config.position[2]);
  }
  return new THREE.Vector3(config.position[0], Math.min(nodeVisualHeight(config.type) * .58, 2.45), config.position[2]);
}

function makeCurve(sourceId, destinationId, index = 0) {
  const start = getNodePoint(sourceId);
  const end = getNodePoint(destinationId);
  if (!start || !end) return null;
  const distance = start.distanceTo(end);
  const midpoint = start.clone().lerp(end, .5);
  const side = new THREE.Vector3(-(end.z - start.z), 0, end.x - start.x).normalize().multiplyScalar(((index % 3) - 1) * .35);
  midpoint.add(side);
  midpoint.y = Math.max(start.y, end.y) + 1.6 + distance * .105;
  return new THREE.CatmullRomCurve3([start, start.clone().lerp(midpoint, .47), midpoint, midpoint.clone().lerp(end, .53), end], false, 'catmullrom', .65);
}

// Where a route physically attaches to a structure. The API Gateway ring is special: routes pass
// straight through the centre of the ring along its axis.
function nodePort(id, toward) {
  const base = getNodePoint(id, true);
  const metrics = CITY_NODE[id] || { portRadius: 2 };
  const direction = toward.clone().sub(base); direction.y = 0;
  if (direction.lengthSq() < 1e-6) direction.set(1, 0, 0); else direction.normalize();
  if (metrics.ring) {
    const sign = direction.dot(API_AXIS) >= 0 ? 1 : -1;
    const axis = API_AXIS.clone().multiplyScalar(sign);
    return { through: base.clone(), point: base.clone().add(axis.clone().multiplyScalar(5.6)), ring: true };
  }
  return { point: base.clone().add(direction.multiplyScalar(metrics.portRadius || 2)), ring: false };
}

function makeConduitCurve(sourceId, destinationId, index = 0, lift = 0) {
  const sourceConfig = NODE_CONFIG.find((node) => node.id === sourceId);
  const destinationConfig = NODE_CONFIG.find((node) => node.id === destinationId);
  if (!sourceConfig || !destinationConfig) return null;
  const sourcePosition = new THREE.Vector3(sourceConfig.position[0], 0, sourceConfig.position[2]);
  const destinationPosition = new THREE.Vector3(destinationConfig.position[0], 0, destinationConfig.position[2]);
  const a = nodePort(sourceId, destinationPosition);
  const b = nodePort(destinationId, sourcePosition);
  const start = a.point; const end = b.point;
  const flat = end.clone().sub(start); flat.y = 0;
  const distance = flat.length();
  const direction = flat.normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const lane = ((index % 3) - 1) * 1.7;
  const bridgeY = CITY.bridgeHeight + lift;
  const sourceIsland = islandFor(sourceId); const destinationIsland = islandFor(destinationId);
  const points = [];
  if (a.ring) points.push(a.through);
  points.push(start);
  const p1 = start.clone().add(direction.clone().multiplyScalar(Math.min(distance * .22, (sourceIsland?.r || 4) * .55))).add(side.clone().multiplyScalar(lane * .5));
  p1.y = THREE.MathUtils.lerp(start.y, bridgeY, .75);
  const mid = start.clone().lerp(end, .5).add(side.clone().multiplyScalar(lane));
  mid.y = bridgeY;
  const p3 = end.clone().sub(direction.clone().multiplyScalar(Math.min(distance * .22, (destinationIsland?.r || 4) * .55))).add(side.clone().multiplyScalar(lane * .5));
  p3.y = THREE.MathUtils.lerp(end.y, bridgeY, .75);
  points.push(p1, mid, p3, end);
  if (b.ring) points.push(b.through);
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

function makeSkyArc(sourceId, destinationId, index = 0, lift = 0) {
  const sourceConfig = NODE_CONFIG.find((node) => node.id === sourceId);
  const destinationConfig = NODE_CONFIG.find((node) => node.id === destinationId);
  if (!sourceConfig || !destinationConfig) return null;
  const a = nodePort(sourceId, new THREE.Vector3(destinationConfig.position[0], 0, destinationConfig.position[2]));
  const b = nodePort(destinationId, new THREE.Vector3(sourceConfig.position[0], 0, sourceConfig.position[2]));
  const start = a.point; const end = b.point;
  const flat = end.clone().sub(start); flat.y = 0;
  const distance = flat.length();
  const direction = flat.normalize();
  const side = new THREE.Vector3(-direction.z, 0, direction.x);
  const sway = ((index % 3) - 1) * (2 + distance * .04);
  const apex = Math.max(start.y, end.y) + 9 + distance * .16 + (index % 4) * 1.6 + lift;
  const p1 = start.clone().add(direction.clone().multiplyScalar(distance * .22)).add(side.clone().multiplyScalar(sway * .6)); p1.y = start.y + (apex - start.y) * .78;
  const mid = start.clone().lerp(end, .5).add(side.clone().multiplyScalar(sway)); mid.y = apex;
  const p3 = end.clone().sub(direction.clone().multiplyScalar(distance * .22)).add(side.clone().multiplyScalar(sway * .6)); p3.y = end.y + (apex - end.y) * .78;
  const points = [];
  if (a.ring) points.push(a.through);
  points.push(start, p1, mid, p3, end);
  if (b.ring) points.push(b.through);
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

// Backwards-compatible alias used by tooling and Story Mode helpers.
function makeCityCurve(sourceId, destinationId, index = 0, lift = 0) {
  return lift ? makeSkyArc(sourceId, destinationId, index, lift) : makeConduitCurve(sourceId, destinationId, index, 0);
}

function curveCrossesForeignIsland(curve, sourceId, destinationId) {
  const samples = curve.getPoints(48);
  return ISLANDS.some((island) => {
    if (island.nodes.includes(sourceId) || island.nodes.includes(destinationId)) return false;
    return samples.some((point) => Math.hypot(point.x - island.x, point.z - island.z) < island.r + 1.6);
  });
}

function predictivePathSegments() {
  if (!state.pathSegments) {
    const toSet = (path = []) => new Set(path.slice(0, -1).map((id, index) => `${id}→${path[index + 1]}`));
    const flow = state.ml?.predictive_flow || {};
    const current = toSet(flow.current); const predicted = toSet(flow.predicted);
    state.pathSegments = { bottleneck: new Set([...current].filter((key) => !predicted.has(key))), recommended: predicted };
  }
  return state.pathSegments;
}

function flowColor(route) {
  const segments = predictivePathSegments();
  if (segments.bottleneck.has(route.key)) return COLORS.red;
  if (route.threat === 'Critical' || route.anomalyStatus === 'Suspicious Traffic' || route.connectionStatus === 'Failed') return COLORS.red;
  if (route.anomalyCount && (route.latency > 90 || route.networkLoad > 78 || route.packetLoss > 3)) return COLORS.red;
  if (segments.recommended.has(route.key)) return COLORS.green;
  if (route.priority === 'Critical') return COLORS.yellow;
  if (route.sourceType === 'AI' || route.destinationType === 'AI') return COLORS.purple;
  if (route.speed > 500) return COLORS.cyan;
  if (route.connectionStatus === 'Connected' && route.routeStatus === 'Optimal' && route.index % 6 === 0) return COLORS.green;
  return COLORS.blue;
}

function makeFlowShaderMaterial(color, speed = 1, opacity = .88, layer = 'current', pulse = 0) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
      uPulse: { value: pulse },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uSpeed;
      uniform float uOpacity;
      uniform float uPulse;
      varying vec2 vUv;
      void main() {
        float signal = sin((vUv.x * 24.0 - uTime * uSpeed) * 6.28318) * 0.5 + 0.5;
        signal = pow(signal, 11.0);
        float micro = sin((vUv.x * 82.0 - uTime * uSpeed * 1.7) * 6.28318) * 0.5 + 0.5;
        micro = pow(micro, 20.0) * 0.38;
        float rim = 0.72 + pow(abs(vUv.y - 0.5) * 2.0, 2.0) * 0.7;
        float throb = mix(1.0, 0.55 + 0.45 * (sin(uTime * 4.2) * 0.5 + 0.5), uPulse);
        vec3 lightColor = uColor * (0.82 + signal * 2.15 + micro * 0.85) * rim * throb;
        float alpha = uOpacity * (0.28 + signal * 0.52 + micro * 0.16) * throb;
        gl_FragColor = vec4(lightColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  material.userData.flowLayer = layer;
  animatedRouteMaterials.push(material);
  return material;
}

function makeLightParticle(color, size, opacity = 1) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(size * .38, 10, 8),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color, transparent: true, opacity: opacity * .72, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(size * 4.15);
  group.add(core, halo);
  return group;
}

function makeTrailSprite(color, size, opacity) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sprite.scale.set(size * 2.6, size * 1.25, 1);
  return sprite;
}

// Pooled NETWORK CITY particles: bodies and trails are recycled between rebuilds so that filter
// changes and quality switches never allocate inside the render loop.
const particlePool = { bodies: [], trails: [] };

function acquireParticle(color, size, opacity) {
  let body = particlePool.bodies.pop();
  if (!body) {
    body = new THREE.Group();
    const core = new THREE.Mesh(gSphere(1, 10, 8), new THREE.MeshBasicMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    body.add(core, halo);
    body.userData.core = core;
    body.userData.halo = halo;
  }
  const { core, halo } = body.userData;
  core.material.color.setHex(color).lerp(new THREE.Color(0xffffff), .4);
  core.material.opacity = opacity;
  core.scale.setScalar(size * .4);
  halo.material.color.setHex(color);
  halo.material.opacity = opacity * .66;
  halo.scale.setScalar(size * 3.6);
  body.scale.setScalar(1);
  return body;
}

function acquireTrail(color, size, opacity) {
  let trail = particlePool.trails.pop();
  if (!trail) trail = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  trail.material.color.setHex(color);
  trail.material.opacity = opacity;
  trail.scale.set(size * 2.2, size * 1.05, 1);
  return trail;
}

function releaseParticles(list) {
  list.forEach((item) => {
    item.object.removeFromParent();
    particlePool.bodies.push(item.object);
    item.trails.forEach((trail) => { trail.removeFromParent(); particlePool.trails.push(trail); });
  });
}

function disposeGroup(group) {
  while (group.children.length) {
    const object = group.children.pop();
    object.traverse((child) => {
      if (child.isLight || child.isInstancedMesh) child.dispose?.();
      if (child.userData?.labelLOD) { child.userData.labelLOD.full.dispose(); child.userData.labelLOD.short.dispose(); }
      if (child.geometry && !child.geometry.userData?.shared) child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      materials.forEach((material) => {
        if (material.userData?.shared) return;
        if (material.map && !material.map.userData?.shared) material.map.dispose();
        material.dispose?.();
      });
    });
  }
}

function conduitGlassMaterial(color) {
  const key = `conduitGlass:${color}`;
  if (!cityMaterialCache.has(key)) {
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), .35), transparent: true, opacity: .22, roughness: .12, metalness: .05,
      clearcoat: 1, clearcoatRoughness: .08, depthWrite: false, envMap: cityEnvMap, envMapIntensity: .8, emissive: color, emissiveIntensity: .08,
    });
    material.userData.shared = true;
    cityMaterialCache.set(key, material);
  }
  return cityMaterialCache.get(key);
}

function loweredCurve(curve, drop, samples = 40) {
  return new THREE.CatmullRomCurve3(curve.getPoints(samples).map((point) => point.clone().setY(point.y - drop)), false, 'centripetal');
}

function addConduit(layer, route, curve, color, { anomalous = false, quality, particleLimit, trailCount, density, list = particles, unique = false, radiusScale = 1, sizeScale = 1, glowScale = 1 }) {
  const firstChild = layer.children.length;
  const segments = quality.fast ? 56 : quality.ultra ? 150 : 96;
  const glass = own(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, .36 * radiusScale, quality.fast ? 8 : 12, false), unique ? uniqueMaterial(conduitGlassMaterial(color)) : conduitGlassMaterial(color)), route.key, 'connection');
  glass.userData.route = route;
  glass.renderOrder = 4;
  layer.add(glass);
  const core = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, .13 * radiusScale, 6, false), makeFlowShaderMaterial(color, .72 + route.speed / 540, Math.min(1.2, .95 * glowScale), 'current', anomalous ? 1 : 0));
  const filamentMaterial = glowMaterial(new THREE.Color(color).lerp(new THREE.Color(0xffffff), .55).getHex(), .75);
  const filament = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, .055 * radiusScale, 5, false), unique ? uniqueMaterial(filamentMaterial) : filamentMaterial);
  layer.add(core, filament);
  // bridge structure: dark trough under the glass tube plus pylons down to the water
  const trough = new THREE.Mesh(new THREE.TubeGeometry(loweredCurve(curve, .52), Math.round(segments * .6), .42, 8, false), cityMats.darkMetal);
  trough.castShadow = true;
  layer.add(trough);
  const rails = new THREE.Mesh(new THREE.TubeGeometry(loweredCurve(curve, .18), Math.round(segments * .6), .5, 6, true), cityMats.charcoal);
  rails.scale.set(1, .35, 1);
  layer.add(rails);
  const pylons = [];
  const length = curve.getLength();
  const count = Math.max(2, Math.round(length / 7));
  for (let i = 1; i < count; i += 1) {
    const point = curve.getPointAt(i / count);
    const overIsland = ISLANDS.some((island) => Math.hypot(point.x - island.x, point.z - island.z) < island.r * 1.02);
    if (overIsland) continue;
    const height = point.y - .6;
    pylons.push({ x: point.x, y: height / 2, z: point.z, sy: height });
    pylons.push({ x: point.x, y: height - .3, z: point.z, sx: 4.5, sy: .35, sz: 1.2 });
  }
  if (pylons.length) layer.add(makeInstances(gBox(.55, 1, .55), cityMats.darkMetal, pylons, { cast: true }));
  const particleCount = particleLimit > 0 ? clamp(Math.round((route.volume / 45) * density), 3, particleLimit) : 0;
  const size = (.26 + clamp(route.volume / 2600, .02, .18)) * sizeScale;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = acquireParticle(color, size, 1);
    particle.position.copy(curve.getPoint(i / particleCount));
    layer.add(particle);
    const trails = [];
    for (let trailIndex = 0; trailIndex < trailCount; trailIndex += 1) {
      const trail = acquireTrail(color, size, .26 / (trailIndex + 1));
      layer.add(trail);
      trails.push(trail);
    }
    list.push({ object: particle, trails, curve, phase: i / particleCount + pseudoRandom(route.index * 7 + i) * .05, speed: .03 + route.speed / 9000, route, size });
  }
  layer.children.slice(firstChild).forEach((object) => { object.userData.routeKey = route.key; });
}

function addSkyArc(layer, route, curve, color, { anomalous = false, quality, list, particleLimit, dashColor = null, opacity = .6, size = .2 }) {
  const firstChild = layer.children.length;
  const segments = quality.fast ? 48 : quality.ultra ? 120 : 80;
  const points = curve.getPoints(segments);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: dashColor ?? color, dashSize: 1.1, gapSize: .7, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  line.computeLineDistances();
  layer.add(line);
  const tube = own(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, .09, 5, false), makeFlowShaderMaterial(color, .7 + route.speed / 600, .42, layer === predictedLayer ? 'predicted' : 'current', anomalous ? 1 : 0)), route.key, 'connection');
  tube.userData.route = route;
  layer.add(tube);
  const particleCount = particleLimit > 0 ? clamp(Math.round(route.volume / 90), 2, particleLimit) : 0;
  for (let i = 0; i < particleCount; i += 1) {
    const particle = acquireParticle(color, size, .9);
    particle.position.copy(curve.getPoint(i / particleCount));
    layer.add(particle);
    const trail = acquireTrail(color, size, .2);
    layer.add(trail);
    list.push({ object: particle, trails: [trail], curve, phase: i / particleCount + pseudoRandom(route.index * 3 + i) * .08, speed: .035 + route.speed / 9000, route, size });
  }
  layer.children.slice(firstChild).forEach((object) => { object.userData.routeKey = route.key; });
}

function buildCurrentFlows() {
  interactiveObjects = interactiveObjects.filter((object) => object.userData.owner?.kind !== 'connection');
  exitRouteFocus({ restoreCamera: false });
  releaseParticles(particles);
  particles = [];
  animatedRouteMaterials = animatedRouteMaterials.filter((material) => material.userData.flowLayer !== 'current');
  disposeGroup(currentLayer);
  ensureCityMaterials();
  const quality = cityQuality();
  const conduitLimit = quality.fast ? 9 : quality.ultra ? 16 : 14;
  const particleLimit = quality.fast ? 5 : quality.ultra ? 14 : 9;
  const arcParticleLimit = quality.fast ? 2 : quality.ultra ? 5 : 3;
  const trailCount = quality.fast ? 1 : quality.ultra ? 4 : 3;

  const visibleRoutes = state.routeStats.filter(routeVisible);
  const touches = new Map();
  visibleRoutes.forEach((route) => {
    touches.set(route.source, (touches.get(route.source) || 0) + 1);
    touches.set(route.destination, (touches.get(route.destination) || 0) + 1);
  });
  let conduits = 0;
  state.routeStyles = new Map();
  visibleRoutes.forEach((route) => {
    const color = flowColor(route);
    const anomalous = color === COLORS.red && route.anomalyCount > 0;
    const overlap = (touches.get(route.source) || 1) + (touches.get(route.destination) || 1);
    const density = clamp(1.18 - overlap * .05, .5, 1);
    const minor = islandFor(route.source)?.minor || islandFor(route.destination)?.minor;
    const conduitCurve = minor ? null : makeConduitCurve(route.source, route.destination, route.index);
    const useConduit = conduitCurve && conduits < conduitLimit && !curveCrossesForeignIsland(conduitCurve, route.source, route.destination);
    if (useConduit) {
      conduits += 1;
      state.routeStyles.set(route.key, 'conduit');
      addConduit(currentLayer, route, conduitCurve, color, { anomalous, quality, particleLimit, trailCount, density });
    } else {
      const arc = makeSkyArc(route.source, route.destination, route.index);
      if (!arc) return;
      state.routeStyles.set(route.key, 'arc');
      addSkyArc(currentLayer, route, arc, color, { anomalous, quality, list: particles, particleLimit: arcParticleLimit });
    }
  });

  applyFlowVisibility();
  $('#visible-flows').textContent = visibleRoutes.length;
  $('#particle-count').textContent = particles.length + predictedParticles.length;
}

function buildPredictedFlows() {
  interactiveObjects = interactiveObjects.filter((object) => !object.userData.route?.predicted);
  exitRouteFocus({ restoreCamera: false });
  releaseParticles(predictedParticles);
  predictedParticles = [];
  animatedRouteMaterials = animatedRouteMaterials.filter((material) => material.userData.flowLayer !== 'predicted');
  disposeGroup(predictedLayer);
  ensureCityMaterials();
  const quality = cityQuality();
  const flow = state.ml?.predictive_flow?.predicted || ['Server-01', 'API-Gateway', 'Server-04', 'Database-02'];
  for (let index = 0; index < flow.length - 1; index += 1) {
    const curve = makeSkyArc(flow[index], flow[index + 1], index + 1, 3.5);
    if (!curve) continue;
    const route = { key: `predicted:${flow[index]}→${flow[index + 1]}`, source: flow[index], destination: flow[index + 1], speed: 420, volume: 260, index: index + 1, predicted: true };
    const segments = quality.fast ? 48 : 96;
    const points = curve.getPoints(segments);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0xdab4ff, dashSize: 1.2, gapSize: .8, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    line.computeLineDistances();
    predictedLayer.add(line);
    const firstChild = predictedLayer.children.length - 1;
    const ghost = own(new THREE.Mesh(new THREE.TubeGeometry(curve, segments, .16, 6, false), makeFlowShaderMaterial(COLORS.purple, .78, .32, 'predicted')), route.key, 'connection');
    ghost.userData.route = route;
    predictedLayer.add(ghost);
    const count = quality.fast ? 2 : 4;
    for (let p = 0; p < count; p += 1) {
      const color = p % 2 ? 0xd2b8ff : COLORS.purple;
      const particle = acquireParticle(color, .22, .7);
      predictedLayer.add(particle);
      const trail = acquireTrail(color, .22, .18);
      predictedLayer.add(trail);
      predictedParticles.push({ object: particle, trails: [trail], curve, phase: p / count + index * .1, speed: .04, route });
    }
    predictedLayer.children.slice(firstChild).forEach((object) => { object.userData.routeKey = route.key; });
  }
  // "Route via" chip on the recommended detour, placed over the matching conduit when present.
  const via = flow[2];
  if (via && flow.length > 3) {
    const chip = makeRouteChip(`Route via ${via}`);
    const detour = makeConduitCurve(flow[2], flow[3], 0);
    const anchor = detour ? detour.getPoint(.5) : makeSkyArc(flow[2], flow[3], 0, 3.5)?.getPoint(.5);
    if (anchor) {
      chip.position.copy(anchor).add(new THREE.Vector3(0, 4.2, 0));
      predictedLayer.add(chip);
      const leader = new THREE.Line(new THREE.BufferGeometry().setFromPoints([anchor.clone().add(new THREE.Vector3(0, 3.2, 0)), anchor.clone().add(new THREE.Vector3(0, .6, 0))]), cityMats.leaderLine);
      predictedLayer.add(leader);
    }
  }
  applyFlowVisibility();
  $('#particle-count').textContent = particles.length + predictedParticles.length;
}

function makeRiverLineMaterial(color, phase, speed, opacity, layer = 'river') {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uPhase: { value: phase },
      uSpeed: { value: speed },
      uOpacity: { value: opacity },
    },
    vertexShader: `
      attribute float aT;
      varying float vT;
      void main() {
        vT = aT;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uPhase;
      uniform float uSpeed;
      uniform float uOpacity;
      varying float vT;
      void main() {
        float pulse = sin((vT * 18.0 - uTime * uSpeed + uPhase) * 6.28318) * 0.5 + 0.5;
        pulse = pow(pulse, 18.0);
        float sparkle = sin((vT * 61.0 - uTime * uSpeed * 1.8 + uPhase) * 6.28318) * 0.5 + 0.5;
        sparkle = pow(sparkle, 30.0);
        vec3 energy = uColor * (0.62 + pulse * 1.75 + sparkle * 0.72);
        gl_FragColor = vec4(energy, uOpacity * (0.34 + pulse * 0.46 + sparkle * 0.18));
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  material.userData.riverLayer = layer;
  riverMaterials.push(material);
  return material;
}

function buildFlowRiverArchitecture() {
  disposeGroup(riverArchitectureLayer);
  floatingObjects = [];
  const sourceGroup = new THREE.Group();
  sourceGroup.position.set(-19.2, 0, 1.5);
  const destinationGroup = new THREE.Group();
  destinationGroup.position.set(18.4, 0, 1.2);
  riverArchitectureLayer.add(sourceGroup, destinationGroup);

  const sourceBase = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 7.8, .5, 8),
    new THREE.MeshStandardMaterial({ color: 0x04111d, emissive: COLORS.blue, emissiveIntensity: .035, metalness: .88, roughness: .24, transparent: true, opacity: .56 }),
  );
  sourceBase.scale.z = .72;
  sourceBase.position.y = .18;
  sourceGroup.add(sourceBase);
  const destinationBase = sourceBase.clone();
  destinationBase.material = sourceBase.material.clone();
  destinationBase.material.emissive.setHex(COLORS.cyan);
  destinationGroup.add(destinationBase);

  const sourceServers = [
    { id: 'Server-01', x: -2.4, z: -2.3, h: 5.3, color: COLORS.blue },
    { id: 'API-Gateway', x: .1, z: -2.8, h: 4.4, color: COLORS.cyan },
    { id: 'Server-03', x: 2.6, z: -1.4, h: 5.8, color: COLORS.blue },
    { id: 'Security-Hub', x: .7, z: 2.3, h: 3.7, color: COLORS.red },
  ];
  sourceServers.forEach((item) => sourceGroup.add(makeRiverServer(item)));
  sourceGroup.add(makeRiverDatabase({ id: 'Database-01', x: -3.8, z: 2.1, h: 3.2, color: COLORS.cyan }));

  const destinationServers = [
    { id: 'Server-02', x: -3.2, z: -1.9, h: 5.1, color: COLORS.blue },
    { id: 'Server-04', x: -.7, z: -2.7, h: 5.8, color: COLORS.cyan },
    { id: 'AI-Engine', x: 2.0, z: -1.5, h: 4.4, color: COLORS.purple },
    { id: 'Management', x: 3.6, z: 2.4, h: 3.5, color: COLORS.blue },
  ];
  destinationServers.forEach((item) => destinationGroup.add(makeRiverServer(item)));
  destinationGroup.add(makeRiverDatabase({ id: 'Database-02', x: -3.4, z: 2.5, h: 3.6, color: COLORS.cyan }));
  destinationGroup.add(makeRiverCloud());

  const originLabel = makeRiverSectionLabel('DATA ORIGIN', 'SERVERS · APIs · DATABASES', COLORS.cyan);
  originLabel.position.set(-19, 10.4, 0);
  const transitLabel = makeRiverSectionLabel('DATA IN TRANSIT', 'LIVE MULTI-ROUTE TELEMETRY', COLORS.purple);
  transitLabel.position.set(0, 12.2, -1);
  const destinationLabel = makeRiverSectionLabel('DATA DESTINATION', 'CLOUD · AI · STORAGE', COLORS.cyan);
  destinationLabel.position.set(18.2, 11.1, 0);
  riverArchitectureLayer.add(originLabel, transitLabel, destinationLabel);

  const markers = [
    { symbol: '!', shape: 'triangle', color: COLORS.red, position: [-12.4, 7.4, -2], label: 'ANOMALY' },
    { symbol: '⚡', shape: 'circle', color: COLORS.cyan, position: [-3.2, 9.3, -1.2], label: 'HIGH SPEED' },
    { symbol: '!', shape: 'ring', color: COLORS.yellow, position: [.6, 6.1, 7], label: 'PRIORITY' },
    { symbol: '✓', shape: 'ring', color: COLORS.green, position: [13.2, 4.8, 8], label: 'PROCESSED' },
    { symbol: 'AI', shape: 'circle', color: COLORS.purple, position: [1.1, 8.2, -4.8], label: 'ANALYTICS' },
  ];
  markers.forEach((marker, index) => {
    const sprite = makeRiverMarker(marker.symbol, marker.label, marker.color, marker.shape);
    sprite.position.set(...marker.position);
    sprite.userData.float = { base: marker.position[1], amp: .3, speed: .8 + index * .17, phase: index * 1.4 };
    floatingObjects.push(sprite);
    riverArchitectureLayer.add(sprite);
  });

  const panels = [
    { title: 'THREAT MATRIX', color: COLORS.red, seed: 11, position: [-16.5, 12.6, -7.5] },
    { title: 'PACKET INSPECTOR', color: COLORS.cyan, seed: 37, position: [-5.5, 13.6, -9.5] },
    { title: 'IDENTITY MESH', color: COLORS.blue, seed: 63, position: [5.5, 13, -9] },
    { title: 'AI FABRIC', color: COLORS.purple, seed: 89, position: [14.5, 12.2, -7] },
  ];
  panels.forEach((panel, index) => {
    const sprite = makeHoloPanel(panel);
    sprite.position.set(...panel.position);
    sprite.userData.float = { base: panel.position[1], amp: .38, speed: .5 + index * .13, phase: index * 2.1 };
    sprite.userData.flicker = { base: .5, amp: .18, speed: 1.4 + index * .5, phase: index * 1.1 };
    floatingObjects.push(sprite);
    riverArchitectureLayer.add(sprite);
  });
}

function addRiverEdges(mesh, color, opacity = .52) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 22),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  mesh.add(edges);
}

function makeRiverServer({ id, x, z, h, color }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const shell = own(new THREE.Mesh(
    new THREE.BoxGeometry(2.1, h, 1.75),
    new THREE.MeshStandardMaterial({ color: 0x081b2b, emissive: color, emissiveIntensity: .08, metalness: .84, roughness: .2, transparent: true, opacity: .9 }),
  ), id);
  shell.position.y = h / 2 + .55;
  group.add(shell);
  addRiverEdges(shell, color, .38);
  for (let level = 0; level < Math.floor(h / .52); level += 1) {
    const light = new THREE.Mesh(
      new THREE.BoxGeometry(1.52, .12, .035),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: level % 3 ? .4 : .68, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    light.position.set(0, 1 + level * .48, .89);
    group.add(light);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.35, .16, 2), new THREE.MeshStandardMaterial({ color: 0x020b13, metalness: .9, roughness: .2 }));
  roof.position.y = h + .62;
  group.add(roof);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(.025, .045, 1.1, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
  antenna.position.y = h + 1.2;
  group.add(antenna);
  const platform = new THREE.Mesh(new THREE.RingGeometry(1.45, 1.62, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .62, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  platform.rotation.x = -Math.PI / 2;
  platform.position.y = .55;
  group.add(platform);
  return group;
}

function makeRiverDatabase({ id, x, z, h, color }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = own(new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.25, h, 32),
    new THREE.MeshPhysicalMaterial({ color: 0x082538, emissive: color, emissiveIntensity: .1, metalness: .62, roughness: .15, transmission: .12, transparent: true, opacity: .66 }),
  ), id);
  body.position.y = h / 2 + .55;
  group.add(body);
  addRiverEdges(body, color, .3);
  for (let level = 0; level < 5; level += 1) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.28, .055, 7, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .52, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = .8 + level * (h / 5);
    group.add(ring);
  }
  return group;
}

function makeRiverCloud() {
  const group = new THREE.Group();
  group.position.set(.8, 6.9, 2.2);
  group.userData.float = { base: 6.9, amp: .24, speed: .55, phase: 1.2 };
  floatingObjects.push(group);
  const color = COLORS.cyan;

  const puffMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe9f5ff, emissive: 0x86c8f2, emissiveIntensity: .3, metalness: .04, roughness: .22,
    clearcoat: .85, clearcoatRoughness: .22, transparent: true, opacity: .97,
  });
  const shadedMaterial = puffMaterial.clone();
  shadedMaterial.color.setHex(0xbcd9ef);
  shadedMaterial.emissiveIntensity = .18;
  [
    [0, .1, 0, 1.8], [-1.6, -.32, .1, 1.25], [1.55, -.3, .05, 1.3], [-.72, .95, .05, 1.3],
    [.8, 1.05, 0, 1.45], [2.5, -.55, -.1, .9], [-2.55, -.6, 0, .85],
  ].forEach(([x, y, z, size], index) => {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(size, 26, 20), index % 3 === 2 ? shadedMaterial : puffMaterial);
    puff.position.set(x, y, z);
    group.add(puff);
  });
  const belly = new THREE.Mesh(new THREE.SphereGeometry(2.4, 26, 18), shadedMaterial);
  belly.scale.set(1.35, .5, .95);
  belly.position.y = -.75;
  group.add(belly);

  const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color: 0xa9ecff, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  burst.position.set(-1.5, -.85, 1.05);
  burst.scale.set(8, 5.6, 1);
  burst.userData.flicker = { base: .8, amp: .22, speed: 3.2, phase: 0 };
  floatingObjects.push(burst);
  group.add(burst);
  const burstCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color: 0xffffff, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  burstCore.position.copy(burst.position);
  burstCore.scale.set(3.4, 2.6, 1);
  burstCore.userData.flicker = { base: .92, amp: .16, speed: 5.1, phase: 2 };
  floatingObjects.push(burstCore);
  group.add(burstCore);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.set(15, 9.5, 1);
  group.add(halo);

  for (let ray = 0; ray < 12; ray += 1) {
    const length = 2.4 + pseudoRandom(ray + 44) * 3.4;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(.012, .05, length, 5),
      new THREE.MeshBasicMaterial({ color: ray % 3 ? color : 0xffffff, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    const angle = (ray / 12) * Math.PI * 2;
    beam.position.set(-1.5 + Math.cos(angle) * length * .5, -.85 + Math.sin(angle) * length * .42, 1.05);
    beam.rotation.z = angle + Math.PI / 2;
    beam.userData.flicker = { base: .3, amp: .5, speed: 2.2 + pseudoRandom(ray) * 2.4, phase: ray * 1.7 };
    floatingObjects.push(beam);
    group.add(beam);
  }

  const orbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.4, .03, 6, 80),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  orbitRing.rotation.x = Math.PI / 2.25;
  orbitRing.userData.rotationSpeed = .3;
  group.add(orbitRing);
  orbitalObjects.push(orbitRing);

  const cloudLight = new THREE.PointLight(0x9fdcff, 26, 16, 2);
  cloudLight.position.set(-1.2, -.6, 1.2);
  group.add(cloudLight);
  return group;
}

function makeRiverSectionLabel(title, subtitle, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 640; canvas.height = 150;
  const context = canvas.getContext('2d');
  const accent = `#${new THREE.Color(color).getHexString()}`;
  context.fillStyle = 'rgba(1, 10, 22, .86)';
  context.strokeStyle = accent;
  context.lineWidth = 3;
  context.shadowColor = accent; context.shadowBlur = 8;
  context.beginPath(); context.roundRect(14, 12, 612, 124, 16); context.fill(); context.stroke();
  context.shadowBlur = 0;
  context.textAlign = 'center'; context.fillStyle = '#eafaff'; context.font = '800 36px Segoe UI, Arial';
  context.fillText(title, 320, 65);
  context.fillStyle = accent; context.font = '700 16px Segoe UI, Arial';
  context.fillText(subtitle, 320, 102);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  sprite.material.opacity = .88;
  sprite.scale.set(7.35, 1.72, 1);
  return sprite;
}

function makeRiverMarker(symbol, label, color, shape = 'circle') {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  const accent = `#${new THREE.Color(color).getHexString()}`;
  context.strokeStyle = accent; context.lineWidth = 8; context.lineJoin = 'round';
  context.shadowColor = accent; context.shadowBlur = 24;
  if (shape === 'triangle') {
    context.beginPath();
    context.moveTo(128, 40); context.lineTo(190, 156); context.lineTo(66, 156); context.closePath();
    context.stroke();
    context.fillStyle = 'rgba(255,60,78,.14)'; context.fill();
  } else if (shape === 'ring') {
    context.beginPath(); context.arc(128, 104, 56, 0, Math.PI * 2); context.stroke();
    context.lineWidth = 3;
    context.beginPath(); context.arc(128, 104, 70, 0, Math.PI * 2); context.stroke();
    context.lineWidth = 8;
  } else {
    context.beginPath(); context.arc(128, 104, 52, 0, Math.PI * 2); context.stroke();
  }
  context.shadowBlur = 0; context.fillStyle = accent; context.textAlign = 'center';
  const symbolY = shape === 'triangle' ? 140 : 128;
  context.font = symbol.length > 1 ? '800 42px Segoe UI' : '900 68px Segoe UI'; context.fillText(symbol, 128, symbolY);
  context.font = '700 17px Segoe UI'; context.fillText(label, 128, 212);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sprite.scale.set(3.2, 3.2, 1);
  return sprite;
}

function makeHoloPanel({ title, color, seed, width = 480, height = 300 }) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d');
  const accent = `#${new THREE.Color(color).getHexString()}`;
  context.strokeStyle = accent; context.globalAlpha = .9; context.lineWidth = 2;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.lineWidth = 5;
  [[10, 10, 1, 1], [width - 10, 10, -1, 1], [10, height - 10, 1, -1], [width - 10, height - 10, -1, -1]].forEach(([x, y, dx, dy]) => {
    context.beginPath();
    context.moveTo(x + dx * 30, y); context.lineTo(x, y); context.lineTo(x, y + dy * 30);
    context.stroke();
  });
  context.lineWidth = 2;
  context.fillStyle = accent;
  context.font = '800 24px Segoe UI, Arial'; context.textAlign = 'left';
  context.fillText(title, 30, 46);
  context.fillRect(30, 58, width - 60, 2);
  context.globalAlpha = .75;
  for (let trace = 0; trace < 9; trace += 1) {
    let x = 30 + pseudoRandom(seed + trace) * (width - 120);
    let y = 80 + pseudoRandom(seed + trace + 9) * (height - 120);
    context.beginPath(); context.moveTo(x, y);
    for (let s = 0; s < 3; s += 1) {
      const length = 24 + pseudoRandom(seed + trace * 3 + s) * 70;
      if (pseudoRandom(seed + trace + s + 20) > .5) x = clamp(x + (pseudoRandom(seed + s) > .5 ? 1 : -1) * length, 24, width - 24);
      else y = clamp(y + (pseudoRandom(seed + s + 4) > .5 ? 1 : -1) * length, 70, height - 24);
      context.lineTo(x, y);
    }
    context.stroke();
    context.beginPath(); context.arc(x, y, 4, 0, Math.PI * 2); context.fill();
  }
  for (let bar = 0; bar < 6; bar += 1) {
    const barHeight = 12 + pseudoRandom(seed + bar + 40) * 44;
    context.fillRect(34 + bar * 20, height - 34 - barHeight, 11, barHeight);
  }
  context.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sprite.scale.set(width / 88, height / 88, 1);
  return sprite;
}

function riverColorFor(route, index) {
  if (route.anomalyCount && index % 17 === 0) return COLORS.red;
  if (route.priority === 'Critical' && index % 11 === 0) return COLORS.yellow;
  if ((route.sourceType === 'AI' || route.destinationType === 'AI') && index % 4 === 0) return COLORS.purple;
  if (route.connectionStatus === 'Connected' && route.index % 6 === 0 && index % 13 === 0) return COLORS.green;
  return index % 5 === 0 || route.speed > 540 ? COLORS.cyan : COLORS.blue;
}

function makeDenseRiverCurve(index, route, predicted = false) {
  const sourceSlot = index % 6;
  const lane = Math.floor(index / 6);
  const laneOffset = (lane % 26 - 12.5) * .07;
  const wave = (pseudoRandom(index + 31) * 2 - 1) * .55;
  const sourceZ = -8 + sourceSlot * 3.05 + laneOffset;
  const sourceY = 2.35 + (sourceSlot % 3) * .85 + pseudoRandom(index + 6) * .72;
  const toCloud = index % 6 !== 0;
  const destination = toCloud
    ? new THREE.Vector3(18.7 + pseudoRandom(index + 9) * 1.4, 7.25 + laneOffset * .18, 3.25 + laneOffset * .5)
    : new THREE.Vector3(15.1 + (index % 4) * 1.8, 2.2 + (index % 3) * 1.1, -4.5 + (index % 5) * 2.0);
  if (predicted) {
    destination.y = 2.6 + pseudoRandom(index + 3) * 2.2;
    destination.z = 6.7 + laneOffset;
  }
  const points = [
    new THREE.Vector3(-21.2 + pseudoRandom(index) * 3.6, sourceY, sourceZ),
    new THREE.Vector3(-14.2, 3.45 + (sourceSlot % 3) * .68 + wave, sourceZ * .72 + wave),
    new THREE.Vector3(-7.5, 4.65 + (sourceSlot % 3) * .82 - wave, -3.1 + sourceSlot * 1.08 + laneOffset),
    new THREE.Vector3(-.8, 4.05 + (sourceSlot % 4) * .58 + wave, 1.15 * Math.sin(sourceSlot * .9) + laneOffset),
    new THREE.Vector3(6.4, 4.85 + (sourceSlot % 3) * .68 + wave, 1.25 + sourceSlot * .58 + laneOffset),
    new THREE.Vector3(12.6, destination.y - .85 + pseudoRandom(index + 14) * 1.15, destination.z * .68 + wave),
    destination,
  ];
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', .72);
}

function buildFlowRiver() {
  interactiveObjects = interactiveObjects.filter((object) => object.userData.owner?.kind !== 'riverConnection');
  riverMaterials = [];
  riverParticles = [];
  riverPredictedParticles = [];
  animatedRouteMaterials = animatedRouteMaterials.filter((material) => !['river', 'riverPredicted'].includes(material.userData.flowLayer));
  disposeGroup(riverCurrentLayer);
  disposeGroup(riverPredictedLayer);

  const visibleRoutes = state.routeStats.filter(routeVisible);
  if (!visibleRoutes.length) return;
  const strandCounts = { performance: 70, balanced: 130, cinematic: 190 };
  const strandCount = strandCounts[state.renderQuality];
  const pointsPerStrand = state.renderQuality === 'performance' ? 46 : state.renderQuality === 'cinematic' ? 76 : 62;
  const beadStrands = [];

  for (let index = 0; index < strandCount; index += 1) {
    const route = visibleRoutes[index % visibleRoutes.length];
    const curve = makeDenseRiverCurve(index, route, false);
    const color = riverColorFor(route, index);
    beadStrands.push({ curve, color, speed: .042 + route.speed / 8600 + pseudoRandom(index + 51) * .02 });
    const points = curve.getPoints(pointsPerStrand);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('aT', new THREE.Float32BufferAttribute(points.map((_, pointIndex) => pointIndex / (points.length - 1)), 1));
    const opacity = color === COLORS.blue ? .105 + pseudoRandom(index + 2) * .075 : color === COLORS.cyan ? .18 : .24;
    const line = new THREE.Line(geometry, makeRiverLineMaterial(color, pseudoRandom(index) * Math.PI * 2, .32 + route.speed / 920, opacity));
    riverCurrentLayer.add(line);

    if (index % 9 === 0) {
      const radius = .018 + clamp(route.bandwidth / 2600, .012, .038);
      const tube = own(new THREE.Mesh(
        new THREE.TubeGeometry(curve, 58, radius, 5, false),
        makeFlowShaderMaterial(color, .6 + route.speed / 680, .5, 'river'),
      ), route.key, 'riverConnection');
      tube.userData.route = route;
      riverCurrentLayer.add(tube);
    }

    const particleFrequency = state.renderQuality === 'performance' ? 3 : 1;
    if (index % particleFrequency === 0) {
      const size = .07 + pseudoRandom(index + 12) * .12 + clamp(route.volume / 3600, 0, .12);
      const particle = makeLightParticle(color, size, .92);
      const phase = pseudoRandom(index + 20);
      particle.position.copy(curve.getPoint(phase));
      riverCurrentLayer.add(particle);
      riverParticles.push({ object: particle, trails: [], curve, phase, speed: .038 + route.speed / 7200 });
      if (state.renderQuality !== 'performance' && index % 4 === 0) {
        const second = makeLightParticle(color, size * .72, .68);
        const secondPhase = (phase + .43) % 1;
        second.position.copy(curve.getPoint(secondPhase));
        riverCurrentLayer.add(second);
        riverParticles.push({ object: second, trails: [], curve, phase: secondPhase, speed: .038 + route.speed / 7200 });
      }
    }
  }

  const projectedCount = state.renderQuality === 'performance' ? 8 : state.renderQuality === 'cinematic' ? 20 : 14;
  for (let index = 0; index < projectedCount; index += 1) {
    const route = visibleRoutes[(index * 3) % visibleRoutes.length];
    const curve = makeDenseRiverCurve(index + 230, route, true);
    const points = curve.getPoints(54);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    geometry.setAttribute('aT', new THREE.Float32BufferAttribute(points.map((_, pointIndex) => pointIndex / (points.length - 1)), 1));
    const line = new THREE.Line(geometry, makeRiverLineMaterial(index % 5 === 0 ? COLORS.cyan : COLORS.purple, pseudoRandom(index + 80) * 6, .48, .14, 'riverPredicted'));
    riverPredictedLayer.add(line);
    if (index % 3 === 0) {
      const particle = makeLightParticle(COLORS.purple, .1, .5);
      const phase = pseudoRandom(index + 121);
      particle.position.copy(curve.getPoint(phase));
      riverPredictedLayer.add(particle);
      riverPredictedParticles.push({ object: particle, trails: [], curve, phase, speed: .045 });
    }
  }

  buildHighlightRoutes(beadStrands);
  buildBeadStreams(beadStrands);
  updateVisibleCounters();
}

function buildHighlightRoutes(beadStrands) {
  const highlightRoutes = [
    { color: COLORS.green, speed: .05, beads: 16, size: 2, points: [[-16, 1.7, 8.6], [-7, 2.3, 9.8], [3, 2.5, 10.2], [11, 2.7, 8.9], [17.3, 2.5, 5.6]] },
    { color: COLORS.yellow, speed: .045, beads: 14, size: 1.9, points: [[-18.5, 2.3, 4.6], [-9, 3.3, 4.2], [-1, 3.5, 6], [7, 3.4, 7.2], [14.6, 4.8, 5.4]] },
    { color: COLORS.red, speed: .04, beads: 8, size: 1.8, points: [[-20.5, 3.2, -4.2], [-14.5, 4.3, -2.6], [-9.5, 4.9, -1.3], [-5, 4.7, .3]] },
  ];
  highlightRoutes.forEach((routeConfig, routeIndex) => {
    const curve = new THREE.CatmullRomCurve3(routeConfig.points.map((point) => new THREE.Vector3(...point)), false, 'catmullrom', .6);
    const samples = curve.getPoints(60);
    const geometry = new THREE.BufferGeometry().setFromPoints(samples);
    geometry.setAttribute('aT', new THREE.Float32BufferAttribute(samples.map((_, pointIndex) => pointIndex / (samples.length - 1)), 1));
    riverCurrentLayer.add(new THREE.Line(geometry, makeRiverLineMaterial(routeConfig.color, routeIndex * 2.1, .4, .5)));
    const glowTube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, .09, 6, false),
      new THREE.MeshBasicMaterial({ color: routeConfig.color, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );
    riverCurrentLayer.add(glowTube);
    const junctionCount = routeConfig.points.length + 2;
    for (let junction = 0; junction <= junctionCount; junction += 1) {
      const dot = makeLightParticle(routeConfig.color, .17, .95);
      dot.position.copy(curve.getPoint(junction / junctionCount));
      riverCurrentLayer.add(dot);
    }
    beadStrands.push({ curve, color: routeConfig.color, speed: routeConfig.speed, beads: routeConfig.beads, size: routeConfig.size });
  });
}

function buildBeadStreams(strands) {
  if (!strands.length) return;
  const SAMPLES = 96;
  const rows = strands.length;
  const data = new Float32Array(SAMPLES * rows * 4);
  strands.forEach((strand, row) => {
    const points = strand.curve.getPoints(SAMPLES - 1);
    for (let i = 0; i < SAMPLES; i += 1) {
      const offset = (row * SAMPLES + i) * 4;
      data[offset] = points[i].x; data[offset + 1] = points[i].y; data[offset + 2] = points[i].z; data[offset + 3] = 1;
    }
  });
  beadTexture?.dispose();
  beadTexture = new THREE.DataTexture(data, SAMPLES, rows, THREE.RGBAFormat, THREE.FloatType);
  beadTexture.magFilter = THREE.NearestFilter;
  beadTexture.minFilter = THREE.NearestFilter;
  beadTexture.needsUpdate = true;

  const defaultBeads = state.renderQuality === 'performance' ? 10 : state.renderQuality === 'cinematic' ? 26 : 18;
  let total = 0;
  strands.forEach((strand) => { total += strand.beads || defaultBeads; });

  const positions = new Float32Array(total * 3);
  const rowAttr = new Float32Array(total);
  const offsetAttr = new Float32Array(total);
  const speedAttr = new Float32Array(total);
  const sizeAttr = new Float32Array(total);
  const seedAttr = new Float32Array(total);
  const colorAttr = new Float32Array(total * 3);
  const white = new THREE.Color(0xffffff);
  let cursor = 0;
  strands.forEach((strand, row) => {
    const beadCount = strand.beads || defaultBeads;
    const baseColor = new THREE.Color(strand.color);
    for (let bead = 0; bead < beadCount; bead += 1) {
      rowAttr[cursor] = row;
      offsetAttr[cursor] = (bead / beadCount) + pseudoRandom(row * 91 + bead) * (.65 / beadCount);
      speedAttr[cursor] = strand.speed * (0.86 + pseudoRandom(row + bead * 17) * .3);
      sizeAttr[cursor] = (strand.size || (.55 + pseudoRandom(row * 3 + bead) * .6)) * (0.85 + pseudoRandom(bead * 7 + row) * .3);
      seedAttr[cursor] = pseudoRandom(row * 13 + bead * 5);
      const tint = baseColor.clone().lerp(white, pseudoRandom(bead + row * 2) * .3);
      colorAttr[cursor * 3] = tint.r; colorAttr[cursor * 3 + 1] = tint.g; colorAttr[cursor * 3 + 2] = tint.b;
      cursor += 1;
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRow', new THREE.BufferAttribute(rowAttr, 1));
  geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsetAttr, 1));
  geometry.setAttribute('aSpeed', new THREE.BufferAttribute(speedAttr, 1));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizeAttr, 1));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seedAttr, 1));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colorAttr, 3));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, 0), 60);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPath: { value: beadTexture },
      uSamples: { value: SAMPLES },
      uRows: { value: rows },
      uScale: { value: renderer.getPixelRatio() * 330 },
    },
    vertexShader: `
      uniform sampler2D uPath;
      uniform float uTime;
      uniform float uSamples;
      uniform float uRows;
      uniform float uScale;
      attribute float aRow;
      attribute float aOffset;
      attribute float aSpeed;
      attribute float aSize;
      attribute float aSeed;
      attribute vec3 aColor;
      varying vec3 vColor;
      varying float vFade;
      vec3 pathPoint(float row, float t) {
        float f = t * (uSamples - 1.0);
        float i0 = floor(f);
        float fr = f - i0;
        float y = (row + 0.5) / uRows;
        vec3 p0 = texture2D(uPath, vec2((i0 + 0.5) / uSamples, y)).xyz;
        vec3 p1 = texture2D(uPath, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, y)).xyz;
        return mix(p0, p1, fr);
      }
      void main() {
        float t = fract(aOffset + uTime * aSpeed);
        vec3 p = pathPoint(aRow, t);
        float twinkle = 0.76 + 0.4 * sin(uTime * (3.0 + aSeed * 5.0) + aSeed * 41.0);
        vFade = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t)) * twinkle;
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = aSize * uScale / max(1.0, -mv.z);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vFade;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float d = length(uv) * 2.0;
        float glow = pow(max(0.0, 1.0 - d), 2.6);
        float core = pow(max(0.0, 1.0 - d * 1.9), 5.0);
        vec3 col = vColor * glow * 1.5 + vec3(1.0) * core * 0.9;
        float alpha = (glow * 0.85 + core) * vFade;
        if (alpha < 0.012) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  material.userData.riverLayer = 'beads';
  riverMaterials.push(material);
  state.beadCount = total;
  riverCurrentLayer.add(new THREE.Points(geometry, material));
}

function splatQualityFactor() {
  return state.renderQuality === 'performance' ? .55 : state.renderQuality === 'cinematic' ? 1.6 : 1;
}

function buildSplatScene() {
  interactiveObjects = interactiveObjects.filter((object) => object.userData.owner?.kind !== 'splatNode');
  splatMaterials = splatMaterials.filter((material) => !material.userData.splatStatic);
  disposeGroup(splatStaticLayer);
  const quality = splatQualityFactor();

  const environmentCloud = createSplatCloud(environmentSplats(quality), { intensity: 1 });
  environmentCloud.userData.slowSpin = .014;
  environmentCloud.material.userData.splatStatic = true;
  splatMaterials.push(environmentCloud.material);
  splatStaticLayer.add(environmentCloud);

  const infrastructure = [];
  NODE_CONFIG.forEach((config) => infrastructure.push(...nodeSplats(config, quality)));
  const infrastructureCloud = createSplatCloud(infrastructure, { intensity: 1.18 });
  infrastructureCloud.material.userData.splatStatic = true;
  splatMaterials.push(infrastructureCloud.material);
  splatStaticLayer.add(infrastructureCloud);

  NODE_CONFIG.forEach((config) => {
    const label = makeLabel(config.id, config.type, 0, config.color);
    label.position.set(config.position[0], nodeVisualHeight(config.type) + 1.35, config.position[2]);
    splatStaticLayer.add(label);
    const proxy = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 8, 6),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    proxy.userData.owner = { kind: 'splatNode', id: config.id };
    interactiveObjects.push(proxy);
    proxy.position.set(config.position[0], 2.2, config.position[2]);
    splatStaticLayer.add(proxy);
  });
}

function buildSplatFlows() {
  splatMaterials = splatMaterials.filter((material) => !material.userData.splatFlow);
  disposeGroup(splatFlowLayer);
  disposeGroup(splatPredictedLayer);
  const quality = splatQualityFactor();

  const flowSplats = [];
  let visibleCount = 0;
  state.routeStats.forEach((route) => {
    if (!routeVisible(route)) return;
    const curve = makeCurve(route.source, route.destination, route.index);
    if (!curve) return;
    visibleCount += 1;
    const color = flowColor(route);
    const count = Math.round((60 + clamp(route.volume / 5, 20, 110)) * quality);
    curveSplats(flowSplats, route.index * 31 + 7, curve, {
      color, count, opacity: .5,
      splat: .14 + clamp(route.bandwidth / 950, .02, .09),
      jitter: .18,
    });
  });
  state.splatFlowCount = visibleCount;
  state.splatCount = flowSplats.length;
  if (flowSplats.length) {
    const flowCloud = createSplatCloud(flowSplats, { intensity: 1.3 });
    flowCloud.material.userData.splatFlow = true;
    splatMaterials.push(flowCloud.material);
    splatFlowLayer.add(flowCloud);
  }

  const predictedPath = state.ml?.predictive_flow?.predicted || ['Server-01', 'API-Gateway', 'Server-04', 'Database-02'];
  const predictedSplats = [];
  for (let index = 0; index < predictedPath.length - 1; index += 1) {
    const curve = makeCurve(predictedPath[index], predictedPath[index + 1], index + 1);
    if (!curve) continue;
    curveSplats(predictedSplats, index * 53 + 11, curve, {
      color: COLORS.purple, count: Math.round(110 * quality), opacity: .42, splat: .16, jitter: .28, headColor: 0xd9c2ff,
    });
  }
  if (predictedSplats.length) {
    const predictedCloud = createSplatCloud(predictedSplats, { intensity: 1.15 });
    predictedCloud.material.userData.splatFlow = true;
    splatMaterials.push(predictedCloud.material);
    splatPredictedLayer.add(predictedCloud);
  }
  state.splatCount += predictedSplats.length;
  updateVisibleCounters();
}

function setVisualizationMode(mode, moveCamera = true) {
  if (mode !== 'city') exitRouteFocus({ restoreCamera: false });
  if (mode !== 'city') exitSystemFlow({ resetCamera: false });
  if (mode !== 'city' && state.storyActive && situationStory.state !== 'loading') enterExploreMode();
  state.visualMode = mode;
  const isRiver = mode === 'river';
  const isCity = mode === 'city';
  const isSplat = mode === 'splat';
  const wasImmersive = document.body.classList.contains('immersive');
  document.body.classList.toggle('physical-twin', isCity);
  document.body.classList.toggle('immersive', isCity);
  if (!isCity) { document.body.classList.remove('drawer-left-open', 'drawer-right-open'); $('#hud-menu').classList.remove('active'); $('#hud-ai').classList.remove('active'); }
  $('#scene-container').classList.toggle('physical-mode', isCity);
  riverArchitectureLayer.visible = isRiver;
  riverCurrentLayer.visible = isRiver && state.layers.current;
  riverPredictedLayer.visible = isRiver && state.layers.predicted;
  nodeLayer.visible = isCity;
  cityEnvironmentLayer.visible = isCity;
  if (cloudFxLayer) cloudFxLayer.visible = isCity;
  applyFlowVisibility();
  splatStaticLayer.visible = isSplat;
  splatFlowLayer.visible = isSplat && state.layers.current;
  splatPredictedLayer.visible = isSplat && state.layers.predicted;
  atmosphereLayer.visible = !isSplat && !isCity;
  $$('#view-switch button').forEach((button) => button.classList.toggle('active', button.dataset.view === mode));
  $('#stage-eyebrow').textContent = isRiver ? '3D BLUE FLOW IN ACTION' : isSplat ? 'VOLUMETRIC RADIANCE FIELD' : 'DIGITAL OPERATIONS TWIN';
  $('#stage-title').textContent = isRiver ? 'Live Data River' : isSplat ? 'Gaussian Splat Twin' : 'Live Network Topology';
  $('#render-mode-label').textContent = isRiver ? 'DENSE FIBER ENGINE' : isSplat ? 'GAUSSIAN SPLAT ENGINE' : 'PHYSICAL TWIN ENGINE';
  atmosphereLayer.traverse((object) => {
    if (object.userData.riverBackdrop) object.visible = isRiver;
  });
  // Night-time harbour atmosphere for the island city; holographic void for the other modes.
  const { fast } = cityQuality();
  scene.background.setHex(isCity ? 0x060c18 : 0x01050d);
  scene.fog.color.setHex(isCity ? 0x0b1a2e : 0x020914);
  scene.fog.density = isCity ? (fast ? .0052 : .0045) : .0125;
  renderer.toneMappingExposure = isCity ? 1.0 : 1.04;
  camera.fov = isCity ? 54 : 44;
  camera.far = isCity ? 900 : 220;
  camera.updateProjectionMatrix();
  controls.minDistance = isCity ? 18 : 15;
  controls.maxDistance = isCity ? 240 : isSplat ? 140 : 66;
  controls.autoRotate = !isRiver;
  if (moveCamera) {
    cameraGoal = isRiver
      ? { position: new THREE.Vector3(0, 18.5, 44), target: new THREE.Vector3(0, 3.4, .8) }
      : isSplat
        ? { position: new THREE.Vector3(0, 46, 100), target: new THREE.Vector3(2, 3, -12) }
        : cityCameraView();
    markCameraPreset('perspective');
  }
  applyModeLighting();
  updateVisibleCounters();
  if (wasImmersive !== isCity) scheduleSceneResize();
}

function applyModeLighting() {
  const isCity = state.visualMode === 'city';
  const isSplat = state.visualMode === 'splat';
  riverLights.forEach((light) => { light.visible = !isCity; });
  scene.traverse((object) => {
    const accent = object.userData.modeAccent;
    if (accent && object.isLight) {
      object.intensity = isCity ? accent.city : accent.river;
      object.userData.baseIntensity = object.intensity;
    }
  });
  if (!bloomPass) return;
  if (isCity) {
    bloomPass.strength = clamp(state.bloomStrength * .68, .3, .95);
    bloomPass.threshold = .72;
    bloomPass.radius = state.renderQuality === 'performance' ? .24 : state.renderQuality === 'cinematic' ? .38 : .32;
    return;
  }
  bloomPass.strength = state.bloomStrength * (isSplat ? .88 : 1);
  bloomPass.threshold = isSplat ? .3 : .38;
  bloomPass.radius = state.renderQuality === 'performance' ? .28 : state.renderQuality === 'cinematic' ? .52 : .42;
}

function updateVisibleCounters() {
  if (state.visualMode === 'splat') {
    $('#visible-flows').textContent = state.splatFlowCount || 0;
    $('#particle-count').textContent = formatNumber(state.splatCount || 0);
  } else if (state.visualMode === 'river') {
    $('#visible-flows').textContent = riverMaterials.filter((material) => material.userData.riverLayer === 'river').length;
    $('#particle-count').textContent = formatNumber(riverParticles.length + riverPredictedParticles.length + (state.beadCount || 0));
  } else {
    $('#visible-flows').textContent = currentLayer.children.filter((object) => object.userData.owner?.kind === 'connection').length;
    $('#particle-count').textContent = particles.length + predictedParticles.length;
  }
}

function bindSceneInteraction() {
  const container = $('#scene-container');
  container.addEventListener('pointermove', (event) => {
    setPointer(event);
    const hit = pickObject();
    const tooltip = $('#scene-tooltip');
    if (!hit) {
      tooltip.hidden = true;
      renderer.domElement.style.cursor = 'grab';
      return;
    }
    const owner = hit.object.userData.owner;
    tooltip.hidden = false;
    tooltip.style.left = `${event.clientX - container.getBoundingClientRect().left}px`;
    tooltip.style.top = `${event.clientY - container.getBoundingClientRect().top}px`;
    tooltip.textContent = owner.kind === 'node' || owner.kind === 'splatNode' ? `${owner.id} · click to inspect` : `${owner.id.replace('→', ' → ')} · click route`;
    renderer.domElement.style.cursor = 'pointer';
  });
  container.addEventListener('pointerleave', () => { $('#scene-tooltip').hidden = true; });
  container.addEventListener('click', (event) => {
    if (event.target.closest('button, aside, section, .route-ribbon')) return;
    setPointer(event);
    const hit = pickObject();
    if (!hit) { if (routeFocus.active && !routeFocus.pinned && !routeFocus.follow) exitRouteFocus(); return; }
    const owner = hit.object.userData.owner;
    if (owner.kind === 'node' || owner.kind === 'splatNode') showNodeDetails(owner.id);
    else showConnectionDetails(hit.object.userData.route || state.routeStats.find((route) => route.key === owner.id));
  });
}

function setPointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function pickObject() {
  raycaster.setFromCamera(pointer, camera);
  const visibleObjects = interactiveObjects.filter((object) => {
    let current = object;
    while (current) {
      if (!current.visible) return false;
      current = current.parent;
    }
    return true;
  });
  return raycaster.intersectObjects(visibleObjects, false)[0] || null;
}

function showNodeDetails(id) {
  const stat = state.nodeStats.get(id);
  if (!stat) return;
  exitRouteFocus();
  $('#selection-kind').textContent = `${stat.type.toUpperCase()} · ${stat.department.toUpperCase()}`;
  $('#selection-title').textContent = id;
  const status = $('#selection-status');
  status.textContent = stat.health.toUpperCase();
  status.className = `status-pill ${stat.health === 'Critical' ? 'critical' : stat.health === 'Watch' ? 'warning' : 'healthy'}`;
  const values = [
    ['INCOMING TRAFFIC', `${formatCompact(stat.incomingTraffic)} MB`],
    ['OUTGOING TRAFFIC', `${formatCompact(stat.outgoingTraffic)} MB`],
    ['NETWORK LOAD', `${formatNumber(stat.load, 1)}%`],
    ['AVG LATENCY', `${formatNumber(stat.latency, 1)} ms`],
    ['CONNECTIONS', formatNumber(stat.connections)],
    ['RESPONSE TIME', `${formatNumber(stat.responseTime, 1)} ms`],
    ['THREAT LEVEL', stat.threat],
    ['ANOMALIES', stat.anomalyCount],
  ];
  $('#selection-grid').innerHTML = values.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
  $('#selection-panel').classList.add('open');
  focusNode(id);
}

function showConnectionDetails(route) {
  if (!route) return;
  if (state.visualMode === 'city' && !state.storyActive) { enterRouteFocus(route); return; }
  $('#selection-kind').textContent = 'CONNECTION INSPECTOR';
  $('#selection-title').textContent = `${route.source} → ${route.destination}`;
  const critical = route.anomalyCount > 0 || route.routeStatus === 'Congested';
  const status = $('#selection-status');
  status.textContent = critical ? route.anomalyStatus.toUpperCase() : route.routeStatus.toUpperCase();
  status.className = `status-pill ${critical ? 'critical' : 'healthy'}`;
  const values = [
    ['SOURCE', route.source], ['DESTINATION', route.destination],
    ['DATA VOLUME', `${formatNumber(route.volume, 1)} MB`], ['TRANSFER SPEED', `${formatNumber(route.speed, 1)} Mbps`],
    ['LATENCY', `${formatNumber(route.latency, 1)} ms`], ['PACKET LOSS', `${formatNumber(route.packetLoss, 2)}%`],
    ['BANDWIDTH', `${formatNumber(route.bandwidth, 1)}%`], ['ROUTE STATUS', route.routeStatus],
  ];
  $('#selection-grid').innerHTML = values.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('');
  $('#selection-panel').classList.add('open');
}

function focusNode(id) {
  const node = nodeObjects.get(id);
  if (!node) return;
  controls.autoRotate = false;
  const target = node.position.clone();
  const offset = state.visualMode === 'city' ? new THREE.Vector3(18, 20, 30) : new THREE.Vector3(7, 9, 11);
  cameraGoal = { target: target.clone().add(new THREE.Vector3(0, state.visualMode === 'city' ? 4 : 1.4, 0)), position: target.clone().add(offset) };
}

function populateDashboard() {
  const metrics = state.ml.metrics;
  const criticalRoutes = state.routeStats.filter((route) => route.anomalyCount > 0 && (route.networkLoad > 60 || route.latency > 70)).length;
  const health = clamp(Math.round(100 - metrics.average_network_load_percent * .18 - metrics.average_packet_loss_percent * 1.2 - metrics.anomalies * .28), 45, 99);
  $('#metric-traffic').textContent = `${formatCompact(metrics.total_data_volume_mb)} MB`;
  $('#metric-latency').textContent = `${formatNumber(metrics.average_latency_ms, 1)} ms`;
  $('#latency-trend').textContent = metrics.average_latency_ms < 80 ? 'within normal range' : 'attention needed';
  $('#metric-bandwidth').textContent = `${formatNumber(metrics.average_bandwidth_usage_percent, 1)}%`;
  $('#metric-load').textContent = `${formatNumber(metrics.average_network_load_percent, 1)}%`;
  $('#metric-connections').textContent = formatNumber(metrics.active_connections);
  $('#metric-anomalies').textContent = formatNumber(metrics.anomalies);
  $('#metric-routes').textContent = criticalRoutes;
  $('#metric-health').textContent = `${health}%`;
  $('#metric-health').parentElement.style.setProperty('--health', `${health}%`);
  $('#health-label').textContent = health >= 84 ? 'HEALTHY' : health >= 70 ? 'STABLE' : 'AT RISK';
  updateHudChips(metrics, health);
  $('#api-traffic').textContent = formatCompact(metrics.api_traffic);
  $('#db-traffic').textContent = formatCompact(metrics.database_traffic);
  $('#ai-traffic').textContent = formatCompact(metrics.ai_traffic);
  $('#packet-loss').textContent = `${formatNumber(metrics.average_packet_loss_percent, 2)}%`;
  $('#record-count').textContent = formatNumber(state.ml.records_analyzed || state.data.length);
  $('#analysis-time').textContent = new Date(state.ml.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const predictions = state.ml.predictions.slice(0, 3);
  $('#prediction-list').innerHTML = predictions.map((prediction) => {
    const riskClass = prediction.risk.toLowerCase();
    const change = Number(prediction.traffic_change_percent || 0);
    return `<article class="prediction-item"><span class="prediction-glyph">⌁</span><div><strong>${prediction.node} ${change >= 0 ? 'traffic may rise' : 'traffic may fall'} ${Math.abs(change).toFixed(1)}%</strong><small>Projected load ${formatNumber(prediction.predicted.network_load_percent, 1)}% · latency ${formatNumber(prediction.predicted.latency_ms, 0)} ms</small></div><span class="risk-badge ${riskClass}">${prediction.risk.toUpperCase()}</span></article>`;
  }).join('');

  const recommendations = state.ml.recommendations.slice(0, 4);
  $('#recommend-count').textContent = recommendations.length;
  $('#recommendation-list').innerHTML = recommendations.map((item) => `<article class="recommendation-item ${item.severity.toLowerCase()}"><b>${item.action}</b><small>${item.reason}</small></article>`).join('');

  const situation = state.situation;
  const alertPanel = $('#alert-panel');
  if (situation?.anomaly?.detected) {
    $('#alert-title').textContent = situation.anomaly.type;
    $('#alert-route').textContent = `${situation.record.source_id} → ${situation.record.destination_id} · ${formatNumber(situation.record.latency_ms, 0)} ms`;
    alertPanel.hidden = false;
  } else {
    alertPanel.hidden = true;
  }
  $('#alerts-list').innerHTML = state.ml.alerts.map((alert) => `<article class="alert-row"><div><strong>${alert.type}</strong><p>${alert.source} → ${alert.destination}</p><small>${alert.recommendation}</small></div><div class="alert-numbers">Latency ${formatNumber(alert.latency_ms, 0)} ms<br>Load ${formatNumber(alert.network_load_percent, 0)}%<br>Loss ${formatNumber(alert.packet_loss_percent, 1)}%</div></article>`).join('');
  buildForecastChart();
}

function buildForecastChart() {
  if (!window.Chart) return;
  const forecast = state.ml.forecast;
  const labels = forecast.map((point) => new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const firstPredicted = forecast.findIndex((point) => point.kind === 'predicted');
  const historical = forecast.map((point) => point.kind === 'historical' ? point.traffic : null);
  const predicted = forecast.map((point, index) => point.kind === 'predicted' || index === firstPredicted - 1 ? point.traffic : null);
  const context = $('#forecast-chart').getContext('2d');
  const gradient = context.createLinearGradient(0, 0, 0, 150);
  gradient.addColorStop(0, 'rgba(57,231,255,.24)'); gradient.addColorStop(1, 'rgba(57,231,255,0)');
  forecastChart?.destroy();
  forecastChart = new window.Chart(context, {
    type: 'line',
    data: { labels, datasets: [
      { data: historical, borderColor: '#39e7ff', backgroundColor: gradient, fill: true, borderWidth: 1.5, pointRadius: 0, tension: .38, spanGaps: false },
      { data: predicted, borderColor: '#a45dff', backgroundColor: 'transparent', borderDash: [5, 4], borderWidth: 1.5, pointRadius: 2, pointBackgroundColor: '#a45dff', tension: .38, spanGaps: false },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 700 }, interaction: { intersect: false, mode: 'index' },
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#061728', borderColor: '#245879', borderWidth: 1, titleColor: '#dff7ff', bodyColor: '#8ca8ba', displayColors: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#48677e', maxTicksLimit: 6, font: { size: 7 } }, border: { color: 'rgba(77,140,184,.18)' } },
        y: { grid: { color: 'rgba(77,140,184,.10)' }, ticks: { color: '#48677e', maxTicksLimit: 4, font: { size: 7 }, callback: (value) => formatCompact(value) }, border: { display: false } },
      },
    },
  });
}

function populateFilters() {
  const departments = [...new Set(NODE_CONFIG.map((node) => node.department))].sort();
  $('#department-filter').insertAdjacentHTML('beforeend', departments.map((department) => `<option>${department}</option>`).join(''));
}

function drawSparkline(id, values, color) {
  const canvas = $(`#${id}`);
  if (!canvas || !values.length) return;
  const context = canvas.getContext('2d');
  const width = canvas.width; const height = canvas.height;
  context.clearRect(0, 0, width, height);
  const min = Math.min(...values); const max = Math.max(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => [4 + (index / Math.max(values.length - 1, 1)) * (width - 8), height - 3 - ((value - min) / span) * (height - 7)]);
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, `${color}55`); gradient.addColorStop(1, `${color}00`);
  context.beginPath();
  points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.lineTo(points.at(-1)[0], height); context.lineTo(points[0][0], height); context.closePath();
  context.fillStyle = gradient; context.fill();
  context.beginPath();
  points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
  context.strokeStyle = color; context.lineWidth = 1.4; context.lineJoin = 'round'; context.stroke();
  context.fillStyle = color;
  context.beginPath(); context.arc(points.at(-1)[0], points.at(-1)[1], 1.8, 0, Math.PI * 2); context.fill();
}

function updateHudChips(metrics, health) {
  $('#hud-traffic').textContent = `${formatCompact(metrics.total_data_volume_mb)} MB`;
  $('#hud-latency').textContent = `${formatNumber(metrics.average_latency_ms, 1)} ms`;
  $('#hud-load').textContent = `${formatNumber(metrics.average_network_load_percent, 1)}%`;
  $('#hud-health').textContent = `${health}%`;
  const forecast = state.ml.forecast || [];
  drawSparkline('hud-spark-traffic', forecast.map((point) => point.traffic), '#39e7ff');
  drawSparkline('hud-spark-latency', forecast.map((point) => point.latency), '#5fb5ff');
  drawSparkline('hud-spark-load', forecast.map((point) => point.load), '#ffd426');
  drawSparkline('hud-spark-health', forecast.map((point) => 100 - point.load * .45 - point.latency * .08), '#2eea8b');
}

function setDrawer(side, open) {
  const className = side === 'left' ? 'drawer-left-open' : 'drawer-right-open';
  const isOpen = open ?? !document.body.classList.contains(className);
  document.body.classList.toggle(className, isOpen);
  $(side === 'left' ? '#hud-menu' : '#hud-ai').classList.toggle('active', isOpen);
}

function bindHud() {
  $('#hud-menu').addEventListener('click', () => setDrawer('left'));
  $('#hud-ai').addEventListener('click', () => setDrawer('right'));
  $('#hud-fullscreen').addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()));
  $('#hud-camera-reset').addEventListener('click', () => setCameraPreset('reset'));
}

// ---------------------------------------------------------------------------------------------
// SPATIAL ROUTE FOCUS — connection inspection in 3D space (replaces the Connection Inspector panel)
// ---------------------------------------------------------------------------------------------

const routeFocus = {
  active: false, route: null, key: null, curve: null, predicted: false, status: null,
  materialSwaps: [], particleTweaks: [], rings: [], beacons: [], labels: [], timers: [],
  follow: null, previousCamera: null, pinned: false, cameraGoal: null, sourceId: null, destinationId: null,
};
const focusProjection = { vector: new THREE.Vector3(), nodeVector: new THREE.Vector3() };

function fitCameraToNodes(ids, { lift = 4, back = 1 } = {}) {
  const points = ids.map((id) => nodeObjects.get(id)?.position).filter(Boolean);
  if (!points.length) return cityCameraView();
  const centroid = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  let spread = 12;
  points.forEach((a) => points.forEach((b) => { spread = Math.max(spread, a.distanceTo(b)); }));
  const tallest = Math.max(...ids.map((id) => CITY_NODE[id]?.height || 8));
  const target = centroid.clone().add(new THREE.Vector3(0, lift + tallest * .25, 0));
  const position = target.clone().add(new THREE.Vector3(spread * .18, 15 + spread * .5 + tallest * .35, (24 + spread * .78) * back));
  return { position, target };
}

function routeFocusStatus(route) {
  if (route.predicted) return { text: 'AI PREDICTION', tone: 'purple', color: COLORS.purple, anomalous: false };
  const failed = route.connectionStatus === 'Failed' || route.anomalyStatus === 'Failed Connection' || route.routeStatus === 'Blocked';
  const anomalous = failed || route.threat === 'Critical' || (route.anomalyCount > 0 && route.anomalyStatus && route.anomalyStatus !== 'Normal');
  if (anomalous) return { text: (failed ? 'FAILED' : route.anomalyStatus || 'ANOMALY').toUpperCase(), tone: 'red', color: COLORS.red, anomalous: true, failed };
  if (route.priority === 'Critical' || route.routeStatus === 'Congested' || route.routeStatus === 'Rerouted' || route.connectionStatus === 'Degraded') return { text: route.priority === 'Critical' ? 'PRIORITY' : 'WARNING', tone: 'yellow', color: COLORS.yellow, anomalous: false };
  if (route.routeStatus === 'Optimal' && route.connectionStatus === 'Connected') return { text: 'OPTIMAL', tone: 'green', color: COLORS.green, anomalous: false };
  return { text: 'NORMAL', tone: 'cyan', color: COLORS.cyan, anomalous: false };
}

function routeFocusCurve(route) {
  if (route.predicted) return makeSkyArc(route.source, route.destination, route.index, 3.5);
  const style = state.routeStyles?.get(route.key);
  if (style === 'arc') return makeSkyArc(route.source, route.destination, route.index);
  return makeConduitCurve(route.source, route.destination, route.index) || makeSkyArc(route.source, route.destination, route.index);
}

function predictionConfidence() {
  const loadMae = state.ml?.model_metrics?.network_load_percent?.mae;
  const averageLoad = state.ml?.metrics?.average_network_load_percent || average(state.data.map((row) => row.network_load_percent)) || 1;
  return Number.isFinite(loadMae) ? clamp(Math.round(100 - (loadMae / averageLoad) * 100), 35, 95) : 70;
}

function focusLater(fn, ms) {
  const handle = setTimeout(() => { routeFocus.timers = routeFocus.timers.filter((item) => item !== handle); fn(); }, ms);
  routeFocus.timers.push(handle);
  return handle;
}

// ---- 3D side: material dimming, highlight tube, rings, travelling pulse
function swapDimMaterial(object, factor) {
  const material = object.material;
  if (!material) return;
  const clone = material.clone();
  clone.userData = { ...material.userData, shared: false, focusClone: true };
  if (clone.uniforms?.uOpacity) clone.uniforms.uOpacity.value = material.uniforms.uOpacity.value * factor;
  else { clone.transparent = true; clone.opacity = (material.transparent ? material.opacity : 1) * factor; clone.depthWrite = false; }
  object.material = clone;
  routeFocus.materialSwaps.push({ object, original: material, clone });
}

function tweakParticle(item, { opacity = 1, visible = true }) {
  const { core, halo } = item.object.userData;
  routeFocus.particleTweaks.push({ item, core: core.material.opacity, halo: halo.material.opacity, trails: item.trails.map((trail) => trail.material.opacity), visible: item.object.visible });
  core.material.opacity *= opacity; halo.material.opacity *= opacity;
  item.trails.forEach((trail) => { trail.material.opacity *= opacity; trail.visible = visible; });
  item.object.visible = visible;
}

function applyRouteDimming(key, predictedSelected) {
  const dimFactor = .15;
  [currentLayer, predictedLayer].forEach((layer) => {
    layer.children.forEach((object) => {
      const routeKey = object.userData.routeKey;
      if (!routeKey || routeKey === key) return;
      if (object.isGroup || object.isSprite) return; // particles handled below
      swapDimMaterial(object, dimFactor);
    });
  });
  [particles, predictedParticles].forEach((list) => list.forEach((item, index) => {
    if (item.route?.key === key) return;
    tweakParticle(item, { opacity: .25, visible: index % 3 === 0 });
  }));
  if (!predictedSelected) predictedLayer.children.forEach((object) => { if (object.isSprite && !object.userData.routeKey) swapDimMaterial(object, .3); });
}

function addFocusRing(id, color, { intensity = .3, once = false } = {}) {
  const node = nodeObjects.get(id);
  if (!node) return null;
  const ring = new THREE.Mesh(gRing(1, 1.07, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(node.position.x, CITY.islandTop + .12, node.position.z);
  ring.userData.baseScale = (CITY_NODE[id]?.portRadius || 2) + 1.8;
  ring.userData.baseOpacity = intensity;
  ring.userData.phase = pseudoRandom(node.position.x + node.position.z) * Math.PI;
  ring.userData.once = once ? { start: clock.elapsedTime } : null;
  ring.scale.setScalar(ring.userData.baseScale);
  focusLayer.add(ring);
  routeFocus.rings.push(ring);
  return ring;
}

function addFocusTraveller(curve, color, { size = .5, speed = .09, once = false, phase = 0 } = {}) {
  const particle = acquireParticle(color, size, 1);
  particle.userData.routeKey = 'focus';
  focusLayer.add(particle);
  const trails = [];
  for (let i = 0; i < 3; i += 1) { const trail = acquireTrail(color, size, .3 / (i + 1)); focusLayer.add(trail); trails.push(trail); }
  const item = { object: particle, trails, curve, phase, speed, speedScale: 1, once, route: { key: 'focus' } };
  focusParticles.push(item);
  return item;
}

function buildFocusHighlight(route, curve, status) {
  const quality = cityQuality();
  const segments = quality.fast ? 56 : 110;
  const radius = route.predicted ? .22 : (state.routeStyles?.get(route.key) === 'arc' ? .16 : .48);
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 8, false), new THREE.MeshBasicMaterial({ color: status.color, transparent: true, opacity: route.predicted ? .12 : .16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  glow.userData.focusGlow = true;
  focusLayer.add(glow);
  if (route.predicted) {
    const dotted = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(segments)), new THREE.LineDashedMaterial({ color: 0xe2ccff, dashSize: .5, gapSize: .5, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    dotted.computeLineDistances();
    focusLayer.add(dotted);
  }
  addFocusTraveller(curve, new THREE.Color(status.color).lerp(new THREE.Color(0xffffff), .5).getHex(), { size: .55, speed: .1 });
  return glow;
}

function buildRecommendedRoute(route, status) {
  if (!status.anomalous) return null;
  const segments = predictivePathSegments();
  let path = null;
  if (segments.bottleneck.has(route.key) && Array.isArray(state.ml?.predictive_flow?.predicted)) path = [...state.ml.predictive_flow.predicted];
  else {
    const alternatives = state.routeStats.filter((item) => item.source === route.source && item.destination !== route.destination && item.anomalyCount === 0).sort((a, b) => a.networkLoad - b.networkLoad);
    if (alternatives.length) path = [route.source, alternatives[0].destination];
  }
  if (!path) return null;
  const quality = cityQuality();
  let midpoint = null;
  for (let i = 0; i < path.length - 1; i += 1) {
    const stat = state.routeStats.find((item) => item.source === path[i] && item.destination === path[i + 1]);
    const alt = { key: `focus-alt:${path[i]}→${path[i + 1]}`, source: path[i], destination: path[i + 1], index: stat?.index ?? i + 1, speed: stat?.speed ?? 320, volume: (stat?.volume ?? 120) * .7, bandwidth: stat?.bandwidth ?? 40, networkLoad: stat?.networkLoad ?? 35, connections: stat?.connections ?? 120, focusAlt: true };
    const curve = makeSkyArc(path[i], path[i + 1], alt.index, 2.2);
    if (!curve) continue;
    addSkyArc(focusLayer, alt, curve, COLORS.green, { quality, list: focusParticles, particleLimit: 3, opacity: .75, size: .24 });
    if (i === Math.floor((path.length - 2) / 2)) midpoint = curve.getPoint(.5);
  }
  interactiveObjects = interactiveObjects.filter((object) => !object.userData.route?.focusAlt);
  return { path, via: path.length > 2 ? path[Math.floor(path.length / 2)] : path[1], midpoint };
}

// ---- DOM side: title, endpoint markers, beacons, ribbon
function createRouteMetricBeacon({ label, value, tone = 'cyan', t = .5, lift = 3.2, kind = 'metric', point = null }) {
  const container = $('#rf-beacons');
  const element = document.createElement('div');
  element.className = `rf-beacon tone-${tone} kind-${kind}`;
  const small = document.createElement('small'); small.textContent = label;
  const strong = document.createElement('b'); strong.textContent = value;
  element.appendChild(small); element.appendChild(strong);
  container.appendChild(element);
  const beacon = { element, t, lift, kind, point, width: 0, height: 0 };
  routeFocus.beacons.push(beacon);
  return beacon;
}

function createEndpointMarker(id, role) {
  const element = $(role === 'source' ? '#rf-source' : '#rf-destination');
  element.querySelector('b').textContent = id;
  element.hidden = false;
  routeFocus.labels.push({ element, id, role });
  return element;
}

function focusValue(route, key) {
  switch (key) {
    case 'volume': return `${formatNumber(route.volume, 1)} MB`;
    case 'speed': return `${formatNumber(route.speed, 1)} Mbps`;
    case 'latency': return `${formatNumber(route.latency, 1)} ms`;
    case 'loss': return `${formatNumber(route.packetLoss, 2)}%`;
    case 'bandwidth': return `${formatNumber(route.bandwidth, 1)}%`;
    default: return '';
  }
}

function metricTone(route, key, status) {
  if (key === 'latency' && route.latency > 90) return 'red';
  if (key === 'loss' && route.packetLoss > 3) return 'red';
  if (key === 'bandwidth' && route.bandwidth > 80) return 'yellow';
  return status.tone === 'red' ? 'cyan' : status.tone;
}

function triggerBeaconEffect(kind, route) {
  const routeItems = particles.filter((item) => item.route?.key === route.key);
  switch (kind) {
    case 'volume': routeItems.forEach((item) => { item.boost = .7; }); break;
    case 'speed': if (routeFocus.curve) addFocusTraveller(routeFocus.curve, 0xffffff, { size: .42, speed: .34, once: true }); break;
    case 'latency': addFocusRing(route.destination, routeFocus.status.color, { intensity: .4, once: true }); break;
    case 'loss': {
      routeItems.forEach((item, index) => { if (index % 2) item.object.visible = false; });
      focusLater(() => routeItems.forEach((item) => { item.object.visible = true; }), 700);
      break;
    }
    case 'bandwidth': {
      const glow = focusLayer.children.find((object) => object.userData.focusGlow);
      if (glow) { glow.material.opacity = .42; focusLater(() => { if (glow.material) glow.material.opacity = .16; }, 500); }
      break;
    }
    default: break;
  }
}

function renderRouteRibbon(route, status) {
  const text = route.predicted
    ? `${route.source} → ${route.destination}  |  AI PREDICTION  |  ${routeFocus.predictedValues ? `${formatNumber(routeFocus.predictedValues.traffic, 1)} MB  |  ${formatNumber(routeFocus.predictedValues.load, 1)}% load  |  ${formatNumber(routeFocus.predictedValues.latency, 0)} ms  |  ` : ''}${predictionConfidence()}% confidence`
    : `${route.source} → ${route.destination}  |  ${focusValue(route, 'volume')}  |  ${focusValue(route, 'speed')}  |  ${focusValue(route, 'latency')}  |  ${focusValue(route, 'loss')} loss  |  ${status.text}`;
  const ribbon = $('#route-ribbon');
  $('#rf-ribbon-text').textContent = text;
  ribbon.className = `route-ribbon tone-${status.tone}`;
  ribbon.hidden = false;
  $('#rf-follow').textContent = 'FOLLOW PARTICLE';
  $('#rf-follow').classList.remove('active');
  $('#rf-pin').classList.toggle('active', routeFocus.pinned);
}

// ---- lifecycle
function enterRouteFocus(connection) {
  const route = connection?.key ? connection : state.routeStats.find((item) => item.key === connection);
  if (!route || state.storyActive || state.visualMode !== 'city') return false;
  if (routeFocus.active) exitRouteFocus({ restoreCamera: false });
  if (!focusLayer) { focusLayer = new THREE.Group(); focusLayer.name = 'Route focus'; scene.add(focusLayer); }
  const status = routeFocusStatus(route);
  const curve = routeFocusCurve(route);
  if (!curve) return false;
  routeFocus.active = true; routeFocus.route = route; routeFocus.key = route.key; routeFocus.curve = curve; routeFocus.status = status; routeFocus.predicted = !!route.predicted;
  routeFocus.sourceId = route.source; routeFocus.destinationId = route.destination; routeFocus.pinned = false;
  routeFocus.previousCamera = routeFocus.previousCamera || { position: camera.position.clone(), target: controls.target.clone() };
  state.selectedConnection = route.key;
  $('#selection-panel').classList.remove('open');
  controls.autoRotate = false;

  applyRouteDimming(route.key, routeFocus.predicted);
  buildFocusHighlight(route, curve, status);
  addFocusRing(route.source, status.color, { intensity: .26 });
  addFocusRing(route.destination, status.anomalous ? COLORS.red : status.color, { intensity: status.anomalous ? .42 : .26 });
  if (!status.anomalous && !routeFocus.predicted) addFocusRing(route.destination, COLORS.green, { intensity: .35, once: true });

  // floating title + endpoint markers
  $('#rf-title').querySelector('b').textContent = `${route.source} → ${route.destination}`;
  const badge = $('#rf-title').querySelector('.rf-status');
  badge.textContent = status.text; badge.className = `rf-status tone-${status.tone}`;
  $('#route-focus').className = `route-focus tone-${status.tone}`;
  $('#route-focus').hidden = false;
  createEndpointMarker(route.source, 'source');
  createEndpointMarker(route.destination, 'destination');

  // beacons (max five metric beacons), staggered so each property animates briefly when it appears
  const plan = routeFocus.predicted ? predictedBeaconPlan(route) : metricBeaconPlan(route, status);
  plan.forEach((spec, index) => focusLater(() => {
    if (!routeFocus.active || routeFocus.key !== route.key) return;
    const beacon = createRouteMetricBeacon(spec);
    requestAnimationFrame(() => beacon.element.classList.add('visible'));
    triggerBeaconEffect(spec.kind, route);
  }, 120 + index * 260));

  if (status.anomalous) {
    const nodeToPulse = route.threat === 'Critical' || route.anomalyStatus === 'Suspicious Traffic' ? route.source : route.destination;
    addFocusRing(nodeToPulse, COLORS.red, { intensity: .45 });
    const cause = status.failed ? { label: 'CONNECTION FAILED', value: `${formatNumber(route.packetLoss, 1)}% loss` }
      : route.latency > 90 ? { label: 'HIGH LATENCY', value: `${formatNumber(route.latency, 0)} ms` }
        : route.packetLoss > 3 ? { label: 'PACKET LOSS', value: `${formatNumber(route.packetLoss, 2)}%` }
          : { label: (route.anomalyStatus || 'ANOMALY').toUpperCase(), value: `${formatNumber(route.networkLoad, 0)}% load` };
    focusLater(() => { if (routeFocus.active) { const b = createRouteMetricBeacon({ ...cause, tone: 'red', t: .62, lift: 4.6, kind: 'warning' }); requestAnimationFrame(() => b.element.classList.add('visible')); } }, 1500);
    const recommendation = buildRecommendedRoute(route, status);
    if (recommendation) focusLater(() => { if (routeFocus.active) { const b = createRouteMetricBeacon({ label: 'RECOMMENDED', value: `Route via ${recommendation.via}`, tone: 'green', kind: 'recommendation', point: recommendation.midpoint, lift: 2.4 }); requestAnimationFrame(() => b.element.classList.add('visible')); } }, 1800);
  }

  renderRouteRibbon(route, status);
  focusCameraOnRoute();
  updateRouteFocusPositions();
  return true;
}

function metricBeaconPlan(route, status) {
  const plan = [
    { label: 'VOLUME', value: focusValue(route, 'volume'), t: .16, lift: 3.4, kind: 'volume', tone: metricTone(route, 'volume', status) },
    { label: 'SPEED', value: focusValue(route, 'speed'), t: .5, lift: 4.2, kind: 'speed', tone: metricTone(route, 'speed', status) },
    { label: 'LATENCY', value: focusValue(route, 'latency'), t: .84, lift: 3.4, kind: 'latency', tone: metricTone(route, 'latency', status) },
    { label: 'PACKET LOSS', value: focusValue(route, 'loss'), t: .33, lift: 2.2, kind: 'loss', tone: metricTone(route, 'loss', status) },
    { label: 'BANDWIDTH', value: focusValue(route, 'bandwidth'), t: .67, lift: 2.2, kind: 'bandwidth', tone: metricTone(route, 'bandwidth', status) },
  ];
  return plan.slice(0, 5);
}

function predictedBeaconPlan(route) {
  const prediction = (state.ml?.predictions || []).find((item) => item.node === route.destination) || (state.ml?.predictions || []).find((item) => item.node === route.source) || null;
  routeFocus.predictedValues = prediction ? { traffic: prediction.predicted.data_volume_mb, load: prediction.predicted.network_load_percent, latency: prediction.predicted.latency_ms } : null;
  const plan = [{ label: 'AI PREDICTION', value: `${predictionConfidence()}% confidence`, t: .5, lift: 4.4, kind: 'prediction', tone: 'purple' }];
  if (prediction) {
    plan.push({ label: 'PREDICTED TRAFFIC', value: `${formatNumber(prediction.predicted.data_volume_mb, 1)} MB`, t: .18, lift: 3.2, kind: 'volume', tone: 'purple' });
    plan.push({ label: 'PREDICTED LOAD', value: `${formatNumber(prediction.predicted.network_load_percent, 1)}%`, t: .66, lift: 2.4, kind: 'bandwidth', tone: prediction.predicted.network_load_percent > 80 ? 'red' : 'purple' });
    plan.push({ label: 'PREDICTED LATENCY', value: `${formatNumber(prediction.predicted.latency_ms, 0)} ms`, t: .84, lift: 3.2, kind: 'latency', tone: prediction.predicted.latency_ms > 120 ? 'red' : 'purple' });
  }
  return plan.slice(0, 5);
}

function focusCameraOnRoute() {
  if (!routeFocus.active) return;
  const goal = fitCameraToNodes([routeFocus.sourceId, routeFocus.destinationId], { lift: 3.5 });
  routeFocus.cameraGoal = goal;
  cameraGoal = { position: goal.position.clone(), target: goal.target.clone() };
}

function exitRouteFocus({ restoreCamera = true } = {}) {
  if (!routeFocus.active) return;
  stopParticleFollow({ restoreCamera: false });
  routeFocus.timers.forEach((handle) => clearTimeout(handle));
  routeFocus.timers = [];
  routeFocus.materialSwaps.forEach(({ object, original, clone }) => { object.material = original; clone.dispose(); });
  routeFocus.materialSwaps = [];
  routeFocus.particleTweaks.forEach(({ item, core, halo, trails, visible }) => {
    item.object.userData.core.material.opacity = core; item.object.userData.halo.material.opacity = halo;
    item.trails.forEach((trail, index) => { trail.material.opacity = trails[index]; trail.visible = visible; });
    item.object.visible = visible;
  });
  routeFocus.particleTweaks = [];
  particles.forEach((item) => { item.boost = 0; item.object.visible = true; });
  releaseParticles(focusParticles);
  focusParticles = [];
  if (focusLayer) disposeGroup(focusLayer);
  interactiveObjects = interactiveObjects.filter((object) => !object.userData.route?.focusAlt);
  routeFocus.rings = [];
  routeFocus.beacons.forEach((beacon) => beacon.element.remove());
  routeFocus.beacons = [];
  routeFocus.labels.forEach(({ element }) => { element.hidden = true; });
  routeFocus.labels = [];
  $('#route-focus').hidden = true;
  $('#route-ribbon').hidden = true;
  routeFocus.active = false; routeFocus.route = null; routeFocus.key = null; routeFocus.curve = null; routeFocus.status = null; routeFocus.predictedValues = null; routeFocus.pinned = false;
  state.selectedConnection = null;
  if (restoreCamera && routeFocus.previousCamera) cameraGoal = { position: routeFocus.previousCamera.position.clone(), target: routeFocus.previousCamera.target.clone() };
  if (restoreCamera) routeFocus.previousCamera = null;
}

function toggleRoutePin() {
  if (!routeFocus.active) return;
  routeFocus.pinned = !routeFocus.pinned;
  $('#rf-pin').classList.toggle('active', routeFocus.pinned);
  focusCameraOnRoute();
}

// ---- follow particle mode
function startParticleFollow() {
  if (!routeFocus.active || routeFocus.follow) return false;
  const item = particles.find((candidate) => candidate.route?.key === routeFocus.key && candidate.object.visible) || focusParticles.find((candidate) => !candidate.once) || null;
  if (!item) return false;
  routeFocus.follow = { item, startPhase: item.phase, lastPhase: item.phase, returnGoal: routeFocus.cameraGoal };
  cameraGoal = null;
  controls.enabled = false;
  $('#rf-follow').textContent = 'EXIT FOLLOW';
  $('#rf-follow').classList.add('active');
  return true;
}

function stopParticleFollow({ restoreCamera = true } = {}) {
  if (!routeFocus.follow) return;
  const { returnGoal } = routeFocus.follow;
  routeFocus.follow = null;
  controls.enabled = !state.cine;
  if ($('#rf-follow')) { $('#rf-follow').textContent = 'FOLLOW PARTICLE'; $('#rf-follow').classList.remove('active'); }
  if (restoreCamera && returnGoal) cameraGoal = { position: returnGoal.position.clone(), target: returnGoal.target.clone() };
}

function toggleParticleFollow() {
  if (routeFocus.follow) stopParticleFollow(); else startParticleFollow();
}

function updateParticleFollow(delta) {
  const follow = routeFocus.follow;
  if (!follow) return;
  const item = follow.item;
  if (item.phase < follow.lastPhase - .5) { stopParticleFollow(); return; } // the particle wrapped: route ended
  follow.lastPhase = item.phase;
  const point = item.curve.getPoint(item.phase);
  const tangent = item.curve.getTangent(item.phase).setY(0).normalize();
  const edgeLift = (item.phase < .1 || item.phase > .9) ? 5 : 0; // stay clear of the buildings at both ends
  const desired = point.clone().sub(tangent.clone().multiplyScalar(7)).add(new THREE.Vector3(0, 3.6 + edgeLift, 0));
  const look = point.clone().add(tangent.clone().multiplyScalar(4));
  camera.position.lerp(desired, Math.min(1, delta * 4));
  controls.target.lerp(look, Math.min(1, delta * 5));
}

// ---- per-frame projection of the HUD elements
function projectToScreen(point, rect) {
  const v = focusProjection.vector.copy(point).project(camera);
  return { x: (v.x + 1) / 2 * rect.width, y: (1 - v.y) / 2 * rect.height, behind: v.z > 1, depth: v.z };
}

function occlusionOpacity(point, screen) {
  let opacity = 1;
  const distance = camera.position.distanceTo(point);
  nodeObjects.forEach((node, id) => {
    if (id === routeFocus.sourceId || id === routeFocus.destinationId) return;
    const metrics = CITY_NODE[id] || { height: 8, portRadius: 2 };
    const centre = focusProjection.nodeVector.set(node.position.x, CITY.islandTop + metrics.height * .5, node.position.z);
    const nodeDistance = camera.position.distanceTo(centre);
    if (nodeDistance > distance - 2) return;
    const v = centre.project(camera);
    const nx = (v.x + 1) / 2 * screen.width; const ny = (1 - v.y) / 2 * screen.height;
    const radiusPixels = ((metrics.portRadius || 2) + 2.5) * (screen.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * nodeDistance));
    if (Math.hypot(nx - screen.x, ny - screen.y) < radiusPixels) opacity = Math.min(opacity, .35);
  });
  return opacity;
}

function placeElement(element, screen, rect, { scale = 1, opacity = 1, anchor = 'bottom' } = {}) {
  const onScreen = !screen.behind && screen.x > -200 && screen.x < rect.width + 200 && screen.y > -200 && screen.y < rect.height + 200;
  element.style.opacity = onScreen ? String(opacity) : '0';
  element.style.transform = `translate(-50%, ${anchor === 'bottom' ? '-100%' : '0'}) translate(${screen.x.toFixed(1)}px, ${screen.y.toFixed(1)}px) scale(${scale.toFixed(3)})`;
}

function updateRouteFocusPositions() {
  if (!routeFocus.active || !routeFocus.curve) return;
  const container = $('#scene-container');
  const rect = { width: container.clientWidth || 1600, height: container.clientHeight || 900 };
  const referenceDistance = 90;
  const placed = [];
  const place = (element, point, { anchor = 'bottom' } = {}) => {
    const screen = projectToScreen(point, rect);
    const distance = camera.position.distanceTo(point);
    const scale = clamp(referenceDistance / Math.max(distance, 1), .72, 1.18);
    let y = screen.y;
    // simple overlap avoidance: nudge upward when another label occupies the same spot
    const width = element.offsetWidth || 120; const height = element.offsetHeight || 34;
    for (let guard = 0; guard < 6; guard += 1) {
      const clash = placed.find((other) => Math.abs(other.x - screen.x) < (other.width + width) / 2 && Math.abs(other.y - y) < (other.height + height) / 2);
      if (!clash) break;
      y = clash.y - clash.height - 6;
    }
    placed.push({ x: screen.x, y, width, height });
    placeElement(element, { ...screen, y }, rect, { scale, opacity: occlusionOpacity(point, { ...screen, width: rect.width, height: rect.height }), anchor });
    return { ...screen, y };
  };
  const midpoint = routeFocus.curve.getPoint(.5).add(new THREE.Vector3(0, 5.6, 0));
  place($('#rf-title'), midpoint);
  routeFocus.labels.forEach(({ element, id }) => {
    const node = nodeObjects.get(id);
    if (!node) return;
    const top = new THREE.Vector3(node.position.x, CITY.islandTop + (CITY_NODE[id]?.top ?? CITY_NODE[id]?.height ?? 8) + 1.2, node.position.z);
    const anchorPoint = top.clone().add(new THREE.Vector3(0, 6.5, 0));
    const labelScreen = place(element, anchorPoint);
    const topScreen = projectToScreen(top, rect);
    const line = element.querySelector('.rf-line');
    const length = Math.max(0, topScreen.y - labelScreen.y);
    line.style.height = `${length.toFixed(1)}px`;
  });
  routeFocus.beacons.forEach((beacon) => {
    const point = beacon.point ? beacon.point.clone().add(new THREE.Vector3(0, beacon.lift, 0)) : routeFocus.curve.getPoint(beacon.t).add(new THREE.Vector3(0, beacon.lift, 0));
    place(beacon.element, point);
  });
}

function bindRouteFocusControls() {
  $('#rf-close').addEventListener('click', () => exitRouteFocus());
  $('#rf-pin').addEventListener('click', toggleRoutePin);
  $('#rf-follow').addEventListener('click', toggleParticleFollow);
}

function bindUi() {
  $('#pause-flow').addEventListener('click', () => {
    state.paused = !state.paused;
    $('#pause-label').textContent = state.paused ? 'RESUME FLOW' : 'PAUSE FLOW';
    $('#pause-icon').textContent = state.paused ? '▶' : 'Ⅱ';
  });
  $('#speed-control').addEventListener('input', (event) => {
    state.flowSpeed = Number(event.target.value);
    $('#speed-output').value = `${state.flowSpeed.toFixed(state.flowSpeed % 1 ? 2 : 1)}×`;
    const progress = ((state.flowSpeed - .25) / 2.75) * 100;
    event.target.style.background = `linear-gradient(90deg, var(--cyan) ${progress}%, #163a54 ${progress}%)`;
  });
  $('#bloom-control').addEventListener('input', (event) => {
    state.bloomStrength = Number(event.target.value);
    $('#bloom-output').value = `${state.bloomStrength.toFixed(1)}×`;
    const progress = ((state.bloomStrength - .4) / 1.4) * 100;
    event.target.style.background = `linear-gradient(90deg, var(--purple) ${progress}%, #163a54 ${progress}%)`;
    applyModeLighting();
  });
  $$('#quality-control button').forEach((button) => button.addEventListener('click', () => {
    $$('#quality-control button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.renderQuality = button.dataset.value;
    applyRenderQuality();
  }));
  $$('.layer-toggle').forEach((button) => button.addEventListener('click', () => {
    const layer = button.dataset.layer;
    state.layers[layer] = !state.layers[layer];
    button.classList.toggle('active', state.layers[layer]);
    if (layer === 'current') {
      applyFlowVisibility();
      riverCurrentLayer.visible = state.visualMode === 'river' && state.layers.current;
      splatFlowLayer.visible = state.visualMode === 'splat' && state.layers.current;
    } else {
      applyFlowVisibility();
      riverPredictedLayer.visible = state.visualMode === 'river' && state.layers.predicted;
      splatPredictedLayer.visible = state.visualMode === 'splat' && state.layers.predicted;
    }
    updateVisibleCounters();
  }));
  $('#department-filter').addEventListener('change', (event) => { state.filters.department = event.target.value; buildCurrentFlows(); buildFlowRiver(); buildSplatFlows(); setVisualizationMode(state.visualMode, false); });
  $('#type-filter').addEventListener('change', (event) => { state.filters.type = event.target.value; buildCurrentFlows(); buildFlowRiver(); buildSplatFlows(); setVisualizationMode(state.visualMode, false); });
  $$('#anomaly-filter button').forEach((button) => button.addEventListener('click', () => {
    $$('#anomaly-filter button').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.filters.anomaly = button.dataset.value;
    buildCurrentFlows();
    buildFlowRiver();
    buildSplatFlows();
    setVisualizationMode(state.visualMode, false);
  }));
  $$('#view-switch button').forEach((button) => button.addEventListener('click', () => setVisualizationMode(button.dataset.view)));
  $('#close-selection').addEventListener('click', () => $('#selection-panel').classList.remove('open'));
  $('#reset-camera').addEventListener('click', () => setCameraPreset('reset'));
  $('#cine-camera').addEventListener('click', () => setCineCamera(!state.cine));
  renderer.domElement.addEventListener('pointerdown', () => { if (state.cine) setCineCamera(false); });
  $('#fullscreen-button').addEventListener('click', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen());
  $('#open-alerts').addEventListener('click', () => $('#alerts-dialog').showModal());
  $('#close-alerts').addEventListener('click', () => $('#alerts-dialog').close());
  $('#alerts-dialog').addEventListener('click', (event) => { if (event.target === $('#alerts-dialog')) $('#alerts-dialog').close(); });
  $('#start-story').addEventListener('click', () => startSystemFlow({ confirmRestart: true }));
  $('#start-situation')?.addEventListener('click', startStory);
  bindFlowControls();
  $('#story-next').addEventListener('click', nextSituationStep);
  $('#story-prev').addEventListener('click', previousSituationStep);
  $('#story-exit').addEventListener('click', exitStory);
  bindHud();
  bindRouteFocusControls();
  bindLayoutControls();
}

function buildCinePath() {
  const points = [];
  const segments = 9;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = 30 + Math.sin(i * 2.3) * 9;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      11 + Math.sin(angle * 1.7 + 1) * 7 + (i % 3) * 2.4,
      Math.sin(angle) * radius,
    ));
  }
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', .6);
}

function buildCityCinePath() {
  const points = [];
  const segments = 10;
  for (let i = 0; i < segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const radius = 86 + Math.sin(i * 2.1) * 14;
    points.push(new THREE.Vector3(2 + Math.cos(angle) * radius, 26 + Math.sin(angle * 1.7 + 1) * 8 + (i % 3) * 3, -14 + Math.sin(angle) * radius));
  }
  return new THREE.CatmullRomCurve3(points, true, 'catmullrom', .6);
}

function setCineCamera(active) {
  state.cine = active;
  controls.enabled = !active;
  if (active) {
    cameraGoal = null;
    controls.autoRotate = false;
  } else {
    controls.autoRotate = state.visualMode !== 'river';
  }
  $('#cine-label').textContent = active ? 'EXIT CINE' : 'CINE CAM';
  $('#cine-camera').classList.toggle('active', active);
}

function cityCameraView() {
  // Reference framing: wide three-quarter aerial from the front, horizon near the top of the frame.
  const aspect = camera?.aspect || 1.78;
  const scale = clamp(Math.sqrt(1.78 / aspect), 1, 1.4);
  const target = new THREE.Vector3(2, 0, -14);
  const position = target.clone().add(new THREE.Vector3(0, 34, 88).multiplyScalar(scale));
  return { position, target };
}

function resetCamera() {
  if (state.visualMode === 'river') {
    cameraGoal = { position: new THREE.Vector3(0, 18.5, 44), target: new THREE.Vector3(0, 3.4, .8) };
    controls.autoRotate = false;
  } else if (state.visualMode === 'splat') {
    cameraGoal = { position: new THREE.Vector3(0, 46, 100), target: new THREE.Vector3(2, 3, -12) };
    controls.autoRotate = true;
  } else {
    cameraGoal = cityCameraView();
    controls.autoRotate = true;
  }
}

function getCameraPreset(preset) {
  const isCity = state.visualMode === 'city';
  const perspective = state.visualMode === 'river'
    ? { position: new THREE.Vector3(0, 18.5, 44), target: new THREE.Vector3(0, 3.4, .8) }
    : state.visualMode === 'splat'
      ? { position: new THREE.Vector3(0, 46, 100), target: new THREE.Vector3(2, 3, -12) }
      : cityCameraView();
  const presets = isCity
    ? {
      perspective,
      reset: perspective,
      top: { position: new THREE.Vector3(2, 175, -13), target: new THREE.Vector3(2, 0, -14) },
      side: { position: new THREE.Vector3(150, 44, -14), target: new THREE.Vector3(2, 4, -14) },
      front: { position: new THREE.Vector3(2, 36, 132), target: new THREE.Vector3(2, 4, -14) },
    }
    : {
      perspective,
      reset: perspective,
      top: { position: new THREE.Vector3(0, 60, 6), target: new THREE.Vector3(0, 0, 0) },
      side: { position: new THREE.Vector3(54, 13, 0), target: new THREE.Vector3(0, 3, 0) },
      front: { position: new THREE.Vector3(0, 12, 52), target: new THREE.Vector3(0, 3.5, 0) },
    };
  return presets[preset] || perspective;
}

function markCameraPreset(preset) {
  state.cameraPreset = preset;
  $$('#camera-presets button[data-preset], #camera-mini button[data-preset], #hud-camera button[data-preset]')
    .forEach((button) => button.classList.toggle('active', button.dataset.preset === preset));
}

function setCameraPreset(preset) {
  if (state.cine) setCineCamera(false);
  controls.autoRotate = false;
  if (preset === 'reset' || preset === 'perspective') {
    resetCamera();
    markCameraPreset('perspective');
    return;
  }
  const goal = getCameraPreset(preset);
  cameraGoal = { position: goal.position, target: goal.target };
  markCameraPreset(preset);
}

let sceneResizeTimer = null;
function scheduleSceneResize() {
  onResize();
  clearTimeout(sceneResizeTimer);
  sceneResizeTimer = setTimeout(onResize, 380);
}

function toggleFullView() {
  if (state.fullView) exitFullView();
  else enterFullView();
}

function enterFullView() {
  state.fullView = true;
  document.body.classList.add('full-view');
  $('#full-view-label').textContent = 'EXIT FULL VIEW';
  $('#full-view-button').classList.add('active');
  if (document.fullscreenEnabled && !document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  }
  scheduleSceneResize();
}

function exitFullView() {
  state.fullView = false;
  document.body.classList.remove('full-view');
  $('#full-view-label').textContent = 'FULL VIEW';
  $('#full-view-button').classList.remove('active');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  scheduleSceneResize();
}

const sidebarScroll = { left: 0, right: 0 };

function toggleSidebar(side) {
  if (document.body.classList.contains('immersive')) { setDrawer(side); return; }
  const rail = $(side === 'left' ? '.left-rail' : '.right-rail');
  const reopen = $(side === 'left' ? '#reopen-left' : '#reopen-right');
  const collapsedClass = `${side}-collapsed`;
  const isCollapsed = document.body.classList.contains(collapsedClass);
  if (isCollapsed) {
    document.body.classList.remove(collapsedClass);
    reopen.hidden = true;
    requestAnimationFrame(() => { rail.scrollTop = sidebarScroll[side]; });
  } else {
    sidebarScroll[side] = rail.scrollTop;
    document.body.classList.add(collapsedClass);
    reopen.hidden = false;
  }
  saveLayoutState();
  scheduleSceneResize();
}

function toggleLeftSidebar() { toggleSidebar('left'); }
function toggleRightSidebar() { toggleSidebar('right'); }

function saveLayoutState() {
  try {
    localStorage.setItem('flowscope-layout', JSON.stringify({
      leftOpen: !document.body.classList.contains('left-collapsed'),
      rightOpen: !document.body.classList.contains('right-collapsed'),
    }));
  } catch { /* storage unavailable */ }
}

function restoreLayoutState() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('flowscope-layout') || '{}'); } catch { saved = {}; }
  document.body.classList.add('layout-no-anim');
  if (saved.leftOpen === false) { document.body.classList.add('left-collapsed'); $('#reopen-left').hidden = false; }
  if (saved.rightOpen === false) { document.body.classList.add('right-collapsed'); $('#reopen-right').hidden = false; }
  requestAnimationFrame(() => {
    document.body.classList.remove('layout-no-anim');
    onResize();
  });
}

function bindLayoutControls() {
  $('#collapse-left').addEventListener('click', toggleLeftSidebar);
  $('#collapse-right').addEventListener('click', toggleRightSidebar);
  $('#reopen-left').addEventListener('click', toggleLeftSidebar);
  $('#reopen-right').addEventListener('click', toggleRightSidebar);
  $('#full-view-button').addEventListener('click', toggleFullView);
  $('#full-view-side').addEventListener('click', toggleFullView);
  $('#camera-reset-preset').addEventListener('click', () => setCameraPreset('reset'));
  $$('#camera-presets button[data-preset], #camera-mini button[data-preset], #hud-camera button[data-preset]')
    .forEach((button) => button.addEventListener('click', () => setCameraPreset(button.dataset.preset)));

  $('.app-layout').addEventListener('transitionend', (event) => {
    if (event.propertyName === 'grid-template-columns') onResize();
  });

  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && state.fullView) exitFullView();
    else scheduleSceneResize();
  });

  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target && (target.matches?.('input, select, textarea') || target.isContentEditable)) return;
    if (event.key === 'Escape') {
      if (routeFocus.follow) { stopParticleFollow(); return; }
      if (routeFocus.active) { exitRouteFocus(); return; }
      if (document.body.classList.contains('drawer-left-open') || document.body.classList.contains('drawer-right-open')) { setDrawer('left', false); setDrawer('right', false); return; }
      if (state.fullView) { event.preventDefault(); exitFullView(); }
      return;
    }
    const key = event.key.toLowerCase();
    if (key === 'f') { event.preventDefault(); toggleFullView(); }
    else if (key === 'r') setCameraPreset('reset');
    else if (key === '1') setCameraPreset('perspective');
    else if (key === '2') setCameraPreset('top');
    else if (key === '3') setCameraPreset('side');
    else if (key === '4') setCameraPreset('front');
  });
}

function applyRenderQuality() {
  const ratios = { performance: 1, balanced: 1.55, cinematic: 2 };
  const ratio = Math.min(window.devicePixelRatio, ratios[state.renderQuality]);
  renderer.setPixelRatio(ratio);
  renderer.shadowMap.enabled = state.renderQuality !== 'performance';
  composer?.setPixelRatio(ratio);
  if (bloomPass) {
    bloomPass.enabled = true;
  }
  buildCityEnvironment();
  buildNodes();
  buildCurrentFlows();
  buildPredictedFlows();
  buildFlowRiver();
  buildSplatScene();
  buildSplatFlows();
  // Shadow-map availability is baked into compiled programs, so refresh every lit material.
  scene.traverse((object) => {
    const materials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
    materials.forEach((material) => { if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) material.needsUpdate = true; });
  });
  applyModeLighting();
  onResize();
  setVisualizationMode(state.visualMode, false);
}

// ---------------------------------------------------------------------------------------------
// LIVE NETWORK SITUATION — data-driven startup story controller
// ---------------------------------------------------------------------------------------------

const SITUATION_STATES = ['loading', 'intro', 'collection', 'movement', 'change', 'processed', 'analysis', 'anomaly', 'prediction', 'recommendation', 'optimization', 'comparison', 'result', 'completed', 'explore'];

const SITUATION_PRIORITIES = [
  { key: 'critical-threat', label: 'Critical threat', test: (r) => r.threat_level === 'Critical' },
  { key: 'failed-connection', label: 'Failed connection', test: (r) => r.connection_status === 'Failed' || r.anomaly_status === 'Failed Connection' },
  { key: 'server-overload', label: 'Server overload', test: (r) => r.anomaly_status === 'Server Overload' || (r.destination_type === 'Server' && Number(r.network_load_percent) > 85) },
  { key: 'high-latency', label: 'High latency', test: (r) => r.anomaly_status === 'High Latency' || Number(r.latency_ms) > 120 },
  { key: 'packet-loss', label: 'Heavy packet loss', test: (r) => r.anomaly_status === 'Packet Loss' || Number(r.packet_loss_percent) > 3 },
  { key: 'api-overload', label: 'API overload', test: (r) => r.anomaly_status === 'API Overload' },
  { key: 'database-overload', label: 'Database overload', test: (r) => r.anomaly_status === 'Database Overload' },
  { key: 'congestion', label: 'Network congestion', test: (r) => r.anomaly_status === 'Network Congestion' || r.route_status === 'Congested' },
  { key: 'traffic-spike', label: 'Abnormal traffic spike', test: (r, ctx) => r.anomaly_status === 'Traffic Spike' || Number(r.data_volume_mb) > ctx.averageVolume * 2.2 },
  { key: 'normal-load', label: 'Highest-load normal route', test: (r) => r.anomaly_status === 'Normal' },
];

const ANOMALY_CAUSES = {
  'Suspicious Traffic': 'Restricted data requested with denied access permission from an unusual source.',
  'Failed Connection': 'The destination stopped acknowledging packets; the link or service is down.',
  'Server Overload': 'Request volume exceeds the server processing capacity.',
  'High Latency': 'Queue build-up on the route is delaying packet delivery.',
  'Packet Loss': 'Link errors or saturation are dropping packets in transit.',
  'API Overload': 'API request rate exceeds the gateway capacity.',
  'Database Overload': 'Query load and queue depth exceed the database capacity.',
  'Network Congestion': 'Bandwidth on the route is saturated by concurrent transfers.',
  'Traffic Spike': 'A sudden burst of data volume far above the route baseline.',
};

const SITUATION_RECOMMENDATIONS = {
  'High Latency': { text: 'Reroute traffic through a lower-latency server.', mode: 'reroute' },
  'Server Overload': { text: 'Move non-critical traffic to the lowest-load server.', mode: 'reroute' },
  'API Overload': { text: 'Increase API Gateway capacity and enable rate limiting.', mode: 'capacity' },
  'Database Overload': { text: 'Optimize database queries and shift read traffic.', mode: 'capacity' },
  'Packet Loss': { text: 'Inspect the affected network route and activate the backup path.', mode: 'reroute' },
  'Suspicious Traffic': { text: 'Isolate the route and investigate the source.', mode: 'isolate' },
  'Failed Connection': { text: 'Activate the available backup route.', mode: 'reroute' },
  'Network Congestion': { text: 'Rebalance the transfer across an alternative route.', mode: 'reroute' },
  'Traffic Spike': { text: 'Apply burst shaping and spread the load across a second route.', mode: 'reroute' },
  Normal: { text: 'Maintain the current routing and continue monitoring.', mode: 'monitor' },
};

const situationStory = {
  state: 'loading',
  index: -1,
  paused: false,
  timers: [],
  lineIndex: 0,
  linesDone: false,
  mix: 0,
  showPrediction: false,
  entries: [],
  pulses: [],
  markers: [],
  focusedNodes: [],
  cameraGoalForStep: null,
};

function selectSituationRecord(data, ml) {
  const rows = (data || []).filter((row) => row && row.source_id && row.destination_id);
  if (!rows.length) return null;
  const averageVolume = average(rows.map((row) => row.data_volume_mb));
  const context = { averageVolume, ml };
  for (const priority of SITUATION_PRIORITIES) {
    const candidates = rows.filter((row) => priority.test(row, context));
    if (!candidates.length) continue;
    const sorted = priority.key === 'normal-load'
      ? [...candidates].sort((a, b) => Number(b.network_load_percent) - Number(a.network_load_percent))
      : [...candidates].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return { record: sorted[0], priority };
  }
  return { record: rows.at(-1), priority: SITUATION_PRIORITIES.at(-1) };
}

function makeFallbackSituationRecord() {
  return {
    timestamp: new Date().toISOString(), source_id: 'API-Gateway', source_type: 'API', source_department: 'IT', destination_id: 'Server-02', destination_type: 'Server', destination_department: 'Operations',
    data_volume_mb: 145.6, transfer_speed_mbps: 210, bandwidth_usage_percent: 90, latency_ms: 184, packet_loss_percent: 4.2, network_load_percent: 91.2, active_connections: 410, response_time_ms: 320, queue_length: 46,
    data_priority: 'High', data_classification: 'Internal', access_permission: 'Employee', threat_level: 'High', connection_status: 'Degraded', route_status: 'Congested', anomaly_status: 'Server Overload',
  };
}

function healthScore(load, loss, anomalies) {
  return clamp(Math.round(100 - load * .18 - loss * 1.2 - anomalies * .28), 45, 99);
}

function buildSituationFromRecord(record, mlResults, priority = null) {
  const ml = mlResults || {};
  const key = `${record.source_id}→${record.destination_id}`;
  const routeStat = state.routeStats.find((route) => route.key === key) || null;
  const sameRoute = state.data.filter((row) => row.source_id === record.source_id && row.destination_id === record.destination_id && row !== record);
  const baselineRows = sameRoute.length >= 2 ? sameRoute : state.data.filter((row) => row !== record);
  const baseline = {
    volume: average(baselineRows.map((row) => row.data_volume_mb)),
    latency: average(baselineRows.map((row) => row.latency_ms)),
    load: average(baselineRows.map((row) => row.network_load_percent)),
    loss: average(baselineRows.map((row) => row.packet_loss_percent)),
    response: average(baselineRows.map((row) => row.response_time_ms)),
    speed: average(baselineRows.map((row) => row.transfer_speed_mbps)),
    fromSameRoute: sameRoute.length >= 2,
  };
  const trafficChange = baseline.volume ? ((Number(record.data_volume_mb) - baseline.volume) / baseline.volume) * 100 : 0;
  const anomalyType = record.anomaly_status !== 'Normal' ? record.anomaly_status : record.threat_level === 'Critical' ? 'Suspicious Traffic' : 'Normal';
  const detected = anomalyType !== 'Normal';
  const flow = ml.predictive_flow || {};
  const toSegments = (path = []) => path.slice(0, -1).map((id, index) => `${id}→${path[index + 1]}`);
  const currentSegments = toSegments(flow.current); const predictedSegments = toSegments(flow.predicted);
  const bottleneckSegments = currentSegments.filter((segment) => !predictedSegments.includes(segment));
  const prediction = (ml.predictions || []).find((item) => item.node === record.destination_id) || (ml.predictions || []).find((item) => item.node === record.source_id) || null;
  const loadMae = ml.model_metrics?.network_load_percent?.mae;
  const averageLoad = ml.metrics?.average_network_load_percent || average(state.data.map((row) => row.network_load_percent)) || 1;
  const confidence = Number.isFinite(loadMae) ? clamp(Math.round(100 - (loadMae / averageLoad) * 100), 35, 95) : 70;
  const recommendation = SITUATION_RECOMMENDATIONS[anomalyType] || SITUATION_RECOMMENDATIONS.Normal;
  const mlRecommendation = (ml.recommendations || []).find((item) => item.action.includes(record.destination_id) || item.action.includes(record.source_id)) || null;
  let recommendedPath = null;
  if (recommendation.mode === 'reroute') {
    if (bottleneckSegments.includes(key) && Array.isArray(flow.predicted) && flow.predicted.length > 1) recommendedPath = [...flow.predicted];
    else {
      const alternatives = state.routeStats
        .filter((route) => route.source === record.source_id && route.destination !== record.destination_id && route.anomalyCount === 0)
        .sort((a, b) => (a.destinationType === record.destination_type ? -1 : 1) - (b.destinationType === record.destination_type ? -1 : 1) || a.networkLoad - b.networkLoad);
      if (alternatives.length) recommendedPath = [record.source_id, alternatives[0].destination];
    }
  }
  const mode = recommendation.mode;
  const before = { latency: Number(record.latency_ms), load: Number(record.network_load_percent), loss: Number(record.packet_loss_percent), response: Number(record.response_time_ms) };
  const after = mode === 'reroute'
    ? { latency: Math.min(before.latency, Math.max(baseline.latency * 1.05, before.latency * .55)), load: before.load * .6, loss: Math.min(before.loss, .4), response: Math.min(before.response, Math.max(baseline.response * 1.05, before.response * .6)) }
    : mode === 'capacity'
      ? { latency: before.latency * .72, load: before.load * .68, loss: before.loss * .5, response: before.response * .62 }
      : mode === 'isolate'
        ? { latency: before.latency, load: before.load * .8, loss: before.loss * .5, response: before.response }
        : { ...before };
  const anomaliesBefore = detected ? 1 : 0;
  const anomaliesAfter = mode === 'isolate' ? 1 : 0;
  const stabilized = record.threat_level !== 'Critical' && after.latency < 120 && after.loss < 3 && after.load < 85 && (mode !== 'isolate');
  return {
    record, priority: priority || { key: 'custom', label: anomalyType }, routeKey: key, routeStat, baseline, trafficChange, anomaly: { detected, type: anomalyType, cause: ANOMALY_CAUSES[anomalyType] || 'Metrics stayed within the normal operating range.' },
    prediction, confidence, recommendation: { ...recommendation, ml: mlRecommendation, path: recommendedPath }, before, after, simulated: true,
    health: { before: healthScore(before.load, before.loss, anomaliesBefore), after: healthScore(after.load, after.loss, anomaliesAfter) }, stabilized,
    color: flowColorForRecord(record),
  };
}

function flowColorForRecord(record) {
  if (record.data_priority === 'Critical') return COLORS.yellow;
  if (record.source_type === 'AI' || record.destination_type === 'AI') return COLORS.purple;
  if (Number(record.transfer_speed_mbps) > 500) return COLORS.cyan;
  return COLORS.blue;
}

function initSituationStory() {
  if (!storyLayer) { storyLayer = new THREE.Group(); storyLayer.name = 'Situation story'; scene.add(storyLayer); }
  if (!state.situation) state.situation = selectSituation();
  state.storyActive = true;
  situationStory.state = 'loading';
  applyFlowVisibility();
  $('#situation-panel').hidden = true;
  return state.situation;
}

// ---- timers (all registered so restart/exit can cancel everything)
function later(fn, ms) {
  const handle = setTimeout(() => { situationStory.timers = situationStory.timers.filter((item) => item !== handle); fn(); }, ms);
  situationStory.timers.push(handle);
  return handle;
}

function clearStoryTimers() {
  situationStory.timers.forEach((handle) => clearTimeout(handle));
  situationStory.timers = [];
}

// ---- scene helpers
function clearStoryScene() {
  interactiveObjects = interactiveObjects.filter((object) => !object.userData.route?.story);
  releaseParticles(storyParticles);
  storyParticles = [];
  if (storyLayer) disposeGroup(storyLayer);
  situationStory.entries = [];
  situationStory.pulses = [];
  situationStory.markers = [];
  situationStory.focusedNodes.forEach((id) => setNodeStatusColor(id, null));
  situationStory.focusedNodes = [];
  situationStory.showPrediction = false;
  situationStory.mix = 0;
}

function subCurve(curve, t0, t1, samples = 28) {
  const points = [];
  for (let i = 0; i <= samples; i += 1) points.push(curve.getPointAt(t0 + (t1 - t0) * (i / samples)));
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

function storyRouteCurve(source, destination, index = 0) {
  const style = state.routeStyles?.get(`${source}→${destination}`);
  const conduit = makeConduitCurve(source, destination, index);
  if (style === 'arc' || !conduit || curveCrossesForeignIsland(conduit, source, destination)) return { curve: makeSkyArc(source, destination, index), arc: true };
  return { curve: conduit, arc: false };
}

function buildStoryRoute({ source, destination, color, record = null, dim = 1, anomalous = false, speedScale = 1, broken = false, densityScale = 1, sizeScale = 1, withParticles = true, index = 0, layer = storyLayer, list = storyParticles, entries = situationStory.entries }) {
  const quality = cityQuality();
  const stat = state.routeStats.find((route) => route.source === source && route.destination === destination);
  const routeIndex = stat?.index ?? index;
  const metrics = record || stat || { transfer_speed_mbps: 300, data_volume_mb: 150, bandwidth_usage_percent: 40, network_load_percent: 40, active_connections: 150 };
  const route = {
    ...(stat || {}),
    key: `story:${source}→${destination}`, source, destination, index: routeIndex, story: true,
    latency: Number(metrics.latency_ms ?? stat?.latency ?? 0), packetLoss: Number(metrics.packet_loss_percent ?? stat?.packetLoss ?? 0),
    routeStatus: metrics.route_status ?? stat?.routeStatus ?? 'Optimal', anomalyStatus: metrics.anomaly_status ?? stat?.anomalyStatus ?? 'Normal', anomalyCount: stat?.anomalyCount ?? (record && record.anomaly_status !== 'Normal' ? 1 : 0),
    speed: Number(metrics.transfer_speed_mbps ?? metrics.speed ?? 300),
    volume: Number(metrics.data_volume_mb ?? metrics.volume ?? 150) * densityScale,
    bandwidth: Number(metrics.bandwidth_usage_percent ?? metrics.bandwidth ?? 40),
    networkLoad: Number(metrics.network_load_percent ?? metrics.networkLoad ?? 40),
    connections: Number(metrics.active_connections ?? metrics.connections ?? 150),
  };
  const { curve, arc } = storyRouteCurve(source, destination, routeIndex);
  if (!curve) return null;
  const before = layer.children.length; const beforeParticles = list.length;
  const options = { quality, particleLimit: withParticles ? clamp(Math.round(route.connections / 40), 4, 14) : 0, trailCount: quality.fast ? 1 : 3, density: 1, list, unique: true, radiusScale: .8 + clamp(route.bandwidth / 100, 0, 1) * .7, sizeScale, glowScale: .6 + clamp(route.networkLoad / 100, 0, 1) * 1.2, anomalous };
  if (arc) addSkyArc(layer, route, curve, color, { ...options, list, particleLimit: withParticles ? 4 : 0, size: .22 * sizeScale });
  else if (broken) {
    addConduit(layer, route, subCurve(curve, 0, .44), color, options);
    addConduit(layer, route, subCurve(curve, .56, 1), color, { ...options, particleLimit: 0 });
  } else addConduit(layer, route, curve, color, options);
  const objects = layer.children.slice(before);
  const items = list.slice(beforeParticles);
  items.forEach((item) => { item.speedScale = speedScale; item.baseVisible = true; });
  const entry = { source, destination, color, objects, items, curve, dim: 1, arc };
  entries.push(entry);
  if (dim < 1) dimStoryEntry(entry, dim);
  return entry;
}

function dimStoryEntry(entry, factor) {
  entry.dim = factor;
  entry.objects.forEach((object) => {
    const material = object.material;
    if (!material) return;
    if (material.uniforms?.uOpacity) { material.userData.baseOpacity ??= material.uniforms.uOpacity.value; material.uniforms.uOpacity.value = material.userData.baseOpacity * factor; }
    else if (material.transparent && !material.userData.shared) { material.userData.baseOpacity ??= material.opacity; material.opacity = material.userData.baseOpacity * factor; }
  });
  entry.items.forEach((item) => {
    const { core, halo } = item.object.userData;
    core.material.userData.baseOpacity ??= core.material.opacity; halo.material.userData.baseOpacity ??= halo.material.opacity;
    core.material.opacity = core.material.userData.baseOpacity * factor; halo.material.opacity = halo.material.userData.baseOpacity * factor;
    item.trails.forEach((trail) => { trail.material.userData.baseOpacity ??= trail.material.opacity; trail.material.opacity = trail.material.userData.baseOpacity * factor; });
  });
}

function addStoryPulse(id, color, { intensity = .28, radius = null } = {}) {
  const node = nodeObjects.get(id);
  if (!node) return null;
  const metrics = CITY_NODE[id] || { portRadius: 2 };
  const ring = new THREE.Mesh(gRing(1, 1.08, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: intensity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(node.position.x, CITY.islandTop + .1, node.position.z);
  ring.userData.baseScale = radius || (metrics.portRadius || 2) + 1.6;
  ring.userData.phase = pseudoRandom(node.position.x) * Math.PI;
  ring.userData.baseOpacity = intensity;
  ring.scale.setScalar(ring.userData.baseScale);
  storyLayer.add(ring);
  situationStory.pulses.push(ring);
  situationStory.focusedNodes.push(id);
  setNodeStatusColor(id, color);
  return ring;
}

function addStoryMarker(id, text) {
  const node = nodeObjects.get(id);
  if (!node) return null;
  const chip = makeAlertChip(text);
  chip.position.set(node.position.x, CITY.islandTop + (CITY_NODE[id]?.height || 8) + 4.6, node.position.z);
  chip.userData.phase = 0;
  storyLayer.add(chip);
  situationStory.markers.push(chip);
  return chip;
}

function addAnalysisPulse(entry) {
  const ai = nodeObjects.get('AI-Engine');
  if (!ai || !entry) return;
  const start = entry.curve.getPoint(.5);
  const end = new THREE.Vector3(ai.position.x, CITY.islandTop + 5, ai.position.z);
  const mid = start.clone().lerp(end, .5); mid.y = Math.max(start.y, end.y) + 8 + start.distanceTo(end) * .12;
  const curve = new THREE.CatmullRomCurve3([start, mid, end], false, 'centripetal');
  const points = curve.getPoints(60);
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0xc79bff, dashSize: .9, gapSize: .6, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  line.computeLineDistances();
  storyLayer.add(line);
  for (let i = 0; i < 3; i += 1) {
    const particle = acquireParticle(COLORS.purple, .3, .9);
    storyLayer.add(particle);
    const trail = acquireTrail(COLORS.purple, .3, .22);
    storyLayer.add(trail);
    storyParticles.push({ object: particle, trails: [trail], curve, phase: i / 3, speed: .09, speedScale: 1, baseVisible: true, route: { key: 'analysis' } });
  }
  addStoryPulse('AI-Engine', COLORS.purple, { intensity: .2 });
}

function storyCameraFocus(ids, { lift = 4, back = 1 } = {}) {
  const points = ids.map((id) => nodeObjects.get(id)?.position).filter(Boolean);
  if (!points.length) return;
  const centroid = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).multiplyScalar(1 / points.length);
  let spread = 12;
  points.forEach((a) => points.forEach((b) => { spread = Math.max(spread, a.distanceTo(b)); }));
  const tallest = Math.max(...ids.map((id) => CITY_NODE[id]?.height || 8));
  const target = centroid.clone().add(new THREE.Vector3(0, lift + tallest * .25, 0));
  const position = target.clone().add(new THREE.Vector3(spread * .18, 15 + spread * .5 + tallest * .35, (24 + spread * .78) * back));
  situationStory.cameraGoalForStep = { position, target };
  if (!situationStory.paused) { cameraGoal = { position, target }; controls.autoRotate = false; }
}

function storyCameraOverview() {
  situationStory.cameraGoalForStep = cityCameraView();
  if (!situationStory.paused) { cameraGoal = cityCameraView(); controls.autoRotate = false; }
}

// ---- step definitions
const SITUATION_STEPS = [
  { id: 'intro', title: 'Data generated' }, { id: 'collection', title: 'Data collected' }, { id: 'movement', title: 'Data movement' }, { id: 'change', title: 'Situation changed' },
  { id: 'processed', title: 'Data processed' }, { id: 'analysis', title: 'Analysis' }, { id: 'anomaly', title: 'Anomaly detection' }, { id: 'prediction', title: 'AI prediction' },
  { id: 'recommendation', title: 'Recommendation' }, { id: 'optimization', title: 'Optimization simulation' }, { id: 'comparison', title: 'Before and after' }, { id: 'result', title: 'Result' },
];

function situationLines(index, s) {
  const r = s.record;
  const num = (value, digits = 1) => formatNumber(value, digits);
  const count = (to, digits, suffix) => ({ count: { to: Number(to), digits, suffix } });
  switch (SITUATION_STEPS[index].id) {
    case 'intro': return [
      { text: `Data generated by ${r.source_department || r.source_type}.` }, { text: `Source: ${r.source_id}` }, { text: `Destination: ${r.destination_id}` }, { text: `Data volume: ${num(r.data_volume_mb)} MB` },
    ];
    case 'collection': return [
      { text: 'Transfer speed: ', ...count(r.transfer_speed_mbps, 1, ' Mbps') }, { text: 'Latency: ', ...count(r.latency_ms, 1, ' ms') }, { text: 'Packet loss: ', ...count(r.packet_loss_percent, 2, '%') }, { text: 'Network load: ', ...count(r.network_load_percent, 1, '%') },
    ];
    case 'movement': return [
      { text: `Route ${r.source_id} → ${r.destination_id} is carrying the transfer.` }, { text: `Particle size follows ${num(r.data_volume_mb)} MB of volume; speed follows ${num(r.transfer_speed_mbps)} Mbps.` }, { text: `Route thickness follows ${num(r.bandwidth_usage_percent)}% bandwidth; glow follows ${num(r.network_load_percent)}% load.` },
    ];
    case 'change': {
      const normal = Math.abs(s.trafficChange) < 15 && r.latency_ms < 90 && r.network_load_percent < 70 && r.packet_loss_percent < 1;
      if (normal) return [{ text: 'Traffic remains within the normal operating range.' }, { text: `Baseline latency ${num(s.baseline.latency)} ms · current ${num(r.latency_ms)} ms` }];
      return [
        { text: `Traffic ${s.trafficChange >= 0 ? 'increased' : 'decreased'} by ${num(Math.abs(s.trafficChange))}% against the ${s.baseline.fromSameRoute ? 'route' : 'network'} baseline.` },
        { text: `Latency changed from ${num(s.baseline.latency)} ms to ${num(r.latency_ms)} ms` }, { text: `Network load reached ${num(r.network_load_percent)}%` },
      ];
    }
    case 'processed': return [
      { text: `${r.destination_id} ${r.connection_status === 'Failed' ? 'did not acknowledge' : 'received'} the data.` }, { text: `Response time: ${num(r.response_time_ms)} ms` }, { text: `Queue length: ${r.queue_length}` }, { text: `Connection status: ${r.connection_status}` },
    ];
    case 'analysis': return [
      { text: 'AI Engine is analysing the network behaviour.' }, { text: `Bandwidth usage: ${num(r.bandwidth_usage_percent)}%` }, { text: `Active connections: ${formatNumber(r.active_connections)}` }, { text: `Threat level: ${r.threat_level}` }, { text: `Route status: ${r.route_status}` },
    ];
    case 'anomaly': return s.anomaly.detected
      ? [{ text: `Anomaly detected: ${s.anomaly.type}`, tone: 'warn' }, { text: `Affected route: ${r.source_id} → ${r.destination_id}` }, { text: `Possible cause: ${s.anomaly.cause}` }]
      : [{ text: 'No anomaly detected.', tone: 'ok' }, { text: 'Isolation Forest scored this record inside the normal cluster.' }];
    case 'prediction': {
      const p = s.prediction;
      if (!p) return [{ text: 'No node-level prediction is available for this route.' }, { text: `Prediction confidence: ${s.confidence}%` }];
      return [
        { text: `Forecast for ${p.node} (${p.forecast_basis || 'Random Forest'})` }, { text: `Predicted traffic: ${num(p.predicted.data_volume_mb)} MB` }, { text: `Predicted network load: ${num(p.predicted.network_load_percent)}%` },
        { text: `Predicted latency: ${num(p.predicted.latency_ms, 0)} ms` }, { text: `Prediction confidence: ${s.confidence}%` }, { text: 'CURRENT DATA FLOW', tone: 'legend-current' }, { text: 'AI PREDICTED DATA FLOW', tone: 'legend-predicted' },
      ];
    }
    case 'recommendation': {
      const lines = [{ text: s.recommendation.text, tone: 'ok' }];
      if (s.recommendation.path) lines.push({ text: `Recommended route: ${s.recommendation.path.join(' → ')}` });
      else if (s.recommendation.mode === 'capacity') lines.push({ text: `Action target: ${r.destination_id} capacity` });
      else if (s.recommendation.mode === 'isolate') lines.push({ text: `Action target: isolate ${r.source_id} → ${r.destination_id}` });
      if (s.recommendation.ml) lines.push({ text: `Model note: ${s.recommendation.ml.reason}` });
      return lines;
    }
    case 'optimization': return [
      { text: 'Applying recommended optimization…' }, { text: s.recommendation.path ? 'Traffic is migrating to the recommended route.' : s.recommendation.mode === 'capacity' ? `${r.destination_id} capacity is being increased.` : s.recommendation.mode === 'isolate' ? 'The route is being isolated for investigation.' : 'Monitoring continues on the current route.' }, { text: `Route status: ${r.route_status} → ${s.stabilized ? 'Optimal' : r.route_status}` },
    ];
    case 'comparison': return [
      { text: 'SIMULATED RESULT', tone: 'label' },
      { text: `Latency: ${num(s.before.latency)} ms → ${num(s.after.latency)} ms` }, { text: `Network load: ${num(s.before.load)}% → ${num(s.after.load)}%` }, { text: `Packet loss: ${num(s.before.loss, 2)}% → ${num(s.after.loss, 2)}%` }, { text: `Response time: ${num(s.before.response)} ms → ${num(s.after.response)} ms` },
    ];
    case 'result': return [
      { text: s.stabilized ? 'Network situation stabilized.' : 'Critical issue requires manual investigation.', tone: s.stabilized ? 'ok' : 'warn' },
      { text: `System health: ${s.health.before}% → ${s.health.after}% (simulated)` },
    ];
    default: return [];
  }
}

function situationScene(index, s) {
  clearStoryScene();
  const r = s.record; const src = r.source_id; const dst = r.destination_id;
  const step = SITUATION_STEPS[index].id;
  const slow = Number(r.latency_ms) > 120 || Number(r.packet_loss_percent) > 3;
  const failed = r.connection_status === 'Failed' || s.anomaly.type === 'Failed Connection';
  const affectedColor = s.anomaly.detected ? COLORS.red : s.color;
  const loadDensity = clamp(1 + s.trafficChange / 100, .6, 1.8);
  const affected = (dim, overrides = {}) => buildStoryRoute({ source: src, destination: dst, color: affectedColor, record: r, dim, anomalous: s.anomaly.detected, speedScale: slow ? .3 : 1, broken: failed, ...overrides });
  const recommended = (dim = 1, visibleFraction = 1) => {
    const path = s.recommendation.path;
    if (!path) return [];
    const entries = [];
    for (let i = 0; i < path.length - 1; i += 1) {
      const entry = buildStoryRoute({ source: path[i], destination: path[i + 1], color: COLORS.green, dim, index: i + 1, densityScale: .9 });
      if (entry) entries.push(entry);
    }
    entries.forEach((entry) => entry.items.forEach((item, i) => { item.object.visible = i < Math.ceil(entry.items.length * visibleFraction); item.trails.forEach((trail) => { trail.visible = item.object.visible; }); }));
    return entries;
  };
  situationStory.showPrediction = false;
  switch (step) {
    case 'intro':
    case 'collection':
      addStoryPulse(src, s.color, { intensity: .26 });
      storyCameraFocus([src]);
      break;
    case 'movement':
      buildStoryRoute({ source: src, destination: dst, color: s.color, record: r });
      storyCameraFocus([src, dst]);
      break;
    case 'change':
      buildStoryRoute({ source: src, destination: dst, color: s.color, record: r, densityScale: loadDensity, sizeScale: clamp(.8 + s.trafficChange / 200, .7, 1.4) });
      storyCameraFocus([src, dst]);
      break;
    case 'processed': {
      const success = r.connection_status !== 'Failed' && r.route_status !== 'Blocked';
      buildStoryRoute({ source: src, destination: dst, color: success ? COLORS.green : s.color, record: r, broken: failed });
      addStoryPulse(dst, success ? COLORS.green : 0xffb347, { intensity: .26 });
      storyCameraFocus([dst]);
      break;
    }
    case 'analysis': {
      const entry = buildStoryRoute({ source: src, destination: dst, color: s.color, record: r, dim: .25 });
      addAnalysisPulse(entry);
      storyCameraFocus([src, dst, 'AI-Engine']);
      break;
    }
    case 'anomaly':
      if (s.anomaly.detected) {
        affected(1);
        addStoryPulse(s.anomaly.type === 'Suspicious Traffic' ? src : dst, COLORS.red, { intensity: .32 });
        addStoryMarker(s.anomaly.type === 'Suspicious Traffic' ? src : dst, `${s.anomaly.type.toUpperCase()}  •  ${(s.anomaly.type === 'Suspicious Traffic' ? src : dst).toUpperCase()}`);
      } else buildStoryRoute({ source: src, destination: dst, color: s.color, record: r });
      storyCameraFocus([src, dst]);
      break;
    case 'prediction': {
      affected(.22);
      situationStory.showPrediction = true;
      const path = state.ml?.predictive_flow?.predicted || [src, dst];
      storyCameraFocus([...new Set([...path, src, dst])], { lift: 6 });
      break;
    }
    case 'recommendation':
      affected(.22);
      if (s.recommendation.path) { recommended(1, 1); storyCameraFocus([...new Set(s.recommendation.path)], { lift: 5 }); }
      else { addStoryPulse(s.recommendation.mode === 'isolate' ? src : dst, s.recommendation.mode === 'isolate' ? 0xffb347 : COLORS.green, { intensity: .3 }); storyCameraFocus([src, dst]); }
      break;
    case 'optimization': {
      const entry = affected(1);
      if (s.anomaly.detected) addStoryPulse(dst, COLORS.red, { intensity: .3 });
      const greens = recommended(1, 0);
      const ids = new Set([src, dst, ...(s.recommendation.path || [])]);
      storyCameraFocus([...ids], { lift: 5 });
      runOptimizationTween(entry, greens, s);
      break;
    }
    case 'comparison':
      affected(.22);
      recommended(1, 1);
      if (!s.recommendation.path) addStoryPulse(dst, s.stabilized ? COLORS.green : 0xffb347, { intensity: .2 });
      storyCameraFocus([...new Set([src, dst, ...(s.recommendation.path || [])])], { lift: 5 });
      break;
    case 'result':
      affected(.18);
      recommended(1, 1);
      storyCameraOverview();
      break;
    default: break;
  }
  applyFlowVisibility();
}

function runOptimizationTween(affectedEntry, greenEntries, s) {
  const ticks = 40;
  const total = 5200;
  situationStory.mix = 0;
  const apply = (mix) => {
    situationStory.mix = mix;
    if (affectedEntry) affectedEntry.items.forEach((item, i) => { const hide = i < Math.floor(mix * affectedEntry.items.length); item.object.visible = !hide; item.trails.forEach((trail) => { trail.visible = !hide; }); });
    greenEntries.forEach((entry) => entry.items.forEach((item, i) => { const show = i < Math.ceil(mix * entry.items.length); item.object.visible = show; item.trails.forEach((trail) => { trail.visible = show; }); }));
    situationStory.pulses.forEach((ring) => { ring.userData.baseOpacity = ring.userData.startOpacity ?? (ring.userData.startOpacity = ring.userData.baseOpacity); ring.userData.baseOpacity = ring.userData.startOpacity * (1 - mix); });
    if (affectedEntry && !greenEntries.length && s.recommendation.mode !== 'monitor') dimStoryEntry(affectedEntry, 1 - mix * .7);
    if (mix >= 1) {
      const target = s.record.destination_id;
      if (s.stabilized) setNodeStatusColor(target, COLORS.green);
    }
  };
  for (let tick = 1; tick <= ticks; tick += 1) later(() => apply(tick / ticks), (total / ticks) * tick);
}

// ---- panel rendering
function renderSituationPanel(index) {
  const s = state.situation;
  const step = SITUATION_STEPS[index];
  $('#situation-counter').textContent = `STEP ${String(index + 1).padStart(2, '0')} / ${SITUATION_STEPS.length}`;
  $('#situation-title').textContent = step.title;
  $('#situation-kind').textContent = (s.priority?.label || 'Network situation').toUpperCase();
  $('#situation-progress').style.width = `${((index + 1) / SITUATION_STEPS.length) * 100}%`;
  $('#situation-lines').innerHTML = '';
  $('#situation-result').hidden = true;
  $('#situation-pause').textContent = situationStory.paused ? 'RESUME' : 'PAUSE';
  $('#situation-prev').disabled = index === 0;
  $('#situation-next').disabled = index >= SITUATION_STEPS.length - 1;
}

function appendSituationLine(line) {
  const container = $('#situation-lines');
  const element = document.createElement('p');
  element.className = `situation-line${line.tone ? ` tone-${line.tone}` : ''}`;
  if (line.count) {
    const label = document.createElement('span'); label.textContent = line.text;
    const value = document.createElement('b'); value.textContent = `0${line.count.suffix}`;
    element.appendChild(label); element.appendChild(value);
    const ticks = 18;
    for (let tick = 1; tick <= ticks; tick += 1) later(() => { value.textContent = `${formatNumber(line.count.to * (tick / ticks), line.count.digits)}${line.count.suffix}`; }, 45 * tick);
  } else element.textContent = line.text;
  container.appendChild(element);
  requestAnimationFrame(() => element.classList.add('visible'));
}

function revealNextSituationLine() {
  const lines = situationLines(situationStory.index, state.situation);
  if (situationStory.lineIndex < lines.length) {
    appendSituationLine(lines[situationStory.lineIndex]);
    situationStory.lineIndex += 1;
    later(revealNextSituationLine, lines[situationStory.lineIndex - 1]?.count ? 1250 : 950);
    return;
  }
  situationStory.linesDone = true;
  if (situationStory.index >= SITUATION_STEPS.length - 1) { situationStory.state = 'completed'; $('#situation-result').hidden = false; $('#situation-state').textContent = 'COMPLETED'; return; }
  later(() => { if (!situationStory.paused) nextSituationStep(); }, situationStory.index === 9 ? 5600 : 3800);
}

function showSituationStep(index) {
  if (!state.situation) return;
  clearStoryTimers();
  situationStory.index = clamp(index, 0, SITUATION_STEPS.length - 1);
  situationStory.state = SITUATION_STEPS[situationStory.index].id;
  situationStory.lineIndex = 0;
  situationStory.linesDone = false;
  state.storyActive = true;
  $('#situation-panel').hidden = false;
  $('#situation-state').textContent = situationStory.paused ? 'PAUSED' : 'LIVE';
  renderSituationPanel(situationStory.index);
  situationScene(situationStory.index, state.situation);
  later(revealNextSituationLine, 250);
}

function startSituationStory({ confirmRestart = false } = {}) {
  const running = !['loading', 'completed', 'explore'].includes(situationStory.state);
  if (running && confirmRestart && typeof window.confirm === 'function' && !window.confirm('Restart the live network situation from step 1?')) return false;
  exitSystemFlow({ resetCamera: false });
  clearStoryTimers();
  clearStoryScene();
  exitRouteFocus({ restoreCamera: false });
  if (!state.situation) initSituationStory();
  if (!storyLayer) initSituationStory();
  setCineCamera(false);
  if (state.visualMode !== 'city') setVisualizationMode('city', false);
  situationStory.paused = false;
  state.storyActive = true;
  $('#selection-panel').classList.remove('open');
  setDrawer('left', false); setDrawer('right', false);
  showSituationStep(0);
  return true;
}

function pauseSituationStory() {
  situationStory.paused = true;
  clearStoryTimers();
  cameraGoal = null;
  $('#situation-pause').textContent = 'RESUME';
  $('#situation-state').textContent = 'PAUSED';
}

function resumeSituationStory() {
  situationStory.paused = false;
  $('#situation-pause').textContent = 'PAUSE';
  $('#situation-state').textContent = 'LIVE';
  if (situationStory.cameraGoalForStep) cameraGoal = situationStory.cameraGoalForStep;
  if (situationStory.state === 'completed') return;
  if (situationStory.linesDone) { later(() => nextSituationStep(), 1200); return; }
  revealNextSituationLine();
}

function toggleSituationPause() {
  if (situationStory.paused) resumeSituationStory(); else pauseSituationStory();
}

function nextSituationStep() {
  if (situationStory.index >= SITUATION_STEPS.length - 1) return;
  showSituationStep(situationStory.index + 1);
}

function previousSituationStep() {
  if (situationStory.index <= 0) return;
  showSituationStep(situationStory.index - 1);
}

function skipSituationStory() {
  showSituationStep(SITUATION_STEPS.length - 1);
}

function replaySituationStory() {
  startSituationStory();
}

function exitSituationStory() {
  enterExploreMode();
}

function enterExploreMode() {
  clearStoryTimers();
  clearStoryScene();
  situationStory.paused = false;
  situationStory.state = 'explore';
  situationStory.cameraGoalForStep = null;
  state.storyActive = false;
  $('#situation-panel').hidden = true;
  applyFlowVisibility();
  if (state.visualMode === 'city') resetCamera();
}

function applyFlowVisibility() {
  const isCity = state.visualMode === 'city';
  currentLayer.visible = isCity && state.layers.current && !state.storyActive;
  predictedLayer.visible = isCity && state.layers.predicted && (!state.storyActive || !!situationStory.showPrediction);
  if (storyLayer) storyLayer.visible = isCity && !!state.storyActive;
  if (flowLayer) flowLayer.visible = isCity && !!systemFlow.shown;
  if (focusLayer) focusLayer.visible = isCity && !state.storyActive;
}

function bindSituationControls() {
  $('#situation-prev').addEventListener('click', previousSituationStep);
  $('#situation-next').addEventListener('click', nextSituationStep);
  $('#situation-pause').addEventListener('click', toggleSituationPause);
  $('#situation-skip').addEventListener('click', skipSituationStory);
  $('#situation-close').addEventListener('click', exitSituationStory);
  $('#situation-replay').addEventListener('click', replaySituationStory);
  $('#situation-explore').addEventListener('click', enterExploreMode);
}

// Legacy Story Mode entry points now drive the situation story.
function startStory() { startSituationStory({ confirmRestart: true }); }
function setStoryStep(index) { showSituationStep(index); }
function exitStory() { enterExploreMode(); }

function selectSituation() {
  const selection = selectSituationRecord(state.data, state.ml);
  if (selection) return buildSituationFromRecord(selection.record, state.ml, selection.priority);
  return buildSituationFromRecord(makeFallbackSituationRecord(), state.ml, { key: 'fallback', label: 'Demonstration situation' });
}

// ---------------------------------------------------------------------------------------------
// SYSTEM FLOW — functional building story
// Development → API Gateway → Server → Database → Server → Cloud, then Security Hub, AI Engine and
// IoT Gateway as secondary flows. Every hop is driven by a real dataset row (the latest row for the
// pair, or the highest-load row in PEAK mode). File names such as "project_build.zip" are storytelling
// metaphors only: the dataset holds no filenames or file contents. Numbers shown on labels come from
// the selected row (volume, speed, load, queue, latency, IoT messages, status fields).
// ---------------------------------------------------------------------------------------------

const FLOW_TONES = {
  cyan: { border: 'rgba(57,231,255,.95)', fill: 'rgba(4,18,30,.92)', color: '#dffaff' },
  blue: { border: 'rgba(18,156,255,.95)', fill: 'rgba(4,14,30,.92)', color: '#dbefff' },
  green: { border: 'rgba(46,234,139,.95)', fill: 'rgba(3,24,16,.92)', color: '#dcffe9' },
  yellow: { border: 'rgba(255,212,38,.95)', fill: 'rgba(30,22,3,.92)', color: '#fff4c4' },
  red: { border: 'rgba(255,60,78,.95)', fill: 'rgba(48,6,14,.94)', color: '#ffd9dd' },
  purple: { border: 'rgba(164,93,255,.95)', fill: 'rgba(22,8,40,.92)', color: '#efe0ff' },
};
const FLOW_HEX = { cyan: COLORS.cyan, blue: COLORS.blue, green: COLORS.green, yellow: COLORS.yellow, red: COLORS.red, purple: COLORS.purple };
const FLOW_EASE = {
  linear: (t) => t,
  in: (t) => t * t * t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};
// Cabinet dimensions mirror buildServerTower so overlays sit on the real facade.
const SERVER_SPECS = {
  'Server-01': { width: 3.8, depth: 3.4, height: 10.4 },
  'Server-02': { width: 4.0, depth: 3.6, height: 13.2 },
  'Server-03': { width: 3.4, depth: 3.2, height: 9.2 },
  'Server-04': { width: 6.6, depth: 4.6, height: 5.6 },
};

let flowLayer = null;
let flowParticles = [];
let flowAnims = [];
const flowFollowTarget = new THREE.Vector3();
const systemFlow = {
  active: false, shown: false, sequence: null, index: -1, state: 'idle', profile: 'story',
  ids: null, records: {}, routes: [], mainRoutes: [], transient: [], persistent: [], escorts: [], cloudBlocked: false,
  packet: null, cameraBase: null, follow: null, nodeStates: new Map(),
};

class FlowCancelled extends Error {
  constructor() { super('flow cancelled'); this.cancelled = true; }
}

// Frame-driven sequence controller: phases run one after another, each awaiting waits/tweens that are
// advanced from animate(). Pause freezes time; skip/prev cancel the pending awaits and jump.
class FlowSequence {
  constructor(phases, hooks = {}) {
    this.phases = phases; this.hooks = hooks;
    this.active = false; this.paused = false; this.index = -1; this.nextIndex = null;
    this.time = 0; this.pending = [];
  }
  wait(seconds) {
    return new Promise((resolve, reject) => { this.pending.push({ kind: 'wait', end: this.time + Math.max(0, seconds), resolve, reject }); });
  }
  tween(seconds, onUpdate, easing = 'inOut') {
    const ease = FLOW_EASE[easing] || FLOW_EASE.inOut;
    return new Promise((resolve, reject) => {
      if (seconds <= 0) { onUpdate(1, 1); resolve(); return; }
      this.pending.push({ kind: 'tween', start: this.time, duration: seconds, onUpdate, ease, resolve, reject });
    });
  }
  update(delta) {
    if (!this.active || this.paused || !this.pending.length) return;
    this.time += delta;
    const done = [];
    this.pending.slice().forEach((item) => {
      if (item.kind === 'wait') { if (this.time >= item.end) done.push(item); return; }
      const raw = clamp((this.time - item.start) / item.duration, 0, 1);
      try { item.onUpdate(item.ease(raw), raw); } catch (error) { console.error('[system flow tween]', error); done.push(item); return; }
      if (raw >= 1) done.push(item);
    });
    if (done.length) {
      this.pending = this.pending.filter((item) => !done.includes(item));
      done.forEach((item) => item.resolve());
    }
  }
  rejectPending() {
    const pending = this.pending; this.pending = [];
    pending.forEach((item) => item.reject(new FlowCancelled()));
  }
  jump(index) { this.nextIndex = clamp(index, 0, this.phases.length - 1); this.rejectPending(); }
  stop() { this.active = false; this.rejectPending(); }
  async run(startIndex = 0) {
    this.active = true; this.index = startIndex; this.nextIndex = null;
    while (this.active && this.index < this.phases.length) {
      const phase = this.phases[this.index];
      this.hooks.onPhase?.(phase, this.index);
      try { await phase.run(this); } catch (error) { if (!error?.cancelled) console.error('[system flow]', phase.id, error); }
      if (!this.active) return;
      if (this.nextIndex !== null) { this.index = this.nextIndex; this.nextIndex = null; } else this.index += 1;
    }
    if (this.active) { this.active = false; this.hooks.onComplete?.(); }
  }
}

// ---- scene object management
function ensureFlowLayer() {
  if (!flowLayer) { flowLayer = new THREE.Group(); flowLayer.name = 'System flow'; scene.add(flowLayer); }
  return flowLayer;
}

function flowAdd(object, { persistent = false, update = null, parent = null } = {}) {
  (parent || ensureFlowLayer()).add(object);
  (persistent ? systemFlow.persistent : systemFlow.transient).push(object);
  if (update) flowAnims.push({ object, update });
  return object;
}

function flowRemove(object) {
  if (!object) return;
  object.removeFromParent();
  flowAnims = flowAnims.filter((item) => item.object !== object);
  systemFlow.transient = systemFlow.transient.filter((item) => item !== object);
  systemFlow.persistent = systemFlow.persistent.filter((item) => item !== object);
  object.traverse((child) => {
    if (child.geometry && !child.geometry.userData?.shared) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
    materials.forEach((material) => {
      if (material.userData?.shared) return;
      if (material.map && !material.map.userData?.shared) material.map.dispose();
      material.dispose?.();
    });
  });
}

function flowClearTransient() {
  systemFlow.transient.slice().forEach(flowRemove);
  systemFlow.transient = [];
}

function flowReleaseEscort(body) {
  if (!systemFlow.escorts.includes(body)) return;
  systemFlow.escorts = systemFlow.escorts.filter((item) => item !== body);
  body.removeFromParent();
  particlePool.bodies.push(body);
}

function whatIfReset() {
  whatIf.mainBranchDone = false;
  whatIf.active = false;
  whatIf.entries = [];
  systemFlow.cloudBlocked = false;
  clearWhatIfCards();
  setSceneDim(false);
}

function flowClearAll() {
  systemFlow.escorts.slice().forEach(flowReleaseEscort);
  releaseParticles(flowParticles);
  flowParticles = [];
  flowAnims = [];
  if (flowLayer) disposeGroup(flowLayer);
  systemFlow.transient = []; systemFlow.persistent = []; systemFlow.routes = []; systemFlow.mainRoutes = [];
  systemFlow.packet = null; systemFlow.follow = null; systemFlow.cameraBase = null;
}

// ---- labels (world-space holographic chips)
function makeFlowLabel(text, tone = 'cyan', { size = 40, width = 640, scale = 1 } = {}) {
  const style = FLOW_TONES[tone] || FLOW_TONES.cyan;
  const chip = makeChipTexture(text, { border: style.border, fill: style.fill, color: style.color, size, weight: 700, width, height: 112 });
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: chip.texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false }));
  const spriteWidth = (width / 512) * 9.4 * scale;
  sprite.scale.set(spriteWidth, spriteWidth * (112 / width), 1);
  sprite.renderOrder = 22;
  return sprite;
}

async function flowSay(seq, text, position, { tone = 'cyan', hold = 1, fade = .3, lift = 0, attach = null, persistent = false, scale = 1 } = {}) {
  const label = makeFlowLabel(text, tone, { scale });
  label.position.copy(position); label.position.y += lift;
  flowAdd(label, { persistent, update: attach ? () => { label.position.copy(attach.position); label.position.y += lift; } : null });
  await seq.tween(fade, (p) => { label.material.opacity = p * .97; }, 'out');
  if (hold === null) return label;
  await seq.wait(hold);
  await flowFade(seq, label, fade);
  return null;
}

async function flowFade(seq, label, fade = .3) {
  if (!label || !label.parent) return;
  const from = label.material.opacity;
  try { await seq.tween(fade, (p) => { label.material.opacity = from * (1 - p); }, 'in'); } finally { flowRemove(label); }
}

// ---- rings and bursts
function flowRing(position, color, { radius = 3, width = .08, opacity = .35, pulse = true, persistent = false, vertical = false, yaw = 0 } = {}) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius, radius + width, 64), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.position.copy(position);
  if (vertical) ring.rotation.y = yaw; else ring.rotation.x = -Math.PI / 2;
  ring.userData.phase = pseudoRandom(position.x + position.z) * Math.PI;
  flowAdd(ring, { persistent, update: pulse ? (elapsed) => { const wave = (Math.sin(elapsed * 2.6 + ring.userData.phase) + 1) / 2; ring.scale.setScalar(.94 + wave * .16); ring.material.opacity = opacity * (.55 + wave * .45); } : null });
  return ring;
}

async function flowBurstRing(seq, position, color, { from = 1, to = 8, seconds = .9, opacity = .55, vertical = false, yaw = 0 } = {}) {
  const ring = flowRing(position, color, { radius: 1, width: .09, opacity, pulse: false, vertical, yaw });
  try {
    await seq.tween(seconds, (p) => { ring.scale.setScalar(from + (to - from) * p); ring.material.opacity = opacity * (1 - p); }, 'out');
  } finally { flowRemove(ring); }
}

// ---- node helpers
function flowNodeWorld(id, local = [0, 0, 0]) {
  const node = nodeObjects.get(id);
  const base = node ? node.position : new THREE.Vector3(0, CITY.islandTop, 0);
  return new THREE.Vector3(base.x + local[0], base.y + local[1], base.z + local[2]);
}

function flowPort(id, towardId) {
  const toward = NODE_CONFIG.find((node) => node.id === towardId);
  return nodePort(id, new THREE.Vector3(toward?.position[0] || 0, 0, toward?.position[2] || 0));
}

function flowBoostLights(id, factor) {
  const node = nodeObjects.get(id);
  if (!node) return;
  node.traverse((child) => {
    if (!child.isPointLight || child.userData.cloudManaged) return;
    if (child.userData.flowBase === undefined) child.userData.flowBase = child.userData.baseIntensity ?? child.intensity;
    child.userData.baseIntensity = child.userData.flowBase * factor;
  });
}

function flowRestoreLights(id) {
  const node = nodeObjects.get(id);
  if (!node) return;
  node.traverse((child) => {
    if (child.isPointLight && child.userData.flowBase !== undefined) { child.userData.baseIntensity = child.userData.flowBase; delete child.userData.flowBase; }
  });
}

// Building states: IDLE / RECEIVING / PROCESSING / SUCCESS / WARNING / ERROR. Only the active building
// carries a state ring; everything else stays idle.
function setBuildingState(id, mode, { tone = 'cyan' } = {}) {
  if (cloudRegistry.has(id)) {
    // Cloud nodes use the dedicated cloud operation controller; SUCCESS there means the white glow.
    if (mode === 'success') cloudOperationSuccess(id);
    else if (mode === 'error') cloudOperationFailed(id);
    else setCloudState(id, mode === 'receiving' ? 'receiving' : mode === 'warning' ? 'warning' : mode === 'processing' ? 'processing' : 'idle');
    return;
  }
  const previous = systemFlow.nodeStates.get(id);
  if (previous?.ring) flowRemove(previous.ring);
  const radius = (CITY_NODE[id]?.portRadius || 2) + 1.4;
  const ground = flowNodeWorld(id, [0, .14, 0]);
  const entry = { mode, ring: null };
  switch (mode) {
    case 'receiving':
      setNodeStatusColor(id, COLORS.cyan); flowBoostLights(id, 1.6);
      entry.ring = flowRing(ground, COLORS.cyan, { radius, opacity: .3, persistent: true });
      break;
    case 'processing':
      setNodeStatusColor(id, FLOW_HEX[tone] ?? COLORS.cyan); flowBoostLights(id, tone === 'red' ? 3 : tone === 'yellow' ? 2.4 : 2);
      break;
    case 'success':
      setNodeStatusColor(id, COLORS.green); flowBoostLights(id, 2.2);
      entry.ring = flowRing(ground, COLORS.green, { radius, opacity: .32, persistent: true });
      break;
    case 'warning':
      setNodeStatusColor(id, COLORS.yellow); flowBoostLights(id, 2.4);
      entry.ring = flowRing(ground, COLORS.yellow, { radius, opacity: .36, persistent: true });
      break;
    case 'error':
      setNodeStatusColor(id, COLORS.red); flowBoostLights(id, 3);
      entry.ring = flowRing(ground, COLORS.red, { radius: radius + .6, width: .14, opacity: .48, persistent: true });
      break;
    default:
      setNodeStatusColor(id, null); flowRestoreLights(id);
      break;
  }
  systemFlow.nodeStates.set(id, entry);
}

function flowResetBuildings() {
  systemFlow.nodeStates.forEach((entry, id) => { if (entry.ring) flowRemove(entry.ring); setNodeStatusColor(id, null); flowRestoreLights(id); });
  systemFlow.nodeStates = new Map();
}

// ---- dataset access
function pickFlowRecord(source, destination) {
  const rows = state.data || [];
  const profile = systemFlow.profile;
  const worst = (list) => list.reduce((best, row) => (Number(row.network_load_percent) > Number(best.network_load_percent) ? row : best), list[0]);
  // DEMO STORY: every hop uses its latest row except the gateway -> server hop, which uses that pair's
  // worst observed row so the What-If branch has a real problem to work with. Still a real dataset row.
  const storyStress = profile === 'story' && systemFlow.ids && source === systemFlow.ids.api && destination === systemFlow.ids.server;
  const choose = (list) => (profile === 'peak' || storyStress ? worst(list) : list.at(-1));
  const exact = rows.filter((row) => row.source_id === source && row.destination_id === destination);
  if (exact.length) return { record: choose(exact), exact: true, source, destination, stress: storyStress };
  const src = NODE_CONFIG.find((node) => node.id === source); const dst = NODE_CONFIG.find((node) => node.id === destination);
  const typed = rows.filter((row) => row.source_type === src?.type && row.destination_type === dst?.type);
  if (typed.length) return { record: choose(typed), exact: false, source, destination };
  return { record: { ...makeFallbackSituationRecord(), source_id: source, destination_id: destination }, exact: false, fallback: true, source, destination };
}

function recordTone(record) {
  const failed = record.connection_status === 'Failed' || record.route_status === 'Blocked';
  if (failed || record.anomaly_status !== 'Normal' || record.threat_level === 'Critical' || Number(record.network_load_percent) > 88) return 'red';
  if (Number(record.network_load_percent) > 70 || record.route_status === 'Congested' || record.connection_status === 'Degraded' || Number(record.latency_ms) > 120) return 'yellow';
  return 'cyan';
}

function hopSeconds(record) {
  return clamp((3.0 * 380) / Math.max(Number(record.transfer_speed_mbps) || 0, 90), 1.7, 4.4);
}

function escortCount(record) {
  return clamp(Math.round(Number(record.data_volume_mb) / 40), 3, 8);
}

function packetScale(record) {
  return .85 + clamp(Number(record.data_volume_mb) / 600, 0, .6);
}

function hopNote(hop) {
  if (hop.stress) {
    const r = hop.record;
    return `${hop.source} → ${hop.destination}: worst observed row for this pair (demonstration selection) · ${formatNumber(r.data_volume_mb, 1)} MB · ${formatNumber(r.network_load_percent, 0)}% load · queue ${r.queue_length} · ${r.anomaly_status}`;
  }
  const r = hop.record;
  const base = `${hop.source} → ${hop.destination}: ${formatNumber(r.data_volume_mb, 1)} MB · ${formatNumber(r.transfer_speed_mbps, 0)} Mbps · ${formatNumber(r.bandwidth_usage_percent, 0)}% bandwidth · ${formatNumber(r.network_load_percent, 0)}% load · ${formatNumber(r.latency_ms, 0)} ms · ${r.anomaly_status}`;
  if (hop.fallback) return `${base} (no dataset row; demonstration values)`;
  if (!hop.exact) return `${base} (no direct row; nearest ${r.source_type} → ${r.destination_type} row ${r.source_id} → ${r.destination_id})`;
  return base;
}

function flowRouteColor(record) {
  const tone = recordTone(record);
  if (tone === 'red') return COLORS.red;
  return flowColorForRecord(record);
}

function buildFlowRoute(source, destination, record, color, extra = {}) {
  const entry = buildStoryRoute({ source, destination, color, record, anomalous: recordTone(record) === 'red', layer: ensureFlowLayer(), list: flowParticles, entries: systemFlow.routes, ...extra });
  if (entry) { entry.record = record; entry.objects.forEach((object) => systemFlow.persistent.push(object)); }
  return entry;
}

function recolorFlowEntry(entry, hex) {
  if (!entry) return;
  const color = new THREE.Color(hex);
  const white = new THREE.Color(0xffffff);
  entry.objects.forEach((object) => {
    const material = object.material;
    if (!material || material.userData?.shared) return;
    if (material.uniforms?.uColor) { material.uniforms.uColor.value.copy(color); return; }
    if (material.color) material.color.copy(color).lerp(white, material.isMeshPhysicalMaterial ? .35 : material.isLineDashedMaterial ? 0 : .55);
    if (material.emissive) material.emissive.copy(color);
  });
  entry.items.forEach((item) => {
    const { core, halo } = item.object.userData;
    core.material.color.copy(color).lerp(white, .4); halo.material.color.copy(color);
    item.trails.forEach((trail) => trail.material.color.copy(color));
  });
  entry.color = hex;
}

// ---- packet (the travelling "file")
function makeFlowPacket({ label = 'Deployment Package', color = COLORS.cyan, size = .55, tone = 'cyan' } = {}) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(size, size * .72, size * .82), new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), .35), emissive: color, emissiveIntensity: 1.6, metalness: .35, roughness: .3, transparent: true, opacity: .95 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85, toneMapped: false }));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color, transparent: true, opacity: .75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  halo.scale.setScalar(size * 4.6);
  const tag = makeFlowLabel(label, tone, { scale: .62 });
  tag.position.y = size * 1.5; tag.material.opacity = .95;
  group.add(core, edges, halo, tag);
  group.userData = { core, edges, halo, tag, color, size };
  return group;
}

function setPacketLabel(packet, text, tone = 'cyan') {
  const old = packet.userData.tag;
  old.removeFromParent(); old.material.map.dispose(); old.material.dispose();
  const tag = makeFlowLabel(text, tone, { scale: .62 });
  tag.position.y = old.position.y; tag.material.opacity = .95;
  packet.add(tag); packet.userData.tag = tag;
}

function setPacketColor(packet, hex) {
  const { core, halo } = packet.userData;
  core.material.emissive.setHex(hex);
  core.material.color.setHex(hex).lerp(new THREE.Color(0xffffff), .35);
  halo.material.color.setHex(hex);
  packet.userData.color = hex;
}

async function flowMoveTo(seq, object, target, seconds = .8, { arc = 0, easing = 'inOut', scaleTo = null } = {}) {
  const from = object.position.clone(); const fromScale = object.scale.x;
  await seq.tween(seconds, (p) => {
    object.position.lerpVectors(from, target, p);
    if (arc) object.position.y += Math.sin(p * Math.PI) * arc;
    if (scaleTo !== null) object.scale.setScalar(fromScale + (scaleTo - fromScale) * p);
  }, easing);
}

// Packet travels along a route curve with escort particles; the camera target follows it.
async function flowTravel(seq, packet, curve, { seconds = 2.5, reverse = false, escorts = 4, color = COLORS.cyan, easing = 'inOut', follow = true, size = .3, onProgress = null } = {}) {
  const bodies = [];
  for (let i = 0; i < escorts; i += 1) {
    const body = acquireParticle(i % 2 ? COLORS.cyan : color, size * (.8 + pseudoRandom(i + 3) * .5), .9);
    ensureFlowLayer().add(body); systemFlow.escorts.push(body);
    bodies.push({ body, lag: .035 + i * .028, side: (i % 2 ? 1 : -1) * (.3 + i * .1), phase: pseudoRandom(i + 9) * 6.28 });
  }
  const side = new THREE.Vector3(); const point = new THREE.Vector3(); const tangent = new THREE.Vector3();
  try {
    await seq.tween(seconds, (p, raw) => {
      const t = reverse ? 1 - p : p;
      curve.getPoint(t, point); packet.position.copy(point);
      curve.getTangent(t, tangent); side.set(-tangent.z, 0, tangent.x).normalize();
      const time = clock.elapsedTime;
      bodies.forEach((item) => {
        const tb = clamp(reverse ? t + item.lag : t - item.lag, 0, 1);
        curve.getPoint(tb, item.body.position);
        const wobble = Math.sin(time * 5 + item.phase) * .18;
        item.body.position.addScaledVector(side, item.side * .5 + wobble);
        item.body.position.y += .3 + Math.cos(time * 4 + item.phase) * .15;
      });
      if (follow) systemFlow.follow = packet.position;
      if (onProgress) onProgress(raw);
    }, easing);
  } finally {
    bodies.forEach(({ body }) => flowReleaseEscort(body));
    systemFlow.follow = null;
  }
}

function flowCamera(ids, options = {}) {
  const goal = fitCameraToNodes(ids, options);
  systemFlow.cameraBase = goal;
  cameraGoal = { position: goal.position.clone(), target: goal.target.clone() };
  controls.autoRotate = false;
}

function flowAdditive(color, opacity = .5) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

function flowSprite(color, opacity, scaleX, scaleY = scaleX) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: particleGlowTexture, color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  sprite.scale.set(scaleX, scaleY, 1);
  return sprite;
}

function makeProgressArc(centre, radius, color) {
  const points = [];
  for (let i = 0; i <= 64; i += 1) { const angle = Math.PI / 2 - (i / 64) * Math.PI * 2; points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)); }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color, transparent: true, opacity: .95, toneMapped: false }));
  line.position.copy(centre);
  line.geometry.setDrawRange(0, 0);
  line.userData.setProgress = (p) => line.geometry.setDrawRange(0, Math.max(0, Math.round(p * 64)) + 1);
  return line;
}

function makeWaveformSprite(seed = 3) {
  const [canvas, context] = makeCanvas(256, 128);
  context.fillStyle = 'rgba(12,6,30,.85)'; context.fillRect(0, 0, 256, 128);
  context.strokeStyle = 'rgba(164,93,255,.9)'; context.lineWidth = 2; context.strokeRect(3, 3, 250, 122);
  context.strokeStyle = 'rgba(217,194,255,.95)'; context.lineWidth = 2.2; context.beginPath();
  for (let x = 0; x <= 240; x += 4) { const y = 64 - Math.sin(x * .09 + seed) * 22 - Math.sin(x * .27) * 9; if (x === 0) context.moveTo(8 + x, y); else context.lineTo(8 + x, y); }
  context.stroke();
  context.fillStyle = 'rgba(164,93,255,.55)';
  for (let bar = 0; bar < 10; bar += 1) { const h = 8 + pseudoRandom(bar * 3 + seed) * 30; context.fillRect(14 + bar * 23, 118 - h, 12, h); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  sprite.scale.set(5.2, 2.6, 1);
  return sprite;
}

// ---- story ids (data-driven: the busiest API→Server route and the busiest Server→Database route)
function chooseFlowIds() {
  const routes = state.routeStats;
  const apiServer = routes.filter((route) => route.source === 'API-Gateway' && route.destinationType === 'Server').sort((a, b) => b.samples - a.samples)[0];
  const server = apiServer?.destination || 'Server-02';
  const serverDb = routes.filter((route) => route.source === server && route.destinationType === 'Database').sort((a, b) => b.samples - a.samples)[0];
  const db = serverDb?.destination || 'Database-01';
  const dbAi = routes.find((route) => route.source === db && route.destination === 'AI-Engine') ? db : (routes.find((route) => route.destination === 'AI-Engine' && route.sourceType === 'Database')?.source || db);
  const iotRoute = routes.filter((route) => route.source === 'IoT-Gateway').sort((a, b) => b.samples - a.samples)[0];
  return { dev: 'Development', api: 'API-Gateway', server, db, cloud: 'Cloud-01', ai: 'AI-Engine', sec: 'Security-Hub', iot: 'IoT-Gateway', aiSource: dbAi, iotTarget: iotRoute?.destination || 'Cloud-01' };
}

function collectFlowRecords(ids) {
  const iotLatest = (state.data || []).filter((row) => row.source_id === ids.iot).at(-1);
  const iotTarget = systemFlow.profile === 'peak' ? ids.iotTarget : (iotLatest?.destination_id || ids.iotTarget);
  ids.iotTarget = iotTarget;
  return {
    devApi: pickFlowRecord(ids.dev, ids.api),
    apiServer: pickFlowRecord(ids.api, ids.server),
    serverDb: pickFlowRecord(ids.server, ids.db),
    serverCloud: pickFlowRecord(ids.server, ids.cloud),
    apiSec: pickFlowRecord(ids.api, ids.sec),
    secCloud: pickFlowRecord(ids.sec, ids.cloud),
    dbAi: pickFlowRecord(ids.aiSource, ids.ai),
    aiCloud: pickFlowRecord(ids.ai, ids.cloud),
    iot: pickFlowRecord(ids.iot, iotTarget),
  };
}

// ---- server overlay (rack LEDs, core, data lines, progress arc)
function makeServerOverlay(serverId, tone) {
  const spec = SERVER_SPECS[serverId] || { width: 3.4, depth: 3.2, height: 8 };
  const hex = FLOW_HEX[tone] ?? COLORS.cyan;
  const count = Math.max(8, Math.round(spec.height / 1.05));
  const leds = [];
  for (let i = 0; i < count; i += 1) {
    const led = new THREE.Mesh(new THREE.BoxGeometry(.2, .1, .06), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: .12, toneMapped: false }));
    led.position.copy(flowNodeWorld(serverId, [-(spec.width / 2 - .5), .95 + i * ((spec.height - .9) / count), spec.depth / 2 + .22]));
    flowAdd(led); leds.push(led);
  }
  const coreCentre = flowNodeWorld(serverId, [0, spec.height * .5, spec.depth / 2 + 1.25]);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.95, .05, 8, 48), flowAdditive(hex, .85));
  ring.position.copy(coreCentre);
  flowAdd(ring, { update: (e, d) => { ring.rotation.z += d * ring.userData.spin; ring.rotation.y += d * ring.userData.spin * .35; } });
  ring.userData.spin = 1.4;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.42, 1), flowAdditive(hex, .8));
  core.position.copy(coreCentre);
  flowAdd(core, { update: (e, d) => { core.rotation.y += d * ring.userData.spin * .9; core.rotation.x += d * ring.userData.spin * .4; } });
  const coreGlow = flowSprite(hex, .35, 3.2);
  coreGlow.position.copy(coreCentre); flowAdd(coreGlow);
  const arc = makeProgressArc(coreCentre, 1.35, 0xffffff); flowAdd(arc);
  const lines = [];
  for (let i = 0; i < 5; i += 1) {
    const line = flowSprite(hex, .55, .12, .9);
    const x = -spec.width / 2 + .7 + i * ((spec.width - 1.4) / 4);
    line.userData = { x, offset: pseudoRandom(i + 21), speed: 1.6 + pseudoRandom(i + 5) * 1.4, top: spec.height - .6 };
    line.position.copy(flowNodeWorld(serverId, [x, 1, spec.depth / 2 + .3]));
    flowAdd(line, { update: (elapsed) => { const cycle = (elapsed * line.userData.speed * .25 + line.userData.offset) % 1; line.position.y = flowNodeWorld(serverId).y + .9 + cycle * line.userData.top; line.material.opacity = .15 + Math.sin(cycle * Math.PI) * .55; } });
    lines.push(line);
  }
  return { spec, leds, ring, core, coreGlow, arc, lines, coreCentre, setColor(newHex) { leds.forEach((led) => led.material.color.setHex(newHex)); ring.material.color.setHex(newHex); core.material.color.setHex(newHex); coreGlow.material.color.setHex(newHex); lines.forEach((line) => line.material.color.setHex(newHex)); } };
}

// ---- phase definitions
const FLOW_PHASES = [
  {
    id: 'CREATE_FILE', title: 'Development — file created', kind: 'DEVELOPMENT',
    note: () => 'A developer packages a build. "project_build.zip" is a visual metaphor; the dataset holds no filenames.',
    async run(seq) {
      const { dev, api } = systemFlow.ids;
      flowCamera([dev], { lift: 7, back: .85 });
      setBuildingState(dev, 'processing', { tone: 'cyan' });
      [-1.7, 0, 1.7].forEach((x, i) => {
        const monitor = new THREE.Mesh(new THREE.PlaneGeometry(.9, .55), new THREE.MeshBasicMaterial({ color: 0x9fe8ff, transparent: true, opacity: .2, toneMapped: false }));
        monitor.position.copy(flowNodeWorld(dev, [x, 2.35, 4.17]));
        flowAdd(monitor, { update: (elapsed) => { monitor.material.opacity = Math.sin(elapsed * (5 + i * 1.7) + i * 2) > 0 ? .8 : .18; } });
      });
      const windows = flowSprite(0x9fe8ff, .0, 9, 22);
      windows.position.copy(flowNodeWorld(dev, [0, 13, 3.6]));
      flowAdd(windows, { update: (elapsed) => { windows.material.opacity = .08 + (Math.sin(elapsed * 3.1) + 1) * .05; } });
      await seq.wait(.9);
      const record = systemFlow.records.devApi.record;
      const packet = makeFlowPacket({ label: 'project_build.zip', color: COLORS.cyan });
      packet.position.copy(flowNodeWorld(dev, [0, 6.8, 0])); packet.scale.setScalar(.01);
      flowAdd(packet, { persistent: true, update: (e, d) => { packet.rotation.y += d * .9; } });
      systemFlow.packet = packet;
      await seq.tween(.55, (p) => packet.scale.setScalar(p * packetScale(record)), 'out');
      await flowSay(seq, 'File created — Deployment Package', packet.position, { lift: 2.2, hold: .6 });
      await flowMoveTo(seq, packet, flowPort(dev, api).point, 1.0, { arc: 1.4 });
      await flowSay(seq, 'Development — File ready for upload', packet.position, { lift: 2.4, hold: .9 });
    },
  },
  {
    id: 'SEND_TO_API', title: 'Upload — Development → API Gateway', kind: 'DATA MOVEMENT',
    note: () => hopNote(systemFlow.records.devApi),
    async run(seq) {
      const { dev, api } = systemFlow.ids; const hop = systemFlow.records.devApi; const record = hop.record;
      const entry = buildFlowRoute(dev, api, record, flowRouteColor(record)); systemFlow.mainRoutes.push(entry);
      if (!entry) return;
      systemFlow.packet.position.copy(entry.curve.getPoint(0));
      flowCamera([dev, api], { lift: 4, back: 1 });
      setBuildingState(api, 'receiving');
      await flowSay(seq, `Uploading · ${formatNumber(record.data_volume_mb, 1)} MB · ${formatNumber(record.transfer_speed_mbps, 0)} Mbps`, systemFlow.packet.position, { lift: 2.2, hold: .45 });
      await flowTravel(seq, systemFlow.packet, entry.curve, { seconds: hopSeconds(record), escorts: escortCount(record), color: entry.color });
      setBuildingState(dev, 'idle');
    },
  },
  {
    id: 'API_AUTH', title: 'API Gateway — authenticate', kind: 'API GATEWAY',
    note: () => `Gateway checkpoint. ${hopNote(systemFlow.records.apiServer)}`,
    async run(seq) {
      const { api } = systemFlow.ids; const record = systemFlow.records.apiServer.record; const tone = recordTone(record); const hex = FLOW_HEX[tone];
      const centre = flowNodeWorld(api, [0, 5.6, 0]); const yaw = Math.atan2(API_AXIS.x, API_AXIS.z);
      systemFlow.packet.position.copy(centre);
      flowCamera([api], { lift: 5.5, back: .8 });
      setBuildingState(api, 'processing', { tone });
      const portal = new THREE.Mesh(new THREE.CircleGeometry(2.7, 48), new THREE.MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      portal.position.copy(centre); portal.rotation.y = yaw; portal.scale.setScalar(.01); flowAdd(portal);
      await seq.tween(.45, (p) => { portal.scale.setScalar(p); portal.material.opacity = .26 * p; }, 'out');
      const scanner = new THREE.Mesh(new THREE.TorusGeometry(1.55, .05, 8, 64), flowAdditive(0xbfe6ff, .9));
      scanner.position.copy(centre); flowAdd(scanner, { update: (e, d) => { scanner.rotation.y += d * 2.8; scanner.rotation.x += d * 1.2; } });
      const scanner2 = new THREE.Mesh(new THREE.TorusGeometry(1.15, .035, 8, 64), flowAdditive(hex, .8));
      scanner2.position.copy(centre); scanner2.rotation.x = Math.PI / 2; flowAdd(scanner2, { update: (e, d) => { scanner2.rotation.z -= d * 3.4; } });
      const labelAuth = await flowSay(seq, 'Authenticating…', centre, { tone, lift: 3.1, hold: null });
      await seq.wait(.9);
      await flowFade(seq, labelAuth, .2);
      // Scenario 4: the gateway is the constraint (deep request queue while the target server is fine).
      if (Number(record.queue_length) > 40 && Number(record.network_load_percent) <= WHATIF_LIMITS.load) {
        const gatewayBranch = await maybeWhatIf(seq, { record, focus: api, source: api, destination: systemFlow.ids.server, entry: null });
        if (gatewayBranch?.applied && gatewayBranch.node) {
          systemFlow.ids.server = gatewayBranch.node;
          if (gatewayBranch.downstream) systemFlow.ids.db = gatewayBranch.downstream;
          systemFlow.records = collectFlowRecords(systemFlow.ids);
        }
      }
      const stack = [['AUTH ✓', 'green'], ['ROUTE ✓', 'green'], [tone === 'red' ? 'ACCEPTED · DEGRADED PATH' : tone === 'yellow' ? 'ACCEPTED · HIGH LOAD' : 'ACCEPTED', tone === 'cyan' ? 'green' : tone]];
      for (let i = 0; i < stack.length; i += 1) {
        await flowSay(seq, stack[i][0], centre, { tone: stack[i][1], lift: 7.2 + i * 1.3, hold: null });
        await Promise.all([seq.wait(.5), flowBurstRing(seq, flowNodeWorld(api, [0, .2, 0]), hex, { from: 2.5, to: 8, seconds: .8, opacity: .4 })]);
      }
      await seq.wait(.3);
    },
  },
  {
    id: 'API_ROUTE', title: 'API Gateway — route to server', kind: 'API GATEWAY',
    note: () => hopNote(systemFlow.records.apiServer),
    async run(seq) {
      const { api, server } = systemFlow.ids; const hop = systemFlow.records.apiServer; const record = hop.record;
      const centre = flowNodeWorld(api, [0, 5.6, 0]); const yaw = Math.atan2(API_AXIS.x, API_AXIS.z);
      systemFlow.packet.position.copy(centre);
      const exit = new THREE.Mesh(new THREE.CircleGeometry(2.7, 48), new THREE.MeshBasicMaterial({ color: COLORS.green, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      exit.position.copy(centre); exit.rotation.y = yaw; exit.scale.setScalar(.01); flowAdd(exit);
      await seq.tween(.4, (p) => { exit.scale.setScalar(p); exit.material.opacity = .24 * p; }, 'out');
      await flowSay(seq, `Routing → ${server}`, centre, { tone: 'green', lift: 3.1, hold: .6 });
      const entry = buildFlowRoute(api, server, record, flowRouteColor(record)); systemFlow.mainRoutes.push(entry);
      if (!entry) return;
      flowCamera([api, server], { lift: 4.5 });
      setBuildingState(server, 'receiving');
      await flowTravel(seq, systemFlow.packet, entry.curve, { seconds: hopSeconds(record), escorts: escortCount(record), color: entry.color });
      setBuildingState(api, 'idle');
    },
  },
  {
    id: 'SERVER_PROCESS', title: 'Server — process request', kind: 'SERVER',
    note: () => { const r = systemFlow.records.apiServer.record; return `${systemFlow.ids.server}: queue ${r.queue_length} · load ${formatNumber(r.network_load_percent, 0)}% · response ${formatNumber(r.response_time_ms, 0)} ms · ${formatNumber(r.api_requests, 0)} API requests · ${r.connection_status}`; },
    async run(seq) {
      const { server, api } = systemFlow.ids; const record = systemFlow.records.apiServer.record;
      const tone = recordTone(record); const load = Number(record.network_load_percent); const queue = Number(record.queue_length);
      const spec = SERVER_SPECS[server] || { width: 3.4, depth: 3.2, height: 8 };
      flowCamera([server], { lift: 6, back: .85 });
      setBuildingState(server, 'processing', { tone: 'cyan' });
      const door = flowNodeWorld(server, [0, 2.3, spec.depth / 2 + 1.0]);
      const overlay = makeServerOverlay(server, 'cyan');
      const ledSweep = async (seconds) => { await seq.tween(seconds, (p) => { overlay.leds.forEach((led, i) => { led.material.opacity = i / overlay.leds.length < p ? .95 : .12; }); }, 'linear'); };
      if (queue > 20) {
        const waiting = clamp(Math.round(queue / 18), 2, 4);
        const port = flowPort(server, api).point;
        const direction = port.clone().sub(flowNodeWorld(server)).setY(0).normalize();
        const queued = [];
        for (let k = 0; k < waiting; k += 1) {
          const item = makeFlowPacket({ label: `queued #${k + 1}`, size: .36, color: COLORS.yellow, tone: 'yellow' });
          item.position.copy(port).addScaledVector(direction, 1.6 * (k + 1)); item.position.y += .2;
          flowAdd(item, { update: (e, d) => { item.rotation.y += d * .7; } }); queued.push(item);
        }
        setBuildingState(server, 'warning');
        await flowSay(seq, `Queue length ${queue} — ${waiting} requests waiting in intake lane`, port, { tone: 'yellow', lift: 3.2, hold: .9 });
        for (const item of queued) {
          await Promise.all([flowMoveTo(seq, item, door, .5, { scaleTo: .01 }), ledSweep(.5)]);
          flowRemove(item);
        }
        setBuildingState(server, 'processing', { tone: 'cyan' });
      }
      await flowMoveTo(seq, systemFlow.packet, door, .7);
      const intensity = .6 + clamp(load / 100, 0, 1) * 1.4;
      overlay.ring.userData.spin = 1.4 * intensity;
      const heat = flowSprite(COLORS.red, 0, spec.width * 1.9, spec.height * 1.15);
      heat.position.copy(flowNodeWorld(server, [0, spec.height * .55, 0])); flowAdd(heat);
      const busy = await flowSay(seq, 'Processing request…', overlay.coreCentre, { tone: 'cyan', lift: 2.6, hold: null });
      const seconds = 2.4 + clamp(load / 100, 0, 1) * 1.4;
      let stage = 'cyan';
      await Promise.all([
        ledSweep(seconds * .8),
        seq.tween(seconds, (p, raw) => {
          overlay.arc.userData.setProgress(p);
          overlay.coreGlow.material.opacity = .3 + intensity * .25 * (Math.sin(raw * 30) * .5 + .5);
          if (tone !== 'cyan' && raw > .38 && stage === 'cyan') { stage = 'yellow'; overlay.setColor(COLORS.yellow); setBuildingState(server, 'warning'); }
          if (tone === 'red' && raw > .72 && stage === 'yellow') { stage = 'red'; overlay.setColor(COLORS.red); setBuildingState(server, 'error'); }
          if (stage === 'red') heat.material.opacity = .12 + (Math.sin(raw * 40) + 1) * .06;
        }, 'linear'),
      ]);
      await flowFade(seq, busy, .2);
      // Scenarios 1 and 3: the server is overloaded or unavailable, so the story branches into What-If.
      const serverEntry = systemFlow.mainRoutes.find((item) => item.source === api && item.destination === server) || null;
      const branch = await maybeWhatIf(seq, { record, focus: server, source: api, destination: server, entry: serverEntry, travelPacket: true });
      if (branch?.applied && branch.node) {
        systemFlow.ids.server = branch.node;
        if (branch.downstream) systemFlow.ids.db = branch.downstream;
        systemFlow.records = collectFlowRecords(systemFlow.ids);
        const nextServer = systemFlow.ids.server;
        flowCamera([nextServer], { lift: 6, back: .85 });
        setBuildingState(nextServer, 'processing', { tone: 'cyan' });
        const relief = makeServerOverlay(nextServer, 'cyan');
        await seq.tween(1.4, (p) => { relief.arc.userData.setProgress(p); relief.leds.forEach((led, i) => { led.material.opacity = i / relief.leds.length < p ? .95 : .12; }); }, 'linear');
        await flowSay(seq, `Business logic completed on ${nextServer}`, relief.coreCentre, { tone: 'green', lift: 2.6, hold: 1.0 });
        setBuildingState(nextServer, 'success');
        return;
      }
      if (tone === 'red') {
        await flowSay(seq, `Overload — load ${formatNumber(load, 0)}% · ${record.anomaly_status}`, overlay.coreCentre, { tone: 'red', lift: 3.8, hold: 1.0 });
        await flowBurstRing(seq, flowNodeWorld(server, [0, .2, 0]), COLORS.red, { from: 2, to: 9, seconds: 1, opacity: .5 });
      }
      await flowSay(seq, 'Business logic completed', overlay.coreCentre, { tone: 'green', lift: 2.6, hold: .9 });
      setBuildingState(server, tone === 'red' ? 'error' : 'success');
    },
  },
  {
    id: 'DATABASE_WRITE', title: 'Database — write record', kind: 'DATABASE',
    note: () => `${hopNote(systemFlow.records.serverDb)} · ${formatNumber(systemFlow.records.serverDb.record.database_queries, 0)} DB queries`,
    async run(seq) {
      const { server } = systemFlow.ids; let db = systemFlow.ids.db; const hop = systemFlow.records.serverDb; const record = hop.record; const tone = recordTone(record);
      const entry = buildFlowRoute(server, db, record, flowRouteColor(record)); systemFlow.mainRoutes.push(entry);
      if (!entry) return;
      setPacketLabel(systemFlow.packet, 'write: record', 'cyan');
      systemFlow.packet.position.copy(entry.curve.getPoint(0));
      flowCamera([server, db], { lift: 4.2 });
      setBuildingState(db, 'receiving');
      await flowTravel(seq, systemFlow.packet, entry.curve, { seconds: hopSeconds(record), escorts: escortCount(record), color: entry.color });
      flowCamera([db], { lift: 6.5, back: .9 });
      // Scenario 2: the database is congested, so read/write traffic is tested against the second vault.
      const dbEntry = systemFlow.mainRoutes.find((item) => item.source === server && item.destination === db) || null;
      const dbBranch = await maybeWhatIf(seq, { record, focus: db, source: server, destination: db, entry: dbEntry, travelPacket: true });
      if (dbBranch?.applied && dbBranch.node) {
        systemFlow.ids.db = dbBranch.node;
        systemFlow.records = collectFlowRecords(systemFlow.ids);
        db = systemFlow.ids.db; // the write continues on the vault the simulation recommended
        flowCamera([db], { lift: 6.5, back: .9 });
      }
      setBuildingState(db, 'processing', { tone });
      const hex = FLOW_HEX[tone];
      const rings = [];
      for (let floor = 0; floor < 5; floor += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.98, .05, 8, 72), flowAdditive(hex, 0));
        ring.position.copy(flowNodeWorld(db, [0, 2.05 + floor * 1.9, 0])); ring.rotation.x = Math.PI / 2;
        flowAdd(ring); rings.push(ring);
      }
      const writing = await flowSay(seq, 'Writing record…', flowNodeWorld(db, [0, 16.8, 0]), { tone, hold: null });
      await seq.tween(1.1, (p) => { rings.forEach((ring, i) => { const order = 4 - i; ring.material.opacity = clamp((p * 5 - order) , 0, 1) * .85; }); }, 'linear');
      await flowMoveTo(seq, systemFlow.packet, flowNodeWorld(db, [0, 14.6, 0]), .7, { arc: .5 });
      const cube = systemFlow.packet;
      await seq.tween(.85, (p) => { cube.position.y = flowNodeWorld(db).y + 14.6 - p * 3.3; cube.scale.setScalar(packetScale(record) * (1 - p * .98)); }, 'in');
      await Promise.all([
        seq.tween(.45, (p) => { const squeeze = 1 - Math.sin(p * Math.PI) * .08; rings.forEach((ring) => ring.scale.set(squeeze, squeeze, 1)); }, 'inOut'),
        (async () => { const spark = flowSprite(COLORS.green, 0, 3.2); spark.position.copy(flowNodeWorld(db, [0, 11.6, 0])); flowAdd(spark); await seq.tween(.5, (p) => { spark.material.opacity = Math.sin(p * Math.PI); spark.scale.setScalar(2.4 + p * 3); }, 'out'); flowRemove(spark); })(),
      ]);
      await flowFade(seq, writing, .2);
      setBuildingState(db, 'success');
      await Promise.all([
        flowBurstRing(seq, flowNodeWorld(db, [0, .2, 0]), COLORS.green, { from: 3, to: 11, seconds: 1.1, opacity: .5 }),
        flowSay(seq, 'Record Saved ✓', flowNodeWorld(db, [0, 16.8, 0]), { tone: 'green', hold: 1.0 }),
      ]);
      rings.forEach((ring) => { ring.material.color.setHex(COLORS.green); });
    },
  },
  {
    id: 'DATABASE_READ', title: 'Database — read and return', kind: 'DATABASE',
    note: () => `Query result returns on the same connection in reverse. ${hopNote(systemFlow.records.serverDb)}`,
    async run(seq) {
      const { server, db } = systemFlow.ids; const record = systemFlow.records.serverDb.record;
      const entry = systemFlow.mainRoutes.find((item) => item.source === server && item.destination === db) || buildFlowRoute(server, db, record, flowRouteColor(record));
      if (!entry) return;
      flowCamera([db], { lift: 6.5, back: .9 });
      setBuildingState(db, 'processing', { tone: 'cyan' });
      const rings = [];
      for (let floor = 0; floor < 5; floor += 1) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(3.98, .05, 8, 72), flowAdditive(COLORS.cyan, 0));
        ring.position.copy(flowNodeWorld(db, [0, 2.05 + floor * 1.9, 0])); ring.rotation.x = Math.PI / 2;
        flowAdd(ring); rings.push(ring);
      }
      const reading = await flowSay(seq, 'Reading data…', flowNodeWorld(db, [0, 16.8, 0]), { tone: 'cyan', hold: null });
      await seq.tween(.9, (p) => { rings.forEach((ring, i) => { ring.material.opacity = clamp(p * 5 - i, 0, 1) * .8; }); }, 'linear');
      const packet = systemFlow.packet;
      setPacketLabel(packet, 'query result', 'cyan');
      packet.position.copy(flowNodeWorld(db, [0, 11.3, 0])); packet.scale.setScalar(.02);
      await seq.tween(.8, (p) => { packet.position.y = flowNodeWorld(db).y + 11.3 + p * 3.3; packet.scale.setScalar(.02 + p * packetScale(record)); }, 'out');
      await flowFade(seq, reading, .2);
      await flowSay(seq, 'Data returned', flowNodeWorld(db, [0, 16.8, 0]), { tone: 'green', hold: .7 });
      await flowMoveTo(seq, packet, entry.curve.getPoint(1), .6, { arc: .6 });
      flowCamera([db, server], { lift: 4.2 });
      setBuildingState(db, 'idle');
      setBuildingState(server, 'receiving');
      await flowTravel(seq, packet, entry.curve, { seconds: hopSeconds(record) * .85, reverse: true, escorts: 3, color: entry.color });
    },
  },
  {
    id: 'SERVER_RESPONSE', title: 'Server — assemble response', kind: 'SERVER',
    note: () => `${systemFlow.ids.server} combines the query result into the final package · processing rate ${formatNumber(systemFlow.records.serverDb.record.processing_rate, 0)}`,
    async run(seq) {
      const { server, db } = systemFlow.ids; const record = systemFlow.records.serverDb.record;
      const spec = SERVER_SPECS[server] || { width: 3.4, depth: 3.2, height: 8 };
      flowCamera([server], { lift: 6, back: .85 });
      setBuildingState(server, 'processing', { tone: 'cyan' });
      const overlay = makeServerOverlay(server, 'cyan');
      overlay.ring.userData.spin = 3.2;
      const packet = systemFlow.packet;
      packet.position.copy(flowPort(server, db).point);
      await flowMoveTo(seq, packet, overlay.coreCentre, .6, { scaleTo: .05 });
      const assembling = await flowSay(seq, 'Assembling response…', overlay.coreCentre, { tone: 'cyan', lift: 2.6, hold: null });
      await seq.tween(1.2, (p) => { overlay.arc.userData.setProgress(p); overlay.leds.forEach((led, i) => { led.material.opacity = ((i + Math.floor(p * 24)) % 3 === 0) ? .95 : .18; }); overlay.coreGlow.material.opacity = .3 + p * .4; }, 'linear');
      setPacketLabel(packet, 'Processed result', 'green');
      setPacketColor(packet, COLORS.green);
      await seq.tween(.5, (p) => packet.scale.setScalar(.05 + p * packetScale(record)), 'out');
      await flowFade(seq, assembling, .2);
      await flowSay(seq, 'Response assembled', overlay.coreCentre, { tone: 'green', lift: 2.6, hold: .9 });
      setBuildingState(server, 'success');
    },
  },
  {
    id: 'CLOUD_UPLOAD', title: 'Upload — Server → Cloud', kind: 'CLOUD',
    note: () => hopNote(systemFlow.records.serverCloud),
    async run(seq) {
      const { server, cloud } = systemFlow.ids; const hop = systemFlow.records.serverCloud; const record = hop.record;
      const entry = buildFlowRoute(server, cloud, record, flowRouteColor(record)); systemFlow.mainRoutes.push(entry);
      if (!entry) return;
      const packet = systemFlow.packet;
      await flowMoveTo(seq, packet, entry.curve.getPoint(0), .5, { arc: .4 });
      flowCamera([server, cloud], { lift: 6, back: 1.15 });
      const intake = new THREE.Mesh(new THREE.TorusGeometry(4.4, .07, 8, 80), flowAdditive(COLORS.cyan, 0));
      intake.position.copy(flowNodeWorld(cloud, [0, 6.4, 0])); intake.rotation.x = Math.PI / 2;
      flowAdd(intake, { update: (e, d) => { intake.rotation.z += d * .8; } });
      setBuildingState(cloud, 'receiving');
      await flowTravel(seq, packet, entry.curve, { seconds: hopSeconds(record) * 1.1, escorts: escortCount(record), color: entry.color, easing: 'out', onProgress: (raw) => { intake.material.opacity = clamp((raw - .6) / .4, 0, 1) * .8; } });
      flowCamera([cloud], { lift: 9, back: 1 });
      // Scenario 6: a loaded cloud is tested before the upload is allowed to report success.
      const cloudBranch = await maybeWhatIf(seq, { record, focus: cloud, source: server, destination: cloud, entry: null });
      systemFlow.cloudBlocked = !!cloudBranch && !cloudBranch.applied;
      setBuildingState(cloud, 'processing', { tone: 'cyan' });
      const steps = [[25, [0, 6.4, 0], .7], [60, [0, 8.6, 0], .7], [85, [0, 10.3, 0], .6], [100, [0, 11.5, 0], .6]];
      let label = null;
      for (const [percent, local, seconds] of steps) {
        await flowMoveTo(seq, packet, flowNodeWorld(cloud, local), seconds, { scaleTo: percent === 100 ? .05 : packetScale(record) * (1 - percent / 240) });
        if (label) await flowFade(seq, label, .12);
        label = await flowSay(seq, `Uploading ${percent}%`, flowNodeWorld(cloud, [0, 17.2, 0]), { tone: percent === 100 ? 'green' : 'cyan', hold: null, fade: .15 });
        await seq.wait(.25);
      }
      await seq.wait(.2);
      await flowFade(seq, label, .2);
    },
  },
  {
    id: 'CLOUD_SAVED', title: 'Cloud — file saved', kind: 'CLOUD',
    note: () => 'Premium success effect: flash, sparks, energy ring, vertical pulse, stored icons. Main routes turn healthy green.',
    async run(seq) {
      const { cloud } = systemFlow.ids;
      flowCamera([cloud], { lift: 9, back: 1 });
      if (systemFlow.cloudBlocked) {
        // The What-If found no workable option, so the operation is not a success and stays red.
        await cloudOperationFailed(cloud, `${cloud} — Upload held · load critical`);
        await flowSay(seq, 'Upload held for a human decision', flowNodeWorld(cloud, [0, 17.4, 0]), { tone: 'red', hold: 1.6, scale: 1.1 });
        return;
      }
      // The upload reached 100 %: this is the SUCCESS state, so the universal white cloud glow fires.
      const success = cloudOperationSuccess(cloud, `${cloud} — File Saved Successfully ✓`, { hold: 1.9 });
      const pulse = flowSprite(0xffffff, .9, 1.6, 4.5); pulse.position.copy(flowNodeWorld(cloud, [0, 7, 0])); flowAdd(pulse);
      await seq.tween(.7, (p) => { pulse.position.y = flowNodeWorld(cloud).y + 7 + p * 9.5; pulse.material.opacity = .9 * (1 - p); }, 'out');
      flowRemove(pulse);
      for (let i = 0; i < 4; i += 1) {
        const icon = makeFlowPacket({ label: '', color: 0xdff8ff, size: .34, tone: 'white' });
        icon.userData.tag.visible = false;
        icon.position.copy(flowNodeWorld(cloud, [-1.5 + i * 1.0, 6.25, -3.4])); icon.scale.setScalar(.01);
        flowAdd(icon, { persistent: true, update: (e, d) => { icon.rotation.y += d * .5; } });
        await seq.tween(.18, (p) => icon.scale.setScalar(p), 'out');
      }
      systemFlow.mainRoutes.forEach((entry) => recolorFlowEntry(entry, COLORS.green));
      await success;
    },
  },
  {
    id: 'COMPLETE', title: 'Main flow complete', kind: 'RESULT',
    note: () => 'Development → API Gateway → Server → Database → Server → Cloud finished. Secondary flows follow: Security Hub, AI Engine, IoT Gateway.',
    async run(seq) {
      const { dev, api, server, db, cloud } = systemFlow.ids;
      [server, db].forEach((id) => setBuildingState(id, 'idle'));
      flowCamera([dev, api, server, db, cloud], { lift: 6, back: .95 });
      await flowSay(seq, 'Main flow complete — route healthy', flowNodeWorld(api, [0, 18, 0]), { tone: 'green', hold: 1.4, scale: 1.1 });
      await seq.wait(.4);
    },
  },
  {
    id: 'SECURITY_SCAN', title: 'Security Hub — inspect', kind: 'SECURITY',
    note: () => hopNote(systemFlow.records.apiSec),
    async run(seq) {
      const { api, sec, cloud } = systemFlow.ids; const hop = systemFlow.records.apiSec; const record = hop.record;
      const blocked = record.threat_level === 'Critical' || record.access_permission === 'Denied' || record.route_status === 'Blocked' || record.connection_status === 'Failed' || record.anomaly_status === 'Suspicious Traffic';
      setBuildingState(cloud, 'idle');
      const entry = buildFlowRoute(api, sec, record, flowRouteColor(record));
      if (!entry) return;
      const packet = makeFlowPacket({ label: `${record.data_classification || 'Internal'} data`, color: COLORS.blue, size: .48, tone: 'blue' });
      packet.position.copy(entry.curve.getPoint(0)); flowAdd(packet, { update: (e, d) => { packet.rotation.y += d * .9; } });
      flowCamera([api, sec], { lift: 4.5 });
      setBuildingState(sec, 'receiving');
      await flowTravel(seq, packet, entry.curve, { seconds: hopSeconds(record), escorts: 3, color: entry.color });
      flowCamera([sec], { lift: 4.5, back: .7 });
      setBuildingState(sec, 'processing', { tone: 'cyan' });
      const zone = packet.position.clone();
      const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 1), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: .16, wireframe: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      shield.position.copy(zone); flowAdd(shield, { update: (e, d) => { shield.rotation.y += d * .8; } });
      const shieldFill = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 2), flowAdditive(COLORS.cyan, .08));
      shieldFill.position.copy(zone); flowAdd(shieldFill);
      const laser = new THREE.Mesh(new THREE.BoxGeometry(3.2, .035, .035), flowAdditive(0xbfe6ff, .9));
      laser.position.copy(zone); flowAdd(laser);
      const scanning = await flowSay(seq, 'Scanning packet…', zone, { tone: 'cyan', lift: 2.6, hold: null });
      await seq.tween(1.5, (p) => { laser.position.y = zone.y - 1.1 + Math.abs(Math.sin(p * Math.PI * 3)) * 2.2; laser.material.opacity = .5 + Math.abs(Math.sin(p * Math.PI * 6)) * .5; }, 'linear');
      flowRemove(laser);
      await flowFade(seq, scanning, .2);
      if (!blocked) {
        shield.material.color.setHex(COLORS.green); shieldFill.material.color.setHex(COLORS.green);
        setBuildingState(sec, 'success');
        await Promise.all([
          flowSay(seq, 'Security scan passed ✓', zone, { tone: 'green', lift: 2.6, hold: 1.0 }),
          flowBurstRing(seq, flowNodeWorld(sec, [0, .2, 0]), COLORS.green, { from: 2, to: 8, seconds: .9, opacity: .45 }),
        ]);
        const onward = systemFlow.records.secCloud;
        const next = buildFlowRoute(sec, cloud, onward.record, flowRouteColor(onward.record));
        if (next) {
          flowCamera([sec, cloud], { lift: 5 });
          setBuildingState(sec, 'idle'); setBuildingState(cloud, 'receiving');
          await flowMoveTo(seq, packet, next.curve.getPoint(0), .4);
          await flowTravel(seq, packet, next.curve, { seconds: hopSeconds(onward.record), escorts: 3, color: next.color });
          // Arrival alone is not success: the cloud processes the sync first, then the white glow confirms it.
          setCloudState(cloud, 'processing', { rate: 5 });
          await Promise.all([
            flowSay(seq, 'Cloud-01 — Synchronizing…', flowNodeWorld(cloud, [0, 17, 0]), { tone: 'cyan', hold: .5 }),
            seq.tween(.9, (p) => packet.scale.setScalar(1 - p), 'in'),
          ]);
          await cloudOperationSuccess(cloud, `${cloud} — Data Synchronized ✓`, { hold: 1.5 });
        }
      } else {
        shield.material.color.setHex(COLORS.red); shieldFill.material.color.setHex(COLORS.red); shieldFill.material.opacity = .18;
        setBuildingState(sec, 'error');
        recolorFlowEntry(entry, COLORS.red);
        const lock = flowRing(zone, COLORS.red, { radius: 1.7, width: .1, opacity: .6, vertical: true, yaw: Math.atan2(camera.position.x - zone.x, camera.position.z - zone.z) });
        await Promise.all([
          flowSay(seq, `Threat detected — Route blocked · ${record.threat_level} threat · ${record.access_permission}`, zone, { tone: 'red', lift: 2.8, hold: 1.6 }),
          flowBurstRing(seq, flowNodeWorld(sec, [0, .2, 0]), COLORS.red, { from: 2, to: 9, seconds: 1.2, opacity: .55 }),
        ]);
        await seq.tween(.5, (p) => { packet.scale.setScalar(1 - p); lock.material.opacity = .6 * (1 - p); }, 'in');
        // Scenario 5: test whether any safe alternative exists. None is invented if none is found.
        await runWhatIfBranch(seq, { record, focus: sec, source: api, destination: sec, entry, travelPacket: false });
      }
      setBuildingState(sec, blocked ? 'error' : 'idle');
      setBuildingState(cloud, 'idle');
    },
  },
  {
    id: 'AI_ANALYZE', title: 'AI Engine — analyze and predict', kind: 'AI ENGINE',
    note: () => `${hopNote(systemFlow.records.dbAi)} · ${formatNumber(systemFlow.records.dbAi.record.ai_requests, 0)} AI requests`,
    async run(seq) {
      const { ai, cloud, aiSource } = systemFlow.ids; const hop = systemFlow.records.dbAi; const record = hop.record;
      const entry = buildFlowRoute(aiSource, ai, record, COLORS.purple);
      if (!entry) return;
      const packet = makeFlowPacket({ label: 'analytics batch', color: COLORS.purple, size: .5, tone: 'purple' });
      packet.position.copy(entry.curve.getPoint(0)); flowAdd(packet, { update: (e, d) => { packet.rotation.y += d * .9; } });
      flowCamera([aiSource, ai], { lift: 4.5 });
      setBuildingState(ai, 'receiving');
      await flowTravel(seq, packet, entry.curve, { seconds: hopSeconds(record), escorts: 4, color: COLORS.purple });
      flowCamera([ai], { lift: 6, back: .85 });
      setBuildingState(ai, 'processing', { tone: 'purple' });
      const core = flowNodeWorld(ai, [0, 5.3, 0]);
      const start = packet.position.clone();
      await seq.tween(.8, (p) => { packet.position.lerpVectors(start, core, p); packet.scale.setScalar(1 - p * .96); }, 'in');
      const spiral = [];
      for (let i = 0; i < 8; i += 1) {
        const body = acquireParticle(i % 2 ? 0xd9c2ff : COLORS.purple, .26, .9);
        ensureFlowLayer().add(body); systemFlow.escorts.push(body);
        spiral.push({ body, offset: (i / 8) * Math.PI * 2, lag: pseudoRandom(i + 4) * .2 });
      }
      const links = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([0, 1, 2, 3, 4, 5].flatMap((i) => { const angle = (i / 6) * Math.PI * 2; return [core.clone(), new THREE.Vector3(core.x + Math.cos(angle) * 3.4, core.y + Math.sin(i * 1.3) * 2.2, core.z + Math.sin(angle) * 3.4)]; })), new THREE.LineBasicMaterial({ color: 0xc79bff, transparent: true, opacity: 0, toneMapped: false }));
      flowAdd(links, { update: (elapsed) => { links.material.opacity = .35 + (Math.sin(elapsed * 6) + 1) * .3; } });
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.6, .04, 8, 72), flowAdditive(0xd9c2ff, .8));
      orbit.position.copy(core); orbit.rotation.x = Math.PI * .45; flowAdd(orbit, { update: (e, d) => { orbit.rotation.z += d * 2.2; orbit.rotation.x += d * .4; } });
      const wave = makeWaveformSprite(4); wave.position.copy(flowNodeWorld(ai, [5.2, 9.2, 2.2])); flowAdd(wave);
      const analysing = await flowSay(seq, 'Analyzing pattern…', flowNodeWorld(ai, [0, 15.2, 0]), { tone: 'purple', hold: null });
      await seq.tween(1.9, (p, raw) => {
        spiral.forEach((item) => { const t = clamp(raw - item.lag, 0, 1); const r = 4.2 * (1 - t) + .3; const angle = item.offset + t * 7; item.body.position.set(core.x + Math.cos(angle) * r, core.y + Math.sin(t * 6 + item.offset) * .8, core.z + Math.sin(angle) * r); });
        wave.material.opacity = clamp(raw * 3, 0, 1) * .95;
      }, 'linear');
      spiral.forEach(({ body }) => flowReleaseEscort(body));
      await flowFade(seq, analysing, .2);
      const prediction = (state.ml?.predictions || []).find((item) => item.node === ai);
      const predictedLoad = prediction ? `${formatNumber(prediction.predicted.network_load_percent, 1)}%` : 'n/a';
      await flowSay(seq, `Future load predicted · ${ai} ${predictedLoad}${prediction?.forecast_basis?.includes('scenario') ? ' (demo floor)' : ''}`, flowNodeWorld(ai, [0, 15.2, 0]), { tone: 'purple', hold: 1.2 });
      const orb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 18), new THREE.MeshBasicMaterial({ color: COLORS.purple, transparent: true, opacity: .0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      orb.position.copy(flowNodeWorld(ai, [0, 13.4, 0])); orb.scale.setScalar(.01); flowAdd(orb, { update: (elapsed, d) => { orb.rotation.y += d * .6; } });
      const orbWire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.7, 1)), new THREE.LineBasicMaterial({ color: 0xd9c2ff, transparent: true, opacity: .0, toneMapped: false }));
      orbWire.position.copy(orb.position); flowAdd(orbWire, { update: (elapsed, d) => { orbWire.rotation.y -= d * .4; orbWire.rotation.x += d * .2; } });
      await seq.tween(.7, (p) => { orb.scale.setScalar(p); orb.material.opacity = .28 * p; orbWire.scale.setScalar(p); orbWire.material.opacity = .7 * p; }, 'out');
      const arc = makeSkyArc(ai, cloud, 1, 3.5);
      if (arc) {
        const points = arc.getPoints(96);
        const dashed = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineDashedMaterial({ color: 0xdab4ff, dashSize: 1.2, gapSize: .8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        dashed.computeLineDistances(); flowAdd(dashed, { persistent: true });
        const ghost = new THREE.Mesh(new THREE.TubeGeometry(arc, 96, .16, 6, false), flowAdditive(COLORS.purple, 0));
        flowAdd(ghost, { persistent: true });
        const ghostParticles = [];
        for (let i = 0; i < 3; i += 1) {
          const body = acquireParticle(i % 2 ? 0xd2b8ff : COLORS.purple, .22, .7);
          ensureFlowLayer().add(body); systemFlow.escorts.push(body);
          ghostParticles.push({ body, phase: i / 3 });
        }
        const runner = { update: (e, d) => { ghostParticles.forEach((item) => { item.phase = (item.phase + d * .05) % 1; arc.getPoint(item.phase, item.body.position); }); } };
        flowAnims.push({ object: ghost, ...runner });
        await Promise.all([
          seq.tween(.9, (p) => { dashed.material.opacity = .7 * p; ghost.material.opacity = .2 * p; }, 'out'),
          flowSay(seq, `Predicted flow → ${cloud} (translucent = forecast, not current traffic)`, arc.getPoint(.5).add(new THREE.Vector3(0, 3.5, 0)), { tone: 'purple', hold: 1.4 }),
        ]);
      }
      setBuildingState(ai, 'success');
      await seq.wait(.5);
      setBuildingState(ai, 'idle');
    },
  },
  {
    id: 'IOT_AGGREGATE', title: 'IoT Gateway — collect and aggregate', kind: 'IOT GATEWAY',
    note: () => `${hopNote(systemFlow.records.iot)} · ${formatNumber(systemFlow.records.iot.record.iot_messages, 0)} IoT messages`,
    async run(seq) {
      const { iot, iotTarget } = systemFlow.ids; const hop = systemFlow.records.iot; const record = hop.record;
      const messages = Number(record.iot_messages) || 0;
      flowCamera([iot], { lift: 7, back: .9 });
      setBuildingState(iot, 'processing', { tone: 'cyan' });
      const sensors = [];
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * Math.PI * 2 + .5; const radius = 4.25;
        const sensor = new THREE.Group();
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .08, 1.4, 6), cityMats.brushedSteel);
        mast.position.y = .7; sensor.add(mast);
        const led = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), ledMaterial(COLORS.green)); led.position.y = 1.5; sensor.add(led);
        const glow = flowSprite(COLORS.green, .5, .9); glow.position.y = 1.5; sensor.add(glow);
        sensor.position.copy(flowNodeWorld(iot, [Math.cos(angle) * radius, .55, Math.sin(angle) * radius]));
        flowAdd(sensor, { persistent: true, update: (elapsed) => { glow.material.opacity = .3 + (Math.sin(elapsed * (3 + i) + i) + 1) * .3; } });
        sensors.push(sensor);
      }
      const hub = flowNodeWorld(iot, [0, 3.6, 0]);
      const merge = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), flowAdditive(COLORS.green, .45));
      merge.position.copy(flowNodeWorld(iot, [0, 4.8, 0])); merge.scale.setScalar(.15); flowAdd(merge, { update: (e, d) => { merge.rotation.y += d * 1.2; } });
      const collecting = await flowSay(seq, 'Collecting sensor messages…', flowNodeWorld(iot, [0, 9.5, 0]), { tone: 'cyan', hold: null });
      const dots = [];
      for (let wave = 0; wave < 3; wave += 1) {
        sensors.forEach((sensor, i) => {
          const body = acquireParticle(COLORS.green, .11, .95);
          ensureFlowLayer().add(body); systemFlow.escorts.push(body);
          dots.push({ body, from: sensor.position.clone().add(new THREE.Vector3(0, 1.5, 0)), delay: wave * .55 + i * .07 });
        });
      }
      await seq.tween(2.4, (p, raw) => {
        const time = raw * 2.4;
        dots.forEach((dot) => { const t = clamp((time - dot.delay) / .8, 0, 1); dot.body.position.lerpVectors(dot.from, hub, t); dot.body.position.y += Math.sin(t * Math.PI) * 1.2; dot.body.visible = t < 1 && time >= dot.delay; });
        merge.scale.setScalar(.15 + raw * .75);
      }, 'linear');
      dots.forEach(({ body }) => flowReleaseEscort(body));
      await flowFade(seq, collecting, .2);
      await flowSay(seq, `${formatNumber(messages, 0)} messages aggregated`, flowNodeWorld(iot, [0, 9.5, 0]), { tone: 'green', hold: 1.0 });
      const entry = buildFlowRoute(iot, iotTarget, record, flowRouteColor(record));
      if (!entry) return;
      const packet = makeFlowPacket({ label: `sensor stream · ${formatNumber(messages, 0)} msgs`, color: COLORS.green, size: .5, tone: 'green' });
      packet.position.copy(merge.position); flowAdd(packet, { update: (e, d) => { packet.rotation.y += d * .9; } });
      await seq.tween(.4, (p) => { merge.scale.setScalar(.9 * (1 - p)); merge.material.opacity = .45 * (1 - p); }, 'in');
      await flowMoveTo(seq, packet, entry.curve.getPoint(0), .5, { arc: .6 });
      flowCamera([iot, iotTarget], { lift: 5 });
      setBuildingState(iot, 'idle'); setBuildingState(iotTarget, 'receiving');
      await flowTravel(seq, packet, entry.curve, { seconds: hopSeconds(record), escorts: 4, color: entry.color });
      const tone = recordTone(record);
      if (cloudRegistry.has(iotTarget)) {
        // Cloud store operation: process first, then white glow on success or red pulse on failure.
        setCloudState(iotTarget, 'processing', { rate: 5 });
        await Promise.all([
          flowSay(seq, `${iotTarget} — Storing sensor stream…`, flowNodeWorld(iotTarget, [0, 17, 0]), { tone: 'cyan', hold: .5 }),
          seq.tween(.9, (p) => packet.scale.setScalar(1 - p), 'in'),
        ]);
        if (tone === 'red') await cloudOperationFailed(iotTarget, `${iotTarget} — Store failed · ${record.anomaly_status}`);
        else await cloudOperationSuccess(iotTarget, `${iotTarget} — Sensor Stream Stored ✓`, { hold: 1.5 });
      } else {
        setBuildingState(iotTarget, tone === 'red' ? 'error' : 'success');
        await flowSay(seq, tone === 'red' ? `${iotTarget} — ${record.anomaly_status}` : `${iotTarget} — sensor stream received`, flowNodeWorld(iotTarget, [0, (CITY_NODE[iotTarget]?.height || 8) + 3, 0]), { tone: tone === 'red' ? 'red' : 'green', hold: 1.0 });
        await seq.tween(.4, (p) => packet.scale.setScalar(1 - p), 'in');
      }
      setBuildingState(iotTarget, 'idle');
    },
  },
  {
    id: 'FINISHED', title: 'System flow finished', kind: 'RESULT',
    note: () => 'Every building performed its function. Replay, or explore the full network.',
    async run(seq) {
      flowCamera(Object.values(systemFlow.ids).filter((id) => nodeObjects.has(id)), { lift: 8, back: 1.05 });
      const closing = whatIf.mainBranchDone ? 'Network Optimized — Operation Completed Successfully' : 'System flow complete — all functions demonstrated';
      await flowSay(seq, closing, flowNodeWorld(systemFlow.ids.server, [0, 26, 0]), { tone: 'green', hold: 1.8, scale: 1.15 });
    },
  },
];

// ---- panel + lifecycle
function renderFlowPanel(phase, index) {
  const panel = $('#flow-panel');
  if (!panel) return;
  panel.hidden = false;
  $('#flow-counter').textContent = `PHASE ${String(index + 1).padStart(2, '0')} / ${FLOW_PHASES.length}`;
  $('#flow-title').textContent = phase.title;
  $('#flow-kind').textContent = phase.kind || 'SYSTEM FLOW';
  $('#flow-note').textContent = typeof phase.note === 'function' ? phase.note() : (phase.note || '');
  $('#flow-progress').style.width = `${((index + 1) / FLOW_PHASES.length) * 100}%`;
  $('#flow-state').textContent = systemFlow.sequence?.paused ? 'PAUSED' : 'LIVE';
  $('#flow-pause').textContent = systemFlow.sequence?.paused ? 'RESUME' : 'PAUSE';
  $('#flow-prev').disabled = index === 0;
  $('#flow-next').disabled = index >= FLOW_PHASES.length - 1;
  $('#flow-result').hidden = true;
  $('#flow-profile').textContent = flowProfileLabel();
  setFlowBasis(`OBSERVED · ${FLOW_PROFILE_LABELS[systemFlow.profile] || 'latest'} dataset rows`, 'observed');
}

function startSystemFlow({ confirmRestart = false } = {}) {
  if (systemFlow.active && confirmRestart && typeof window.confirm === 'function' && !window.confirm('Restart the system flow from the beginning?')) return false;
  if (state.storyActive && situationStory.state !== 'loading' && situationStory.state !== 'explore') enterExploreMode();
  exitRouteFocus({ restoreCamera: false });
  setCineCamera(false);
  if (state.visualMode !== 'city') setVisualizationMode('city', false);
  if (systemFlow.sequence) systemFlow.sequence.stop();
  flowClearAll(); flowResetBuildings(); cloudResetAll(); whatIfReset();
  systemFlow.ids = chooseFlowIds();
  systemFlow.records = collectFlowRecords(systemFlow.ids);
  systemFlow.active = true; systemFlow.shown = true; systemFlow.state = 'running';
  state.storyActive = true;
  $('#selection-panel').classList.remove('open');
  setDrawer('left', false); setDrawer('right', false);
  applyFlowVisibility();
  controls.autoRotate = false;
  const sequence = new FlowSequence(FLOW_PHASES, {
    onPhase: (phase, index) => { systemFlow.index = index; flowClearTransient(); systemFlow.follow = null; renderFlowPanel(phase, index); },
    onComplete: () => { systemFlow.active = false; systemFlow.state = 'completed'; $('#flow-state').textContent = 'COMPLETED'; $('#flow-result').hidden = false; },
  });
  systemFlow.sequence = sequence;
  sequence.run(0);
  return true;
}

function exitSystemFlow({ resetCamera: reset = true } = {}) {
  if (!systemFlow.shown && !systemFlow.active) return;
  systemFlow.sequence?.stop();
  systemFlow.sequence = null;
  flowClearAll(); flowResetBuildings(); cloudResetAll(); whatIfReset();
  systemFlow.active = false; systemFlow.shown = false; systemFlow.state = 'idle'; systemFlow.index = -1;
  state.storyActive = false;
  const panel = $('#flow-panel'); if (panel) panel.hidden = true;
  applyFlowVisibility();
  if (reset && state.visualMode === 'city') resetCamera();
}

function toggleFlowPause() {
  const sequence = systemFlow.sequence;
  if (!sequence || !sequence.active) return;
  sequence.paused = !sequence.paused;
  $('#flow-state').textContent = sequence.paused ? 'PAUSED' : 'LIVE';
  $('#flow-pause').textContent = sequence.paused ? 'RESUME' : 'PAUSE';
  if (sequence.paused) cameraGoal = null; else if (systemFlow.cameraBase) cameraGoal = { position: systemFlow.cameraBase.position.clone(), target: systemFlow.cameraBase.target.clone() };
}

function flowJump(offset) {
  const sequence = systemFlow.sequence;
  if (!sequence) return;
  if (!sequence.active) { startSystemFlow(); return; }
  sequence.paused = false;
  sequence.jump(sequence.index + offset);
}

const FLOW_PROFILES = ['story', 'latest', 'peak'];
const FLOW_PROFILE_LABELS = { story: 'DEMO STORY', latest: 'LATEST', peak: 'PEAK LOAD' };

function flowProfileLabel() { return `ROWS: ${FLOW_PROFILE_LABELS[systemFlow.profile] || 'LATEST'}`; }

function toggleFlowProfile() {
  systemFlow.profile = FLOW_PROFILES[(FLOW_PROFILES.indexOf(systemFlow.profile) + 1) % FLOW_PROFILES.length];
  $('#flow-profile').textContent = flowProfileLabel();
  if (systemFlow.shown) startSystemFlow();
}

function bindFlowControls() {
  $('#flow-prev')?.addEventListener('click', () => flowJump(-1));
  $('#flow-next')?.addEventListener('click', () => flowJump(1));
  $('#flow-pause')?.addEventListener('click', toggleFlowPause);
  $('#flow-close')?.addEventListener('click', () => exitSystemFlow());
  $('#flow-replay')?.addEventListener('click', () => startSystemFlow());
  $('#flow-explore')?.addEventListener('click', () => exitSystemFlow());
  $('#flow-profile')?.addEventListener('click', toggleFlowProfile);
}

function updateSystemFlow(delta, elapsed) {
  if (!systemFlow.shown) return;
  const flowDelta = state.paused ? 0 : delta * state.flowSpeed;
  systemFlow.sequence?.update(flowDelta);
  flowAnims.forEach((item) => { try { item.update(elapsed, flowDelta); } catch (error) { console.error('[system flow anim]', error); } });
}

// ---------------------------------------------------------------------------------------------
// CLOUD OPERATION STATES — reusable feedback for Cloud nodes (Cloud-01)
// IDLE = dark blue · RECEIVING = blue/cyan pulse · PROCESSING = brighter cyan pulse ·
// SUCCESS = bright white cloud + soft white bloom + 3–5 sparks + one expanding ring + message ·
// FAILED = red warning pulse + message. Any cloud operation calls cloudOperationSuccess() or
// cloudOperationFailed(); the white glow is never triggered merely because data arrived.
// ---------------------------------------------------------------------------------------------

FLOW_TONES.white = { border: 'rgba(255,255,255,.95)', fill: 'rgba(14,22,34,.92)', color: '#ffffff' };

const cloudRegistry = new Map();
const cloudStates = new Map();
let cloudFxLayer = null;
let cloudTweens = [];
let cloudTime = 0;

const CLOUD_TARGETS = {
  idle: { tint: 0x2f4f72, tintMix: 0, emissive: 0x2f4f72, emissiveMix: 0, intensity: 1, pulseSpeed: 0, pulseAmp: 0, light: 1, lightColor: 0x8fd4ff, glow: 1 },
  receiving: { tint: 0x4fb8ff, tintMix: .08, emissive: 0x3f9ad8, emissiveMix: 1, intensity: 1.8, pulseSpeed: 2.2, pulseAmp: .55, light: 1.6, lightColor: 0x8fd4ff, glow: 1.8 },
  processing: { tint: 0x39e7ff, tintMix: .16, emissive: 0x39e7ff, emissiveMix: 1, intensity: 2.7, pulseSpeed: 4.4, pulseAmp: .75, light: 2.4, lightColor: 0x39e7ff, glow: 2.8 },
  success: { tint: 0xffffff, tintMix: .9, emissive: 0xffffff, emissiveMix: 1, intensity: 7.5, pulseSpeed: 0, pulseAmp: 0, light: 5.5, lightColor: 0xffffff, glow: 4.5 },
  warning: { tint: 0xffd426, tintMix: .22, emissive: 0xffb347, emissiveMix: 1, intensity: 3.0, pulseSpeed: 5.5, pulseAmp: .8, light: 2.6, lightColor: 0xffc46b, glow: 2.4 },
  failed: { tint: 0xff3c4e, tintMix: .28, emissive: 0xff3c4e, emissiveMix: 1, intensity: 3.4, pulseSpeed: 9, pulseAmp: .85, light: 3.2, lightColor: 0xff3c4e, glow: 2.4 },
};

function ensureCloudFxLayer() {
  if (!cloudFxLayer) { cloudFxLayer = new THREE.Group(); cloudFxLayer.name = 'Cloud operation effects'; scene.add(cloudFxLayer); }
  return cloudFxLayer;
}

function registerCloudMaterial(mesh) {
  const material = mesh.material.clone();
  material.userData = { shared: false, cloudBase: { color: material.color.clone(), emissive: material.emissive.clone(), emissiveIntensity: material.emissiveIntensity } };
  mesh.material = material;
  return mesh;
}

function freshCloudState() {
  const idle = CLOUD_TARGETS.idle;
  return {
    mode: 'idle', rate: 3,
    cur: { tint: new THREE.Color(idle.tint), emissive: new THREE.Color(idle.emissive), lightColor: new THREE.Color(idle.lightColor), tintMix: 0, emissiveMix: 0, intensity: 1, light: 1, glow: 1, pulseSpeed: 0, pulseAmp: 0 },
    target: { ...idle, tint: new THREE.Color(idle.tint), emissive: new THREE.Color(idle.emissive), lightColor: new THREE.Color(idle.lightColor) },
  };
}

function registerCloud(id, { puffs, glow, light, centre }) {
  if (glow) { glow.material = glow.material.clone(); glow.material.userData = { shared: false }; }
  if (light) light.userData.cloudManaged = true;
  cloudRegistry.set(id, { puffs, glow, light, centre, lightBase: light?.userData.baseIntensity ?? light?.intensity ?? 0, glowBase: glow?.material.opacity ?? 0 });
  cloudStates.set(id, freshCloudState());
}

function cloudCentre(id) {
  const reg = cloudRegistry.get(id);
  return flowNodeWorld(id, reg?.centre || [0, 11.6, 0]);
}

// Universal state setter. Visual values ease toward the target inside updateCloudStates().
function setCloudState(id, mode, { rate = 3.5 } = {}) {
  const cs = cloudStates.get(id);
  const target = CLOUD_TARGETS[mode] || CLOUD_TARGETS.idle;
  if (!cs) return;
  cs.mode = CLOUD_TARGETS[mode] ? mode : 'idle';
  cs.rate = rate;
  cs.target = { ...target, tint: new THREE.Color(target.tint), emissive: new THREE.Color(target.emissive), lightColor: new THREE.Color(target.lightColor) };
}

function cloudTween(seconds, onUpdate, easing = 'inOut') {
  const ease = FLOW_EASE[easing] || FLOW_EASE.inOut;
  return new Promise((resolve, reject) => {
    if (seconds <= 0) { onUpdate(1, 1); resolve(); return; }
    cloudTweens.push({ start: cloudTime, duration: seconds, onUpdate, ease, resolve, reject });
  });
}

function cloudFxRemove(object) {
  if (!object) return;
  object.removeFromParent();
  if (object.geometry && !object.geometry.userData?.shared) object.geometry.dispose();
  const material = object.material;
  if (material && !material.userData?.shared) { if (material.map && !material.map.userData?.shared) material.map.dispose(); material.dispose(); }
}

function cloudResetAll() {
  const pending = cloudTweens; cloudTweens = [];
  pending.forEach((item) => item.reject(new FlowCancelled()));
  if (cloudFxLayer) disposeGroup(cloudFxLayer);
  cloudStates.forEach((cs, id) => setCloudState(id, 'idle', { rate: 4 }));
}

function updateCloudStates(elapsed, delta) {
  cloudTime += delta;
  if (cloudTweens.length) {
    const done = [];
    cloudTweens.slice().forEach((item) => {
      const raw = clamp((cloudTime - item.start) / item.duration, 0, 1);
      try { item.onUpdate(item.ease(raw), raw); } catch (error) { console.error('[cloud tween]', error); done.push(item); return; }
      if (raw >= 1) done.push(item);
    });
    if (done.length) { cloudTweens = cloudTweens.filter((item) => !done.includes(item)); done.forEach((item) => item.resolve()); }
  }
  cloudStates.forEach((cs, id) => {
    const reg = cloudRegistry.get(id);
    if (!reg) return;
    const k = 1 - Math.exp(-delta * cs.rate);
    const cur = cs.cur; const target = cs.target;
    cur.tint.lerp(target.tint, k); cur.emissive.lerp(target.emissive, k); cur.lightColor.lerp(target.lightColor, k);
    ['tintMix', 'emissiveMix', 'intensity', 'light', 'glow', 'pulseSpeed', 'pulseAmp'].forEach((key) => { cur[key] += (target[key] - cur[key]) * k; });
    const pulse = 1 + cur.pulseAmp * (Math.sin(elapsed * cur.pulseSpeed) * .5 + .5);
    reg.puffs.forEach((puff) => {
      const base = puff.material.userData.cloudBase; if (!base) return;
      puff.material.color.copy(base.color).lerp(cur.tint, cur.tintMix);
      puff.material.emissive.copy(base.emissive).lerp(cur.emissive, cur.emissiveMix);
      puff.material.emissiveIntensity = base.emissiveIntensity * cur.intensity * pulse;
    });
    if (reg.glow) { reg.glow.material.opacity = clamp(reg.glowBase * cur.glow * pulse, 0, .7); reg.glow.material.color.copy(cur.lightColor); }
    if (reg.light) { reg.light.userData.baseIntensity = reg.lightBase * cur.light * pulse; reg.light.color.copy(cur.lightColor); }
  });
}

function cloudMessage(text, tone, centre, lift = 6.2) {
  const label = makeFlowLabel(text, tone, { scale: 1.12 });
  label.position.copy(centre); label.position.y += lift;
  ensureCloudFxLayer().add(label);
  return label;
}

// SUCCESS: dark blue → luminous white, soft bloom, 3–5 sparks, one expanding ring, message, hold, fade back.
function cloudOperationSuccess(id, message = `${id} — Operation Successful ✓`, { hold = 1.8, rise = .45, fade = 1.25 } = {}) {
  const reg = cloudRegistry.get(id);
  if (!reg) return Promise.resolve();
  const centre = cloudCentre(id);
  const layer = ensureCloudFxLayer();
  setCloudState(id, 'success', { rate: 7 });
  const bloom = flowSprite(0xffffff, 0, 18, 12); bloom.position.copy(centre); layer.add(bloom);
  const sparkCount = 3 + Math.floor(pseudoRandom(cloudTime * 3.7 + 1) * 3);
  const sparks = [];
  for (let i = 0; i < sparkCount; i += 1) {
    const spark = flowSprite(i % 2 ? 0xbff3ff : 0xffffff, 0, .55);
    spark.position.copy(centre); layer.add(spark);
    const angle = (i / sparkCount) * Math.PI * 2 + pseudoRandom(i + cloudTime) * .8;
    sparks.push({ spark, direction: new THREE.Vector3(Math.cos(angle) * 4.8, 1.6 + pseudoRandom(i + 2) * 2.6, Math.sin(angle) * 4.8), delay: i * .06 });
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.07, 72), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.position.copy(centre); ring.position.y -= 2.4; ring.rotation.x = -Math.PI / 2; layer.add(ring);
  const label = cloudMessage(message, 'white', centre);
  return (async () => {
    try {
      await Promise.all([
        cloudTween(rise, (p) => { bloom.material.opacity = .55 * p; label.material.opacity = .97 * p; }, 'out'),
        cloudTween(1.05, (p, raw) => {
          sparks.forEach(({ spark, direction, delay }) => {
            const t = clamp((raw - delay) / (1 - delay), 0, 1);
            spark.position.copy(centre).addScaledVector(direction, FLOW_EASE.out(t));
            spark.material.opacity = t > 0 ? (1 - t) * .95 : 0;
            spark.scale.setScalar(.55 * (1 - t * .55));
          });
        }, 'linear'),
        cloudTween(1.3, (p) => { ring.scale.setScalar(1 + p * 15); ring.material.opacity = .5 * (1 - p); }, 'out'),
      ]);
      sparks.forEach(({ spark }) => cloudFxRemove(spark)); cloudFxRemove(ring);
      await cloudTween(hold, (p) => { bloom.material.opacity = .55 - p * .12; }, 'linear');
      setCloudState(id, 'idle', { rate: 2.2 });
      await cloudTween(fade, (p) => { bloom.material.opacity = .43 * (1 - p); label.material.opacity = .97 * (1 - p); }, 'inOut');
    } catch (error) { if (!error?.cancelled) console.error('[cloud success]', error); }
    finally { sparks.forEach(({ spark }) => cloudFxRemove(spark)); cloudFxRemove(ring); cloudFxRemove(bloom); cloudFxRemove(label); }
  })();
}

// FAILED: red warning pulse, red ring, message, then back to idle. No white glow.
function cloudOperationFailed(id, message = `${id} — Operation Failed`, { hold = 1.4 } = {}) {
  const reg = cloudRegistry.get(id);
  if (!reg) return Promise.resolve();
  const centre = cloudCentre(id);
  const layer = ensureCloudFxLayer();
  setCloudState(id, 'failed', { rate: 8 });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.1, 72), new THREE.MeshBasicMaterial({ color: COLORS.red, transparent: true, opacity: .55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  ring.position.copy(centre); ring.position.y -= 2.4; ring.rotation.x = -Math.PI / 2; layer.add(ring);
  const label = cloudMessage(message, 'red', centre);
  return (async () => {
    try {
      await Promise.all([
        cloudTween(.3, (p) => { label.material.opacity = .97 * p; }, 'out'),
        cloudTween(1.1, (p) => { ring.scale.setScalar(1 + p * 11); ring.material.opacity = .55 * (1 - p); }, 'out'),
      ]);
      await cloudTween(hold, () => {}, 'linear');
      setCloudState(id, 'idle', { rate: 2.5 });
      await cloudTween(.8, (p) => { label.material.opacity = .97 * (1 - p); }, 'inOut');
    } catch (error) { if (!error?.cancelled) console.error('[cloud failed]', error); }
    finally { cloudFxRemove(ring); cloudFxRemove(label); }
  })();
}

// Generic operation wrapper: receiving → processing → success/failed, usable by any story or by the console.
async function runCloudOperation(id, { message = `${id} — Operation Successful ✓`, failureMessage = `${id} — Operation Failed`, processingSeconds = .9, succeed = true, hold = 1.8 } = {}) {
  setCloudState(id, 'processing', { rate: 5 });
  await cloudTween(processingSeconds, () => {}, 'linear');
  if (succeed) await cloudOperationSuccess(id, message, { hold });
  else await cloudOperationFailed(id, failureMessage);
}

// Manual hooks for demos: cloudOps.success('Cloud-01', 'Backup Completed ✓'), cloudOps.failed('Cloud-01'), cloudOps.state('Cloud-01', 'processing').
window.cloudOps = { success: cloudOperationSuccess, failed: cloudOperationFailed, run: runCloudOperation, state: setCloudState };

// ---------------------------------------------------------------------------------------------
// WHAT-IF SIMULATION LAYER
// Branches the system-flow story when the active telemetry shows an issue:
//   NORMAL FLOW -> ISSUE DETECTED -> STORY PAUSE -> WHAT-IF -> AI PREDICTION -> ALTERNATIVE
//   -> COMPARISON -> RECOMMENDATION -> APPLY -> SUCCESS -> story continues on the optimised route.
//
// THREE DATA CLASSES ARE KEPT SEPARATE AND ALWAYS LABELLED:
//   OBSERVED   - values read from a dataset row or from aggregated route/node stats. Never modified.
//   PREDICTED  - values from ml_results.json (Random Forest baseline, plus documented demo floors).
//   SIMULATED  - values produced here by a transparent queueing approximation. Never measured.
// The dataset is never mutated: every simulation works on copies and returns new objects.
// ---------------------------------------------------------------------------------------------

const WHATIF_LIMITS = { load: 85, bandwidth: 85, latency: 120, loss: 3, queue: 30 };

const WHATIF_SCENARIOS = {
  'server-overload': {
    label: 'Server Overload', kind: 'SCENARIO 1 - OVERLOAD', multiplier: 1.5,
    question: (n) => `What if traffic to ${n} increases by 50%?`,
    action: (n, alt) => `Shift traffic from ${n} to the lower-load route via ${alt}`,
  },
  'db-congestion': {
    label: 'Database Congestion', kind: 'SCENARIO 2 - DATABASE CONGESTION', multiplier: 1.4,
    question: (n) => `What if read traffic is shifted away from ${n}?`,
    action: (n, alt) => `Shift eligible read traffic from ${n} to ${alt}`,
  },
  failure: {
    label: 'Node Unavailable', kind: 'SCENARIO 3 - FAILURE', multiplier: 1,
    question: (n) => `What if traffic is rerouted around ${n}?`,
    action: (n, alt) => `Reroute traffic through ${alt} while ${n} is unavailable`,
  },
  'api-overload': {
    label: 'API Gateway Overload', kind: 'SCENARIO 4 - API OVERLOAD', multiplier: 1.4,
    question: () => 'What if requests are distributed and low-priority traffic is reduced?',
    action: (n, alt) => `Distribute requests to ${alt}, shed low-priority traffic, scale ${n} capacity`,
  },
  threat: {
    label: 'Security Threat', kind: 'SCENARIO 5 - SECURITY THREAT', multiplier: 1,
    question: () => 'What if this route is blocked?',
    action: (n, alt) => (alt ? `Block the route and move clean traffic via ${alt}` : 'Block the route and investigate the source'),
  },
  'cloud-overload': {
    label: 'Cloud Load Critical', kind: 'SCENARIO 6 - CLOUD OVERLOAD', multiplier: 1.35,
    question: () => 'What if low-priority uploads are delayed and traffic is distributed?',
    action: (n) => `Delay low-priority uploads and distribute the remaining traffic to ${n}`,
  },
  congestion: {
    label: 'Network Congestion', kind: 'SCENARIO - CONGESTION', multiplier: 1.3,
    question: (n) => `What if the transfer is rebalanced away from ${n}?`,
    action: (n, alt) => `Rebalance the transfer across ${alt}`,
  },
};

// Issues that can be relieved on the node itself when no peer exists (shed or delay demand).
const MITIGATION_KINDS = ['cloud-overload', 'api-overload', 'congestion', 'db-congestion', 'server-overload'];
const MITIGATION_FACTOR = .65; // 35% of low-priority demand delayed or shed
const whatIf = { active: false, mainBranchDone: false, cards: [], dimmed: false, exposure: null, entries: [] };

// ---- 1. issue detection (thresholds only; nothing is written back to the dataset)
function classifyIssue(record, focusId) {
  if (!record) return null;
  const focus = NODE_CONFIG.find((node) => node.id === focusId);
  const load = Number(record.network_load_percent) || 0;
  const bandwidth = Number(record.bandwidth_usage_percent) || 0;
  const latency = Number(record.latency_ms) || 0;
  const loss = Number(record.packet_loss_percent) || 0;
  const queue = Number(record.queue_length) || 0;
  const failed = record.connection_status === 'Failed' || record.route_status === 'Blocked' || record.anomaly_status === 'Failed Connection';
  const threat = record.threat_level === 'Critical' || record.access_permission === 'Denied' || record.anomaly_status === 'Suspicious Traffic';
  const degraded = record.route_status === 'Congested' || record.connection_status === 'Degraded';
  const stressed = load > WHATIF_LIMITS.load || bandwidth > WHATIF_LIMITS.bandwidth || latency > WHATIF_LIMITS.latency
    || loss > WHATIF_LIMITS.loss || queue > WHATIF_LIMITS.queue;
  const reasons = [];
  if (load > WHATIF_LIMITS.load) reasons.push(`load ${formatNumber(load, 0)}%`);
  if (bandwidth > WHATIF_LIMITS.bandwidth) reasons.push(`bandwidth ${formatNumber(bandwidth, 0)}%`);
  if (latency > WHATIF_LIMITS.latency) reasons.push(`latency ${formatNumber(latency, 0)} ms`);
  if (loss > WHATIF_LIMITS.loss) reasons.push(`packet loss ${formatNumber(loss, 1)}%`);
  if (queue > WHATIF_LIMITS.queue) reasons.push(`queue ${queue}`);
  if (degraded) reasons.push(record.route_status === 'Congested' ? 'route congested' : 'connection degraded');
  if (record.anomaly_status !== 'Normal') reasons.push(record.anomaly_status.toLowerCase());
  let kind = null;
  if (threat) kind = 'threat';
  else if (failed) kind = 'failure';
  else if (stressed || (degraded && record.anomaly_status !== 'Normal')) {
    kind = focus?.type === 'Cloud' ? 'cloud-overload'
      : focus?.type === 'API' ? 'api-overload'
        : focus?.type === 'Database' ? 'db-congestion'
          : focus?.type === 'Server' ? 'server-overload' : 'congestion';
  }
  if (!kind) return null;
  const severity = (kind === 'threat' || kind === 'failure' || load > 90 || latency > 180) ? 'critical' : 'warning';
  return {
    kind, severity, focusId, reasons,
    scenario: WHATIF_SCENARIOS[kind],
    observed: { load, bandwidth, latency, loss, queue, volume: Number(record.data_volume_mb) || 0, response: Number(record.response_time_ms) || 0, routeStatus: record.route_status, connectionStatus: record.connection_status, anomaly: record.anomaly_status, threat: record.threat_level },
  };
}

// ---- 2. simulation model (pure functions; explainable M/M/1 queueing approximation)
function riskLabel(load, latency) {
  if (load >= 90 || latency >= 200) return { text: 'CRITICAL', tone: 'red' };
  if (load >= 75 || latency >= 120) return { text: 'HIGH', tone: 'red' };
  if (load >= 60 || latency >= 80) return { text: 'MEDIUM', tone: 'yellow' };
  return { text: 'LOW', tone: 'green' };
}

// Utilisation rho drives delay as 1/(1-rho). The service time implied by the observed pair
// (latency, load) is held constant, so only the extra demand changes the outcome.
function projectUnderTraffic(observed, multiplier) {
  const rho = clamp(observed.load / 100, .02, .97);
  const service = Math.max(observed.latency * (1 - rho), .5);
  const rho2 = clamp(rho * multiplier, .02, .995);
  const latency = service / (1 - rho2);
  const queueRatio = (rho2 / (1 - rho2)) / (rho / (1 - rho));
  return {
    load: rho2 * 100,
    latency,
    queue: Math.round(Math.max(observed.queue, 1) * queueRatio),
    bandwidth: Math.min(100, observed.bandwidth * multiplier),
    loss: Math.min(100, observed.loss * (rho2 > .9 ? 1 + (rho2 - .9) * 22 : 1)),
    rho: rho2, rhoBefore: rho, service, multiplier,
    // Demand the scenario adds, before any capacity ceiling is applied.
    offered: rho * (multiplier - 1),
  };
}

// Baseline for an alternative path, taken from its own observed rows where they exist.
function alternativeBaseline(sourceId, destinationId) {
  const stat = state.routeStats.find((route) => route.source === sourceId && route.destination === destinationId);
  // A one- or two-row route is usually just the injected anomaly, so it is not a fair baseline.
  if (stat && stat.samples >= 3) {
    return { load: stat.networkLoad, latency: stat.latency, queue: stat.queueLength, bandwidth: stat.bandwidth, loss: stat.packetLoss,
      basis: `observed ${sourceId} -> ${destinationId} rows (${stat.samples})` };
  }
  const node = state.nodeStats.get(destinationId);
  if (node) {
    const rho = clamp(node.load / 100, .02, .97);
    return { load: node.load, latency: node.latency, queue: Math.round(rho / (1 - rho)), bandwidth: node.load, loss: 0,
      basis: `no direct rows; ${destinationId} node baseline from its own observed traffic` };
  }
  return null;
}

// `transferRho` is the share of utilisation moved onto the alternative. The caller states it explicitly
// (all of it when a node is unavailable, half of the extra demand when traffic is being distributed).
function simulateAlternative(baseline, transferRho) {
  const rho = clamp(baseline.load / 100, .02, .97);
  const service = Math.max(baseline.latency * (1 - rho), .5);
  const added = Math.max(0, transferRho);
  const rho2 = clamp(rho + added, .02, .99);
  const latency = service / (1 - rho2);
  return {
    load: rho2 * 100,
    latency,
    queue: Math.round(Math.max(baseline.queue, 1) * ((rho2 / (1 - rho2)) / (rho / (1 - rho)))),
    bandwidth: Math.min(100, baseline.bandwidth * (1 + added)),
    loss: baseline.loss,
    basis: baseline.basis,
  };
}

// Alternative path selection: the stored AI predictive flow when the failing segment is on it,
// otherwise the lowest-load anomaly-free peer of the same node type from the observed routes.
function chooseAlternative(sourceId, destinationId, kind) {
  // Flagged traffic is never given a different destination: the answer to a threat is to block it and
  // investigate, not to send the same suspicious flow somewhere else.
  if (kind === 'threat') return null;
  const flow = state.ml?.predictive_flow;
  const segments = predictivePathSegments();
  if (segments.bottleneck.has(`${sourceId}→${destinationId}`) && Array.isArray(flow?.predicted) && flow.predicted.length > 2) {
    const path = flow.predicted;
    const index = Math.max(1, path.indexOf(sourceId) + 1);
    const next = path[index] || path[2];
    const after = path[index + 1] || null;
    return { node: next, downstream: after, path, basis: 'stored AI predictive flow (prepared scenario path)' };
  }
  const type = NODE_CONFIG.find((node) => node.id === destinationId)?.type;
  const peers = NODE_CONFIG.filter((node) => node.type === type && node.id !== destinationId).map((node) => node.id);
  const ranked = peers
    .map((id) => ({ id, stat: state.nodeStats.get(id) }))
    .filter((item) => item.stat && item.stat.health !== 'Critical')
    .sort((a, b) => a.stat.load - b.stat.load);
  if (!ranked.length) return null;
  return { node: ranked[0].id, downstream: null, path: [sourceId, ranked[0].id], basis: `lowest observed load among ${type} peers` };
}

function findMlRecommendation(...ids) {
  const list = state.ml?.recommendations || [];
  return list.find((item) => ids.some((id) => id && item.action.includes(id))) || null;
}

// ---- 3. in-world holographic cards
function makeCardSprite(canvas, worldWidth) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, depthTest: false, fog: false }));
  sprite.scale.set(worldWidth, worldWidth * (canvas.height / canvas.width), 1);
  sprite.renderOrder = 23;
  return sprite;
}

function drawCardFrame(c, w, h, style, title, subtitle, badge) {
  c.clearRect(0, 0, w, h);
  c.fillStyle = style.fill;
  c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, 16); c.fill();
  c.strokeStyle = style.border; c.lineWidth = 3; c.stroke();
  c.lineWidth = 5;
  [[16, 16, 1, 1], [w - 16, 16, -1, 1], [16, h - 16, 1, -1], [w - 16, h - 16, -1, -1]].forEach(([x, y, dx, dy]) => {
    c.beginPath(); c.moveTo(x + dx * 26, y); c.lineTo(x, y); c.lineTo(x, y + dy * 26); c.stroke();
  });
  c.textBaseline = 'middle'; c.textAlign = 'left';
  c.fillStyle = style.color; c.font = '700 29px "Segoe UI", Arial, sans-serif';
  c.fillText(title, 30, 46);
  if (subtitle) { c.fillStyle = 'rgba(184,206,226,.82)'; c.font = '600 16px "Segoe UI", Arial, sans-serif'; c.fillText(subtitle, 30, 76); }
  if (badge) {
    c.font = '800 15px "Segoe UI", Arial, sans-serif';
    const bw = c.measureText(badge).width + 24;
    c.fillStyle = 'rgba(255,255,255,.09)';
    c.beginPath(); c.roundRect(w - bw - 26, 28, bw, 26, 6); c.fill();
    c.strokeStyle = style.border; c.lineWidth = 1.6; c.stroke();
    c.fillStyle = style.color; c.textAlign = 'center'; c.fillText(badge, w - bw / 2 - 26, 42); c.textAlign = 'left';
  }
}

const CARD_VALUE_TONES = { good: '#8ff2c1', warn: '#ffd9a3', bad: '#ff9aa5', plain: '#e4eef7', hint: '#9db4c8' };

// rows: [label, value, tone]
function makeStateCard({ title, subtitle, badge, rows, tone = 'cyan', note = '', width = 12.5 }) {
  const w = 560; const h = 104 + rows.length * 46 + (note ? 40 : 12);
  const [canvas, c] = makeCanvas(w, h);
  drawCardFrame(c, w, h, FLOW_TONES[tone] || FLOW_TONES.cyan, title, subtitle, badge);
  rows.forEach(([label, value, valueTone], index) => {
    const y = 118 + index * 46;
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(30, y + 21, w - 60, 1);
    c.font = '600 19px "Segoe UI", Arial, sans-serif'; c.fillStyle = CARD_VALUE_TONES.hint; c.textAlign = 'left';
    c.fillText(label, 30, y);
    c.font = '700 22px "Segoe UI", Arial, sans-serif'; c.fillStyle = CARD_VALUE_TONES[valueTone] || CARD_VALUE_TONES.plain; c.textAlign = 'right';
    c.fillText(value, w - 30, y);
  });
  if (note) { c.textAlign = 'left'; c.font = '600 14px "Segoe UI", Arial, sans-serif'; c.fillStyle = 'rgba(150,175,196,.85)'; c.fillText(note, 30, h - 30); }
  return makeCardSprite(canvas, width);
}

// Two-column BEFORE / AFTER card. `rows`: [label, beforeText, afterText, betterDirection]
function makeCompareCard({ title, leftTitle, rightTitle, rows, note = '', tone = 'purple', width = 15 }) {
  const w = 720; const h = 132 + rows.length * 46 + (note ? 42 : 14);
  const [canvas, c] = makeCanvas(w, h);
  drawCardFrame(c, w, h, FLOW_TONES[tone] || FLOW_TONES.purple, title, '', 'SIMULATED');
  const midX = w / 2 + 40;
  c.font = '800 16px "Segoe UI", Arial, sans-serif'; c.textAlign = 'right';
  c.fillStyle = 'rgba(255,154,165,.95)'; c.fillText(leftTitle, midX - 26, 96);
  c.fillStyle = 'rgba(143,242,193,.95)'; c.fillText(rightTitle, w - 30, 96);
  c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(midX - 12, 82); c.lineTo(midX - 12, h - (note ? 52 : 24)); c.stroke();
  rows.forEach(([label, before, after, betterTone], index) => {
    const y = 132 + index * 46;
    c.fillStyle = 'rgba(255,255,255,.05)'; c.fillRect(30, y + 21, w - 60, 1);
    c.font = '600 19px "Segoe UI", Arial, sans-serif'; c.fillStyle = CARD_VALUE_TONES.hint; c.textAlign = 'left';
    c.fillText(label, 30, y);
    c.font = '700 21px "Segoe UI", Arial, sans-serif'; c.textAlign = 'right';
    c.fillStyle = CARD_VALUE_TONES.bad; c.fillText(before, midX - 26, y);
    c.fillStyle = CARD_VALUE_TONES[betterTone] || CARD_VALUE_TONES.good; c.fillText(after, w - 30, y);
  });
  if (note) { c.textAlign = 'left'; c.font = '600 14px "Segoe UI", Arial, sans-serif'; c.fillStyle = 'rgba(150,175,196,.85)'; c.fillText(note, 30, h - 30); }
  return makeCardSprite(canvas, width);
}

async function showCard(seq, sprite, position, { hold = 2.2, fade = .4, lift = 0 } = {}) {
  sprite.position.copy(position); sprite.position.y += lift;
  ensureFlowLayer().add(sprite);
  whatIf.cards.push(sprite);
  await seq.tween(fade, (p) => { sprite.material.opacity = p * .98; }, 'out');
  if (hold === null) return sprite;
  await seq.wait(hold);
  await hideCard(seq, sprite, fade);
  return null;
}

async function hideCard(seq, sprite, fade = .35) {
  if (!sprite || !sprite.parent) return;
  const from = sprite.material.opacity;
  try { await seq.tween(fade, (p) => { sprite.material.opacity = from * (1 - p); }, 'in'); } finally { removeCard(sprite); }
}

function removeCard(sprite) {
  if (!sprite) return;
  whatIf.cards = whatIf.cards.filter((item) => item !== sprite);
  sprite.removeFromParent();
  sprite.material.map?.dispose();
  sprite.material.dispose();
}

function clearWhatIfCards() { whatIf.cards.slice().forEach(removeCard); }

// ---- 4. scene helpers
function setSceneDim(on) {
  if (on && !whatIf.dimmed) {
    whatIf.exposure = renderer.toneMappingExposure;
    renderer.toneMappingExposure = whatIf.exposure * .68;
    whatIf.dimmed = true;
  } else if (!on && whatIf.dimmed) {
    renderer.toneMappingExposure = whatIf.exposure ?? 1;
    whatIf.dimmed = false;
  }
}

function flowRemoveEntry(entry) {
  if (!entry) return;
  entry.objects.slice().forEach(flowRemove);
  entry.items.forEach((item) => {
    item.object.removeFromParent(); particlePool.bodies.push(item.object);
    item.trails.forEach((trail) => { trail.removeFromParent(); particlePool.trails.push(trail); });
  });
  flowParticles = flowParticles.filter((item) => !entry.items.includes(item));
  systemFlow.routes = systemFlow.routes.filter((item) => item !== entry);
  systemFlow.mainRoutes = systemFlow.mainRoutes.filter((item) => item !== entry);
  interactiveObjects = interactiveObjects.filter((object) => !entry.objects.includes(object));
  whatIf.entries = whatIf.entries.filter((item) => item !== entry);
}

function setEntrySpeed(entry, scale) {
  entry?.items.forEach((item) => { item.speedScale = scale; });
}

// A simulated route is always a translucent purple dashed sky arc, never a solid conduit.
function buildSimulatedRoute(source, destination, { color = COLORS.purple, opacity = .55, particles = 4 } = {}) {
  const curve = makeSkyArc(source, destination, 2, 4.2);
  if (!curve) return null;
  const before = ensureFlowLayer().children.length;
  const beforeParticles = flowParticles.length;
  const route = { key: `whatif:${source}→${destination}`, source, destination, speed: 380, volume: 180, index: 2, simulated: true };
  addSkyArc(flowLayer, route, curve, color, { quality: cityQuality(), list: flowParticles, particleLimit: particles, dashColor: 0xdab4ff, opacity, size: .2 });
  const objects = flowLayer.children.slice(before);
  const items = flowParticles.slice(beforeParticles);
  objects.forEach((object) => systemFlow.transient.push(object));
  interactiveObjects = interactiveObjects.filter((object) => !object.userData.route?.simulated);
  const entry = { source, destination, color, objects, items, curve, dim: 1, simulated: true };
  whatIf.entries.push(entry);
  return entry;
}

// Packets stacking up in front of a node while it is stalled.
function showPacketQueue(nodeId, towardId, count, tone = 'yellow') {
  const port = flowPort(nodeId, towardId).point;
  const direction = port.clone().sub(flowNodeWorld(nodeId)).setY(0).normalize();
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const item = makeFlowPacket({ label: '', size: .32, color: FLOW_HEX[tone] ?? COLORS.yellow, tone });
    item.userData.tag.visible = false;
    item.position.copy(port).addScaledVector(direction, 1.5 * (i + 1));
    item.position.y += .25 + Math.sin(i) * .1;
    flowAdd(item, { update: (elapsed, delta) => { item.rotation.y += delta * .6; item.position.y += Math.sin(elapsed * 2 + i) * .0018; } });
    items.push(item);
  }
  return items;
}

function whatIfPanel(kindText, title, note, basis, basisClass) {
  const kind = $('#flow-kind'); const heading = $('#flow-title'); const noteEl = $('#flow-note'); const basisEl = $('#flow-basis');
  if (kind) kind.textContent = kindText;
  if (heading) heading.textContent = title;
  if (noteEl) noteEl.textContent = note;
  if (basisEl) { basisEl.textContent = basis; basisEl.className = `flow-basis ${basisClass}`; }
}

function setFlowBasis(text, cls = 'observed') {
  const basisEl = $('#flow-basis');
  if (basisEl) { basisEl.textContent = text; basisEl.className = `flow-basis ${cls}`; }
}

// ---- 5. the branch
async function runWhatIfBranch(seq, { record, focus, source, destination, entry, travelPacket = false, allowApply = true }) {
  const issue = classifyIssue(record, focus);
  if (!issue) return null;
  const scenario = issue.scenario;
  const observed = issue.observed;
  const focusName = focus;
  const cardAnchor = flowNodeWorld(focus, [0, (CITY_NODE[focus]?.height || 8) + 7.5, 0]);
  const isCloud = cloudRegistry.has(focus);
  whatIf.active = true;
  let queued = [];
  let simulated = null;
  let outcome = { applied: false, kind: issue.kind };

  try {
    // --- ISSUE DETECTED: escalate the affected route and node
    whatIfPanel('ISSUE DETECTED', `${scenario.label} - ${focusName}`, `Thresholds crossed: ${issue.reasons.join(' · ')}. Detected from the active dataset row, not from a script.`, `OBSERVED · dataset row ${record.timestamp || ''}`.trim(), 'observed');
    flowCamera([focus], { lift: 6, back: .9 });
    const warnHex = issue.severity === 'critical' ? COLORS.red : COLORS.yellow;
    if (entry) {
      recolorFlowEntry(entry, COLORS.yellow);
      setEntrySpeed(entry, .45);
    }
    if (isCloud) setCloudState(focus, 'warning', { rate: 5 });
    else setBuildingState(focus, 'warning');
    await flowSay(seq, `Issue Detected - ${scenario.label}`, cardAnchor, { tone: 'yellow', hold: 1.1, scale: 1.1 });
    if (issue.severity === 'critical') {
      if (entry) recolorFlowEntry(entry, COLORS.red);
      if (isCloud) setCloudState(focus, 'failed', { rate: 6 });
      else setBuildingState(focus, 'error');
      await flowBurstRing(seq, flowNodeWorld(focus, [0, .2, 0]), COLORS.red, { from: 2, to: 10, seconds: .9, opacity: .5 });
    }

    // --- STORY PAUSE: freeze the flow and show the observed current state
    whatIfPanel('STORY PAUSED', 'Current state', 'The journey is held while the problem is inspected. All values below are observed, not simulated.', `OBSERVED · ${source} -> ${destination}`, 'observed');
    if (entry) setEntrySpeed(entry, .05);
    if (observed.queue > WHATIF_LIMITS.queue) queued = showPacketQueue(focus, source, clamp(Math.round(observed.queue / 18), 2, 5), issue.severity === 'critical' ? 'red' : 'yellow');
    const stateCard = makeStateCard({
      title: 'CURRENT STATE', subtitle: `${source} -> ${destination}`, badge: 'OBSERVED', tone: issue.severity === 'critical' ? 'red' : 'yellow',
      rows: [
        ['Network load', `${formatNumber(observed.load, 0)}%`, observed.load > WHATIF_LIMITS.load ? 'bad' : 'warn'],
        ['Latency', `${formatNumber(observed.latency, 0)} ms`, observed.latency > WHATIF_LIMITS.latency ? 'bad' : 'plain'],
        ['Queue length', `${observed.queue}`, observed.queue > WHATIF_LIMITS.queue ? 'bad' : 'plain'],
        ['Packet loss', `${formatNumber(observed.loss, 2)}%`, observed.loss > WHATIF_LIMITS.loss ? 'bad' : 'plain'],
        ['Route status', observed.routeStatus, observed.routeStatus === 'Optimal' ? 'good' : 'warn'],
      ],
      note: `Read from the dataset row for this hop (${record.anomaly_status}).`,
    });
    await showCard(seq, stateCard, cardAnchor, { hold: 2.4 });

    // --- WHAT-IF: dim the city, ask the question
    setSceneDim(true);
    systemFlow.routes.forEach((item) => { if (item !== entry) dimStoryEntry(item, .22); });
    whatIfPanel('WHAT-IF SIMULATION', scenario.question(focusName), 'Simulated values use a queueing approximation on the observed numbers. They are a projection, not a measurement.', 'SIMULATED · queueing approximation', 'simulated');
    await flowSay(seq, scenario.question(focusName), cardAnchor, { tone: 'purple', hold: 1.6, scale: 1.15 });

    // --- AI PREDICTION: project the current path forward
    const projection = projectUnderTraffic(observed, scenario.multiplier);
    const projectedRisk = riskLabel(projection.load, projection.latency);
    if (scenario.multiplier > 1 && queued.length < 5) queued = queued.concat(showPacketQueue(focus, source, clamp(Math.round(projection.queue / 30), 1, 3), 'red'));
    if (entry) recolorFlowEntry(entry, COLORS.red);
    if (isCloud) setCloudState(focus, 'failed', { rate: 6 });
    else setBuildingState(focus, 'error');
    const mlPrediction = (state.ml?.predictions || []).find((item) => item.node === focus);
    whatIfPanel('AI PREDICTION', `Projected impact on ${focusName}`, `Traffic x${scenario.multiplier.toFixed(2)} applied to the observed utilisation. Delay grows as 1/(1-utilisation).`, 'SIMULATED · projected from observed row', 'simulated');
    const projectionRows = [
      ['Projected load', `${formatNumber(projection.load, 0)}%`, projection.load > WHATIF_LIMITS.load ? 'bad' : 'warn'],
      ['Projected latency', `${formatNumber(projection.latency, 0)} ms`, projection.latency > WHATIF_LIMITS.latency ? 'bad' : 'warn'],
      ['Projected queue', `${projection.queue}`, 'bad'],
      ['Overload risk', projectedRisk.text, projectedRisk.tone === 'red' ? 'bad' : projectedRisk.tone === 'yellow' ? 'warn' : 'good'],
    ];
    if (mlPrediction) projectionRows.push([`ML forecast (${mlPrediction.risk})`, `${formatNumber(mlPrediction.predicted.network_load_percent, 0)}% · ${formatNumber(mlPrediction.predicted.latency_ms, 0)} ms`, 'warn']);
    const predictionCard = makeStateCard({
      title: 'IF NOTHING CHANGES', subtitle: `${focusName} under +${Math.round((scenario.multiplier - 1) * 100)}% traffic`, badge: 'SIMULATED', tone: 'red',
      rows: projectionRows,
      note: mlPrediction ? `ML forecast row is a separate Random Forest output (${mlPrediction.forecast_basis}).` : 'Projection only; no ML forecast exists for this node.',
    });
    await showCard(seq, predictionCard, cardAnchor, { hold: 2.6 });

    // --- ALTERNATIVE: a healthy peer if one exists, otherwise mitigation on the same node
    let alternative = chooseAlternative(source, destination, issue.kind);
    let baseline = alternative
      ? (alternativeBaseline(source, alternative.node) || alternativeBaseline(alternative.node, alternative.downstream || alternative.node))
      : null;
    let altProjection = null;
    let compareTitle = '';
    if (alternative && baseline) {
      // A failed or blocked node hands over all of its traffic; a distribution moves half of the extra
      // demand. Both assumptions are printed on the comparison card.
      const isReroute = scenario.multiplier === 1;
      const transfer = isReroute ? projection.rhoBefore : projection.offered * .5;
      altProjection = simulateAlternative(baseline, transfer);
      altProjection.isReroute = isReroute;
      altProjection.shiftNote = isReroute
        ? 'Assumes all traffic from the affected node moves to the alternative.'
        : 'Assumes half of the additional demand moves to the alternative.';
      compareTitle = `ALTERNATIVE via ${alternative.node}`;
    } else if (MITIGATION_KINDS.includes(issue.kind)) {
      // No peer of this type is available, so the option on the table is shedding demand, not rerouting.
      alternative = null;
      altProjection = projectUnderTraffic(observed, MITIGATION_FACTOR);
      altProjection.isReroute = false;
      altProjection.shiftNote = `Assumes ${Math.round((1 - MITIGATION_FACTOR) * 100)}% of low-priority demand is delayed or shed on the same node.`;
      baseline = { basis: `${focusName} own observed row` };
      compareTitle = 'AFTER MITIGATION';
    }

    if (!altProjection) {
      const threat = issue.kind === 'threat';
      whatIfPanel('RECOMMENDATION', threat ? 'Block the route' : 'No safe alternative available',
        threat
          ? 'Flagged traffic is not rerouted. The route stays blocked and the source is investigated; downstream systems lose this flow only.'
          : 'No peer of the same type has a usable observed baseline, and this issue cannot be mitigated on the node itself. No route is invented.',
        threat ? 'RULE-BASED · security policy' : 'OBSERVED · no viable peer', threat ? 'prediction' : 'observed');
      const mlThreat = findMlRecommendation(source, destination);
      await flowSay(seq, threat ? `Threat contained - ${mlThreat ? mlThreat.action : 'block the route and investigate the source'}` : 'No safe alternative available',
        cardAnchor, { tone: 'red', hold: 2.4, scale: 1.15 });
      outcome.applied = false;
      outcome.blocked = threat;
      return outcome;
    }

    const altRisk = riskLabel(altProjection.load, altProjection.latency);
    if (alternative) {
      whatIfPanel('ALTERNATIVE ROUTE', `Simulated path via ${alternative.node}`, `Alternative baseline: ${baseline.basis}. ${altProjection.shiftNote}`, 'SIMULATED · alternative projection', 'simulated');
      flowCamera([source, destination, alternative.node].filter((id) => nodeObjects.has(id)), { lift: 6, back: 1.05 });
      simulated = buildSimulatedRoute(source, alternative.node);
      if (alternative.downstream && nodeObjects.has(alternative.downstream)) buildSimulatedRoute(alternative.node, alternative.downstream);
      await flowSay(seq, `Simulated alternative: ${source} -> ${alternative.node}${alternative.downstream ? ` -> ${alternative.downstream}` : ''}`, flowNodeWorld(alternative.node, [0, (CITY_NODE[alternative.node]?.height || 8) + 6, 0]), { tone: 'purple', hold: 1.6 });
    } else {
      whatIfPanel('MITIGATION', `Simulated relief on ${focusName}`, altProjection.shiftNote, 'SIMULATED · same-node mitigation', 'simulated');
      await flowSay(seq, `Simulated: delay low-priority demand on ${focusName}`, cardAnchor, { tone: 'purple', hold: 1.6 });
    }

    // --- COMPARISON
    whatIfPanel('BEFORE / AFTER', alternative ? 'Current route vs simulated alternative' : 'Current load vs simulated mitigation', 'Both columns are simulated projections from observed baselines. Neither column is measured telemetry.', 'SIMULATED · comparison', 'simulated');
    const compareAnchor = alternative && nodeObjects.has(alternative.node)
      ? flowNodeWorld(alternative.node, [0, (CITY_NODE[alternative.node]?.height || 8) + 9, 0])
      : cardAnchor;
    const compare = makeCompareCard({
      title: 'SIMULATION COMPARISON',
      leftTitle: `IF NOTHING CHANGES`,
      rightTitle: compareTitle,
      rows: [
        ['Load', `${formatNumber(projection.load, 0)}%`, `${formatNumber(altProjection.load, 0)}%`, altProjection.load < projection.load ? 'good' : 'warn'],
        ['Latency', `${formatNumber(projection.latency, 0)} ms`, `${formatNumber(altProjection.latency, 0)} ms`, altProjection.latency < projection.latency ? 'good' : 'warn'],
        ['Queue', `${projection.queue}`, `${altProjection.queue}`, altProjection.queue < projection.queue ? 'good' : 'warn'],
        ['Risk', projectedRisk.text, altRisk.text, altRisk.tone === 'green' ? 'good' : altRisk.tone === 'yellow' ? 'warn' : 'bad'],
      ],
      note: `${altProjection.shiftNote} Baseline: ${baseline.basis}.`,
    });
    await showCard(seq, compare, compareAnchor, { hold: 3.0 });
    // An option only counts as an improvement if it is clearly better AND not itself near overload.
    outcome.improves = altProjection.isReroute
      ? altProjection.load < 92
      : altProjection.load < projection.load - 4 && altProjection.latency < projection.latency && altProjection.load < 90;

    // --- RECOMMENDATION
    const mlRecommendation = findMlRecommendation(alternative?.node, focus, destination);
    const actionText = alternative
      ? scenario.action(focusName, alternative.node)
      : `Delay low-priority traffic and scale ${focusName} capacity`;
    whatIfPanel('RECOMMENDATION', 'AI Recommendation', mlRecommendation ? `Matching stored recommendation: ${mlRecommendation.reason}` : 'Generated from the scenario rules and the simulated comparison.', mlRecommendation ? `RULE-BASED · ml_results recommendation (${mlRecommendation.severity})` : 'RULE-BASED · scenario rule', 'prediction');
    await flowSay(seq, `AI Recommendation - ${actionText}`, cardAnchor, { tone: 'green', hold: 2.2, scale: 1.15 });

    if (!outcome.improves || !allowApply) {
      whatIfPanel('RESULT', 'Simulated option does not resolve the issue', 'The simulated option is not clearly better, so the current route is kept and the issue is left for a human decision.', 'SIMULATED · comparison', 'simulated');
      await flowSay(seq, 'No option clearly improves the outcome - escalating for a human decision', cardAnchor, { tone: 'yellow', hold: 2.0 });
      outcome.applied = false;
      return outcome;
    }

    // --- APPLY OPTIMISATION
    whatIfPanel('APPLY OPTIMISATION', alternative ? `Shifting traffic via ${alternative.node}` : `Shedding low-priority demand on ${focusName}`, 'The simulated option is promoted to the active route for the rest of the story.', 'SIMULATED · applied in the story only', 'simulated');
    setSceneDim(false);
    systemFlow.routes.forEach((item) => { if (item !== entry) dimStoryEntry(item, 1); });
    queued.forEach(flowRemove); queued = [];

    if (!alternative) {
      // Mitigation: the same node recovers, no new route is drawn.
      if (isCloud) setCloudState(focus, 'processing', { rate: 4 });
      else setBuildingState(focus, 'processing', { tone: 'cyan' });
      if (entry) { recolorFlowEntry(entry, COLORS.green); setEntrySpeed(entry, 1); }
      await Promise.all([
        flowBurstRing(seq, flowNodeWorld(focus, [0, .2, 0]), COLORS.green, { from: 2, to: 9, seconds: 1, opacity: .45 }),
        flowSay(seq, `${focusName} back within safe limits (simulated)`, cardAnchor, { tone: 'green', hold: 1.6 }),
      ]);
      if (!isCloud) setBuildingState(focus, 'success');
      outcome.applied = true;
      outcome.mitigated = true;
      outcome.projection = projection;
      outcome.altProjection = altProjection;
      return outcome;
    }

    const altRecord = pickFlowRecord(source, alternative.node).record;
    const optimized = buildFlowRoute(source, alternative.node, altRecord, COLORS.green);
    if (optimized) systemFlow.mainRoutes.push(optimized);
    if (entry) {
      await seq.tween(1.0, (p) => {
        entry.objects.forEach((object) => {
          const material = object.material;
          if (!material || material.userData?.shared) return;
          if (material.uniforms?.uOpacity) material.uniforms.uOpacity.value = (material.userData.baseOpacity ?? material.uniforms.uOpacity.value) * (1 - p * .88);
          else if (material.transparent) material.opacity = (material.userData.baseOpacity ?? material.opacity) * (1 - p * .88);
        });
        entry.items.forEach((item) => { item.object.visible = p < .5; item.trails.forEach((trail) => { trail.visible = p < .5; }); });
      }, 'inOut');
    }
    if (isCloud) setCloudState(focus, 'processing', { rate: 4 });
    else setBuildingState(focus, 'idle');
    if (travelPacket && systemFlow.packet && optimized) {
      setBuildingState(alternative.node, 'receiving');
      await flowMoveTo(seq, systemFlow.packet, optimized.curve.getPoint(0), .5, { arc: .5 });
      await flowTravel(seq, systemFlow.packet, optimized.curve, { seconds: hopSeconds(altRecord), escorts: escortCount(altRecord), color: COLORS.green });
    }
    setBuildingState(alternative.node, 'success');
    await Promise.all([
      flowBurstRing(seq, flowNodeWorld(alternative.node, [0, .2, 0]), COLORS.green, { from: 2, to: 9, seconds: 1, opacity: .45 }),
      flowSay(seq, `Traffic rerouted via ${alternative.node} - route healthy`, flowNodeWorld(alternative.node, [0, (CITY_NODE[alternative.node]?.height || 8) + 5, 0]), { tone: 'green', hold: 1.6 }),
    ]);
    outcome.applied = true;
    outcome.node = alternative.node;
    outcome.downstream = alternative.downstream;
    outcome.projection = projection;
    outcome.altProjection = altProjection;
    return outcome;
  } finally {
    whatIf.active = false;
    setSceneDim(false);
    queued.forEach(flowRemove);
    clearWhatIfCards();
    whatIf.entries.slice().forEach(flowRemoveEntry);
    whatIf.entries = [];
    systemFlow.routes.forEach((item) => dimStoryEntry(item, 1));
    setFlowBasis('OBSERVED · dataset rows', 'observed');
  }
}

// Runs at most one branch inside the main flow so the demo stays one clear story.
async function maybeWhatIf(seq, options) {
  if (whatIf.mainBranchDone && !options.always) return null;
  const outcome = await runWhatIfBranch(seq, options);
  if (outcome) whatIf.mainBranchDone = true;
  return outcome;
}

function uniqueMaterial(material) {
  const copy = material.clone();
  copy.userData = { ...material.userData, shared: false };
  return copy;
}

function onResize() {
  const container = $('#scene-container');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  composer?.setSize(container.clientWidth, container.clientHeight);
}

const labelWorldPosition = new THREE.Vector3();
let frameCounter = 0;

function updateCityLabels() {
  const shortDistance = 170;
  cityLabels.forEach((sprite) => {
    sprite.getWorldPosition(labelWorldPosition);
    const distance = camera.position.distanceTo(labelWorldPosition);
    const lod = sprite.userData.labelLOD;
    const wanted = distance > shortDistance ? 'short' : 'full';
    if (lod.current === wanted) return;
    lod.current = wanted;
    sprite.material.map = lod[wanted];
    sprite.material.needsUpdate = true;
    const scale = wanted === 'short' ? lod.shortScale : lod.fullScale;
    sprite.scale.set(scale[0], scale[1], 1);
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.elapsedTime;
  frameCounter += 1;
  const isCity = state.visualMode === 'city';
  updateSystemFlow(delta, elapsed);
  updateCloudStates(elapsed, state.paused ? 0 : delta * state.flowSpeed);

  if (!state.paused) {
    animatedRouteMaterials.forEach((material) => { material.uniforms.uTime.value = elapsed * state.flowSpeed; });
    riverMaterials.forEach((material) => { material.uniforms.uTime.value = elapsed * state.flowSpeed; });
    splatMaterials.forEach((material) => { material.uniforms.uTime.value = elapsed * state.flowSpeed; });
    if (isCity) {
      particles.forEach((item) => {
        item.phase = (item.phase + delta * item.speed * state.flowSpeed) % 1;
        item.object.position.copy(item.curve.getPoint(item.phase));
        const scale = (1 + Math.sin(elapsed * 7 + item.phase * 18) * .12) * (1 + (item.boost || 0));
        if (item.boost) item.boost *= .93;
        item.object.scale.setScalar(scale);
        item.trails.forEach((trail, trailIndex) => {
          const trailPhase = (item.phase - .0065 * (trailIndex + 1) + 1) % 1;
          trail.position.copy(item.curve.getPoint(trailPhase));
        });
      });
      predictedParticles.forEach((item) => {
        item.phase = (item.phase + delta * item.speed * state.flowSpeed) % 1;
        item.object.position.copy(item.curve.getPoint(item.phase));
        item.trails.forEach((trail, trailIndex) => {
          trail.position.copy(item.curve.getPoint((item.phase - .011 * (trailIndex + 1) + 1) % 1));
        });
      });
      focusParticles.forEach((item) => {
        const next = item.phase + delta * item.speed * (item.speedScale || 1) * state.flowSpeed;
        if (item.once && next >= 1) { item.done = true; item.object.visible = false; item.trails.forEach((trail) => { trail.visible = false; }); return; }
        item.phase = next % 1;
        item.object.position.copy(item.curve.getPoint(item.phase));
        item.trails.forEach((trail, trailIndex) => { trail.position.copy(item.curve.getPoint((item.phase - .0065 * (trailIndex + 1) + 1) % 1)); });
      });
      storyParticles.forEach((item) => {
        item.phase = (item.phase + delta * item.speed * (item.speedScale || 1) * state.flowSpeed) % 1;
        item.object.position.copy(item.curve.getPoint(item.phase));
        item.object.scale.setScalar(1 + Math.sin(elapsed * 7 + item.phase * 18) * .12);
        item.trails.forEach((trail, trailIndex) => {
          trail.position.copy(item.curve.getPoint((item.phase - .0065 * (trailIndex + 1) + 1) % 1));
        });
      });
      flowParticles.forEach((item) => {
        item.phase = (item.phase + delta * item.speed * (item.speedScale || 1) * state.flowSpeed) % 1;
        item.object.position.copy(item.curve.getPoint(item.phase));
        item.object.scale.setScalar(1 + Math.sin(elapsed * 7 + item.phase * 18) * .12);
        item.trails.forEach((trail, trailIndex) => {
          trail.position.copy(item.curve.getPoint((item.phase - .0065 * (trailIndex + 1) + 1) % 1));
        });
      });
    }
    riverParticles.forEach((item) => {
      item.phase = (item.phase + delta * item.speed * state.flowSpeed) % 1;
      item.object.position.copy(item.curve.getPoint(item.phase));
      const shimmer = 1 + Math.sin(elapsed * 8 + item.phase * 22) * .18;
      item.object.scale.setScalar(shimmer);
    });
    riverPredictedParticles.forEach((item) => {
      item.phase = (item.phase + delta * item.speed * state.flowSpeed) % 1;
      item.object.position.copy(item.curve.getPoint(item.phase));
    });
  }

  if (isCity) {
    pulsingNodes.forEach((ring) => {
      const pulse = .94 + (Math.sin(elapsed * 2.5 + ring.userData.phase) + 1) * .12;
      ring.scale.setScalar(pulse * (ring.userData.baseScale || 1));
      ring.material.opacity = .06 + (Math.sin(elapsed * 2.5 + ring.userData.phase) + 1) * .09;
    });
    anomalyMarkers.forEach((marker) => {
      marker.material.opacity = .5 + (Math.sin(elapsed * 3.1 + marker.userData.phase) + 1) * .25;
      marker.position.y += Math.sin(elapsed * 1.6 + marker.userData.phase) * .0015;
    });
    cityStatusLights.forEach((light) => {
      const base = light.userData.baseIntensity;
      light.intensity = light.userData.pulse ? base * (.7 + (Math.sin(elapsed * 2.6 + light.userData.phase) + 1) * .3) : base;
    });
    cityBlinkers.forEach((led) => { led.visible = Math.sin(elapsed * led.userData.rate + led.userData.phase) > -.25; });
    situationStory.pulses.forEach((ring) => {
      const wave = (Math.sin(elapsed * 2.5 + ring.userData.phase) + 1) / 2;
      ring.scale.setScalar(ring.userData.baseScale * (.94 + wave * .24));
      ring.material.opacity = ring.userData.baseOpacity * (.55 + wave * .45);
    });
    situationStory.markers.forEach((marker) => { marker.material.opacity = .55 + (Math.sin(elapsed * 3.1) + 1) * .22; });
    routeFocus.rings.forEach((ring) => {
      if (ring.userData.once) {
        const age = elapsed - ring.userData.once.start;
        ring.scale.setScalar(ring.userData.baseScale * (1 + age * 1.6));
        ring.material.opacity = ring.userData.baseOpacity * Math.max(0, 1 - age / 1.4);
        if (age > 1.4) { ring.removeFromParent(); ring.material.dispose(); routeFocus.rings = routeFocus.rings.filter((other) => other !== ring); }
        return;
      }
      const wave = (Math.sin(elapsed * 2.6 + ring.userData.phase) + 1) / 2;
      ring.scale.setScalar(ring.userData.baseScale * (.95 + wave * .2));
      ring.material.opacity = ring.userData.baseOpacity * (.5 + wave * .5);
    });
    cityAnimated.forEach((object) => {
      const anim = object.userData.anim;
      if (anim.spinY) object.rotation.y += delta * anim.spinY;
      if (anim.spinX) object.rotation.x += delta * anim.spinX;
      if (anim.spinZ) object.rotation.z += delta * anim.spinZ;
      if (anim.bob) object.position.y = anim.bob.base + Math.sin(elapsed * anim.bob.speed + anim.bob.phase) * anim.bob.amp;
      if (anim.emissive && object.material) object.material.emissiveIntensity = anim.emissive.base * (.5 + .5 * (Math.sin(elapsed * anim.emissive.speed + anim.emissive.phase) + 1) / 2);
      if (anim.pulse) {
        const cycle = (elapsed * anim.pulse.speed + anim.pulse.phase) % 1;
        object.scale.setScalar(1 + cycle * anim.pulse.grow);
        object.material.opacity = anim.pulse.opacity * (1 - cycle);
      }
    });
    if (frameCounter % 12 === 0) updateCityLabels();
  } else {
    scanBands.forEach((scan) => {
      scan.object.position.y += delta * scan.speed;
      if (scan.object.position.y > scan.maxY) scan.object.position.y = scan.minY;
      const progress = (scan.object.position.y - scan.minY) / (scan.maxY - scan.minY);
      scan.object.material.opacity = .035 + Math.sin(progress * Math.PI) * .14;
      scan.object.scale.setScalar(.88 + progress * .3);
    });
    orbitalObjects.forEach((object) => {
      if (object.userData.groundRing) return;
      const speed = object.userData.rotationSpeed || .08;
      object.rotation.y += delta * speed;
      if (object.geometry?.type === 'TorusGeometry') object.rotation.z += delta * speed * .42;
    });
    lightBeams.forEach((beam) => {
      beam.material.opacity = beam.userData.baseOpacity * (.68 + Math.sin(elapsed * 2.1 + beam.userData.phase) * .24);
    });
    groundScanners.forEach((scanner) => {
      const cycle = (elapsed * .12 + scanner.userData.phase) % 1;
      scanner.scale.setScalar(1 + cycle * 7);
      scanner.material.opacity = .06 * (1 - cycle);
    });
    pulsingShells.forEach((shell) => {
      shell.material.emissiveIntensity = shell.base * (1 + Math.sin(elapsed * 1.6 + shell.phase) * .55);
    });
    accentLights.forEach((light) => {
      light.intensity = (light.userData.baseIntensity || light.intensity) * (1 + Math.sin(elapsed * 2.2 + light.userData.flickerPhase) * .11 + Math.sin(elapsed * 5.7 + light.userData.flickerPhase * 2) * .05);
    });
    splatStaticLayer.children.forEach((child) => {
      if (child.userData.slowSpin) child.rotation.y += delta * child.userData.slowSpin;
    });
    floatingObjects.forEach((object) => {
      const float = object.userData.float;
      if (float) object.position.y = float.base + Math.sin(elapsed * float.speed + float.phase) * float.amp;
      const flicker = object.userData.flicker;
      if (flicker && object.material) object.material.opacity = flicker.base * (1 + Math.sin(elapsed * flicker.speed + flicker.phase) * flicker.amp);
    });
  }

  if (systemFlow.active && systemFlow.follow && systemFlow.cameraBase) {
    camera.position.lerp(systemFlow.cameraBase.position, Math.min(1, delta * 2.4));
    flowFollowTarget.copy(systemFlow.follow); flowFollowTarget.y += 1.5;
    controls.target.lerp(flowFollowTarget, Math.min(1, delta * 4));
    cameraGoal = null;
  } else if (routeFocus.follow) {
    updateParticleFollow(delta);
  } else if (state.cine && cinePath) {
    state.cineT = (state.cineT + delta * .011 * Math.max(state.flowSpeed, .5)) % 1;
    const path = isCity && cityCinePath ? cityCinePath : cinePath;
    const focus = isCity ? new THREE.Vector3(2 + Math.sin(elapsed * .27) * 6, 6 + Math.sin(elapsed * .19) * 2, -14 + Math.cos(elapsed * .23) * 6) : new THREE.Vector3(Math.sin(elapsed * .27) * 3.2, 4 + Math.sin(elapsed * .19) * 1.6, Math.cos(elapsed * .23) * 3.2);
    camera.position.lerp(path.getPoint(state.cineT), .045);
    controls.target.lerp(focus, .04);
  } else if (cameraGoal) {
    camera.position.lerp(cameraGoal.position, .055);
    controls.target.lerp(cameraGoal.target, .065);
    if (camera.position.distanceTo(cameraGoal.position) < .08) cameraGoal = null;
  }
  controls.update();
  if (routeFocus.active) updateRouteFocusPositions();
  if (composer) composer.render(delta);
  else renderer.render(scene, camera);
}

function startSimulationClock() {
  let time = new Date(state.data.at(-1)?.timestamp || Date.now());
  setInterval(() => {
    if (!state.paused) time = new Date(time.getTime() + 1000 * state.flowSpeed);
    $('#sim-clock').textContent = `${time.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
  }, 1000);
}

async function main() {
  await loadData();
  $('#loading-label').textContent = 'Building holographic digital twin…';
  aggregateData();
  state.situation = selectSituation();
  populateFilters();
  populateDashboard();
  initThree();
  bindUi();
  restoreLayoutState();
  startSimulationClock();
  initSituationStory();
  bindSituationControls();
  $('#selection-panel').classList.remove('open');
  setTimeout(() => $('#loading-screen').classList.add('complete'), 450);
  setTimeout(() => startSystemFlow(), 1100);
}

main().catch((error) => {
  console.error(error);
  $('#loading-label').textContent = `Unable to initialize: ${error.message}`;
});
