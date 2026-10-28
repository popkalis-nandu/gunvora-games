// ZOMBIE EXPRESS: DEATH TRAIN — GUNVORA GAMES
import * as THREE from 'three';
import { Sound } from './audio.js';
import { Input, IS_TOUCH } from './input.js';
import { Particles, makePost, Shake, canvasTex, noiseFill, glowTex, rand, clamp, lerp, damp } from './fx.js';
import { UI } from './ui.js';

const LEVELS = 200;
const isBoss = n => n % 10 === 0;
const OBJ_TYPES = ['clear', 'protect', 'station', 'infected'];
const objOf = n => isBoss(n) ? 'boss' : (n <= 2 ? 'clear' : OBJ_TYPES[(n * 3 + 1) % 4]);
const tierOf = n => n <= 25 ? 'Easy' : n <= 70 ? 'Normal' : n <= 130 ? 'Hard' : n <= 180 ? 'Brutal' : 'Extreme';
const OBJ_NAME = { clear: 'Clear the Coaches', protect: 'Protect the Survivors', station: 'Hold Until the Station', infected: 'Purge the Infected Coaches' };
function levelName(n) { return isBoss(n) ? (n === LEVELS ? 'FINAL: The Mutated Train Driver' : 'Boss: The Mutated Driver — Line ' + (n / 10)) : OBJ_NAME[objOf(n)] + ' · ' + tierOf(n); }
const UPG = [
  { id: 'dmg', icon: '🔫', name: 'Hollow Points', desc: 'All weapon damage +15%', max: 6, cost: l => 60 + l * l * 45 + l * 40 },
  { id: 'hp', icon: '❤️', name: 'Field Medic', desc: 'Max health +20', max: 6, cost: l => 50 + l * l * 40 + l * 30 },
  { id: 'armor', icon: '🦺', name: 'Kevlar Vest', desc: 'Damage taken −8%', max: 5, cost: l => 80 + l * l * 55 },
  { id: 'ammo', icon: '📦', name: 'Ammo Belt', desc: 'Magazine +20%, spare ammo +25%', max: 5, cost: l => 60 + l * l * 40 },
  { id: 'reload', icon: '⚡', name: 'Quick Hands', desc: 'Reload 12% faster', max: 4, cost: l => 70 + l * l * 50 },
  { id: 'shotgun', icon: '💥', name: 'Pump Shotgun', desc: 'Unlock the shotgun (key 2)', max: 1, cost: () => 350 },
  { id: 'rifle', icon: '🎯', name: 'Assault Rifle', desc: 'Unlock the full-auto rifle (key 3)', max: 1, cost: () => 900 },
  { id: 'torch', icon: '🔦', name: 'Tactical Torch', desc: 'Brighter, wider flashlight', max: 3, cost: l => 90 + l * l * 60 },
];
const WEAP = {
  pistol: { name: 'PISTOL', dmg: 28, rate: 0.24, clip: 12, res: 72, spread: 0.012, pellets: 1, reload: 1.1, kick: 0.6, sound: 'pistol', auto: false },
  shotgun: { name: 'SHOTGUN', dmg: 15, rate: 0.82, clip: 6, res: 30, spread: 0.05, pellets: 9, reload: 1.7, kick: 1.4, sound: 'shotgun', auto: false },
  rifle: { name: 'ASSAULT RIFLE', dmg: 21, rate: 0.095, clip: 30, res: 150, spread: 0.022, pellets: 1, reload: 1.5, kick: 0.45, sound: 'rifle', auto: true },
};
const sound = new Sound();
const MAXDT = +(new URLSearchParams(location.search).get('simdt') || 0.05);
// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070d);
scene.fog = new THREE.FogExp2(0x070a12, 0.032);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.04, 400); camera.rotation.order = 'YXZ';
scene.add(camera);
let post = null, high = false;
const fxA = new Particles(scene, 2400, true), fxN = new Particles(scene, 1800, false);
fxN.floor = 0.02; fxA.floor = 0.02;
const shake = new Shake();
// ---------- textures ----------
const T = {
  floor: canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#2b2d30', 0.22, 5000, 3); g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 16) for (let x = (y / 16 % 2) * 8; x < w; x += 16) { g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fill(); } for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(60,10,5,${Math.random() * 0.4})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, rand(6, 30), rand(4, 14), rand(0, 3), 0, 7); g.fill(); } }, [2, 14]),
  wall: canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#8f949a', 0.16, 3000, 2); g.strokeStyle = 'rgba(30,30,35,.55)'; g.lineWidth = 2; for (let x = 0; x < w; x += 64) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); } g.fillStyle = 'rgba(40,40,45,.5)'; for (let x = 6; x < w; x += 64) for (let y = 8; y < h; y += 40) { g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); } for (let i = 0; i < 10; i++) { const x = Math.random() * w; const gr = g.createLinearGradient(x, 0, x, h); gr.addColorStop(0, 'rgba(90,20,10,.55)'); gr.addColorStop(1, 'rgba(90,20,10,0)'); g.fillStyle = gr; g.fillRect(x, rand(0, h * 0.5), rand(2, 7), rand(30, 120)); } }, [8, 1]),
  seat: canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, '#26457a', 0.25, 2500, 2); g.strokeStyle = 'rgba(200,170,60,.35)'; g.lineWidth = 3; for (let i = -w; i < w * 2; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, h - 10, w, 10); }),
  ceil: canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, '#b9bcc0', 0.12, 1500, 2); g.fillStyle = 'rgba(0,0,0,.25)'; for (let x = 4; x < w; x += 16) g.fillRect(x, 0, 2, h); }, [4, 10]),
  ground: canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#1e2318', 0.35, 7000, 3); for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${30 + Math.random() * 30},${40 + Math.random() * 30},20,${Math.random() * 0.6})`; g.fillRect(Math.random() * w, Math.random() * h, rand(2, 12), rand(8, 40)); } }, [30, 60]),
  ballast: canvasTex(128, 128, (g, w, h) => { noiseFill(g, w, h, '#3a3732', 0.5, 4000, 3); g.fillStyle = '#4a3a2a'; for (let y = 0; y < h; y += 16) g.fillRect(0, y, w, 6); g.fillStyle = '#8a8a90'; g.fillRect(w * 0.18, 0, 5, h); g.fillRect(w * 0.78, 0, 5, h); }, [1, 60]),
  glow: glowTex(),
  blood: canvasTex(128, 128, (g, w, h) => { g.fillStyle = 'rgba(90,0,0,0.9)'; for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(64 + rand(-28, 28), 64 + rand(-28, 28), rand(4, 22), 0, 7); g.fill(); } for (let i = 0; i < 12; i++) { g.beginPath(); const a = rand(0, 6.28), r = rand(30, 58); g.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, rand(1, 4), 0, 7); g.fill(); } }),
  crack: canvasTex(128, 128, (g, w, h) => { g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.2; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(64, 64); let x = 64, y = 64; const a = i / 16 * 6.28; for (let k = 0; k < 5; k++) { x += Math.cos(a + rand(-.4, .4)) * 14; y += Math.sin(a + rand(-.4, .4)) * 14; g.lineTo(x, y); } g.stroke(); } }),
  sign: canvasTex(256, 64, (g, w, h) => { g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, w, h); g.font = 'bold 30px monospace'; g.fillStyle = '#ff3a1a'; g.textAlign = 'center'; g.fillText('NEXT: NO STOP', w / 2, 42); }),
  exit: canvasTex(128, 48, (g, w, h) => { g.fillStyle = '#0a5a20'; g.fillRect(0, 0, w, h); g.font = 'bold 30px sans-serif'; g.fillStyle = '#d0ffd8'; g.textAlign = 'center'; g.fillText('EXIT ⇢', w / 2, 35); }),
};
const M = {
  floor: new THREE.MeshLambertMaterial({ map: T.floor }),
  wall: new THREE.MeshLambertMaterial({ map: T.wall, color: 0x7d858e }),
  wallLow: new THREE.MeshLambertMaterial({ map: T.wall, color: 0x4a525e }),
  ceil: new THREE.MeshLambertMaterial({ map: T.ceil, color: 0x6a6e74, side: THREE.DoubleSide }),
  seat: new THREE.MeshLambertMaterial({ map: T.seat }),
  steel: new THREE.MeshLambertMaterial({ color: 0x9aa0a8 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x1a1c20 }),
  black: new THREE.MeshBasicMaterial({ color: 0x000000 }),
  yellow: new THREE.MeshLambertMaterial({ color: 0xd8a018 }),
  door: new THREE.MeshLambertMaterial({ color: 0x5a6470 }),
  red: new THREE.MeshLambertMaterial({ color: 0xa01010 }),
  tube: new THREE.MeshBasicMaterial({ color: 0xe8f0ff }),
  tubeBad: new THREE.MeshBasicMaterial({ color: 0xe8f0ff }),
  glass: new THREE.MeshBasicMaterial({ color: 0x334455, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
  crack: new THREE.MeshBasicMaterial({ map: T.crack, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
  ground: new THREE.MeshLambertMaterial({ map: T.ground, color: 0x6a7a6a }),
  ballast: new THREE.MeshLambertMaterial({ map: T.ballast }),
  tree: new THREE.MeshLambertMaterial({ color: 0x0f1a12, flatShading: true }),
  pole: new THREE.MeshLambertMaterial({ color: 0x2a2420 }),
  bldg: new THREE.MeshLambertMaterial({ color: 0x101218 }),
  win: new THREE.MeshBasicMaterial({ color: 0xffb860, toneMapped: false }),
  mtn: new THREE.MeshBasicMaterial({ color: 0x0b0f1a, fog: false }),
  blood: new THREE.MeshBasicMaterial({ map: T.blood, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
  sign: new THREE.MeshBasicMaterial({ map: T.sign, toneMapped: false }),
  exit: new THREE.MeshBasicMaterial({ map: T.exit, toneMapped: false }),
  eye: new THREE.MeshBasicMaterial({ color: 0xffd020, toneMapped: false }),
  eyeR: new THREE.MeshBasicMaterial({ color: 0xff2010, toneMapped: false }),
  pus: new THREE.MeshBasicMaterial({ color: 0x8aff30, toneMapped: false }),
  gas: new THREE.MeshBasicMaterial({ color: 0x40a020, transparent: true, opacity: 0.07, depthWrite: false, side: THREE.BackSide }),
  valve: new THREE.MeshLambertMaterial({ color: 0xc02020, emissive: 0x300000 }),
  glowS: new THREE.SpriteMaterial({ map: T.glow, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
};
// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x40506a, 0x181410, 0.5); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x8090c0, 0.7); moon.position.set(-40, 60, 10); scene.add(moon);
const ceilL = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xdfe8ff, 3, 8, 1.8); scene.add(l); ceilL.push(l); }
const torch = new THREE.SpotLight(0xfff0d8, 0, 28, 0.42, 0.55, 1.2); camera.add(torch); torch.position.set(0.1, -0.05, -0.75); camera.add(torch.target); torch.target.position.set(0, 0, -7);
torch.shadow.mapSize.set(1024, 1024); torch.shadow.bias = -0.0006; torch.shadow.camera.near = 0.2; torch.shadow.camera.far = 30;
const muzL = new THREE.PointLight(0xffb050, 0, 9, 1.8); camera.add(muzL); muzL.position.set(0.15, -0.05, -1.2);
const passL = new THREE.PointLight(0xffa040, 0, 26, 1.2); scene.add(passL);
const bossL = new THREE.PointLight(0xff3010, 0, 8, 1.8); scene.add(bossL);
// ---------- quality ----------
function applyQuality() {
  const s = ui.save.s; const wantHigh = s.quality === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, wantHigh ? 1.75 : 1));
  renderer.setSize(innerWidth, innerHeight, false);
  if (wantHigh !== high || !post) {
    high = wantHigh; if (post) post.dispose(); post = makePost(renderer, scene, camera, high);
    renderer.shadowMap.enabled = high; torch.castShadow = high; scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
  }
  post.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const sc = renderer.getPixelRatio() * innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  fxA.uniforms.uScale.value = sc; fxN.uniforms.uScale.value = sc;
  sound.setVolume(s.vol); input.sens = s.sens;
}
addEventListener('resize', () => applyQuality());
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = Math.random; const rr = (a, b) => a + R() * (b - a);

// ---------- train world ----------
const CL = 20, HW = 1.5, CH = 2.45, AISLE = 0.68;
const G = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 12, 9), cyl: new THREE.CylinderGeometry(1, 1, 1, 10), plane: new THREE.PlaneGeometry(1, 1), cone: new THREE.ConeGeometry(1, 1, 7) };
let world = new THREE.Group(); scene.add(world);
let nC = 3, zFront = -60, windows = [], fixtures = [], doors = [], valves = [], gasZones = [], decals = [], IB = {}, ownGeo = [];
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function inst(key, geo, mat, x, y, z, sx, sy, sz, ry = 0, rx = 0, cast = true) { (IB[key] || (IB[key] = { geo, mat, cast, list: [] })).list.push([x, y, z, sx, sy, sz, ry, rx]); return IB[key].list.length - 1; }
function finalizeInst() {
  for (const k in IB) { const b = IB[k]; const im = new THREE.InstancedMesh(b.geo, b.mat, b.list.length); b.list.forEach((a, i) => { _p.set(a[0], a[1], a[2]); _q.setFromEuler(_e.set(a[7], a[6], a[8] || 0)); _s.set(a[3], a[4], a[5]); im.setMatrixAt(i, _m.compose(_p, _q, _s)); });
    im.castShadow = b.cast; im.receiveShadow = true; im.computeBoundingSphere(); im.frustumCulled = false; world.add(im); b.im = im; }
}
function setInstScale(key, i, s) { const b = IB[key]; if (!b || !b.im) return; const a = b.list[i]; _p.set(a[0], a[1], a[2]); _q.setFromEuler(_e.set(a[7], a[6], a[8] || 0)); _s.set(a[3] * s, a[4] * s, a[5] * s); b.im.setMatrixAt(i, _m.compose(_p, _q, _s)); b.im.instanceMatrix.needsUpdate = true; }
function box(mat, sx, sy, sz, x, y, z, parent = world) { const m = new THREE.Mesh(G.box, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
function partition(z, isEnd) {
  const w = HW - 0.55; for (const s of [-1, 1]) inst('wall', G.box, M.wall, s * (0.55 + w / 2), CH / 2, z, w, CH, 0.14);
  inst('wall', G.box, M.wall, 0, 2.0 + (CH - 2.0) / 2, z, 1.1, CH - 2.0, 0.14);
  for (const s of [-1, 1]) inst('frame', G.box, M.dark, s * 0.58, 1.0, z, 0.06, 2.0, 0.2);
  const ex = new THREE.Mesh(G.plane, M.exit); ex.scale.set(0.5, 0.19, 1); ex.position.set(0, 2.2, z - 0.08); ex.rotation.y = 0; world.add(ex);
  const ex2 = ex.clone(); ex2.position.z = z + 0.08; ex2.rotation.y = Math.PI; world.add(ex2);
  const d = new THREE.Group(); d.position.set(0, 0, z); world.add(d); const panels = [];
  for (const s of [-1, 1]) { const p = new THREE.Group(); d.add(p); box(M.door, 0.56, 2.0, 0.06, 0, 1.0, 0, p); box(M.black, 0.32, 0.5, 0.07, 0, 1.45, 0, p); box(M.yellow, 0.56, 0.05, 0.07, 0, 0.05, 0, p); p.userData.s = s; p.position.x = s * 0.28; panels.push(p); }
  const door = { z, open: 0, target: 0, panels, isEnd }; doors.push(door); return door;
}
function buildCoach(i, seed) {
  const z0 = -i * CL, zc = z0 - CL / 2;
  const fl = new THREE.Mesh(G.plane, M.floor); fl.rotation.x = -Math.PI / 2; fl.scale.set(HW * 2, CL, 1); fl.position.set(0, 0, zc); fl.receiveShadow = true; world.add(fl);
  inst('ceil', G.box, M.ceil, 0, CH, zc, 2.1, 0.04, CL, 0, 0, false);
  for (const s of [-1, 1]) { inst('ceilS', G.box, M.wallLow, s * 1.28, CH - 0.1, zc, 0.5, 0.04, CL, 0, 0, false); IB.ceilS.list[IB.ceilS.list.length - 1].push(-s * 0.42);
    inst('wallLow', G.box, M.wallLow, s * (HW + 0.05), 0.475, zc, 0.1, 0.95, CL, 0, 0, false);
    inst('wall', G.box, M.wall, s * (HW + 0.05), 2.2, zc, 0.1, 0.5, CL, 0, 0, false);
    inst('rack', G.box, M.dark, s * 1.22, 1.98, zc, 0.5, 0.03, CL - 1, 0, 0, false);
    inst('rackL', G.box, M.steel, s * 0.98, 1.92, zc, 0.03, 0.1, CL - 1, 0, 0, false);
    inst('strip', G.box, M.red, s * (HW - 0.01), 0.97, zc, 0.03, 0.05, CL, 0, 0, false);
  }
  const nW = 8, sp = CL / nW;
  for (let k = 0; k < nW; k++) {
    const wz = z0 - sp * (k + 0.5);
    for (const s of [-1, 1]) {
      inst('pillar', G.box, M.wall, s * (HW + 0.05), 1.45, wz - sp / 2, 0.1, 1.0, sp - 1.5, 0, 0, false);
      const gi = inst('glass', G.plane, M.glass, s * (HW + 0.02), 1.45, wz, 1.5, 1.0, 1, Math.PI / 2, 0, false);
      windows.push({ s, z: wz, coach: i, broken: false, gi, cool: 0 });
      // seats facing each other
      for (const d of [-1, 1]) { const sz = wz + d * 0.62;
        inst('seat', G.box, M.seat, s * 1.0, 0.45, sz, 0.95, 0.14, 0.5);
        inst('seatB', G.box, M.seat, s * 1.0, 0.88, sz + d * 0.27, 0.95, 0.75, 0.12, 0, d * 0.12);
        inst('leg', G.box, M.dark, s * 1.0, 0.2, sz, 0.8, 0.38, 0.06); }
      inst('table', G.box, M.dark, s * 1.33, 0.72, wz, 0.32, 0.04, 0.55);
      if (R() < 0.25) inst('bag', G.box, R() < 0.5 ? M.red : M.dark, s * 1.15, 2.08, wz + rr(-0.6, 0.6), rr(0.3, 0.45), rr(0.18, 0.3), rr(0.4, 0.7));
    }
    const bad = R() < 0.22;
    inst(bad ? 'tubeBad' : 'tube', G.box, bad ? M.tubeBad : M.tube, 0, CH - 0.03, wz, 0.14, 0.03, 1.3, 0, 0, false);
    inst('housing', G.box, M.steel, 0, CH - 0.01, wz, 0.24, 0.03, 1.4, 0, 0, false);
    fixtures.push({ pos: new THREE.Vector3(0, CH - 0.38, wz), bad, ph: R() * 10 });
    if (R() < 0.5) { const bz = wz + rr(-0.8, 0.8); inst('blood', G.plane, M.blood, rr(-0.4, 0.4), 0.012, bz, rr(0.7, 1.6), rr(0.7, 1.6), 1, 0, -Math.PI / 2, false); IB.blood.list[IB.blood.list.length - 1].push(rr(0, 6)); }
    if (R() < 0.3) { const s = R() < 0.5 ? -1 : 1; inst('bloodW', G.plane, M.blood, s * (HW - 0.0), rr(0.3, 0.9), wz + rr(-0.8, 0.8), rr(0.6, 1.1), rr(0.6, 1.0), 1, -s * Math.PI / 2, 0, false); }
  }
  for (const s of [-1, 1]) for (const zz of [z0 - 1.0, z0 - CL + 1.0]) inst('pole', G.cyl, M.yellow, s * 0.75, CH / 2, zz, 0.025, CH, 0.025);
  for (let k = 0; k < 18; k++) for (const s of [-1, 1]) { inst('strap', G.box, M.dark, s * 0.75, 2.2, z0 - 0.6 - k * 1.08, 0.015, 0.3, 0.015, 0, 0, false); inst('handle', G.box, M.yellow, s * 0.75, 2.03, z0 - 0.6 - k * 1.08, 0.02, 0.06, 0.1, 0, 0, false); }
  const sg = new THREE.Mesh(G.plane, M.sign); sg.scale.set(0.9, 0.22, 1); sg.position.set(0, 2.25, z0 - CL + 0.1); world.add(sg);
}
// outside scenery (moves past the train)
const OUT = new THREE.Group(); scene.add(OUT);
const groundM = new THREE.Mesh(new THREE.PlaneGeometry(500, 900), M.ground); groundM.rotation.x = -Math.PI / 2; groundM.position.set(0, -1.3, -150); OUT.add(groundM);
const ballastM = new THREE.Mesh(new THREE.PlaneGeometry(5, 900), M.ballast); ballastM.rotation.x = -Math.PI / 2; ballastM.position.set(0, -1.27, -150); OUT.add(ballastM);
const SPAN = 320, ZB = 60;
const trees = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 6), M.tree, 160); const treeD = [];
for (let i = 0; i < 160; i++) { const s = Math.random() < 0.5 ? -1 : 1; treeD.push({ x: s * (9 + Math.random() * 70), z: ZB - Math.random() * SPAN, h: 5 + Math.random() * 9, r: 1.4 + Math.random() * 2 }); }
OUT.add(trees); trees.frustumCulled = false;
const poles = new THREE.InstancedMesh(G.cyl, M.pole, 18), poleD = []; for (let i = 0; i < 18; i++) poleD.push({ x: 4.2, z: ZB - i * (SPAN / 18) }); OUT.add(poles); poles.frustumCulled = false;
const arms = new THREE.InstancedMesh(G.box, M.pole, 18); OUT.add(arms); arms.frustumCulled = false;
const bldgs = []; for (let i = 0; i < 10; i++) { const g = new THREE.Group(); const w = 6 + Math.random() * 10, h = 4 + Math.random() * 10; box(M.bldg, w, h, 6, 0, h / 2 - 1.3, 0, g);
  for (let k = 0; k < 5; k++) if (Math.random() < 0.7) { const wm = new THREE.Mesh(G.plane, M.win); wm.scale.set(0.9, 0.9, 1); const s = Math.random() < 0.5; wm.position.set(rr(-w / 2 + 1, w / 2 - 1), rr(0, h - 2.5), 3.02); g.add(wm); }
  const s = Math.random() < 0.5 ? -1 : 1; g.position.set(s * (30 + Math.random() * 50), 0, ZB - Math.random() * SPAN); g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; OUT.add(g); bldgs.push(g); }
for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, r = 300; const m = new THREE.Mesh(G.cone, M.mtn); const h = 40 + Math.random() * 70; m.scale.set(60 + Math.random() * 60, h, 40); m.position.set(Math.cos(a) * r, h / 2 - 10, Math.sin(a) * r - 80); OUT.add(m); }
const stars = (() => { const n = 700, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.2; p[i * 3] = Math.cos(th) * Math.sin(ph) * 350; p[i * 3 + 1] = Math.cos(ph) * 350; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 350; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaabbff, size: 1.3, sizeAttenuation: false, fog: false })); })();
scene.add(stars);
const moonS = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xd8e0ff, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); moonS.scale.set(60, 60, 1); moonS.position.set(-200, 160, -120); scene.add(moonS);
const moonM = new THREE.Mesh(new THREE.SphereGeometry(10, 20, 14), new THREE.MeshBasicMaterial({ color: 0xeef0ff, fog: false })); moonM.position.copy(moonS.position); scene.add(moonM);
function updateOutside(dt, spd) {
  const dz = spd * dt;
  for (let i = 0; i < treeD.length; i++) { const t = treeD[i]; t.z += dz; if (t.z > ZB) { t.z -= SPAN; } _p.set(t.x, t.h / 2 - 1.3, t.z); _q.identity(); _s.set(t.r, t.h, t.r); trees.setMatrixAt(i, _m.compose(_p, _q, _s)); }
  trees.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < poleD.length; i++) { const t = poleD[i]; t.z += dz; if (t.z > ZB) t.z -= SPAN; _p.set(t.x, 2.5, t.z); _q.identity(); _s.set(0.09, 7.6, 0.09); poles.setMatrixAt(i, _m.compose(_p, _q, _s)); _p.set(t.x - 0.6, 5.9, t.z); _s.set(1.6, 0.08, 0.08); arms.setMatrixAt(i, _m.compose(_p, _q, _s)); }
  poles.instanceMatrix.needsUpdate = true; arms.instanceMatrix.needsUpdate = true;
  bldgs.forEach(b => { b.position.z += dz; if (b.position.z > ZB) b.position.z -= SPAN; });
  M.ground.map.offset.y -= dz / (900 / 60); M.ballast.map.offset.y -= dz / (900 / 60);
}
function clearWorld() {
  scene.remove(world); world.traverse(o => { if (o.isInstancedMesh) o.dispose(); }); world = new THREE.Group(); scene.add(world);
  windows = []; fixtures = []; doors = []; valves = []; gasZones = []; decals = []; IB = {};
}
function buildTrain(level, coaches) {
  clearWorld(); R = mulberry(level * 7919 + 13); nC = coaches; zFront = -nC * CL;
  for (let i = 0; i < nC; i++) buildCoach(i);
  partition(0, true); for (let i = 1; i < nC; i++) partition(-i * CL, false); partition(zFront, true);
  finalizeInst(); R = Math.random;
}
// ---------- viewmodel weapons ----------
const vm = new THREE.Group(); camera.add(vm); vm.position.set(0.2, -0.22, -0.42); vm.scale.setScalar(0.75);
const gunM = new THREE.MeshLambertMaterial({ color: 0x1c1e22 }), gunM2 = new THREE.MeshLambertMaterial({ color: 0x0e0f11 }), woodM = new THREE.MeshLambertMaterial({ color: 0x5a3418 }), gloveM = new THREE.MeshLambertMaterial({ color: 0x2a2018 }), sleeveM = new THREE.MeshLambertMaterial({ color: 0x3a4a2a });
const GUNS = {};
{ const g = new THREE.Group(); box(gunM, 0.045, 0.05, 0.22, 0, 0.02, -0.08, g); box(gunM2, 0.04, 0.12, 0.05, 0, -0.06, 0.0, g).rotation.x = 0.25; box(gunM2, 0.012, 0.012, 0.03, 0, 0.052, -0.17, g); box(gloveM, 0.07, 0.07, 0.09, 0, -0.07, 0.03, g); box(sleeveM, 0.09, 0.09, 0.3, 0.01, -0.09, 0.2, g); GUNS.pistol = { g, tip: new THREE.Vector3(0, 0.02, -0.2) }; }
{ const g = new THREE.Group(); box(gunM, 0.05, 0.06, 0.34, 0, 0.0, -0.1, g); const b = new THREE.Mesh(G.cyl, gunM2); b.scale.set(0.016, 0.5, 0.016); b.rotation.x = Math.PI / 2; b.position.set(0, 0.025, -0.45); g.add(b); const b2 = b.clone(); b2.position.y = -0.01; g.add(b2);
  box(woodM, 0.055, 0.05, 0.2, 0, -0.025, -0.4, g); box(woodM, 0.05, 0.09, 0.26, 0, -0.05, 0.16, g); box(gloveM, 0.07, 0.07, 0.09, 0, -0.07, 0.03, g); box(gloveM, 0.07, 0.06, 0.08, -0.02, -0.06, -0.38, g); box(sleeveM, 0.09, 0.09, 0.3, 0.01, -0.09, 0.2, g); GUNS.shotgun = { g, tip: new THREE.Vector3(0, 0.01, -0.72) }; }
{ const g = new THREE.Group(); box(gunM, 0.05, 0.08, 0.42, 0, 0.0, -0.12, g); box(gunM2, 0.035, 0.13, 0.06, 0, -0.1, -0.12, g).rotation.x = -0.2; box(gunM2, 0.02, 0.03, 0.18, 0, 0.055, -0.08, g); const b = new THREE.Mesh(G.cyl, gunM2); b.scale.set(0.013, 0.22, 0.013); b.rotation.x = Math.PI / 2; b.position.set(0, 0.01, -0.43); g.add(b);
  box(gunM2, 0.045, 0.08, 0.2, 0, -0.02, 0.17, g); box(gloveM, 0.07, 0.07, 0.09, 0, -0.07, 0.03, g); box(gloveM, 0.07, 0.06, 0.08, -0.02, -0.055, -0.26, g); box(sleeveM, 0.09, 0.09, 0.3, 0.01, -0.09, 0.2, g); GUNS.rifle = { g, tip: new THREE.Vector3(0, 0.01, -0.55) }; }
for (const k in GUNS) { vm.add(GUNS[k].g); GUNS[k].g.visible = false; GUNS[k].g.traverse(o => { o.castShadow = false; o.receiveShadow = false; }); }
const flashSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xffb040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); flashSp.scale.set(0.35, 0.35, 1); vm.add(flashSp); flashSp.visible = false;
const flashStar = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (g) => { g.translate(32, 32); for (let i = 0; i < 7; i++) { g.rotate(Math.PI * 2 / 7); const gr = g.createLinearGradient(0, 0, 30, 0); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(1, 'rgba(255,120,0,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(0, -3); g.lineTo(30, 0); g.lineTo(0, 3); g.fill(); } }), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
flashStar.scale.set(0.22, 0.22, 1); vm.add(flashStar); flashStar.visible = false;

// ---------- zombies ----------
function part(mat, sx, sy, sz, x, y, z, parent, geo = G.box) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function joint(parent, x, y, z) { const j = new THREE.Group(); j.position.set(x, y, z); parent.add(j); return j; }
const SHIRTS = [0x4a3a2a, 0x2a3a5a, 0x5a2a2a, 0x3a4a3a, 0x6a6a60, 0x1a1a20, 0x7a5a30];
const CIVC = [0xc04040, 0x3070c0, 0xe0b030, 0x40a060, 0xa050c0, 0xe07030];
function buildZombie(type, D) {
  const g = new THREE.Group(); g.rotation.order = 'YXZ'; const mats = []; const P = {};
  const mk = (c, o = {}) => { const m = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o)); mats.push(m); return m; };
  const civ = type === 'civ', boss = type === 'boss';
  const skinC = civ ? [0xd8a880, 0xb07850, 0x8a5a3a][Math.random() * 3 | 0] : { walker: 0x7a8a6a, runner: 0x9a9888, brute: 0x5d6b4c, bloater: 0x7a9050, boss: 0x6a7058 }[type];
  const skin = mk(skinC), shirt = mk(boss ? 0x34466e : civ ? CIVC[Math.random() * CIVC.length | 0] : SHIRTS[Math.random() * SHIRTS.length | 0]), pants = mk(boss ? 0x20283c : [0x22252e, 0x3a3024, 0x1a2a3a][Math.random() * 3 | 0]), bl = mk(0x5a0808);
  const W = { walker: 1, runner: 0.9, brute: 1.35, bloater: 1.25, civ: 1, boss: 1.6 }[type], Hs = { walker: 1, runner: 0.97, brute: 1.12, bloater: 1, civ: 0.95, boss: 1.18 }[type];
  const legL = 0.82 * Hs, torH = 0.62 * Hs;
  P.hip = joint(g, 0, legL, 0);
  P.lL = joint(P.hip, -0.11 * W, 0, 0); P.lR = joint(P.hip, 0.11 * W, 0, 0);
  for (const L of [P.lL, P.lR]) { part(pants, 0.15 * W, legL * 0.55, 0.16 * W, 0, -legL * 0.27, 0, L); const kn = joint(L, 0, -legL * 0.52, 0); L.userData.kn = kn; part(pants, 0.13 * W, legL * 0.5, 0.14 * W, 0, -legL * 0.24, 0, kn); part(M.dark, 0.14 * W, 0.08, 0.26, 0, -legL * 0.47, 0.05, kn); }
  P.tor = joint(P.hip, 0, 0, 0);
  if (type === 'bloater') { part(skin, 0.42, 0.42, 0.4, 0, torH * 0.45, 0.06, P.tor, G.sph); for (let i = 0; i < 9; i++) { const a = Math.random() * 6.28, y = Math.random(); part(M.pus, 0.06, 0.06, 0.06, Math.cos(a) * 0.38, torH * (0.2 + y * 0.6), Math.sin(a) * 0.36 + 0.05, P.tor, G.sph); } }
  else part(shirt, 0.44 * W, torH, 0.25 * W, 0, torH / 2, 0, P.tor);
  if (!civ) for (let i = 0; i < 3; i++) part(bl, rr(0.08, 0.2), rr(0.08, 0.2), 0.02, rr(-0.15, 0.15) * W, rr(0.15, 0.55) * torH, 0.13 * W + 0.002, P.tor);
  P.head = joint(P.tor, 0, torH + 0.05, 0.02);
  part(skin, 0.07 * W, 0.08, 0.07 * W, 0, 0, 0, P.head); // neck
  const hs = boss ? 0.95 : 1; part(skin, 0.125 * hs, 0.145 * hs, 0.13 * hs, 0, 0.18, 0.02, P.head, G.sph); part(skin, 0.07 * hs, 0.035, 0.03, 0, 0.21, 0.12 * hs, P.head);
  P.jaw = joint(P.head, 0, 0.08, 0.03); part(skin, 0.15 * hs, 0.05, 0.13 * hs, 0, -0.02, 0.02, P.jaw);
  if (!civ) { part(M.black, 0.09, 0.025, 0.02, 0, 0.1, 0.135 * hs, P.head); const em = type === 'runner' || boss ? M.eyeR : M.eye; part(em, 0.045, 0.03, 0.02, -0.055, 0.2, 0.145 * hs, P.head); part(em, 0.045, 0.03, 0.02, 0.055, 0.2, 0.145 * hs, P.head); part(bl, 0.1, 0.06, 0.02, 0.06, 0.25, 0.14, P.head); }
  else { part(M.black, 0.035, 0.03, 0.02, -0.055, 0.2, 0.145, P.head); part(M.black, 0.035, 0.03, 0.02, 0.055, 0.2, 0.145, P.head); part(mk([0x1a1008, 0x3a2010, 0x101010][Math.random() * 3 | 0]), 0.26, 0.08, 0.27, 0, 0.32, 0.01, P.head); }
  if (boss) { const cap = mk(0x101830); part(cap, 0.3, 0.1, 0.3, 0, 0.35, 0, P.head); part(cap, 0.28, 0.02, 0.14, 0, 0.31, 0.18, P.head); part(M.yellow, 0.06, 0.05, 0.02, 0, 0.36, 0.155, P.head); part(M.yellow, 0.06, 0.04, 0.02, -0.12, torH * 0.8, 0.205, P.tor);
    for (let i = 0; i < 12; i++) part(M.pus, rr(0.05, 0.1), rr(0.05, 0.1), rr(0.05, 0.1), rr(-0.3, 0.3), rr(0.2, 0.9) * torH, -0.2, P.tor, G.sph);
    for (let i = 0; i < 6; i++) part(M.dark, 0.04, 0.22, 0.04, rr(-0.25, 0.25), torH * rr(0.4, 1), -0.22, P.tor, G.cone).rotation.x = -1.1; }
  const aw = type === 'brute' || boss ? 0.14 : 0.09, al = 0.36 * Hs;
  P.aL = joint(P.tor, -(0.27 * W), torH - 0.06, 0); P.aR = joint(P.tor, 0.27 * W, torH - 0.06, 0);
  for (const A of [P.aL, P.aR]) { const big = boss && A === P.aR; const k = big ? 1.9 : 1;
    part(type === 'runner' || type === 'brute' || big ? skin : shirt, aw * k, al * k, aw * k, 0, -al * k / 2, 0, A); const el = joint(A, 0, -al * k, 0); A.userData.el = el; part(skin, aw * 0.85 * k, al * k, aw * 0.85 * k, 0, -al * k / 2, 0, el); part(skin, aw * 0.9 * k, 0.1 * k, aw * k, 0, -al * k - 0.05, 0.02, el);
    if (big) { for (let i = 0; i < 6; i++) part(M.pus, 0.07, 0.07, 0.07, rr(-0.12, 0.12), -rr(0.1, 0.7), rr(-0.12, 0.12), el, G.sph); for (let i = 0; i < 4; i++) part(M.steel, 0.03, 0.18, 0.03, (i - 1.5) * 0.06, -al * k - 0.16, 0.06, el, G.cone).rotation.x = Math.PI; } }
  g.traverse(o => { o.castShadow = true; }); P.head.traverse(o => { o.userData.head = true; });
  const base = { walker: { hp: 60, speed: 1.25, dmg: 9, rad: 0.32, reach: 1.05 }, runner: { hp: 38, speed: 3.6, dmg: 6, rad: 0.3, reach: 1.0 }, brute: { hp: 240, speed: 1.55, dmg: 20, rad: 0.42, reach: 1.25 }, bloater: { hp: 70, speed: 1.0, dmg: 8, rad: 0.42, reach: 1.1 }, civ: { hp: 100, speed: 0, dmg: 0, rad: 0.3, reach: 0 }, boss: { hp: 2600, speed: 1.9, dmg: 26, rad: 0.62, reach: 1.7 } }[type];
  const e = Object.assign({}, base, { type, g, P, mats, t: Math.random() * 10, atk: 0, cd: 0.5, state: 'chase', st: 0, flash: 0, stun: 0, headY: legL + torH + 0.22 * Hs, boss, civ, x: 0 });
  if (!civ) { e.hp *= D.hp; e.speed *= D.spd; e.dmg *= D.dmg; }
  e.maxHp = e.hp; return e;
}
function animZombie(e, dt, moving) {
  const P = e.P; const sp = e.type === 'runner' ? 2.2 : e.boss ? 0.9 : 1; const t = (e.t += dt * (moving ? sp : 0.35));
  const a = e.atk > 0 ? Math.sin((1 - e.atk / e.atkDur) * Math.PI) : 0;
  if (e.civ) { const sh = Math.sin(t * 30) * 0.02; P.lL.rotation.x = P.lR.rotation.x = -1.45; P.lL.userData.kn.rotation.x = P.lR.userData.kn.rotation.x = 1.45; P.tor.rotation.x = 0.55 + sh; P.aL.rotation.set(-2.6, 0, 0.5); P.aR.rotation.set(-2.6, 0, -0.5); P.aL.userData.el.rotation.x = -1.9; P.aR.userData.el.rotation.x = -1.9; P.head.rotation.x = 0.4; return; }
  const w = Math.sin(t * 4.2), lean = e.type === 'runner' ? 0.45 : e.boss ? 0.35 : 0.15;
  P.lL.rotation.x = w * 0.55 * (moving ? 1 : 0.15); P.lR.rotation.x = -w * 0.55 * (moving ? 1 : 0.15);
  P.lL.userData.kn.rotation.x = Math.max(0, -w) * 0.7 * (moving ? 1 : 0); P.lR.userData.kn.rotation.x = Math.max(0, w) * 0.7 * (moving ? 1 : 0);
  P.hip.position.y = P.hip.userData.y0 || (P.hip.userData.y0 = P.hip.position.y); P.hip.position.y = P.hip.userData.y0 - Math.abs(w) * 0.04;
  P.tor.rotation.x = lean + a * 0.35 + Math.sin(t * 1.3) * 0.05; P.tor.rotation.z = Math.sin(t * 2.1) * 0.08 * (e.type === 'walker' ? 1.6 : 0.6);
  P.head.rotation.z = Math.sin(t * 1.7 + e.x) * 0.3; P.head.rotation.x = -0.2 + Math.sin(t * 0.9) * 0.1; P.jaw.rotation.x = 0.2 + Math.max(0, Math.sin(t * 5)) * 0.3 + a * 0.5;
  const reach = e.type === 'runner' ? -1.0 : -1.45;
  P.aL.rotation.x = reach + Math.sin(t * 3) * 0.15 - a * 0.9 + (e.atkS ? a * 2.2 : 0); P.aR.rotation.x = reach + Math.cos(t * 3) * 0.15 - a * 0.9 + (e.atkS ? 0 : a * 2.2);
  P.aL.rotation.z = -0.15; P.aR.rotation.z = 0.15; P.aL.userData.el.rotation.x = -0.3 - a * 0.4; P.aR.userData.el.rotation.x = -0.3 - a * 0.4;
  if (e.flash > 0) { e.flash -= dt; const v = e.flash > 0 ? 0.8 : 0; e.mats.forEach(m => m.emissive.setRGB(v, v * 0.2, v * 0.1)); }
}
// ---------- UI / input ----------
const ui = new UI({ slug: 'zombie-express', title: 'ZOMBIE EXPRESS', sub: 'DEATH TRAIN', tagline: 'The last train out of the city. It never stops. Neither do they.', levels: LEVELS, isBoss, levelName, upgrades: UPG, sound,
  shopName: 'ARMORY CAR', loseTitle: 'YOU WERE DEVOURED', winTitle: 'LINE SECURED', finalTitle: 'THE DEATH TRAIN STOPS', finalText: 'You put down the <b>Mutated Train Driver</b> and pulled the emergency brake. The survivors step out into the dawn.<br>All 200 lines conquered!',
  howto: `<b>Goal:</b> survive 200 runs aboard the infected express (Easy → Extreme). Fight coach by coach to the engine, protect trapped survivors, hold out until the next safe station, or vent the gas from infected coaches. Every 10th run the <b>Mutated Train Driver</b> attacks.<br><br>
  <b>Watch the windows</b> — zombies smash through the glass. When the power fails only your torch remains.<br><br>
  <b>Desktop:</b> WASD move · Mouse aim · Click shoot · R reload · 1/2/3 or X switch weapon · Q / Right-click shove · E hold to use · Shift sprint · Esc pause<br>
  <b>Mobile:</b> left stick move · drag right side to aim · 🔥 shoot · ⟳ reload · ⇄ weapon · 👊 shove · ✋ use · » sprint toggle`,
  onStart: l => startLevel(l), onResume: () => resume(), onQuit: () => quit(), onSettings: () => applyQuality() });
const input = new Input(canvas, document.getElementById('touch'));
if (IS_TOUCH) document.body.classList.add('touch');
{ const sb = document.querySelector('.t-special'); if (sb) sb.textContent = '👊'; }
input.onUnlock = () => { if (state === 'play') pause(); };
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') pause(); });

let state = 'menu', level = 1, S = null, ambient = null;
const enemies = [], pickups = [], survivors = [], projs = [];
const player = { pos: new THREE.Vector3(0, 1.65, -2), yaw: 0, pitch: 0, hp: 100, maxHp: 100, stam: 1, bob: 0, vel: new THREE.Vector3() };
function U(id) { return ui.save.lv(id); }
function diff(l) { const f = (l - 1) / (LEVELS - 1); return { hp: 1 + f * 2.8 + Math.max(0, f - 0.85) * 4, spd: 1 + f * 0.55, dmg: 1 + f * 1.8, f }; }
function coachOf(z) { return clamp(Math.floor(-z / CL), 0, nC - 1); }
function zLow() { let lo = zFront + 0.35; for (const d of doors) if (d.open < 0.8 && d.z < -0.1 && d.z + 0.35 > lo) lo = d.z + 0.35; return lo; }
function disposeEntities() {
  for (const e of enemies) { scene.remove(e.g); e.mats.forEach(m => m.dispose()); } enemies.length = 0;
  for (const s of survivors) { scene.remove(s.g); s.mats.forEach(m => m.dispose()); } survivors.length = 0;
  for (const p of pickups) scene.remove(p.m); pickups.length = 0; for (const p of projs) scene.remove(p.m); projs.length = 0;
}
function giveWeapons() {
  const am = 1 + U('ammo') * 0.2, rs = 1 + U('ammo') * 0.25; S.ws = {};
  for (const k in WEAP) { const w = WEAP[k]; S.ws[k] = { clip: Math.round(w.clip * am), max: Math.round(w.clip * am), res: Math.round(w.res * rs), own: k === 'pistol' || U(k) > 0 }; }
  S.cur = S.ws.rifle.own ? 'rifle' : S.ws.shotgun.own ? 'shotgun' : 'pistol'; showGun();
}
function showGun() { for (const k in GUNS) GUNS[k].g.visible = k === S.cur; const t = GUNS[S.cur].tip; flashSp.position.copy(t); flashStar.position.copy(t); }
function startLevel(l) {
  sound.unlock(); level = l; ui.curLevel = l; ui.show('load');
  setTimeout(() => {
    disposeEntities(); const obj = objOf(l), D = diff(l);
    const coaches = obj === 'clear' ? 2 + Math.floor(Math.min(l, 160) / 45) : obj === 'infected' ? 2 + Math.min(3, Math.floor(l / 50)) : obj === 'station' ? 3 : 2;
    buildTrain(l, coaches);
    player.maxHp = 100 + U('hp') * 20; player.hp = player.maxHp; player.stam = 1; player.vel.set(0, 0, 0); player.pos.set(0, 1.65, -2.2); player.yaw = 0; player.pitch = -0.04;
    S = { obj, t: 0, kills: 0, need: 0, got: 0, timer: 0, spawnT: obj === 'boss' ? 6 : 2.2, maxAlive: Math.min(3 + Math.floor(l / 9), 16), done: false, endT: 0, coins: 0, hurt: 0, fireCd: 0, reloadT: 0, swapT: 0, shoveCd: 0,
      dark: false, powerT: l >= 4 ? rr(14, 30) : 1e9, faceT: rr(14, 30), passT: rr(3, 8), spd: 30, arrive: false, coach: 0, coachKills: 0, quota: 0, boss: null, phase: 1, valveP: 0, saved: 0, dead: false };
    giveWeapons();
    doors.forEach(d => { const inner = !d.isEnd; d.open = d.target = (inner && obj !== 'clear') ? 1 : 0; });
    if (obj === 'clear') { S.need = nC; S.quota = coachQuota(0); preplace(0); }
    else if (obj === 'protect') { const n = Math.min(2 + Math.floor(l / 40), 6); S.need = n; for (let i = 0; i < n; i++) { const w = windows.filter(w => w.z < -4 && w.z > -CL * 2 + 2)[(i * 5 + 3) % 28] || windows[i * 2]; spawnSurvivor(w.s, w.z + 0.62 * (i % 2 ? 1 : -1)); } S.timer = 45 + Math.min(60, Math.floor(l * 0.35)); }
    else if (obj === 'station') { S.timer = 50 + Math.min(70, Math.floor(l * 0.4)); S.powerT = Math.min(S.powerT, rr(10, 18)); }
    else if (obj === 'infected') { for (let i = 0; i < nC; i++) addValve(i); S.need = nC; }
    else if (obj === 'boss') { const b = buildZombie('boss', { hp: 1 + D.f * 3 + (l === LEVELS ? 1.5 : 0), spd: 1 + D.f * 0.35, dmg: 1 + D.f * 1.2 }); b.g.position.set(0, 0, -CL - 12); b.g.rotation.y = 0; b.state = 'idle'; b.aiT = 3; b.chargeT = 0; if (l === LEVELS) b.g.scale.setScalar(1.08); scene.add(b.g); enemies.push(b); S.boss = b; S.maxAlive = 2 + Math.floor(D.f * 5); }
    for (let i = 0; i < 2 + Math.floor(nC); i++) { const z = rr(zFront + 2, -4); if (obj !== 'clear' || z > -CL) spawnPickup(Math.random() < 0.6 ? 'ammo' : 'med', rr(-0.4, 0.4), z); }
    state = 'play'; ui.show('none'); ui.hudOn(true); input.showTouch(true); input.enabled = true; input.clear(); ui.boss(null); ui.progress(null); ui.prompt('');
    if (ambient) ambient.stop(); ambient = sound.ambient('train');
    ui.msg(obj === 'boss' ? (l === LEVELS ? 'FINAL STOP' : 'THE DRIVER IS COMING') : 'RUN ' + l, levelName(l), 3.2);
    sound.tone(880, 0.6, { type: 'triangle', vol: 0.12, wet: 0.5 }); sound.tone(660, 0.8, { type: 'triangle', vol: 0.12, delay: 0.35, wet: 0.5 }); lastT = performance.now();
  }, 30);
}
function coachQuota(i) { const f = diff(level).f; return 3 + Math.floor(f * 10) + i + Math.floor(level / 25); }
function preplace(ci) { const n = 1 + Math.min(4, Math.floor(level / 20)) + (ci > 0 ? 1 : 0); for (let i = 0; i < n; i++) { const z = -ci * CL - rr(7, CL - 2); spawnZombie(null, { x: rr(-0.5, 0.5), z, idle: true }); } }
function spawnSurvivor(s, z) { const c = buildZombie('civ', {}); c.g.position.set(s * 1.0, -0.33, z); c.g.rotation.y = s > 0 ? -Math.PI / 2 : Math.PI / 2; scene.add(c.g); c.side = s; c.dead = false; c.mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0x40ff80, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 })); c.mark.scale.set(0.35, 0.35, 1); c.mark.position.set(0, 1.9, 0); c.g.add(c.mark); animZombie(c, 0, false); survivors.push(c); }
function addValve(ci) { const z = -ci * CL - CL * 0.5 - 1.1, s = ci % 2 ? 1 : -1; const g = new THREE.Group(); g.position.set(s * 1.4, 1.25, z); world.add(g);
  const pipe = new THREE.Mesh(G.cyl, M.steel); pipe.scale.set(0.05, 1.2, 0.05); pipe.position.y = 0.1; g.add(pipe); const wh = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 6, 16), M.valve); wh.rotation.y = Math.PI / 2; wh.position.x = -s * 0.08; g.add(wh);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xff3020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(0.8, 0.8, 1); sp.position.x = -s * 0.1; g.add(sp);
  const gas = new THREE.Mesh(G.box, M.gas); gas.scale.set(HW * 2 - 0.05, CH - 0.05, CL - 0.3); gas.position.set(0, CH / 2, -ci * CL - CL / 2); world.add(gas);
  valves.push({ ci, g, wh, sp, gas, pos: new THREE.Vector3(s * 1.2, 1.25, z), done: false, p: 0 }); }
function spawnPickup(type, x, z) {
  const m = new THREE.Group();
  if (type === 'ammo') { box(new THREE.MeshLambertMaterial({ color: 0x3a5a2a }), 0.34, 0.16, 0.2, 0, 0.08, 0, m); box(M.yellow, 0.35, 0.03, 0.21, 0, 0.12, 0, m); }
  else if (type === 'med') { box(new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }), 0.3, 0.18, 0.22, 0, 0.09, 0, m); box(M.red, 0.18, 0.05, 0.23, 0, 0.1, 0, m); box(M.red, 0.05, 0.14, 0.23, 0, 0.1, 0, m); }
  else { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 14), new THREE.MeshLambertMaterial({ color: 0xffc020, emissive: 0x402000 })); c.rotation.x = Math.PI / 2; c.position.y = 0.3; m.add(c); }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: type === 'ammo' ? 0xffd040 : type === 'med' ? 0x40ff70 : 0xffc020, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 })); sp.scale.set(0.55, 0.55, 1); sp.position.y = 0.2; m.add(sp);
  m.position.set(x, 0, z); scene.add(m); pickups.push({ m, type, t: Math.random() * 6 });
}
function pickWindow(minD, maxD) {
  const pz = player.pos.z, lo = zLow(); const c = windows.filter(w => w.cool <= 0 && Math.abs(w.z - pz) > minD && Math.abs(w.z - pz) < maxD && w.z > lo + 0.5 && (S.obj !== 'clear' || w.coach === S.coach));
  return c.length ? c[(Math.random() * c.length) | 0] : null;
}
function spawnZombie(type, o = {}) {
  const D = diff(level), L = level;
  if (!type) { const pool = ['walker', 'walker']; if (L >= 4) pool.push('runner'); if (L >= 12) pool.push('bloater', 'runner'); if (L >= 25) pool.push('brute'); if (L >= 60) pool.push('runner', 'brute'); if (L >= 120) pool.push('brute', 'runner'); type = pool[(Math.random() * pool.length) | 0]; }
  const e = buildZombie(type, D); e.x = Math.random() * 10; scene.add(e.g);
  if (o.idle) { e.state = 'idle'; e.g.position.set(o.x, 0, o.z); e.g.rotation.y = Math.random() * 6.28; }
  else { const w = o.win || pickWindow(3, 15);
    if (w) { e.state = 'enter'; e.st = 0; e.win = w; e.g.position.set(w.s * 1.95, 0.55, w.z); e.g.rotation.y = w.s > 0 ? -Math.PI / 2 : Math.PI / 2; w.cool = 4;
      if (!w.broken) { w.broken = true; setInstScale('glass', w.gi, 0); sound.glass(); const p = new THREE.Vector3(w.s * HW, 1.45, w.z); for (let k = 0; k < 40; k++) fxA.spawn(p.x, p.y + rr(-0.45, 0.45), p.z + rr(-0.7, 0.7), -w.s * rr(1, 4), rr(0, 2), rr(-1.5, 1.5), 0.6, 0.8, 1, 0.9, rr(0.03, 0.07), rr(0.6, 1.2), 9, 0.5);
        const d = Math.abs(w.z - player.pos.z); if (d < 4) { shake.add(0.5); ui.flash('#600', 0.35, 0.4); sound.scream(0.8); } else sound.growl(clamp(w.s * 0.8, -1, 1)); }
      else sound.growl(w.s * 0.6); }
    else { const lo = zLow(); const z = player.pos.z - lo > 8 ? lo + 0.5 : -0.6; e.g.position.set(rr(-0.4, 0.4), 0, z); e.state = 'chase'; sound.growl(0); } }
  enemies.push(e); return e;
}
// ---------- combat ----------
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), fwd = new THREE.Vector3(), rayO = new THREE.Vector3(), rayD = new THREE.Vector3();
function camForward(v) { return v.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)); }
function raySphere(o, d, c, r) { const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z; const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r; const h = b * b - cc; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 ? t : -1; }
function wallT(o, d) {
  let t = 60; const lo = zLow();
  if (d.x > 1e-4) t = Math.min(t, (HW - o.x) / d.x); else if (d.x < -1e-4) t = Math.min(t, (-HW - o.x) / d.x);
  if (d.y > 1e-4) t = Math.min(t, (CH - o.y) / d.y); else if (d.y < -1e-4) t = Math.min(t, (0 - o.y) / d.y);
  if (d.z < -1e-4) t = Math.min(t, (lo - 0.3 - o.z) / d.z); else if (d.z > 1e-4) t = Math.min(t, (-0.05 - o.z) / d.z);
  return Math.max(0.01, t);
}
const _c = new THREE.Vector3(), _ray = new THREE.Raycaster(), _ndc = new THREE.Vector2(), _hits = [], _right = new THREE.Vector3(), _up = new THREE.Vector3(), _base = new THREE.Vector3();
function hitVisible(o, root) { for (let q = o; q; q = q.parent) { if (!q.visible) return false; if (q === root) return true; } return true; }
// Hit-scan from the exact camera centre (or the cursor point if the pointer is not locked) against the zombies' visible, animated meshes.
function castShot(o, d, far) {
  let best = far, hitE = null, head = false; _ray.set(o, d); _ray.near = 0.05;
  for (const e of enemies) { if (e.state === 'die') continue; const g = e.g.position, sc2 = e.g.scale.y;
    if (raySphere(o, d, _c.set(g.x, g.y + 1.1 * sc2, g.z), 1.6 * sc2 * (e.boss ? 1.6 : 1)) < 0 && _c.distanceTo(o) > 1.6 * sc2 * (e.boss ? 1.6 : 1)) continue; // broad phase
    e.g.updateMatrixWorld(true); _ray.far = best; _hits.length = 0; _ray.intersectObject(e.g, true, _hits);
    for (const h of _hits) { if (!h.object.isMesh || !hitVisible(h.object, e.g)) continue; if (h.distance < best) { best = h.distance; hitE = e; head = !!h.object.userData.head; } break; } }
  return { t: best, e: hitE, head };
}
function fire() {
  const W = WEAP[S.cur], ws = S.ws[S.cur]; ws.clip--; S.fireCd = W.rate; sound.shot(W.sound); muzL.intensity = 5; S.flashT = 0.05; shake.add(W.kick * 0.12); vm.userData.kick = W.kick;
  flashStar.rotation.z = Math.random() * 6.28; const sc = S.cur === 'shotgun' ? 0.32 : 0.22; flashStar.scale.set(sc, sc, 1);
  const dmgMul = 1 + U('dmg') * 0.15; camera.updateMatrixWorld(); vm.updateMatrixWorld(true); const tip = GUNS[S.cur].tip.clone(); vm.localToWorld(tip);
  _ray.setFromCamera(_ndc.set(input.aim.x, input.aim.y), camera); rayO.copy(_ray.ray.origin); _base.copy(_ray.ray.direction);
  _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize(); _up.setFromMatrixColumn(camera.matrixWorld, 1).normalize();
  // accuracy: first shot (or after a short pause) is pinpoint; sustained auto-fire blooms slightly
  const since = S.t - (S.lastShotT === undefined ? -9 : S.lastShotT); S.bloom = since > W.rate * 2.2 ? 0 : Math.min(1, (S.bloom || 0) + 0.2); S.lastShotT = S.t;
  const shots = [];
  for (let p = 0; p < W.pellets; p++) {
    let r = 0, an = 0;
    if (W.pellets > 1) { if (p > 0) { an = (p - 1) / (W.pellets - 1) * Math.PI * 2 + rr(-0.25, 0.25); r = W.spread * (p % 2 ? 0.55 : 1) * rr(0.85, 1.05); } }
    else if (S.bloom > 0) { an = Math.random() * Math.PI * 2; r = W.spread * S.bloom * Math.sqrt(Math.random()); }
    rayD.copy(_base).addScaledVector(_right, Math.cos(an) * r).addScaledVector(_up, Math.sin(an) * r).normalize();
    const res = castShot(rayO, rayD, wallT(rayO, rayD)); const best = res.t, hitE = res.e, head = res.head;
    const hp = tmpV.copy(rayO).addScaledVector(rayD, best); shots.push({ x: hp.x, y: hp.y, z: hp.z, hit: hitE ? hitE.type : null, head, dist: best });
    if (p < 3) { const L = tmpV2.copy(hp).sub(tip); const len = L.length(); L.divideScalar(len || 1); for (let k = 0; k < 3; k++) { const f = 0.12 + k * 0.28; if (f * len > 0.4) fxA.spawn(tip.x + L.x * len * f, tip.y + L.y * len * f, tip.z + L.z * len * f, L.x * 70, L.y * 70, L.z * 70, 1, 0.8, 0.4, 0.9, 0.03, Math.min(0.05, len * (1 - f) / 70), 0, 0); } }
    fxA.spawn(hp.x - rayD.x * 0.03, hp.y - rayD.y * 0.03, hp.z - rayD.z * 0.03, 0, 0, 0, 1, 0.85, 0.5, 1, hitE ? 0.07 : 0.09, 0.09, 0, 0); // impact flash exactly on the aim point
    if (hitE) hurtZombie(hitE, W.dmg * dmgMul * (head ? 2.2 : 1), hp, rayD, head);
    else { for (let k = 0; k < 7; k++) fxA.spawn(hp.x, hp.y, hp.z, -rayD.x * rr(1, 3) + rr(-1.5, 1.5), rr(0, 2.5), -rayD.z * rr(1, 3) + rr(-1.5, 1.5), 1, rr(0.5, 0.8), 0.2, 1, 0.035, rr(0.2, 0.45), 9, 0.5);
      fxN.spawn(hp.x, hp.y, hp.z, -rayD.x * 0.4, 0.2, -rayD.z * 0.4, 0.4, 0.38, 0.36, 0.5, 0.12, 0.6, 0, 1, 1.5); }
  }
  S.lastShot = { shots, origin: { x: rayO.x, y: rayO.y, z: rayO.z }, aim: { x: input.aim.x, y: input.aim.y } };
  player.pitch = Math.min(1.3, player.pitch + W.kick * 0.012); // recoil after the shot, never before it
  fxA.burst(tip, 6, { color: [[1, 0.7, 0.3]], spread: 1.5, size: 0.05, life: 0.12, grav: 0 });
  if (Math.random() < 0.6) fxN.spawn(tip.x + 0.05, tip.y, tip.z, rr(1, 2), rr(1, 2), 0, 0.8, 0.6, 0.2, 1, 0.025, 0.6, 9, 0.5);
}
function bloodAt(p, dir, n, big) { for (let k = 0; k < n; k++) fxN.spawn(p.x, p.y, p.z, dir.x * rr(0.5, 3) + rr(-1.2, 1.2), rr(-0.5, 2.5), dir.z * rr(0.5, 3) + rr(-1.2, 1.2), rr(0.35, 0.55), 0.02, 0.02, 1, rr(0.03, big ? 0.12 : 0.07), rr(0.5, 1.1), 9.8, 0.4); }
function splat(x, z) { const m = new THREE.Mesh(G.plane, M.blood); m.rotation.x = -Math.PI / 2; m.rotation.z = Math.random() * 6; const s = rr(0.5, 1.1); m.scale.set(s, s, 1); m.position.set(x, 0.015 + Math.random() * 0.003, z); world.add(m); decals.push(m); if (decals.length > 60) { const o = decals.shift(); if (o.isMesh) world.remove(o); } }
function hurtZombie(e, dmg, at, dir, head) {
  if (e.state === 'die') return; if (e.boss && e.state === 'idle') { e.state = 'chase'; } e.hp -= dmg; e.flash = 0.08; ui.hitmark(); if (head) sound.tone(1400, 0.05, { type: 'square', vol: 0.06, wet: 0 });
  bloodAt(at, dir || tmpV2.set(0, 0, -1), head ? 22 : 12, head); if (e.state === 'idle') e.state = 'chase';
  if (!e.boss) { e.g.position.x += (dir ? dir.x : 0) * 0.04 * (e.type === 'brute' ? 0.3 : 1); e.g.position.z += (dir ? dir.z : 0) * 0.08 * (e.type === 'brute' ? 0.3 : 1); e.stun = Math.max(e.stun, e.type === 'brute' ? 0.05 : 0.12); }
  if (e.hp <= 0) killZombie(e, head);
}
function killZombie(e, head) {
  e.state = 'die'; e.st = 0; S.kills++; if (S.obj === 'clear' && coachOf(e.g.position.z) <= S.coach) S.coachKills++;
  const c = e.boss ? 200 + level * 6 : ({ walker: 2, runner: 3, brute: 7, bloater: 4 }[e.type] + Math.floor(level / 20)); S.coins += c;
  sound.scream(e.boss ? 2 : 0.5); splat(e.g.position.x, e.g.position.z);
  if (head && !e.boss) { e.P.head.visible = false; bloodAt(tmpV.set(e.g.position.x, e.headY, e.g.position.z), tmpV2.set(0, 1, 0), 30, true); }
  if (e.type === 'bloater') explode(e.g.position.clone().setY(0.9), 2.8, 34 * diff(level).dmg);
  if (!e.boss) { const r = Math.random(); if (r < 0.22) spawnPickup('ammo', e.g.position.x, e.g.position.z); else if (r < 0.3) spawnPickup('med', e.g.position.x, e.g.position.z); else if (r < 0.55) spawnPickup('coin', e.g.position.x, e.g.position.z); }
}
function explode(p, rad, dmg) {
  sound.explosion(); shake.add(0.9); bossL.position.copy(p); bossL.color.setHex(0xff8030); S.boomT = 0.35;
  fxA.burst(p, 70, { color: [[1, 0.6, 0.2], [1, 0.85, 0.4], [1, 0.3, 0.1]], spread: 7, up: 2, size: 0.22, life: 0.7, grav: 1, drag: 1.5 });
  fxN.burst(p, 30, { color: [[0.08, 0.08, 0.06]], spread: 2.5, up: 1.5, size: 0.9, life: 1.8, grav: -0.3, alpha: 0.7, grow: 2.5, jitter: 0.6 });
  fxN.burst(p, 40, { color: [[0.4, 0.6, 0.1], [0.5, 0.02, 0.02]], spread: 5, up: 3, size: 0.07, life: 1.2, grav: 9.8 });
  const dp = p.distanceTo(player.pos); if (dp < rad) hurtPlayer(dmg * (1 - dp / rad * 0.6));
  for (const o of enemies) if (o.state !== 'die' && o.g.position.distanceTo(p) < rad && !o.boss) hurtZombie(o, 120, o.g.position.clone().setY(1.2), null, false);
  for (const s of survivors) if (!s.dead && s.g.position.distanceTo(p) < rad) hurtSurvivor(s, dmg);
  if (dp < 4) ui.flash('#ff9040', 0.5, 0.4);
}
function hurtPlayer(d) {
  if (state !== 'play' || S.done) return; d *= Math.pow(0.92, U('armor')); player.hp -= d; S.hurt += d; ui.damage(Math.min(0.9, 0.3 + d / 40)); shake.add(0.3 + d / 60); sound.hurt();
  if (player.hp <= 0) { player.hp = 0; lose('You were devoured'); }
}
function hurtSurvivor(s, d) { if (s.dead) return; s.hp -= d; s.flash = 0.1; if (s.hp <= 0) { s.dead = true; s.st = 0; s.mark.visible = false; sound.scream(1); ui.msg('', '<span style="color:#f66">A survivor was killed!</span>', 1.8); bloodAt(s.g.position.clone().setY(1), tmpV2.set(0, 1, 0), 30, true); splat(s.g.position.x * 0.8, s.g.position.z); if (survivors.every(v => v.dead)) lose('All survivors were lost'); } }
function shove() {
  S.shoveCd = 1.1; sound.noise(0.15, { vol: 0.4, f: 900 }); vm.userData.kick = 1.5; camForward(fwd);
  for (const e of enemies) { if (e.state === 'die' || e.state === 'enter') continue; tmpV.subVectors(e.g.position, player.pos).setY(0); const d = tmpV.length(); if (d < 1.8 && tmpV.normalize().dot(tmpV2.set(fwd.x, 0, fwd.z).normalize()) > 0.4) {
    hurtZombie(e, 18 * (1 + U('dmg') * 0.15), e.g.position.clone().setY(1.3), tmpV, false); if (!e.boss) { e.g.position.addScaledVector(tmpV, e.type === 'brute' ? 0.4 : 1.2); e.stun = e.type === 'brute' ? 0.4 : 1.0; } sound.hit(); shake.add(0.2); } }
}
function win() {
  if (S.done) return; S.done = true; S.endT = 2.2; const base = 18 + level * 2 + (isBoss(level) ? 140 : 0) + survivors.filter(s => !s.dead).length * 10; S.coins += base; sound.win();
  const alive = survivors.filter(s => !s.dead).length; const stars = 1 + (S.hurt < player.maxHp * 0.6 ? 1 : 0) + (S.hurt < player.maxHp * 0.25 && (!survivors.length || alive === survivors.length) ? 1 : 0);
  const d = ui.save.d; d.coins += S.coins; d.unlocked = Math.max(d.unlocked, Math.min(LEVELS, level + 1)); d.stars[level] = Math.max(d.stars[level] || 0, stars); ui.save.write(); S.stars = stars;
  ui.msg(isBoss(level) ? 'THE DRIVER IS DOWN' : (S.obj === 'station' || S.obj === 'protect') ? 'SAFE STATION REACHED' : 'TRAIN SECURED', '', 2.2);
  enemies.forEach(e => { if (e.state !== 'die') { e.state = 'die'; e.st = 0; } }); ui.prompt(''); ui.progress(null); ui.boss(null);
}
function lose(why) { if (S.done) return; S.done = true; S.lost = true; S.why = why; S.endT = 2; sound.lose(); const d = ui.save.d; d.coins += Math.floor(S.coins / 2); ui.save.write(); }
function endScreen() {
  state = 'over'; input.enabled = false; input.unlock(); input.showTouch(false); ui.hudOn(false); ui.prompt(''); if (ambient) { ambient.stop(); ambient = null; }
  if (S.lost) ui.result(false, `${S.why || ''}<br>Run <b>${level}</b> · Zombies killed: <b>${S.kills}</b><br>Coins kept: 🪙 <b>${Math.floor(S.coins / 2)}</b>`);
  else if (level === LEVELS) ui.show('final');
  else ui.result(true, `Run <b>${level}</b> complete · Zombies killed: <b>${S.kills}</b>${survivors.length ? ` · Survivors saved: <b>${survivors.filter(s => !s.dead).length}/${survivors.length}</b>` : ''}<br>Coins earned: 🪙 <b>${S.coins}</b> · Total: 🪙 <b>${ui.save.d.coins}</b>`, S.stars);
}
function pause() { if (state !== 'play') return; state = 'paused'; input.enabled = false; player.vel.x = player.vel.z = 0; input.unlock(); input.showTouch(false); ui.show('pause'); document.querySelector('.p-info').innerHTML = 'Run ' + level + ' — ' + levelName(level); }
function resume() { state = 'play'; ui.show('none'); input.enabled = true; input.showTouch(true); input.clear(); lastT = performance.now(); }
function quit() { state = 'menu'; disposeEntities(); input.enabled = false; input.unlock(); input.showTouch(false); ui.hudOn(false); if (ambient) { ambient.stop(); ambient = null; } setupMenu(); }
// window face jump scare
const face = (() => { const z = buildZombie('runner', { hp: 1, spd: 1, dmg: 1 }); z.g.visible = false; scene.add(z.g); return z; })();
function faceScare() { const pz = player.pos.z; const c = windows.filter(w => !w.broken && Math.abs(w.z - pz) < 2.6 && Math.abs(w.z - pz) > 0.6); if (!c.length) return; const w = c[(Math.random() * c.length) | 0];
  face.g.visible = true; face.g.position.set(w.s * 1.85, -0.25, w.z); face.g.rotation.y = w.s > 0 ? -Math.PI / 2 : Math.PI / 2; face.st = 0.9; face.win = w; animZombie(face, 0.01, false); face.P.aL.rotation.x = face.P.aR.rotation.x = -2.6;
  sound.sting(); sound.scream(1.2); shake.add(0.6); ui.flash('#fff', 0.5, 0.2); }
// ---------- main update ----------
function update(dt) {
  S.t += dt; const D = diff(level);
  const [lx, ly] = input.consumeLook(); player.yaw -= lx; player.pitch = clamp(player.pitch - ly, -1.3, 1.3);
  if (input.wasPressed('pause')) { pause(); return; }
  // movement in the aisle
  const mv = input.move(); const sprint = input.sprint() && player.stam > 0.05 && mv.y < 0;
  const spd = 3.6 * (sprint ? 1.55 : 1);
  player.stam = clamp(player.stam + (sprint ? -dt * 0.25 : dt * 0.2), 0, 1);
  const sx = Math.sin(player.yaw), cz = Math.cos(player.yaw);
  const tvx = (-sx * -mv.y + cz * mv.x) * spd, tvz = (-cz * -mv.y - sx * mv.x) * spd;
  player.vel.x = damp(player.vel.x, S.done ? 0 : tvx, 10, dt); player.vel.z = damp(player.vel.z, S.done ? 0 : tvz, 10, dt);
  player.pos.x = clamp(player.pos.x + player.vel.x * dt, -AISLE + 0.2, AISLE - 0.2); player.pos.z = clamp(player.pos.z + player.vel.z * dt, zLow() + 0.1, -0.45);
  for (const e of enemies) { if (e.state === 'die' || e.state === 'enter') continue; const dx = player.pos.x - e.g.position.x, dz = player.pos.z - e.g.position.z, d = Math.hypot(dx, dz), m = e.rad * e.g.scale.x + 0.3; if (d < m && d > 0.001) { player.pos.z = e.g.position.z + dz / d * m; } }
  player.pos.z = clamp(player.pos.z, zLow() + 0.1, -0.45);
  const hv = Math.hypot(player.vel.x, player.vel.z); player.bob += hv * dt * 2.1;
  player.pos.y = 1.65 + Math.sin(player.bob * 2) * 0.04 * Math.min(1, hv / 3) + (S.dead ? -1.2 : 0);
  // weapons
  const firePressed = input.wasPressed('fire'); // a quick click/tap between frames still fires
  S.fireCd -= dt; S.shoveCd -= dt; S.swapT -= dt; const ws = S.ws[S.cur], W = WEAP[S.cur];
  const owned = Object.keys(WEAP).filter(k => S.ws[k].own);
  let want = null; if (input.wasPressed('w1')) want = 'pistol'; if (input.wasPressed('w2')) want = 'shotgun'; if (input.wasPressed('w3')) want = 'rifle'; if (input.wasPressed('weapon')) want = owned[(owned.indexOf(S.cur) + 1) % owned.length];
  if (want && want !== S.cur && S.ws[want].own && !S.done) { S.cur = want; S.reloadT = 0; S.swapT = 0.35; showGun(); sound.click(); }
  if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { const n = Math.min(ws.max - ws.clip, ws.res); ws.clip += n; ws.res -= n; } }
  else if (!S.done && S.swapT <= 0) {
    if ((input.wasPressed('reload') || (ws.clip === 0 && input.isDown('fire'))) && ws.clip < ws.max && ws.res > 0) { S.reloadT = W.reload * Math.pow(0.88, U('reload')); sound.reload(); }
    else if ((input.isDown('fire') || firePressed) && S.fireCd <= 0) { if (ws.clip > 0) fire(); else { sound.click(); S.fireCd = 0.3; if (ws.res <= 0) ui.msg('', 'Out of ammo — switch weapon or find ammo boxes!', 1.5); } }
  }
  if (input.wasPressed('special') && S.shoveCd <= 0 && !S.done) shove();
  // never soft-lock on ammo: if every owned gun is completely empty and no ammo box is lying around, drop one close by
  if (!S.done && S.reloadT <= 0 && Object.values(S.ws).every(w => !w.own || (w.clip <= 0 && w.res <= 0)) && !pickups.some(p => p.type === 'ammo')) { S.dryT = (S.dryT || 0) + dt; if (S.dryT > 2.5) { S.dryT = 0; const z = player.pos.z - 2.2 > zLow() + 0.6 ? player.pos.z - 2.2 : player.pos.z + 1.8; spawnPickup('ammo', rr(-0.4, 0.4), z); ui.msg('', 'An ammo box slid out from under a seat!', 1.8); } } else S.dryT = 0;
  muzL.intensity = Math.max(0, muzL.intensity - dt * 60); S.flashT = (S.flashT || 0) - dt; flashSp.visible = flashStar.visible = S.flashT > 0;
  // spawning
  const alive = enemies.filter(e => e.state !== 'die' && !e.boss).length;
  S.spawnT -= dt * (S.dark ? 1.5 : 1);
  if (!S.done && S.spawnT <= 0) { S.spawnT = Math.max(0.6, 3.4 - D.f * 2.6) * (S.obj === 'boss' ? 2.2 : 1) * (0.7 + Math.random() * 0.6);
    const capOK = S.obj !== 'clear' || (S.coachKills + alive < S.quota && S.coach < nC);
    if (alive < S.maxAlive && capOK && (S.obj !== 'boss' || S.boss.state !== 'idle')) spawnZombie(); }
  windows.forEach(w => { if (w.cool > 0) w.cool -= dt; });
  // enemies
  const lo = zLow();
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], g = e.g; e.cd -= dt;
    if (e.state === 'die') { e.st += dt; const k = Math.min(1, e.st / 0.7); g.rotation.x = -k * k * Math.PI / 2 * (e.boss ? 0.95 : 1); g.position.y = Math.max(-0.1, g.position.y - dt * 0.05);
      if (e.st < 0.7) animZombie(e, dt * 0.5, false);
      if (e.st > (e.boss ? 6 : 3.2)) { g.position.y -= dt * 0.6; } if (e.st > (e.boss ? 7.5 : 4.5)) { scene.remove(g); e.mats.forEach(m => m.dispose()); enemies.splice(i, 1); } continue; }
    if (e.state === 'enter') { e.st += dt; const k = Math.min(1, e.st / 0.9); g.position.x = e.win.s * lerp(1.95, 0.55, k); g.position.y = Math.sin(k * Math.PI) * 0.6 + (1 - k) * 0.2; animZombie(e, dt, true); if (k >= 1) { e.state = 'chase'; g.position.y = 0; } continue; }
    // target: player or nearest survivor
    let tx = player.pos.x, tz = player.pos.z, tgt = null; let dP = Math.hypot(tx - g.position.x, tz - g.position.z);
    for (const s of survivors) { if (s.dead) continue; const ds = Math.hypot(s.g.position.x - g.position.x, s.g.position.z - g.position.z); if (ds < dP * 0.8 && ds < 9) { dP = ds; tgt = s; tx = s.g.position.x * 0.75; tz = s.g.position.z; } }
    tmpV.set(tx - g.position.x, 0, tz - g.position.z); const d = tmpV.length(); tmpV.normalize();
    if (e.state === 'idle') { animZombie(e, dt * 0.6, false); g.rotation.y += Math.sin(S.t + e.x) * dt * 0.3; if (dP < 8.5 || (e.boss && (player.pos.z < -12 || S.t > 5))) { e.state = 'chase'; sound.growl(0); if (e.boss) { sound.scream(2.2); shake.add(1); ui.msg('THE DRIVER', 'He has turned…', 2); ui.flash('#800', 0.5, 0.6); } } continue; }
    if (e.stun > 0) { e.stun -= dt; animZombie(e, dt * 0.3, false); continue; }
    let moving = false; const ry = Math.atan2(tmpV.x, tmpV.z); g.rotation.y = g.rotation.y + Math.atan2(Math.sin(ry - g.rotation.y), Math.cos(ry - g.rotation.y)) * Math.min(1, dt * 8);
    if (e.boss) { moving = bossAI(e, dt, d); }
    else if (d > e.reach * 0.85) { const sp = e.speed * (S.dark ? 1.15 : 1); g.position.x += tmpV.x * sp * dt; g.position.z += tmpV.z * sp * dt; moving = true; }
    else if (e.cd <= 0 && e.atk <= 0) { e.atk = e.atkDur = e.type === 'brute' ? 0.8 : 0.6; e.atkS = Math.random() < 0.5; e.cd = e.type === 'runner' ? 0.8 : 1.3; e.hitDone = false; sound.growl(0); }
    if (e.atk > 0) { e.atk -= dt; if (!e.hitDone && e.atk < e.atkDur * 0.5) { e.hitDone = true; if (d < e.reach * 1.25) { if (tgt) hurtSurvivor(tgt, e.dmg); else hurtPlayer(e.dmg); } } }
    // separation + aisle bounds
    for (const o of enemies) { if (o === e || o.state === 'die' || o.state === 'enter') continue; const dx = g.position.x - o.g.position.x, dz = g.position.z - o.g.position.z, dd = Math.hypot(dx, dz), m = (e.rad + o.rad) * 0.9; if (dd < m && dd > 0.001) { g.position.x += dx / dd * (m - dd) * 0.5; g.position.z += dz / dd * (m - dd) * 0.5; } }
    g.position.x = clamp(g.position.x, -AISLE - 0.05, AISLE + 0.05); g.position.z = clamp(g.position.z, lo + 0.25, -0.35); if (!e.boss) g.position.y = 0;
    animZombie(e, dt, moving);
    if (Math.random() < dt * 0.25) sound.growl(clamp((g.position.x - player.pos.x) * 0.5, -1, 1));
  }
  // survivors
  survivors.forEach(s => { if (s.dead) { s.st += dt; s.g.rotation.z = Math.min(1.2, s.st * 3) * s.side; return; } animZombie(s, dt, false); s.mark.material.opacity = 0.45 + Math.sin(S.t * 4) * 0.25; if (s.flash > 0) { s.flash -= dt; s.mats.forEach(m => m.emissive.setRGB(s.flash > 0 ? 0.6 : 0, 0, 0)); } });
  // projectiles (boss luggage)
  for (let i = projs.length - 1; i >= 0; i--) { const p = projs[i]; p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 8; p.m.rotation.z += dt * 5; p.life -= dt;
    const hitP = p.m.position.distanceTo(player.pos) < 0.7; if (hitP || p.m.position.y < 0.1 || p.life <= 0 || Math.abs(p.m.position.x) > HW) { explode(p.m.position.clone(), 2.0, p.dmg); scene.remove(p.m); projs.splice(i, 1); } }
  // pickups
  for (let i = pickups.length - 1; i >= 0; i--) { const p = pickups[i]; p.t += dt; p.m.rotation.y += dt * 1.5; if (p.type === 'coin') p.m.position.y = Math.sin(p.t * 3) * 0.05;
    if (Math.hypot(p.m.position.x - player.pos.x, p.m.position.z - player.pos.z) < 0.85 && !S.done) {
      if (p.type === 'ammo') { for (const k in S.ws) if (S.ws[k].own) S.ws[k].res += Math.round(S.ws[k].max * (k === 'shotgun' ? 1.2 : 1.6)); ui.msg('', '+ammo', 1); sound.reload(); }
      else if (p.type === 'med') { if (player.hp >= player.maxHp) continue; player.hp = Math.min(player.maxHp, player.hp + 35); ui.msg('', '+35 health', 1); sound.pickup(); }
      else { S.coins += 5; sound.coin(); }
      scene.remove(p.m); pickups.splice(i, 1); } }
  // doors
  doors.forEach(dr => { dr.open = damp(dr.open, dr.target, 4, dt); dr.panels.forEach(p => p.position.x = p.userData.s * (0.28 + dr.open * 0.56)); });
  // objectives
  let objTxt = ''; const act = input.isDown('action') || IS_TOUCH;
  if (S.done) { }
  else if (S.obj === 'clear') {
    if (S.coach < nC) { const left = S.quota - S.coachKills; const inCoach = enemies.filter(e => e.state !== 'die' && coachOf(e.g.position.z) === S.coach).length;
      objTxt = `🚃 Clear coach <b>${S.coach + 1}/${nC}</b> · zombies left: <b>${Math.max(left, inCoach)}</b>`;
      if (left <= 0 && inCoach === 0) { S.coach++; const dr = doors.find(dd => Math.abs(dd.z + S.coach * CL) < 0.1); if (dr) dr.target = 1; sound.tone(520, 0.3, { type: 'triangle', vol: 0.15 }); sound.noise(0.8, { vol: 0.25, type: 'bandpass', f: 400, delay: 0.1 });
        if (S.coach < nC) { S.coachKills = 0; S.quota = coachQuota(S.coach); preplace(S.coach); ui.msg('COACH CLEARED', 'The door to the next coach slides open', 2); for (let k = 0; k < 2; k++) spawnPickup(Math.random() < 0.6 ? 'ammo' : 'med', rr(-0.4, 0.4), -S.coach * CL - rr(3, 15)); }
        else ui.msg('TRAIN CLEARED', 'Get to the engine door!', 2.5); } }
    else { objTxt = `🚪 Reach the engine door · <b>${Math.round(player.pos.z - zFront)}m</b>`; if (player.pos.z < zFront + 0.9) win(); }
  } else if (S.obj === 'protect' || S.obj === 'station') {
    S.timer -= dt; const al = survivors.filter(s => !s.dead).length;
    objTxt = S.obj === 'protect' ? `🧍 Protect survivors: <b>${al}/${survivors.length}</b> · safe station in <b>${Math.max(0, Math.ceil(S.timer))}s</b>` : `🚉 Hold out until the safe station: <b>${Math.max(0, Math.ceil(S.timer))}s</b>`;
    if (S.timer <= 6 && !S.arrive) { S.arrive = true; ui.msg('', 'Train is braking… hold on!', 2); sound.noise(4, { vol: 0.35, type: 'highpass', f: 2500, wet: 0.3 }); }
    if (S.timer <= 0) win();
  } else if (S.obj === 'infected') {
    const left = valves.filter(v => !v.done).length; let near = null;
    for (const v of valves) { if (v.done) continue; const dd = Math.hypot(player.pos.x - v.pos.x, player.pos.z - v.pos.z); if (dd < 1.4) near = v; v.sp.material.opacity = 0.6 + Math.sin(S.t * 6) * 0.4; }
    if (near) { near.p += dt * (act ? 0.65 : 0); near.wh.rotation.x += dt * (act ? 6 : 0); ui.prompt(IS_TOUCH ? 'Venting gas…' : 'Hold <b>E</b> to open the vent valve'); ui.progress(near.p); if (near.p >= 1) { near.done = true; near.sp.visible = false; near.gas.visible = false; sound.noise(1.6, { vol: 0.4, type: 'highpass', f: 1500, to: 400, wet: 0.4 }); ui.msg('COACH PURGED', '', 1.6); ui.prompt(''); ui.progress(null); } }
    else { ui.prompt(''); ui.progress(null); }
    const nv = valves.find(v => !v.done); objTxt = `☣ Vent the infected coaches: <b>${S.need - left}/${S.need}</b>${nv ? ` · valve ${Math.round(Math.abs(nv.pos.z - player.pos.z))}m` : ''}`;
    const cv = valves.find(v => v.ci === coachOf(player.pos.z)); S.gas = cv && !cv.done;
    if (S.gas) { S.gasTick = (S.gasTick || 0) + dt; if (S.gasTick > 1) { S.gasTick = 0; hurtPlayer(2.5 * (1 + D.f)); ui.damage(0.15); sound.tone(120, 0.3, { type: 'sawtooth', vol: 0.05 }); } if (Math.random() < dt * 25) fxN.spawn(player.pos.x + rr(-1.4, 1.4), rr(0.1, 2.2), player.pos.z + (Math.random() < 0.7 ? rr(-8, -2) : rr(2, 5)), rr(-.1, .1), rr(-.05, .1), rr(-.1, .1), 0.3, 0.7, 0.15, 0.25, rr(0.2, 0.45), rr(2, 4), 0, 0, 0.4); }
    if (left === 0) win();
  } else if (S.obj === 'boss') { const b = S.boss; objTxt = `☠ Kill the ${level === LEVELS ? 'final ' : ''}Mutated Train Driver`; ui.boss('MUTATED TRAIN DRIVER', b.hp / b.maxHp); if (b.state === 'die') win(); }
  if (objTxt) ui.set('.h-obj', objTxt);
  // events: power failure, passing lights, face at window
  S.powerT -= dt; if (S.powerT <= 0 && !S.done) { if (!S.dark) { S.dark = true; S.powerT = rr(5, 9) + D.f * 5; sound.powerdown(); ui.msg('', '<span style="color:#ff6">⚡ POWER FAILURE</span>', 2); } else { S.dark = false; S.powerT = rr(18, 38) * (1 - D.f * 0.5) * (S.obj === 'station' ? 0.6 : 1); S.flick = 0.8; sound.tone(60, 0.6, { type: 'square', vol: 0.06 }); } }
  if (S.phase === 2) S.dark = Math.sin(S.t * 0.9) > 0.2;
  S.faceT -= dt; if (S.faceT <= 0) { S.faceT = rr(22, 45); if (!S.done) faceScare(); }
  if (face.g.visible) { face.st -= dt; const k = face.st > 0.6 ? (0.9 - face.st) / 0.3 : 1; face.g.position.x = face.win.s * lerp(2.4, 1.72, k); face.P.head.rotation.z = Math.sin(S.t * 30) * 0.15; if (face.st <= 0) face.g.visible = false; }
  if (S.arrive) S.spd = damp(S.spd, 0, 0.6, dt);
  ui.hp(player.hp / player.maxHp, player.hp); ui.lowHp(player.hp / player.maxHp < 0.3 ? 0.8 : 0);
  ui.set('.h-level', (isBoss(level) ? '💀 ' : '') + 'RUN ' + level + ' / ' + LEVELS + ' <small style="opacity:.7">' + tierOf(level).toUpperCase() + '</small>');
  ui.set('.h-coins b', ui.save.d.coins + (S.done ? 0 : S.coins));
  ui.set('.h-weapon', W.name + (S.reloadT > 0 ? ' · RELOADING…' : ''));
  ui.set('.h-ammo', `${ws.clip}<small> / ${ws.res}</small>`);
  ui.set('.h-extra', `👊 ${S.shoveCd > 0 ? '…' : '<b style="color:#9f6">READY</b>'} &nbsp; ${S.dark ? '<b style="color:#ff6">⚡ POWER OUT</b>' : '💡 power on'} &nbsp; 🔫 ${owned.length}/3 &nbsp; ⚡ ${'▮'.repeat(Math.round(player.stam * 8))}`);
}
function bossAI(b, dt, d) {
  const L = level; b.aiT -= dt; let moving = false; const g = b.g;
  if (b.hp < b.maxHp * 0.5 && S.phase === 1) { S.phase = 2; ui.msg('HE IS MUTATING', 'The power is failing!', 2); sound.scream(2.4); shake.add(1); sound.powerdown(); b.speed *= 1.3; }
  bossL.color.setHex(0xff2010); bossL.position.set(g.position.x, 1.9, g.position.z + 0.9); bossL.intensity = 4 + Math.sin(S.t * 8) * 1.5;
  if (b.chargeT > 0) { b.chargeT -= dt; g.position.x += tmpV.x * b.speed * 4.2 * dt; g.position.z += tmpV.z * b.speed * 4.2 * dt; moving = true; if (Math.random() < 0.5) fxA.spawn(g.position.x + rr(-.3, .3), 0.1, g.position.z, rr(-2, 2), rr(1, 3), rr(-2, 2), 1, 0.6, 0.2, 1, 0.04, 0.3, 9, 0.5);
    if (d < 1.4) { b.chargeT = 0; hurtPlayer(b.dmg * 1.3); player.pos.z += Math.sign(player.pos.z - g.position.z) * 1.6; shake.add(1); sound.explosion(); } }
  else if (d > b.reach * 0.85) { g.position.x += tmpV.x * b.speed * dt; g.position.z += tmpV.z * b.speed * dt; moving = true; }
  else if (b.cd <= 0 && b.atk <= 0) { b.atk = b.atkDur = 0.9; b.atkS = false; b.cd = 1.5; b.hitDone = false; sound.growl(0); }
  if (b.atk > 0 && !b.hitDone && b.atk < 0.45) { b.hitDone = true; shake.add(0.7); fxN.burst(new THREE.Vector3(g.position.x, 0.1, g.position.z - 0.8), 20, { color: [[0.3, 0.3, 0.3]], spread: 3, size: 0.25, life: 0.8, grav: 2, alpha: 0.5, grow: 1.5 }); if (d < b.reach * 1.3) hurtPlayer(b.dmg); }
  if (b.aiT <= 0) { const r = Math.random(); b.aiT = (S.phase === 2 ? 2.4 : 3.6) - Math.min(1.2, L / 160);
    if (r < 0.35 && d > 4) { b.chargeT = 1.1; sound.scream(1.8); ui.flash('#600', 0.3, 0.4); }
    else if (r < 0.7) { const n = S.phase === 2 ? 2 : 1; for (let k = 0; k < n; k++) { const m = new THREE.Mesh(G.box, k ? M.red : M.dark); m.scale.set(0.5, 0.35, 0.3); m.position.set(g.position.x, 2.0, g.position.z); m.castShadow = true; scene.add(m);
        const tt = 0.9 + k * 0.15, dx = player.pos.x - m.position.x + rr(-0.3, 0.3), dz = player.pos.z - m.position.z; projs.push({ m, v: new THREE.Vector3(dx / tt, (player.pos.y - 0.6 - 2.0 + 0.5 * 9.8 * tt * tt) / tt, dz / tt), life: 3, dmg: 14 + L * 0.1 }); } sound.growl(0); }
    else { const alive = enemies.filter(e => !e.boss && e.state !== 'die').length; if (alive < S.maxAlive) { for (let k = 0; k < (S.phase === 2 ? 3 : 2); k++) { const w = pickWindow(2, 14); if (w) spawnZombie(null, { win: w }); } ui.msg('', 'He calls the infected!', 1.4); sound.scream(1.4); } } }
  g.position.y = 0; return moving;
}

// ---------- menu scene ----------
const menuZ = [];
function setupMenu() {
  buildTrain(1, 2); doors.forEach(d => { d.open = d.target = d.isEnd ? 0 : 1; d.panels.forEach(p => p.position.x = p.userData.s * (0.28 + d.open * 0.56)); });
  menuZ.forEach(z => scene.remove(z.g)); menuZ.length = 0;
  [[0.1, -11, 'walker'], [-0.45, -14.5, 'brute'], [0.4, -17, 'runner'], [-0.2, -24, 'walker']].forEach(([x, z, t]) => { const e = buildZombie(t, diff(1)); e.g.position.set(x, 0, z); e.g.rotation.y = 0; scene.add(e.g); menuZ.push(e); });
  windows.filter(w => w.z < -9 && w.z > -13).forEach(w => { w.broken = true; setInstScale('glass', w.gi, 0); });
  S = null;
}
// ---------- loop ----------
let lastT = performance.now(), fpsAcc = 0, fpsN = 0, menuT = 0;
let crossEl = null, crossK = '';
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.max(0, (now - lastT) / 1000), dt = Math.min(MAXDT, rdt); lastT = now;
  let spd = 30, dark = false;
  if (state === 'play') {
    if (S.done) { S.endT -= dt; if (S.lost) { S.dead = true; player.pitch = damp(player.pitch, 0.6, 3, dt); } if (S.endT <= 0) endScreen(); }
    if (state === 'play') update(dt);
    spd = S.spd; dark = S.dark;
    camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0);
    shake.update(dt); camera.position.add(shake.off); camera.rotation.z = shake.roll + Math.sin(now / 900) * 0.006 * (spd / 30) + (S.lost ? Math.min(0.6, (2 - S.endT) * 0.4) : 0);
    camera.position.y += Math.sin(now / 160) * 0.004 * (spd / 30); camera.position.x += Math.sin(now / 1300) * 0.015 * (spd / 30);
    const k = (vm.userData.kick = Math.max(0, (vm.userData.kick || 0) - dt * 7)); const hv = Math.hypot(player.vel.x, player.vel.z) / 4;
    vm.position.set(0.17 + Math.sin(player.bob) * 0.012 * hv, -0.19 + Math.abs(Math.cos(player.bob)) * 0.01 * hv - (S.reloadT > 0 ? 0.18 : 0) - Math.max(0, S.swapT) * 0.5, -0.36 + k * 0.05); vm.rotation.x = k * 0.12 + (S.reloadT > 0 ? 0.5 : 0); vm.rotation.z = S.reloadT > 0 ? 0.3 : 0;
  } else if (state === 'menu') {
    menuT += dt; camera.position.set(Math.sin(menuT * 0.3) * 0.25, 1.6 + Math.sin(menuT * 0.5) * 0.05, -2.5 - (menuT * 0.25) % 5); camera.rotation.set(-0.02, Math.sin(menuT * 0.2) * 0.12, Math.sin(menuT * 0.7) * 0.01);
    menuZ.forEach((z, i) => { animZombie(z, dt * 0.5, true); }); dark = (menuT % 9) > 7.6;
  }
  vm.visible = state !== 'menu';
  updateOutside(state === 'paused' ? 0 : dt, spd);
  // flickering ceiling lights (4 relocating lights at the nearest fixtures)
  const cp = camera.position; const sorted = fixtures.slice().sort((a, b) => Math.abs(a.pos.z - cp.z) - Math.abs(b.pos.z - cp.z));
  S && S.flick > 0 && (S.flick -= dt);
  const flickOn = S && S.flick > 0 ? Math.random() < 0.5 : true;
  let badV = 1; ceilL.forEach((l, i) => { const f = sorted[i]; if (!f) { l.intensity = 0; return; } l.position.copy(f.pos);
    if (dark) { l.color.setHex(0xff1a10); l.intensity = i < 2 ? 1.4 + Math.sin(now / 300) * 0.6 : 0; return; }
    l.color.setHex(0xdfe8ff); let v = 1; if (f.bad) { const n = Math.sin(now / 47 + f.ph * 9) + Math.sin(now / 131 + f.ph); v = n > 1.2 ? 0.08 : (Math.random() < 0.04 ? 0.15 : 1); badV = v; }
    l.intensity = 3.2 * v * (flickOn ? 1 : 0.05); });
  const tubeC = dark ? 0x1a1010 : flickOn ? 0xe8f0ff : 0x202428; M.tube.color.setHex(tubeC); M.tubeBad.color.setHex(dark ? 0x1a1010 : badV < 0.5 || !flickOn ? 0x303438 : 0xe8f0ff);
  hemi.intensity = dark ? 0.18 : 0.5; torch.intensity = state === 'play' ? (dark ? 10 : 4) * (1 + U('torch') * 0.25) : 0; torch.angle = 0.42 + U('torch') * 0.05;
  // passing signal lights sweep through the windows
  if (S && state === 'play') { S.passT -= dt; if (S.passT <= 0) { S.passT = rr(5, 11); S.passZ = zFront - 30; S.passX = (Math.random() < 0.5 ? -1 : 1) * 4; } }
  if (S && S.passZ !== undefined && S.passZ < 40) { S.passZ += spd * dt * 1.0; passL.position.set(S.passX, 2.2, S.passZ); passL.intensity = 40 * (spd / 30); } else if (state === 'menu') { const z = ((menuT * 30) % 80) - 60; passL.position.set(4, 2.2, z); passL.intensity = 40; } else passL.intensity = 0;
  if (S && S.boomT > 0) { S.boomT -= dt; bossL.intensity = 30 * S.boomT / 0.35; } else if (!(S && S.obj === 'boss' && state === 'play' && !S.done)) bossL.intensity = 0;
  scene.fog.color.setHex(S && S.gas ? 0x0c1a06 : 0x070a12); scene.fog.density = S && S.gas ? 0.06 : 0.032;
  if (state !== 'paused') { fxA.update(dt); fxN.update(dt); }
  { const cr = crossEl || (crossEl = document.querySelector('.h-cross')); if (cr) { const k = (input.aim.x * 50).toFixed(2) + ',' + (input.aim.y * 50).toFixed(2); if (k !== crossK) { crossK = k; cr.style.left = (50 + input.aim.x * 50) + '%'; cr.style.top = (50 - input.aim.y * 50) + '%'; } } }
  if (post.grade) { const f = state === 'play' ? player.hp / player.maxHp : 1; post.grade.uDesat.value = f < 0.35 ? 0.55 : 0.12; post.grade.uAb.value = 0.0012 + shake.amp * 0.01; post.grade.uTint.value.set(S && S.gas ? 0.85 : 1, S && S.gas ? 1.08 : 1, S && S.gas ? 0.8 : 1); }
  post.render(now / 1000);
  if (ui.save.s.fps) { fpsAcc += rdt; fpsN++; if (fpsAcc > 0.5) { ui.set('.h-fps', Math.round(fpsN / fpsAcc) + ' FPS'); fpsAcc = 0; fpsN = 0; } } else ui.set('.h-fps', '');
}
window.__game = { sound, fire, castShot, input, shake, get state() { return state; }, get S() { return S; }, player, enemies, survivors, startLevel, win, ui, spawnZombie, camera, renderer, faceScare, get doors() { return doors; }, get valves() { return valves; }, get zFront() { return zFront; }, get nC() { return nC; }, zLow, hurtPlayer, get pickups() { return pickups; }, get level() { return level; }, CL };
applyQuality();
setupMenu();
requestAnimationFrame(frame);
