// GHOST VILLAGE: CURSE OF THE NIGHT — GUNVORA GAMES
import * as THREE from 'three';
import { Sound } from './audio.js';
import { Input, IS_TOUCH } from './input.js';
import { Particles, makePost, Shake, canvasTex, noiseFill, glowTex, rand, clamp, lerp, damp } from './fx.js';
import { UI } from './ui.js';

const LEVELS = 150;
const isBoss = n => n % 10 === 0;
const biomeOf = n => n <= 50 ? 'village' : n <= 100 ? 'temple' : 'forest';
const BIOME = {
  village: { name: 'Cursed Village', fog: 0x0c1226, dens: 0.034, hemiS: 0x4a5a9a, hemiG: 0x1a1208, moon: 0x9fb4ff, ground: 0x6b5a44 },
  temple: { name: 'Temple Ruins', fog: 0x170c1f, dens: 0.036, hemiS: 0x6a4a8a, hemiG: 0x1a0d10, moon: 0xd0a0ff, ground: 0x5c5048 },
  forest: { name: 'Dark Forest', fog: 0x08140f, dens: 0.04, hemiS: 0x3a6a5a, hemiG: 0x0a1008, moon: 0xa0ffd0, ground: 0x3e4a30 },
};
const OBJ_TYPES = ['diyas', 'banish', 'amulets', 'well', 'survive'];
function levelName(n) { return isBoss(n) ? (n === LEVELS ? 'FINAL: The Ancient Spirit Queen' : 'Boss: Spirit Queen — Night ' + (n / 10)) : BIOME[biomeOf(n)].name + ' — ' + ({ diyas: 'Light the Diyas', banish: 'Banish Spirits', amulets: 'Sacred Amulets', well: 'Seal the Well', survive: 'Survive till Dawn' })[OBJ_TYPES[(n * 7 + 3) % 5]]; }
const UPG = [
  { id: 'dmg', icon: '🔥', name: 'Agni Power', desc: 'Holy fire damage +20%', max: 6, cost: l => 60 + l * l * 45 + l * 40 },
  { id: 'rate', icon: '⚡', name: 'Swift Mantra', desc: 'Fire rate +12%', max: 5, cost: l => 70 + l * l * 50 },
  { id: 'hp', icon: '❤️', name: 'Tulsi Blessing', desc: 'Max health +20', max: 6, cost: l => 50 + l * l * 40 + l * 30 },
  { id: 'clip', icon: '🪔', name: 'Larger Diya', desc: 'Charges per lamp +4', max: 5, cost: l => 50 + l * l * 35 },
  { id: 'light', icon: '🌕', name: 'Brighter Lantern', desc: 'Lantern light radius +25%', max: 4, cost: l => 80 + l * l * 60 },
  { id: 'bell', icon: '🔔', name: 'Temple Bell', desc: 'Bell blast cooldown −15%, radius +', max: 4, cost: l => 90 + l * l * 70 },
  { id: 'speed', icon: '👣', name: 'Light Feet', desc: 'Move speed +8%, more stamina', max: 4, cost: l => 70 + l * l * 55 },
];
const sound = new Sound();
// ---------- renderer ----------
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.45;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 260);
scene.add(camera);
let post = null, high = false;
const fxA = new Particles(scene, 2600, true), fxN = new Particles(scene, 1200, false);
fxN.floor = 0.02;
const shake = new Shake();
// ---------- textures & materials ----------
const T = {
  ground: canvasTex(512, 512, (g, w, h) => { noiseFill(g, w, h, '#4a4234', 0.25, 9000, 4); for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${40 + Math.random() * 30},${60 + Math.random() * 40},30,${Math.random() * 0.5})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 18 + 4, 0, 7); g.fill(); } }, [40, 40]),
  mud: canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#8a6a4a', 0.25, 4000, 3); g.strokeStyle = 'rgba(40,25,15,.5)'; for (let i = 0; i < 14; i++) { g.beginPath(); let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += rand(-20, 20); y += rand(5, 25); g.lineTo(x, y); } g.stroke(); } g.fillStyle = 'rgba(20,10,5,.35)'; g.fillRect(0, h * 0.82, w, h * 0.18); }, [3, 1]),
  thatch: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#6a5428'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.strokeStyle = `rgba(${150 + Math.random() * 80},${110 + Math.random() * 60},40,${Math.random() * 0.6})`; g.lineWidth = Math.random() * 2; const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rand(-8, 8), h); g.stroke(); } }, [4, 2]),
  stone: canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, '#77706a', 0.3, 3000, 3); g.strokeStyle = 'rgba(20,18,16,.8)'; g.lineWidth = 3; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 * 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } g.fillStyle = 'rgba(40,70,30,.3)'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rand(3, 14), 0, 7); g.fill(); } }, [2, 2]),
  bark: canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#2e2218'; g.fillRect(0, 0, w, h); for (let i = 0; i < 160; i++) { g.strokeStyle = `rgba(${Math.random() < .5 ? '0,0,0' : '90,70,50'},${Math.random() * 0.6})`; g.lineWidth = rand(1, 4); const x = Math.random() * w; g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + rand(-10, 10), h / 3, x + rand(-10, 10), h * 2 / 3, x + rand(-6, 6), h); g.stroke(); } }, [2, 2]),
  mist: canvasTex(256, 256, (g, w, h) => { for (let i = 0; i < 40; i++) { const x = rand(40, 216), y = rand(40, 216), r = rand(20, 60); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,.14)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); } }),
  glow: glowTex(),
};
const M = {
  ground: new THREE.MeshLambertMaterial({ map: T.ground }),
  mud: new THREE.MeshLambertMaterial({ map: T.mud }),
  thatch: new THREE.MeshLambertMaterial({ map: T.thatch }),
  stone: new THREE.MeshLambertMaterial({ map: T.stone, side: THREE.DoubleSide }),
  stoneDark: new THREE.MeshLambertMaterial({ map: T.stone, color: 0x8a7a8a }),
  bark: new THREE.MeshLambertMaterial({ map: T.bark }),
  leaf: new THREE.MeshLambertMaterial({ color: 0x1d3320, flatShading: true }),
  leaf2: new THREE.MeshLambertMaterial({ color: 0x263a1c, flatShading: true }),
  dark: new THREE.MeshBasicMaterial({ color: 0x000000 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x4a3322, map: T.bark }),
  gold: new THREE.MeshLambertMaterial({ color: 0xc8962a, emissive: 0x3a2200 }),
  red: new THREE.MeshLambertMaterial({ color: 0x8a1010 }),
  clay: new THREE.MeshLambertMaterial({ color: 0x9a4a2a }),
  flame: new THREE.MeshBasicMaterial({ color: 0xffb040, toneMapped: false }),
  winGlow: new THREE.MeshBasicMaterial({ color: 0xff7a20, toneMapped: false }),
  water: new THREE.MeshBasicMaterial({ color: 0x0d6a3a, toneMapped: false }),
  eye: new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false }),
  eyeC: new THREE.MeshBasicMaterial({ color: 0x40ffe0, toneMapped: false }),
  grass: new THREE.MeshLambertMaterial({ color: 0x2c3a1e }),
  bone: new THREE.MeshLambertMaterial({ color: 0xcfc8b0 }),
  beam: new THREE.MeshBasicMaterial({ color: 0xffc040, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide }),
  orb: new THREE.MeshBasicMaterial({ color: 0xffd070, toneMapped: false }),
  orbE: new THREE.MeshBasicMaterial({ color: 0xc040ff, toneMapped: false }),
  mist: new THREE.MeshBasicMaterial({ map: T.mist, transparent: true, depthWrite: false, opacity: 0.22, color: 0x6070a0, side: THREE.DoubleSide }),
  glowS: new THREE.SpriteMaterial({ map: T.glow, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
};
// ---------- lights ----------
const hemi = new THREE.HemisphereLight(0x4a5a9a, 0x1a1208, 1.7); scene.add(hemi);
const moon = new THREE.DirectionalLight(0x9fb4ff, 1.8); moon.position.set(-30, 50, -20); scene.add(moon); scene.add(moon.target);
moon.shadow.mapSize.set(1024, 1024); Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 140 }); moon.shadow.bias = -0.0008;
const lantern = new THREE.PointLight(0xffa850, 5, 16, 1.6); camera.add(lantern); lantern.position.set(0.3, -0.2, -0.4);
const spot = new THREE.SpotLight(0xffd8a0, 22, 34, 0.48, 0.65, 1.4); camera.add(spot); spot.position.set(0.2, -0.1, 0); camera.add(spot.target); spot.target.position.set(0, 0, -5);
const flashL = new THREE.PointLight(0xffc060, 0, 10, 2); camera.add(flashL); flashL.position.set(0.3, -0.2, -1);
const lampLights = []; for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xff8a30, 8, 12, 1.8); scene.add(l); lampLights.push(l); }
const bossLight = new THREE.PointLight(0xc040ff, 0, 18, 1.5); scene.add(bossLight);
// sky
const skyStars = (() => { const n = 900, p = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const th = Math.random() * Math.PI * 2, ph = Math.random() * 1.3; p[i * 3] = Math.cos(th) * Math.sin(ph) * 200; p[i * 3 + 1] = Math.cos(ph) * 200; p[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 200; } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbbccff, size: 1.2, sizeAttenuation: false, fog: false })); })();
scene.add(skyStars);
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(9, 24, 16), new THREE.MeshBasicMaterial({ color: 0xe8e0ff, fog: false, toneMapped: false })); moonMesh.position.set(-90, 110, -150); scene.add(moonMesh);
const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0x8090ff, fog: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); moonGlow.scale.set(80, 80, 1); moonGlow.position.copy(moonMesh.position); scene.add(moonGlow);

// ---------- quality ----------
function applyQuality() {
  const s = ui.save.s; const wantHigh = s.quality === 'high';
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, wantHigh ? 1.75 : 1));
  renderer.setSize(innerWidth, innerHeight, false);
  if (wantHigh !== high || !post) {
    high = wantHigh; if (post) post.dispose(); post = makePost(renderer, scene, camera, high);
    renderer.shadowMap.enabled = high; moon.castShadow = high; scene.traverse(o => { if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => m.needsUpdate = true); } });
  }
  post.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  const sc = renderer.getPixelRatio() * innerHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  fxA.uniforms.uScale.value = sc; fxN.uniforms.uScale.value = sc;
  sound.setVolume(s.vol); input.sens = s.sens;
}
addEventListener('resize', () => applyQuality());

// ---------- RNG ----------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let R = Math.random;
const rr = (a, b) => a + R() * (b - a);

// ---------- world ----------
let world = new THREE.Group(); scene.add(world);
let obstacles = [], lamps = [], shrines = [], wells = [], mists = [], playR = 36, geos = [];
function add(mesh, x = 0, y = 0, z = 0, parent = world) { mesh.position.set(x, y, z); parent.add(mesh); if (mesh.geometry) geos.push(mesh.geometry); return mesh; }
function mesh(geo, mat, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = recv; return m; }
function th(x, z) { const r = Math.hypot(x, z); let h = Math.sin(x * 0.17) * Math.cos(z * 0.13) * 0.18 + Math.sin(x * 0.05 + z * 0.07) * 0.25; if (r > playR - 2) h += Math.pow(r - playR + 2, 1.35) * 0.35; return h; }
function clearWorld() {
  scene.remove(world); world.traverse(o => { if (o.material && o.material.userData && o.material.userData.own) o.material.dispose(); });
  geos.forEach(g => g.dispose()); geos = []; world = new THREE.Group(); scene.add(world);
  obstacles = []; lamps = []; shrines = []; wells = []; mists = [];
}
function ownMat(o) { const m = new THREE.MeshLambertMaterial(o); m.userData.own = true; return m; }
function hut(x, z, s, rot) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); g.rotation.y = rot; world.add(g);
  const round = R() < 0.6;
  if (round) { add(mesh(new THREE.CylinderGeometry(1.8 * s, 1.95 * s, 2.2 * s, 14), M.mud), 0, 1.1 * s, 0, g); add(mesh(new THREE.ConeGeometry(2.5 * s, 1.8 * s, 14, 1), M.thatch), 0, 3.1 * s, 0, g); }
  else { add(mesh(new THREE.BoxGeometry(3.4 * s, 2.2 * s, 3 * s), M.mud), 0, 1.1 * s, 0, g); const r = add(mesh(new THREE.ConeGeometry(2.9 * s, 1.7 * s, 4, 1), M.thatch), 0, 3.05 * s, 0, g); r.rotation.y = Math.PI / 4; r.scale.z = 0.9; }
  add(mesh(new THREE.PlaneGeometry(0.9 * s, 1.5 * s), M.dark, false, false), 0, 0.75 * s, (round ? 1.93 : 1.52) * s, g);
  if (R() < 0.45) { add(mesh(new THREE.PlaneGeometry(0.45 * s, 0.4 * s), M.winGlow, false, false), 0.9 * s, 1.4 * s, (round ? 1.72 : 1.52) * s, g).rotation.y = round ? 0.45 : 0; }
  for (let i = 0; i < 3; i++) { const p = add(mesh(new THREE.SphereGeometry(0.28, 10, 8), M.clay), rr(-1.5, 1.5), 0.22, 2.3 * s + rr(0, 0.6), g); p.scale.y = 0.8; }
  if (R() < 0.5) { const c = new THREE.Group(); add(mesh(new THREE.BoxGeometry(1, 0.08, 1.9), M.wood), 0, 0.45, 0, c); for (const [a, b] of [[-.45, -.9], [.45, -.9], [-.45, .9], [.45, .9]]) add(mesh(new THREE.BoxGeometry(0.08, 0.45, 0.08), M.wood), a, 0.22, b, c); c.position.set(2.6 * s, 0, 0.5); c.rotation.y = 0.3; g.add(c); }
  obstacles.push({ x, z, r: (round ? 2.0 : 2.1) * s });
}
function temple(x, z, s, ruined) {
  const g = new THREE.Group(); g.position.set(x, th(x, z) - 0.1, z); g.rotation.y = Math.atan2(-x, -z) + Math.PI; world.add(g);
  add(mesh(new THREE.BoxGeometry(7 * s, 0.7 * s, 7 * s), M.stone), 0, 0.35 * s, 0, g);
  add(mesh(new THREE.BoxGeometry(3 * s, 0.35 * s, 1.2 * s), M.stone), 0, 0.17 * s, 4 * s, g);
  add(mesh(new THREE.BoxGeometry(3.6 * s, 3 * s, 3.6 * s), M.stoneDark), 0, 2.2 * s, -0.4 * s, g);
  add(mesh(new THREE.PlaneGeometry(1.1 * s, 1.9 * s), M.dark, false, false), 0, 1.65 * s, 1.41 * s, g);
  let y = 3.7 * s; for (let i = 0; i < 6; i++) { const w = (3.4 - i * 0.48) * s; const b = add(mesh(new THREE.BoxGeometry(w, 0.62 * s, w), i % 2 ? M.stone : M.stoneDark), 0, y + 0.31 * s, -0.4 * s, g); if (ruined && R() < 0.4) { b.rotation.z = rr(-0.08, 0.08); b.position.x += rr(-0.15, 0.15); } y += 0.62 * s; if (ruined && i >= 3 && R() < 0.5) break; }
  if (!ruined || R() < 0.5) { add(mesh(new THREE.ConeGeometry(0.6 * s, 1.2 * s, 8), M.stone), 0, y + 0.6 * s, -0.4 * s, g); add(mesh(new THREE.SphereGeometry(0.22 * s, 10, 8), M.gold), 0, y + 1.3 * s, -0.4 * s, g); }
  for (const px of [-2.6, -1.2, 1.2, 2.6]) { const p = add(mesh(new THREE.CylinderGeometry(0.2 * s, 0.24 * s, 2.6 * s, 8), M.stone), px * s, 2 * s, 2.6 * s, g); if (ruined && R() < 0.3) { p.rotation.z = 1.4; p.position.y = 0.9 * s; } }
  add(mesh(new THREE.BoxGeometry(6 * s, 0.35 * s, 0.7 * s), M.stoneDark), 0, 3.4 * s, 2.6 * s, g);
  const fl = add(mesh(new THREE.PlaneGeometry(0.9, 0.5), ownMat({ color: 0xc04010, side: THREE.DoubleSide })), 0.45, y + 2 * s, -0.4 * s, g); world.userData.flags.push(fl);
  add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), M.wood), 0, y + 1.8 * s, -0.4 * s, g);
  const wp = new THREE.Vector3(0, 0, 3.2 * s).applyEuler(g.rotation).add(g.position);
  lamps.push(new THREE.Vector3(wp.x, wp.y + 1.2, wp.z));
  obstacles.push({ x, z, r: 3.9 * s });
}
function wellAt(x, z, haunted = true) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); world.add(g);
  add(mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.95, 18, 1, true), M.stone), 0, 0.47, 0, g);
  add(mesh(new THREE.TorusGeometry(1.18, 0.13, 8, 22), M.stoneDark), 0, 0.95, 0, g).rotation.x = Math.PI / 2;
  const w = add(mesh(new THREE.CircleGeometry(1.1, 20), haunted ? M.water : M.dark, false, false), 0, 0.55, 0, g); w.rotation.x = -Math.PI / 2;
  for (const s of [-1, 1]) add(mesh(new THREE.BoxGeometry(0.14, 2.2, 0.14), M.wood), s * 1.15, 1.1, 0, g);
  add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.6), M.wood), 0, 2.1, 0, g).rotation.z = Math.PI / 2;
  add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 1.2), M.bone, false), 0, 1.5, 0, g);
  add(mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.25, 10), M.wood), 0, 0.85, 0, g);
  obstacles.push({ x, z, r: 1.45 });
  const wl = { pos: new THREE.Vector3(x, g.position.y, z), haunted, group: g, water: w }; wells.push(wl); return wl;
}
function banyan(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); g.rotation.y = rr(0, 6); world.add(g);
  add(mesh(new THREE.CylinderGeometry(0.45 * s, 0.95 * s, 4.2 * s, 9), M.bark), 0, 2.1 * s, 0, g);
  for (let i = 0; i < 4; i++) { const b = add(mesh(new THREE.CylinderGeometry(0.12 * s, 0.3 * s, 3.2 * s, 6), M.bark), 0, 3.6 * s, 0, g); const a = i / 4 * Math.PI * 2 + rr(-.3, .3); b.rotation.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); b.position.x += Math.sin(a) * -0.9 * s; b.position.z += Math.cos(a) * 0.9 * s; }
  for (let i = 0; i < 6; i++) { const c = add(mesh(new THREE.IcosahedronGeometry(rr(1.5, 2.3) * s, 1), i % 2 ? M.leaf : M.leaf2), rr(-2.4, 2.4) * s, rr(4.8, 6.4) * s, rr(-2.4, 2.4) * s, g); c.scale.y = 0.65; }
  for (let i = 0; i < 9; i++) { const l = rr(2.5, 4.5) * s; add(mesh(new THREE.CylinderGeometry(0.03, 0.05, l, 4), M.bark, false), rr(-2.8, 2.8) * s, 5 * s - l / 2, rr(-2.8, 2.8) * s, g); }
  if (R() < 0.5) add(mesh(new THREE.TorusGeometry(0.75 * s, 0.04, 6, 18), M.red, false), 0, 1.4 * s, 0, g).rotation.x = Math.PI / 2;
  obstacles.push({ x, z, r: 1.0 * s });
}
function deadTree(x, z, s) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); g.rotation.y = rr(0, 6); world.add(g);
  add(mesh(new THREE.CylinderGeometry(0.18 * s, 0.4 * s, 5 * s, 7), M.bark), 0, 2.5 * s, 0, g).rotation.z = rr(-0.1, 0.1);
  for (let i = 0; i < 5; i++) { const b = add(mesh(new THREE.CylinderGeometry(0.04 * s, 0.12 * s, rr(1.5, 2.8) * s, 5), M.bark), 0, rr(2.8, 4.6) * s, 0, g); const a = rr(0, 6.28); b.rotation.set(Math.cos(a) * rr(0.6, 1.2), 0, Math.sin(a) * rr(0.6, 1.2)); b.position.x += Math.sin(a) * 0.7 * s; b.position.z += Math.cos(a) * -0.7 * s; }
  obstacles.push({ x, z, r: 0.5 * s });
}
function lampPost(x, z) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); world.add(g);
  add(mesh(new THREE.BoxGeometry(0.12, 2.4, 0.12), M.wood), 0, 1.2, 0, g); add(mesh(new THREE.BoxGeometry(0.6, 0.08, 0.08), M.wood), 0.25, 2.35, 0, g);
  add(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), ownMat({ color: 0x222222, transparent: true, opacity: 0.5 }), false), 0.5, 2.1, 0, g);
  add(mesh(new THREE.SphereGeometry(0.07, 8, 6), M.flame, false, false), 0.5, 2.08, 0, g);
  const sp = new THREE.Sprite(M.glowS); sp.scale.set(1.4, 1.4, 1); sp.position.set(0.5, 2.1, 0); g.add(sp);
  lamps.push(new THREE.Vector3(x + 0.5, g.position.y + 2.1, z)); obstacles.push({ x, z, r: 0.3 });
}
function shrine(x, z) {
  const g = new THREE.Group(); g.position.set(x, th(x, z), z); world.add(g);
  add(mesh(new THREE.CylinderGeometry(0.5, 0.65, 0.8, 8), M.stoneDark), 0, 0.4, 0, g);
  add(mesh(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.clay), 0, 0.98, 0, g);
  const f = add(mesh(new THREE.ConeGeometry(0.07, 0.22, 8), M.flame, false, false), 0, 1.05, 0, g); f.visible = false;
  const sp = new THREE.Sprite(M.glowS); sp.scale.set(1.6, 1.6, 1); sp.position.set(0, 1.05, 0); sp.visible = false; g.add(sp);
  for (let i = 0; i < 5; i++) add(mesh(new THREE.SphereGeometry(0.06, 6, 4), ownMat({ color: [0xff8a00, 0xffd000, 0xff3060][i % 3] }), false), Math.cos(i * 1.25) * 0.55, 0.82, Math.sin(i * 1.25) * 0.55, g);
  const beam = add(mesh(new THREE.CylinderGeometry(0.35, 0.35, 40, 12, 1, true), M.beam, false, false), 0, 20, 0, g);
  obstacles.push({ x, z, r: 0.7 });
  const s = { pos: new THREE.Vector3(x, g.position.y + 1, z), lit: false, prog: 0, flame: f, sprite: sp, beam }; shrines.push(s); return s;
}
function rock(x, z, s) { const r = mesh(new THREE.DodecahedronGeometry(s, 0), M.stoneDark); r.rotation.set(rr(0, 3), rr(0, 3), 0); r.scale.y = 0.6; add(r, x, th(x, z) + s * 0.2, z); if (s > 0.6) obstacles.push({ x, z, r: s * 0.9 }); }
function fence(x, z, len, rot) { const g = new THREE.Group(); g.position.set(x, th(x, z), z); g.rotation.y = rot; world.add(g); for (let i = 0; i <= len; i++) { const p = add(mesh(new THREE.BoxGeometry(0.1, rr(0.9, 1.3), 0.1), M.wood), i * 0.8 - len * 0.4, 0.55, 0, g); p.rotation.z = rr(-0.15, 0.15); } add(mesh(new THREE.BoxGeometry(len * 0.8, 0.06, 0.05), M.wood), 0, 0.8, 0, g); }
function freeSpot(minD, maxD, clearance, tries = 40) {
  for (let t = 0; t < tries; t++) { const a = R() * Math.PI * 2, d = rr(minD, maxD); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (obstacles.every(o => Math.hypot(o.x - x, o.z - z) > o.r + clearance)) return [x, z]; }
  return null;
}
function buildWorld(level) {
  clearWorld(); R = mulberry(level * 7919 + 13);
  const bio = biomeOf(level), B = BIOME[bio]; world.userData.flags = [];
  playR = isBoss(level) ? 30 : Math.min(54, 32 + level * 0.14);
  scene.fog = new THREE.FogExp2(B.fog, B.dens); scene.background = new THREE.Color(B.fog).multiplyScalar(0.8);
  hemi.color.set(B.hemiS); hemi.groundColor.set(B.hemiG); moon.color.set(B.moon); M.ground.color.set(B.ground).multiplyScalar(1.6);
  const gg = new THREE.PlaneGeometry(240, 240, 120, 120); gg.rotateX(-Math.PI / 2); const pa = gg.attributes.position;
  for (let i = 0; i < pa.count; i++) pa.setY(i, th(pa.getX(i), pa.getZ(i))); gg.computeVertexNormals();
  add(mesh(gg, M.ground, false, true));
  const n = 170, trunk = new THREE.CylinderGeometry(0.2, 0.45, 6, 6), crown = new THREE.ConeGeometry(2.2, 6, 7); geos.push(trunk, crown);
  const it = new THREE.InstancedMesh(trunk, M.bark, n), ic = new THREE.InstancedMesh(crown, bio === 'forest' ? M.leaf2 : M.leaf, n); const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, d = playR + rr(0, 26), x = Math.cos(a) * d, z = Math.sin(a) * d, s = rr(0.8, 1.8), y = th(x, z);
    q.setFromEuler(new THREE.Euler(rr(-.08, .08), rr(0, 6), rr(-.08, .08))); sc.set(s, s, s); ps.set(x, y + 3 * s, z); mt.compose(ps, q, sc); it.setMatrixAt(i, mt); ps.set(x, y + 7.5 * s, z); mt.compose(ps, q, sc); ic.setMatrixAt(i, mt); }
  world.add(it); world.add(ic); it.castShadow = ic.castShadow = true;
  const gn = high ? 2200 : 700, gGeo = new THREE.ConeGeometry(0.05, 0.5, 3); geos.push(gGeo); const gi = new THREE.InstancedMesh(gGeo, M.grass, gn);
  for (let i = 0; i < gn; i++) { const a = R() * 6.28, d = Math.sqrt(R()) * (playR + 4), x = Math.cos(a) * d, z = Math.sin(a) * d; q.setFromEuler(new THREE.Euler(rr(-.3, .3), 0, rr(-.3, .3))); const s = rr(0.6, 1.6); sc.set(s, s, s); ps.set(x, th(x, z) + 0.2 * s, z); mt.compose(ps, q, sc); gi.setMatrixAt(i, mt); }
  world.add(gi);
  if (isBoss(level)) { temple(0, -14, 1.5, true); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lampPost(Math.cos(a) * 20, Math.sin(a) * 20); } for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + 0.3; deadTree(Math.cos(a) * 25, Math.sin(a) * 25, rr(1, 1.4)); } wellAt(8, 6); }
  else {
    const nHut = bio === 'village' ? 9 + (R() * 5 | 0) : bio === 'temple' ? 4 : 2, nTemple = bio === 'temple' ? 3 + (R() * 2 | 0) : 1, nBan = bio === 'forest' ? 12 : 4, nDead = bio === 'forest' ? 16 : 6;
    temple(rr(-6, 6), rr(-6, -14), bio === 'temple' ? 1.4 : 1.1, bio !== 'village');
    for (let i = 1; i < nTemple; i++) { const p = freeSpot(12, playR - 6, 5); if (p) temple(p[0], p[1], rr(0.9, 1.2), true); }
    for (let i = 0; i < nHut; i++) { const p = freeSpot(7, playR - 5, 3.5); if (p) hut(p[0], p[1], rr(0.85, 1.15), Math.atan2(-p[0], -p[1])); }
    for (let i = 0; i < 2 + (bio === 'village' ? 1 : 0); i++) { const p = freeSpot(6, playR - 6, 2.5); if (p) wellAt(p[0], p[1], true); }
    for (let i = 0; i < nBan; i++) { const p = freeSpot(6, playR - 3, 2.5); if (p) banyan(p[0], p[1], rr(0.8, 1.3)); }
    for (let i = 0; i < nDead; i++) { const p = freeSpot(5, playR - 2, 1.5); if (p) deadTree(p[0], p[1], rr(0.8, 1.3)); }
    for (let i = 0; i < 7; i++) { const p = freeSpot(5, playR - 3, 1.5); if (p) lampPost(p[0], p[1]); }
    for (let i = 0; i < 4; i++) { const p = freeSpot(8, playR - 4, 2); if (p) fence(p[0], p[1], 4 + (R() * 5 | 0), R() * 3); }
  }
  for (let i = 0; i < 30; i++) { const p = freeSpot(4, playR + 2, 0.5, 10); if (p) rock(p[0], p[1], rr(0.2, 0.9)); }
  for (let i = 0; i < 14; i++) { const m = add(mesh(new THREE.PlaneGeometry(rr(10, 18), rr(10, 18)), M.mist, false, false), rr(-playR, playR), rr(0.25, 0.9), rr(-playR, playR)); m.rotation.x = -Math.PI / 2; m.userData.spin = rr(-0.05, 0.05); m.renderOrder = 5; mists.push(m); }
  for (let i = 0; i < 6; i++) { const m = add(mesh(new THREE.PlaneGeometry(14, 5), M.mist, false, false), Math.cos(i) * playR * 0.6, 1.8, Math.sin(i) * playR * 0.6); m.rotation.y = rr(0, 3); mists.push(m); }
}

// ---------- viewmodel (brass lantern held by player) ----------
const vm = new THREE.Group(); camera.add(vm); vm.position.set(0.32, -0.32, -0.6); vm.scale.setScalar(0.6);
{ const brass = new THREE.MeshBasicMaterial({ color: 0x6a4a1a });
  const b = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.05, 12), brass); vm.add(b);
  const cage = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.13, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0x2a1a08, wireframe: true })); cage.position.y = 0.09; vm.add(cage);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.07, 10), brass); top.position.y = 0.19; vm.add(top);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 12), brass); ring.position.y = 0.24; vm.add(ring);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), M.flame); fl.position.y = 0.08; fl.scale.y = 1.6; vm.add(fl); vm.userData.flame = fl;
  const gs = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 })); gs.scale.set(0.16, 0.16, 1); gs.position.y = 0.08; vm.add(gs); vm.userData.glow = gs;
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x2a1a10 })); arm.rotation.x = 1.2; arm.position.set(0.05, -0.12, 0.22); vm.add(arm);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.3, 8), new THREE.MeshBasicMaterial({ color: 0x3a0a06 })); sleeve.rotation.x = 1.2; sleeve.position.set(0.06, -0.2, 0.42); vm.add(sleeve);
}
vm.traverse(o => { o.renderOrder = 20; });

// ---------- enemies ----------
const G = { sph: new THREE.SphereGeometry(1, 12, 10), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 8) };
function robeGeo(rad, h, ragged) { const g = new THREE.ConeGeometry(rad, h, 14, 6, true); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < -h * 0.3) { p.setY(i, y + Math.random() * ragged * (y < -h * 0.45 ? 1 : 0.3)); p.setX(i, p.getX(i) * (1 + Math.random() * 0.15)); p.setZ(i, p.getZ(i) * (1 + Math.random() * 0.15)); } } g.computeVertexNormals(); return g; }
const ROBE = robeGeo(0.6, 1.8, 0.45), ROBE_Q = robeGeo(1, 2, 0.5), HAIR = new THREE.BoxGeometry(0.03, 1, 0.03);
function part(geo, mat, sx, sy, sz, x, y, z, parent) { const m = new THREE.Mesh(geo, mat); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; }
function limb(parent, x, y, z, len, rad, mat) { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); part(G.cyl, mat, rad, len, rad, 0, -len / 2, 0, p); return p; }
function buildEnemy(type, lvlMul) {
  const g = new THREE.Group(), P = {}; const mats = [];
  const mk = (c, o = {}) => { const m = new THREE.MeshLambertMaterial(Object.assign({ color: c, emissive: 0x000000 }, o)); mats.push(m); return m; };
  let e;
  if (type === 'bhoot') {
    const robe = mk(0x1a1a24, { transparent: true, opacity: 0.93, side: THREE.DoubleSide }), skin = mk(0x6a7a70);
    P.body = new THREE.Group(); g.add(P.body);
    const r = new THREE.Mesh(ROBE, robe); r.position.y = 1.05; r.castShadow = true; P.body.add(r); P.robe = r;
    part(G.sph, robe, 0.27, 0.32, 0.27, 0, 2.0, 0, P.body); part(G.sph, skin, 0.17, 0.2, 0.15, 0, 1.97, 0.1, P.body);
    part(G.sph, M.eyeC, 0.035, 0.025, 0.02, -0.06, 2.0, 0.24, P.body); part(G.sph, M.eyeC, 0.035, 0.025, 0.02, 0.06, 2.0, 0.24, P.body);
    P.aL = limb(P.body, -0.33, 1.7, 0, 0.75, 0.045, skin); P.aR = limb(P.body, 0.33, 1.7, 0, 0.75, 0.045, skin);
    e = { hp: 30, speed: 2.6, dmg: 10, rad: 0.55, h: 1.5, float: true, reach: 1.5 };
  } else if (type === 'chudail') {
    const sari = mk(0x5a1010), skin = mk(0x8a9a90), hair = mk(0x050505);
    P.body = new THREE.Group(); g.add(P.body);
    part(G.cone, sari, 0.42, 1.1, 0.42, 0, 0.95, 0, P.body); part(G.box, sari, 0.42, 0.6, 0.26, 0, 1.55, 0, P.body);
    P.head = new THREE.Group(); P.head.position.set(0, 1.95, 0.04); P.body.add(P.head);
    part(G.sph, skin, 0.15, 0.19, 0.16, 0, 0, 0, P.head); part(G.sph, M.eye, 0.03, 0.02, 0.02, -0.055, 0.02, 0.14, P.head); part(G.sph, M.eye, 0.03, 0.02, 0.02, 0.055, 0.02, 0.14, P.head);
    part(G.box, hair, 0.34, 0.2, 0.34, 0, 0.12, -0.02, P.head);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 1.6 - Math.PI * 0.8 + Math.PI; part(HAIR, hair, 2.2, rr(0.8, 1.3), 2.2, Math.sin(a) * 0.15, -0.45, Math.cos(a) * 0.15, P.head); }
    P.aL = limb(P.body, -0.26, 1.8, 0, 0.85, 0.04, skin); P.aR = limb(P.body, 0.26, 1.8, 0, 0.85, 0.04, skin);
    P.lL = limb(P.body, -0.12, 0.45, 0, 0.45, 0.05, skin); P.lR = limb(P.body, 0.12, 0.45, 0, 0.45, 0.05, skin);
    for (const L of [P.lL, P.lR]) part(G.box, skin, 0.08, 0.05, 0.22, 0, -0.47, -0.08, L);
    e = { hp: 45, speed: 3.2, dmg: 14, rad: 0.5, h: 1.3, reach: 1.4 };
  } else if (type === 'pishach') {
    const skin = mk(0x3a4a3a), dark = mk(0x1a201a);
    P.body = new THREE.Group(); g.add(P.body);
    part(G.sph, skin, 0.35, 0.28, 0.6, 0, 0.75, 0, P.body);
    P.head = new THREE.Group(); P.head.position.set(0, 0.95, 0.62); P.body.add(P.head);
    part(G.sph, skin, 0.2, 0.18, 0.24, 0, 0, 0, P.head); part(G.box, dark, 0.22, 0.05, 0.12, 0, -0.1, 0.14, P.head);
    for (let i = 0; i < 4; i++) part(G.cone, M.bone, 0.015, 0.06, 0.015, -0.07 + i * 0.045, -0.12, 0.2, P.head).rotation.x = Math.PI;
    part(G.sph, M.eye, 0.035, 0.03, 0.02, -0.08, 0.05, 0.2, P.head); part(G.sph, M.eye, 0.035, 0.03, 0.02, 0.08, 0.05, 0.2, P.head);
    for (let i = 0; i < 5; i++) part(G.cone, dark, 0.05, 0.18, 0.05, 0, 1.0, -0.4 + i * 0.18, P.body);
    P.legs = [[-0.32, 0.4], [0.32, 0.4], [-0.3, -0.4], [0.3, -0.4]].map(([x, z]) => limb(P.body, x, 0.82, z, 0.85, 0.05, skin));
    e = { hp: 25, speed: 4.6, dmg: 9, rad: 0.6, h: 0.8, reach: 1.3 };
  } else {
    const robe = mk(0x7a0a1a, { transparent: true, opacity: 0.95, side: THREE.DoubleSide, emissive: 0x200008 }), skin = mk(0x9aa8a0), hair = mk(0x080206);
    P.body = new THREE.Group(); g.add(P.body);
    const r = new THREE.Mesh(ROBE_Q, robe); r.scale.set(1.3, 2, 1.3); r.position.y = 2.1; r.castShadow = true; P.body.add(r); P.robe = r;
    part(G.box, robe, 0.9, 1.1, 0.5, 0, 3.9, 0, P.body);
    for (let i = 0; i < 6; i++) part(G.sph, M.gold, 0.06, 0.06, 0.06, Math.cos(i) * 0.5, 3.6 + i * 0.12, 0.27, P.body);
    P.head = new THREE.Group(); P.head.position.set(0, 4.85, 0.05); P.body.add(P.head);
    part(G.sph, skin, 0.32, 0.4, 0.33, 0, 0, 0, P.head); part(G.sph, M.eye, 0.06, 0.035, 0.03, -0.12, 0.05, 0.3, P.head); part(G.sph, M.eye, 0.06, 0.035, 0.03, 0.12, 0.05, 0.3, P.head);
    part(G.box, M.dark, 0.18, 0.04, 0.04, 0, -0.2, 0.31, P.head); part(G.sph, M.red, 0.04, 0.04, 0.02, 0, 0.2, 0.32, P.head);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; part(G.cone, M.gold, 0.07, 0.4, 0.07, Math.sin(a) * 0.3, 0.45, Math.cos(a) * 0.3, P.head); }
    for (let i = 0; i < 24; i++) { const a = rr(Math.PI * 0.4, Math.PI * 1.6); part(HAIR, hair, 3, rr(1.6, 3), 3, Math.sin(a) * 0.3, -1.0, Math.cos(a) * 0.3 - 0.05, P.head); }
    P.arms = []; for (let i = 0; i < 4; i++) { const s = i % 2 ? 1 : -1, y = i < 2 ? 4.3 : 3.8; const a = limb(P.body, s * 0.5, y, 0, 1.6, 0.07, skin); for (let k = 0; k < 3; k++) part(G.cone, M.bone, 0.02, 0.15, 0.02, (k - 1) * 0.04, -1.65, 0, a).rotation.x = Math.PI; P.arms.push(a); }
    e = { hp: 900, speed: 2.2, dmg: 22, rad: 1.4, h: 3.6, float: true, reach: 2.6, boss: true };
  }
  e.type = type; e.g = g; e.P = P; e.mats = mats; e.t = Math.random() * 10; e.atk = 0; e.cd = 0; e.state = 'rise'; e.st = 0; e.flash = 0; e.stun = 0;
  e.hp *= lvlMul.hp; e.maxHp = e.hp; e.speed *= lvlMul.spd; e.dmg *= lvlMul.dmg;
  return e;
}
function animEnemy(e, dt, moving) {
  const P = e.P, t = (e.t += dt * (moving ? 1 : 0.6)); const a = e.atk > 0 ? Math.sin((1 - e.atk / 0.6) * Math.PI) : 0;
  if (e.type === 'bhoot') { P.body.position.y = 0.25 + Math.sin(t * 2.2) * 0.15; P.robe.scale.set(1 + Math.sin(t * 6) * 0.05, 1, 1 + Math.cos(t * 5) * 0.05); P.body.rotation.z = Math.sin(t * 1.3) * 0.08;
    P.aL.rotation.x = -1.3 - a * 0.5 + Math.sin(t * 3) * 0.2; P.aR.rotation.x = -1.3 - a * 0.5 + Math.cos(t * 3) * 0.2; P.body.position.z = a * 0.5; }
  else if (e.type === 'chudail') { const w = Math.sin(t * 7.5), jerk = Math.sin(t * 23) > 0.95 ? 0.25 : 0; P.lL.rotation.x = w * 0.6; P.lR.rotation.x = -w * 0.6; P.body.position.y = Math.abs(Math.cos(t * 7.5)) * 0.06;
    P.body.rotation.x = 0.25 + a * 0.3; P.head.rotation.z = Math.sin(t * 1.7) * 0.3 + jerk; P.aL.rotation.x = -0.4 - w * 0.5 - a * 1.4; P.aR.rotation.x = -0.4 + w * 0.5 - a * 1.4; }
  else if (e.type === 'pishach') { const w = t * 10; P.legs.forEach((L, i) => { L.rotation.x = Math.sin(w + (i % 2 ? Math.PI : 0) + (i > 1 ? 1.5 : 0)) * 0.7 + (i < 2 ? 0.3 : -0.3); L.rotation.z = (i % 2 ? -0.4 : 0.4); });
    P.body.position.y = Math.abs(Math.sin(w)) * 0.1 + a * 0.4; P.body.rotation.x = -a * 0.4; P.head.rotation.y = Math.sin(t * 3) * 0.3; }
  else { P.body.position.y = 0.6 + Math.sin(t * 1.4) * 0.3; P.robe.scale.x = 1.3 + Math.sin(t * 4) * 0.08; P.arms.forEach((A, i) => { A.rotation.x = -1.2 + Math.sin(t * 2.5 + i) * 0.5 - a * 0.8; A.rotation.z = (i % 2 ? 1 : -1) * (0.5 + Math.sin(t * 1.5 + i) * 0.3); }); P.head.rotation.z = Math.sin(t * 0.9) * 0.12; }
  if (e.flash > 0) { e.flash -= dt; const v = e.flash > 0 ? 0.9 : 0; e.mats.forEach(m => m.emissive.setRGB(v, v * 0.7, v * 0.3)); }
}

// ---------- stalker ghost (follows silently, vanishes when seen) ----------
const stalker = (() => {
  const g = new THREE.Group(); const white = new THREE.MeshLambertMaterial({ color: 0xe8e8f0, emissive: 0x30343c, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
  const skin = new THREE.MeshLambertMaterial({ color: 0xb8c4c0, emissive: 0x202826, transparent: true, opacity: 0.9 }), hair = new THREE.MeshLambertMaterial({ color: 0x020202, transparent: true, opacity: 0.95 });
  const r = new THREE.Mesh(robeGeo(0.5, 1.7, 0.2), white); r.position.y = 0.85; g.add(r);
  part(G.box, white, 0.38, 0.5, 0.22, 0, 1.7, 0, g); const head = new THREE.Group(); head.position.set(0, 2.08, 0); g.add(head);
  part(G.sph, skin, 0.14, 0.18, 0.15, 0, 0, 0, head); part(G.sph, M.dark, 0.04, 0.05, 0.02, -0.05, 0.02, 0.13, head); part(G.sph, M.dark, 0.04, 0.05, 0.02, 0.05, 0.02, 0.13, head); part(G.sph, M.dark, 0.035, 0.06, 0.02, 0, -0.1, 0.135, head);
  for (let i = 0; i < 20; i++) { const a = (Math.random() * 2.4 - 1.2) + (i < 6 ? 0 : Math.PI); part(HAIR, hair, 2.6, 0.7 + Math.random() * 0.5, 2.6, Math.sin(a) * 0.13, -0.3, Math.cos(a) * 0.13 + (i < 6 ? 0.04 : 0), head); }
  limb(g, -0.22, 1.85, 0, 0.75, 0.035, skin).rotation.z = 0.1; limb(g, 0.22, 1.85, 0, 0.75, 0.035, skin).rotation.z = -0.1;
  g.visible = false; scene.add(g); g.traverse(o => { if (o.isMesh) o.castShadow = false; });
  return { g, mats: [white, skin, hair], state: 'wait', t: 6, op: 0, scareT: 0 };
})();

// ---------- game state ----------
const ui = new UI({ slug: 'ghost-village', title: 'GHOST VILLAGE', sub: 'CURSE OF THE NIGHT', tagline: 'Something follows you in the dark… never stop looking back.', levels: LEVELS, isBoss, levelName, upgrades: UPG, sound,
  shopName: 'TEMPLE OFFERINGS', loseTitle: 'THE CURSE TOOK YOU', winTitle: 'AREA PURIFIED', finalTitle: 'THE CURSE IS BROKEN', finalText: 'You banished the <b>Ancient Spirit Queen</b> and freed the village. Dawn finally rises over the temples.<br>All 150 nights conquered!',
  howto: `<b>Goal:</b> survive 150 cursed nights. Each night has an objective: light the sacred diyas, banish spirits, collect amulets, seal haunted wells or survive until dawn. Every 10th night the <b>Spirit Queen</b> rises.<br><br>
  <b>The Follower:</b> a pale ghost silently follows you. She vanishes when you turn and look at her — if she reaches you… Listen for the heartbeat and look back!<br><br>
  <b>Desktop:</b> WASD move · Mouse look · Click fire holy flame · R refill lamp · E/F hold to interact · Q / Right-click temple bell blast · Shift sprint · Esc pause<br>
  <b>Mobile:</b> left stick move · drag right side to look · 🔥 fire · ⟳ refill · ✋ interact · ✦ bell · » sprint toggle`,
  onStart: l => startLevel(l), onResume: () => resume(), onQuit: () => quit(), onSettings: () => applyQuality() });
const input = new Input(canvas, document.getElementById('touch'));
if (IS_TOUCH) document.body.classList.add('touch');
input.onUnlock = () => { if (state === 'play') pause(); };

let state = 'menu', level = 1, S = null;
const enemies = [], shots = [], eShots = [], pickups = [];
const player = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, hp: 100, maxHp: 100, stam: 1, bob: 0, vel: new THREE.Vector3() };
let ambient = null, ring = null;
function U(id) { return ui.save.lv(id); }
function diff(l) { const f = (l - 1) / (LEVELS - 1); return { hp: 1 + f * 2.6, spd: 1 + f * 0.45, dmg: 1 + f * 1.6, f }; }

function disposeEntities() {
  enemies.forEach(e => { scene.remove(e.g); e.mats.forEach(m => m.dispose()); }); enemies.length = 0;
  shots.forEach(s => scene.remove(s.m)); shots.length = 0; eShots.forEach(s => scene.remove(s.m)); eShots.length = 0;
  pickups.forEach(p => scene.remove(p.m)); pickups.length = 0;
  if (ring) { scene.remove(ring); ring = null; }
}
function startLevel(l) {
  sound.unlock(); level = l; ui.curLevel = l; ui.show('load');
  setTimeout(() => {
    disposeEntities(); buildWorld(l);
    const D = diff(l), boss = isBoss(l);
    player.maxHp = 100 + U('hp') * 20; player.hp = player.maxHp; player.stam = 1; player.vel.set(0, 0, 0);
    const sp = boss ? [0, 16] : (freeSpot(2, 6, 1.2) || [0, 8]); player.pos.set(sp[0], th(sp[0], sp[1]) + 1.65, sp[1]); player.yaw = Math.atan2(sp[0], sp[1]); player.pitch = -0.05;
    const obj = boss ? 'boss' : OBJ_TYPES[(l * 7 + 3) % 5];
    S = { obj, t: 0, kills: 0, need: 0, got: 0, timer: 0, spawnT: 2.5, maxAlive: Math.min(4 + Math.floor(l / 8), 16), done: false, endT: 0, clip: 12 + U('clip') * 4, reserve: 48 + U('clip') * 8, fireCd: 0, reloadT: 0, bellCd: 0, coins: 0, hurt: 0, lightningT: rr(8, 20), wellRef: null, boss: null, scares: 0, wp: 0 };
    S.clipMax = S.clip;
    if (obj === 'diyas') { const n = Math.min(3 + Math.floor(l / 20), 8); for (let i = 0; i < n; i++) { const p = freeSpot(8, playR - 4, 2.5); if (p) shrine(p[0], p[1]); } S.need = shrines.length; }
    else if (obj === 'banish') S.need = 8 + Math.floor(l * 0.22);
    else if (obj === 'amulets') { const n = Math.min(5 + Math.floor(l / 15), 12); for (let i = 0; i < n; i++) { const p = freeSpot(6, playR - 3, 1.2); if (p) spawnPickup('amulet', p[0], p[1]); } S.need = pickups.filter(p => p.type === 'amulet').length; }
    else if (obj === 'well') { S.wellRef = wells.reduce((a, b) => (!a || b.pos.distanceTo(player.pos) > a.pos.distanceTo(player.pos)) ? b : a, null) || wellAt(10, 10); S.need = 12 + Math.floor(l / 10); S.wellRef.beam = add(mesh(new THREE.CylinderGeometry(0.6, 0.6, 40, 12, 1, true), M.beam, false, false), S.wellRef.pos.x, 20, S.wellRef.pos.z); }
    else if (obj === 'survive') { S.need = 45 + Math.min(75, Math.floor(l * 0.6)); S.timer = S.need; }
    else if (obj === 'boss') { const q = buildEnemy('queen', { hp: 1 + D.f * 3 + (l === LEVELS ? 1.5 : 0), spd: 1 + D.f * 0.4, dmg: 1 + D.f }); q.g.position.set(0, th(0, -6), -6); q.g.scale.setScalar(l === LEVELS ? 1.35 : 1); scene.add(q.g); q.phase = 1; q.aiT = 4; enemies.push(q); S.boss = q; S.maxAlive = 3 + Math.floor(D.f * 4); S.spawnT = 8; }
    for (let i = 0; i < 4 + Math.floor(l / 30); i++) { const p = freeSpot(5, playR - 3, 1); if (p) spawnPickup(R() < 0.5 ? 'oil' : (R() < 0.6 ? 'coin' : 'health'), p[0], p[1]); }
    stalker.state = 'wait'; stalker.t = Math.max(5, 14 - l * 0.06); stalker.g.visible = false;
    state = 'play'; ui.show('none'); ui.hudOn(true); input.showTouch(true); input.enabled = true; input.clear(); ui.boss(null); ui.progress(null); ui.prompt('');
    if (ambient) ambient.stop(); ambient = sound.ambient('night');
    ui.msg(boss ? (l === LEVELS ? 'THE ANCIENT QUEEN AWAKENS' : 'THE SPIRIT QUEEN RISES') : 'NIGHT ' + l, levelName(l), 3.2);
    sound.bell(); lastT = performance.now();
  }, 30);
}
function glowSprite(color, s) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); sp.scale.set(s, s, 1); return sp; }
function spawnPickup(type, x, z) {
  let m = new THREE.Group();
  if (type === 'amulet') { m.add(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 8, 20), M.gold)); m.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.1), M.flame)); m.add(glowSprite(0xffd060, 2)); const bm = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 30, 8, 1, true), M.beam); bm.position.y = 15; m.add(bm); }
  else if (type === 'oil') { const j = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), M.clay); j.scale.y = 1.2; m.add(j); const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.15, 8), M.clay); n.position.y = 0.25; m.add(n); m.add(glowSprite(0xff9030, 1.2)); }
  else if (type === 'health') { const lm = new THREE.MeshLambertMaterial({ color: 0x30c040, emissive: 0x0a3010 }); for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(G.sph, lm); l.scale.set(0.1, 0.03, 0.18); l.rotation.y = i * 1.25; l.position.set(Math.cos(i * 1.25) * 0.12, 0, Math.sin(i * 1.25) * 0.12); m.add(l); } m.add(glowSprite(0x40ff60, 1.2)); }
  else { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), M.gold); c.rotation.x = Math.PI / 2; m.add(c); m.add(glowSprite(0xffc020, 0.8)); }
  m.position.set(x, th(x, z) + 0.8, z); scene.add(m); pickups.push({ m, type, x, z, t: Math.random() * 6 });
}
function spawnEnemy(forceType) {
  const D = diff(level); const pool = level < 6 ? ['bhoot', 'bhoot', 'chudail'] : ['bhoot', 'chudail', 'pishach', biomeOf(level) === 'forest' ? 'pishach' : 'chudail'];
  const type = forceType || pool[(Math.random() * pool.length) | 0];
  let x = 0, z = 0, ok = false;
  for (let i = 0; i < 20 && !ok; i++) { const a = player.yaw + Math.PI + (Math.random() * 3.2 - 1.6), d = 12 + Math.random() * 10; x = player.pos.x - Math.sin(a) * d; z = player.pos.z - Math.cos(a) * d; if (Math.hypot(x, z) > playR - 2) continue; ok = obstacles.every(o => Math.hypot(o.x - x, o.z - z) > o.r + 0.8); }
  if (!ok) { const a = Math.random() * 6.28; x = Math.cos(a) * (playR - 4); z = Math.sin(a) * (playR - 4); }
  const e = buildEnemy(type, D); e.g.position.set(x, th(x, z) - 2, z); scene.add(e.g); enemies.push(e);
  fxN.burst(new THREE.Vector3(x, th(x, z) + 0.2, z), 30, { color: [[0.05, 0.05, 0.08]], spread: 2, up: 1.5, size: 0.9, life: 1.6, grav: 0.8, drag: 1, alpha: 0.7, grow: 2 });
  fxA.burst(new THREE.Vector3(x, th(x, z) + 0.3, z), 25, { color: [[0.5, 0.1, 1], [0.2, 1, 0.8]], spread: 2, up: 2, size: 0.18, life: 1.2, grav: 2 });
  if (Math.random() < 0.5) sound.growl(0);
  return e;
}
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), fwd = new THREE.Vector3();
function camForward(v) { return v.set(-Math.sin(player.yaw) * Math.cos(player.pitch), Math.sin(player.pitch), -Math.cos(player.yaw) * Math.cos(player.pitch)); }
function fire() {
  S.clip--; S.fireCd = 0.32 / (1 + U('rate') * 0.12); sound.shot('holy'); flashL.intensity = 6; shake.add(0.12); vm.userData.kick = 1;
  const o = new THREE.Vector3(0.25, -0.2, -0.7).applyQuaternion(camera.quaternion).add(camera.position);
  const dir = camForward(new THREE.Vector3());
  const m = new THREE.Group(); const core = new THREE.Mesh(G.sph, M.orb); core.scale.setScalar(0.1); m.add(core); const s = new THREE.Sprite(M.glowS); s.scale.set(1.1, 1.1, 1); m.add(s); m.position.copy(o); scene.add(m);
  shots.push({ m, v: dir.multiplyScalar(32), life: 1.6, dmg: 20 * (1 + U('dmg') * 0.2) });
  fxA.burst(o, 10, { color: [[1, 0.7, 0.2], [1, 0.9, 0.5]], spread: 2, size: 0.08, life: 0.3, grav: 0 });
}
function bellBlast() {
  const rad = 8 + U('bell') * 1.2; S.bellCd = 20 * Math.pow(0.85, U('bell')); sound.bell(); sound.noise(0.6, { vol: 0.4, f: 800, to: 100 }); shake.add(0.5); ui.flash('#ffd890', 0.35, 0.6);
  if (ring) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); }
  ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: 0xffd080, transparent: true, toneMapped: false, blending: THREE.AdditiveBlending })); ring.rotation.x = Math.PI / 2; ring.position.copy(player.pos).setY(player.pos.y - 1.2); ring.userData = { t: 0, rad }; scene.add(ring);
  enemies.forEach(e => { const d = e.g.position.distanceTo(player.pos); if (d < rad && e.state !== 'die') { hurtEnemy(e, e.boss ? 40 : 60, null); e.stun = 1.5; tmpV.subVectors(e.g.position, player.pos).setY(0).normalize().multiplyScalar(e.boss ? 0.5 : 3); e.g.position.add(tmpV); } });
  if (stalker.state === 'follow') vanishStalker(true);
}
function hurtEnemy(e, dmg, at) {
  if (e.state === 'die' || (e.state === 'rise' && e.boss)) return; e.hp -= dmg; e.flash = 0.12; ui.hitmark(); sound.hit();
  const p = at ? at.clone() : new THREE.Vector3().copy(e.g.position).setY(e.g.position.y + e.h);
  fxA.burst(p, 14, { color: [[0.3, 1, 0.8], [0.6, 0.3, 1]], spread: 4, size: 0.12, life: 0.6, grav: 1 });
  if (e.hp <= 0) { e.state = 'die'; e.st = 0; S.kills++; const c = e.boss ? 150 + level * 5 : 3 + Math.floor(level / 15); S.coins += c; sound.scream(e.boss ? 2 : 0.6);
    if (!e.boss && Math.random() < 0.22) spawnPickup(Math.random() < 0.55 ? 'oil' : 'health', e.g.position.x, e.g.position.z);
    if (!e.boss && Math.random() < 0.35) spawnPickup('coin', e.g.position.x + 0.5, e.g.position.z); }
}
function hurtPlayer(d) {
  if (state !== 'play' || S.done) return; player.hp -= d; S.hurt += d; ui.damage(Math.min(0.9, 0.3 + d / 40)); shake.add(0.35); sound.hurt();
  if (player.hp <= 0) { player.hp = 0; lose(); }
}
function showStalkerAt(dist) {
  const a = player.yaw + Math.PI + (Math.random() - 0.5); const x = player.pos.x - Math.sin(a) * dist, z = player.pos.z - Math.cos(a) * dist;
  stalker.g.position.set(x, th(x, z), z); stalker.g.visible = true; stalker.state = 'follow'; stalker.op = 0; stalker.seen = 0;
}
function vanishStalker(byBell) {
  stalker.state = 'wait'; stalker.t = (6 + Math.random() * 8) * Math.max(0.45, 1 - level / 220); const p = stalker.g.position.clone().setY(stalker.g.position.y + 1.3);
  if (stalker.g.visible) { fxA.burst(p, 40, { color: [[0.7, 0.8, 1], [0.4, 0.5, 0.9]], spread: 1.6, up: 1.4, size: 0.22, life: 1.1, grav: 1.5, jitter: 0.8 });
    fxN.burst(p, 18, { color: [[0.06, 0.06, 0.1]], spread: 1, size: 0.8, life: 1.2, grav: 0.5, alpha: 0.6, grow: 2, jitter: 0.8 }); sound.whisper(0); }
  stalker.g.visible = false; if (!byBell) S.scares++; ui.prompt('');
}
function updateStalker(dt) {
  const st = stalker; if (S.done) { st.g.visible = false; return; }
  if (st.state === 'wait') { st.t -= dt; if (st.t <= 0) showStalkerAt(9 + Math.random() * 4); return; }
  const gp = st.g.position;
  if (st.state === 'scare') { st.scareT -= dt; const f = camForward(fwd); gp.copy(camera.position).addScaledVector(f, 0.62); gp.y = camera.position.y - 2.08 + f.y * 0.62; st.g.lookAt(camera.position.x, gp.y, camera.position.z); gp.x += (Math.random() - 0.5) * 0.04; if (st.scareT <= 0) { ui.flash('#000', 1, 0.8); vanishStalker(true); } return; }
  tmpV.subVectors(player.pos, gp).setY(0); const d = tmpV.length();
  camForward(fwd); tmpV2.set(gp.x - camera.position.x, gp.y + 1.5 - camera.position.y, gp.z - camera.position.z); const dot = fwd.dot(tmpV2.normalize());
  st.op = damp(st.op, 0.85, 2, dt); st.mats.forEach(m => m.opacity = st.op);
  if (dot > 0.62 && d < 30) { st.seen += dt; if (st.seen > 0.12) { vanishStalker(false); ui.msg('', '<i>…she was right behind you</i>', 2); return; } } else st.seen = 0;
  const pv = Math.hypot(player.vel.x, player.vel.z); const spd = (pv > 0.5 ? pv * 0.92 : 1.4) + level * 0.004; tmpV.normalize(); gp.addScaledVector(tmpV, spd * dt); gp.y = th(gp.x, gp.z) + Math.sin(performance.now() / 400) * 0.05;
  st.g.rotation.y = Math.atan2(tmpV.x, tmpV.z);
  st.hb = (st.hb || 0) - dt; if (d < 9 && st.hb <= 0) { sound.heartbeat(0.25 + (9 - d) / 18); st.hb = 0.35 + d * 0.09; }
  ui.prompt(d < 5 ? '<span style="color:#f66">…something is behind you…</span>' : '');
  if (d < 1.4) { st.state = 'scare'; st.scareT = 0.55; sound.scream(1.3); sound.sting(); shake.add(1); ui.flash('#fff', 0.9, 0.25); hurtPlayer(15 + level * 0.12); ui.prompt(''); }
}
function win() {
  if (S.done) return; S.done = true; S.endT = 1.8; const base = 20 + level * 2 + (isBoss(level) ? 120 : 0); S.coins += base; sound.win();
  const stars = 1 + (S.hurt < player.maxHp * 0.5 ? 1 : 0) + (S.hurt < player.maxHp * 0.2 ? 1 : 0);
  const d = ui.save.d; d.coins += S.coins; d.unlocked = Math.max(d.unlocked, Math.min(LEVELS, level + 1)); d.stars[level] = Math.max(d.stars[level] || 0, stars); ui.save.write();
  S.stars = stars; ui.msg(isBoss(level) ? 'SPIRIT QUEEN BANISHED' : 'AREA PURIFIED', '', 2); enemies.forEach(e => { if (e.state !== 'die') { e.state = 'die'; e.st = 0; } });
  ui.prompt(''); ui.progress(null);
}
function lose() { S.done = true; S.lost = true; S.endT = 1.6; sound.lose(); sound.scream(1.2); const d = ui.save.d; d.coins += Math.floor(S.coins / 2); ui.save.write(); }
function endScreen() {
  state = 'over'; input.enabled = false; input.unlock(); input.showTouch(false); ui.hudOn(false); ui.prompt(''); if (ambient) { ambient.stop(); ambient = null; }
  if (S.lost) ui.result(false, `Night <b>${level}</b> · Spirits banished: <b>${S.kills}</b><br>Coins kept: 🪙 <b>${Math.floor(S.coins / 2)}</b>`);
  else if (level === LEVELS) ui.show('final');
  else ui.result(true, `Night <b>${level}</b> complete · Spirits banished: <b>${S.kills}</b><br>Coins earned: 🪙 <b>${S.coins}</b> · Total: 🪙 <b>${ui.save.d.coins}</b>`, S.stars);
}
function pause() { if (state !== 'play') return; state = 'paused'; input.enabled = false; input.unlock(); input.showTouch(false); ui.show('pause'); document.querySelector('.p-info').innerHTML = levelName(level); }
function resume() { state = 'play'; ui.show('none'); input.enabled = true; input.showTouch(true); input.clear(); lastT = performance.now(); }
function quit() { state = 'menu'; disposeEntities(); input.enabled = false; input.unlock(); input.showTouch(false); ui.hudOn(false); if (ambient) { ambient.stop(); ambient = null; } buildWorld(1); stalker.g.visible = false; }

// ---------- main update ----------
function update(dt) {
  S.t += dt; const D = diff(level);
  const [lx, ly] = input.consumeLook(); player.yaw -= lx; player.pitch = clamp(player.pitch - ly, -1.35, 1.35);
  if (input.wasPressed('pause')) { pause(); return; }
  const mv = input.move(); const sprint = input.sprint() && player.stam > 0.05 && mv.y < 0;
  const spd = 4.3 * (1 + U('speed') * 0.08) * (sprint ? 1.6 : 1);
  player.stam = clamp(player.stam + (sprint ? -dt * 0.22 / (1 + U('speed') * 0.2) : dt * 0.18), 0, 1);
  const sx = Math.sin(player.yaw), cz = Math.cos(player.yaw);
  const tvx = (-sx * -mv.y + cz * mv.x) * spd, tvz = (-cz * -mv.y - sx * mv.x) * spd;
  player.vel.x = damp(player.vel.x, S.done ? 0 : tvx, 10, dt); player.vel.z = damp(player.vel.z, S.done ? 0 : tvz, 10, dt);
  player.pos.x += player.vel.x * dt; player.pos.z += player.vel.z * dt;
  for (const o of obstacles) { const dx = player.pos.x - o.x, dz = player.pos.z - o.z, d = Math.hypot(dx, dz), m = o.r + 0.35; if (d < m && d > 0.001) { player.pos.x = o.x + dx / d * m; player.pos.z = o.z + dz / d * m; } }
  const pr = Math.hypot(player.pos.x, player.pos.z); if (pr > playR - 1.5) { player.pos.x *= (playR - 1.5) / pr; player.pos.z *= (playR - 1.5) / pr; }
  const hv = Math.hypot(player.vel.x, player.vel.z); player.bob += hv * dt * 1.9;
  player.pos.y = th(player.pos.x, player.pos.z) + 1.65 + Math.sin(player.bob * 2) * 0.05 * Math.min(1, hv / 4);
  // weapon
  S.fireCd -= dt; S.bellCd -= dt;
  if (S.reloadT > 0) { S.reloadT -= dt; if (S.reloadT <= 0) { const n = Math.min(S.clipMax - S.clip, S.reserve); S.clip += n; S.reserve -= n; } }
  else if (!S.done) {
    if ((input.wasPressed('reload') || (S.clip === 0 && input.isDown('fire'))) && S.clip < S.clipMax && S.reserve > 0) { S.reloadT = 1.1; sound.reload(); }
    else if (input.isDown('fire') && S.fireCd <= 0) { if (S.clip > 0) fire(); else { sound.click(); S.fireCd = 0.3; if (S.reserve <= 0) ui.msg('', 'Out of holy charges — find oil jars!', 1.5); } }
  }
  if (input.wasPressed('special') && S.bellCd <= 0 && !S.done) bellBlast();
  flashL.intensity = Math.max(0, flashL.intensity - dt * 80);
  const fl = 1 + Math.sin(S.t * 13) * 0.05 + Math.sin(S.t * 31) * 0.04 + (Math.random() - 0.5) * 0.06;
  lantern.intensity = 5 * fl; lantern.distance = 16 * (1 + U('light') * 0.25); spot.distance = 34 * (1 + U('light') * 0.25); vm.userData.flame.scale.set(1, 1.6 * fl, 1);
  // spawns
  S.spawnT -= dt; const alive = enemies.filter(e => e.state !== 'die' && !e.boss).length;
  const spawnEvery = Math.max(0.9, 4.2 - D.f * 3) * (S.obj === 'survive' ? 0.75 : 1);
  if (!S.done && S.spawnT <= 0 && alive < S.maxAlive) { S.spawnT = spawnEvery; spawnEnemy(); }
  // enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], g = e.g; e.cd -= dt;
    if (e.state === 'die') { e.st += dt; g.position.y += dt * 1.5; g.rotation.y += dt * 8; g.scale.multiplyScalar(Math.max(0, 1 - dt * 1.4));
      if (Math.random() < 0.7) fxA.spawn(g.position.x + rr(-.4, .4), g.position.y + rr(0.5, 1.6) * g.scale.y, g.position.z + rr(-.4, .4), rr(-1, 1), rr(1, 3), rr(-1, 1), 0.3, 1, 0.7, 1, 0.25, 1, 1, 1);
      if (e.st > 1.1) { scene.remove(g); e.mats.forEach(m => m.dispose()); enemies.splice(i, 1); } continue; }
    const gy = th(g.position.x, g.position.z);
    if (e.state === 'rise') { const T0 = e.boss ? 2.5 : 0.9; if (e.boss && e.st === 0) { sound.scream(2); shake.add(0.8); } e.st += dt; g.position.y = lerp(gy - 2 * g.scale.y, gy, Math.min(1, e.st / T0)); if (e.st > T0) e.state = 'chase'; animEnemy(e, dt, false); tmpV.subVectors(player.pos, g.position); g.rotation.y = Math.atan2(tmpV.x, tmpV.z); continue; }
    tmpV.subVectors(player.pos, g.position).setY(0); const d = tmpV.length(); tmpV.normalize();
    if (e.stun > 0) { e.stun -= dt; animEnemy(e, dt * 0.3, false); continue; }
    let moving = false;
    if (e.boss) { bossAI(e, dt, d); moving = true; }
    else if (e.atk > 0) { e.atk -= dt; if (e.atk < 0.3 && !e.hitDone) { e.hitDone = true; if (d < e.reach + 0.4) hurtPlayer(e.dmg); } }
    else if (d < e.reach && e.cd <= 0) { e.atk = 0.6; e.cd = 1.1; e.hitDone = false; if (Math.random() < 0.5) sound.growl(0); }
    else if (d >= e.reach) { const s = e.speed * (e.type === 'chudail' && Math.sin(e.t * 2) > 0.8 ? 2.2 : 1); g.position.addScaledVector(tmpV, s * dt); moving = true; }
    for (const o of obstacles) { const dx = g.position.x - o.x, dz = g.position.z - o.z, dd = Math.hypot(dx, dz), m = o.r + e.rad; if (dd < m && dd > 0.001) { g.position.x = o.x + dx / dd * m; g.position.z = o.z + dz / dd * m; } }
    for (const o of enemies) { if (o === e || o.state === 'die') continue; const dx = g.position.x - o.g.position.x, dz = g.position.z - o.g.position.z, dd = Math.hypot(dx, dz), m = o.rad + e.rad; if (dd < m && dd > 0.001) { g.position.x += dx / dd * (m - dd) * 0.5; g.position.z += dz / dd * (m - dd) * 0.5; } }
    if (!e.boss) g.position.y = th(g.position.x, g.position.z);
    g.rotation.y = Math.atan2(tmpV.x, tmpV.z);
    animEnemy(e, dt, moving);
    if (e.type === 'bhoot' && Math.random() < dt * 8) fxA.spawn(g.position.x + rr(-.3, .3), g.position.y + 0.4, g.position.z + rr(-.3, .3), 0, rr(0.2, 0.6), 0, 0.2, 0.9, 0.8, 0.6, 0.15, 1.2, 0.3, 0.5);
    if (Math.random() < dt * 0.08) sound.growl(clamp(-tmpV.x, -1, 1));
  }
  // player shots
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i]; s.life -= dt;
    let best = null, bd = 1e9; for (const e of enemies) { if (e.state === 'die') continue; tmpV.copy(e.g.position).setY(e.g.position.y + e.h * e.g.scale.y); tmpV2.subVectors(tmpV, s.m.position); const dd = tmpV2.length(); if (dd < 25 && tmpV2.normalize().dot(fwd.copy(s.v).normalize()) > 0.88 && dd < bd) { bd = dd; best = e; } }
    if (best) { tmpV.copy(best.g.position).setY(best.g.position.y + best.h * best.g.scale.y).sub(s.m.position).normalize().multiplyScalar(32); s.v.lerp(tmpV, Math.min(1, dt * (IS_TOUCH ? 5 : 2.5))); }
    s.m.position.addScaledVector(s.v, dt);
    fxA.spawn(s.m.position.x, s.m.position.y, s.m.position.z, rr(-.3, .3), rr(-.3, .3), rr(-.3, .3), 1, 0.6, 0.15, 0.9, 0.22, 0.35, 0, 2);
    let hit = s.life <= 0 || s.m.position.y < th(s.m.position.x, s.m.position.z);
    if (!hit) for (const o of obstacles) { if (Math.hypot(s.m.position.x - o.x, s.m.position.z - o.z) < o.r * 0.85 && s.m.position.y < th(o.x, o.z) + 4) { hit = true; break; } }
    if (!hit) for (const e of enemies) { if (e.state === 'die') continue; tmpV.copy(e.g.position).setY(e.g.position.y + e.h * e.g.scale.y); if (tmpV.distanceTo(s.m.position) < (e.boss ? 2 * e.g.scale.y : 0.85)) { hurtEnemy(e, s.dmg, s.m.position); hit = true; break; } }
    if (hit) { fxA.burst(s.m.position, 22, { color: [[1, 0.7, 0.2], [1, 0.4, 0.1], [1, 1, 0.6]], spread: 5, size: 0.12, life: 0.5, grav: -3 }); scene.remove(s.m); shots.splice(i, 1); }
  }
  for (let i = eShots.length - 1; i >= 0; i--) {
    const s = eShots[i]; s.life -= dt; s.m.position.addScaledVector(s.v, dt);
    if (Math.random() < 0.6) fxA.spawn(s.m.position.x, s.m.position.y, s.m.position.z, 0, 0, 0, 0.7, 0.2, 1, 0.8, 0.3, 0.4, 0, 0);
    let hit = s.life <= 0 || s.m.position.y < th(s.m.position.x, s.m.position.z); if (s.m.position.distanceTo(tmpV.copy(player.pos).setY(player.pos.y - 0.4)) < 0.8) { hurtPlayer(s.dmg); hit = true; }
    if (hit) { fxA.burst(s.m.position, 16, { color: [[0.7, 0.2, 1], [1, 0.3, 0.8]], spread: 4, size: 0.12, life: 0.5, grav: 0 }); scene.remove(s.m); eShots.splice(i, 1); }
  }
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i]; p.t += dt; p.m.position.y = th(p.x, p.z) + 0.8 + Math.sin(p.t * 2) * 0.12; p.m.rotation.y += dt * 1.6;
    if (Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < 1.3) {
      if (p.type === 'oil') { S.reserve += 14; ui.msg('', '+14 holy charges', 1.2); sound.pickup(); }
      else if (p.type === 'health') { player.hp = Math.min(player.maxHp, player.hp + 30); ui.msg('', '+30 health', 1.2); sound.pickup(); }
      else if (p.type === 'coin') { S.coins += 5; sound.coin(); }
      else if (p.type === 'amulet') { S.got++; sound.pickup(); sound.bell(); ui.msg('', `Amulet ${S.got}/${S.need}`, 1.5); fxA.burst(p.m.position, 40, { color: [[1, 0.85, 0.3]], spread: 4, size: 0.15, life: 1, grav: 1 }); }
      scene.remove(p.m); pickups.splice(i, 1);
    }
  }
  // objectives
  let objTxt = '', near = null; const act = input.isDown('action') || IS_TOUCH;
  if (S.done) { /* keep */ }
  else if (S.obj === 'diyas') {
    S.got = shrines.filter(s => s.lit).length; let nd = 1e9; shrines.forEach(s => { if (!s.lit) nd = Math.min(nd, s.pos.distanceTo(player.pos)); }); objTxt = `🪔 Light the sacred diyas: <b>${S.got}/${S.need}</b> · nearest ${Math.round(nd)}m`;
    for (const s of shrines) { if (s.lit) continue; const d = Math.hypot(player.pos.x - s.pos.x, player.pos.z - s.pos.z); if (d < 2.4) { near = s; s.prog += dt * (act ? 0.7 : 0); ui.prompt(IS_TOUCH ? 'Lighting diya…' : 'Hold <b>E</b> to light the diya'); ui.progress(s.prog); if (s.prog >= 1) { s.lit = true; s.flame.visible = true; s.sprite.visible = true; s.beam.visible = false; sound.bell(); lamps.push(s.pos.clone()); fxA.burst(s.pos, 50, { color: [[1, 0.8, 0.3]], spread: 4, size: 0.15, life: 1.2, grav: 1.5 }); ui.prompt(''); ui.progress(null); } } else s.prog = Math.max(0, s.prog - dt * 0.2); }
    if (!near && !stalkerNear()) { ui.progress(null); }
    if (shrines.every(s => s.lit)) win();
  } else if (S.obj === 'banish') { objTxt = `👻 Banish spirits: <b>${Math.min(S.kills, S.need)}/${S.need}</b>`; if (S.kills >= S.need) win(); }
  else if (S.obj === 'amulets') { objTxt = `📿 Collect sacred amulets: <b>${S.got}/${S.need}</b>`; if (S.got >= S.need) win(); }
  else if (S.obj === 'well') {
    const w = S.wellRef, d = Math.hypot(player.pos.x - w.pos.x, player.pos.z - w.pos.z);
    if (d < 3.2) { S.wp += dt * (act ? 1 : 0); ui.prompt(IS_TOUCH ? 'Chanting the sealing mantra…' : 'Hold <b>E</b> to chant the sealing mantra'); ui.progress(S.wp / S.need); if (Math.random() < dt * 6) fxA.spawn(w.pos.x + rr(-1, 1), w.pos.y + 0.6, w.pos.z + rr(-1, 1), 0, rr(1, 3), 0, 1, 0.8, 0.3, 1, 0.2, 1, 0, 0.5); S.spawnT -= dt * 0.6; }
    else if (!stalkerNear()) { ui.prompt(''); ui.progress(null); }
    if (Math.random() < dt * 10) fxA.spawn(w.pos.x + rr(-0.8, 0.8), w.pos.y + 0.6, w.pos.z + rr(-0.8, 0.8), 0, rr(0.6, 1.6), 0, 0.1, 1, 0.4, 0.8, 0.25, 1.5, 0.2, 0.2);
    objTxt = `🕳 Seal the haunted well (stand near it): <b>${Math.floor(S.wp / S.need * 100)}%</b> · ${Math.round(d)}m`;
    if (S.wp >= S.need) { w.water.material = M.dark; if (w.beam) w.beam.visible = false; win(); }
  } else if (S.obj === 'survive') { S.timer -= dt; objTxt = `🌅 Survive until dawn: <b>${Math.max(0, Math.ceil(S.timer))}s</b>`; if (S.timer <= 0) win(); }
  else if (S.obj === 'boss') { const q = S.boss; objTxt = `👑 Banish the ${level === LEVELS ? 'Ancient ' : ''}Spirit Queen`; if (q) ui.boss((level === LEVELS ? 'ANCIENT ' : '') + 'SPIRIT QUEEN', q.hp / q.maxHp); if (q && q.state === 'die') { ui.boss(null); win(); } }
  if (objTxt) ui.set('.h-obj', objTxt);
  updateStalker(dt);
  S.lightningT -= dt; if (S.lightningT <= 0) { S.lightningT = rr(12, 28); S.lightning = 0.25; ui.flash('#c8d0ff', 0.35, 0.5); setTimeout(() => sound.thunder(), 400 + Math.random() * 900); }
  if (S.lightning > 0) { S.lightning -= dt; hemi.intensity = 1.7 + (S.lightning > 0 ? 4 * Math.random() : 0); } else hemi.intensity = 1.7;
  if (ring) { ring.userData.t += dt; const k = ring.userData.t / 0.6; ring.scale.setScalar(1 + k * ring.userData.rad); ring.material.opacity = Math.max(0, 1 - k); if (k >= 1) { scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); ring = null; } }
  if (Math.random() < dt * 12) fxA.spawn(player.pos.x + rr(-14, 14), th(player.pos.x, player.pos.z) + rr(0.3, 2.5), player.pos.z + rr(-14, 14), rr(-.3, .3), rr(-.1, .2), rr(-.3, .3), 0.6, 1, 0.3, 0.9, 0.07, rr(2, 4), 0, 0);
  ui.hp(player.hp / player.maxHp, player.hp); ui.lowHp(player.hp / player.maxHp < 0.3 ? 0.8 : 0);
  ui.set('.h-level', (isBoss(level) ? '💀 ' : '') + 'NIGHT ' + level + ' / ' + LEVELS);
  ui.set('.h-coins b', ui.save.d.coins + (S.done ? 0 : S.coins));
  ui.set('.h-weapon', 'HOLY LANTERN' + (S.reloadT > 0 ? ' · REFILLING…' : ''));
  ui.set('.h-ammo', `${S.clip}<small> / ${S.reserve}</small>`);
  ui.set('.h-extra', `🔔 Bell: ${S.bellCd > 0 ? Math.ceil(S.bellCd) + 's' : '<b style="color:#ffd060">READY' + (IS_TOUCH ? '' : ' (Q)') + '</b>'} &nbsp; ⚡ ${'▮'.repeat(Math.round(player.stam * 8))}`);
}
function stalkerNear() { return stalker.state === 'follow' && stalker.g.position.distanceTo(player.pos) < 6; }
function bossAI(q, dt, d) {
  const L = level; q.aiT -= dt; if (q.hp < q.maxHp * 0.5 && q.phase === 1) { q.phase = 2; ui.msg('SHE IS ENRAGED', '', 1.5); sound.scream(2); shake.add(0.8); }
  const g = q.g; const gy = th(g.position.x, g.position.z);
  if (d > 7) g.position.addScaledVector(tmpV, q.speed * (q.phase === 2 ? 1.4 : 1) * dt);
  else if (q.cd <= 0) { q.atk = 0.6; q.cd = 1.4; shake.add(0.4); sound.growl(0); hurtPlayer(q.dmg * 0.8); player.vel.addScaledVector(tmpV, 9); }
  if (q.atk > 0) q.atk -= dt;
  g.position.y = gy;
  bossLight.position.copy(g.position).setY(gy + 4); bossLight.intensity = 30 + Math.sin(S.t * 6) * 10;
  if (Math.random() < dt * 20) fxA.spawn(g.position.x + rr(-1.5, 1.5), gy + rr(0, 4), g.position.z + rr(-1.5, 1.5), 0, rr(0.5, 2), 0, 0.6, 0.1, 0.9, 0.8, 0.35, 1.2, 0.5, 0.5);
  if (q.aiT <= 0) {
    const r = Math.random(); q.aiT = (q.phase === 2 ? 2.2 : 3.2) - Math.min(1, L / 150);
    if (r < 0.5) { const n = 3 + Math.floor(L / 30) + (q.phase === 2 ? 2 : 0); for (let k = 0; k < n; k++) { const m = new THREE.Group(); const c = new THREE.Mesh(G.sph, M.orbE); c.scale.setScalar(0.22); m.add(c); m.add(glowSprite(0xb040ff, 1.6)); m.position.copy(g.position).setY(gy + 4 * g.scale.y); scene.add(m);
        const dir = new THREE.Vector3().subVectors(player.pos, m.position).normalize(); dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), (k - (n - 1) / 2) * 0.14); eShots.push({ m, v: dir.multiplyScalar(11 + L * 0.03), life: 4, dmg: 8 + L * 0.08 }); } sound.tone(200, 0.6, { type: 'sawtooth', vol: 0.15, to: 600, wet: 0.5 }); }
    else if (r < 0.75) { const alive = enemies.filter(e => !e.boss && e.state !== 'die').length; if (alive < S.maxAlive) { for (let k = 0; k < 2 + (q.phase === 2 ? 1 : 0); k++) spawnEnemy(); sound.scream(1); ui.msg('', 'She summons her servants!', 1.4); } }
    else {
      fxN.burst(new THREE.Vector3().copy(g.position).setY(gy + 2), 40, { color: [[0.05, 0.02, 0.08]], spread: 3, size: 1.4, life: 1.4, grav: 0.5, alpha: 0.8, grow: 2, jitter: 2 });
      const a = Math.random() * 6.28, rd = 8 + Math.random() * 8; g.position.set(clamp(player.pos.x + Math.cos(a) * rd, -playR + 5, playR - 5), gy, clamp(player.pos.z + Math.sin(a) * rd, -playR + 5, playR - 5)); sound.whisper(0); ui.flash('#400060', 0.5, 0.5);
    }
  }
}

// ---------- loop ----------
let lastT = performance.now(), fpsAcc = 0, fpsN = 0, menuT = 0;
camera.rotation.order = 'YXZ';
const MAXDT = +(new URLSearchParams(location.search).get('simdt') || 0.05);
function frame(now) {
  requestAnimationFrame(frame);
  const rdt = Math.max(0, (now - lastT) / 1000), dt = Math.min(MAXDT, rdt); lastT = now;
  if (state === 'play') {
    if (S.done) { S.endT -= dt; if (S.endT <= 0) endScreen(); }
    if (state === 'play') update(dt);
    camera.position.copy(player.pos); camera.rotation.set(player.pitch, player.yaw, 0);
    shake.update(dt); camera.position.add(shake.off); camera.rotation.z = shake.roll;
    const k = (vm.userData.kick = Math.max(0, (vm.userData.kick || 0) - dt * 6)); const hv = Math.hypot(player.vel.x, player.vel.z) / 5;
    vm.position.set(0.26 + Math.sin(player.bob) * 0.015 * hv, -0.27 + Math.abs(Math.cos(player.bob)) * 0.012 * hv - (S.reloadT > 0 ? 0.25 : 0), -0.6 + k * 0.08); vm.rotation.x = k * 0.3;
  } else if (state === 'menu') {
    menuT += dt; const a = menuT * 0.06; camera.position.set(Math.sin(a) * 15, 3 + Math.sin(menuT * 0.3) * 0.5, Math.cos(a) * 15 + 2); camera.lookAt(0, 2.2, -6);
  }
  vm.visible = state !== 'menu';
  const cp = camera.position; const sorted = lamps.slice().sort((a, b) => a.distanceToSquared(cp) - b.distanceToSquared(cp));
  lampLights.forEach((l, i) => { const p = sorted[i]; if (p) { l.position.copy(p); l.intensity = 8 * (0.8 + Math.sin(now / 90 + i * 7) * 0.1 + Math.random() * 0.15); } else l.intensity = 0; });
  if (!(state === 'play' && S && S.obj === 'boss' && !S.done)) bossLight.intensity = 0;
  mists.forEach(m => { if (m.userData.spin) m.rotation.z += m.userData.spin * dt; });
  (world.userData.flags || []).forEach((f, i) => { f.rotation.y = Math.sin(now / 300 + i) * 0.4; });
  moon.position.set(cp.x - 30, 50, cp.z - 20); moon.target.position.set(cp.x, 0, cp.z);
  if (state === 'menu') {
    if (Math.random() < dt * 8) fxA.spawn(rr(-12, 12), rr(0.3, 3), rr(-14, 6), rr(-.3, .3), rr(-.1, .2), rr(-.3, .3), 0.6, 1, 0.3, 0.9, 0.08, rr(2, 4), 0, 0);
    stalker.g.visible = true; stalker.g.position.set(3.5, th(3.5, -3), -3); stalker.g.rotation.y = Math.atan2(cp.x - 3.5, cp.z + 3); stalker.mats.forEach(m => m.opacity = 0.55 + Math.sin(menuT * 0.8) * 0.3);
    lantern.intensity = 0; spot.intensity = 0;
  } else { spot.intensity = 22; }
  if (state !== 'paused') { fxA.update(dt); fxN.update(dt); }
  if (post.grade) { const f = state === 'play' ? player.hp / player.maxHp : 1; post.grade.uDesat.value = f < 0.35 ? 0.5 : 0.1; post.grade.uAb.value = 0.0015 + shake.amp * 0.01; }
  post.render(now / 1000);
  if (ui.save.s.fps) { fpsAcc += rdt; fpsN++; if (fpsAcc > 0.5) { ui.set('.h-fps', Math.round(fpsN / fpsAcc) + ' FPS'); fpsAcc = 0; fpsN = 0; } } else ui.set('.h-fps', '');
}
applyQuality();
buildWorld(1);
requestAnimationFrame(frame);
window.__game = { get state() { return state; }, get S() { return S; }, player, enemies, startLevel, win: () => win(), ui, stalker, spawnEnemy, camera, renderer };
