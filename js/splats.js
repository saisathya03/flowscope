// Gaussian splatting engine for FlowScope AI.
// Renders tens of thousands of anisotropic gaussian splats in a single draw call
// per cloud, using instanced billboards with a gaussian falloff and additive
// blending (order-independent, so no per-frame depth sorting is required).
import * as THREE from 'three';

const seededRandom = (seed) => {
  let value = Math.abs(Math.sin(seed * 12.9898 + 78.233) * 43758.5453) % 1;
  return () => {
    value = (value * 9301 + 49297) % 233280 / 233280;
    return value;
  };
};

export function makeSplatMaterial({ intensity = 1 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: intensity },
      uFade: { value: 1 },
    },
    vertexShader: `
      attribute vec3 aPosition;
      attribute vec3 aColor;
      attribute vec2 aScale;
      attribute vec3 aAxis;
      attribute float aOpacity;
      attribute float aPhase;
      uniform float uTime;
      varying vec3 vColor;
      varying float vOpacity;
      varying vec2 vPoint;
      void main() {
        vPoint = position.xy * 2.0;
        vec4 view = modelViewMatrix * vec4(aPosition, 1.0);
        float breathe = 0.88 + 0.24 * sin(uTime * 1.7 + aPhase * 6.28318);
        vec2 major = vec2(1.0, 0.0);
        if (dot(aAxis, aAxis) > 0.0001) {
          vec3 viewAxis = (modelViewMatrix * vec4(aAxis, 0.0)).xyz;
          if (dot(viewAxis.xy, viewAxis.xy) > 0.0001) major = normalize(viewAxis.xy);
        }
        vec2 minor = vec2(-major.y, major.x);
        view.xy += (position.x * major * aScale.x + position.y * minor * aScale.y) * breathe;
        gl_Position = projectionMatrix * view;
        vColor = aColor;
        vOpacity = aOpacity * (0.72 + 0.28 * sin(uTime * 2.3 + aPhase * 12.56636));
      }
    `,
    fragmentShader: `
      uniform float uIntensity;
      uniform float uFade;
      varying vec3 vColor;
      varying float vOpacity;
      varying vec2 vPoint;
      void main() {
        float r2 = dot(vPoint, vPoint);
        float gauss = exp(-3.1 * r2);
        if (gauss < 0.012) discard;
        vec3 color = vColor * (0.5 + 0.5 * gauss) + vec3(1.0) * pow(gauss, 7.0) * 0.42;
        gl_FragColor = vec4(color * uIntensity, gauss * vOpacity * uFade);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}

// splats: array of { p:[x,y,z], c:hex|THREE.Color, s:[major,minor], axis:[x,y,z]|null, o:opacity, phase }
export function createSplatCloud(splats, options = {}) {
  const count = splats.length;
  const geometry = new THREE.InstancedBufferGeometry();
  const quad = new THREE.PlaneGeometry(1, 1);
  geometry.index = quad.index;
  geometry.setAttribute('position', quad.getAttribute('position'));
  geometry.instanceCount = count;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const scales = new Float32Array(count * 2);
  const axes = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const phases = new Float32Array(count);
  const scratch = new THREE.Color();

  splats.forEach((splat, index) => {
    positions.set(splat.p, index * 3);
    scratch.set(splat.c);
    colors[index * 3] = scratch.r; colors[index * 3 + 1] = scratch.g; colors[index * 3 + 2] = scratch.b;
    scales[index * 2] = splat.s[0]; scales[index * 2 + 1] = splat.s[1];
    if (splat.axis) axes.set(splat.axis, index * 3);
    opacities[index] = splat.o ?? .5;
    phases[index] = splat.phase ?? Math.random();
  });

  geometry.setAttribute('aPosition', new THREE.InstancedBufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute('aScale', new THREE.InstancedBufferAttribute(scales, 2));
  geometry.setAttribute('aAxis', new THREE.InstancedBufferAttribute(axes, 3));
  geometry.setAttribute('aOpacity', new THREE.InstancedBufferAttribute(opacities, 1));
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 6, 0), 80);

  const material = makeSplatMaterial(options);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  return mesh;
}

const mixToward = (base, target, amount) => new THREE.Color(base).lerp(new THREE.Color(target), amount);

// ---- Procedural splat asset generators -------------------------------------

export function boxSplats(splats, seed, { center, size, color, count, opacity = .34, splat = .3, shellBias = .82 }) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i += 1) {
    let x = random() - .5, y = random() - .5, z = random() - .5;
    if (random() < shellBias) {
      const face = Math.floor(random() * 3);
      if (face === 0) x = x > 0 ? .5 : -.5;
      else if (face === 1) y = y > 0 ? .5 : -.5;
      else z = z > 0 ? .5 : -.5;
    }
    const edge = Math.max(Math.abs(x), Math.abs(y), Math.abs(z)) > .46;
    const c = edge && random() < .4 ? mixToward(color, 0xffffff, .45) : mixToward(color, 0x06121f, random() * .35);
    const s = splat * (.55 + random() * .9);
    splats.push({ p: [center[0] + x * size[0], center[1] + y * size[1], center[2] + z * size[2]], c, s: [s, s], axis: null, o: opacity * (.6 + random() * .8), phase: random() });
  }
}

export function cylinderSplats(splats, seed, { center, radius, height, color, count, opacity = .36, splat = .27, rings = 0 }) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const r = radius * (rings ? 1 : Math.sqrt(.55 + random() * .45));
    const y = (random() - .5) * height;
    const banded = rings && Math.abs(((y / height + .5) * rings) % 1 - .5) < .16;
    const c = banded ? mixToward(color, 0xffffff, .5) : mixToward(color, 0x071527, random() * .4);
    const s = splat * (.6 + random() * .8);
    splats.push({ p: [center[0] + Math.cos(angle) * r, center[1] + y, center[2] + Math.sin(angle) * r], c, s: [s, s], axis: null, o: opacity * (banded ? 1.5 : .55 + random() * .7), phase: random() });
  }
}

export function sphereSplats(splats, seed, { center, radius, color, count, opacity = .34, splat = .3, shell = .78, squash = [1, 1, 1] }) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i += 1) {
    const u = random() * 2 - 1;
    const theta = random() * Math.PI * 2;
    const rr = radius * (shell + random() * (1 - shell));
    const sq = Math.sqrt(1 - u * u);
    const c = random() < .18 ? mixToward(color, 0xffffff, .5) : mixToward(color, 0x081527, random() * .35);
    const s = splat * (.55 + random() * .95);
    splats.push({
      p: [center[0] + sq * Math.cos(theta) * rr * squash[0], center[1] + u * rr * squash[1], center[2] + sq * Math.sin(theta) * rr * squash[2]],
      c, s: [s, s], axis: null, o: opacity * (.55 + random() * .8), phase: random(),
    });
  }
}

export function torusSplats(splats, seed, { center, radius, tube, color, count, opacity = .42, splat = .22, tilt = [0, 0, 0] }) {
  const random = seededRandom(seed);
  const euler = new THREE.Euler(tilt[0], tilt[1], tilt[2]);
  const point = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  for (let i = 0; i < count; i += 1) {
    const main = random() * Math.PI * 2;
    const minor = random() * Math.PI * 2;
    const r = radius + Math.cos(minor) * tube * random();
    point.set(Math.cos(main) * r, Math.sin(minor) * tube * random(), Math.sin(main) * r).applyEuler(euler);
    tangent.set(-Math.sin(main), 0, Math.cos(main)).applyEuler(euler);
    const c = random() < .25 ? mixToward(color, 0xffffff, .4) : new THREE.Color(color);
    splats.push({
      p: [center[0] + point.x, center[1] + point.y, center[2] + point.z],
      c, s: [splat * 2.1, splat * .85], axis: [tangent.x, tangent.y, tangent.z], o: opacity * (.6 + random() * .7), phase: random(),
    });
  }
}

export function diskSplats(splats, seed, { center, inner, outer, color, count, opacity = .3, splat = .3 }) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i += 1) {
    const angle = random() * Math.PI * 2;
    const r = inner + Math.sqrt(random()) * (outer - inner);
    const c = mixToward(color, 0x0a1c30, random() * .5);
    splats.push({
      p: [center[0] + Math.cos(angle) * r, center[1] + (random() - .5) * .12, center[2] + Math.sin(angle) * r],
      c, s: [splat * 1.7, splat * .55], axis: [-Math.sin(angle), 0, Math.cos(angle)], o: opacity * (.4 + random() * .8), phase: random(),
    });
  }
}

// Stretched splats along a THREE curve — the fiber-optic data stream treatment.
export function curveSplats(splats, seed, curve, { color, count, opacity = .4, splat = .16, jitter = .1, headColor = 0xffffff }) {
  const random = seededRandom(seed);
  for (let i = 0; i < count; i += 1) {
    const t = i / count;
    const point = curve.getPoint(t);
    const tangent = curve.getTangent(t);
    const bright = random() < .1;
    const c = bright ? mixToward(color, headColor, .55) : mixToward(color, 0x04101f, random() * .4);
    splats.push({
      p: [point.x + (random() - .5) * jitter, point.y + (random() - .5) * jitter, point.z + (random() - .5) * jitter],
      c,
      s: [splat * (2.6 + random() * 1.8), splat * (.55 + random() * .5)],
      axis: [tangent.x, tangent.y, tangent.z],
      o: opacity * (bright ? 1.6 : .5 + random() * .7),
      phase: (t + random() * .08) % 1,
    });
  }
}

// ---- Node "assets": volumetric splat models per infrastructure type --------

export function nodeSplats(config, quality = 1) {
  const splats = [];
  const [x, , z] = config.position;
  const seed = Math.abs(x * 13.7 + z * 7.3) + 5;
  const color = config.color;
  const q = (n) => Math.max(24, Math.round(n * quality));

  diskSplats(splats, seed + 1, { center: [x, .12, z], inner: 1.2, outer: 2.6, color, count: q(140), opacity: .3, splat: .34 });

  switch (config.type) {
    case 'Server':
      boxSplats(splats, seed + 2, { center: [x, 2.4, z], size: [2.3, 4.1, 2.05], color, count: q(620), opacity: .3, splat: .26 });
      cylinderSplats(splats, seed + 3, { center: [x, 2.4, z + 1.06], radius: .9, height: 3.9, color: 0x9be9ff, count: q(150), opacity: .5, splat: .12, rings: 6 });
      sphereSplats(splats, seed + 4, { center: [x, 5.4, z], radius: .34, color: 0xffffff, count: q(50), opacity: .8, splat: .16, shell: .2 });
      break;
    case 'Database':
      cylinderSplats(splats, seed + 2, { center: [x, 2.1, z], radius: 1.42, height: 3.5, color, count: q(640), opacity: .32, splat: .26, rings: 5 });
      torusSplats(splats, seed + 3, { center: [x, 4.25, z], radius: .78, tube: .1, color, count: q(110), opacity: .55, splat: .15 });
      break;
    case 'API':
      cylinderSplats(splats, seed + 2, { center: [x, 1.8, z], radius: .62, height: 3, color, count: q(180), opacity: .34, splat: .22 });
      torusSplats(splats, seed + 3, { center: [x, 3.3, z], radius: 1.45, tube: .24, color, count: q(340), opacity: .5, splat: .2 });
      sphereSplats(splats, seed + 4, { center: [x, 3.3, z], radius: .4, color: 0xffffff, count: q(70), opacity: .85, splat: .18, shell: .2 });
      break;
    case 'Cloud':
      [[0, 2.25, 0, 1.3], [-1, 2, .1, .92], [1, 2.05, .1, .95], [-.4, 2.75, 0, .85], [.6, 2.65, 0, .95]].forEach(([dx, dy, dz, r], i) => {
        sphereSplats(splats, seed + 5 + i, { center: [x + dx, dy, z + dz], radius: r, color, count: q(170), opacity: .26, splat: .34, shell: .5 });
      });
      break;
    case 'AI':
      sphereSplats(splats, seed + 2, { center: [x, 2.35, z], radius: 1.62, color, count: q(560), opacity: .34, splat: .26, shell: .68 });
      sphereSplats(splats, seed + 3, { center: [x, 2.35, z], radius: .55, color: 0xe8d4ff, count: q(130), opacity: .8, splat: .22, shell: .1 });
      torusSplats(splats, seed + 4, { center: [x, 2.35, z], radius: 2.2, tube: .07, color, count: q(190), opacity: .5, splat: .16, tilt: [Math.PI * .24, 0, Math.PI * .12] });
      torusSplats(splats, seed + 5, { center: [x, 2.35, z], radius: 2.45, tube: .07, color: 0x39e7ff, count: q(150), opacity: .38, splat: .14, tilt: [Math.PI * .52, 0, -Math.PI * .2] });
      break;
    case 'IoT':
      cylinderSplats(splats, seed + 2, { center: [x, 1.9, z], radius: .58, height: 3.3, color, count: q(220), opacity: .34, splat: .2 });
      [0, 1, 2].forEach((i) => torusSplats(splats, seed + 3 + i, { center: [x, 2.3 + i * .75, z], radius: .8 + i * .35, tube: .05, color, count: q(90), opacity: .42 - i * .08, splat: .13 }));
      break;
    case 'Security':
      sphereSplats(splats, seed + 2, { center: [x, 2.1, z], radius: 1.6, color, count: q(520), opacity: .32, splat: .24, shell: .8, squash: [1, 1.3, .6] });
      sphereSplats(splats, seed + 3, { center: [x, 2.1, z], radius: .4, color: 0xffe1e4, count: q(80), opacity: .8, splat: .2, shell: .1 });
      break;
    default:
      boxSplats(splats, seed + 2, { center: [x, 1.5, z], size: [2.7, 2.3, 2.3], color, count: q(430), opacity: .28, splat: .27 });
      boxSplats(splats, seed + 3, { center: [x, 3.15, z], size: [1.9, .8, 1.9], color: mixToward(color, 0xffffff, .2), count: q(110), opacity: .3, splat: .22, shellBias: .95 });
  }
  return splats;
}

// ---- Environment: nebula sky + drifting ground fog -------------------------

export function environmentSplats(quality = 1) {
  const splats = [];
  const random = seededRandom(97);
  const q = (n) => Math.round(n * quality);
  for (let i = 0; i < q(900); i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 24 + random() * 26;
    const hue = random();
    const color = hue < .45 ? 0x0d3f6e : hue < .8 ? 0x123a75 : 0x3c2a6e;
    splats.push({
      p: [Math.cos(angle) * radius, 6 + random() * 26, Math.sin(angle) * radius],
      c: color, s: [2.6 + random() * 4.4, 1.9 + random() * 3.2], axis: null,
      o: .028 + random() * .05, phase: random(),
    });
  }
  for (let i = 0; i < q(420); i += 1) {
    splats.push({
      p: [(random() - .5) * 52, .1 + random() * .8, (random() - .5) * 44],
      c: random() < .8 ? 0x0a2c4a : 0x22406e, s: [1.7 + random() * 2.4, .5 + random() * .6],
      axis: [1, 0, (random() - .5) * .6], o: .05 + random() * .07, phase: random(),
    });
  }
  for (let i = 0; i < q(500); i += 1) {
    const angle = random() * Math.PI * 2;
    const radius = 2 + Math.sqrt(random()) * 30;
    splats.push({
      p: [Math.cos(angle) * radius, .4 + random() * 16, Math.sin(angle) * radius],
      c: random() < .7 ? 0x67d8ff : 0xb590ff, s: [.09 + random() * .12, .09 + random() * .12],
      axis: null, o: .3 + random() * .5, phase: random(),
    });
  }
  return splats;
}
