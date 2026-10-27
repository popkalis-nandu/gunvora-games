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
