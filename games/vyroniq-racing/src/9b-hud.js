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
