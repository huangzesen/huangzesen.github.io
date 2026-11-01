/* Interactive 3D field lines of an Alfvénon. Default scene 'large': the large-amplitude Alfvénon (switchback model)
   of switch_back.html, 1,360 lines (make_switchback_lines.py); scene 'single': the 128^3 Alfvénon of Huang et al. 2026a.
   Lines are coloured by the local bend angle theta = arccos(Bx/|B|), taken from each line's tangent (a field line
   runs along B), with light pulses flowing along them. Drag to rotate, scroll or pinch to zoom.
   Data: /data/alfvenon/<scene>.json + <scene>-lines.bin.gz. All lines are faint additive glows; lines bent past 60 deg are
   also solid lit tubes where they bend past 25 deg, so each fold can be followed.
   Markup: _src/partials/alfvenon-lines.html. Needs WebGL and an import map for "three". */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const root = document.querySelector('.afl');
if (root) start(root).catch(() => root.classList.add('afl-nogl'));

async function bytes(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  if (buf[0] === 0x1f && buf[1] === 0x8b && 'DecompressionStream' in window) {
    const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  return buf;
}

// colour by theta in degrees: steel blue (straight) -> violet -> magenta -> orange at 90 (fold) -> gold -> pale yellow at 150
const STOPS = [[0, [86, 128, 205]], [30, [124, 98, 230]], [60, [205, 70, 170]], [90, [250, 110, 50]], [120, [255, 190, 60]], [150, [255, 240, 150]]];
function cmap(deg) {
  const x = Math.min(150, Math.max(0, deg));
  let k = 0; while (k < STOPS.length - 2 && x > STOPS[k + 1][0]) k++;
  const [x0, c0] = STOPS[k], [x1, c1] = STOPS[k + 1], f = (x - x0) / (x1 - x0);
  return c0.map((c, i) => (c + (c1[i] - c) * f) / 255);
}

const VERT = /* glsl */`
in float s; in float lid; in vec3 col; in float tw;
out float vS; out float vId; out vec3 vCol; out vec3 vN; out float vT;
void main() {
  vS = s; vId = lid; vCol = col; vT = tw; vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */`
precision highp float;
in float vS; in float vId; in vec3 vCol; in vec3 vN; in float vT; out vec4 fragColor;
uniform float uTime, uPulse, uCut, uThin;
void main() {
  if (vT < uCut) discard;                                   // solid tube only where the line bends
  float ph = fract(vS * 1.6 - uTime * 0.12 + vId * 0.173);
  float pulse = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.22, ph)) * uPulse;
  vec3 n = normalize(vN);
  float dif = max(dot(n, normalize(vec3(0.35, 0.55, 0.75))), 0.0);
  float rim = pow(1.0 - abs(n.z), 2.0);
  vec3 c = vCol * (0.25 + 0.75 * dif + 0.2 * rim) * (1.0 + 0.4 * pulse);
  fragColor = vec4(c, 1.0);
}`;

const THIN_VERT = /* glsl */`
in float s; in float lid; in vec3 col; in float tw;
out float vS; out float vId; out vec3 vCol; out float vT;
void main() { vS = s; vId = lid; vCol = col; vT = tw; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const THIN_FRAG = /* glsl */`
precision highp float;
in float vS; in float vId; in vec3 vCol; in float vT; out vec4 fragColor;
uniform float uTime, uPulse, uCut, uThin;
void main() {
  float ph = fract(vS * 1.6 - uTime * 0.12 + vId * 0.173);
  float pulse = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.22, ph)) * uPulse;
  float edge = smoothstep(0.0, 0.05, vS) * (1.0 - smoothstep(0.95, 1.0, vS));
  float t = min(vT, 1.0), g = uThin + 0.2 * t * t;          // faint where straight, a little brighter where bent
  fragColor = vec4(vCol * g * (1.0 + 1.2 * pulse) * edge, 1.0);
}`;

async function start(root) {
  const stage = root.querySelector('.afl-stage');
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2', { antialias: true });
  if (!gl) { root.classList.add('afl-nogl'); return; }
  stage.appendChild(canvas);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x060c1c, 1);
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'), skyTex = new THREE.CanvasTexture(sky);
  skyTex.colorSpace = THREE.SRGBColorSpace; scene.background = skyTex;
  function paintSky(w, h) {          // night-sky star chart behind the field lines (after lingtai.ai)
    const k = Math.min(devicePixelRatio, 2); sky.width = Math.round(w * k); sky.height = Math.round(h * k);
    const c = sky.getContext('2d'); c.scale(k, k);
    const g = c.createRadialGradient(w * 0.5, h * 1.1, 0, w * 0.5, h * 1.1, Math.max(w, h) * 1.1);
    g.addColorStop(0, '#1d3264'); g.addColorStop(0.45, '#0c1630'); g.addColorStop(1, '#060c1c');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const cx = w * 0.5, cy = h * 1.25; c.lineWidth = 1;
    [0.5, 0.8, 1.12, 1.5].forEach((f, i) => { c.beginPath(); c.arc(cx, cy, h * f, 0, 6.2832); c.setLineDash(i === 2 ? [3, 7] : []);
      c.strokeStyle = 'rgba(226,198,130,' + (i === 2 ? 0.1 : 0.07) + ')'; c.stroke(); });
    c.setLineDash([]); c.strokeStyle = 'rgba(226,198,130,0.05)';
    for (let a = 0; a < 28; a++) { const t = a * 6.2832 / 28; c.beginPath(); c.moveTo(cx + h * 0.5 * Math.cos(t), cy + h * 0.5 * Math.sin(t));
      c.lineTo(cx + h * 3 * Math.cos(t), cy + h * 3 * Math.sin(t)); c.stroke(); }
    let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < w * h / 2600; i++) { c.fillStyle = 'rgba(236,227,204,' + (0.15 + 0.4 * rnd()).toFixed(2) + ')'; const r = 0.4 + rnd(); c.fillRect(rnd() * w, rnd() * h, r, r); }
    skyTex.needsUpdate = true;
  }
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.7;
  controls.minDistance = 0.3; controls.maxDistance = 4;

  const base = root.dataset.base || '/data/alfvenon/', name = root.dataset.scene || 'large';
  const [meta, raw] = await Promise.all([(await fetch(base + name + '.json')).json(), bytes(base + name + '-lines.bin.gz')]);
  const L = meta.box, nl = meta.lines, np = meta.npts, c0 = [L[0] / 2, meta.center[1], meta.center[2]];
  const degScale = meta.theta_max > 90 ? 1 : 150 / meta.theta_max;   // a small Alfvénon uses the whole colour scale
  const tubeMin = meta.theta_max > 90 ? 60 : 0;               // lines bent more than this are drawn as glowing tubes
  let q;
  if (meta.encoding === 'delta-int16') {                      // first point absolute (mod 65536), then steps along the line
    const d = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2); q = new Uint16Array(d.length);
    for (let l = 0; l < nl; l++) for (let c = 0; c < 3; c++) {
      let u = 0;
      for (let i = 0; i < np; i++) { const o = (l * np + i) * 3 + c; u = i ? (u + d[o]) & 0xffff : d[o] & 0xffff; q[o] = u; }
    }
  } else q = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);

  const colour = (th) => cmap(th * degScale), bend = (th) => Math.min(1.6, th / 90);
  const thin = { pos: [], col: [], tw: [], s: [], id: [], idx: [] }, parts = [], R = tubeMin ? 0.0024 : 0.0026, RAD = 8;
  for (let l = 0; l < nl; l++) {
    const pts = [];
    for (let i = 0; i < np; i++) {
      const o = (l * np + i) * 3;
      pts.push(new THREE.Vector3(q[o] / 65535 * L[0] - c0[0], q[o + 1] / 65535 * L[1] - c0[1], q[o + 2] / 65535 * L[2] - c0[2]));
    }
    const th = pts.map((p, i) => {              // angle of the tangent to x: the field line runs along B
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(np - 1, i + 1)], d = b.clone().sub(a);
      return Math.acos(Math.min(1, Math.max(-1, d.x / Math.max(d.length(), 1e-9)))) * 180 / Math.PI;
    });
    const big = Math.max(...th) >= tubeMin;
    if (!big || tubeMin) {                       // thin glowing line
      const v0 = thin.s.length;
      for (let i = 0; i < np; i++) {
        thin.pos.push(pts[i].x, pts[i].y, pts[i].z); thin.col.push(...colour(th[i]));
        thin.tw.push(bend(th[i])); thin.s.push(i / (np - 1)); thin.id.push(l);
        if (i < np - 1) thin.idx.push(v0 + i, v0 + i + 1);
      }
    }
    if (!big) continue;
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), np - 1, R, RAD, false);
    const nv = g.attributes.position.count, s = new Float32Array(nv), id = new Float32Array(nv), col = new Float32Array(nv * 3), tw = new Float32Array(nv);
    for (let i = 0; i < np; i++) {
      const x = bend(th[i]), c = colour(th[i]);
      for (let j = 0; j <= RAD; j++) {
        const v = i * (RAD + 1) + j; s[v] = i / (np - 1); id[v] = l; tw[v] = x; col.set(c, v * 3);
      }
    }
    g.setAttribute('s', new THREE.BufferAttribute(s, 1));
    g.setAttribute('lid', new THREE.BufferAttribute(id, 1));
    g.setAttribute('col', new THREE.BufferAttribute(col, 3));
    g.setAttribute('tw', new THREE.BufferAttribute(tw, 1));
    g.deleteAttribute('uv');
    parts.push(g);
  }
  const uniforms = { uTime: { value: 0 }, uPulse: { value: reduce ? 0 : 1 },
    uCut: { value: tubeMin ? 25 / 90 : 0 }, uThin: { value: 0.035 } };
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG, uniforms });   // opaque, depth-tested
  if (parts.length) { const geo = mergeGeometries(parts); parts.forEach((g) => g.dispose()); scene.add(new THREE.Mesh(geo, mat)); }
  if (thin.s.length) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(thin.pos, 3));
    g.setAttribute('col', new THREE.Float32BufferAttribute(thin.col, 3));
    g.setAttribute('tw', new THREE.Float32BufferAttribute(thin.tw, 1));
    g.setAttribute('s', new THREE.Float32BufferAttribute(thin.s, 1));
    g.setAttribute('lid', new THREE.Float32BufferAttribute(thin.id, 1));
    g.setIndex(thin.idx);
    const lm = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: THIN_VERT, fragmentShader: THIN_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms });
    const ls = new THREE.LineSegments(g, lm); ls.frustumCulled = false; scene.add(ls);
  }

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L[0], L[1], L[2])),
    new THREE.LineBasicMaterial({ color: 0xa9853a, transparent: true, opacity: 0.32 }));
  edges.position.set(L[0] / 2 - c0[0], L[1] / 2 - c0[1], L[2] / 2 - c0[2]);
  scene.add(edges);
  // background field direction B0 = x
  const ay = 0, az = tubeMin ? -0.3 : -0.27;   // under the bundle of lines
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.22, ay, az), 0.44, 0xe2c682, 0.05, 0.026));
  const lc = document.createElement('canvas'); lc.width = 128; lc.height = 64;
  const lx = lc.getContext('2d'); lx.fillStyle = '#e2c682'; lx.font = 'italic 600 40px Georgia, serif'; lx.fillText('B', 30, 46);
  lx.font = '600 24px Georgia, serif'; lx.fillText('0', 58, 56);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false }));
  lab.scale.set(0.12, 0.06, 1); lab.position.set(0.28, ay, az + 0.05); scene.add(lab);

  const home = () => { const d = (tubeMin ? 1.12 : 1.3) * Math.pow(Math.max(1, 1.6 / camera.aspect), 0.75); camera.position.set(d * 0.5, -d * 0.8, d * 0.36); controls.target.set(0, 0, 0); controls.update(); };
  const stageR = stage.getBoundingClientRect(); camera.aspect = stageR.width / Math.max(1, stageR.height); camera.updateProjectionMatrix();
  home();

  const rot = root.querySelector('[data-afl=rotate]'), pul = root.querySelector('[data-afl=pulses]');
  const sync = () => { rot.setAttribute('aria-pressed', controls.autoRotate); pul.setAttribute('aria-pressed', mat.uniforms.uPulse.value > 0); };
  rot.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; sync(); });
  pul.addEventListener('click', () => { mat.uniforms.uPulse.value = mat.uniforms.uPulse.value > 0 ? 0 : 1; sync(); });
  root.querySelector('[data-afl=reset]').addEventListener('click', home);
  root.querySelector('[data-afl=full]').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen(); else if (root.requestFullscreen) root.requestFullscreen(); });
  canvas.addEventListener('pointerdown', () => { if (controls.autoRotate) { controls.autoRotate = false; sync(); } });
  sync();

  const resize = () => { const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false); paintSky(r.width, r.height); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();
  let visible = true;
  new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(root);
  const clock = new THREE.Clock();
  root.classList.add('afl-ready');
  renderer.setAnimationLoop(() => {
    clock.getDelta();
    if (!visible) return;
    controls.update();
    mat.uniforms.uTime.value = clock.elapsedTime;
    renderer.render(scene, camera);
  });
}
