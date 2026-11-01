/* Interactive 3D field lines of an Alfvénon. Default scene 'large': the large-amplitude Alfvénon (switchback model)
   of switch_back.html, 1,360 lines (make_switchback_lines.py); scene 'single': the 128^3 Alfvénon of Huang et al. 2026a.
   Each line is a tube coloured by its local bend angle theta = arccos(Bx/|B|), taken from the line's own tangent
   (a field line runs along B), with light pulses flowing along it. Drag to rotate, scroll or pinch to zoom.
   Data: /data/alfvenon/<scene>.json + <scene>-lines.bin.gz. Lines bent past 60 deg are tubes, the rest thin glowing lines.
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

// colour scale for theta / theta_max: steel blue (straight field) -> violet -> magenta -> orange -> white-gold
const STOPS = [[0, [86, 128, 205]], [0.22, [124, 98, 230]], [0.45, [205, 70, 170]], [0.7, [250, 128, 60]], [1, [255, 236, 190]]];
function cmap(x) {
  x = Math.min(1, Math.max(0, x));
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
uniform float uTime, uPulse, uBase, uPow, uThin;
void main() {
  float ph = fract(vS * 1.6 - uTime * 0.12 + vId * 0.173);
  float pulse = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.22, ph)) * uPulse;
  float face = abs(vN.z);                                   // 1 facing the camera, 0 at the silhouette
  float edge = smoothstep(0.0, 0.05, vS) * (1.0 - smoothstep(0.95, 1.0, vS));
  float lit = (0.45 + 0.4 * face) * (uBase + 0.9 * pow(min(vT, 1.0), uPow));     // straight field dim, bent field bright
  vec3 c = vCol * lit * (1.0 + 1.1 * pulse) + vec3(1.0, 0.95, 0.85) * pulse * min(vT, 1.0) * 0.6;
  fragColor = vec4(c * edge, 1.0);
}`;

const THIN_VERT = /* glsl */`
in float s; in float lid; in vec3 col; in float tw;
out float vS; out float vId; out vec3 vCol; out float vT;
void main() { vS = s; vId = lid; vCol = col; vT = tw; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const THIN_FRAG = /* glsl */`
precision highp float;
in float vS; in float vId; in vec3 vCol; in float vT; out vec4 fragColor;
uniform float uTime, uPulse, uBase, uPow, uThin;
void main() {
  float ph = fract(vS * 1.6 - uTime * 0.12 + vId * 0.173);
  float pulse = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.22, ph)) * uPulse;
  float edge = smoothstep(0.0, 0.05, vS) * (1.0 - smoothstep(0.95, 1.0, vS));
  float g = uThin + 0.5 * vT * vT;                         // faint where straight, bright where bent
  fragColor = vec4(vCol * g * (1.0 + 1.6 * pulse) * edge, 1.0);
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
  renderer.setClearColor(0x05070d, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 30);
  camera.up.set(0, 0, 1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.7;
  controls.minDistance = 0.3; controls.maxDistance = 4;

  const base = root.dataset.base || '/data/alfvenon/', name = root.dataset.scene || 'large';
  const [meta, raw] = await Promise.all([(await fetch(base + name + '.json')).json(), bytes(base + name + '-lines.bin.gz')]);
  const L = meta.box, nl = meta.lines, np = meta.npts, c0 = [L[0] / 2, meta.center[1], meta.center[2]];
  const vis = meta.theta_max > 90 ? 90 : meta.theta_max;      // colour scale end; past 90 deg the field folds back: white-hot
  const tubeMin = meta.theta_max > 90 ? 60 : 0;               // lines bent more than this are drawn as glowing tubes
  let q;
  if (meta.encoding === 'delta-int16') {                      // first point absolute (mod 65536), then steps along the line
    const d = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2); q = new Uint16Array(d.length);
    for (let l = 0; l < nl; l++) for (let c = 0; c < 3; c++) {
      let u = 0;
      for (let i = 0; i < np; i++) { const o = (l * np + i) * 3 + c; u = i ? (u + d[o]) & 0xffff : d[o] & 0xffff; q[o] = u; }
    }
  } else q = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);

  const colour = (th) => { const x = th / vis, c = cmap(Math.min(1, x)), w = Math.min(1, Math.max(0, (x - 1) * 2.2));
    return [c[0] + (1 - c[0]) * w, c[1] + (0.97 - c[1]) * w, c[2] + (0.9 - c[2]) * w]; };
  const thin = { pos: [], col: [], tw: [], s: [], id: [], idx: [] }, parts = [], R = tubeMin ? 0.0022 : 0.0026, RAD = tubeMin ? 6 : 8;
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
        thin.tw.push(Math.min(1.3, th[i] / vis)); thin.s.push(i / (np - 1)); thin.id.push(l);
        if (i < np - 1) thin.idx.push(v0 + i, v0 + i + 1);
      }
    }
    if (!big) continue;
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), np - 1, R, RAD, false);
    const nv = g.attributes.position.count, s = new Float32Array(nv), id = new Float32Array(nv), col = new Float32Array(nv * 3), tw = new Float32Array(nv);
    for (let i = 0; i < np; i++) {
      const x = Math.min(1.3, th[i] / vis), c = colour(th[i]);
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
    uBase: { value: tubeMin ? 0.02 : 0.42 }, uPow: { value: tubeMin ? 2.0 : 1.0 }, uThin: { value: 0.03 } };
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms });
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
    new THREE.LineBasicMaterial({ color: 0x3b5a86, transparent: true, opacity: 0.35 }));
  edges.position.set(L[0] / 2 - c0[0], L[1] / 2 - c0[1], L[2] / 2 - c0[2]);
  scene.add(edges);
  // background field direction B0 = x
  const ay = 0, az = tubeMin ? -0.3 : -0.27;   // under the bundle of lines
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.22, ay, az), 0.44, 0x9fb4cc, 0.05, 0.026));
  const lc = document.createElement('canvas'); lc.width = 128; lc.height = 64;
  const lx = lc.getContext('2d'); lx.fillStyle = '#cfdbec'; lx.font = 'italic 600 40px Georgia, serif'; lx.fillText('B', 30, 46);
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
    renderer.setSize(r.width, r.height, false); camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); };
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
