/* Interactive Alfvénon viewer: volume-rendered theta = arccos(Bx/|B|) with flowing field lines.
   Two scenes: the 128^3 Alfvénon (Huang et al. 2026a) and the native-f64 large-small collision (26 keyframes,
   blended in the shader for smooth playback). Data: /data/alfvenon/*.json + *.bin.gz (_src/make_alfvenon_volumes.py).
   Markup: <div class="av" data-base="/data/alfvenon/"></div>. Needs WebGL2 and an import map for "three". */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const box = document.querySelector('.av');
if (box) start(box);

async function bytes(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b && 'DecompressionStream' in window) {
    const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  return buf;
}

function cmapTexture() {
  const stops = [[0, [8, 6, 30]], [0.12, [52, 16, 102]], [0.3, [138, 30, 140]], [0.48, [214, 64, 105]],
    [0.66, [250, 125, 50]], [0.84, [253, 205, 80]], [1, [255, 252, 225]]];
  const n = 256, d = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    let k = 0; while (k < stops.length - 2 && x > stops[k + 1][0]) k++;
    const [x0, c0] = stops[k], [x1, c1] = stops[k + 1], f = (x - x0) / (x1 - x0);
    for (let c = 0; c < 3; c++) d[i * 4 + c] = Math.round(c0[c] + (c1[c] - c0[c]) * f);
    d[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(d, n, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

const VOL_VERT = /* glsl */`
out vec3 vPos;
void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const VOL_FRAG = /* glsl */`
precision highp float; precision highp sampler3D;
in vec3 vPos; out vec4 fragColor;
uniform sampler3D uA; uniform sampler3D uB; uniform sampler2D uCmap;
uniform float uMix, uThr, uGain, uVis, uBands, uNB, uTime;
uniform vec3 uCam, uScale;
uniform float uSteps;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 ro = uCam, rd = normalize(vPos - ro);
  vec3 inv = 1.0 / rd, t0 = (-0.5 - ro) * inv, t1 = (0.5 - ro) * inv;
  vec3 tn3 = min(t0, t1), tf3 = max(t0, t1);
  float tn = max(max(max(tn3.x, tn3.y), tn3.z), 0.0), tf = min(min(tf3.x, tf3.y), tf3.z);
  if (tf <= tn) discard;
  float len = length(rd * uScale);              // world length per unit of object-space ray
  float dt = 1.0 / uSteps;
  float t = tn + dt * hash(gl_FragCoord.xy);
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 400; i++) {
    if (t > tf || acc.a > 0.975) break;
    vec3 uvw = ro + rd * t + 0.5;
    float th = mix(texture(uA, uvw).r, texture(uB, uvw).r, uMix);   // 0..1 = 0..180 deg
    float x = clamp(th * 180.0 / uVis, 0.0, 1.25);
    if (x > uThr) {
      float a = smoothstep(uThr, uThr + 0.06, x) * (0.3 + 1.6 * x * x) * uGain * dt * len * 16.0;
      if (uBands > 0.5) a *= 0.12 + 1.6 * pow(0.5 + 0.5 * cos(6.2831853 * x * uNB), 10.0);
      vec3 c = texture(uCmap, vec2(min(x, 1.0), 0.5)).rgb;
      c += vec3(1.0, 0.95, 0.85) * max(x - 1.0, 0.0) * 2.0;        // white-hot beyond the colour scale
      a = clamp(a, 0.0, 1.0);
      acc.rgb += (1.0 - acc.a) * c * a * 1.7;
      acc.a += (1.0 - acc.a) * a;
    }
    t += dt;
  }
  fragColor = acc;
}`;

const LINE_VERT = /* glsl */`
in vec3 position2; in float s; in float lid;
uniform float uMix; out float vS; out float vId;
void main() { vS = s; vId = lid; vec3 p = mix(position, position2, uMix);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`;

const LINE_FRAG = /* glsl */`
precision highp float; in float vS; in float vId; out vec4 fragColor;
uniform float uTime, uOpacity, uLen;
void main() {
  float ph = fract(vS * 2.5 / uLen - uTime * 0.16 / uLen + vId * 0.137);
  float pulse = smoothstep(0.0, 0.05, ph) * (1.0 - smoothstep(0.05, 0.45, ph));
  float edge = smoothstep(0.0, 0.06, vS) * (1.0 - smoothstep(0.94, 1.0, vS));
  vec3 base = mix(vec3(0.45, 0.78, 1.0), vec3(1.0, 0.85, 0.45), step(0.5, fract(vId * 0.5)));
  float a = (0.38 / uLen + 0.9 * pulse) * edge * uOpacity;
  fragColor = vec4(base * (0.6 + 1.4 * pulse) * a, a);
}`;

async function start(root) {
  const base = root.dataset.base || '/data/alfvenon/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: true });
  if (!gl) { root.classList.add('av-nogl'); return; }
  root.querySelector('.av-stage').appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.setClearColor(0x05070d, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08; controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.55;
  controls.minDistance = 0.25; controls.maxDistance = 8;

  // star field
  const sg = new THREE.BufferGeometry(), sp = new Float32Array(1500 * 3);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 1500; i++) { const r = 12 + rnd() * 10, u = rnd() * 2 - 1, ph = rnd() * 6.283;
    sp.set([r * Math.sqrt(1 - u * u) * Math.cos(ph), r * Math.sqrt(1 - u * u) * Math.sin(ph), r * u], i * 3); }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x9fb8ff, size: 0.035, transparent: true, opacity: 0.55 })));

  const cmap = cmapTexture();
  const ui = bindUI(root);
  const state = { mode: null, playing: !reduce, t: 0, speed: 1, lines: true, bands: false, frame: 0 };
  let current = null;
  const cache = {};

  async function load(name) {
    if (cache[name]) return cache[name];
    ui.loading(true);
    const meta = await (await fetch(base + name + '.json')).json();
    const [vol, lin] = await Promise.all([bytes(base + name + '-theta.bin.gz'), bytes(base + name + '-lines.bin.gz')]);
    ui.loading(false);
    return (cache[name] = { meta, vol, lin: new Uint16Array(lin.buffer, lin.byteOffset, lin.byteLength / 2) });
  }

  function build(name, d) {
    if (current) { scene.remove(current.group); current.dispose(); }
    const m = d.meta, [nx, ny, nz] = m.dims, nf = m.frames || 1, fsize = nx * ny * nz;
    const L = m.box, cr = m.crop;
    const size = [cr[0][1] - cr[0][0], cr[1][1] - cr[1][0], cr[2][1] - cr[2][0]];
    const ctr = [(cr[0][0] + cr[0][1]) / 2, (cr[1][0] + cr[1][1]) / 2, (cr[2][0] + cr[2][1]) / 2];
    const origin = [L[0] / 2, m.center[1], m.center[2]];
    const group = new THREE.Group();

    const mkTex = (k) => { const t = new THREE.Data3DTexture(d.vol.slice(k * fsize, (k + 1) * fsize), nx, ny, nz);
      t.format = THREE.RedFormat; t.type = THREE.UnsignedByteType; t.minFilter = t.magFilter = THREE.LinearFilter;
      t.unpackAlignment = 1; t.needsUpdate = true; return t; };
    const texA = mkTex(0), texB = mkTex(nf > 1 ? 1 : 0);
    const vis = name === 'single' ? 45 : 90;
    const mat = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VOL_VERT, fragmentShader: VOL_FRAG, side: THREE.BackSide,
      transparent: true, depthWrite: false, premultipliedAlpha: true, blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uA: { value: texA }, uB: { value: texB }, uCmap: { value: cmap }, uMix: { value: 0 },
        uThr: { value: (name === 'single' ? 3 : 5) / vis }, uGain: { value: name === 'single' ? 1.0 : 1.5 },
        uVis: { value: vis }, uBands: { value: 0 }, uNB: { value: name === 'single' ? 9 : 8 }, uTime: { value: 0 },
        uCam: { value: new THREE.Vector3() }, uScale: { value: new THREE.Vector3(...size) },
        uSteps: { value: name === 'single' ? 220 : 260 } }
    });
    const vol = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    vol.scale.set(...size); vol.position.set(ctr[0] - origin[0], ctr[1] - origin[1], ctr[2] - origin[2]);
    group.add(vol);

    // domain outline
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L[0], L[1], L[2])),
      new THREE.LineBasicMaterial({ color: 0x3b5a86, transparent: true, opacity: 0.32 }));
    edges.position.set(L[0] / 2 - origin[0], L[1] / 2 - origin[1], L[2] / 2 - origin[2]);
    group.add(edges);

    // field lines
    const nl = m.lines, np = m.npts, per = nl * np * 3;
    const toPos = (k) => { const q = d.lin.subarray(k * per, (k + 1) * per), out = new Float32Array(per);
      for (let i = 0; i < per; i++) out[i] = q[i] / 65535 * L[i % 3] - origin[i % 3]; return out; };
    const frames = []; for (let k = 0; k < nf; k++) frames.push(toPos(k));
    const geo = new THREE.BufferGeometry();
    const sArr = new Float32Array(nl * np), idArr = new Float32Array(nl * np), idx = [];
    for (let l = 0; l < nl; l++) for (let i = 0; i < np; i++) {
      sArr[l * np + i] = i / (np - 1); idArr[l * np + i] = l;
      if (i < np - 1) idx.push(l * np + i, l * np + i + 1);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(frames[0].slice(), 3));
    geo.setAttribute('position2', new THREE.BufferAttribute(frames[Math.min(1, nf - 1)].slice(), 3));
    geo.setAttribute('s', new THREE.BufferAttribute(sArr, 1));
    geo.setAttribute('lid', new THREE.BufferAttribute(idArr, 1));
    geo.setIndex(idx);
    const lmat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uMix: { value: 0 }, uTime: { value: 0 }, uOpacity: { value: 1 }, uLen: { value: L[0] } } });
    const lines = new THREE.LineSegments(geo, lmat);
    lines.frustumCulled = false;
    group.add(lines);
    scene.add(group);

    const dist = name === 'single' ? 1.45 : 2.45;
    camera.position.set(dist * 0.62, -dist * 0.72, dist * 0.42);
    controls.target.set(0, 0, 0); controls.update();

    let fa = -1, fb = -1;
    function setTime(t) {   // t in [0, 1] of the run
      if (nf < 2) return;
      const f = t * (nf - 1), k = Math.min(nf - 2, Math.floor(f)), mix = f - k;
      if (k !== fa) {
        texA.image.data = d.vol.subarray(k * fsize, (k + 1) * fsize); texA.needsUpdate = true;
        texB.image.data = d.vol.subarray((k + 1) * fsize, (k + 2) * fsize); texB.needsUpdate = true;
        geo.attributes.position.array.set(frames[k]); geo.attributes.position.needsUpdate = true;
        geo.attributes.position2.array.set(frames[k + 1]); geo.attributes.position2.needsUpdate = true;
        fa = k; fb = k + 1;
      }
      mat.uniforms.uMix.value = mix; lmat.uniforms.uMix.value = mix;
    }
    return {
      group, name, meta: m, mat, lmat, vol, setTime, nf, vis,
      dispose() { texA.dispose(); texB.dispose(); mat.dispose(); vol.geometry.dispose(); geo.dispose(); lmat.dispose(); edges.geometry.dispose(); }
    };
  }

  async function setMode(name) {
    if (state.mode === name) return;
    state.mode = name; ui.mode(name);
    const d = await load(name);
    if (state.mode !== name) return;
    current = build(name, d);
    state.t = 0; current.setTime(0);
    ui.timeline(current.nf > 1, d.meta);
    ui.thresholdRange(current.vis, current.mat.uniforms.uThr.value * current.vis);
    current.mat.uniforms.uBands.value = state.bands ? 1 : 0;
    current.lmat.uniforms.uOpacity.value = state.lines ? 1 : 0;
    ui.legend(current.vis, name);
  }

  ui.on('mode', setMode);
  ui.on('play', () => { state.playing = !state.playing; ui.playing(state.playing); });
  ui.on('scrub', (v) => { state.t = v; state.playing = false; ui.playing(false); });
  ui.on('thr', (deg) => { if (current) current.mat.uniforms.uThr.value = deg / current.vis; });
  ui.on('gain', (g) => { if (current) current.mat.uniforms.uGain.value = g; });
  ui.on('lines', (on) => { state.lines = on; if (current) current.lmat.uniforms.uOpacity.value = on ? 1 : 0; });
  ui.on('bands', (on) => { state.bands = on; if (current) current.mat.uniforms.uBands.value = on ? 1 : 0; });
  ui.on('rotate', (on) => { controls.autoRotate = on; });
  ui.on('speed', (s) => { state.speed = s; });
  ui.on('reset', () => { if (!current) return; const dist = current.name === 'single' ? 1.45 : 2.45;
    camera.position.set(dist * 0.62, -dist * 0.72, dist * 0.42); controls.target.set(0, 0, 0); controls.update(); });
  ui.on('full', () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen && root.requestFullscreen(); });
  ui.playing(state.playing); ui.rotating(controls.autoRotate);

  function resize() {
    const r = root.querySelector('.av-stage').getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(root.querySelector('.av-stage')); resize();

  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(root);
  const clock = new THREE.Clock();
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || !current) return;
    controls.update();
    const T = clock.elapsedTime;
    current.lmat.uniforms.uTime.value = reduce ? 0 : T;
    if (current.nf > 1) {
      if (state.playing) { state.t += dt * state.speed / 11; if (state.t > 1) state.t = 0; }
      current.setTime(state.t); ui.time(state.t, current.meta);
    }
    current.vol.updateMatrixWorld();
    tmpM.copy(current.vol.matrixWorld).invert();
    current.mat.uniforms.uCam.value.copy(tmpV.copy(camera.position).applyMatrix4(tmpM));
    renderer.render(scene, camera);
  });

  const qmode = new URLSearchParams(location.search).get('av');
  const qt = parseFloat(new URLSearchParams(location.search).get('avt'));   // ?avt=0.5 opens paused at that time
  setMode(qmode === 'single' || qmode === 'collision' ? qmode : (root.dataset.start || 'single')).then(() => {
    if (qt >= 0 && qt <= 1) { state.t = qt; state.playing = false; ui.playing(false); }
  });
}

function bindUI(root) {
  const $ = (s) => root.querySelector(s), handlers = {};
  const emit = (k, v) => handlers[k] && handlers[k](v);
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => emit('mode', b.dataset.mode)));
  $('.av-play').addEventListener('click', () => emit('play'));
  const scrub = $('.av-scrub'); scrub.addEventListener('input', () => emit('scrub', scrub.value / 1000));
  const thr = $('.av-thr'), thrv = $('.av-thr-v'); thr.addEventListener('input', () => { thrv.textContent = thr.value + '°'; emit('thr', +thr.value); });
  const gain = $('.av-gain'); gain.addEventListener('input', () => emit('gain', +gain.value));
  root.querySelectorAll('[data-toggle]').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); emit(b.dataset.toggle, on); }));
  const speed = $('.av-speed'), speeds = [1, 0.5, 0.25, 2]; let si = 0;
  speed.addEventListener('click', () => { si = (si + 1) % speeds.length; speed.textContent = speeds[si] + '×'; emit('speed', speeds[si]); });
  $('.av-reset').addEventListener('click', () => emit('reset'));
  $('.av-full').addEventListener('click', () => emit('full'));
  return {
    on(k, f) { handlers[k] = f; },
    loading(on) { root.classList.toggle('av-loading', on); },
    mode(name) {
      root.querySelectorAll('[data-mode]').forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === name));
      root.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== name; });
    },
    timeline(on) { $('.av-timeline').hidden = !on; },
    time(t, m) { scrub.value = Math.round(t * 1000); $('.av-t').textContent = 't = ' + (t * (m.times ? m.times[m.times.length - 1] : 1)).toFixed(2); },
    playing(on) { $('.av-play').textContent = on ? '❚❚' : '▶'; $('.av-play').setAttribute('aria-label', on ? 'Pause' : 'Play'); },
    rotating(on) { const b = root.querySelector('[data-toggle=rotate]'); if (b) b.setAttribute('aria-pressed', on); },
    thresholdRange(vis, deg) { thr.max = Math.round(vis * 0.8); thr.value = Math.round(deg); thrv.textContent = Math.round(deg) + '°'; },
    legend(vis, name) { $('.av-cbar-max').textContent = vis + '°' + (name === 'single' ? '' : '+'); }
  };
}
