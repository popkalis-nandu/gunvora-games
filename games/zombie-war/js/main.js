// ZOMBIE WAR: LAST CITY – GUNVORA GAMES
import * as THREE from 'three';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Gfx, ScreenFX, Particles, SFX, Input, Save, isTouch, rand, randi, clamp, canvasTex, $, show, hideScreens, toast } from './core.js';
import { City } from './city.js';
import { Zombie, Commander, Survivor, Pickup, Gib, ENT } from './entities.js';
import { WEAPONS, ORDER, Viewmodel } from './weapons.js';

const MAX_LEVEL = 250, KEY = 'gunvora_zombiewar_v1';
const DEF = { unlocked: 1, done: {}, coins: 0, up: { smg: 0, shotgun: 0, rifle: 0, dmg: 0, mag: 0, ammo: 0, armor: 0, nades: 0, speed: 0, scav: 0 }, quality: isTouch ? 'low' : 'high', sens: 1, vol: 0.8, assist: true };
let save = Save.load(KEY, DEF); save.up = Object.assign({}, DEF.up, save.up);
const persist = () => Save.save(KEY, save);
const upg = k => save.up[k] || 0;

/* ---------- level parameters ---------- */
export function levelParams(L) {
  const t = (L - 1) / (MAX_LEVEL - 1), boss = L % 10 === 0, final = L === MAX_LEVEL;
  const types = ['waves', 'rescue', 'waves', 'survive'];
  const P = {
    L, t, boss, final, night: L % 3 === 0 || final, mission: boss ? 'boss' : types[L % 4],
    H: 24 + Math.min(8, Math.floor(L / 30)), layout: boss ? 'plaza' : ['cross', 'avenue', 'cross', 'plaza'][(L * 7) % 4],
    hpMul: 1 + t * 2.4, dmgMul: 1 + t * 1.4, speedMul: 1 + t * 0.35,
    waves: 2 + Math.floor(t * 4.5), perWave: w => Math.min(60, Math.round(7 + L * 0.16 + w * 2.5)),
    maxAlive: Math.min(save.quality === 'high' ? 24 : 16, 7 + Math.floor(L / 9)), interval: Math.max(0.55, 2.4 - t * 1.9),
    surviveT: Math.round(60 + Math.min(120, L * 0.6)), survivors: Math.min(5, 2 + Math.floor(L / 60)),
    crates: Math.max(2, 5 - Math.floor(t * 3)), dropChance: 0.16 - t * 0.07, bossHp: final ? 32000 : 2600 + L * 75,
    w: { walker: 10, runner: L >= 3 ? 2 + t * 10 : 0, exploder: L >= 6 ? 1 + t * 3 : 0, brute: L >= 11 ? 0.6 + t * 3 : 0 },
  };
  return P;
}

/* ---------- engine ---------- */
const canvas = $('#c');
const gfx = new Gfx(canvas, save.quality);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x5a3238, 0.017);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 420); camera.rotation.order = 'YXZ'; scene.add(camera);
const vm = new Viewmodel();
const vmPass = new RenderPass(vm.scene, vm.cam); vmPass.clear = false; vmPass.clearDepth = true;
const envTex = new THREE.PMREMGenerator(gfx.renderer).fromScene(new RoomEnvironment(), 0.04).texture;
vm.scene.environment = envTex; vm.scene.environmentIntensity = 0.55; scene.environment = envTex; scene.environmentIntensity = 0.15;
const bossL = new THREE.PointLight(0xff5a30, 0, 20, 1.4); scene.add(bossL);
const sfx = new SFX(); sfx.setVolume(save.vol);
const input = new Input(canvas); input.sens = save.sens; input.touchLook = save.sens;
let screen;
const fx = new Particles(scene, 2600, true), smoke = new Particles(scene, 700, false), blood = new Particles(scene, 1000, false);
// gun flashlight (night) + muzzle light + explosion light: constant light count
const flash = new THREE.SpotLight(0xfff4e0, 0, 38, 0.42, 0.55, 1.2); flash.position.set(0.15, -0.1, -0.3); camera.add(flash); const flashT = new THREE.Object3D(); flashT.position.set(0.05, -0.1, -6); camera.add(flashT); flash.target = flashT;
const muzL = new THREE.PointLight(0xffb060, 0, 12, 1.6); scene.add(muzL);
const boomL = new THREE.PointLight(0xff8a30, 0, 26, 1.4); scene.add(boomL);
function applyQuality() {
  gfx.setQuality(save.quality); gfx.setup(scene, camera); gfx.composer.insertPass(vmPass, 1);
  gfx.grade.uniforms.uTint.value.set(1.04, 1.0, 0.94); gfx.grade.uniforms.uVignette.value = 1.0; gfx.grade.uniforms.uDesat.value = 0.12; gfx.grade.uniforms.uGrain.value = 0.028;
  ENT.shadows = save.quality === 'high'; if (city) city.sun.castShadow = save.quality === 'high';
  screen = screen || new ScreenFX(gfx);
}
/* decals: blood pools & scorch marks (instanced) */
function decalTex(kind) { return canvasTex(128, 128, (x, w, h) => { const c = kind === 'blood' ? '90,0,0' : '8,6,4'; for (let i = 0; i < (kind === 'blood' ? 14 : 20); i++) { const r = rand(10, 34), px = 64 + rand(-30, 30) * (i ? 1 : 0), py = 64 + rand(-30, 30) * (i ? 1 : 0); const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${c},${kind === 'blood' ? 0.95 : 0.8})`); g.addColorStop(0.7, `rgba(${c},${kind === 'blood' ? 0.8 : 0.4})`); g.addColorStop(1, `rgba(${c},0)`); x.fillStyle = g; x.fillRect(0, 0, w, h); } }); }
const decals = {};
for (const [k, n] of [['blood', 48], ['scorch', 16]]) {
  const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: decalTex(k), transparent: true, depthWrite: false, roughness: k === 'blood' ? 0.25 : 1, metalness: k === 'blood' ? 0.2 : 0, polygonOffset: true, polygonOffsetFactor: -4 }), n);
  const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < n; i++) m.setMatrixAt(i, z); m.frustumCulled = false; m.renderOrder = 2; scene.add(m); decals[k] = { m, i: 0, n, grow: [] };
}
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s3 = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
function decal(k, p, size) { const d = decals[k], i = d.i; d.i = (i + 1) % d.n; d.grow.push({ i, p: new THREE.Vector3(p.x, 0.02 + i * 0.0004, p.z), size, t: 0, rot: rand(0, 6.28) }); if (d.grow.length > 12) d.grow.shift(); }
function updateDecals(dt) { for (const k in decals) { const d = decals[k]; for (const g of d.grow) { g.t = Math.min(1, g.t + dt * (k === 'blood' ? 0.6 : 6)); _q.setFromAxisAngle(_up, g.rot); const s = g.size * (0.3 + 0.7 * g.t); _m4.compose(g.p, _q, _s3.set(s, 1, s)); d.m.setMatrixAt(g.i, _m4); } if (d.grow.length) d.m.instanceMatrix.needsUpdate = true; d.grow = d.grow.filter(g => g.t < 1); } }
function clearDecals() { for (const k in decals) { const d = decals[k], z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < d.n; i++) d.m.setMatrixAt(i, z); d.m.instanceMatrix.needsUpdate = true; d.grow = []; } }
/* tracers & shock rings */
const tracerGeo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true).rotateX(Math.PI / 2);
const tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.2, 1.0), transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const tracers = []; for (let i = 0; i < 28; i++) { const m = new THREE.Mesh(tracerGeo, tracerMat); m.visible = false; m.frustumCulled = false; scene.add(m); tracers.push({ m, life: 0 }); } let trI = 0;
function tracer(a, b) { const t = tracers[trI]; trI = (trI + 1) % tracers.length; const len = a.distanceTo(b); if (len < 0.5) return; const s = Math.min(len, rand(3, 7)), k = rand(0.15, 0.6); const st = a.clone().lerp(b, k * (1 - s / len)); const en = st.clone().add(b.clone().sub(a).normalize().multiplyScalar(s)); t.m.position.copy(st).add(en).multiplyScalar(0.5); t.m.lookAt(en); t.m.scale.set(0.012, 0.012, s); t.m.visible = true; t.life = 0.05; }
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.3, 0.6), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
const rings = []; for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2), ringMat.clone()); m.visible = false; scene.add(m); rings.push({ m, t: 1, r: 1 }); }
function shock(p, r, color = 0xffa040) { const g = rings.find(x => x.t >= 1) || rings[0]; g.t = 0; g.r = r; g.m.position.set(p.x, 0.15, p.z); g.m.material.color.set(color).multiplyScalar(2); g.m.visible = true; }

/* ---------- state ---------- */
let state = 'title', city = null, P = null;
let zombies = [], pickups = [], survivors = [], gibs = [], nades = [], rocks = [], barrelMeshes = [], boss = null, pending = [];
const player = { x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, st: 1, vx: 0, vz: 0, bob: 0, stepD: 0, speed: 4.4, run: false, wpn: 'pistol', last: 'pistol', ammo: {}, nades: 2, cd: 0, reload: 0, kick: 0, kickY: 0, ads: 0, dmgDirT: 0 };
const cur = { L: 1, kills: 0, heads: 0, coins: 0, time: 0, done: false, shots: 0, hits: 0, rescued: 0, combo: 0, comboT: 0, supplyT: 50 };
const mis = { type: 'waves', wave: 1, toSpawn: 0, breakT: 0, timer: 0, spawnT: 1, winT: -1 };
applyQuality();
const owned = () => ORDER.filter(k => k === 'pistol' || upg(k) > 0);
const wstat = k => { const w = WEAPONS[k]; return { ...w, dmg: w.dmg * (1 + upg('dmg') * 0.15), mag: Math.round(w.mag * (1 + upg('mag') * 0.15)), reserve: w.reserve * (1 + upg('ammo') * 0.25), reload: w.reload * (1 - upg('mag') * 0.07) }; };

/* ---------- level setup ---------- */
function clearLevel() {
  zombies.forEach(z => z.remove()); pickups.forEach(p => p.remove()); survivors.forEach(s => s.remove()); gibs.forEach(g => g.remove()); nades.forEach(n => scene.remove(n.m)); rocks.forEach(r => scene.remove(r.m)); barrelMeshes.forEach(m => scene.remove(m));
  if (boss) boss.remove(); zombies = []; pickups = []; survivors = []; gibs = []; nades = []; rocks = []; barrelMeshes = []; boss = null; pending = [];
  if (city) city.dispose(); city = null; fx.clear(); smoke.clear(); blood.clear(); clearDecals();
}
const barrelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.92, 16);
let barrelMat = null;
function buildLevel(L, demo = false) {
  clearLevel(); P = levelParams(L); city = new City(scene, L, P, save.quality, fx, smoke);
  if (!barrelMat) barrelMat = new THREE.MeshStandardMaterial({ map: city.tex.barrel, roughness: 0.45, metalness: 0.5 });
  for (const b of city.barrels) { const m = new THREE.Mesh(barrelGeo, barrelMat); m.position.set(b.x, 0.46, b.z); m.rotation.y = rand(0, 6); m.castShadow = ENT.shadows; scene.add(m); b.m = m; barrelMeshes.push(m); }
  vm.hemi.intensity = P.night ? 1.3 : 2.2; vm.key.intensity = P.night ? 1.6 : 2.8; gfx.renderer.toneMappingExposure = P.night ? 1.3 : 1.2; scene.environmentIntensity = P.night ? 0.1 : 0.18; vm.key.color.set(P.night ? 0xbfd0ff : 0xffc890);
  flash.intensity = P.night ? 55 : 0; flash.castShadow = false;
  const s = city.start; player.x = s.x; player.z = s.z; player.yaw = P.mission === 'boss' ? 0 : rand(-3, 3); player.pitch = 0;
  player.maxHp = 100 + upg('armor') * 20; player.hp = player.maxHp; player.st = 1; player.speed = 4.4 * (1 + upg('speed') * 0.05); player.vx = player.vz = 0; player.run = false; player.nades = 2 + upg('nades'); player.cd = 0; player.reload = 0;
  for (const k of ORDER) { const w = wstat(k); player.ammo[k] = { mag: w.mag, res: k === 'pistol' ? Infinity : Math.round(w.reserve * 0.6) }; }
  player.wpn = owned().slice(-1)[0]; player.last = 'pistol'; vm.show(player.wpn); vm.reloadT = 0; vm.switchT = 0;
  Object.assign(cur, { L, kills: 0, heads: 0, coins: 0, time: 0, done: false, shots: 0, hits: 0, rescued: 0, combo: 0, comboT: 0, supplyT: rand(40, 60) });
  // pickups
  for (let i = 0; i < P.crates; i++) pickups.push(new Pickup(scene, 'ammo', city.randomSpot(6, s)));
  for (let i = 0; i < 2; i++) pickups.push(new Pickup(scene, 'med', city.randomSpot(8, s)));
  pickups.push(new Pickup(scene, 'nade', city.randomSpot(8, s)));
  for (let i = 0; i < 10; i++) pickups.push(new Pickup(scene, 'coin', city.randomSpot(4, s)));
  Object.assign(mis, { type: P.mission, wave: 1, toSpawn: P.perWave(1), breakT: 0, timer: P.surviveT, spawnT: demo ? 0 : 2.5, winT: -1 });
  if (P.mission === 'rescue') for (let i = 0; i < P.survivors; i++) survivors.push(new Survivor(scene, city.randomSpot(12, s)));
  if (P.mission === 'boss') mis.bossT = 2.5;
  city.updateFlow(player.x, player.z); flowT = 0;
}

/* ---------- flow ---------- */
let drone = null, flowT = 0, titleT = 0;
function startLevel(L) {
  sfx.init(); buildLevel(L); state = 'playing'; hideScreens(); $('#hud').classList.add('on'); $('#cross').style.display = 'block';
  input.enabled = true; input.showTouch(true); input.lock();
  if (drone) drone.stop(); drone = sfx.drone({ base: P.night ? 36 : 44, cut: 300, vol: 0.18, wind: 420, windVol: 0.3 });
  $('#bossBar').style.display = 'none'; $('#bossName').textContent = P.final ? 'GENERAL ROT – THE FINAL MUTATION' : 'THE MUTATED COMMANDER';
  const obj = { waves: `Survive ${P.waves} waves`, survive: `Hold out for ${fmtT(P.surviveT)} until evac`, rescue: `Rescue ${P.survivors} survivors (green beacons)`, boss: 'Kill the giant mutated Commander' }[P.mission];
  toast(`MISSION ${L}${P.night ? ' · NIGHT' : ''}${P.boss ? ' · BOSS' : ''}\n${obj}`, 3200);
  last = performance.now();
}
function endLevel(win) {
  state = win ? 'win' : 'over'; input.enabled = false; input.unlock(); input.showTouch(false); $('#hud').classList.remove('on'); $('#cross').style.display = 'none'; $('#prompt').style.display = 'none';
  if (drone) { drone.stop(); drone = null; }
  const L = cur.L;
  if (win) {
    const first = !save.done[L]; const reward = Math.round((50 + L * 8 + cur.kills * 2 + cur.heads * 2 + cur.rescued * 30 + (P.boss ? 300 + L * 8 : 0)) * (first ? 1 : 0.5) * (1 + upg('scav') * 0.1)) + cur.coins;
    save.coins += reward; save.done[L] = 1; save.unlocked = Math.max(save.unlocked, Math.min(MAX_LEVEL, L + 1)); persist();
    $('#winTitle').textContent = L === MAX_LEVEL ? 'THE CITY IS YOURS AGAIN' : P.boss ? 'Commander Down' : 'Mission Complete';
    $('#winStats').innerHTML = stats([['Mission', L], ['Time', fmtT(cur.time)], ['Kills', cur.kills], ['Headshots', cur.heads], ['Accuracy', cur.shots ? Math.round(cur.hits / cur.shots * 100) + '%' : '–'], ['Survivors rescued', cur.rescued], ['Coins picked up', cur.coins], ['Total reward', `<span class="coins">+${reward}</span>`]]);
    $('#bNext').style.display = L < MAX_LEVEL ? '' : 'none'; sfx.victory(); show('win');
  } else { sfx.defeat(); $('#overStats').innerHTML = stats([['Mission', L], ['Survived', fmtT(cur.time)], ['Kills', cur.kills], ['Headshots', cur.heads]]); show('over'); }
  refreshCoins();
}
const stats = rows => rows.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('');
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function pause() { if (state !== 'playing') return; state = 'paused'; input.enabled = false; input.unlock(); input.showTouch(false); show('pause'); }
function resume() { state = 'playing'; hideScreens(); input.enabled = true; input.showTouch(true); input.lock(); last = performance.now(); }
function toMenu() { state = 'title'; if (drone) { drone.stop(); drone = null; } input.enabled = false; input.unlock(); input.showTouch(false); $('#hud').classList.remove('on'); $('#cross').style.display = 'none'; setupTitle(); show('title'); refreshCoins(); }
input.onPause = pause;

/* ---------- menus ---------- */
function refreshCoins() { $('#tCoins').textContent = `◉ ${save.coins} coins`; $('#shopCoins').textContent = `◉ ${save.coins}`; }
function buildLevels() {
  const g = $('#lvGrid'); g.innerHTML = ''; $('#lvProg').textContent = `${Object.keys(save.done).length} / ${MAX_LEVEL} missions complete`;
  for (let L = 1; L <= MAX_LEVEL; L++) { const b = document.createElement('button'); const bo = L % 10 === 0, n = L % 3 === 0 || L === MAX_LEVEL; b.className = 'lv' + (bo ? ' boss' : '') + (n ? ' night' : '') + (save.done[L] ? ' done' : '') + (L > save.unlocked ? ' locked' : ''); b.innerHTML = `${L}${bo ? '<small>BOSS</small>' : ''}`; if (L <= save.unlocked) b.onclick = () => { sfx.click(); startLevel(L); }; g.appendChild(b); }
}
const SHOP = [
  ['smg', 'MP5 SMG', 'Unlock the full-auto SMG (slot 2). Huge fire rate.', 1, 400],
  ['shotgun', 'M870 Shotgun', 'Unlock the pump shotgun (slot 3). Tears off limbs up close.', 1, 900],
  ['rifle', 'M4 Assault Rifle', 'Unlock the rifle with red-dot sight (slot 4).', 1, 1800],
  ['dmg', 'Firepower', '+15% damage for every gun per level.', 5],
  ['mag', 'Fast Hands', '+15% magazine size and 7% faster reloads.', 5],
  ['ammo', 'Ammo Belt', '+25% reserve ammo and bigger ammo pickups.', 5],
  ['armor', 'Body Armor', '+20 maximum health per level.', 5],
  ['nades', 'Grenade Pouch', 'Start every mission with +1 grenade.', 5],
  ['speed', 'Combat Boots', '+5% move speed and longer sprints.', 5],
  ['scav', 'Scavenger', 'More ammo drops and +10% coin rewards.', 5],
];
const cost = (k, l, max, base) => base || Math.round([150, 300, 550, 900, 1400][l] * (k === 'dmg' ? 1.3 : 1));
function buildShop() {
  refreshCoins(); const s = $('#shopList'); s.innerHTML = '';
  for (const [k, n, d, max, base] of SHOP) { const l = upg(k), done = l >= max, c = cost(k, l, max, base); const el = document.createElement('div'); el.className = 'item'; el.innerHTML = `<h4>${n}</h4><p>${d}</p><div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`; const b = document.createElement('button'); b.className = 'btn small'; b.textContent = done ? (max === 1 ? 'OWNED' : 'MAXED') : `${max === 1 ? 'Unlock' : 'Upgrade'} ◉ ${c}`; b.disabled = done || save.coins < c; b.onclick = () => { if (save.coins >= c && l < max) { save.coins -= c; save.up[k] = l + 1; persist(); sfx.pickup(); buildShop(); } }; el.appendChild(b); s.appendChild(el); }
}
let settingsBack = 'title', shopBack = null;
function buildSettings() { document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('sel', b.dataset.q === save.quality)); $('#sSens').value = save.sens; $('#sVol').value = save.vol; $('#sAssist').textContent = save.assist ? 'On' : 'Off'; }
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { save.quality = b.dataset.q; persist(); applyQuality(); buildSettings(); });
$('#sSens').oninput = e => { save.sens = +e.target.value; input.sens = save.sens; input.touchLook = save.sens; persist(); };
$('#sVol').oninput = e => { save.vol = +e.target.value; sfx.setVolume(save.vol); persist(); };
$('#sAssist').onclick = () => { save.assist = !save.assist; persist(); buildSettings(); };
$('#bReset').onclick = () => { if (confirm('Reset all progress, coins and upgrades?')) { const q = save.quality; save = structuredClone(DEF); save.quality = q; persist(); buildSettings(); refreshCoins(); } };
const go = (id, fn) => { sfx.init(); sfx.click(); fn && fn(); show(id); };
$('#bPlay').onclick = () => { sfx.init(); startLevel(save.unlocked); };
$('#bLevels').onclick = () => go('levels', buildLevels);
$('#bShop').onclick = () => go('shop', buildShop);
$('#bSettings').onclick = () => { settingsBack = 'title'; go('settings', buildSettings); };
$('#bHow').onclick = () => go('howto');
document.querySelectorAll('.back').forEach(b => b.onclick = () => { sfx.click(); show(b.closest('#settings') && settingsBack === 'pause' ? 'pause' : 'title'); });
$('#bResume').onclick = resume; $('#bRestart').onclick = () => startLevel(cur.L); $('#bQuit').onclick = toMenu;
$('#bPSettings').onclick = () => { settingsBack = 'pause'; go('settings', buildSettings); };
$('#bRetry').onclick = () => startLevel(cur.L); $('#bOverMenu').onclick = toMenu;
$('#bOverShop').onclick = () => { shopBack = 'over'; go('shop', buildShop); };
$('#bWinShop').onclick = () => { shopBack = 'win'; go('shop', buildShop); };
$('#bNext').onclick = () => startLevel(Math.min(MAX_LEVEL, cur.L + 1));
$('#bWinLevels').onclick = () => go('levels', buildLevels);
$('#levels .back').onclick = () => { sfx.click(); state === 'win' || state === 'over' ? show(state) : show('title'); };
$('#shop .back').onclick = () => { sfx.click(); show(shopBack && (state === 'win' || state === 'over') ? shopBack : 'title'); shopBack = null; };
addEventListener('keydown', e => { if (e.code === 'KeyP' && state === 'playing') pause(); else if ((e.code === 'KeyP' || e.code === 'Escape') && state === 'paused' && isTouch) resume(); });
addEventListener('wheel', e => { if (state === 'playing') cycleWeapon(e.deltaY > 0 ? 1 : -1); }, { passive: true });

/* ---------- combat helpers ---------- */
const v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), fwd = new THREE.Vector3(), tmpO = new THREE.Vector3();
let hitT = 0, popT = 0;
function hitMark(kill) { const h = $('#hitmark'); h.className = kill ? 'kill' : ''; h.style.opacity = 1; hitT = kill ? 0.25 : 0.12; sfx.click(kill ? 900 : 2400, kill ? 0.25 : 0.12); }
function popup(txt) { const p = $('#popup'); p.textContent = txt; p.style.opacity = 1; popT = 0.9; }
function pickType() { const w = P.w; const tot = Object.values(w).reduce((a, b) => a + b, 0); let r = Math.random() * tot; for (const k in w) { r -= w[k]; if (r <= 0) return k; } return 'walker'; }
function spawnZombie(type, near) {
  type = type || pickType(); let pos, rise = true;
  if (near) { pos = near.clone(); }
  else if (city.exits.length && Math.random() < 0.55) { const e = city.exits[randi(0, city.exits.length - 1)]; const p = e.pts[randi(0, e.pts.length - 1)]; pos = new THREE.Vector3(p[0] + rand(-0.5, 0.5), 0, p[1] + rand(-0.5, 0.5)); rise = false; }
  else { pos = city.randomSpot(11, player, 30); for (let k = 0; k < 6; k++) { fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); const dx = pos.x - player.x, dz = pos.z - player.z; if ((dx * fwd.x + dz * fwd.z) / Math.hypot(dx, dz) < 0.5) break; pos = city.randomSpot(11, player, 30); } }
  const z = new Zombie(scene, type, pos, P, { rise }); zombies.push(z); if (rise) { sfx.groan(0.35, 0.8); } return z;
}
const ctx = {
  player, get world() { return city; }, get zombies() { return zombies; }, fx, blood, sfx, get P() { return P; },
  hurtPlayer(d, from, sh = 0.4, knock = 0) {
    if (state !== 'playing' || cur.done) return; player.hp -= d; screen.hurt(Math.min(1, d / 30)); screen.shake(sh); sfx.hurt(0.7);
    const a = Math.atan2(from.x - player.x, from.z - player.z); const rel = a - Math.atan2(-Math.sin(player.yaw), -Math.cos(player.yaw)); $('#dmgdir').style.transform = `rotate(${-rel}rad)`; $('#dmgdir').style.opacity = 1; player.dmgDirT = 0.8;
    blood.emit(v3.set(player.x, 1.4, player.z), { count: 14, color: 0x8a0000, color2: 0x300000, speed: 2, gravity: 9, life: 0.8, size: 0.05 });
    if (knock) { const dx = player.x - from.x, dz = player.z - from.z, l = Math.hypot(dx, dz) || 1; player.vx += dx / l * knock; player.vz += dz / l * knock; }
    if (player.hp <= 0) { player.hp = 0; cur.done = true; screen.doFlash(0.8, 0x400000); setTimeout(() => endLevel(false), 1100); }
  },
  explode, gib(geo, mat, pos, dir, sx, sy, head) { if (gibs.length > 24) { gibs[0].remove(); gibs.shift(); } gibs.push(new Gib(scene, geo, mat, pos, dir, sx, sy, head)); },
  bloodBurst(p, n) { blood.emit(p, { count: n, color: 0x8a0000, color2: 0x2a0000, speed: 3.5, gravity: 10, life: 1, size: 0.07 }); },
  bloodPool(p, s) { decal('blood', p, s * rand(1.2, 1.8)); },
  dirt(p, k = 1) { smoke.emit(v3.set(p.x, 0.1, p.z), { count: 1, color: 0x3a2e22, color2: 0x5a4a38, speed: 1.2 * k, up: 1.5, life: 1, size: 0.35 * k, grow: 1.5, jitter: 0.6 * k, gravity: 2 }); },
  dust(p, k = 1) { smoke.emit(v3.set(p.x, 0.2, p.z), { count: 6 * k, color: 0x4a4038, color2: 0x6a5a4a, speed: 2 * k, up: 0.5, life: 1.4, size: 0.4 * k, grow: 2, jitter: 0.8, drag: 2 }); },
  shake(a) { screen.shake(a); },
  onKill(z, part, o) {
    if (state !== 'playing') return; cur.kills++; if (part === 'head') { cur.heads++; popup('HEADSHOT'); }
    cur.combo = cur.comboT > 0 ? cur.combo + 1 : 1; cur.comboT = 1.6; if (cur.combo >= 2) popup(['', '', 'DOUBLE KILL', 'TRIPLE KILL', 'MULTI KILL', 'MASSACRE'][Math.min(5, cur.combo)] || 'MASSACRE');
    const p = z.g.position.clone(); const r = Math.random();
    if (r < P.dropChance * (1 + upg('scav') * 0.25)) { const k = new Pickup(scene, 'drop', p); k.g.position.y = 1; k.vel = new THREE.Vector3(rand(-1, 1), 3, rand(-1, 1)); pickups.push(k); }
    else if (r < 0.55) { for (let i = 0; i < Math.ceil(z.T.coin / 4); i++) { const c = new Pickup(scene, 'coin', p); c.value = z.T.coin; c.g.position.y = 1; c.vel = new THREE.Vector3(rand(-1.5, 1.5), 3.5, rand(-1.5, 1.5)); pickups.push(c); } }
    else if (r > 0.975) { const k = new Pickup(scene, 'med', p); pickups.push(k); }
  },
  bossRoar(b, v = 1) { sfx.scream(v, 0.4); sfx.groan(v, 0.35); screen.shake(0.5 * v); if (v >= 1) { toast(P.final ? 'GENERAL ROT HAS RISEN' : 'THE COMMANDER HAS RISEN', 2200); $('#bossBar').style.display = 'block'; } },
  bossSlam(p, r, d) { shock(p, r); fx.emit(v3.set(p.x, 0.3, p.z), { count: 60, color: 0xffa040, color2: 0xff4010, speed: 7, up: 0.6, life: 0.6, size: 0.3 }); for (let i = 0; i < 3; i++) ctx.dust(p, 3); screen.shake(0.8); sfx.explosion(0.6); decal('scorch', p, 4); const dd = Math.hypot(player.x - p.x, player.z - p.z); if (dd < r) ctx.hurtPlayer(d * (1 - dd / r * 0.6), p, 0.6, 6); },
  bossThrow(from, n) { for (let i = 0; i < n; i++) { const tx = player.x + player.vx * 0.9 + rand(-2, 2) * i, tz = player.z + player.vz * 0.9 + rand(-2, 2) * i; const T = 1.15; const v = new THREE.Vector3((tx - from.x) / T, 0, (tz - from.z) / T); v.y = (0 - from.y + 0.5 * 16 * T * T) / T; const m = new THREE.Mesh(rockGeo, rockMat); m.position.copy(from); m.scale.setScalar(rand(0.8, 1.2)); m.castShadow = ENT.shadows; scene.add(m); rocks.push({ m, v, life: 4 }); } sfx.thud(0.7, 50); },
  bossSummon(b, n) { for (let i = 0; i < n; i++) { const a = rand(0, 6.28); const p = new THREE.Vector3(b.x + Math.cos(a) * rand(3, 6), 0, b.z + Math.sin(a) * rand(3, 6)); if (city.walkable(p.x, p.z)) spawnZombie(Math.random() < 0.6 ? 'runner' : 'walker', p); } toast('He calls the horde…', 1500); },
  bossDie(b) { sfx.scream(1, 0.3); screen.shake(1.2); screen.doFlash(0.6, 0xffffff); $('#bossBar').style.display = 'none'; cur.kills++; popup('COMMANDER DOWN'); zombies.forEach(z => { if (z.alive()) z.damage(9999, 'body', v3.set(z.x - b.x, 0, z.z - b.z).normalize(), ctx, { force: 1 }); }); },
  bossFinalBlast(p) { explode(p, 5, 0, null, true); for (let i = 0; i < 30; i++) { const c = new Pickup(scene, 'coin', p); c.value = 10; c.g.position.y = 2; c.vel = new THREE.Vector3(rand(-4, 4), rand(4, 8), rand(-4, 4)); pickups.push(c); } mis.winT = 3.5; },
};
const rockGeo = new THREE.DodecahedronGeometry(0.45, 0); const rockMat = new THREE.MeshStandardMaterial({ color: 0x4a4240, roughness: 0.9, emissive: 0x3a0a00, flatShading: true });
const nadeGeo = new THREE.SphereGeometry(0.07, 12, 8); const nadeMat = new THREE.MeshStandardMaterial({ color: 0x3a4a2a, roughness: 0.6 });
function explode(p, r, dmg, src, big) {
  const pp = new THREE.Vector3(p.x, Math.max(0.4, p.y), p.z);
  fx.emit(pp, { count: big ? 220 : 130, color: 0xff7a1a, color2: 0xffe08a, speed: big ? 11 : 8, up: 0.5, life: 0.7, size: big ? 0.9 : 0.6, drag: 3.5, grow: 1 });
  fx.emit(pp, { count: 50, color: 0xffc060, speed: 16, gravity: 12, life: 0.9, size: 0.06, drag: 0.5, up: 0.4 });
  smoke.emit(pp, { count: big ? 40 : 24, color: 0x1a1614, color2: 0x3a3430, speed: 3, up: 0.9, life: 3, size: big ? 2.2 : 1.4, grow: 2.4, jitter: 1, drag: 1.6 });
  shock(pp, r * 1.2); decal('scorch', pp, r * 0.9); boomL.position.copy(pp).setY(2); boomL.intensity = big ? 260 : 160;
  const dd = Math.hypot(player.x - pp.x, player.z - pp.z); screen.shake(clamp(1.3 - dd / 18, 0.1, 1.1)); sfx.explosion(clamp(1.1 - dd / 50, 0.2, 1));
  if (dd < 6) screen.doFlash(0.35 * (1 - dd / 6), 0xffb060);
  if (!dmg) return;
  if (dd < r && state === 'playing') ctx.hurtPlayer(dmg * (src === 'player' ? 0.45 : 0.8) * (1 - dd / r * 0.7), pp, 0.8, 5);
  for (const z of zombies) { if (!z.alive()) continue; const d = Math.hypot(z.x - pp.x, z.z - pp.z); if (d < r) { const dir = new THREE.Vector3(z.x - pp.x, 0, z.z - pp.z).normalize(); z.damage(dmg * (1.2 - d / r), 'body', dir, ctx, { explosive: true, force: 1.5 }); } }
  if (boss && boss.alive()) { const d = Math.hypot(boss.x - pp.x, boss.z - pp.z); if (d < r + 1.5) boss.damage(dmg * 0.7 * (1.2 - d / (r + 1.5)), 'body', v3, ctx, {}); }
  for (const b of city.barrels) if (b.alive) { const d = Math.hypot(b.x - pp.x, b.z - pp.z); if (d < r) { b.hp = 0; pending.push({ t: 0.12 + d * 0.03, fn: () => blowBarrel(b) }); } }
}
function blowBarrel(b) { if (!b.alive) return; b.alive = false; b.col.on = false; scene.remove(b.m); explode(new THREE.Vector3(b.x, 0.6, b.z), 6.5, 180 * (1 + P.t), 'barrel'); city.fires.push({ x: b.x, y: 0.2, z: b.z, big: 0.5, ttl: 8 }); }

/* ---------- weapons ---------- */
function setWeapon(k) { if (k === player.wpn || !owned().includes(k) || vm.switchT > 0) return; player.last = player.wpn; player.wpn = k; player.reload = 0; vm.reloadT = 0; vm.doSwitch(k); sfx.click(600, 0.2); player.cd = Math.max(player.cd, 0.45); }
function cycleWeapon(d) { const o = owned(); if (o.length < 2) return; setWeapon(o[(o.indexOf(player.wpn) + d + o.length) % o.length]); }
function startReload() { const w = wstat(player.wpn), a = player.ammo[player.wpn]; if (player.reload > 0 || a.mag >= w.mag || a.res <= 0 || vm.switchT > 0) return; player.reload = w.shell ? w.reload : w.reload; vm.reloadT = vm.reloadDur = w.shell ? w.reload : w.reload; sfx.click(500, 0.2); setTimeout(() => sfx.click(900, 0.15), w.reload * 400); }
function finishReload() { const w = wstat(player.wpn), a = player.ammo[player.wpn]; if (w.shell) { a.mag++; a.res--; sfx.click(1300, 0.2); if (a.mag < w.mag && a.res > 0) { player.reload = w.reload; vm.reloadT = vm.reloadDur = w.reload; } } else { const need = w.mag - a.mag, take = Math.min(need, a.res); a.mag += take; a.res -= take; sfx.click(1600, 0.25); } }
const ray0 = new THREE.Vector3(), rayD = new THREE.Vector3(), muz = new THREE.Vector3();
function fire() {
  const w = wstat(player.wpn), a = player.ammo[player.wpn];
  if (a.mag <= 0) { sfx.click(300, 0.2); player.cd = 0.25; startReload(); return; }
  if (player.reload > 0) { if (w.shell) { player.reload = 0; vm.reloadT = 0; } else return; }
  a.mag--; player.cd = 60 / w.rpm; cur.shots++;
  sfx.gun(w.snd, 0.9); vm.fire(w); screen.shake(w.recoil * 0.08);
  player.kick += w.kick * (player.ads ? 0.6 : 1); player.kickY += rand(-1, 1) * w.kick * 0.4;
  camera.updateMatrixWorld(); vm.root.updateMatrixWorld(true); vm.muzzleWorld(camera, muz);
  muzL.position.copy(muz); muzL.intensity = 18; muzT = 0.05;
  const moving = Math.hypot(player.vx, player.vz) > 1; const spread = w.spread * (player.ads ? 0.4 : 1) * (moving ? 1.5 : 1) * (w.pellets > 1 ? 1 : 1 + vm.recoil * 0.6);
  ray0.copy(camera.position); let anyHit = false, killed = false;
  const assist = isTouch && save.assist ? 1.35 : 1;
  for (let i = 0; i < w.pellets; i++) {
    rayD.set(rand(-1, 1) * spread, rand(-1, 1) * spread, -1).normalize().applyQuaternion(camera.quaternion);
    const wr = city.ray(ray0, rayD, w.range); let best = null, bt = wr.t;
    for (const z of zombies) { const h = z.rayHit(ray0, rayD, bt, assist); if (h && h.t < bt) { bt = h.t; best = { z, part: h.part }; } }
    if (boss) { const h = boss.rayHit(ray0, rayD, bt, assist); if (h && h.t < bt) { bt = h.t; best = { z: boss, part: h.part }; } }
    const hp = v4.copy(ray0).addScaledVector(rayD, bt);
    if (i < 3) tracer(muz, hp);
    if (best) {
      const fall = bt > w.range * 0.5 ? 1 - (bt - w.range * 0.5) / (w.range * 0.5) * 0.5 : 1;
      const res = best.z.damage(w.dmg * fall, best.part, rayD, ctx, { force: w.force || 0.4, headMul: player.wpn === 'rifle' ? 2.8 : 2.4 });
      if (res) { anyHit = true; if (res.killed) killed = true; blood.emit(hp, { count: best.part === 'head' ? 14 : 8, color: 0x900000, color2: 0x3a0000, speed: 3, dir: rayD, spread: 0.7, gravity: 9, life: 0.7, size: 0.06 }); if (Math.random() < 0.15) decal('blood', best.z.g.position, rand(0.5, 1)); }
    } else if (wr.n) {
      const n = v3.set(...wr.n); fx.emit(hp, { count: 6, color: 0xffd080, color2: 0xff8a30, speed: 5, dir: n, spread: 0.8, gravity: 12, life: 0.3, size: 0.04 }); smoke.emit(hp, { count: 2, color: 0x6a645a, speed: 0.6, dir: n, life: 0.8, size: 0.18, grow: 2 });
      if (wr.c && wr.c.kind === 'barrel') { const b = city.barrels.find(x => x.col === wr.c); if (b && b.alive) { b.hp -= w.dmg; fx.emit(hp, { count: 10, color: 0xff6010, speed: 3, life: 0.4, size: 0.1 }); if (b.hp <= 0) pending.push({ t: 0.05, fn: () => blowBarrel(b) }); } }
    }
  }
  if (anyHit) { cur.hits++; hitMark(killed); }
  if (a.mag === 0 && a.res > 0) setTimeout(() => { if (state === 'playing') startReload(); }, 250);
}
let muzT = 0;
function throwNade() {
  if (player.nades <= 0 || vm.nadeT > 0 || vm.switchT > 0) return; player.nades--; vm.nadeT = 0.6; sfx.click(700, 0.2);
  setTimeout(() => { if (state !== 'playing' || !city) return; fwd.set(0, 0.25, -1).normalize().applyQuaternion(camera.quaternion); const m = new THREE.Mesh(nadeGeo, nadeMat); m.position.copy(camera.position).addScaledVector(fwd, 0.5); m.castShadow = ENT.shadows; scene.add(m); nades.push({ m, v: fwd.clone().multiplyScalar(15).add(v3.set(player.vx, 0, player.vz)), t: 1.8 }); }, 250);
}

/* ---------- player ---------- */
const keyHeld = c => !!input.keys[c];
let useT = 0;
function updatePlayer(dt) {
  let [lx, ly] = input.consumeLook(); const ads = (input.held('alt') && !isTouch) ? 1 : 0; player.ads = ads;
  const sensK = 1 - ads * 0.35; player.yaw -= lx * sensK; player.pitch = clamp(player.pitch - ly * sensK, -1.4, 1.4);
  // recoil recovery
  player.pitch += player.kick * 0.25; player.yaw += player.kickY * 0.3; player.recP = Math.min(0.35, (player.recP || 0) + player.kick * 0.75); player.kick = 0; player.kickY = 0; player.recP *= Math.max(0, 1 - dt * (input.held('fire') ? 5 : 9));
  // touch aim assist
  if (isTouch && save.assist && (input.held('fire') || Math.abs(lx) > 0)) {
    fwd.set(0, 0, -1).applyQuaternion(camera.quaternion); let best = null, ba = 0.14;
    for (const z of zombies.concat(boss ? [boss] : [])) { if (!z.alive() || z.state === 'intro') continue; z.center(v3); v3.sub(camera.position); const d = v3.length(); if (d > 40) continue; v3.divideScalar(d); const a = Math.acos(clamp(v3.dot(fwd), -1, 1)); if (a < ba && city.los(player.x, player.z, z.x, z.z, 1.5)) { ba = a; best = v3.clone(); } }
    if (best) { const ty = Math.atan2(-best.x, -best.z), tp = Math.asin(best.y); let dy = ty - player.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; player.yaw += dy * Math.min(1, dt * 3.5); player.pitch += (tp - player.pitch) * Math.min(1, dt * 3); }
  }
  const mv = input.moveVec(); if (input.was('run')) player.run = !player.run;
  const wantRun = (keyHeld('ShiftLeft') || keyHeld('ShiftRight') || player.run) && mv.y < -0.3 && !ads && !input.held('fire');
  const running = wantRun && player.st > 0.05; player.running = running;
  player.st = clamp(player.st + (running ? -dt * (0.2 - upg('speed') * 0.02) : dt * 0.2), 0, 1); if (player.st <= 0.05) player.run = false;
  const sp = player.speed * (running ? 1.55 : 1) * (ads ? 0.55 : 1);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const tx = (-s * -mv.y + c * mv.x) * sp, tz = (-c * -mv.y - s * mv.x) * sp;
  player.vx += (tx - player.vx) * Math.min(1, dt * 10); player.vz += (tz - player.vz) * Math.min(1, dt * 10);
  const p = v3.set(player.x + player.vx * dt, 0, player.z + player.vz * dt); city.collide(p, 0.35); city.collide(p, 0.35);
  // block on zombies (soft)
  for (const z of zombies) { if (!z.alive() || z.state === 'rise') continue; const dx = p.x - z.x, dz = p.z - z.z, d = Math.hypot(dx, dz), r = 0.35 + 0.3 * z.s; if (d < r && d > 1e-4) { p.x = z.x + dx / d * r; p.z = z.z + dz / d * r; } }
  if (boss && boss.alive()) { const dx = p.x - boss.x, dz = p.z - boss.z, d = Math.hypot(dx, dz), r = 0.35 + 0.5 * boss.s; if (d < r && d > 1e-4) { p.x = boss.x + dx / d * r; p.z = boss.z + dz / d * r; } }
  const moved = Math.hypot(p.x - player.x, p.z - player.z); player.x = p.x; player.z = p.z;
  player.bob += moved * (running ? 2.4 : 3.0); player.stepD += moved; if (player.stepD > (running ? 0.95 : 0.75)) { player.stepD = 0; sfx.step(running ? 0.25 : 0.15); }
  const bobY = Math.sin(player.bob) * 0.05 * Math.min(1, moved / dt / 3.5);
  camera.position.set(player.x, 1.65 + bobY, player.z); camera.rotation.set(clamp(player.pitch + (player.recP || 0), -1.45, 1.45), player.yaw, 0);
  const fov = 75 - ads * 20 + (running ? 4 : 0); if (Math.abs(camera.fov - fov) > 0.05) { camera.fov += (fov - camera.fov) * Math.min(1, dt * 12); camera.updateProjectionMatrix(); }
  // weapons
  player.cd -= dt;
  if (player.reload > 0) { player.reload -= dt; if (player.reload <= 0) finishReload(); }
  for (let i = 0; i < ORDER.length; i++) if (input.was('Digit' + (i + 1))) setWeapon(ORDER[i]);
  if (input.was('KeyQ')) setWeapon(player.last); if (input.was('swap')) cycleWeapon(1);
  if (input.was('KeyR') || input.was('reload')) startReload();
  if (input.was('KeyG') || input.was('nade')) throwNade();
  const w = WEAPONS[player.wpn]; const trig = input.held('fire') || keyHeld('Space'); const trigP = input.was('fire') || input.was('Space');
  if (!running && vm.switchT <= 0 && vm.nadeT <= 0 && player.cd <= 0 && (w.auto ? trig : trigP)) fire();
  vm.update(dt, { lookX: lx, lookY: ly, ads, sprint: running, bob: player.bob, moving: Math.min(1, moved / dt / 3.5) });
  // use / rescue
  let near = null; for (const s2 of survivors) if (s2.state === 'wait' && Math.hypot(s2.x - player.x, s2.z - player.z) < 2.2) near = s2;
  const pr = $('#prompt');
  if (near) { pr.style.display = 'block'; const hold = keyHeld('KeyE') || input.held('use'); useT = hold ? useT + dt : Math.max(0, useT - dt * 2); $('#promptTxt').textContent = isTouch ? 'HOLD USE TO RESCUE' : 'HOLD E TO RESCUE'; $('#promptBar').style.width = (useT / 1.4 * 100) + '%'; if (useT >= 1.4) { useT = 0; const e = city.exits[randi(0, city.exits.length - 1)]; near.free(new THREE.Vector3(e.pts[1][0], 0, e.pts[1][1])); cur.rescued++; sfx.pickup(0.6); toast(`SURVIVOR RESCUED ${cur.rescued}/${P.survivors}`, 1600); cur.coins += 15; } }
  else { pr.style.display = 'none'; useT = 0; }
}

/* ---------- world objects ---------- */
function updateObjects(dt) {
  for (const z of zombies) z.update(dt, ctx);
  // remove gone zombies, cap corpses
  const dead = zombies.filter(z => !z.alive() && !z.gone); if (dead.length > 12) { dead[0].sinkAt = Math.min(dead[0].sinkAt ?? 7, dead[0].deadT); }
  zombies = zombies.filter(z => { if (z.gone) { z.remove(); return false; } return true; });
  if (boss) { boss.update(dt, ctx); if (boss.gone) { boss.remove(); boss = null; } }
  gibs = gibs.filter(g => { if (g.update(dt, ctx)) return true; g.remove(); return false; });
  // grenades
  for (const n of nades) {
    n.t -= dt; const m = n.m; const o = m.position.clone(); m.position.addScaledVector(n.v, dt); n.v.y -= 16 * dt; m.rotation.x += dt * 10;
    if (m.position.y < 0.07) { m.position.y = 0.07; if (n.v.y < -2) sfx.click(500, 0.12); n.v.y *= -0.35; n.v.x *= 0.65; n.v.z *= 0.65; }
    const p = v3.copy(m.position); city.collide(p, 0.08); if (Math.abs(p.x - m.position.x) > 1e-4) n.v.x *= -0.5; if (Math.abs(p.z - m.position.z) > 1e-4) n.v.z *= -0.5; m.position.x = p.x; m.position.z = p.z;
    if (Math.random() < 0.5) fx.emit(m.position, { count: 1, color: 0xff4020, speed: 0.2, life: 0.2, size: 0.05 });
    if (n.t <= 0) { scene.remove(m); explode(m.position, 6.5, 190 * (1 + upg('dmg') * 0.15) * (1 + P.t), 'player'); }
  }
  nades = nades.filter(n => n.t > 0);
  // boss rocks
  for (const r of rocks) {
    r.life -= dt; r.m.position.addScaledVector(r.v, dt); r.v.y -= 16 * dt; r.m.rotation.x += dt * 5; r.m.rotation.z += dt * 3; smoke.emit(r.m.position, { count: 1, color: 0x2a2220, speed: 0.2, life: 0.8, size: 0.4, grow: 1.5 });
    if (r.m.position.y < 0.3 || r.life <= 0) { r.life = 0; scene.remove(r.m); const p = r.m.position; fx.emit(p, { count: 50, color: 0xff7a2a, color2: 0xffd080, speed: 6, up: 0.5, life: 0.5, size: 0.35 }); ctx.dust(p, 2); shock(p, 3.5); sfx.explosion(0.4); decal('scorch', p, 2.4); const d = Math.hypot(player.x - p.x, player.z - p.z); screen.shake(clamp(0.8 - d / 20, 0, 0.6)); if (d < 3.2) ctx.hurtPlayer(20 * P.dmgMul * (1 - d / 5), p, 0.5, 4); }
  }
  rocks = rocks.filter(r => r.life > 0);
  // pickups
  for (const p of pickups) {
    p.update(dt); const dx = player.x - p.g.position.x, dz = player.z - p.g.position.z, d = Math.hypot(dx, dz);
    if (p.kind === 'coin' && d < 3.5 && !p.vel) { p.g.position.x += dx / d * dt * 8; p.g.position.z += dz / d * dt * 8; }
    if (d < 1.1 && !p.vel) {
      if (p.kind === 'coin') { cur.coins += p.value || 2; sfx.pickup(0.25); p.taken = true; }
      else if (p.kind === 'med') { if (player.hp < player.maxHp) { player.hp = Math.min(player.maxHp, player.hp + 40); sfx.pickup(0.5); toast('+40 HEALTH', 900); p.taken = true; } }
      else if (p.kind === 'nade') { player.nades += 2; sfx.pickup(0.5); toast('+2 GRENADES', 900); p.taken = true; }
      else { const big = p.kind === 'ammo'; let any = false; for (const k of owned()) { if (k === 'pistol') continue; const w = wstat(k), a = player.ammo[k], cap = Math.round(w.reserve); if (a.res < cap) { a.res = Math.min(cap, a.res + Math.round(w.mag * (big ? 2 : 0.7) * (1 + upg('ammo') * 0.25))); any = true; } } if (big && player.nades < 2 + upg('nades')) { player.nades++; any = true; } if (any || owned().length === 1) { sfx.pickup(0.5); sfx.click(1200, 0.2); toast(big ? 'AMMO CRATE' : '+AMMO', 800); p.taken = true; } }
      if (p.taken) p.remove();
    }
  }
  pickups = pickups.filter(p => !p.taken);
  for (const s of survivors) s.update(dt, ctx); survivors = survivors.filter(s => { if (s.gone) { s.remove(); return false; } return true; });
  // pending timed events (barrel chains)
  for (const e of pending) { e.t -= dt; if (e.t <= 0) e.fn(); } pending = pending.filter(e => e.t > 0);
  for (const f of city.fires) if (f.ttl != null) f.ttl -= dt; city.fires = city.fires.filter(f => f.ttl == null || f.ttl > 0);
  // supply drop
  cur.supplyT -= dt; if (cur.supplyT <= 0 && state === 'playing') { cur.supplyT = rand(45, 70); const s = city.randomSpot(6, player, 20); const k = new Pickup(scene, 'ammo', s); k.g.position.y = 25; k.vel = new THREE.Vector3(0, -6, 0); k.flare = 8; pickups.push(k); toast('SUPPLY DROP INCOMING', 1600); sfx.thud(0.3, 120); }
  for (const p of pickups) if (p.flare > 0) { p.flare -= dt; smoke.emit(v3.set(p.g.position.x, 0.6, p.g.position.z), { count: 1, color: 0x30ff60, color2: 0x10a030, speed: 0.6, up: 2.5, life: 2.5, size: 0.7, grow: 2, jitter: 0.3, drag: 0.6 }); }
}

/* ---------- missions ---------- */
function alive() { return zombies.filter(z => z.alive()).length; }
function updateMission(dt) {
  if (cur.done) return;
  if (mis.winT >= 0) { mis.winT -= dt; if (mis.winT < 0) { cur.done = true; endLevel(true); } return; }
  mis.spawnT -= dt; const n = alive();
  if (mis.type === 'waves') {
    if (mis.breakT > 0) { mis.breakT -= dt; if (mis.breakT <= 0) { mis.wave++; mis.toSpawn = P.perWave(mis.wave); toast(`WAVE ${mis.wave}`, 1600); sfx.stinger(0.4); } }
    else if (mis.toSpawn > 0) { if (n < P.maxAlive && mis.spawnT <= 0) { spawnZombie(); mis.toSpawn--; mis.spawnT = rand(0.35, 1.1) * (1.2 - P.t * 0.5); } }
    else if (n === 0) { if (mis.wave >= P.waves) { toast('ALL WAVES CLEARED', 2000); mis.winT = 2; } else { mis.breakT = 6; toast(`WAVE ${mis.wave} CLEARED\nReload and regroup…`, 2400); cur.coins += 10; } }
  } else if (mis.type === 'survive' || mis.type === 'rescue') {
    if (n < P.maxAlive && mis.spawnT <= 0) { spawnZombie(); mis.spawnT = P.interval * rand(0.6, 1.4); }
    if (mis.type === 'survive') { mis.timer -= dt; if (mis.timer <= 10 && mis.timer + dt > 10) toast('EVAC IN 10 SECONDS', 1500); if (mis.timer <= 0) { toast('EVAC HAS ARRIVED!', 2000); mis.winT = 1.5; } }
    else if (cur.rescued >= P.survivors && !survivors.some(s => s.state === 'wait')) { toast('ALL SURVIVORS EVACUATED', 2000); mis.winT = 2; }
  } else if (mis.type === 'boss') {
    if (mis.bossT > 0) { mis.bossT -= dt; if (mis.bossT <= 0) { let bp = new THREE.Vector3(city.start.x + 4.5, 0, city.start.z - 6.5); if (!city.walkable(bp.x, bp.z)) bp = city.randomSpot(6, player, 12); boss = new Commander(scene, bp, P); screen.shake(1); sfx.stinger(0.9); } }
    if (boss && boss.alive() && boss.state !== 'intro' && n < Math.min(8, P.maxAlive) && mis.spawnT <= 0) { spawnZombie(Math.random() < 0.7 ? 'walker' : 'runner'); mis.spawnT = 4 + rand(0, 3); }
  }
}

/* ---------- HUD ---------- */
const radar = $('#radar'), rctx = radar.getContext('2d'); let hudT = 0;
function updateHUD(dt) {
  $('#hpBar').style.width = (player.hp / player.maxHp * 100) + '%'; $('#stBar').style.width = (player.st * 100) + '%';
  const w = wstat(player.wpn), a = player.ammo[player.wpn]; $('#wName').textContent = WEAPONS[player.wpn].name; const mg = $('#aMag'); mg.textContent = a.mag; mg.classList.toggle('low', a.mag <= Math.ceil(w.mag * 0.25)); $('#aRes').textContent = '/ ' + (a.res === Infinity ? '∞' : a.res); $('#nadeHud').textContent = '● '.repeat(Math.min(8, player.nades)) + (player.nades ? '' : '— no grenades');
  const rh = $('#reloadHint'); const needR = a.mag === 0 || (a.mag <= Math.ceil(w.mag * 0.25) && a.res > 0); rh.style.display = needR && player.reload <= 0 ? 'block' : 'none'; rh.textContent = a.mag === 0 && a.res <= 0 ? 'NO AMMO – SWITCH WEAPON' : player.reload > 0 ? '' : (isTouch ? 'RELOAD' : 'R – RELOAD');
  $('#coinHud').textContent = `◉ ${cur.coins}`;
  $('#lvlLbl').textContent = `MISSION ${cur.L}${P.night ? ' · NIGHT' : ''}`;
  let m = '', obj = '';
  if (mis.type === 'waves') { m = mis.breakT > 0 ? `NEXT WAVE ${Math.ceil(mis.breakT)}` : `WAVE ${mis.wave}/${P.waves}`; obj = `Zombies left: ${mis.toSpawn + alive()}`; }
  else if (mis.type === 'survive') { m = `EVAC ${fmtT(Math.max(0, mis.timer))}`; obj = 'Hold out until the helicopter arrives'; }
  else if (mis.type === 'rescue') { m = `SURVIVORS ${cur.rescued}/${P.survivors}`; obj = 'Find the green beacons and hold USE'; }
  else { m = boss ? (P.final ? 'KILL GENERAL ROT' : 'KILL THE COMMANDER') : 'SOMETHING IS COMING…'; obj = 'Aim for the head · dodge the slam & thrown rocks'; }
  $('#misLbl').textContent = m; $('#objective').textContent = obj; $('#objective').style.display = boss && boss.alive() ? 'none' : '';
  if (boss) $('#bossHp').style.width = (boss.hp / boss.maxHp * 100) + '%';
  hitT -= dt; if (hitT <= 0) $('#hitmark').style.opacity = 0; popT -= dt; if (popT <= 0) $('#popup').style.opacity = 0;
  player.dmgDirT -= dt; if (player.dmgDirT <= 0) $('#dmgdir').style.opacity = 0;
  const cr = $('#cross'); const spr = 1 + vm.recoil * 0.8 + Math.min(1, Math.hypot(player.vx, player.vz) / 4) * 0.5 - player.ads * 0.5; cr.style.transform = `scale(${spr})`; cr.style.opacity = player.ads && player.wpn === 'rifle' ? 0 : 1;
  // radar
  hudT += dt; if (hudT < 0.066) return; hudT = 0;
  const W = 150, R = 72, S = R / 32; rctx.clearRect(0, 0, W, W); rctx.save(); rctx.translate(75, 75);
  rctx.strokeStyle = 'rgba(154,255,58,.25)'; rctx.lineWidth = 1; for (const r of [24, 48, 72]) { rctx.beginPath(); rctx.arc(0, 0, r, 0, 7); rctx.stroke(); }
  const sw = (cur.time * 2) % (Math.PI * 2); const g = rctx.createConicGradient ? rctx.createConicGradient(sw, 0, 0) : null; if (g) { g.addColorStop(0, 'rgba(154,255,58,.35)'); g.addColorStop(0.12, 'rgba(154,255,58,0)'); g.addColorStop(1, 'rgba(154,255,58,0)'); rctx.fillStyle = g; rctx.beginPath(); rctx.arc(0, 0, R, 0, 7); rctx.fill(); }
  const cy = Math.cos(player.yaw), sy = Math.sin(player.yaw);
  const dot = (x, z, col, r) => { const dx = x - player.x, dz = z - player.z; let rx = dx * cy - dz * sy, ry = dx * sy + dz * cy; rx *= S; ry *= S; const l = Math.hypot(rx, ry); if (l > R - 3) { rx *= (R - 3) / l; ry *= (R - 3) / l; } rctx.fillStyle = col; rctx.beginPath(); rctx.arc(rx, ry, r, 0, 7); rctx.fill(); };
  for (const p of pickups) if (p.kind !== 'coin') dot(p.g.position.x, p.g.position.z, p.kind === 'med' ? '#ff6a6a' : '#ffd23a', 2.5);
  for (const s of survivors) if (s.state === 'wait') dot(s.x, s.z, '#3aff7a', 4);
  for (const z of zombies) if (z.alive()) dot(z.x, z.z, z.type === 'exploder' ? '#c8ff3a' : '#ff3a2a', z.type === 'brute' ? 3.5 : 2.5);
  if (boss && boss.alive()) dot(boss.x, boss.z, '#ff1a6a', 6);
  rctx.fillStyle = '#fff'; rctx.beginPath(); rctx.moveTo(0, -6); rctx.lineTo(4, 4); rctx.lineTo(-4, 4); rctx.fill(); rctx.restore();
}

/* ---------- title scene ---------- */
const titleCenter = new THREE.Vector3();
function setupTitle() {
  const L = 7; buildLevel(L, true); titleT = 0; $('#bossBar').style.display = 'none';
  titleCenter.set(city.start.x, 0, city.start.z); player.x = titleCenter.x; player.z = titleCenter.z;
  for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, d = rand(5, 13); const p = new THREE.Vector3(titleCenter.x + Math.cos(a) * d, 0, titleCenter.z + Math.sin(a) * d); if (city.walkable(p.x, p.z)) { const z = new Zombie(scene, ['walker', 'walker', 'runner', 'brute', 'exploder'][i % 5], p, P, { rise: false }); z.speed *= 0.35; zombies.push(z); } }
  flash.intensity = 0;
}

/* ---------- main loop ---------- */
let last = performance.now(), fpsT = 0, frames = 0, fps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = clamp((now - last) / 1000, 0, 0.05); last = now; const t = now / 1000;
  if (!city) return;
  if (state === 'playing') {
    cur.time += dt; cur.comboT -= dt;
    flowT -= dt; if (flowT <= 0) { flowT = 0.3; city.updateFlow(player.x, player.z); }
    updatePlayer(dt); updateObjects(dt); updateMission(dt);
    city.update(dt, player);
    if (input.was('pause')) pause();
    updateHUD(dt);
    gfx.grade.uniforms.uDesat.value = 0.12 + (1 - player.hp / player.maxHp) * 0.55;
  } else if (state === 'title' || state === 'levels' || state === 'shop' || state === 'settings' || state === 'howto') {
    titleT += dt; const a = titleT * 0.07;
    camera.position.set(titleCenter.x + Math.sin(a) * 9, 2.3 + Math.sin(titleT * 0.3) * 0.3, titleCenter.z + Math.cos(a) * 9); camera.lookAt(titleCenter.x, 1.3, titleCenter.z);
    player.x = titleCenter.x; player.z = titleCenter.z; flowT -= dt; if (flowT <= 0) { flowT = 0.5; city.updateFlow(player.x, player.z); }
    for (const z of zombies) z.update(dt, ctx); zombies = zombies.filter(z => !z.gone);
    city.update(dt, { x: camera.position.x, z: camera.position.z });
    if (zombies.length < 8 && Math.random() < dt * 0.5) { const p = city.randomSpot(6, titleCenter, 13); const z = new Zombie(scene, Math.random() < 0.3 ? 'runner' : 'walker', p, P, { rise: true }); z.speed *= 0.35; zombies.push(z); }
    for (const p of pickups) p.update(dt);
    vm.root.visible = false;
  }
  vm.root.visible = state === 'playing' || state === 'paused';
  if (boss && state === 'playing') { boss.center(v4); const dx = player.x - v4.x, dz = player.z - v4.z, l = Math.hypot(dx, dz) || 1; bossL.position.set(v4.x + dx / l * 2.5, 1.0, v4.z + dz / l * 2.5); bossL.intensity = (P.night ? 45 : 32) * (boss.alive() ? 1 : Math.max(0, 1 - boss.deadT / 6)); } else bossL.intensity = 0;
  muzT -= dt; if (muzT <= 0) muzL.intensity = 0;
  boomL.intensity *= Math.max(0, 1 - dt * 7);
  for (const tr of tracers) if (tr.life > 0) { tr.life -= dt; if (tr.life <= 0) tr.m.visible = false; }
  for (const r of rings) if (r.t < 1) { r.t = Math.min(1, r.t + dt * 2.5); const s = r.r * (0.2 + r.t); r.m.scale.set(s, 1, s); r.m.material.opacity = 1 - r.t; if (r.t >= 1) r.m.visible = false; }
  fx.update(dt); smoke.update(dt); blood.update(dt); updateDecals(dt);
  screen.update(dt, camera);
  gfx.render(t);
  input.endFrame();
  frames++; fpsT += dt; if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
}

/* ---------- boot ---------- */
setupTitle(); refreshCoins();
requestAnimationFrame(t => { last = t; frame(t); });
setTimeout(() => { const l = $('#loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 700); }, 300);
window.__zw = { get state() { return state; }, get player() { return player; }, get cur() { return cur; }, get mis() { return mis; }, get city() { return city; }, get zombies() { return zombies; }, get boss() { return boss; }, get pickups() { return pickups; }, get survivors() { return survivors; }, get fps() { return fps; }, get P() { return P; }, startLevel, endLevel, spawnZombie, explode, ctx, input, camera, scene, gfx, vm, save: () => save, setSave(o) { Object.assign(save, o); persist(); }, tp(x, z) { player.x = x; player.z = z; }, THREE };
