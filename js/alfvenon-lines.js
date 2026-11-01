/* Interactive 3D field lines of the 128^3 Alfvénon (Huang et al. 2026a).
   Each line is a tube coloured by its local bend angle theta = arccos(Bx/|B|), taken from the line's own tangent
   (a field line runs along B), with light pulses flowing along it. Drag to rotate, scroll or pinch to zoom.
   Data: /data/alfvenon/single.json + single-lines.bin.gz (_src/make_alfvenon_volumes.py single).
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
uniform float uTime, uPulse;
void main() {
  float ph = fract(vS * 1.6 - uTime * 0.12 + vId * 0.173);
  float pulse = smoothstep(0.0, 0.03, ph) * (1.0 - smoothstep(0.03, 0.22, ph)) * uPulse;
  float face = abs(vN.z);                                   // 1 facing the camera, 0 at the silhouette
  float edge = smoothstep(0.0, 0.05, vS) * (1.0 - smoothstep(0.95, 1.0, vS));
  float lit = (0.45 + 0.4 * face) * (0.42 + 0.9 * vT);     // straight field dim, bent field bright
  vec3 c = vCol * lit * (1.0 + 1.1 * pulse) + vec3(1.0, 0.95, 0.85) * pulse * vT * 0.6;
  fragColor = vec4(c * edge, 1.0);
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

  const base = root.dataset.base || '/data/alfvenon/';
  const [meta, raw] = await Promise.all([(await fetch(base + 'single.json')).json(), bytes(base + 'single-lines.bin.gz')]);
  const q = new Uint16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  const L = meta.box, nl = meta.lines, np = meta.npts, tmax = meta.theta_max || 45;
  const c0 = [L[0] / 2, meta.center[1], meta.center[2]];

  const parts = [], R = 0.0026, RAD = 8;
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
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), np - 1, R, RAD, false);
    const nv = g.attributes.position.count, s = new Float32Array(nv), id = new Float32Array(nv), col = new Float32Array(nv * 3), tw = new Float32Array(nv);
    for (let i = 0; i < np; i++) {
      const x = Math.min(1, th[i] / tmax), c = cmap(x);
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
  const geo = mergeGeometries(parts); parts.forEach((g) => g.dispose());
  const mat = new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPulse: { value: reduce ? 0 : 1 } } });
  scene.add(new THREE.Mesh(geo, mat));

  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L[0], L[1], L[2])),
    new THREE.LineBasicMaterial({ color: 0x3b5a86, transparent: true, opacity: 0.35 }));
  edges.position.set(L[0] / 2 - c0[0], L[1] / 2 - c0[1], L[2] / 2 - c0[2]);
  scene.add(edges);
  // background field direction B0 = x
  const ay = 0, az = -0.27;   // under the bundle of lines
  scene.add(new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.22, ay, az), 0.44, 0x9fb4cc, 0.05, 0.026));
  const lc = document.createElement('canvas'); lc.width = 128; lc.height = 64;
  const lx = lc.getContext('2d'); lx.fillStyle = '#cfdbec'; lx.font = 'italic 600 40px Georgia, serif'; lx.fillText('B', 30, 46);
  lx.font = '600 24px Georgia, serif'; lx.fillText('0', 58, 56);
  const lab = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true, depthWrite: false }));
  lab.scale.set(0.12, 0.06, 1); lab.position.set(0.28, ay, az + 0.05); scene.add(lab);

  const home = () => { const d = 1.3 * Math.pow(Math.max(1, 1.6 / camera.aspect), 0.75); camera.position.set(d * 0.5, -d * 0.8, d * 0.36); controls.target.set(0, 0, 0); controls.update(); };
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
