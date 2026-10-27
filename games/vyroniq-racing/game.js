// VYRONIQ RACING. Original open-wheel racing game. Three.js r186 vendored in ./vendor (MIT, see vendor/THREE-LICENSE.txt)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
(() => {
// ---------------------------------------------------------------- helpers
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const mod = (a, n) => ((a % n) + n) % n;
const smooth = t => t * t * (3 - 2 * t);
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const fmtLap = s => { if (!isFinite(s) || s <= 0) return '--:--.---'; const m = Math.floor(s / 60), r = s - m * 60; return `${m}:${r < 10 ? '0' : ''}${r.toFixed(3)}`; };
const fmtDelta = d => (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(3);
const fmtCoins = n => Math.round(n).toLocaleString('en-US');
const ordinal = n => n + (['th', 'st', 'nd', 'rd'][(n % 100 - 20) % 10] || ['th', 'st', 'nd', 'rd'][n % 100] || 'th');
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const isTouchDev = () => ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function mk(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }

// ---------------------------------------------------------------- settings (device-local)
const prefersRM = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const SET_KEY = 'vyroniq-settings-v1';
const defaults = {
  gfx: 'auto', sound: true, volume: 0.8, music: false,
  hc: false, cb: false, rm: prefersRM, announce: true, sens: 1, tilt: false, btnSize: 'm', leftHanded: false, touch: 'auto',
  tc: true, abs: true, line: true, autoGear: true, steerAssist: true, driftTap: true, autoLaunch: false, camera: 'chase', units: 'kmh'
};
let settings = Object.assign({}, defaults);
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { }
const saveSettings = () => { try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch (e) { } };
// ---------------------------------------------------------------- cars (all fictional)
const CARS = [
  { id: 'kestrel', name: 'Kestrel F4', cls: 'D', price: 0, top: 238, a0: 9.0, grip: 1.25, brake: 13, df: 0.35, w: 620, boost: 1.0,
    desc: 'Forgiving starter single-seater. Stable under braking and easy to catch when it slides.', liv: { p: '#ff6a1a', s: '#14161c', a: '#ffffff', pat: 'arrow' } },
  { id: 'vanta', name: 'Vanta R2', cls: 'C', price: 15000, top: 258, a0: 10.0, grip: 1.32, brake: 15, df: 0.5, w: 600, boost: 1.05,
    desc: 'A sharper regional racer with a bigger rear wing and more punch out of slow corners.', liv: { p: '#1e6bff', s: '#f2f4f7', a: '#ffd23f', pat: 'stripe' } },
  { id: 'strata', name: 'Strata FX', cls: 'B', price: 60000, top: 278, a0: 11.2, grip: 1.4, brake: 17, df: 0.7, w: 590, boost: 1.1,
    desc: 'Ground-effect floor and carbon brakes. Rewards late braking and smooth throttle.', liv: { p: '#11b37a', s: '#0d1f1a', a: '#c6ff3d', pat: 'split' } },
  { id: 'zephyr', name: 'Zephyr XR', cls: 'A', price: 200000, top: 302, a0: 12.4, grip: 1.48, brake: 19, df: 0.9, w: 575, boost: 1.15,
    desc: 'High-downforce chassis that turns in hard at speed. Twitchy on cold or worn tyres.', liv: { p: '#e8e8ee', s: '#c8102e', a: '#14161c', pat: 'halo' } },
  { id: 'vyron', name: 'Vyron Apex S', cls: 'S', price: 600000, top: 330, a0: 13.8, grip: 1.56, brake: 21, df: 1.1, w: 560, boost: 1.2,
    desc: 'The flagship hybrid prototype: savage acceleration, huge downforce and a strong energy system.', liv: { p: '#7b2cff', s: '#0b0b12', a: '#00e5ff', pat: 'arrow' } }
];
const CAR = id => CARS.find(c => c.id === id) || CARS[0];
const LIVERY_COLORS = ['#ff6a1a', '#c8102e', '#ff3d8b', '#7b2cff', '#1e6bff', '#00b8d9', '#11b37a', '#c6ff3d', '#ffd23f', '#f2f4f7', '#8a8f99', '#14161c'];
const PATTERNS = [['solid', 'Solid'], ['stripe', 'Centre stripe'], ['split', 'Two-tone split'], ['arrow', 'Arrow nose'], ['halo', 'Halo band']];

// ---------------------------------------------------------------- upgrades
const UPG_COST = [1000, 2000, 4000, 8000, 15000, 25000, 40000, 60000, 90000, 130000];
const UPGRADES = [
  { id: 'engine', name: 'Engine', desc: 'More power: acceleration and top speed.', fx: { a0: 0.02, top: 0.006 } },
  { id: 'fwing', name: 'Front wing', desc: 'Sharper turn-in and more front grip.', fx: { grip: 0.008, turn: 0.02 } },
  { id: 'rwing', name: 'Rear wing', desc: 'More downforce for fast corners, slightly more drag.', fx: { df: 0.04, top: -0.0015 } },
  { id: 'tyres', name: 'Tyres', desc: 'Grippier construction that also wears more slowly.', fx: { grip: 0.006, wear: -0.05 } },
  { id: 'brakes', name: 'Brakes', desc: 'Shorter braking distances and less lock-up.', fx: { brake: 0.03 } },
  { id: 'susp', name: 'Suspension', desc: 'More mechanical grip, better over kerbs and grass.', fx: { grip: 0.004, offPen: -0.04 } },
  { id: 'gearbox', name: 'Gearbox', desc: 'Quicker shifts and better acceleration.', fx: { a0: 0.012, shift: -0.06 } },
  { id: 'energy', name: 'Energy system', desc: 'Stronger boost that recharges faster.', fx: { boost: 0.04, recharge: 0.06 } }
];
// final car stats = base x upgrades (shared by the player and the stat preview)
function carStats(carId, upg) {
  const c = CAR(carId), u = upg || {}, s = { top: c.top, a0: c.a0, grip: c.grip, brake: c.brake, df: c.df, w: c.w, boost: c.boost, turn: 1, wear: 1, offPen: 1, shift: 1, recharge: 1 };
  for (const U of UPGRADES) { const L = u[U.id] || 0; for (const k in U.fx) s[k] *= (1 + U.fx[k] * L); }
  return s;
}
// 0-100 ratings for the UI
function ratings(s) {
  return {
    'Top speed': clamp((s.top - 200) / 1.6, 0, 100), 'Acceleration': clamp((s.a0 - 7) * 11, 0, 100), 'Cornering': clamp((s.grip * s.turn - 1.1) * 160, 0, 100),
    'Braking': clamp((s.brake - 10) * 7, 0, 100), 'Downforce': clamp(s.df * 70, 0, 100), 'Weight': clamp((680 - s.w) * 0.8, 0, 100)
  };
}

// ---------------------------------------------------------------- circuits (original, fictional)
const CIRCUITS = [
  { id: 'vgp', name: 'Velocity GP', theme: 'modern', width: 14, runoff: 20, night: false,
    desc: 'A modern grand-prix venue with two long straights, a technical infield and big braking zones.',
    pts: [[0, 0], [500, 0], [950, 0], [1050, 60], [1060, 180], [980, 260], [860, 280], [760, 360], [740, 500], [820, 620], [980, 680], [1150, 720], [1250, 850], [1200, 980], [1050, 1020], [700, 1000], [350, 1000], [150, 950], [60, 860], [100, 740], [220, 650], [260, 520], [180, 420], [40, 380], [-80, 300], [-120, 150], [-80, 40]],
    sky: { top: [40, 104, 200], bot: [196, 222, 246], sun: [255, 244, 214] }, sunEl: 48, sunAz: 0.7, ground: [86, 150, 70], ground2: [120, 170, 90], far: [120, 140, 170] },
  { id: 'nh', name: 'Neon Harbour', theme: 'city', width: 11, runoff: 6, night: true,
    desc: 'A floodlit night street circuit along the docks: tight 90-degree corners, close walls and neon everywhere.',
    pts: [[0, 0], [400, 0], [440, 40], [440, 200], [400, 240], [250, 240], [220, 270], [220, 420], [260, 460], [520, 460], [560, 500], [560, 640], [520, 680], [100, 680], [60, 640], [60, 520], [20, 480], [-120, 480], [-160, 440], [-160, 300], [-120, 260], [-40, 240], [-10, 200], [-10, 40]],
    sky: { top: [6, 6, 24], bot: [56, 28, 86], sun: [200, 210, 255] }, sunEl: 40, sunAz: -0.6, ground: [40, 42, 52], ground2: [52, 54, 64], far: [30, 24, 60] },
  { id: 'am', name: 'Apex Mountain', theme: 'mountain', width: 12, runoff: 10, night: false,
    desc: 'A fast, flowing ride up and over a mountain ridge: blind crests, a hairpin descent and 70 m of elevation change.',
    pts: [[0, 0, 0], [400, 0, 4], [700, -60, 14], [900, -200, 30], [950, -400, 48], [850, -560, 62], [650, -600, 72], [450, -520, 72], [350, -380, 62], [200, -330, 55], [50, -420, 48], [-80, -560, 40], [-200, -600, 34], [-300, -540, 28], [-260, -420, 22], [-330, -330, 16], [-440, -260, 10], [-400, -120, 5], [-220, -30, 2]],
    sky: { top: [70, 130, 210], bot: [222, 230, 236], sun: [255, 240, 210] }, sunEl: 30, sunAz: 2.2, ground: [70, 126, 62], ground2: [104, 140, 80], far: [110, 122, 150] }
];
const CIRCUIT = id => CIRCUITS.find(c => c.id === id) || CIRCUITS[0];

// ---------------------------------------------------------------- drivers & teams (fictional)
const DRIVERS = [
  { id: 'd1', name: 'Kai Moreno', team: 'Solstice Racing', col: '#ffb000', col2: '#141414', skill: 0.97, aggr: 0.7 },
  { id: 'd2', name: 'Lena Voss', team: 'Nordwind Motorsport', col: '#3fb6ff', col2: '#ffffff', skill: 0.95, aggr: 0.5 },
  { id: 'd3', name: 'Ravi Kapoor', team: 'Indigo Apex', col: '#3a2bd6', col2: '#ff9a1f', skill: 0.93, aggr: 0.6 },
  { id: 'd4', name: 'Mika Lindqvist', team: 'Polar Engineering', col: '#e8f4ff', col2: '#1c8cff', skill: 0.92, aggr: 0.4 },
  { id: 'd5', name: 'Tomas Reyes', team: 'Rojo Velocidad', col: '#d1162b', col2: '#ffd23f', skill: 0.9, aggr: 0.85 },
  { id: 'd6', name: 'Yuki Sato', team: 'Kaze Works', col: '#ffffff', col2: '#e0162b', skill: 0.89, aggr: 0.55 },
  { id: 'd7', name: 'Ada Okafor', team: 'Verdant GP', col: '#0f9d58', col2: '#f5f5f5', skill: 0.88, aggr: 0.65 },
  { id: 'd8', name: 'Felix Brandt', team: 'Graphite Dynamics', col: '#4a4f5a', col2: '#c6ff3d', skill: 0.86, aggr: 0.5 },
  { id: 'd9', name: 'Noor Haddad', team: 'Mirage Racing', col: '#c9a227', col2: '#101010', skill: 0.85, aggr: 0.75 }
];
const DIFFICULTY = { easy: { pace: 0.86, mistake: 0.05, react: 0.5 }, medium: { pace: 0.93, mistake: 0.025, react: 0.3 }, hard: { pace: 0.985, mistake: 0.01, react: 0.15 } };

// ---------------------------------------------------------------- tyres & weather
const TYRES = {
  soft: { name: 'Soft', short: 'S', col: '#ff3b3b', grip: 1.07, wear: 1.7, wet: 0.72 },
  medium: { name: 'Medium', short: 'M', col: '#ffd23f', grip: 1.0, wear: 1.0, wet: 0.74 },
  hard: { name: 'Hard', short: 'H', col: '#f2f2f2', grip: 0.94, wear: 0.6, wet: 0.72 },
  wet: { name: 'Wet', short: 'W', col: '#2f8cff', grip: 0.86, wear: 1.5, wet: 0.95 }
};

// ---------------------------------------------------------------- economy rules
const POS_REWARD = [2500, 1500, 1000, 750, 500, 400, 300, 200, 150, 100];
const FINISH_BONUS = 300, LAP_RECORD_BONUS = 250, DAILY_CHALLENGE_REWARD = 500, CHAMPION_BONUS = 15000;
const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
const CHAMPIONSHIPS = [
  { id: 'rookie', name: 'Rookie Cup', req: 0, diff: 'easy', classes: ['D'], desc: 'Three short races to learn the circuits. Free entry.',
    rounds: [{ c: 'vgp', laps: 3, weather: 'dry' }, { c: 'nh', laps: 3, weather: 'dry' }, { c: 'am', laps: 3, weather: 'dry' }] },
  { id: 'regional', name: 'Regional Formula Series', req: 5000, diff: 'medium', classes: ['C', 'D', 'C', 'B'], desc: 'Four rounds against quicker cars, including a wet race. Unlocks after earning 5,000 V-Coins in total.',
    rounds: [{ c: 'nh', laps: 4, weather: 'dry' }, { c: 'am', laps: 4, weather: 'rain' }, { c: 'vgp', laps: 4, weather: 'dry' }, { c: 'nh', laps: 5, weather: 'dry' }] },
  { id: 'advanced', name: 'Advanced Formula Championship', req: 25000, diff: 'hard', classes: ['A', 'B', 'S', 'A'], desc: 'Five longer rounds against the best. Unlocks after earning 25,000 V-Coins in total.',
    rounds: [{ c: 'vgp', laps: 5, weather: 'dry' }, { c: 'am', laps: 5, weather: 'rain' }, { c: 'nh', laps: 5, weather: 'dry' }, { c: 'am', laps: 5, weather: 'dry' }, { c: 'vgp', laps: 6, weather: 'dry' }] }
];
const DAILY_POOL = [
  { id: 'podiumNH', text: 'Finish on the podium at Neon Harbour (any mode except Time Trial).', test: r => r.circuit === 'nh' && r.pos <= 3 },
  { id: 'winMed', text: 'Win a race on Medium or Hard difficulty.', test: r => r.pos === 1 && r.diff !== 'easy' },
  { id: 'wetTop5', text: 'Finish a wet race in the top 5.', test: r => r.weather === 'rain' && r.pos <= 5 },
  { id: 'cleanAM', text: 'Complete a clean lap (inside track limits) at Apex Mountain.', test: r => r.circuit === 'am' && r.cleanLaps > 0 },
  { id: 'overtake5', text: 'Gain 5 or more places from your grid slot in one race.', test: r => r.grid - r.pos >= 5 },
  { id: 'boost4', text: 'Use the energy boost 4 times in one race.', test: r => r.boosts >= 4 },
  { id: 'podiumVGP', text: 'Finish in the top 3 at Velocity GP.', test: r => r.circuit === 'vgp' && r.pos <= 3 }
];
const dailyChallenge = () => { let h = 0; for (const ch of todayKey()) h = (h * 31 + ch.charCodeAt(0)) | 0; return DAILY_POOL[Math.abs(h) % DAILY_POOL.length]; };

// ---------------------------------------------------------------- profile + V-Coins (localStorage, with transaction log)
const PROF_KEY = 'vyroniq-profile-v1';
function newProfile() {
  return { v: 1, coins: 0, earned: 0, spent: 0, owned: ['kestrel'], car: 'kestrel', liveries: {}, upg: {}, tx: [], records: {}, career: {},
    stats: { races: 0, wins: 0, podiums: 0, laps: 0, km: 0, best: 0, ttLaps: 0, champs: 0 }, daily: { login: '', streak: 0, chDate: '', chDone: false }, created: Date.now() };
}
let profile = newProfile();
function loadProfile() {
  try { const p = JSON.parse(localStorage.getItem(PROF_KEY) || 'null'); if (p && p.v === 1) profile = Object.assign(newProfile(), p); } catch (e) { }
  if (!profile.tx.length && profile.coins === 0) addCoins(1000, 'Welcome bonus');
}
function saveProfile() { try { localStorage.setItem(PROF_KEY, JSON.stringify(profile)); } catch (e) { console.warn('save failed', e); } }
function addCoins(n, why) {
  n = Math.round(n); if (!n) return; profile.coins += n; if (n > 0) profile.earned += n; else profile.spent += -n;
  profile.tx.unshift({ t: Date.now(), amt: n, why, bal: profile.coins }); if (profile.tx.length > 200) profile.tx.length = 200; saveProfile();
}
function spendCoins(n, why) { if (n > profile.coins || n <= 0) return false; addCoins(-n, why); return true; }
const liveryOf = id => profile.liveries[id] || Object.assign({}, CAR(id).liv);
const upgOf = id => profile.upg[id] || (profile.upg[id] = {});
function dailyLogin() {
  const k = todayKey(); if (profile.daily.login === k) return 0;
  const y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  profile.daily.streak = profile.daily.login === yk ? Math.min(7, profile.daily.streak + 1) : 1; profile.daily.login = k;
  const bonus = 400 + profile.daily.streak * 100; addCoins(bonus, `Daily login bonus (day ${profile.daily.streak} streak)`); return bonus;
}
// ---------------------------------------------------------------- track geometry (closed centripetal Catmull-Rom spline, sampled every ~2 m)
const DS = 2, KERB_W = 1.2, G = 9.81;
let T = null; // current track
function buildTrack(def) {
  const pts = def.pts.map(p => new THREE.Vector3(p[0], p[2] || 0, p[1]));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const len = curve.getLength(), n = Math.round(len / DS), sp = curve.getSpacedPoints(n); sp.pop();
  const X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), H = new Float32Array(n), K = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = sp[i].x; Z[i] = sp[i].z; Y[i] = sp[i].y; }
  // smooth elevation
  for (let pass = 0; pass < 3; pass++) { const y2 = Y.slice(); for (let i = 0; i < n; i++) { let s = 0; for (let k = -10; k <= 10; k++) s += y2[mod(i + k, n)]; Y[i] = s / 21; } }
  for (let i = 0; i < n; i++) { const a = mod(i - 1, n), b = mod(i + 1, n); H[i] = Math.atan2(X[b] - X[a], Z[b] - Z[a]); }
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  for (let i = 0; i < n; i++) K[i] = wrapA(H[mod(i + 2, n)] - H[mod(i - 2, n)]) / (4 * DS);
  const Ks = gauss(K, 8), w = def.width, hw = w / 2;
  // racing line: outside -> apex (inside) -> outside
  const RL = new Float32Array(n), m = 28;
  for (let i = 0; i < n; i++) RL[i] = (hw - 1.6) * clamp((-Ks[i] * 1.0 + 0.55 * (Ks[mod(i + m, n)] + Ks[mod(i - m, n)])) / 0.006, -1, 1);
  const RLs = gauss(RL, 10);
  // racing line path curvature (used for the AI speed profile)
  const RX = new Float32Array(n), RZ = new Float32Array(n);
  for (let i = 0; i < n; i++) { const rx = -Math.cos(H[i]), rz = Math.sin(H[i]); RX[i] = X[i] + rx * RLs[i]; RZ[i] = Z[i] + rz * RLs[i]; }
  const RH = new Float32Array(n), RK = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = mod(i - 2, n), b = mod(i + 2, n); RH[i] = Math.atan2(RX[b] - RX[a], RZ[b] - RZ[a]); }
  for (let i = 0; i < n; i++) { const a = mod(i - 3, n), b = mod(i + 3, n), d = Math.hypot(RX[b] - RX[a], RZ[b] - RZ[a]) || 1; RK[i] = wrapA(RH[b] - RH[a]) / d; }
  const RKs = gauss(RK, 4);
  // slope (rise per metre) for gravity
  const SL = new Float32Array(n); for (let i = 0; i < n; i++) SL[i] = (Y[mod(i + 1, n)] - Y[mod(i - 1, n)]) / (2 * DS);
  // kerbs where the corner is tight enough
  const KERB = new Uint8Array(n); for (let i = 0; i < n; i++) if (Math.abs(Ks[i]) > 0.0045) for (let k = -12; k <= 12; k++) KERB[mod(i + k, n)] = 1;
  const pit = { entry: n - (def.id === 'vgp' ? 70 : def.id === 'am' ? 80 : 45), box: def.id === 'nh' ? 70 : 90, exit: def.id === 'vgp' ? 200 : def.id === 'nh' ? 150 : 170, off: hw + def.runoff + 5 };
  // spatial hash for nearest-sample queries
  const cell = 40, grid = new Map(); let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
  for (let i = 0; i < n; i++) { const k = Math.floor(X[i] / cell) + ',' + Math.floor(Z[i] / cell); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(i); minX = Math.min(minX, X[i]); maxX = Math.max(maxX, X[i]); minZ = Math.min(minZ, Z[i]); maxZ = Math.max(maxZ, Z[i]); }
  T = { def, n, len: n * DS, X, Y, Z, H, K: Ks, RL: RLs, RK: RKs, SL, KERB, w, hw, wall: hw + def.runoff, pit, grid, cell, minX, maxX, minZ, maxZ, sector: [Math.floor(n / 3), Math.floor(2 * n / 3)], profiles: new Map() };
  return T;
}
function gauss(A, r) { const n = A.length, o = new Float32Array(n), wts = []; let ws = 0; for (let k = -r * 2; k <= r * 2; k++) { const v = Math.exp(-(k * k) / (2 * r * r)); wts.push(v); ws += v; } for (let i = 0; i < n; i++) { let s = 0; for (let k = -r * 2; k <= r * 2; k++) s += A[mod(i + k, n)] * wts[k + r * 2]; o[i] = s / ws; } return o; }
// nearest sample to (x,z): local search from a hint, else spatial hash
function nearestIdx(x, z, hint) {
  const n = T.n; let best = -1, bd = 1e18;
  if (hint >= 0) { for (let k = -40; k <= 40; k++) { const i = mod(hint + k, n), dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } if (bd < (T.wall + 30) ** 2) return best; }
  const cx = Math.floor(x / T.cell), cz = Math.floor(z / T.cell); bd = 1e18;
  for (let r = 1; r <= 4 && best < 0 || r <= 1; r++) for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const L = T.grid.get((cx + a) + ',' + (cz + b)); if (L) for (const i of L) { const dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } } }
  if (best < 0) for (let i = 0; i < n; i += 2) { const dx = X_(i) - x, dz = Z_(i) - z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = i; } }
  return best;
}
const X_ = i => T.X[i], Z_ = i => T.Z[i];
// lateral offset (+ = right of travel direction) and fractional advance of a point relative to sample i
function trackLocal(i, x, z) { const h = T.H[i], dx = x - T.X[i], dz = z - T.Z[i]; return { lat: dx * -Math.cos(h) + dz * Math.sin(h), fwd: dx * Math.sin(h) + dz * Math.cos(h) }; }
function trackPoint(i, lat, out) { i = mod(i, T.n); const h = T.H[i]; out.x = T.X[i] - Math.cos(h) * lat; out.z = T.Z[i] + Math.sin(h) * lat; out.y = T.Y[i]; out.h = h; return out; }
// per-car-setup cornering speed profile (with braking zones), cached
function speedProfile(stats, mu, decelK) {
  const key = [stats.top, stats.grip, stats.df, stats.brake, mu, decelK].map(v => v.toFixed(3)).join('|');
  if (T.profiles.has(key)) return T.profiles.get(key);
  const n = T.n, V = new Float32Array(n), top = stats.top / 3.6;
  for (let i = 0; i < n; i++) { const k = Math.abs(T.RK[i]) + 1e-6, den = k - G * mu * ARC * stats.df / 3600; V[i] = den <= 0 ? top : Math.min(top, Math.sqrt(G * mu * ARC * stats.grip / den)); }
  for (let pass = 0; pass < 2; pass++) for (let j = n - 1; j >= 0; j--) { const i = j, nx = V[mod(i + 1, n)], dec = Math.min(stats.brake, G * mu * (stats.grip + stats.df * (nx / 60) ** 2)) * decelK; V[i] = Math.min(V[i], Math.sqrt(nx * nx + 2 * dec * DS)); }
  T.profiles.set(key, V); return V;
}
// cornering profile on the centre line (used by the player's steering assist: casual lines are tighter than the racing line)
function assistProfile(stats, mu) {
  const key = 'A|' + [stats.top, stats.grip, stats.df, stats.brake, mu].map(v => v.toFixed(3)).join('|');
  if (T.profiles.has(key)) return T.profiles.get(key);
  const n = T.n, V = new Float32Array(n), top = stats.top / 3.6;
  for (let i = 0; i < n; i++) { let k = 0; for (let d = -4; d <= 4; d++) k = Math.max(k, Math.abs(T.K[mod(i + d, n)])); k = lerp(Math.abs(T.RK[i]), k, 0.8) + 1e-6; const den = k - G * mu * ARC * stats.df / 3600; V[i] = den <= 0 ? top : Math.min(top, Math.sqrt(G * mu * ARC * stats.grip / den)); }
  for (let pass = 0; pass < 2; pass++) for (let j = n - 1; j >= 0; j--) { const nx = V[mod(j + 1, n)], dec = Math.min(stats.brake, G * mu * (stats.grip + stats.df * (nx / 60) ** 2)) * 0.75; V[j] = Math.min(V[j], Math.sqrt(nx * nx + 2 * dec * DS)); }
  T.profiles.set(key, V); return V;
}

// ---------------------------------------------------------------- vehicle physics (arcade-sim, shared by player and AI: no AI cheats)
const ARC = 1.45, WHEELBASE = 3.4, GEAR_R = [0.3, 0.42, 0.53, 0.63, 0.73, 0.82, 0.91, 1.0], CAR_R = 1.0;
const _tp = { x: 0, y: 0, z: 0, h: 0 };
function makeCar(o) {
  return Object.assign({ x: 0, y: 0, z: 0, h: 0, vx: 0, vz: 0, speed: 0, launchT: 0, launchK: 1, vLong: 0, vLat: 0, yaw: 0, steer: 0, throttle: 0, brake: 0, gear: 1, rpm: 4000, shiftT: 0,
    energy: 100, boostT: 0, boostCd: 0, boosts: 0, i: 0, lat: 0, prog: 0, lap: 0, lapStart: 0, lapTimes: [], secStart: 0, sectors: [], lastSectors: [], curSec: 0,
    finished: false, finishTime: 0, off: false, kerb: false, lock: false, spin: false, slip: false, wear: 0, tyre: 'medium', pit: { req: false, state: 0, t: 0, count: 0, nextTyre: null },
    launch: 0, launchMsg: '', cleanLap: true, cleanLaps: 0, contacts: 0, pos: 0, grid: 0, input: { steer: 0, throttle: 0, brake: 0, boost: false, up: false, down: false } }, o);
}
function carMu(c, env) {
  const ty = TYRES[c.tyre] || TYRES.medium;
  let mu = env.rain ? ty.wet : ty.grip; mu *= 1 - 0.2 * Math.pow(c.wear, 1.6);
  if (env.rain && c.tyre === 'wet') mu *= 1; else if (!env.rain && c.tyre === 'wet') mu *= 0.97;
  return mu;
}
function stepCar(c, dt, env) {
  const s = c.stats, inp = c.input, auto = c.isPlayer ? settings : { tc: true, abs: true, steerAssist: true, autoGear: true };
  // ---- pit lane: automated drive at the speed limit
  if (c.pit.state) { stepPit(c, dt, env); return; }
  const f0 = Math.sin(c.h), f1 = Math.cos(c.h), r0 = -Math.cos(c.h), r1 = Math.sin(c.h);
  let vLong = c.vx * f0 + c.vz * f1, vLat = c.vx * r0 + c.vz * r1; const v = Math.hypot(vLong, vLat);
  // surface
  c.i = nearestIdx(c.x, c.z, c.i); const loc = trackLocal(c.i, c.x, c.z); c.lat = loc.lat;
  const al = Math.abs(c.lat); c.kerb = al > T.hw - 0.2 && al <= T.hw + KERB_W && T.KERB[c.i] === 1; c.off = al > T.hw + (T.KERB[c.i] ? KERB_W : 0.4);
  let mu = carMu(c, env); if (c.off) mu *= 0.55 + (1 - s.offPen) * 0.4;
  const dfG = s.grip + s.df * (v / 60) ** 2, latMax = G * mu * dfG;
  // ---- energy boost: 100 units, up to 3 s, then cooldown before it recharges
  if (inp.boost && c.energy > 8 && c.boostCd <= 0 && c.boostT <= 0 && c.launch >= 0 && env.racing) { c.boostT = 3; c.boosts++; if (c.isPlayer) onPlayerBoost(); }
  if (c.boostT > 0) { c.boostT -= dt; c.energy -= 33.4 * dt; if (c.boostT <= 0 || c.energy <= 0) { c.boostT = 0; c.energy = Math.max(0, c.energy); c.boostCd = 4; } }
  else if (c.boostCd > 0) c.boostCd -= dt;
  else c.energy = Math.min(100, c.energy + (1.6 + c.brake * 9 * clamp(v / 30, 0, 1)) * s.recharge * dt);
  const boosting = c.boostT > 0, bf = boosting ? 1 + 0.35 * s.boost : 1;
  let top = s.top / 3.6 * (boosting ? 1 + 0.06 * s.boost : 1) * (c.slip ? 1.045 : 1);
  if (c.launchT > 0) { c.launchT -= dt; }
  // ---- gears (auto or manual), rpm
  const gTop = g => top * GEAR_R[g - 1];
  if (c.shiftT > 0) c.shiftT -= dt;
  if (auto.autoGear || !c.isPlayer) { if (c.gear < 8 && vLong > gTop(c.gear) * 0.97) { c.gear++; c.shiftT = 0.1 * s.shift; } else if (c.gear > 1 && vLong < gTop(c.gear - 1) * 0.86) { c.gear--; c.shiftT = 0.06 * s.shift; } }
  else { if (inp.up && c.gear < 8) { c.gear++; c.shiftT = 0.1 * s.shift; } if (inp.down && c.gear > 1 && vLong < gTop(c.gear - 1) * 1.02) { c.gear--; c.shiftT = 0.06 * s.shift; } inp.up = inp.down = false; }
  const lo = c.gear > 1 ? gTop(c.gear - 1) * 0.72 : 0, hi = gTop(c.gear);
  c.rpm = clamp(4200 + 8300 * (Math.max(0, vLong) - lo) / Math.max(1, hi - lo), 3800, 12500);
  // ---- longitudinal
  let thr = env.racing ? inp.throttle : 0;
  let aDrive = thr * s.a0 * bf * Math.max(0, 1 - (Math.max(0, vLong) / top) ** 3);
  if (c.launchT > 0) aDrive *= c.launchK;
  if (vLong > hi * 1.0 && !(auto.autoGear || !c.isPlayer)) aDrive = 0; // rev limiter in manual
  if (c.shiftT > 0) aDrive *= 0.35;
  const traction = G * mu * (s.grip * 0.95 + s.df * (v / 60) ** 2);
  c.spin = false;
  if (aDrive > traction) { if (auto.tc) aDrive = traction; else { aDrive = traction * 0.8; c.spin = true; if (v > 3) vLat += (c.steer || 0.3) * -1.2 * dt * 6; } }
  let aBrake = 0; c.lock = false;
  if (inp.brake > 0.02) {
    const lim = G * mu * (s.grip + s.df * (v / 60) ** 2) * 1.05, req = inp.brake * s.brake;
    if (req > lim && !auto.abs && inp.brake > 0.8 && v > 8) { aBrake = lim * 0.78; c.lock = true; c.wear = Math.min(1, c.wear + 0.0006 * dt * 60); } else aBrake = Math.min(req, lim * 0.97);
  }
  const aDrag = 0.0002 * vLong * Math.abs(vLong) * (c.slip ? 0.7 : 1) + (c.off ? 2.5 + 0.06 * v * (1 - (1 - s.offPen) * 0.5) : 0) + 0.2;
  const aGrav = -G * (T.SL[c.i] || 0) * 0.9;
  if (vLong > 0.3) vLong += (aDrive - aBrake - aDrag + aGrav) * dt;
  else if (inp.brake > 0.3 && thr < 0.1 && env.racing) vLong = Math.max(-6, vLong - 4 * dt); // reverse to recover
  else vLong += (aDrive - (vLong < 0 ? -aBrake : aBrake) * 0 + aGrav * 0.2) * dt;
  if (vLong < 0 && inp.brake < 0.3 && thr > 0) vLong += 6 * dt;
  // ---- steering / lateral (arcade grip, speed-sensitive lock, optional drift)
  const sens = c.isPlayer ? settings.sens : 1;
  let st = clamp(inp.steer * sens, -1, 1); c.steer = lerp(c.steer, st, clamp(dt * 16, 0, 1));
  const vA = Math.abs(vLong), latA = latMax * ARC;
  // geometric yaw at full lock (fades with speed) vs the grip-limited yaw: steering input scales the smaller of the two,
  // so a partial input gives a partial turn at any speed and full lock always uses all the available grip
  const geomYaw = vA * Math.tan(0.46 / (1 + vA / 26) * s.turn) / WHEELBASE, gripYaw = latA * (auto.steerAssist ? 1.08 : 1) / Math.max(vA, 1);
  let yaw, req; c.yawMax = Math.min(geomYaw, gripYaw);
  // drift: brake tap (or the drift key) while turning hard at speed breaks the rear loose
  const brkOn = (inp.brkRaw ?? inp.brake) > 0.4, tapped = !brkOn && c.brkHold > 0.02 && c.brkHold < 0.35; c.brkHold = brkOn ? (c.brkHold || 0) + dt : 0;
  if (c.isPlayer && inp.human && !c.drift && env.racing && v > 16 && Math.abs(c.steer) > 0.7 && !c.off && (inp.drift || (settings.driftTap !== false && tapped))) {
    c.drift = 1; c.driftDir = Math.sign(c.steer); c.driftB = Math.min(0.12, Math.abs(Math.atan2(vLat, Math.max(1, vLong)))); c.driftT = 0; c.driftLow = 0; if (typeof onDrift === 'function') onDrift(c, 1);
  }
  if (c.drift) {
    const dir = c.driftDir, along = c.steer * dir;
    c.driftT += dt;
    if (c.drift === 1) { c.driftLow = along < 0.25 ? c.driftLow + dt : 0; if (c.driftLow > 0.16 || v < 9 || c.off) c.drift = 2; }
    const bT = c.drift === 1 ? 0.28 + 0.24 * clamp(along, 0, 1) + (thr > 0.5 ? 0.05 : 0) : 0;
    c.driftB += (bT - c.driftB) * clamp(dt * (c.drift === 1 ? 4.5 : 8), 0, 1);
    // the velocity vector turns on (slightly more than) the grip limit; the slide scrubs speed
    const turnK = c.drift === 1 ? 0.85 + 0.6 * clamp(along, 0, 1) : 1.05, vNow = Math.hypot(vLong, vLat);
    const om = c.drift === 1 ? -dir * latA * turnK / Math.max(vNow, 6) : -c.steer * Math.min(geomYaw, gripYaw); // recovering: normal steering control
    const psi = Math.atan2(c.vx, c.vz) + om * dt;
    const vNew = Math.max(0, vNow - (1.5 + 7 * c.driftB) * dt - 0.3 * Math.max(0, aDrive) * dt);
    const h0 = c.h; c.h = psi - dir * c.driftB;
    yaw = Math.atan2(Math.sin(c.h - h0), Math.cos(c.h - h0)) / dt; req = latA * turnK;
    c.vx = Math.sin(psi) * vNew; c.vz = Math.cos(psi) * vNew;
    const f0b = Math.sin(c.h), f1b = Math.cos(c.h); vLong = c.vx * f0b + c.vz * f1b; vLat = c.vx * -f1b + c.vz * f0b;
    if (c.drift === 2 && c.driftB < 0.02) { c.drift = 0; if (typeof onDrift === 'function') onDrift(c, 0); }
    c.yaw = yaw;
  } else {
    if (auto.steerAssist) { yaw = -c.steer * Math.min(geomYaw, gripYaw) * Math.sign(vLong); req = Math.abs(yaw * vLong); }
    else {
      yaw = -c.steer * geomYaw * Math.sign(vLong); req = Math.abs(yaw * vLong);
      if (req > latA * 1.04) { const ex = req - latA * 1.04; yaw *= latA * 1.04 / req; vLong -= Math.min(ex, 25) * 0.05 * dt; vLat += -Math.sign(c.steer) * Math.min(ex, 25) * 0.12 * dt; req = latA * 1.04; } // understeer: scrubs speed and pushes wide
    }
    if (c.lock) yaw *= 0.3;
    const relax = (auto.steerAssist ? 9 : 5.5) * mu * (c.off ? 0.5 : 1);
    vLat *= Math.exp(-relax * dt);
    if (c.kerb && v > 20) vLat += (Math.random() - 0.5) * 0.6 * s.offPen;
    c.yaw = yaw; c.h += yaw * dt;
    const nf0 = Math.sin(c.h), nf1 = Math.cos(c.h), nr0 = -Math.cos(c.h), nr1 = Math.sin(c.h);
    c.vx = nf0 * vLong + nr0 * vLat; c.vz = nf1 * vLong + nr1 * vLat;
  }
  c.vLong = vLong; c.vLat = vLat;
  c.aLong = lerp(c.aLong || 0, (vLong - (c.pvLong ?? vLong)) / dt, clamp(dt * 8, 0, 1)); c.pvLong = vLong;
  c.x += c.vx * dt; c.z += c.vz * dt;
  // ---- barriers: slide along the wall, lose some speed, never stop dead
  const wall = T.wall, latNow = trackLocal(c.i, c.x, c.z).lat;
  if (Math.abs(latNow) > wall) {
    const h = T.H[c.i], R0 = -Math.cos(h), R1 = Math.sin(h), sg = Math.sign(latNow), push = Math.abs(latNow) - wall;
    c.x -= R0 * sg * push; c.z -= R1 * sg * push;
    const vr = (c.vx * R0 + c.vz * R1) * sg;
    if (vr > 0) {
      const tx = c.vx - R0 * sg * vr, tz = c.vz - R1 * sg * vr, keep = clamp(1 - vr * 0.022, 0.62, 0.99);
      c.vx = tx * keep - R0 * sg * vr * 0.15; c.vz = tz * keep - R1 * sg * vr * 0.15;
      if (c.drift) c.drift = 2;
      if (c.isPlayer) { c.wallHits = (c.wallHits || 0) + (vr > 3 ? 1 : 0); if (vr > 3) onPlayerHit('BARRIER', vr); }
    } else { c.vx *= 1 - 0.25 * dt; c.vz *= 1 - 0.25 * dt; }
    // nose turned into the wall: rotate it back parallel to the barrier
    const fwdT = Math.sin(c.h) * Math.sin(h) + Math.cos(c.h) * Math.cos(h) >= 0 ? h : h + Math.PI, into = (Math.sin(c.h) * R0 + Math.cos(c.h) * R1) * sg;
    if (into > 0) c.h += Math.atan2(Math.sin(fwdT - c.h), Math.cos(fwdT - c.h)) * clamp(dt * 9, 0, 0.2);
    c.lat = sg * wall;
  }
  // ---- tyres wear (more when sliding / pushing)
  const load = clamp(req / Math.max(1, latMax), 0, 1.4) * 0.6 + thr * 0.25 + inp.brake * 0.25;
  c.wear = Math.min(1, c.wear + dt * v * 1.2e-5 * (TYRES[c.tyre] || TYRES.medium).wear * s.wear * (0.4 + load) * (env.rain && c.tyre !== 'wet' ? 0.6 : 1) * (!env.rain && c.tyre === 'wet' ? 2.2 : 1) * env.wearK);
  // height from the track (terrain follows track laterally)
  const f = clamp(loc.fwd / DS, -1, 1), j = f >= 0 ? mod(c.i + 1, T.n) : mod(c.i - 1, T.n);
  c.y = lerp(T.Y[c.i], T.Y[j], Math.abs(f));
  c.speed = Math.hypot(c.vx, c.vz);
}
// pit lane: 0 none, 1 entering lane, 2 stopped in box, 3 leaving
function stepPit(c, dt, env) {
  const p = T.pit, n = T.n; const st = c.pit;
  const target = 80 / 3.6;
  if (st.state === 2) { st.t -= dt; c.vx = c.vz = 0; c.vLong = 0; c.speed = 0; if (st.t <= 0) { st.state = 3; c.tyre = st.nextTyre || c.tyre; c.wear = 0; c.energy = 100; if (c.isPlayer) onPitDone(); } return; }
  const sp = st.state === 1 && mod(st.idx - p.box, n) > n / 2 && mod(p.box - st.idx, n) < 12 ? Math.max(4, target * mod(p.box - st.idx, n) / 12) : target;
  st.idx = mod(st.idx + sp * dt / DS, n);
  const ii = Math.floor(st.idx); const near = (a, b) => mod(b - a, n);
  // lateral position: blend from racing surface into the pit lane and back
  let off = p.off; const dIn = near(p.entry, ii), dOut = near(ii, p.exit);
  if (dIn < 40) off = lerp(c.pitLat0 || T.hw - 2, p.off, smooth(dIn / 40)); if (dOut < 40) off = lerp(T.hw - 3, p.off, smooth(dOut / 40));
  trackPoint(ii, off, _tp); const h2 = T.H[mod(ii + 1, n)];
  c.x = _tp.x; c.z = _tp.z; c.y = _tp.y; c.h = h2; c.i = ii; c.lat = off;
  c.vx = Math.sin(c.h) * sp; c.vz = Math.cos(c.h) * sp; c.vLong = sp; c.speed = sp; c.gear = 2; c.rpm = 6000; c.steer = 0; c.off = false;
  if (st.state === 1 && near(ii, p.box) === 0) { st.state = 2; st.t = 2.8 + (c.isPlayer ? 0 : Math.random() * 0.8); if (c.isPlayer) onPitStop(); }
  if (st.state === 3 && near(ii, p.exit) <= 1) { st.state = 0; st.req = false; st.count++; }
}
function tryEnterPit(c, prevI) {
  const p = T.pit; if (!c.pit.req || c.pit.state) return;
  const n = T.n, crossed = mod(c.i - prevI, n) < n / 2 && mod(p.entry - prevI, n) <= mod(c.i - prevI, n) && mod(p.entry - prevI, n) < 30;
  if (crossed) { c.pit.state = 1; c.pit.idx = c.i; c.pitLat0 = c.lat; c.boostT = 0; }
}
// car-to-car contact: two circles per car
function collideCars(cars) {
  for (let a = 0; a < cars.length; a++) for (let b = a + 1; b < cars.length; b++) {
    const A = cars[a], B = cars[b]; if (A.pit.state || B.pit.state) continue;
    const dx0 = B.x - A.x, dz0 = B.z - A.z; if (dx0 * dx0 + dz0 * dz0 > 49) continue;
    for (const ea of [-1.25, 1.25]) for (const eb of [-1.25, 1.25]) {
      const ax = A.x + Math.sin(A.h) * ea, az = A.z + Math.cos(A.h) * ea, bx = B.x + Math.sin(B.h) * eb, bz = B.z + Math.cos(B.h) * eb;
      const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz), min = CAR_R * 2;
      if (d >= min || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, ov = (min - d) / 2, ma = A.stats.w, mb = B.stats.w, wa = mb / (ma + mb), wb = ma / (ma + mb);
      A.x -= nx * ov * 2 * wa; A.z -= nz * ov * 2 * wa; B.x += nx * ov * 2 * wb; B.z += nz * ov * 2 * wb;
      const rv = (B.vx - A.vx) * nx + (B.vz - A.vz) * nz;
      if (rv < 0) { const j = -(1.3) * rv; A.vx -= nx * j * wa; A.vz -= nz * j * wa; B.vx += nx * j * wb; B.vz += nz * j * wb; if (-rv > 0.8) { A.contacts++; B.contacts++; } if ((A.isPlayer || B.isPlayer) && -rv > 2) onPlayerHit('CONTACT', -rv); }
    }
  }
}
// slipstream: close behind another car on a straight
function slipstreams(cars) {
  for (const c of cars) {
    c.slip = false; if (c.speed < 28 || c.pit.state) continue;
    for (const o of cars) { if (o === c || o.pit.state) continue; const d = mod(o.prog - c.prog, T.len); if (d < 3 || d > 32) continue; if (Math.abs(o.lat - c.lat) < 2.4 && Math.abs(T.K[c.i]) < 0.003) { c.slip = true; break; } }
  }
}

// ---------------------------------------------------------------- AI driver (outputs the same inputs a human would)
function aiDrive(c, cars, dt, env, diff) {
  const ai = c.ai, s = c.stats, n = T.n, v = c.speed || 0;
  if (!ai.profile) ai.profile = speedProfile(s, carMu(c, env) * (env.rain ? 0.98 : 1), 0.82);
  if ((ai.profT = (ai.profT || 0) - dt) <= 0) { ai.profT = 2; ai.profile = speedProfile(s, Math.round(carMu(c, env) * 50) / 50, 0.82); }
  // mistakes: occasionally brake late into a corner and run wide
  if (ai.mistakeT > 0) ai.mistakeT -= dt;
  else if (Math.abs(T.K[mod(c.i + 60, n)]) > 0.006 && Math.abs(T.K[c.i]) < 0.002 && ai.lastMistakeIdx !== Math.floor(c.i / 120) && Math.random() < diff.mistake * (1.3 - c.skill) * 2) { ai.lastMistakeIdx = Math.floor(c.i / 120); ai.mistakeT = 2.2; }
  // overtaking / defending / avoiding
  ai.offT = (ai.offT || 0) - dt; let wantOff = ai.offT > 0 ? ai.off : 0, ahead = null, aheadD = 1e9;
  for (const o of cars) { if (o === c || o.pit.state || o.finished && !c.finished) continue; const d = mod(o.prog - c.prog, T.len); if (d > 0.5 && d < 25 && Math.abs(o.lat - (c.lat)) < 3.2 && d < aheadD) { ahead = o; aheadD = d; } }
  if (ahead && ai.offT <= 0) {
    const mySpeed = ai.profile[mod(c.i + 20, n)] * c.pace, faster = mySpeed > ahead.speed * 1.01 || c.speed > ahead.speed + 1;
    if (faster && Math.random() < 0.6 + c.aggr * 0.4) { const room = T.hw - 1.4; const side = ahead.lat > 0 ? -1 : 1; ai.off = clamp(ahead.lat + side * 3.2, -room, room) - T.RL[mod(c.i + 15, n)]; ai.offT = 3; wantOff = ai.off; }
  }
  // defend: move toward the inside if someone is right behind, before a corner
  if (!ahead && ai.offT <= 0 && c.aggr > 0.6) for (const o of cars) { if (o === c) continue; const d = mod(c.prog - o.prog, T.len); if (d > 1 && d < 12) { const kn = T.K[mod(c.i + 40, n)]; if (Math.abs(kn) > 0.004) { ai.off = -Math.sign(kn) * 2 - T.RL[mod(c.i + 15, n)] * 0.5; ai.offT = 1.5; wantOff = ai.off; } break; } }
  // steering: pure pursuit toward the racing line ahead
  const look = 7 + v * 0.42, j = mod(c.i + Math.round(look / DS), n);
  let tlat = clamp(T.RL[j] + wantOff + (ai.mistakeT > 0 ? Math.sign(T.K[j]) * 2.5 : 0), -T.hw + 1, T.hw - 1);
  // side-by-side awareness: leave a car's width to anyone alongside
  let side = null;
  for (const o of cars) { if (o === c || o.pit.state) continue; const d = mod(o.prog - c.prog + T.len / 2, T.len) - T.len / 2, dl = o.lat - c.lat; if (Math.abs(d) < 6 && Math.abs(dl) < 3.4) { side = o; const push = (3.4 - Math.abs(dl)) * (dl > 0 ? -1 : 1); tlat = clamp(c.lat + push * 1.2 + (tlat - c.lat) * 0.3, -T.hw + 0.8, T.hw - 0.8); break; } }
  if (c.lat > T.hw + 1) tlat = Math.min(tlat, T.hw - 2); if (c.lat < -T.hw - 1) tlat = Math.max(tlat, -T.hw + 2);
  trackPoint(j, tlat, _tp);
  const dx = _tp.x - c.x, dz = _tp.z - c.z, fw = dx * Math.sin(c.h) + dz * Math.cos(c.h), rt = dx * -Math.cos(c.h) + dz * Math.sin(c.h);
  const ang = Math.atan2(rt, Math.max(0.5, fw));
  const Ld = Math.max(3, Math.hypot(dx, dz)), wDes = 2 * Math.max(v, 2) * Math.sin(ang) / Ld;
  c.input.human = false;
  c.input.steer = clamp(wDes / Math.max(0.05, c.yawMax || 1) * 1.05 + ang * 0.6, -1, 1);
  // speed control from the braking/cornering profile
  const k = mod(c.i + Math.round((3 + v * 0.18) / DS), n);
  let vt = ai.profile[k] * c.pace * (ai.mistakeT > 0 ? 1.1 : 1);
  if (ahead && Math.abs(ahead.lat - c.lat) < 2.4 && aheadD < 14) vt = Math.min(vt, ahead.speed - (14 - aheadD) * 0.35);
  if (side && Math.abs(T.K[mod(c.i + 25, n)]) > 0.006 && mod(side.prog - c.prog, T.len) < T.len / 2 && c.aggr < 0.8) vt = Math.min(vt, side.speed - 0.5); // concede the corner
  if (c.off) vt *= 0.8;
  const e = vt - v;
  if (e > 0) { c.input.throttle = clamp(0.55 + e * 0.35, 0, 1); c.input.brake = 0; } else { c.input.throttle = e > -1.2 ? 0.25 : 0; c.input.brake = clamp(-e * 0.22, 0, 1); }
  // energy boost on straights
  const straight = Math.abs(T.K[mod(c.i + 40, n)]) < 0.0015 && Math.abs(T.K[mod(c.i + 90, n)]) < 0.0015;
  c.input.boost = straight && c.energy > 70 && v > 35 && Math.random() < 0.02 + c.aggr * 0.02;
  // pit for tyres in long races
  if (!c.pit.req && !c.pit.count && env.laps >= 5 && c.wear > 0.45 + c.skill * 0.1 && c.lap < env.laps - 1) { c.pit.req = true; c.pit.nextTyre = env.rain ? 'wet' : 'medium'; }
}
// ---------------------------------------------------------------- WebAudio engine synthesis (no samples)
const Sound = {
  ac: null, on: true,
  init() {
    if (!this.ac) { try { this.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } this.build(); }
    if (this.ac.state !== 'running') this.ac.resume().catch(() => {});
  },
  build() {
    const ac = this.ac; this.master = ac.createGain(); this.master.gain.value = settings.sound ? settings.volume : 0; this.master.connect(ac.destination);
    // engine: two detuned saws + a sub square through a waveshaper and a lowpass
    this.eng = ac.createGain(); this.eng.gain.value = 0; this.lp = ac.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 900; this.lp.Q.value = 3;
    const shaper = ac.createWaveShaper(), curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 2.4); } shaper.curve = curve;
    this.o1 = ac.createOscillator(); this.o1.type = 'sawtooth'; this.o2 = ac.createOscillator(); this.o2.type = 'sawtooth'; this.o3 = ac.createOscillator(); this.o3.type = 'square';
    const g3 = ac.createGain(); g3.gain.value = 0.5;
    this.o1.connect(shaper); this.o2.connect(shaper); this.o3.connect(g3); g3.connect(shaper); shaper.connect(this.lp); this.lp.connect(this.eng); this.eng.connect(this.master);
    [this.o1, this.o2, this.o3].forEach(o => { o.frequency.value = 100; o.start(); });
    // noise for wind, tyre squeal and rain
    const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const mkNoise = (type, f, q) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = ac.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(this.master); s.start(); return g; };
    this.wind = mkNoise('lowpass', 700, 0.5); this.squeal = mkNoise('bandpass', 2400, 8); this.rain = mkNoise('highpass', 3000, 0.3);
  },
  enable(on) { this.on = on; if (this.master) this.master.gain.setTargetAtTime(on ? settings.volume : 0, this.ac.currentTime, 0.05); },
  update(car, active, rainOn) {
    if (!this.ac || this.ac.state !== 'running') return;
    const t = this.ac.currentTime, k = 0.04;
    if (!active || !car) { this.eng.gain.setTargetAtTime(0, t, 0.1); this.wind.gain.setTargetAtTime(0, t, 0.1); this.squeal.gain.setTargetAtTime(0, t, 0.05); this.rain.gain.setTargetAtTime(0, t, 0.2); return; }
    const f = car.rpm / 60 * 3;
    this.o1.frequency.setTargetAtTime(f, t, k); this.o2.frequency.setTargetAtTime(f * 1.007, t, k); this.o3.frequency.setTargetAtTime(f / 2, t, k);
    this.lp.frequency.setTargetAtTime(700 + car.input.throttle * 2600 + (car.boostT > 0 ? 1200 : 0), t, k);
    this.eng.gain.setTargetAtTime(0.05 + car.input.throttle * 0.09, t, k);
    this.wind.gain.setTargetAtTime(clamp((car.speed || 0) / 90, 0, 1) * 0.12, t, 0.2);
    const sq = (car.lock ? 0.8 : 0) + (car.spin ? 0.6 : 0) + clamp((Math.abs(car.vLat) - 1.2) / 4, 0, 0.7);
    this.squeal.gain.setTargetAtTime(car.off ? 0 : sq * 0.06, t, 0.05); this.rain.gain.setTargetAtTime(rainOn ? 0.035 : 0, t, 0.3);
  },
  tone(f, d, type = 'sine', g = 0.2, f2) { if (!this.ac || !this.on) return; const t = this.ac.currentTime, o = this.ac.createOscillator(), gn = this.ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); gn.gain.setValueAtTime(g, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d); o.connect(gn); gn.connect(this.master); o.start(t); o.stop(t + d + 0.05); },
  beep(hi) { this.tone(hi ? 1180 : 620, hi ? 0.5 : 0.18, 'square', 0.12); },
  boost() { this.tone(220, 0.6, 'sawtooth', 0.12, 880); },
  hit(s) { this.tone(90, 0.25, 'triangle', clamp(s / 10, 0.1, 0.5), 40); },
  pit() { this.tone(880, 0.12, 'sine', 0.15); setTimeout(() => this.tone(1320, 0.12, 'sine', 0.15), 140); },
  coin() { this.tone(1320, 0.12, 'triangle', 0.15); setTimeout(() => this.tone(1760, 0.2, 'triangle', 0.15), 110); },
  click() { this.tone(660, 0.05, 'sine', 0.05); }
};
// ---------------------------------------------------------------- procedural models (vertex-coloured, merged)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
function colorLin(c) { return Array.isArray(c) ? new THREE.Color().setRGB(c[0] / 255, c[1] / 255, c[2] / 255, THREE.SRGBColorSpace) : (c instanceof THREE.Color ? c.clone() : new THREE.Color(c)); }
class Parts {
  constructor() { this.L = []; }
  push(g, col, mul = 1) { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); const c = colorLin(col), n = g.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r * mul; a[i * 3 + 1] = c.g * mul; a[i * 3 + 2] = c.b * mul; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); this.L.push(g); return this; }
  add(geo, col, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, mul = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    _m4.compose(_v1.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _v2.set(sx, sy, sz)); g.applyMatrix4(_m4); return this.push(g, col, mul);
  }
  tube(a, b, r, col, seg = 6) { const d = _v3.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]), len = d.length(); if (len < 1e-4) return this; const g = new THREE.CylinderGeometry(r, r, len, seg).toNonIndexed(); _q.setFromUnitVectors(_v2.set(0, 1, 0), d.normalize()); _m4.compose(_v1.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q, _v2.set(1, 1, 1)); g.applyMatrix4(_m4); return this.push(g, col); }
  // tapered box from z0 to z1 (widths, heights and centre heights at each end)
  taper(z0, z1, w0, w1, h0, h1, y0, y1, col, x = 0) {
    const p = [[-w0 / 2, y0 - h0 / 2, z0], [w0 / 2, y0 - h0 / 2, z0], [w0 / 2, y0 + h0 / 2, z0], [-w0 / 2, y0 + h0 / 2, z0], [-w1 / 2, y1 - h1 / 2, z1], [w1 / 2, y1 - h1 / 2, z1], [w1 / 2, y1 + h1 / 2, z1], [-w1 / 2, y1 + h1 / 2, z1]].map(q => [q[0] + x, q[1], q[2]]);
    const f = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [3, 7, 6, 2], [0, 4, 7, 3], [1, 2, 6, 5]], pos = [];
    for (const [a, b, c, d] of f) pos.push(...p[a], ...p[c], ...p[b], ...p[a], ...p[d], ...p[c]);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); return this.push(g, col);
  }
  merge() { if (!this.L.length) return null; const g = mergeGeometries(this.L); this.L.forEach(x => x.dispose()); this.L = []; g.computeBoundingSphere(); return g; }
}
const GEO = { box: new THREE.BoxGeometry(1, 1, 1), sph: new THREE.SphereGeometry(1, 16, 12), sphLo: new THREE.SphereGeometry(1, 8, 6), cyl: new THREE.CylinderGeometry(1, 1, 1, 16), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cone: new THREE.ConeGeometry(1, 1, 8), ico: new THREE.IcosahedronGeometry(1, 1) };
const BX = (p, col, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, mul = 1) => p.add(GEO.box, col, x, y, z, rx, ry, rz, sx, sy, sz, mul);
const CARBON = '#17181c', DARKG = '#2a2d33', SILVER = '#aeb4bd';

// ---------------------------------------------------------------- open-wheel car (faces +Z, origin at ground centre)
const CAR_SHAPE = { // small per-class differences in proportions
  D: { nose: 0.36, pod: 0.42, rw: 0.95, fw: 1.8, fin: 0, len: 1 }, C: { nose: 0.33, pod: 0.44, rw: 1.0, fw: 1.85, fin: 0.25, len: 1.02 },
  B: { nose: 0.3, pod: 0.46, rw: 1.02, fw: 1.9, fin: 0.35, len: 1.04 }, A: { nose: 0.27, pod: 0.48, rw: 1.05, fw: 1.95, fin: 0.45, len: 1.06 }, S: { nose: 0.24, pod: 0.5, rw: 1.08, fw: 2.0, fin: 0.55, len: 1.08 }
};
const MAT = {};
function initMaterials(low) {
  for (const k in MAT) MAT[k].dispose();
  const P = (o) => low ? new THREE.MeshPhongMaterial(Object.assign({ vertexColors: true, shininess: o.sh || 40, specular: o.spec || 0x333333 }, o.x || {})) : new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: o.r, metalness: o.m }, o.x || {}));
  MAT.paint = P({ r: 0.3, m: 0.35, sh: 90, spec: 0x666666 }); MAT.carbon = P({ r: 0.45, m: 0.3 }); MAT.tyre = P({ r: 0.8, m: 0.05, sh: 10, spec: 0x111111 });
  MAT.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  MAT.matte = low ? new THREE.MeshLambertMaterial({ vertexColors: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });
  MAT.flat = low ? new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }) : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, flatShading: true });
  MAT.ghost = new THREE.MeshBasicMaterial({ color: 0x5fd7ff, transparent: true, opacity: 0.32, depthWrite: false });
}
function buildCarGeos(cls, liv, helmet) {
  const S = CAR_SHAPE[cls] || CAR_SHAPE.D, P = liv.p, S2 = liv.s, A = liv.a, pat = liv.pat, body = new Parts(), carbon = new Parts(), lights = new Parts();
  const L = S.len, zf = 1.75 * L, zr = -1.65 * L;
  // floor + diffuser + plank
  BX(carbon, CARBON, 0, 0.09, -0.2, 1.45, 0.05, 3.3 * L); BX(carbon, CARBON, 0, 0.2, zr - 0.5, 1.0, 0.16, 0.45, -0.25);
  // monocoque + nose
  const noseC = pat === 'arrow' ? S2 : P;
  body.taper(-0.7, 1.05 * L, 0.78, 0.52, 0.52, 0.36, 0.45, 0.42, P);
  body.taper(1.05 * L, 2.5 * L, 0.5, S.nose * 0.55, 0.34, 0.16, 0.42, 0.26, noseC);
  if (pat === 'arrow') body.taper(1.6 * L, 2.52 * L, 0.3, 0.06, 0.02, 0.02, 0.36, 0.35, A);
  if (pat === 'stripe') { body.taper(-0.7, 2.45 * L, 0.14, 0.06, 0.02, 0.02, 0.71, 0.35, A); }
  // cockpit rim + driver
  BX(body, CARBON, 0, 0.7, -0.2, 0.56, 0.06, 0.8); body.add(GEO.sph, helmet, 0, 0.86, -0.32, 0, 0, 0, 0.17, 0.16, 0.19); BX(body, '#0d1622', 0, 0.88, -0.17, 0.24, 0.07, 0.1, 0.1);
  body.add(GEO.sph, A, 0, 0.92, -0.33, 0, 0, 0, 0.09, 0.06, 0.15);
  // sidepods
  const podC = pat === 'split' ? S2 : P;
  for (const sx of [-1, 1]) { body.taper(-1.0, 0.7, S.pod, S.pod * 0.9, 0.3, 0.42, 0.3, 0.4, podC, sx * 0.62); BX(carbon, CARBON, sx * 0.62, 0.52, 0.72, S.pod * 0.85, 0.22, 0.04); if (pat === 'split' || pat === 'solid') body.taper(-0.9, 0.6, 0.02, 0.02, 0.06, 0.06, 0.38, 0.45, A, sx * (0.62 + S.pod / 2)); }
  // engine cover, airbox, fin
  const ecC = pat === 'halo' || pat === 'split' ? S2 : P;
  body.taper(-2.0 * L, -0.55, 0.32, 0.62, 0.32, 0.62, 0.5, 0.62, ecC);
  BX(body, ecC, 0, 1.06, -0.62, 0.28, 0.3, 0.42); BX(carbon, CARBON, 0, 1.12, -0.42, 0.2, 0.16, 0.04);
  if (S.fin) BX(body, A, 0, 0.95, -1.35 * L, 0.025, 0.34, 1.2 * S.fin + 0.4);
  // halo
  const halo = new THREE.TorusGeometry(0.4, 0.035, 6, 18, Math.PI); body.add(halo, pat === "halo" ? A : CARBON, 0, 0.98, -0.18, Math.PI / 2, 0, 0, 1, 1.15, 1);
  body.tube([0, 0.98, 0.28], [0, 0.72, 0.42], 0.035, pat === 'halo' ? A : CARBON);
  // front wing
  const fw = S.fw; BX(body, S2, 0, 0.13, 2.4 * L, fw, 0.035, 0.42); BX(body, S2, 0, 0.2, 2.28 * L, fw * 0.92, 0.03, 0.22, -0.35); BX(carbon, CARBON, 0, 0.26, 2.2 * L, fw * 0.85, 0.025, 0.12, -0.6);
  for (const sx of [-1, 1]) BX(body, A, sx * fw / 2, 0.2, 2.35 * L, 0.025, 0.22, 0.5);
  // rear wing
  const rw = S.rw; BX(body, S2, 0, 0.98, zr - 0.62, rw, 0.05, 0.4, 0.12); BX(body, A, 0, 1.08, zr - 0.72, rw, 0.035, 0.2, 0.35);
  for (const sx of [-1, 1]) BX(body, S2, sx * rw / 2, 0.86, zr - 0.6, 0.03, 0.55, 0.62);
  carbon.tube([0, 0.5, zr - 0.2], [0, 0.96, zr - 0.6], 0.03, CARBON);
  // suspension wishbones + mirrors
  for (const sx of [-1, 1]) {
    carbon.tube([sx * 0.3, 0.42, 1.1 * L], [sx * 0.86, 0.34, zf], 0.022, CARBON); carbon.tube([sx * 0.3, 0.3, 1.5 * L], [sx * 0.86, 0.3, zf], 0.022, CARBON);
    carbon.tube([sx * 0.45, 0.5, -1.4], [sx * 0.86, 0.38, zr], 0.022, CARBON); carbon.tube([sx * 0.45, 0.28, -1.0], [sx * 0.86, 0.3, zr], 0.022, CARBON);
    BX(body, P, sx * 0.48, 0.78, 0.2, 0.12, 0.06, 0.05); carbon.tube([sx * 0.33, 0.7, 0.25], [sx * 0.46, 0.76, 0.2], 0.012, CARBON);
  }
  // rain light + T-cam
  lights.add(GEO.box, [255, 40, 40], 0, 0.42, zr - 0.72, 0, 0, 0, 0.16, 0.08, 0.03, 2.5);
  BX(body, A, 0, 1.24, -0.62, 0.16, 0.04, 0.08);
  return { body: body.merge(), carbon: carbon.merge(), lights: lights.merge(), zf, zr };
}
const wheelGeoCache = {};
function wheelGeo(r, w) {
  const k = r + '|' + w; if (wheelGeoCache[k]) return wheelGeoCache[k];
  const p = new Parts(); p.add(GEO.cyl, '#121214', 0, 0, 0, 0, 0, Math.PI / 2, r, w, r);
  p.add(GEO.cyl, '#26282c', 0, 0, 0, 0, 0, Math.PI / 2, r * 0.68, w + 0.01, r * 0.68);
  for (let k2 = 0; k2 < 5; k2++) p.add(GEO.box, SILVER, 0, 0, 0, k2 * Math.PI / 5, 0, 0, w + 0.02, r * 1.2, 0.035);
  p.add(GEO.cyl, SILVER, 0, 0, 0, 0, 0, Math.PI / 2, 0.06, w + 0.03, 0.06);
  return (wheelGeoCache[k] = p.merge());
}
const ringGeoCache = {};
function ringGeo(r, w) { const k = r + '|' + w; if (!ringGeoCache[k]) { const g = new THREE.TorusGeometry(r * 0.8, 0.018, 4, 24); const g2 = g.clone(); g.rotateY(Math.PI / 2); g.translate(w / 2 + 0.006, 0, 0); g2.rotateY(Math.PI / 2); g2.translate(-w / 2 - 0.006, 0, 0); ringGeoCache[k] = mergeGeometries([g, g2]); } return ringGeoCache[k]; }
function makeCar3D(carId, liv, helmet, ghost) {
  const c = CAR(carId), g = buildCarGeos(c.cls, liv, helmet || '#ffffff'), root = new THREE.Group(), chassis = new THREE.Group(); root.add(chassis);
  const mats = ghost ? [MAT.ghost, MAT.ghost, MAT.ghost] : [MAT.paint, MAT.carbon, MAT.glow];
  const body = new THREE.Mesh(g.body, mats[0]), carb = new THREE.Mesh(g.carbon, mats[1]), lt = new THREE.Mesh(g.lights, mats[2]);
  chassis.add(body, carb, lt); body.castShadow = carb.castShadow = !ghost;
  const wheels = [], rings = [], ringMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  const W = [[0.86, 0.33, g.zf, 0.3, true], [-0.86, 0.33, g.zf, 0.3, true], [0.84, 0.36, g.zr, 0.4, false], [-0.84, 0.36, g.zr, 0.4, false]];
  for (const [x, r, z, w, front] of W) {
    const steerG = new THREE.Group(); steerG.position.set(x, r, z); root.add(steerG); // wheels stay planted while the body rolls and pitches
    const m = new THREE.Mesh(wheelGeo(r, w), ghost ? MAT.ghost : MAT.tyre); m.castShadow = !ghost; steerG.add(m);
    if (!ghost) { const rg = new THREE.Mesh(ringGeo(r, w), ringMat); m.add(rg); rings.push(rg); }
    wheels.push({ g: steerG, m, r, front });
  }
  root.userData = { chassis, wheels, ringMat, lights: lt, zr: g.zr, geos: [g.body, g.carbon, g.lights] };
  root.rotation.order = 'YXZ';
  return root;
}
function disposeCar3D(o) { (o.userData.geos || []).forEach(g => g && g.dispose()); if (o.userData.ringMat) o.userData.ringMat.dispose(); }

// ---------------------------------------------------------------- scenery models
function sceneryModels() {
  const M = {};
  { const p = new Parts(); p.add(GEO.cyl8, '#6b4a2b', 0, 1.5, 0, 0, 0, 0, 0.25, 3, 0.25); p.add(GEO.ico, '#3f8f3a', 0, 4.4, 0, 0, 0, 0, 2.4, 2.2, 2.4); p.add(GEO.ico, '#4fa645', 0.8, 5.4, 0.4, 0, 0.5, 0, 1.6, 1.5, 1.6); p.add(GEO.ico, '#357d33', -1, 4.8, -0.6, 0, 1, 0, 1.5, 1.4, 1.5); M.tree = p.merge(); }
  { const p = new Parts(); p.add(GEO.cyl8, '#5a3d24', 0, 1, 0, 0, 0, 0, 0.22, 2, 0.22); for (let k = 0; k < 4; k++) p.add(GEO.cone, k % 2 ? '#1f6b3a' : '#26794a', 0, 3 + k * 2.1, 0, 0, k, 0, 2.6 - k * 0.5, 3.4, 2.6 - k * 0.5); M.pine = p.merge(); }
  { const p = new Parts(); p.add(new THREE.DodecahedronGeometry(1, 0), '#8a8580', 0, 0.8, 0, 0.3, 0.5, 0.1, 2.4, 1.6, 2); p.add(new THREE.DodecahedronGeometry(1, 0), '#9d978f', 1.4, 0.5, 0.6, 0.8, 0.2, 0.4, 1.2, 1, 1.1); M.rock = p.merge(); }
  // tyre wall segment (4 m) + armco
  { const p = new Parts(); for (let k = 0; k < 6; k++) for (let l = 0; l < 2; l++) p.add(GEO.cyl8, l ? '#1a1a1a' : (k % 2 ? '#e8e8e8' : '#d22')  , 0, 0.17 + l * 0.34, -1.67 + k * 0.67, 0, 0, 0, 0.32, 0.33, 0.32); M.tyrewall = p.merge(); }
  { const p = new Parts(); BX(p, '#c9ced6', 0, 0.62, 0, 0.08, 0.32, 4.02); BX(p, '#c9ced6', 0, 0.3, 0, 0.06, 0.12, 4.02); p.add(GEO.cyl8, '#7c838c', 0.08, 0.4, 0, 0, 0, 0, 0.05, 0.8, 0.05); M.armco = p.merge(); }
  { const p = new Parts(); BX(p, '#b8bcc4', 0, 0.55, 0, 0.5, 1.1, 4.02); BX(p, '#6c7078', 0, 1.12, 0, 0.56, 0.06, 4.02); M.concrete = p.merge(); }
  // light tower for night
  { const p = new Parts(); p.add(GEO.cyl8, '#5b616b', 0, 9, 0, 0, 0, 0, 0.18, 18, 0.18); BX(p, '#3a3e45', 0, 18.2, 0, 2.6, 0.6, 0.5); M.tower = p.merge(); }
  { const p = new Parts(); BX(p, [255, 245, 220], 0, 18.2, 0.27, 2.4, 0.45, 0.04); M.towerHead = p.merge(); }
  // grandstand (20 m section) with crowd
  { const p = new Parts(), R = mulberry32(3), cc = ['#e33', '#fd3', '#39f', '#fff', '#3c6', '#f80', '#c3f', '#222'];
    for (let r = 0; r < 8; r++) { BX(p, '#8d939c', 0, 0.5 + r * 0.6, r * 0.9, 20, 0.6 + r * 0.0, 0.9); for (let k = 0; k < 26; k++) BX(p, cc[(R() * cc.length) | 0], -9.6 + k * 0.76, 1.05 + r * 0.6, r * 0.9 - 0.1, 0.42, 0.5, 0.3); }
    BX(p, '#5d636c', 0, 3, 7.4, 20, 6, 0.4); BX(p, '#e8eaee', 0, 7.6, 3.2, 21, 0.3, 9, -0.12); for (const x of [-9.8, 0, 9.8]) p.add(GEO.cyl8, '#5d636c', x, 3.8, 7.2, 0, 0, 0, 0.15, 7.6, 0.15); M.stand = p.merge(); }
  // container + crane for the harbour
  { const p = new Parts(); BX(p, '#ffffff', 0, 1.3, 0, 2.45, 2.6, 12); for (let k = 0; k < 12; k++) BX(p, '#000000', 1.23, 1.3, -5.6 + k, 0.02, 2.4, 0.08, 0, 0, 0, 0.15); M.container = p.merge(); }
  { const p = new Parts(), c = '#d9a21b'; for (const x of [-6, 6]) for (const z of [-5, 5]) p.add(GEO.box, c, x, 14, z, 0, 0, 0, 0.8, 28, 0.8); BX(p, c, 0, 28, 0, 14, 1.4, 11); BX(p, c, 0, 30, 10, 2, 2, 60); BX(p, '#333', 0, 31.5, -12, 4, 3, 4); M.crane = p.merge(); }
  return M;
}
// ---------------------------------------------------------------- 3D renderer (Three.js)
const QUALITY = {
  low: { pr: 1.25, shadows: false, bloom: false, scen: 0.45, map: 0, far: 1100, cell: 14, rain: 450, aniso: 4 },
  medium: { pr: 2, shadows: true, bloom: false, scen: 0.8, map: 1024, far: 1600, cell: 11, rain: 1000, aniso: 8 },
  high: { pr: 2, shadows: true, bloom: true, scen: 1, map: 2048, far: 2300, cell: 9, rain: 1800, aniso: 16 }
};
let renderer = null, scene = null, camera = null, composer = null, bloomPass = null, renderPass = null, canvas3d = null;
let prScale = 1, qName = '', Q = QUALITY.medium, autoQ = 'medium', softGPU = false, gpuName = '', r3ready = false;
let hemi, sun, skyMat, skyMesh, stars, pmrem, envRT = null, trackGroup = null, rainLines = null, parts = null, roadMat = null, gantryMats = [], sceneDef = null, sceneRain = false;
let smoke = null, skids = null, gScene, gCam, gCar = null, gKey = '', gT = 0, gEnv = null;
const sunDir = new THREE.Vector3(0, 1, 0), raceDispose = [], tr3 = o => (raceDispose.push(o), o);
function pickAutoQuality() {
  const mem = navigator.deviceMemory || 4, cores = navigator.hardwareConcurrency || 4;
  if (softGPU) return 'low';
  if (isTouchDev()) return (mem <= 2 || cores <= 4) ? 'low' : 'medium';
  return cores <= 2 ? 'medium' : 'high';
}
const effQuality = () => ['low', 'medium', 'high'].includes(settings.gfx) ? settings.gfx : autoQ;
function init3D() {
  canvas3d = $('gl');
  try { const probe = document.createElement('canvas'); if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return false;
    renderer = new THREE.WebGLRenderer({ canvas: canvas3d, antialias: true, powerPreference: 'high-performance', stencil: false }); // MSAA on every tier: crisp edges on phones too
  } catch (e) { console.warn('WebGL unavailable', e); renderer = null; return false; }
  const gl = renderer.getContext();
  try { const ext = /firefox/i.test(navigator.userAgent) ? null : gl.getExtension('WEBGL_debug_renderer_info'); gpuName = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)); } catch (e) { }
  softGPU = /swiftshader|llvmpipe|softpipe|software|basic render/i.test(gpuName); autoQ = pickAutoQuality();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvas3d.addEventListener('webglcontextlost', e => e.preventDefault(), false);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.15, 9000); camera.rotation.order = 'YXZ';
  pmrem = new THREE.PMREMGenerator(renderer);
  hemi = new THREE.HemisphereLight(0xffffff, 0x445533, 1.2); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 2.4); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 500 }); sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; scene.add(sun, sun.target);
  skyMat = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sunCol: { value: new THREE.Color() }, sunDir: { value: sunDir }, sunSize: { value: 1 }, glow: { value: 1 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = (modelMatrix*vec4(position,0.)).xyz; vec4 p = projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 top, bot, sunCol, sunDir; uniform float sunSize, glow; varying vec3 vDir;
      void main(){ vec3 d = normalize(vDir); float h = clamp(d.y, 0., 1.); vec3 c = mix(bot, top, pow(h, 0.55));
        float s = max(dot(d, normalize(sunDir)), 0.); c += sunCol * (smoothstep(0.9993, 0.9997, s) * 8. * sunSize + pow(s, 14.) * 0.45 * glow + pow(s, 3.) * 0.12 * glow);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`, side: THREE.BackSide, depthWrite: false, fog: false });
  skyMesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 32, 16), skyMat); skyMesh.renderOrder = -10; skyMesh.frustumCulled = false; scene.add(skyMesh);
  { const n = 900, pos = new Float32Array(n * 3), R = mulberry32(5); for (let i = 0; i < n; i++) { const a = R() * Math.PI * 2, e = Math.asin(0.08 + R() * 0.92); pos.set([Math.cos(a) * Math.cos(e) * 4500, Math.sin(e) * 4500, Math.sin(a) * Math.cos(e) * 4500], i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    stars = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.8, depthWrite: false })); stars.frustumCulled = false; scene.add(stars); }
  // particles (spray, dust, sparks, boost)
  { const n = 600, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage));
    parts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.7, map: radialTex(), vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
    parts.frustumCulled = false; parts.userData = { n, i: 0, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3), col: new Float32Array(n * 3) }; scene.add(parts); }
  // tyre smoke (normal blending, per-particle alpha)
  { const n = 360, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 4), 4).setUsage(THREE.DynamicDrawUsage));
    smoke = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.6, map: radialTex(), vertexColors: true, transparent: true, depthWrite: false }));
    smoke.frustumCulled = false; smoke.userData = { n, i: 0, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3) }; scene.add(smoke); }
  // skid marks: ring buffer of dark quads laid on the asphalt
  { const n = 1400, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 18), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 24), 4).setUsage(THREE.DynamicDrawUsage));
    skids = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4, toneMapped: false }));
    skids.frustumCulled = false; skids.renderOrder = 1; skids.userData = { n, i: 0 }; scene.add(skids); }
  // rain streaks around the camera
  { const n = 1800, g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 6), 3).setUsage(THREE.DynamicDrawUsage));
    rainLines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaabbd0, transparent: true, opacity: 0.45, depthWrite: false })); rainLines.frustumCulled = false; rainLines.visible = false;
    const R = mulberry32(9), off = new Float32Array(n * 3); for (let i = 0; i < n; i++) { off[i * 3] = (R() - 0.5) * 60; off[i * 3 + 1] = R() * 24; off[i * 3 + 2] = (R() - 0.5) * 60; } rainLines.userData = { n, off }; scene.add(rainLines); }
  initShowroom();
  addEventListener('resize', resize3D);
  r3ready = true; applyGfx(true); resize3D();
  return true;
}
function noiseTex(size, base, amp, seed, fn) {
  const c = mk(size, size, (g) => { const id = g.createImageData(size, size), R = mulberry32(seed); for (let i = 0; i < size * size; i++) { const v = base + (R() - 0.5) * amp; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; } g.putImageData(id, 0, 0); if (fn) fn(g, size, R); });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = Math.min(Q.aniso || 8, renderer.capabilities.getMaxAnisotropy()); return t;
}
let _radial = null;
function radialTex() { if (_radial) return _radial; const c = mk(64, 64, g => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }); _radial = new THREE.CanvasTexture(c); return _radial; }
function textTex(w, h, fn) { const t = new THREE.CanvasTexture(mk(w, h, fn)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return tr3(t); }
function applyGfx(force) {
  if (!renderer) return;
  const q = effQuality(); const info = $('gfxInfo');
  if (info) info.textContent = `Using ${q} quality${settings.gfx === 'auto' ? ' (picked automatically' + (softGPU ? ', software graphics detected' : '') + ')' : ''}. ${q === 'low' ? 'No shadows or glow, simpler materials.' : q === 'medium' ? 'Shadows on, glow off.' : 'Shadows, reflections and neon glow on.'}`;
  if (q === qName && !force) return;
  const prev = qName; qName = q; Q = QUALITY[q];
  renderer.shadowMap.enabled = Q.shadows; sun.castShadow = Q.shadows; renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; prScale = 1;
  if (Q.shadows) { sun.shadow.mapSize.set(Q.map, Q.map); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (Q.bloom && !composer) { composer = new EffectComposer(renderer); renderPass = new RenderPass(scene, camera); composer.addPass(renderPass); bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 1.6); composer.addPass(bloomPass); composer.addPass(new OutputPass()); }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  if ((prev === 'low') !== (q === 'low') || !MAT.paint) { initMaterials(q === 'low'); if (typeof onMaterialsChanged === 'function') onMaterialsChanged(); }
  resize3D();
}
function resize3D() {
  if (!renderer) return;
  const w = Math.max(320, innerWidth), h = Math.max(200, innerHeight), pr = Math.max(1, Math.min(window.devicePixelRatio || 1, Q.pr) * prScale); // device pixels up to the tier cap (2x), scaled down only by the auto frame-rate governor
  renderer.setPixelRatio(pr); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); if (gCam) { gCam.aspect = w / h; gCam.updateProjectionMatrix(); }
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); bloomPass.resolution.set(w * pr / 2, h * pr / 2); }
}
function updateEnv(night) {
  if (envRT) { envRT.dispose(); envRT = null; }
  const es = new THREE.Scene(), m = new THREE.Mesh(new THREE.SphereGeometry(100, 24, 12), skyMat); es.add(m);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(400, 400).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: colorLin(sceneDef.ground).multiplyScalar(0.6) })); g.position.y = -2; es.add(g);
  envRT = pmrem.fromScene(es, 0, 0.1, 300); scene.environment = envRT.texture; scene.environmentIntensity = night ? 0.45 : 0.8;
  m.geometry.dispose(); g.geometry.dispose(); g.material.dispose();
}

// ---------------------------------------------------------------- circuit construction
function clearCircuit3D() { if (skids) { skids.geometry.attributes.color.array.fill(0); skids.geometry.attributes.color.needsUpdate = true; skids.geometry.attributes.position.array.fill(0); skids.geometry.attributes.position.needsUpdate = true; skids.userData.i = 0; } if (smoke) smoke.userData.life.fill(0); if (trackGroup) { scene.remove(trackGroup); trackGroup = null; } raceDispose.forEach(o => o.dispose && o.dispose()); raceDispose.length = 0; }
// value noise for terrain
function vnoise(x, z, seed) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, h = (a, b) => hash(a * 157.3 + b * 311.7 + seed * 17.1); const u = smooth(xf), v = smooth(zf); return lerp(lerp(h(xi, zi), h(xi + 1, zi), u), lerp(h(xi, zi + 1), h(xi + 1, zi + 1), u), v); }
const fbm = (x, z, s) => vnoise(x, z, s) * 0.55 + vnoise(x * 2.1, z * 2.1, s + 1) * 0.28 + vnoise(x * 4.3, z * 4.3, s + 2) * 0.17;
const gridPos = k => ({ i: mod(Math.round(-(12 + k * 8) / DS), T.n), lat: (k % 2 ? 1 : -1) * Math.min(3, T.hw * 0.4) });
function pitLaneLat(ii) { const p = T.pit, n = T.n, dIn = mod(ii - p.entry, n), dOut = mod(p.exit - ii, n); if (dIn < 40) return lerp(T.hw - 2, p.off, smooth(dIn / 40)); if (dOut < 40) return lerp(T.hw - 3, p.off, smooth(dOut / 40)); return p.off; }
const inPit = ii => mod(ii - T.pit.entry, T.n) <= mod(T.pit.exit - T.pit.entry, T.n);
function buildCircuit3D(def, rain) {
  clearCircuit3D(); sceneDef = def; sceneRain = rain; trackGroup = new THREE.Group(); scene.add(trackGroup);
  const night = def.night, n = T.n, low = qName === 'low', R = mulberry32(def.id.length * 977 + 13), theme = def.theme;
  // ---- sky, light, fog
  const st = colorLin(def.sky.top), sb = colorLin(def.sky.bot), sc = colorLin(def.sky.sun);
  if (rain) { const grey = new THREE.Color(night ? 0.02 : 0.32, night ? 0.02 : 0.35, night ? 0.04 : 0.4); st.lerp(grey, 0.75); sb.lerp(grey.clone().multiplyScalar(1.4), 0.7); sc.multiplyScalar(0.25); }
  skyMat.uniforms.top.value.copy(st); skyMat.uniforms.bot.value.copy(sb); skyMat.uniforms.sunCol.value.copy(sc); skyMat.uniforms.sunSize.value = night ? 0.35 : 1; skyMat.uniforms.glow.value = night ? 0.25 : 1;
  const e = def.sunEl * Math.PI / 180; sunDir.set(Math.sin(def.sunAz) * Math.cos(e), Math.sin(e), Math.cos(def.sunAz) * Math.cos(e)).normalize();
  stars.visible = night && !rain;
  hemi.color.set(night ? 0x8d9cff : 0xdfe9ff); hemi.groundColor.copy(colorLin(def.ground).multiplyScalar(0.6)); hemi.intensity = night ? 1.1 : rain ? 1.5 : 1.15;
  sun.color.copy(night ? new THREE.Color(0xdfe6ff) : colorLin(def.sky.sun)); sun.intensity = night ? 1.5 : rain ? 0.9 : 2.6;
  scene.fog = new THREE.Fog(sb.clone(), rain ? 60 : 250, rain ? Math.min(700, Q.far) : Q.far); scene.background = null;
  updateEnv(night);
  if (bloomPass) { bloomPass.threshold = night ? 1.0 : 1.6; bloomPass.strength = night ? 0.5 : 0.4; }
  // ---- distance field from the circuit (for terrain + scenery placement)
  const cs = Q.cell, M = 650, x0 = T.minX - M, z0 = T.minZ - M, NX = Math.ceil((T.maxX - T.minX + 2 * M) / cs) + 1, NZ = Math.ceil((T.maxZ - T.minZ + 2 * M) / cs) + 1;
  const D = new Float32Array(NX * NZ).fill(1e9), TY = new Float32Array(NX * NZ), wall = T.wall, rad = wall + 80, rc = Math.ceil(rad / cs);
  for (let i = 0; i < n; i++) { const gx = Math.round((T.X[i] - x0) / cs), gz = Math.round((T.Z[i] - z0) / cs);
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) { const X = gx + a, Z = gz + b; if (X < 0 || Z < 0 || X >= NX || Z >= NZ) continue; const k = Z * NX + X, dx = x0 + X * cs - T.X[i], dz = z0 + Z * cs - T.Z[i], d = Math.hypot(dx, dz); if (d < D[k]) { D[k] = d; TY[k] = T.Y[i]; } } }
  // coarse inverse-distance height for far cells
  const cp = []; for (let i = 0; i < n; i += 20) cp.push([T.X[i], T.Z[i], T.Y[i]]);
  const Hh = new Float32Array(NX * NZ), amp = theme === 'mountain' ? 1 : theme === 'modern' ? 0.12 : 0, water = theme === 'city';
  for (let Z = 0; Z < NZ; Z++) for (let X = 0; X < NX; X++) {
    const k = Z * NX + X, x = x0 + X * cs, z = z0 + Z * cs; let base;
    if (D[k] < 1e8) base = TY[k]; else { let sw = 0, sy = 0; for (const p of cp) { const d2 = (p[0] - x) ** 2 + (p[1] - z) ** 2 + 400, w = 1 / (d2 * d2); sw += w; sy += w * p[2]; } base = sy / sw; }
    Hh[k] = base - 0.35;
  }
  for (let pass = 0; pass < 8; pass++) { const H2 = Hh.slice(); for (let Z = 1; Z < NZ - 1; Z++) for (let X = 1; X < NX - 1; X++) { const k = Z * NX + X; if (D[k] < wall + 6) continue; Hh[k] = (H2[k] * 2 + H2[k - 1] + H2[k + 1] + H2[k - NX] + H2[k + NX]) / 6; } }
  const ctrX = (T.minX + T.maxX) / 2, ctrZ = (T.minZ + T.maxZ) / 2;
  const tPos = new Float32Array(NX * NZ * 3), tCol = new Float32Array(NX * NZ * 3), g1 = colorLin(def.ground), g2 = colorLin(def.ground2), rock = colorLin([118, 112, 104]), snow = colorLin([235, 240, 248]), cc = new THREE.Color();
  for (let Z = 0; Z < NZ; Z++) for (let X = 0; X < NX; X++) {
    const k = Z * NX + X, x = x0 + X * cs, z = z0 + Z * cs, d = D[k], w = smooth(clamp((d - wall - 4) / 140, 0, 1));
    let y = Hh[k] + w * amp * (fbm(x / 180, z / 180, 3) * 70 - 20 + (theme === 'mountain' ? smooth(clamp((d - 200) / 500, 0, 1)) * 160 * fbm(x / 400, z / 400, 7) : 0));
    if (water && z < -40 && d > wall + 3) y = -6;
    tPos[k * 3] = x; tPos[k * 3 + 1] = y; tPos[k * 3 + 2] = z;
    cc.copy(g1).lerp(g2, fbm(x / 60, z / 60, 11));
    if (theme === 'mountain') { const hgt = y - Hh[k]; if (hgt > 25) cc.lerp(rock, clamp((hgt - 25) / 40, 0, 1)); if (y > 190) cc.lerp(snow, clamp((y - 190) / 50, 0, 1)); }
    if (theme === 'city' && d < 1e8) cc.lerp(colorLin([62, 64, 74]), 0.5);
    tCol[k * 3] = cc.r; tCol[k * 3 + 1] = cc.g; tCol[k * 3 + 2] = cc.b;
  }
  const idx = []; for (let Z = 0; Z < NZ - 1; Z++) for (let X = 0; X < NX - 1; X++) { const a = Z * NX + X; idx.push(a, a + NX, a + 1, a + 1, a + NX, a + NX + 1); }
  const tg = tr3(new THREE.BufferGeometry()); tg.setAttribute('position', new THREE.BufferAttribute(tPos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(tCol, 3)); tg.setIndex(idx); tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, MAT.matte); terrain.receiveShadow = true; trackGroup.add(terrain);
  const sampleD = (x, z) => { const X = Math.round((x - x0) / cs), Z = Math.round((z - z0) / cs); if (X < 0 || Z < 0 || X >= NX || Z >= NZ) return { d: 1e9, y: 0 }; const k = Z * NX + X; return { d: D[k], y: tPos[k * 3 + 1] }; };
  if (water) { const wm = tr3(new THREE.MeshStandardMaterial({ color: 0x0a1830, roughness: 0.18, metalness: 0.6 })); const wg = tr3(new THREE.PlaneGeometry(6000, 3000).rotateX(-Math.PI / 2)); const wmesh = new THREE.Mesh(wg, low ? tr3(new THREE.MeshPhongMaterial({ color: 0x0a1830, shininess: 90 })) : wm); wmesh.position.set(ctrX, -1.4, -40 - 1500); trackGroup.add(wmesh); }
  // ---- road ribbon (textured asphalt with white edge lines)
  const asphalt = tr3(noiseTex(low ? 256 : 512, rain ? 74 : 92, 30, 4, (g, s, Rr) => { const u = s / 256; for (let i = 0; i < 900 * u; i++) { const v = Rr(); g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.08 + Rr() * 0.1})` : `rgba(255,255,255,${0.05 + Rr() * 0.07})`; g.fillRect(Rr() * s, Rr() * s, u * (1 + Rr() * 1.5), u * (1 + Rr() * 1.5)); } g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(2 * u, 0, 4 * u, s); g.fillRect(s - 6 * u, 0, 4 * u, s); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(0,0,0,${0.04 + Rr() * 0.05})`; g.fillRect(s * 0.25 + Rr() * s * 0.5 - 3 * u, 0, (3 + Rr() * 4) * u, s); } }));
  { const pos = [], uv = [], ind = []; const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i <= n; i++) { const ii = i % n; for (const [lat, u] of [[-T.hw, 0], [T.hw, 1]]) { trackPoint(ii, lat, p); pos.push(p.x, T.Y[ii] + 0.03, p.z); uv.push(u, i * DS / 14); } if (i < n) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(ind); g.computeVertexNormals();
    roadMat = tr3(low ? new THREE.MeshLambertMaterial({ map: asphalt, color: rain ? 0xb8bcc4 : 0xffffff }) : new THREE.MeshStandardMaterial({ map: asphalt, roughness: rain ? 0.32 : 0.9, metalness: rain ? 0.15 : 0, color: rain ? 0xaeb4bf : 0xffffff }));
    const road = new THREE.Mesh(g, roadMat); road.receiveShadow = true; trackGroup.add(road); }
  // ---- kerbs, run-off and skirts (vertex coloured quads)
  { const P = [], C = [], pa = { x: 0, z: 0, y: 0 }, pb = { x: 0, z: 0, y: 0 }, pc = { x: 0, z: 0, y: 0 }, pd = { x: 0, z: 0, y: 0 };
    const RED = colorLin([214, 30, 40]), WHT = colorLin([236, 236, 236]), r1 = colorLin(theme === 'modern' ? [104, 108, 118] : theme === 'city' ? [74, 76, 86] : [176, 160, 128]), r2 = theme === 'city' ? colorLin([118, 118, 126]) : g1.clone().multiplyScalar(0.92), grassEdge = colorLin([84, 120, 60]);
    const quad = (i, la, lb, ya, yb, ca, cb) => { const j = (i + 1) % n; trackPoint(i, la, pa); trackPoint(i, lb, pb); trackPoint(j, la, pc); trackPoint(j, lb, pd);
      const Ya = T.Y[i], Yb = T.Y[j]; P.push(pa.x, Ya + ya, pa.z, pc.x, Yb + ya, pc.z, pb.x, Ya + yb, pb.z, pb.x, Ya + yb, pb.z, pc.x, Yb + ya, pc.z, pd.x, Yb + yb, pd.z);
      for (const c of [ca, ca, cb, cb, ca, cb]) C.push(c.r, c.g, c.b); };
    const r1w = theme === 'modern' ? Math.min(10, T.def.runoff * 0.5) : theme === 'city' ? T.def.runoff - 1.5 : 5;
    for (let i = 0; i < n; i++) for (const sg of [-1, 1]) {
      const kerb = T.KERB[i], kc = kerb ? ((i >> 1) % 2 ? RED : WHT) : WHT, a = T.hw, b = T.hw + (kerb ? KERB_W : 0.35), c2 = Math.min(wall, b + r1w), d2 = wall + 4;
      const L = v => v * sg, f = (x, y) => sg > 0 ? [x, y] : [y, x];
      const q = (la, lb, ya, yb, ca, cb) => { if (sg > 0) quad(i, la, lb, ya, yb, ca, cb); else quad(i, -lb, -la, yb, ya, cb, ca); };
      q(a, b, 0.04, 0.06, kc, kc); q(b, c2, 0.02, 0.0, r1, r1); q(c2, d2, 0.0, -0.12, r2, theme === 'city' ? r2 : grassEdge); q(d2, d2 + 0.01, -0.12, -3, theme === 'city' ? r2 : grassEdge, grassEdge);
      void L; void f;
    }
    // pit lane surface
    const PL = colorLin([70, 72, 80]), LINE = colorLin([240, 240, 240]), YEL = colorLin([255, 210, 40]);
    for (let k = 0, i = T.pit.entry; k < n && mod(i - T.pit.entry, n) <= mod(T.pit.exit - T.pit.entry, n); k++, i = (i + 1) % n) {
      const lc = pitLaneLat(i), lc2 = pitLaneLat((i + 1) % n), j = (i + 1) % n; trackPoint(i, lc - 3.6, pa); trackPoint(i, lc + 3.6, pb); trackPoint(j, lc2 - 3.6, pc); trackPoint(j, lc2 + 3.6, pd);
      const y0 = T.Y[i] + 0.05, y1 = T.Y[j] + 0.05, box = Math.abs(mod(i - T.pit.box + 4, n)) < 8, cl = box ? YEL : PL;
      P.push(pa.x, y0, pa.z, pc.x, y1, pc.z, pb.x, y0, pb.z, pb.x, y0, pb.z, pc.x, y1, pc.z, pd.x, y1, pd.z); for (let m = 0; m < 6; m++) C.push(cl.r, cl.g, cl.b);
      if (i % 2 === 0) { trackPoint(i, lc - 3.6, pa); trackPoint(i, lc - 3.3, pb); trackPoint(j, lc2 - 3.6, pc); trackPoint(j, lc2 - 3.3, pd); P.push(pa.x, y0 + 0.01, pa.z, pc.x, y1 + 0.01, pc.z, pb.x, y0 + 0.01, pb.z, pb.x, y0 + 0.01, pb.z, pc.x, y1 + 0.01, pc.z, pd.x, y1 + 0.01, pd.z); for (let m = 0; m < 6; m++) C.push(LINE.r, LINE.g, LINE.b); }
    }
    // start line (checkered) + grid slots
    const CB = colorLin([12, 12, 12]);
    for (let k = 0; k < 14; k++) { const la = -T.hw + k * (2 * T.hw / 14), lb = la + 2 * T.hw / 14; for (let r = 0; r < 2; r++) { const i0 = r, cl = (k + r) % 2 ? CB : WHT; trackPoint(i0, la, pa); trackPoint(i0, lb, pb); trackPoint(i0 + 1, la, pc); trackPoint(i0 + 1, lb, pd); const y = T.Y[0] + 0.045; P.push(pa.x, y, pa.z, pc.x, y, pc.z, pb.x, y, pb.z, pb.x, y, pb.z, pc.x, y, pc.z, pd.x, y, pd.z); for (let m = 0; m < 6; m++) C.push(cl.r, cl.g, cl.b); } }
    for (let k = 0; k < 10; k++) { const gp = gridPos(k), i0 = mod(gp.i + 1, n); trackPoint(i0, gp.lat - 1.1, pa); trackPoint(i0, gp.lat + 1.1, pb); trackPoint(i0, gp.lat - 1.1, pc); trackPoint(mod(i0 + 1, n), gp.lat - 1.1, pc); trackPoint(mod(i0 + 1, n), gp.lat + 1.1, pd); const y = T.Y[i0] + 0.045; P.push(pa.x, y, pa.z, pc.x, y, pc.z, pb.x, y, pb.z, pb.x, y, pb.z, pc.x, y, pc.z, pd.x, y, pd.z); for (let m = 0; m < 6; m++) C.push(WHT.r, WHT.g, WHT.b); }
    // sector lines (subtle)
    for (let t = 0; t < P.length; t += 9) for (let q = 0; q < 3; q++) { const a = P[t + 3 + q]; P[t + 3 + q] = P[t + 6 + q]; P[t + 6 + q] = a; const b = C[t + 3 + q]; C[t + 3 + q] = C[t + 6 + q]; C[t + 6 + q] = b; } // upward-facing winding
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, MAT.matte); m.receiveShadow = true; trackGroup.add(m); }
  // ---- barriers (instanced)
  const SCN = sceneryModels(); for (const k in SCN) tr3(SCN[k]);
  const inst = {}; const put = (key, x, y, z, yaw, s = 1, sy = 1, tint) => { (inst[key] || (inst[key] = [])).push([x, y, z, yaw, s, sy, tint]); };
  { const p = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < n; i += 2) for (const sg of [-1, 1]) {
      const h = T.H[i], tight = Math.abs(T.K[i]) > 0.006 && Math.sign(T.K[i]) === -sg;
      if (sg > 0 && inPit(i)) { const dIn = mod(i - T.pit.entry, n), dOut = mod(T.pit.exit - i, n); if (dIn > 40 && dOut > 40) { trackPoint(i, wall + 0.6, p); put('concrete', p.x, T.Y[i], p.z, h); } trackPoint(i, T.pit.off + 5, p); put('concrete', p.x, T.Y[i], p.z, h); continue; }
      trackPoint(i, sg * (wall + 0.5), p);
      put(theme === 'city' ? 'concrete' : tight && theme === 'modern' ? 'tyrewall' : 'armco', p.x, T.Y[i], p.z, h);
    } }
  // ---- start gantry with five red lights
  { const p = new Parts(), w = T.hw + 2.5, i0 = 2, h = T.H[i0], pp = { x: 0, y: 0, z: 0 }; trackPoint(i0, 0, pp);
    BX(p, '#3a3f48', -w, 3.6, 0, 0.5, 7.2, 0.5); BX(p, '#3a3f48', w, 3.6, 0, 0.5, 7.2, 0.5); BX(p, '#23262c', 0, 6.9, 0, 2 * w + 0.6, 1.0, 0.6);
    for (let k = 0; k < 5; k++) BX(p, '#0b0b0d', -2.4 + k * 1.2, 6.0, 0.15, 0.8, 1.0, 0.35);
    const g = tr3(p.merge()), m = new THREE.Mesh(g, MAT.carbon); m.position.set(pp.x, T.Y[i0], pp.z); m.rotation.y = h; m.castShadow = true; trackGroup.add(m);
    gantryMats = [];
    for (let k = 0; k < 5; k++) for (let r = 0; r < 2; r++) { const mat = tr3(new THREE.MeshBasicMaterial({ color: 0x220000, toneMapped: false })); if (r === 0) gantryMats.push(mat); else gantryMats[k].userData.twin = mat;
      const l = new THREE.Mesh(tr3(new THREE.CircleGeometry(0.2, 14)), gantryMats[k]); l.position.set(-2.4 + k * 1.2, 6.2 - r * 0.42, -0.04); l.rotation.y = Math.PI; m.add(l); }
    const ban = textTex(512, 64, g2 => { g2.fillStyle = '#101218'; g2.fillRect(0, 0, 512, 64); g2.fillStyle = '#ff6a1a'; g2.fillRect(0, 56, 512, 8); g2.font = 'bold 40px system-ui,sans-serif'; g2.fillStyle = '#fff'; g2.textAlign = 'center'; g2.fillText('VYRONIQ RACING', 256, 44); });
    for (const side of [1, -1]) { const b = new THREE.Mesh(tr3(new THREE.PlaneGeometry(2 * w, 0.95)), tr3(new THREE.MeshBasicMaterial({ map: ban }))); b.position.set(0, 6.9, side * 0.31); if (side < 0) b.rotation.y = Math.PI; m.add(b); } }
  // ---- pit building + grandstands
  { const p = new Parts(), glass = new Parts(), pp = { x: 0, y: 0, z: 0 }, col = theme === 'city' ? '#2b2f3b' : '#d9dde4', roof = theme === 'city' ? '#141722' : '#5b6370';
    for (let k = -30; k < 70; k += 2) { const i = mod(T.pit.box + k, n); if (!inPit(i) || mod(i - T.pit.entry, n) < 42 || mod(T.pit.exit - i, n) < 42) continue; trackPoint(i, T.pit.off + 11, pp); const h = T.H[i];
      _m4.compose(_v1.set(pp.x, T.Y[i], pp.z), _q.setFromEuler(_e.set(0, h, 0)), _v2.set(1, 1, 1));
      const box = (gp, c, x, y, z, sx, sy, sz) => { const g = GEO.box.clone().toNonIndexed(); g.applyMatrix4(new THREE.Matrix4().compose(_v3.set(x, y, z), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz))); g.applyMatrix4(_m4); gp.push(g, c); };
      box(p, col, 0, 3.5, 0, 10, 7, 4.15); box(p, roof, 0, 7.3, 0, 11, 0.6, 4.3); if ((k >> 1) % 2 === 0) box(p, '#08090c', -5.02, 2, 0, 0.1, 4, 3.6); box(glass, night ? [120, 200, 255] : [90, 140, 190], -5.1, 5.6, 0, 0.1, 1.6, 4.1); }
    const g = tr3(p.merge()); if (g) { const m = new THREE.Mesh(g, MAT.matte); m.castShadow = m.receiveShadow = true; trackGroup.add(m); }
    const gg = tr3(glass.merge()); if (gg) trackGroup.add(new THREE.Mesh(gg, night ? MAT.glow : MAT.paint));
    const stands = theme === 'modern' ? [-60, -25, 10, 45, 80] : theme === 'city' ? [-30, 20] : [-20, 25];
    for (const k of stands) { const i = mod(k * 1, n), pt = trackPoint(i, -(wall + 4), { x: 0, y: 0, z: 0 }); put('stand', pt.x, T.Y[i] - 0.3, pt.z, T.H[i] - Math.PI / 2); }
    // extra stands on the outside of the biggest corners
    const corners = []; for (let i = 0; i < n; i += 4) if (Math.abs(T.K[i]) > 0.012 && !corners.some(c => Math.abs(c - i) < 120)) corners.push(i);
    for (const i of corners.slice(0, theme === 'modern' ? 6 : 3)) { const sg = -Math.sign(T.K[i]); if (sg > 0 && inPit(i)) continue; const pt = trackPoint(i, sg * (wall + 6), { x: 0, y: 0, z: 0 }); put('stand', pt.x, T.Y[i] - 0.3, pt.z, T.H[i] + (sg > 0 ? Math.PI / 2 : -Math.PI / 2)); }
  }
  // ---- braking boards and billboards before the heaviest braking zones
  { const prof = speedProfile(carStats('vanta', {}), 1, 0.82), signs = [];
    for (let i = 0; i < n; i++) { const a = prof[mod(i - 75, n)], b = prof[i]; if (a - b > 22 && Math.abs(T.K[mod(i + 10, n)]) > 0.004 && !signs.some(s => Math.abs(mod(s - i + n / 2, n) - n / 2) < 150)) signs.push(i); }
    const brdTex = [150, 100, 50].map(v => textTex(128, 128, g2 => { g2.fillStyle = '#fff'; g2.fillRect(0, 0, 128, 128); g2.fillStyle = '#c8102e'; g2.fillRect(6, 6, 116, 116); g2.fillStyle = '#fff'; g2.font = 'bold 56px system-ui,sans-serif'; g2.textAlign = 'center'; g2.fillText(String(v), 64, 84); }));
    const brdMat = brdTex.map(t => tr3(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }))), bg = tr3(new THREE.PlaneGeometry(1.4, 1.4));
    const adWords = ['VYRONIQ', 'V-COINS', def.name.toUpperCase(), 'RACE CLEAN', 'APEX MODE'], adTex = adWords.map((w, k) => textTex(512, 128, g2 => { const cols = ['#ff6a1a', '#1e6bff', '#11b37a', '#7b2cff', '#c8102e']; g2.fillStyle = cols[k % 5]; g2.fillRect(0, 0, 512, 128); g2.fillStyle = '#fff'; g2.font = 'bold 72px system-ui,sans-serif'; g2.textAlign = 'center'; g2.fillText(w, 256, 90); }));
    const adMat = adTex.map(t => tr3(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide, toneMapped: !night }))), ag = tr3(new THREE.PlaneGeometry(10, 2.5));
    signs.forEach((si, k) => {
      const sg = (si & 1) ? 1 : -1, side = sg > 0 && inPit(si) ? -1 : sg;
      [150, 100, 50].forEach((dist, m) => { const i = mod(si - Math.round(dist / DS), n), pt = trackPoint(i, side * (T.hw + 2.6), { x: 0, y: 0, z: 0 }); const b = new THREE.Mesh(bg, brdMat[m]); b.position.set(pt.x, T.Y[i] + 1.2, pt.z); b.rotation.y = T.H[i] + Math.PI; trackGroup.add(b); });
      const i = mod(si + 20, n), sgo = -Math.sign(T.K[mod(si + 20, n)]) || 1; if (!(sgo > 0 && inPit(i))) { const pt = trackPoint(i, sgo * (wall + 2.5), { x: 0, y: 0, z: 0 }); const a = new THREE.Mesh(ag, adMat[k % adMat.length]); a.position.set(pt.x, T.Y[i] + 2.4, pt.z); a.lookAt(T.X[mod(i - 40, n)], T.Y[i] + 2.4, T.Z[mod(i - 40, n)]); trackGroup.add(a); }
    }); }
  // ---- scenery scatter by theme
  const scen = Q.scen, place = (count, dMin, dMax, fn) => { let tries = 0, k = 0; while (k < count && tries++ < count * 30) { const x = x0 + R() * (NX - 1) * cs, z = z0 + R() * (NZ - 1) * cs, s = sampleD(x, z); if (s.d < dMin || s.d > dMax) continue; if (water && z < -30) continue; fn(x, s.y, z); k++; } };
  if (theme === 'modern') { place(520 * scen, wall + 10, 700, (x, y, z) => put('tree', x, y, z, R() * 6, 0.8 + R() * 0.7)); place(40 * scen, wall + 14, 400, (x, y, z) => put('rock', x, y, z, R() * 6, 0.8 + R())); }
  if (theme === 'mountain') { place(1100 * scen, wall + 7, 900, (x, y, z) => put('pine', x, y - 0.3, z, R() * 6, 0.7 + R() * 0.8)); place(160 * scen, wall + 6, 600, (x, y, z) => put('rock', x, y, z, R() * 6, 0.6 + R() * 1.6)); }
  if (theme === 'city') {
    const facade = textTex(128, 128, g2 => { g2.fillStyle = '#1a1d27'; g2.fillRect(0, 0, 128, 128); for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) { g2.fillStyle = '#0c0e14'; g2.fillRect(a * 16 + 3, b * 16 + 4, 10, 9); } });
    const winT = textTex(128, 128, g2 => { const Rr = mulberry32(21); g2.fillStyle = '#000'; g2.fillRect(0, 0, 128, 128); for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) if (Rr() < 0.42) { g2.fillStyle = Rr() < 0.7 ? '#ffd9a0' : '#9fd8ff'; g2.fillRect(a * 16 + 3, b * 16 + 4, 10, 9); } });
    facade.wrapS = facade.wrapT = winT.wrapS = winT.wrapT = THREE.RepeatWrapping;
    const bmat = tr3(low ? new THREE.MeshLambertMaterial({ map: facade, emissiveMap: winT, emissive: 0xffffff, emissiveIntensity: 1.3, vertexColors: true }) : new THREE.MeshStandardMaterial({ map: facade, emissiveMap: winT, emissive: 0xffffff, emissiveIntensity: 1.15, roughness: 0.6, metalness: 0.3, vertexColors: true }));
    const bp = [], bu = [], bc = [], neon = new Parts(), NEON = [[255, 40, 200], [0, 230, 255], [255, 170, 40], [140, 80, 255]];
    const addB = (x, y, z, w, h, d, yaw, tint) => { const g = new THREE.BoxGeometry(w, h, d).toNonIndexed(), uv = g.attributes.uv, pos = g.attributes.position; g.applyMatrix4(new THREE.Matrix4().compose(_v1.set(x, y + h / 2, z), _q.setFromEuler(_e.set(0, yaw, 0)), _v2.set(1, 1, 1)));
      for (let f = 0; f < 6; f++) for (let v = 0; v < 6; v++) { const ii = f * 6 + v, fw = f < 2 ? d : w; if (f === 2 || f === 3) uv.setXY(ii, 0.02, 0.02); else uv.setXY(ii, uv.getX(ii) * fw / 16, uv.getY(ii) * h / 16); }
      bp.push(...pos.array); bu.push(...uv.array); for (let v = 0; v < pos.count; v++) bc.push(tint.r, tint.g, tint.b); g.dispose(); };
    const tints = ['#9aa4c0', '#c0b0a0', '#a0b8c8', '#b8b8c8'].map(colorLin);
    place(260 * scen, wall + 14, 650, (x, y, z) => { const w = 14 + R() * 26, d = 14 + R() * 26, h = 14 + R() * R() * 110, yaw = R() * Math.PI; addB(x, y - 0.5, z, w, h, d, yaw, tints[(R() * 4) | 0]); if (R() < 0.45) { const c = NEON[(R() * 4) | 0]; neon.add(GEO.box, c, x, y + h + 0.2, z, 0, yaw, 0, w + 0.3, 0.35, d + 0.3, 2.2); } });
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(bu, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3)); g.computeVertexNormals();
    trackGroup.add(new THREE.Mesh(g, bmat)); const ng = tr3(neon.merge()); if (ng) trackGroup.add(new THREE.Mesh(ng, MAT.glow));
    // light towers along the circuit, harbour cranes and containers
    const pt = { x: 0, y: 0, z: 0 }; for (let i = 0; i < n; i += 26) { const sg = (i / 26) % 2 ? 1 : -1, off = sg > 0 && inPit(i) ? T.pit.off + 7 : wall + 3.5; trackPoint(i, sg * off, pt); put('tower', pt.x, T.Y[i], pt.z, T.H[i] + (sg > 0 ? -Math.PI / 2 : Math.PI / 2)); put('towerHead', pt.x, T.Y[i], pt.z, T.H[i] + (sg > 0 ? -Math.PI / 2 : Math.PI / 2)); }
    for (let k = 0; k < 6; k++) put('crane', -300 + k * 160, 0, -52, Math.PI / 2);
    const cc2 = ['#c0392b', '#2471a3', '#d4ac0d', '#1e8449', '#7d3c98', '#d35400'].map(colorLin);
    for (let k = 0; k < 40 * scen; k++) { const x = -420 + R() * 1100, z = -36 - R() * 0; if (x > -40 && x < 470) continue; put('container', x, -1 + ((k % 3) * 2.6) * 0, z - (k % 2) * 3, Math.PI / 2 * 0 + (R() < 0.5 ? 0 : Math.PI), 1, 1, cc2[k % 6]); }
  }
  if (theme === 'modern' || theme === 'mountain') { // a few floodlight-free light poles / marshal posts
    const pt = { x: 0, y: 0, z: 0 }; for (let i = 40; i < n; i += 160) { const sg = (i / 160) % 2 ? 1 : -1; if (sg > 0 && inPit(i)) continue; trackPoint(i, sg * (wall + 2.2), pt); put('tyrewall', pt.x, T.Y[i], pt.z, T.H[i]); }
  }
  // instanced meshes
  const _mx = new THREE.Matrix4(), _cl = new THREE.Color();
  for (const key in inst) {
    const L = inst[key], geo = SCN[key]; if (!geo) continue;
    const mat = key === 'towerHead' ? MAT.glow : key === 'tree' || key === 'pine' || key === 'rock' ? MAT.flat : MAT.matte;
    const im = new THREE.InstancedMesh(geo, mat, L.length);
    L.forEach((o, k) => { _mx.compose(_v1.set(o[0], o[1], o[2]), _q.setFromEuler(_e.set(0, o[3], 0)), _v2.set(o[4], o[4] * o[5], o[4])); im.setMatrixAt(k, _mx); if (o[6]) im.setColorAt(k, o[6]); else if (key === 'tree' || key === 'pine') im.setColorAt(k, _cl.setScalar(0.8 + hash(k) * 0.4)); });
    im.castShadow = key === 'stand' || key === 'tree' || key === 'pine' || key === 'crane'; im.receiveShadow = key !== 'towerHead'; im.computeBoundingSphere(); trackGroup.add(im);
  }
  // ---- distant backdrop. City: skyline blocks. Others: layered mountain / hill silhouettes on rings beyond the terrain.
  // (These used to be giant flat-shaded cones up to 1.7 km wide whose bases reached over the circuit: from the track
  // they showed up as a huge flat lavender slab filling the view. The rings below sit outside the terrain, take no fog,
  // and are pre-blended towards the horizon colour for aerial perspective, so they always read as far-away ridges.)
  const halfDiag = Math.hypot(T.maxX - T.minX, T.maxZ - T.minZ) / 2;
  if (theme === 'city') { const p = new Parts(), rr = halfDiag + 700, far = colorLin(def.far);
    for (let k = 0; k < 26; k++) { const a = k / 26 * Math.PI * 2 + R() * 0.2, r = rr + R() * 500, x = ctrX + Math.cos(a) * r, z = ctrZ + Math.sin(a) * r; if (Math.sin(a) < -0.2) continue; const w = 40 + R() * 80, h = 60 + R() * 200; BX(p, far, x, h / 2 - 5, z, w, h, w, 0, a, 0, 0.7); }
    const g = tr3(p.merge()); if (g) trackGroup.add(new THREE.Mesh(g, tr3(new THREE.MeshBasicMaterial({ vertexColors: true, fog: true })))); }
  else {
    let ySum = 0; for (let i = 0; i < n; i += 10) ySum += T.Y[i]; const baseY = ySum / Math.ceil(n / 10) - 30;
    const hz = sb.clone(), farC = colorLin(def.far), snowC = colorLin([236, 240, 248]), rockC = farC.clone().multiplyScalar(0.8), green = colorLin(def.ground).multiplyScalar(0.7);
    const R0 = halfDiag + 650 + 450, layers = theme === 'mountain'
      ? [{ r: R0 + 1500, hMax: 820, hMin: 220, haze: 0.62, f: 5, seed: 31, snow: 0.62 }, { r: R0 + 700, hMax: 560, hMin: 120, haze: 0.42, f: 7, seed: 17, snow: 0.72 }, { r: R0, hMax: 260, hMin: 40, haze: 0.22, f: 11, seed: 5, snow: 2, tint: green }]
      : [{ r: R0 + 600, hMax: 170, hMin: 30, haze: 0.6, f: 6, seed: 13, snow: 2 }, { r: R0, hMax: 95, hMin: 15, haze: 0.38, f: 9, seed: 7, snow: 2, tint: green }];
    const pos = [], col = [], ind = []; let base = 0; const SEG = 360, ROWS = 6, sAz = def.sunAz, cl = new THREE.Color();
    for (const L of layers) {
      const hts = new Float32Array(SEG + 1);
      for (let k = 0; k <= SEG; k++) { const a = k / SEG * Math.PI * 2, nx = Math.cos(a) * L.f, nz = Math.sin(a) * L.f; const rdg = 1 - Math.abs(fbm(nx, nz, L.seed) * 2 - 1); hts[k] = L.hMin + (L.hMax - L.hMin) * Math.pow(rdg, 1.6) * (0.55 + 0.45 * fbm(nx * 0.37 + 9, nz * 0.37, L.seed + 3)); }
      for (let k = 0; k <= SEG; k++) {
        const a = k / SEG * Math.PI * 2, x = ctrX + Math.cos(a) * L.r, z = ctrZ + Math.sin(a) * L.r, h = hts[k];
        const slope = (hts[(k + 1) % SEG] - hts[(k + SEG - 1) % SEG]) / (2 * L.r * Math.PI * 2 / SEG), lit = clamp(0.92 + slope * 1.4 * Math.sin(a - sAz), 0.7, 1.12);
        for (let r = 0; r <= ROWS; r++) {
          const t = r / ROWS, y = baseY - 120 + (h + 120) * t; pos.push(x, y, z);
          cl.copy(L.tint || rockC).lerp(farC, L.tint ? 0.35 : 0.5); if (t > L.snow && h > L.hMax * 0.55) cl.lerp(snowC, smooth(clamp((t - L.snow) / (1 - L.snow) * 1.6, 0, 1)) * 0.85);
          cl.multiplyScalar(lit); cl.lerp(hz, clamp(L.haze + (1 - t) * 0.35, 0, 0.96)); col.push(cl.r, cl.g, cl.b);
        }
      }
      for (let k = 0; k < SEG; k++) for (let r = 0; r < ROWS; r++) { const i0 = base + k * (ROWS + 1) + r, i1 = i0 + ROWS + 1; ind.push(i0, i1, i0 + 1, i0 + 1, i1, i1 + 1); }
      base += (SEG + 1) * (ROWS + 1);
    }
    const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(ind);
    const bm = new THREE.Mesh(g, tr3(new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide }))); bm.renderOrder = -5; bm.frustumCulled = false; trackGroup.add(bm);
  }
  rainLines.visible = rain; rainLines.geometry.setDrawRange(0, Q.rain * 2);
}
function setGantry(nOn, green) { gantryMats.forEach((m, k) => { const c = green ? 0x0b2a0b : (k < nOn ? 0xff1a1a : 0x220000); m.color.setHex(c); if (m.userData.twin) m.userData.twin.color.setHex(c); }); }

// ---------------------------------------------------------------- car meshes in the race
function placeCar3D(o, c, dt) {
  o.position.set(c.x, c.y + 0.02, c.z); o.rotation.y = c.h;
  const sl = T.SL[c.i] || 0; o.rotation.x = lerp(o.rotation.x, -Math.atan(sl), clamp(dt * 8, 0, 1));
  const ud = o.userData, ch = ud.chassis; if (!ch) return;
  const latG = clamp((c.yaw || 0) * (c.vLong || 0) / G, -3, 3), k6 = clamp(dt * 7, 0, 1);
  ch.rotation.z = lerp(ch.rotation.z, clamp(latG * 0.022, -0.06, 0.06), k6); // body roll towards the outside of the turn
  ch.rotation.x = lerp(ch.rotation.x, clamp(-(c.aLong || 0) * 0.0032, -0.035, 0.035), k6); // nose dives under braking, squats on throttle
  ch.position.y = c.kerb && c.speed > 15 ? Math.random() * 0.03 : 0;
  const vis = c.drift === 1 ? -c.driftDir * 0.55 + c.steer * 0.2 : c.steer; ud.vSteer = lerp(ud.vSteer || 0, vis, clamp(dt * 14, 0, 1)); // counter-steer while drifting
  for (const w of ud.wheels) { w.m.rotation.x += (c.speed || 0) * Math.sign(c.vLong || 1) * dt / w.r * (c.spin && !w.front ? 1.5 : 1) * (c.lock ? 0 : 1); if (w.front) w.g.rotation.y = -ud.vSteer * 0.42; }
  if (ud.ringMat) { const tc = (TYRES[c.tyre] || TYRES.medium).col; if (ud.tyreCol !== tc) { ud.ringMat.color.set(tc); ud.tyreCol = tc; } }
  if (ud.lights) ud.lights.visible = sceneRain ? (performance.now() % 500 < 250) : c.boostT > 0 || (c.input.brake > 0.5 && c.speed > 5);
}
// ---------------------------------------------------------------- particles
function emit(x, y, z, vx, vy, vz, life, r, g, b) {
  const P = parts.userData, i = P.i; P.i = (P.i + 1) % P.n; parts.geometry.attributes.position.setXYZ(i, x, y, z);
  P.life[i] = P.max[i] = life; P.vel[i * 3] = vx; P.vel[i * 3 + 1] = vy; P.vel[i * 3 + 2] = vz; P.col[i * 3] = r; P.col[i * 3 + 1] = g; P.col[i * 3 + 2] = b;
}
function updateParticles(dt) {
  if (smoke) updateSmoke(dt);
  const P = parts.userData, pos = parts.geometry.attributes.position, col = parts.geometry.attributes.color;
  for (let i = 0; i < P.n; i++) { if (P.life[i] <= 0) { if (col.getX(i) || col.getY(i) || col.getZ(i)) col.setXYZ(i, 0, 0, 0); continue; }
    P.life[i] -= dt; const t = clamp(P.life[i] / P.max[i], 0, 1); P.vel[i * 3 + 1] -= dt * 1.5;
    pos.setXYZ(i, pos.getX(i) + P.vel[i * 3] * dt, pos.getY(i) + P.vel[i * 3 + 1] * dt, pos.getZ(i) + P.vel[i * 3 + 2] * dt); col.setXYZ(i, P.col[i * 3] * t, P.col[i * 3 + 1] * t, P.col[i * 3 + 2] * t); }
  pos.needsUpdate = col.needsUpdate = true;
}
function carEffects(c, dt) {
  if (!c.speed || settings.rm && !sceneRain) return;
  const f0 = Math.sin(c.h), f1 = Math.cos(c.h), bx = c.x - f0 * 2.6, bz = c.z - f1 * 2.6;
  if (sceneRain && c.speed > 12 && Math.random() < c.speed / 50) emit(bx + (Math.random() - 0.5) * 1.8, c.y + 0.4, bz, -f0 * 3 + (Math.random() - 0.5) * 2, 0.8 + Math.random(), -f1 * 3 + (Math.random() - 0.5) * 2, 0.7, 0.35, 0.38, 0.42);
  if (c.off && c.speed > 8 && Math.random() < 0.6) { const dust = sceneDef.theme === 'city' ? [0.3, 0.3, 0.32] : [0.5, 0.42, 0.28]; emit(bx, c.y + 0.3, bz, (Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2, 0.9, ...dust); }
  if (c.boostT > 0 && Math.random() < 0.8) emit(c.x - f0 * 2.4, c.y + 0.45, c.z - f1 * 2.4, -f0 * 4 + (Math.random() - 0.5), 0.2, -f1 * 4 + (Math.random() - 0.5), 0.35, 0.2, 0.7, 1.4);
  // sliding tyres: smoke + skid marks (near the camera only)
  const slideAmt = c.drift ? 0.6 + c.driftB * 1.2 : c.lock ? 0.7 : c.spin && c.speed > 3 ? 0.6 : Math.abs(c.vLat || 0) > 2.4 && c.speed > 10 ? 0.4 : 0;
  const near = (c.x - camera.position.x) ** 2 + (c.z - camera.position.z) ** 2 < 150 * 150, ud = c.obj && c.obj.userData, zr = ud && ud.zr || -1.6;
  if (!c.skid) c.skid = [null, null];
  for (let s = 0; s < 2; s++) {
    const side = s ? 0.84 : -0.84, r0 = -f1, r1 = f0, wx = c.x + f0 * zr - r0 * side, wz = c.z + f1 * zr - r1 * side; // rear tyre contact patch (lat sign: +side is the car's left)
    if (slideAmt > 0 && near && !c.off && !sceneRain) {
      const prev = c.skid[s]; if (prev && (wx - prev[0]) ** 2 + (wz - prev[1]) ** 2 > 0.36) { skidQuad(prev[0], prev[1], wx, wz, c.y + 0.075, Math.min(0.75, 0.35 + slideAmt * 0.4)); c.skid[s] = [wx, wz]; } else if (!prev) c.skid[s] = [wx, wz];
      if (Math.random() < 0.35 + slideAmt * 0.5) emitSmoke(wx, c.y + 0.35, wz, c.vx * 0.15 + (Math.random() - 0.5) * 1.5, 0.6 + Math.random() * 0.6, c.vz * 0.15 + (Math.random() - 0.5) * 1.5, 1.1 + Math.random() * 0.6, sceneDef.night ? 0.5 : 0.85, Math.min(0.55, 0.22 + slideAmt * 0.3));
    } else c.skid[s] = null;
  }
}
function skidQuad(x0, z0, x1, z1, y, a) {
  const U = skids.userData, i = U.i; U.i = (U.i + 1) % U.n; const P = skids.geometry.attributes.position, C = skids.geometry.attributes.color;
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz) || 1, nx = -dz / L * 0.2, nz = dx / L * 0.2, v = [x0 - nx, z0 - nz, x0 + nx, z0 + nz, x1 - nx, z1 - nz, x1 + nx, z1 + nz];
  const o = i * 18, q = [0, 2, 1, 1, 2, 3]; for (let k = 0; k < 6; k++) { P.array[o + k * 3] = v[q[k] * 2]; P.array[o + k * 3 + 1] = y; P.array[o + k * 3 + 2] = v[q[k] * 2 + 1]; }
  for (let k = 0; k < 6; k++) C.array.set([0.03, 0.03, 0.035, a], i * 24 + k * 4);
  P.needsUpdate = C.needsUpdate = true;
}
function emitSmoke(x, y, z, vx, vy, vz, life, shade, a) {
  const S = smoke.userData, i = S.i; S.i = (S.i + 1) % S.n; smoke.geometry.attributes.position.setXYZ(i, x, y, z); S.life[i] = S.max[i] = life; S.vel[i * 3] = vx; S.vel[i * 3 + 1] = vy; S.vel[i * 3 + 2] = vz;
  smoke.geometry.attributes.color.setXYZW(i, shade, shade, shade * 1.02, a);
}
function updateSmoke(dt) {
  const S = smoke.userData, pos = smoke.geometry.attributes.position, col = smoke.geometry.attributes.color; let any = false;
  for (let i = 0; i < S.n; i++) { if (S.life[i] <= 0) { if (col.getW(i)) col.setW(i, 0); continue; } any = true; S.life[i] -= dt; const t = clamp(S.life[i] / S.max[i], 0, 1), d = Math.exp(-dt * 1.6);
    S.vel[i * 3] *= d; S.vel[i * 3 + 2] *= d; pos.setXYZ(i, pos.getX(i) + S.vel[i * 3] * dt, pos.getY(i) + S.vel[i * 3 + 1] * dt, pos.getZ(i) + S.vel[i * 3 + 2] * dt); col.setW(i, col.getW(i) * (t > 0.02 ? Math.pow(t, dt * 2.2) : 0)); }
  pos.needsUpdate = col.needsUpdate = true; void any;
}
function sparks(x, y, z, n) { for (let k = 0; k < n; k++) emit(x, y + 0.3, z, (Math.random() - 0.5) * 8, 1 + Math.random() * 3, (Math.random() - 0.5) * 8, 0.4 + Math.random() * 0.3, 1.6, 1.0, 0.3); }

// ---------------------------------------------------------------- cameras
const cam = { h: 0, y: 0, init: false, shake: 0, fov: 62, lx: 0, lz: 0, px: null, py: 0, pz: 0 };
function updateCamera(c, dt, mode, snap) {
  if (!c) return;
  const sp = c.speed || 0, vh = sp > 3 ? Math.atan2(c.vx, c.vz) : c.h, ad = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  // look between where the car points and where it is actually going (shows the drift angle, keeps the road ahead in view)
  const tgtH = c.h + ad(c.h, vh) * (c.drift ? 0.6 : 0.3);
  if (snap || !cam.init || Math.hypot(c.x - cam.lx, c.z - cam.lz) > 25) { cam.h = tgtH; cam.y = c.y; cam.init = true; cam.px = null; }
  cam.lx = c.x; cam.lz = c.z;
  cam.h += ad(cam.h, tgtH) * clamp(dt * (mode === 'far' ? 4 : 5.5), 0, 1); cam.y = lerp(cam.y, c.y, clamp(dt * 5, 0, 1));
  const f0 = Math.sin(cam.h), f1 = Math.cos(cam.h);
  let fov = 60 + (settings.rm ? 0 : clamp(sp / 90, 0, 1) * 11 + (c.boostT > 0 ? 5 : 0));
  if (mode === 'cockpit' || mode === 'tcam') {
    const lift = mode === 'cockpit' ? 1.12 : 1.4, back = mode === 'cockpit' ? -0.12 : -0.62, h = c.h, cf0 = Math.sin(h), cf1 = Math.cos(h);
    camera.position.set(c.x + cf0 * back, c.y + lift, c.z + cf1 * back); camera.rotation.set(-0.07 + Math.atan(T.SL[c.i] || 0) * 0.8, h + Math.PI, -clamp((c.yaw || 0) * 0.03, -0.04, 0.04) * (settings.rm ? 0 : 1)); fov += 6; cam.px = null;
  } else {
    const dist = (mode === 'far' ? 10.5 : 7.4) + clamp(sp / 90, 0, 1) * 0.6, up = mode === 'far' ? 3.6 : 2.5;
    const tx = c.x - f0 * dist, ty = cam.y + up + (c.y - cam.y) * 0.5, tz = c.z - f1 * dist;
    // critically damped follow: no jitter from the 100 Hz physics, small lag under acceleration
    if (cam.px == null) { cam.px = tx; cam.py = ty; cam.pz = tz; } else { const k = 1 - Math.exp(-dt * 14); cam.px += (tx - cam.px) * k; cam.py += (ty - cam.py) * k; cam.pz += (tz - cam.pz) * k; }
    camera.position.set(cam.px, cam.py, cam.pz);
    camera.lookAt(c.x + f0 * 5, c.y + 1.0, c.z + f1 * 5);
  }
  if (cam.shake > 0 && !settings.rm) { camera.position.x += (Math.random() - 0.5) * cam.shake; camera.position.y += (Math.random() - 0.5) * cam.shake; cam.shake = Math.max(0, cam.shake - dt * 2); }
  cam.fov = lerp(cam.fov, fov, clamp(dt * 3, 0, 1)); if (Math.abs(camera.fov - cam.fov) > 0.05) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
  skyMesh.position.copy(camera.position); stars.position.copy(camera.position);
  // shadow box follows the camera target
  sun.target.position.set(c.x + f0 * 18, c.y, c.z + f1 * 18); sun.position.copy(sun.target.position).addScaledVector(sunDir, 160); sun.target.updateMatrixWorld();
  if (rainLines.visible) { const U = rainLines.userData, pos = rainLines.geometry.attributes.position, t = performance.now() / 1000, cx = camera.position.x, cy = camera.position.y, cz = camera.position.z, cnt = Math.min(U.n, Q.rain);
    for (let i = 0; i < cnt; i++) { const ox = U.off[i * 3], oz = U.off[i * 3 + 2], y = mod(U.off[i * 3 + 1] - t * 22, 24) - 6; const x = cx + mod(ox - cx * 0, 60) - 30 + 0, z = cz + oz; pos.setXYZ(i * 2, x, cy + y, z); pos.setXYZ(i * 2 + 1, x - (c.vx || 0) * 0.02, cy + y + 0.7, z - (c.vz || 0) * 0.02); }
    pos.needsUpdate = true; }
}
function render3D() { if (composer && Q.bloom) { renderPass.scene = scene; renderPass.camera = camera; composer.render(); } else renderer.render(scene, camera); }

// ---------------------------------------------------------------- showroom scene (menus) rendered by the same renderer
function initShowroom() {
  gScene = new THREE.Scene(); gCam = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 200);
  gScene.background = new THREE.Color(0x07080c); gScene.fog = new THREE.Fog(0x07080c, 14, 40);
  gScene.add(new THREE.HemisphereLight(0xc8d6ff, 0x1a1f2c, 1.1));
  const d = new THREE.DirectionalLight(0xffffff, 2.8); d.position.set(4, 8, 5); d.castShadow = true; d.shadow.mapSize.set(1024, 1024); Object.assign(d.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); gScene.add(d);
  const rim = new THREE.DirectionalLight(0xff8a3d, 1.6); rim.position.set(-5, 3, -5); gScene.add(rim); const rim2 = new THREE.DirectionalLight(0x3db8ff, 1.2); rim2.position.set(5, 2, -4); gScene.add(rim2);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x10131b, roughness: 0.35, metalness: 0.4 })); floor.receiveShadow = true; gScene.add(floor);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.7, 0.12, 64), new THREE.MeshStandardMaterial({ color: 0x1a1e29, roughness: 0.4, metalness: 0.6 })); disc.position.y = 0.06; disc.receiveShadow = true; gScene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.66, 0.03, 6, 96).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff6a1a, toneMapped: false })); ring.position.y = 0.12; gScene.add(ring);
  for (let k = 0; k < 7; k++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 14), new THREE.MeshBasicMaterial({ color: 0xdde6ff, toneMapped: false })); bar.position.set(-6 + k * 2, 9, 0); gScene.add(bar); }
  const es = new THREE.Scene(); es.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: 0x404858, side: THREE.BackSide }))); for (let k = 0; k < 3; k++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.4), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })); p.position.set(-4 + k * 4, 8, 0); p.rotation.x = Math.PI / 2; es.add(p); }
  gEnv = pmrem.fromScene(es, 0.02).texture; gScene.environment = gEnv; gScene.environmentIntensity = 0.9;
}
function setShowroomCar(carId, liv) {
  if (!renderer) return; const key = carId + JSON.stringify(liv) + qName;
  if (key === gKey && gCar) return; if (gCar) { gScene.remove(gCar); disposeCar3D(gCar); }
  gCar = makeCar3D(carId, liv, liv.a); gCar.traverse(m => { if (m.isMesh) m.castShadow = true; }); gCar.position.y = 0.12; gScene.add(gCar); gKey = key;
}
function renderShowroom(dt, view) {
  if (!renderer || !gCar) return; if (!settings.rm) gT += dt * 0.35;
  const a = (view && view.angle != null) ? view.angle : 0.8 + gT, d = view && view.dist || 8.6, ox = view && view.ox || 0;
  gCam.position.set(Math.sin(a) * d, 2.2, Math.cos(a) * d); gCam.lookAt(0, 0.55, 0);
  const r = new THREE.Vector3().setFromMatrixColumn(gCam.matrixWorld, 0); gCam.position.addScaledVector(r, -ox); // shift car sideways on screen
  for (const w of gCar.userData.wheels) if (w.front) w.g.rotation.y = settings.rm ? 0.2 : Math.sin(gT * 0.6) * 0.3;
  renderer.render(gScene, gCam);
}
// ---------------------------------------------------------------- race controller
const H_STEP = 1 / 100, TRACKS = new Map();
let R = null, autopilot = false;
function trackFor(id) { if (!TRACKS.has(id)) TRACKS.set(id, buildTrack(CIRCUIT(id))); T = TRACKS.get(id); return T; }
const CLS_ORDER = ['D', 'C', 'B', 'A', 'S'];
const carOfClass = cls => CARS.find(c => c.cls === cls) || CARS[0];
function startRace(cfg) {
  if (R) endRace3D();
  const def = CIRCUIT(cfg.circuit); trackFor(def.id);
  const rain = cfg.weather === 'rain', diffK = cfg.mode === 'tt' ? 'medium' : cfg.diff, diff = DIFFICULTY[diffK];
  const tt = cfg.mode === 'tt', n = T.n;
  R = { cfg, def, rain, diff, diffK, tt, laps: tt ? 999 : cfg.laps, t: 0, phase: 'grid', phaseT: 0, lightsOut: 0, holdT: 1 + Math.random() * 1.6, cars: [], player: null, acc: 0,
    msgs: [], lapRecord: false, bestLap: 0, events: [], finishOrder: [], resultsAt: 0, env: { racing: false, rain, laps: tt ? 99 : cfg.laps, wearK: cfg.laps <= 3 ? 2.2 : cfg.laps <= 5 ? 1.5 : 1 }, ghost: null, ghostRec: [], ghostT: 0, startedAt: Date.now(), hitT: 0, km: 0 };
  // player
  const pc = CAR(cfg.carId), liv = liveryOf(pc.id);
  const tyre0 = cfg.tyre || (rain ? 'wet' : 'medium');
  const P = makeCar({ id: 'you', name: 'You', team: 'VYRONIQ Works', col: liv.p, isPlayer: true, stats: carStats(pc.id, upgOf(pc.id)), tyre: tyre0, carId: pc.id, liv });
  R.player = P; R.cars.push(P);
  if (!tt) {
    const myCls = CLS_ORDER.indexOf(pc.cls), roundCls = cfg.aiClass || pc.cls, aiCls = CLS_ORDER[Math.max(CLS_ORDER.indexOf(roundCls), cfg.mode === 'career' ? myCls : CLS_ORDER.indexOf(roundCls))];
    const aiCar = carOfClass(aiCls), lv = { easy: 0, medium: 2, hard: 3 }[diffK], aiUpg = {}; UPGRADES.forEach(u => aiUpg[u.id] = lv);
    const drivers = DRIVERS.slice().sort((a, b) => b.skill - a.skill);
    drivers.forEach(d => { const c = makeCar({ id: d.id, name: d.name, team: d.team, col: d.col, stats: carStats(aiCar.id, aiUpg), carId: aiCar.id, liv: { p: d.col, s: d.col2, a: d.col2, pat: ['stripe', 'split', 'arrow', 'halo', 'solid'][d.id.charCodeAt(1) % 5] }, tyre: rain ? 'wet' : 'medium', skill: d.skill, aggr: d.aggr, ai: {},
      pace: diff.pace * lerp(0.955, 1.0, (d.skill - 0.85) / 0.12) }); R.cars.push(c); });
  }
  // grid: AI by skill, the player's slot depends on difficulty
  const slotP = tt ? 0 : cfg.gridSlot != null ? cfg.gridSlot : { easy: 7, medium: 5, hard: 3 }[diffK];
  const order = R.cars.filter(c => !c.isPlayer); order.splice(Math.min(slotP, order.length), 0, P);
  order.forEach((c, k) => { const gp = tt ? { i: mod(Math.round(-120 / DS), n), lat: 0 } : gridPos(k), pt = trackPoint(gp.i, gp.lat, { x: 0, y: 0, z: 0 }); Object.assign(c, { x: pt.x, z: pt.z, y: pt.y, h: T.H[gp.i], i: gp.i, grid: k + 1, prog: tt ? -120 : -(12 + k * 8) }); c.prevI = c.i; });
  R.cars.forEach(c => { c.lapsDone = 0; });
  if (tt) { const rec = profile.records[def.id]; if (rec && rec.ghost && rec.ghost.length > 10) R.ghost = rec.ghost; R.phase = 'race'; R.env.racing = true; R.lightsOut = 0; }
  // 3D
  buildCircuit3D(def, rain);
  R.cars.forEach(c => { c.obj = makeCar3D(c.carId, c.liv, c.isPlayer ? liv.a : c.col); trackGroup.add(c.obj); placeCar3D(c.obj, c, 0); });
  if (R.ghost) { R.ghostObj = makeCar3D(pc.id, liv, '#fff', true); R.ghostObj.visible = false; trackGroup.add(R.ghostObj); }
  cam.init = false; setGantry(0, false);
  R.bestKey = def.id; R.prevBest = (profile.records[def.id] || {}).best || 0;
  updateCamera(P, 0, settings.camera, true);
  announce(tt ? `Time trial at ${def.name}. Drive when ready.` : `${def.name}, ${R.laps} laps. You start ${ordinal(P.grid)}. Watch the lights.`);
  return R;
}
function endRace3D() { if (!R) return; R.cars.forEach(c => c.obj && disposeCar3D(c.obj)); if (R.ghostObj) disposeCar3D(R.ghostObj); }
function onMaterialsChanged() { gKey = ''; if (R && R.cars) { R.cars.forEach(c => { if (!c.obj) return; trackGroup.remove(c.obj); disposeCar3D(c.obj); c.obj = makeCar3D(c.carId, c.liv, c.isPlayer ? c.liv.a : c.col); trackGroup.add(c.obj); }); if (R.ghostObj) { trackGroup.remove(R.ghostObj); R.ghostObj = makeCar3D(R.player.carId, R.player.liv, '#fff', true); trackGroup.add(R.ghostObj); } } }
// ---------------------------------------------------------------- callbacks from physics
function onPlayerBoost() { Sound.boost(); flash('ENERGY BOOST', 'boost'); announce('Boost'); }
function onPlayerHit(kind, v) { if (!R || R.t - R.hitT < 0.4) return; R.hitT = R.t; Sound.hit(v); cam.shake = Math.min(0.35, v / 25); const p = R.player; sparks(p.x, p.y, p.z, Math.min(20, 4 + v * 1.5) | 0); if (v > 6) flash(kind === 'BARRIER' ? 'BARRIER HIT' : 'CONTACT', 'warn'); }
function onDrift(c, on) {
  if (!R || !c.isPlayer) return;
  if (on) { c.driftStartE = c.energy; if (R.env.racing) flash('DRIFT', 'boost'); return; }
  const t = c.driftT || 0; if (t < 0.6 || !R.env.racing) return;
  const bonus = Math.round(Math.min(14, (t - 0.4) * 6)); if (bonus < 1) return;
  if (c.boostT <= 0) c.energy = Math.min(100, c.energy + bonus); R.drifts = (R.drifts || 0) + 1;
  flash(`DRIFT ${t.toFixed(1)} s · +${bonus} ENERGY`, 'good');
}
function onPitStop() { Sound.pit(); const t = TYRES[R.player.pit.nextTyre || R.player.tyre]; flash(`PIT STOP · fitting ${t.name}s`, 'info'); announce(`Pit stop, fitting ${t.name} tyres.`); }
function onPitDone() { Sound.pit(); flash('GO GO GO', 'good'); announce('Pit stop complete.'); }
// ---------------------------------------------------------------- per-frame update
function updateRace(dt) {
  if (!R || R.phase === 'done') return;
  R.acc += Math.min(dt, 0.1);
  while (R.acc >= H_STEP) { R.acc -= H_STEP; stepRace(H_STEP); if (!R || R.phase === 'done') return; }
}
function stepRace(h) {
  const P = R.player;
  R.phaseT += h;
  if (R.phase === 'grid') { readInput(P); if (R.phaseT > 1.2) { R.phase = 'lights'; R.phaseT = 0; R.lit = 0; } }
  else if (R.phase === 'lights') {
    readInput(P); const lit = Math.min(5, Math.floor(R.phaseT / 0.85) + 1);
    if (lit !== R.lit) { R.lit = lit; setGantry(lit, false); Sound.beep(false); }
    if (R.phaseT > 5 * 0.85 && P.input.throttle > 0.5 && !settings.autoLaunch && !R.early) { R.early = true; }
    if (R.phaseT > 5 * 0.85 + R.holdT) {
      R.phase = 'race'; R.phaseT = 0; R.env.racing = true; R.lightsOut = R.t; setGantry(0, true); Sound.beep(true); announce('Lights out, go!');
      R.cars.forEach(c => { if (!c.isPlayer) { c.react = c.ai ? R.diff.react * (0.4 + Math.random()) : 0; c.launchT = 2.2; c.launchK = lerp(0.95, 1.12, Math.random() * c.skill); } });
      if (settings.autoLaunch) launchResult(P, 0.3);
      else if (R.early) { P.launchT = 1.6; P.launchK = 0.55; P.launchMsg = 'JUMPED THE THROTTLE · wheelspin'; flash(P.launchMsg, 'warn'); P.launchDone = true; }
    }
  }
  const racing = R.phase === 'race' || R.phase === 'finish';
  if (racing) R.t += h;
  // inputs
  for (const c of R.cars) {
    if (c.isPlayer) { if (autopilot || c.finished) { if (!c.ai) c.ai = {}; c.skill = 0.92; c.aggr = 0.4; c.pace = c.finished ? 0.7 : 0.9; aiDrive(c, R.cars, h, R.env, R.diff); } else { readInput(c); if (racing) playerAssist(c); } }
    else { if (c.react > 0) { c.react -= h; c.input.throttle = 0; c.input.brake = 0; continue; } aiDrive(c, R.cars, h, R.env, R.diff); if (c.finished) c.input.throttle *= 0.7; }
  }
  if (R.phase === 'race' && !P.launchDone && !R.tt && R.t > 0) { if (P.input.throttle > 0.5) launchResult(P, R.t - R.lightsOut); else if (R.t - R.lightsOut > 1.2) launchResult(P, 9); }
  if (settings.autoLaunch && R.phase === 'race' && R.t - R.lightsOut < 1 && !autopilot) P.input.throttle = 1;
  // physics
  for (const c of R.cars) { const prev = c.i; stepCar(c, h, R.env); tryEnterPit(c, prev); progress(c, prev); }
  collideCars(R.cars); slipstreams(R.cars);
  // ghost record / playback
  if (R.tt && P.lap >= 1) { R.ghostT += h; if (R.ghostT >= 0.1) { R.ghostT -= 0.1; R.ghostRec.push([+P.x.toFixed(2), +P.z.toFixed(2), +P.h.toFixed(3), +P.y.toFixed(2), +(P.prog - (P.lap - 1) * T.len).toFixed(1)]); } }
  // positions
  R.cars.sort((a, b) => (a.finished !== b.finished) ? (a.finished ? -1 : 1) : a.finished ? a.finishTime - b.finishTime : b.prog - a.prog);
  R.cars.forEach((c, k) => c.pos = k + 1);
  if (P.off && R.phase === 'race' && P.lap >= 1 && P.cleanLap) { P.cleanLap = false; if (!P.finished) { flash('TRACK LIMITS · lap time invalid', 'warn'); announce('Track limits, lap invalid.'); } }
  if (racing && P.speed) R.km += P.speed * h / 1000;
  if (R.phase === 'finish' && R.t > R.resultsAt) finishRace();
}
function launchResult(P, rt) {
  P.launchDone = true; let k = 1, msg;
  if (rt < 0.2) { k = 1.22; msg = `PERFECT LAUNCH · ${rt.toFixed(2)} s`; } else if (rt < 0.5) { k = 1.1; msg = `GOOD LAUNCH · ${rt.toFixed(2)} s`; } else if (rt < 9) { k = 1; msg = `SLOW REACTION · ${rt.toFixed(2)} s`; } else { msg = 'LATE START'; }
  if (settings.autoLaunch) msg = 'ASSISTED LAUNCH';
  P.launchT = 2.2; P.launchK = k; P.launchMsg = msg; flash(msg, k > 1.15 ? 'good' : k > 1 ? 'info' : 'warn'); announce(msg.replace('·', ','));
}
// lap and sector tracking based on continuous progress along the centre line
function progress(c, prevI) {
  const n = T.n, L = T.len; let di = c.i - prevI; if (di > n / 2) di -= n; if (di < -n / 2) di += n; c.prog += di * DS;
  if (!R.env.racing) return;
  // sector splits
  const inLap = c.prog - (c.lap - 1) * L;
  if (c.lap >= 1 && c.curSec < 2 && inLap >= T.sector[c.curSec] * DS && inLap < L) { c.sectors[c.curSec] = R.t - c.secStart; c.secStart = R.t; c.curSec++; if (c.isPlayer) sectorEvent(c); }
  if (c.prog >= c.lap * L) { // crossed the line
    if (c.lap >= 1) {
      const lt = R.t - c.lapStart; c.sectors[2] = R.t - c.secStart; c.lapTimes.push({ t: lt, clean: c.cleanLap, sec: c.sectors.slice() }); c.lastSectors = c.sectors.slice(); c.lapsDone++;
      if (c.cleanLap) c.cleanLaps++;
      if (c.isPlayer) lapEvent(c, lt);
      if (!c.best || (c.cleanLap && lt < c.best)) if (c.cleanLap) c.best = lt;
      if (!R.tt && c.lap >= R.laps && !c.finished) { c.finished = true; c.finishTime = R.t; R.finishOrder.push(c); if (c.isPlayer) { R.phase = 'finish'; R.resultsAt = R.t + 3.5; flash(`FINISHED ${ordinal(c.pos)}`, 'good'); announce(`Finished ${ordinal(c.pos)}.`); } }
    }
    c.lap++; c.lapStart = R.t; c.secStart = R.t; c.curSec = 0; c.sectors = []; c.cleanLap = true;
    if (c.isPlayer && c.lap > 1 && c.lap === R.laps && !R.tt) { flash('FINAL LAP', 'info'); announce('Final lap.'); }
    if (c.isPlayer && R.tt) { R.ghostRec = []; R.ghostT = 0; }
  }
}
function sectorEvent(c) {
  const k = c.curSec - 1, rec = profile.records[R.def.id], ref = rec && rec.sec ? rec.sec[k] : 0, t = c.sectors[k];
  R.lastSplit = { k, t, d: ref ? t - ref : null, at: performance.now() };
}
function lapEvent(c, lt) {
  const id = R.def.id, rec = profile.records[id] || (profile.records[id] = { best: 0 });
  const pb = c.cleanLap && (!rec.best || lt < rec.best);
  R.lastLap = { t: lt, clean: c.cleanLap, pb, at: performance.now() };
  profile.stats.laps++; if (R.tt) profile.stats.ttLaps++;
  if (pb) {
    rec.best = lt; rec.car = c.carId; rec.sec = c.sectors.slice(); rec.date = Date.now(); rec.weather = R.rain ? 'rain' : 'dry';
    if (R.tt && R.ghostRec.length > 10) { rec.ghost = R.ghostRec.slice(); R.ghost = rec.ghost; if (!R.ghostObj) { R.ghostObj = makeCar3D(c.carId, c.liv, '#fff', true); R.ghostObj.visible = false; trackGroup.add(R.ghostObj); } }
    if (!R.lapRecord) { R.lapRecord = true; if (R.tt) { addCoins(LAP_RECORD_BONUS, `Personal lap record at ${R.def.name} (${fmtLap(lt)})`); Sound.coin(); } }
    flash(`PERSONAL BEST ${fmtLap(lt)}`, 'good'); announce(`Personal best lap, ${fmtLap(lt)}.`);
  } else announce(`Lap ${fmtLap(lt)}${c.cleanLap ? '' : ', invalid'}.`);
  if (R.tt) { checkDaily({ circuit: id, pos: 99, diff: 'tt', weather: R.rain ? 'rain' : 'dry', cleanLaps: c.cleanLaps, grid: 1, boosts: c.boosts, tt: true }); }
  saveProfile();
}
function ghostState(t) { // interpolated ghost pose t seconds into the lap
  const g = R.ghost; if (!g) return null; const f = t / 0.1, i = Math.floor(f); if (i < 0 || i >= g.length - 1) return null; const a = g[i], b = g[i + 1], u = f - i;
  return { x: lerp(a[0], b[0], u), z: lerp(a[1], b[1], u), h: a[2] + Math.atan2(Math.sin(b[2] - a[2]), Math.cos(b[2] - a[2])) * u, y: lerp(a[3], b[3], u), d: lerp(a[4], b[4], u) };
}
function ghostDelta(P) { // time difference to the ghost at the same distance
  const g = R.ghost; if (!g || P.lap < 1) return null; const d = P.prog - (P.lap - 1) * T.len; if (d < 20) return null;
  let lo = 0, hi = g.length - 1; if (d > g[hi][4]) return null; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (g[m][4] < d) lo = m; else hi = m; }
  const u = (d - g[lo][4]) / Math.max(0.01, g[hi][4] - g[lo][4]); return (R.t - P.lapStart) - (lo + u) * 0.1;
}
function checkDaily(r) {
  const ch = dailyChallenge(), k = todayKey(); if (profile.daily.chDate === k && profile.daily.chDone) return 0;
  if (r.tt && !['cleanAM'].includes(ch.id)) return 0;
  if (ch.test(r)) { profile.daily.chDate = k; profile.daily.chDone = true; addCoins(DAILY_CHALLENGE_REWARD, `Daily challenge: ${ch.text}`); Sound.coin(); flash('DAILY CHALLENGE COMPLETE', 'good'); return DAILY_CHALLENGE_REWARD; }
  return 0;
}
// ---------------------------------------------------------------- results + rewards
function finishRace() {
  const P = R.player; R.phase = 'done';
  // unfinished cars are classified by current running order
  const order = R.finishOrder.slice(); R.cars.filter(c => !c.finished).sort((a, b) => b.prog - a.prog).forEach(c => order.push(c));
  const pos = order.indexOf(P) + 1, lines = [], cfg = R.cfg;
  const shortK = R.laps < 3 ? 0.5 : 1;
  const posR = Math.round(POS_REWARD[pos - 1] * shortK); lines.push([`${ordinal(pos)} place${shortK < 1 ? ' (short race, half rewards)' : ''}`, posR]);
  lines.push(['Finish bonus', Math.round(FINISH_BONUS * shortK)]);
  if (R.lapRecord) lines.push([`Personal lap record (${fmtLap(profile.records[R.def.id].best)})`, LAP_RECORD_BONUS]);
  const r = { circuit: R.def.id, pos, diff: R.diffK, weather: R.rain ? 'rain' : 'dry', cleanLaps: P.cleanLaps, grid: P.grid, boosts: P.boosts };
  let total = 0; for (const [why, amt] of lines) { addCoins(amt, `${why} · ${R.def.name}`); total += amt; }
  const dc = checkDaily(r); if (dc) { lines.push(['Daily challenge', dc]); total += dc; }
  // stats
  const st = profile.stats; st.races++; if (pos === 1) st.wins++; if (pos <= 3) st.podiums++; st.km += R.km; st.best = st.best ? Math.min(st.best, pos) : pos;
  // championship points
  let champ = null;
  if (cfg.mode === 'career') {
    const C = CHAMPIONSHIPS.find(c => c.id === cfg.champ), cs = careerState(C.id);
    order.forEach((c, k) => { cs.points[c.id] = (cs.points[c.id] || 0) + (POINTS[k] || 0); });
    cs.results.push({ round: cs.round, circuit: R.def.id, pos, pts: POINTS[pos - 1] || 0 }); cs.round++;
    lines.push([`Championship points (${POINTS[pos - 1] || 0} pts)`, 0]);
    if (cs.round >= C.rounds.length) { cs.done = true; const table = standings(C.id); const won = table[0].id === 'you'; cs.final = table.findIndex(x => x.id === 'you') + 1;
      if (won) { addCoins(CHAMPION_BONUS, `${C.name} champion`); lines.push([`${C.name} CHAMPION`, CHAMPION_BONUS]); total += CHAMPION_BONUS; st.champs++; Sound.coin(); } }
    champ = { C, cs };
  }
  saveProfile(); Sound.coin();
  R.results = { order: order.map((c, k) => ({ id: c.id, name: c.name, team: c.team, col: c.col, best: c.best || 0, time: c.finished ? c.finishTime : 0, laps: c.lapsDone, pos: k + 1, isPlayer: c.isPlayer, pits: c.pit.count })), pos, lines, total, champ, r };
  showResults(R.results);
}
function careerState(id) { return profile.career[id] || (profile.career[id] = { round: 0, points: {}, results: [], done: false }); }
function standings(id) {
  const cs = careerState(id), rows = [{ id: 'you', name: 'You', team: 'VYRONIQ Works', col: liveryOf(profile.car).p }].concat(DRIVERS.map(d => ({ id: d.id, name: d.name, team: d.team, col: d.col })));
  rows.forEach(r => r.pts = cs.points[r.id] || 0); return rows.sort((a, b) => b.pts - a.pts || (a.id === 'you' ? -1 : 1));
}
// time trial ends when the player quits
function endTimeTrial() {
  const P = R.player; R.phase = 'done'; profile.stats.races += 0; saveProfile();
  const lines = []; if (R.lapRecord) lines.push([`Personal lap record (${fmtLap(profile.records[R.def.id].best)})`, LAP_RECORD_BONUS]);
  R.results = { tt: true, laps: P.lapTimes, best: P.best || 0, pb: (profile.records[R.def.id] || {}).best || 0, lines, total: lines.reduce((s, l) => s + l[1], 0), order: [] };
  showResults(R.results);
}
// ---------------------------------------------------------------- render a race frame
function renderRace(dt) {
  if (!R) return; const P = R.player;
  for (const c of R.cars) { placeCar3D(c.obj, c, dt); carEffects(c, dt); }
  if (R.ghostObj) { const g = R.tt && P.lap >= 1 ? ghostState(R.t - P.lapStart) : null; R.ghostObj.visible = !!g; if (g) { R.ghostObj.position.set(g.x, g.y + 0.02, g.z); R.ghostObj.rotation.y = g.h; } }
  updateParticles(dt); updateCamera(P, dt, settings.camera);
  P.obj.visible = settings.camera !== 'tcam';
  render3D();
}
// ---------------------------------------------------------------- UI: screens
let screenId = 'splash', paused = false, setupMode = 'quick', setupCfg = null, careerSel = 'rookie';
const SCREENS = ['splash', 'home', 'garage', 'showroom', 'workshop', 'setup', 'career', 'loading', 'hud', 'pause', 'results', 'profile', 'settings'];
function show(id) {
  screenId = id; SCREENS.forEach(s => { const el = $('scr-' + s); if (el) { const on = s === id || (s === 'hud' && (id === 'pause')); el.hidden = !on; el.setAttribute('aria-hidden', on ? 'false' : 'true'); } });
  document.body.dataset.screen = id; $('coinbar').hidden = ['splash', 'hud', 'pause', 'loading'].includes(id); renderCoins();
  const f = $('scr-' + id) && $('scr-' + id).querySelector('h1,h2'); if (f && id !== 'hud') { f.setAttribute('tabindex', '-1'); try { f.focus({ preventScroll: true }); } catch (e) { } }
  if (id === 'home') renderHome(); if (id === 'garage') renderGarage(); if (id === 'showroom') renderShowroom2(); if (id === 'workshop') renderWorkshop(); if (id === 'setup') renderSetup();
  if (id === 'career') renderCareer(); if (id === 'profile') renderProfile(); if (id === 'settings') renderSettings();
}
const VIEW = { home: { ox: 2.2 }, garage: { ox: 1.9, dist: 8 }, showroom: { ox: 2.5, dist: 8.6 }, workshop: { ox: 2.3, dist: 8.4 }, setup: { ox: 2.4 }, career: { ox: 2.6 }, profile: { ox: 2.6 }, settings: { ox: 3 }, splash: { ox: 0, dist: 9 } };
function renderCoins() { $('coinAmt').textContent = fmtCoins(profile.coins); }
function toast(msg, kind) { const t = $('toast'); t.textContent = msg; t.className = 'show ' + (kind || ''); clearTimeout(t._t); t._t = setTimeout(() => t.className = '', 2600); announce(msg); }
let srT = 0; function announce(msg) { if (!settings.announce) return; const el = $('sr'); el.textContent = ''; clearTimeout(srT); srT = setTimeout(() => el.textContent = msg, 60); }
function confirmBox(text, yes, yesLabel) {
  const m = $('modal'); m.hidden = false; m.innerHTML = `<div class="box" role="dialog" aria-modal="true" aria-labelledby="mTitle"><p id="mTitle">${text}</p><div class="row"><button class="btn ghost" id="mNo">Cancel</button><button class="btn primary" id="mYes">${yesLabel || 'Confirm'}</button></div></div>`;
  $('mNo').onclick = () => { m.hidden = true; }; $('mYes').onclick = () => { m.hidden = true; yes(); }; $('mYes').focus();
}
const bars = s => Object.entries(ratings(s)).map(([k, v]) => `<div class="stat"><span>${k}</span><i><b style="width:${v.toFixed(0)}%"></b></i><em>${v.toFixed(0)}</em></div>`).join('');
const clsTag = c => `<span class="cls cls-${c.cls}">${c.cls}</span>`;
const spd = kmh => settings.units === 'mph' ? Math.round(kmh * 0.621) : Math.round(kmh);
const spdU = () => settings.units === 'mph' ? 'mph' : 'km/h';
// ---------------------------------------------------------------- home
function renderHome() {
  const ch = dailyChallenge(), done = profile.daily.chDate === todayKey() && profile.daily.chDone, car = CAR(profile.car);
  $('homeCar').innerHTML = `${clsTag(car)} <b>${car.name}</b>`;
  $('dailyBox').innerHTML = `<h3>Daily challenge <span class="pill ${done ? 'ok' : ''}">${done ? 'Completed' : '+' + DAILY_CHALLENGE_REWARD}</span></h3><p>${ch.text}</p><p class="dim">Login streak: day ${profile.daily.streak || 1} of 7 · tomorrow's bonus ${fmtCoins(400 + Math.min(7, (profile.daily.streak || 0) + 1) * 100)}</p>`;
}
// ---------------------------------------------------------------- garage (livery + car select)
let garageCar = null;
function renderGarage() {
  if (!garageCar || !profile.owned.includes(garageCar)) garageCar = profile.car;
  const c = CAR(garageCar), liv = liveryOf(c.id), s = carStats(c.id, upgOf(c.id));
  $('garageList').innerHTML = profile.owned.map(id => { const k = CAR(id); return `<button class="chip ${id === garageCar ? 'on' : ''}" data-car="${id}" aria-pressed="${id === garageCar}">${clsTag(k)} ${k.name}${id === profile.car ? ' ✓' : ''}</button>`; }).join('');
  const sw = (key) => LIVERY_COLORS.map(col => `<button class="sw ${liv[key] === col ? 'on' : ''}" style="background:${col}" data-k="${key}" data-col="${col}" aria-label="${key === 'p' ? 'Primary' : key === 's' ? 'Secondary' : 'Accent'} colour ${col}" aria-pressed="${liv[key] === col}"></button>`).join('');
  $('garageBody').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><p class="dim">${c.desc}</p>
    <div class="stats">${bars(s)}</div>
    <div class="liv"><label>Primary</label><div class="sws">${sw('p')}</div><label>Secondary</label><div class="sws">${sw('s')}</div><label>Accent</label><div class="sws">${sw('a')}</div>
    <label>Pattern</label><div class="chips">${PATTERNS.map(([k, n]) => `<button class="chip ${liv.pat === k ? 'on' : ''}" data-pat="${k}" aria-pressed="${liv.pat === k}">${n}</button>`).join('')}</div></div>
    <div class="row"><button class="btn primary" id="gSelect" ${profile.car === c.id ? 'disabled' : ''}>${profile.car === c.id ? 'Selected for racing' : 'Race with this car'}</button><button class="btn" id="gReset">Default livery</button><button class="btn" data-go="workshop">Upgrade workshop</button></div>`;
  setShowroomCar(c.id, liv);
}
function onGarageClick(e) {
  const b = e.target.closest('button'); if (!b) return; Sound.click();
  if (b.dataset.car) { garageCar = b.dataset.car; renderGarage(); return; }
  const liv = liveryOf(garageCar);
  if (b.dataset.k) { liv[b.dataset.k] = b.dataset.col; profile.liveries[garageCar] = liv; saveProfile(); renderGarage(); return; }
  if (b.dataset.pat) { liv.pat = b.dataset.pat; profile.liveries[garageCar] = liv; saveProfile(); renderGarage(); return; }
  if (b.id === 'gSelect') { profile.car = garageCar; saveProfile(); toast(`${CAR(garageCar).name} selected`); renderGarage(); }
  if (b.id === 'gReset') { delete profile.liveries[garageCar]; saveProfile(); renderGarage(); }
}
// ---------------------------------------------------------------- showroom (buy cars)
let showCar = 'kestrel';
function renderShowroom2() {
  $('showList').innerHTML = CARS.map(c => { const own = profile.owned.includes(c.id), can = profile.coins >= c.price;
    return `<div class="card ${c.id === showCar ? 'on' : ''}" data-show="${c.id}" role="button" tabindex="0" aria-label="${c.name}, class ${c.cls}, ${own ? 'owned' : fmtCoins(c.price) + ' V-Coins'}"><div class="ct">${clsTag(c)} <b>${c.name}</b></div>
      <div class="price">${own ? '<span class="pill ok">Owned</span>' : `<span class="coin">◆</span> ${fmtCoins(c.price)}`}</div>
      <div class="mini">${c.top} km/h · ${c.df.toFixed(2)} DF · ${c.w} kg</div>${!own && !can ? `<div class="dim small">Need ${fmtCoins(c.price - profile.coins)} more</div>` : ''}</div>`; }).join('');
  const c = CAR(showCar), own = profile.owned.includes(c.id);
  $('showBody').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><p class="dim">${c.desc}</p><div class="stats">${bars(carStats(c.id, {}))}</div>
    <div class="row">${own ? `<button class="btn" data-go="garage">In your garage</button>` : `<button class="btn primary" id="buyCar" ${profile.coins >= c.price ? '' : 'disabled'}>Buy for ◆ ${fmtCoins(c.price)}</button>`}</div>`;
  setShowroomCar(c.id, liveryOf(c.id));
}
function buyCar(id) {
  const c = CAR(id); if (profile.owned.includes(id)) return false;
  if (profile.coins < c.price) { toast('Not enough V-Coins', 'bad'); return false; }
  if (!spendCoins(c.price, `Bought ${c.name}`)) return false;
  profile.owned.push(id); profile.car = id; saveProfile(); Sound.coin(); toast(`${c.name} added to your garage`, 'good'); return true;
}
// ---------------------------------------------------------------- workshop (upgrades with preview)
let wsCar = null;
const STAT_LABEL = { top: ['Top speed', v => `${v.toFixed(1)} km/h`], a0: ['Acceleration', v => `${v.toFixed(2)} m/s²`], grip: ['Mechanical grip', v => v.toFixed(3)], turn: ['Turn-in', v => v.toFixed(3)], df: ['Downforce', v => v.toFixed(3)], brake: ['Braking', v => `${v.toFixed(1)} m/s²`], wear: ['Tyre wear rate', v => `${(v * 100).toFixed(0)}%`], offPen: ['Off-track penalty', v => `${(v * 100).toFixed(0)}%`], shift: ['Shift time', v => `${(v * 100).toFixed(0)} ms`], boost: ['Boost power', v => `${(v * 100).toFixed(0)}%`], recharge: ['Energy recharge', v => `${(v * 100).toFixed(0)}%`] };
function upgradePreview(carId, upId) {
  const u = Object.assign({}, upgOf(carId)), L = u[upId] || 0; if (L >= 10) return null; const a = carStats(carId, u); u[upId] = L + 1; const b = carStats(carId, u);
  return Object.keys(UPGRADES.find(x => x.id === upId).fx).map(k => ({ k, label: STAT_LABEL[k][0], from: STAT_LABEL[k][1](a[k]), to: STAT_LABEL[k][1](b[k]), better: ['wear', 'offPen', 'shift'].includes(k) ? b[k] < a[k] : b[k] > a[k] }));
}
function renderWorkshop() {
  if (!wsCar || !profile.owned.includes(wsCar)) wsCar = profile.car;
  const up = upgOf(wsCar), c = CAR(wsCar);
  $('wsCars').innerHTML = profile.owned.map(id => `<button class="chip ${id === wsCar ? 'on' : ''}" data-ws="${id}" aria-pressed="${id === wsCar}">${clsTag(CAR(id))} ${CAR(id).name}</button>`).join('');
  $('wsList').innerHTML = UPGRADES.map(U => { const L = up[U.id] || 0, cost = UPG_COST[L], pv = upgradePreview(wsCar, U.id), can = L < 10 && profile.coins >= cost;
    return `<div class="up"><div class="uh"><b>${U.name}</b><span class="lv" aria-label="Level ${L} of 10">${Array.from({ length: 10 }, (_, k) => `<i class="${k < L ? 'on' : ''}"></i>`).join('')}</span><span class="dim">Lv ${L}/10</span></div>
      <div class="dim small">${U.desc}</div>
      ${pv ? `<div class="pv">${pv.map(p => `<span>${p.label}: ${p.from} → <b class="${p.better ? 'good' : 'bad'}">${p.to}</b></span>`).join('')}</div>` : '<div class="pv"><span class="good">Fully upgraded</span></div>'}
      <button class="btn ${can ? 'primary' : ''} sm" data-up="${U.id}" ${can ? '' : 'disabled'}>${L >= 10 ? 'MAX' : `Upgrade · ◆ ${fmtCoins(cost)}`}</button></div>`; }).join('');
  $('wsStats').innerHTML = `<h2>${c.name} ${clsTag(c)}</h2><div class="stats">${bars(carStats(wsCar, up))}</div><p class="dim small">Upgrades are per car. Costs: ${UPG_COST.map(fmtCoins).join(' · ')}.</p>`;
  setShowroomCar(wsCar, liveryOf(wsCar));
}
function buyUpgrade(carId, upId) {
  const up = upgOf(carId), L = up[upId] || 0; if (L >= 10) { toast('Already at max level'); return false; }
  const cost = UPG_COST[L]; if (profile.coins < cost) { toast('Not enough V-Coins', 'bad'); return false; }
  const U = UPGRADES.find(u => u.id === upId); if (!spendCoins(cost, `${CAR(carId).name}: ${U.name} level ${L + 1}`)) return false;
  up[upId] = L + 1; profile.upg[carId] = up; saveProfile(); Sound.coin(); toast(`${U.name} upgraded to level ${L + 1}`, 'good'); return true;
}
// ---------------------------------------------------------------- race setup
function trackThumb(id, w, h) {
  const t0 = T, tr = trackFor(id); T = t0 || tr; const c = mk(w, h, g => { const sx = (w - 16) / (tr.maxX - tr.minX), sz = (h - 16) / (tr.maxZ - tr.minZ), s = Math.min(sx, sz), ox = (w - (tr.maxX - tr.minX) * s) / 2, oz = (h - (tr.maxZ - tr.minZ) * s) / 2;
    g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.9)'; g.beginPath(); for (let i = 0; i <= tr.n; i += 3) { const k = i % tr.n, x = ox + (tr.maxX - tr.X[k]) * s, y = oz + (tr.maxZ - tr.Z[k]) * s; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
    g.fillStyle = '#ff6a1a'; g.beginPath(); g.arc(ox + (tr.maxX - tr.X[0]) * s, oz + (tr.maxZ - tr.Z[0]) * s, 5, 0, 7); g.fill(); });
  return c.toDataURL();
}
const thumbs = {};
function renderSetup() {
  const tt = setupMode === 'tt'; if (!setupCfg) setupCfg = { circuit: 'vgp', laps: 3, weather: 'dry', diff: 'medium', tyre: 'medium', carId: profile.car };
  const S = setupCfg; if (!profile.owned.includes(S.carId)) S.carId = profile.car;
  $('setupTitle').textContent = tt ? 'Time Trial' : 'Quick Race';
  const opt = (name, val, label, cur) => `<button class="chip ${cur === val ? 'on' : ''}" data-set="${name}" data-val="${val}" aria-pressed="${cur === val}">${label}</button>`;
  $('setupBody').innerHTML = `
    <div class="field"><label>Circuit</label><div class="tracks">${CIRCUITS.map(c => { thumbs[c.id] = thumbs[c.id] || trackThumb(c.id, 160, 100); const rec = profile.records[c.id];
      return `<button class="trk ${S.circuit === c.id ? 'on' : ''}" data-set="circuit" data-val="${c.id}" aria-pressed="${S.circuit === c.id}"><img src="${thumbs[c.id]}" alt=""><b>${c.name}</b><span class="dim small">${(TRACKS.get(c.id).len / 1000).toFixed(2)} km · ${c.night ? 'Night' : 'Day'}</span><span class="small">PB ${rec && rec.best ? fmtLap(rec.best) : '—'}</span></button>`; }).join('')}</div><p class="dim small">${CIRCUIT(S.circuit).desc}</p></div>
    <div class="field"><label>Car</label><div class="chips">${profile.owned.map(id => opt('carId', id, `${CAR(id).cls} · ${CAR(id).name}`, S.carId)).join('')}</div></div>
    ${tt ? '' : `<div class="field"><label>Laps</label><div class="chips">${[3, 5, 10].map(l => opt('laps', l, l, S.laps)).join('')}<label class="custom">Custom <input id="lapsCustom" type="number" min="1" max="30" value="${[3, 5, 10].includes(S.laps) ? '' : S.laps}" aria-label="Custom lap count"></label></div></div>
    <div class="field"><label>AI difficulty</label><div class="chips">${opt('diff', 'easy', 'Easy', S.diff)}${opt('diff', 'medium', 'Medium', S.diff)}${opt('diff', 'hard', 'Hard', S.diff)}</div></div>`}
    <div class="field"><label>Weather</label><div class="chips">${opt('weather', 'dry', '☀ Dry', S.weather)}${opt('weather', 'rain', '🌧 Rain', S.weather)}</div></div>
    <div class="field"><label>Starting tyres</label><div class="chips">${Object.entries(TYRES).map(([k, t]) => `<button class="chip tyre ${S.tyre === k ? 'on' : ''}" data-set="tyre" data-val="${k}" aria-pressed="${S.tyre === k}"><i style="background:${t.col}"></i>${t.name}</button>`).join('')}</div>
      <p class="dim small">Soft: most grip, fastest wear. Hard: least grip, lasts longest. Wet: only good in the rain.${S.weather === 'rain' && S.tyre !== 'wet' ? ' <b class="bad">Slicks in the rain will be slippery!</b>' : ''}</p></div>`;
  setShowroomCar(S.carId, liveryOf(S.carId));
}
function onSetupClick(e) {
  const b = e.target.closest('[data-set]'); if (!b) return; Sound.click(); const k = b.dataset.set; let v = b.dataset.val; if (k === 'laps') v = +v;
  setupCfg[k] = v; if (k === 'weather') setupCfg.tyre = v === 'rain' ? 'wet' : (setupCfg.tyre === 'wet' ? 'medium' : setupCfg.tyre); renderSetup();
}
function launchFromSetup() {
  const S = setupCfg, c = $('lapsCustom'); if (c && c.value) S.laps = clamp(Math.round(+c.value) || 3, 1, 30);
  beginRace(Object.assign({ mode: setupMode === 'tt' ? 'tt' : 'quick' }, S));
}
// ---------------------------------------------------------------- career
function renderCareer() {
  $('champList').innerHTML = CHAMPIONSHIPS.map(C => { const lock = profile.earned < C.req, cs = profile.career[C.id];
    return `<button class="card ${careerSel === C.id ? 'on' : ''} ${lock ? 'locked' : ''}" data-champ="${C.id}" aria-pressed="${careerSel === C.id}"><div class="ct"><b>${C.name}</b></div><div class="small dim">${C.rounds.length} rounds · ${C.diff} AI</div>
      <div class="small">${lock ? `🔒 Earn ${fmtCoins(C.req)} V-Coins (${fmtCoins(profile.earned)} so far)` : cs ? (cs.done ? `Finished ${ordinal(cs.final)}` : `Round ${cs.round + 1} of ${C.rounds.length}`) : 'Not started'}</div></button>`; }).join('');
  const C = CHAMPIONSHIPS.find(c => c.id === careerSel), lock = profile.earned < C.req, cs = careerState(C.id), table = standings(C.id);
  const next = C.rounds[cs.round];
  $('champBody').innerHTML = `<h2>${C.name}</h2><p class="dim">${C.desc} Points: ${POINTS.join('-')}. Champion bonus ◆ ${fmtCoins(CHAMPION_BONUS)}.</p>
    <div class="cols"><div><h3>Calendar</h3><ol class="rounds">${C.rounds.map((r, k) => { const res = cs.results.find(x => x.round === k); return `<li class="${k === cs.round && !cs.done ? 'next' : ''}"><b>${CIRCUIT(r.c).name}</b> · ${r.laps} laps · ${r.weather === 'rain' ? '🌧 rain' : '☀ dry'} · class ${C.classes[k % C.classes.length]}+ field ${res ? `<span class="pill">${ordinal(res.pos)} · ${res.pts} pts</span>` : ''}</li>`; }).join('')}</ol></div>
    <div><h3>Standings</h3><table class="tbl"><thead><tr><th>#</th><th>Driver</th><th>Team</th><th>Pts</th></tr></thead><tbody>${table.map((r, k) => `<tr class="${r.id === 'you' ? 'me' : ''}"><td>${k + 1}</td><td><i class="dot" style="background:${r.col}"></i>${esc(r.name)}</td><td class="dim">${esc(r.team)}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></div></div>
    <div class="row">${lock ? `<button class="btn" disabled>Locked</button>` : cs.done ? `<button class="btn primary" id="champReset">Start a new season</button>` : `<label class="dim small">Car <select id="champCar">${profile.owned.map(id => `<option value="${id}" ${id === profile.car ? 'selected' : ''}>${CAR(id).cls} · ${CAR(id).name}</option>`).join('')}</select></label><button class="btn primary" id="champGo">Race round ${cs.round + 1}: ${CIRCUIT(next.c).name}</button>${cs.round > 0 ? '<button class="btn ghost" id="champReset">Restart season</button>' : ''}`}</div>`;
}
function startCareerRound() {
  const C = CHAMPIONSHIPS.find(c => c.id === careerSel), cs = careerState(C.id); if (profile.earned < C.req || cs.done) return;
  const r = C.rounds[cs.round], sel = $('champCar'); const carId = sel ? sel.value : profile.car;
  beginRace({ mode: 'career', champ: C.id, round: cs.round, circuit: r.c, laps: r.laps, weather: r.weather, diff: C.diff, carId, aiClass: C.classes[cs.round % C.classes.length], tyre: r.weather === 'rain' ? 'wet' : 'medium', gridSlot: cs.round === 0 ? 7 : null });
}
// ---------------------------------------------------------------- profile
function renderProfile() {
  const s = profile.stats;
  $('profBody').innerHTML = `<div class="grid4">${[['Races', s.races], ['Wins', s.wins], ['Podiums', s.podiums], ['Laps', s.laps], ['Distance', s.km.toFixed(1) + ' km'], ['Best finish', s.best ? ordinal(s.best) : '—'], ['Championships', s.champs], ['Time-trial laps', s.ttLaps], ['Total earned', '◆ ' + fmtCoins(profile.earned)], ['Total spent', '◆ ' + fmtCoins(profile.spent)], ['Cars owned', profile.owned.length + ' / ' + CARS.length], ['Balance', '◆ ' + fmtCoins(profile.coins)]].map(([k, v]) => `<div class="kv"><span>${k}</span><b>${v}</b></div>`).join('')}</div>
    <h3>Personal lap records</h3><table class="tbl"><tbody>${CIRCUITS.map(c => { const r = profile.records[c.id]; return `<tr><td>${c.name}</td><td><b>${r && r.best ? fmtLap(r.best) : '—'}</b></td><td class="dim">${r && r.car ? CAR(r.car).name : ''}</td><td class="dim">${r && r.ghost ? 'ghost saved' : ''}</td></tr>`; }).join('')}</tbody></table>
    <h3>V-Coin transactions</h3><table class="tbl tx"><thead><tr><th>When</th><th>What</th><th>Amount</th><th>Balance</th></tr></thead><tbody>${profile.tx.slice(0, 60).map(t => `<tr><td class="dim">${new Date(t.t).toLocaleString()}</td><td>${esc(t.why)}</td><td class="${t.amt > 0 ? 'good' : 'bad'}">${t.amt > 0 ? '+' : '−'}${fmtCoins(Math.abs(t.amt))}</td><td>${fmtCoins(t.bal)}</td></tr>`).join('')}</tbody></table>`;
}
// ---------------------------------------------------------------- settings
function renderSettings() {
  const tog = (k, label, hint) => `<label class="tog"><input type="checkbox" data-setk="${k}" ${settings[k] ? 'checked' : ''}><span>${label}${hint ? `<small>${hint}</small>` : ''}</span></label>`;
  const ch = (k, opts) => `<div class="chips" role="group">${opts.map(([v, l]) => `<button class="chip ${settings[k] === v ? 'on' : ''}" data-setc="${k}" data-val="${v}" aria-pressed="${settings[k] === v}">${l}</button>`).join('')}</div>`;
  $('setBody').innerHTML = `
  <section><h3>Graphics</h3>${ch('gfx', [['auto', 'Auto'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']])}<p class="dim small" id="gfxInfo"></p>
    <h3>Camera</h3>${ch('camera', [['chase', 'Chase'], ['far', 'Far chase'], ['tcam', 'T-cam'], ['cockpit', 'Cockpit']])}
    <h3>Units</h3>${ch('units', [['kmh', 'km/h'], ['mph', 'mph']])}</section>
  <section><h3>Sound</h3>${tog('sound', 'Sound effects and engine')}<label class="sl">Volume <input type="range" min="0" max="1" step="0.05" value="${settings.volume}" data-setr="volume"></label></section>
  <section><h3>Driving assists</h3>${tog('tc', 'Traction control', 'Stops wheelspin on throttle')}${tog('abs', 'ABS', 'Stops wheels locking under braking')}${tog('line', 'Racing line', 'Green = go, red = brake')}${tog('autoGear', 'Automatic gears', 'Off: E / Q or the gear buttons')}${tog('steerAssist', 'Steering assist', 'Helps you round corners and away from the barriers')}${tog('driftTap', 'Brake-tap drift', 'Tap BRAKE while steering hard at speed to slide the car')}${tog('autoLaunch', 'Assisted launch', 'Automatic good start from the lights')}</section>
  <section><h3>Controls</h3>${ch('touch', [['auto', 'Touch: auto'], ['on', 'Touch: on'], ['off', 'Touch: off']])}<label class="dim small">Button size</label>${ch('btnSize', [['s', 'Small'], ['m', 'Medium'], ['l', 'Large'], ['xl', 'Extra large']])}
    ${tog('leftHanded', 'Left-handed layout', 'Pedals on the left, steering on the right')}${tog('tilt', 'Tilt steering', 'Steer by tilting the phone (asks for motion permission)')}${tog('tiltInvert', 'Invert tilt direction')}
    <label class="sl">Steering sensitivity <input type="range" min="0.5" max="1.6" step="0.05" value="${settings.sens}" data-setr="sens"><output>${(+settings.sens).toFixed(2)}</output></label>
    <p class="dim small">Keyboard: arrows / WASD drive, X drift, Space boost, E/Q gears, P pit, T pit tyre, C camera, Esc pause. Gamepad: stick steer, RT/LT throttle/brake, A boost, X pit, Y camera, bumpers gears, Start pause.</p></section>
  <section><h3>Accessibility</h3>${tog('hc', 'High-contrast HUD')}${tog('cb', 'Colour-blind friendly colours', 'Blue/orange instead of green/red')}${tog('rm', 'Reduced motion', 'No camera shake, speed zoom or menu spin')}${tog('announce', 'Screen-reader announcements', 'Positions, laps and events read out')}</section>
  <section><h3>Data</h3><p class="dim small">Progress is saved in this browser only (no account or cloud save in V1).</p><button class="btn ghost" id="resetAll">Reset all progress</button></section>`;
  applyGfx(false);
}
function applyBodyClasses() { const b = document.body.classList; b.toggle('hc', settings.hc); b.toggle('cb', settings.cb); b.toggle('rm', settings.rm); b.toggle('lefty', settings.leftHanded); document.body.dataset.btn = settings.btnSize; b.toggle('tilt', settings.tilt); b.toggle('manual', !settings.autoGear); const touch = settings.touch === 'on' || (settings.touch === 'auto' && isTouchDev()); b.toggle('touchui', touch); }
async function enableTilt(on) {
  if (on && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') { try { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { settings.tilt = false; saveSettings(); toast('Motion permission denied, tilt steering is off', 'bad'); renderSettings(); applyBodyClasses(); return; } } catch (e) { settings.tilt = false; saveSettings(); renderSettings(); return; } }
  if (on && typeof DeviceOrientationEvent === 'undefined') { toast('Tilt steering is not supported on this device'); }
  tiltCal = null; applyBodyClasses();
}
function onSettingsInput(e) {
  const t = e.target;
  if (t.dataset.setk) { settings[t.dataset.setk] = t.checked; saveSettings(); if (t.dataset.setk === 'sound') Sound.enable(t.checked); if (t.dataset.setk === 'tilt') enableTilt(t.checked); if (t.dataset.setk === 'line') updateLineVis(); applyBodyClasses(); }
  if (t.dataset.setr) { settings[t.dataset.setr] = +t.value; saveSettings(); if (t.dataset.setr === 'volume') Sound.enable(settings.sound); const o = t.parentNode.querySelector('output'); if (o) o.textContent = (+t.value).toFixed(2); }
}
function onSettingsClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.setc) { Sound.click(); settings[b.dataset.setc] = b.dataset.val; saveSettings(); if (b.dataset.setc === 'gfx') applyGfx(false); applyBodyClasses(); renderSettings(); }
  if (b.id === 'resetAll') confirmBox('Reset all progress? This deletes your V-Coins, cars, upgrades, records and career in this browser.', () => { localStorage.removeItem(PROF_KEY); profile = newProfile(); loadProfile(); dailyLogin(); saveProfile(); toast('Progress reset'); show('home'); }, 'Reset');
}
// ---------------------------------------------------------------- loading + results
function beginRace(cfg) {
  show('loading'); $('loadInfo').textContent = `${CIRCUIT(cfg.circuit).name} · ${cfg.mode === 'tt' ? 'Time trial' : cfg.laps + ' laps'} · ${cfg.weather === 'rain' ? 'Rain' : 'Dry'}`;
  $('loadTip').textContent = ['Drift: hold a direction at speed and tap BRAKE. Keep holding to slide round, let go to straighten up. Long drifts top up your energy.', 'Tap the throttle the moment the five red lights go out for a perfect launch.', 'Brake in a straight line, then turn in: the racing line shows red where to brake.', 'Sit close behind a car on a straight to catch its slipstream.', 'The energy boost recharges fastest while braking.', 'Going beyond the kerbs invalidates the lap and slows you on grass or gravel.', 'Worn tyres lose grip: in longer races, request a pit stop with P or the PIT button.'][(Math.random() * 6) | 0];
  Sound.init(); lastCfg = cfg;
  setTimeout(() => { try { startRace(cfg); buildMinimap(); buildRacingLineMesh(); paused = false; tiltCal = null; show('hud'); hudSetup(); } catch (e) { console.error(e); toast('Could not start the race: ' + e.message, 'bad'); show('home'); } }, 60);
}
let lastCfg = null;
function showResults(res) {
  const R0 = R; show('results'); const P = R0.player;
  let html = '';
  if (res.tt) html = `<h2>Time trial · ${R0.def.name}</h2><p>Session best <b>${fmtLap(res.best)}</b> · Personal best <b>${fmtLap(res.pb)}</b></p><table class="tbl"><tbody>${res.laps.map((l, k) => `<tr><td>Lap ${k + 1}</td><td><b>${fmtLap(l.t)}</b></td><td class="dim">${l.sec.map(fmtLap).join(' · ')}</td><td>${l.clean ? '' : '<span class="bad">invalid</span>'}</td></tr>`).join('') || '<tr><td>No complete laps</td></tr>'}</tbody></table>`;
  else { const w = res.order[0];
    html = `<h2>${ordinal(res.pos)} place · ${R0.def.name}</h2><table class="tbl res"><thead><tr><th>#</th><th>Driver</th><th>Team</th><th>Best lap</th><th>Gap</th></tr></thead><tbody>${res.order.map(o => `<tr class="${o.isPlayer ? 'me' : ''}"><td>${o.pos}</td><td><i class="dot" style="background:${o.col}"></i>${esc(o.name)}</td><td class="dim">${esc(o.team)}</td><td>${fmtLap(o.best)}</td><td>${o.pos === 1 ? fmtLap(o.time) : o.time ? '+' + (o.time - w.time).toFixed(3) : o.laps < R0.laps - 1 ? `+${R0.laps - o.laps} laps` : 'running'}</td></tr>`).join('')}</tbody></table>`; }
  html += `<div class="rewards"><h3>Rewards</h3>${res.lines.length ? res.lines.map(([w, a]) => `<div class="rw"><span>${esc(w)}</span><b>${a ? '+◆ ' + fmtCoins(a) : ''}</b></div>`).join('') : '<p class="dim">No rewards this time.</p>'}<div class="rw total"><span>Total earned</span><b>+◆ ${fmtCoins(res.total)}</b></div><div class="rw"><span>New balance</span><b>◆ ${fmtCoins(profile.coins)}</b></div></div>`;
  const champ = res.champ; if (champ) { const tb = standings(champ.C.id); html += `<p>${champ.C.name}: you are <b>${ordinal(tb.findIndex(x => x.id === 'you') + 1)}</b> with ${champ.cs.points.you || 0} pts after round ${champ.cs.round} of ${champ.C.rounds.length}.${champ.cs.done ? ' <b>Season complete!</b>' : ''}</p>`; }
  $('resBody').innerHTML = html; $('resNext').textContent = champ ? 'Championship standings' : 'Race again';
  announce(res.tt ? 'Session over.' : `You finished ${ordinal(res.pos)}. Earned ${fmtCoins(res.total)} V-Coins.`);
  void P;
}
// ---------------------------------------------------------------- input: keyboard, gamepad, touch, tilt
const keys = new Set(), touchBtn = {}, pad = { steer: 0, thr: 0, brk: 0, boost: false };
let tiltRaw = null, tiltCal = null, kSteer = 0, tiltS = 0, padPrev = [], dbgBot = null;
addEventListener('keydown', e => {
  const k = e.key.toLowerCase(); keys.add(k);
  if (screenId === 'hud' || screenId === 'pause') { if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault(); if (e.repeat) return;
    if (k === 'escape') togglePause(); if (screenId !== 'hud') return;
    if (k === 'p') togglePitReq(); if (k === 't') cyclePitTyre(); if (k === 'c') cycleCamera(); if (k === 'e' && R) R.player.input.up = true; if (k === 'q' && R) R.player.input.down = true; }
});
addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
addEventListener('blur', () => keys.clear());
addEventListener('deviceorientation', e => { if (e.beta == null) return; const ang = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0; tiltRaw = ang === 90 ? e.beta : ang === 270 || ang === -90 ? -e.beta : e.gamma; });
function pollGamepad() {
  const gps = navigator.getGamepads ? navigator.getGamepads() : []; const gp = gps && Array.from(gps).find(g => g && g.connected); if (!gp) { pad.active = false; return; }
  const b = i => gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0, ax = gp.axes[0] || 0;
  pad.steer = Math.abs(ax) > 0.08 ? (ax - Math.sign(ax) * 0.08) / 0.92 : 0; pad.thr = b(7); pad.brk = b(6); pad.boost = b(0) > 0.5; pad.active = pad.thr > 0.05 || pad.brk > 0.05 || Math.abs(pad.steer) > 0.05 || pad.boost;
  const pr = gp.buttons.map(x => x.pressed), edge = i => pr[i] && !padPrev[i]; padPrev = pr;
  if (screenId === 'hud') { if (edge(2)) togglePitReq(); if (edge(3)) cycleCamera(); if (edge(5) && R) R.player.input.up = true; if (edge(4) && R) R.player.input.down = true; if (edge(1)) cyclePitTyre(); }
  if (edge(9)) { if (screenId === 'hud' || screenId === 'pause') togglePause(); }
}
function readInput(c) {
  const K = k => keys.has(k), inp = c.input, h = H_STEP;
  let st = (K('arrowright') || K('d') ? 1 : 0) - (K('arrowleft') || K('a') ? 1 : 0) + (touchBtn.right ? 1 : 0) - (touchBtn.left ? 1 : 0);
  let thr = (K('arrowup') || K('w') || touchBtn.thr) ? 1 : 0, brk = (K('arrowdown') || K('s') || touchBtn.brk) ? 1 : 0;
  // digital steering ramps in quickly (full lock in ~0.12 s) and snaps back to centre; the physics scales lock with speed
  if (dbgBot) { const b = dbgBot(c); st = b.steer; thr = b.thr; brk = b.brk; }
  kSteer = st ? clamp(kSteer + Math.sign(st - kSteer) * h * 8.5, -1, 1) : kSteer * Math.exp(-h * 16);
  if (st && Math.abs(kSteer - st) < h * 8.5) kSteer = st;
  if (st && Math.sign(st) !== Math.sign(kSteer) && kSteer) kSteer *= Math.exp(-h * 18); // reversing direction: drop the old lock fast
  let steer = kSteer;
  if (pad.active || Math.abs(pad.steer) > 0.05) { steer += Math.sign(pad.steer) * Math.abs(pad.steer) ** 1.2; thr = Math.max(thr, pad.thr); brk = Math.max(brk, pad.brk); }
  if (settings.tilt && tiltRaw != null && document.body.classList.contains('touchui')) { if (tiltCal == null) tiltCal = tiltRaw; const d = (tiltRaw - tiltCal) * (settings.tiltInvert ? -1 : 1), dz = Math.sign(d) * Math.max(0, Math.abs(d) - 1.5) / 20; tiltS = lerp(tiltS, clamp(dz, -1, 1), clamp(h * 20, 0, 1)); steer += Math.sign(tiltS) * Math.abs(tiltS) ** 1.15; }
  inp.brkRaw = brk; inp.human = true; inp.drift = K('x') || K('control') || !!touchBtn.drift;
  inp.steer = clamp(steer, -1, 1); inp.throttle = thr; inp.brake = brk; inp.boost = K(' ') || K('shift') || touchBtn.boost || pad.boost;
}
// steering assist (player only, on by default): nudges away from the barriers and eases off for corners taken far too fast
function playerAssist(c) {
  c.assist = 0; if (!settings.steerAssist || !R.env.racing || c.pit.state || c.finished) return;
  const v = c.speed || 0, inp = c.input; if (v < 8) return;
  const i = c.i, hT = T.H[i], R0 = -Math.cos(hT), R1 = Math.sin(hT), vlat = c.vx * R0 + c.vz * R1;
  // predicted lateral position 0.5 s ahead, including how the road bends away under the car
  const ahead = mod(i + Math.round(v * 0.5 / DS), T.n), bend = Math.atan2(Math.sin(T.H[ahead] - hT), Math.cos(T.H[ahead] - hT));
  const pred = c.lat + vlat * 0.5 + bend * v * 0.25, lim = T.hw - 0.4;
  if (Math.abs(pred) > lim && Math.sign(pred) === Math.sign(c.lat || pred)) {
    const ex = Math.abs(pred) - lim, want = -Math.sign(pred);
    const bias = want * clamp(0.15 + ex * 0.3, 0, c.drift === 1 ? 0.45 : 0.8);
    if (Math.sign(inp.steer) !== want || Math.abs(inp.steer) < Math.abs(bias)) inp.steer = clamp(inp.steer + bias, -1, 1);
    // already at full lock towards the inside and still running wide: lift and brake a little
    if (inp.steer * want > 0.85 && ex > 0.3 && v > 14) { inp.throttle = Math.min(inp.throttle, 0.2); inp.brake = Math.max(inp.brake, clamp(ex * 0.25, 0.1, 0.5)); }
    c.assist = 1;
  }
  // corner speed: compare with the braking profile for this car (a little more cautious than the AI's)
  if (inp.brake < 0.1) {
    const prof = assistProfile(c.stats, Math.round(carMu(c, R.env) * (c.off ? 0.6 : 1) * 50) / 50), k = mod(i + Math.round((2 + v * 0.35) / DS), T.n);
    const over = v - prof[k] * 0.95 - (c.drift === 1 ? 2.5 : 0);
    if (over > 0) { inp.throttle = Math.min(inp.throttle, over > 1.5 ? 0 : 0.5); if (over > 1.5) inp.brake = Math.max(inp.brake, clamp((over - 1.5) / 6, 0.15, 0.7)); c.assist = 2; }
  }
}
function togglePitReq() { if (!R || R.tt && false) return; const P = R.player; if (P.pit.state) return; P.pit.req = !P.pit.req; if (!P.pit.nextTyre) P.pit.nextTyre = R.rain ? 'wet' : P.tyre === 'soft' ? 'medium' : 'soft'; flash(P.pit.req ? `PIT REQUESTED · ${TYRES[P.pit.nextTyre].name}s` : 'PIT CANCELLED', 'info'); Sound.click(); }
function cyclePitTyre() { if (!R) return; const P = R.player, ks = Object.keys(TYRES); P.pit.nextTyre = ks[(ks.indexOf(P.pit.nextTyre || P.tyre) + 1) % ks.length]; flash(`PIT TYRE · ${TYRES[P.pit.nextTyre].name}`, 'info'); }
function cycleCamera() { const L = ['chase', 'far', 'tcam', 'cockpit']; settings.camera = L[(L.indexOf(settings.camera) + 1) % L.length]; saveSettings(); flash(`CAMERA · ${settings.camera.toUpperCase()}`, 'info'); }
function togglePause() {
  if (!R) return; if (R.phase === 'done') return;
  if (screenId === 'pause') { paused = false; show('hud'); } else { paused = true; show('pause'); $('pauseInfo').textContent = `${R.def.name} · ${R.tt ? 'Time trial' : `Lap ${Math.max(1, Math.min(R.laps, R.player.lap))} of ${R.laps} · ${ordinal(R.player.pos)} place`}`; $('pEnd').hidden = !R.tt; }
}
function bindTouch() {
  document.querySelectorAll('[data-touch]').forEach(el => {
    const k = el.dataset.touch, set = on => { touchBtn[k] = on; el.classList.toggle('down', on); };
    const ptrs = new Set();
    el.addEventListener('pointerdown', e => { e.preventDefault(); ptrs.add(e.pointerId); try { el.setPointerCapture(e.pointerId); } catch (_) { } set(true); Sound.init(); if (k === 'pit') togglePitReq(); if (k === 'cam') cycleCamera(); if (k === 'pause') togglePause(); if (k === 'up' && R) R.player.input.up = true; if (k === 'down' && R) R.player.input.down = true; if (k === 'tyre') cyclePitTyre(); });
    const up = e => { ptrs.delete(e.pointerId); if (!ptrs.size) set(false); };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
}
// ---------------------------------------------------------------- HUD
let mmPath = null, mmScale = 1, mmCan = null, flashT = 0, hudT = 0, lineMesh = null;
function buildMinimap() {
  mmCan = $('minimap'); const w = mmCan.width, h = mmCan.height, s = Math.min((w - 14) / (T.maxX - T.minX), (h - 14) / (T.maxZ - T.minZ)); mmScale = s;
  const ox = (w - (T.maxX - T.minX) * s) / 2, oz = (h - (T.maxZ - T.minZ) * s) / 2; mmCan._o = [ox, oz];
  mmPath = new Path2D(); for (let i = 0; i <= T.n; i += 2) { const k = i % T.n, x = ox + (T.maxX - T.X[k]) * s, y = oz + (T.maxZ - T.Z[k]) * s; i ? mmPath.lineTo(x, y) : mmPath.moveTo(x, y); } mmPath.closePath();
  const pit = new Path2D(); for (let i = T.pit.entry, k = 0; k < T.n && mod(i - T.pit.entry, T.n) <= mod(T.pit.exit - T.pit.entry, T.n); k += 2, i = (i + 2) % T.n) { const p = trackPoint(i, pitLaneLat(i), { x: 0, y: 0, z: 0 }), x = ox + (T.maxX - p.x) * s, y = oz + (T.maxZ - p.z) * s; k ? pit.lineTo(x, y) : pit.moveTo(x, y); } mmCan._pit = pit;
}
function drawMinimap() {
  const g = mmCan.getContext('2d'), w = mmCan.width, h = mmCan.height, [ox, oz] = mmCan._o, s = mmScale; g.clearRect(0, 0, w, h);
  g.lineJoin = 'round'; g.strokeStyle = settings.hc ? '#000' : 'rgba(0,0,0,.55)'; g.lineWidth = 7; g.stroke(mmPath); g.strokeStyle = settings.hc ? '#fff' : 'rgba(255,255,255,.85)'; g.lineWidth = 3; g.stroke(mmPath);
  g.strokeStyle = 'rgba(255,210,60,.7)'; g.lineWidth = 1.5; g.stroke(mmCan._pit);
  const sx = ox + (T.maxX - T.X[0]) * s, sy = oz + (T.maxZ - T.Z[0]) * s; g.fillStyle = '#fff'; g.fillRect(sx - 3, sy - 3, 6, 6);
  for (const c of R.cars) { if (c.isPlayer) continue; g.fillStyle = c.col; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(ox + (T.maxX - c.x) * s, oz + (T.maxZ - c.z) * s, 3.2, 0, 7); g.fill(); g.stroke(); }
  if (R.ghostObj && R.ghostObj.visible) { g.fillStyle = 'rgba(95,215,255,.8)'; g.beginPath(); g.arc(ox + (T.maxX - R.ghostObj.position.x) * s, oz + (T.maxZ - R.ghostObj.position.z) * s, 3.5, 0, 7); g.fill(); }
  const P = R.player, px = ox + (T.maxX - P.x) * s, py = oz + (T.maxZ - P.z) * s; g.fillStyle = settings.cb ? '#ffb000' : '#ff6a1a'; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(px, py, 5, 0, 7); g.fill(); g.stroke();
}
function buildRacingLineMesh() {
  if (lineMesh) { lineMesh = null; }
  const P = R.player, V = speedProfile(P.stats, carMu(P, R.env), 0.9), pos = [], col = [], n = T.n, a = { x: 0, y: 0, z: 0 }, b = { x: 0, y: 0, z: 0 }, c2 = { x: 0, y: 0, z: 0 }, d = { x: 0, y: 0, z: 0 };
  const GR = settings.cb ? [0.1, 0.5, 1] : [0.1, 0.9, 0.3], YE = [1, 0.85, 0.1], RD = settings.cb ? [1, 0.45, 0] : [1, 0.12, 0.1];
  for (let i = 0; i < n; i++) { const j = (i + 1) % n, br = V[mod(i + 12, n)] < V[i] - 0.4, corner = Math.abs(T.RK[i]) > 0.008; if (!br && !corner && (i >> 2) % 2) continue;
    const cl = br ? RD : corner ? YE : GR; trackPoint(i, T.RL[i] - 0.35, a); trackPoint(i, T.RL[i] + 0.35, b); trackPoint(j, T.RL[j] - 0.35, c2); trackPoint(j, T.RL[j] + 0.35, d);
    const y0 = T.Y[i] + 0.06, y1 = T.Y[j] + 0.06; pos.push(a.x, y0, a.z, b.x, y0, b.z, c2.x, y1, c2.z, b.x, y0, b.z, d.x, y1, d.z, c2.x, y1, c2.z); for (let m = 0; m < 6; m++) col.push(...cl); }
  const g = tr3(new THREE.BufferGeometry()); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  lineMesh = new THREE.Mesh(g, tr3(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false }))); lineMesh.renderOrder = 2; trackGroup.add(lineMesh); updateLineVis();
}
function updateLineVis() { if (lineMesh) lineMesh.visible = !!settings.line; }
function flash(text, kind) { const f = $('flash'); f.textContent = text; f.className = 'show ' + (kind || ''); flashT = performance.now(); }
function hudSetup() { $('hudPos').parentNode.hidden = R.tt; $('hudLapTot').textContent = R.tt ? '' : '/' + R.laps; $('ttDelta').hidden = !R.tt; $('hudSpdU').textContent = spdU(); $('flash').className = ''; }
function hud() {
  if (!R) return; const P = R.player, now = performance.now();
  if (flashT && now - flashT > 2200) { $('flash').className = ''; flashT = 0; }
  if (now - hudT < 50) { drawMinimap(); return; } hudT = now;
  const kmh = (P.speed || 0) * 3.6;
  $('hudSpd').textContent = spd(kmh); $('hudGear').textContent = P.pit.state ? 'P' : (P.vLong < -0.5 ? 'R' : P.gear);
  $('rpmBar').style.width = clamp((P.rpm - 3800) / 8700 * 100, 0, 100) + '%'; $('rpmBar').classList.toggle('red', P.rpm > 11800);
  $('hudPos').textContent = P.pos; $('hudPosTot').textContent = '/' + R.cars.length;
  $('hudLap').textContent = Math.max(1, R.tt ? P.lap : Math.min(R.laps, P.lap));
  const lt = P.lap >= 1 && R.env.racing ? R.t - P.lapStart : 0; $('hudTime').textContent = fmtLap(lt || 0).replace('--:--.---', '0:00.000'); $('hudTime').classList.toggle('bad', !P.cleanLap && P.lap >= 1);
  const last = P.lapTimes[P.lapTimes.length - 1]; $('hudLast').textContent = last ? fmtLap(last.t) + (last.clean ? '' : ' ✗') : '—';
  const pb = (profile.records[R.def.id] || {}).best; $('hudBest').textContent = P.best ? fmtLap(P.best) : '—'; $('hudPB').textContent = pb ? fmtLap(pb) : '—';
  const secs = [0, 1, 2].map(k => k < P.curSec ? P.sectors[k] : null);
  $('hudSec').innerHTML = secs.map((s, k) => `<span class="${s != null ? 'on' : ''}">S${k + 1} ${s != null ? s.toFixed(1) : '—'}</span>`).join('');
  if (R.lastSplit && now - R.lastSplit.at < 3500 && R.lastSplit.d != null) { const d = R.lastSplit.d; $('hudSplit').textContent = `S${R.lastSplit.k + 1} ${fmtDelta(d)}`; $('hudSplit').className = d <= 0 ? 'good' : 'bad'; } else $('hudSplit').textContent = '';
  if (R.tt) { const d = ghostDelta(P); $('ttDelta').textContent = d == null ? (R.ghost ? 'GHOST ready' : 'No ghost yet: set a clean lap') : `vs PB ${fmtDelta(d)}`; $('ttDelta').className = d == null ? '' : d <= 0 ? 'good' : 'bad'; }
  // energy, tyres, pit
  const en = $('enBar'); en.style.width = P.energy.toFixed(0) + '%'; en.className = P.boostT > 0 ? 'act' : P.boostCd > 0 ? 'cd' : P.energy > 8 ? 'ok' : '';
  $('enTxt').textContent = P.boostT > 0 ? 'BOOST' : P.boostCd > 0 ? 'COOLDOWN' : `${P.energy.toFixed(0)}`;
  const ty = TYRES[P.tyre]; $('tyreIc').style.background = ty.col; $('tyreIc').textContent = ty.short; $('tyreWear').textContent = `${Math.round((1 - P.wear) * 100)}%`; $('tyreWear').className = P.wear > 0.7 ? 'bad' : P.wear > 0.45 ? 'warn' : '';
  const pit = $('pitInd'); pit.hidden = !(P.pit.req || P.pit.state); pit.textContent = P.pit.state === 2 ? `PIT STOP ${Math.max(0, P.pit.t).toFixed(1)}s` : P.pit.state ? 'PIT LANE · 80 km/h' : `PIT THIS LAP · ${TYRES[P.pit.nextTyre || P.tyre].short}`;
  $('slipInd').hidden = !P.slip; $('offInd').hidden = !P.off;
  // countdown lights
  const L = $('lights'); if (R.phase === 'grid' || R.phase === 'lights' || (R.phase === 'race' && R.t - R.lightsOut < 1.2 && !R.tt)) { L.hidden = false; const lit = R.phase === 'lights' ? R.lit : 0; L.querySelectorAll('i').forEach((el, k) => el.className = R.phase === 'race' ? 'go' : k < lit ? 'on' : ''); $('lightsTip').textContent = R.phase === 'race' ? 'GO!' : settings.autoLaunch ? 'Assisted launch on' : 'Hit the throttle when the lights go out'; } else L.hidden = true;
  // running order (around the player)
  if (!R.tt) { const i0 = clamp(P.pos - 3, 0, R.cars.length - 5), rows = R.cars.slice(i0, i0 + 5); $('order').innerHTML = rows.map(c => `<div class="${c.isPlayer ? 'me' : ''}"><b>${c.pos}</b><i style="background:${c.col}"></i>${esc(c.isPlayer ? 'YOU' : c.name.split(' ').pop().toUpperCase().slice(0, 7))}${c.pit.state ? ' <em>PIT</em>' : ''}</div>`).join(''); }
  drawMinimap();
}
// ---------------------------------------------------------------- fullscreen + landscape on Android
async function goFullscreen() {
  if (!isTouchDev()) return; const el = document.documentElement;
  try { if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' }); } catch (e) { }
  try { if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape'); } catch (e) { }
}
// ---------------------------------------------------------------- main loop
let lastT = performance.now(), fpsAvg = 60, fpsLowT = 0, fpsHiT = 0, fpsN = 0, fpsAcc = 0, fpsLast = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const real = Math.max(0, (now - lastT) / 1000), dt = Math.min(0.05, real); lastT = now;
  pollGamepad();
  if (!renderer) return;
  const inRace = R && ['hud', 'pause', 'results'].includes(screenId);
  if (inRace) { if (screenId === 'hud' && !paused) updateRace(dt); renderRace(screenId === 'hud' && !paused ? dt : 0); if (screenId === 'hud') hud(); Sound.update(R.player, screenId === 'hud' && !paused && R.phase !== 'done', R.rain && screenId === 'hud'); }
  else if (screenId !== 'loading') { renderShowroom(dt, VIEW[screenId] || VIEW.home); Sound.update(null, false); }
  // adaptive quality: drop a level if the real frame rate stays low in a race
  fpsN++; fpsAcc += real; if (now - fpsLast > 1000) { fpsAvg = fpsN / Math.max(0.001, fpsAcc); fpsN = 0; fpsAcc = 0; fpsLast = now; if (window.__vqFps) window.__vqFps(fpsAvg); }
  // auto quality: first trim the render resolution a little, then drop a tier; resolution comes back when frames are smooth again
  if (inRace && screenId === 'hud' && settings.gfx === 'auto') {
    if (fpsAvg < 46) { fpsLowT += real; fpsHiT = 0;
      if (fpsLowT > 2.5) { fpsLowT = 0; if (prScale > 0.7) { prScale = Math.max(0.65, prScale - 0.12); resize3D(); } else if (autoQ !== 'low' && fpsAvg < 36) { autoQ = autoQ === 'high' ? 'medium' : 'low'; applyGfx(false); prScale = 0.85; resize3D(); toast(`Graphics lowered to ${autoQ} for a smoother frame rate`); } } }
    else if (fpsAvg > 57) { fpsLowT = 0; fpsHiT += real; if (fpsHiT > 6 && prScale < 1) { fpsHiT = 0; prScale = Math.min(1, prScale + 0.1); resize3D(); } }
    else { fpsLowT = 0; fpsHiT = 0; }
  } else fpsLowT = 0;
}
// ---------------------------------------------------------------- wiring
function wire() {
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { Sound.click(); const to = g.dataset.go; if (to === 'setup' || to === 'tt') { setupMode = to === 'tt' ? 'tt' : 'quick'; show('setup'); } else show(to); } });
  $('btnStart').addEventListener('click', () => { Sound.init(); goFullscreen(); const b = dailyLogin(); show('home'); if (b) setTimeout(() => toast(`Daily login bonus +◆ ${fmtCoins(b)}`, 'good'), 300); });
  $('scr-garage').addEventListener('click', onGarageClick);
  $('scr-showroom').addEventListener('click', e => { const c = e.target.closest('[data-show]'); if (c) { showCar = c.dataset.show; Sound.click(); renderShowroom2(); return; } const b = e.target.closest('#buyCar'); if (b) { const c2 = CAR(showCar); confirmBox(`Buy the ${c2.name} for ◆ ${fmtCoins(c2.price)}? You have ◆ ${fmtCoins(profile.coins)}.`, () => { buyCar(showCar); renderShowroom2(); renderCoins(); }, 'Buy'); } });
  $('scr-showroom').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.dataset.show) { e.preventDefault(); e.target.click(); } });
  $('scr-workshop').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.ws) { wsCar = b.dataset.ws; Sound.click(); renderWorkshop(); } if (b.dataset.up) { if (buyUpgrade(wsCar, b.dataset.up)) { renderWorkshop(); renderCoins(); } } });
  $('scr-setup').addEventListener('click', onSetupClick); $('setupGo').addEventListener('click', () => { Sound.init(); goFullscreen(); launchFromSetup(); });
  $('scr-career').addEventListener('click', e => { const c = e.target.closest('[data-champ]'); if (c) { careerSel = c.dataset.champ; Sound.click(); renderCareer(); return; } const b = e.target.closest('button'); if (!b) return;
    if (b.id === 'champGo') { Sound.init(); goFullscreen(); startCareerRound(); } if (b.id === 'champReset') confirmBox('Restart this championship? Points and results for the season are cleared.', () => { delete profile.career[careerSel]; saveProfile(); renderCareer(); }, 'Restart'); });
  $('scr-settings').addEventListener('change', onSettingsInput); $('scr-settings').addEventListener('input', e => { if (e.target.type === 'range') onSettingsInput(e); }); $('scr-settings').addEventListener('click', onSettingsClick);
  $('pResume').onclick = () => togglePause(); $('pRestart').onclick = () => { paused = false; beginRace(lastCfg); }; $('pQuit').onclick = () => { paused = false; endRace3D(); R = null; show('home'); };
  $('pEnd').onclick = () => { paused = false; show('hud'); endTimeTrial(); }; $('pCal').onclick = () => { tiltCal = null; toast('Tilt centre reset'); };
  $('pCam').onclick = () => cycleCamera(); $('pLine').onclick = () => { settings.line = !settings.line; saveSettings(); updateLineVis(); toast(`Racing line ${settings.line ? 'on' : 'off'}`); };
  $('resNext').onclick = () => { const res = R && R.results; if (res && res.champ) { careerSel = res.champ.C.id; endRace3D(); R = null; show('career'); } else beginRace(lastCfg); };
  $('resHome').onclick = () => { endRace3D(); R = null; show('home'); };
  document.addEventListener('visibilitychange', () => { if (document.hidden && screenId === 'hud' && R && R.phase !== 'done') togglePause(); });
  bindTouch();
}
function boot() {
  loadProfile(); applyBodyClasses(); wire();
  if (!init3D()) { $('noGL').hidden = false; return; }
  setShowroomCar(profile.car, liveryOf(profile.car));
  for (const c of CIRCUITS) trackFor(c.id);
  show('splash'); requestAnimationFrame(loop);
  // test / debug hooks (headless checks)
  window.__vq = {
    get R() { return R; }, profile: () => profile, settings, startRace: cfg => beginRace(cfg), show, buyCar, buyUpgrade,
    autopilot: on => { autopilot = on; }, sim: (sec) => { if (!R) return; const steps = Math.round(sec / H_STEP); for (let k = 0; k < steps && R && R.phase !== 'done'; k++) stepRace(H_STEP); },
    state: () => R && { phase: R.phase, t: R.t, lap: R.player.lap, pos: R.player.pos, speed: R.player.speed, prog: R.player.prog, laps: R.laps, off: R.player.off, results: R.results ? { pos: R.results.pos, total: R.results.total, lines: R.results.lines } : null },
    endTT: () => { if (R && R.tt) { show('hud'); endTimeTrial(); } }, quality: () => ({ q: qName, gpu: gpuName, soft: softGPU, pr: renderer.getPixelRatio(), prScale, aa: renderer.getContext().getContextAttributes().antialias }), fps: () => fpsAvg,
    get T() { return T; }, simFx: (sec, until) => { if (!R) return false; for (let k = 0; k < Math.round(sec / H_STEP); k++) { stepRace(H_STEP); if (!R || R.phase === 'done') return false; for (const c of R.cars) { placeCar3D(c.obj, c, H_STEP); carEffects(c, H_STEP); } updateParticles(H_STEP); updateCamera(R.player, H_STEP, settings.camera); if (until && until(R.player)) return true; } return false; }, bot: fn => { dbgBot = fn; }, touch: touchBtn, profileFor: (c, k) => k === "A" ? assistProfile(c.stats, Math.round(carMu(c, R.env) * 50) / 50) : speedProfile(c.stats, carMu(c, R.env), k || 0.82), cam: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z, fov: camera.fov, pr: renderer.getPixelRatio() }), teleport: (f, lat) => { if (!R) return; const P = R.player, i = mod(Math.floor(f * T.n), T.n), p = trackPoint(i, lat || 0, { x: 0, y: 0, z: 0 }); Object.assign(P, { x: p.x, z: p.z, y: p.y, h: T.H[i], i, vx: 0, vz: 0 }); cam.init = false; }
  };
}
boot();
})();
