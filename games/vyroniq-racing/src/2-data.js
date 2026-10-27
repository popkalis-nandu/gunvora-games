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
