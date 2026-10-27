// GHOST HUNT: HAUNTED HOSPITAL – GUNVORA GAMES
import * as THREE from 'three';
import { Gfx, ScreenFX, Particles, SFX, Input, Save, isTouch, rand, randi, clamp, $, show, hideScreens, toast } from './core.js';
import { World, levelParams, ROOM, WALL_H } from './world.js';
import { Ghost, Doctor, Patient, Pickup, Fuse, Scalpel } from './entities.js';

const MAX_LEVEL = 100, KEY = 'gunvora_ghosthunt_v1';
const DEF = { unlocked: 1, done: {}, coins: 0, up: { beam: 0, battery: 0, health: 0, speed: 0, radar: 0, medkit: 0 }, quality: isTouch ? 'low' : 'high', sens: 1, vol: 0.8 };
let save = Save.load(KEY, DEF);
const persist = () => Save.save(KEY, save);

/* ---------- engine ---------- */
const canvas = $('#c');
const gfx = new Gfx(canvas, save.quality);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x010102); scene.fog = new THREE.FogExp2(0x030405, 0.07);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 70); camera.rotation.order = 'YXZ'; scene.add(camera);
gfx.setup(scene, camera); gfx.grade.uniforms.uTint.value.set(0.92, 1.0, 1.08); gfx.grade.uniforms.uDesat.value = 0.25;
const sfx = new SFX(); sfx.setVolume(save.vol);
const input = new Input(canvas); input.sens = save.sens;
const screen = new ScreenFX(gfx);
const fx = new Particles(scene, 1600, true), blood = new Particles(scene, 500, false);
const hemi = new THREE.HemisphereLight(0x6a7c90, 0x1a0c0c, 0.16); scene.add(hemi);

// flashlight
const torch = new THREE.SpotLight(0xfff1dc, 30, 32, 0.46, 0.6, 1.15); torch.position.set(0.2, -0.17, -0.62); camera.add(torch);
const torchTarget = new THREE.Object3D(); torchTarget.position.set(0.05, -0.12, -6); camera.add(torchTarget); torch.target = torchTarget;
torch.shadow.mapSize.set(1024, 1024); torch.shadow.camera.near = 0.3; torch.shadow.camera.far = 30; torch.shadow.bias = -0.0008; torch.shadow.normalBias = 0.02;
const torchModel = new THREE.Group(); {
  const rub = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.4, roughness: 0.55 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.22, 14), rub); body.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.024, 0.07, 18), new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.85, roughness: 0.3 })); head.rotation.x = Math.PI / 2; head.position.z = -0.14;
  const lens = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 24), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 2.8, 2.5), toneMapped: false })); lens.position.z = -0.176; torchModel.lens = lens;
  const grip = []; for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.023, 0.003, 4, 14), rub); r.position.z = 0.02 + i * 0.016; grip.push(r); }
  const btn = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.02), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.3, 1.8), toneMapped: false })); btn.position.set(0, 0.023, -0.05);
  lens.visible = false; rub.emissive.setHex(0x0c0c0e); head.material.emissive.setHex(0x141418); torchModel.add(body, head, lens, btn, ...grip); torchModel.rotation.set(0.04, 0.07, 0); torchModel.position.set(0.24, -0.22, -0.4); camera.add(torchModel);
}
// volumetric beam cone
const beamGeo = new THREE.ConeGeometry(1.5, 9, 28, 1, true); beamGeo.translate(0, -4.5, 0); beamGeo.rotateX(Math.PI / 2);
const beamMat = new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color(1, 0.95, 0.85) }, uI: { value: 0.05 }, uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vUv=uv; vP=position; vec4 mv=modelViewMatrix*vec4(position,1.0); vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz); gl_Position=projectionMatrix*mv; }`,
  fragmentShader: `uniform vec3 uColor; uniform float uI,uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float along=clamp(-vP.z/9.0,0.0,1.0); float soft=pow(abs(dot(vN,vV)),1.5); float dust=0.75+0.25*sin(vP.z*3.0+uTime*0.7+vP.x*5.0); gl_FragColor=vec4(uColor*uI*soft*dust*pow(1.0-along,2.2),1.0); }` });
const beam = new THREE.Mesh(beamGeo, beamMat); beam.position.set(0.24, -0.2, -0.55); beam.rotation.set(0.012, -0.005, 0); beam.renderOrder = 20; camera.add(beam);
// dust motes
const DUST = 260, dustPos = new Float32Array(DUST * 3); for (let i = 0; i < DUST * 3; i++) dustPos[i] = rand(-6, 6);
const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.025, color: 0x9a9a9a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })); dust.frustumCulled = false; scene.add(dust);

function applyQuality() {
  gfx.setQuality(save.quality); gfx.setup(scene, camera);
  torch.castShadow = save.quality === 'high'; dust.visible = true;
}

/* ---------- state ---------- */
let state = 'title', world = null, P = null;
let ghosts = [], pickups = [], patients = [], fuses = [], scalpels = [], boss = null, lurker = null;
const player = { x: 0, z: 0, yaw: 0, pitch: 0, hp: 100, maxHp: 100, bat: 100, maxBat: 100, st: 1, med: 0, run: false, vx: 0, vz: 0, bob: 0, stepD: 0, speed: 3.3 };
const cur = { L: 1, keys: 0, pat: 0, fus: 0, kills: 0, coins: 0, time: 0, done: false, exitOpen: false };
const dir = { scare: 20, lights: 30, amb: 6, lightsOn: 0, heart: 0, emf: 0 };
const upg = k => save.up[k] || 0;
applyQuality();

const NOTES = [
  'Dr. Voss insists the night shift stay locked in Ward C.\nThe patients keep asking who walks the halls after midnight.',
  'Day 41. The UV lamps keep them back. They HATE the light.\nIf you find a battery, take it.',
  'The keys are hidden all over the floor. He hid them so we could never leave.',
  'Don\'t look behind you. If you feel cold breath on your neck – turn around FAST.',
  'The fuse boxes control the lifts. Pull every lever.',
  'Head Doctor Voss died on the operating table in 1987.\nHe still makes his rounds.',
  'I heard my name in the morgue. It was my mother\'s voice.\nMy mother has been dead for nine years.',
  'The doors lock by themselves. Wait. They always open again… eventually.',
];

/* ---------- level setup ---------- */
function clearLevel() {
  ghosts.forEach(g => g.remove()); pickups.forEach(p => p.remove()); patients.forEach(p => p.remove()); fuses.forEach(f => f.remove()); scalpels.forEach(s => s.kill());
  if (boss) boss.remove(); if (lurker) lurker.g.remove();
  ghosts = []; pickups = []; patients = []; fuses = []; scalpels = []; boss = null; lurker = null;
  if (world) world.dispose(); world = null; fx.clear(); blood.clear();
}
function buildLevel(L, demo = false) {
  clearLevel(); P = levelParams(L); world = new World(scene, L, save.quality);
  scene.fog.density = 0.06 + P.t * 0.03; hemi.intensity = 0.16 - P.t * 0.08;
  const rooms = world.allRooms(); const far = rooms.filter(r => r !== world.start).sort((a, b) => b.dist - a.dist);
  const pickRoom = (min = 1) => { const c = far.filter(r => r.dist >= min && r.type !== 'arena'); return c.length ? c[randi(0, c.length - 1)] : far[randi(0, far.length - 1)]; };
  for (let i = 0; i < P.keys; i++) pickups.push(new Pickup(scene, 'key', world.freeSpot(pickRoom(1))));
  for (let i = 0; i < P.patients; i++) { const r = pickRoom(1); const s = world.freeSpot(r); patients.push(new Patient(scene, s, Math.atan2(r.cx - s.x, r.cz - s.z))); }
  for (let i = 0; i < P.fuses; i++) { for (let k = 0; k < 10; k++) { const sp = world.wallSpot(pickRoom(1)); if (sp && !fuses.some(f => f.pos.distanceTo(sp.pos) < 3)) { fuses.push(new Fuse(scene, sp)); break; } } }
  const nb = 2 + Math.floor(rooms.length / 4) + (P.boss ? 2 : 0); for (let i = 0; i < nb; i++) pickups.push(new Pickup(scene, 'battery', world.freeSpot(rooms[randi(0, rooms.length - 1)])));
  for (let i = 0; i < 1 + Math.floor(rooms.length / 9) + (P.boss ? 1 : 0); i++) pickups.push(new Pickup(scene, 'medkit', world.freeSpot(rooms[randi(0, rooms.length - 1)])));
  for (let i = 0; i < 6 + rooms.length; i++) { const r = rooms[randi(0, rooms.length - 1)]; pickups.push(new Pickup(scene, 'coin', new THREE.Vector3(r.cx + rand(-3, 3), 0, r.cz + rand(-3, 3)))); }
  if (!P.boss) for (let i = 0; i < 2; i++) { const r = pickRoom(0); const p = new Pickup(scene, 'note', new THREE.Vector3(r.cx + rand(-2, 2), 0, r.cz + rand(-2, 2))); p.text = NOTES[(L * 3 + i) % NOTES.length]; pickups.push(p); }
  const types = ['wraith']; if (L >= 6) types.push('screamer'); if (L >= 18) types.push('nurse');
  for (let i = 0; i < P.ghosts; i++) { const r = demo ? world.start : pickRoom(2); ghosts.push(new Ghost(scene, types[i % types.length], new THREE.Vector3(r.cx + rand(-2, 2), 0, r.cz + rand(-2, 2)), P)); }
  if (P.boss) { boss = new Doctor(scene, new THREE.Vector3(world.W * 0.5 + 1, 0, world.H * 0.5 + 1), P); }
  // player
  const s = world.start; player.x = s.cx; player.z = s.cz; const c = s.conn; player.yaw = c.e ? -Math.PI / 2 : c.s ? Math.PI : 0; if (P.boss) player.yaw = -Math.PI * 0.75; player.pitch = 0;
  player.maxHp = 100 + upg('health') * 20; player.hp = player.maxHp; player.maxBat = 100 + upg('battery') * 30; player.bat = player.maxBat; player.st = 1; player.med = upg('medkit'); player.speed = 3.2 * (1 + upg('speed') * 0.07); player.vx = player.vz = 0; player.run = false;
  Object.assign(cur, { L, keys: 0, pat: 0, fus: 0, kills: 0, coins: 0, time: 0, done: false, exitOpen: false });
  dir.scare = P.scareEvery * rand(0.5, 0.9); dir.lights = rand(25, 45); dir.lightsOn = 0; dir.amb = 5;
  torch.castShadow = save.quality === 'high';
}

/* ---------- flow ---------- */
let drone = null;
function startLevel(L) {
  sfx.init(); buildLevel(L); state = 'playing'; hideScreens(); $('#hud').classList.add('on'); $('#cross').style.display = 'block';
  input.enabled = true; input.showTouch(true); input.lock();
  if (drone) drone.stop(); drone = sfx.drone({ base: 41, cut: 260, vol: 0.22, wind: 300, windVol: 0.3 });
  $('#bossBar').style.display = P.boss ? 'block' : 'none'; $('#bossName').textContent = P.final ? 'DR. VOSS – THE IMMORTAL HEAD DOCTOR' : 'THE POSSESSED HEAD DOCTOR';
  const obj = P.boss ? 'Destroy the Head Doctor with your UV beam!' : [P.keys && `find ${P.keys} key${P.keys > 1 ? 's' : ''}`, P.patients && `rescue ${P.patients} patient${P.patients > 1 ? 's' : ''}`, P.fuses && `restore ${P.fuses} fuses`].filter(Boolean).join(' · ');
  toast(`LEVEL ${L}${P.boss ? ' – BOSS' : ''}\n${obj}`, 3200);
  if (P.boss) { sfx.stinger(0.8); screen.shake(0.4); }
  last = performance.now();
}
function endLevel(win) {
  state = win ? 'win' : 'over'; input.enabled = false; input.unlock(); input.showTouch(false); $('#hud').classList.remove('on'); $('#cross').style.display = 'none'; $('#prompt').style.display = 'none';
  if (drone) { drone.stop(); drone = null; }
  const L = cur.L;
  if (win) {
    const first = !save.done[L]; const reward = Math.round((40 + L * 6 + cur.kills * 8 + cur.pat * 25 + (P.boss ? 250 + L * 6 : 0)) * (first ? 1 : 0.5)) + cur.coins;
    save.coins += reward; save.done[L] = 1; save.unlocked = Math.max(save.unlocked, Math.min(MAX_LEVEL, L + 1)); persist();
    $('#winTitle').textContent = L === MAX_LEVEL ? 'YOU ESCAPED ST. AGATHA\'S' : P.boss ? 'Head Doctor Destroyed' : 'Floor Cleared';
    $('#winStats').innerHTML = stats([['Level', L], ['Time', fmtT(cur.time)], ['Ghosts banished', cur.kills], ['Patients rescued', cur.pat], ['Coins picked up', cur.coins], ['Total reward', `<span class="coins">+${reward}</span>`]]);
    $('#bNext').style.display = L < MAX_LEVEL ? '' : 'none'; sfx.victory(); show('win');
  } else {
    sfx.defeat(); $('#overStats').innerHTML = stats([['Level', L], ['Survived', fmtT(cur.time)], ['Ghosts banished', cur.kills]]); show('over');
  }
  refreshCoins();
}
const stats = rows => rows.map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('');
const fmtT = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function pause() { if (state !== 'playing') return; state = 'paused'; input.enabled = false; input.unlock(); input.showTouch(false); show('pause'); }
function resume() { state = 'playing'; hideScreens(); input.enabled = true; input.showTouch(true); input.lock(); last = performance.now(); }
function toMenu() { clearLevel(); state = 'title'; if (drone) { drone.stop(); drone = null; } input.enabled = false; input.unlock(); input.showTouch(false); $('#hud').classList.remove('on'); $('#cross').style.display = 'none'; setupTitle(); show('title'); refreshCoins(); }
input.onPause = pause;

/* ---------- menus ---------- */
function refreshCoins() { $('#tCoins').textContent = `◉ ${save.coins} coins`; $('#shopCoins').textContent = `◉ ${save.coins}`; }
function buildLevels() {
  const g = $('#lvGrid'); g.innerHTML = ''; $('#lvProg').textContent = `${Object.keys(save.done).length} / ${MAX_LEVEL} floors cleared`;
  for (let L = 1; L <= MAX_LEVEL; L++) { const b = document.createElement('button'); const boss = L % 10 === 0; b.className = 'lv' + (boss ? ' boss' : '') + (save.done[L] ? ' done' : '') + (L > save.unlocked ? ' locked' : ''); b.innerHTML = `${L}${boss ? '<small>BOSS</small>' : ''}`; if (L <= save.unlocked) b.onclick = () => { sfx.click(); startLevel(L); }; g.appendChild(b); }
}
const SHOP = [
  ['beam', 'UV Beam Power', 'Burn ghosts faster: +25% beam damage per level.'],
  ['battery', 'Battery Pack', '+30% UV battery capacity and slower drain.'],
  ['health', 'Adrenaline', '+20 maximum health per level.'],
  ['speed', 'Running Shoes', '+7% move speed and stamina.'],
  ['radar', 'Spirit Radar', 'Shows ghosts on your minimap. More range per level.'],
  ['medkit', 'First Aid Kit', 'Start every level with +1 medkit.'],
];
const cost = (k, l) => Math.round([90, 180, 340, 560, 900][l] * (k === 'radar' ? 1.2 : 1));
function buildShop() {
  refreshCoins(); const s = $('#shopList'); s.innerHTML = '';
  for (const [k, n, d] of SHOP) { const l = upg(k), max = l >= 5; const el = document.createElement('div'); el.className = 'item'; el.innerHTML = `<h4>${n}</h4><p>${d}</p><div class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < l ? 'on' : ''}"></i>`).join('')}</div>`; const b = document.createElement('button'); b.className = 'btn small'; b.textContent = max ? 'MAXED' : `Upgrade ◉ ${cost(k, l)}`; b.disabled = max || save.coins < cost(k, l); b.onclick = () => { if (save.coins >= cost(k, l) && l < 5) { save.coins -= cost(k, l); save.up[k] = l + 1; persist(); sfx.pickup(); buildShop(); } }; el.appendChild(b); s.appendChild(el); }
}
let settingsBack = 'title';
function buildSettings() { document.querySelectorAll('[data-q]').forEach(b => b.classList.toggle('sel', b.dataset.q === save.quality)); $('#sSens').value = save.sens; $('#sVol').value = save.vol; }
document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { save.quality = b.dataset.q; persist(); applyQuality(); buildSettings(); });
$('#sSens').oninput = e => { save.sens = +e.target.value; input.sens = save.sens; input.touchLook = save.sens; persist(); };
$('#sVol').oninput = e => { save.vol = +e.target.value; sfx.setVolume(save.vol); persist(); };
$('#bReset').onclick = () => { if (confirm('Reset all progress, coins and upgrades?')) { save = structuredClone(DEF); save.quality = DEF.quality; persist(); buildSettings(); refreshCoins(); } };
const go = (id, fn) => { sfx.init(); sfx.click(); fn && fn(); show(id); };
$('#bPlay').onclick = () => { sfx.init(); startLevel(save.unlocked); };
$('#bLevels').onclick = () => go('levels', buildLevels);
$('#bShop').onclick = () => go('shop', buildShop);
$('#bSettings').onclick = () => { settingsBack = 'title'; go('settings', buildSettings); };
$('#bHow').onclick = () => go('howto');
document.querySelectorAll('.back').forEach(b => b.onclick = () => { sfx.click(); const back = b.closest('#settings') && settingsBack === 'pause' ? 'pause' : b.closest('#shop') && shopBack ? shopBack : 'title'; show(back); });
let shopBack = null;
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

/* ---------- gameplay ctx (callbacks for entities) ---------- */
const v3 = new THREE.Vector3(), fwd = new THREE.Vector3();
const ctx = {
  player, get world() { return world; }, fx, sfx, get lightsOut() { return world.powerTarget < 0.5; },
  ghostAttack(g) { hurt(g.dmg); sfx.scream(0.9, rand(0.8, 1.2)); screen.doFlash(0.55, 0xd8e8ff); screen.shake(0.8); fx.emit(v3.set(player.x, 1.5, player.z), { count: 30, color: 0x9fd8ff, color2: 0x40ffb0, speed: 3, life: 0.9, size: 0.12 }); },
  ghostDie(g) { cur.kills++; sfx.wail(0.5); sfx.zap(0.3); fx.emit(g.g.position.clone().setY(1.2), { count: 80, color: g.T.color, color2: 0x40ffb0, speed: 4.5, life: 1.4, size: 0.18, up: 0.5 }); const c = new Pickup(scene, 'coin', g.g.position.clone().setY(0)); pickups.push(c); },
  bossHit(d) { hurt(d); sfx.splat(0.8); screen.shake(0.9); screen.doFlash(0.35, 0xff2010); blood.emit(v3.set(player.x, 1.4, player.z), { count: 30, color: 0x8a0000, color2: 0x300000, speed: 3, gravity: 9, life: 1.2, size: 0.07 }); },
  throwScalpel(from, spread) { const d = v3.set(player.x, 1.5, player.z).sub(from).normalize(); d.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread); scalpels.push(new Scalpel(scene, from, d.clone())); sfx.click(3000, 0.2); },
  bossVanish() { world.powerTarget = 0; dir.lightsOn = 1.8; sfx.stinger(0.7); sfx.whisper(0.5); },
  bossAppear() { sfx.scream(1, 0.6); screen.doFlash(0.6, 0xff3010); screen.shake(1); world.powerTarget = 1; toast('BEHIND YOU!', 1200); },
  bossSummon(b) { for (let i = 0; i < 2 + (P.final ? 1 : 0); i++) { const g = new Ghost(scene, i % 2 ? 'screamer' : 'nurse', b.g.position.clone().add(new THREE.Vector3(rand(-3, 3), 0, rand(-3, 3))), P); g.state = 'chase'; ghosts.push(g); } sfx.wail(0.6); toast('He calls his patients…', 1800); },
  bossDie(b) { sfx.scream(1, 0.45); sfx.explosion(0.8); screen.shake(1.2); screen.doFlash(0.9, 0xffffff); cur.coins += 50; setTimeout(() => { if (state === 'playing') { checkObjectives(true); } }, 2500); fx.emit(b.center(), { count: 200, color: 0xff4010, color2: 0xffe0a0, speed: 8, life: 1.6, size: 0.25 }); },
};
function hurt(d) {
  if (cur.done) return; player.hp -= d; screen.hurt(Math.min(1, d / 25)); sfx.hurt(0.6);
  if (player.hp <= 0) { player.hp = 0; cur.done = true; screen.doFlash(1, 0x400000); setTimeout(() => endLevel(false), 900); }
}
function checkObjectives(force) {
  if (cur.exitOpen) return;
  const ok = P.boss ? (boss && boss.state === 'dying' || force) : cur.keys >= P.keys && cur.pat >= P.patients && cur.fus >= P.fuses;
  if (ok) { cur.exitOpen = true; world.unlockExit(); sfx.door(0.6); sfx.pickup(0.5); toast('EXIT UNLOCKED\nGet to the elevator!', 2600); }
}
function objectiveText() {
  if (cur.exitOpen) return '➜ Reach the green EXIT elevator';
  if (P.boss) return 'Burn the Head Doctor with your UV beam';
  const a = []; if (P.keys) a.push(`🔑 ${cur.keys}/${P.keys}`); if (P.patients) a.push(`🛏 ${cur.pat}/${P.patients} rescued`); if (P.fuses) a.push(`⚡ ${cur.fus}/${P.fuses} fuses`); return a.join('  ·  ');
}

/* ---------- director: scares, blackouts ---------- */
function spawnLurker() {
  const bx = player.x + Math.sin(player.yaw) * 1.7, bz = player.z + Math.cos(player.yaw) * 1.7; const p = new THREE.Vector3(bx, 0, bz);
  const g = new Ghost(scene, Math.random() < 0.5 ? 'screamer' : 'wraith', p, P); g.g.rotation.y = Math.atan2(player.x - bx, player.z - bz); g.alpha = 0; g.targetAlpha = 0.9; lurker = { g, t: 0, phase: 'lurk' };
  sfx.whisper(0.55); setTimeout(() => sfx.heartbeat(0.7), 400);
}
function updateLurker(dt) {
  const L = lurker, g = L.g; L.t += dt; g.t += dt; g.mat.uniforms.uTime.value = g.headMat.uniforms.uTime.value = g.t;
  g.alpha += (g.targetAlpha - g.alpha) * Math.min(1, dt * 3); g.mat.uniforms.uAlpha.value = g.headMat.uniforms.uAlpha.value = g.alpha;
  g.arms.forEach((a, i) => a.rotation.x = -1.2 + Math.sin(g.t * 4 + i) * 0.1);
  const dx = g.g.position.x - player.x, dz = g.g.position.z - player.z, d = Math.hypot(dx, dz);
  fwd.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw)); const facing = (fwd.x * dx + fwd.z * dz) / (d || 1);
  if (L.phase === 'lurk') {
    // stay behind-ish, slowly creep
    g.g.position.y = 0.1 + Math.sin(g.t * 2) * 0.05;
    if (facing > 0.55 && L.t > 0.4) { L.phase = 'lunge'; L.t = 0; sfx.stinger(1); sfx.scream(1, 1.15); screen.doFlash(0.75, 0xffffff); screen.shake(1); hurt(4 + P.t * 6); g.mouth.scale.y = 3.2; }
    else if (L.t > 3.6) { L.phase = 'lunge'; L.t = 0; sfx.scream(1, 0.9); screen.shake(1); screen.doFlash(0.5, 0xff0000); hurt(P.ghostDmg); }
  } else {
    // lunge into the camera then dissolve
    const tx = player.x + fwd.x * 0.45, tz = player.z + fwd.z * 0.45; g.g.position.x += (tx - g.g.position.x) * Math.min(1, dt * 14); g.g.position.z += (tz - g.g.position.z) * Math.min(1, dt * 14); g.g.position.y = 0.0; g.g.rotation.y = Math.atan2(player.x - g.g.position.x, player.z - g.g.position.z);
    g.targetAlpha = L.t < 0.3 ? 1 : 0; g.hit = 0;
    if (L.t > 0.9) { fx.emit(g.g.position.clone().setY(1.3), { count: 40, color: g.T.color, speed: 3, life: 1, size: 0.15 }); g.remove(); lurker = null; }
  }
}
function updateDirector(dt) {
  if (cur.done) return;
  dir.scare -= dt; dir.lights -= dt; dir.amb -= dt;
  if (!lurker && dir.scare <= 0 && !P.boss) { dir.scare = P.scareEvery * rand(0.7, 1.3); spawnLurker(); }
  if (dir.lights <= 0 && world.powerTarget > 0.5 && !P.boss) { dir.lights = rand(30, 55) * (1.2 - P.t * 0.5); if (Math.random() < P.lightsOutChance) { world.powerTarget = 0; dir.lightsOn = rand(3.5, 6.5); sfx.thud(0.8, 60); sfx.zap(0.25); setTimeout(() => sfx.wail(0.35), 900); toast('…the power is out…', 1600); ghosts.forEach(g => { if (g.state !== 'dying') g.state = 'chase'; }); } }
  if (dir.lightsOn > 0) { dir.lightsOn -= dt; if (dir.lightsOn <= 0) world.powerTarget = 1; }
  if (dir.amb <= 0) { dir.amb = rand(6, 14); const r = Math.random(); if (r < 0.3) sfx.whisper(0.25); else if (r < 0.5) sfx.scream(0.12, rand(0.7, 1.3)); else if (r < 0.7) sfx.thud(0.3, 50); else if (r < 0.85) sfx.wail(0.12); else sfx.door(0.25); }
}

/* ---------- player ---------- */
const keyHeld = c => !!input.keys[c];
function updatePlayer(dt) {
  const [lx, ly] = input.consumeLook(); player.yaw -= lx; player.pitch = clamp(player.pitch - ly, -1.35, 1.35);
  const mv = input.moveVec();
  if (input.was('run')) player.run = !player.run;
  const wantRun = (keyHeld('ShiftLeft') || keyHeld('ShiftRight') || player.run) && (mv.x || mv.y);
  const running = wantRun && player.st > 0.05;
  player.st = clamp(player.st + (running ? -dt * (0.22 - upg('speed') * 0.02) : dt * 0.18), 0, 1); if (player.st <= 0.05) player.run = false;
  const sp = player.speed * (running ? 1.6 : 1);
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw);
  const tx = (-s * -mv.y + c * mv.x) * sp, tz = (-c * -mv.y - s * mv.x) * sp;
  player.vx += (tx - player.vx) * Math.min(1, dt * 10); player.vz += (tz - player.vz) * Math.min(1, dt * 10);
  const p = v3.set(player.x + player.vx * dt, 0, player.z + player.vz * dt); world.collide(p, 0.32); world.collide(p, 0.32);
  const moved = Math.hypot(p.x - player.x, p.z - player.z); player.x = p.x; player.z = p.z;
  player.bob += moved * (running ? 2.6 : 3.2); player.stepD += moved; if (player.stepD > (running ? 0.85 : 0.7)) { player.stepD = 0; sfx.step(running ? 0.22 : 0.14); }
  const bobY = Math.sin(player.bob) * 0.045 * Math.min(1, moved / dt / 3);
  camera.position.set(player.x, 1.62 + bobY, player.z); camera.rotation.set(player.pitch, player.yaw, 0);
  torchModel.position.set(0.26 + Math.cos(player.bob * 0.5) * 0.01, -0.24 + bobY * 0.4, -0.42);
  // medkit
  if ((input.was('med') || input.was('KeyQ')) && player.med > 0 && player.hp < player.maxHp) { player.med--; player.hp = Math.min(player.maxHp, player.hp + 50); sfx.pickup(0.5); toast('+50 HEALTH', 1000); }
  // flashlight & beam
  const firing = (input.held('fire') || keyHeld('Space')) && player.bat > 0;
  const lowBat = player.bat / player.maxBat;
  const drain = firing ? 9 * (1 - upg('battery') * 0.08) : 0.55 * (1 - upg('battery') * 0.08);
  player.bat = Math.max(0, player.bat - drain * dt);
  let I = firing ? 70 : 30 * (0.35 + 0.65 * Math.min(1, lowBat * 3));
  if (lowBat < 0.15 && Math.random() < 0.08) I *= 0.1; if (world.powerTarget < 0.5 && Math.random() < 0.03) I *= 0.2; if (player.bat <= 0) I = Math.random() < 0.1 ? 3.5 : 1;
  // near-surface dimming so the torch doesn't blow out when hugging walls/props
  { const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), cp = Math.cos(player.pitch); let d = 6;
    for (const c of world.colliders) { if (!c.on) continue; const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2; if (Math.abs(cx - player.x) > 7 || Math.abs(cz - player.z) > 7) continue;
      let t0 = 0, t1 = 6; for (const [o, dd, a, b] of [[player.x, fx, c.x0, c.x1], [player.z, fz, c.z0, c.z1]]) { if (Math.abs(dd) < 1e-5) { if (o < a || o > b) { t0 = 9; break; } continue; } let ta = (a - o) / dd, tb = (b - o) / dd; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
      if (t0 <= t1 && t0 < d) d = t0; }
    d = d / Math.max(0.2, cp); if (player.pitch < -0.05) d = Math.min(d, 1.62 / Math.sin(-player.pitch)); if (player.pitch > 0.05) d = Math.min(d, (WALL_H - 1.62) / Math.sin(player.pitch));
    I *= clamp(Math.pow(d / 3.6, 1.6), 0.08, 1); }
  torch.intensity += (I - torch.intensity) * Math.min(1, dt * 18);
  torch.color.set(firing ? 0xb98aff : 0xfff1dc); torch.angle = firing ? 0.3 : 0.46;
  beamMat.uniforms.uColor.value.set(firing ? 0xa070ff : 0xfff0d8); beamMat.uniforms.uI.value = (firing ? 0.035 : 0.0) * (torch.intensity / 30); beam.visible = firing; beamMat.uniforms.uTime.value += dt; beam.scale.set(firing ? 0.68 : 1, firing ? 0.68 : 1, 1);
  torchModel.lens.material.color.setRGB(firing ? 2 : 3, firing ? 1 : 2.8, firing ? 4 : 2.5).multiplyScalar(torch.intensity / 30);
  if (firing) {
    if (Math.random() < dt * 14) sfx.click(rand(5000, 8000), 0.03);
    camera.getWorldDirection(fwd);
    const dps = 55 * (1 + upg('beam') * 0.25);
    const test = (center, rad, obj) => { v3.copy(center).sub(camera.position); const d = v3.length(); if (d > 14) return false; const ang = Math.acos(clamp(v3.dot(fwd) / d, -1, 1)); if (ang > 0.2 + rad / d) return false; if (!world.los(camera.position.x, camera.position.z, center.x, center.z)) return false; obj.damage(dps * dt, ctx); if (Math.random() < 0.5) fx.emit(center, { count: 2, color: 0xc28bff, color2: 0xffffff, speed: 2.5, life: 0.5, size: 0.12, jitter: 0.5 }); return true; };
    let any = false; for (const g of ghosts) if (g.state !== 'dying' && g.alpha > 0.2) any = test(g.g.position.clone().setY(1.3), 0.35, g) || any;
    if (boss && boss.state !== 'dying') any = test(boss.center(), 0.7, boss) || any;
    if (lurker && lurker.phase === 'lurk') { v3.copy(lurker.g.g.position).sub(camera.position); }
    $('#cross').classList.toggle('hit', any);
  } else $('#cross').classList.remove('hit');
}

/* ---------- interactions & pickups ---------- */
let promptVis = false;
function updateInteract(dt) {
  const useHeld = keyHeld('KeyE') || input.held('use');
  let prompt = null, prog = 0;
  for (const p of pickups) {
    p.update(dt); if (p.taken) continue; const d = Math.hypot(p.g.position.x - player.x, p.g.position.z - player.z);
    if (d < (p.kind === 'coin' ? 1.0 : 1.2)) {
      p.taken = true; p.remove();
      if (p.kind === 'key') { cur.keys++; sfx.pickup(0.6); toast(`🔑 KEY ${cur.keys}/${P.keys}`, 1400); fx.emit(p.g.position.clone().setY(0.8), { count: 30, color: 0xffc040, speed: 2.5, life: 0.8, size: 0.1 }); checkObjectives(); }
      else if (p.kind === 'battery') { player.bat = Math.min(player.maxBat, player.bat + player.maxBat * 0.45); sfx.pickup(0.35); toast('+ UV BATTERY', 900); }
      else if (p.kind === 'medkit') { player.med++; sfx.pickup(0.35); toast('+ MEDKIT', 900); }
      else if (p.kind === 'coin') { cur.coins += 5; sfx.click(2200, 0.15); }
      else if (p.kind === 'note') { const n = $('#note'); n.textContent = p.text; n.style.display = 'block'; clearTimeout(n._t); n._t = setTimeout(() => n.style.display = 'none', 5200); sfx.click(600, 0.2); }
    }
  }
  pickups = pickups.filter(p => !p.taken);
  for (const pt of patients) {
    pt.update(dt); if (pt.saved) continue; const d = Math.hypot(pt.pos.x - player.x, pt.pos.z - player.z);
    if (d < 1.8) { prompt = `${isTouch ? 'Hold USE' : 'Hold E'} to free the patient`; if (useHeld) { pt.progress += dt / 1.6; if (Math.random() < dt * 3) sfx.click(400, 0.1); } else pt.progress = Math.max(0, pt.progress - dt); prog = pt.progress;
      if (pt.progress >= 1) { pt.rescue(); cur.pat++; sfx.pickup(0.6); toast(`PATIENT RESCUED ${cur.pat}/${P.patients}`, 1500); fx.emit(pt.pos.clone().setY(1), { count: 60, color: 0x80ffff, color2: 0xffffff, speed: 3, up: 1.5, life: 1.2, size: 0.12 }); checkObjectives(); } }
  }
  for (const f of fuses) {
    f.update(dt); if (f.on) continue; const d = Math.hypot(f.pos.x - player.x, f.pos.z - player.z);
    if (d < 1.9) { prompt = `${isTouch ? 'Hold USE' : 'Hold E'} to pull the fuse lever`; if (useHeld) f.progress += dt / 1.0; else f.progress = 0; prog = f.progress;
      if (f.progress >= 1) { f.activate(); cur.fus++; sfx.zap(0.4); sfx.door(0.4); screen.shake(0.25); toast(`⚡ FUSE ${cur.fus}/${P.fuses}`, 1300); fx.emit(f.pos.clone(), { count: 40, color: 0xffe080, color2: 0x80c0ff, speed: 5, gravity: 6, life: 0.7, size: 0.06 }); checkObjectives(); } }
  }
  const pe = $('#prompt'); if (prompt) { if (!promptVis) { pe.style.display = 'block'; promptVis = true; } $('#promptTxt').textContent = prompt; $('#promptBar').style.width = `${clamp(prog, 0, 1) * 100}%`; } else if (promptVis) { pe.style.display = 'none'; promptVis = false; }
  // exit
  if (cur.exitOpen && !cur.done) { const e = world.exit.pos; if (Math.hypot(e.x - player.x, e.z - player.z) < 1.4) { cur.done = true; screen.doFlash(1, 0xc0ffd0); setTimeout(() => endLevel(true), 400); } }
}

/* ---------- HUD ---------- */
const mm = $('#minimap').getContext('2d'); let mmT = 0, hudT = 0;
const emfLeds = [...document.querySelectorAll('.emf i')];
function updateHUD(dt) {
  hudT -= dt; if (hudT > 0) return; hudT = 0.08;
  $('#hpBar').style.width = `${player.hp / player.maxHp * 100}%`; $('#batBar').style.width = `${player.bat / player.maxBat * 100}%`; $('#stBar').style.width = `${player.st * 100}%`;
  $('#lvlLbl').textContent = `LEVEL ${cur.L}`; $('#coinHud').textContent = `◉ ${save.coins + cur.coins}`; $('#medHud').textContent = `✚ ${player.med}`; $('#objective').textContent = objectiveText();
  if (boss) $('#bossHp').style.width = `${boss.hp / boss.maxHp * 100}%`;
  // EMF
  let nd = 99; for (const g of ghosts) if (g.state !== 'dying') nd = Math.min(nd, Math.hypot(g.g.position.x - player.x, g.g.position.z - player.z)); if (boss) nd = Math.min(nd, Math.hypot(boss.g.position.x - player.x, boss.g.position.z - player.z)); if (lurker) nd = 1;
  const lv = nd < 3 ? 5 : nd < 6 ? 4 : nd < 9 ? 3 : nd < 13 ? 2 : nd < 18 ? 1 : 0; emfLeds.forEach((e, i) => e.classList.toggle('on', i < lv));
  dir.emf -= 0.08; if (lv >= 3 && dir.emf <= 0) { dir.emf = 1.2 - lv * 0.18; sfx.click(rand(80, 160), 0.06 * lv); }
  dir.heart -= 0.08; if ((player.hp / player.maxHp < 0.35 || lv >= 4) && dir.heart <= 0) { dir.heart = player.hp / player.maxHp < 0.35 ? 0.8 : 1.1; sfx.heartbeat(0.45); }
  // minimap
  const W = world.W, H = world.H, S = 140 / Math.max(W, H), ox = 5 + (140 - W * S) / 2, oy = 5 + (140 - H * S) / 2;
  mm.clearRect(0, 0, 150, 150);
  const cr = world.roomAt(player.x, player.z); if (cr) cr.visited = true;
  for (const r of world.allRooms()) { if (!r.visited) continue; mm.fillStyle = r === cr ? 'rgba(120,110,150,.55)' : 'rgba(80,80,90,.45)'; mm.fillRect(ox + r.i * ROOM * S + 1, oy + r.j * ROOM * S + 1, ROOM * S - 2, ROOM * S - 2);
    mm.fillStyle = 'rgba(80,80,90,.45)'; if (r.conn.e) mm.fillRect(ox + (r.i + 1) * ROOM * S - 2, oy + (r.j + 0.4) * ROOM * S, 4, ROOM * S * 0.2); if (r.conn.s) mm.fillRect(ox + (r.i + 0.4) * ROOM * S, oy + (r.j + 1) * ROOM * S - 2, ROOM * S * 0.2, 4); }
  const dot = (x, z, c, rr = 3) => { mm.fillStyle = c; mm.beginPath(); mm.arc(ox + x * S, oy + z * S, rr, 0, 7); mm.fill(); };
  const vis = (x, z) => world.roomAt(x, z)?.visited;
  for (const p of pickups) if (p.kind === 'key' && vis(p.g.position.x, p.g.position.z)) dot(p.g.position.x, p.g.position.z, '#ffc940');
  for (const p of patients) if (!p.saved && vis(p.pos.x, p.pos.z)) dot(p.pos.x, p.pos.z, '#60e0ff');
  for (const f of fuses) if (vis(f.pos.x, f.pos.z)) dot(f.pos.x, f.pos.z, f.on ? '#40ff70' : '#ff9a30');
  if (vis(world.exit.pos.x, world.exit.pos.z) || cur.exitOpen) dot(world.exit.pos.x, world.exit.pos.z, cur.exitOpen ? '#40ff70' : '#ff3030', 4);
  const rad = upg('radar') ? 12 + upg('radar') * 6 : 0;
  if (rad) { for (const g of ghosts) if (g.state !== 'dying' && Math.hypot(g.g.position.x - player.x, g.g.position.z - player.z) < rad) dot(g.g.position.x, g.g.position.z, '#ff4a6a', 2.5); }
  if (boss) dot(boss.g.position.x, boss.g.position.z, '#ff2020', 4);
  mm.save(); mm.translate(ox + player.x * S, oy + player.z * S); mm.rotate(-player.yaw); mm.fillStyle = '#fff'; mm.beginPath(); mm.moveTo(0, -6); mm.lineTo(4, 4); mm.lineTo(-4, 4); mm.closePath(); mm.fill(); mm.restore();
}

/* ---------- title scene ---------- */
let titleT = 0;
function setupTitle() { buildLevel(7, true); world.allRooms().forEach(r => r.visited = true); ghosts.forEach((g, i) => { g.g.position.set(world.start.cx + 2.5 - i, 0, world.start.cz - 2.6); }); }

/* ---------- main loop ---------- */
let last = performance.now(), acc = 0, fpsT = 0, frames = 0, fps = 60;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  if (!world) return;
  if (state === 'playing') {
    cur.time += dt;
    updatePlayer(dt);
    world.update(dt, player, { doorSlam: d => { sfx.door(1); screen.shake(0.5); toast('THE DOOR LOCKED!', 1300); setTimeout(() => sfx.whisper(0.4), 500); }, doorOpen: () => sfx.door(0.3) });
    for (const g of ghosts) g.update(dt, ctx); ghosts = ghosts.filter(g => !g.dead);
    if (boss) { boss.update(dt, ctx); }
    for (const s of scalpels) { const prev = s.m.position.clone(); s.update(dt); if (s.dead) continue; if (!world.los(prev.x, prev.z, s.m.position.x, s.m.position.z)) { fx.emit(s.m.position, { count: 12, color: 0xffd0a0, speed: 4, gravity: 8, life: 0.4, size: 0.05 }); s.kill(); sfx.click(4000, 0.1); continue; } if (s.m.position.distanceTo(v3.set(player.x, 1.4, player.z)) < 0.6) { s.kill(); ctx.bossHit(10 + P.t * 8); } }
    scalpels = scalpels.filter(s => !s.dead);
    if (lurker) updateLurker(dt);
    if (input.was('pause')) pause();
    updateDirector(dt); updateInteract(dt); updateHUD(dt);
    // flicker the torch with lights-out for drama, color grade with health
    gfx.grade.uniforms.uDesat.value = 0.25 + (1 - player.hp / player.maxHp) * 0.5;
  } else if (state === 'title' || state === 'levels' || state === 'shop' || state === 'settings') {
    titleT += dt; const s = world.start;
    player.x = s.cx; player.z = s.cz + 2; player.yaw = Math.sin(titleT * 0.15) * 0.5; player.pitch = -0.05 + Math.sin(titleT * 0.23) * 0.05;
    camera.position.set(player.x, 1.6, player.z); camera.rotation.set(player.pitch, player.yaw, 0);
    world.update(dt, player, {}); for (const g of ghosts) { g.t += dt; g.mat.uniforms.uTime.value = g.headMat.uniforms.uTime.value = g.t; g.alpha = 0.55 + 0.45 * Math.sin(g.t * 0.8); g.mat.uniforms.uAlpha.value = g.headMat.uniforms.uAlpha.value = g.alpha; g.g.position.y = 0.15 + Math.sin(g.t * 2) * 0.1; g.g.rotation.y = Math.atan2(player.x - g.g.position.x, player.z - g.g.position.z); g.arms.forEach((a, i) => a.rotation.x = -0.9 + Math.sin(g.t * 2 + i) * 0.2); }
    for (const p of pickups) p.update(dt); for (const p of patients) p.update(dt);
    torch.intensity = 24; beam.visible = false; if (Math.random() < 0.004) { screen.doFlash(0.15, 0xffffff); }
  }
  // dust motes follow camera
  const cp = camera.position; for (let i = 0; i < DUST; i++) { let x = dustPos[i * 3] + Math.sin(t * 0.3 + i) * 0.002, y = dustPos[i * 3 + 1] - 0.002, z = dustPos[i * 3 + 2]; if (x - cp.x > 6) x -= 12; if (x - cp.x < -6) x += 12; if (z - cp.z > 6) z -= 12; if (z - cp.z < -6) z += 12; if (y < 0) y += WALL_H; dustPos[i * 3] = x; dustPos[i * 3 + 1] = y % WALL_H; dustPos[i * 3 + 2] = z; } dustGeo.attributes.position.needsUpdate = true;
  fx.update(dt); blood.update(dt);
  screen.update(dt, camera);
  gfx.render(t);
  input.endFrame();
  frames++; fpsT += dt; if (fpsT > 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
}

/* ---------- boot ---------- */
setupTitle(); refreshCoins();
requestAnimationFrame(t => { last = t; frame(t); });
setTimeout(() => { const l = $('#loading'); l.style.opacity = 0; setTimeout(() => l.remove(), 700); }, 300);
// test/debug hook
window.__gh = { get state() { return state; }, get player() { return player; }, get cur() { return cur; }, get world() { return world; }, get ghosts() { return ghosts; }, get boss() { return boss; }, get fps() { return fps; }, startLevel, input, save: () => save, endLevel, spawnLurker, camera, scene, ghostClose() { const g = ghosts[0]; if (!g) return; g.g.position.set(player.x - Math.sin(player.yaw) * 2.2, 0.15, player.z - Math.cos(player.yaw) * 2.2); g.state = 'chase'; g.alpha = 1; }, frameOnce: null, get pickups() { return pickups; }, get patients() { return patients; }, get fuses() { return fuses; }, tp(x, z) { player.x = x; player.z = z; }, ctx, gfx, THREE };
