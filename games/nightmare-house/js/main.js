import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { generate, buildLevel, materials, levelParams, mulberry, WALL_H, S, TOTAL_LEVELS, GeoBuilder, ROOM_NAMES } from './level.js';
import { Zombie, Ghost, Boss, Particles } from './entities.js';
import { Sfx } from './audio.js';

const $ = id => document.getElementById(id);
const IS_TOUCH = matchMedia('(pointer: coarse)').matches || (!matchMedia('(any-pointer: fine)').matches && navigator.maxTouchPoints > 0);
if (IS_TOUCH) document.body.classList.add('touch');

// ---------------- save ----------------
const SAVE_KEY = 'gunvora_nightmare_house_v1';
const defSave = () => ({ unlocked: 1, last: 1, stars: {}, coins: 0, upg: { hp: 0, dmg: 0, hands: 0, lantern: 0, feet: 0, compass: 0 }, secrets: {}, endings: [], banished: 0, kills: 0, settings: { q: IS_TOUCH ? 'low' : 'high', sens: 1, vol: 0.8, fps: 0 } });
let save; try { save = Object.assign(defSave(), JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); save.upg = Object.assign(defSave().upg, save.upg); save.settings = Object.assign(defSave().settings, save.settings); } catch (e) { save = defSave(); }
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { } };

const UPG = [
  { k: 'hp', ic: '❤️', n: 'Vitality', d: '+20 max health per level', max: 5, base: 60 },
  { k: 'dmg', ic: '🔫', n: 'Blessed Rounds', d: '+22% revolver damage', max: 5, base: 80 },
  { k: 'hands', ic: '✋', n: 'Quick Hands', d: 'Faster firing & reload, +1 chamber', max: 5, base: 70 },
  { k: 'lantern', ic: '✴️', n: 'Spirit Lantern', d: 'Shorter cooldown, wider banish radius', max: 5, base: 75 },
  { k: 'feet', ic: '👟', n: 'Swift Feet', d: '+6% speed, more stamina', max: 5, base: 55 },
  { k: 'compass', ic: '🧭', n: 'Clue Compass', d: 'Lv1: points to clues/exit · Lv2: reveals secret passages', max: 2, base: 150 },
];
const upCost = (u) => Math.round(u.base * Math.pow(save.upg[u.k] + 1, 1.55));
const stats = () => { const u = save.upg; return { maxHp: 100 + u.hp * 20, dmg: 34 * (1 + u.dmg * 0.22), fireInt: 0.34 * (1 - u.hands * 0.08), reload: 1.7 * (1 - u.hands * 0.1), cap: 6 + u.hands, lanternCd: 14 - u.lantern * 1.6, lanternR: 6 + u.lantern * 0.8, speed: 3.5 * (1 + u.feet * 0.06), stamina: 4 + u.feet * 0.8 }; };

// ---------------- renderer / scene ----------------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x030205);
scene.fog = new THREE.FogExp2(0x040306, 0.075);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 80); camera.rotation.order = 'YXZ'; scene.add(camera);
const hemi = new THREE.HemisphereLight(0x3a3a60, 0x140a08, 0.55); scene.add(hemi);
const flash = new THREE.SpotLight(0xfff0d8, 11, 26, 0.5, 0.55, 1.25); flash.position.set(-0.14, 0.12, 0.05); camera.add(flash); flash.target.position.set(0, 0, -5); camera.add(flash.target);
flash.shadow.mapSize.set(1024, 1024); flash.shadow.camera.near = 0.2; flash.shadow.camera.far = 26; flash.shadow.bias = -0.0008;
const muzzleLight = new THREE.PointLight(0xffb060, 0, 8, 2); camera.add(muzzleLight); muzzleLight.position.set(0.2, -0.1, -0.6);
const lanternLight = new THREE.PointLight(0x60c0ff, 0, 14, 1.5); camera.add(lanternLight);
let pool = [];
function makePool(n) { for (const l of pool) scene.remove(l); pool = []; for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffa060, 0, 10, 2); l.userData = { src: null, fade: 0 }; scene.add(l); pool.push(l); } }

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0.5, 0.78); composer.addPass(bloom);
const horror = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, flash: { value: 0 }, dmg: { value: 0 }, chroma: { value: 0.0015 }, grain: { value: 0.05 }, vig: { value: 1.15 }, desat: { value: 0.15 }, blue: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float time,flash,dmg,chroma,grain,vig,desat,blue; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 c=vUv-.5; float d=length(c); vec2 off=c*(chroma+dmg*0.012+flash*0.02);
      vec3 col=vec3(texture2D(tDiffuse,vUv+off).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-off).b);
      float l=dot(col,vec3(.299,.587,.114)); col=mix(col,vec3(l)*vec3(1.0,0.95,0.9),desat);
      col+= (h(vUv*vec2(1280.,720.)+fract(time*7.))-.5)*grain*(0.5+l);
      col*= 1.0 - smoothstep(0.35, 0.95, d*vig);
      col = mix(col, col*vec3(1.6,0.25,0.2)+vec3(0.12,0.,0.), dmg*smoothstep(0.15,0.75,d));
      col = mix(col, col+vec3(0.15,0.4,0.7)*(1.-d), blue);
      col += vec3(flash);
      gl_FragColor=vec4(col,1.); }` });
composer.addPass(horror);
composer.addPass(new OutputPass());

let quality = save.settings.q;
function applyQuality() {
  quality = save.settings.q; const hi = quality === 'high';
  const pr = Math.min(window.devicePixelRatio || 1, hi ? 1.75 : 1.0);
  renderer.setPixelRatio(pr); composer.setPixelRatio(pr);
  renderer.shadowMap.enabled = hi; flash.castShadow = hi;
  makePool(hi ? 6 : 3);
  bloom.resolution.set(innerWidth * pr / (hi ? 2 : 3), innerHeight * pr / (hi ? 2 : 3));
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  resize();
}
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.fov = w / h < 1.2 ? 85 : 72; camera.updateProjectionMatrix(); checkRotate(); }
addEventListener('resize', resize);
let rotateOK = false; // player chose to play in portrait
function checkRotate() { $('rotate').classList.toggle('hidden', !(IS_TOUCH && !rotateOK && innerHeight > innerWidth && state === 'play')); }
const rotateShown = () => !$('rotate').classList.contains('hidden');
{ const r = $('rotate'); const go = e => { e.preventDefault(); rotateOK = true; checkRotate(); clock.getDelta(); }; r.addEventListener('touchend', go, { passive: false }); r.addEventListener('click', go); }

const sfx = new Sfx(); sfx.setVolume(save.settings.vol);
const particles = new Particles(scene);
const M = materials();

// ---------------- viewmodel revolver ----------------
const gun = new THREE.Group(); camera.add(gun);
{ const b = new GeoBuilder(); const dark = 0x1a1a1e, steel = 0x6a6e78, woodc = 0x5a2e14;
  b.set(0, 0, 0).color(steel).box(-0.03, -0.03, -0.42, 0.03, 0.03, -0.12).color(dark).box(-0.035, 0.03, -0.4, 0.035, 0.04, -0.12);
  b.color(steel).cyl(0, -0.0, -0.1, 0.055, 0.055, 0.001, 10, false); b.set(0, 0, -0.08, 0).color(steel);
  const cy = new THREE.Matrix4(); b.m.makeRotationX(Math.PI / 2); b.m.setPosition(0, -0.005, -0.15); b.nm.getNormalMatrix(b.m); b.cyl(0, 0, 0, 0.052, 0.052, 0.1, 12);
  b.set(0, 0, 0).color(dark).box(-0.035, -0.06, -0.12, 0.035, 0.04, 0.0).color(woodc).box(-0.03, -0.2, -0.02, 0.03, -0.04, 0.06).color(dark).box(-0.006, -0.09, -0.1, 0.006, -0.05, -0.06);
  b.color(0xc8a050).box(-0.01, 0.04, -0.41, 0.01, 0.055, -0.39);
  const gm = new THREE.Mesh(b.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.75 })); gun.add(gm);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 })); hand.position.set(0, -0.14, 0.03); gun.add(hand);
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.4), new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 1 })); sleeve.position.set(0.02, -0.16, 0.28); gun.add(sleeve);
}
const muzzle = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.22), new THREE.MeshBasicMaterial({ map: M.spark, color: new THREE.Color(3, 1.6, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
muzzle.position.set(0, 0, -0.47); gun.add(muzzle); muzzle.visible = false;
// bullet tracer (muzzle -> exact hit point) and bullet-hole decals
const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 1).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 1.7, 0.9), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
tracer.visible = false; tracer.frustumCulled = false; scene.add(tracer); let tracerT = 0;
const holeTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.25, 'rgba(10,6,4,0.95)'); g.addColorStop(0.5, 'rgba(40,28,20,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
const holeMat = new THREE.MeshBasicMaterial({ map: holeTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const holes = new THREE.Group(); scene.add(holes); const holeGeo = new THREE.PlaneGeometry(0.09, 0.09); let holeIdx = 0;
for (let k = 0; k < 40; k++) { const h = new THREE.Mesh(holeGeo, holeMat); h.visible = false; holes.add(h); }
function addHole(p, n) { const h = holes.children[holeIdx++ % holes.children.length]; h.position.copy(p).addScaledVector(n, 0.004); h.lookAt(p.x + n.x, p.y + n.y, p.z + n.z); h.rotateZ(Math.random() * 6.28); h.scale.setScalar(0.8 + Math.random() * 0.5); h.visible = true; }
const GUN_REST = new THREE.Vector3(0.2, -0.2, -0.38); gun.position.copy(GUN_REST); gun.visible = false;
// lantern wave mesh
const wave = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.4, 2.4), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.BackSide, toneMapped: false }));
scene.add(wave); wave.visible = false;
// jump scare face
const scareFace = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: M.ghostFace, transparent: true, depthTest: false, toneMapped: false, color: new THREE.Color(0.85, 0.85, 0.9) }));
scareFace.position.set(0, 0, -0.55); scareFace.renderOrder = 999; camera.add(scareFace); scareFace.visible = false;
// dust motes
const dust = (() => { const n = 260, g = new THREE.BufferGeometry(), p = new Float32Array(n * 3); for (let i = 0; i < n * 3; i++) p[i] = (Math.random() - 0.5) * 16; g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const m = new THREE.PointsMaterial({ size: 0.03, color: 0x9a8a70, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }); const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts; })();

// ---------------- game state ----------------
let state = 'loading';
let G = null, levelGroup = null, dyn = null, L = 1, P = null;
let zombies = [], ghosts = [], boss = null, orbs = [], pickups = [], clueObjs = [], urns = [], secretDoors = [], exitDoor = null, chest = null;
const player = { x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, stamina: 4, bob: 0, vy: 0 };
let ST = stats();
let ammo = 6, reloadT = 0, fireT = 0, lanternT = 0, flashOn = true, shakeA = 0, dmgFx = 0, flashFx = 0, blueFx = 0;
let timeLeft = 0, timeLimit = 1, cluesGot = 0, exitOpen = false, coinsRun = 0, killsRun = 0, secretRun = false, elapsed = 0, scareT = 20, blackoutT = 0, scareFaceT = 0, heartT = 0, stepT = 0, flowTile = -1, poolT = 0, ended = false, winT = -1;
let flow = null;
const keys = {};
const input = { mx: 0, mz: 0, fire: false, sprint: false, lookDX: 0, lookDY: 0, fireQ: 0, qAim: null, curX: 0, curY: 0, hasCur: false };

const LORE = ['"The master signed his soul to the house in 1847."', '"Every night the walls move. The house is hungry."', '"Do not trust the bookshelves. Some of them breathe."', '"His heart is kept in the urns. Break them."', '"The servants never left. They only stopped dying."', '"Sunrise is the only key the house fears."', '"I heard the piano play itself again tonight."', '"Light draws the spirits. Darkness hides you."', '"The children\'s room... never go to the nursery."', '"He cannot die while the soul fires burn."', '"Count the doors. Tomorrow there will be more."', '"The portraits\' eyes follow the guilty."', '"Holy silver stops the dead. Not the departed."', '"The Grand Hall appears every tenth night."', '"We buried him three times. He came to dinner."', '"Some guests escaped. Most became furniture."'];

// ---------------- grid helpers ----------------
const solidAt = (i, j) => { if (!G || i < 0 || j < 0 || i >= G.W || j >= G.H) return true; const v = G.grid[j * G.W + i]; return v !== 0; };
function collide(x, z, r) {
  for (let it = 0; it < 2; it++) {
    const i0 = Math.floor(x - r), i1 = Math.floor(x + r), j0 = Math.floor(z - r), j1 = Math.floor(z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!solidAt(i, j)) continue; const cx = Math.max(i, Math.min(x, i + 1)), cz = Math.max(j, Math.min(z, j + 1)); let dx = x - cx, dz = z - cz; const d = Math.hypot(dx, dz);
      if (d < r) { if (d < 1e-5) { dx = x - (i + 0.5); dz = z - (j + 0.5); const dd = Math.hypot(dx, dz) || 1; x = i + 0.5 + dx / dd * (0.71 + r); z = j + 0.5 + dz / dd * (0.71 + r); } else { x = cx + dx / d * r; z = cz + dz / d * r; } }
    }
    for (const u of urns) { if (!u.g.visible) continue; const dx = x - u.x, dz = z - u.z, d = Math.hypot(dx, dz), m = 0.5 + r; if (d < m) { const k = d > 1e-5 ? m / d : 0; x = d > 1e-5 ? u.x + dx * k : u.x + m; z = d > 1e-5 ? u.z + dz * k : z; } }
  }
  return [x, z];
}
function los(x0, z0, x1, z1) { const d = Math.hypot(x1 - x0, z1 - z0), n = Math.ceil(d / 0.3); for (let k = 1; k < n; k++) { const t = k / n, i = Math.floor(x0 + (x1 - x0) * t), j = Math.floor(z0 + (z1 - z0) * t); const v = G.grid[j * G.W + i]; if (v === 1 || v === 3 || v === 4) return false; } return true; }
function computeFlow() {
  const W = G.W, H = G.H; if (!flow || flow.length !== W * H) flow = new Int32Array(W * H); flow.fill(1e6);
  const s = Math.floor(player.z) * W + Math.floor(player.x); if (s < 0 || s >= W * H) return; flow[s] = 0; const q = new Int32Array(W * H); let h = 0, t = 0; q[t++] = s;
  while (h < t) { const k = q[h++]; const i = k % W, j = (k / W) | 0, d = flow[k] + 1; if (d > 40) continue;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= H) continue; const n = nj * W + ni; if (G.grid[n] === 0 && flow[n] > d) { flow[n] = d; q[t++] = n; } } }
}
const flowDist = (x, z) => { const i = Math.floor(x), j = Math.floor(z); return flow ? flow[j * G.W + i] : 1e6; };
function flowDir(x, z) {
  const i = Math.floor(x), j = Math.floor(z), W = G.W; let best = flow[j * W + i], bx = 0, bz = 0;
  for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const ni = i + di, nj = j + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= G.H) continue; if (di && dj && (G.grid[j * W + ni] !== 0 || G.grid[nj * W + i] !== 0)) continue; const v = flow[nj * W + ni]; if (v < best) { best = v; bx = ni + 0.5 - x; bz = nj + 0.5 - z; } }
  if (!bx && !bz) return [player.x - x, player.z - z]; return [bx, bz];
}

// ---------------- game API for entities ----------------
const game = {
  get player() { return player; }, get zombies() { return zombies; }, get flashOn() { return flashOn; }, get G() { return G; }, sfx, particles,
  collide, los, flowDist, flowDir,
  damagePlayer(d, src) { hurt(d); sfx.claw(); },
  ghostAttack(g) { jumpScare(true); hurt(g.dmg); },
  shake(a) { shakeA = Math.max(shakeA, a); },
  spawnOrb(x, y, z, yaw) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.4, 0.15), toneMapped: false })); m.position.set(x, y, z); dyn.add(m);
    const dx = player.x - x, dz = player.z - z, dy = 1.4 - y, d = Math.hypot(dx, dz) || 1; const dir = new THREE.Vector3(Math.sin(yaw), dy / d, Math.cos(yaw)).normalize(); orbs.push({ m, v: dir.multiplyScalar(7 + P.d * 4), life: 6 }); sfx.orb(); },
  bossSummon(b) { for (let k = 0; k < 2; k++) { let p = null; for (let tr = 0; tr < 12; tr++) { const a = Math.random() * 6.28; const q = collide(b.x + Math.cos(a) * 2.5, b.z + Math.sin(a) * 2.5, 0.4); if (Math.hypot(q[0] - player.x, q[1] - player.z) > 2.2) { p = q; break; } } if (!p) continue; const z = new Zombie(dyn, p[0], p[1], P, Math.random, k); z.aggro = true; zombies.push(z); particles.emit(p[0], 0.3, p[1], { n: 30, color: [1.5, 0.2, 0.1], up: 3, grav: -2, size: 0.25 }); } toast('The dead rise to serve their Master!'); },
  bossTeleport(b) { particles.emit(b.x, 2, b.z, { n: 60, color: [2, 0.2, 0.1], speed: 4, up: 1, grav: 0, size: 0.3, life: 1 }); const a = Math.random() * 6.28; const p = collide(Math.max(3, Math.min(G.W - 3, player.x + Math.cos(a) * 7)), Math.max(3, Math.min(G.H - 3, player.z + Math.sin(a) * 7)), 0.9); b.root.position.x = p[0]; b.root.position.z = p[1]; particles.emit(p[0], 2, p[1], { n: 60, color: [2, 0.2, 0.1], speed: 4, up: 1, grav: 0, size: 0.3, life: 1 }); sfx.whisper(); shakeA = Math.max(shakeA, 0.3); },
};

// ---------------- level lifecycle ----------------
function clearLevel() {
  if (levelGroup) { scene.remove(levelGroup); levelGroup.traverse(o => { if (o.geometry) o.geometry.dispose(); }); levelGroup = null; }
  for (const z of zombies) z.dispose(dyn || scene); for (const g of ghosts) g.dispose(dyn || scene); if (boss) boss.dispose(dyn); boss = null;
  if (dyn) { scene.remove(dyn); dyn.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); }
  zombies = []; ghosts = []; orbs = []; pickups = []; clueObjs = []; urns = []; secretDoors = []; exitDoor = null; chest = null; particles.clear();
  for (const l of pool) { l.intensity = 0; l.userData.src = null; }
}
const shared = {};
function sharedGeo() {
  if (shared.ok) return shared; shared.ok = true;
  shared.paper = new THREE.PlaneGeometry(0.42, 0.42); shared.coin = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 16); shared.coin.rotateX(Math.PI / 2);
  shared.halo = new THREE.SphereGeometry(0.35, 12, 8); shared.med = new THREE.BoxGeometry(0.42, 0.28, 0.3); shared.cross1 = new THREE.BoxGeometry(0.06, 0.18, 0.31); shared.cross2 = new THREE.BoxGeometry(0.18, 0.06, 0.31);
  shared.paperMat = new THREE.MeshBasicMaterial({ map: M.parchment, side: THREE.DoubleSide, color: new THREE.Color(1.15, 1.05, 0.85), toneMapped: false });
  shared.haloMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.75, 1.3), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  shared.coinMat = new THREE.MeshStandardMaterial({ color: 0xffc040, metalness: 1, roughness: 0.25, emissive: 0x6a4000 });
  shared.medMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.6 }); shared.redMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.1, 0.1), toneMapped: false });
  return shared;
}
const ROT = { N: 0, S: Math.PI, W: Math.PI / 2, E: -Math.PI / 2 };

function loadLevel(n, forMenu = false) {
  clearLevel(); L = n; P = levelParams(n); G = generate(n);
  levelGroup = buildLevel(G); scene.add(levelGroup); dyn = new THREE.Group(); scene.add(dyn);
  const SG = sharedGeo();
  // base floor under thresholds
  const base = new THREE.Mesh(new THREE.PlaneGeometry(G.W + 2, G.H + 2), M.floorDark); base.name = 'base'; base.rotation.x = -Math.PI / 2; base.position.set(G.W / 2, -0.01, G.H / 2); base.receiveShadow = true; dyn.add(base);
  // exit door
  { const e = G.exit; const g = new THREE.Group(); g.position.set(e.x, 0, e.z); g.rotation.y = ROT[e.side]; dyn.add(g);
    const wm = new THREE.MeshStandardMaterial({ color: 0x3a1a0a, roughness: 0.6, map: M.wood.map }); const gold = new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 1, roughness: 0.3 });
    const leaves = []; for (const s of [-1, 1]) { const hinge = new THREE.Group(); hinge.position.set(s * 1.0, 0, 0); g.add(hinge); const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.68, 0.12), wm); leaf.position.set(-s * 0.5, 1.34, 0); leaf.castShadow = true; hinge.add(leaf);
      for (const y of [0.7, 1.85]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.8, 0.04), wm); p.position.set(-s * 0.5, y, 0.07); hinge.add(p); } const hd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), gold); hd.position.set(-s * 0.88, 1.3, 0.1); hinge.add(hd); leaves.push([hinge, s]); }
    const sigMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.15, 0.05), toneMapped: false, transparent: true }); const sig = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.03, 8, 24), sigMat); sig.position.set(0, 2.95, 0.52); g.add(sig);
    const sig2 = new THREE.Mesh(new THREE.CircleGeometry(0.09, 5), sigMat); sig2.position.set(0, 2.95, 0.52); g.add(sig2);
    const dawn = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.4), toneMapped: false })); dawn.position.set(0, 1.4, -0.55); g.add(dawn);
    const dl = new THREE.PointLight(0xffc080, 0, 9, 1.5); dl.position.set(0, 1.6, 1.0); g.add(dl);
    exitDoor = { g, leaves, sigMat, open: 0, light: dl }; }
  // secret bookshelves
  for (const s of G.secrets) { const [a, b2] = s.tiles; const g = new THREE.Group(); const cx = (a[0] + b2[0]) / 2 + 0.5, cz = (a[1] + b2[1]) / 2 + 0.5; g.position.set(cx, 0, cz); dyn.add(g);
    const shelf = new THREE.Group(); g.add(shelf); const w = 2, d = 0.98; const sx = s.axis === 'x' ? w : d, sz = s.axis === 'x' ? d : w;
    const bm = new THREE.MeshStandardMaterial({ map: M.books.map, roughness: 0.9, emissive: 0x000000 }); const fm = new THREE.MeshStandardMaterial({ color: 0x3a2010, map: M.wood.map, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(sx, 2.48, sz), [s.axis === 'z' ? bm : fm, s.axis === 'z' ? bm : fm, fm, fm, s.axis === 'x' ? bm : fm, s.axis === 'x' ? bm : fm]); body.position.y = 1.24; body.castShadow = true; shelf.add(body);
    secretDoors.push({ s, g, shelf, mat: bm, open: 0, opening: false, cx, cz }); }
  // clues
  for (const c of G.clues) { const g = new THREE.Group(); g.position.set(c.x, 1.0, c.z); const p = new THREE.Mesh(SG.paper, SG.paperMat); g.add(p); const h = new THREE.Mesh(SG.halo, SG.haloMat); g.add(h); dyn.add(g); clueObjs.push({ g, x: c.x, z: c.z, got: false, ph: Math.random() * 6 }); }
  for (const c of G.coins) { const m = new THREE.Mesh(SG.coin, SG.coinMat); m.position.set(c.x, 0.5, c.z); if (c.v > 1) m.scale.setScalar(1.5); dyn.add(m); pickups.push({ type: 'coin', m, x: c.x, z: c.z, v: c.v }); }
  for (const c of G.medkits) { const g = new THREE.Group(); g.position.set(c.x, 0.35, c.z); g.add(new THREE.Mesh(SG.med, SG.medMat)); const a = new THREE.Mesh(SG.cross1, SG.redMat), b2 = new THREE.Mesh(SG.cross2, SG.redMat); g.add(a, b2); dyn.add(g); pickups.push({ type: 'med', m: g, x: c.x, z: c.z }); }
  if (G.chest) { const g = new THREE.Group(); g.position.set(G.chest.x, 0, G.chest.z); const wm = new THREE.MeshStandardMaterial({ color: 0x5a2a10, roughness: 0.6 }); const gm = new THREE.MeshStandardMaterial({ color: 0xd8a840, metalness: 1, roughness: 0.25, emissive: 0x302000 });
    const bx = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), wm); bx.position.y = 0.25; g.add(bx); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 12, 1, false, 0, Math.PI), wm); lid.rotation.z = Math.PI / 2; lid.position.y = 0.5; g.add(lid);
    for (const x of [-0.35, 0.35]) { const band = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.82, 0.64), gm); band.position.set(x, 0.4, 0); g.add(band); } const glow = new THREE.Mesh(SG.halo, new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.4, 0.3), transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glow.scale.setScalar(2.2); glow.position.y = 0.5; g.add(glow); dyn.add(g); chest = { g, got: false, x: G.chest.x, z: G.chest.z }; }
  // urns (boss)
  for (const u of G.urns) { const g = new THREE.Group(); g.position.set(u.x, 0, u.z); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 1.0, 10), M.stone); st.position.y = 0.5; st.material = new THREE.MeshStandardMaterial({ color: 0x5a5450, map: M.stone.map }); g.add(st);
    const urnM = new THREE.MeshStandardMaterial({ color: 0x3a3a40, metalness: 0.8, roughness: 0.3, emissive: 0x000000 }); const urn = new THREE.Mesh(new THREE.LatheGeometry([0.05, 0.2, 0.28, 0.25, 0.14, 0.18].map((r, i) => new THREE.Vector2(r, i * 0.12)), 14), urnM); urn.position.y = 1.0; g.add(urn);
    const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.spark, color: new THREE.Color(1.6, 0.35, 0.1), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); fl.position.y = 1.7; fl.scale.set(0.32, 0.55, 1); g.add(fl); const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.spark, color: new THREE.Color(0.6, 2.2, 1.6), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); core.scale.set(0.22, 0.32, 1); fl.add(core); core.position.y = -0.1;
    dyn.add(g); urns.push({ g, fl, urnM, x: u.x, z: u.z, hp: 100, alive: true, hitList: [st, urn, fl] }); }
  solidMeshes = []; levelGroup.traverse(o => { if (o.isMesh && !['glow', 'flame', 'web'].includes(o.name) && !(o.material && o.material.transparent)) solidMeshes.push(o); });
  if (exitDoor) exitDoor.g.traverse(o => { if (o.isMesh && !o.material.transparent) solidMeshes.push(o); });
  for (const sd of secretDoors) sd.shelf.traverse(o => { if (o.isMesh) solidMeshes.push(o); });
  solidMeshes.push(base); ghostHint = false; for (const h of holes.children) h.visible = false; tracer.visible = false;
  if (forMenu) { exitOpen = false; return; }
  // enemies
  const rng = mulberry(n * 3331 + 7);
  G.zSpawns.forEach((s, i) => zombies.push(new Zombie(dyn, s.x, s.z, P, rng, n > 20 && rng() < Math.min(0.3, P.d) ? 3 : i)));
  G.gSpawns.forEach(s => ghosts.push(new Ghost(dyn, s.x, s.z, P, rng)));
  if (P.boss) { boss = new Boss(dyn, G.bossPos.x, G.bossPos.z, P); boss.urnsAlive = urns.length; boss.yaw = Math.PI; }
  // player
  ST = stats(); player.x = G.start.x; player.z = G.start.z; player.yaw = G.start.yaw; player.pitch = 0; player.maxHp = ST.maxHp; player.hp = ST.maxHp; player.stamina = ST.stamina;
  ammo = ST.cap; reloadT = 0; fireT = 0; lanternT = 0; flashOn = true; cluesGot = 0; exitOpen = false; coinsRun = 0; killsRun = 0; secretRun = false; elapsed = 0; ended = false; winT = -1;
  timeLimit = timeLeft = P.time; scareT = 14 + Math.random() * 12; blackoutT = 0; shakeA = 0; dmgFx = 0; flashFx = 0; flowTile = -1; poolT = 0;
  if (P.boss) { $('boss-bar').classList.remove('hidden'); } else $('boss-bar').classList.add('hidden');
  updateObjective(); hudStatic();
  if (G.clues.length === 0 && !P.boss) unlockExit();
}

function unlockExit() { if (exitOpen) return; exitOpen = true; for (const [i, j] of G.exit.tiles) G.grid[j * G.W + i] = 0; sfx.unlock(); exitDoor.sigMat.color.setRGB(1.5, 2.5, 0.6); toast(P.boss ? 'The way out is open… RUN!' : 'The exit door is unsealed!'); updateObjective(); }

// ---------------- UI helpers ----------------
let toastTimer = 0; function toast(t, dur = 2.6) { const el = $('toast'); el.textContent = t; el.classList.add('on'); toastTimer = dur; }
function updateObjective() {
  let t; if (P.boss) t = boss && boss.state !== 'dead' ? (boss.urnsAlive > 0 ? `Shoot the soul urns (${boss.urnsAlive} left) to break his immortality` : 'He is vulnerable — destroy the Master!') : 'Escape through the great door!';
  else t = exitOpen ? 'Reach the exit door before sunrise!' : `Collect the clues to unseal the exit (${cluesGot}/${G.clues.length})`;
  $('h-obj').textContent = t;
}
function hudStatic() { $('h-level').textContent = (P.boss ? '💀 ' : '') + 'NIGHT ' + L + (P.final ? ' — FINAL' : ''); }
const hudCache = {}; const setT = (id, v) => { if (hudCache[id] !== v) { hudCache[id] = v; $(id).textContent = v; } }; const setW = (id, v) => { v = Math.max(0, Math.min(100, v)).toFixed(1) + '%'; if (hudCache[id] !== v) { hudCache[id] = v; $(id).style.width = v; } };
function hud() {
  setW('h-hp', player.hp / player.maxHp * 100); setT('h-hpt', Math.ceil(player.hp) + ''); setW('h-st', player.stamina / ST.stamina * 100); setW('h-ln', (1 - lanternT / ST.lanternCd) * 100);
  const frac = 1 - timeLeft / timeLimit; const mins = Math.floor(frac * 360); const hh = Math.floor(mins / 60), mm = mins % 60; setT('h-clock', `${hh === 0 ? 12 : hh}:${String(mm).padStart(2, '0')} AM`); $('h-clock').parentElement.classList.toggle('late', frac > 0.8);
  setT('h-coins', (save.coins + coinsRun) + ''); setT('h-clues', P.boss ? (boss ? boss.urnsAlive + ' urns' : '—') : `${cluesGot}/${G.clues.length}`);
  setT('h-ammo', reloadT > 0 ? '…' : ammo + ''); $('h-reload').classList.toggle('hidden', reloadT <= 0);
  if (boss) { setW('h-boss', boss.hp / boss.maxHp * 100); setT('h-bshield', boss.urnsAlive > 0 ? `🛡 IMMORTAL — ${boss.urnsAlive} soul urn${boss.urnsAlive > 1 ? 's' : ''} burning` : '⚔ VULNERABLE'); }
  // compass
  const cp = $('compass'); if (save.upg.compass > 0) { let tx = null, tz = null, bd = 1e9; if (!exitOpen) for (const c of clueObjs) { if (c.got) continue; const d = Math.hypot(c.x - player.x, c.z - player.z); if (d < bd) { bd = d; tx = c.x; tz = c.z; } } else { tx = G.exit.x; tz = G.exit.z; }
    if (tx !== null && !P.boss) { cp.classList.remove('hidden'); const a = Math.atan2(tx - player.x, tz - player.z); const rel = -(a - (player.yaw + Math.PI)); cp.style.transform = `rotate(${rel}rad)`; } else cp.classList.add('hidden'); } else cp.classList.add('hidden');
}

// ---------------- combat ----------------
const ray = new THREE.Vector3(), org = new THREE.Vector3();
function wallHit(o, d, maxT = 40) { for (let t = 0.1; t < maxT; t += 0.06) { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; if (y < 0 || y > WALL_H) return t; const i = Math.floor(x), j = Math.floor(z); if (i < 0 || j < 0 || i >= G.W || j >= G.H) return t; const v = G.grid[j * G.W + i]; if (v === 1 || v === 3 || v === 4) return t; if (v === 2 && y < 0.95) return t; } return maxT; }
function raySphere(o, d, s) { const ox = o.x - s.x, oy = o.y - s.y, oz = o.z - s.z; const b = ox * d.x + oy * d.y + oz * d.z, c = ox * ox + oy * oy + oz * oz - s.r * s.r; const h = b * b - c; if (h < 0) return -1; const sq = Math.sqrt(h), t = -b - sq; return t > 0 ? t : (-b + sq > 0 ? 0 : -1); }
// Hit-scan: ray from the camera through the crosshair (screen centre) or, without pointer lock, through the mouse cursor.
// Tests the actual rendered (animated) meshes of enemies, urns, walls, furniture and doors, using the world matrices of the frame the player saw.
const rc = new THREE.Raycaster(); rc.camera = camera; const ndcV = new THREE.Vector2(); let solidMeshes = []; let ghostHint = false;
const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
function castShot(nx, ny) {
  ndcV.set(nx, ny); rc.setFromCamera(ndcV, camera); rc.near = 0.05; rc.far = 70; const o = rc.ray.origin, d = rc.ray.direction;
  const r = { t: 70, point: null, normal: null, ent: null, kind: 'none', head: false };
  for (const h of rc.intersectObjects(solidMeshes, false)) { if (!shown(h.object)) continue; r.t = h.distance; r.point = h.point; r.normal = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(-d.x, -d.y, -d.z); if (r.normal.dot(d) > 0) r.normal.negate(); r.kind = 'world'; break; }
  const test = (list, ent, kind) => { for (const h of rc.intersectObjects(list, false)) { if (h.distance >= r.t) return; if (!shown(h.object)) continue; r.t = h.distance; r.point = h.point; r.normal = null; r.ent = ent; r.kind = kind; r.head = !!h.object.userData.head; return; } };
  for (const z of zombies) { if (z.state === 'dead') continue; if (raySphere(o, d, { x: z.x, y: 1.0 * z.scale, z: z.z, r: 1.5 * z.scale }) < 0) continue; test(z.hitMeshes, z, 'zombie'); }
  // urns first: the boss's shield never blocks shots at his own soul urns (he may stand right next to one)
  for (const u of urns) { if (!u.alive) continue; test(u.hitList, u, 'urn'); }
  if (boss && boss.state !== 'dead' && raySphere(o, d, { x: boss.x, y: 2.3, z: boss.z, r: 3.6 }) >= 0) { if (boss.shielded) { if (r.kind !== 'urn') test([boss.shield], boss, 'shield'); } else test(boss.hitMeshes, boss, 'boss'); }
  if (!r.point) r.point = o.clone().addScaledVector(d, r.t);
  // bullets pass through spirits: tell the player once per night
  if (!ghostHint) for (const g of ghosts) if (g.state !== 'banished' && raySphere(o, d, { x: g.x, y: 1.4, z: g.z, r: 0.6 }) > 0 && raySphere(o, d, { x: g.x, y: 1.4, z: g.z, r: 0.6 }) < r.t) { ghostHint = true; toast('Bullets pass through spirits — use the Spirit Lantern (' + (IS_TOUCH ? '🏮' : 'Q / right-click') + ')!', 3); break; }
  return r;
}
const tmpV = new THREE.Vector3();
function fire(aim) {
  if (reloadT > 0 || fireT > 0) return false; if (ammo <= 0) { sfx.click(); startReload(); return false; }
  ammo--; fireT = ST.fireInt; sfx.shot(); shakeA = Math.max(shakeA, 0.12); gunKick = 1; muzzle.visible = true; muzzle.rotation.z = Math.random() * 6; muzzleT = 0.06; muzzleLight.intensity = 30;
  const a = aim || currentAim(); const r = castShot(a[0], a[1]); const hp = r.point; window.__nh.shotN++; window.__nh.lastShot = { kind: r.kind, head: r.head, x: hp.x, y: hp.y, z: hp.z, t: r.t, ndc: a };
  // tracer from the muzzle to the exact impact point
  muzzle.getWorldPosition(tmpV); const len = tmpV.distanceTo(hp); if (len > 0.3) { tracer.position.copy(tmpV); tracer.lookAt(hp); tracer.scale.set(1, 1, len); tracer.visible = true; tracerT = 0.05; }
  if (r.kind === 'zombie') { const z = r.ent; const killed = z.hit(ST.dmg, r.head); particles.emit(hp.x, hp.y, hp.z, { n: r.head ? 26 : 14, color: [0.5, 0.02, 0.01], speed: 3, up: 1, size: 0.09, life: 0.7, grav: -9 }); sfx.zombieHit(); crossHit(r.head);
    if (killed) { sfx.zombieDie(); killsRun++; coinsRun += r.head ? 5 : 3; if (r.head) toast('HEADSHOT', 0.8); particles.emit(z.x, 1, z.z, { n: 30, color: [0.4, 0.02, 0.01], speed: 2.5, up: 2, size: 0.12, grav: -9 }); } }
  else if (r.kind === 'shield' || r.kind === 'boss') { const res = boss.hit(ST.dmg, r.head); crossHit(r.head && res === 'hit');
    if (res === 'shield' || res === 'none') { particles.emit(hp.x, hp.y, hp.z, { n: 18, color: [2, 0.4, 0.1], speed: 4, size: 0.1, life: 0.4 }); sfx.noise(0.2, { type: 'highpass', f: 2500, g: 0.4 }); if (res === 'shield' && !boss.shieldHint) { boss.shieldHint = true; toast('His shield holds! Shoot the burning soul urns first', 2.4); } }
    else { particles.emit(hp.x, hp.y, hp.z, { n: 20, color: [0.3, 0.0, 0.05], speed: 3, size: 0.12, grav: -6 }); sfx.zombieHit();
      if (!boss.phase2 && boss.hp < boss.maxHp * 0.5) { boss.phase2 = true; sfx.bossRoar(); shakeA = 0.6; if (boss.final) { for (const u of urns) { u.alive = true; u.hp = 140; u.g.visible = true; u.fl.visible = true; u.g.scale.setScalar(1); } boss.urnsAlive = urns.length; toast('"I AM ETERNAL!" — the urns reignite!', 3); } else toast('The Master is enraged!'); updateObjective(); }
      if (res === 'kill') bossDefeated(); } }
  else if (r.kind === 'urn') { const u = r.ent; u.hp -= ST.dmg; crossHit(); u.urnM.emissive.setRGB(1, 0.2, 0); setTimeout(() => u.urnM.emissive.setRGB(0, 0, 0), 80); particles.emit(hp.x, hp.y, hp.z, { n: 12, color: [2, 0.5, 0.1], speed: 3, size: 0.1 });
    if (u.hp <= 0) { u.alive = false; u.fl.visible = false; u.g.visible = false; particles.emit(u.x, 1.3, u.z, { n: 70, color: [2.5, 0.4, 0.1], speed: 5, up: 2, size: 0.2, life: 1.2 }); sfx.boom(); shakeA = 0.4; if (boss) boss.urnsAlive = urns.filter(x => x.alive).length; coinsRun += 10;
      toast(boss && boss.urnsAlive ? `Soul urn shattered! ${boss.urnsAlive} remain` : 'His immortality is broken!'); updateObjective(); } }
  else if (r.kind === 'world') { addHole(hp, r.normal); particles.emit(hp.x + r.normal.x * 0.03, hp.y + r.normal.y * 0.03, hp.z + r.normal.z * 0.03, { n: 8, color: [1.2, 0.8, 0.4], speed: 2, size: 0.05, life: 0.4, grav: -8 }); }
  if (ammo === 0) setTimeout(() => { if (ammo === 0 && state === 'play') startReload(); }, 250);
  return true;
}
// where the shot goes: screen centre (pointer lock / touch) or the mouse cursor when the mouse is free
function currentAim() { if (IS_TOUCH || document.pointerLockElement || !input.hasCur) return [0, 0]; return [input.curX, input.curY]; }
function setCursor(e) { const r = canvas.getBoundingClientRect(); input.curX = ((e.clientX - r.left) / r.width) * 2 - 1; input.curY = -(((e.clientY - r.top) / r.height) * 2 - 1); input.hasCur = true; placeCross(); }
function placeCross() { const c = $('cross'); const a = currentAim(); if (a[0] === 0 && a[1] === 0) { c.style.left = ''; c.style.top = ''; } else { c.style.left = ((a[0] + 1) / 2 * 100) + '%'; c.style.top = ((1 - a[1]) / 2 * 100) + '%'; } }
let gunKick = 0, muzzleT = 0, reloadAnim = 0;
function crossHit(head) { const c = $('cross'); c.classList.add('hit'); c.classList.toggle('head', !!head); setTimeout(() => c.classList.remove('hit', 'head'), 140); }
function startReload() { if (reloadT > 0 || ammo === ST.cap) return; reloadT = ST.reload; sfx.reload(); }
function useLantern() {
  if (lanternT > 0) return; lanternT = ST.lanternCd; sfx.lantern(); blueFx = 1; wave.visible = true; wave.userData.t = 0; wave.position.set(player.x, 1.4, player.z); lanternLight.intensity = 40;
  let n = 0; for (const g of ghosts) if (Math.hypot(g.x - player.x, g.z - player.z) < ST.lanternR && g.banish()) { n++; save.banished++; coinsRun += 5; particles.emit(g.x, 1.6, g.z, { n: 40, color: [0.5, 1.4, 2.2], speed: 3, up: 2, grav: 1, size: 0.18, life: 1.2 }); }
  for (const z of zombies) if (z.state !== 'dead') { const dx = z.x - player.x, dz = z.z - player.z, d = Math.hypot(dx, dz); if (d < ST.lanternR * 0.7) { z.stagger = 1.8; const p = collide(z.x + dx / d * 1.5, z.z + dz / d * 1.5, z.radius); z.root.position.x = p[0]; z.root.position.z = p[1]; z.aggro = true; } }
  if (boss && boss.state === 'fight' && Math.hypot(boss.x - player.x, boss.z - player.z) < ST.lanternR) { boss.atkT = 2.0; boss.orbT += 1.5; }
  for (const o of orbs) if (o.m.position.distanceTo(camera.position) < ST.lanternR) o.life = 0;
  if (n) { sfx.banish(); toast(n > 1 ? `${n} spirits banished!` : 'Spirit banished!', 1.6); }
}
function hurt(d) { if (state !== 'play' || ended) return; player.hp -= d; dmgFx = Math.min(1, dmgFx + 0.5 + d / 60); shakeA = Math.max(shakeA, 0.25 + d / 80); sfx.hurt(); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { } if (player.hp <= 0) { player.hp = 0; gameOver('YOU DIED', P.boss ? 'The Master adds you to his collection.' : 'Your body joins the house. Your soul joins the walls.'); } }
function jumpScare(big) { scareFace.visible = true; scareFaceT = big ? 0.5 : 0.32; flashFx = 0.4; shakeA = Math.max(shakeA, big ? 0.9 : 0.5); sfx.scream(); scareFace.rotation.z = (Math.random() - 0.5) * 0.4; scareFace.scale.setScalar(big ? 1.2 : 0.9); }

function bossDefeated() {
  sfx.boom(); sfx.bossRoar(); shakeA = 1; flashFx = 1; particles.emit(boss.x, 2.5, boss.z, { n: 200, color: [2.5, 0.5, 0.1], speed: 7, up: 2, grav: -1, size: 0.3, life: 1.6 }); coinsRun += 40 + L;
  for (const z of zombies) if (z.state !== 'dead') { z.hit(99999); } for (const g of ghosts) g.banish();
  toast(P.final ? 'The Immortal Master is finally DEAD!' : 'The Master falls… for tonight.', 3.5); const g0 = G; setTimeout(() => { if (G === g0 && !ended) unlockExit(); }, 1800); updateObjective();
}

// ---------------- scares ----------------
function scareEvent() {
  const r = Math.random(); const d = P.d;
  if (r < 0.28) { blackoutT = 2.2 + Math.random() * 1.5; sfx.whisper(); sfx.noise(0.3, { type: 'highpass', f: 5000, g: 0.25 }); toast('…the lights die…', 1.6); }
  else if (r < 0.45 + d * 0.15) { jumpScare(false); }
  else if (r < 0.62) { sfx.slam(); shakeA = Math.max(shakeA, 0.35); blackoutT = 0.4; toast('A door slams somewhere…', 1.8); }
  else if (r < 0.8 && ghosts.length < 3 + P.ghosts) { const bx = player.x - Math.sin(player.yaw + Math.PI) * -3, bz = player.z - Math.cos(player.yaw + Math.PI) * -3; const g = new Ghost(dyn, player.x + Math.sin(player.yaw) * 3.5, player.z + Math.cos(player.yaw) * 3.5, P, Math.random); g.state = 'hunt'; g.cool = 0; ghosts.push(g); sfx.whisper(); toast('Something is behind you…', 1.8); }
  else { sfx.creak(); sfx.whisper(); }
}

// ---------------- state transitions ----------------
const screens = ['s-title', 's-levels', 's-shop', 's-settings', 's-help', 's-pause', 's-over', 's-win', 's-ending', 's-intro'];
function show(id) { for (const s of screens) $(s).classList.toggle('hidden', s !== id); }
let backTo = 's-title';
function goMenu() { state = 'menu'; exitPointer(); $('hud').classList.add('hidden'); $('touch').classList.add('hidden'); gun.visible = false; show('s-title'); refreshTitle(); loadLevel(7, true); menuCam = 0; checkRotate(); }
function refreshTitle() { $('m-cont').textContent = 'Night ' + Math.min(save.unlocked, TOTAL_LEVELS) + ' of 300'; const st = Object.values(save.stars).reduce((a, b) => a + b, 0); $('m-stats').textContent = `★ ${st}/900 · Secrets ${Object.keys(save.secrets).length} · Endings ${save.endings.length}/3 · 🪙 ${save.coins}`; document.querySelectorAll('.coinv').forEach(e => e.textContent = save.coins); }
function startLevel(n) {
  $('toast').classList.remove('on'); toastTimer = 0;
  sfx.init(); sfx.startAmbience(); loadLevel(n); state = 'intro'; save.last = n; persist();
  $('i-num').textContent = (P.boss ? '💀 ' : '') + 'NIGHT ' + n;
  $('i-text').textContent = P.final ? 'The final night. The Immortal Master of the House stands between you and the last sunrise. Break his soul urns — twice — and end him forever.' : P.boss ? `The Grand Hall has appeared. The Immortal Master awaits. He cannot be harmed while ${G.urns.length} soul urns burn.` : `The mansion has rearranged itself. ${G.rooms.length} rooms, ${G.clues.length} clues. Unseal the exit before sunrise.${G.secrets.length ? ' A secret passage hides somewhere…' : ''}`;
  $('i-hint').textContent = IS_TOUCH ? 'Tap to begin' : 'Click to begin';
  show('s-intro'); $('hud').classList.add('hidden');
  camera.position.set(player.x, 1.6, player.z); camera.rotation.set(0, player.yaw, 0);
}
function beginPlay() { state = 'play'; show(null); $('hud').classList.remove('hidden'); if (IS_TOUCH) $('touch').classList.remove('hidden'); gun.visible = true; lockPointer(); sfx.creak(); checkRotate(); clock.getDelta(); }
function pause() { if (state !== 'play') return; state = 'paused'; show('s-pause'); exitPointer(); }
function resume() { state = 'play'; show(null); lockPointer(); clock.getDelta(); }
function gameOver(t, sub) { if (ended) return; ended = true; state = 'over'; exitPointer(); sfx.stinger(); $('o-title').textContent = t; $('o-sub').textContent = sub; save.coins += Math.floor(coinsRun / 2); persist(); setTimeout(() => show('s-over'), 700); $('touch').classList.add('hidden'); }
function levelComplete() {
  if (ended) return; ended = true; state = 'won'; exitPointer(); sfx.victory();
  const frac = timeLeft / timeLimit; const stars = frac > 0.45 ? 3 : frac > 0.2 ? 2 : 1; const reward = 15 + Math.floor(L * 1.2) + (P.boss ? 60 + L : 0);
  const total = reward + coinsRun; save.coins += total; save.kills += killsRun; save.stars[L] = Math.max(save.stars[L] || 0, stars); if (L >= save.unlocked) save.unlocked = Math.min(TOTAL_LEVELS, L + 1); persist();
  $('w-title').textContent = P.boss ? 'THE MASTER IS BANISHED' : 'YOU ESCAPED';
  $('w-stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? '' : 'off'}">★</span>`).join('');
  $('w-stats').innerHTML = `Night ${L} survived with ${Math.ceil(timeLeft)}s before sunrise<br>Zombies destroyed: ${killsRun}${secretRun ? '<br>🗝 Secret passage found!' : ''}<br>Coins earned: <b style="color:#ffcf6a">🪙 ${total}</b>`;
  $('w-next').classList.toggle('hidden', L >= TOTAL_LEVELS); $('touch').classList.add('hidden');
  setTimeout(() => { if (P.final) showEnding(); else show('s-win'); }, 900);
}
function showEnding() {
  const sec = Object.keys(save.secrets).length;
  show('s-ending'); $('e-title').textContent = 'THE LAST SUNRISE'; $('e-num').textContent = '';
  $('e-text').innerHTML = 'The Master\'s ashes drift across the Grand Hall. His ring lies glowing on the throne. Beyond the door, the first true sunrise in a hundred years.<br><br><button class="btn" id="e-a">WALK INTO THE SUNRISE</button> <button class="btn" id="e-b">CLAIM THE RING</button>';
  $('e-ok').classList.add('hidden');
  const fin = (k, title, text) => { if (!save.endings.includes(k)) save.endings.push(k); persist(); $('e-num').textContent = (['dawn', 'guest', 'master'].indexOf(k) + 1) + ' / 3'; $('e-title').textContent = title; $('e-text').textContent = text; $('e-ok').classList.remove('hidden'); sfx.victory(); };
  $('e-a').onclick = () => sec >= 100 ? fin('dawn', 'THE TRUE DAWN', `You uncovered ${sec} secret passages and freed every soul they hid. As you step outside, the mansion sighs, folds in on itself and crumbles to dust. The dead finally sleep. TRUE ENDING.`) : fin('guest', 'THE LAST GUEST', `You walk into the light, the only guest ever to leave. Behind you the mansion still stands… and the rooms are already moving. (Find 100+ secret passages for the True Ending — you have ${sec}.)`);
  $('e-b').onclick = () => fin('master', 'THE NEW MASTER', 'The ring slides onto your finger. The doors close softly. Somewhere a piano begins to play. Tomorrow night, a new guest will arrive — and you will be waiting.');
}

// ---------------- pointer lock ----------------
function lockPointer() { if (IS_TOUCH) return; try { const p = canvas.requestPointerLock && canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { }); } catch (e) { } }
function exitPointer() { if (document.pointerLockElement) try { document.exitPointerLock(); } catch (e) { } }
let lockedOnce = false;
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) lockedOnce = true; else if (state === 'play' && lockedOnce && !ended) pause(); });
document.addEventListener('pointerlockerror', () => { });

// ---------------- input: keyboard/mouse ----------------
addEventListener('keydown', e => {
  keys[e.code] = true; if (state === 'intro' && (e.code === 'Space' || e.code === 'Enter')) beginPlay();
  if (state === 'play') { if (e.code === 'KeyR') startReload(); if (e.code === 'KeyQ') useLantern(); if (e.code === 'KeyF') { flashOn = !flashOn; sfx.click(); } if (e.code === 'KeyE') interact(); if (e.code === 'KeyP' || e.code === 'Escape') pause(); }
  else if (state === 'paused' && (e.code === 'KeyP')) resume();
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { keys[e.code] = false; });
let dragLook = false;
let lastTouchT = -1e9; addEventListener('touchstart', () => { lastTouchT = performance.now(); }, { capture: true, passive: true });
const fromTouch = e => (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) || performance.now() - lastTouchT < 900;
canvas.addEventListener('mousedown', e => { if (state !== 'play' || fromTouch(e)) return; e.preventDefault(); setCursor(e);
  if (e.button === 0) { input.fire = true; input.fireQ = performance.now(); input.qBuf = 0.45; input.qAim = currentAim(); }
  if (e.button === 2) useLantern();
  if (!document.pointerLockElement) { lockPointer(); dragLook = true; } });
addEventListener('mouseup', e => { if (e.button === 0) input.fire = false; dragLook = false; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mousemove', e => { if (state !== 'play' || fromTouch(e)) return; if (document.pointerLockElement || dragLook) { input.lookDX += e.movementX; input.lookDY += e.movementY; } if (!document.pointerLockElement) setCursor(e); });
document.addEventListener('pointerlockchange', () => placeCross());
addEventListener('blur', () => { input.fire = false; dragLook = false; for (const k in keys) keys[k] = false; });
$('s-intro').addEventListener('click', () => { if (state === 'intro') beginPlay(); });

// ---------------- input: touch ----------------
const joy = { id: null, cx: 0, cy: 0 }; const look = { id: null, x: 0, y: 0 };
$('joy').addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; joy.id = t.identifier; const r = $('joy').getBoundingClientRect(); joy.cx = r.left + r.width / 2; joy.cy = r.top + r.height / 2; moveJoy(t); }, { passive: false });
function moveJoy(t) { let dx = t.clientX - joy.cx, dy = t.clientY - joy.cy; const d = Math.hypot(dx, dy), m = 55; if (d > m) { dx = dx / d * m; dy = dy / d * m; } $('joy-k').style.transform = `translate(${dx}px,${dy}px)`; input.mx = dx / m; input.mz = dy / m; input.sprint = input.sprintToggle || d > m * 1.25; }
$('lookpad').addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; look.id = t.identifier; look.x = t.clientX; look.y = t.clientY; }, { passive: false });
addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) moveJoy(t); else if (t.identifier === look.id) { input.lookDX += (t.clientX - look.x) * 1.6; input.lookDY += (t.clientY - look.y) * 1.6; look.x = t.clientX; look.y = t.clientY; } } }, { passive: false });
const endTouch = e => { for (const t of e.changedTouches) { if (t.identifier === joy.id) { joy.id = null; input.mx = input.mz = 0; input.sprint = input.sprintToggle; $('joy-k').style.transform = ''; } if (t.identifier === look.id) look.id = null; } };
addEventListener('touchend', endTouch); addEventListener('touchcancel', endTouch);
const tbtn = (id, down, up) => { const el = $(id); el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('on'); down(); }, { passive: false }); const end = e => { e.preventDefault(); el.classList.remove('on'); up && up(); }; el.addEventListener('touchend', end, { passive: false }); el.addEventListener('touchcancel', end, { passive: false }); };
tbtn('t-fire', () => { input.fire = true; input.fireQ = performance.now(); input.qBuf = 0.45; input.qAim = [0, 0]; }, () => input.fire = false); tbtn('t-reload', startReload); tbtn('t-lantern', useLantern); tbtn('t-use', () => interact());
tbtn('t-sprint', () => { input.sprintToggle = !input.sprintToggle; input.sprint = input.sprintToggle; $('t-sprint').style.background = input.sprintToggle ? '#ff3a2a88' : ''; });
tbtn('t-light', () => { flashOn = !flashOn; sfx.click(); });
function tryFullscreen() { if (!IS_TOUCH) return; try { const el = document.documentElement; if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { }); } catch (e) { } }

// ---------------- interaction ----------------
let promptTarget = null;
function interact() { if (!promptTarget) return; if (promptTarget.type === 'secret') openSecret(promptTarget.sd); }
function openSecret(sd) { if (sd.opening) return; sd.opening = true; sfx.creak(); sfx.noise(1.2, { f: 300, g: 0.4, att: 0.2 }); shakeA = 0.2; secretRun = true; save.secrets[L] = 1; coinsRun += 15; persist(); toast('🗝 Secret passage discovered!'); for (const [i, j] of sd.s.tiles) G.grid[j * G.W + i] = 0; flowTile = -1; }

// ---------------- main loop ----------------
const clock = { last: performance.now(), getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; return d; } }; let T = 0, menuCam = 0; let fpsAcc = 0, fpsN = 0;
function update(dt) {
  T += dt; horror.uniforms.time.value = T;
  // fx decay
  flashFx = Math.max(0, flashFx - dt * 2.5); dmgFx = Math.max(0, dmgFx - dt * 0.9); blueFx = Math.max(0, blueFx - dt * 1.5); shakeA = Math.max(0, shakeA - dt * 1.8);
  horror.uniforms.flash.value = flashFx * 0.9; horror.uniforms.dmg.value = Math.max(dmgFx, player.hp < player.maxHp * 0.3 && state === 'play' ? 0.35 + Math.sin(T * 4) * 0.1 : 0); horror.uniforms.blue.value = blueFx * 0.6;
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
  particles.update(dt);
  if (state === 'menu' || state === 'loading') { menuCam += dt; const r = G.rooms[Math.floor(G.rooms.length / 2)] || G.rooms[0]; const cx = r.rx * S + 5, cz = r.ry * S + 5; camera.position.set(cx + Math.sin(menuCam * 0.12) * 2.2, 1.7 + Math.sin(menuCam * 0.3) * 0.1, cz + Math.cos(menuCam * 0.12) * 2.2); camera.rotation.set(-0.05, menuCam * 0.12 + Math.PI * 0.15, 0); flash.intensity = 0; updateLights(dt, camera.position.x, camera.position.z); updateDust(); return; }
  if (state === 'intro') { updateLights(dt, player.x, player.z); flash.intensity = 10; camera.position.set(player.x, 1.6, player.z); camera.rotation.set(Math.sin(T * 0.5) * 0.03, player.yaw, 0); updateDust(); return; }
  if (state !== 'play') { if (state === 'won' || state === 'over') { updateLights(dt, player.x, player.z); } return; }
  elapsed += dt; timeLeft -= dt;
  if (timeLeft <= 0) { timeLeft = 0; gameOver('SUNRISE', 'The sun rose before you escaped. The house keeps its guests forever.'); return; }
  // weapon first: the shot uses exactly the camera + enemy poses that were on screen when the player clicked
  fireT -= dt; if (reloadT > 0) { reloadT -= dt; if (reloadT <= 0) { ammo = ST.cap; reloadT = 0; } }
  if (input.fireQ || input.fire) { if (fire(input.fireQ ? input.qAim : null) || ammo <= 0) { input.fireQ = 0; input.qAim = null; } else if (input.fireQ) { input.qBuf -= dt; if (input.qBuf <= 0) { input.fireQ = 0; input.qAim = null; } } }
  // look
  const sens = 0.0022 * save.settings.sens; player.yaw -= input.lookDX * sens; player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch - input.lookDY * sens)); input.lookDX = input.lookDY = 0;
  // move
  let mx = input.mx, mz = input.mz; if (keys.KeyW || keys.ArrowUp) mz -= 1; if (keys.KeyS || keys.ArrowDown) mz += 1; if (keys.KeyA || keys.ArrowLeft) mx -= 1; if (keys.KeyD || keys.ArrowRight) mx += 1;
  const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const sprint = (keys.ShiftLeft || keys.ShiftRight || input.sprint) && ml > 0.1 && player.stamina > 0.1;
  player.stamina = Math.max(0, Math.min(ST.stamina, player.stamina + (sprint ? -dt : dt * 0.7)));
  const sp = ST.speed * (sprint ? 1.6 : 1) * (reloadT > 0 ? 0.85 : 1); const sy = Math.sin(player.yaw), cy = Math.cos(player.yaw);
  const vx = (mx * cy + mz * sy) * sp * dt, vz = (-mx * sy + mz * cy) * sp * dt;
  const np = collide(player.x + vx, player.z + vz, 0.3); const moved = Math.hypot(np[0] - player.x, np[1] - player.z); player.x = np[0]; player.z = np[1];
  if (moved > 0.001) { player.bob += moved * 3.2; stepT -= moved; if (stepT < 0) { stepT = sprint ? 0.85 : 0.75; sfx.step(sprint); } }
  // camera
  const bobY = Math.sin(player.bob * 2) * 0.045, bobX = Math.cos(player.bob) * 0.03; const sh = shakeA * shakeA;
  camera.position.set(player.x + bobX * cy + (Math.random() - .5) * sh * 0.3, 1.6 + bobY + (Math.random() - .5) * sh * 0.3, player.z - bobX * sy);
  camera.rotation.set(player.pitch + (Math.random() - .5) * sh * 0.08, player.yaw + (Math.random() - .5) * sh * 0.08, (Math.random() - .5) * sh * 0.05);
  // weapon
  tracerT -= dt; if (tracerT <= 0) tracer.visible = false;
  gunKick = Math.max(0, gunKick - dt * 7); muzzleT -= dt; if (muzzleT <= 0) { muzzle.visible = false; muzzleLight.intensity = 0; }
  reloadAnim += ((reloadT > 0 ? 1 : 0) - reloadAnim) * Math.min(1, dt * 10);
  gun.position.set(GUN_REST.x + Math.cos(player.bob) * 0.012, GUN_REST.y + Math.abs(Math.sin(player.bob)) * 0.012 - reloadAnim * 0.15, GUN_REST.z + gunKick * 0.07); gun.rotation.set(gunKick * 0.35 + reloadAnim * 0.6, 0, reloadAnim * 0.9);
  lanternT = Math.max(0, lanternT - dt); lanternLight.intensity *= Math.exp(-dt * 3);
  if (wave.visible) { wave.userData.t += dt; const k = wave.userData.t / 0.7; wave.scale.setScalar(0.5 + k * ST.lanternR); wave.material.opacity = Math.max(0, 0.5 * (1 - k)); if (k >= 1) wave.visible = false; }
  // flow field
  const pt = Math.floor(player.z) * G.W + Math.floor(player.x); if (pt !== flowTile) { flowTile = pt; computeFlow(); }
  // enemies
  let nearest = 99;
  for (let i = zombies.length - 1; i >= 0; i--) { const z = zombies[i]; if (z.update(dt, T, game)) { z.dispose(dyn); zombies.splice(i, 1); continue; } if (z.state !== 'dead') nearest = Math.min(nearest, Math.hypot(z.x - player.x, z.z - player.z)); }
  for (let i = ghosts.length - 1; i >= 0; i--) { const g = ghosts[i]; if (g.update(dt, T, game)) { g.dispose(dyn); ghosts.splice(i, 1); continue; } if (g.state === 'hunt') nearest = Math.min(nearest, Math.hypot(g.x - player.x, g.z - player.z)); }
  if (boss) { if (boss.update(dt, T, game)) { boss.dispose(dyn); boss = null; } else if (boss.state !== 'dead') nearest = Math.min(nearest, Math.hypot(boss.x - player.x, boss.z - player.z) - 2); }
  // orbs
  for (let i = orbs.length - 1; i >= 0; i--) { const o = orbs[i]; o.life -= dt; const tx = player.x - o.m.position.x, tz = player.z - o.m.position.z, ty = 1.4 - o.m.position.y; const dd = Math.hypot(tx, ty, tz); o.v.x += tx / dd * dt * 3; o.v.z += tz / dd * dt * 3; o.v.y += ty / dd * dt * 3; o.v.setLength(7 + P.d * 4);
    o.m.position.addScaledVector(o.v, dt); if (Math.random() < 0.7) particles.emit(o.m.position.x, o.m.position.y, o.m.position.z, { n: 1, color: [1.5, 0.2, 0.05], speed: 0.3, grav: 0, size: 0.25, life: 0.4 });
    const hitP = dd < 0.6; const i0 = Math.floor(o.m.position.x), j0 = Math.floor(o.m.position.z); const wall = solidAt(i0, j0) && G.grid[j0 * G.W + i0] !== 2;
    if (hitP || wall || o.life <= 0) { particles.emit(o.m.position.x, o.m.position.y, o.m.position.z, { n: 25, color: [2, 0.3, 0.1], speed: 3, size: 0.18, grav: 0, life: 0.5 }); if (hitP) hurt(14 + P.d * 14); dyn.remove(o.m); o.m.geometry.dispose(); orbs.splice(i, 1); } }
  // pickups
  for (const c of clueObjs) { if (c.got) continue; c.g.rotation.y += dt * 1.5; c.g.position.y = 1.0 + Math.sin(T * 2 + c.ph) * 0.1; if (Math.random() < dt * 6) particles.emit(c.x, 1.0, c.z, { n: 1, color: [0.6, 1.2, 1.6], speed: 0.4, up: 0.5, grav: 0.2, size: 0.08, life: 1.2 });
    if (Math.hypot(c.x - player.x, c.z - player.z) < 1.0) { c.got = true; c.g.visible = false; cluesGot++; sfx.pickup(); coinsRun += 5; particles.emit(c.x, 1, c.z, { n: 40, color: [0.6, 1.4, 2], speed: 3, up: 1, grav: 0, size: 0.12 }); toast(LORE[(L * 3 + cluesGot) % LORE.length], 3.2); if (cluesGot >= G.clues.length) { const g0 = G; setTimeout(() => { if (G === g0 && !ended) unlockExit(); }, 900); } updateObjective(); } }
  for (const p of pickups) { if (p.got) continue; p.m.rotation.y += dt * 2.5; if (Math.hypot(p.x - player.x, p.z - player.z) < 0.8) { if (p.type === 'med' && player.hp >= player.maxHp) continue; p.got = true; p.m.visible = false; if (p.type === 'coin') { coinsRun += p.v; sfx.coin(); } else { player.hp = Math.min(player.maxHp, player.hp + 35); sfx.pickup(); toast('+35 health', 1.2); } } }
  if (chest && !chest.got && Math.hypot(chest.x - player.x, chest.z - player.z) < 1.3) { chest.got = true; const v = 30 + L; coinsRun += v; sfx.victory(); toast(`Treasure! +${v} coins`); particles.emit(chest.x, 0.8, chest.z, { n: 60, color: [2, 1.5, 0.4], speed: 3, up: 3, size: 0.12 }); chest.g.children[1].rotation.x = -1.2; }
  // secret doors
  promptTarget = null; let promptText = '';
  for (const sd of secretDoors) { if (sd.opening) { sd.open = Math.min(1, sd.open + dt / 1.4); const off = sd.open * 2.0; if (sd.s.axis === 'x') sd.shelf.position.x = off; else sd.shelf.position.z = off; continue; }
    const d = Math.hypot(sd.cx - player.x, sd.cz - player.z); if (save.upg.compass >= 2) sd.mat.emissive.setRGB(0.15 + Math.sin(T * 3) * 0.1, 0.1 + Math.sin(T * 3) * 0.08, 0.02);
    if (d < 2.3) { const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw); const dot = ((sd.cx - player.x) * fx + (sd.cz - player.z) * fz) / (d || 1); if (dot > 0.5) { promptTarget = { type: 'secret', sd }; promptText = (IS_TOUCH ? '✋ ' : 'E — ') + 'Pull the strange book'; } } }
  const pe = $('prompt'); if (promptText) { pe.textContent = promptText; pe.classList.remove('hidden'); } else pe.classList.add('hidden');
  // exit door
  if (exitDoor) { exitDoor.open += ((exitOpen ? 1 : 0) - exitDoor.open) * Math.min(1, dt * 1.2); for (const [h, s] of exitDoor.leaves) h.rotation.y = s * exitDoor.open * 1.6; exitDoor.light.intensity = exitDoor.open * 12; exitDoor.sigMat.opacity = 0.7 + Math.sin(T * 4) * 0.3; }
  if (exitOpen && Math.hypot(G.exit.x - player.x, G.exit.z - player.z) < 1.25) levelComplete();
  // scares
  if (!P.boss) { scareT -= dt; if (scareT < 0) { scareT = (32 - P.d * 14) * (0.6 + Math.random() * 0.8); scareEvent(); } }
  for (const u of urns) if (u.alive) { const k = 0.85 + Math.sin(T * 13 + u.x) * 0.1 + Math.random() * 0.08; u.fl.scale.set(0.32 * k, 0.55 * k * (1 + Math.sin(T * 7 + u.z) * 0.12), 1); if (Math.random() < dt * 6) particles.emit(u.x, 2.0, u.z, { n: 1, color: [2.2, 0.5, 0.15], up: 1.2, grav: -0.5, size: 0.12, life: 1 }); }
  if (scareFaceT > 0) { scareFaceT -= dt; scareFace.position.z = -0.55 + scareFaceT * 0.3; if (scareFaceT <= 0) scareFace.visible = false; }
  blackoutT = Math.max(0, blackoutT - dt);
  // heartbeat
  const danger = Math.max(nearest < 6 ? 1 - nearest / 6 : 0, player.hp < player.maxHp * 0.3 ? 0.6 : 0, timeLeft / timeLimit < 0.15 ? 0.5 : 0);
  heartT -= dt; if (danger > 0 && heartT <= 0) { heartT = 1.1 - danger * 0.55; sfx.heartbeat(0.5 + danger); }
  sfx.ambienceLevel(0.45 + danger * 0.3);
  // flashlight
  const flick = blackoutT > 0 ? (Math.random() < 0.15 ? 1 : 0) : (Math.random() < 0.004 ? 0.3 : 1);
  flash.intensity = flashOn ? 11 * flick : 0;
  updateLights(dt, player.x, player.z); updateDust(); hud();
}
function updateLights(dt, px, pz) {
  if (!G) return; poolT -= dt;
  if (poolT <= 0) { poolT = 0.25; const ls = G.lights.map(l => [l, (l.x - px) ** 2 + (l.z - pz) ** 2]).sort((a, b) => a[1] - b[1]).slice(0, pool.length).map(a => a[0]);
    for (const pl of pool) if (pl.userData.src && !ls.includes(pl.userData.src)) pl.userData.src = null;
    for (const l of ls) { if (pool.some(p => p.userData.src === l)) continue; const free = pool.find(p => !p.userData.src); if (free) { free.userData.src = l; free.userData.fade = 0; free.position.set(l.x, l.y, l.z); free.color.setHex(l.c); free.distance = l.D * 1.6; } } }
  const out = blackoutT > 0 ? 0.02 : 1;
  for (let i = 0; i < pool.length; i++) { const pl = pool[i], l = pl.userData.src; if (!l) { pl.intensity = Math.max(0, pl.intensity - dt * 30); continue; } pl.userData.fade = Math.min(1, pl.userData.fade + dt * 3);
    const n = l.kind === 'chandelier' ? 0.9 + Math.sin(T * 9 + i) * 0.04 + Math.sin(T * 23 + i * 3) * 0.04 : 0.75 + Math.sin(T * 11 + i * 2) * 0.12 + Math.sin(T * 27 + i) * 0.1 + (Math.random() - .5) * 0.08;
    const glitch = (l.kind === 'chandelier' && Math.sin(T * 0.7 + i * 5) > 0.985) ? 0.15 : 1;
    pl.intensity = l.I * 4.5 * n * pl.userData.fade * out * glitch; }
}
function updateDust() { dust.position.set(Math.floor(camera.position.x / 16) * 16, 0, Math.floor(camera.position.z / 16) * 16); const a = dust.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) + 0.003 * Math.sin(T + i); if (y < 0) y += WALL_H; if (y > WALL_H) y -= WALL_H; a.setY(i, y); } a.needsUpdate = true; }

function loop() {
  requestAnimationFrame(loop); const dt = Math.min(0.05, clock.getDelta());
  if (state === 'play' && rotateShown()) { composer.render(0); return; } // frozen while asking to rotate: enemies can't hurt you behind the overlay
  try { update(dt); } catch (e) { console.error(e); }
  composer.render(dt);
  if (save.settings.fps) { fpsAcc += dt; fpsN++; if (fpsAcc > 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' fps'; fpsAcc = 0; fpsN = 0; } }
}

// ---------------- menus ----------------
let page = 0;
function renderLevels() {
  const g = $('lv-grid'); g.innerHTML = ''; const s0 = page * 30 + 1; $('pg-label').textContent = `Nights ${s0}–${s0 + 29}`;
  for (let n = s0; n < s0 + 30; n++) { const b = document.createElement('button'); const locked = n > save.unlocked; const st = save.stars[n] || 0; b.className = 'lv' + (n % 10 === 0 ? ' boss' : '') + (locked ? ' locked' : '') + (n === save.unlocked ? ' cur' : '');
    b.innerHTML = `${n % 10 === 0 ? '💀' : ''}${n}<small>${locked ? '🔒' : '★'.repeat(st) || '·'}</small>`; if (!locked) b.onclick = () => startLevel(n); g.appendChild(b); }
}
function renderShop() {
  const l = $('shop-list'); l.innerHTML = ''; refreshTitle();
  for (const u of UPG) { const lv = save.upg[u.k], max = lv >= u.max, c = upCost(u); const d = document.createElement('div'); d.className = 'shop-item';
    d.innerHTML = `<div class="ic">${u.ic}</div><div class="d"><b>${u.n}</b><span>${u.d}</span><div class="pips">${Array.from({ length: u.max }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>`;
    const b = document.createElement('button'); b.className = 'btn small' + (max || save.coins < c ? '' : ' primary'); b.textContent = max ? 'MAX' : `🪙 ${c}`; b.disabled = max;
    b.onclick = () => { if (max) return; if (save.coins < c) { b.textContent = 'NEED 🪙' + c; sfx.init(); sfx.click(); return; } save.coins -= c; save.upg[u.k]++; persist(); sfx.init(); sfx.coin(); renderShop(); };
    d.appendChild(b); l.appendChild(d); }
}
function renderSettings() {
  document.querySelectorAll('#set-q button').forEach(b => b.classList.toggle('on', b.dataset.v === save.settings.q));
  document.querySelectorAll('#set-fps button').forEach(b => b.classList.toggle('on', +b.dataset.v === save.settings.fps));
  $('set-sens').value = save.settings.sens; $('set-vol').value = save.settings.vol;
}
document.querySelectorAll('#set-q button').forEach(b => b.onclick = () => { save.settings.q = b.dataset.v; persist(); applyQuality(); renderSettings(); });
document.querySelectorAll('#set-fps button').forEach(b => b.onclick = () => { save.settings.fps = +b.dataset.v; persist(); $('fps').classList.toggle('hidden', !save.settings.fps); renderSettings(); });
$('set-sens').oninput = e => { save.settings.sens = +e.target.value; persist(); };
$('set-vol').oninput = e => { save.settings.vol = +e.target.value; sfx.setVolume(save.settings.vol); persist(); };
$('set-reset').onclick = () => { if (confirm('Reset ALL progress, coins and upgrades?')) { const s = save.settings; save = defSave(); save.settings = s; persist(); refreshTitle(); renderSettings(); } };
const open = (id, from) => { backTo = from; show(id); if (id === 's-levels') { page = Math.floor((Math.min(save.unlocked, 300) - 1) / 30); renderLevels(); } if (id === 's-shop') renderShop(); if (id === 's-settings') renderSettings(); };
document.querySelectorAll('[data-back]').forEach(b => b.onclick = () => { sfx.init(); show(backTo); if (backTo === 's-title') refreshTitle(); });
$('m-play').onclick = () => { tryFullscreen(); startLevel(Math.min(save.unlocked, TOTAL_LEVELS)); };
$('m-levels').onclick = () => { sfx.init(); open('s-levels', 's-title'); }; $('m-shop').onclick = () => { sfx.init(); open('s-shop', 's-title'); }; $('m-settings').onclick = () => open('s-settings', 's-title'); $('m-help').onclick = () => open('s-help', 's-title');
$('pg-prev').onclick = () => { page = (page + 9) % 10; renderLevels(); }; $('pg-next').onclick = () => { page = (page + 1) % 10; renderLevels(); };
$('b-pause').onclick = () => pause(); $('b-pause').addEventListener('touchstart', e => { e.preventDefault(); pause(); }, { passive: false });
$('p-resume').onclick = resume; $('p-restart').onclick = () => startLevel(L); $('p-settings').onclick = () => open('s-settings', 's-pause'); $('p-quit').onclick = goMenu;
$('o-retry').onclick = () => startLevel(L); $('o-shop').onclick = () => open('s-shop', 's-over'); $('o-menu').onclick = goMenu;
$('w-next').onclick = () => startLevel(Math.min(TOTAL_LEVELS, L + 1)); $('w-shop').onclick = () => open('s-shop', 's-win'); $('w-menu').onclick = goMenu;
$('e-ok').onclick = goMenu;
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------------- boot ----------------
applyQuality(); $('fps').classList.toggle('hidden', !save.settings.fps);
goMenu(); $('loading').classList.add('hidden'); loop();

// test / automation hooks
window.__nh = { audioState: () => sfx.ctx ? sfx.ctx.state : 'none', setTime: t => { timeLeft = t; }, get timeLeft() { return timeLeft; }, get exitOpen() { return exitOpen; }, get cluesGot() { return cluesGot; }, get secretDoors() { return secretDoors; }, interact, get promptTarget() { return promptTarget; }, lastShot: null, shotN: 0, castShot, get ammo() { return ammo; }, get fireT() { return fireT; }, startLevel, beginPlay, get state() { return state; }, get player() { return player; }, get G() { return G; }, get zombies() { return zombies; }, get ghosts() { return ghosts; }, get boss() { return boss; }, get urns() { return urns; }, save: () => save, unlockExit, levelComplete, jumpScare, fire, useLantern, input, renderer, scene, camera, setQuality: q => { save.settings.q = q; applyQuality(); }, levelParams, generate, collectAll: () => { for (const c of clueObjs) { c.got = true; c.g.visible = false; } cluesGot = clueObjs.length; unlockExit(); } };
