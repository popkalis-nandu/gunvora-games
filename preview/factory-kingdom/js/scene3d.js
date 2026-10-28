/* Factory Kingdom 250 · GUNVORA GAMES — realistic real-time 3D renderer (Three.js r170).
   Reads the simulation state from window.FK_INT (js/game.js) and draws it every frame.
   Logical sim coords (x 0..400, y 0..380) map to metres: X=(x-200)*0.05, Z=(y-200)*0.05. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const K = 0.05;
const wx = (x) => (x - 200) * K, wz = (y) => (y - 200) * K;
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const rnd = (a, b) => a + Math.random() * (b - a);

const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 820);
const GFX_KEY = 'gunvora_factorykingdom3d_gfx';
const QUALITY = {
  high: { dpr: 2, shadow: 2048, ao: true, label: 'High' },
  medium: { dpr: 1.5, shadow: 1024, ao: false, label: 'Medium' },
  low: { dpr: 1, shadow: 512, ao: false, label: 'Low (battery saver)' }
};
let quality = localStorage.getItem(GFX_KEY);
if (!QUALITY[quality]) quality = isMobile ? 'medium' : 'high';

/* ------------------------------------------------------------------ boot */
export async function boot(I, onProgress) {
  const wrap = document.getElementById('scene-wrap');
  const canvas = document.createElement('canvas');
  canvas.id = 'scene3d';
  wrap.insertBefore(canvas, wrap.firstChild);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', stencil: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  /* ---------- assets ---------- */
  const manager = new THREE.LoadingManager();
  let done = 0, total = 0;
  manager.onStart = (u, l, t) => { total = t; };
  manager.onProgress = (u, l, t) => { done = l; total = t; onProgress && onProgress(l / Math.max(1, t)); };
  const texLoader = new THREE.TextureLoader(manager);
  const gltf = new GLTFLoader(manager); gltf.setMeshoptDecoder(MeshoptDecoder);
  const hdr = new RGBELoader(manager);
  const TEXSETS = ['floor_shed', 'floor_ws', 'floor_fac', 'wall_shed', 'corrugated', 'brick', 'cladding', 'asphalt', 'grass', 'plate', 'wood', 'rust'];
  const T = {};
  const texJobs = [];
  TEXSETS.forEach((s) => ['diff', 'nor', 'arm'].forEach((k) => {
    if (s === 'wood' && k === 'arm') return;
    texJobs.push(texLoader.loadAsync('assets/tex/' + s + '_' + k + '.webp').then((t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = isMobile ? 2 : 8;
      if (k === 'diff') t.colorSpace = THREE.SRGBColorSpace;
      T[s + '_' + k] = t;
    }));
  }));
  const MODELS = ['box', 'shelves', 'barrel', 'extinguisher', 'tool_cart', 'tool_chest', 'hand_truck', 'welding_cart', 'shutter', 'lamp', 'fluoro', 'storage_cart', 'drill_press', 'propane', 'power_box', 'crane', 'worker_m', 'worker_f'];
  const G = {};
  const modelJobs = MODELS.map((m) => gltf.loadAsync('assets/models/' + m + '.glb').then((g) => { G[m] = g; }));
  const hdrJob = hdr.loadAsync('assets/hdri/factory_yard_1k.hdr');
  const [envTex] = await Promise.all([hdrJob, ...texJobs, ...modelJobs]);

  /* ---------- scene, lights, environment ---------- */
  const scene = new THREE.Scene();
  const SKY = new THREE.Color('#c9d3dc');
  scene.background = SKY;
  scene.fog = new THREE.Fog(SKY, 60, 140);
  const pmrem = new THREE.PMREMGenerator(renderer);
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  const envRT = pmrem.fromEquirectangular(envTex);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  envTex.dispose(); pmrem.dispose();
  const hemi = new THREE.HemisphereLight(0xdfe7f2, 0x5b5045, 0.45); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.castShadow = true;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.025; sun.shadow.radius = 3;
  const SC = sun.shadow.camera; SC.left = -17; SC.right = 17; SC.top = 17; SC.bottom = -17; SC.near = 1; SC.far = 80;
  scene.add(sun); scene.add(sun.target);
  const SUN_OFF = new THREE.Vector3(14, 26, 9);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.5, 220);
  let composer = null, gtao = null;

  /* ---------- geometry & material helpers ---------- */
  const gcache = {};
  function bx(w, h, d, r) { const k = 'b' + w + ',' + h + ',' + d + ',' + (r || 0); return gcache[k] || (gcache[k] = r ? new RoundedBoxGeometry(w, h, d, 2, r) : new THREE.BoxGeometry(w, h, d)); }
  function cy(rt, rb, h, seg) { const k = 'c' + rt + ',' + rb + ',' + h + ',' + (seg || 16); return gcache[k] || (gcache[k] = new THREE.CylinderGeometry(rt, rb, h, seg || 16)); }
  function mesh(geo, mat, x, y, z, parent, cast = true, recv = true) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.castShadow = cast; m.receiveShadow = recv;
    if (parent) parent.add(m); return m;
  }
  // world-space UVs so tiling textures keep a real-world scale on any box size
  function worldUV(geo, scale) {
    geo = geo.clone();
    const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      let u, v;
      if (ax >= ay && ax >= az) { u = p.getZ(i); v = p.getY(i); } else if (ay >= az) { u = p.getX(i); v = p.getZ(i); } else { u = p.getX(i); v = p.getY(i); }
      uv.setXY(i, u / scale, v / scale);
    }
    return geo;
  }
  function boxW(w, h, d, scale, ox, oy, oz) { const g = new THREE.BoxGeometry(w, h, d); g.translate(ox || 0, oy || 0, oz || 0); return worldUV(g, scale); }
  function pbr(set, o = {}) {
    const m = new THREE.MeshStandardMaterial({ color: o.color || 0xffffff, roughness: o.rough != null ? o.rough : 1, metalness: o.metal || 0 });
    if (T[set + '_diff']) m.map = T[set + '_diff'];
    if (T[set + '_nor']) { m.normalMap = T[set + '_nor']; const s = o.ns != null ? o.ns : 1; m.normalScale.set(s, s); }
    if (T[set + '_arm']) { m.aoMap = T[set + '_arm']; m.roughnessMap = T[set + '_arm']; if (o.metalMap) m.metalnessMap = T[set + '_arm']; m.aoMapIntensity = o.ao != null ? o.ao : 1; }
    else if (o.rough == null) m.roughness = 0.75;
    return m;
  }
  const std = (color, rough, metal, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: rough, metalness: metal }, o));

  // canvas helpers (signs, decals, sprites)
  function canvasTex(w, h, draw, srgb = true) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
    const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.userData.canvas = c; t.userData.ctx = g; return t;
  }
  const FONT = '"Inter","Segoe UI",Roboto,Arial,sans-serif';
  function signTex(lines, o = {}) {
    return canvasTex(o.w || 512, o.h || 128, (g, w, h) => {
      g.fillStyle = o.bg || '#1f2a37'; g.fillRect(0, 0, w, h);
      if (o.border) { g.strokeStyle = o.border; g.lineWidth = 8; g.strokeRect(4, 4, w - 8, h - 8); }
      if (o.stripe) { g.fillStyle = o.stripe; g.fillRect(0, h - 14, w, 14); }
      lines.forEach((l, i) => { g.fillStyle = l.c || '#fff'; g.font = (l.w || 800) + ' ' + l.s + 'px ' + FONT; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillText(l.t, o.align === 'left' ? 24 : w / 2, l.y * h); });
    });
  }
  const M = {};
  M.hazard = canvasTex(256, 256, (g) => { g.fillStyle = '#f2c200'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#151515'; for (let i = -256; i < 512; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 + 256, 256); g.lineTo(i + 256, 256); g.fill(); } });
  M.hazard.wrapS = M.hazard.wrapT = THREE.RepeatWrapping;
  M.blob = canvasTex(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 6, 64, 64, 62); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }, false);
  M.spark = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 31); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, false);
  M.fence = canvasTex(128, 128, (g) => { g.clearRect(0, 0, 128, 128); g.strokeStyle = 'rgba(170,176,182,1)'; g.lineWidth = 3; for (let i = -128; i < 256; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 128, 128); g.stroke(); g.beginPath(); g.moveTo(i + 128, 0); g.lineTo(i, 128); g.stroke(); } });
  M.fence.wrapS = M.fence.wrapT = THREE.RepeatWrapping;
  M.belt = canvasTex(64, 256, (g) => { g.fillStyle = '#1b1c1e'; g.fillRect(0, 0, 64, 256); g.fillStyle = '#2b2d30'; for (let y = 0; y < 256; y += 32) g.fillRect(0, y, 64, 6); g.fillStyle = 'rgba(255,255,255,.03)'; for (let i = 0; i < 300; i++) g.fillRect(Math.random() * 64, Math.random() * 256, 2, 1); });
  M.belt.wrapS = M.belt.wrapT = THREE.RepeatWrapping;
  M.screen = canvasTex(256, 160, (g) => { g.fillStyle = '#04121c'; g.fillRect(0, 0, 256, 160); g.font = '14px monospace'; g.fillStyle = '#5ee0ff'; ['G21 G90 G54', 'T03 M06', 'S2400 M03', 'G00 X12.5 Y4.0', 'G01 Z-1.2 F300', 'G02 X18 Y8 R4', 'M30'].forEach((l, i) => g.fillText(l, 10, 22 + i * 19)); g.fillStyle = '#22c55e'; g.fillRect(180, 12, 64, 16); g.fillStyle = '#04121c'; g.font = 'bold 12px monospace'; g.fillText('CYCLE', 190, 25); });

  // core material library
  const MAT = {
    floor: [pbr('floor_shed', { ao: 0.7 }), pbr('floor_ws', { ao: 0.8 }), pbr('floor_fac', { ao: 0.6, rough: 0.8, color: 0xc2cbc4 })],
    plank: pbr('wall_shed'), corr: pbr('corrugated', { metalMap: true, color: 0xc8ccd0 }), brick: pbr('brick'), clad: pbr('cladding', { metalMap: true, color: 0xdfe3e6 }),
    asphalt: pbr('asphalt', { ao: 0.6 }), grass: pbr('grass', { color: 0xb8c7a0 }), plate: pbr('plate', { metalMap: true }), wood: pbr('wood', { rough: 0.8 }), rust: pbr('rust', { metalMap: true }),
    concrete: pbr('floor_ws', { color: 0xc9c6c0 }),
    paintBlue: std(0x1d4d8c, 0.42, 0.35), paintGrey: std(0x7d868e, 0.5, 0.3), paintDark: std(0x2b3036, 0.55, 0.4), paintGreen: std(0x3f5f4b, 0.5, 0.3),
    paintOrange: std(0xe56f17, 0.4, 0.3), paintYellow: std(0xe9b80b, 0.48, 0.2), cabinet: std(0xd6dadd, 0.5, 0.15), indigo: std(0x3b3fbf, 0.45, 0.3),
    steel: std(0xb7bcc2, 0.34, 1), chrome: std(0xeceef0, 0.12, 1), darkSteel: std(0x3a3e43, 0.5, 0.85), galv: std(0xa9adb1, 0.45, 0.9),
    rubber: std(0x151515, 0.88, 0), black: std(0x0f1113, 0.6, 0.2), white: std(0xf2f2f0, 0.45, 0.05), plasticRed: std(0xc81e1e, 0.32, 0),
    glass: std(0x9fb4c4, 0.05, 0.1, { transparent: true, opacity: 0.28, envMapIntensity: 1.6, depthWrite: false }),
    winGlass: std(0x6f8899, 0.06, 0.6, { envMapIntensity: 1.4 }),
    lampOn: std(0xffffff, 0.3, 0, { emissive: 0xfff4d6, emissiveIntensity: 2.2 }),
    belt: std(0xffffff, 0.85, 0, { map: M.belt }),
    hazard: std(0xffffff, 0.6, 0.1, { map: M.hazard }),
    fence: std(0xb0b6bc, 0.4, 0.8, { map: M.fence, alphaTest: 0.5, side: THREE.DoubleSide }),
    blob: new THREE.MeshBasicMaterial({ map: M.blob, transparent: true, depthWrite: false, toneMapped: false }),
    pick: new THREE.MeshBasicMaterial({ visible: false }),
    screen: std(0x000000, 0.3, 0, { emissive: 0xffffff, emissiveMap: M.screen, emissiveIntensity: 1.2 })
  };
  MAT.belt.map.repeat.set(1, 1);
  function blobShadow(parent, w, d, x, z, op) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.blob); m.rotation.x = -Math.PI / 2; m.position.set(x || 0, 0.012, z || 0); m.renderOrder = 1; if (op != null) { m.material = MAT.blob.clone(); m.material.opacity = op; } parent.add(m); return m; }

  // prepare a loaded GLB: shadows, env intensity, normalised size
  function prep(name, o = {}) {
    const src = G[name].scene; const g = o.skinned ? SkeletonUtils.clone(src) : src.clone(true);
    g.traverse((c) => { if (c.isMesh) { c.castShadow = o.cast !== false; c.receiveShadow = true; } });
    if (o.height || o.length) {
      const b = new THREE.Box3().setFromObject(g), s = new THREE.Vector3(); b.getSize(s);
      const k = o.height ? o.height / s.y : o.length / Math.max(s.x, s.z); g.scale.setScalar(k);
    }
    if (o.ground) { const b = new THREE.Box3().setFromObject(g); g.position.y -= b.min.y; const w = new THREE.Group(); w.add(g); return w; }
    return g;
  }
  // first mesh of a GLB, as geometry+material (for instancing)
  function firstMesh(name, size) {
    G[name].scene.updateMatrixWorld(true); let found = null; G[name].scene.traverse((c) => { if (!found && c.isMesh) found = c; });
    const geo = found.geometry.clone(); geo.applyMatrix4(found.matrixWorld);
    geo.computeBoundingBox(); const b = geo.boundingBox, s = new THREE.Vector3(); b.getSize(s); const c = new THREE.Vector3(); b.getCenter(c);
    geo.translate(-c.x, -b.min.y, -c.z); geo.scale(size[0] / s.x, size[1] / s.y, size[2] / s.z);
    return { geo, mat: found.material };
  }

  /* ---------- products (realistic small models) ---------- */
  const PROD = {};
  {
    // toy car: glossy painted body, tinted cabin, black tyres with silver hubs
    const g = new THREE.Group();
    mesh(bx(0.26, 0.07, 0.12, 0.025), std(0xc81e1e, 0.28, 0.1), 0, 0.065, 0, g);
    mesh(bx(0.13, 0.06, 0.1, 0.02), std(0x1b2430, 0.1, 0.4), -0.015, 0.12, 0, g);
    const tyre = cy(0.032, 0.032, 0.022, 14), hub = cy(0.016, 0.016, 0.024, 10);
    [[-0.08, 0.06], [0.08, 0.06], [-0.08, -0.06], [0.08, -0.06]].forEach(([x, z]) => { const t = mesh(tyre, MAT.rubber, x, 0.032, z, g); t.rotation.x = Math.PI / 2; const h = mesh(hub, MAT.steel, x, 0.032, z, g); h.rotation.x = Math.PI / 2; });
    PROD.toy = g;
  }
  {
    // wooden chair: seat, tapered legs, back posts and slats
    const g = new THREE.Group(), w = std(0x8a5a32, 0.55, 0, { map: T.wood_diff }), seatH = 0.45;
    mesh(bx(0.42, 0.035, 0.4, 0.008), w, 0, seatH, 0, g);
    [[-0.18, -0.17], [0.18, -0.17], [-0.18, 0.17], [0.18, 0.17]].forEach(([x, z]) => mesh(cy(0.018, 0.014, seatH, 8), w, x, seatH / 2, z, g));
    [-0.18, 0.18].forEach((x) => mesh(bx(0.035, 0.45, 0.035), w, x, seatH + 0.22, -0.18, g));
    [0.62, 0.76, 0.86].forEach((y) => mesh(bx(0.34, 0.05, 0.02), w, 0, y, -0.18, g));
    mesh(bx(0.34, 0.02, 0.02), w, 0, 0.15, 0.17, g);
    PROD.chair = g;
  }
  {
    // steel bucket: lathe-turned brushed steel body, rolled rim, wire handle
    const g = new THREE.Group(), pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(0.115 + 0.035 * t, 0.005 + 0.27 * t)); }
    pts.unshift(new THREE.Vector2(0, 0.005));
    const body = mesh(new THREE.LatheGeometry(pts, 28), std(0xc5cacf, 0.3, 1, { side: THREE.DoubleSide }), 0, 0, 0, g);
    const rim = mesh(new THREE.TorusGeometry(0.15, 0.008, 6, 28), MAT.steel, 0, 0.275, 0, g); rim.rotation.x = Math.PI / 2;
    const handle = mesh(new THREE.TorusGeometry(0.15, 0.004, 4, 20, Math.PI), MAT.darkSteel, 0, 0.275, 0, g);
    handle.rotation.y = 0.3;
    PROD.bucket = g; void body;
  }
  const productScale = { toy: 1.35, chair: 0.75, bucket: 0.85 };
  function product(p) { const g = PROD[p].clone(); g.scale.setScalar(productScale[p]); return g; }

  // cardboard box (Poly Haven model) for packed goods
  const BOX = firstMesh('box', [1, 1, 1]);
  const BOXSIZE = { toy: [0.42, 0.28, 0.34], chair: [0.46, 0.56, 0.42], bucket: [0.44, 0.4, 0.44] };
  function cardBox(p) { const m = new THREE.Mesh(BOX.geo, BOX.mat); const s = BOXSIZE[p || 'toy']; m.scale.set(s[0], s[1], s[2]); m.castShadow = true; m.receiveShadow = true; return m; }

  // euro pallet: deck boards on three stringers + blocks (merged, one draw call)
  const palletGeo = (() => {
    const parts = [];
    const add = (w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); parts.push(g); };
    for (let i = 0; i < 5; i++) add(1.2, 0.022, 0.14, 0, 0.133, -0.4 + i * 0.2);
    [-0.5, 0, 0.5].forEach((x) => { [-0.4, 0, 0.4].forEach((z) => add(0.14, 0.078, 0.14, x, 0.083, z)); });
    for (let i = 0; i < 3; i++) add(1.2, 0.022, 0.1, 0, 0.033, -0.4 + i * 0.4);
    return worldUV(mergeGeometries(parts), 1.2);
  })();
  const palletMat = std(0xb99a72, 0.85, 0, { map: T.wood_diff, normalMap: T.wood_nor });
  function pallet() { return mesh(palletGeo, palletMat, 0, 0, 0); }

  /* static batching: merge non-animated meshes that share a material (cuts draw calls on phones) */
  function staticBatch(root) {
    if (/[?&]nobatch/.test(location.search)) return 0;
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), groups = new Map(), victims = [];
    root.traverse((c) => {
      if (!c.isMesh || c.isInstancedMesh || c.isSkinnedMesh || !c.visible || c.children.length || c.userData.pick || c.userData.keep) return;
      const m = c.material; if (Array.isArray(m) || m.transparent || c.renderOrder || c.geometry.morphAttributes.position) return;
      for (let p = c.parent; p && p !== root; p = p.parent) if (!p.visible) return;
      const ga = c.geometry.attributes; if (Object.keys(ga).some((k) => !(ga[k].array instanceof Float32Array) || ga[k].normalized || ga[k].isInterleavedBufferAttribute)) return;   // quantized glTF data can't be baked
      const attrs = Object.keys(ga).sort().join(',');
      const key = m.uuid + '|' + c.castShadow + c.receiveShadow + '|' + attrs;
      if (!groups.has(key)) groups.set(key, []); groups.get(key).push(c);
    });
    let merged = 0;
    groups.forEach((list) => {
      if (list.length < 2) return;
      const geos = list.map((c) => {
        let g = c.geometry.clone(); if (!g.index) { const n = g.attributes.position.count, idx = new Array(n); for (let i = 0; i < n; i++) idx[i] = i; g.setIndex(idx); }
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, c.matrixWorld)); g.groups = []; return g;
      });
      let mg = null; try { mg = mergeGeometries(geos, false); } catch (e) { mg = null; }
      geos.forEach((g) => g.dispose());
      if (!mg) return;
      const mm = new THREE.Mesh(mg, list[0].material); mm.castShadow = list[0].castShadow; mm.receiveShadow = list[0].receiveShadow;
      mm.matrixAutoUpdate = false; root.add(mm); list.forEach((c) => victims.push(c)); merged += list.length;
    });
    victims.forEach((c) => c.parent && c.parent.remove(c));
    return merged;
  }

  /* ---------- static world: ground, road, yard, fence, lamps ---------- */
  const world = new THREE.Group(); scene.add(world);
  {
    const grass = mesh(new THREE.PlaneGeometry(260, 260), MAT.grass, 0, -0.03, 0, world, false, true); grass.rotation.x = -Math.PI / 2;
    const gu = grass.geometry.attributes.uv; for (let i = 0; i < gu.count; i++) gu.setXY(i, gu.getX(i) * 65, gu.getY(i) * 65);
    // asphalt yard and road
    mesh(boxW(44, 0.04, 22, 6, 0, 0, 0), MAT.asphalt, 0, -0.02, -0.5, world, false, true);
    mesh(boxW(260, 0.05, 5.2, 6), MAT.asphalt, 0, -0.005, 8.25, world, false, true);
    const kerbMat = MAT.concrete;
    mesh(boxW(260, 0.16, 0.25, 2), kerbMat, 0, 0.02, 5.55, world, false, true);
    mesh(boxW(260, 0.16, 0.25, 2), kerbMat, 0, 0.02, 10.95, world, false, true);
    const lineMat = std(0xf3f1e8, 0.7, 0);
    const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(2.4, 0.14), lineMat, 60);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
    for (let i = 0; i < 60; i++) { mtx.compose(new THREE.Vector3(-120 + i * 4.2, 0.024, 8.25), q, new THREE.Vector3(1, 1, 1)); dash.setMatrixAt(i, mtx); }
    dash.receiveShadow = true; world.add(dash);
    // perimeter chain-link fence at the back
    const fence = new THREE.Mesh(new THREE.PlaneGeometry(44, 2.2), MAT.fence); fence.position.set(0, 1.1, -11.4);
    MAT.fence.map.repeat.set(44 / 0.6, 2.2 / 0.6); fence.castShadow = true; world.add(fence);
    for (let x = -22; x <= 22; x += 2.75) mesh(cy(0.04, 0.04, 2.3, 8), MAT.galv, x, 1.15, -11.4, world);
    mesh(cy(0.025, 0.025, 44, 6), MAT.galv, 0, 2.2, -11.4, world).rotation.z = Math.PI / 2;
    // street lamps along the road
    for (let x = -36; x <= 36; x += 18) {
      const pole = new THREE.Group(); pole.position.set(x + 9, 0, 11.4); world.add(pole);
      mesh(cy(0.07, 0.1, 7, 10), MAT.galv, 0, 3.5, 0, pole);
      mesh(bx(0.1, 0.08, 1.4), MAT.galv, 0, 6.95, -0.65, pole);
      mesh(bx(0.42, 0.1, 0.26, 0.03), MAT.paintDark, 0, 6.88, -1.3, pole);
      mesh(bx(0.36, 0.02, 0.2), MAT.lampOn, 0, 6.82, -1.3, pole, false, false);
    }
    // shipping containers & spare pallets in the yard (left)
    const contMat = (c) => { const m = pbr('corrugated', { metalMap: true, color: c }); return m; };
    const cont = (x, z, r, c, y) => { const g = new THREE.Group(); g.position.set(x, y || 0, z); g.rotation.y = r; world.add(g); mesh(boxW(6.06, 2.59, 2.44, 2.2), contMat(c), 0, 1.295, 0, g); mesh(bx(6.1, 0.12, 2.48), MAT.darkSteel, 0, 0.06, 0, g); blobShadow(g, 7, 3.4, 0, 0, 0.6); };
    cont(-16.5, -6.5, Math.PI / 2, 0x8f2b22); cont(-19.4, -6.5, Math.PI / 2, 0x2c5d86); cont(-16.5, -6.5, Math.PI / 2 + 0.03, 0x4f6b3a, 2.62);
    for (let i = 0; i < 4; i++) { const p = pallet(); p.position.set(-14.2, i * 0.145, 2.8); world.add(p); }
    for (let i = 0; i < 3; i++) { const p = pallet(); p.position.set(-14.2, i * 0.145, 4.2); p.rotation.y = 0.08; world.add(p); }
    const bar = prep('barrel', { height: 0.88, ground: true }); bar.position.set(-15.4, 0, 0.6); world.add(bar);
    const bar2 = prep('barrel', { height: 0.88, ground: true }); bar2.position.set(-14.8, 0, 0.1); world.add(bar2);
    staticBatch(world);
  }

  /* ---------- buildings: shed -> brick workshop -> steel factory ---------- */
  const SPACES = [
    { x0: -9.5, x1: 9.7, z0: -5.7, z1: 0.35, h: 3.3 },
    { x0: -9.5, x1: 9.7, z0: -5.7, z1: 4.75, h: 4.8 },
    { x0: -11.3, x1: 11.3, z0: -6.9, z1: 5.3, h: 7.2 }
  ];
  let buildingGroup = null, builtSpace = -1;
  function signboard(text1, text2, w, h, o = {}) {
    const t = signTex([{ t: text1, s: o.s1 || 54, y: 0.42, c: o.c1 || '#ffffff' }, { t: text2, s: o.s2 || 22, y: 0.8, c: o.c2 || '#f59e0b', w: 700 }], { w: 1024, h: Math.round(1024 * h / w), bg: o.bg || '#1f2a37', stripe: o.stripe });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, 0.45, 0.2, { map: t, emissive: o.glow ? 0xffffff : 0x000000, emissiveMap: o.glow ? t : null, emissiveIntensity: o.glow ? 0.55 : 0 }));
  }
  function buildBuilding(sp) {
    if (buildingGroup) { scene.remove(buildingGroup); buildingGroup.traverse((c) => { if (c.isMesh && c.geometry && !Object.values(gcache).includes(c.geometry) && c.geometry !== palletGeo) c.geometry.dispose(); }); }
    const B = SPACES[sp], g = new THREE.Group(); buildingGroup = g; scene.add(g); builtSpace = sp;
    smokeEmitters = smokeEmitters.filter((e) => e.kind !== 'chimney');
    const W = B.x1 - B.x0, D = B.z1 - B.z0, cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, t = 0.25;
    // floor slab
    mesh(boxW(W + 0.5, 0.22, D + 0.5, sp === 2 ? 5 : 3.5), MAT.floor[sp], cx, -0.1, cz, g, false, true);
    const wallMat = sp === 0 ? MAT.plank : sp === 1 ? MAT.brick : MAT.clad, wscale = sp === 0 ? 2.4 : sp === 1 ? 2.2 : 2.6;
    const kneeH = sp === 0 ? 0.55 : 0.9;
    // back + left walls full height (camera looks in from front-right: those walls are cut away)
    mesh(boxW(W + t * 2, B.h, t, wscale), wallMat, cx, B.h / 2, B.z0 - t / 2, g);
    mesh(boxW(t, B.h, D, wscale), wallMat, B.x0 - t / 2, B.h / 2, cz, g);
    // right + front knee walls with a dock opening at the front right
    mesh(boxW(t, kneeH, D, wscale), wallMat, B.x1 + t / 2, kneeH / 2, cz, g);
    // front knee wall: goods-in gap at the left (forklift), dock gap at the right
    const doorX0 = 4.6, gin = B.x0 + 2.5, frontL = doorX0 - gin;
    mesh(boxW(frontL, kneeH, t, wscale), wallMat, gin + frontL / 2, kneeH / 2, B.z1 + t / 2, g);
    mesh(boxW(0.3, kneeH, t, wscale), wallMat, B.x0 - t + 0.15, kneeH / 2, B.z1 + t / 2, g);
    { const gl = mesh(new THREE.PlaneGeometry(gin - B.x0 - 0.3, 0.2), MAT.hazard, (gin + B.x0 + 0.3) / 2, 0.007, B.z1 + 0.05, g, false, true); gl.rotation.x = -Math.PI / 2; }
    // corner/frame columns
    const colMat = sp === 0 ? std(0x6b4f35, 0.8, 0, { map: T.wood_diff }) : sp === 1 ? MAT.paintDark : MAT.paintBlue;
    const colSz = sp === 0 ? 0.16 : 0.24;
    const cols = [[B.x1 + t / 2, B.z1 + t / 2], [B.x0 - t / 2, B.z1 + t / 2], [B.x1 + t / 2, B.z0 - t / 2], [doorX0, B.z1 + t / 2], [gin, B.z1 + t / 2]];
    cols.forEach(([x, z]) => mesh(bx(colSz + 0.06, sp === 0 ? B.h : B.h, colSz + 0.06), colMat, x, B.h / 2, z, g));
    // wall top capping / eaves
    const capMat = sp === 0 ? MAT.corr : sp === 1 ? MAT.concrete : MAT.paintGrey;
    mesh(boxW(W + t * 2 + 0.3, 0.16, 0.7, 2), capMat, cx, B.h + 0.08, B.z0 - 0.2, g);
    mesh(boxW(0.7, 0.16, D + 0.3, 2), capMat, B.x0 - 0.2, B.h + 0.08, cz, g);
    mesh(boxW(0.45, 0.08, D + t, 2), capMat, B.x1 + t / 2, kneeH + 0.04, cz, g);
    mesh(boxW(frontL, 0.08, 0.45, 2), capMat, gin + frontL / 2, kneeH + 0.04, B.z1 + t / 2, g);
    // interior columns along the back wall
    const step = sp === 2 ? 4.5 : 4.2;
    for (let x = B.x0 + step; x < B.x1 - 1; x += step) {
      if (sp === 0) mesh(bx(0.14, B.h, 0.14), colMat, x, B.h / 2, B.z0 + 0.07, g);
      else { const c = new THREE.Group(); c.position.set(x, 0, B.z0 + 0.15); g.add(c); mesh(bx(0.3, B.h, 0.03), colMat, 0, B.h / 2, 0.12, c); mesh(bx(0.03, B.h, 0.26), colMat, 0, B.h / 2, 0, c); mesh(bx(0.3, B.h, 0.03), colMat, 0, B.h / 2, -0.12, c); }
    }
    // windows on the back wall
    const winY = sp === 0 ? 2.0 : sp === 1 ? 2.6 : 5.2, winH = sp === 0 ? 0.9 : sp === 1 ? 1.8 : 1.3, winW = sp === 0 ? 1.4 : sp === 1 ? 1.6 : 3.2;
    const wins = sp === 0 ? [-6.2, 2.4] : sp === 1 ? [-7.4, -3.2, 1.0, 5.2] : [-8.4, -3.2, 2.0, 7.2];
    wins.forEach((x) => {
      const fr = new THREE.Group(); fr.position.set(x, winY, B.z0 + 0.005); g.add(fr);
      mesh(bx(winW, winH, 0.04), MAT.winGlass, 0, 0, 0.0, fr, false, false);
      const fm = sp === 0 ? std(0xe8e2d4, 0.6, 0) : MAT.darkSteel;
      mesh(bx(winW + 0.12, 0.08, 0.08), fm, 0, winH / 2, 0.03, fr); mesh(bx(winW + 0.12, 0.1, 0.12), fm, 0, -winH / 2, 0.05, fr);
      mesh(bx(0.06, winH, 0.08), fm, -winW / 2, 0, 0.03, fr); mesh(bx(0.06, winH, 0.08), fm, winW / 2, 0, 0.03, fr);
      const nx = sp === 0 ? 1 : Math.round(winW / 0.55); for (let i = 1; i < nx; i++) mesh(bx(0.03, winH, 0.05), fm, -winW / 2 + i * winW / nx, 0, 0.03, fr);
      if (sp > 0) mesh(bx(winW, 0.03, 0.05), fm, 0, 0, 0.03, fr);
    });
    // branded sign
    const sign = sp === 0 ? signboard('RENTED SHED', 'GUNVORA · FACTORY KINGDOM', 3.2, 0.62, { s1: 70, s2: 34, bg: '#2a2017', c2: '#e2b04a' })
      : sp === 1 ? signboard('GUNVORA WORKSHOP', 'FACTORY KINGDOM · EST. 2026', 4.2, 0.8, { s1: 76, s2: 34, bg: '#14213d', stripe: '#e56f17' })
      : signboard('GUNVORA', 'FACTORY KINGDOM · PLANT 01', 6.2, 1.1, { s1: 120, s2: 40, bg: '#1e1b4b', stripe: '#f97316', glow: true });
    sign.position.set(sp === 2 ? -0.6 : -2.0, sp === 0 ? 2.75 : sp === 1 ? 4.0 : 6.6, B.z0 + 0.03); g.add(sign);
    // wall lamps / high-bay lights
    const lampXs = sp === 0 ? [-3.5, 5.5] : sp === 1 ? [-5.4, -1.2, 3.0, 7.2] : [-6.8, -2.3, 2.2, 6.7];
    lampXs.forEach((x) => {
      const l = prep('lamp', { height: sp === 2 ? 1.0 : 0.75 }); const b = new THREE.Box3().setFromObject(l);
      l.position.set(x, B.h - 0.25 - b.max.y, B.z0 + 0.95); g.add(l);
      mesh(bx(0.06, 0.06, 0.95), MAT.darkSteel, x, B.h - 0.25, B.z0 + 0.48, g);
      l.traverse((c) => { if (c.isMesh) c.castShadow = false; });
      mesh(new THREE.CircleGeometry(0.2, 16), MAT.lampOn, x, B.h - 0.25 - (b.max.y - b.min.y) + 0.02, B.z0 + 0.95, g, false, false).rotation.x = Math.PI / 2;
    });
    // safety + realism props along the walls
    const ext = prep('extinguisher', { height: 0.62, ground: true }); ext.position.set(B.x0 + 0.35, 0.3, B.z0 + 1.0); g.add(ext);
    const pb = prep('power_box', { height: 0.5 }); pb.position.set(B.x0 + 0.08, 1.5, B.z0 + 2.2); pb.rotation.y = Math.PI / 2; g.add(pb);
    if (sp >= 1) {
      const sh = prep('shutter', { length: sp === 2 ? 4.2 : 3.0, ground: true }); sh.position.set(sp === 2 ? 3.2 : 3.0, 0, B.z0 + 0.02); g.add(sh);
      const tc = prep('tool_chest', { height: 0.95, ground: true }); tc.position.set(B.x0 + 0.5, 0, -0.2); tc.rotation.y = Math.PI / 2; g.add(tc);
      const wc = prep('welding_cart', { height: 1.1, ground: true }); wc.position.set(-1.9, 0, B.z0 + 0.9); g.add(wc);
    }
    if (sp === 0) { const ht = prep('hand_truck', { height: 1.2, ground: true }); ht.position.set(-1.8, 0, B.z0 + 0.5); ht.rotation.y = 0.4; g.add(ht); }
    // floor markings: walkway lines and the dock threshold
    const lineMat = std(0xe9b80b, 0.65, 0);
    if (sp >= 1) {
      [wz(196), wz(106)].forEach((z) => { const l = mesh(new THREE.PlaneGeometry(W - 1.2, 0.09), lineMat, cx, 0.006, z, g, false, true); l.rotation.x = -Math.PI / 2; });
      [wz(286)].forEach((z) => { const l = mesh(new THREE.PlaneGeometry(W - 1.2, 0.09), lineMat, cx, 0.006, z, g, false, true); l.rotation.x = -Math.PI / 2; });
    }
    const thr = mesh(new THREE.PlaneGeometry(B.x1 - doorX0, 0.22), MAT.hazard, (B.x1 + doorX0) / 2, 0.007, B.z1 + 0.05, g, false, true); thr.rotation.x = -Math.PI / 2;
    MAT.hazard.map.repeat.set(4, 1);
    // dock apron between building and road
    mesh(boxW(B.x1 - doorX0 + 0.6, 0.06, 5.25 - B.z1, 3), MAT.concrete, (B.x1 + doorX0) / 2, 0.0, (B.z1 + 5.4) / 2 + 0.1, g, false, true);
    // overhead crane + steel chimney + skylight band for the factory
    if (sp === 2) {
      const cr = prep('crane', { length: D - 0.4 }); const cb = new THREE.Box3().setFromObject(cr);
      cr.rotation.y = Math.PI / 2; cr.position.set(B.x0 + 2.6, B.h - 0.4 - cb.max.y, cz); g.add(cr);
      cr.traverse((c) => { if (c.isMesh) c.castShadow = false; });
      const ch = new THREE.Group(); ch.position.set(B.x0 + 1.2, 0, B.z0 - 1.0); g.add(ch);
      mesh(cy(0.35, 0.42, 11, 18), MAT.galv, 0, 5.5, 0, ch); mesh(cy(0.45, 0.45, 0.3, 18), MAT.darkSteel, 0, 10.8, 0, ch);
      smokeEmitters.push({ x: B.x0 + 1.2, y: 11.2, z: B.z0 - 1.0, rate: 3, kind: 'chimney' });
      const fl = (x, z) => { const f = prep('fluoro', { length: 1.3 }); f.position.set(x, B.h - 0.1, z); g.add(f); f.traverse((c) => { if (c.isMesh) c.castShadow = false; }); };
      void fl;
      // office block (mezzanine) at the back right
      const of = new THREE.Group(); of.position.set(8.6, 0, B.z0 + 1.0); g.add(of);
      mesh(boxW(4.6, 2.8, 1.8, 2.5), MAT.cabinet, 0, 1.4, 0, of); mesh(bx(4.7, 0.12, 1.9), MAT.paintDark, 0, 2.86, 0, of);
      mesh(bx(3.4, 0.9, 0.04), MAT.winGlass, -0.2, 1.7, 0.91, of, false, false);
      mesh(bx(4.8, 0.05, 2.0), MAT.galv, 0, 3.6, 0, of); for (let i = 0; i < 9; i++) mesh(cy(0.02, 0.02, 1.0, 6), MAT.paintYellow, -2.35 + i * 0.58, 4.1, 0.98, of);
      mesh(bx(4.8, 0.04, 0.04), MAT.paintYellow, 0, 4.6, 0.98, of);
    }
    if (sp === 1) {
      const ch = new THREE.Group(); ch.position.set(B.x1 - 1.0, 0, B.z0 - 0.7); g.add(ch);
      mesh(boxW(0.8, 7.2, 0.8, 2.2), MAT.brick, 0, 3.6, 0, ch); mesh(bx(0.95, 0.15, 0.95), MAT.concrete, 0, 7.25, 0, ch);
      smokeEmitters.push({ x: B.x1 - 1.0, y: 7.4, z: B.z0 - 0.7, rate: 2, kind: 'chimney' });
    }
    // planned-expansion plot in front of the shed
    if (sp === 0) {
      const plot = new THREE.Group(); g.add(plot);
      mesh(boxW(13.4, 0.05, 4.4, 3), MAT.concrete, -2.6, 0.0, 3.0, plot, false, true);
      for (let i = 0; i < 6; i++) { const b = new THREE.Group(); b.position.set(-8.8 + i * 2.5, 0, 5.05); plot.add(b); mesh(bx(1.9, 0.22, 0.05), MAT.hazard, 0, 0.85, 0, b); mesh(bx(0.05, 0.95, 0.05), MAT.white, -0.85, 0.47, 0, b); mesh(bx(0.05, 0.95, 0.05), MAT.white, 0.85, 0.47, 0, b); mesh(bx(0.35, 0.06, 0.35), MAT.paintDark, -0.85, 0.03, 0, b); mesh(bx(0.35, 0.06, 0.35), MAT.paintDark, 0.85, 0.03, 0, b); }
      const sb = signboard('PLANNED WORKSHOP', 'EXPANSION · UNLOCKS AT LEVEL 4', 2.6, 0.9, { s1: 92, s2: 44, bg: '#f4f4f0', c1: '#1f2937', c2: '#c2410c' });
      sb.position.set(-2.6, 1.55, 4.6); plot.add(sb); mesh(bx(0.06, 1.6, 0.06), MAT.galv, -3.7, 0.8, 4.57, plot); mesh(bx(0.06, 1.6, 0.06), MAT.galv, -1.5, 0.8, 4.57, plot);
    }
    g.traverse((c) => { if (c.isMesh && c.material === MAT.winGlass) c.castShadow = false; });
    staticBatch(g);
    return g;
  }
  let smokeEmitters = [];

  /* ---------- machines: T1 bench press, T2 hydraulic press, T3 CNC centre, T4 robot cell ---------- */
  function stackLight(parent, x, y, z) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    mesh(cy(0.012, 0.012, 0.25, 6), MAT.darkSteel, 0, 0.125, 0, g);
    const cols = [0xd11a1a, 0xf0a500, 0x16a34a], lamps = [];
    cols.forEach((c, i) => { const m = std(c, 0.3, 0, { emissive: c, emissiveIntensity: 0.05, transparent: true, opacity: 0.92 }); lamps.push(mesh(cy(0.045, 0.045, 0.075, 12), m, 0, 0.29 + (2 - i) * 0.08, 0, g, false, false)); });
    mesh(cy(0.047, 0.047, 0.02, 12), MAT.black, 0, 0.53, 0, g);
    return { red: lamps[0], amber: lamps[1], green: lamps[2] };
  }
  function plateLabel(text, w, h) {
    const t = signTex([{ t: text, s: 72, y: 0.52, c: '#f5f5f5' }], { w: 256, h: 128, bg: '#1b1f24', border: '#9aa3ab' });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), std(0xffffff, 0.4, 0.3, { map: t }));
  }
  function floorZone(parent, w, d) {
    const g = new THREE.Group(); parent.add(g);
    const mk = (pw, pd, x, z, rot) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(pw, pd), MAT.hazard); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.008, z); if (rot) m.rotation.z = rot; m.receiveShadow = true; g.add(m); };
    const b = 0.08; mk(w, b, 0, -d / 2); mk(w, b, 0, d / 2); mk(d, b, -w / 2, 0, Math.PI / 2); mk(d, b, w / 2, 0, Math.PI / 2);
    return g;
  }
  function buildMachine(m) {
    const g = new THREE.Group(), tier = m.tier, A = { tier };
    blobShadow(g, 3.1, 2.3, 0, 0, 0.7);
    floorZone(g, 2.9, 2.1);
    A.work = new THREE.Group(); g.add(A.work);
    if (tier === 0) {
      // steel workbench with a wooden top, small C-frame press and a bench drill
      mesh(bx(2.1, 0.06, 1.0), MAT.wood, 0, 0.9, 0, g);
      [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]].forEach(([x, z]) => mesh(bx(0.05, 0.87, 0.05), MAT.paintGreen, x, 0.435, z, g));
      mesh(boxW(2.0, 0.03, 0.9, 1), MAT.plate, 0, 0.2, 0, g);
      mesh(bx(2.05, 0.05, 0.04), MAT.paintGreen, 0, 0.85, 0.47, g); mesh(bx(2.05, 0.05, 0.04), MAT.paintGreen, 0, 0.85, -0.47, g);
      const pr = new THREE.Group(); pr.position.set(-0.35, 0.93, -0.05); g.add(pr);
      mesh(bx(0.55, 0.08, 0.5, 0.015), MAT.paintGreen, 0, 0.04, 0, pr);
      mesh(bx(0.2, 0.95, 0.2, 0.02), MAT.paintGreen, 0, 0.5, -0.17, pr);
      mesh(bx(0.34, 0.26, 0.46, 0.03), MAT.paintGreen, 0, 0.95, -0.04, pr);
      mesh(cy(0.1, 0.1, 0.22, 16), MAT.darkSteel, 0, 1.18, -0.2, pr).rotation.x = Math.PI / 2;
      A.ram = mesh(cy(0.035, 0.035, 0.36, 12), MAT.chrome, 0, 0.66, 0.06, pr); A.ramY = 0.66; A.stroke = 0.16;
      mesh(cy(0.06, 0.06, 0.04, 12), MAT.darkSteel, 0, -0.18, 0, A.ram);
      A.wheel = new THREE.Group(); A.wheel.position.set(0.21, 0.95, 0.05); pr.add(A.wheel);
      const tor = mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24), MAT.chrome, 0, 0, 0, A.wheel); tor.rotation.y = Math.PI / 2;
      for (let i = 0; i < 3; i++) { const sp = mesh(cy(0.008, 0.008, 0.3, 5), MAT.chrome, 0, 0, 0, A.wheel); sp.rotation.x = i * Math.PI / 3; }
      const dp = prep('drill_press', { height: 0.85, ground: true }); dp.position.set(0.65, 0.93, -0.1); g.add(dp);
      A.work.position.set(-0.35, 1.0, 0.03);
      stackLight(g, -0.95, 0.93, -0.4); A.light = g.children[g.children.length - 1];
      A.label = plateLabel('M' + (m.id + 1), 0.22, 0.11); A.label.position.set(-0.6, 0.6, 0.48); g.add(A.label);
    } else if (tier === 1) {
      // floor-standing hydraulic H-frame press with power pack and light curtains
      mesh(bx(1.7, 0.55, 1.15, 0.03), MAT.paintBlue, 0, 0.275, 0, g);
      mesh(boxW(1.3, 0.06, 0.95, 0.6), MAT.plate, 0, 0.58, 0, g);
      [-0.68, 0.68].forEach((x) => { mesh(cy(0.075, 0.075, 1.8, 18), MAT.chrome, x, 1.45, -0.32, g); mesh(cy(0.075, 0.075, 1.8, 18), MAT.chrome, x, 1.45, 0.32, g); });
      mesh(bx(1.8, 0.5, 1.15, 0.04), MAT.paintBlue, 0, 2.5, 0, g);
      mesh(cy(0.24, 0.24, 0.5, 20), MAT.darkSteel, 0, 2.95, 0, g);
      A.rod = mesh(cy(0.08, 0.08, 1.0, 16), MAT.chrome, 0, 1.95, 0, g);
      A.ram = mesh(bx(1.25, 0.28, 0.85, 0.03), MAT.paintBlue, 0, 2.0, 0, g); A.ramY = 2.0; A.stroke = 1.12;
      mesh(bx(1.0, 0.04, 0.7), MAT.steel, 0, -0.16, 0, A.ram);
      const pp = new THREE.Group(); pp.position.set(1.25, 0, -0.1); g.add(pp);
      mesh(bx(0.55, 0.85, 0.75, 0.03), MAT.paintGrey, 0, 0.425, 0, pp); mesh(cy(0.14, 0.14, 0.4, 16), MAT.paintBlue, 0, 0.98, 0, pp).rotation.z = Math.PI / 2;
      mesh(bx(0.3, 0.42, 0.06), MAT.cabinet, 0, 1.25, 0.32, pp);
      [-0.8, 0.8].forEach((x) => { mesh(bx(0.06, 1.3, 0.06), MAT.paintYellow, x, 0.65, 0.62, g); mesh(bx(0.02, 1.1, 0.02), std(0x330000, 0.3, 0, { emissive: 0xff2200, emissiveIntensity: 0.6 }), x * 0.96, 0.75, 0.62, g, false, false); });
      const cp = new THREE.Group(); cp.position.set(-0.55, 0, -0.85); g.add(cp);
      mesh(cy(0.04, 0.04, 1.0, 8), MAT.darkSteel, 0, 0.5, 0, cp); mesh(bx(0.42, 0.24, 0.14, 0.02), MAT.paintYellow, 0, 1.08, 0, cp);
      mesh(cy(0.035, 0.035, 0.03, 12), std(0xd11a1a, 0.4, 0), -0.12, 1.08, 0.08, cp).rotation.x = Math.PI / 2; mesh(cy(0.035, 0.035, 0.03, 12), std(0x16a34a, 0.4, 0), 0.12, 1.08, 0.08, cp).rotation.x = Math.PI / 2;
      A.work.position.set(0, 0.62, 0);
      stackLight(g, -0.75, 2.75, 0.4); A.light = g.children[g.children.length - 1];
      A.label = plateLabel('M' + (m.id + 1) + ' · T2', 0.4, 0.17); A.label.position.set(0, 2.5, 0.58); g.add(A.label);
    } else if (tier === 2) {
      // enclosed CNC machining centre with glass door, moving spindle and chip conveyor
      const C = MAT.cabinet;
      mesh(bx(2.3, 0.9, 1.5, 0.04), C, 0, 0.45, 0, g);
      mesh(bx(2.3, 1.25, 0.08), C, 0, 1.52, -0.71, g);
      mesh(bx(0.1, 1.25, 1.5), C, -1.1, 1.52, 0, g); mesh(bx(0.1, 1.25, 1.5), C, 1.1, 1.52, 0, g);
      mesh(bx(2.3, 0.14, 1.5, 0.03), C, 0, 2.2, 0, g);
      mesh(bx(2.32, 0.18, 0.04), MAT.indigo, 0, 2.05, 0.76, g);
      mesh(bx(1.5, 1.0, 0.03), MAT.glass, -0.1, 1.45, 0.74, g, false, false);
      mesh(bx(1.56, 0.05, 0.05), MAT.darkSteel, -0.1, 1.97, 0.75, g); mesh(bx(1.56, 0.05, 0.05), MAT.darkSteel, -0.1, 0.93, 0.75, g);
      mesh(bx(0.42, 1.0, 0.04), C, 0.86, 1.45, 0.73, g);
      mesh(boxW(1.4, 0.06, 0.8, 0.6), MAT.steel, -0.1, 0.93, 0.05, g);
      A.head = new THREE.Group(); A.head.position.set(0, 1.75, 0.0); g.add(A.head);
      mesh(bx(0.32, 0.5, 0.36, 0.02), MAT.paintDark, 0, 0.1, 0, A.head);
      A.spindle = mesh(cy(0.05, 0.03, 0.3, 12), MAT.chrome, 0, -0.27, 0, A.head);
      mesh(bx(2.0, 0.08, 0.1), MAT.darkSteel, 0, 2.0, -0.2, g);
      mesh(bx(1.8, 0.03, 0.03), std(0xffffff, 0.3, 0, { emissive: 0xe8f4ff, emissiveIntensity: 1.6 }), -0.1, 2.08, 0.55, g, false, false);
      const pn = new THREE.Group(); pn.position.set(1.32, 1.45, 0.55); pn.rotation.y = -0.5; g.add(pn);
      mesh(bx(0.42, 0.62, 0.1, 0.02), MAT.paintDark, 0, 0, 0, pn);
      const scr = mesh(new THREE.PlaneGeometry(0.34, 0.22), MAT.screen, 0, 0.13, 0.052, pn, false, false); void scr;
      for (let i = 0; i < 12; i++) mesh(bx(0.05, 0.035, 0.012), MAT.cabinet, -0.13 + (i % 4) * 0.087, -0.06 - Math.floor(i / 4) * 0.06, 0.052, pn, false, false);
      const cc = new THREE.Group(); cc.position.set(-1.45, 0, 0.25); g.add(cc);
      const ramp = mesh(bx(0.38, 0.12, 1.0), MAT.paintDark, 0, 0.75, 0, cc); ramp.rotation.x = 0.0; ramp.rotation.z = 0.0;
      mesh(bx(0.5, 0.42, 0.5, 0.03), MAT.paintOrange, -0.05, 0.21, 0.45, cc);
      A.work.position.set(-0.1, 0.98, 0.05);
      stackLight(g, 0.85, 2.27, -0.5); A.light = g.children[g.children.length - 1];
      A.label = plateLabel('M' + (m.id + 1) + ' · CNC T3', 0.5, 0.18); A.label.position.set(-0.1, 0.62, 0.76); g.add(A.label);
    } else {
      // robot cell: 6-axis arm on a pedestal, infeed table, compact press, mesh guarding
      mesh(boxW(2.7, 0.05, 1.9, 1), MAT.plate, 0, 0.025, 0, g, false, true);
      const posts = [[-1.35, -0.95], [1.35, -0.95], [-1.35, 0.95], [1.35, 0.95]];
      posts.forEach(([x, z]) => mesh(bx(0.06, 1.7, 0.06), MAT.paintYellow, x, 0.85, z, g));
      const panel = (w, x, z, ry) => { const p = mesh(new THREE.PlaneGeometry(w, 1.4), MAT.fence, x, 0.9, z, g, true, false); p.rotation.y = ry; };
      panel(2.7, 0, -0.95, 0); panel(1.9, -1.35, 0, Math.PI / 2); panel(1.9, 1.35, 0, Math.PI / 2);
      mesh(bx(2.72, 0.04, 0.04), MAT.paintYellow, 0, 1.62, -0.95, g); mesh(bx(0.04, 0.04, 1.9), MAT.paintYellow, -1.35, 1.62, 0, g); mesh(bx(0.04, 0.04, 1.9), MAT.paintYellow, 1.35, 1.62, 0, g);
      mesh(bx(0.7, 0.8, 0.6, 0.02), MAT.steel, -0.8, 0.4, 0.15, g); mesh(boxW(0.72, 0.03, 0.62, 0.5), MAT.plate, -0.8, 0.815, 0.15, g);
      const pr = new THREE.Group(); pr.position.set(0.85, 0, 0.1); g.add(pr);
      mesh(bx(0.7, 1.0, 0.7, 0.03), MAT.paintGrey, 0, 0.5, 0, pr); mesh(bx(0.7, 0.35, 0.7, 0.03), MAT.paintGrey, 0, 1.75, 0, pr);
      [-0.3, 0.3].forEach((x) => mesh(cy(0.04, 0.04, 0.8, 10), MAT.chrome, x, 1.35, 0, pr));
      A.ram = mesh(bx(0.5, 0.15, 0.5, 0.02), MAT.paintDark, 0, 1.45, 0, pr); A.ramY = 1.45; A.stroke = 0.32;
      // the robot
      const R = A.robot = {}; const base = new THREE.Group(); base.position.set(0, 0, -0.25); g.add(base);
      mesh(cy(0.26, 0.3, 0.42, 20), MAT.paintDark, 0, 0.21, 0, base);
      R.j1 = new THREE.Group(); R.j1.position.y = 0.42; base.add(R.j1);
      mesh(cy(0.24, 0.24, 0.24, 20), MAT.paintOrange, 0, 0.12, 0, R.j1);
      R.j2 = new THREE.Group(); R.j2.position.set(0, 0.36, 0); R.j1.add(R.j2);
      mesh(cy(0.13, 0.13, 0.38, 16), MAT.paintOrange, 0, 0, 0, R.j2).rotation.z = Math.PI / 2;
      mesh(bx(0.2, 0.9, 0.22, 0.05), MAT.paintOrange, 0.0, 0.42, 0, R.j2);
      R.j3 = new THREE.Group(); R.j3.position.set(0, 0.86, 0); R.j2.add(R.j3);
      mesh(cy(0.11, 0.11, 0.3, 16), MAT.paintOrange, 0, 0, 0, R.j3).rotation.z = Math.PI / 2;
      mesh(bx(0.16, 0.16, 0.78, 0.04), MAT.paintOrange, 0, 0.0, 0.36, R.j3);
      mesh(cy(0.07, 0.07, 0.24, 12), MAT.darkSteel, 0, 0.0, -0.12, R.j3).rotation.x = Math.PI / 2;
      R.j5 = new THREE.Group(); R.j5.position.set(0, 0, 0.78); R.j3.add(R.j5);
      mesh(cy(0.06, 0.06, 0.16, 12), MAT.darkSteel, 0, 0, 0, R.j5).rotation.z = Math.PI / 2;
      mesh(cy(0.05, 0.05, 0.12, 12), MAT.steel, 0, -0.1, 0, R.j5);
      R.f1 = mesh(bx(0.02, 0.1, 0.05), MAT.steel, -0.05, -0.2, 0, R.j5); R.f2 = mesh(bx(0.02, 0.1, 0.05), MAT.steel, 0.05, -0.2, 0, R.j5);
      R.grip = new THREE.Group(); R.grip.position.set(0, -0.28, 0); R.j5.add(R.grip);
      A.work.position.set(0.85, 1.02, 0.1);
      A.infeed = new THREE.Group(); A.infeed.position.set(-0.8, 0.83, 0.15); g.add(A.infeed);
      const hmi = new THREE.Group(); hmi.position.set(-1.0, 0, -1.25); g.add(hmi);
      mesh(cy(0.04, 0.04, 1.0, 8), MAT.darkSteel, 0, 0.5, 0, hmi); mesh(bx(0.4, 0.3, 0.08, 0.02), MAT.paintDark, 0, 1.12, 0, hmi);
      mesh(new THREE.PlaneGeometry(0.32, 0.2), MAT.screen, 0, 1.13, -0.045, hmi, false, false).rotation.y = Math.PI;
      stackLight(g, 1.3, 1.64, -0.92); A.light = g.children[g.children.length - 1];
      A.label = plateLabel('M' + (m.id + 1) + ' · ROBOT T4', 0.56, 0.18); A.label.position.set(0, 0.3, 0.97); g.add(A.label);
    }
    // stack light handles
    const L = A.light; const lamps = []; L.traverse((c) => { if (c.isMesh && c.material.emissive && c.geometry.parameters && c.geometry.parameters.height === 0.075) lamps.push(c); });
    A.lamps = { red: lamps[0], amber: lamps[1], green: lamps[2] };
    // finished-parts tote at the front right (used when there are no conveyors)
    A.tote = new THREE.Group(); A.tote.position.set(1.45, 0, 1.1); g.add(A.tote);
    mesh(bx(0.62, 0.36, 0.44, 0.02), std(0x2456a6, 0.55, 0), 0, 0.18 + 0.12, 0, A.tote);
    mesh(bx(0.66, 0.12, 0.48), MAT.darkSteel, 0, 0.06, 0, A.tote);
    A.toteItems = [];
    // invisible pick volume
    const pick = mesh(bx(2.9, 2.6, 2.3), MAT.pick, 0, 1.3, 0.2, g, false, false); pick.userData.pick = { k: 'machine', id: m.id };
    g.userData.A = A;
    return g;
  }

  /* ---------- workers: CC0 rigged characters with walk / idle / work animations ---------- */
  const SKIN = [0x8d5a3b, 0xa86f4c, 0x7a4a2e, 0xb98160, 0x6e4128, 0x9c6644];
  const PANTS = [0x2f3b52, 0x3b3f44, 0x23324a, 0x4a3f35];
  function makeWorker(w) {
    const src = (w.id % 2 ? G.worker_f : G.worker_m);
    const root = SkeletonUtils.clone(src.scene);
    root.scale.setScalar(0.94);
    root.traverse((c) => {
      if (!c.isMesh) return;
      c.castShadow = true; c.receiveShadow = true; c.frustumCulled = false;
      const mats = Array.isArray(c.material) ? c.material : [c.material];
      const nm = mats.map((m0) => {
        const m = m0.clone(); const n = (m0.name || '').toLowerCase();
        m.roughness = 0.82; m.metalness = 0;
        if (n.includes('skin')) { m.color.setHex(SKIN[w.id % SKIN.length]); m.roughness = 0.6; }
        else if (n.includes('yellow') || n.includes('helmet')) { m.color.setHex(0xf2c200); m.roughness = 0.35; }
        else if (n.includes('vest')) { m.color.setHex(w.job === 'carrier' ? 0xd7f205 : 0xff6a13); m.emissive = new THREE.Color(m.color).multiplyScalar(0.05); }
        else if (n.includes('grey') || n.includes('gray') || n.includes('blue')) m.color.setHex(PANTS[w.id % PANTS.length]);
        else if (n.includes('brown')) m.color.multiplyScalar(0.85);
        return m;
      });
      c.material = Array.isArray(c.material) ? nm : nm[0];
    });
    const mixer = new THREE.AnimationMixer(root), acts = {};
    src.animations.forEach((a) => { acts[a.name] = mixer.clipAction(a); });
    const o = { root, mixer, acts, cur: null, vest: null, carryBox: null, x: wx(w.x), z: wz(w.y), rot: 0 };
    root.traverse((c) => { if (c.isMesh) { const ms = Array.isArray(c.material) ? c.material : [c.material]; ms.forEach((m) => { if ((m.name || '').toLowerCase().includes('vest')) o.vest = m; }); } });
    o.carryBox = cardBox('toy'); o.carryBox.scale.multiplyScalar(0.9); o.carryBox.position.set(0, 1.0, 0.32); o.carryBox.visible = false; root.add(o.carryBox);
    o.shadow = blobShadow(root, 0.9, 0.9, 0, 0, 0.5);
    play(o, 'Idle');
    scene.add(root);
    return o;
  }
  function play(o, name, ts) {
    const a = o.acts[name]; if (!a) return;
    if (ts != null) a.timeScale = ts;
    if (o.cur === name) return;
    const prev = o.cur ? o.acts[o.cur] : null;
    a.reset().setEffectiveWeight(1).fadeIn(0.22).play();
    if (prev) prev.fadeOut(0.22);
    o.cur = name;
  }

  /* ---------- vehicles: hand cart + courier, box truck, rigid truck ---------- */
  function wheel(parent, x, y, z, r, w) {
    const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
    mesh(cy(r, r, w, 20), MAT.rubber, 0, 0, 0, g).rotation.x = Math.PI / 2;
    mesh(cy(r * 0.58, r * 0.58, w + 0.01, 14), MAT.steel, 0, 0, 0, g).rotation.x = Math.PI / 2;
    return g;
  }
  const livery = signTex([{ t: 'GUNVORA', s: 150, y: 0.42, c: '#1e1b4b', w: 900 }, { t: 'FACTORY KINGDOM · LOGISTICS', s: 46, y: 0.78, c: '#e56f17', w: 700 }], { w: 1024, h: 340, bg: '#f4f5f6', stripe: '#3b3fbf' });
  function buildTruck(big) {
    const g = new THREE.Group(), A = { wheels: [] }, L = big ? 6.6 : 5.2, boxL = big ? 4.6 : 3.3, H = big ? 2.6 : 2.25;
    const cabX = L / 2 - 0.85;
    const paint = std(0xf4f5f6, 0.32, 0.25), cab = std(0x2c2f8f, 0.3, 0.45);
    mesh(bx(L - 0.3, 0.22, 1.0), MAT.darkSteel, 0, 0.62, 0, g);
    // cab (cab-over), windscreen, lights, mirrors, bumper
    mesh(bx(1.5, 1.6, 2.1, 0.12), cab, cabX, 1.55, 0, g);
    mesh(bx(0.04, 0.7, 1.86), MAT.winGlass, cabX + 0.76, 1.95, 0, g, false, false);
    mesh(bx(1.0, 0.55, 0.03), MAT.winGlass, cabX + 0.05, 1.95, 1.05, g, false, false);
    mesh(bx(1.0, 0.55, 0.03), MAT.winGlass, cabX + 0.05, 1.95, -1.05, g, false, false);
    mesh(bx(0.2, 0.3, 2.14, 0.04), MAT.paintDark, cabX + 0.72, 0.8, 0, g);
    [-0.75, 0.75].forEach((z) => mesh(bx(0.05, 0.14, 0.32), std(0xffffff, 0.2, 0, { emissive: 0xfff6dd, emissiveIntensity: 1.2 }), cabX + 0.77, 1.05, z, g, false, false));
    [-1.12, 1.12].forEach((z) => { mesh(bx(0.05, 0.3, 0.14), MAT.black, cabX + 0.55, 2.1, z * 1.03, g); });
    // cargo box with GUNVORA livery and a roller door at the rear
    const box = mesh(bx(boxL, H, 2.2, 0.04), paint, cabX - 0.85 - boxL / 2, 0.75 + H / 2, 0, g);
    const lv = new THREE.MeshStandardMaterial({ map: livery, roughness: 0.4, metalness: 0.1 });
    const s1 = mesh(new THREE.PlaneGeometry(boxL * 0.86, boxL * 0.86 * 340 / 1024), lv, box.position.x, 0.75 + H * 0.58, 1.102, g, false, false); void s1;
    const s2 = mesh(new THREE.PlaneGeometry(boxL * 0.86, boxL * 0.86 * 340 / 1024), lv, box.position.x, 0.75 + H * 0.58, -1.102, g, false, false); s2.rotation.y = Math.PI;
    A.door = mesh(bx(0.03, H - 0.1, 2.0), std(0xd6d9dc, 0.4, 0.5), box.position.x - boxL / 2 - 0.02, 0.75 + H / 2, 0, g);
    A.doorH = H - 0.1; A.doorBaseY = 0.75 + H / 2;
    A.cargo = new THREE.Group(); A.cargo.position.set(box.position.x - boxL / 2 + 0.7, 0.9, 0); g.add(A.cargo);
    const p = pallet(); p.scale.set(0.9, 1, 0.9); A.cargo.add(p);
    for (let i = 0; i < 6; i++) { const b = cardBox('toy'); b.position.set(-0.3 + (i % 2) * 0.55, 0.15 + Math.floor(i / 4) * 0.3, -0.2 + (Math.floor(i / 2) % 2) * 0.4); A.cargo.add(b); }
    A.cargo.visible = false;
    const axles = big ? [cabX - 0.1, -L / 2 + 1.3, -L / 2 + 2.3] : [cabX - 0.1, -L / 2 + 1.1];
    axles.forEach((x) => { [-0.92, 0.92].forEach((z) => A.wheels.push(wheel(g, x, 0.45, z, 0.45, 0.32))); });
    blobShadow(g, L + 0.6, 2.8, 0, 0, 0.75);
    g.traverse((c) => { if (c.isMesh && c.material === MAT.winGlass) c.castShadow = false; });
    g.userData.A = A; g.userData.len = L;
    return g;
  }
  function buildCart() {
    const g = new THREE.Group(), A = { wheels: [] };
    mesh(boxW(1.3, 0.06, 0.75, 0.8), MAT.plate, 0, 0.28, 0, g);
    mesh(bx(1.32, 0.05, 0.05), MAT.paintBlue, 0, 0.25, 0.37, g); mesh(bx(1.32, 0.05, 0.05), MAT.paintBlue, 0, 0.25, -0.37, g);
    const h = new THREE.Group(); h.position.set(-0.64, 0.3, 0); g.add(h);
    [-0.3, 0.3].forEach((z) => mesh(cy(0.016, 0.016, 0.85, 8), MAT.paintBlue, 0, 0.42, z, h));
    mesh(cy(0.018, 0.018, 0.64, 8), MAT.rubber, 0, 0.84, 0, h).rotation.x = Math.PI / 2;
    [[-0.5, 0.3], [-0.5, -0.3], [0.5, 0.3], [0.5, -0.3]].forEach(([x, z]) => A.wheels.push(wheel(g, x, 0.11, z, 0.1, 0.05)));
    A.cargo = new THREE.Group(); A.cargo.position.y = 0.31; g.add(A.cargo);
    for (let i = 0; i < 4; i++) { const b = cardBox('toy'); b.position.set(-0.28 + (i % 2) * 0.5, Math.floor(i / 2) * 0.3, (i % 2 ? 0.12 : -0.12)); A.cargo.add(b); }
    A.cargo.visible = false;
    A.courier = makeWorker({ id: 7, x: 0, y: 0, job: 'courier' }); scene.remove(A.courier.root);
    A.courier.root.position.set(-1.05, 0, 0); A.courier.root.rotation.y = Math.PI / 2; g.add(A.courier.root);
    blobShadow(g, 1.8, 1.1, 0, 0, 0.6);
    g.userData.A = A; g.userData.len = 1.6;
    return g;
  }

  /* ---------- forklift (delivers raw material when you buy it) ---------- */
  function buildForklift() {
    const g = new THREE.Group(), A = { wheels: [] };
    mesh(bx(1.6, 0.55, 1.05, 0.06), MAT.paintYellow, -0.05, 0.55, 0, g);
    mesh(bx(0.5, 0.75, 1.0, 0.08), MAT.paintDark, -0.75, 0.75, 0, g);
    mesh(bx(0.35, 0.1, 0.4, 0.03), MAT.black, -0.2, 0.9, 0, g);
    mesh(bx(0.3, 0.45, 0.08), MAT.black, -0.4, 1.1, 0, g);
    [[-0.55, 0.45], [-0.55, -0.45], [0.45, 0.45], [0.45, -0.45]].forEach(([x, z]) => mesh(cy(0.025, 0.025, 1.45, 6), MAT.paintDark, x, 1.55, z, g));
    mesh(bx(1.1, 0.05, 1.0), MAT.paintDark, -0.05, 2.28, 0, g);
    const mast = new THREE.Group(); mast.position.set(0.82, 0, 0); g.add(mast);
    [-0.32, 0.32].forEach((z) => mesh(bx(0.08, 2.1, 0.1), MAT.darkSteel, 0, 1.1, z, mast));
    A.fork = new THREE.Group(); A.fork.position.set(0.08, 0.12, 0); mast.add(A.fork);
    mesh(bx(0.06, 0.55, 0.85), MAT.darkSteel, 0, 0.27, 0, A.fork);
    [-0.25, 0.25].forEach((z) => mesh(bx(1.0, 0.04, 0.1), MAT.darkSteel, 0.52, 0.0, z, A.fork));
    A.load = new THREE.Group(); A.load.position.set(0.55, 0.03, 0); A.fork.add(A.load);
    [[0.42, 0.5], [-0.5, 0.5], [0.42, -0.5], [-0.5, -0.5]].forEach(([x, z]) => A.wheels.push(wheel(g, x, 0.25, z * 1.0, 0.25, 0.2)));
    mesh(bx(0.08, 0.08, 0.08), std(0xff8800, 0.3, 0, { emissive: 0xff7a00, emissiveIntensity: 1.5 }), -0.3, 2.34, 0, g, false, false);
    A.driver = makeWorker({ id: 4, x: 0, y: 0, job: 'carrier' }); scene.remove(A.driver.root);
    A.driver.root.position.set(-0.45, 0.33, 0); A.driver.root.rotation.y = Math.PI / 2; A.driver.root.scale.setScalar(0.86); g.add(A.driver.root);
    blobShadow(g, 2.6, 1.6, 0.1, 0, 0.6);
    g.userData.A = A;
    return g;
  }
  const forklift = buildForklift(); scene.add(forklift); forklift.visible = false;
  const fkQueue = []; let fkTrip = null;

  /* ---------- particles (sparks / smoke / dust / debris) ---------- */
  const PMAX = 600;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pSize = new Float32Array(PMAX), pAlpha = new Float32Array(PMAX);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3)); pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1)); pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1));
  const pUniforms = { map: { value: M.spark }, scale: { value: 400 } };
  const vsh = 'attribute float size; attribute float alpha; attribute vec3 color; varying float vA; varying vec3 vC; uniform float scale; void main(){ vA=alpha; vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*scale/-mv.z; gl_Position=projectionMatrix*mv; }';
  const fsh = 'uniform sampler2D map; varying float vA; varying vec3 vC; void main(){ vec4 t=texture2D(map, gl_PointCoord); if(t.a*vA<0.01) discard; gl_FragColor=vec4(vC, t.a*vA); }';
  const addMat = new THREE.ShaderMaterial({ uniforms: pUniforms, vertexShader: vsh, fragmentShader: fsh, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const smokeGeo = pGeo.clone();
  const sPos = smokeGeo.attributes.position.array, sCol = smokeGeo.attributes.color.array, sSize = smokeGeo.attributes.size.array, sAlpha = smokeGeo.attributes.alpha.array;
  const smokeMat = new THREE.ShaderMaterial({ uniforms: pUniforms, vertexShader: vsh, fragmentShader: fsh, transparent: true, depthWrite: false });
  const sparkPts = new THREE.Points(pGeo, addMat), smokePts = new THREE.Points(smokeGeo, smokeMat);
  sparkPts.frustumCulled = false; smokePts.frustumCulled = false; sparkPts.renderOrder = 5; smokePts.renderOrder = 4;
  scene.add(sparkPts); scene.add(smokePts);
  const sparks = [], smokes = [];
  function emit(list, p) { if (list.length < PMAX) list.push(p); }
  function spark(x, y, z, n, col) { for (let i = 0; i < n; i++) emit(sparks, { x, y, z, vx: rnd(-1.6, 1.6), vy: rnd(0.5, 2.6), vz: rnd(-1.6, 1.6), life: rnd(0.25, 0.6), max: 0.6, size: rnd(0.05, 0.09), c: col || [1.0, 0.62, 0.2], g: 9.8 }); }
  function smoke(x, y, z, o = {}) { emit(smokes, { x: x + rnd(-0.1, 0.1), y, z: z + rnd(-0.1, 0.1), vx: rnd(-0.12, 0.12) + (o.wind || 0.25), vy: o.vy || rnd(0.5, 0.9), vz: rnd(-0.12, 0.12), life: o.life || rnd(1.6, 2.6), max: o.life || 2.6, size: o.size || rnd(0.5, 0.8), grow: o.grow || 0.9, c: o.c || [0.42, 0.42, 0.44], a: o.a || 0.55, g: 0 }); }
  function stepParticles(dt) {
    const run = (list, pos, col, size, alpha, isSmoke) => {
      let n = 0;
      for (let i = list.length - 1; i >= 0; i--) { const p = list[i]; p.life -= dt; if (p.life <= 0) { list.splice(i, 1); continue; } p.vy -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.02 && p.g) { p.y = 0.02; p.vy *= -0.3; p.vx *= 0.5; p.vz *= 0.5; } if (isSmoke) p.size += p.grow * dt; }
      for (const p of list) { if (n >= PMAX) break; pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z; col[n * 3] = p.c[0]; col[n * 3 + 1] = p.c[1]; col[n * 3 + 2] = p.c[2]; size[n] = p.size; const f = p.life / p.max; alpha[n] = isSmoke ? (p.a || 0.5) * Math.min(1, f * 1.5) * Math.min(1, (1 - f) * 6) : Math.min(1, f * 2); n++; }
      return n;
    };
    const n1 = run(sparks, pPos, pCol, pSize, pAlpha, false), n2 = run(smokes, sPos, sCol, sSize, sAlpha, true);
    pGeo.setDrawRange(0, n1); smokeGeo.setDrawRange(0, n2);
    ['position', 'color', 'size', 'alpha'].forEach((k) => { pGeo.attributes[k].needsUpdate = true; smokeGeo.attributes[k].needsUpdate = true; });
  }

  /* ---------- per-space layout helpers ---------- */
  const rawCols = (B) => [B.x0 + 0.95, B.x0 + 2.15];
  const rawRows = (B) => [0, 1, 2].map((i) => B.z0 + 1.15 + i * 1.4);
  const rackSpec = (sp) => sp === 0 ? { x: 8.75, z0: -5.0, bays: 2, bayL: 2.45, levels: [0.12, 1.35], h: 2.6 } : { x: 8.75, z0: -5.0, bays: 3, bayL: 2.85, levels: [0.12, 1.3, 2.45], h: 3.6 };

  /* ---------- dynamic layer (rebuilt per space): racks, raw store, conveyors, empty bays ---------- */
  let dyn = null; const pickables = [];
  const plankGeo = worldUV(new THREE.BoxGeometry(0.17, 0.065, 1.15), 0.9);
  const plankMat = std(0xc9a273, 0.78, 0, { map: T.wood_diff, normalMap: T.wood_nor });
  const sheetGeo = new THREE.BoxGeometry(1.0, 0.018, 1.15);
  const sheetMat = std(0x9aa1a8, 0.38, 0.95, { roughnessMap: T.plate_arm });
  const rollerGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.62, 10); rollerGeo.rotateX(Math.PI / 2);
  function buildDynamic(sp) {
    if (dyn) { scene.remove(dyn.g); pickables.length = 0; }
    const B = SPACES[sp], g = new THREE.Group(); scene.add(g); dyn = { g, sp };
    // ----- pallet racking (finished goods)
    const R = rackSpec(sp), rack = new THREE.Group(); g.add(rack); dyn.rack = R;
    const totalL = R.bays * R.bayL;
    for (let i = 0; i <= R.bays; i++) {
      const z = R.z0 + i * R.bayL;
      [-0.5, 0.5].forEach((dx) => { mesh(bx(0.08, R.h, 0.08), MAT.paintBlue, R.x + dx, R.h / 2, z, rack); mesh(bx(0.16, 0.02, 0.16), MAT.galv, R.x + dx, 0.01, z, rack); });
      for (let y = 0.3; y < R.h; y += 0.6) mesh(bx(1.0, 0.03, 0.03), MAT.paintBlue, R.x, y, z, rack);
    }
    R.levels.forEach((ly, li) => { if (li === 0) return; [-0.5, 0.5].forEach((dx) => mesh(bx(0.05, 0.11, totalL), MAT.paintOrange, R.x + dx, ly - 0.06, R.z0 + totalL / 2, rack)); mesh(boxW(1.0, 0.02, totalL, 1.2), MAT.galv, R.x, ly - 0.01, R.z0 + totalL / 2, rack, true, true); });
    blobShadow(rack, 1.6, totalL + 0.5, R.x, R.z0 + totalL / 2, 0.55);
    // box slots, bottom level first
    R.slots = [];
    R.levels.forEach((ly) => { for (let b = 0; b < R.bays; b++) { const n = Math.floor((R.bayL - 0.1) / 0.5); for (let k = 0; k < n; k++) [-0.24, 0.24].forEach((dx) => R.slots.push([R.x + dx, ly, R.z0 + b * R.bayL + 0.3 + k * 0.5 + 0.02])); } });
    dyn.goods = new THREE.InstancedMesh(BOX.geo, BOX.mat, R.slots.length); dyn.goods.castShadow = true; dyn.goods.receiveShadow = true; dyn.goods.count = 0; g.add(dyn.goods);
    dyn.goodsKey = '';
    dyn.shelfSign = { tex: null, mesh: null, key: '' };
    { const t = signTex([{ t: '', s: 10, y: 0.5 }], { w: 512, h: 128 }); const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), std(0xffffff, 0.5, 0.1, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 })); sm.position.set(R.x - 0.6, R.h + 0.35, R.z0 + totalL - 0.9); sm.rotation.y = -0.25; g.add(sm); mesh(bx(0.04, 0.5, 0.04), MAT.darkSteel, R.x - 0.6, R.h + 0.0, R.z0 + totalL - 0.9, g); dyn.shelfSign = { tex: t, mesh: sm, key: '' }; }
    const shelfPick = mesh(bx(2.0, R.h + 0.8, totalL + 0.6), MAT.pick, R.x - 0.2, R.h / 2, R.z0 + totalL / 2, g, false, false); shelfPick.userData.pick = { k: 'shelf' }; pickables.push(shelfPick);
    dyn.shelfBox = new THREE.Box3(new THREE.Vector3(R.x - 0.7, 0, R.z0), new THREE.Vector3(R.x + 0.7, R.h, R.z0 + totalL));
    // ----- raw store: pallets of timber + steel sheet
    const cols = rawCols(B), rows = rawRows(B); dyn.rawSpots = [];
    rows.forEach((z) => cols.forEach((x) => dyn.rawSpots.push([x, z])));
    dyn.rawSpots.forEach(([x, z]) => { const p = pallet(); p.rotation.y = Math.PI / 2; p.position.set(x, 0, z); g.add(p); });
    dyn.planks = new THREE.InstancedMesh(plankGeo, plankMat, dyn.rawSpots.length * 20); dyn.planks.castShadow = true; dyn.planks.receiveShadow = true; dyn.planks.count = 0; g.add(dyn.planks);
    dyn.steelSpot = sp >= 1 ? [cols[1], Math.min(B.z1 - 1.4, 1.6)] : [cols[1], rows[2] + 1.35];
    dyn.steelPal = pallet(); dyn.steelPal.position.set(dyn.steelSpot[0], 0, dyn.steelSpot[1]); dyn.steelPal.rotation.y = Math.PI / 2; g.add(dyn.steelPal);
    dyn.sheets = new THREE.InstancedMesh(sheetGeo, sheetMat, 90); dyn.sheets.castShadow = true; dyn.sheets.receiveShadow = true; dyn.sheets.count = 0; g.add(dyn.sheets);
    dyn.rawKey = '';
    { const t = signTex([{ t: '', s: 10, y: 0.5 }], { w: 512, h: 128 }); const sm = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), std(0xffffff, 0.5, 0.1, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 })); sm.position.set((cols[0] + cols[1]) / 2, sp === 0 ? 2.5 : 2.9, B.z0 + 0.06); g.add(sm); dyn.rawSign = { tex: t, key: '' }; }
    const rawPick = mesh(bx(2.8, 2.0, rows[2] - rows[0] + 2.0), MAT.pick, (cols[0] + cols[1]) / 2, 1.0, (rows[0] + rows[2]) / 2, g, false, false); rawPick.userData.pick = { k: 'raw' }; pickables.push(rawPick);
    // ----- conveyors (shown once bought)
    dyn.conv = new THREE.Group(); g.add(dyn.conv); dyn.convBuilt = false;
    // ----- empty bays
    dyn.bays = new THREE.Group(); g.add(dyn.bays); dyn.baysKey = '';
    // ----- pick planes for road / yard
    const road = mesh(bx(80, 0.1, 6), MAT.pick, 0, 0, 8.25, g, false, false); road.userData.pick = { k: 'road' }; pickables.push(road);
    if (sp === 0) { const yard = mesh(bx(13.4, 0.3, 4.4), MAT.pick, -2.6, 0.1, 3.0, g, false, false); yard.userData.pick = { k: 'yard' }; pickables.push(yard); }
    // forklift lane
    dyn.fkGapX = (B.x0 + 0.3 + B.x0 + 2.5) / 2;
  }
  const beltTex = canvasTex(256, 64, (g) => { g.fillStyle = '#1c1d1f'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#2e3033'; for (let x = 0; x < 256; x += 32) g.fillRect(x, 0, 7, 64); g.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 400; i++) g.fillRect(Math.random() * 256, Math.random() * 64, 2, 1); });
  function buildConveyors(sp) {
    const c = dyn.conv; c.clear(); dyn.belts = [];
    const rowsY = sp >= 1 ? [I.ROWS[0], I.ROWS[1]] : [I.ROWS[0]];
    const x0 = wx(70) - 0.3, x1 = wx(I.SHELF_X) + 1.2, L = x1 - x0, H = 0.74;
    rowsY.forEach((ry) => {
      const z = wz(ry + 28), cg = new THREE.Group(); cg.position.set((x0 + x1) / 2, 0, z); c.add(cg);
      [-0.36, 0.36].forEach((dz) => { mesh(boxW(L, 0.16, 0.05, 1), MAT.galv, 0, H - 0.02, dz, cg); mesh(bx(L, 0.03, 0.06), MAT.paintYellow, 0, H + 0.075, dz, cg); });
      const bm = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, map: beltTex.clone() });
      bm.map.wrapS = bm.map.wrapT = THREE.RepeatWrapping; bm.map.repeat.set(L / 0.6, 1); bm.map.needsUpdate = true;
      const belt = mesh(new THREE.PlaneGeometry(L, 0.62), bm, 0, H + 0.005, 0, cg, false, true); belt.rotation.x = -Math.PI / 2;
      (dyn.belts = dyn.belts || []).push(bm.map);
      const n = Math.floor(L / 0.32), rm = new THREE.InstancedMesh(rollerGeo, MAT.steel, n), mt = new THREE.Matrix4();
      for (let i = 0; i < n; i++) { mt.makeTranslation(-L / 2 + 0.16 + i * 0.32, H - 0.04, 0); rm.setMatrixAt(i, mt); }
      rm.castShadow = false; rm.receiveShadow = true; cg.add(rm);
      for (let x = -L / 2 + 0.3; x < L / 2; x += 1.6) [-0.33, 0.33].forEach((dz) => { mesh(bx(0.05, H - 0.08, 0.05), MAT.darkSteel, x, (H - 0.08) / 2, dz, cg); mesh(bx(0.12, 0.02, 0.12), MAT.darkSteel, x, 0.01, dz, cg); });
      mesh(bx(0.3, 0.3, 0.42, 0.03), MAT.paintBlue, -L / 2 + 0.3, H - 0.28, 0.52, cg);
      blobShadow(cg, L + 0.4, 1.2, 0, 0, 0.45);
    });
    dyn.convBuilt = true;
  }
  function updateBays(S) {
    const key = S.machines.length + ':' + S.space; if (dyn.baysKey === key) return; dyn.baysKey = key;
    dyn.bays.clear(); for (let i = pickables.length - 1; i >= 0; i--) if (pickables[i].userData.pick.k === 'slot') pickables.splice(i, 1);
    const slots = I.D.spaces[S.space].slots;
    for (let i = S.machines.length; i < slots; i++) {
      const s = I.SLOTS[i], b = new THREE.Group(); b.position.set(wx(s.x), 0, wz(s.y)); dyn.bays.add(b);
      const z = floorZone(b, 2.9, 2.1); z.traverse((c) => { if (c.material === MAT.hazard) { c.material = std(0xffffff, 0.7, 0, { map: M.hazard, transparent: true, opacity: 0.55 }); } });
      const t = signTex([{ t: 'BAY ' + (i + 1) + ' · FREE', s: 64, y: 0.38 }, { t: 'New machine · ' + I.machineCost() + ' coins', s: 40, y: 0.74, c: '#fbbf24', w: 600 }], { w: 512, h: 160, bg: '#1f2937', border: '#4b5563' });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), std(0xffffff, 0.5, 0.1, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.2 })); sg.position.set(0, 1.2, -0.6); b.add(sg);
      mesh(bx(0.04, 1.0, 0.04), MAT.galv, -0.6, 0.5, -0.62, b); mesh(bx(0.04, 1.0, 0.04), MAT.galv, 0.6, 0.5, -0.62, b);
      const pk = mesh(bx(2.9, 1.6, 2.1), MAT.pick, 0, 0.8, 0, b, false, false); pk.userData.pick = { k: 'slot', i }; pickables.push(pk);
    }
  }

  /* ---------- live entities ---------- */
  const machines = {};      // id -> { g, A, tier }
  const workers = [];       // index -> worker object
  const vehicles = [];      // trip slot -> { g, kind }
  let vehKind = -1;
  const beltPool = [];
  const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3(), tmpE = new THREE.Euler();
  const rawHidden = { wood: 0, steel: 0 };
  const chipsEl = document.createElement('div'); chipsEl.id = 'mchips'; wrap.appendChild(chipsEl);
  const chips = {};

  function syncMachines(S) {
    S.machines.forEach((m) => {
      let e = machines[m.id];
      if (!e || e.tier !== m.tier) {
        if (e) { scene.remove(e.g); const i = pickables.indexOf(e.pick); if (i >= 0) pickables.splice(i, 1); }
        const g = buildMachine(m), s = I.SLOTS[m.id]; g.position.set(wx(s.x), 0, wz(s.y)); scene.add(g);
        let pick = null; g.traverse((c) => { if (c.userData.pick) pick = c; }); pickables.push(pick);
        if (e) { for (let i = 0; i < 4; i++) spark(g.position.x + rnd(-1, 1), 1.2, g.position.z + rnd(-0.6, 0.6), 10, [0.6, 0.85, 1.0]); }
        e = machines[m.id] = { g, A: g.userData.A, tier: m.tier, pick, ph: 0, smokeT: 0, totes: -1 };
      }
    });
    Object.keys(machines).forEach((id) => { if (!S.machines[id]) { scene.remove(machines[id].g); delete machines[id]; } });
  }
  function setLamp(l, on, col) { l.material.emissiveIntensity = on ? 2.4 : 0.04; }
  function pressCurve(ph) { return ph < 0.35 ? ease(ph / 0.35) : ph < 0.5 ? 1 : 1 - ease((ph - 0.5) / 0.5); }
  function ik(R, yaw, r, h) {
    // two-link IK in the arm plane (shoulder at height 0.78 above the cell floor)
    const L1 = 0.86, L2 = 0.78, dx = Math.max(0.15, r), dy = h - 0.78, d = clamp(Math.hypot(dx, dy), 0.2, L1 + L2 - 0.01);
    const p1 = Math.atan2(dy, dx) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const beta = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
    const p2 = p1 - (Math.PI - beta);
    const a2 = Math.PI / 2 - p1, a = -p2;
    R.j1.rotation.y = yaw; R.j2.rotation.x = a2; R.j3.rotation.x = a - a2; R.j5.rotation.x = -a;
  }
  // robot keyframes [p, yaw, r, h] (r, h of the wrist; gripper hangs 0.28 below)
  const RK = [[0, 0, 0.6, 1.5], [0.14, -1.11, 0.9, 1.35], [0.22, -1.11, 0.9, 1.2], [0.3, -1.11, 0.9, 1.45], [0.44, 1.18, 0.91, 1.55], [0.52, 1.18, 0.91, 1.36], [0.6, 1.18, 0.75, 1.65], [0.9, 0.2, 0.6, 1.6], [1, 0, 0.6, 1.5]];
  function robotPose(R, p) {
    let i = 0; while (i < RK.length - 2 && p > RK[i + 1][0]) i++;
    const a = RK[i], b = RK[i + 1], t = ease(clamp((p - a[0]) / (b[0] - a[0]), 0, 1));
    ik(R, lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t));
  }
  const workPieces = {};
  function workPiece(id, p) {
    const k = id + p; if (!workPieces[k]) { const o = product(p); o.scale.multiplyScalar(p === 'chair' ? 0.55 : 0.9); o.traverse((c) => { if (c.isMesh) c.castShadow = true; }); workPieces[k] = o; }
    return workPieces[k];
  }
  function animMachines(S, dt, t) {
    S.machines.forEach((m) => {
      const e = machines[m.id]; if (!e) return; const A = e.A, g = e.g;
      // stack light
      const flash = (t * 3) % 1 < 0.5;
      setLamp(A.lamps.red, m.broken && flash); setLamp(A.lamps.amber, !m.broken && !m.cyc); setLamp(A.lamps.green, !m.broken && m.cyc);
      // shake on breakdown
      g.position.x = wx(I.SLOTS[m.id].x) + (m.shake > 0 ? Math.sin(t * 60) * 0.03 : 0);
      // workpiece
      const wp = workPiece(m.id, m.product);
      if (m.cyc && A.tier !== 3) { if (wp.parent !== A.work) A.work.add(wp); wp.visible = true; } else if (A.tier !== 3) wp.visible = false;
      const ph = m.cyc ? m.prog : 0;
      if (A.tier === 0 || A.tier === 1) {
        const strokes = A.tier === 0 ? 3 : 2, local = (ph * strokes) % 1, d = m.cyc ? pressCurve(local) : 0;
        A.ram.position.y = A.ramY - A.stroke * d * (A.tier === 0 ? 0.6 : 0.62);
        if (A.wheel) A.wheel.rotation.x = -d * 2.2;
        if (A.rod) { const top = 2.5, bot = A.ram.position.y + 0.14, L = top - bot; A.rod.scale.y = L; A.rod.position.y = bot + L / 2; }
        if (m.cyc && d > 0.98 && !e.hit) { e.hit = true; if (A.tier === 1) spark(g.position.x, 0.7, g.position.z + 0.3, 4, [1, 0.8, 0.5]); }
        if (d < 0.5) e.hit = false;
      } else if (A.tier === 2) {
        A.head.position.x = m.cyc ? Math.sin(ph * TAU * 3) * 0.45 : 0;
        A.head.position.y = 1.75 - (m.cyc ? 0.12 + 0.06 * Math.sin(ph * TAU * 7) : 0);
        A.spindle.rotation.y += m.cyc ? dt * 60 : 0;
        if (m.cyc && Math.random() < dt * 25) spark(g.position.x + A.head.position.x - 0.1, 1.15, g.position.z + 0.05, 1, [0.9, 0.95, 1.0]);
      } else {
        robotPose(A.robot, m.cyc ? ph : 0);
        // part travels: infeed -> gripper -> press
        if (m.cyc && ph < 0.22) { if (wp.parent !== A.infeed) A.infeed.add(wp); wp.position.set(0, 0, 0); wp.visible = true; }
        else if (m.cyc && ph < 0.52) { if (wp.parent !== A.robot.grip) A.robot.grip.add(wp); wp.position.set(0, -0.12, 0); wp.visible = true; }
        else if (m.cyc) { if (wp.parent !== A.work) A.work.add(wp); wp.position.set(0, 0, 0); wp.visible = true; }
        else wp.visible = false;
        A.robot.f1.position.x = (m.cyc && ph > 0.2 && ph < 0.52) ? -0.035 : -0.06; A.robot.f2.position.x = -A.robot.f1.position.x;
        const d = m.cyc && ph > 0.62 && ph < 0.9 ? pressCurve((ph - 0.62) / 0.28) : 0;
        A.ram.position.y = A.ramY - A.stroke * d;
      }
      // finished-goods tote (no conveyor)
      A.tote.visible = !S.conveyor;
      const n = S.conveyor ? 0 : m.out.length;
      if (e.totes !== n) {
        e.totes = n; A.toteItems.forEach((o) => A.tote.remove(o)); A.toteItems = [];
        m.out.slice(0, 3).forEach((p, i) => { const b = cardBox(p); b.scale.multiplyScalar(0.7); b.position.set(-0.17 + (i % 2) * 0.3, 0.32 + Math.floor(i / 2) * 0.22, (i % 2) * 0.05 - 0.02); A.tote.add(b); A.toteItems.push(b); });
      }
      // smoke while broken
      if (m.broken) { e.smokeT -= dt; if (e.smokeT <= 0) { e.smokeT = 0.12; smoke(g.position.x + rnd(-0.3, 0.3), A.tier === 0 ? 1.4 : 2.4, g.position.z, { c: [0.18, 0.18, 0.2], a: 0.6, size: rnd(0.4, 0.7), vy: rnd(0.6, 1.0) }); } }
    });
  }

  function syncWorkers(S, dt, t) {
    while (workers.length < S.workers.length) workers.push(makeWorker(S.workers[workers.length]));
    while (workers.length > S.workers.length) { const o = workers.pop(); scene.remove(o.root); }
    S.workers.forEach((w, i) => {
      const o = workers[i]; const X = wx(w.x), Z = wz(w.y);
      const dx = X - o.x, dz = Z - o.z, sp = Math.hypot(dx, dz) / Math.max(dt, 1e-4);
      o.x = X; o.z = Z; o.root.position.set(X, 0, Z);
      let face = null;
      if (Math.hypot(dx, dz) > 1e-4) face = Math.atan2(dx, dz);
      else if (w.st === 'op' || (w.st === 'fix' && w.tgt != null)) {
        const m = w.st === 'op' ? S.machines[w.job] : S.machines[w.tgt];
        if (m) { const s = I.SLOTS[m.id]; face = Math.atan2(wx(s.x) - X, wz(s.y) - Z); }
      }
      if (face != null) { let d = face - o.rot; d = Math.atan2(Math.sin(d), Math.cos(d)); o.rot += d * Math.min(1, dt * 10); }
      o.root.rotation.y = o.rot;
      const m = w.st === 'op' ? S.machines[w.job] : null;
      if (w.moving && sp > 0.2) play(o, 'Walk', clamp(sp / 1.6, 0.6, 2.2));
      else if (w.st === 'fix' || (m && m.cyc)) play(o, 'Interact', 1);
      else play(o, 'Idle', 1);
      o.carryBox.visible = !!w.carry;
      if (w.carry && o.carryKind !== w.carry) { o.carryKind = w.carry; const s = BOXSIZE[w.carry]; o.carryBox.scale.set(s[0] * 0.9 / 0.94, s[1] * 0.9 / 0.94, s[2] * 0.9 / 0.94); }
      if (w.st === 'fix' && Math.random() < dt * 6) spark(X + Math.sin(o.rot) * 0.5, 0.9, Z + Math.cos(o.rot) * 0.5, 3);
      o.mixer.update(dt);
    });
  }

  function vehHome(k) { return k === 0 ? [wx(I.DOCK_X), 6.9] : [wx(I.DOCK_X) - 4.4, 9.6]; }
  function syncVehicles(S, dt, t) {
    if (vehKind !== S.vehicle) {
      vehicles.forEach((v) => scene.remove(v.g)); vehicles.length = 0; vehKind = S.vehicle;
      const v = I.D.vehicles[S.vehicle];
      for (let k = 0; k < v.trips; k++) { const g = S.vehicle === 0 ? buildCart() : buildTruck(S.vehicle === 2); scene.add(g); vehicles.push({ g, x: vehHome(k)[0] }); }
    }
    vehicles.forEach((v, k) => {
      const A = v.g.userData.A, d = S.deliveries.filter((q) => q.slot === k)[0], [hx, hz] = vehHome(k);
      let x = hx, loaded = false, door = 0;
      if (d) {
        const f = d.t / d.dur;
        if (f < 0.5) { const s = f / 0.5; loaded = true; x = s < 0.16 ? hx : hx + Math.pow((s - 0.16) / 0.84, 1.7) * 60; door = s < 0.16 ? Math.sin(s / 0.16 * Math.PI) : 0; }
        else { const e = (f - 0.5) / 0.5; x = hx - 60 + (1 - Math.pow(1 - e, 2)) * 60; }
      }
      const dx = x - v.x; v.x = x;
      v.g.position.set(x, 0, hz);
      A.wheels.forEach((wl) => { wl.rotation.z -= dx / (S.vehicle === 0 ? 0.1 : 0.45); });
      A.cargo.visible = loaded;
      if (A.door) { A.door.scale.y = 1 - door * 0.85; A.door.position.y = A.doorBaseY + A.doorH * door * 0.42; }
      if (A.courier) { play(A.courier, Math.abs(dx) > 1e-4 ? 'Walk' : 'Idle', clamp(Math.abs(dx) / Math.max(dt, 1e-4) / 1.6, 0.6, 2.5)); A.courier.mixer.update(dt); }
      if (S.vehicle > 0 && Math.abs(dx) > 1e-4 && Math.random() < 0.5) smoke(x - v.g.userData.len / 2 - 0.1, 0.35, hz + 0.8, { c: [0.35, 0.35, 0.36], a: 0.35, size: 0.25, grow: 0.8, life: 1.0, vy: 0.3, wind: -0.6 });
    });
  }

  function syncBelt(S, items, dt) {
    if (S.conveyor && !dyn.convBuilt) buildConveyors(S.space);
    if (dyn.belts) dyn.belts.forEach((tx) => { tx.offset.x = (tx.offset.x - dt * I.simRate() * 2.75 / 0.6) % 1; });
    while (beltPool.length < items.length) { const b = cardBox('toy'); b.userData.p = 'toy'; scene.add(b); beltPool.push(b); }
    beltPool.forEach((b, i) => {
      const it = items[i]; b.visible = !!it; if (!it) return;
      if (b.userData.p !== it.p) { const s = BOXSIZE[it.p]; b.scale.set(s[0], s[1], s[2]); b.userData.p = it.p; }
      b.position.set(wx(it.x), 0.745, wz(it.y)); b.rotation.y = (i % 3) * 0.06;
    });
  }

  function syncStores(S) {
    // rack contents
    const R = dyn.rack, total = Math.min(R.slots.length, S.goods.toy + S.goods.chair + S.goods.bucket);
    const key = S.goods.toy + ',' + S.goods.chair + ',' + S.goods.bucket;
    if (dyn.goodsKey !== key) {
      dyn.goodsKey = key; let i = 0;
      ['toy', 'chair', 'bucket'].forEach((p) => { for (let n = 0; n < S.goods[p] && i < total; n++, i++) { const s = R.slots[i], sz = BOXSIZE[p]; tmpE.set(0, ((i * 37) % 7 - 3) * 0.015, 0); tmpQ.setFromEuler(tmpE); tmpM.compose(tmpP.set(s[0], s[1], s[2]), tmpQ, tmpS.set(sz[0], sz[1], sz[2])); dyn.goods.setMatrixAt(i, tmpM); } });
      dyn.goods.count = i; dyn.goods.instanceMatrix.needsUpdate = true; dyn.goods.computeBoundingSphere();
      const cap = I.D.spaces[S.space].goods, gt = I.goodsTotal(), full = gt >= cap;
      const c = dyn.shelfSign.tex.userData.ctx, w = 512, h = 128;
      c.fillStyle = full ? '#7f1d1d' : '#111827'; c.fillRect(0, 0, w, h); c.fillStyle = full ? '#ef4444' : '#f97316'; c.fillRect(0, h - 10, w, 10);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#9ca3af'; c.font = '700 26px ' + FONT; c.fillText('FINISHED GOODS', w / 2, 32);
      c.fillStyle = '#fff'; c.font = '800 54px ' + FONT; c.fillText(gt + ' / ' + cap + (full ? '  FULL' : ''), w / 2, 80); dyn.shelfSign.tex.needsUpdate = true;
    }
    // raw store
    const wood = Math.max(0, S.raw.wood - rawHidden.wood), steel = Math.max(0, S.raw.steel - rawHidden.steel);
    const rk = wood + ',' + steel + ',' + S.level;
    if (dyn.rawKey !== rk) {
      dyn.rawKey = rk; let i = 0;
      for (let n = 0; n < Math.min(wood, dyn.rawSpots.length * 20); n++) {
        const spot = dyn.rawSpots[Math.floor(n / 20)], k = n % 20, layer = Math.floor(k / 5), j = k % 5;
        tmpQ.setFromEuler(tmpE.set(0, (layer % 2 ? 0.02 : -0.02), 0)); tmpM.compose(tmpP.set(spot[0] - 0.4 + j * 0.2, 0.18 + layer * 0.07, spot[1]), tmpQ, tmpS.set(1, 1, 1)); dyn.planks.setMatrixAt(i++, tmpM);
      }
      dyn.planks.count = i; dyn.planks.instanceMatrix.needsUpdate = true; dyn.planks.computeBoundingSphere();
      const showSteel = S.space >= 1 && (S.level >= 9 || steel > 0); dyn.steelPal.visible = showSteel;
      let j = 0; if (showSteel) for (let n = 0; n < Math.min(steel, 90); n++) { tmpQ.setFromEuler(tmpE.set(0, Math.PI / 2 + ((n * 13) % 5 - 2) * 0.01, 0)); tmpM.compose(tmpP.set(dyn.steelSpot[0], 0.155 + n * 0.02, dyn.steelSpot[1]), tmpQ, tmpS.set(1, 1, 1)); dyn.sheets.setMatrixAt(j++, tmpM); }
      dyn.sheets.count = j; dyn.sheets.instanceMatrix.needsUpdate = true; dyn.sheets.computeBoundingSphere();
      const cap = I.D.spaces[S.space].raw, c = dyn.rawSign.tex.userData.ctx, w = 512, h = 128, rt = S.raw.wood + S.raw.steel;
      c.fillStyle = '#111827'; c.fillRect(0, 0, w, h); c.fillStyle = '#a16207'; c.fillRect(0, h - 10, w, 10);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#9ca3af'; c.font = '700 26px ' + FONT; c.fillText('RAW STORE ' + rt + ' / ' + cap, w / 2, 32);
      c.fillStyle = '#fff'; c.font = '800 44px ' + FONT; c.fillText('WOOD ' + S.raw.wood + (S.level >= 9 || S.raw.steel ? '  ·  STEEL ' + S.raw.steel : ''), w / 2, 80); dyn.rawSign.tex.needsUpdate = true;
    }
  }

  // forklift delivery of raw material
  function startForklift(r, n) {
    rawHidden[r] += n; fkQueue.push({ r, n });
  }
  function stepForklift(S, dt) {
    if (!fkTrip && fkQueue.length) {
      const job = fkQueue.shift(), B = SPACES[S.space];
      let tx, tz;
      if (job.r === 'steel') { tx = dyn.steelSpot[0]; tz = dyn.steelSpot[1]; }
      else { const idx = Math.min(dyn.rawSpots.length - 1, Math.floor(Math.max(0, S.raw.wood - 1) / 20)); [tx, tz] = dyn.rawSpots[idx]; }
      const gx = dyn.fkGapX, pts = [[-26, 6.9]];
      if (S.space === 0) pts.push([-11.8, 6.9], [-11.8, 1.6], [gx, 1.6]); else pts.push([gx, 6.9]);
      pts.push([gx, B.z1 - 0.3], [gx, tz + 1.9], [tx, tz + 1.35]);
      fkTrip = { job, pts, seg: 0, s: 0, dir: 1, wait: 0 };
      const L = forklift.userData.A.load; L.clear();
      const p = pallet(); p.scale.set(0.8, 1, 0.8); L.add(p);
      if (job.r === 'wood') for (let i = 0; i < Math.min(15, job.n); i++) { const pl = new THREE.Mesh(plankGeo, plankMat); pl.castShadow = true; pl.rotation.y = Math.PI / 2; pl.scale.set(0.8, 1, 0.8); pl.position.set(-0.33 + (i % 5) * 0.165, 0.18 + Math.floor(i / 5) * 0.07, 0); L.add(pl); }
      else for (let i = 0; i < Math.min(15, job.n); i++) { const sh = new THREE.Mesh(sheetGeo, sheetMat); sh.scale.set(0.8, 1, 0.8); sh.rotation.y = Math.PI / 2; sh.position.y = 0.16 + i * 0.02; sh.castShadow = true; L.add(sh); }
      forklift.visible = true; forklift.position.set(pts[0][0], 0, pts[0][1]);
    }
    if (!fkTrip) { forklift.visible = false; return; }
    const F = fkTrip, A = forklift.userData.A;
    if (F.wait > 0) {
      F.wait -= dt; A.fork.position.y = 0.12 + Math.max(0, F.wait - 0.6) * 0.5;
      if (F.wait <= 0.6 && A.load.children.length) { A.load.clear(); rawHidden[F.job.r] = Math.max(0, rawHidden[F.job.r] - F.job.n); }
      if (F.wait <= 0) F.dir = -1;
      A.driver.mixer.update(dt); return;
    }
    const a = F.pts[F.seg], b = F.pts[F.seg + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), spd = 6.5;
    F.s += spd * dt * F.dir;
    if (F.dir > 0 && F.s >= L) { if (F.seg < F.pts.length - 2) { F.s -= L; F.seg++; } else { F.s = L; F.wait = 1.4; A.fork.position.y = 0.82; } }
    if (F.dir < 0 && F.s <= 0) { if (F.seg > 0) { F.seg--; const a2 = F.pts[F.seg], b2 = F.pts[F.seg + 1]; F.s += Math.hypot(b2[0] - a2[0], b2[1] - a2[1]); } else { fkTrip = null; forklift.visible = false; return; } }
    const a1 = F.pts[F.seg], b1 = F.pts[F.seg + 1], L1 = Math.hypot(b1[0] - a1[0], b1[1] - a1[1]), f = clamp(F.s / L1, 0, 1);
    forklift.position.set(lerp(a1[0], b1[0], f), 0, lerp(a1[1], b1[1], f));
    const yaw = Math.atan2(-(b1[1] - a1[1]), b1[0] - a1[0]); let d = yaw - forklift.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); forklift.rotation.y += d * Math.min(1, dt * 8);
    A.wheels.forEach((wl) => { wl.rotation.z -= spd * dt * F.dir / 0.25; });
    if (F.dir > 0) A.fork.position.y = 0.2; else A.fork.position.y = 0.12;
    A.driver.mixer.update(dt);
  }

  /* ---------- camera: three-quarter view with pan / pinch / wheel zoom ---------- */
  const cam = { target: new THREE.Vector3(), az: 0.62, el: 0.84, dist: 40, fit: 40, goalT: new THREE.Vector3(), goalD: 40, bounds: null };
  function spaceBounds(sp) { const B = SPACES[sp]; return { x0: B.x0 - 0.6, x1: B.x1 + 0.6, z0: B.z0 - 0.6, z1: Math.max(B.z1 + 0.4, sp === 0 ? 5.3 : 7.0), h: B.h }; }
  function applyCam() {
    const c = Math.cos(cam.el);
    camera.position.set(cam.target.x + Math.sin(cam.az) * c * cam.dist, cam.target.y + Math.sin(cam.el) * cam.dist, cam.target.z + Math.cos(cam.az) * c * cam.dist);
    camera.lookAt(cam.target); camera.updateMatrixWorld();
  }
  function fitCamera(sp, instant) {
    const b = cam.bounds = spaceBounds(sp);
    const ctr = new THREE.Vector3((b.x0 + b.x1) / 2, 0.6, (b.z0 + b.z1) / 2);
    const B = SPACES[sp], fz1 = B.z1 + (sp === 0 ? 1.2 : 1.6);   // frame the building (plus the dock apron); the road stays reachable by panning
    const pts = []; [B.x0, B.x1].forEach((x) => [B.z0, fz1].forEach((z) => [0, B.h * 0.6].forEach((y) => pts.push(new THREE.Vector3(x, y, z)))));
    const save = { t: cam.target.clone(), d: cam.dist };
    cam.target.copy(ctr); let d = 30;
    for (let it = 0; it < 6; it++) {
      cam.dist = d; applyCam(); let mx = 0, my = 0, cx = 0, cyy = 0, minx = 9, maxx = -9, miny = 9, maxy = -9;
      pts.forEach((p) => { const v = p.clone().project(camera); minx = Math.min(minx, v.x); maxx = Math.max(maxx, v.x); miny = Math.min(miny, v.y); maxy = Math.max(maxy, v.y); });
      mx = (maxx - minx) / 2; my = (maxy - miny) / 2; cx = (maxx + minx) / 2; cyy = (maxy + miny) / 2;
      const need = Math.max(mx / 1.06, my / 0.98); d *= need;
      // re-centre on the projected box
      const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new THREE.Vector3(-Math.sin(cam.az), 0, -Math.cos(cam.az));
      const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * cam.dist; const vw = vh * camera.aspect;
      cam.target.addScaledVector(right, cx * vw / 2); cam.target.addScaledVector(up, cyy * vh / 2 / Math.sin(cam.el));
    }
    cam.fit = d; cam.goalD = d; cam.goalT.copy(cam.target);
    if (!instant) { cam.target.copy(save.t); cam.dist = save.d; } else { cam.dist = d; }
    applyCam();
  }
  function clampTarget() {
    const b = cam.bounds; if (!b) return;
    cam.goalT.x = clamp(cam.goalT.x, b.x0 - 2, b.x1 + 4); cam.goalT.z = clamp(cam.goalT.z, b.z0 - 2, b.z1 + 4);
    cam.goalD = clamp(cam.goalD, cam.fit * 0.32, cam.fit * 1.25);
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function groundAt(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(ground, p) ? p : null;
  }
  const ptrs = new Map(); let drag = null, pinch = null;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) drag = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
    else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.goalD, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (drag) drag.moved = true; }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size >= 2 && pinch) {
      const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.goalD = pinch.dist * pinch.d / Math.max(20, d);
      const p0 = groundAt(pinch.mx, pinch.my), p1 = groundAt(mx, my); if (p0 && p1) { cam.goalT.add(p0.sub(p1)); }
      pinch.mx = mx; pinch.my = my; clampTarget(); return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 8) drag.moved = true;
    if (drag.moved) {
      const p0 = groundAt(drag.lx, drag.ly), p1 = groundAt(e.clientX, e.clientY);
      if (p0 && p1) { const d = p0.sub(p1); cam.goalT.add(d); cam.target.add(d); applyCam(); }
      clampTarget();
    }
    drag.lx = e.clientX; drag.ly = e.clientY;
  });
  const endPtr = (e) => {
    const wasTap = drag && !drag.moved && ptrs.size === 1 && e.type === 'pointerup';
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (wasTap) doTap(e.clientX, e.clientY);
    if (ptrs.size === 0) drag = null; else if (ptrs.size === 1) { const [p] = [...ptrs.values()]; drag = { sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: true }; }
  };
  canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); cam.goalD *= Math.exp(e.deltaY * 0.0012); clampTarget(); }, { passive: false });
  function doTap(cx, cy) {
    const r = canvas.getBoundingClientRect(); ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false);
    I.tap(hits.length ? hits[0].object.userData.pick : { k: 'none' });
  }

  /* ---------- machine status chips (DOM, projected) ---------- */
  const v3 = new THREE.Vector3();
  function project(X, Y, Z) {
    v3.set(X, Y, Z).project(camera); const w = canvas.clientWidth, h = canvas.clientHeight;
    return { x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h, vis: v3.z < 1 };
  }
  const TOPH = [1.9, 3.3, 2.55, 2.0];
  function updateChips(S) {
    S.machines.forEach((m) => {
      let c = chips[m.id]; if (!c) { c = chips[m.id] = document.createElement('div'); c.className = 'mchip'; c.innerHTML = '<b></b><span></span><i><u></u></i>'; chipsEl.appendChild(c); c._k = ''; }
      const s = I.SLOTS[m.id], p = project(wx(s.x), TOPH[m.tier] + 0.35, wz(s.y));
      c.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px) translate(-50%,-100%)';
      const st = m.broken ? (m.repair > 0 ? 'rep' : 'bad') : m.cyc ? 'run' : 'idle';
      const label = m.broken ? (m.repair > 0 ? 'Repair ' + Math.ceil(m.repair) + 's' : 'Breakdown') : m.cyc ? I.D.products[m.product].name : shortReason(m, S);
      const k = st + label + m.tier;
      if (c._k !== k) { c._k = k; c.className = 'mchip ' + st; c.children[0].textContent = 'M' + (m.id + 1); c.children[1].textContent = label; }
      c.children[2].firstChild.style.width = (m.cyc ? Math.round(m.prog * 100) : m.broken && m.repair > 0 ? Math.round(100 - m.repair / 8 * 100) : Math.round(m.cond)) + '%';
    });
    Object.keys(chips).forEach((id) => { if (!S.machines[id]) { chips[id].remove(); delete chips[id]; } });
  }
  function shortReason(m, S) {
    const r = I.blockReason(m);
    if (/^No (wood|steel)/.test(r)) return 'No ' + r.split(' ')[1].replace('!', '');
    if (/tray full/.test(r)) return 'Tray full';
    if (/Shelf full/.test(r)) return 'Shelf full';
    if (/No operator/.test(r)) return 'Tap to run';
    if (/Switched off/.test(r)) return 'Off · tap';
    if (/on the way/.test(r)) return 'Waiting';
    return 'Idle';
  }

  /* ---------- post-processing (ambient occlusion on High) ---------- */
  function setupComposer() {
    composer = null; gtao = null;
    if (!QUALITY[quality].ao) return;
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, canvas.clientWidth || 400, canvas.clientHeight || 400);
      gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = 0.85;
      gtao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
      composer.addPass(gtao); composer.addPass(new OutputPass());
    } catch (err) { console.warn('AO disabled', err); composer = null; gtao = null; }
  }
  let prCap = 1;
  function applyQuality() {
    const Q = QUALITY[quality]; prCap = Math.min(window.devicePixelRatio || 1, Q.dpr);
    renderer.setPixelRatio(prCap);
    sun.shadow.mapSize.set(Q.shadow, Q.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
    setupComposer(); resize();
  }
  function resize() {
    const w = wrap.clientWidth || 400, h = wrap.clientHeight || 400;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    if (cam.bounds) { const keepD = cam.goalD / cam.fit, keepT = cam.goalT.clone(); fitCamera(builtSpace, false); cam.goalD = cam.fit * keepD; cam.goalT.copy(keepT); clampTarget(); }
  }

  /* ---------- frame ---------- */
  let ftAvg = 16, ftN = 0, chimneyT = 0, lastSpace = -1;
  const adaptive = !navigator.webdriver;
  function render(dt, t) {
    const S = I.S;
    if (S.space !== builtSpace) {
      const first = builtSpace < 0;
      buildBuilding(S.space); buildDynamic(S.space); dyn.convBuilt = false;
      Object.keys(machines).forEach((id) => { const e = machines[id]; if (e.pick && !pickables.includes(e.pick)) pickables.push(e.pick); });
      fitCamera(S.space, first); lastSpace = S.space;
    }
    syncMachines(S); updateBays(S); animMachines(S, dt, t);
    syncWorkers(S, dt, t); syncVehicles(S, dt, t); syncBelt(S, I.belt(), dt); syncStores(S); stepForklift(S, dt);
    smokeEmitters.forEach((e) => { e.acc = (e.acc || 0) + dt * e.rate; while (e.acc > 1) { e.acc -= 1; smoke(e.x, e.y, e.z, { c: [0.75, 0.76, 0.78], a: 0.35, size: rnd(0.8, 1.2), grow: 1.4, life: rnd(3, 4.5), vy: rnd(0.9, 1.3), wind: 0.6 }); } });
    stepParticles(dt);
    // camera easing
    const k = 1 - Math.exp(-dt * 8);
    cam.target.lerp(cam.goalT, k); cam.dist = lerp(cam.dist, cam.goalD, k); applyCam();
    sun.position.copy(cam.target).add(SUN_OFF); sun.target.position.copy(cam.target); sun.target.updateMatrixWorld();
    pUniforms.scale.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    if (composer) composer.render(dt); else renderer.render(scene, camera);
    updateChips(S);
    // adaptive resolution: step down if the device can't keep up
    if (adaptive && dt > 0) { ftAvg = ftAvg * 0.95 + dt * 1000 * 0.05; if (++ftN > 120 && ftAvg > 38 && renderer.getPixelRatio() > 0.75) { renderer.setPixelRatio(Math.max(0.75, renderer.getPixelRatio() - 0.25)); resize(); ftN = 0; } }
  }

  function toApp(x, y, h) {
    const p = project(wx(x), h == null ? 2.2 : h, wz(y)), a = document.getElementById('app').getBoundingClientRect(), r = canvas.getBoundingClientRect();
    return { x: r.left - a.left + p.x, y: r.top - a.top + p.y };
  }
  function boxRect(box) {
    const a = document.getElementById('app').getBoundingClientRect(), r = canvas.getBoundingClientRect();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    [box.min.x, box.max.x].forEach((x) => [box.min.y, box.max.y].forEach((y) => [box.min.z, box.max.z].forEach((z) => { const p = project(x, y, z); x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); })));
    x0 = clamp(x0, 0, r.width); x1 = clamp(x1, 0, r.width); y0 = clamp(y0, 0, r.height); y1 = clamp(y1, 0, r.height);
    return { x: r.left - a.left + x0, y: r.top - a.top + y0, w: x1 - x0, h: y1 - y0 };
  }
  function rect(name) {
    if (name === 'm0') { const e = machines[0]; if (!e) return null; e.g.updateMatrixWorld(true); return boxRect(new THREE.Box3().setFromObject(e.pick)); }
    if (name === 'shelf' && dyn) return boxRect(dyn.shelfBox);
    return null;
  }
  function fx(kind, d) {
    const e = d && d.id != null ? machines[d.id] : null, P = e ? e.g.position : null;
    if (kind === 'tap' && P) spark(P.x, 1.1, P.z + 0.3, 14);
    else if (kind === 'finish' && P) { if (!d.ok) { spark(P.x, 1.0, P.z + 0.4, 12, [0.35, 0.33, 0.3]); smoke(P.x, 1.0, P.z + 0.4, { c: [0.3, 0.3, 0.3], a: 0.4, size: 0.4, life: 1.2 }); } }
    else if (kind === 'fixed' && P) spark(P.x, 1.4, P.z, 24, [0.5, 1.0, 0.6]);
    else if (kind === 'break' && P) { spark(P.x, 1.4, P.z, 30); for (let i = 0; i < 8; i++) smoke(P.x, 1.6, P.z, { c: [0.15, 0.15, 0.17], a: 0.7, size: 0.7 }); }
    else if (kind === 'buyRaw') startForklift(d.r, d.n);
    else if (kind === 'install' && P) for (let i = 0; i < 4; i++) spark(P.x + rnd(-1, 1), 1.2, P.z + rnd(-0.6, 0.6), 10, [0.6, 0.85, 1.0]);
  }
  function setQuality(q) { if (!QUALITY[q]) return; quality = q; try { localStorage.setItem(GFX_KEY, q); } catch (err) {} applyQuality(); }
  function recenter() { fitCamera(builtSpace, false); }

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
  applyQuality();
  return { render, resize, toApp, rect, fx, setQuality, recenter, quality: () => quality, qualities: QUALITY, renderer, scene, camera, canvas };
}
